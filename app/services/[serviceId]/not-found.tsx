import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
export default function NotFound() { return <div className="public-site"><SiteHeader /><main id="main-content" className="public-container public-section text-center"><h1 className="public-section-title">This service isn’t available</h1><p className="my-5 text-sm text-muted-foreground">The listing may have changed. Explore the current service catalog.</p><Link href="/services" className="public-button public-button-primary">Explore services</Link></main><SiteFooter /></div>; }
