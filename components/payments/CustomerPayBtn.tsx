"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

type CheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type CheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email: string };
  handler: (result: CheckoutResult) => Promise<void>;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => {
      open(): void;
      on(event: string, callback: () => void): void;
    };
  }
}

let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      checkoutScript = undefined;
      script.remove();
      reject(new Error("Could not load payment checkout."));
    };
    const timeout = setTimeout(fail, 15000);
    script.onload = () => {
      if (!window.Razorpay) return fail();
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return checkoutScript;
}

export default function CustomerPayBtn({
  invoiceId,
  customerName,
  customerPhone,
  customerEmail,
  disabled = false,
}: {
  invoiceId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  disabled?: boolean;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const client = useQueryClient();

  async function refreshAndRelease() {
    try {
      await client.invalidateQueries({
        predicate: ({ queryKey }) =>
          [
            "customer-invoices",
            "customer-invoicebyid",
            "customer-booking",
          ].includes(String(queryKey[0])) ||
          (queryKey[0] === "finance" &&
            queryKey[3] === `/finance/invoices/${invoiceId}`),
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function pay() {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      await loadCheckout();
      // The server owns the bill's amount and eligibility.
      const { data } = await api.post<{
        keyId: string;
        order: { id: string; amount: number; currency: string };
      }>(`/invoices/${invoiceId}/razorpay/order`);
      if (!window.Razorpay) throw new Error("Checkout is unavailable");
      let verifying = false;
      const checkout = new window.Razorpay({
        key: data.keyId,
        order_id: data.order.id,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Servizato",
        description: "Service invoice payment",
        prefill: {
          name: customerName || "",
          contact: customerPhone || "",
          email: customerEmail || "",
        },
        modal: {
          ondismiss: () => {
            if (verifying) return;
            setNotice({
              text: "Checkout closed. Check the current balance before trying again.",
            });
            void refreshAndRelease();
          },
        },
        handler: async (response) => {
          if (verifying) return;
          verifying = true;
          setNotice({ text: "Checking payment confirmation…" });
          try {
            const { data } = await api.post<{ ok?: boolean }>(
              "/razorpay/verify",
              response,
            );
            if (!data.ok) throw new Error("Payment not confirmed");
            setNotice({ text: "Payment verified. Refreshing your bill." });
          } catch {
            setNotice({
              error: true,
              text: "Payment confirmation is pending. Refresh your bill before trying again.",
            });
          } finally {
            await refreshAndRelease();
          }
        },
      });
      checkout.on("payment.failed", () => {
        if (!verifying)
          setNotice({
            error: true,
            text: "Payment wasn’t completed. Retry in checkout or close it to refresh your bill.",
          });
      });
      checkout.open();
    } catch {
      setNotice({
        error: true,
        text: "Payment checkout is unavailable. Refresh the bill and try again if a balance is due.",
      });
      await refreshAndRelease();
    }
  }

  return (
    <div>
      <Button
        type="button"
        className="public-button public-button-primary min-h-11 w-full whitespace-normal text-center"
        disabled={busy || disabled}
        aria-busy={busy}
        onClick={() => void pay()}
      >
        {busy ? "Checking payment…" : "Pay securely with Razorpay"}
      </Button>
      {notice && (
        <p
          role={notice.error ? "alert" : "status"}
          className={`mt-3 text-xs leading-6 ${notice.error ? "text-primary" : "text-muted-foreground"}`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
