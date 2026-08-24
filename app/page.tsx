"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  CalendarCheck,
  ShieldCheck,
  CreditCard,
  Bell,
  Star,
  Users,
  Wrench,
  Building2,
  CheckCircle2,
  Sparkles,
  Zap,
  Clock,
  TrendingUp,
  MapPin,
  Quote,
  ArrowLeftRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const features = [
  {
    icon: Search,
    title: "Smart Discovery",
    description:
      "Customers describe their need and Servizato instantly finds matching service providers in their area.",
  },
  {
    icon: CalendarCheck,
    title: "Automated Booking",
    description:
      "From request to assignment, the platform handles scheduling, technician allocation, and confirmations.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Workflow",
    description:
      "OTP-verified job start, proof-of-work uploads, and progress tracking keep every service transparent.",
  },
  {
    icon: CreditCard,
    title: "Seamless Payments",
    description:
      "Transparent invoices and integrated payment collection — no chasing, no manual follow-ups.",
  },
  {
    icon: Bell,
    title: "Real-time Notifications",
    description:
      "Customers, providers, and technicians stay in sync with instant updates at every step.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    description:
      "Build trust with a two-way review system. Quality work rises to the top of the marketplace.",
  },
];

const roles = [
  {
    icon: Building2,
    title: "Platform Admin",
    tag: "Infrastructure Owner",
    description:
      "Oversee the entire marketplace. Monitor providers, customers, jobs, revenue, and platform health from one control center.",
    color: "coral",
    points: [
      "Provider approvals",
      "Platform analytics",
      "Revenue tracking",
      "User management",
    ],
  },
  {
    icon: Users,
    title: "Customer",
    tag: "Service Seeker",
    description:
      "Request a service, get matched with providers, track bookings, view invoices, pay online, and leave reviews.",
    color: "teal",
    points: [
      "Request a service",
      "Track booking timeline",
      "Pay invoices online",
      "Rate your experience",
    ],
  },
  {
    icon: Building2,
    title: "Service Provider",
    tag: "Business Owner",
    description:
      "Register your company, add technicians, define service areas and pricing, receive jobs, and grow your business.",
    color: "coral",
    points: [
      "Company profile",
      "Manage technicians",
      "Set service pricing",
      "Receive job requests",
    ],
  },
  {
    icon: Wrench,
    title: "Technician",
    tag: "Field Worker",
    description:
      "See assigned jobs, accept work, navigate to customers, start with OTP, upload proof, and complete tasks from mobile.",
    color: "teal",
    points: [
      "View assigned jobs",
      "OTP job start",
      "Upload proof of work",
      "Update job status",
    ],
  },
];

const workflowSteps = [
  {
    icon: Search,
    title: "Discovery",
    description: "Customer requests a service on the platform.",
  },
  {
    icon: ArrowLeftRight,
    title: "Matching",
    description: "Servizato finds suitable providers in the area.",
  },
  {
    icon: CalendarCheck,
    title: "Booking",
    description: "Provider accepts and assigns a technician.",
  },
  {
    icon: Wrench,
    title: "Execution",
    description: "Technician arrives, starts with OTP, uploads proof.",
  },
  {
    icon: CreditCard,
    title: "Invoice & Payment",
    description: "Invoice generated, customer pays online.",
  },
  {
    icon: Star,
    title: "Review",
    description: "Both parties rate the experience. Done.",
  },
];

const testimonials = [
  {
    name: "Priya Verma",
    role: "Customer",
    text: "I needed an AC repair and found a technician in minutes. The whole process — from booking to payment — was smooth and transparent.",
    rating: 5,
  },
  {
    name: "CoolCare Services",
    role: "Service Provider",
    text: "We registered on Servizato and started receiving jobs the same week. Managing our technicians and tracking payments is effortless now.",
    rating: 5,
  },
  {
    name: "Aman Kumar",
    role: "Technician",
    text: "I see my assigned jobs on my phone, navigate to the customer, start with OTP, and upload proof. Everything is organized and clear.",
    rating: 5,
  },
];

const stats = [
  { label: "Service categories", value: "50+" },
  { label: "Active providers", value: "200+" },
  { label: "Jobs completed", value: "15K+" },
  { label: "Customer rating", value: "4.8" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-white to-muted/30 text-foreground">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden isolate bg-white">
          {/* <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute left-1/2 top-0 h-125 w-200 -translate-x-1/2 rounded-full bg-brand-coral/10 blur-[120px]" />
          <div className="absolute right-0 top-40 h-100 w-100 rounded-full bg-brand-teal/10 blur-[100px]" /> */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-10" />

          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-125 w-200 -translate-x-1/2 rounded-full bg-brand-coral/10 blur-[120px]" />

          <div className="pointer-events-none absolute -right-25 top-40 -z-10 h-100 w-100px rounded-full bg-brand-teal/10 blur-[110px]" />

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-coral/20 bg-brand-coral/8 px-4 py-2 text-sm font-semibold text-brand-coral-dark shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  First 30 days free for service providers
                </div>

                <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
                  Find trusted professionals for your{" "}
                  <span className="gradient-text">service needs</span>
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  Servizato is a fully automated service marketplace. Customers
                  find skilled technicians in minutes. Service providers
                  register, manage their team, and grow their business. We
                  handle the rest — discovery, booking, matching, payments, and
                  reviews.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="w-full rounded-xl bg-linear-to-r from-brand-coral to-brand-coral-dark px-8 py-6 text-sm font-bold text-white shadow-lg shadow-brand-coral/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-coral/30 sm:w-auto"
                    >
                      Find a Service
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/signup?role=provider">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full rounded-xl border-brand-teal/30 bg-white px-8 py-6 text-sm font-bold text-brand-teal-dark shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-teal/[0.06] sm:w-auto"
                    >
                      Join as Service Provider
                    </Button>
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="font-display text-2xl font-bold text-black">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Hero visual */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="relative"
              >
                <div className="absolute -left-8 top-12 h-24 w-24 rounded-full bg-brand-coral/20 blur-3xl" />
                <div className="absolute -right-8 bottom-12 h-32 w-32 rounded-full bg-brand-teal/20 blur-3xl" />

                <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                  <div className="h-1.5 bg-linear-to-r from-brand-coral via-brand-coral-light to-brand-teal" />
                  <CardContent className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Live overview
                        </p>
                        <h2 className="font-display text-xl font-semibold text-black">
                          Marketplace at a glance
                        </h2>
                      </div>
                      <Badge className="bg-brand-teal/10 text-brand-teal-dark hover:bg-brand-teal/10">
                        <span className="mr-1.5 flex h-2 w-2">
                          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-brand-teal opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-teal" />
                        </span>
                        Live
                      </Badge>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          label: "Active jobs",
                          value: "47",
                          icon: Wrench,
                          color: "text-brand-coral",
                          bg: "bg-brand-coral/10",
                        },
                        {
                          label: "Revenue today",
                          value: "\u20B984,200",
                          icon: TrendingUp,
                          color: "text-brand-teal-dark",
                          bg: "bg-brand-teal/10",
                        },
                        {
                          label: "New requests",
                          value: "23",
                          icon: Bell,
                          color: "text-amber-600 dark:test-amber-400",
                          bg: "bg-amber-100/70 dark:bg-amber-400/10",
                        },
                        {
                          label: "Completed",
                          value: "156",
                          icon: CheckCircle2,
                          color: "text-emerald-600 dark:text-emrald-400",
                          bg: "bg-emerald-100/70 dark:bg-emerald-400/10",
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            //className="rounded-2xl border border-border/60 bg-white p-4 transition hover:shadow-md"
                            className="rounded-2xl border border-border/70 dark:bg-foreground/10 bg-card p-4 text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-md"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}
                              >
                                <Icon className={`h-4 w-4 ${item.color}`} />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">
                                {item.label}
                              </span>
                            </div>
                            <p className="mt-3 font-display text-2xl font-bold dark:text-background text-foreground">
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 rounded-2xl border border-brand-coral/15 bg-linear-to-r from-brand-coral/5 to-brand-teal/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/20">
                          <Zap className="h-5 w-5" fill="currentColor" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground dark:text-background">
                            Fully automated workflow
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Discovery, matching, booking, OTP, proof, invoice,
                            payment, reviews.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Floating badge */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-border/60 bg-white p-3 shadow-xl sm:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal/10">
                      <ShieldCheck className="h-4 w-4 text-brand-teal-dark" />
                    </div>
                    <div>
                      <p className="text-sm md:text-xs font-bold dark:text-brand-teal text-brand-teal">
                        Verified providers
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Background-checked
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="relative border-t border-border bg-muted/0  py-24"
        >
          <div className="mx-auto max-w-7xl  px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-coral">
                How it works
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground dark:text-background sm:text-4xl">
                Three actors, one seamless flow
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-background dark:text-muted">
                Servizato provides the infrastructure and marketplace. Customers
                find technicians, providers manage their business, and the
                platform handles everything in between.
              </p>
            </motion.div>

            {/* Actor diagram */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Customer",
                  desc: "“I need AC repair.” The platform finds suitable service providers nearby.",
                  color: "coral",
                },
                {
                  icon: Building2,
                  title: "Your Platform",
                  desc: "Handles discovery, matching, booking, OTP, proof, invoice, payment, notifications, reviews.",
                  color: "teal",
                  isCenter: true,
                },
                {
                  icon: Wrench,
                  title: "Service Provider",
                  desc: "Registers company, adds technicians, defines areas and pricing, receives jobs.",
                  color: "coral",
                },
              ].map((actor, i) => {
                const Icon = actor.icon;
                return (
                  <motion.div
                    key={actor.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <Card
                      className={`h-full border-border/60 transition hover:shadow-xl ${
                        actor.isCenter
                          ? "border-brand-teal/30 bg-linear-to-b from-brand-teal to-white shadow-lg shadow-brand-teal/10"
                          : "bg-card dark:bg-background/0 shadow-sm hover:shadow-brand-coral/10"
                      }`}
                    >
                      <CardContent className="p-6">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                            actor.isCenter
                              ? "bg-linear-to-br from-brand-teal to-brand-teal text-white shadow-lg shadow-brand-teal/25"
                              : "bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-5 font-display text-lg font-semibold text-foreground dark:text-background">
                          {actor.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 dark:text-accent text-muted-foreground">
                          {actor.desc}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Workflow steps */}
            <div className="mt-16">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                {workflowSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className="relative"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card dark:bg-foreground/10 shadow-sm transition hover:shadow-md">
                          <Icon className="h-5 w-5 text-brand-coral" />
                        </div>
                        <p className="mt-3 text-md font-semibold text-foreground dark:text-accent">
                          {step.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 dark:text-muted text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                      {i < workflowSteps.length - 1 && (
                        <div className="absolute right-0 top-6 hidden h-px w-full -translate-y-1/2 translate-x-1/2 bg-linear-to-r from-border to-transparent lg:block" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-t border-border bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-teal-dark">
                Platform features
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-black sm:text-4xl">
                Everything the marketplace handles for you
              </h2>
              <p className="mt-4 font-semibold leading-7 text-muted-foreground">
                Servizato is the infrastructure layer. We provide the tools — you
                bring the customers and the service providers.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    <Card className="group h-full border-border/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-coral/5">
                      <CardContent className="p-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/20 transition group-hover:scale-105">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 font-display text-lg font-semibold text-black ">
                          {feature.title}
                        </h3>
                        <p className="mt-2 text-md leading-6 text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Roles */}
        <section
          id="roles"
          className="border-t border-border bg-linear-to-b from-muted/0 to-white py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-coral">
                Role-based experience
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-black sm:text-4xl">
                Each user sees exactly what they need
              </h2>
              <p className="mt-4 text-base dark:text-muted text-muted-foreground leading-7 ">
                Four dedicated experiences, each tailored to its role. Try them
                all on the demo page.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {roles.map((role, i) => {
                const Icon = role.icon;
                const isCoral = role.color === "coral";
                return (
                  <motion.div
                    key={role.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Card className="group h-full border-border/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                              isCoral
                                ? "bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/20"
                                : "bg-linear-to-br from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/20"
                            } transition group-hover:scale-105`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-lg font-semibold text-black">
                                {role.title}
                              </h3>
                              <Badge variant="default" className="text-xs text-shadow-accent">
                                {role.tag}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {role.description}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {role.points.map((point) => (
                                <span
                                  key={point}
                                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/0 px-2.5 py-1 text-xs dark:text-muted text-muted-foreground"
                                >
                                  <CheckCircle2 className="h-3 w-3  text-brand-teal-dark" />
                                  {point}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <Link href="/demo">
                <Button
                  variant="link"
                  className="border-brand-coral/60 text-shadow-brand-lime hover:bg-brand-coral/5"
                >
                  Try the demo with sample credentials
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing / Offer */}
        <section
          id="pricing"
          className="relative overflow-hidden border-t border-border bg-white py-20"
        >
          <div className="absolute left-1/2 top-0 h-100 w-150 -translate-x-1/2 rounded-full bg-brand-teal/8 blur-[100px]" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-teal-dark">
                Pricing
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-black sm:text-4xl">
                Start your business with us — free for 30 days
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                No credit card required. Register your company, add your
                technicians, and start receiving jobs. After 30 days, pick a
                plan that works for you.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-10"
            >
              {/* <Card className="relative overflow-hidden border-brand-coral/20 bg-linear-to-br dark:from-10% from-0%  dark:to-brand-coral-dark/80 shadow-xl shadow-brand-coral/10">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-coral/10 blur-3xl" />
                <CardContent className="relative p-8 sm:p-10">
                  <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-brand-coral/10 px-3 py-1 text-xs font-semibold text-brand-coral-light">
                        <Clock className="h-3.5 w-3.5" />
                        30-day free trial
                      </div>
                      <h3 className="mt-4 font-display text-2xl font-bold text-foreground">
                        Service Provider Plan
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Full access to all features. No setup fee. Cancel
                        anytime.
                      </p>
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="font-display text-4xl font-bold text-foreground">
                          Free
                        </span>
                        <span className="text-sm text-muted-foreground">
                          for 30 days
                        </span>
                      </div>
                    </div>

                    <div className="w-full max-w-sm space-y-3 lg:w-auto">
                      {[
                        "Company profile and branding",
                        "Add unlimited technicians",
                        "Define service areas and pricing",
                        "Receive and manage job requests",
                        "Invoice and payment collection",
                        "Reviews and ratings",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal/15">
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand-lime" />
                          </div>
                          <span className="text-sm text-foreground">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/signup?role=provider" className="flex-1">
                      <Button className="w-full bg-linear-to-r from-brand-coral to-brand-coral-dark px-8 text-white shadow-lg shadow-brand-coral/25 hover:shadow-xl hover:shadow-brand-coral/40">
                        Create Business Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/demo" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full border-border text-foreground hover:bg-muted"
                      >
                        Explore the demo first
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card> */}
              <Card className="relative overflow-hidden border-brand-coral/20 bg-linear-to-br from-brand-coral/10 via-card to-brand-teal/10 shadow-xl shadow-brand-coral/10">
  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-coral/10 blur-3xl" />

  <CardContent className="relative p-8 sm:p-10">
    <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">

      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-coral/20 bg-brand-coral/10 px-3 py-1 text-xs font-semibold text-brand-coral-dark dark:text-brand-coral-light">
          <Clock className="h-3.5 w-3.5" />
          30-day free trial
        </div>

        <h3 className="mt-4 font-display text-2xl font-bold text-foreground">
          Service Provider Plan
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          Full access to all features. No setup fee. Cancel anytime.
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold text-foreground">
            Free
          </span>

          <span className="text-sm text-muted-foreground">
            for 30 days
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 lg:w-auto">
        {[
          "Company profile and branding",
          "Add unlimited technicians",
          "Define service areas and pricing",
          "Receive and manage job requests",
          "Invoice and payment collection",
          "Reviews and ratings",
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal/15">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal dark:text-brand-lime" />
            </div>

            <span className="text-sm text-foreground">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link
        href="/signup?role=provider"
        className="flex-1"
      >
        <Button className="w-full bg-linear-to-r from-brand-coral to-brand-coral-dark px-8 text-white shadow-lg shadow-brand-coral/25 hover:shadow-xl hover:shadow-brand-coral/40">
          Create Business Account
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>

      <Link
        href="/demo"
        className="flex-1"
      >
        <Button
          variant="outline"
          className="w-full border-border text-foreground hover:bg-muted"
        >
          Explore the demo first
        </Button>
      </Link>
    </div>
  </CardContent>
</Card>
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-t border-border bg-linear-to-b from-white to-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-coral">
                Testimonials
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-black sm:text-4xl">
                Loved by customers, providers, and technicians
              </h2>
            </motion.div>

            {/* <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card className="h-full border-border/60 bg-white shadow-sm">
                    <CardContent className="p-6">
                      <Quote className="h-8 w-8 text-brand-coral/20" />
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {t.text}
                      </p>
                      <div className="mt-4 flex items-center gap-1">
                        {Array.from({ length: t.rating }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="h-4 w-4 fill-brand-coral text-brand-coral"
                          />
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-brand-coral to-brand-teal text-sm font-semibold text-white">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-accent">
                            {t.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.role}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div> */}
            <div className="mt-10 grid gap-6 md:grid-cols-3">
  {testimonials.map((t, i) => (
    <motion.div
      key={t.name}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.4,
        delay: i * 0.08,
      }}
    >
      <Card className="h-full border-border/60 bg-card dark:bg-foreground/0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <CardContent className="p-6">

          <Quote className="h-8 w-8 text-brand-coral/20" />

          <p className="mt-3 text-sm leading-6 dark:text-accent text-muted-foreground">
            {t.text}
          </p>

          <div className="mt-4 flex items-center gap-1">
            {Array.from({
              length: t.rating,
            }).map((_, idx) => (
              <Star
                key={idx}
                className="h-4 w-4 fill-brand-coral text-brand-coral"
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-brand-coral to-brand-teal text-sm font-semibold text-white">
              {t.name.charAt(0)}
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground dark:text-background">
                {t.name}
              </p>

              <p className="text-xs text-muted-foreground">
                {t.role}
              </p>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  ))}
</div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          id="contact"
          className="relative overflow-hidden border-t border-border bg-linear-to-r from-brand-coral-dark via-brand-coral to-brand-coral-dark py-20 text-white"
        >
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute left-1/2 top-0 h-75 w-125 -translate-x-1/2 rounded-full bg-white/10 blur-[100px]" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Ready to begin
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl text-balance">
                  Join Servizato today. First 30 days free for service providers.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/80">
                  Customers find trusted professionals. Providers grow their
                  business. Servizato handles the rest.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
  <Link href="/signup">
    <Button
      size="lg"
      className="bg-white  px-8 text-brand-coral-dark shadow-lg shadow-black/10 hover:bg-white/90 dark:bg-card-foreground dark:text-brand-coral-light dark:hover:bg-card/90"
    >
      Get started
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </Link>

  <Link href="/demo">
    <Button
      size="lg"
      variant="outline"
      className="border-white/25 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
    >
      Try the demo
    </Button>
  </Link>
</div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
