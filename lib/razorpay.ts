
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const API_BASE = 'https://api.razorpay.com/v1';

function assertEnv(){
    if(!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET){
        throw new Error('Razorpay keys missing')
    };
};

function authHeader(){
    assertEnv();
    return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`
};

async function razorpayRequest<T>(
    path: string,
  method: "POST" | "GET" | "PATCH",
  body?: Record<string, any>
):Promise<T>{
    
    const res = await fetch(`${API_BASE}${path}`,{
        method,
        headers:{
            Authorization:authHeader(),
            "content-type":"application/json",
        },
        body:body? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data : any = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        data = {raw:text};
    }

    if (!res.ok) {
    const msg =
      data?.error?.description ||
      data?.error?.message ||
      data?.description ||
      data?.message ||
      `Razorpay request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
};

export async function createRazorpayOrder(input:{
    amountPaise:number;
    currency?:string;
    receipt?:string,
    notes?: Record<string,any>;
}){
    return razorpayRequest<any>("/orders", "POST", {
    amount: input.amountPaise,
    currency: input.currency || "INR",
    receipt: input.receipt,
    notes: input.notes || {},
  });
};

export async function createRazorpayPaymentLink(input: {
  amountPaise: number;
  currency?: string;
  description: string;
  reference_id: string;
  customer?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, any>;
  callback_url?: string;
  callback_method?: "get" | "post";
  suppressNotifications?: boolean;
  expireBy?: number;
}) {
  return razorpayRequest<any>("/payment_links", "POST", {
    amount: input.amountPaise,
    currency: input.currency || "INR",
    description: input.description,
    reference_id: input.reference_id,
    customer: input.customer || undefined,
    notify: {
      email: !input.suppressNotifications && Boolean(input.customer?.email),
      sms: !input.suppressNotifications && Boolean(input.customer?.contact),
    },
    notes: input.notes || {},
    ...(input.suppressNotifications ? { reminder_enable: false, accept_partial: false } : {}),
    ...(input.expireBy ? { expire_by: input.expireBy } : {}),
    callback_url: input.callback_url,
    callback_method: input.callback_method || "get",
  });
}

export interface GatewayPaymentLink {
  id:string; reference_id:string; amount:number; amount_paid:number; currency:string; status:string;
  short_url:string; order_id?:string; expire_by?:number;
  payments?: { payment_id:string; amount:number; status:string }[];
}
export function getRazorpayPaymentLink(id:string) { return razorpayRequest<GatewayPaymentLink>(`/payment_links/${encodeURIComponent(id)}`,"GET"); }
export function cancelRazorpayPaymentLink(id:string) { return razorpayRequest<GatewayPaymentLink>(`/payment_links/${encodeURIComponent(id)}/cancel`,"POST"); }
export async function findRazorpayPaymentLink(reference:string) {
  const result=await razorpayRequest<{payment_links?:GatewayPaymentLink[];items?:GatewayPaymentLink[]}>(`/payment_links?reference_id=${encodeURIComponent(reference)}`,"GET");
  const rows=(result.payment_links||result.items||[]).filter(row=>row.reference_id===reference);
  if(rows.length>1) throw new Error("Payment Link reference requires review");
  return rows[0]||null;
}
export function getRazorpayRefund(id:string) { return razorpayRequest<{id:string;payment_id:string;amount:number;status:string}>(`/refunds/${encodeURIComponent(id)}`,"GET"); }

export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return /^[a-f\d]{64}$/i.test(params.signature) && crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(params.signature, "hex"));
}

export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
}) {
  if (!WEBHOOK_SECRET) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is missing");
  }

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(params.rawBody)
    .digest("hex");

  return /^[a-f\d]{64}$/i.test(params.signature) && crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(params.signature, "hex"));
}

export async function getRazorpayPayment(
  paymentId: string,
) {
  return razorpayRequest<any>(
    `/payments/${paymentId}`,
    "GET",
  );
}

export async function getRazorpayOrder(orderId: string) {
  return razorpayRequest<{ id: string; amount: number; amount_due: number; currency: string; status: string }>(`/orders/${encodeURIComponent(orderId)}`, "GET");
}
