import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Check,
  CheckCheck,
  ClipboardList,
  FileCheck2,
  House,
  ListChecks,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Wrench,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingButton } from "@/components/public/BookingButton";
import { CatalogSkeleton } from "@/components/public/ServiceCatalog";
import { PublicServices } from "@/components/public/PublicServices";
import { HomeIllustration } from "@/components/public/HomeIllustration";
import { TopRatedProviders } from "@/components/public/TopRatedProviders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Servizato | All your services, one place",
  description:
    "Find local service providers, compare available services, and manage booking requests, job updates, and invoices in one place with Servizato.",
  openGraph: {
    title: "Servizato | A helping hand for your everyday",
    description:
      "Discover local services. Request a booking. Keep everything together.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Servizato | All your services, one place",
    description: "A better way to find, book, and manage local services.",
  },
};

const steps = [
  {
    icon: Search,
    title: "Find your service",
    text: "Explore the catalog and choose the service you need.",
  },
  {
    icon: CalendarCheck2,
    title: "Make a request",
    text: "Choose a provider, add your address, and request a preferred time.",
  },
  {
    icon: Wrench,
    title: "Follow the progress",
    text: "Once accepted, see your booking and Pro updates.",
  },
  {
    icon: Star,
    title: "Wrap up with ease",
    text: "View your invoice, make a payment, and share your feedback.",
  },
];

const faqs = [
  [
    "Can I explore services without an account?",
    "Yes. Browse available services and starting prices here. You’ll need to log in or create a customer account when you’re ready to request a booking. Your selected service is carried through sign-in.",
  ],
  [
    "What happens after I request a service?",
    "Your request is sent to the selected service provider. The provider can accept the request and assign a Pro. You can follow booking and job updates from your My bookings. Submitting a request does not guarantee acceptance.",
  ],
  [
    "How are service prices and payments handled?",
    "Service cards show a starting price from an active provider offering, with the applicable tax shown separately. Review the provider’s details before requesting a booking. Invoices and available online payment options are accessible from your customer account.",
  ],
  [
    "Can I cancel a booking or ask for help?",
    "Open your booking to review its status. When a job is linked to the booking, use its service conversation to contact the team about help, changes, or a cancellation request. Confirm any cancellation and refund terms with your provider.",
  ],
  [
    "How do I offer my services on Servizato?",
    "Choose Become a provider and register your business using the existing provider signup flow. Complete your business profile, service areas, and offerings during onboarding. Public listings depend on your provider status and verification.",
  ],
];

export default function HomePage() {
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main-content">
        <section className="public-hero relative overflow-hidden">
          <div className="public-container grid items-center gap-5 pb-14 pt-12 lg:grid-cols-[1.04fr_1fr] lg:pb-18 lg:pt-17">
            <div className="relative z-10 max-w-150">
              <div className="public-eyebrow mb-6">
                <span className="size-1.5 rounded-full bg-primary" /> A HELPING
                HAND, WHEN YOU NEED ONE
              </div>
              <h1 className="public-hero-title">
                Life happens.
                <br />
                We help you
                <br />
                <span className="relative inline-block text-primary">
                  handle it.
                  <svg
                    viewBox="0 0 340 15"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 10Q160-3 335 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      opacity=".35"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-7 max-w-110 text-base leading-8 text-muted-foreground">
                From the little fixes to your everyday service needs, find local
                professionals and keep every booking in one place.
              </p>
              <form
                action="/services"
                className="public-hero-search mt-8 flex max-w-122 items-center gap-3 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-foreground/4"
              >
                <Search className="ml-3 size-5 shrink-0 text-primary" />
                <label htmlFor="hero-search" className="sr-only">
                  Search available services
                </label>
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  maxLength={100}
                  placeholder="What needs a helping hand?"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  className="public-button public-button-primary px-5"
                >
                  <span className="hidden sm:inline">Find a service</span>
                  <span className="sm:hidden">Search</span>
                  <ArrowRight className="size-4" />
                </button>
              </form>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-brand-teal-dark" /> Browse
                  without signing up
                </span>
                <Link
                  href="#how-it-works"
                  className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-foreground hover:text-primary"
                >
                  See how it works <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
            <div className="public-hero-art relative mx-auto w-full max-w-150">
              <div className="public-art-caption absolute left-5 top-10 z-10 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-lg shadow-foreground/4 sm:left-4 sm:top-13">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-brand-teal-dark">
                  <House className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Less to worry about
                  </p>
                  <p className="mt-1 text-sm font-bold">More room for life.</p>
                </div>
              </div>
              <HomeIllustration />
              <div className="public-art-caption absolute bottom-6 right-1 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-xl shadow-foreground/5 sm:bottom-7 sm:right-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <CheckCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">
                    One place. From start to finish.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bookings · Updates · Invoices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="border-y border-border bg-muted/25">
          <div className="public-container grid gap-6 py-7 sm:grid-cols-3">
            {[
              {
                icon: ListChecks,
                title: "Your services, together",
                text: "Discover, request, and manage",
              },
              {
                icon: MessageCircle,
                title: "Stay in the loop",
                text: "Booking updates and service conversations",
              },
              {
                icon: FileCheck2,
                title: "Clarity at every step",
                text: "Service details, invoices, and payment records",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 sm:justify-center"
              >
                <item.icon
                  className="size-6 shrink-0 text-brand-teal-dark"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section id="services" className="public-container public-section">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="public-eyebrow">A LITTLE HELP GOES A LONG WAY</p>
              <h2 className="public-section-title mt-3">
                What can we take off your list?
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Explore services offered by active providers on Servizato.
              </p>
            </div>
            <Link href="/services" className="public-text-link pb-1">
              Explore all services <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <Suspense fallback={<CatalogSkeleton />}>
            <PublicServices featured />
          </Suspense>
        </section>

        <section id="how-it-works" className="bg-secondary/60">
          <div className="public-container public-section">
            <div className="text-center">
              <p className="public-eyebrow justify-center">
                LESS HASSLE. MORE LIVING.
              </p>
              <h2 className="public-section-title mt-3">
                From your to-do list to done.
              </h2>
              <p className="mx-auto mt-4 max-w-130 text-sm leading-7 text-muted-foreground">
                A clear path from finding help to following the work, with the
                details kept together along the way.
              </p>
            </div>
            <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  <div className="mb-5 flex items-center gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-brand-teal/15 bg-card text-brand-teal-dark">
                      <step.icon className="size-6" strokeWidth={1.6} />
                    </span>
                    <span className="text-xs font-semibold tracking-widest text-brand-teal-dark/70">
                      0{i + 1}
                    </span>
                    {i < 3 && (
                      <div className="hidden h-px flex-1 border-t border-dashed border-brand-teal/25 lg:block" />
                    )}
                  </div>
                  <h3 className="font-display text-base font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-60 text-sm leading-7 text-muted-foreground">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="about"
          className="public-container public-section grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
        >
          <div className="public-customer-visual rounded-3xl border border-border bg-muted/35 p-5 sm:p-9">
            <div className="mb-7 flex items-center justify-between">
              <span className="public-eyebrow text-[10px]">
                ONE CONNECTED EXPERIENCE
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-card text-primary">
                <Sparkles className="size-4" />
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-foreground/3 sm:p-7">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-brand-teal-dark">
                  <ClipboardList className="size-5" />
                </span>
                <div>
                  <p className="font-bold">Your service, at a glance</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The details that matter, together.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-6">
                {[
                  {
                    icon: CalendarCheck2,
                    title: "Your booking",
                    text: "Service, provider, and preferred time",
                  },
                  {
                    icon: Wrench,
                    title: "Your job updates",
                    text: "Pro assignment and work status",
                  },
                  {
                    icon: FileCheck2,
                    title: "Your invoice",
                    text: "Line items and payment information",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-brand-teal-dark">
                      <item.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-5 text-center text-xs leading-6 text-muted-foreground">
              A simpler way to stay on top of your service needs.
            </p>
          </div>
          <div>
            <p className="public-eyebrow">MADE FOR YOUR EVERYDAY</p>
            <h2 className="public-section-title mt-4">
              Good help.
              <br />
              Less running around.
            </h2>
            <p className="mt-5 text-sm leading-8 text-muted-foreground">
              Servizato brings customers, service providers, and Pros into one
              connected journey. Find a suitable service, keep up with the work,
              and come back to the details whenever you need them.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                "Compare services and listed provider pricing",
                "Manage booking requests and follow job progress",
                "Message your service team and access invoices",
                "Share a review after your service is completed",
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-start gap-3 text-sm leading-6"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-brand-teal-dark">
                    <Check className="size-3" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <BookingButton
              destination="/customer/services"
              label="Start your next booking"
              className="mt-8"
            />
          </div>
        </section>

        <Suspense>
          <TopRatedProviders />
        </Suspense>
        <section id="for-providers" className="public-container pb-18 sm:pb-24">
          <div className="public-provider-panel relative overflow-hidden rounded-3xl bg-foreground px-7 py-10 text-background sm:px-12 lg:px-14 lg:py-14">
            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-18">
              <div>
                <p className="public-eyebrow text-background/65">
                  <UsersRound className="size-4" /> FOR THE PEOPLE WHO MAKE
                  THINGS WORK
                </p>
                <h2 className="public-section-title mt-4 text-background">
                  You bring the expertise.
                  <br />
                  <span className="text-primary">We bring it together.</span>
                </h2>
                <p className="mt-5 max-w-110 text-sm leading-8 text-background/70">
                  Give your service business a home. Manage your offerings,
                  team, and incoming requests with tools built around the way
                  service work happens.
                </p>
                <Link
                  href="/signup?role=provider"
                  className="public-button public-button-primary mt-7"
                >
                  Become a provider <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Wrench,
                    title: "Your services",
                    text: "Manage offerings and prices",
                  },
                  {
                    icon: CalendarCheck2,
                    title: "Your bookings",
                    text: "Review incoming requests",
                  },
                  {
                    icon: UsersRound,
                    title: "Your team",
                    text: "Assign Pros to jobs",
                  },
                  {
                    icon: FileCheck2,
                    title: "Your business",
                    text: "Track jobs and invoices",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-background/10 bg-background/5 p-5"
                  >
                    <item.icon
                      className="mb-5 size-6 text-brand-coral-light"
                      strokeWidth={1.5}
                    />
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-background/65">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="public-container grid gap-8 pb-20 lg:grid-cols-[.75fr_1.25fr] lg:gap-20"
        >
          <div>
            <p className="public-eyebrow">LET’S CLEAR THINGS UP</p>
            <h2 className="public-section-title mt-4">
              Good questions.
              <br />
              Helpful answers.
            </h2>
            <p className="mt-5 max-w-72 text-sm leading-7 text-muted-foreground">
              A few things to know before you get started with Servizato.
            </p>
            <Link href="/services" className="public-text-link mt-6">
              Find your next service <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div>
            {faqs.map(([question, answer]) => (
              <details
                key={question}
                className="public-faq group border-b border-border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-semibold leading-6">
                  {question}
                  <span
                    className="public-faq-plus flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-normal text-muted-foreground group-open:bg-primary/8 group-open:text-primary"
                    aria-hidden="true"
                  />
                </summary>
                <p className="max-w-140 pb-6 pr-8 text-sm leading-7 text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-primary/10 bg-primary/4">
          <div className="public-container flex flex-col items-center justify-between gap-7 py-12 text-center sm:flex-row sm:text-left">
            <div>
              <p className="public-eyebrow justify-center sm:justify-start">
                <ShieldCheck className="size-4" /> ALL YOUR SERVICES, ONE PLACE
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Make room for what matters.
              </h2>
            </div>
            <Link
              href="/services"
              className="public-button public-button-primary"
            >
              Explore services <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
