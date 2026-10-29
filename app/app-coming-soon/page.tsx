import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { proJobReturn } from "@/lib/pro-tracking.mjs";

export const metadata: Metadata = {
  title: "Servizato App — Coming Soon",
  description:
    "The dedicated Servizato app is coming soon. Continue managing your service jobs on the Servizato website.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const job = typeof parameters.job === "string" ? parameters.job : undefined;
  const destination = proJobReturn(job);
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main
        id="main-content"
        className="public-container flex min-h-[68vh] items-center py-12 sm:py-20"
      >
        <section
          className="mx-auto grid w-full max-w-5xl gap-8 overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14 lg:p-14"
          aria-labelledby="app-title"
        >
          <div
            className="relative flex min-h-64 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 p-8 sm:min-h-80"
            aria-hidden="true"
          >
            <div className="flex h-60 w-36 flex-col items-center justify-center gap-5 rounded-[2rem] border-4 border-foreground/75 bg-background shadow-xl">
              <span className="absolute top-12 h-1 w-10 rounded-full bg-foreground/30 sm:top-15" />
              <Smartphone className="size-14 text-primary" strokeWidth={1.4} />
              <span className="text-sm font-bold tracking-tight">
                Servizato
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Coming soon
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="public-eyebrow">
              A LITTLE HELP, WHEREVER WORK TAKES YOU
            </p>
            <h1
              id="app-title"
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Servizato App
            </h1>
            <p className="mt-3 text-2xl font-semibold text-primary">
              Coming Soon
            </p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              We’re working on a dedicated Servizato app to make managing your
              service jobs even easier.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              For now, your job workflow stays available on the website. Browser
              location support and permissions can vary; use the web job’s
              permitted manual actions whenever location reporting is
              unavailable.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:items-start">
              <Link
                href={destination}
                className="public-button public-button-primary w-full sm:w-auto"
              >
                <ArrowLeft className="size-4" />
                {destination === "/technician/all-jobs"
                  ? "Return to my jobs"
                  : "Return to this job"}
              </Link>
              <Link
                href="/technician/dashboard"
                className="public-text-link min-h-11"
              >
                Technician dashboard
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
              <ShieldCheck className="mt-1 size-4 shrink-0" />
              This page is informational. Your current booking, navigation
              destination and job status stay as saved.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
