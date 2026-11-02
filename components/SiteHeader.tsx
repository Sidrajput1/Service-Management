"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getRoleHome } from "@/lib/role-route";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DiscoveryLocationControl } from "@/components/public/DiscoveryLocationControl";
import {
  CustomerNavigation,
  customerLinks,
} from "@/components/customer/CustomerNavigation";
import { signOut } from "@/lib/push-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Explore services" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#about", label: "About us" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const accountHref = getRoleHome(role);
  const providerHref = session
    ? role === "service_provider"
      ? "/service-provider"
      : "/#for-providers"
    : "/signup?role=provider";
  const navigation =
    role === "customer"
      ? [
          { href: "/", label: "Home" },
          { href: "/services", label: "Explore services" },
          { href: "/customer/bookings", label: "My bookings" },
        ]
      : links;

  function actions(mobile = false) {
    if (session && role === "customer")
      return mobile ? (
        <div className="flex w-full flex-col gap-2">
          {customerLinks.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="public-nav-link"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="outline"
            className="mt-3 h-11"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Log out
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="h-11 rounded-xl px-4" />
            }
          >
            My account
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
            {customerLinks.slice(2).map((link) => (
              <DropdownMenuItem
                key={link.href}
                render={<Link href={link.href} />}
                className="min-h-11 gap-3"
              >
                <link.icon className="size-4" />
                {link.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    return (
      <>
        <Link
          href={providerHref}
          onClick={() => setOpen(false)}
          className="public-nav-link font-semibold"
        >
          Become a provider <ArrowUpRight className="size-3.5" />
        </Link>
        {status === "loading" ? (
          <span
            className="h-10 w-24 animate-pulse rounded-xl bg-muted"
            aria-label="Loading account"
          />
        ) : session ? (
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className="public-button public-button-primary"
          >
            My dashboard <ArrowUpRight className="size-4" />
          </Link>
        ) : (
          <>
            <Link
              href="/signin"
              onClick={() => setOpen(false)}
              className="public-nav-link"
            >
              Log in
            </Link>
            <Link
              href="/signup?role=customer"
              onClick={() => setOpen(false)}
              className={`public-button public-button-primary ${mobile ? "w-full" : ""}`}
            >
              Sign up <ArrowUpRight className="size-4" />
            </Link>
          </>
        )}
      </>
    );
  }

  return (
    <header className="public-header sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <a href="#main-content" className="public-skip-link">
        Skip to content
      </a>
      <div className="public-container flex min-h-21 items-center justify-between gap-6">
        <Link href="/" aria-label="Servizato home" className="shrink-0">
          <BrandLogo priority className="max-[360px]:w-36" />
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-5 xl:flex"
        >
          {navigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`public-nav-link ${pathname === link.href ? "text-primary" : ""}`}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-5 xl:flex">{actions()}</div>
        <div className="ml-auto flex items-center gap-3 xl:ml-0">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  className="size-11 xl:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="w-[min(90vw,380px)]! overflow-y-auto p-7">
              <SheetTitle className="mt-4">
                <BrandLogo />
              </SheetTitle>
              <SheetDescription>All your services, one place.</SheetDescription>
              <nav
                aria-label="Mobile navigation"
                className="mt-5 flex flex-col gap-2"
              >
                {navigation.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="public-nav-link min-h-12 border-b border-border py-3"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 flex flex-col items-start gap-4">
                {actions(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {(!role || role === "customer") && <DiscoveryLocationControl invite />}
      {role === "customer" && <CustomerNavigation />}
    </header>
  );
}
