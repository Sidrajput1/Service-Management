// app/(dashboard)/layout.tsx
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { CalendarDays, ClipboardList, Clock3, CreditCard, DollarSign, Gauge, Home, Layers3, LineChart, MapPinned, MessageSquareMore, ShieldCheck, Users, Wrench } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
//import Sidebar from "@/components/Sidebar";

// const adminSidebar = [
//   { label: "Dashboard", icon: Home, active: true, link:'/admin/dashboard' },
//   { label: "Leads", icon: Users,link:'/admin/leads' },
//   { label: "Bookings", icon: CalendarDays, link:'/admin/bookings' },
//   { label: "Jobs", icon: ClipboardList, link:'/admin/jobs' },
//   { label: "Technicians", icon: '', link:'/admin/technicians' },
//   { label: "Customers", icon: Users, link:'/admin/customers' },
//   { label: "Payments", icon: CreditCard, link:'/admin/payments' },
//   { label: "AMC Plans", icon: Layers3,link:'/admin/amc-plans' },
//   { label: "Reports", icon: LineChart, link:'/admin/reports' },
//   { label: "Settings", icon: Gauge, link:'/admin/settings' },
// ];

const adminSidebar = [
  { label: "Dashboard", icon: "home", active: true, link:'/admin/dashboard' },
  { label: "Leads", icon: "users", link:'/admin/leads' },
  { label: "Bookings", icon: "calendar", link:'/admin/bookings' },
  { label: "Jobs", icon: "clipboard", link:'/admin/jobs' },
  { label: "Technicians", icon: "wrench", link:'/admin/manage-technicians' },
  { label: "Customers", icon: "users", link:'/admin/customers' },
  { label: "Payments", icon: "card", link:'/admin/payments' },
  { label: "AMC Plans", icon: "layers", link:'/admin/amc-plans' },
  { label: "Reports", icon: "chart", link:'/admin/reports' },
  { label: "Settings", icon: "settings", link:'/admin/settings' },
];

const techSidebar = [
  { label: "Dashboard", icon: "home", active: true, link:'/technician/dashboard' },
  { label: "My Jobs", icon: "clipboard", link:'/technician/jobs' },
  { label: "Live Location", icon: "map", link:'/technician/live-location' },
  { label: "Attendance", icon: "clock", link:'/technician/attendance' },
  { label: "Earnings", icon: "IndianRupee", link:'/technician/earnings' },
  { label: "Messages", icon: "MessageCircle", link:'/technician/messages' },
  { label: "Profile", icon: "users", link:'/technician/profile' },
  { label: "Support", icon: "shield", link:'/technician/support' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // You can later get role from session (NextAuth)
  //const role = "admin"; // dynamic later

  const session = await getServerSession(authOptions);
  console.log("Session in dashboard layout:", session);
  if(!session){
    // not signed in - send to sign in page
    redirect("/signin");
  }
const role = (session.user as any)?.role;

  // const items =
  //   role === "admin" ? adminSidebar : techSidebar;

  return (
    <div className="flex min-h-screen bg-slate-100">
      
      {/* Sidebar (desktop) */}
      <div className="hidden md:block w-64">
        <Sidebar
          items={role === "admin" ? adminSidebar : techSidebar}
         // items={role === "admin" ? adminSidebar : techSidebar}
         //items={adminSidebar}
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