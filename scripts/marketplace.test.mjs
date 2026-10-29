import test from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import bcrypt from "bcryptjs";
import * as serviceLocation from "../lib/service-location.mjs";
import * as moderation from "../lib/moderation-policy.mjs";
import * as policy from "../lib/marketplace-policy.mjs";
import * as catalog from "../lib/catalog/definition.mjs";

const require = createRequire(import.meta.url);
async function load(path, modules = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      // These suites isolate eligibility/coverage; finance integration has its own actual-handler suite.
      if (name === "@/lib/finance-commission") return { commissionForBooking: async () => ({ state: "missing_policy", establishedAt: new Date() }) };
      if (["@/models/booking", "@/models/job"].includes(name)) return {};
      if (name === "server-only") return {};
      if (name.startsWith("@/")) throw new Error(`Missing dependency ${name}`);
      return require(name);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}
const id = (value) => value.repeat(24);
function chain(value) {
  const query = {
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  for (const method of [
    "select",
    "lean",
    "session",
    "sort",
    "populate",
    "limit",
  ])
    query[method] = () => query;
  return query;
}
class ApiError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}
const responses = {
  privateJson: (data, status = 200) =>
    Response.json(data, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }),
  apiFailure: (error) =>
    Response.json(
      { error: error.message },
      { status: error.status || (error.name === "ZodError" ? 400 : 500) },
    ),
};
const pagination = await load("../lib/pagination.ts");
const validation = await load("../lib/marketplace-validation.ts", {
  "@/lib/pagination": pagination,
  "@/lib/marketplace-policy.mjs": policy,
  "@/lib/catalog/definition.mjs": catalog,
  "@/lib/auth": { ApiAuthError: ApiError },
});
const locationValidation = await load("../lib/location-validation.ts");
const confirmedAddress = await load("../lib/confirmed-address.ts", {
  "./auth": { ApiAuthError: ApiError },
  "./service-location.mjs": serviceLocation,
  "./location-validation": locationValidation,
});
const requestCoverage = await load("../lib/request-coverage.ts", {
  "./service-location.mjs": serviceLocation,
  "./marketplace-policy.mjs": policy,
});
const ownerId = id("a"),
  otherId = id("b");
const scoped = {
  "@/lib/request-coverage": requestCoverage,
  "@/lib/moderation-policy.mjs": moderation,
  "@/lib/location-validation": locationValidation,
  "@/lib/confirmed-address": confirmedAddress,
  "@/lib/service-location.mjs": serviceLocation,
  "@/lib/provider-review": {
    saveProviderProfile: async (provider, changes) => {
      Object.assign(provider, changes);
      await provider.save();
      return provider;
    },
  },
  "@/lib/service-provider": {
    requireProvider: async () => ({ provider: { _id: ownerId } }),
  },
  "@/lib/auth": { ApiAuthError: ApiError },
  "@/lib/api-response": responses,
  "@/lib/pagination": pagination,
  "@/lib/marketplace-validation": validation,
  "@/lib/marketplace-policy.mjs": policy,
  "@/lib/catalog/definition.mjs": catalog,
};
const area = (fields) =>
  policy.normalizeCoverage({
    city: "Patna",
    state: "Bihar",
    locality: "",
    pincode: "",
    isActive: true,
    ...fields,
  });

test("coverage normalizes case and whitespace, and combines restrictions within one active area", () => {
  const areas = [
    area({ locality: "Kankarbagh", pincode: "800020" }),
    area({ locality: "Boring Road", pincode: "800001" }),
  ];
  assert.equal(
    policy.servesLocation(areas, {
      city: "  PATNA ",
      locality: "Kankarbagh",
      pincode: "800020",
    }),
    true,
  );
  assert.equal(
    policy.servesLocation(areas, { locality: "Kankarbagh", pincode: "800001" }),
    false,
  );
  assert.equal(policy.servesLocation(areas, { pincode: "800002" }), false);
  assert.equal(
    policy.servesLocation([area({ isActive: false, pincode: "800020" })], {
      pincode: "800020",
    }),
    false,
  );
});
test("city-wide coverage accepts a full city address but never guesses a city from a PIN alone", () => {
  assert.equal(
    policy.servesLocation([area({})], {
      city: "Patna",
      locality: "Rajendra Nagar",
      pincode: "800016",
    }),
    true,
  );
  assert.equal(policy.servesLocation([area({})], { pincode: "800016" }), false);
  assert.equal(
    policy.servesLocation([area({ locality: "Kankarbagh" })], {
      city: "Patna",
      pincode: "800001",
    }),
    false,
  );
});
test("a profile city is not coverage; explicit legacy PIN restrictions win over city labels", () => {
  const provider = {
    address: { city: "Patna", state: "Bihar" },
    serviceAreas: ["Patna", "800020"],
  };
  assert.equal(
    policy.servesLocation(policy.legacyCoverage(provider), {
      city: "Patna",
      pincode: "800001",
    }),
    false,
  );
  assert.equal(
    policy.servesLocation(policy.legacyCoverage(provider), {
      pincode: "800020",
    }),
    true,
  );
  assert.deepEqual(policy.legacyCoverage({ address: { city: "Patna" } }), []);
});
test("area schema rejects malformed PINs, duplicate normalized areas and duplicate IDs", () => {
  for (const pincode of ["012345", "80001", "8000200", "abcdef"])
    assert.equal(
      validation.areasSchema.safeParse([area({ pincode })]).success,
      false,
    );
  assert.equal(
    validation.areasSchema.safeParse([
      area({ city: "Patna" }),
      area({ city: " PATNA " }),
    ]).success,
    false,
  );
  assert.equal(
    validation.areasSchema.safeParse([
      area({ _id: "12345678-1234-4234-8234-123456789abc" }),
      area({ _id: "12345678-1234-4234-8234-123456789abc", city: "Delhi" }),
    ]).success,
    false,
  );
  assert.deepEqual(validation.areasSchema.parse([]), []);
});
test("confidence ranking prefers substantial strong history to one perfect review", () => {
  assert.ok(policy.confidenceRating(4.7, 80) > policy.confidenceRating(5, 1));
  assert.equal(policy.confidenceRating(0, 0), 0);
});
test("catalog has stable unique identities, valid service-skill links and scoped reference pricing", () => {
  assert.ok(catalog.catalogServices.length >= 40);
  assert.equal(
    new Set(catalog.catalogServices.map((item) => item.key)).size,
    catalog.catalogServices.length,
  );
  for (const item of catalog.catalogServices)
    for (const key of item.skillKeys)
      assert.ok(
        catalog.catalogSkills.some(
          (skill) =>
            skill.key === key && skill.categoryKey === item.categoryKey,
        ),
      );
  assert.equal(Object.values(catalog.suggestedPrices).length, 4);
  for (const reference of Object.values(catalog.suggestedPrices)) {
    assert.equal(reference.city, "Patna");
    assert.ok(reference.sourceUrl.startsWith("https://"));
    assert.ok(reference.checkedAt);
    assert.ok(reference.qualification);
  }
});
test("skills reject new arbitrary values while retaining existing inactive selections", () => {
  assert.throws(() => validation.validateSkills(["invented"]));
  assert.deepEqual(
    validation.validateSkills(["retired"], ["retired"]).skillKeys,
    ["retired"],
  );
  assert.equal(
    policy.canPerformService(["electrical:fans"], ["plumbing:taps"]),
    false,
  );
  assert.equal(
    policy.canPerformService(["plumbing:taps"], ["plumbing:taps"]),
    true,
  );
});
test("offering validation bounds money and forbids misleading quote prices and discounts", () => {
  const value = { priceItemId: id("1"), price: 100 };
  for (const price of [-1, 1000001, Infinity])
    assert.equal(
      validation.offeringSchema.safeParse({ ...value, price }).success,
      false,
    );
  assert.throws(() =>
    validation.validateOffering(
      validation.offeringSchema.parse({
        ...value,
        pricingModel: "quote_required",
      }),
    ),
  );
  assert.throws(() =>
    validation.validateOffering(
      validation.offeringSchema.parse({
        ...value,
        offerEnabled: true,
        offerName: "Sale",
        discountType: "percentage",
        discountValue: 101,
      }),
    ),
  );
});
test("discovery validation normalizes input, escapes metacharacters and bounds requests", () => {
  const result = validation.parseDiscovery(
    new Request(
      "http://test?q=%20%20AC%20%20repair%20&city=%20Patna%20&pincode=800020",
    ),
  );
  assert.equal(result.q, "AC repair");
  assert.equal(result.city, "Patna");
  assert.equal(policy.escapeRegex("a.*(b)"), "a\\.\\*\\(b\\)");
  for (const params of [
    "page=0",
    "page=201",
    "limit=200",
    "pincode=123",
    "minRating=6",
    "serviceId=bad",
  ])
    assert.throws(() =>
      validation.parseDiscovery(new Request(`http://test?${params}`)),
    );
});
test("actual discovery enforces provider eligibility, genuine ratings, bounded pagination and private projection", async () => {
  let pipeline, options;
  const discovery = await load("../lib/discovery.ts", {
    ...scoped,
    "@/lib/db": { connectToDb: async () => {} },
    "@/models/PriceItem": { collection: { name: "priceitems" } },
    "@/models/ServiceProvider": { collection: { name: "serviceproviders" } },
    "@/models/ServiceOffering": {
      aggregate: (stages) => {
        pipeline = stages;
        return {
          option: (value) => {
            options = value;
            return [];
          },
        };
      },
    },
  });
  const result = await discovery.discover(
    new Request("http://test?q=plumbers%20in%20Patna&provider=Home&limit=6"),
    { topRated: true },
  );
  assert.equal(result.providers.length, 0);
  assert.equal(pipeline[0].$match.approvalStatus, "approved");
  const provider = pipeline.find(
    (stage) => stage.$lookup?.from === "serviceproviders",
  ).$lookup.pipeline[0].$match;
  assert.equal(provider.status, "active");
  assert.equal(provider.verificationStatus, "verified");
  assert.equal(provider.onboardingCompletedAt.$type, "date");
  assert.equal(provider["ratingSummary.count"].$gte, 5);
  assert.equal(provider["ratingSummary.average"].$gte, 4);
  assert.equal(provider.$or[0].coverageAreas.$elemMatch.cityKey, "patna");
  assert.equal(pipeline.find((stage) => stage.$limit).$limit, 7);
  assert.equal(options.maxTimeMS, 5000);
  assert.equal(JSON.stringify(pipeline.at(-1)).includes("password"), false);
});
test("actual area update ignores a supplied provider ID and stores only the owner's validated coverage", async () => {
  let saved;
  const provider = {
    _id: ownerId,
    save: async () => {
      saved = true;
    },
  };
  const handler = await load(
    "../app/api/service-provider/services-areas/route.ts",
    {
      ...scoped,
      "@/lib/service-provider": { requireProvider: async () => ({ provider }) },
    },
  );
  const response = await handler.PUT(
    new Request("http://test", {
      method: "PUT",
      body: JSON.stringify({
        providerId: otherId,
        areas: [area({ pincode: "800020" })],
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(provider._id, ownerId);
  assert.equal(provider.coverageVersion, 1);
  assert.equal(saved, true);
  assert.equal(provider.coverageAreas[0].cityKey, "patna");
  assert.equal(provider.booking, undefined);
});
test("actual offering save rejects duplicates, foreign offering IDs and catalog identity changes", async () => {
  let existing = { isActive: true, priceItemId: id("1") };
  const helper = await load("../lib/provider-offerings.ts", {
    ...scoped,
    "@/models/PriceItem": {
      findOne: () => chain({ _id: id("1"), name: "Repair" }),
    },
    "@/models/ServiceProvider": {},
    "@/models/ServiceOffering": {
      findOne: (filter) => {
        assert.equal(filter.serviceProviderId, ownerId);
        return chain(existing);
      },
    },
  });
  const value = { priceItemId: id("1"), price: 100 };
  await assert.rejects(
    helper.saveProviderOffering(ownerId, value),
    (error) => error.status === 409,
  );
  existing = null;
  await assert.rejects(
    helper.saveProviderOffering(ownerId, value, { id: otherId }),
    (error) => error.status === 404,
  );
  existing = { priceItemId: otherId };
  await assert.rejects(
    helper.saveProviderOffering(ownerId, value, { id: otherId }),
    (error) => error.status === 400,
  );
});
test("actual price changes update only an offering and catalog membership; saved booking prices are untouched", async () => {
  const historical = {
      pricing: { finalPrice: 95, quantity: 2 },
      invoice: { total: 112.1 },
    },
    before = structuredClone(historical);
  let changes, membership;
  const offering = {
    priceItemId: id("1"),
    set: (value) => {
      changes = value;
    },
    save: async () => ({ _id: id("2") }),
  };
  const helper = await load("../lib/provider-offerings.ts", {
    ...scoped,
    "@/models/PriceItem": {
      findOne: () => chain({ _id: id("1"), name: "Repair" }),
    },
    "@/models/ServiceOffering": {
      findOne: () => chain(offering),
      findOneAndUpdate: async (filter, update) => {
        assert.equal(filter.serviceProviderId, ownerId);
        changes = update.$set;
        return { _id: id("2") };
      },
    },
    "@/models/ServiceProvider": {
      updateOne: async (filter, update) => {
        membership = update;
      },
    },
  });
  await helper.saveProviderOffering(
    ownerId,
    {
      priceItemId: id("1"),
      price: 250,
      pricingModel: "per_unit",
      unit: "item",
    },
    { id: id("2") },
  );
  assert.equal(changes.price, 250);
  assert.equal(changes.unit, "item");
  assert.deepEqual(historical, before);
  assert.ok(membership.$addToSet.services);
});
test("Pro creation persists a bcrypt hash, expires the credential, and retries never return the original password", async () => {
  let savedUser,
    savedPro,
    prior = null;
  const session = {
    withTransaction: (action) => action(),
    endSession: async () => {},
  };
  const helper = await load("../lib/provider-technicians.ts", {
    ...scoped,
    mongoose: { startSession: async () => session },
    "@/models/job": {},
    "@/models/user": {
      exists: () => chain(false),
      create: async (values) => {
        savedUser = values[0];
        return [{ ...savedUser, _id: id("1") }];
      },
    },
    "@/models/technician": {
      findOne: () => chain(prior),
      create: async (values) => {
        savedPro = values[0];
        return [{ ...savedPro, _id: id("2") }];
      },
    },
  });
  const input = {
    name: "Test Pro",
    phone: "9876543210",
    skillKeys: [catalog.catalogSkills[0].key],
    creationKey: "12345678-1234-4234-8234-123456789abc",
  };
  const result = await helper.createProviderPro(ownerId, input);
  assert.ok(await bcrypt.compare(result.temporaryPassword, savedUser.password));
  assert.notEqual(result.temporaryPassword, savedUser.password);
  assert.equal(savedUser.role, "technician");
  assert.equal(savedUser.mustChangePassword, true);
  assert.equal(savedPro.serviceProviderId, ownerId);
  assert.ok(
    savedUser.temporaryPasswordExpiresAt.getTime() > Date.now() + 23 * 3600000,
  );
  assert.ok(!JSON.stringify(savedPro).includes(result.temporaryPassword));
  prior = { _id: id("2") };
  const repeated = await helper.createProviderPro(ownerId, input);
  assert.equal(repeated.temporaryPassword, undefined);
  assert.equal(repeated.credentialUnavailable, true);
});
test("initial credential reissue cannot access another business or reset a personal password", async () => {
  let pro = null,
    userReads = 0;
  const handler = await load(
    "../app/api/service-provider/technicians/[id]/credential/route.ts",
    {
      ...scoped,
      "@/lib/provider-technicians": {
        createTemporaryCredential: () => ({
          password: "random-test-only",
          expiresAt: new Date(),
        }),
      },
      "@/models/technician": {
        findOne: (filter) => {
          assert.equal(filter.serviceProviderId, ownerId);
          return chain(pro);
        },
      },
      "@/models/user": {
        findOneAndUpdate: (filter) => {
          userReads++;
          assert.equal(filter.mustChangePassword, true);
          return chain(null);
        },
      },
    },
  );
  const issue = () =>
    handler.POST(new Request("http://test"), {
      params: Promise.resolve({ id: otherId }),
    });
  assert.equal((await issue()).status, 404);
  assert.equal(userReads, 0);
  pro = { userId: id("1") };
  assert.equal((await issue()).status, 409);
});
test("mandatory password change, credential version revocation and expiry are enforced on actual API auth", async () => {
  let user = {
    _id: id("1"),
    role: "technician",
    isActive: true,
    mustChangePassword: true,
    credentialVersion: 1,
    temporaryPasswordExpiresAt: new Date(Date.now() + 60000),
  };
  const auth = await load("../lib/auth.ts", {
    "@/lib/auth-options": { authOptions: {} },
    "./db": { connectToDb: async () => {} },
    "next-auth": {
      getServerSession: async () => ({
        user: { id: id("1"), credentialVersion: 1 },
      }),
    },
    "@/models/user": { findOne: () => chain(user) },
  });
  await assert.rejects(
    auth.requireCurrentUser(),
    (error) => error.status === 403,
  );
  assert.equal(
    (await auth.requireCurrentUser({ allowPasswordChange: true })).role,
    "technician",
  );
  user = { ...user, credentialVersion: 2 };
  await assert.rejects(
    auth.requireCurrentUser({ allowPasswordChange: true }),
    (error) => error.status === 401,
  );
  user = {
    ...user,
    credentialVersion: 1,
    temporaryPasswordExpiresAt: new Date(0),
  };
  await assert.rejects(
    auth.requireCurrentUser({ allowPasswordChange: true }),
    (error) => error.status === 401,
  );
});
test("actual first-password change verifies current password and atomically hashes/revokes the credential", async () => {
  const currentPassword = "Sv!test-only-initial",
    password = await bcrypt.hash(currentPassword, 4);
  let changed;
  const handler = await load("../app/api/auth/change-password/route.ts", {
    ...scoped,
    "@/lib/auth": { requireCurrentUser: async () => ({ _id: id("1") }) },
    "@/models/user": {
      findOne: async () => ({ _id: id("1"), password, credentialVersion: 1 }),
      findOneAndUpdate: async (filter, update) => {
        assert.equal(filter.password, password);
        assert.equal(filter.credentialVersion, 1);
        changed = update;
        return {};
      },
    },
  });
  const request = (current) =>
    new Request("http://test", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: current,
        newPassword: "My strong personal password",
      }),
    });
  assert.equal((await handler.POST(request("wrong"))).status, 400);
  assert.equal(changed, undefined);
  const response = await handler.POST(request(currentPassword));
  assert.equal(response.status, 200);
  assert.ok(
    await bcrypt.compare("My strong personal password", changed.$set.password),
  );
  assert.equal(changed.$set.mustChangePassword, false);
  assert.equal(changed.$inc.credentialVersion, 1);
  assert.ok(changed.$unset.temporaryPasswordExpiresAt);
  assert.equal((await response.json()).temporaryPassword, undefined);
});
test("public signup cannot inject admin, dispatcher or technician roles", async () => {
  const handler = await load("../app/api/auth/signup/route.ts", {
    "./customer/route": {
      POST: async () => Response.json({ success: true }, { status: 201 }),
    },
    "@/lib/api-response": responses,
  });
  for (const role of [
    "admin",
    "dispatcher",
    "technician",
    "service_provider",
  ]) {
    const response = await handler.POST(
      new Request("http://test", {
        method: "POST",
        body: JSON.stringify({ role }),
      }),
    );
    assert.equal(response.status, 403);
  }
});
test("image parser checks actual bytes and rejects over-limit streams before parsing", async () => {
  const image = await load("../lib/provider-images.ts", {
    "@/lib/auth": { ApiAuthError: ApiError },
  });
  assert.equal(image.imageFormat(new Uint8Array([255, 216, 255, 0])), "jpg");
  assert.equal(image.imageFormat(new TextEncoder().encode("<svg/>")), null);
  const bad = new FormData();
  bad.set("file", new File(["not a jpeg"], "logo.jpg", { type: "image/jpeg" }));
  await assert.rejects(
    image.readImageFile(
      new Request("http://test", { method: "POST", body: bad }),
    ),
    (error) => error.status === 400,
  );
  const large = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(image.providerImageLimit + 65537));
      controller.close();
    },
  });
  await assert.rejects(
    image.readImageFile(
      new Request("http://test", {
        method: "POST",
        body: large,
        duplex: "half",
      }),
    ),
    (error) => error.status === 413,
  );
});
test("assignment rejects a foreign Pro before any job is created", async () => {
  let jobCreates = 0;
  const session = {
    withTransaction: (action) => action(),
    endSession: async () => {},
  };
  const handler = await load(
    "../app/api/service-provider/bookings/[id]/assign-technician/route.ts",
    {
      ...scoped,
      mongoose: { startSession: async () => session },
      "@/lib/otp": { generateSixDigitOtp: () => "123456" },
      "@/models/booking": {
        findOne: (filter) => {
          assert.equal(filter.serviceProviderId, ownerId);
          return chain({ _id: id("1"), status: "confirmed" });
        },
      },
      "@/models/job": {
        exists: () => chain(false),
        create: async () => {
          jobCreates++;
        },
      },
      "@/models/technician": {
        findOne: (filter) => {
          assert.equal(filter.serviceProviderId, ownerId);
          return chain(null);
        },
      },
      "@/models/ServiceOffering": {},
      "@/models/PriceItem": {},
    },
  );
  const response = await handler.POST(
    new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ technicianId: otherId }),
    }),
    { params: Promise.resolve({ id: id("1") }) },
  );
  assert.equal(response.status, 409);
  assert.equal(jobCreates, 0);
});
test("actual booking requests assess flexible coverage, enforce active catalog and preserve server prices", async () => {
  const offering = {
    _id: id("1"),
    name: "Tap repair",
    approvalStatus: "approved",
    isActive: true,
    pricingModel: "per_unit",
    unit: "item",
    price: 100,
    taxPercent: 18,
    offerEnabled: true,
    discountType: "flat",
    discountValue: 10,
    serviceProviderId: {
      _id: ownerId,
      status: "active",
      verificationStatus: "verified",
      onboardingCompletedAt: new Date(),
      coverageVersion: 1,
      coverageAreas: [area({ pincode: "800020" })],
    },
    priceItemId: {
      _id: id("2"),
      itemType: "service",
      isActive: true,
      skillKeys: ["plumbing:taps"],
    },
  };
  const snapshots = [];
  const price = await load("../lib/service-offering-price.ts");
  const handler = await load("../app/api/customer/service-requests/route.ts", {
    ...scoped,
    "next-auth": { getServerSession: async () => ({ user: { id: id("3") } }) },
    "@/lib/auth-options": { authOptions: {} },
    "@/lib/db": { connectToDb: async () => {} },
    "@/lib/customer": {
      requireCustomerProfile: async () => ({ customer: { _id: id("3") } }),
    },
    "@/models/ServiceOffering": { findById: () => chain(offering) },
    "@/models/PriceItem": {},
    "@/models/ServiceRequest": {
      findOne: () => chain(null),
      create: async (value) => {
        snapshots.push(structuredClone(value));
        return { ...value, _id: id("4") };
      },
    },
    "@/lib/service-offering-price": price,
    "@/lib/service-offering-offer": { isOfferCurrentlyActive: () => true },
  });
  const submit = (pincode, destinationCapture) =>
    handler.POST(
      new Request("http://test", {
        method: "POST",
        body: JSON.stringify({
          serviceOfferingId: id("1"),
          requestKey: randomUUID(),
          destinationConfirmed: true,
          destinationCapture,
          quantity: 2,
          price: 1,
          pricing: { finalPrice: 1 },
          address: {
            addressLine: "Test address",
            city: "Patna",
            state: "Bihar",
            pincode,
          },
        }),
      }),
    );
  assert.equal((await submit("800001")).status, 201);
  assert.equal(snapshots[0].coverage.status, "outside");
  assert.equal(snapshots[0].coverage.requiresProviderConfirmation, true);
  snapshots.length = 0;
  offering.approvalStatus = "pending";
  assert.equal((await submit("800020")).status, 400);
  offering.approvalStatus = "approved";
  offering.serviceProviderId.verificationStatus = "pending";
  assert.equal((await submit("800020")).status, 400);
  assert.equal(snapshots.length, 0);
  offering.serviceProviderId.verificationStatus = "verified";
  assert.equal(
    (
      await submit("800020", {
        latitude: 25.61,
        longitude: 85.14,
        accuracy: 8,
        observedAt: Date.now(),
        confirmed: true,
      })
    ).status,
    201,
  );
  assert.equal(snapshots[0].address.locationConfirmation.confirmedBy, id("3"));
  assert.deepEqual(snapshots[0].address.location.coordinates, [85.14, 25.61]);
  assert.ok(serviceLocation.confirmedDestination(snapshots[0].address));
  assert.equal(snapshots[0].pricing.finalPrice, 180);
  assert.equal(snapshots[0].pricing.quantity, 2);
  assert.deepEqual(snapshots[0].requiredSkillKeys, ["plumbing:taps"]);
  offering.price = 200;
  assert.equal((await submit("800020")).status, 201);
  assert.equal(snapshots[0].pricing.finalPrice, 180);
  assert.equal(snapshots[1].pricing.finalPrice, 380);
  offering.pricingModel = "quote_required";
  assert.equal((await submit("800020")).status, 409);
  offering.pricingModel = "fixed";
  offering.priceItemId.isActive = false;
  assert.equal((await submit("800020")).status, 400);
});
test("business image persists to the owner's draft and failures remain queued for safe cleanup", async () => {
  let saved = false,
    fail = false;
  const assets = [];
  const provider = {
    _id: ownerId,
    businessImage: null,
    save: async () => {
      if (fail) throw new Error("Database unavailable");
      saved = true;
    },
  };
  const handler = await load(
    "../app/api/service-provider/business-image/route.ts",
    {
      ...scoped,
      "@/lib/service-provider": { requireProvider: async () => ({ provider }) },
      "@/lib/provider-images": {
        readImageFile: async () => new Blob(["test-only"]),
        cloudinaryAction: async (_action, fields) => ({
          public_id: fields.public_id,
          secure_url: "https://res.cloudinary.com/test/image/upload/logo.webp",
          width: 200,
          height: 100,
          bytes: 1200,
          format: "webp",
        }),
      },
      "@/models/ProviderImageAsset": {
        create: async (value) => assets.push({ ...value }),
        updateOne: async (filter, update) => {
          assets.find((asset) => asset.publicId === filter.publicId).status =
            update.$set.status;
        },
      },
    },
  );
  assert.equal((await handler.POST(new Request("http://test"))).status, 200);
  assert.equal(saved, true);
  assert.equal(assets[0].status, "attached");
  assert.ok(provider.businessImage.publicId.includes(ownerId));
  fail = true;
  assert.equal((await handler.POST(new Request("http://test"))).status, 500);
  assert.equal(assets[1].status, "cleanup");
});
test("rating summaries use published reviews and prevent older concurrent refreshes from overwriting newer results", async () => {
  let filter, update;
  const helper = await load("../lib/provider-ratings.ts", {
    "@/lib/marketplace-policy.mjs": policy,
    "@/models/Review": {
      aggregate: async (stages) => {
        assert.equal(stages[0].$match.status, "published");
        return [{ average: 4.5, count: 10 }];
      },
    },
    "@/models/ServiceProvider": {
      updateOne: async (f, u) => {
        filter = f;
        update = u;
      },
    },
  });
  await helper.refreshProviderRating(ownerId);
  assert.equal(update.$set.ratingSummary.count, 10);
  assert.equal(update.$set.ratingSummary.average, 4.5);
  assert.equal(
    filter.$or[1]["ratingSummary.updatedAt"].$lte,
    update.$set.ratingSummary.updatedAt,
  );
});
test("actual Pro deactivation checks active jobs and ownership inside the same transaction", async () => {
  let active = false,
    working = true,
    owned = true,
    saves = 0;
  const session = {
    withTransaction: async (action) => {
      active = true;
      try {
        return await action();
      } finally {
        active = false;
      }
    },
    endSession: async () => {},
  };
  const pro = {
    _id: id("1"),
    isActive: true,
    status: "available",
    skillKeys: [],
    save: async (options) => {
      assert.equal(active, true);
      assert.equal(options.session, session);
      saves++;
    },
  };
  const helper = await load("../lib/provider-technicians.ts", {
    ...scoped,
    "@/models/technician": {},
    "@/models/user": {},
    "@/models/job": {
      exists: () => {
        assert.equal(active, true);
        return chain(working);
      },
    },
  });
  const handler = await load(
    "../app/api/service-provider/technicians/[id]/route.ts",
    {
      ...scoped,
      mongoose: { startSession: async () => session },
      "@/lib/provider-technicians": helper,
      "@/models/user": {},
      "@/models/technician": {
        findOne: (filter) => {
          assert.equal(active, true);
          assert.equal(filter.serviceProviderId, ownerId);
          return chain(owned ? pro : null);
        },
      },
    },
  );
  const deactivate = () =>
    handler.PATCH(
      new Request("http://test", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false, serviceProviderId: otherId }),
      }),
      { params: Promise.resolve({ id: id("1") }) },
    );
  assert.equal((await deactivate()).status, 409);
  assert.equal(saves, 0);
  assert.equal(pro.isActive, true);
  working = false;
  assert.equal((await deactivate()).status, 200);
  assert.equal(saves, 1);
  assert.equal(pro.isActive, false);
  assert.equal(pro.status, "offline");
  owned = false;
  assert.equal((await deactivate()).status, 404);
  assert.equal(saves, 1);
});
