import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
function load(file, modules = {}) {
  const compiled = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) => {
      if (name in modules) return modules[name];
      if (name.startsWith("@/")) throw new Error("Unmocked test boundary");
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const contact = load("lib/public-business-contact.ts");
const chain = (value) => ({
  select() {
    return this;
  },
  lean() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

test("the retired demo returns a non-cacheable server 404 for GET and HEAD in every environment", async () => {
  const route = load("app/demo/route.ts");
  assert.equal(route.dynamic, "force-dynamic");
  for (const method of ["GET", "HEAD"]) {
    const response = route[method]();
    assert.equal(response.status, 404);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(await response.text(), method === "HEAD" ? "" : "Not found.");
  }
  assert.equal(fs.existsSync("app/demo/page.tsx"), false);
});

test("runtime source has no demo-account identities, old demo UI or literal password assignments", () => {
  const findings = [];
  function scan(dir) {
    for (const row of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, row.name);
      if (row.isDirectory()) {
        scan(file);
        continue;
      }
      if (!/\.(tsx?|mjs|js|json|html|xml|txt)$/.test(file)) continue;
      const value = fs.readFileSync(file, "utf8");
      if (
        /demo\.(customer|provider|technician|admin)@|demoRoles|CredentialField/.test(
          value,
        )
      )
        findings.push(file);
      if (!/\.(tsx?|mjs|js)$/.test(file)) continue;
      const ast = ts.createSourceFile(
        file,
        value,
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        if (
          (ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) &&
          node.initializer &&
          ts.isStringLiteralLike(node.initializer) &&
          node.initializer.text &&
          /^(password|passwd|demoPassword)$/i.test(
            node.name.getText(ast).replace(/["']/g, ""),
          )
        )
          findings.push(file);
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
  for (const dir of ["app", "components", "lib", "public"]) scan(dir);
  assert.deepEqual(
    [...new Set(findings)],
    [],
    "Runtime source contains a credential publication regression",
  );
});

test("explicit empty contact input has no fallback, including legal disclosure validation", () => {
  assert.deepEqual(contact.getPublicBusinessContact({}), {
    email: undefined,
    phone: undefined,
  });
});
test("the environment example publishes no finance keys or unapproved business contacts", () => {
  const example = fs.readFileSync(".env.example", "utf8");
  for (const key of [
    "PAYOUT_ENCRYPTION_KEY",
    "FINANCE_COLLECTION_JOB_TOKEN",
    "NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL",
    "NEXT_PUBLIC_BUSINESS_CONTACT_PHONE",
  ]) {
    assert.ok(
      new RegExp(`^${key}=\\s*$`, "m").test(example),
      "An example configuration value requires security review",
    );
  }
});
test("business contact configuration permits ordinary approved values and rejects header/URL injection", () => {
  assert.deepEqual(
    contact.getPublicBusinessContact({
      email: " support+team@example.invalid ",
      phone: " +12025550123 ",
    }),
    { email: "support+team@example.invalid", phone: "+12025550123" },
  );
  for (const email of [
    "javascript:alert(1)",
    "support@example.invalid?bcc=other@example.invalid",
    "support@example.invalid\r\nBcc: other@example.invalid",
    "not-an-address",
  ])
    assert.equal(contact.getPublicBusinessContact({ email }).email, undefined);
  for (const phone of [
    "javascript:alert(1)",
    "+12025550123?body=message",
    "2025550123",
    "+012345678",
    "+1202\n5550123",
  ])
    assert.equal(contact.getPublicBusinessContact({ phone }).phone, undefined);
});

function footer(input) {
  const { SiteFooter } = load("components/SiteFooter.tsx", {
    "next/link": ({ href, children, ...props }) =>
      React.createElement("a", { href, ...props }, children),
    "@/components/BrandLogo": {
      BrandLogo: () => React.createElement("span", null, "Servizato"),
    },
    "@/lib/public-business-contact": {
      formatPublicPhone: contact.formatPublicPhone,
      getPublicBusinessContact: () => contact.getPublicBusinessContact(input),
    },
    "@/components/public/SocialLinks": { SocialLinks: () => null },
  });
  return renderToStaticMarkup(React.createElement(SiteFooter));
}
test("the actual footer renders no hidden address, mailto or tel fallback with empty configuration", () => {
  const html = footer({});
  assert.doesNotMatch(html, /<address|mailto:|tel:|@[a-z\d]|hello@/i);
  assert.match(html, /\/signin/);
  assert.match(html, /Explore services/);
});
test("the actual footer renders only the explicitly configured business contact", () => {
  const html = footer({ email: "support@example.invalid" });
  assert.match(html, /href="mailto:support@example.invalid"/);
  assert.doesNotMatch(html, /href="tel:/);
  assert.match(footer({ phone: "+12025550123" }), /href="tel:\+12025550123"/);
  assert.doesNotMatch(
    footer({ email: "invalid", phone: "invalid" }),
    /<address|mailto:|tel:/,
  );
});

for (const role of ["customer", "technician", "service_provider", "admin"]) {
  test(`normal credentials sign-in and persisted authorization remain intact for ${role}`, async () => {
    // Controlled boundary values only; no account, database or real credential is used.
    const supplied = "<controlled test input>";
    const user = {
      _id: "a".repeat(24),
      email: "account@example.invalid",
      role,
      name: "Test account",
      password: "<stored test hash>",
      isActive: true,
      credentialVersion: 7,
    };
    const User = { findOne: () => chain(user) };
    const { authOptions } = load("lib/auth-options.ts", {
      "next-auth/providers/credentials": (options) => ({
        ...options,
        type: "credentials",
      }),
      "next-auth/providers/google": (options) => ({
        ...options,
        type: "oauth",
      }),
      bcryptjs: {
        compare: async (input, stored) =>
          input === supplied && stored === user.password,
      },
      "@/lib/db": { connectToDb: async () => {} },
      "@/models/user": User,
      "@/models/otp": {},
      "@/lib/push-session": {
        deactivatePushSession: async () => {},
        newPushSessionId: () => "<private test binding>",
        pushSessionHash: () => true,
      },
    });
    const credentials = authOptions.providers.find(
      (provider) => provider.type === "credentials",
    );
    const signedIn = await credentials.authorize({
      email: " ACCOUNT@example.invalid ",
      password: supplied,
    });
    assert.equal(signedIn.id, user._id);
    assert.equal(signedIn.role, role);
    assert.equal(signedIn.credentialVersion, 7);
    await assert.rejects(
      credentials.authorize({
        email: user.email,
        password: "<incorrect test input>",
      }),
      /Invalid credentials/,
    );
    const token = await authOptions.callbacks.jwt({
      token: {},
      user: signedIn,
    });
    const session = await authOptions.callbacks.session({
      session: { user: {} },
      token,
    });
    assert.equal(session.user.role, role);
    assert.equal(session.user.id, user._id);
    assert.equal(session.user.pushSessionId, undefined);
    const auth = load("lib/auth.ts", {
      "@/lib/auth-options": { authOptions },
      "next-auth": { getServerSession: async () => session },
      "./db": { connectToDb: async () => {} },
      "@/models/user": User,
    });
    assert.equal((await auth.requireRole([role])).user.id, user._id);
    await assert.rejects(
      auth.requireRole([role === "admin" ? "customer" : "admin"]),
      (error) => error.status === 403,
    );
    user.credentialVersion += 1;
    await assert.rejects(
      auth.requireRole([role]),
      (error) => error.status === 401,
    );
  });
}

test("the existing proxy still protects all four workspaces and accepts their matching role", async () => {
  let token = null;
  const { proxy } = load("proxy.ts", {
    "next-auth/jwt": { getToken: async () => token },
    "@/lib/role-route": load("lib/role-route.ts"),
    "@/lib/booking-redirect": load("lib/booking-redirect.ts"),
  });
  for (const [role, destination] of [
    ["customer", "/customer"],
    ["technician", "/technician/dashboard"],
    ["service_provider", "/service-provider"],
    ["admin", "/admin/dashboard"],
  ]) {
    const request = new NextRequest("http://localhost:3000" + destination);
    token = null;
    const anonymous = await proxy(request);
    assert.equal(anonymous.status, 307);
    assert.equal(
      new URL(anonymous.headers.get("Location")).pathname,
      "/signin",
    );
    token = { role };
    const allowed = await proxy(request);
    assert.equal(allowed.headers.get("x-middleware-next"), "1");
    token = { role: role === "admin" ? "customer" : "admin" };
    assert.equal((await proxy(request)).status, 307);
  }
});
