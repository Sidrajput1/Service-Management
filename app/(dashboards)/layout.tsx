// app/(dashboard)/layout.tsx
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  Gauge,
  Home,
  Layers3,
  LayoutDashboard,
  LineChart,
  MapPin,
  MapPinned,
  MessageSquareMore,
  Settings,
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
  { label: "Payments", icon: "card", link: "/admin/billing" },
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
  // { label: "Earnings", icon: "IndianRupee", link: "/technician/earnings" },
  { label: "Messages", icon: "MessageCircle", link: "/technician/chats" },
  // { label: "Profile", icon: "users", link: "/technician/profile" },
  { label: "Support", icon: "shield", link: "/technician/support" },
];

const customerSidebar = [
  { label: "Dashboard", icon: "home", active: true, link: "/customer" },
  {label:"Search Service",icon:"search",active:true,link:"/customer/services"},
  { label: "My Bookings", icon: "calendar", link: "/customer/bookings" },
  // { label: "Book Service", icon: "calendar", link: "/customer/book-service" },
  // { label: "Jobs", icon: "clipboard", link: "/customer/jobs" },
  { label: "Payment&Invoice", icon: "Inbox", link: "/customer/invoice" },
];

// adding service-provider sidebar

const providerSidebar = [
  {
    label: "Overview",
    link: "/service-provider",
    icon: "LayoutDashboard",
  },

  {
    label: "Booking Requests",
    link: "/service-provider/booking-requests",
    icon: "calendar",
  },

  {
    label: "Bookings",
    link: "/service-provider/bookings",
    icon: "BriefcaseBusiness",
  },

  {
    label: "Assigned Jobs",
    link: "/service-provider/assigned-jobs",
    icon: "wrench",
  },

  {
    label: "Technicians",
    link: "/service-provider/manage-technicians",
    icon: "users",
  },

  {
    label: "Customers",
    link: "/service-provider/customers",
    icon: "users",
  },

  {
    label: "Services & Pricing",
    link: "/service-provider/services",
    icon: "card",
  },

  {
    label: "Service Areas",
    link: "/provider-services-areas",
    icon: "map",
  },

  {
    label: "Invoices",
    link: "/service-provider/invoices",
    icon: "card",
  },

  {
    label: "Finance",
    link: "/service-provider/finance",
    icon: "BarChart3",
  },

  {
    label: "Notifications",
    link: "/service-provider/notifications",
    icon: "Bell",
  },

  // {
  //   label: "Settings",
  //   link: "/service-provider/settings",
  //   icon: "Settings",
  // },

]

function getSidebarByRole(role: string | undefined) {
  if (role === "admin") {
    return {
      items: adminSidebar,
      title: "Service Admin",
      subtitle: "Operation Center",
      accent: "from-slate-600 via-slate-600 to-teal-500",
    };
  }
  if (role === "technician") {
    return {
      items: techSidebar,
      title: "Technician App",
      subtitle: "Field Work Area",
      accent: "from-slate-600 via-teal-600 to-cyan-500",
    };
  }
  if (role === "customer") {
    return {
      items: customerSidebar,
      title: "Customer Portal",
      subtitle: "Your Services",
      accent: "from-teal-800 via-slate-900 to-brown-300",
    };
  }
  // check if role = service_provider
  if(role === "service_provider"){
    return {
      items:providerSidebar,
      title:"Service Provider",
      subtitle:"Provider Center",
      accent: "from-pink-500 via-red-400 to-pink-600"
    }
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

  

  const sidebar = getSidebarByRole(role);

  return (
  
   <div className="h-screen bg-background text-foreground  overflow-hidden"> 
      <div className="flex h-screen overflow-hidden">
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
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden" >
          <Topbar
            role={role}
            userName={session.user?.name || "User"}
            userEmail={session.user?.email || ""}
            sidebarItems={sidebar.items}
            sidebarTitle={sidebar.title}
            sidebarSubtitle={sidebar.subtitle}
            sidebarAccent={sidebar.accent}
          />

          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 overflow-y-auto ">
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
