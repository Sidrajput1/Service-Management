"use client";
import {
  Bell,
  ChevronDown,
  LogOut,
  MoreHorizontal,
  Search,
  UserCircle2,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import MobileSidebar from "./MobileSidebar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import Link from "next/link";
import NotifyBell from "./notifications/NotifyBell";
import { useState } from "react";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import ThemeToggler from "./ThemeToggler";
import { signOut } from "next-auth/react";

function Topbar({
  role,
  userName,
  userEmail,
  sidebarItems,
  sidebarTitle,
  sidebarSubtitle,
  sidebarAccent,
}: {
  role?: "admin" | "technician" | "customer";
  userName: string;
  userEmail: string;
  sidebarItems: any[];
  sidebarTitle: string;
  sidebarSubtitle: string;
  sidebarAccent: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const headingText =
    role === "admin"
      ? "Admin Operational Dashboard"
      : role === "technician"
        ? "Technician Workspace"
        : role === "customer"
          ? "Customer Service Dashboard"
          : "Dashboard";

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "User";

  //const navigate = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-background text-white poppins backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <MobileSidebar
              items={sidebarItems}
              title={sidebarTitle}
              subtitle={sidebarSubtitle}
              accent={sidebarAccent}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="hidden text-sm text-foreground sm:block">
                Welcome back
              </p>
              <Badge
                variant="secondary"
                className="rounded-full "
              >
                {roleLabel}
              </Badge>
            </div>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
              {headingText}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden xl:block">
            <div className="relative w-90">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 shadow-sm focus-visible:ring-blue-500"
                placeholder="Search jobs, leads, customers..."
              />
            </div>
          </div>

          <ThemeToggler />
          <NotifyBell />

          <Button
            variant="outline"
            size="icon"
            className="hidden h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm md:inline-flex"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          <div className="relative">
            {/* Trigger Button */}
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-background px-3 py-2 shadow-sm transition hover:bg-secondary"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-linear-to-br from-blue-600 to-indigo-600 text-white">
                  {userName?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium text-foreground">
                  {userName}
                </div>
                <div className="text-xs text-slate-500">{userEmail}</div>
              </div>

              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {/* Dropdown Content */}
            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-background dark:bg-background shadow-lg z-50">
                <div className="px-2 py-2">
                  <div className="text-sm font-medium text-foreground">
                    {userName}
                  </div>
                  <div className="text-xs text-slate-500">{userEmail}</div>
                </div>

                <div className="my-1 h-px bg-slate-200" />
              <Link href="/your-profile">
                <div className="flex cursor-pointer text-foreground items-center rounded-xl px-2 py-2 hover:bg-slate-100/50">
                  <UserCircle2 className="mr-2 h-4 w-4" />
                  Profile
                </div>
                </Link>

                <div
                  className="flex cursor-pointer items-center rounded-xl px-2 py-2 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    // signOut logic here
                    signOut({callbackUrl:"/signin"})
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
