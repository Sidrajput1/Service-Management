import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import * as marketplace from "../lib/marketplace-policy.mjs";
import * as moderation from "../lib/moderation-policy.mjs";
import * as location from "../lib/service-location.mjs";
import * as catalog from "../lib/catalog/definition.mjs";

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
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      // These suites isolate eligibility/coverage; finance integration has its own actual-handler suite.
      if (name === "@/lib/finance-commission") return { commissionForBooking: async () => ({ state: "missing_policy", establishedAt: new Date() }) };
      if (["@/models/booking", "@/models/job"].includes(name)) return {};
      if (name.startsWith("@/") || name.startsWith("./"))
        throw new Error(`Missing test dependency ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const chain = (getValue) => {
  const query = {
    then: (resolve, reject) =>
      Promise.resolve()
        .then(() => (typeof getValue === "function" ? getValue() : getValue))
        .then(resolve, reject),
  };
  for (const method of [
    "select",
    "session",
    "populate",
    "lean",
    "sort",
    "limit",
  ])
    query[method] = () => query;
  return query;
};
class ApiError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}
const response = {
  privateJson: (value, status = 200) =>
    Response.json(value, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }),
  apiFailure: (error) =>
    Response.json(
      { error: error.message },
      {
        status:
          error.status ||
          (["ZodError", "SyntaxError"].includes(error.name) ? 400 : 500),
      },
    ),
};
const coverage = await load("../lib/request-coverage.ts", {
  "./service-location.mjs": location,
  "./marketplace-policy.mjs": marketplace,
});
const pagination = await load("../lib/pagination.ts");
const locationValidation = await load("../lib/location-validation.ts");
const confirmedAddress = await load("../lib/confirmed-address.ts", {
  "./auth": { ApiAuthError: ApiError },
  "./service-location.mjs": location,
  "./location-validation": locationValidation,
});
const pricing = await load("../lib/service-offering-price.ts");
const validAddress = {
  addressLine: "House 18, example street",
  city: "Noida",
  state: "Uttar Pradesh",
  locality: "Sector 62",
  pincode: "201309",
};
const normalArea = {
  city: "Noida",
  state: "UP",
  locality: "Sector 62",
  pincode: "201309",
  isActive: true,
};
const post = (body) =>
  new Request("http://test", { method: "POST", body: JSON.stringify(body) });
async function fixture() {
  const db = {
    requests: [],
    bookings: [],
    actor: id("a"),
    providerId: id("b"),
    customerId: id("c"),
    createAttempts: 0,
    notifications: 0,
    fenceWrites: 0,
    duplicateRace: false,
  };
  db.provider = {
    _id: db.providerId,
    ownerId: db.actor,
    companyName: "Fixture provider",
    status: "active",
    verificationStatus: "verified",
    onboardingCompletedAt: new Date(),
    coverageVersion: 1,
    coverageAreas: [structuredClone(normalArea)],
  };
  db.item = {
    _id: id("d"),
    itemType: "service",
    isActive: true,
    skillKeys: ["plumbing:taps"],
  };
  db.offering = {
    _id: id("e"),
    serviceProviderId: db.providerId,
    priceItemId: db.item._id,
    name: "Tap repair",
    price: 125,
    pricingModel: "fixed",
    unit: "job",
    isActive: true,
    approvalStatus: "approved",
  };
  const serviceRequests = {
    findOne: (filter) =>
      chain(
        () =>
          db.requests.find((row) =>
            Object.entries(filter).every(
              ([key, value]) => String(row[key]) === String(value),
            ),
          ) || null,
      ),
    find: () => chain(() => db.requests.filter((row) => row.status === "open")),
    create: async (value) => {
      db.createAttempts++;
      const row = {
        ...structuredClone(value),
        _id: id("f"),
        updatedAt: new Date(),
        save: async () => {},
      };
      if (!db.requests.some((old) => old.requestKey === value.requestKey))
        db.requests.push(row);
      else throw Object.assign(new Error("duplicate"), { code: 11000 });
      if (db.duplicateRace)
        throw Object.assign(new Error("duplicate race"), { code: 11000 });
      return row;
    },
    updateOne: async (filter, update) => {
      const row = db.requests.find((row) =>
        Object.entries(filter).every(
          ([key, value]) => String(row[key]) === String(value),
        ),
      );
      if (!row) return { matchedCount: 0 };
      Object.assign(row, update.$set);
      return { matchedCount: 1 };
    },
  };
  const models = {
    "@/models/ServiceRequest": serviceRequests,
    "@/models/ServiceProvider": {
      findById: () => chain(db.provider),
      updateOne: async () => {
        db.fenceWrites++;
      },
    },
    "@/models/ServiceOffering": {
      findById: () =>
        chain({
          ...db.offering,
          serviceProviderId: db.provider,
          priceItemId: db.item,
        }),
      findOne: (filter) =>
        chain(() =>
          filter.serviceProviderId === db.provider._id &&
          filter._id === db.offering._id
            ? db.offering
            : null,
        ),
      updateOne: async () => {
        db.fenceWrites++;
      },
    },
    "@/models/PriceItem": {
      findById: () => chain(db.item),
      updateOne: async () => {
        db.fenceWrites++;
      },
    },
  };
  const common = {
    ...models,
    "next-auth": { getServerSession: async () => ({ user: { id: id("1") } }) },
    "@/lib/auth-options": { authOptions: {} },
    "@/lib/db": { connectToDb: async () => {} },
    "@/lib/customer": {
      requireCustomerProfile: async () => ({
        customer: { _id: db.customerId },
      }),
    },
    "@/lib/service-provider": {
      requireProvider: async () => ({
        user: { _id: db.actor },
        provider: db.provider,
      }),
    },
    "@/lib/moderation-policy.mjs": moderation,
    "@/lib/marketplace-policy.mjs": marketplace,
    "@/lib/request-coverage": coverage,
    "@/lib/pagination": pagination,
    "@/lib/api-response": response,
    "@/lib/auth": { ApiAuthError: ApiError },
    "@/lib/catalog/definition.mjs": catalog,
    "@/lib/confirmed-address": confirmedAddress,
    "@/lib/location-validation": locationValidation,
    "@/lib/service-offering-price": pricing,
    "@/lib/service-offering-offer": { isOfferCurrentlyActive: () => false },
  };
  const eligibility = await load("../lib/booking-eligibility.ts", {
    ...common,
    "./moderation-policy.mjs": moderation,
    "./catalog/definition.mjs": catalog,
    "./auth": { ApiAuthError: ApiError },
    "./request-coverage": coverage,
  });
  const transaction = {
    withTransaction: async (operation) => {
      const before = db.requests.map((row) => ({ ...row })),
        bookingCount = db.bookings.length;
      try {
        return await operation();
      } catch (error) {
        db.requests.splice(0, db.requests.length, ...before);
        db.bookings.length = bookingCount;
        throw error;
      }
    },
    endSession: async () => {},
  };
  const create = await load(
    "../app/api/customer/service-requests/route.ts",
    common,
  );
  const accept = await load(
    "../app/api/service-provider/booking-requests/[id]/accept/route.ts",
    {
      ...common,
      mongoose: { startSession: async () => transaction },
      "@/lib/booking-eligibility": eligibility,
      "@/models/booking": {
        create: async (values) => {
          const row = { ...values[0], _id: id("2") };
          db.bookings.push(row);
          return [row];
        },
      },
      "@/models": {
        Customer: { findById: () => chain({ userId: { _id: id("1") } }) },
      },
      "@/lib/notify-events": {
        notifyBookingAccepted: async () => {
          db.notifications++;
        },
      },
    },
  );
  const decline = await load(
    "../app/api/service-provider/booking-requests/[id]/decline/route.ts",
    common,
  );
  const submit = (changes = {}) =>
    create.POST(
      post({
        requestKey: randomUUID(),
        destinationConfirmed: true,
        serviceOfferingId: db.offering._id,
        address: structuredClone(validAddress),
        ...changes,
      }),
    );
  const acceptance = (body = {}) =>
    accept.POST(post(body), { params: Promise.resolve({ id: id("f") }) });
  return { db, create, submit, acceptance, decline, common };
}

test("coverage canonicalizes Indian state/city aliases, NFKC PINs and one area's restrictions", () => {
  assert.equal(marketplace.normalizeStateKey("  U.P. "), "uttar pradesh");
  assert.equal(marketplace.normalizePincode("２０１ ３０９"), "201309");
  assert.deepEqual(
    marketplace.assessCoverage([normalArea], {
      ...validAddress,
      state: " up ",
      city: " NOIDA ",
      pincode: "２０１３０９",
    }),
    { status: "matched", requiresProviderConfirmation: false },
  );
  assert.equal(
    marketplace.coverageKey(normalArea),
    marketplace.coverageKey({ ...normalArea, state: "Uttar Pradesh" }),
  );
  assert.equal(
    marketplace.servesLocation(
      [{ ...normalArea, city: "Bangalore", state: "KA" }],
      {
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "201309",
        locality: "Sector 62",
      },
    ),
    true,
  );
});
test("incomplete structured locations never become a verified match and inactive coverage never serves", () => {
  assert.equal(
    marketplace.assessCoverage([normalArea], { ...validAddress, state: "" })
      .status,
    "uncertain",
  );
  assert.equal(
    marketplace.assessCoverage([normalArea], { ...validAddress, locality: "" })
      .status,
    "uncertain",
  );
  assert.equal(
    marketplace.assessCoverage([normalArea], { city: "Noida", pincode: "bad" })
      .status,
    "uncertain",
  );
  assert.equal(
    marketplace.assessCoverage(
      [{ ...normalArea, isActive: false }],
      validAddress,
    ).status,
    "outside",
  );
  assert.equal(
    marketplace.assessCoverage([normalArea], {
      ...validAddress,
      state: "Bihar",
    }).status,
    "outside",
  );
});
test("coverage mismatch is separate from all hard eligibility gates", () => {
  const provider = {
      status: "active",
      verificationStatus: "verified",
      onboardingCompletedAt: new Date(),
    },
    offering = { isActive: true, approvalStatus: "approved" },
    item = { isActive: true, itemType: "service" };
  assert.equal(
    moderation.offeringEligibility(
      offering,
      provider,
      item,
      { city: "Elsewhere" },
      [],
    ),
    null,
  );
  for (const changed of [
    { ...provider, verificationStatus: "pending" },
    { ...provider, status: "suspended" },
    { ...provider, status: "inactive" },
  ])
    assert.match(
      moderation.offeringEligibility(offering, changed, item, validAddress, []),
      /business/,
    );
  for (const changed of [
    { ...offering, approvalStatus: "pending" },
    { ...offering, approvalStatus: "rejected" },
    { ...offering, isActive: false },
  ])
    assert.match(
      moderation.offeringEligibility(changed, provider, item, validAddress, []),
      /approval|published/,
    );
  assert.match(
    moderation.offeringEligibility(
      offering,
      provider,
      { ...item, isActive: false },
      validAddress,
      [],
    ),
    /inactive/,
  );
});
test("manual destination confirmation is mandatory, server-stamped, and independent from optional GPS", async () => {
  const f = await fixture();
  assert.equal((await f.submit({ destinationConfirmed: false })).status, 400);
  assert.equal(f.db.requests.length, 0);
  assert.equal((await f.submit()).status, 201);
  const row = f.db.requests[0];
  assert.equal(row.destinationConfirmation.confirmedBy, id("1"));
  assert.ok(row.destinationConfirmation.confirmedAt instanceof Date);
  assert.equal(
    row.destinationConfirmation.addressIdentity,
    coverage.destinationIdentity(row.address),
  );
  assert.equal(row.coverage.status, "matched");
  assert.equal(location.confirmedDestination(row.address), null);
});
test("outside-area requests are accepted for review without trusting coverage, actor, destination or price claims", async () => {
  const f = await fixture();
  const result = await f.submit({
    address: {
      ...validAddress,
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
    },
    coverage: { status: "matched" },
    providerId: id("9"),
    pricing: { finalPrice: 1 },
    destinationConfirmation: { confirmedBy: id("9") },
  });
  assert.equal(result.status, 201);
  const row = f.db.requests[0];
  assert.equal(row.coverage.status, "outside");
  assert.equal(row.coverage.requiresProviderConfirmation, true);
  assert.equal(row.serviceProviderId, f.db.providerId);
  assert.equal(row.pricing.finalPrice, 125);
  assert.equal(row.destinationConfirmation.confirmedBy, id("1"));
  assert.equal(
    (await result.json()).serviceRequest.coverage.requiresProviderConfirmation,
    true,
  );
});
test("customer request retry reuses one snapshot and rejects a changed intent under the same UUID", async () => {
  const f = await fixture(),
    key = randomUUID();
  assert.equal((await f.submit({ requestKey: key })).status, 201);
  f.db.offering.price = 900;
  assert.equal((await f.submit({ requestKey: key })).status, 200);
  assert.equal(f.db.requests.length, 1);
  assert.equal(f.db.requests[0].pricing.finalPrice, 125);
  assert.equal(
    (await f.submit({ requestKey: key, description: "Different work" })).status,
    409,
  );
  assert.equal(f.db.requests.length, 1);
});
test("a unique-index race resolves to an idempotent request response", async () => {
  const f = await fixture();
  f.db.duplicateRace = true;
  assert.equal((await f.submit()).status, 200);
  assert.equal(f.db.requests.length, 1);
});
test("out-of-area acceptance requires explicit confirmation bound to the stored address and records the authenticated actor", async () => {
  const f = await fixture();
  await f.submit({ address: { ...validAddress, pincode: "201301" } });
  assert.equal((await f.acceptance()).status, 409);
  assert.equal((await f.acceptance({ confirmOutOfArea: true })).status, 409);
  assert.equal(f.db.bookings.length, 0);
  const row = f.db.requests[0];
  assert.equal(
    (
      await f.acceptance({
        confirmOutOfArea: true,
        coverageReviewToken: coverage.coverageReviewToken(row),
      })
    ).status,
    200,
  );
  const booked = f.db.bookings[0];
  assert.equal(booked.coverage.providerConfirmedBy, f.db.actor);
  assert.ok(booked.coverage.providerConfirmedAt instanceof Date);
  assert.equal(
    booked.coverage.providerConfirmedAddressIdentity,
    coverage.destinationIdentity(row.address),
  );
  assert.equal(booked.coverage.status, "outside");
  assert.deepEqual(booked.address, row.address);
  assert.deepEqual(booked.pricing, row.pricing);
  assert.equal(f.db.notifications, 1);
  assert.equal(
    (
      await f.acceptance({
        confirmOutOfArea: true,
        coverageReviewToken: coverage.coverageReviewToken(row),
      })
    ).status,
    404,
  );
  assert.equal(f.db.bookings.length, 1);
});
test("an unchanged in-area request follows normal acceptance without the extra checkbox", async () => {
  const f = await fixture();
  await f.submit();
  assert.equal((await f.acceptance()).status, 200);
  assert.equal(f.db.bookings[0].coverage.status, "matched");
  assert.equal(f.db.bookings[0].coverage.providerConfirmedBy, undefined);
});
test("provider coverage is rechecked at acceptance and confirmed history is immutable after later area edits", async () => {
  const f = await fixture();
  await f.submit();
  f.db.provider.coverageAreas[0].isActive = false;
  assert.equal((await f.acceptance()).status, 409);
  const row = f.db.requests[0];
  assert.equal(
    (
      await f.acceptance({
        confirmOutOfArea: true,
        coverageReviewToken: coverage.coverageReviewToken(row),
      })
    ).status,
    200,
  );
  const saved = structuredClone(f.db.bookings[0]);
  f.db.provider.coverageAreas = [];
  assert.deepEqual(f.db.bookings[0], saved);
  assert.equal(saved.coverage.status, "matched");
  assert.equal(saved.coverage.acceptanceStatus, "outside");
});
test("editing the request destination invalidates the customer's confirmation and stale provider review", async () => {
  const f = await fixture();
  await f.submit({ address: { ...validAddress, pincode: "201301" } });
  const token = coverage.coverageReviewToken(f.db.requests[0]);
  f.db.requests[0].address.addressLine = "Another service destination";
  assert.equal(
    (await f.acceptance({ confirmOutOfArea: true, coverageReviewToken: token }))
      .status,
    409,
  );
  assert.equal(f.db.bookings.length, 0);
});
test("changing only GPS coordinates or confirmation evidence invalidates the stored destination binding", async () => {
  for (const mutate of [
    (address) => {
      address.location.coordinates[0] += 0.01;
    },
    (address) => {
      address.locationConfirmation.accuracyMeters += 1;
    },
    (address) => {
      address.locationConfirmation.confirmedBy = id("9");
    },
  ]) {
    const f = await fixture();
    await f.submit({
      destinationCapture: {
        latitude: 28.627,
        longitude: 77.372,
        accuracy: 8,
        observedAt: Date.now(),
        confirmed: true,
      },
    });
    const token = coverage.coverageReviewToken(f.db.requests[0]);
    mutate(f.db.requests[0].address);
    assert.equal(
      (await f.acceptance({ coverageReviewToken: token })).status,
      409,
    );
    assert.equal(f.db.bookings.length, 0);
  }
});
test("forged confirmation actor, stale token and foreign provider cannot accept an out-of-area request", async () => {
  const f = await fixture();
  await f.submit({ address: { ...validAddress, pincode: "201301" } });
  const token = coverage.coverageReviewToken(f.db.requests[0]);
  assert.equal(
    (
      await f.acceptance({
        confirmOutOfArea: true,
        coverageReviewToken: token,
        actorId: id("9"),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.acceptance({
        confirmOutOfArea: true,
        coverageReviewToken: "0".repeat(64),
      })
    ).status,
    409,
  );
  f.db.requests[0].serviceProviderId = id("9");
  assert.equal(
    (await f.acceptance({ confirmOutOfArea: true, coverageReviewToken: token }))
      .status,
    404,
  );
  assert.equal(f.db.bookings.length, 0);
});
test("acceptance revalidates pending provider, offering approval, active catalog and quote restrictions", async () => {
  const f = await fixture();
  await f.submit();
  for (const change of [
    () => {
      f.db.provider.status = "suspended";
    },
    () => {
      f.db.provider.status = "active";
      f.db.offering.approvalStatus = "pending";
    },
    () => {
      f.db.offering.approvalStatus = "approved";
      f.db.item.isActive = false;
    },
    () => {
      f.db.item.isActive = true;
      f.db.offering.pricingModel = "quote_required";
    },
  ]) {
    change();
    assert.equal((await f.acceptance()).status, 409);
  }
  assert.equal(f.db.bookings.length, 0);
});
test("provider decline is an atomic ownership/open-state action and prevents subsequent acceptance", async () => {
  const f = await fixture();
  await f.submit({ address: { ...validAddress, pincode: "201301" } });
  const run = () =>
    f.decline.POST(post({ reason: "Unable to visit this area" }), {
      params: Promise.resolve({ id: id("f") }),
    });
  f.db.requests[0].serviceProviderId = id("9");
  assert.equal((await run()).status, 404);
  f.db.requests[0].serviceProviderId = f.db.providerId;
  assert.equal((await run()).status, 200);
  assert.equal(f.db.requests[0].declinedBy, f.db.actor);
  assert.ok(f.db.requests[0].declinedAt instanceof Date);
  assert.equal(f.db.requests[0].declineReason, "Unable to visit this area");
  assert.equal((await run()).status, 404);
  assert.equal((await f.acceptance()).status, 404);
  assert.equal(f.db.bookings.length, 0);
});

test("provider inbox bounds the owner query, exposes structured coverage and a review token without private destination evidence", async () => {
  const provider = { coverageVersion: 1, coverageAreas: [normalArea] };
  const rows = ["1", "2", "3"].map((digit) => ({
    _id: id(digit),
    address: validAddress,
    updatedAt: new Date("2026-10-24T10:00:00Z"),
    coverage: {
      ...marketplace.assessCoverage([normalArea], validAddress),
      addressIdentity: coverage.destinationIdentity(validAddress),
    },
  }));
  let filter, projection, bound, ordering;
  const query = chain(rows);
  query.select = (value) => {
    projection = value;
    return query;
  };
  query.limit = (value) => {
    bound = value;
    return query;
  };
  query.sort = (value) => {
    ordering = value;
    return query;
  };
  const route = await load(
    "../app/api/service-provider/booking-requests/route.ts",
    {
      "@/lib/service-provider": {
        requireProvider: async () => ({
          provider: { ...provider, _id: id("a") },
        }),
      },
      "@/models": {
        ServiceRequest: {
          find: (value) => {
            filter = value;
            return query;
          },
        },
      },
      "@/lib/api-response": response,
      "@/lib/pagination": pagination,
      "@/lib/request-coverage": coverage,
    },
  );
  const result = await route.GET(new Request("http://test?limit=2")),
    body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(filter, { serviceProviderId: id("a"), status: "open" });
  assert.equal(bound, 3);
  assert.deepEqual(ordering, { _id: -1 });
  assert.equal(body.requests.length, 2);
  assert.equal(body.nextCursor, id("2"));
  assert.equal(body.requests[0].coverage.status, "matched");
  assert.match(body.requests[0].coverageReviewToken, /^[a-f0-9]{64}$/);
  assert.equal(body.requests[0].coverage.addressIdentity, undefined);
  assert.equal(body.requests[0].address.location, undefined);
  assert.doesNotMatch(
    projection,
    /\+address\.location|requestHash|destinationConfirmation/,
  );
});
