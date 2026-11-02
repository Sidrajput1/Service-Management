import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  formatPublicPhone,
  getPublicBusinessContact,
} from "@/lib/public-business-contact";
import { SocialLinks } from "@/components/public/SocialLinks";

const sections = [
  {
    title: "Discover",
    links: [
      ["Explore services", "/services"],
      ["How it works", "/#how-it-works"],
      ["About Servizato", "/#about"],
    ],
  },
  {
    title: "For customers",
    links: [
      ["Create an account", "/signup?role=customer"],
      ["Log in", "/signin"],
      ["Common questions", "/#faq"],
      ["Contact Us", "/contact"],
    ],
  },
  {
    title: "For businesses",
    links: [
      ["Become a provider", "/signup?role=provider"],
      ["Provider benefits", "/#for-providers"],
      ["Account login", "/signin"],
    ],
  },
];

export function SiteFooter() {
  const contact = getPublicBusinessContact();
  return (
    <footer className="border-t border-border bg-background">
      <div className="public-container py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <Link href="/" aria-label="Servizato home">
              <BrandLogo className="w-48" />
            </Link>
            <p className="mt-5 max-w-65 text-sm leading-7 text-muted-foreground">
              A helping hand for your everyday.
              <br />A better way to find, book, and manage local services.
            </p>
            {(contact.email || contact.phone) && (
              <section aria-labelledby="footer-contact-title" className="mt-6">
                <h3 id="footer-contact-title" className="text-sm font-bold">
                  Contact Information
                </h3>
                <address className="mt-2 text-sm not-italic text-foreground">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                      <Phone aria-hidden="true" className="size-4 shrink-0" />
                      {formatPublicPhone(contact.phone)}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex min-h-11 w-fit max-w-full items-center gap-2 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                      <Mail aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 break-all">{contact.email}</span>
                    </a>
                  )}
                </address>
              </section>
            )}
            <SocialLinks />
          </div>
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-bold">{section.title}</h3>
              <ul className="mt-5 space-y-3.5">
                {section.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      className="inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      href={href}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Servizato. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-3">
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="inline-flex min-h-11 items-center rounded-sm hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Terms &amp; Conditions
              </Link>
            </nav>
            <Link
              href="/services"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              A little help starts here <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
