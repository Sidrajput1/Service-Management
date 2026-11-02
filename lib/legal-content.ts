export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  review?: string;
};

export type LegalDocument = {
  slug: "privacy" | "terms";
  title: string;
  introduction: string;
  sections: LegalSection[];
};

export const legalReviewDate = "1 November 2026";
export const legalReviewStatus = "Business and legal approval pending";

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  introduction:
    "This review edition explains the information used by Servizato's home-services marketplace and the controls currently available. It covers customers, service-provider businesses, Pros and other account users, including visitors who choose an area or submit a service enquiry.",
  sections: [
    {
      id: "information-collected",
      title: "Information collected and why",
      paragraphs: [
        "Servizato processes information supplied through account forms, profiles, enquiries, bookings, service delivery and the optional features you use. Different information is needed for a customer account, a provider business and an assigned Pro.",
      ],
      bullets: [
        "Account identity and contact information: name, email, telephone number, account role and account status, used to create accounts, authenticate users and connect service participants.",
        "Business and Pro information: business owner and company details, business type, description, contact address, service coverage, offerings and prices; Pro identity/contact details, skills, provider relationship, availability and work records, used to manage and deliver services.",
        "Service information: selected area, confirmed service address, requested offering, quantity, preferred time, instructions, booking and job status, assignments, parts, proof of work and completion records.",
        "Communication and feedback: enquiry details, message text and attachments, conversation participants and read status, ratings, review comments, cancellation reasons and bill/dispute notes.",
        "Financial and device information: invoice and payment records, optional provider bank/UPI payout details, session information, notification records and browser push subscriptions, as explained below.",
      ],
    },
    {
      id: "accounts-and-authentication",
      title: "Accounts and authentication",
      paragraphs: [
        "Registration asks for a name, email, telephone number and password. Provider registration also asks for business details. Providers can create Pro accounts linked to their team and issue initial credentials that the Pro is required to change.",
        "Passwords are processed to create or check password hashes. If Google sign-in is configured and selected, Google and the authentication service process the sign-in exchange and basic account identity/profile information; Servizato links the resulting account to its application profile. If SMS sign-in is configured, your telephone number is sent to Twilio to deliver a one-time code. Code records, expiry and use status are stored for verification.",
        "Sign-in also creates a session and records account role and credential status so that protected features can check access. A customer's service profile and saved contact/address information are distinct from the sign-in account; editing one does not necessarily change the other.",
      ],
    },
    {
      id: "location-information",
      title: "Area selection and precise location",
      paragraphs: [
        "You can enter a city, state, locality and PIN code to discover available services. The selected area is saved in this browser, with account scoping where supported, so it can be restored on later visits. It is a discovery preference, not automatic confirmation of a booking address.",
        "When you choose a current-location feature and permit browser location access, coordinates, accuracy and reading time can be processed. Where configured, Google Geocoding receives coordinates to suggest an address. A service destination is saved with a booking/request only through the address-confirmation workflow; manual address entry remains available.",
        "An assigned Pro can enable location reporting for an active job to support navigation and arrival checks. The workflow processes recent location readings, accuracy, timing and arrival evidence for that assigned job. It is not a promise of continuous background or off-duty tracking. Google map embeds or navigation links may receive the service destination when used.",
      ],
    },
    {
      id: "bookings-and-service-history",
      title: "Bookings and service history",
      paragraphs: [
        "Requests, bookings and jobs link customers, provider businesses and assigned Pros. Records can include the service address, selected offering and price snapshot, quantity, preferred date, instructions, assignments, progress timestamps, work/parts notes, completion proof and cancellation or review information.",
        "These records support fulfilment, coordination, invoices, payment reconciliation and review of problems. Authorised participants receive the information their service workflow exposes, including relevant contact and destination information. Operational staff have role-based tools for administration and dispute review.",
      ],
    },
    {
      id: "uploads-and-messages",
      title: "Uploaded content, messages and reviews",
      paragraphs: [
        "Provider business images and Pro service-proof photos use the configured Cloudinary upload service. The application stores media URLs and related identifiers/metadata alongside the business or job. Media is retrieved through those delivery links; an upload permission check is not a guarantee of private or revocable download access. The proof API also accepts supported proof types and optional notes/metadata; the current Pro photo form does not itself require identity documents or biometric verification.",
        "Messages can include text, attachment links, file descriptions and size/type information. Conversation records track participants, timestamps and read status. Job conversations and support-conversation records are processed through the existing chat features. A support conversation is not a designated privacy or statutory grievance channel unless the business explicitly appoints it for that purpose.",
        "Ratings contribute to public marketplace summaries. Review comments are stored with the completed booking for feedback and moderation and can appear in the relevant authenticated feedback views. Free-text fields and uploads may contain additional personal information supplied by the sender; avoid including unrelated sensitive details about yourself or other people.",
      ],
      review:
        "Confirm media access settings, treatment of embedded file metadata, rights to uploaded content and deletion of hosted copies, especially for service proof that is not intended as a public business image.",
    },
    {
      id: "payments-and-payouts",
      title: "Payments, invoices and provider payout information",
      paragraphs: [
        "Where online payment is available, Razorpay processes the payment interaction. Servizato exchanges invoice/order references, amount and currency, and, for payment-link flows, customer name, email and telephone number. The application retains payment references, method/status, amounts, verification/reconciliation information and relevant payment-link metadata.",
        "The reviewed checkout integration does not provide a Servizato form for collecting card PINs or CVVs. This does not mean that no financial information is retained: invoices, payment-link data, direct-payment confirmations, refund references, commission terms/acceptance and payout audit records are part of the service records.",
        "Provider payout setup can collect the account-holder name, bank name, account number and IFSC, or a UPI identifier. When secure payout storage is configured, sensitive payout fields are encrypted in application storage and masked in routine views; authorised review/reveal actions are recorded. Recording a payout or refund is distinct from actually transferring funds.",
      ],
    },
    {
      id: "cookies-and-browser-storage",
      title: "Cookies, sessions and browser storage",
      paragraphs: [
        "Authentication uses session and anti-forgery cookies. The application uses JWT-based sessions with a configured maximum age of seven days; this is not a seven-day deletion policy for account or service records. Clearing cookies or signing out affects sign-in access, not the retention of completed service records.",
        "Browser storage is also used for the selected discovery area, theme, account-scoped notification-invitation dismissal and push-device association. The address-suggestion endpoint sets a short-lived client identifier cookie for request limiting. The push worker uses local browser storage for its account/device binding and recent notification identifiers.",
        "You can change browser permissions and clear site storage in browser settings. Doing so can remove saved preferences or require sign-in and device setup again. The reviewed application code does not install a dedicated advertising or analytics tracker; hosting and third-party operational logging still require deployment review.",
      ],
    },
    {
      id: "notifications-and-web-push",
      title: "In-app notifications and optional Web Push",
      paragraphs: [
        "In-app notification records include their recipient, event information, destination, timestamps and read state. They support booking, job and related operational updates independently of browser notifications.",
        "Web Push is optional and is requested only after an explicit Enable action. A device registration stores a browser push endpoint, encryption keys, readable device label, timestamps and an account/login association. The browser's push service processes delivery; the implementation supports reviewed Google, Mozilla, Apple and Windows push-service endpoints.",
        "Browser alerts use generic display text and resolve access through the signed-in account. You can disable push for this device or another listed device in notification settings. Browser permission is controlled separately in browser site settings. Disabling push does not erase notification history or unrelated service records, and deactivated device metadata can remain stored.",
      ],
    },
    {
      id: "sharing-and-service-providers",
      title: "Sharing and service providers",
      paragraphs: [
        "Information is shared within the service workflow with the relevant customer, provider business, assigned Pro and authorised operational staff. Public provider listings, business images, service coverage and rating summaries expose the information returned by marketplace discovery; private account or financial fields are not intended as public listing content.",
        "The implemented integrations include MongoDB-backed application storage, Google sign-in and mapping/geocoding when configured, Twilio SMS when configured, Cloudinary uploads, Razorpay payments and browser-vendor push delivery. A feature's availability depends on the deployment configuration. These providers process the data needed for the feature and may apply their own notices and terms.",
        "Information may also need to be handled for a valid legal request or to investigate security or service problems, subject to applicable law. Actual hosting/database regions, processor contracts, subprocessors and international-transfer arrangements have not been confirmed in this review.",
      ],
      review:
        "The business must approve the deployed processor list, contractual safeguards, hosting/storage locations and transfer arrangements before final publication. This page does not claim that all data stays in India or that a particular provider is certified for Servizato.",
    },
    {
      id: "retention",
      title: "Data retention",
      paragraphs: [
        "The implementation retains account, service, communication, notification and financial records. It does not define a complete retention/deletion schedule for these categories or a general automatic account-erasure process. Login or OTP expiry controls whether a credential can be used; it does not establish when the underlying database record, backup or provider copy is deleted.",
        "A final retention policy needs to account for service fulfilment, accounting and other applicable legal requirements, dispute handling and security, and must include media, backups and third-party copies. No fixed retention period or deletion deadline is promised in this review edition.",
      ],
      review:
        "Approve category-specific retention periods, lawful exceptions, backup treatment and an executable deletion process. These are business/legal decisions, not settings supplied by this page.",
    },
    {
      id: "security",
      title: "Security practices",
      paragraphs: [
        "Implemented safeguards include password hashing, signed/encrypted session handling, server-side authentication and role/ownership checks, input validation, protected upload signing, payment verification and conditional encryption of sensitive payout fields. Security also depends on correct deployment, secret management, permissions and operational monitoring.",
        "These measures do not establish that every system is risk-free. This review makes no certification, independent audit or guaranteed-security claim. Incident response, breach communications and operational security procedures require an approved business process.",
      ],
    },
    {
      id: "rights-and-choices",
      title: "Your choices and privacy requests",
      paragraphs: [
        "Existing profile screens allow permitted contact/address changes. You can use manual location entry, control browser location permission, manage push devices, change browser notification permission and sign out. These controls have different effects and do not amount to automatic deletion of all stored information.",
        "Requests for access, correction, erasure, withdrawal of consent or other applicable privacy rights need identity verification and review under the law in force. The application does not currently offer a general self-service export, erasure or nomination workflow. The absence of that workflow does not remove any statutory right.",
        "The approved privacy/grievance contact is still pending, as shown below. This page does not submit or track a request. Identity checks, request handling, lawful exceptions and response/escalation procedures must be established before this review edition is treated as a final notice.",
      ],
    },
    {
      id: "children",
      title: "Children and account eligibility",
      paragraphs: [
        "Registration does not currently collect a date of birth or implement a parent/guardian consent workflow. A verified age/eligibility policy and any necessary protections for children's data have not been approved. No age-verification or parental-consent capability is claimed here.",
      ],
      review:
        "Legal review must determine eligibility, treatment of children's data and any required consent/verification changes. Publishing this text does not implement those controls.",
    },
    {
      id: "indian-privacy-framework",
      title: "Indian privacy framework and policy updates",
      paragraphs: [
        "The Digital Personal Data Protection Act, 2023 and the notified 2025 Rules have phased commencement. As of this review date, the published schedule has not yet brought the main processing and Data Principal rights provisions into force. Existing applicable information-technology, sensitive-data and consumer-protection requirements still need to be addressed; phased commencement is not an exemption from all privacy obligations.",
        "The date above identifies this source review, not legal approval or an effective contractual date. Material processing changes should be reflected in a reviewed update, with any notice or consent steps required by applicable law. Publication alone does not demonstrate legal compliance.",
      ],
    },
  ],
};

export const termsAndConditions: LegalDocument = {
  slug: "terms",
  title: "Terms & Conditions",
  introduction:
    "This review edition describes the current customer, service-provider and Pro workflows on Servizato. It does not create new fees, refund promises or a replacement provider agreement. The marked commercial and legal decisions require approval before adoption as final contractual terms.",
  sections: [
    {
      id: "marketplace-and-operator",
      title: "Marketplace and operator",
      paragraphs: [
        "Servizato provides a marketplace through which customers discover services, request work and coordinate with service-provider businesses and assigned Pros. Provider businesses manage offerings, coverage and their Pro teams; authorised platform staff have operational and review tools.",
        "The verified legal operator name and address are pending. The allocation of contractual responsibility between the platform, provider and customer, including who supplies and warrants each service, must be settled by the business and legal advisers. A verification status in the application is not a promise of a background check, certification or guaranteed service quality.",
      ],
    },
    {
      id: "customer-accounts",
      title: "Customer accounts and access",
      paragraphs: [
        "Customer registration collects the details described in the Privacy Policy. Sign-in and server-side role/ownership checks control access to bookings, messages and financial records. Some features require a completed service profile and a confirmed service address.",
        "Account eligibility, age requirements, general terms acceptance and the legal consequences of account misuse have not been documented as an approved policy. This page does not add a registration checkbox or record your acceptance of a new contract.",
      ],
    },
    {
      id: "providers-and-pros",
      title: "Service providers and Pros",
      paragraphs: [
        "Provider businesses submit business/profile information, create offerings and manage service coverage and their Pro team. The current workflow includes administrative verification/moderation of providers and offerings. Pros use linked accounts to view and carry out assigned work, with restricted access to other users' jobs.",
        "Initial Pro credentials can require a password change before work features are available. Operational account or listing status can restrict access or discovery. The code does not itself establish employment status, insurance coverage, service licences or a comprehensive provider contract.",
      ],
      review:
        "Approve provider/customer responsibilities, eligibility, verification claims, required licences/insurance and any trial/subscription offering. Registration trial dates alone do not establish an approved billing or renewal promise.",
    },
    {
      id: "bookings-and-availability",
      title: "Requests, bookings and availability",
      paragraphs: [
        "Discovery depends on active offerings, provider eligibility and service coverage. A saved area or an estimated price is not proof that a particular team has accepted a service at a specific address and time.",
        "Customers submit a selected offering, quantity, confirmed destination and any preferred date/instructions. Requests may require provider acceptance or coverage confirmation before the booking/job workflow proceeds. The application records status changes and assignments; use the current request or booking status to understand progress.",
        "Price displays depend on the offering's pricing model, quantity and any applicable recorded offer. Invoices can include service, part, visit, discount and tax entries. The final disclosure and approval process for variations or additional work requires business confirmation; this page does not authorise undisclosed charges.",
      ],
    },
    {
      id: "cancellation-and-changes",
      title: "Cancellation and changes",
      paragraphs: [
        "Cancellation controls depend on the booking/job state and the requesting role. A reason and optional note are recorded, and some states require operational review instead of immediate cancellation. Cancellation and any financial resolution are separate records.",
        "The reviewed workflow does not establish a universal cancellation charge, penalty or guaranteed refund window. A cancelled status does not by itself prove that money has been returned. The approved cancellation/rescheduling policy and any permitted charges must be disclosed separately and comply with applicable consumer law.",
      ],
      review:
        "Approve cancellation/rescheduling rights, timing, handling of work already performed and any charge/refund conditions. Do not infer a fee from the existence of a cancellation record.",
    },
    {
      id: "service-and-completion",
      title: "Service execution and completion",
      paragraphs: [
        "Assigned Pros progress through the permitted job states. The implemented workflow supports acceptance, en-route/arrival reporting, customer OTP verification for starting work, parts, service proof and completion. Location-based arrival is subject to browser permissions and valid readings, with permitted manual actions available where the workflow allows them.",
        "A completion record, service photograph or OTP event is operational evidence. It does not eliminate a customer's ability to raise a genuine service, billing or legal complaint. Service warranties, rework and quality-resolution commitments require business/legal approval; none is invented here.",
      ],
    },
    {
      id: "payments-and-invoices",
      title: "Payments, invoices and refunds",
      paragraphs: [
        "The application supports issued invoices, configured Razorpay online payment flows and records for direct cash/UPI payments. Online payment status is checked on the server; a browser success screen alone is not final confirmation of receipt.",
        "Direct-payment records can require customer/provider confirmation or administrative review. Bill changes or discrepancies can hold a financial record for review. Invoice status, payment status and job status describe different parts of the transaction.",
        "The existing refund workflow records verified processed gateway refunds or reviewed direct-refund evidence. It does not establish a general self-service refund entitlement or automatically initiate every refund. Refund eligibility, approval and communications need an approved process; no fixed processing deadline or unconditional promise is created by this page. Applicable statutory rights remain unaffected.",
      ],
    },
    {
      id: "commission-and-payouts",
      title: "Provider commission and payouts",
      paragraphs: [
        "Provider finance features can apply a configured, versioned commission policy and record the provider's acceptance. The accepted policy and booking/invoice records determine the applicable calculation; this public review page does not set a commission rate, collection charge or new fee.",
        "Provider payout details can be submitted and reviewed when secure storage is configured. Finance records track commissions, collections, adjustments and payout evidence. A recorded payout is not itself a bank transfer, and the implementation does not justify promising an automatic disbursement timetable.",
      ],
      review:
        "Approve the provider agreement, fee/rate disclosures, settlement responsibilities, payout timing, deductions and treatment of disputed or refunded amounts. Existing recorded finance-policy acceptance is distinct from acceptance of these general terms.",
    },
    {
      id: "reviews-and-complaints",
      title: "Reviews, complaints and disputes",
      paragraphs: [
        "Eligible customers can submit ratings and comments for completed work. Published ratings contribute to discovery summaries; detailed feedback appears in the relevant authenticated views and can be hidden through authorised moderation. The application also records booking cancellation reasons, bill disputes and conversation messages relevant to service resolution.",
        "Use the available booking, billing or conversation controls for an operational issue where those controls are offered. They are not a substitute for a designated statutory grievance channel. The Pro support landing page is unfinished; it must not be presented as a completed complaints service.",
        "The approved grievance details and escalation route are pending below. No mandatory arbitration clause, exclusive court location or waiver of statutory consumer remedies has been approved in this review.",
      ],
    },
    {
      id: "prohibited-activities",
      title: "Access restrictions and prohibited activity",
      paragraphs: [
        "The application restricts access to another person's account, private conversations, unassigned jobs and unauthorised financial actions. Controls also address invalid payment confirmations, duplicate event processing and ineligible review submissions. Attempts to bypass these controls or submit fraudulent service/payment evidence are inconsistent with the supported workflows.",
        "A complete acceptable-use policy, investigation process, sanctions and appeal mechanism require business/legal approval. This page does not add an undocumented penalty, forfeiture or unilateral financial deduction.",
      ],
    },
    {
      id: "suspension-and-termination",
      title: "Suspension, termination and records",
      paragraphs: [
        "Account active status, provider suspension/moderation and credential status can restrict access and listing availability. Account restriction is different from deleting all associated bookings, messages, invoices or audit records.",
        "Notice, reasons, appeal, termination grounds and the handling of outstanding work and funds need an approved policy. A general self-service account-erasure capability is not implemented, and no automatic deletion promise is made here.",
      ],
    },
    {
      id: "limitations-and-updates",
      title: "Platform limitations, applicable law and updates",
      paragraphs: [
        "Some features depend on provider availability, network access, browser support and configured external services. Maps, location reporting, SMS, uploads, online payments and Web Push may be unavailable or delayed. Push delivery is best effort; the in-app records remain separate from browser alerts.",
        "The business must approve any service-level promises, warranty terms, fair allocation of liability, governing-law language and change-notification/acceptance process. This review edition sets no liability cap, indemnity, blanket exclusion or waiver of rights provided by applicable law.",
        "The review date is not an effective contractual date. Final adoption requires business/legal review and an appropriate acceptance and notice process. Publishing this page alone does not establish compliance with Indian consumer, privacy or other applicable laws.",
      ],
    },
  ],
};
