import { Bell, MoreHorizontal, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import MobileSidebar from "./MobileSidebar";

function Topbar({ role }: { role: "admin" | "technician" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* <div className="md:hidden">
            <MobileSidebar role={role} />
          </div> */}
          <div>
            <div className="text-sm text-slate-500">Welcome back</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              {role === "admin" ? "Admin Operations Dashboard" : "Technician Field Dashboard"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <div className="relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10" placeholder="Search jobs, leads, customers..." />
            </div>
          </div>

          <Button variant="outline" size="icon" className="rounded-2xl border-slate-200 bg-white">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-2xl border-slate-200 bg-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-slate-900 text-white">SS</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-900">Sidharth</div>
              <div className="text-xs text-slate-500">{role === "admin" ? "Admin" : "Technician"}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;