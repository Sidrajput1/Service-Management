"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import api from "@/lib/api";
import axios from "axios";

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

function CustomerPayBtn({
  invoiceId,
  customerName,
  customerPhone,
  customerEmail,
}: {
  invoiceId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const { data } = await axios.post(
        `/api/invoices/${invoiceId}/razorpay/order`,
      );

      const ok = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js",
      );

      if (!ok) {
        throw new Error("Razorpay load script failed");
      }

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
          await axios.post("/api/razorpay/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          alert("Payment successful and recorded");
          window.location.reload();
        },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err?.response?.data?.error || err.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={pay} disabled={busy}>
      {busy ? "opening payment" : "pay now"}
    </Button>
  );
}

export default CustomerPayBtn;
