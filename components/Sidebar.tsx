"use client";

import { Button } from "./ui/button";
import Link from "next/link";
import { signOut } from "next-auth/react";


import {
  Home,
  Users,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Layers3,
  LineChart,
  Gauge,
  Wrench,
  MapPinned,
  Clock3,
  ShieldCheck,
  IndianRupee,
  MessageCircle,
  Inbox,
  LifeBuoy,
  BadgePercent
  

  } from "lucide-react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

const iconMap: any = {
  home: Home,
  users: Users,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  card: CreditCard,
  layers: Layers3,
  chart: LineChart,
  settings: Gauge,
  wrench: Wrench,
  map: MapPinned,
  clock: Clock3,
  shield: ShieldCheck,
  IndianRupee:IndianRupee,
  MessageCircle:MessageCircle,
  Inbox:Inbox,
  BadgePercent:BadgePercent
};

type SidebarItem = {
  label: string;
  icon: string;
  link: string;
};

function Sidebar({ items, title, subtitle,accent }: { items: any[]; title: string; subtitle: string; accent:string; role?:string }) {

  const pathname = usePathname();
  return (
    // <div className="flex h-full flex-col bg-slate-950 text-slate-100">
    //   <div className="border-b border-white/10 p-5">
    //     <div className="flex items-center gap-3">
    //       <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
    //         <Wrench className="h-5 w-5" />
    //       </div>
    //       <div>
    //         <div className="text-lg font-semibold leading-tight">{title}</div>
    //         <div className="text-sm text-slate-400">{subtitle}</div>
    //       </div>
    //     </div>
    //   </div>

    //   <div className="flex-1 p-3">
    //     <div className="space-y-1">
    //       {items.map((item) => {
    //         const Icon = iconMap[item.icon];
    //         return (
    //           <Link href={item.link} 
    //           className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
    //               item.active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/8 hover:text-white"
    //             }`}
    //             key={item.label}
    //           >
             
                
    //             <Icon className="h-4 w-4" />
    //             <span className="font-medium">{item.label}</span>
                
              
    //           </Link>
    //         );
    //       })}
    //     </div>
    //   </div>

    //   <div className="border-t border-white/10 p-4">
    //     <div className="rounded-2xl bg-white/5 p-4">
    //       <div className="flex items-center justify-between">
    //         <div>
    //           <p className="text-sm text-slate-300">Need help?</p>
    //           <p className="text-xs text-slate-500">24/7 ops support</p>
    //         </div>
    //         <Button size="sm" variant="secondary" className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
    //           Support
    //         </Button>
    //         <button onClick={() => signOut({ callbackUrl: "/signin" })}>Logout</button>
            
    //       </div>
    //     </div>
    //   </div>
    // </div>

     <div className="flex h-screen flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className={cn("px-5 py-5 text-white shadow-sm", `bg-linear-to-br ${accent}`)}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{title}</div>
            <div className="text-sm text-white/75">{subtitle}</div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || Home;
            const active = pathname === item.link || pathname.startsWith(item.link + "/");

            return (
              <Link
                key={item.label}
                href={item.link}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-700")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-3xl bg-linear-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/90">Need help?</p>
              <p className="mt-1 text-xs leading-5 text-white/60">24/7 ops support for your team</p>
            </div>
            <div className="rounded-full bg-white/10 p-2">
              <LifeBuoy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1 rounded-xl bg-white text-slate-900 hover:bg-slate-100">
              Support
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => signOut({ callbackUrl: "/signin" })}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
