import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import mongoose from "mongoose";
import * as locations from "../lib/service-location.mjs";
import * as arrival from "../lib/arrival-policy.mjs";
const require = createRequire(import.meta.url),
  id = (digit) => digit.repeat(24);
const suppliedId = "6ae05f47d3007087bce6411f";
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
    (name) =>
      name in modules
        ? modules[name]
        : name === "./finance-fields" ? financeFields
        : name === "@/lib/finance-ledger" ? { prepareInvoiceFinance: async () => null }
        : name.startsWith("@/") || name.startsWith("./")
          ? (() => {
              throw new Error(`Missing dependency ${name}`);
            })()
          : require(name),
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const financeFields = await load("../models/finance-fields.ts");
function copy(value) {
  if (value instanceof Date) return new Date(value);
  if (value?._bsontype === "ObjectId")
    return new mongoose.Types.ObjectId(String(value));
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, copy(item)]),
    );
  return value;
}
const get = (row, path) =>
  path.split(".").reduce((current, key) => current?.[key], row);
function set(row, path, value) {
  const keys = path.split(".");
  let current = row;
  for (const key of keys.slice(0, -1)) current = current[key] ||= {};
  current[keys.at(-1)] = copy(value);
}
function project(row, projection = {}) {
  if (!row) return null;
  const paths = Object.keys(projection);
  for (const parent of paths)
    for (const child of paths)
      if (child.startsWith(`${parent}.`))
        throw Object.assign(new Error("Path collision"), {
          name: "MongoServerError",
          code: 31249,
        });
  if (!paths.some((key) => projection[key] === 1)) {
    const returned = copy(row);
    for (const key of paths)
      if (projection[key] === 0) {
        const bits = key.split(".");
        const parent = bits
          .slice(0, -1)
          .reduce((value, part) => value?.[part], returned);
        if (parent) delete parent[bits.at(-1)];
      }
    return returned;
  }
  const returned = projection._id === 0 ? {} : { _id: copy(row._id) };
  for (const path of paths)
    if (projection[path] === 1 && get(row, path) !== undefined)
      set(returned, path, get(row, path));
  return returned;
}
function matches(row, filter) {
  return (
    Boolean(row) &&
    Object.entries(filter).every(([key, expected]) => {
      if (key === "$or") return expected.some((branch) => matches(row, branch));
      const actual = get(row, key);
      if (expected && typeof expected === "object" && "$in" in expected)
        return expected.$in.some((value) => String(value) === String(actual));
      if (expected && typeof expected === "object" && "$ne" in expected)
        return String(actual) !== String(expected.$ne);
      if (expected && typeof expected === "object" && "$nin" in expected)
        return !expected.$nin.some((value) => String(value) === String(actual));
      if (expected && typeof expected === "object" && "$exists" in expected)
        return (actual !== undefined) === expected.$exists;
      return String(actual) === String(expected);
    })
  );
}
async function fixture() {
  const odm = new mongoose.Mongoose();
  const common = { mongoose: odm, "@/lib/service-location.mjs": locations };
  const fields = await load("../models/service-location-fields.ts", common);
  const coverage = await load("../models/request-coverage-fields.ts", common);
  const booking = await load("../models/booking.ts", {
    ...common,
    "./service-location-fields": fields,
    "./request-coverage-fields": coverage,
  });
  const customer = await load("../models/customer.ts", {
    ...common,
    "./service-location-fields": fields,
  });
  const technician = await load("../models/technician.ts", common);
  const user = await load("../models/user.ts", common);
  const proofs = await load("../models/jobProof.ts", common);
  const job = await load("../models/job.ts", {
    ...common,
    "./arrival-fields": await load("../models/arrival-fields.ts", common),
  });
  class ApiError extends Error {
    constructor(message, status = 401) {
      super(message);
      this.status = status;
    }
  }
  const api = await load("../lib/api-response.ts", {
    "@/lib/auth": { ApiAuthError: ApiError },
  });
  const pagination = await load("../lib/pagination.ts");
  const objectId = (value) => new odm.Types.ObjectId(value);
  const address = {
    addressLine: "Customer confirmed service destination",
    locality: "Area",
    city: "Patna",
    state: "Bihar",
    pincode: "800001",
  };
  address.location = { type: "Point", coordinates: [85.14, 25.61] };
  address.locationConfirmation = {
    source: "customer_gps",
    confirmedBy: objectId(id("c")),
    confirmedAt: new Date(),
    capturedAt: new Date(),
    accuracyMeters: 8,
    addressIdentity: locations.addressIdentity(address),
  };
  const db = {
    role: "technician",
    activeUser: true,
    activeTech: true,
    authFailure: null,
    failure: null,
    queries: [],
    projections: [],
    inTransaction: false,
    writes: [],
    notifications: 0,
    notificationCounts: {},
    notificationAttempts: {},
    completionNotifyFailures: 0,
    invoices: 0,
    invoiceFailures: 0,
    fenceConflict: false,
    tech: {
      _id: objectId(id("a")),
      userId: objectId(id("b")),
      serviceProviderId: objectId(id("d")),
      status: "busy",
      isActive: true,
    },
    jobs: [
      {
        _id: objectId(suppliedId),
        technicianId: objectId(id("a")),
        serviceProviderId: objectId(id("d")),
        bookingId: objectId(id("e")),
        status: "enroute",
        proofRequired: true,
        proofIds: [objectId(id("f"))],
        otp: "SECRET_OTP",
        arrivalTracking: { latitude: 12, longitude: 13 },
        arrivalNotification: { state: "pending" },
        notes: "Job instructions",
      },
    ],
    bookings: [
      {
        _id: objectId(id("e")),
        technicianId: objectId(id("a")),
        serviceProviderId: objectId(id("d")),
        customerId: objectId(id("c")),
        serviceType: "Fixture service",
        status: "assigned",
        address,
        notes: "Customer instructions",
        pricing: { basePrice: 200, finalPrice: 200 },
        estimatedPrice: 200,
        scheduledAt: new Date("2026-10-30T12:00:00Z"),
      },
    ],
    customers: [
      {
        _id: objectId(id("c")),
        name: "Fixture customer",
        phone: "0000000000",
        email: "private@example.invalid",
        addresses: [{ addressLine: "Other private saved address" }],
      },
    ],
    proofs: [
      {
        _id: objectId(id("f")),
        jobId: objectId(suppliedId),
        type: "photo",
        url: "https://example.invalid/proof.jpg",
        metadata: { lat: 1, lng: 2, device: "private", note: "Proof note" },
      },
    ],
  };
  for (const [model, rows, label] of [
    [job.default, "jobs", "Job"],
    [booking.default, "bookings", "Booking"],
    [customer.default, "customers", "Customer"],
    [proofs.default, "proofs", "JobProof"],
  ]) {
    const read = (filter, options = {}) => {
      db.queries.push({ model: label, filter });
      db.projections.push({
        model: label,
        projection: options.projection || {},
      });
      if (db.failure) throw db.failure;
      return db[rows]
        .filter((row) => matches(row, filter))
        .map((row) => project(row, options.projection));
    };
    model.collection.findOne = async (filter, options) =>
      read(filter, options)[0] || null;
    model.collection.find = (filter, options) => ({
      toArray: async () => read(filter, options),
    });
  }
  const change = (row, update) => {
    for (const [key, value] of Object.entries(update.$set || {}))
      set(row, key, value);
    for (const [key, value] of Object.entries(update.$inc || {}))
      set(row, key, (get(row, key) || 0) + value);
    for (const key of Object.keys(update.$unset || {})) {
      const bits = key.split(".");
      const parent = bits
        .slice(0, -1)
        .reduce((value, part) => value?.[part], row);
      if (parent) delete parent[bits.at(-1)];
    }
  };
  class FixtureSession {
    async withTransaction(operation) {
      const before = copy({
        jobs: db.jobs,
        bookings: db.bookings,
        proofs: db.proofs,
        tech: db.tech,
      });
      db.inTransaction = true;
      try {
        return await operation();
      } catch (error) {
        Object.assign(db, before);
        throw error;
      } finally {
        db.inTransaction = false;
      }
    }
    async endSession() {}
  }
  const session = new FixtureSession();
  odm.startSession = async () => session;
  for (const [model, rows] of [
    [job.default, "jobs"],
    [booking.default, "bookings"],
  ]) {
    model.collection.updateOne = async (filter, update, options) => {
      assert.equal(options.session, session);
      assert.equal(db.inTransaction, true);
      db.writes.push({ model: rows, filter, update });
      if (rows === "jobs" && db.jobWriteFailure)
        throw new Error("Fixture job write failed");
      if (rows === "bookings" && db.fenceConflict)
        return { matchedCount: 0, modifiedCount: 0 };
      const row = db[rows].find((value) => matches(value, filter));
      if (!row) return { matchedCount: 0, modifiedCount: 0 };
      change(row, update);
      return { matchedCount: 1, modifiedCount: 1 };
    };
  }
  job.default.collection.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(options.session, session);
    assert.equal(db.inTransaction, true);
    const row = db.jobs.find((value) => matches(value, filter));
    if (!row) return null;
    db.writes.push({ model: "jobs", filter, update });
    change(row, update);
    return copy(row);
  };
  technician.default.collection.findOne = async (filter, options) =>
    matches(db.tech, filter) ? project(db.tech, options?.projection) : null;
  user.default.collection.find = (_filter, options) => ({
    toArray: async () => [
      project(
        { _id: db.tech.userId, name: "Fixture Pro" },
        options?.projection,
      ),
    ],
  });
  technician.default.collection.updateOne = async (filter, update) => {
    if (db.techCounterFailure && update.$inc?.jobsCompleted)
      return { matchedCount: 0 };
    if (!matches(db.tech, filter)) return { matchedCount: 0 };
    change(db.tech, update);
    return { matchedCount: 1 };
  };
  job.default.collection.countDocuments = async (filter) =>
    db.jobs.filter((row) => matches(row, filter)).length;
  proofs.default.collection.insertMany = async (values, options) => {
    assert.equal(options.session, session);
    assert.equal(db.inTransaction, true);
    db.proofs.push(...copy(values));
    return {
      acknowledged: true,
      insertedCount: values.length,
      insertedIds: values.map((row) => row._id),
    };
  };
  const guard = async () => {
    if (db.authFailure) throw db.authFailure;
    if (!db.activeUser) throw new ApiError("Unauthorized", 401);
    if (db.role !== "technician")
      throw new ApiError("Pro access required", 403);
    if (!db.activeTech) throw new ApiError("Active Pro profile not found", 403);
    return { user: { _id: db.tech.userId }, tech: db.tech };
  };
  const route = await load("../app/api/technician/jobs/[id]/route.ts", {
    "@/lib/technician": { requireTechnicianProfile: guard },
    "@/lib/api-response": api,
    "@/lib/pagination": pagination,
    "@/lib/service-location.mjs": locations,
    "@/lib/arrival-policy.mjs": arrival,
    "@/lib/arrival-delivery": { deliverArrival: async () => false },
    "@/models/job": job,
    "@/models/booking": booking,
    "@/models/customer": customer,
    "@/models/technician": technician,
    "@/models/jobProof": proofs,
  });
  const GET = (jobId = suppliedId) =>
    route.GET(new Request(`http://test/api/technician/jobs/${jobId}`), {
      params: Promise.resolve({ id: jobId }),
    });
  const engine = await load("../lib/job-arrival.ts", {
    mongoose: odm,
    "@/models/job": job,
    "@/models/booking": booking,
    "@/models/customer": customer,
    "@/models/technician": technician,
    "./auth": { ApiAuthError: ApiError },
    "./db": { connectToDb: async () => {} },
    "./service-location.mjs": locations,
    "./arrival-policy.mjs": arrival,
    "./arrival-delivery": {
      deliverArrival: async () => false,
      emitArrivalStatus: async () => {},
    },
  });
  const assigned = await load("../lib/assigned-job-transaction.ts", {
    mongoose: odm,
    "@/models/job": job,
    "@/models/booking": booking,
    "@/models/technician": technician,
    "./auth": { ApiAuthError: ApiError },
    "./pagination": pagination,
  });
  const mutations = {};
  for (const action of ["accept", "start", "proof", "complete"]) {
    const handler = await load(
      `../app/api/technician/jobs/[id]/${action}/route.ts`,
      {
        "@/lib/auth": { ApiAuthError: ApiError, requireRole: async () => {} },
        "@/lib/technician": {
          requireTechnicianProfile: async () => {
            const result = await guard();
            return { ...result, tech: technician.default.hydrate(db.tech) };
          },
        },
        "@/lib/db": { connectToDb: async () => {} },
        "@/lib/api-response": {
          ...api,
          apiFailure: (error) => {
            db.lastError = error;
            return api.apiFailure(error);
          },
        },
        "@/lib/assigned-job-transaction": assigned,
        "@/models/job": job,
        "@/models/booking": booking,
        "@/models/jobProof": proofs,
        "@/models/technician": technician,
        "@/models/customer": customer,
        "@/models/user": {},
        "@/lib/notify-events": Object.fromEntries(
          [
            "notifyTechnicianAcceptedJob",
            "notifyTechnicianEnroute",
            "notifyCustomerOtpVerified",
            "notifyJobStatus",
            "notifyInvoiceIssued",
            "notifyServiceCompleted",
          ].map((key) => [
            key,
            async () => {
              assert.equal(db.inTransaction, false);
              db.notificationAttempts[key] =
                (db.notificationAttempts[key] || 0) + 1;
              if (
                key === "notifyServiceCompleted" &&
                db.completionNotifyFailures-- > 0
              )
                throw new Error("Fixture completion notification failure");
              // The actual delivery helper's recipient dedupe is covered in the notification suite.
              if (
                ["notifyServiceCompleted", "notifyInvoiceIssued"].includes(
                  key,
                ) &&
                db.notificationCounts[key]
              )
                return;
              db.notifications++;
              db.notificationCounts[key] =
                (db.notificationCounts[key] || 0) + 1;
            },
          ]),
        ),
        "@/lib/notification-recipients": {
          getJobNotificationRecipients: async () => ({
            customerUserId: id("c"),
            providerUserId: id("d"),
            technicianUserId: id("b"),
          }),
        },
        "@/lib/notification-recipents": {
          getJobNotificationRecipients: async () => ({
            customerUserId: id("c"),
            providerUserId: id("d"),
            technicianUserId: id("b"),
          }),
        },
        "@/lib/billing/generateInvoiceForJob": {
          generateInvoiceForJob: async () => {
            assert.equal(db.inTransaction, false);
            db.invoices++;
            if (db.invoiceFailures-- > 0)
              throw new Error("Fixture invoice failure");
            db.jobs[0].invoiceId = objectId(id("4"));
            return {
              _id: objectId(id("4")),
              invoiceNumber: "FIXTURE",
              status: "issued",
              grandTotal: 200,
              amountPaid: 0,
              balanceDue: 200,
            };
          },
        },
      },
    );
    mutations[action] = (body = {}, jobId = suppliedId) =>
      handler.POST(
        new Request(`http://test/api/technician/jobs/${jobId}/${action}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: jobId }) },
      );
  }
  return {
    db,
    GET,
    ApiError,
    mutations,
    assigned,
    engine,
    models: {
      Job: job.default,
      Booking: booking.default,
      Customer: customer.default,
      Technician: technician.default,
    },
  };
}

test("real Mongoose detail population has no parent/child projection collision and loads the supplied-shaped job fixture", async () => {
  const f = await fixture();
  const response = await f.GET();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.job._id, suppliedId);
  assert.equal(result.job.bookingId.serviceType, "Fixture service");
  assert.equal(result.job.bookingId.customerId.name, "Fixture customer");
  assert.equal(result.journey.canTrack, true);
  assert.deepEqual(
    result.job.bookingId.address.location.coordinates,
    [85.14, 25.61],
  );
  assert.ok(f.db.projections.some((row) => row.model === "Booking"));
  assert.equal(result.job.bookingId.notes, "Customer instructions");
  assert.equal(result.job.bookingId.pricing.finalPrice, 200);
  assert.equal(result.workflow.canArrive, true);
  assert.equal(result.workflow.canStart, false);
});
test("malformed IDs are 400 and missing/foreign jobs are 404 before any relationship population", async () => {
  const f = await fixture();
  assert.equal((await f.GET("invalid")).status, 400);
  assert.equal(f.db.queries.length, 0);
  assert.equal((await f.GET(id("1"))).status, 404);
  assert.equal(f.db.queries.filter((row) => row.model !== "Job").length, 0);
  f.db.queries.length = 0;
  f.db.jobs[0].technicianId = new mongoose.Types.ObjectId(id("2"));
  assert.equal((await f.GET()).status, 404);
  assert.equal(f.db.queries.length, 1);
  assert.equal(String(f.db.queries[0].filter.technicianId), id("a"));
});
test("unauthenticated users, wrong roles and inactive Pros are denied before fetching job data", async () => {
  const f = await fixture();
  f.db.authFailure = new f.ApiError("Unauthorized", 401);
  assert.equal((await f.GET()).status, 401);
  f.db.authFailure = null;
  f.db.role = "customer";
  assert.equal((await f.GET()).status, 403);
  f.db.role = "technician";
  f.db.activeTech = false;
  assert.equal((await f.GET()).status, 403);
  assert.equal(f.db.queries.length, 0);
});
test("the actual Pro guard queries active persisted profiles and rejects inactive or missing profiles", async () => {
  const f = await fixture();
  let queries = 0;
  f.models.Technician.collection.findOne = async (filter) => {
    queries++;
    return matches(f.db.tech, filter) ? copy(f.db.tech) : null;
  };
  const helper = await load("../lib/technician.ts", {
    "@/models/technician": f.models.Technician,
    "./auth": {
      ApiAuthError: f.ApiError,
      requireCurrentUser: async () => ({
        _id: f.db.tech.userId,
        role: f.db.role,
      }),
    },
  });
  assert.equal(
    String((await helper.requireTechnicianProfile()).tech._id),
    id("a"),
  );
  f.db.tech.isActive = false;
  await assert.rejects(
    helper.requireTechnicianProfile(),
    (error) => error.status === 403,
  );
  f.db.role = "customer";
  await assert.rejects(
    helper.requireTechnicianProfile(),
    (error) => error.status === 403,
  );
  assert.equal(queries, 2);
});
test("optional missing booking/customer/proof relationships remain readable without fabricated details or active actions", async () => {
  const f = await fixture();
  f.db.bookings = [];
  let body = await (await f.GET()).json();
  assert.equal(body.job.bookingId, null);
  assert.equal(body.workflow.access, "read_only");
  assert.equal(body.journey.canTrack, false);
  assert.equal(body.workflow.canAccept, false);
  assert.equal(body.workflow.canRetryInvoice, false);
  const g = await fixture();
  g.db.customers = [];
  g.db.proofs = [];
  body = await (await g.GET()).json();
  assert.equal(body.job.bookingId.customerId, null);
  assert.deepEqual(body.job.proofIds, []);
  assert.equal(body.job.bookingId.serviceType, "Fixture service");
});
test("own active detail exposes only approved destination coordinates, customer contact and safe proof fields", async () => {
  const f = await fixture(),
    snapshot = copy(f.db.bookings[0].address);
  const response = await f.GET(),
    body = await response.json();
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/);
  assert.equal(body.job.otp, undefined);
  assert.equal(body.job.arrivalTracking, undefined);
  assert.equal(body.job.arrivalNotification, undefined);
  assert.equal(body.job.bookingId.address.locationConfirmation, undefined);
  assert.equal(body.job.bookingId.customerId.email, undefined);
  assert.equal(body.job.bookingId.customerId.addresses, undefined);
  assert.deepEqual(body.job.proofIds[0].metadata, { note: "Proof note" });
  assert.equal(body.job.proofIds[0].jobId, undefined);
  assert.deepEqual(f.db.bookings[0].address, snapshot);
});
test("cancelled, reassigned and unsupported job states disable all workflow actions and precise destination coordinates", async () => {
  for (const change of [
    (db) => {
      db.bookings[0].status = "cancelled";
    },
    (db) => {
      db.bookings[0].technicianId = new mongoose.Types.ObjectId(id("2"));
    },
    (db) => {
      db.jobs[0].status = "cancelled";
    },
    (db) => {
      db.jobs[0].status = "expired";
    },
  ]) {
    const f = await fixture();
    change(f.db);
    const body = await (await f.GET()).json();
    assert.equal(body.workflow.access, "read_only");
    assert.ok(
      Object.entries(body.workflow)
        .filter(([key]) => key.startsWith("can"))
        .every(([, value]) => value === false),
    );
    assert.equal(body.journey.canTrack, false);
    assert.equal(body.job.bookingId.address.location, undefined);
  }
});
test("workflow capabilities match real stage prerequisites, including OTP, required proof and invoice retry", async () => {
  const f = await fixture();
  const read = async (status) => {
    f.db.jobs[0].status = status;
    return (await (await f.GET()).json()).workflow;
  };
  assert.equal((await read("assigned")).canAccept, true);
  assert.equal((await read("scheduled")).canAccept, true);
  assert.equal((await read("arrived")).canStart, true);
  assert.equal((await read("arrived")).canComplete, false);
  assert.equal((await read("otp_verified")).canManageParts, true);
  assert.equal((await read("otp_verified")).canStart, false);
  assert.equal((await read("in_progress")).canComplete, true);
  f.db.proofs = [];
  assert.equal((await read("in_progress")).canComplete, false);
  delete f.db.jobs[0].proofRequired;
  assert.equal((await read("in_progress")).canComplete, false);
  f.db.jobs[0].proofRequired = false;
  assert.equal((await read("on_hold")).canComplete, true);
  assert.equal((await read("completed")).canRetryInvoice, true);
  f.db.jobs[0].invoiceId = new mongoose.Types.ObjectId(id("3"));
  assert.equal((await read("completed")).canRetryInvoice, false);
  const body = await (await f.GET()).json();
  assert.equal(body.job.bookingId.address.location, undefined);
});
test("missing or untrusted destination coordinates disable GPS while preserving address-only navigation and manual arrival", async () => {
  const f = await fixture();
  delete f.db.bookings[0].address.locationConfirmation;
  const body = await (await f.GET()).json();
  assert.equal(body.journey.canTrack, false);
  assert.equal(body.journey.destinationAvailable, false);
  assert.equal(body.workflow.canArrive, true);
  assert.equal(body.job.bookingId.address.location, undefined);
  assert.equal(
    body.job.bookingId.address.addressLine,
    "Customer confirmed service destination",
  );
});
test("genuine driver failures remain generic 500 with sanitized stage/category diagnostics", async (context) => {
  const f = await fixture(),
    logs = [],
    original = console.error;
  console.error = (...args) => logs.push(args);
  context.after(() => {
    console.error = original;
  });
  f.db.failure = Object.assign(
    new Error("mongodb://credential@host/private?token=SECRET_GPS_25.61"),
    { name: "MongoServerError" },
  );
  const response = await f.GET(),
    text = await response.text();
  assert.equal(response.status, 500);
  assert.match(text, /couldn’t complete/);
  assert.doesNotMatch(text, /credential|SECRET_GPS|MongoServer|stack/);
  assert.deepEqual(logs, [
    [
      "Technician job detail failed.",
      { stage: "job_read", category: "MongoServerError" },
    ],
  ]);
});
test("all four workflow mutation handlers reject cancelled/reassigned/missing bookings and foreign jobs before any mutation", async () => {
  for (const action of ["accept", "start", "proof", "complete"]) {
    for (const scenario of ["cancelled", "reassigned", "missing", "foreign"]) {
      const f = await fixture();
      f.db.jobs[0].status = {
        accept: "assigned",
        start: "arrived",
        proof: "in_progress",
        complete: "in_progress",
      }[action];
      if (scenario === "cancelled") f.db.bookings[0].status = "cancelled";
      if (scenario === "reassigned")
        f.db.bookings[0].technicianId = new mongoose.Types.ObjectId(id("2"));
      if (scenario === "missing") f.db.bookings = [];
      if (scenario === "foreign")
        f.db.jobs[0].technicianId = new mongoose.Types.ObjectId(id("2"));
      const body =
        action === "start"
          ? { otp: "SECRET_OTP" }
          : action === "proof"
            ? { proofs: [{ url: "https://example.invalid/new-proof.jpg" }] }
            : {};
      const response = await f.mutations[action](body);
      assert.equal(
        response.status,
        scenario === "foreign" ? 404 : 409,
        `${action}/${scenario}`,
      );
      assert.equal(f.db.writes.length, 0, `${action}/${scenario}`);
      assert.equal(f.db.notifications, 0);
      assert.equal(f.db.invoices, 0);
      assert.equal(f.db.proofs.length, 1);
    }
  }
});
test("current-booking fence conflicts abort without a job transition or notification", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "assigned";
  f.db.fenceConflict = true;
  assert.equal((await f.mutations.accept()).status, 409, f.db.lastError?.stack);
  assert.equal(f.db.jobs[0].status, "assigned");
  assert.equal(f.db.writes.filter((row) => row.model === "jobs").length, 0);
  assert.equal(f.db.notifications, 0);
});
test("valid acceptance and OTP start commit through the booking fence while preserving status/OTP prerequisites", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "assigned";
  assert.equal((await f.mutations.accept()).status, 200, f.db.lastError?.stack);
  assert.equal(f.db.jobs[0].status, "enroute");
  assert.equal(f.db.bookings[0].__v, 1);
  assert.equal(f.db.notifications, 2);
  assert.equal((await f.mutations.start({ otp: "SECRET_OTP" })).status, 400);
  f.db.jobs[0].status = "arrived";
  assert.equal((await f.mutations.start({ otp: "wrong" })).status, 400);
  assert.equal(f.db.jobs[0].status, "arrived");
  assert.equal((await f.mutations.start({ otp: "SECRET_OTP" })).status, 200);
  assert.equal(f.db.jobs[0].status, "in_progress");
  assert.ok(f.db.jobs[0].customerOtpVerifiedAt instanceof Date);
});
test("proof insert and job proof references commit together and completion still requires proof", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.jobs[0].proofIds = [];
  assert.equal(
    (await f.mutations.complete()).status,
    400,
    f.db.lastError?.stack,
  );
  assert.equal(f.db.invoices, 0);
  assert.equal(
    (
      await f.mutations.proof({
        proofNote: "Saved proof",
        proofs: [
          { url: "https://example.invalid/new-proof.jpg", type: "after_photo" },
        ],
      })
    ).status,
    200,
  );
  assert.equal(f.db.jobs[0].proofIds.length, 1);
  assert.equal(f.db.proofs.length, 2);
  assert.ok(f.db.jobs[0].proofSubmittedAt instanceof Date);
});
test("a failed job proof write rolls back inserted proof records and keeps the prior job snapshot", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.jobs[0].proofIds = [];
  f.db.jobWriteFailure = true;
  assert.equal(
    (
      await f.mutations.proof({
        proofs: [{ url: "https://example.invalid/new-proof.jpg" }],
      })
    ).status,
    500,
  );
  assert.equal(f.db.proofs.length, 1);
  assert.deepEqual(f.db.jobs[0].proofIds, []);
  assert.equal(f.db.notifications, 0);
});
test("the actual manual-arrival engine uses a collision-free Booking query with real Mongoose models", async () => {
  const f = await fixture();
  const result = await f.engine.recordJobArrival(suppliedId, id("a"), id("b"));
  assert.equal(result.success, true);
  assert.equal(result.status, "arrived");
  assert.equal(f.db.jobs[0].status, "arrived");
  assert.equal(f.db.jobs[0].arrivalMethod, "manual");
  assert.ok(
    f.db.projections.some(
      (row) =>
        row.model === "Booking" && row.projection["address.location"] === 1,
    ),
  );
});
test("completion replay keeps its counter and completion notification once while allowing failed invoice repair", async (context) => {
  const original = console.error;
  console.error = () => {};
  context.after(() => {
    console.error = original;
  });
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.invoiceFailures = 1;
  assert.equal(
    (await f.mutations.complete()).status,
    500,
    f.db.lastError?.stack,
  );
  assert.equal(f.db.jobs[0].status, "completed");
  assert.equal(f.db.tech.jobsCompleted, 1);
  assert.equal(f.db.notificationCounts.notifyServiceCompleted, 1);
  const firstWorkLocation = copy(f.db.tech.lastCompletedWorkLocation);
  const retry = await f.mutations.complete();
  assert.equal(retry.status, 200, f.db.lastError?.stack);
  assert.equal((await retry.json()).invoice.id, id("4"));
  assert.equal(f.db.tech.jobsCompleted, 1);
  assert.equal(f.db.notificationCounts.notifyServiceCompleted, 1);
  assert.deepEqual(f.db.tech.lastCompletedWorkLocation, firstWorkLocation);
  assert.equal(f.db.invoices, 2);
  const again = await f.mutations.complete();
  assert.equal(again.status, 200);
  assert.equal((await again.json()).invoice.id, id("4"));
  assert.equal(f.db.tech.jobsCompleted, 1);
});

async function invoiceFixture() {
  const state = {
    invoice: null,
    invoiceCreates: 0,
    attachmentFailures: 0,
    duplicateRace: false,
    writes: [],
  };
  state.job = {
    _id: new mongoose.Types.ObjectId(id("a")),
    bookingId: new mongoose.Types.ObjectId(id("b")),
    status: "completed",
    paymentStatus: "unbilled",
    partsUsed: [],
    save: async () => {
      if (state.attachmentFailures-- > 0)
        throw new Error("Fixture attachment failed");
      state.storedInvoiceId = state.job.invoiceId;
    },
  };
  const booking = {
    _id: state.job.bookingId,
    customerId: id("c"),
    serviceType: "Snapshot service",
    pricing: { finalPrice: 200, discountAmount: 10, taxPercent: 12 },
    notes: "Snapshot note",
  };
  const helper = await load("../lib/billing/generateInvoiceForJob.ts", {
    "@/models": {
      Booking: { findById: async () => booking },
      ServiceOffering: {},
    },
    "@/models/invoice": {
      findOne: async () => state.invoice,
      exists: async () => false,
      create: async (value) => {
        state.invoiceCreates++;
        state.invoice = {
          ...copy(value),
          _id: new mongoose.Types.ObjectId(id("d")),
        };
        if (state.duplicateRace)
          throw Object.assign(new Error("Fixture duplicate job invoice"), {
            code: 11000,
          });
        return state.invoice;
      },
    },
    "./generateInvoiceNumber": {
      generateInvoiceNumber: () => "FIXTURE-INVOICE",
    },
    "@/models/job": {
      findById: async () => state.job,
      updateOne: async (filter, update) => {
        state.writes.push({ filter, update });
        if (state.storedInvoiceId == null)
          state.storedInvoiceId = update.$set.invoiceId;
        return { matchedCount: state.storedInvoiceId == null ? 0 : 1 };
      },
    },
  });
  return { state, generate: () => helper.generateInvoiceForJob(state.job._id) };
}
test("an existing paid invoice retries attachment without repricing, resetting paid state or changing an existing different link", async () => {
  const f = await invoiceFixture();
  f.state.invoice = {
    _id: new mongoose.Types.ObjectId(id("e")),
    jobId: f.state.job._id,
    status: "paid",
    grandTotal: 321,
    amountPaid: 321,
    balanceDue: 0,
    taxPercent: 5,
  };
  f.state.job.paymentStatus = "paid";
  const before = copy(f.state.invoice);
  assert.equal(await f.generate(), f.state.invoice);
  assert.equal(String(f.state.storedInvoiceId), id("e"));
  assert.deepEqual(f.state.invoice, before);
  assert.equal(f.state.job.paymentStatus, "paid");
  f.state.storedInvoiceId = new mongoose.Types.ObjectId(id("f"));
  await f.generate();
  assert.equal(String(f.state.storedInvoiceId), id("f"));
  assert.equal(f.state.invoiceCreates, 0);
  assert.deepEqual(f.state.writes[0].update, {
    $set: { invoiceId: f.state.invoice._id },
  });
});
test("invoice-created/job-attachment failure is repaired by retry using exactly the original invoice snapshot", async () => {
  const f = await invoiceFixture();
  f.state.attachmentFailures = 1;
  await assert.rejects(f.generate(), /attachment failed/);
  const before = copy(f.state.invoice);
  assert.equal(f.state.storedInvoiceId, undefined);
  const result = await f.generate();
  assert.equal(result, f.state.invoice);
  assert.equal(String(f.state.storedInvoiceId), String(result._id));
  assert.equal(f.state.invoiceCreates, 1);
  assert.deepEqual(f.state.invoice, before);
  assert.equal(result.subtotal, 200);
  assert.equal(result.taxPercent, 12);
});
test("a unique-job-index invoice creation race reuses the existing invoice and repairs only the missing job link", async () => {
  const f = await invoiceFixture();
  f.state.duplicateRace = true;
  const result = await f.generate();
  assert.equal(result, f.state.invoice);
  assert.equal(f.state.invoiceCreates, 1);
  assert.equal(String(f.state.storedInvoiceId), String(result._id));
  assert.equal(f.state.job.paymentStatus, "unbilled");
});

test("completion notification failure can be retried after atomic operational updates without a second completion or invented GPS", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.completionNotifyFailures = 1;
  const savedLocation = {
    type: "Point",
    coordinates: [80, 20],
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    addressText: "Prior saved work",
    jobId: new mongoose.Types.ObjectId(id("5")),
  };
  f.db.tech.lastCompletedWorkLocation = copy(savedLocation);
  assert.equal((await f.mutations.complete()).status, 500);
  assert.equal(f.db.jobs[0].status, "completed");
  assert.ok(f.db.jobs[0].endTime instanceof Date);
  assert.equal(f.db.tech.jobsCompleted, 1);
  assert.equal(f.db.tech.status, "available");
  assert.deepEqual(f.db.tech.lastCompletedWorkLocation, savedLocation);
  assert.equal(f.db.invoices, 0);
  assert.equal((await f.mutations.complete()).status, 200);
  assert.equal(f.db.tech.jobsCompleted, 1);
  assert.equal(f.db.notificationCounts.notifyServiceCompleted, 1);
  assert.equal(f.db.notificationAttempts.notifyServiceCompleted, 2);
  assert.equal(f.db.invoices, 1);
  assert.deepEqual(f.db.tech.lastCompletedWorkLocation, savedLocation);
});
test("a failed completion counter update rolls back the job transition and booking fence", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.techCounterFailure = true;
  assert.equal((await f.mutations.complete()).status, 409);
  assert.equal(f.db.jobs[0].status, "in_progress");
  assert.equal(f.db.jobs[0].endTime, undefined);
  assert.equal(f.db.bookings[0].__v, undefined);
  assert.equal(f.db.tech.status, "busy");
  assert.equal(f.db.notifications, 0);
  assert.equal(f.db.invoices, 0);
});
test("finishing one job retains busy availability when another assigned job remains", async () => {
  const f = await fixture();
  f.db.jobs[0].status = "in_progress";
  f.db.jobs.push({
    ...copy(f.db.jobs[0]),
    _id: new mongoose.Types.ObjectId(id("6")),
    status: "assigned",
  });
  assert.equal((await f.mutations.complete()).status, 200);
  assert.equal(f.db.tech.jobsCompleted, 1);
  assert.equal(f.db.tech.status, "busy");
});
test("an unrelated duplicate invoice-number error is not converted into another job's invoice", async () => {
  const duplicate = Object.assign(new Error("Fixture duplicate number"), {
    code: 11000,
  });
  const f = await invoiceFixture();
  // The first lookup is empty and no invoice for this job exists after the failing insert.
  const state = f.state;
  state.duplicateRace = true;
  Object.defineProperty(state, "invoice", { get: () => null, set: () => {} });
  await assert.rejects(f.generate(), (error) => error.code === duplicate.code);
  assert.equal(state.storedInvoiceId, undefined);
});
