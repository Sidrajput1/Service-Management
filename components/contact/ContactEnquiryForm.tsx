import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  formatPublicPhone,
  getPublicBusinessContact,
} from "@/lib/public-business-contact";

/** Intentionally has no submission handler, form action, persistence or delivery client. */
export function ContactEnquiryForm() {
  const contact = getPublicBusinessContact();
  const inputClass =
    "h-12 rounded-xl px-3 disabled:opacity-100 disabled:text-foreground";
  return (
    <section
      aria-labelledby="enquiry-title"
      className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8"
    >
      <h2 id="enquiry-title" className="text-xl font-semibold tracking-tight">
        Send an enquiry
      </h2>
      <div
        id="enquiry-unavailable"
        role="note"
        className="mt-5 rounded-xl border border-border bg-muted p-4 text-sm leading-7"
      >
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Info aria-hidden="true" className="size-4 shrink-0" />
          Temporarily unavailable
        </div>
        <p>
          Enquiry form is currently unavailable. Please contact us directly
          {contact.email && (
            <>
              {" "}
              at{" "}
              <a
                className="break-all font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={`mailto:${contact.email}`}
              >
                {contact.email}
              </a>
            </>
          )}
          {contact.phone && (
            <>
              {" "}
              or call{" "}
              <a
                className="whitespace-nowrap font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={`tel:${contact.phone}`}
              >
                {formatPublicPhone(contact.phone)}
              </a>
            </>
          )}
          . We appreciate your understanding.
        </p>
      </div>
      {/* Keep fields inert until an approved delivery mechanism and server validation exist. */}
      <fieldset
        disabled
        aria-describedby="enquiry-unavailable enquiry-help"
        className="mt-6 min-w-0 space-y-5"
      >
        <legend className="sr-only">
          Enquiry details (currently unavailable)
        </legend>
        <div className="space-y-2">
          <Label htmlFor="enquiry-name">
            Full Name <span className="text-xs font-normal">(required)</span>
          </Label>
          <Input
            id="enquiry-name"
            name="fullName"
            autoComplete="off"
            required
            minLength={2}
            maxLength={100}
            placeholder="Your full name"
            className={inputClass}
          />
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="enquiry-email">
              Email Address{" "}
              <span className="text-xs font-normal">(required)</span>
            </Label>
            <Input
              id="enquiry-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              maxLength={254}
              placeholder="Your email address"
              className={inputClass}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="enquiry-phone">
              Phone Number{" "}
              <span className="text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="enquiry-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={20}
              placeholder="Your phone number"
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="enquiry-subject">
            Subject <span className="text-xs font-normal">(required)</span>
          </Label>
          <Input
            id="enquiry-subject"
            name="subject"
            autoComplete="off"
            required
            minLength={3}
            maxLength={150}
            placeholder="What is your enquiry about?"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="enquiry-message">
            Message <span className="text-xs font-normal">(required)</span>
          </Label>
          <Textarea
            id="enquiry-message"
            name="message"
            autoComplete="off"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            placeholder="How can we help?"
            className="min-h-36 resize-none rounded-xl p-3 disabled:opacity-100 disabled:text-foreground"
          />
        </div>
        <Button
          type="button"
          disabled
          aria-describedby="enquiry-unavailable"
          variant="outline"
          className="min-h-12 w-full whitespace-normal rounded-xl disabled:opacity-100 sm:w-auto"
        >
          Enquiry form unavailable
        </Button>
      </fieldset>
      <p
        id="enquiry-help"
        className="mt-4 text-xs leading-6 text-muted-foreground"
      >
        These fields are disabled. Please use the phone or email links above to
        contact us.
      </p>
    </section>
  );
}
