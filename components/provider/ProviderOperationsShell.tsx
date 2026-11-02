"use client";
import { ProviderReviewFeedback } from "./ReviewFeedback";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/push-client";
import {
  LayoutDashboard,
  Wrench,
  Users,
  MapPin,
  CalendarCheck,
  BriefcaseBusiness,
  FileText,
  Building2,
  Bell,
  Menu,
  LogOut,
  ClipboardCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useProviderOnboarding } from "@/hooks/useProviderOnboarding";
const navigation = [
  ["/service-provider", "Overview", LayoutDashboard],
  ["/service-provider/booking-requests", "Booking requests", ClipboardCheck],
  ["/service-provider/bookings", "Bookings", CalendarCheck],
  ["/service-provider/assigned-jobs", "Assigned jobs", BriefcaseBusiness],
  ["/service-provider/services", "Services & pricing", Wrench],
  ["/service-provider/manage-technicians", "Your Pros", Users],
  ["/service-provider/provider-services-area", "Service areas", MapPin],
  ["/service-provider/customers", "Customers", Users],
  ["/service-provider/finance", "Finance & invoices", FileText],
  ["/service-provider/profile", "Business profile", Building2],
  ["/notifications", "Notifications", Bell],
] as const;
export function ProviderOperationsShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    query = useProviderOnboarding();
  const [open, setOpen] = useState(false);
  const links = (
    <nav aria-label="Business navigation" className="space-y-1">
      {navigation.map(([href, label, Icon]) => {
        const active =
          href === "/service-provider"
            ? path === href
            : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            href={href}
            key={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-xs font-semibold transition ${active ? "bg-primary/8 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="provider-workspace min-h-screen bg-muted/20 text-foreground">
      <a href="#business-content" className="public-skip-link">
        Skip to business content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Link href="/" className="px-6 py-7" aria-label="Servizato home">
          <BrandLogo className="w-44" />
        </Link>
        <div className="overflow-y-auto px-3 pb-5">{links}</div>
        <div className="mt-auto border-t border-border p-4">
          <p className="text-xs leading-6 text-muted-foreground">
            Your services. Your team.
            <br />
            One place to run the work.
          </p>
          <Button
            variant="ghost"
            className="mt-3 h-11 w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/signin" })}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    className="size-11 lg:hidden"
                    aria-label="Open business navigation"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(90vw,340px)]! overflow-y-auto p-6"
              >
                <SheetTitle>
                  <BrandLogo />
                </SheetTitle>
                <SheetDescription>
                  Servizato business operations
                </SheetDescription>
                <div className="mt-5">{links}</div>
                <Button
                  variant="outline"
                  className="mt-5 h-11 w-full"
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                >
                  Log out
                </Button>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {query.data?.provider.companyName || "Your service business"}
              </p>
              <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                {query.data?.provider.verificationStatus ||
                  "Business workspace"}
                {query.data?.provider.verificationStatus ? " verification" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/services"
              className="hidden text-xs font-semibold text-muted-foreground sm:block"
            >
             
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main
          id="business-content"
          className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10"
        >
          {query.data &&
            !query.data.onboardingComplete &&
            path !== "/service-provider/onboarding" && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 p-4">
                <p className="text-xs leading-6 text-secondary-foreground">
                  Finish your business profile, services, coverage and team
                  setup.
                </p>
                <Link
                  href="/service-provider/onboarding"
                  className="public-text-link"
                >
                  Continue setup
                </Link>
              </div>
            )}
          {query.data && (
            <ProviderReviewFeedback provider={query.data.provider} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
