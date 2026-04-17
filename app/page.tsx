"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: LayoutDashboard,
    title: "Role-based dashboards",
    description:
      "Dedicated experiences for admin, dispatcher, technician, and customer with the right actions in the right place.",
  },
  {
    icon: ClipboardList,
    title: "End-to-end booking flow",
    description:
      "From lead creation to job assignment, execution, invoice generation, and payment collection.",
  },
  {
    icon: CreditCard,
    title: "Smooth payments",
    description:
      "Razorpay-powered payment flow with transparent invoices and clean payment states.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted operations",
    description:
      "OTP start, proof upload, notifications, and progress tracking for a reliable service workflow.",
  },
];

const roles = [
  {
    icon: Users,
    title: "Admin & Dispatcher",
    description:
      "Track leads, jobs, payments, technicians, and business performance from one control center.",
  },
  {
    icon: Wrench,
    title: "Technician",
    description:
      "See assigned jobs, accept work, update status, upload proof, and complete tasks from mobile-friendly screens.",
  },
  {
    icon: Star,
    title: "Customer",
    description:
      "Request services, follow booking timelines, view invoices, make payments, and stay updated with notifications.",
  },
];

const stats = [
  { label: "Connected modules", value: "10+" },
  { label: "Role-based views", value: "4 roles" },
  { label: "Core workflows", value: "100% covered" },
  { label: "Mobile-friendly", value: "Fully responsive" },
];

const workflow = [
  "Authentication with roles",
  "Lead management",
  "Booking management",
  "Job creation and technician assignment",
  "Technician workflow: accept job, reach customer, OTP start, proof upload, complete job",
  "Invoice and billing system",
  "Razorpay payment integration",
  "Customer dashboard, booking request, bookings timeline, invoices, payment, profile",
  "Notification system",
  "Price master for service, part, and visit items",
  "Admin analytics dashboard",
  "Technician and admin dashboards",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_30%),linear-gradient(to_bottom,#f8fbff,#eef5ff_45%,#ffffff)] text-slate-900 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                ServiceFlow SaaS
              </p>
              <p className="text-xs text-slate-500">Modern service management</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">
              Features
            </a>
            <a href="#roles" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">
              Roles
            </a>
            <a href="#workflow" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">
              Workflow
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-600 transition hover:text-blue-700">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/signin">
              <Button variant="ghost" className="hidden sm:inline-flex text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-600">
                Sign up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                A polished SaaS for service businesses
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Manage service operations with clarity, speed, and a premium modern interface.
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Built for service companies that need role-based dashboards, booking workflows, technician tracking, billing, payments, and customer communication in one place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button  size="lg" className="rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 px-6 text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:via-indigo-700 hover:to-cyan-600">
                  <Link href="/signup">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button  size="lg" variant="outline" className="rounded-xl border-slate-300 px-6 text-slate-800 hover:bg-blue-50 hover:text-blue-700">
                  <Link href="/signin">Sign in</Link>
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((stat) => (
                  <Card key={stat.label} className="border-blue-100/70 bg-white/85 shadow-sm backdrop-blur">
                    <CardContent className="p-4">
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-blue-300/30 blur-3xl" />
              <div className="absolute -right-8 bottom-8 h-32 w-32 rounded-full bg-cyan-300/30 blur-3xl" />

              <Card className="relative overflow-hidden border-blue-100/80 bg-white shadow-2xl shadow-blue-500/10">
                <div className="h-2 bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500" />
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Today&apos;s overview</p>
                      <h2 className="text-xl font-semibold text-slate-900">Operations at a glance</h2>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Live
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { label: "Pending jobs", value: "18", accent: "bg-amber-50 text-amber-700 ring-1 ring-amber-100" },
                      { label: "Revenue", value: "₹42,800", accent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" },
                      { label: "New leads", value: "26", accent: "bg-sky-50 text-sky-700 ring-1 ring-sky-100" },
                      { label: "Unread alerts", value: "07", accent: "bg-rose-50 text-rose-700 ring-1 ring-rose-100" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.accent}`}>
                          {item.label}
                        </div>
                        <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50 via-indigo-50 to-cyan-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Designed for a premium workflow</p>
                        <p className="text-sm text-slate-600">Clear hierarchy, role-based access, and mobile-friendly interaction patterns.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section id="features" className="border-t border-blue-100 bg-white/80">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Designed to feel modern, fast, and trustworthy</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                This landing page sets the tone for the full product: minimal, professional, and focused on real operations.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="group border-blue-100/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 transition group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="bg-linear-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Role-based experience</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Each user sees exactly what they need</h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card key={role.title} className="border-blue-100/80 bg-white shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-slate-900">{role.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Workflow</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">A clean journey from lead to payment</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  The structure is built to support every screen you already have: booking requests, timelines, invoice views, notifications, dashboards, and master data screens.
                </p>
                <div className="mt-6 space-y-4">
                  {[
                    "Authentication with roles",
                    "Lead management",
                    "Booking management",
                    "Job creation and technician assignment",
                    "Technician workflow: accept job, reach customer, OTP start, proof upload, complete job",
                    "Invoice and billing system",
                    "Razorpay payment integration",
                    "Customer dashboard, booking request, bookings timeline, invoices, payment, profile",
                    "Notification system",
                    "Price master for service, part, and visit items",
                    "Admin analytics dashboard",
                    "Technician and admin dashboards",
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50 to-cyan-50 px-4 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-cyan-500 text-[11px] font-semibold text-white">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="border-blue-100/80 bg-linear-to-br from-white to-blue-50 shadow-xl shadow-blue-500/10">
                <CardContent className="p-6 sm:p-8">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { title: "Pending jobs", value: "12", note: "Assigned and unassigned" },
                      { title: "Completed today", value: "34", note: "Closed with proof" },
                      { title: "Payments due", value: "₹18,200", note: "Visible in customer portal" },
                      { title: "Notifications", value: "09", note: "Unread in dropdown" },
                    ].map((item) => (
                      <div key={item.title} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">{item.title}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-blue-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Ready to begin</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Start with a premium landing page, then extend the same style across the app.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/80">
                  Next step: dashboard shell, sidebar, header, and page-specific UI for admin, technician, and customer.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-xl bg-white px-6 text-slate-900 shadow-lg shadow-black/10 hover:bg-slate-100">
                  <Link href="/signup">Create account</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl border-white/25 px-6 text-white hover:bg-white/10 hover:text-white">
                  <Link href="/signin">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
