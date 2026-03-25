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
  

  } from "lucide-react";

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
  MessageCircle:MessageCircle
};

function Sidebar({ items, title, subtitle }: { items: any[]; title: string; subtitle: string }) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{title}</div>
            <div className="text-sm text-slate-400">{subtitle}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3">
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link href={item.link} 
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  item.active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
                key={item.label}
              >
             
                
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
                
              
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Need help?</p>
              <p className="text-xs text-slate-500">24/7 ops support</p>
            </div>
            <Button size="sm" variant="secondary" className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
              Support
            </Button>
            <button onClick={() => signOut({ callbackUrl: "/signin" })}>Logout</button>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
