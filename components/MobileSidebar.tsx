
'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Users, CalendarDays, ClipboardList, CreditCard, Layers3, LineChart, Settings2, Wrench, MapPinned, Clock3, ShieldCheck, IndianRupee, MessageCircle, FileText, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  home: Home,
  users: Users,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  card: CreditCard,
  layers: Layers3,
  chart: LineChart,
  settings: Settings2,
  wrench: Wrench,
  map: MapPinned,
  clock: Clock3,
  shield: ShieldCheck,
  rupee: IndianRupee,
  message: MessageCircle,
  invoice: FileText,
  "calendar-plus": CalendarPlus,
};

type SidebarItem = {
  label: string;
  icon: string;
  link: string;
};



export default function MobileSidebar({
  items,
  title,
  subtitle,
  accent,
}: {
  items: SidebarItem[];
  title: string;
  subtitle: string;
  accent: string;
}) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger >
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-slate-200 bg-white shadow-sm lg:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] p-0">
        <div className={cn("px-5 py-5 text-white", `bg-linear-to-br ${accent}`)}>
          <SheetHeader className="text-left">
            <SheetTitle className="text-white">{title}</SheetTitle>
            <p className="text-sm text-white/75">{subtitle}</p>
          </SheetHeader>
        </div>

        <ScrollArea className="h-[calc(100vh-112px)] px-3 py-4">
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = iconMap[item.icon] || Home;
              const active = pathname === item.link || pathname.startsWith(item.link + "/");
              return (
                <Link
                  key={item.label}
                  href={item.link}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-linear-to-r from-blue-600 to-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
