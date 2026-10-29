import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as client } from "socket.io-client";
import { encode } from "next-auth/jwt";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import * as financePolicy from "../lib/finance-policy.mjs";
import {
  canReadConversation,
  canPayInvoice,
  notificationAudience,
  safeCustomerLink,
} from "../lib/access-policy.mjs";
import * as serviceLocation from "../lib/service-location.mjs";
import {
  legacyCoverage,
  servesLocation,
  assessCoverage,
  normalizePincode,
} from "../lib/marketplace-policy.mjs";
import { installSocketSecurity } from "../lib/socket-server.mjs";

const require = createRequire(import.meta.url);
// Execute the actual route handler with injected persistence/auth boundaries.
async function load(path, modules = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) => {
      if (name in modules) return modules[name];
      if (name === "./finance-policy.mjs") return financePolicy;
      if (name === "./finance-readiness") return { financeReady: async () => false };
      if (name === "./finance-ledger") return { applyVerifiedInvoicePayment: async () => {} };
      if (name === "@/models/finance") return { FinanceEvent: { exists: () => chain(null) }, FinanceLedger: { exists: () => chain(null) }, CommissionCollection: { findOne: () => chain(null) } };
      if (name === "@/lib/auth") return { ApiAuthError: ApiError };
      if (name === "@/lib/finance-refunds") return {};
      if (name === "@/lib/finance-collections") return {};
      if (name === "@/lib/finance-commission") return { commissionForBooking: async () => ({ state: "missing_policy", establishedAt: new Date() }) };
      if (name.startsWith("@/"))
        throw new Error(`Missing test dependency: ${name}`);
      return require(name);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}
const id = (digit) => digit.repeat(24);
const chain = (value) => {
  const query = {
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  for (const name of [
    "select",
    "populate",
    "sort",
    "limit",
    "lean",
    "session",
    "setOptions",
  ])
    query[name] = () => query;
  return query;
};
class ApiError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}
const responses = {
  privateJson: (body, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }),
  privateHeaders: { "Cache-Control": "private, no-store" },
  apiFailure: (error) =>
    Response.json(
      { error: error.message },
      { status: error.status || (error.name === "ZodError" ? 400 : 500) },
    ),
};
const pagination = await load("../lib/pagination.ts");
const requestCoverage = await load("../lib/request-coverage.ts", {
  "./service-location.mjs": serviceLocation,
  "./marketplace-policy.mjs": { legacyCoverage, assessCoverage },
});
const customerId = id("a");
const scoped = {
  "@/lib/marketplace-policy.mjs": {
    legacyCoverage,
    servesLocation,
    assessCoverage,
    normalizePincode,
  },
  "@/lib/request-coverage": requestCoverage,
  "@/lib/service-location.mjs": serviceLocation,
  "@/lib/customer": {
    requireCustomer: async () => ({ customer: { _id: customerId } }),
    requireCustomerProfile: async () => ({ customer: { _id: customerId } }),
  },
  "@/lib/db": { connectToDb: async () => {} },
  "@/lib/auth-options": { authOptions: {} },
  "next-auth": { getServerSession: async () => ({ user: { id: id("1") } }) },
  "@/lib/api-response": responses,
  "@/lib/pagination": pagination,
  "@/lib/access-policy.mjs": {
    canPayInvoice,
    activeJobStatus: (status) =>
      ["assigned", "enroute", "in_progress"].includes(status),
  },
};
test("customer notification audience never includes another customer's role notices", () => {
  assert.deepEqual(notificationAudience({ _id: "A", role: "customer" }), {
    recipientUserId: "A",
  });
  assert.deepEqual(notificationAudience({ _id: "admin", role: "admin" }), {
    $or: [
      { recipientUserId: "admin" },
      { recipientUserId: null, recipientRole: "admin" },
    ],
  });
});
test("payment eligibility rejects draft, cancelled, paid, zero, and non-finite balances", () => {
  for (const status of ["draft", "cancelled", "paid"])
    assert.equal(canPayInvoice({ status, balanceDue: 20 }), false);
  for (const balanceDue of [0, -1, NaN, Infinity, "bad"])
    assert.equal(canPayInvoice({ status: "issued", balanceDue }), false);
  assert.equal(canPayInvoice({ status: "partial", balanceDue: 40 }), true);
});
test("notification links cannot escape the customer website", () => {
  for (const url of [
    "//evil.test",
    "/admin/dashboard",
    "javascript:alert(1)",
    "/customer/bookings/../profile",
    "/\\evil.test",
  ])
    assert.equal(safeCustomerLink(url), null);
  assert.equal(
    safeCustomerLink(`/customer/bookings/${id("2")}?unsafe=x`),
    `/customer/bookings/${id("2")}`,
  );
});
test("actual invoice handler scopes Customer B's ID to Customer A and returns no record", async () => {
  let filter;
  const handler = await load("../app/api/customer/invoices/[id]/route.ts", {
    ...scoped,
    "@/models/invoice": {
      findOne: (query) => {
        filter = query;
        return chain(null);
      },
    },
    "@/models/job": {},
    "@/models/booking": {},
    "@/models/customer": {},
    "@/models/ServiceProvider": {},
    "@/models/ServiceOffering": {},
  });
  const response = await handler.GET(new Request("http://test"), {
    params: Promise.resolve({ id: id("b") }),
  });
  assert.equal(response.status, 404);
  assert.equal(filter.customerId, customerId);
  assert.equal(filter._id, id("b"));
});
test("actual booking handler rejects another customer's booking before fetching job or invoice", async () => {
  let filter;
  const handler = await load("../app/api/customer/bookings/[id]/route.ts", {
    ...scoped,
    "@/lib/customer-timeline": {},
    "@/models/index": {
      Booking: {
        findOne: (query) => {
          filter = query;
          return chain(null);
        },
      },
    },
    ...Object.fromEntries(
      [
        "job",
        "invoice",
        "payment",
        "lead",
        "ServiceProvider",
        "jobProof",
        "technician",
      ].map((model) => [`@/models/${model}`, {}]),
    ),
  });
  const response = await handler.GET(new Request("http://test"), {
    params: Promise.resolve({ id: id("b") }),
  });
  assert.equal(response.status, 404);
  assert.equal(filter.customerId, customerId);
});
test("invoice PDF lookup is scoped before rendering or exposing an address", async () => {
  let filter;
  const handler = await load("../app/api/invoices/[id]/pdf/route.tsx", {
    ...scoped,
    "@/lib/auth": {
      requireCurrentUser: async () => ({ _id: id("1"), role: "customer" }),
    },
    "@/models/customer": { findOne: () => chain({ _id: customerId }) },
    "@/models/invoice": {
      findOne: (value) => {
        filter = value;
        return chain(null);
      },
    },
    "@/models/job": {},
    "@/models/booking": {},
    "@react-pdf/renderer": {
      renderToBuffer: () => {
        throw new Error("A foreign invoice must never render");
      },
    },
    "@/components/invoice/InvoicePdf": () => null,
  });
  const response = await handler.GET(new Request("http://test"), {
    params: Promise.resolve({ id: id("b") }),
  });
  assert.equal(response.status, 404);
  assert.equal(filter.customerId, customerId);
});
test("persisted customer role cannot use a stale admin session to mutate jobs or bookings", async () => {
  const auth = await load("../lib/auth.ts", {
    "@/lib/auth-options": { authOptions: {} },
    "./db": { connectToDb: async () => {} },
    "next-auth": {
      getServerSession: async () => ({ user: { id: id("1"), role: "admin" } }),
    },
    "@/models/user": {
      findOne: () => chain({ _id: id("1"), role: "customer", isActive: true }),
    },
  });
  await assert.rejects(
    auth.requireRole(["admin", "dispatcher"]),
    (error) => error.status === 403,
  );
});
test("actual tracking handler denies another booking, does not expose global Pro coordinates, even for an active booking", async () => {
  let owned = false,
    status = "enroute",
    reads = 0,
    updatedAt = new Date();
  const handler = await load(
    "../app/api/customer/bookings/[id]/tracking/route.ts",
    {
      ...scoped,
      "@/models/booking": {
        findOne: (filter) => {
          assert.equal(filter.customerId, customerId);
          return chain(
            owned ? { status: "assigned", serviceProviderId: id("3") } : null,
          );
        },
      },
      "@/models/job": {
        findOne: () => chain({ technicianId: id("4"), status }),
      },
      "@/models/technician": {
        findById: () => {
          reads++;
          return chain({
            currentLocation: { coordinates: [77.2, 28.6], updatedAt },
          });
        },
      },
    },
  );
  const get = () =>
    handler.GET(new Request("http://test"), {
      params: Promise.resolve({ id: id("b") }),
    });
  assert.equal((await get()).status, 404);
  assert.equal(reads, 0);
  owned = true;
  status = "completed";
  assert.equal((await (await get()).json()).state, "inactive");
  assert.equal(reads, 0);
  status = "enroute";
  updatedAt = new Date(Date.now() - 121000);
  const stale = await (await get()).json();
  assert.equal(stale.state, "unavailable");
  assert.equal(stale.coordinates, undefined);
  updatedAt = new Date();
  const current = await get();
  assert.equal((await current.json()).coordinates, undefined);
  assert.equal(reads, 0);
  assert.match(current.headers.get("Cache-Control"), /no-store/);
});
test("actual checkout handler rejects foreign ownership and ignores browser price/status", async () => {
  let owner = id("b"),
    status = "issued",
    sentAmount;
  const handler = await load(
    "../app/api/invoices/[id]/razorpay/order/route.ts",
    {
      ...scoped,
      "@/lib/auth": {
        requireCurrentUser: async () => ({ _id: id("1"), role: "customer" }),
      },
      "@/lib/razorpay": {
        createRazorpayOrder: async (input) => {
          sentAmount = input.amountPaise;
          return {
            id: "order_test",
            amount: input.amountPaise,
            currency: "INR",
          };
        },
      },
      "@/models/customer": { findOne: () => chain({ _id: customerId }) },
      "@/models/invoice": {
        findById: () =>
          chain({
            _id: id("c"),
            customerId: owner,
            status,
            balanceDue: 725,
            currency: "INR",
          }),
        findOneAndUpdate: async () => ({ _id: id("c") }),
      },
      "@/models/job": {},
      "@/models/technician": {},
    },
  );
  const pay = () =>
    handler.POST(
      new Request("http://test", {
        method: "POST",
        body: JSON.stringify({ amount: 1, status: "paid" }),
      }),
      { params: Promise.resolve({ id: id("c") }) },
    );
  assert.equal((await pay()).status, 403);
  assert.equal(sentAmount, undefined);
  owner = customerId;
  status = "cancelled";
  assert.equal((await pay()).status, 409);
  assert.equal(sentAmount, undefined);
  status = "issued";
  assert.equal((await pay()).status, 200);
  assert.equal(sentAmount, 72500);
});
test("profile handler ignores injected role and rejects unbounded or invalid addresses", async () => {
  const customer = { name: "Before", role: "customer", save: async () => {} };
  const handler = await load("../app/api/customer/profile/route.ts", {
    ...scoped,
    "@/lib/customer": { requireCustomerProfile: async () => ({ customer }) },
  });
  const update = (body) =>
    handler.PUT(
      new Request("http://test", { method: "PUT", body: JSON.stringify(body) }),
    );
  assert.equal((await update({ name: "After", role: "admin" })).status, 200);
  assert.equal(customer.role, "customer");
  assert.equal(
    (
      await update({
        addresses: Array(11).fill({
          addressLine: "House 10",
          city: "Delhi",
          pincode: "110001",
        }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await update({
        addresses: [{ addressLine: "House 10", city: "Delhi", pincode: "x" }],
      })
    ).status,
    400,
  );
});
test("general login returns accept customer pages and reject privileged or external paths", async () => {
  const { safeCustomerDestination } = await load("../lib/booking-redirect.ts");
  assert.equal(
    safeCustomerDestination(`/customer/invoice/${id("c")}`),
    `/customer/invoice/${id("c")}`,
  );
  for (const value of [
    "https://evil.test",
    "/admin/dashboard",
    "//evil.test",
    "/customer/profile#x",
  ])
    assert.equal(safeCustomerDestination(value), null);
});
test("actual chat handler denies foreign history and derives the sender on idempotent retries", async () => {
  let allowed = false,
    creates = 0,
    stored;
  const user = { _id: id("1"), role: "customer" };
  const handler = await load(
    "../app/api/chats/conversations/[id]/message/route.ts",
    {
      ...scoped,
      "@/lib/auth": { requireCurrentUser: async () => user },
      "@/lib/chat/authorize-conversation": {
        authorizeConversation: async () => {
          if (!allowed) throw new ApiError("Forbidden", 403);
        },
      },
      "@/lib/socket": {
        emitConversationMessage: () => {},
        emitConversationUpdate: () => {},
      },
      "@/models/chat/Conversation": {
        findById: () => chain({ _id: id("4") }),
        updateOne: async () => {},
      },
      "@/models/chat/Message": {
        init: async () => {},
        find: () => {
          throw new Error("Foreign history must never be read");
        },
        create: async (value) => {
          creates++;
          if (stored) throw { code: 11000 };
          stored = {
            ...value,
            _id: id("5"),
            createdAt: new Date().toISOString(),
          };
          return { ...stored, toObject: () => stored };
        },
        findOne: () => chain(stored),
      },
    },
  );
  const params = { params: Promise.resolve({ id: id("4") }) };
  assert.equal(
    (await handler.GET(new Request("http://test"), params)).status,
    403,
  );
  allowed = true;
  const send = () =>
    handler.POST(
      new Request("http://test", {
        method: "POST",
        body: JSON.stringify({
          text: "Hello",
          senderId: id("9"),
          senderRole: "admin",
          clientMessageId: "12345678-1234-4234-8234-123456789012",
        }),
      }),
      params,
    );
  assert.equal((await send()).status, 201);
  assert.equal(stored.senderId, user._id);
  assert.equal(stored.senderRole, "customer");
  const retry = await send();
  assert.equal((await retry.json()).duplicate, true);
  assert.equal(creates, 2);
});
test("payment finalization writes payment, invoice, and job in one transaction and retries idempotently", async () => {
  let active = false,
    creates = 0,
    jobWrites = 0,
    ended = false, storedPayment = null;
  const session = {
    withTransaction: async (operation) => {
      active = true;
      try {
        return await operation();
      } finally {
        active = false;
      }
    },
    endSession: async () => {
      ended = true;
    },
  };
  const invoice = {
    _id: id("a"),
    jobId: id("b"),
    status: "issued",
    balanceDue: 95,
    grandTotal: 95,
    amountPaid: 0,
    save: async (options) => {
      assert.equal(active, true);
      assert.equal(options.session, session);
    },
  };
  const finalize = (
    await load("../lib/razorpay-payment.ts", {
      mongoose: { startSession: async () => session },
      "@/models/invoice": { findById: () => chain(invoice) },
      "@/models/payment": {
        findOne: (filter) => chain(storedPayment?.gatewayTxnId === filter.gatewayTxnId ? storedPayment : null),
        create: async (rows, options) => {
          assert.equal(active, true);
          assert.equal(options.session, session);
          assert.equal(rows[0].mode, "bank_transfer");
          creates++;
          storedPayment = { ...rows[0], _id: id("c") }; return [storedPayment];
        },
      },
      "@/models/job": {
        updateOne: async (_filter, _change, options) => {
          assert.equal(active, true);
          assert.equal(options.session, session);
          jobWrites++;
        },
      },
      "./db": { connectToDb: async () => {} },
      "./auth": { ApiAuthError: ApiError },
      "./access-policy.mjs": { canPayInvoice },
      "./notification-recipents": {
        getJobNotificationRecipients: async () => ({}),
      },
      "./notify-events": {
        notifyPaymentReceived: async () => {
          assert.equal(active, false);
        },
      },
    })
  ).finalizeSuccessfulRazorpayPayment;
  const input = {
    invoiceId: id("a"),
    paymentId: "payment_fixture",
    paidAmountPaise: 9500,
    expectedAmountPaise: 9500,
    method: "netbanking",
    source: "callback",
  };
  assert.equal((await finalize(input)).duplicate, false);
  assert.equal(invoice.status, "paid");
  assert.equal(invoice.balanceDue, 0);
  assert.equal(creates, 1);
  assert.equal(jobWrites, 1);
  assert.equal(ended, true);
  assert.equal((await finalize(input)).duplicate, true);
  assert.equal(creates, 1);
  invoice.status = "issued";
  invoice.balanceDue = 90;
  await assert.rejects(finalize({ ...input, paymentId: "payment_fixture_next" }), /current invoice balance/);
  assert.equal(creates, 1);
});
test("webhook failures remain retryable and successful deliveries are deduplicated", async () => {
  let attempts = 0,
    record = null;
  const handler = await load("../app/api/webhooks/razorpay/route.ts", {
    "@/lib/api-response": responses,
    "@/lib/db": { connectToDb: async () => {} },
    "@/lib/razorpay": { verifyWebhookSignature: () => true, getRazorpayPayment: async () => ({ id: "pay_fixture", order_id: "order_fixture", amount: 9500, currency: "INR", status: "captured" }) },
    "@/models/invoice": {
      findOne: async () => ({ _id: id("a"), balanceDue: 95, razorpayOrderId: "order_fixture", currency: "INR", status: "issued" }),
      findById: async () => ({
        _id: id("a"),
        balanceDue: 95,
        razorpayOrderId: "order_fixture",
        currency: "INR",
        status: "issued",
      }),
    },
    "@/models/WebhookEvent": {
      findOne: async () => (record?.status === "processed" ? record : null),
      updateOne: async (_query, update) => {
        record = update.$set;
      },
    },
    "@/lib/razorpay-payment": {
      finalizeSuccessfulRazorpayPayment: async () => {
        attempts++;
        if (attempts === 1) throw new Error("Fixture transient failure");
        return {
          invoice: { _id: id("a") },
          payment: { _id: id("b") },
          duplicate: false,
        };
      },
    },
  });
  const deliver = () =>
    handler.POST(
      new Request("http://test", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "fixture",
          "x-razorpay-event-id": "fixture_event",
        },
        body: JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: "pay_fixture",
                amount: 9500,
                currency: "INR",
                notes: { invoiceId: id("a") },
              },
            },
          },
        }),
      }),
    );
  assert.equal((await deliver()).status, 500);
  assert.equal(record, null);
  assert.equal((await deliver()).status, 200);
  assert.equal(record.status, "processed");
  assert.equal((await (await deliver()).json()).duplicate, true);
  assert.equal(attempts, 2);
});
test("provider acceptance preserves request pricing and updates request and booking in one transaction", async () => {
  let active = false,
    creates = 0;
  const session = {
    withTransaction: async (operation) => {
      active = true;
      try {
        return await operation();
      } finally {
        active = false;
      }
    },
    endSession: async () => {},
  };
  const request = {
    _id: id("1"),
    customerId,
    serviceProviderId: id("9"),
    serviceOfferingId: id("8"),
    serviceName: "Fixture service",
    address: { city: "Patna", pincode: "800001" },
    pricing: { basePrice: 95, finalPrice: 95, taxPercent: 18 },
    status: "open",
    save: async (options) => {
      assert.equal(active, true);
      assert.equal(options.session, session);
    },
  };
  const handler = await load(
    "../app/api/service-provider/booking-requests/[id]/accept/route.ts",
    {
      ...scoped,
      mongoose: { startSession: async () => session },
      "@/lib/service-provider": {
        requireProvider: async () => ({
          user: { _id: id("7") },
          provider: {
            _id: id("9"),
            ownerId: id("7"),
            companyName: "Fixture",
            status: "active",
            verificationStatus: "verified",
            onboardingCompletedAt: new Date(),
            coverageVersion: 1,
            coverageAreas: [
              { city: "Patna", pincode: "800001", isActive: true },
            ],
          },
        }),
      },
      "@/lib/marketplace-policy.mjs": { legacyCoverage, servesLocation },
      "@/lib/booking-eligibility": {
        confirmMarketplaceEligibility: async (
          providerId,
          offeringId,
          address,
          passedSession,
        ) => {
          assert.equal(active, true);
          assert.equal(passedSession, session);
          assert.equal(providerId, id("9"));
          assert.equal(offeringId, id("8"));
          assert.equal(address.city, "Patna");
          return {
            status: "matched",
            requiresProviderConfirmation: false,
            assessedAt: new Date(),
            addressIdentity: requestCoverage.destinationIdentity(address),
          };
        },
      },
      "@/lib/auth": { ApiAuthError: ApiError },
      "@/models/ServiceOffering": { exists: () => chain(true) },
      "@/models/ServiceRequest": {
        findOne: (filter) => {
          assert.equal(filter.serviceProviderId, id("9"));
          assert.equal(filter.status, "open");
          return chain(request.status === "open" ? request : null);
        },
      },
      "@/models/booking": {
        create: async (values, options) => {
          assert.equal(active, true);
          assert.equal(options.session, session);
          assert.deepEqual(values[0].pricing, request.pricing);
          assert.deepEqual(values[0].address, request.address);
          creates++;
          return [{ ...values[0], _id: id("6") }];
        },
      },
      "@/models": {
        Customer: { findById: () => chain({ userId: { _id: id("1") } }) },
      },
      "@/lib/notify-events": {
        notifyBookingAccepted: async () => {
          assert.equal(active, false);
        },
      },
    },
  );
  const accept = () =>
    handler.POST(
      new Request("http://test", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: id("1") }) },
    );
  assert.equal((await accept()).status, 200);
  assert.equal(request.status, "booked");
  assert.equal(creates, 1);
  assert.equal((await accept()).status, 404);
  assert.equal(creates, 1);
});
test("real Socket.IO authenticates encrypted sessions and rechecks room/job ownership", async (t) => {
  process.env.NEXTAUTH_SECRET =
    "isolated-test-session-secret-not-a-deployment-value";
  process.env.NEXTAUTH_URL = "http://127.0.0.1";
  const objectId = (value) => new mongoose.Types.ObjectId(id(value));
  const a = { _id: objectId("1"), role: "customer", name: "Customer A" },
    b = { _id: objectId("2"), role: "customer", name: "Customer B" },
    pro = { _id: objectId("3"), role: "technician", name: "Pro" };
  const conversation = {
    _id: objectId("4"),
    type: "job",
    jobId: objectId("5"),
    participants: [a, b, pro].map((user) => ({ userId: user._id })),
  };
  const users = [a, b, pro];
  const records = {
    conversations: [conversation],
    jobs: [
      {
        _id: objectId("5"),
        bookingId: objectId("6"),
        technicianId: objectId("7"),
      },
    ],
    bookings: [{ _id: objectId("6"), customerId: objectId("8") }],
    technicians: [{ _id: objectId("7"), userId: pro._id }],
    customers: [{ _id: objectId("8"), userId: a._id }],
    users,
  };
  const database = async () => ({
    collection: (name) => ({
      findOne: async (filter) =>
        records[name].find(
          (row) =>
            String(row._id) === String(filter._id) && row.isActive !== false,
        ) || null,
      find: (filter) => ({
        toArray: async () =>
          users.filter(
            (user) =>
              user.isActive !== false &&
              filter._id.$in.some(
                (value) => String(value) === String(user._id),
              ),
          ),
      }),
    }),
  });
  const http = createServer();
  const io = new Server(http);
  installSocketSecurity(io, { database });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${http.address().port}`;
  const sockets = [];
  t.after(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await io.close();
  });
  async function connect(user, options = {}) {
    const token = options.noCookie
      ? null
      : await encode({
          token: { id: String(user._id), role: "admin" },
          secret: process.env.NEXTAUTH_SECRET,
          maxAge: options.expired ? -1 : 60,
        });
    const socket = client(url, {
      transports: ["websocket"],
      reconnection: false,
      auth: { user: { _id: String(a._id), role: "admin" } },
      extraHeaders: token ? { Cookie: `next-auth.session-token=${token}` } : {},
    });
    sockets.push(socket);
    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
    return socket;
  }
  await assert.rejects(
    connect(a, { noCookie: true }),
    /Authentication required/,
  );
  await assert.rejects(
    connect(a, { expired: true }),
    /Authentication required/,
  );
  const socketA = await connect(a),
    socketB = await connect(b),
    socketPro = await connect(pro);
  const join = (socket) =>
    socket.timeout(2000).emitWithAck("conversation:join", {
      conversationId: String(conversation._id),
    });
  assert.equal(
    (await join(socketB)).ok,
    false,
    "forged persisted participant is not the actual booking owner",
  );
  assert.equal((await join(socketA)).ok, true);
  assert.equal((await join(socketPro)).ok, true);
  assert.equal(
    (await socketA.timeout(2000).emitWithAck("conversation:join", null)).ok,
    false,
  );
  socketA.emit("typing:start", null);
  socketA.emit("conversation:leave", null);
  assert.equal(
    (await join(socketA)).ok,
    true,
    "malformed events do not break the connection",
  );
  const seenA = [],
    seenPro = [];
  socketA.on("message:new", (value) => seenA.push(value));
  socketPro.on("message:new", (value) => seenPro.push(value));
  await io.emitAuthorizedConversation(String(conversation._id), "message:new", {
    text: "First",
  });
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(seenA.length, 1);
  assert.equal(seenPro.length, 1);
  records.technicians[0].userId = b._id;
  await io.emitAuthorizedConversation(String(conversation._id), "message:new", {
    text: "After reassignment",
  });
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(seenA.length, 2);
  assert.equal(
    seenPro.length,
    1,
    "old Pro receives no content before periodic membership cleanup",
  );
  a.isActive = false;
  assert.equal((await join(socketA)).ok, false);
  assert.equal(canReadConversation(b, null), false);
});
