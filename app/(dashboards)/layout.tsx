// app/(dashboard)/layout.tsx
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  Gauge,
  Home,
  Layers3,
  LineChart,
  MapPinned,
  MessageSquareMore,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ChatWindow from "@/components/chat/ChatWindow";
import TechDashWrapper from "@/components/TechDashWrapper";
//import Sidebar from "@/components/Sidebar";

const adminSidebar = [
  { label: "Dashboard", icon: "home", active: true, link: "/admin/dashboard" },
  { label: "Leads", icon: "users", link: "/admin/leads" },
  { label: "Bookings", icon: "calendar", link: "/admin/bookings" },
  { label: "Jobs", icon: "clipboard", link: "/admin/jobs" },
  { label: "Manage Technicians", icon: "wrench", link: "/admin/manage-technicians" },
   { label: "Monitor Technicians ", icon: "wrench", link: "/admin/manage-technicians/monitor" },
  { label: "Customers", icon: "users", link: "/admin/customers" },
  { label: "Payments", icon: "card", link: "/admin/payments" },
  {label:"Price Master",icon:"BadgePercent",link:"/admin/pricemaster"},
  { label: "AMC Plans", icon: "layers", link: "/admin/amc-plans" },
  { label: "Reports", icon: "chart", link: "/admin/analytics" },
  { label: "Settings", icon: "settings", link: "/admin/settings" },
];

const techSidebar = [
  {
    label: "Dashboard",
    icon: "home",
    active: true,
    link: "/technician/dashboard",
  },
  { label: "My Jobs", icon: "clipboard", link: "/technician/all-jobs" },
  { label: "Live Location", icon: "map", link: "/technician/live-location" },
  { label: "Attendance", icon: "clock", link: "/technician/attendance" },
  { label: "Earnings", icon: "IndianRupee", link: "/technician/earnings" },
  { label: "Messages", icon: "MessageCircle", link: "/technician/chats" },
  { label: "Profile", icon: "users", link: "/technician/profile" },
  { label: "Support", icon: "shield", link: "/technician/support" },
];

const customerSidebar = [
  { label: "Dashboard", icon: "home", active: true, link: "/customer" },
  { label: "Bookings", icon: "calendar", link: "/customer/bookings" },
  { label: "Book Service", icon: "calendar", link: "/customer/book-service" },
  { label: "Jobs", icon: "clipboard", link: "/customer/jobs" },
  { label: "invoice", icon: "Inbox", link: "/customer/invoice" },
];

function getSidebarByRole(role: string | undefined) {
  if (role === "admin") {
    return {
      items: adminSidebar,
      title: "Service Admin",
      subtitle: "Operation Center",
      accent: "from-blue-600 via-indigo-600 to-cyan-500",
    };
  }
  if (role === "technician") {
    return {
      items: techSidebar,
      title: "Technician App",
      subtitle: "Field Work Area",
      accent: "from-emerald-600 via-teal-600 to-cyan-500",
    };
  }
  if (role === "customer") {
    return {
      items: customerSidebar,
      title: "Customer Portal",
      subtitle: "Your Services",
      accent: "from-violet-600 via-fuchsia-600 to-indigo-500",
    };
  }
  return {
    items: [],
    title: "Dashboard",
    subtitle: "Welcome",
    accent: "from-slate-700 via-slate-800 to-slate-900",
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // You can later get role from session (NextAuth)
  //const role = "admin"; // dynamic later

  const session = await getServerSession(authOptions);
  console.log("Session in dashboard layout:", session);
  if (!session) {
    // not signed in - send to sign in page
    redirect("/signin");
  }
  const role = (session.user as any)?.role as "admin" | "technician" | "customer" | undefined;

  // const items =
  //   role === "admin" ? adminSidebar : techSidebar;

  // let sidebarItems: typeof adminSidebar;
  // let sidebarTitle: string;
  // let sidebarSubtitle: string;

  // if (role === "admin") {
  //   sidebarItems = adminSidebar;
  //   sidebarTitle = "Service admin";
  //   sidebarSubtitle = "Operation Center";
  // } else if (role === "technician") {
  //   sidebarItems = techSidebar;
  //   sidebarTitle = "Technician App";
  //   sidebarSubtitle = "Field work area";
  // } else if (role === "customer") {
  //   sidebarItems = customerSidebar;
  //   sidebarTitle = "Customer Portal";
  //   sidebarSubtitle = "Your Services";
  // } else {
  //   sidebarItems = [];
  //   sidebarTitle = "App";
  //   sidebarSubtitle = "Welcome";
  // }

  const sidebar = getSidebarByRole(role);

  return (
  //   <div className=" min-h-screen bg-slate-50 text-slate-900">
  //     {/* Sidebar (desktop) */}
  //     {/* <div className="hidden md:block w-64">
  //       <Sidebar
  //         //items={role === "admin" ? adminSidebar : techSidebar}
  //         // items={role === "admin" ? adminSidebar : techSidebar}
  //         //items={adminSidebar}
  //         // title={role === "admin" ? "Service Admin" : "Technician App"}
  //         //subtitle={role === "admin" ? "Operations center" : "Field work area"}
  //         items={sidebarItems}
  //         title={sidebarTitle}
  //         subtitle={sidebarSubtitle}
  //       />
  //     </div> */}

  //      <aside className="hidden lg:block lg:w-72 xl:w-80 lg:shrink-0">
  //         <Sidebar
  //           role={role}
  //           items={sidebar.items}
  //           title={sidebar.title}
  //           subtitle={sidebar.subtitle}
  //           accent={sidebar.accent}
  //         />
  //       </aside>

  //     {/* Main Content */}
  //     <div className="flex min-w-0 flex-1 flex-col">
  //       {/* Header */}
  //       {/* <Header role={role} /> */}
  //       {/* <Topbar role={role} /> */}
  //       <Topbar
  //           role={role}
  //           userName={session.user?.name || "User"}
  //           userEmail={session.user?.email || ""}
  //           sidebarItems={sidebar.items}
  //           sidebarTitle={sidebar.title}
  //           sidebarSubtitle={sidebar.subtitle}
  //           sidebarAccent={sidebar.accent}
  //         />

  //       {/* Page Content */}
  //       <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 ">
  //         <div className="mx-auto max-w-7xl  space-y-6">
  //         {children}
  //         </div>
  //         {/* <ChatWindow
  //       conversationId={123}
  //       currentUserId={session.user.id}
  // currentUserRole={session.user.role}
  // currentUserName={session.user.name}
  //     /> */}
  //         {/* <TechDashWrapper session={session} /> */}
  //       </main>
  //     </div>
  //   </div>
   <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-72 xl:w-80 lg:shrink-0">
          <Sidebar
            role={role}
            items={sidebar.items}
            title={sidebar.title}
            subtitle={sidebar.subtitle}
            accent={sidebar.accent}
          />
        </aside>

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            role={role}
            userName={session.user?.name || "User"}
            userEmail={session.user?.email || ""}
            sidebarItems={sidebar.items}
            sidebarTitle={sidebar.title}
            sidebarSubtitle={sidebar.subtitle}
            sidebarAccent={sidebar.accent}
          />

          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
