'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  CreditCard,
  ShieldCheck,
  Target,
  TimerReset,
  Users,
} from "lucide-react";

const adminActivities = [
  {
    title: "New lead captured",
    desc: "WhatsApp inquiry from AC repair ad campaign",
    time: "2 min ago",
    dot: "bg-emerald-500",
  },
  {
    title: "Booking created",
    desc: "Customer booked plumbing service for 4:30 PM",
    time: "15 min ago",
    dot: "bg-sky-500",
  },
  {
    title: "Technician reassigned",
    desc: "Job moved to better nearby technician",
    time: "29 min ago",
    dot: "bg-amber-500",
  },
  {
    title: "Payment received",
    desc: "Invoice #INV-2041 paid via UPI",
    time: "41 min ago",
    dot: "bg-violet-500",
  },
];

const adminStats = [
  { label: "Total Leads", value: "128", change: "+12%", icon: Users },
  { label: "Bookings Today", value: "34", change: "+8%", icon: CalendarDays },
  { label: "Jobs Completed", value: "91", change: "+15%", icon: CheckCircle2 },
  {
    label: "Pending Payments",
    value: "₹48,200",
    change: "-3%",
    icon: CreditCard,
  },
];

function StatCard({ label, value, change, icon: Icon }: any) {
  return (
    <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm dark:text-accent">{label}</p>
            <div className="mt-2 flex items-end gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                {value}
              </h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                {change}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-teal-900 p-3 text-white shadow-lg shadow-slate-900/20">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
    return (
  <div className="bg-background ">
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]"></div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today’s Flow</CardTitle>
          <p className="text-sm text-slate-500">Quick operational snapshot</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "New leads", value: "18", icon: Target },
            { label: "Bookings pending", value: "9", icon: TimerReset },
            { label: "Jobs in progress", value: "14", icon: CircleDot },
            { label: "Completed today", value: "27", icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 dark:bg-accent-foreground px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl dark:bg-sidebar-accent-foreground p-2 shadow-sm">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium dark:text-shadow-sidebar-accent-foreground">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500">Live status</div>
                  </div>
                </div>
                <div className="text-xl font-semibold text-slate-900">
                  {item.value}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Operations</CardTitle>
          <p className="text-sm text-slate-500">
            Real-time business activity feed
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminActivities.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className={`mt-1 h-3 w-3 rounded-full ${item.dot}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.time}</div>
                </div>
                <div className="mt-1 text-sm text-slate-600">{item.desc}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Admin Features</CardTitle>
          <p className="text-sm text-slate-500">Core modules you will manage</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Lead & inquiry tracking",
            "Booking management",
            "Technician assignment",
            "Job monitoring and proof",
            "Invoice and payment control",
            "AMC / membership renewals",
            "Reports and analytics",
            "Complaint handling",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <span className="text-sm font-medium text-slate-800">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    </div>
);
  
}

export default AdminDashboard;
