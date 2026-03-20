// app/(dashboard)/layout.tsx
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { CalendarDays, ClipboardList, Clock3, CreditCard, DollarSign, Gauge, Home, Layers3, LineChart, MapPinned, MessageSquareMore, ShieldCheck, Users, Wrench } from "lucide-react";
//import Sidebar from "@/components/Sidebar";

const adminSidebar = [
  { label: "Dashboard", icon: Home, active: true, link:'/admin/dashboard' },
  { label: "Leads", icon: Users,link:'/admin/leads' },
  { label: "Bookings", icon: CalendarDays, link:'/admin/bookings' },
  { label: "Jobs", icon: ClipboardList, link:'/admin/jobs' },
  { label: "Technicians", icon: Wrench, link:'/admin/technicians' },
  { label: "Customers", icon: Users, link:'/admin/customers' },
  { label: "Payments", icon: CreditCard, link:'/admin/payments' },
  { label: "AMC Plans", icon: Layers3,link:'/admin/amc-plans' },
  { label: "Reports", icon: LineChart, link:'/admin/reports' },
  { label: "Settings", icon: Gauge, link:'/admin/settings' },
];

const techSidebar = [
  { label: "Dashboard", icon: Home, active: true, link:'/technician/dashboard' },
  { label: "My Jobs", icon: ClipboardList, link:'/technician/jobs' },
  { label: "Live Location", icon: MapPinned, link:'/technician/live-location' },
  { label: "Attendance", icon: Clock3, link:'/technician/attendance' },
  { label: "Earnings", icon: DollarSign, link:'/technician/earnings' },
  { label: "Messages", icon: MessageSquareMore, link:'/technician/messages' },
  { label: "Profile", icon: Users, link:'/technician/profile' },
  { label: "Support", icon: ShieldCheck, link:'/technician/support' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // You can later get role from session (NextAuth)
  const role = "admin"; // dynamic later

  const items =
    role === "admin" ? adminSidebar : techSidebar;

  return (
    <div className="flex min-h-screen bg-slate-100">
      
      {/* Sidebar (desktop) */}
      <div className="hidden md:block w-64">
        <Sidebar
          items={adminSidebar}
          title={role === "admin" ? "Service Admin" : "Technician App"}
          subtitle={role === "admin" ? "Operations center" : "Field work area"}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        
        {/* Header */}
        {/* <Header role={role} /> */}
        <Topbar role={role}/>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}