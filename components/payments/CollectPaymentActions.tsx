"use client";

import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

function loadScript(src: string) {
  return new Promise<boolean>((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CollectPaymentActions({
  invoiceId,
  customerName,
  customerPhone,
  customerEmail,
  amount,
}: {
  invoiceId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  amount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string>("");

  async function payOnDevice() {
    setBusy(true);
    try {
      const { data } = await api.post(`/invoices/${invoiceId}/razorpay/order`);

      console.log("Razorpay Order Data:", data);
      const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!ok) throw new Error("Razorpay checkout script failed to load");

      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Service Management System",
        description: `Invoice ${invoiceId}`,
        order_id: data.order.id,
        prefill: {
          name: customerName || "",
          contact: customerPhone || "",
          email: customerEmail || "",
        },
        handler: async (response: any) => {
          await api.post("/razorpay/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          alert("Payment verified and recorded");
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } finally {
      setBusy(false);
    }
  }

  async function createPaymentLink() {
    setBusy(true);
    try {
      const { data } = await api.post(`/invoices/${invoiceId}/razorpay/payment-link`);
      setPaymentLink(data.shortUrl);
      if (data.shortUrl) {
        await navigator.clipboard.writeText(data.shortUrl);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={payOnDevice} disabled={busy}>
          Collect Payment on Device
        </Button>

        <Button variant="outline" onClick={createPaymentLink} disabled={busy}>
          Generate WhatsApp Payment Link
        </Button>
      </div>

      {paymentLink ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          Payment link copied:
          <div className="mt-2 break-all font-medium">{paymentLink}</div>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        Payment is marked paid only after webhook or verified callback confirms it.
      </p>
    </div>
  );
}