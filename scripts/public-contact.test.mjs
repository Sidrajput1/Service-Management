import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/technician-workflow-fixture.mjs";

const contact = loadTs("lib/public-business-contact.ts");
const social = loadTs("lib/public-social-links.ts");
const legal = loadTs("lib/legal-publication.ts", {
  "server-only": {},
  "./public-business-contact": contact,
});
const Link = ({ href, children, ...props }) =>
  React.createElement("a", { href, ...props }, children);
const render = (Component) =>
  renderToStaticMarkup(React.createElement(Component));

function loadSocial(urls = {}) {
  return loadTs("components/public/SocialLinks.tsx", {
    "@/lib/public-social-links": {
      getPublicSocialLinks: () => social.getPublicSocialLinks(urls),
    },
  }).SocialLinks;
}
function loadFooter(input = contact.approvedPublicBusinessContact, urls = {}) {
  return loadTs("components/SiteFooter.tsx", {
    "next/link": Link,
    "@/components/BrandLogo": {
      BrandLogo: () => React.createElement("span", null, "Servizato"),
    },
    "@/lib/public-business-contact": {
      ...contact,
      getPublicBusinessContact: () => contact.getPublicBusinessContact(input),
    },
    "@/components/public/SocialLinks": { SocialLinks: loadSocial(urls) },
  }).SiteFooter;
}
const utils = loadTs("lib/utils.ts");
const ui = (file) =>
  loadTs(`components/ui/${file}.tsx`, { "@/lib/utils": utils });
const ContactEnquiryForm = loadTs("components/contact/ContactEnquiryForm.tsx", {
  "@/components/ui/input": ui("input"),
  "@/components/ui/textarea": ui("textarea"),
  "@/components/ui/label": ui("label"),
  "@/components/ui/button": ui("button"),
  "@/lib/public-business-contact": {
    ...contact,
    getPublicBusinessContact: () => contact.approvedPublicBusinessContact,
  },
}).ContactEnquiryForm;

test("approved general contact defaults are clickable, consistently formatted and configurable", () => {
  const oldEmail = process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL;
  const oldPhone = process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE;
  try {
    delete process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL;
    delete process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE;
    assert.deepEqual(
      contact.getPublicBusinessContact(),
      contact.approvedPublicBusinessContact,
    );
    assert.equal(
      contact.formatPublicPhone(contact.approvedPublicBusinessContact.phone),
      "9189299370",
    );
    assert.equal(contact.formatPublicPhone("+12025550123"), "+12025550123");
    process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL = "approved@example.invalid";
    process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE = "+12025550123";
    assert.deepEqual(contact.getPublicBusinessContact(), {
      email: "approved@example.invalid",
      phone: "+12025550123",
    });
  } finally {
    if (oldEmail === undefined)
      delete process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL;
    else process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL = oldEmail;
    if (oldPhone === undefined)
      delete process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE;
    else process.env.NEXT_PUBLIC_BUSINESS_CONTACT_PHONE = oldPhone;
  }
});

test("general approval never populates missing or invalid legal disclosures", () => {
  assert.deepEqual(contact.getPublicBusinessContact({}), {
    email: undefined,
    phone: undefined,
  });
  assert.ok(
    Object.values(legal.getLegalPublication({})).every(
      (value) => value === undefined,
    ),
  );
  const publication = legal.getLegalPublication({
    privacyEmail: "invalid",
    grievanceEmail: "",
  });
  assert.equal(publication.privacyEmail, undefined);
  assert.equal(publication.grievanceEmail, undefined);
});

test("unset social profile configuration renders no icons, links or placeholder destinations", () => {
  assert.deepEqual(social.getPublicSocialLinks({}), []);
  assert.equal(render(loadSocial()), "");
  assert.doesNotMatch(
    render(loadFooter()),
    /aria-label="Social media"|facebook\.com|twitter\.com|linkedin\.com|instagram\.com/,
  );
});

test("social configuration accepts only explicit HTTPS profiles on the matching platform", () => {
  // Controlled fixture paths are not production profiles or claims of account ownership.
  const urls = {
    facebook: "https://www.facebook.com/controlled-fixture",
    twitter: "https://x.com/controlled_fixture",
    linkedin: "https://www.linkedin.com/company/controlled-fixture/",
    instagram: "https://www.instagram.com/controlled.fixture/",
  };
  const links = social.getPublicSocialLinks(urls);
  assert.equal(links.length, 4);
  assert.deepEqual(
    links.map((row) => row.label),
    ["Facebook", "Twitter / X", "LinkedIn", "Instagram"],
  );
  const html = render(loadSocial(urls));
  assert.equal((html.match(/target="_blank"/g) || []).length, 4);
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 4);
  assert.equal((html.match(/aria-label="Servizato on /g) || []).length, 4);
});

test("social links reject unsafe, unrelated, homepage, sharing and placeholder destinations", () => {
  for (const value of [
    "#",
    "not a URL",
    "javascript:alert(1)",
    "http://facebook.com/controlled-fixture",
    "https://facebook.com/",
    "https://facebook.com.evil.invalid/controlled-fixture",
    "https://instagram.com/controlled-fixture",
    "https://facebook.com@evil.invalid/controlled-fixture",
    "https://user:secret@facebook.com/controlled-fixture",
    "https://facebook.com:8443/controlled-fixture",
    "https://facebook.com/sharer.php",
    "https://facebook.com/share/controlled-fixture",
    "https://facebook.com/your-profile",
    "https://facebook.com/placeholder",
    "https://facebook.com/controlled-fixture?redirect=unrelated",
    "https://facebook.com/controlled-fixture#fragment",
  ]) {
    assert.deepEqual(social.getPublicSocialLinks({ facebook: value }), []);
  }
});

test("footer preserves existing navigation and shows approved contact details once", () => {
  const html = render(loadFooter());
  assert.equal(
    (html.match(/href="mailto:servizato.in@gmail.com"/g) || []).length,
    1,
  );
  assert.equal((html.match(/href="tel:\+919189299370"/g) || []).length, 1);
  for (const href of [
    "/contact",
    "/services",
    "/#how-it-works",
    "/#about",
    "/signup?role=customer",
    "/signin",
    "/#faq",
    "/signup?role=provider",
    "/#for-providers",
    "/privacy",
    "/terms",
  ])
    assert.ok(html.includes(`href="${href}"`));
  assert.match(html, /Contact Information/);
  assert.match(html, /9189299370/);
});

test("unavailable enquiry controls cannot submit, persist information or claim success", () => {
  const html = render(ContactEnquiryForm);
  assert.match(html, /Enquiry form is currently unavailable/);
  assert.match(html, /We appreciate your understanding/);
  assert.match(html, /<fieldset[^>]*disabled=""/);
  assert.match(
    html,
    /<button[^>]*type="button"[^>]*disabled=""|<button[^>]*disabled=""[^>]*type="button"/,
  );
  assert.doesNotMatch(
    html,
    /<form\b|type="submit"|action=|formaction=|sent successfully|thank you for (?:your|the) (?:message|enquiry)/i,
  );
  const ids = new Set(
    [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
  );
  for (const match of html.matchAll(/aria-describedby="([^"]+)"/g))
    for (const id of match[1].split(" ")) assert.ok(ids.has(id));
  for (const name of ["name", "email", "phone", "subject", "message"])
    assert.match(html, new RegExp(`for="enquiry-${name}"`));
  assert.match(
    html,
    /id="enquiry-email"[^>]*type="email"|type="email"[^>]*id="enquiry-email"/,
  );
  assert.match(
    html,
    /id="enquiry-phone"[^>]*type="tel"|type="tel"[^>]*id="enquiry-phone"/,
  );
  assert.equal((html.match(/\srequired=""/g) || []).length, 4);
  assert.match(html, /href="mailto:servizato.in@gmail.com"/);
  assert.match(html, /href="tel:\+919189299370"/);
});

test("contact page renders publicly without account, database or delivery dependencies", () => {
  const page = loadTs("app/contact/page.tsx", {
    "@/components/SiteHeader": {
      SiteHeader: () => React.createElement("header", null, "Servizato"),
    },
    "@/components/SiteFooter": { SiteFooter: loadFooter() },
    "@/components/contact/ContactEnquiryForm": { ContactEnquiryForm },
    "@/lib/public-business-contact": {
      ...contact,
      getPublicBusinessContact: () => contact.approvedPublicBusinessContact,
    },
  });
  const html = render(page.default);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Contact Us<\/h1>/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /Enquiry form unavailable/);
});
