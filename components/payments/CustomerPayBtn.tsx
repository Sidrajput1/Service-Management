"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; prefill: { name: string; contact: string; email: string }; handler: (result: CheckoutResult) => Promise<void>; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => { open(): void; on(event: string, callback: () => void): void } } }
let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const fail = () => { clearTimeout(timeout); checkoutScript = undefined; script.remove(); reject(new Error("Could not load payment checkout. Please try again.")); };
    const timeout = setTimeout(fail, 15000);
    script.onload = () => { if (window.Razorpay) { clearTimeout(timeout); resolve(); } else fail(); };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return checkoutScript;
}
export default function CustomerPayBtn({ invoiceId, customerName, customerPhone, customerEmail, disabled = false }: { invoiceId: string; customerName?: string; customerPhone?: string; customerEmail?: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const refresh = () => { client.invalidateQueries({ queryKey: ["customer-invoices"] }); client.invalidateQueries({ queryKey: ["customer-invoicebyid"] }); client.invalidateQueries({ queryKey: ["customer-booking"] }); };
  async function pay() {
    if (busy || disabled) return;
    setBusy(true); setError(false); setMessage("");
    try {
      await loadCheckout();
      // The server rechecks ownership, payable state, and the amount at click time.
      const { data } = await api.post<{ keyId: string; order: { id: string; amount: number; currency: string } }>(`/invoices/${invoiceId}/razorpay/order`);
      if (!window.Razorpay) throw new Error("Checkout is unavailable");
      const checkout = new window.Razorpay({ key: data.keyId, order_id: data.order.id, amount: data.order.amount, currency: data.order.currency, name: "Servizato", description: "Service invoice payment", prefill: { name: customerName || "", contact: customerPhone || "", email: customerEmail || "" },
        modal: { ondismiss: () => { setBusy(false); setMessage("Checkout closed. Refreshing the current payment state."); refresh(); } },
        handler: async response => {
          setMessage("Checking payment confirmation…");
          try { await api.post("/razorpay/verify", response); setMessage("Payment checked by the server. Your invoice is refreshing."); }
          catch { setError(true); setMessage("Confirmation is pending. Refresh the invoice before trying again; a payment may still be processing."); }
          finally { setBusy(false); refresh(); }
        },
      });
      checkout.on("payment.failed", () => { setBusy(false); setError(true); setMessage("Payment wasn’t completed. Your invoice is refreshing; try again when its current state is confirmed."); refresh(); });
      checkout.open();
    } catch { setBusy(false); setError(true); setMessage("Payment checkout is unavailable or this invoice is no longer payable. Refresh the invoice and try again."); refresh(); }
  }
  return <div><Button className="public-button public-button-primary w-full" disabled={busy || disabled} onClick={pay}>{busy ? "Checking payment…" : "Pay securely with Razorpay"}</Button>{message && <p role={error ? "alert" : "status"} className={`mt-3 text-xs leading-6 ${error ? "text-primary" : "text-muted-foreground"}`}>{message}</p>}</div>;
}
