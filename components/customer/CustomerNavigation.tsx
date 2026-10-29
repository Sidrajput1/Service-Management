"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarCheck2,
  FileText,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useNotifications";
import { notificationBadge } from "@/lib/notification-client.mjs";
export const customerLinks = [
  { href: "/services", label: "Explore services", icon: Search },
  { href: "/customer/bookings", label: "My bookings", icon: CalendarCheck2 },
  { href: "/customer/messages", label: "Messages", icon: MessageCircle },
  { href: "/customer/invoice", label: "Invoices", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/customer/profile", label: "My account", icon: UserRound },
];
export function CustomerNavigation() {
  const path = usePathname();
  const { data } = useUnreadNotifications();
  const badge = notificationBadge(data?.unreadCount);
  return (
    <div className="border-t border-border bg-background">
      <nav
        aria-label="Customer navigation"
        className="public-container flex gap-1 overflow-x-auto py-2 sm:gap-3"
      >
        {customerLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={path.startsWith(link.href) ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${path.startsWith(link.href) ? "bg-primary/8 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <link.icon className="size-4" />
            {link.label}
            {link.href === "/notifications" && badge.text && (
              <span
                className="rounded-full bg-primary px-1.5 text-[10px] leading-5 text-primary-foreground"
                aria-label={badge.label}
              >
                {badge.text}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
