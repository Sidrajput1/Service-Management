import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import mongoose from "mongoose";
import { renderToStaticMarkup } from "react-dom/server";
import * as policy from "../lib/moderation-policy.mjs";
import * as marketplace from "../lib/marketplace-policy.mjs";
import * as catalog from "../lib/catalog/definition.mjs";
import * as serviceLocation from "../lib/service-location.mjs";
import { moderationMessage } from "../lib/moderation-message.mjs";
import {
  provisionArguments,
  provisionIssue,
  legacyReviewChanges,
} from "../lib/admin-operations-policy.mjs";

const require = createRequire(import.meta.url),
  id = (digit) => digit.repeat(24);
async function load(path, modules = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith("./"))
        throw new Error(`Missing test dependency ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
function chain(getValue) {
  const query = {
    then: (resolve, reject) =>
      Promise.resolve()
        .then(() => (typeof getValue === "function" ? getValue() : getValue))
        .then(resolve, reject),
  };
  for (const name of [
    "lean",
    "select",
    "session",
    "sort",
    "limit",
    "populate",
    "maxTimeMS",
  ])
    query[name] = () => query;
  return query;
}
function matches(row, filter) {
  if (!row) return false;
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((branch) => matches(row, branch));
    if (
      value &&
      typeof value === "object" &&
      !value._bsontype &&
      !(value instanceof RegExp)
    ) {
      if ("$ne" in value) return String(row[key]) !== String(value.$ne);
      if ("$exists" in value) return (row[key] !== undefined) === value.$exists;
      if ("$in" in value)
        return value.$in.some((option) =>
          option == null
            ? row[key] == null
            : String(option) === String(row[key]),
        );
      if ("$type" in value)
        return value.$type === "date" && row[key] instanceof Date;
      if ("$regex" in value)
        return new RegExp(value.$regex, value.$options).test(row[key] || "");
    }
    return String(row[key]) === String(value);
  });
}
const document = (row) =>
  row ? { ...row, toObject: () => ({ ...row }) } : null;
function update(row, changes) {
  Object.assign(row, changes.$set || {});
  for (const [key, value] of Object.entries(changes.$inc || {}))
    row[key] = (row[key] || 0) + value;
  for (const key of Object.keys(changes.$unset || {})) delete row[key];
  return document(row);
}
const request = (body) =>
  new Request("http://test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const decision = (action, version = 0, reason = "") => ({
  requestId: randomUUID(),
  expectedVersion: version,
  action,
  reason,
});
const pagination = await load("../lib/pagination.ts");

async function fixture() {
  let db = {
    providers: [
      {
        _id: id("1"),
        ownerId: id("2"),
        companyName: "Saved business",
        businessType: "services",
        email: "business@example.test",
        phone: "9876543210",
        address: {
          addressLine: "Saved address",
          city: "Patna",
          state: "Bihar",
          pincode: "800001",
        },
        status: "active",
        verificationStatus: "pending",
        onboardingCompletedAt: new Date(),
        coverageVersion: 1,
        coverageAreas: [{ city: "Patna", state: "Bihar", isActive: true }],
        reviewVersion: 0,
      },
    ],
    offerings: [
      {
        _id: id("3"),
        serviceProviderId: id("1"),
        priceItemId: id("4"),
        name: "Saved service",
        description: "Saved scope",
        price: 400,
        currency: "INR",
        taxPercent: 18,
        unit: "job",
        pricingModel: "fixed",
        isActive: true,
        offerEnabled: false,
        approvalStatus: "pending",
        reviewVersion: 0,
      },
    ],
    catalog: [
      {
        _id: id("4"),
        itemType: "service",
        name: "Saved service",
        categoryKey: "other",
        unit: "job",
        skillKeys: [catalog.catalogSkills[0].key],
        isActive: true,
        price: 100,
        suggestedPrice: {
          amount: 100,
          currency: "INR",
          unit: "job",
          kind: "configured",
          qualification: "Configured reference",
        },
        reviewVersion: 0,
      },
    ],
    audits: [],
    notifications: [],
    users: [{ _id: id("2"), role: "service_provider", isActive: true }],
  };
  const state = {
    role: "admin",
    sessionRole: "admin",
    signedIn: true,
    deliveryFails: false,
    markFails: false,
    progressComplete: true,
    activeTransaction: false,
  };
  let serial = Promise.resolve();
  const mongo = {
    Types: mongoose.Types,
    startSession: async () => ({
      withTransaction: async (action) => {
        const previous = serial;
        let release;
        serial = new Promise((resolve) => {
          release = resolve;
        });
        await previous;
        const snapshot = structuredClone(db);
        state.activeTransaction = true;
        state.transactionWrites = false;
        try {
          return await action();
        } catch (error) {
          if (state.transactionWrites) db = snapshot;
          throw error;
        } finally {
          state.activeTransaction = false;
          release();
        }
      },
      endSession: async () => {},
    }),
  };
  const model = (key) => ({
    findById: (value) =>
      chain(() =>
        document(db[key].find((row) => String(row._id) === String(value))),
      ),
    findOne: (filter) =>
      chain(() => document(db[key].find((row) => matches(row, filter)))),
    exists: (filter) =>
      chain(() => Boolean(db[key].some((row) => matches(row, filter)))),
    countDocuments: (filter) =>
      chain(() => db[key].filter((row) => matches(row, filter)).length),
    findOneAndUpdate: async (filter, changes, options) => {
      if (options?.session) assert.equal(state.activeTransaction, true);
      const row = db[key].find((row) => matches(row, filter));
      if (row && options?.session) state.transactionWrites = true;
      return row ? update(row, changes) : null;
    },
    updateOne: async (filter, changes, options) => {
      if (options?.session) assert.equal(state.activeTransaction, true);
      const row = db[key].find((row) => matches(row, filter));
      if (row) update(row, changes);
      return { matchedCount: row ? 1 : 0 };
    },
    create: async (values, options) =>
      values.map((value) => {
        if (options?.session) {
          assert.equal(state.activeTransaction, true);
          state.transactionWrites = true;
        }
        if (key === "audits" && state.auditFails)
          throw new Error("Injected audit write failure");
        const row = {
          ...value,
          _id: value._id || new mongoose.Types.ObjectId().toString(),
          createdAt: new Date(),
        };
        db[key].push(row);
        return document(row);
      }),
  });
  const providers = model("providers"),
    offerings = model("offerings"),
    items = model("catalog"),
    audits = model("audits");
  const originalAuditUpdate = audits.updateOne;
  audits.updateOne = async (...args) => {
    if (state.markFails) throw new Error("Delivery marker unavailable");
    return originalAuditUpdate(...args);
  };
  const notifications = {
    findOneAndUpdate: async (filter, changes) => {
      if (state.deliveryFails) throw new Error("Injected notification outage");
      let row = db.notifications.find((row) => matches(row, filter));
      if (!row) {
        row = { ...changes.$setOnInsert };
        db.notifications.push(row);
      }
      return row;
    },
  };
  const auth = await load("../lib/auth.ts", {
    "@/lib/auth-options": { authOptions: {} },
    "next-auth": {
      getServerSession: async () =>
        state.signedIn
          ? { user: { id: id("a"), role: state.sessionRole } }
          : null,
    },
    "./db": { connectToDb: async () => {} },
    "@/models/user": {
      findOne: () =>
        chain(() => ({ _id: id("a"), role: state.role, isActive: true })),
    },
  });
  const responses = await load("../lib/api-response.ts", {
    "@/lib/auth": auth,
  });
  const validation = await load("../lib/marketplace-validation.ts", {
    "@/lib/pagination": pagination,
    "@/lib/marketplace-policy.mjs": marketplace,
    "@/lib/catalog/definition.mjs": catalog,
    "@/lib/auth": auth,
  });
  const adminValidation = await load("../lib/admin-validation.ts", {
    "./pagination": pagination,
    "./marketplace-policy.mjs": marketplace,
    "./moderation-policy.mjs": policy,
  });
  const requestCoverage = await load("../lib/request-coverage.ts", {
    "./service-location.mjs": serviceLocation,
    "./marketplace-policy.mjs": marketplace,
  });
  const common = {
    "./request-coverage": requestCoverage,
    "./auth": auth,
    "@/lib/auth": auth,
    "./db": { connectToDb: async () => {} },
    "@/lib/db": { connectToDb: async () => {} },
    mongoose: mongo,
    "@/models/ServiceProvider": providers,
    "@/models/ServiceOffering": offerings,
    "@/models/PriceItem": items,
    "@/models/ModerationAudit": audits,
    "@/models/user": { exists: () => chain(true) },
    "./moderation-policy.mjs": policy,
    "@/lib/moderation-policy.mjs": policy,
    "./marketplace-validation": validation,
    "@/lib/marketplace-validation": validation,
    "./catalog/definition.mjs": catalog,
    "@/lib/catalog/definition.mjs": catalog,
    "./provider-onboarding": {
      onboardingProgress: async () => ({ saved: state.progressComplete }),
    },
    "./admin-validation": adminValidation,
    "@/lib/admin-validation": adminValidation,
    "@/lib/pagination": pagination,
    "@/lib/api-response": responses,
  };
  const notification = await load("../lib/notification.ts", {
    ...common,
    "@/models/notification": notifications,
  });
  const delivery = await load("../lib/moderation-notifications.ts", {
    ...common,
    "./notification": notification,
    "./moderation-message.mjs": { moderationMessage },
  });
  const moderation = await load("../lib/moderation.ts", {
    ...common,
    "./moderation-notifications": delivery,
  });
  const catalogSchema = await load("../lib/catalog/admin-validation.ts", {
    "./definition.mjs": catalog,
    "@/lib/marketplace-validation": validation,
  });
  const catalogHelper = await load("../lib/admin-catalog.ts", {
    ...common,
    "./moderation": moderation,
    "./catalog/admin-validation": catalogSchema,
  });
  const providerReview = await load("../lib/provider-review.ts", {
    ...common,
    "./moderation": moderation,
  });
  const offeringHelper = await load("../lib/provider-offerings.ts", common);
  return {
    get db() {
      return db;
    },
    state,
    common,
    auth,
    responses,
    validation,
    adminValidation,
    moderation,
    catalogHelper,
    providerReview,
    offeringHelper,
    delivery,
    models: { providers, offerings, items },
    route: async (path, extra = {}) =>
      load(path, {
        ...common,
        "@/lib/moderation": moderation,
        "@/lib/admin-catalog": catalogHelper,
        ...extra,
      }),
  };
}

test("persisted roles defeat forged admin claims and customer admin pages deny their children", async () => {
  const f = await fixture();
  const layout = await load("../app/(dashboards)/admin/layout.tsx", {
    "@/lib/auth": f.auth,
    "next/navigation": {
      redirect: () => {
        throw new Error("redirect");
      },
    },
    "@/components/admin/AdminShell": { AdminShell: ({ children }) => children },
  });
  for (const role of [
    "customer",
    "service_provider",
    "technician",
    "dispatcher",
  ]) {
    f.state.role = role;
    await assert.rejects(
      f.auth.requireAdmin(),
      (error) => error.status === 403,
    );
    const html = renderToStaticMarkup(
      await layout.default({ children: "PRIVATE REVIEW DATA" }),
    );
    assert.match(html, /Admin access required/);
    assert.doesNotMatch(html, /PRIVATE REVIEW DATA/);
  }
  f.state.role = "admin";
  assert.equal((await f.auth.requireAdmin()).user.role, "admin");
  f.state.signedIn = false;
  await assert.rejects(f.auth.requireAdmin(), (error) => error.status === 401);
});
test("actual admin decision and catalog endpoints reject every unauthorized role before writes", async () => {
  const f = await fixture(),
    paths = [
      "../app/api/admin/providers/[id]/decision/route.ts",
      "../app/api/admin/offerings/[id]/decision/route.ts",
      "../app/api/admin/catalog/[id]/route.ts",
    ];
  for (const path of paths) {
    const route = await f.route(path);
    for (const role of [
      "customer",
      "service_provider",
      "technician",
      "dispatcher",
    ]) {
      f.state.role = role;
      const res = await (route.POST || route.PATCH)(
        request({ ...decision("approve"), role: "admin", actorId: id("a") }),
        { params: Promise.resolve({ id: id("1") }) },
      );
      assert.equal(res.status, 403);
      assert.match(res.headers.get("Cache-Control"), /no-store/);
    }
  }
  assert.equal(f.db.audits.length, 0);
  assert.equal(f.db.providers[0].verificationStatus, "pending");
});
test("public registration cannot select admin and direct customer signup hardcodes the role", async () => {
  const f = await fixture();
  let created;
  const registration = await load("../lib/registration.ts", {
    "@/lib/marketplace-policy.mjs": marketplace,
    "@/lib/marketplace-validation": f.validation,
  });
  const customer = await load("../app/api/auth/signup/customer/route.ts", {
    "@/lib/db": { connectToDb: async () => {} },
    "@/lib/registration": registration,
    "@/lib/api-response": f.responses,
    "@/models/user": {
      exists: async () => false,
      create: async (value) => {
        created = value;
        return { ...value, _id: id("c") };
      },
    },
  });
  const generic = await load("../app/api/auth/signup/route.ts", {
    "./customer/route": customer,
    "@/lib/api-response": f.responses,
  });
  const payload = {
    name: "Trusted test user",
    email: "user@example.test",
    phone: "9876543210",
    password: "Valid-test-password-42",
    role: "admin",
  };
  assert.equal((await generic.POST(request(payload))).status, 403);
  assert.equal(created, undefined);
  assert.equal((await customer.POST(request(payload))).status, 201);
  assert.equal(created.role, "customer");
  assert.notEqual(created.password, payload.password);
});
test("review routes validate reasons/revisions, use server actor IDs, and return 404 for missing records", async () => {
  const f = await fixture(),
    route = await f.route("../app/api/admin/providers/[id]/decision/route.ts");
  for (const action of ["reject", "request_changes", "suspend"]) {
    assert.equal(
      (
        await route.POST(request(decision(action)), {
          params: Promise.resolve({ id: id("1") }),
        })
      ).status,
      400,
    );
  }
  for (const [kind, target] of [
    ["providers", id("f")],
    ["offerings", id("e")],
  ]) {
    const api = await f.route(
      `../app/api/admin/${kind}/[id]/decision/route.ts`,
    );
    assert.equal(
      (
        await api.POST(request(decision("approve")), {
          params: Promise.resolve({ id: target }),
        })
      ).status,
      404,
    );
  }
  const response = await route.POST(
    request({ ...decision("approve"), actorId: id("f") }),
    { params: Promise.resolve({ id: id("1") }) },
  );
  assert.equal(response.status, 200);
  assert.equal(String(f.db.audits[0].actorId), id("a"));
});
test("provider approval leaves pending offerings unchanged and marketplace gates remain closed", async () => {
  const f = await fixture();
  await f.moderation.decideProvider(id("a"), id("1"), decision("approve"));
  assert.equal(f.db.providers[0].verificationStatus, "verified");
  assert.equal(f.db.offerings[0].approvalStatus, "pending");
  assert.match(
    policy.offeringEligibility(
      f.db.offerings[0],
      f.db.providers[0],
      f.db.catalog[0],
      { city: "Patna" },
      [],
    ),
    /approval/,
  );
});
test("offering approval leaves an unverified provider unchanged; all marketplace conditions are required", async () => {
  const f = await fixture();
  await f.moderation.decideOffering(id("a"), id("3"), decision("approve"));
  assert.equal(f.db.offerings[0].approvalStatus, "approved");
  assert.equal(f.db.providers[0].verificationStatus, "pending");
  assert.match(
    policy.offeringEligibility(
      f.db.offerings[0],
      f.db.providers[0],
      f.db.catalog[0],
      { city: "Patna" },
      [],
    ),
    /business/,
  );
  await f.moderation.decideProvider(id("a"), id("1"), decision("approve"));
  assert.equal(
    policy.offeringEligibility(
      f.db.offerings[0],
      f.db.providers[0],
      f.db.catalog[0],
      { city: "Patna" },
      [],
    ),
    null,
  );
  assert.equal(
    policy.offeringEligibility(
      f.db.offerings[0],
      f.db.providers[0],
      f.db.catalog[0],
      { city: "Delhi" },
      [],
    ),
    null,
  );
  f.db.catalog[0].isActive = false;
  assert.match(
    policy.offeringEligibility(
      f.db.offerings[0],
      f.db.providers[0],
      f.db.catalog[0],
      {},
      [],
    ),
    /inactive/,
  );
});
test("two concurrent administrators produce one audited decision and a conflict for the stale review", async () => {
  const f = await fixture();
  const results = await Promise.allSettled([
    f.moderation.decideProvider(id("a"), id("1"), decision("approve")),
    f.moderation.decideProvider(
      id("b"),
      id("1"),
      decision("reject", 0, "Saved details need correction"),
    ),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    results.find((result) => result.status === "rejected").reason.status,
    409,
  );
  assert.equal(f.db.audits.length, 1);
  assert.equal(f.db.providers[0].reviewVersion, 1);
  assert.equal(f.db.notifications.length, 1);
});
test("identical action retries are idempotent and reuse of its UUID for a different decision is rejected", async () => {
  const f = await fixture(),
    input = decision("approve");
  const first = await f.moderation.decideOffering(id("a"), id("3"), input),
    again = await f.moderation.decideOffering(id("a"), id("3"), input);
  assert.equal(first.replayed, false);
  assert.equal(again.replayed, true);
  assert.equal(f.db.audits.length, 1);
  assert.equal(f.db.notifications.length, 1);
  await assert.rejects(
    f.moderation.decideOffering(id("a"), id("3"), {
      ...input,
      action: "reject",
      reason: "Different intent",
    }),
    (error) => error.status === 409,
  );
});
test("notification outage preserves the committed decision and crash/retry never duplicates delivery", async () => {
  const f = await fixture(),
    input = decision("approve");
  f.state.deliveryFails = true;
  const result = await f.moderation.decideProvider(id("a"), id("1"), input);
  assert.equal(result.notificationPending, true);
  assert.equal(f.db.providers[0].verificationStatus, "verified");
  assert.equal(f.db.audits[0].notificationState, "pending");
  f.state.deliveryFails = false;
  f.state.markFails = true;
  await f.moderation.decideProvider(id("a"), id("1"), input);
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.db.audits[0].notificationState, "pending");
  f.state.markFails = false;
  assert.equal(
    (await f.moderation.decideProvider(id("a"), id("1"), input))
      .notificationPending,
    false,
  );
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.db.audits[0].notificationState, "sent");
});
test("incomplete onboarding cannot be approved and suspension/restore never changes offering approvals", async () => {
  const f = await fixture();
  f.state.progressComplete = false;
  await assert.rejects(
    f.moderation.decideProvider(id("a"), id("1"), decision("approve")),
    (error) => error.status === 400,
  );
  assert.equal(f.db.audits.length, 0);
  f.state.progressComplete = true;
  await f.moderation.decideProvider(id("a"), id("1"), decision("approve"));
  await f.moderation.decideProvider(
    id("a"),
    id("1"),
    decision("suspend", 1, "Review the supplied business information"),
  );
  assert.equal(f.db.providers[0].status, "suspended");
  assert.equal(f.db.providers[0].verificationStatus, "verified");
  assert.equal(f.db.offerings[0].approvalStatus, "pending");
  await f.moderation.decideProvider(id("a"), id("1"), decision("restore", 2));
  assert.equal(f.db.providers[0].status, "active");
});
test("new offerings from a verified business enter pending despite forged approval fields", async () => {
  const f = await fixture();
  f.db.providers[0].verificationStatus = "verified";
  f.db.offerings = [];
  const offering = await f.offeringHelper.saveProviderOffering(id("1"), {
    priceItemId: id("4"),
    price: 250,
    approvalStatus: "approved",
    reviewVersion: 900,
  });
  assert.equal(offering.approvalStatus, "pending");
  assert.equal(offering.reviewVersion, 1);
  assert.equal(f.db.providers[0].verificationStatus, "verified");
});
test("ordinary price edits retain approval, scope edits require review, and foreign ownership is rejected", async () => {
  const f = await fixture();
  f.db.offerings[0].approvalStatus = "approved";
  const saved = { booking: { finalPrice: 400 }, invoice: { total: 472 } },
    history = structuredClone(saved);
  await f.offeringHelper.saveProviderOffering(
    id("1"),
    { ...f.db.offerings[0], price: 650 },
    { id: id("3") },
  );
  assert.equal(f.db.offerings[0].approvalStatus, "approved");
  assert.equal(f.db.offerings[0].price, 650);
  await f.offeringHelper.saveProviderOffering(
    id("1"),
    { ...f.db.offerings[0], description: "New customer-facing claims" },
    { id: id("3") },
  );
  assert.equal(f.db.offerings[0].approvalStatus, "pending");
  assert.deepEqual(saved, history);
  await assert.rejects(
    f.offeringHelper.saveProviderOffering(
      id("9"),
      { priceItemId: id("4"), price: 1 },
      { id: id("3") },
    ),
    (error) => error.status === 404,
  );
  assert.throws(() =>
    f.validation.offeringSchema.parse({
      priceItemId: id("4"),
      price: 1,
      currency: "USD",
    }),
  );
});
test("rejected and changes-requested offerings can be explicitly resubmitted by their owner only", async () => {
  for (const status of ["rejected", "changes_requested"]) {
    const f = await fixture();
    f.db.offerings[0].approvalStatus = status;
    f.db.offerings[0].lastReview = { reason: "Describe the included work" };
    const input = { requestId: randomUUID(), expectedVersion: 0 };
    await assert.rejects(
      f.providerReview.resubmitOffering(id("2"), id("9"), id("3"), input),
      (error) => error.status === 404,
    );
    await f.providerReview.resubmitOffering(id("2"), id("1"), id("3"), input);
    assert.equal(f.db.offerings[0].approvalStatus, "pending");
    assert.equal(
      f.db.offerings[0].lastReview.reason,
      "Describe the included work",
    );
    assert.equal(f.db.providers[0].verificationStatus, "pending");
    assert.equal(f.db.audits.length, 1);
    assert.equal(f.db.audits[0].actorKind, "service_provider");
  }
});
test("business identity edits reset verified status and resubmission preserves operational suspension", async () => {
  const f = await fixture();
  f.db.providers[0].verificationStatus = "verified";
  await f.providerReview.saveProviderProfile(f.db.providers[0], {
    description: "Changed business claims",
  });
  assert.equal(f.db.providers[0].verificationStatus, "pending");
  f.db.providers[0].verificationStatus = "changes_requested";
  f.db.providers[0].status = "suspended";
  await f.providerReview.resubmitProvider(id("2"), id("1"), {
    requestId: randomUUID(),
    expectedVersion: 1,
  });
  assert.equal(f.db.providers[0].verificationStatus, "pending");
  assert.equal(f.db.providers[0].status, "suspended");
});
test("catalog reference edits leave provider prices and saved history intact; deactivation retains records", async () => {
  const f = await fixture(),
    history = { booking: { total: 400 }, invoice: { total: 472 } },
    original = structuredClone(history);
  await f.catalogHelper.writeCatalog(
    id("a"),
    {
      requestId: randomUUID(),
      expectedVersion: 0,
      suggestedPrice: {
        amount: 175,
        currency: "INR",
        unit: "job",
        kind: "configured",
        qualification: "Admin configured input",
      },
    },
    id("4"),
  );
  assert.equal(f.db.catalog[0].suggestedPrice.amount, 175);
  assert.equal(f.db.offerings[0].price, 400);
  assert.deepEqual(history, original);
  await f.catalogHelper.writeCatalog(
    id("a"),
    { requestId: randomUUID(), expectedVersion: 1, isActive: false },
    id("4"),
  );
  assert.equal(f.db.offerings.length, 1);
  assert.deepEqual(history, original);
  await assert.rejects(
    f.offeringHelper.saveProviderOffering(id("1"), {
      priceItemId: id("4"),
      price: 200,
    }),
    (error) => error.status === 400,
  );
});
test("catalog rejects normalized duplicate names and downgrades edited observed references while retaining provenance", async () => {
  const f = await fixture();
  await assert.rejects(
    f.catalogHelper.writeCatalog(id("a"), {
      requestId: randomUUID(),
      itemType: "service",
      name: "  SAVED   SERVICE ",
      price: 10,
      skillKeys: [catalog.catalogSkills[0].key],
    }),
    (error) => error.status === 409,
  );
  f.db.catalog[0].suggestedPrice = {
    amount: 100,
    currency: "INR",
    unit: "job",
    kind: "public_listing",
    city: "Patna",
    sourceUrl: "https://example.test/retained-reference",
    checkedAt: "2026-10-23",
    qualification: "Observed listing scope",
  };
  await f.catalogHelper.writeCatalog(
    id("a"),
    {
      requestId: randomUUID(),
      expectedVersion: 0,
      suggestedPrice: { ...f.db.catalog[0].suggestedPrice, amount: 200 },
    },
    id("4"),
  );
  assert.equal(f.db.catalog[0].suggestedPrice.kind, "configured");
  assert.equal(f.db.catalog[0].suggestedPrice.checkedAt, "2026-10-23");
  assert.equal(f.db.offerings[0].price, 400);
});
test("booking confirmation reloads authoritative state and fences all three records within its transaction", async () => {
  const f = await fixture(),
    session = {},
    writes = [];
  f.db.providers[0].verificationStatus = "verified";
  f.db.offerings[0].approvalStatus = "approved";
  const modules = { ...f.common };
  for (const [name, key] of [
    ["ServiceProvider", "providers"],
    ["ServiceOffering", "offerings"],
    ["PriceItem", "items"],
  ])
    modules[`@/models/${name}`] = {
      ...f.models[key],
      updateOne: async (filter, changes, options) => {
        assert.equal(options.session, session);
        assert.deepEqual(changes, { $inc: { __v: 1 } });
        writes.push(name);
      },
    };
  const helper = await load("../lib/booking-eligibility.ts", modules);
  await helper.confirmMarketplaceEligibility(
    id("1"),
    id("3"),
    { city: "Patna" },
    session,
  );
  assert.deepEqual(writes, ["ServiceProvider", "ServiceOffering", "PriceItem"]);
  for (const change of [
    () => {
      f.db.providers[0].status = "suspended";
    },
    () => {
      f.db.providers[0].status = "active";
      f.db.offerings[0].approvalStatus = "pending";
    },
    () => {
      f.db.offerings[0].approvalStatus = "approved";
      f.db.catalog[0].isActive = false;
    },
  ]) {
    change();
    await assert.rejects(
      helper.confirmMarketplaceEligibility(
        id("1"),
        id("3"),
        { city: "Patna" },
        session,
      ),
      (error) => error.status === 409,
    );
  }
  assert.equal(writes.length, 3);
});
test("legacy records fail closed and migration never auto-approves or rewrites historical prices", () => {
  const old = { price: 400, isActive: true },
    changes = legacyReviewChanges(old, "offering");
  assert.deepEqual(changes, {
    reviewVersion: 0,
    approvalStatus: "pending",
    currency: "INR",
  });
  assert.equal(old.approvalStatus, undefined);
  assert.match(
    policy.offeringEligibility(
      old,
      {
        verificationStatus: "verified",
        status: "active",
        onboardingCompletedAt: new Date(),
      },
      null,
      {},
      [],
    ),
    /approval/,
  );
  assert.deepEqual(
    legacyReviewChanges(
      {
        reviewVersion: 8,
        approvalStatus: "approved",
        currency: "INR",
        price: 400,
      },
      "offering",
    ),
    {},
  );
  assert.deepEqual(
    legacyReviewChanges(
      { verificationStatus: "verified", reviewVersion: 1 },
      "provider",
    ),
    {},
  );
  assert.equal(
    policy.catalogNameKey("  AC   Service "),
    policy.catalogNameKey("ac service"),
  );
  assert.equal(policy.providerIdentityChanged({}, {}), false);
});
test("trusted provisioning requires a concrete account, explicit apply acknowledgement and retry identity", () => {
  assert.throws(() => provisionArguments(["--email", "attacker@example.test"]));
  assert.throws(() =>
    provisionArguments(["--user-id", id("a"), "--operator", "ops", "--apply"]),
  );
  const options = provisionArguments([
    "--user-id",
    id("a"),
    "--operator",
    "ops",
    "--apply",
    "--ack-admin-access",
    "--request-id",
    randomUUID(),
  ]);
  assert.equal(options.apply, true);
  for (const [user, linked] of [
    [null, false],
    [{ role: "customer", isActive: false }, false],
    [{ role: "customer", mustChangePassword: true }, false],
    [{ role: "service_provider" }, false],
    [{ role: "customer" }, true],
  ])
    assert.ok(provisionIssue(user, linked));
  assert.equal(
    provisionIssue({ role: "customer", isActive: true }, false),
    null,
  );
});

test("audit persistence failure rolls back a status decision and produces no notification", async () => {
  const f = await fixture();
  f.state.auditFails = true;
  await assert.rejects(
    f.moderation.decideProvider(id("a"), id("1"), decision("approve")),
    /audit write failure/,
  );
  assert.equal(f.db.providers[0].verificationStatus, "pending");
  assert.equal(f.db.providers[0].reviewVersion, 0);
  assert.equal(f.db.audits.length, 0);
  assert.equal(f.db.notifications.length, 0);
});

test("admin queues authenticate reads, bound results before joins, and paginate both directions", async () => {
  const f = await fixture(),
    calls = [];
  let pipeline;
  const providerQuery = {
    then: (resolve, reject) => Promise.resolve([]).then(resolve, reject),
  };
  for (const method of ["select", "limit", "maxTimeMS", "sort", "lean"])
    providerQuery[method] = (value) => {
      calls.push([method, value]);
      return providerQuery;
    };
  const data = await load("../lib/admin-data.ts", {
    ...f.common,
    "./pagination": pagination,
    "./marketplace-policy.mjs": marketplace,
    "./admin-validation": f.adminValidation,
    "@/models/ServiceProvider": {
      collection: { name: "serviceproviders" },
      find: () => providerQuery,
    },
    "@/models/PriceItem": { collection: { name: "priceitems" } },
    "@/models/ServiceOffering": {
      aggregate: (stages) => ({
        option: (options) => {
          pipeline = stages;
          assert.equal(options.maxTimeMS, 5000);
          return [];
        },
      }),
    },
  });
  f.state.role = "customer";
  await assert.rejects(data.readProviders({}), (error) => error.status === 403);
  assert.equal(calls.length, 0);
  f.state.role = "admin";
  await data.readProviders({ status: "pending", limit: 20 });
  assert.ok(
    calls.some(([method, value]) => method === "limit" && value === 21),
  );
  assert.ok(
    calls.some(([method, value]) => method === "maxTimeMS" && value === 5000),
  );
  await data.readOfferings({ status: "pending", limit: 10 });
  assert.equal(pipeline[2].$limit, 11);
  assert.ok(pipeline.findIndex((stage) => stage.$lookup) > 2);
  assert.deepEqual(pipeline[0].$match.approvalStatus, {
    $in: ["pending", null],
  });
  const first = data.adminPage(
    [{ _id: id("f") }, { _id: id("e") }, { _id: id("d") }],
    f.adminValidation.adminListSchema.parse({ limit: 2 }),
  );
  assert.equal(first.nextCursor, id("e"));
  assert.equal(first.previousCursor, null);
  const previous = data.adminPage(
    [{ _id: id("d") }, { _id: id("e") }, { _id: id("f") }],
    f.adminValidation.adminListSchema.parse({
      limit: 2,
      direction: "previous",
      cursor: id("c"),
    }),
  );
  assert.deepEqual(
    previous.items.map((row) => row._id),
    [id("e"), id("d")],
  );
  assert.equal(previous.previousCursor, id("e"));
  assert.equal(previous.nextCursor, id("d"));
  assert.throws(() => data.parseAdminList({ limit: 1000 }));
  assert.throws(() => data.parseAdminList({ cursor: "forged" }));
});

test("updated catalog defaults reach the existing picker and a new offering without repricing another provider", async () => {
  const f = await fixture();
  await f.catalogHelper.writeCatalog(
    id("a"),
    { requestId: randomUUID(), expectedVersion: 0, price: 175 },
    id("4"),
  );
  const reader = await load("../lib/catalog/server.ts", {
    "@/models/PriceItem": { find: () => chain(f.db.catalog) },
    "@/lib/db": { connectToDb: async () => {} },
    "./definition.mjs": catalog,
  });
  const result = await reader.readCatalog(),
    reference = result.services[0].suggestedPrice;
  assert.equal(reference.amount, 175);
  const created = await f.offeringHelper.saveProviderOffering(id("5"), {
    priceItemId: id("4"),
    price: reference.amount,
    unit: reference.unit,
  });
  assert.equal(created.price, 175);
  assert.equal(created.approvalStatus, "pending");
  assert.equal(f.db.offerings.find((row) => row._id === id("3")).price, 400);
});

test("public homepage pricing reads require individually approved offerings and eligible businesses", async () => {
  const f = await fixture();
  let pipeline;
  const publicServices = await load("../lib/public-services.ts", {
    ...f.common,
    "@/lib/service-offering-price": await load(
      "../lib/service-offering-price.ts",
    ),
    "@/lib/service-offering-offer": { isOfferCurrentlyActive: () => false },
    "@/lib/discovery": {
      eligibleProvider: {
        verificationStatus: "verified",
        status: "active",
        onboardingCompletedAt: { $type: "date" },
      },
      providerCoverageFilter: () => ({}),
    },
    "@/models/ServiceProvider": { collection: { name: "serviceproviders" } },
    "@/models/PriceItem": { collection: { name: "priceitems" } },
    "@/models/ServiceOffering": {
      aggregate: async (stages) => {
        pipeline = stages;
        return [];
      },
    },
  });
  await publicServices.getPublicServices();
  assert.equal(pipeline[0].$match.approvalStatus, "approved");
  assert.equal(pipeline[0].$match.isActive, true);
  assert.equal(
    pipeline[1].$lookup.pipeline[0].$match.verificationStatus,
    "verified",
  );
  assert.equal(pipeline[1].$lookup.pipeline[0].$match.status, "active");
});

test("saved onboarding completion enters the real provider queue and can be reviewed independently", async () => {
  const f = await fixture();
  delete f.db.providers[0].onboardingCompletedAt;
  const progress = await load("../lib/provider-onboarding.ts", {
    "@/models/ServiceOffering": f.models.offerings,
    "@/models/technician": { countDocuments: () => chain(1) },
    "@/lib/marketplace-policy.mjs": marketplace,
  });
  const data = await load("../lib/admin-data.ts", {
    ...f.common,
    "./marketplace-policy.mjs": marketplace,
    "./provider-onboarding": progress,
    "@/models/ServiceProvider": {
      ...f.models.providers,
      collection: { name: "serviceproviders" },
      find: (filter) =>
        chain(f.db.providers.filter((row) => matches(row, filter))),
    },
    "@/models/PriceItem": { collection: { name: "priceitems" } },
  });
  assert.equal(
    (await data.readProviders({ status: "pending" })).items.length,
    0,
  );
  const onboarding = await f.route(
    "../app/api/service-provider/onboarding/complete/route.ts",
    {
      "@/lib/service-provider": {
        requireProvider: async () => ({ provider: f.db.providers[0] }),
      },
      "@/lib/provider-onboarding": progress,
      "@/lib/provider-review": f.providerReview,
    },
  );
  assert.equal((await onboarding.POST()).status, 200);
  assert.ok(f.db.providers[0].onboardingCompletedAt);
  assert.equal(
    (await data.readProviders({ status: "pending" })).items.length,
    1,
  );
  const moderation = await load("../lib/moderation.ts", {
    ...f.common,
    "./provider-onboarding": progress,
    "./moderation-notifications": f.delivery,
  });
  const route = await f.route(
    "../app/api/admin/providers/[id]/decision/route.ts",
    { "@/lib/moderation": moderation },
  );
  assert.equal(
    (
      await route.POST(request(decision("approve", 1)), {
        params: Promise.resolve({ id: id("1") }),
      })
    ).status,
    200,
  );
  assert.equal(f.db.providers[0].verificationStatus, "verified");
  assert.equal(f.db.offerings[0].approvalStatus, "pending");
  assert.equal(f.db.notifications.length, 1);
});
