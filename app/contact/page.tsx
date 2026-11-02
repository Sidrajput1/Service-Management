import { Mail, Phone } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactEnquiryForm } from "@/components/contact/ContactEnquiryForm";
import {
  formatPublicPhone,
  getPublicBusinessContact,
} from "@/lib/public-business-contact";

export default function ContactPage() {
  const contact = getPublicBusinessContact();
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main-content" className="public-container py-10 sm:py-16">
        <header className="max-w-2xl">
          <p className="public-eyebrow">We’re here to help</p>
          <h1 className="public-section-title mt-3">Contact Us</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Have a question, need support or want to make a general enquiry? Get
            in touch with Servizato using the contact details below.
          </p>
        </header>
        <div className="mt-10 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
          <section
            aria-labelledby="contact-information-title"
            className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8"
          >
            <h2
              id="contact-information-title"
              className="text-xl font-semibold tracking-tight"
            >
              Contact Information
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Contact our team directly by phone or email.
            </p>
            <address className="mt-5 space-y-4 not-italic">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex min-h-16 items-center gap-4 rounded-xl border border-border p-4 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  <Phone aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      Phone
                    </span>
                    <span className="mt-1 block font-semibold">
                      {formatPublicPhone(contact.phone)}
                    </span>
                  </span>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex min-h-16 items-center gap-4 rounded-xl border border-border p-4 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  <Mail aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      Email
                    </span>
                    <span className="mt-1 block break-all font-semibold">
                      {contact.email}
                    </span>
                  </span>
                </a>
              )}
            </address>
          </section>
          <ContactEnquiryForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
