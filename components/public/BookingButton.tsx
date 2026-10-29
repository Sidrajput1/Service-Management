"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CalendarCheck2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authHref, safeBookingDestination } from "@/lib/booking-redirect";
import { getRoleHome } from "@/lib/role-route";

export function BookingButton({ destination, serviceName, className = "", label = "Book service" }: {
  destination: string; serviceName?: string; className?: string; label?: string;
}) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const safe = safeBookingDestination(destination) || "/customer/services";

  if (session && role === "customer") {
    return <Link href={safe} className={`public-button public-button-primary ${className}`}>{label}<ArrowRight className="size-4" /></Link>;
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button disabled={status === "loading"} className={`public-button public-button-primary ${className}`} />}>
        {status === "loading" ? "Please wait…" : label}<ArrowRight className="size-4" />
      </DialogTrigger>
      <DialogContent className="booking-auth-dialog w-[calc(100%_-_2rem)]! max-w-115! max-h-[90dvh] overflow-y-auto rounded-3xl p-7 sm:p-9">
        <div className="mb-2 flex size-13 items-center justify-center rounded-2xl bg-primary/8 text-primary"><LockKeyhole className="size-6" /></div>
        <DialogTitle className="font-display text-2xl font-semibold tracking-tight">{session ? "A customer account is needed" : "Your next service starts here"}</DialogTitle>
        <DialogDescription className="text-sm leading-7">
          {session ? "You’re signed in with a business or team account. Service bookings use a customer account so requests, job updates, and invoices stay together." : "Log in or create a customer account to send a booking request, follow its progress, and access your invoices."}
        </DialogDescription>
        {serviceName && <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4"><CalendarCheck2 className="size-5 shrink-0 text-brand-teal-dark" /><div><p className="text-xs text-muted-foreground">Your selected service</p><p className="mt-1 font-semibold">{serviceName}</p></div></div>}
        <div className="mt-2 flex flex-col gap-3">
          {session ? <Link href={getRoleHome(role)} className="public-button public-button-primary">Go to my dashboard <ArrowRight className="size-4" /></Link> : <>
            <Link href={authHref("/signin", safe)} className="public-button public-button-primary">Log in to continue <ArrowRight className="size-4" /></Link>
            <Link href={authHref("/signup", safe)} className="public-button public-button-outline">Create a customer account</Link>
            <p className="mt-1 text-center text-xs leading-5 text-muted-foreground">Your selected service will be waiting after you sign in.</p>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
