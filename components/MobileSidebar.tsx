

import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const adminSidebar = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "Leads", icon: Users },
  { label: "Bookings", icon: CalendarDays },
  { label: "Jobs", icon: ClipboardList },
  { label: "Technicians", icon: Wrench },
  { label: "Customers", icon: Users },
  { label: "Payments", icon: CreditCard },
  { label: "AMC Plans", icon: Layers3 },
  { label: "Reports", icon: LineChart },
  { label: "Settings", icon: Gauge },
];

const techSidebar = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "My Jobs", icon: ClipboardList },
  { label: "Live Location", icon: MapPinned },
  { label: "Attendance", icon: Clock3 },
  { label: "Earnings", icon: DollarSign },
  { label: "Messages", icon: MessageSquareMore },
  { label: "Profile", icon: Users },
  { label: "Support", icon: ShieldCheck },
];

function MobileSidebar({ role }: { role: "admin" | "technician" }) {
  const items = role === "admin" ? adminSidebar : techSidebar;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="rounded-2xl border border-slate-200 bg-white p-2 hover:bg-slate-100">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-75 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <Sidebar
          items={items}
          title={role === "admin" ? "Service Admin" : "Technician App"}
          subtitle={role === "admin" ? "Operations center" : "Field work area"}
        />
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;