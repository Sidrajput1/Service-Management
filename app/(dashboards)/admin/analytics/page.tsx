"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { CalendarRange, ClipboardList, CreditCard, DollarSign, HandCoins, TrendingUp, Users, Wrench } from 'lucide-react';
import React, { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#16a34a", "#2563eb", "#f59e0b"];

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: any;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
            {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 text-white">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function AdminAnalytics() {
    const [range,setRange] = useState("30d");

    const {data,isLoading} = useAnalyticsSummary(range);

    const summary = data?.summary || {};
    const charts = data?.charts || {};
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-3xl border-slate-200 bg-linear-to-r from-slate-950 to-slate-800 text-white shadow-xl">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Business analytics dashboard
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Revenue, jobs, leads and operations in one place
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
                  Track the health of your service business from lead capture to payment collection. This dashboard is designed for daily operations and decision making.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {["24h", "7d", "30d", "90d"].map((r) => (
                  <Button
                    key={r}
                    onClick={() => setRange(r)}
                    className={
                      range === r
                        ? "rounded-2xl bg-white text-slate-950 hover:bg-slate-100"
                        : "rounded-2xl bg-white/10 text-white hover:bg-white/15"
                    }
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Revenue" value={formatMoney(summary.totalRevenue || 0)} icon={DollarSign} subtitle="Payments received" />
          <StatCard title="Leads" value={String(summary.totalLeads || 0)} icon={Users} subtitle={`Conversion ${summary.conversionRate || 0}%`} />
          <StatCard title="Jobs Completed" value={String(summary.completedJobs || 0)} icon={Wrench} subtitle="Successful service delivery" />
          <StatCard title="Pending Due" value={formatMoney(summary.totalDue || 0)} icon={CreditCard} subtitle="Outstanding invoices" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Bookings" value={String(summary.totalBookings || 0)} icon={CalendarRange} subtitle="Created in range" />
          <StatCard title="Customers" value={String(summary.totalCustomers || 0)} icon={Users} subtitle="New customers in range" />
          <StatCard title="Active Jobs" value={String(summary.activeJobs || 0)} icon={ClipboardList} subtitle="Still in progress" />
          <StatCard title="Avg Ticket" value={formatMoney(summary.avgTicket || 0)} icon={HandCoins} subtitle="Average paid invoice" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Revenue / Leads / Completed Jobs Trend</CardTitle>
                <p className="text-sm text-slate-500">Daily performance over selected range</p>
              </div>
            </CardHeader>
            <CardContent className="h-90">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.trendData || []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#0f172a" fill="url(#revenueGradient)" strokeWidth={3} />
                  <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="completedJobs" stroke="#16a34a" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Lead Sources</CardTitle>
              <p className="text-sm text-slate-500">Where inquiries are coming from</p>
            </CardHeader>
            <CardContent className="h-90">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.leadSourceMap || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                    {(charts.leadSourceMap || []).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Lead Status</CardTitle>
              <p className="text-sm text-slate-500">Pipeline health</p>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.leadStatusMap || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                    {(charts.leadStatusMap || []).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Job Status</CardTitle>
              <p className="text-sm text-slate-500">Operational workload</p>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.jobStatusMap || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                    {(charts.jobStatusMap || []).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Technician Status</CardTitle>
              <p className="text-sm text-slate-500">Field availability</p>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.technicianStatusMap || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                    {(charts.technicianStatusMap || []).map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Top Technicians</CardTitle>
              <p className="text-sm text-slate-500">Best performers by completed jobs</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.topTechnicians || []).map((tech: any, index: number) => (
                <div
                  key={tech.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      #{index + 1} {tech.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {tech.status} • Rating {tech.rating || 0}
                    </div>
                  </div>
                  <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                    {tech.jobsCompleted || 0} jobs
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Quick Operations Snapshot</CardTitle>
              <p className="text-sm text-slate-500">What needs attention now</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusLine label="Pending Leads" value={String(summary.pendingLeads || 0)} />
              <StatusLine label="Pending Bookings" value={String(summary.pendingBookings || 0)} />
              <StatusLine label="Pending Jobs" value={String(summary.pendingJobs || 0)} />
              <StatusLine label="Completed Jobs" value={String(summary.completedJobs || 0)} />
              <StatusLine label="Invoices Issued" value={String(summary.totalInvoices || 0)} />
              <StatusLine label="Payments Received" value={String(summary.totalPayments || 0)} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-3xl border-slate-200 shadow-sm xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <div className="space-y-3">
                {(data?.recentJobs || []).map((job: any) => (
                  <div key={job._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {job.bookingId?.serviceType || "Service"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {job.bookingId?.customerId?.name || "Customer"} •{" "}
                          {job.technicianId?.userId?.name || "Technician"}
                        </div>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.recentPayments || []).map((payment: any) => (
                <div key={payment._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{formatMoney(payment.amount || 0)}</div>
                      <div className="text-xs text-slate-500">
                        {payment.mode} • {payment.gateway || "manual"}
                      </div>
                    </div>
                    <Badge>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
};

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default AdminAnalytics