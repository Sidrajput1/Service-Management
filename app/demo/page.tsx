"use client";

import { useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  ShieldCheck,
  User,
  Wrench,
  Building2,
  Settings2,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Separator,
} from "@/components/ui/separator";

import { cn } from "@/lib/utils";

type DemoRole = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  email: string;
  password: string;
  icon: React.ElementType;
  accent: "coral" | "teal" | "blue" | "violet";
  loginPath: string;
  features: string[];
};

const demoRoles: DemoRole[] = [
  {
    id: "customer",
    title: "Customer",
    subtitle: "Discover & book services",
    description:
      "Explore providers, compare prices and offers, request services, track technicians, pay invoices, and leave reviews.",
    email: "demo.customer@servizato.in",
    password: "Demo@123456",
    icon: User,
    accent: "coral",
    loginPath: "/signin",
    features: [
      "Service discovery",
      "Provider comparison",
      "Booking tracking",
      "Invoice & payments",
      "Reviews & ratings",
    ],
  },

  {
    id: "provider",
    title: "Service Provider",
    subtitle: "Manage your service business",
    description:
      "Explore the provider workflow including services, pricing, offers, technicians, booking requests, jobs, finance, and reviews.",
    email: "demo.provider@servizato.in",
    password: "Demo@123456",
    icon: Building2,
    accent: "teal",
    loginPath: "/signin",
    features: [
      "Business dashboard",
      "Service offerings",
      "Technician management",
      "Booking requests",
      "Finance & invoices",
    ],
  },

  {
    id: "technician",
    title: "Technician",
    subtitle: "Execute assigned jobs",
    description:
      "Explore the technician workflow from accepting a job to arrival, OTP verification, parts, proof submission, completion, and payment status.",
    email: "demo.technician@servizato.in",
    password: "Demo@123456",
    icon: Wrench,
    accent: "blue",
    loginPath: "/signin",
    features: [
      "Assigned jobs",
      "Accept & execute jobs",
      "Customer OTP",
      "Parts & proof",
      "Job completion",
    ],
  },

  {
    id: "admin",
    title: "Platform Admin",
    subtitle: "Manage the marketplace",
    description:
      "Explore the administrative side of Servizato including marketplace operations, users, providers, bookings, finance, and platform management.",
    email: "demo.admin@servizato.in",
    password: "Demo@123456",
    icon: Settings2,
    accent: "violet",
    loginPath: "/signin",
    features: [
      "Marketplace overview",
      "Provider management",
      "User management",
      "Bookings & operations",
      "Platform controls",
    ],
  },
];

function getAccentStyles(
  accent: DemoRole["accent"],
) {
  switch (accent) {
    case "teal":
      return {
        icon:
          "bg-brand-teal/10 text-brand-teal",
        border:
          "hover:border-brand-teal/30",
        glow:
          "bg-brand-teal/10",
        button:
          "bg-brand-teal text-white hover:bg-brand-teal-dark",
      };

    case "blue":
      return {
        icon:
          "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        border:
          "hover:border-blue-500/30",
        glow:
          "bg-blue-500/10",
        button:
          "bg-blue-600 text-white hover:bg-blue-700",
      };

    case "violet":
      return {
        icon:
          "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        border:
          "hover:border-violet-500/30",
        glow:
          "bg-violet-500/10",
        button:
          "bg-violet-600 text-white hover:bg-violet-700",
      };

    default:
      return {
        icon:
          "bg-brand-coral/10 text-brand-coral",
        border:
          "hover:border-brand-coral/30",
        glow:
          "bg-brand-coral/10",
        button:
          "bg-brand-coral text-white hover:bg-brand-coral-dark",
      };
  }
}

function DemoCard({
  role,
  copied,
  onCopy,
}: {
  role: DemoRole;
  copied: string | null;
  onCopy: (
    value: string,
    key: string,
  ) => void;
}) {
  const Icon = role.icon;
  const styles =
    getAccentStyles(role.accent);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-xl",
        styles.border,
      )}
    >
      {/* Background glow */}
      <div
        className={cn(
          "absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl",
          styles.glow,
        )}
      />

      <CardContent className="relative p-6">

        {/* Icon + badge */}
        <div className="flex items-start justify-between gap-4">

          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              styles.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <Badge
            variant="secondary"
            className="rounded-full"
          >
            Demo access
          </Badge>

        </div>

        {/* Title */}
        <div className="mt-5">
          <h2 className="font-poppins text-xl font-semibold tracking-tight text-foreground">
            {role.title}
          </h2>

          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {role.subtitle}
          </p>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {role.description}
          </p>
        </div>

        {/* Features */}
        <div className="mt-5 space-y-2">
          {role.features.map(
            (feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/10">
                  <Check className="h-3 w-3 text-brand-teal" />
                </div>

                {feature}
              </div>
            ),
          )}
        </div>

        <Separator className="my-6" />

        {/* Credentials */}
        <div className="space-y-3">

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </p>

            <CredentialField
              value={role.email}
              copied={
                copied ===
                `${role.id}-email`
              }
              onCopy={() =>
                onCopy(
                  role.email,
                  `${role.id}-email`,
                )
              }
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </p>

            <CredentialField
              value={role.password}
              copied={
                copied ===
                `${role.id}-password`
              }
              onCopy={() =>
                onCopy(
                  role.password,
                  `${role.id}-password`,
                )
              }
              password
            />
          </div>

        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">

          <Link
            href={role.loginPath}
            className="flex-1"
          >
            <Button
              className={cn(
                "h-11 w-full rounded-xl",
                styles.button,
              )}
            >
              Open sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() =>
              onCopy(
                `${role.email}\n${role.password}`,
                `${role.id}-all`,
              )
            }
          >
            {copied ===
            `${role.id}-all` ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
          </Button>

        </div>

      </CardContent>
    </Card>
  );
}

function CredentialField({
  value,
  copied,
  onCopy,
  password = false,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
  password?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/40 p-2">

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2">

        {password ? (
          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <code className="min-w-0 truncate text-xs text-foreground">
          {value}
        </code>

      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 rounded-lg px-2.5"
        onClick={onCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Clipboard className="h-3.5 w-3.5" />
        )}
      </Button>

    </div>
  );
}

export default function DemoPage() {
  const [
    copied,
    setCopied,
  ] = useState<string | null>(
    null,
  );

  async function copyCredential(
    value: string,
    key: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(key);

      window.setTimeout(() => {
        setCopied(null);
      }, 1800);
    } catch (error) {
      console.error(
        "Copy failed:",
        error,
      );
    }
  }

  return (
    <main className="min-h-screen bg-background">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">

        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-coral/10 blur-3xl" />

        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-brand-teal/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">

          <div className="mx-auto max-w-3xl text-center">

            <Badge className="rounded-full border-brand-coral/20 bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/10">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Servizato Demo
            </Badge>

            <h1 className="mt-5 font-poppins text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Explore Servizato
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Explore the complete Servizato marketplace from
              different perspectives. Choose a role below and
              use the demo credentials to experience the platform.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">

              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-brand-teal" />
                Safe demo environment
              </div>

              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-brand-coral" />
                4 perspectives
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Demo roles */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-coral">
              Demo accounts
            </p>

            <h2 className="mt-2 font-poppins text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Choose how you want to explore
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Each account opens a different part of the Servizato
              marketplace.
            </p>
          </div>

          <Link href="/">
            <Button
              variant="outline"
              className="rounded-xl"
            >
              Back to Servizato
            </Button>
          </Link>

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {demoRoles.map(
            (role) => (
              <DemoCard
                key={role.id}
                role={role}
                copied={copied}
                onCopy={
                  copyCredential
                }
              />
            ),
          )}

        </div>

      </section>

      {/* Footer note */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">

        <Card className="overflow-hidden rounded-3xl border-brand-teal/20 bg-linear-to-r from-brand-teal/5 to-brand-coral/5">

          <CardContent className="p-6 sm:p-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-semibold text-foreground">
                    Demo environment
                  </p>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Please use the accounts above only for exploring
                    the platform. Demo data may be shared across visitors
                    and can be reset periodically.
                  </p>
                </div>

              </div>

              <Link href="/">
                <Button
                  variant="outline"
                  className="rounded-xl"
                >
                  Visit Servizato
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>

            </div>

          </CardContent>
        </Card>

      </section>

    </main>
  );
}