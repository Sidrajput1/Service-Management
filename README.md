# Servizato

Next.js home-services marketplace with customer, Pro, provider and staff workspaces.

## Optional browser notifications

Web Push extends the existing in-app notification pipeline. Users opt in with **Enable notifications** and manage their devices at `/notifications#push-settings`. Browsing, signing in and opening the bell never request browser permission.

Install dependencies with `npm ci`. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` on the server using the empty entries in `.env.example`. Keep the private key in secret management. Key generation and the explicit MongoDB index preflight/install commands are documented in the [implementation report](WEB_PUSH_IMPLEMENTATION_REPORT.md).

Use HTTPS in deployment or a supported localhost browser. Push remains safely unavailable until configuration and indexes are ready; in-app notifications continue independently. Delivery is best effort, with no durable queue or guaranteed OS display.

```sh
npm run test:push
npm run push:migrate -- --print
npm run build
npm start
```

See [setup, security, verification and remaining browser tests](WEB_PUSH_IMPLEMENTATION_REPORT.md) and the [changed-file inventory](WEB_PUSH_CHANGED_FILES.md). No real credentials, index migration, browser subscription or live push delivery were created during implementation.

## Public launch security

The public `/demo` route is retired with a server-side 404. General contacts now use the explicitly approved business details described below. Only use approved public values in `NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL` and `NEXT_PUBLIC_BUSINESS_CONTACT_PHONE`; never use secrets. These settings remain separate from legal disclosures.

See the [Part 1 findings, verification and production remediation runbook](PUBLIC_LAUNCH_SECURITY_REPORT.md). Removing the page does not rotate exposed production credentials or revoke existing sessions; those remain explicit operator actions.

## Privacy and terms review pages

Public routes are `/privacy` and `/terms`. `/privacy-policy` and `/terms-and-conditions` redirect to the corresponding canonical pages. Both are linked from the existing footer.

These are substantive review editions with **business/legal approval pending**, as confirmed by the business. Configure only verified public operator and privacy/grievance details in the `LEGAL_*` fields documented in `.env.example`; configuration alone does not approve the documents. No fake contact, retention period, fee or refund promise is supplied.

See the [actual data inventory](SERVIZATO_DATA_INVENTORY.md) and [Part 2 implementation/legal-review report](LEGAL_PAGES_IMPLEMENTATION_REPORT.md) for source evidence, current Indian commencement review, tests and the decisions required before final adoption. This change does not add contractual consent, alter data collection or establish legal compliance by publication alone.

## Public contact page and social links

The public `/contact` page and shared footer use `lib/public-business-contact.ts`: **9189299370** (`tel:+919189299370`) and **servizato.in@gmail.com** (`mailto:`), explicitly approved for general enquiries. The optional `NEXT_PUBLIC_BUSINESS_CONTACT_*` overrides must also be approved. Legal operator, privacy and grievance disclosures continue to use only the separate `LEGAL_*` configuration and remain pending.

The enquiry fields and button are disabled. There is no form submission, API endpoint, email integration, database write or browser persistence for enquiries. Visitors can call directly or compose email in their own mail application. Native required/type/length constraints describe the future form shape; no validation or delivery is claimed while the form is unavailable.

Official Facebook, Twitter / X, LinkedIn and Instagram profile URLs still need to be supplied. Their empty `NEXT_PUBLIC_SOCIAL_*_URL` entries in `.env.example` are read centrally by `lib/public-social-links.ts`; only valid HTTPS profile URLs for the matching platform render. Rebuild after changing public configuration. No guessed profile, platform homepage or placeholder link is displayed.

Before enabling enquiries, approve the receiving mailbox, processing purpose, retention/access arrangements and privacy notice; configure an actual email provider with server-only credentials and verified sending domain/address; implement authenticated provider delivery with server validation, abuse/rate limits, accessible errors and confirmed delivery acceptance. Decide how to handle retries and failures without losing enquiries. The currently disabled component is isolated in `components/contact/ContactEnquiryForm.tsx` for that future change. See the [contact implementation and verification report](CONTACT_IMPLEMENTATION_REPORT.md).
