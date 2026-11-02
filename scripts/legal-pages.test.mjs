import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/technician-workflow-fixture.mjs";

const content = loadTs("lib/legal-content.ts");
const businessContact = loadTs("lib/public-business-contact.ts");
const publication = loadTs("lib/legal-publication.ts", {
  "server-only": {},
  "./public-business-contact": businessContact,
});
const Link = ({ href, children, ...props }) =>
  React.createElement("a", { href, ...props }, children);
const { SiteFooter } = loadTs("components/SiteFooter.tsx", {
  "next/link": Link,
  "@/components/BrandLogo": {
    BrandLogo: () => React.createElement("span", null, "Servizato"),
  },
  "@/lib/public-business-contact": {
    formatPublicPhone: businessContact.formatPublicPhone,
    getPublicBusinessContact: () =>
      businessContact.getPublicBusinessContact({}),
  },
  "@/components/public/SocialLinks": { SocialLinks: () => null },
});

function renderPage(slug, details = {}) {
  const { LegalDocumentPage } = loadTs(
    "components/legal/LegalDocumentPage.tsx",
    {
      "next/link": Link,
      "@/components/SiteHeader": {
        SiteHeader: () => React.createElement("header", null, "Servizato"),
      },
      "@/components/SiteFooter": { SiteFooter },
      "@/lib/legal-content": content,
      "@/lib/legal-publication": {
        getLegalPublication: () => publication.getLegalPublication(details),
      },
    },
  );
  const page = loadTs(`app/${slug}/page.tsx`, {
    "@/components/legal/LegalDocumentPage": { LegalDocumentPage },
    "@/lib/legal-content": content,
  });
  assert.equal(page.dynamic, "force-dynamic");
  return renderToStaticMarkup(React.createElement(page.default));
}

for (const slug of ["privacy", "terms"]) {
  test(`${slug} renders without authentication or persistence and clearly identifies pending approval`, () => {
    const html = renderPage(slug);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /Business and legal approval pending/);
    assert.match(html, /not an approved final policy or contract/);
    assert.match(html, /1 November 2026/);
    assert.match(
      html,
      /An approved privacy request email has not yet been published/,
    );
    assert.match(html, /Appointment and public details pending confirmation/);
    assert.doesNotMatch(
      html,
      /href="(?:mailto:|tel:)|lorem ipsum|insert (?:name|address)|\[your /i,
    );
  });
  test(`${slug} contents links and accessible section headings resolve uniquely`, () => {
    const html = renderPage(slug);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((row) => row[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const match of html.matchAll(/href="#([^"]+)"/g))
      assert.ok(ids.includes(match[1]), "A contents link has no destination");
    for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g))
      assert.ok(
        ids.includes(match[1]),
        "An accessible heading reference is unresolved",
      );
    assert.match(html, /aria-label="On this page"/);
    assert.match(html, /aria-label="Legal"/);
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /href="\/terms"/);
  });
}

test("the privacy notice covers real data, processors and the limitations of existing user controls", () => {
  const html = renderPage("privacy");
  for (const value of [
    "Twilio",
    "Cloudinary",
    "Razorpay",
    "Google",
    "Web Push",
    "PIN code",
    "retention/deletion schedule",
    "self-service export, erasure or nomination",
    "phased commencement",
    "children",
  ])
    assert.ok(html.includes(value), "A material privacy disclosure is missing");
  assert.match(html, /href="\/notifications#push-settings"/);
});

test("terms preserve statutory rights and do not pretend to collect general contractual acceptance", () => {
  const html = renderPage("terms");
  assert.match(html, /Applicable statutory rights remain unaffected/);
  assert.match(html, /does not set a commission rate/);
  assert.match(html, /does not add a registration checkbox/);
  assert.doesNotMatch(
    html,
    /By (?:using|registering).*you agree|<form|<input|<button/i,
  );
});

for (const [alias, canonical] of [
  ["privacy-policy", "/privacy"],
  ["terms-and-conditions", "/terms"],
]) {
  test(`${alias} redirects permanently to its canonical page without duplicate content`, () => {
    const calls = [];
    const sentinel = new Error("Controlled redirect");
    const route = loadTs(`app/${alias}/page.tsx`, {
      "next/navigation": {
        permanentRedirect: (destination) => {
          calls.push(destination);
          throw sentinel;
        },
      },
    });
    assert.throws(
      () => route.default(),
      (error) => error === sentinel,
    );
    assert.deepEqual(calls, [canonical]);
  });
}

test("legal disclosures have no default identities and validate the configured contact addresses", () => {
  assert.ok(
    Object.values(publication.getLegalPublication({})).every(
      (value) => value === undefined,
    ),
  );
  const details = publication.getLegalPublication({
    privacyEmail: "javascript:invalid",
    grievanceEmail: "wrong@example.invalid?bcc=other@example.invalid",
  });
  assert.equal(details.privacyEmail, undefined);
  assert.equal(details.grievanceEmail, undefined);
  const html = renderPage("privacy", {
    operatorName: "<Controlled operator>",
    privacyEmail: "privacy@example.invalid",
    grievanceEmail: "grievance@example.invalid",
  });
  assert.match(html, /&lt;Controlled operator&gt;/);
  assert.match(html, /href="mailto:privacy@example.invalid"/);
  assert.match(html, /href="mailto:grievance@example.invalid"/);
  assert.match(html, /Business and legal approval pending/);
});
