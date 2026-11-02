"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/push-client";
import {
  LayoutDashboard,
  ShieldCheck,
  ClipboardCheck,
  ListTree,
  Menu,
  LogOut,
  Bell,
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
const primary = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/providers",
    label: "Provider verification",
    icon: ShieldCheck,
  },
  {
    href: "/admin/service-approvals",
    label: "Service approvals",
    icon: ClipboardCheck,
  },
  { href: "/admin/pricemaster", label: "Service catalog", icon: ListTree },
  { href: "/admin/finance", label: "Commission & payouts", icon: LayoutDashboard },
];
const operations = [
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/manage-technicians", label: "Manage Pros" },
  { href: "/admin/manage-technicians/monitor", label: "Monitor Pros" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/analytics", label: "Existing reports" },
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    [open, setOpen] = useState(false);
  const links = (
    <>
      <p className="px-3 pb-3 pt-1 text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">
        Marketplace review
      </p>
      <nav aria-label="Admin review navigation" className="space-y-1">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={
              path === item.href || path.startsWith(`${item.href}/`)
                ? "page"
                : undefined
            }
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold ${path === item.href || path.startsWith(`${item.href}/`) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <details className="mt-6 border-t border-border pt-4">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">
          Existing operations
        </summary>
        <nav aria-label="Admin operations" className="mt-2 space-y-1">
          {operations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-xs ${path === item.href || path.startsWith(`${item.href}/`) ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
  return (
    <div className="provider-workspace min-h-screen bg-muted/20 text-foreground">
      <a href="#admin-content" className="public-skip-link">
        Skip to admin content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Link href="/" aria-label="Servizato home" className="px-6 py-7">
          <BrandLogo className="w-44" />
        </Link>
        <div className="overflow-y-auto px-3 pb-5">{links}</div>
        <div className="mt-auto border-t border-border p-4">
          <Button
            variant="ghost"
            className="h-11 w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/signin" })}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-background/95 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    className="size-11 lg:hidden"
                    aria-label="Open admin navigation"
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
                <SheetDescription>Servizato administration</SheetDescription>
                <div className="mt-5">{links}</div>
                <Button
                  className="mt-5 h-11 w-full"
                  variant="outline"
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                >
                  Log out
                </Button>
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-bold">Marketplace administration</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Business verification · Service approval
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              aria-label="Admin notifications"
              className="flex size-11 items-center justify-center rounded-lg border border-border"
            >
              <Bell className="size-4" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main
          id="admin-content"
          className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
