import { createHash } from "node:crypto";
import { apiFailure, privateJson } from "@/lib/api-response";
import { ApiAuthError } from "@/lib/auth";
import { verifyWebhookSignature, getRazorpayPayment, getRazorpayPaymentLink } from "@/lib/razorpay";
import { finalizeSuccessfulRazorpayPayment } from "@/lib/razorpay-payment";
import { recordVerifiedRefund } from "@/lib/finance-refunds";
import { reconcileCollection } from "@/lib/finance-collections";
import { CommissionCollection } from "@/models/finance";
import { connectToDb } from "@/lib/db";
import WebhookEvent from "@/models/WebhookEvent";
import Invoice from "@/models/invoice";
export const runtime="nodejs";
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==="string"?value:"";
const entity=(payload:Record<string,unknown>,name:string)=>record(record(payload[name]).entity);
interface CapturedPayment {id:string;order_id:string;amount:number;currency:string;status:string;captured?:boolean;amount_refunded?:number;method?:string;notes?:Record<string,unknown>;}
async function readWebhookBody(request:Request) {
  const maxBytes=524288;if(Number(request.headers.get("content-length"))>maxBytes)throw new ApiAuthError("Webhook body is too large",413);
  const reader=request.body?.getReader();if(!reader)return "";let length=0;const chunks:Uint8Array[]=[];
  for(;;){const next=await reader.read();if(next.done)break;length+=next.value.byteLength;if(length>maxBytes){await reader.cancel();throw new ApiAuthError("Webhook body is too large",413);}chunks.push(next.value);}
  return Buffer.concat(chunks).toString("utf8");
}
export async function POST(request:Request) {
  try {
    const signature=request.headers.get("x-razorpay-signature")||"",eventId=request.headers.get("x-razorpay-event-id")||"";
    if(!signature)return privateJson({error:"Missing webhook signature"},400);
    if(eventId&&!/^[A-Za-z0-9_:-]{1,200}$/.test(eventId))throw new ApiAuthError("Invalid event reference",400);
    const rawBody=await readWebhookBody(request);if(!verifyWebhookSignature({rawBody,signature}))return privateJson({error:"Invalid webhook signature"},400);
    const body=record(JSON.parse(rawBody)),payload=record(body.payload),eventName=text(body.event);
    await connectToDb();
    const bodyHash=createHash("sha256").update(rawBody).digest("hex");
    const previous=eventId?await WebhookEvent.findOne({eventId,status:{$in:["processed","ignored"]}}):null;
    if(previous){if(previous.payload?.bodyHash&&previous.payload.bodyHash!==bodyHash)throw new ApiAuthError("Event reference was reused for a different body",409);return privateJson({ok:true,duplicate:true});}
    const paymentEntity=entity(payload,"payment"),linkEntity=entity(payload,"payment_link"),orderEntity=entity(payload,"order"),refundEntity=entity(payload,"refund");
    const paymentId=text(paymentEntity.id),linkId=text(linkEntity.id),refundId=text(refundEntity.id);
    let ignored=false;
    if(eventName==="refund.processed") {
      if(!/^rfnd_[A-Za-z0-9]+$/.test(refundId))throw new ApiAuthError("Missing refund reference",400);
      await recordVerifiedRefund(refundId);
    } else if(["payment.captured","order.paid","payment_link.paid","payment_link.expired","payment_link.cancelled"].includes(eventName)) {
      const reference=text(linkEntity.reference_id),notes=record(paymentEntity.notes);
      const collection=await CommissionCollection.findOne({$or:[...(linkId?[{gatewayLinkId:linkId}]:[]),...(reference?[{reference}]:[]),...((text(paymentEntity.order_id)||text(orderEntity.id))?[{gatewayOrderId:text(paymentEntity.order_id)||text(orderEntity.id)}]:[]),...(/^[a-f\d]{24}$/i.test(text(notes.collectionId))?[{_id:text(notes.collectionId)}]:[]),{_id:null}]}).select("_id").lean();
      if(collection) {const reconciled=await reconcileCollection(String(collection._id));if(["payment.captured","order.paid","payment_link.paid"].includes(eventName)&&(!reconciled?.collection.gatewayPaymentId||!["paid","review"].includes(reconciled.collection.status)))throw new ApiAuthError("Collection capture is awaiting gateway reconciliation",409);}
      else if(["payment_link.expired","payment_link.cancelled"].includes(eventName))ignored=true;
      else {
        let actualId=paymentId;
        if(!actualId&&linkId){const link=await getRazorpayPaymentLink(linkId);actualId=link.payments?.find(row=>row.status==="captured")?.payment_id||"";}
        if(!/^pay_[A-Za-z0-9]+$/.test(actualId))throw new ApiAuthError("Missing captured payment reference",400);
        const payment=await getRazorpayPayment(actualId) as CapturedPayment;
        if(payment.id!==actualId||!(payment.status==="captured"||payment.status==="refunded"&&payment.captured===true)||!Number.isSafeInteger(payment.amount)||payment.amount<=0)throw new ApiAuthError("Payment is not verified as captured",409);
        const hint=text(record(linkEntity.notes).invoiceId)||text(record(payment.notes).invoiceId)||text(record(orderEntity.notes).invoiceId)||text(orderEntity.receipt)||reference;
        const invoice=(/^[a-f\d]{24}$/i.test(hint)?await Invoice.findById(hint):null)||await Invoice.findOne({$or:[{razorpayOrderId:payment.order_id},...(linkId?[{razorpayPaymentLinkId:linkId}]:[])]});
        if(!invoice)throw new ApiAuthError("The invoice has not been reconciled yet. Retry this delivery.",409);
        if(payment.currency!==invoice.currency)throw new ApiAuthError("Payment currency mismatch",400);
        let matchingLinkId:string|undefined;
        if(invoice.razorpayPaymentLinkId||linkId) {
          const link=await getRazorpayPaymentLink(invoice.razorpayPaymentLinkId||linkId);
          if(link.reference_id===String(invoice._id)&&link.currency===invoice.currency&&link.order_id===payment.order_id&&(link.payments||[]).some(row=>row.payment_id===payment.id&&row.amount===payment.amount&&row.status==="captured"))matchingLinkId=link.id;
        }
        if(payment.order_id!==invoice.razorpayOrderId&&!matchingLinkId)throw new ApiAuthError("Payment does not belong to this invoice",409);
        await finalizeSuccessfulRazorpayPayment({invoiceId:String(invoice._id),paymentId:payment.id,orderId:payment.order_id,paymentLinkId:matchingLinkId,paidAmountPaise:payment.amount,expectedAmountPaise:payment.amount,method:payment.method,source:"webhook"});
      }
    } else ignored=true;
    if(eventId)await WebhookEvent.updateOne({eventId},{$set:{provider:"razorpay",eventName,payload:{paymentId,linkId,refundId,bodyHash},status:ignored?"ignored":"processed",processedAt:new Date()}},{upsert:true});
    return privateJson({ok:true,...(ignored?{ignored:true}:{processed:true})});
  }catch(error){console.error("Razorpay webhook processing failed; delivery can be retried.");return apiFailure(error);}
}
