import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
export function CustomerWebsiteShell({ children }: { children: React.ReactNode }) {
  return <div className="public-site min-h-screen bg-background text-foreground"><SiteHeader /><main id="main-content" className="public-container min-h-[65vh] py-10 sm:py-14">{children}</main><SiteFooter /></div>;
}
