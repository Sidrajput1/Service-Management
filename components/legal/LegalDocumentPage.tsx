import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  type LegalDocument,
  legalReviewDate,
  legalReviewStatus,
} from "@/lib/legal-content";
import { getLegalPublication } from "@/lib/legal-publication";

// Override the shared public section rule so anchored headings clear the sticky header.
const sectionAnchorStyle = { scrollMarginTop: "10rem" };

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const details = getLegalPublication();
  const isPrivacy = document.slug === "privacy";
  const contents = [
    ...document.sections.map(({ id, title }) => ({ id, title })),
    { id: "operator-details", title: "Operator details" },
    { id: "contact-and-grievances", title: "Contact and grievances" },
    { id: "legal-sources", title: "Legal sources reviewed" },
  ];
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main-content" className="public-container py-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <header className="max-w-3xl">
            <p className="public-eyebrow">Servizato · Legal information</p>
            <h1
              id="legal-title"
              className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              {document.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
              {document.introduction}
            </p>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Review edition · Last source review: {legalReviewDate}
            </p>
          </header>

          <aside
            aria-labelledby="legal-review-title"
            role="note"
            className="my-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6"
          >
            <h2 id="legal-review-title" className="text-base font-semibold">
              {legalReviewStatus}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7">
              Operator identity, approved privacy/grievance contacts and the
              marked policy decisions are pending. This is a review edition, not
              an approved final policy or contract. Publishing these pages does
              not establish legal compliance or record your agreement to new
              terms.
            </p>
            <p className="mt-2 text-sm leading-7">
              The current application practices are described below. The pending
              details must be resolved before this edition is adopted for public
              launch.
            </p>
          </aside>

          <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
            <nav
              aria-label="On this page"
              className="min-w-0 rounded-2xl border border-border bg-card p-5"
            >
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  On this page
                </summary>
                <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {contents.map((item) => (
                    <li key={item.id} className="min-w-0">
                      <a
                        href={`#${item.id}`}
                        className="inline-flex min-h-11 items-center rounded-md px-2 py-2 text-sm leading-6 text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>

            <article
              aria-labelledby="legal-title"
              className="min-w-0 max-w-3xl space-y-9"
            >
              {document.sections.map((section) => (
                <section
                  id={section.id}
                  key={section.id}
                  aria-labelledby={`${section.id}-title`}
                  style={sectionAnchorStyle}
                  className="border-b border-border pb-9"
                >
                  <h2
                    id={`${section.id}-title`}
                    className="text-xl font-semibold tracking-tight sm:text-2xl"
                  >
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc space-y-3 pl-5 marker:text-primary">
                        {section.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {section.review && (
                    <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-7">
                      <p className="font-semibold">Business/legal review</p>
                      <p className="mt-1">{section.review}</p>
                    </div>
                  )}
                  {section.id === "notifications-and-web-push" && (
                    <Link
                      href="/notifications#push-settings"
                      className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4"
                    >
                      Manage browser notification settings
                    </Link>
                  )}
                </section>
              ))}

              <section
                id="operator-details"
                aria-labelledby="operator-details-title"
                style={sectionAnchorStyle}
                className="border-b border-border pb-9"
              >
                <h2
                  id="operator-details-title"
                  className="text-xl font-semibold sm:text-2xl"
                >
                  Operator details
                </h2>
                <dl className="mt-4 space-y-4 text-sm leading-7 sm:text-base">
                  <div>
                    <dt className="font-medium">Legal operator</dt>
                    <dd className="break-words text-muted-foreground">
                      {details.operatorName ||
                        "Verified legal identity pending business approval."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Business address</dt>
                    <dd className="whitespace-pre-line break-words text-muted-foreground">
                      {details.operatorAddress ||
                        "Verified address pending business approval."}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Servizato is the marketplace name used on this website. It is
                  not a substitute for the legal operator disclosure.
                </p>
              </section>

              <section
                id="contact-and-grievances"
                aria-labelledby="contact-and-grievances-title"
                style={sectionAnchorStyle}
                className="border-b border-border pb-9"
              >
                <h2
                  id="contact-and-grievances-title"
                  className="text-xl font-semibold sm:text-2xl"
                >
                  Contact and grievances
                </h2>
                <dl className="mt-4 space-y-4 text-sm leading-7 sm:text-base">
                  <div>
                    <dt className="font-medium">Privacy requests</dt>
                    <dd className="break-words text-muted-foreground">
                      {details.privacyEmail ? (
                        <a
                          href={`mailto:${details.privacyEmail}`}
                          className="text-foreground underline underline-offset-4"
                        >
                          {details.privacyEmail}
                        </a>
                      ) : (
                        "An approved privacy request email has not yet been published."
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Grievance officer</dt>
                    <dd className="break-words text-muted-foreground">
                      {details.grievanceName ||
                        "Appointment and public details pending confirmation."}
                      {details.grievanceDesignation &&
                        ` · ${details.grievanceDesignation}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Grievance email</dt>
                    <dd className="break-words text-muted-foreground">
                      {details.grievanceEmail ? (
                        <a
                          href={`mailto:${details.grievanceEmail}`}
                          className="text-foreground underline underline-offset-4"
                        >
                          {details.grievanceEmail}
                        </a>
                      ) : (
                        "An approved grievance email has not yet been published."
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Business/legal review must complete the designated contact,
                  request-verification process, applicable response periods and
                  escalation route. General service chat does not by itself
                  satisfy those requirements. No request is sent or tracked by
                  viewing this page.
                </p>
              </section>

              <section
                id="legal-sources"
                aria-labelledby="legal-sources-title"
                style={sectionAnchorStyle}
              >
                <h2
                  id="legal-sources-title"
                  className="text-xl font-semibold sm:text-2xl"
                >
                  Legal sources reviewed
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Reviewed on {legalReviewDate}. Commencement and applicability
                  need to be checked again before final adoption; these links
                  are legal references, not a compliance certification.
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7">
                  <li>
                    <a
                      className="text-foreground underline underline-offset-4"
                      href="https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf"
                    >
                      DPDP Act commencement notification — G.S.R. 843(E)
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-foreground underline underline-offset-4"
                      href="https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf"
                    >
                      Digital Personal Data Protection Rules, 2025
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-foreground underline underline-offset-4"
                      href="https://www.wipo.int/wipolex/en/text/494931"
                    >
                      Information Technology sensitive-data/privacy rules, 2011
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-foreground underline underline-offset-4"
                      href="https://consumeraffairs.gov.in/pages/consumer-protection-acts"
                    >
                      Consumer Protection rules and notified amendments
                    </a>
                  </li>
                </ul>
                <Link
                  href={isPrivacy ? "/terms" : "/privacy"}
                  className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline underline-offset-4"
                >
                  Read the {isPrivacy ? "Terms & Conditions" : "Privacy Policy"}
                </Link>
              </section>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
