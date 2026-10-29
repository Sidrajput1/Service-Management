import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const sections = [
  { title: "Discover", links: [["Explore services", "/services"], ["How it works", "/#how-it-works"], ["About Servizato", "/#about"]] },
  { title: "For customers", links: [["Create an account", "/signup?role=customer"], ["Log in", "/signin"], ["Common questions", "/#faq"]] },
  { title: "For businesses", links: [["Become a provider", "/signup?role=provider"], ["Provider benefits", "/#for-providers"], ["Account login", "/signin"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="public-container py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Servizato home"><BrandLogo className="w-48" /></Link>
            <p className="mt-5 max-w-65 text-sm leading-7 text-muted-foreground">A helping hand for your everyday.<br />A better way to find, book, and manage local services.</p>
            <address className="mt-5 space-y-2 text-xs not-italic text-muted-foreground">
              <a href="mailto:hello@servizato.com" className="flex min-h-8 items-center gap-2 hover:text-primary"><Mail className="size-3.5" />hello@servizato.com</a>
              <a href="tel:+916201274925" className="flex min-h-8 items-center gap-2 hover:text-primary"><Phone className="size-3.5" />+91 6201274925</a>
            </address>
          </div>
          {sections.map(section => <div key={section.title}>
            <h3 className="text-sm font-bold">{section.title}</h3>
            <ul className="mt-5 space-y-3.5">{section.links.map(([label, href]) => <li key={label}><Link className="text-sm text-muted-foreground transition-colors hover:text-primary" href={href}>{label}</Link></li>)}</ul>
          </div>)}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Servizato. All rights reserved.</p>
          <Link href="/services" className="inline-flex items-center gap-2 hover:text-primary">A little help starts here <ArrowUpRight className="size-3.5" /></Link>
        </div>
      </div>
    </footer>
  );
}
