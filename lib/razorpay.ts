
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

const API_BASE = 'https://api.razorpay.com/v1';

function assertEnv(){
    if(!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET){
        throw new Error('Razorpay keys missing')
    };
};

function authHeader(){
    assertEnv();

    return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID} : ${RAZORPAY_KEY_SECRET}`).toString("base64")}`
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
}) {
  return razorpayRequest<any>("/payment_links", "POST", {
    amount: input.amountPaise,
    currency: input.currency || "INR",
    description: input.description,
    reference_id: input.reference_id,
    customer: input.customer || undefined,
    notify: {
      email: Boolean(input.customer?.email),
      sms: Boolean(input.customer?.contact),
    },
    notes: input.notes || {},
    callback_url: input.callback_url,
    callback_method: input.callback_method || "get",
  });
}

export function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return expected === params.signature;
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

  return expected === params.signature;
}