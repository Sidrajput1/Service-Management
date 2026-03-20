import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ClipboardList, Clock3, Home, MapPinned, ShieldCheck, Smartphone, Star } from "lucide-react";

const revenueData = [
  { name: "Mon", value: 12000 },
  { name: "Tue", value: 15000 },
  { name: "Wed", value: 9000 },
  { name: "Thu", value: 18000 },
  { name: "Fri", value: 21000 },
  { name: "Sat", value: 17000 },
  { name: "Sun", value: 24000 },
];

const technicianStats = [
  { label: "Jobs Assigned", value: "8", change: "+2", icon: ClipboardList },
  { label: "Jobs Done", value: "5", change: "+1", icon: CheckCircle2 },
  { label: "Active Route", value: "18 km", change: "Live", icon: MapPinned },
  { label: "Rating", value: "4.8/5", change: "Top 10%", icon: Star },
];

const techJobs = [
  {
    name: "AC Service - Sharma Residence",
    status: "On the way",
    time: "10:30 AM",
    badge: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  },
  {
    name: "Washing Machine Repair",
    status: "OTP pending",
    time: "12:00 PM",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  {
    name: "RO Filter Replacement",
    status: "Completed",
    time: "Yesterday",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
];


function StatCard({ label, value, change, icon: Icon }: any) {
  return (
    <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-2 flex items-end gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{value}</h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                {change}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/20">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



function TechnicianDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {technicianStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Today’s Route</CardTitle>
            <p className="text-sm text-slate-500">Your active service movement</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Start point", value: "Home Base", icon: Home },
              { label: "Next stop", value: "Sharma Residence", icon: MapPinned },
              { label: "ETA", value: "18 mins", icon: Clock3 },
              { label: "OTP status", value: "Pending", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <Icon className="h-4 w-4 text-slate-700" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-500">Field update</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{item.value}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">My Jobs</CardTitle>
            <p className="text-sm text-slate-500">Assigned work and current progress</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {techJobs.map((job) => (
              <div key={job.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{job.name}</div>
                    <div className="mt-1 text-sm text-slate-500">Scheduled: {job.time}</div>
                  </div>
                  <Badge variant="outline" className={job.badge}>
                    {job.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-xl">
                    Start Job
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl">
                    Upload Proof
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Technician Features</CardTitle>
            <p className="text-sm text-slate-500">What the field app should support</p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              "Job list and acceptance",
              "OTP based job start",
              "Live GPS tracking",
              "Photo / proof upload",
              "Work notes and checklist",
              "Parts used entry",
              "Completion confirmation",
              "Daily earnings and history",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Smartphone className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Today’s Availability</CardTitle>
            <p className="text-sm text-slate-500">Shift and workload view</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">Shift Status</div>
                  <div className="text-xs text-slate-500">Active until 8:00 PM</div>
                </div>
                <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Available</Badge>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[72%] rounded-full bg-slate-900" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Completed", value: "5" },
                { label: "Pending", value: "3" },
                { label: "Cancelled", value: "1" },
                { label: "Rating", value: "4.8" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
