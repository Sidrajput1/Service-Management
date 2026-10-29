/** Isolated in-memory persistence and gateway boundaries for actual finance handlers.
 * Never imported by production. This does not claim live MongoDB isolation or transfers. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import mongoose from "mongoose";
import ts from "typescript";
import * as policy from "../../lib/finance-policy.mjs";
const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, "../..");
export const fixtureId = (n) => Number(n).toString(16).padStart(24, "0");
export function clone(value) {
  if (value instanceof Date) return new Date(value);
  if (value instanceof mongoose.Types.ObjectId)
    return new mongoose.Types.ObjectId(String(value));
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => typeof v !== "function")
        .map(([k, v]) => [k, clone(v)]),
    );
  return value;
}
const get = (row, key) =>
  key.split(".").reduce((value, part) => value?.[part], row);
const equal = (a, b) =>
  a instanceof Date || b instanceof Date
    ? new Date(a).getTime() === new Date(b).getTime()
    : a == null || b == null
      ? a == b
      : String(a) === String(b);
function set(row, key, value) {
  const parts = key.split(".");
  let node = row;
  for (const part of parts.slice(0, -1)) node = node[part] ||= {};
  node[parts.at(-1)] = clone(value);
}
function unset(row, key) {
  const parts = key.split(".");
  let node = row;
  for (const part of parts.slice(0, -1)) {
    node = node?.[part];
    if (!node) return;
  }
  delete node[parts.at(-1)];
}
function matches(row, filter = {}) {
  return (
    Boolean(row) &&
    Object.entries(filter).every(([key, expected]) => {
      if (key === "$or") return expected.some((value) => matches(row, value));
      if (key === "$and") return expected.every((value) => matches(row, value));
      const actual = get(row, key);
      if (
        expected &&
        typeof expected === "object" &&
        !(expected instanceof Date) &&
        !(expected instanceof mongoose.Types.ObjectId)
      )
        return Object.entries(expected).every(([op, value]) => {
          if (op === "$in") return value.some((v) => equal(actual, v));
          if (op === "$nin") return !value.some((v) => equal(actual, v));
          if (op === "$ne") return !equal(actual, value);
          if (op === "$exists") return (actual !== undefined) === value;
          if (op === "$type")
            return value === "string"
              ? typeof actual === "string"
              : value === "date"
                ? actual instanceof Date
                : false;
          if (op === "$gt") return actual > value;
          if (op === "$gte") return actual >= value;
          if (op === "$lt") return actual < value;
          if (op === "$lte") return actual <= value;
          throw new Error("Unsupported fixture filter " + op);
        });
      return equal(actual, expected);
    })
  );
}
function update(row, value, insert = false) {
  for (const [key, item] of Object.entries(value.$set || {}))
    set(row, key, item);
  for (const [key, item] of Object.entries(value.$inc || {}))
    set(row, key, (get(row, key) || 0) + item);
  for (const key of Object.keys(value.$unset || {})) unset(row, key);
  if (insert)
    for (const [key, item] of Object.entries(value.$setOnInsert || {}))
      set(row, key, item);
}
const unique = {
  FinanceLedger: [["invoiceId"]],
  FinanceEvent: [["dedupeKey"], ["externalKey"]],
  CommissionPolicy: [["scope", "scopeKey", "effectiveAt"]],
  FinanceTermsAcceptance: [["providerId", "policyId"]],
  ProviderPayoutProfile: [["providerId"]],
  CommissionCollection: [
    ["reference"],
    ["activeKey"],
    ["gatewayLinkId"],
    ["gatewayPaymentId"],
  ],
  CollectionReminder: [["providerId", "week"]],
  CancellationCase: [["bookingId"]],
  Payment: [["gateway", "gatewayTxnId"]],
  Invoice: [["jobId"]],
};
const defaults = {
  FinanceLedger: {
    commissionAdjustmentPaise: 0,
    payoutAdjustmentPaise: 0,
    invoiceVersion: 1,
    billState: "not_submitted",
    paymentState: "unpaid",
    claimedCollectedPaise: 0,
    onlineReceivedPaise: 0,
    unallocatedReceivedPaise: 0,
    unallocatedRefundedPaise: 0,
    refundedPaise: 0,
    collectedPaise: 0,
    payoutPaidPaise: 0,
    collectionReservedPaise: 0,
    version: 0,
  },
  CommissionCollection: { refundedPaise: 0 },
  Payment: { refundedPaise: 0 },
};
export class FixtureApiError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}
export function createFinanceFixture(options = {}) {
  const state = {
    tables: {},
    actor: { _id: new mongoose.Types.ObjectId(fixtureId(1)), role: "admin" },
    ready: true,
    fail: null,
    notifications: [],
    gatewayLinks: new Map(),
    gatewayPayments: new Map(),
    gatewayRefunds: new Map(),
    gatewayCreates: 0,
    gatewayNotifications: 0,
    transactionWrites: 0,
    notificationsFail: false,
    ...options,
  };
  let sequence = 1000,
    transactionTail = Promise.resolve();
  const table = (name) => (state.tables[name] ||= []);
  function checkUnique(name, row) {
    for (const keys of unique[name] || [])
      if (keys.every((key) => get(row, key) != null)) {
        if (
          table(name).some(
            (other) =>
              !equal(other._id, row._id) &&
              keys.every((key) => equal(get(other, key), get(row, key))),
          )
        )
          throw Object.assign(new Error("Fixture duplicate key"), {
            code: 11000,
          });
      }
  }
  function fail(name, method) {
    if (state.fail === `${name}.${method}`) {
      state.fail = null;
      throw new Error("Controlled persistence failure");
    }
  }
  function document(name, value, selection) {
    if (!value) return null;
    let result = clone(value);
    const terms = (selection || "").split(/\s+/).filter(Boolean),
      include = terms.filter(
        (key) => !key.startsWith("-") && !key.startsWith("+"),
      );
    if (include.length) {
      const projected = { _id: result._id };
      for (const key of include)
        if (get(result, key) !== undefined)
          set(projected, key, get(result, key));
      result = projected;
    }
    for (const key of terms.filter((key) => key.startsWith("-")))
      unset(result, key.slice(1));
    for (const hidden of name === "ProviderPayoutProfile"
      ? ["encrypted"]
      : name === "Booking"
        ? ["commissionSnapshot"]
        : []) {
      if (!terms.includes(`+${hidden}`) && !terms.includes(hidden))
        unset(result, hidden);
    }
    const baseline = clone(result);
    Object.defineProperty(result, "save", {
      enumerable: false,
      value: async (options = {}) => {
        fail(name, "save");
        state.transactionWrites += Boolean(options.session);
        const index = table(name).findIndex((row) =>
          equal(row._id, result._id),
        );
        const saved = clone(table(name)[index] || result);
        for (const key of new Set([
          ...Object.keys(baseline),
          ...Object.keys(result),
        ])) {
          if (JSON.stringify(result[key]) !== JSON.stringify(baseline[key])) {
            if (result[key] === undefined) delete saved[key];
            else saved[key] = clone(result[key]);
          }
        }
        saved.updatedAt = new Date();
        checkUnique(name, saved);
        if (index < 0) table(name).push(saved);
        else table(name)[index] = saved;
        return result;
      },
    });
    return result;
  }
  function query(name, operation) {
    let selection = "",
      sort,
      limit;
    const q = {
      select(value) {
        selection = value;
        return q;
      },
      session() {
        return q;
      },
      lean() {
        return q;
      },
      populate() {
        return q;
      },
      sort(value) {
        sort = value;
        return q;
      },
      limit(value) {
        limit = value;
        return q;
      },
      then(resolve, reject) {
        return Promise.resolve()
          .then(operation)
          .then((value) => {
            if (Array.isArray(value)) {
              let rows = value.map(clone);
              if (sort)
                rows.sort((a, b) => {
                  for (const [key, order] of Object.entries(sort)) {
                    const av = get(a, key),
                      bv = get(b, key);
                    if (av > bv) return order;
                    if (av < bv) return -order;
                  }
                  return 0;
                });
              if (limit != null) rows = rows.slice(0, limit);
              return rows.map((row) => document(name, row, selection));
            }
            return value && typeof value === "object" && "_id" in value
              ? document(name, value, selection)
              : value;
          })
          .then(resolve, reject);
      },
      async *cursor() {
        const rows = await q;
        for (const row of rows) yield row;
      },
    };
    return q;
  }
  const models = {};
  for (const name of [
    "FinanceLedger",
    "FinanceEvent",
    "CommissionPolicy",
    "FinanceTermsAcceptance",
    "ProviderPayoutProfile",
    "CommissionCollection",
    "CollectionReminder",
    "CancellationCase",
    "Invoice",
    "Booking",
    "Job",
    "Payment",
    "Customer",
    "Technician",
    "ServiceProvider",
    "PriceItem",
    "ServiceOffering",
    "User",
    "WebhookEvent",
    "ServiceRequest",
  ]) {
    models[name] = Object.assign(
      function (value) {
        return document(name, {
          ...clone(defaults[name] || {}),
          createdAt: new Date(),
          ...clone(value),
          _id: value._id || new mongoose.Types.ObjectId(fixtureId(++sequence)),
        });
      },
      {
        findById: (id) =>
          query(name, () =>
            clone(table(name).find((row) => equal(row._id, id)) || null),
          ),
        findOne: (filter) =>
          query(name, () =>
            clone(table(name).find((row) => matches(row, filter)) || null),
          ),
        find: (filter) =>
          query(name, () =>
            clone(table(name).filter((row) => matches(row, filter))),
          ),
        exists: (filter) =>
          query(name, () => {
            const found = table(name).find((row) => matches(row, filter));
            return found ? { _id: found._id } : null;
          }),
        countDocuments: (filter) =>
          query(
            name,
            () => table(name).filter((row) => matches(row, filter)).length,
          ),
        distinct: async (key, filter) => [
          ...new Set(
            table(name)
              .filter((row) => matches(row, filter))
              .map((row) => get(row, key)),
          ),
        ],
        async create(input, options = {}) {
          fail(name, "create");
          const list = Array.isArray(input) ? input : [input],
            created = [];
          for (const value of list) {
            const row = {
              ...clone(defaults[name] || {}),
              createdAt: new Date(),
              updatedAt: new Date(),
              ...clone(value),
              _id:
                value._id || new mongoose.Types.ObjectId(fixtureId(++sequence)),
            };
            checkUnique(name, row);
            table(name).push(row);
            created.push(document(name, row, "+commissionSnapshot +encrypted"));
            state.transactionWrites += Boolean(options.session);
          }
          return Array.isArray(input) ? created : created[0];
        },
        findOneAndUpdate(filter, change, options = {}) {
          return query(name, () => {
            fail(name, "findOneAndUpdate");
            let row = table(name).find((row) => matches(row, filter)),
              insert = !row;
            if (!row && !options.upsert) return null;
            if (!row) {
              row = {
                ...clone(defaults[name] || {}),
                createdAt: new Date(),
                updatedAt: new Date(),
                _id: new mongoose.Types.ObjectId(fixtureId(++sequence)),
              };
              for (const [key, value] of Object.entries(filter))
                if (
                  !key.startsWith("$") &&
                  (!(value && typeof value === "object") ||
                    value instanceof mongoose.Types.ObjectId)
                )
                  set(row, key, value);
            }
            update(row, change, insert);
            checkUnique(name, row);
            if (insert) table(name).push(row);
            state.transactionWrites += Boolean(options.session);
            return clone(row);
          });
        },
        updateOne(filter, change, options = {}) {
          return query(name, () => {
            fail(name, "updateOne");
            let row = table(name).find((row) => matches(row, filter)),
              insert = !row;
            if (!row && !options.upsert)
              return { modifiedCount: 0, matchedCount: 0 };
            if (!row) {
              row = {
                ...clone(defaults[name] || {}),
                createdAt: new Date(),
                _id: new mongoose.Types.ObjectId(fixtureId(++sequence)),
              };
              for (const [key, value] of Object.entries(filter))
                if (
                  !key.startsWith("$") &&
                  (typeof value !== "object" ||
                    value instanceof mongoose.Types.ObjectId)
                )
                  set(row, key, value);
            }
            update(row, change, insert);
            checkUnique(name, row);
            if (insert) table(name).push(row);
            state.transactionWrites += Boolean(options.session);
            return {
              modifiedCount: 1,
              matchedCount: insert ? 0 : 1,
              upsertedCount: insert ? 1 : 0,
            };
          });
        },
      },
    );
  }
  const session = {
    async withTransaction(operation) {
      let release;
      const before = transactionTail;
      transactionTail = new Promise((resolve) => (release = resolve));
      await before;
      const snapshot = clone(state.tables);
      try {
        return await operation();
      } catch (error) {
        state.tables = snapshot;
        throw error;
      } finally {
        release();
      }
    },
    async endSession() {},
  };
  const fakeMongoose = Object.create(mongoose);
  fakeMongoose.startSession = async () => session;
  const auth = {
    ApiAuthError: FixtureApiError,
    async requireCurrentUser() {
      if (!state.actor) throw new FixtureApiError("Unauthorized", 401);
      return state.actor;
    },
    async requireAdmin() {
      const actor = await auth.requireCurrentUser();
      if (actor.role !== "admin") throw new FixtureApiError("Forbidden", 403);
      return { user: { ...actor, id: String(actor._id) } };
    },
  };
  const responses = {
    privateJson: (value, status = 200) =>
      Response.json(value, {
        status,
        headers: { "Cache-Control": "private, no-store" },
      }),
    apiFailure: (error) =>
      Response.json(
        {
          error:
            error instanceof FixtureApiError
              ? error.message
              : ["SyntaxError", "ZodError"].includes(error.name)
                ? "Invalid request"
                : "Request failed",
        },
        {
          status:
            error.status ||
            (["SyntaxError", "ZodError"].includes(error.name)
              ? 400
              : error.code === 11000
                ? 409
                : 500),
        },
      ),
  };
  const notification = {
    async createNotification(value) {
      if (state.notificationsFail)
        throw new Error("Controlled notification failure");
      if (!state.notifications.some((row) => row.dedupeKey === value.dedupeKey))
        state.notifications.push(clone(value));
      return value;
    },
  };
  const gateway = {
    async createRazorpayPaymentLink(input) {
      state.gatewayCreates++;
      if (state.gatewayLinks.has(input.reference_id))
        throw new Error("duplicate reference");
      const link = {
        id: `plink_Fixture${state.gatewayCreates}`,
        reference_id: input.reference_id,
        amount: input.amountPaise,
        amount_paid: 0,
        currency: "INR",
        status: "created",
        short_url: `https://rzp.io/i/fixture${state.gatewayCreates}`,
        order_id: `order_Fixture${state.gatewayCreates}`,
        payments: [],
      };
      state.gatewayLinks.set(input.reference_id, link);
      if (state.uncertainCreation) {
        state.uncertainCreation = false;
        throw new Error("Controlled response lost after gateway commit");
      }
      return clone(link);
    },
    async findRazorpayPaymentLink(reference) {
      if (state.gatewayUnavailable)
        throw new Error("Controlled offline gateway");
      return clone(state.gatewayLinks.get(reference) || null);
    },
    async getRazorpayPaymentLink(id) {
      const value = [...state.gatewayLinks.values()].find(
        (row) => row.id === id,
      );
      if (!value) throw new Error("Missing fixture link");
      return clone(value);
    },
    async cancelRazorpayPaymentLink(id) {
      const value = [...state.gatewayLinks.values()].find(
        (row) => row.id === id,
      );
      if (!value || value.status !== "created")
        throw new Error("Cannot cancel");
      value.status = "cancelled";
      return clone(value);
    },
    async getRazorpayPayment(id) {
      if (!state.gatewayPayments.has(id))
        throw new Error("Missing fixture gateway payment");
      return clone(state.gatewayPayments.get(id));
    },
    async getRazorpayRefund(id) {
      if (!state.gatewayRefunds.has(id))
        throw new Error("Missing fixture refund");
      return clone(state.gatewayRefunds.get(id));
    },
    verifyWebhookSignature: () => state.signatureValid !== false,
  };
  const boundaries = {
    mongoose: fakeMongoose,
    "@/lib/auth": auth,
    "@/lib/api-response": responses,
    "@/lib/db": { connectToDb: async () => {} },
    "@/lib/finance-readiness": {
      financeReady: async () => state.ready,
      requireFinanceReady: async () => {
        if (!state.ready)
          throw new FixtureApiError("Finance setup incomplete", 503);
      },
    },
    "@/models/finance": Object.fromEntries(
      Object.entries(models).filter(
        ([name]) => name in unique && !["Payment", "Invoice"].includes(name),
      ),
    ),
    "@/lib/notification": notification,
    "@/lib/razorpay": gateway,
    "@/lib/notification-recipents": {
      getJobNotificationRecipients: async () => ({}),
    },
    "@/lib/notify-events": { notifyPaymentReceived: async () => {} },
    "@/lib/service-provider": {
      async requireProvider() {
        const user = await auth.requireCurrentUser();
        if (user.role !== "service_provider")
          throw new FixtureApiError("Provider required", 403);
        const provider = await models.ServiceProvider.findOne({
          ownerId: user._id,
        });
        if (!provider) throw new FixtureApiError("Provider not found", 404);
        return { user, provider };
      },
    },
    "@/lib/customer": {
      async requireCustomerProfile() {
        const user = await auth.requireCurrentUser();
        if (user.role !== "customer")
          throw new FixtureApiError("Customer required", 403);
        const customer = await models.Customer.findOne({ userId: user._id });
        if (!customer) throw new FixtureApiError("Customer not found", 404);
        return { user, customer };
      },
    },
  };
  const names = {
    invoice: "Invoice",
    booking: "Booking",
    job: "Job",
    payment: "Payment",
    customer: "Customer",
    technician: "Technician",
    ServiceProvider: "ServiceProvider",
    PriceItem: "PriceItem",
    ServiceOffering: "ServiceOffering",
    ServiceRequest: "ServiceRequest",
    user: "User",
    WebhookEvent: "WebhookEvent",
  };
  for (const [key, name] of Object.entries(names))
    boundaries[`@/models/${key}`] = models[name];
  boundaries["@/models"] = {
    Booking: models.Booking,
    ServiceOffering: models.ServiceOffering,
    Customer: models.Customer,
  };
  boundaries["@/lib/chat/ensure-job-conversation"] = {
    ensureJobConversation: async () => ({}),
  };
  const cache = new Map();
  function load(file, overrides = {}) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute) && !Object.keys(overrides).length)
      return cache.get(absolute);
    const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      fileName: absolute,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const loadedModule = { exports: {} };
    if (!Object.keys(overrides).length)
      cache.set(absolute, loadedModule.exports);
    new Function("require", "module", "exports", output)(
      (name) => {
        const resolved =
          name.startsWith("./") || name.startsWith("../")
            ? path.resolve(path.dirname(absolute), name)
            : name.startsWith("@/")
              ? path.resolve(root, name.slice(2))
              : null;
        const alias = resolved
          ? "@/" + path.relative(root, resolved).replaceAll("\\", "/")
          : name;
        if (name in overrides) return overrides[name];
        if (alias in overrides) return overrides[alias];
        if (name in boundaries) return boundaries[name];
        if (alias in boundaries) return boundaries[alias];
        if (resolved) {
          if (resolved.endsWith(".mjs")) return require(resolved);
          const target = [resolved, resolved + ".ts", resolved + ".tsx"].find(
            (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
          );
          if (target) return load(target, overrides);
        }
        return require(name);
      },
      loadedModule,
      loadedModule.exports,
    );
    if (!Object.keys(overrides).length)
      cache.set(absolute, loadedModule.exports);
    return loadedModule.exports;
  }
  function seed(extra = {}) {
    const admin = {
        _id: new mongoose.Types.ObjectId(fixtureId(1)),
        role: "admin",
      },
      owner = {
        _id: new mongoose.Types.ObjectId(fixtureId(2)),
        role: "service_provider",
      },
      customerActor = {
        _id: new mongoose.Types.ObjectId(fixtureId(3)),
        role: "customer",
      },
      techActor = {
        _id: new mongoose.Types.ObjectId(fixtureId(4)),
        role: "technician",
      };
    const providerId = new mongoose.Types.ObjectId(fixtureId(10)),
      customerId = new mongoose.Types.ObjectId(fixtureId(11)),
      techId = new mongoose.Types.ObjectId(fixtureId(12)),
      bookingId = new mongoose.Types.ObjectId(fixtureId(13)),
      jobId = new mongoose.Types.ObjectId(fixtureId(14)),
      invoiceId = new mongoose.Types.ObjectId(fixtureId(15)),
      policyId = new mongoose.Types.ObjectId(fixtureId(16)),
      offeringId = new mongoose.Types.ObjectId(fixtureId(17)),
      itemId = new mongoose.Types.ObjectId(fixtureId(18));
    table("User").push(admin, owner, customerActor, techActor);
    table("ServiceProvider").push({
      _id: providerId,
      ownerId: owner._id,
      companyName: "Controlled fixture business",
      status: "active",
      verificationStatus: "verified",
      onboardingCompletedAt: new Date(Date.now() - 86400000),
    });
    table("Customer").push({ _id: customerId, userId: customerActor._id });
    table("Technician").push({
      _id: techId,
      userId: techActor._id,
      serviceProviderId: providerId,
      isActive: true,
      status: "busy",
    });
    table("ServiceOffering").push({
      _id: offeringId,
      serviceProviderId: providerId,
      priceItemId: itemId,
      isActive: true,
      approvalStatus: "approved",
      price: 1000,
      name: "Fixture service",
    });
    table("PriceItem").push({
      _id: itemId,
      categoryKey: "electrical",
      itemType: "service",
      isActive: true,
    });
    const policyRow = {
      _id: policyId,
      scope: "global",
      scopeKey: "global",
      rateBps: 1000,
      basis: policy.commissionBasis,
      effectiveAt: new Date(Date.now() - 86400000),
      collectionDays: 7,
      termsVersion: policy.financeTermsVersion,
    };
    table("CommissionPolicy").push(policyRow);
    table("FinanceTermsAcceptance").push({
      _id: new mongoose.Types.ObjectId(fixtureId(19)),
      providerId,
      policyId,
      termsVersion: policy.financeTermsVersion,
      acceptedBy: owner._id,
      acceptedAt: new Date(Date.now() - 10000),
    });
    table("Booking").push({
      _id: bookingId,
      customerId,
      serviceProviderId: providerId,
      technicianId: techId,
      serviceOfferingId: offeringId,
      status: "assigned",
      serviceType: "Fixture service",
      commissionSnapshot: {
        state: "ready",
        policyId,
        rateBps: 1000,
        basis: policy.commissionBasis,
        acceptedAt: new Date(Date.now() - 10000),
        establishedAt: new Date(Date.now() - 9000),
        collectionDays: 7,
        termsVersion: policy.financeTermsVersion,
      },
      createdAt: new Date(Date.now() - 86400000),
    });
    table("Job").push({
      _id: jobId,
      bookingId,
      serviceProviderId: providerId,
      technicianId: techId,
      status: "completed",
      invoiceId,
      proofRequired: true,
      proofIds: [fixtureId(50)],
      createdAt: new Date(Date.now() - 86400000),
    });
    table("Invoice").push({
      _id: invoiceId,
      jobId,
      bookingId,
      customerId,
      invoiceNumber: "CONTROLLED-TEST-INVOICE",
      status: "issued",
      currency: "INR",
      items: [
        {
          itemType: "service",
          description: "Controlled test service",
          qty: 1,
          unitPrice: 1000,
          amount: 1000,
          taxable: true,
        },
      ],
      subtotal: 1000,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 1000,
      amountPaid: 0,
      balanceDue: 1000,
      razorpayOrderId: "order_InvoiceFixture",
      createdAt: new Date(Date.now() - 86400000),
      ...extra,
    });
    return {
      admin,
      owner,
      customerActor,
      techActor,
      providerId,
      customerId,
      techId,
      bookingId,
      jobId,
      invoiceId,
      policyId,
      offeringId,
      itemId,
      policyRow,
    };
  }
  function request(route, body, method = "POST", headers = {}) {
    return new Request(`http://localhost:3000${route}`, {
      method,
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        ...headers,
      },
      ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
    });
  }
  return {
    state,
    models,
    table,
    load,
    seed,
    request,
    policy,
    clone,
    auth,
    responses,
    gateway,
    session,
  };
}
