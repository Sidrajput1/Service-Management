import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createFinanceFixture, fixtureId } from "./helpers/finance-fixture.mjs";

const oid = (number) => new mongoose.Types.ObjectId(fixtureId(number));
const request = (body, method = "POST") =>
  new Request("http://phase-one.test/api", {
    method,
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
const params = (id) => ({ params: Promise.resolve({ id: String(id) }) });
const providerQuotePath =
  "app/api/service-provider/assigned-jobs/[id]/quote/route.ts";
const decisionPath = "app/api/customer/bookings/[id]/quote/route.ts";
const staffAssignPath = "app/api/jobs/[id]/assign/route.ts";
const providerAssignPath =
  "app/api/service-provider/bookings/[id]/assign-technician/route.ts";
const completePath = "app/api/technician/jobs/[id]/complete/route.ts";
const orderPath = "app/api/invoices/[id]/razorpay/order/route.ts";
const charge = (unitPrice = 650, chargeType = "part") => ({
  chargeType,
  description: chargeType === "labour" ? "Repair labour" : "Replacement part",
  qty: 1,
  unitPrice,
});
const draft = (charges, expectedVersion = 0, partsDraftVersion = 0) => ({
  requestId: randomUUID(),
  charges,
  expectedVersion,
  partsDraftVersion,
  reason: "Fixture scope explanation",
});
function setup() {
  const f = createFinanceFixture();
  const ids = f.seed();
  f.table("Invoice").length = 0;
  const job = f.table("Job")[0],
    booking = f.table("Booking")[0];
  delete job.invoiceId;
  job.status = "in_progress";
  job.scheduledAt = new Date("2027-01-15T04:30:00Z");
  job.scheduledEndAt = new Date("2027-01-15T06:30:00Z");
  booking.pricing = {
    basePrice: 350,
    discountAmount: 51,
    finalPrice: 299,
    taxPercent: 18,
  };
  const messages = f.state.notifications;
  let orders = 0;
  const notices = f.load("lib/notify-events.ts");
  const auth = {
    ...f.auth,
    async requireRole(roles) {
      const user = await f.auth.requireCurrentUser();
      if (!roles.includes(user.role))
        throw new f.auth.ApiAuthError("Forbidden", 403);
      return { user };
    },
  };
  const gateway = {
    ...f.gateway,
    async createRazorpayOrder({ amountPaise, currency }) {
      orders++;
      return { id: "order_fixture", amount: amountPaise, amount_due: amountPaise, currency, status: "created" };
    },
  };
  const route = (path, actor) =>
    f.load(path, {
      "@/lib/auth": auth,
      "@/lib/finance-security": {
        ...f.load("lib/finance-security.ts"),
        assertFinanceWrite: () => {},
      },
      "@/lib/technician": {
        requireTechnicianProfile: async () => {
          const user = await auth.requireCurrentUser();
          const tech = await f.models.Technician.findOne({
            userId: user._id,
            isActive: true,
          });
          if (user.role !== "technician" || !tech)
            throw new f.auth.ApiAuthError("Forbidden", 403);
          return { user, tech };
        },
      },
      "@/lib/notify-events": notices,
      "@/lib/notification-recipents": {
        getJobNotificationRecipients: async () => ({
          customerUserId: String(ids.customerActor._id),
          providerUserId: String(ids.owner._id),
        }),
      },
      "@/lib/razorpay": gateway,
      "@/lib/service-provider": {
        requireProvider: async () => {
          if (actor?.role !== "service_provider")
            throw new f.auth.ApiAuthError("Forbidden", 403);
          const provider = await f.models.ServiceProvider.findOne({
            ownerId: actor._id,
          });
          if (!provider)
            throw new f.auth.ApiAuthError("Provider not found", 404);
          return { user: actor, provider };
        },
      },
      "@/lib/customer": {
        requireCustomerProfile: async () => {
          if (actor?.role !== "customer")
            throw new f.auth.ApiAuthError("Forbidden", 403);
          return { user: actor };
        },
      },
    });
  function post(path, id, actor, body = {}) {
    f.state.actor = actor;
    return route(path, actor).POST(request(body), params(id));
  }
  return {
    f,
    ids,
    messages,
    orders: () => orders,
    post,
    job: () =>
      f.table("Job").find((row) => String(row._id) === String(ids.jobId)),
    submit: (input, actor = ids.owner) =>
      post(providerQuotePath, ids.jobId, actor, input),
    decide: (version, decision, actor = ids.customerActor) =>
      post(decisionPath, ids.bookingId, actor, { version, decision }),
    complete: () => post(completePath, ids.jobId, ids.techActor, { paymentMode: "servizato_online" }),
  };
}

test("quote breakdown reuses booked GST and the applied discount; approved pricing controls completion, checkout, finance and commission", async () => {
  const s = setup();
  const proposal = draft([charge()]);
  const submitted = await s.submit(proposal);
  assert.equal(submitted.status, 200);
  const { quote } = await submitted.json();
  assert.equal(quote.status, "pending_customer_approval");
  assert.equal(quote.previousApprovedAmount, 352.82);
  assert.equal(quote.pricing.serviceBeforeDiscount, 350);
  assert.equal(quote.pricing.discountAmount, 51);
  assert.equal(quote.pricing.taxableAmount, 949);
  assert.equal(quote.pricing.taxAmount, 170.82);
  assert.equal(quote.pricing.grandTotal, 1119.82);
  assert.equal(quote.delta, 767);
  assert.equal((await (await s.submit(proposal)).json()).duplicate, true);
  assert.equal(s.f.table("JobQuote").length, 1);
  assert.equal(
    s.messages.filter((row) => row.pushEvent === "quote_update").length,
    1,
  );
  assert.equal((await s.complete()).status, 409);
  assert.equal(s.job().status, "in_progress");
  assert.equal(s.f.table("Invoice").length, 0);
  assert.equal((await s.decide(1, "approve")).status, 200);
  assert.equal((await (await s.decide(1, "approve")).json()).duplicate, true);
  assert.equal((await s.decide(1, "reject")).status, 409);
  assert.equal(s.f.table("Invoice").length, 0);
  assert.equal(
    s.messages.filter((row) => row.pushEvent === "quote_update").length,
    2,
  );
  assert.equal((await s.complete()).status, 200);
  assert.equal((await s.complete()).status, 200);
  const [invoice] = s.f.table("Invoice");
  assert.equal(s.f.table("Invoice").length, 1);
  assert.equal(invoice.grandTotal, 1119.82);
  assert.equal(invoice.discountAmount, 51);
  assert.equal(invoice.items.at(-1).description, "Replacement part");
  const [ledger] = s.f.table("FinanceLedger");
  assert.equal(ledger.grossPaise, 111982);
  assert.equal(ledger.eligiblePaise, 94900);
  assert.equal(ledger.commissionPaise, 9490);
  const order = await s.post(orderPath, invoice._id, s.ids.customerActor);
  assert.equal(order.status, 200);
  assert.equal((await order.json()).order.amount, 111982);
  assert.equal(s.orders(), 1);
});

test("quote ownership, supersession and opposing customer decisions preserve immutable history", async () => {
  const s = setup();
  const outsider = { _id: oid(201), role: "customer" };
  s.f
    .table("Customer")
    .push({ _id: oid(202), userId: outsider._id, name: "Different customer" });
  const rival = { _id: oid(203), role: "service_provider" };
  s.f.table("ServiceProvider").push({ _id: oid(204), ownerId: rival._id });
  assert.equal((await s.submit(draft([charge()]), rival)).status, 404);
  assert.equal(
    (await s.submit(draft([charge()]), s.ids.techActor)).status,
    403,
  );
  assert.equal((await s.submit(draft([charge()]))).status, 200);
  assert.equal((await s.decide(1, "approve", outsider)).status, 404);
  assert.equal((await s.decide(1, "approve", s.ids.owner)).status, 403);
  assert.equal((await s.submit(draft([charge(25, "labour")], 1))).status, 200);
  assert.equal((await s.decide(1, "approve")).status, 409);
  const results = await Promise.all([
    s.decide(2, "approve"),
    s.decide(2, "reject"),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const [old, current] = s.f.table("JobQuote");
  assert.equal(old.status, "superseded");
  assert.equal(old.pricing.grandTotal, 1119.82);
  assert.equal(current.pricing.items[1].chargeType, "labour");
  assert.equal(String(current.decidedBy), String(s.ids.customerActor._id));
});

test("a rejected quote leaves the previous authorized amount billable and does not cancel or charge", async () => {
  const s = setup();
  await s.submit(draft([charge(100)]));
  await s.decide(1, "approve");
  await s.submit(draft([charge(200)], 1));
  assert.equal((await s.decide(2, "reject")).status, 200);
  assert.equal(s.f.table("Invoice").length, 0);
  assert.equal(s.f.table("Booking")[0].status, "assigned");
  assert.equal((await s.complete()).status, 200);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 470.82);
});

test("within-limit revision preserves the last explicit baseline and later above-limit scope requires a new decision", async () => {
  const s = setup();
  await s.submit(draft([charge(100)]));
  await s.decide(1, "approve");
  const lower = (await (await s.submit(draft([charge(50)], 1))).json()).quote;
  assert.equal(lower.approvalSource, "within_approved_total");
  assert.equal(lower.previousApprovedAmount, 470.82);
  const higher = (await (await s.submit(draft([charge(101)], 2))).json()).quote;
  assert.equal(higher.status, "pending_customer_approval");
  assert.equal(higher.previousApprovedAmount, 470.82);
  assert.equal(higher.delta, 1.18);
});

test("transaction rollback retains prior pending revision and notification failure cannot undo a new quote or decision", async () => {
  const s = setup();
  await s.submit(draft([charge(10)]));
  s.f.state.fail = "JobQuote.create";
  assert.equal((await s.submit(draft([charge(20)], 1))).status, 500);
  assert.equal(s.f.table("JobQuote").length, 1);
  assert.equal(s.f.table("JobQuote")[0].status, "pending_customer_approval");
  assert.equal(s.job().quoteVersion, 1);
  s.f.state.notificationsFail = true;
  const command = draft([charge(20)], 1);
  assert.equal((await s.submit(command)).status, 200);
  s.f.state.fail = "Job.save";
  assert.equal((await s.decide(2, "approve")).status, 500);
  assert.equal(s.f.table("JobQuote")[1].status, "pending_customer_approval");
  assert.equal((await s.decide(2, "approve")).status, 200);
  assert.equal(s.f.table("JobQuote")[1].status, "approved");
  s.f.state.notificationsFail = false;
  assert.equal((await s.decide(2, "approve")).status, 200);
  assert.equal(
    s.messages.filter((row) => row.title === "Revised quote approved").length,
    1,
  );
});

test("skipping the provider review or editing draft parts after submission blocks completion and stale approval", async () => {
  const s = setup();
  const legacyDraft = (partName, price) => {
    s.job().partsUsed = [...(s.job().partsUsed ?? []), { partName, qty: 1, price }];
    s.job().partsDraftVersion = (s.job().partsDraftVersion ?? 0) + 1;
  };
  legacyDraft("Proposed fitting", 100);
  assert.equal((await s.complete()).status, 409);
  assert.equal((await s.submit(draft([charge(100)], 0, 0))).status, 409);
  assert.equal((await s.submit(draft([charge(100)], 0, 1))).status, 200);
  legacyDraft("Proposed fastener", 50);
  assert.equal((await s.decide(1, "approve")).status, 409);
  assert.equal((await s.decide(1, "reject")).status, 200);
  assert.equal((await s.complete()).status, 409);
  assert.equal((await s.submit(draft([], 1, 2))).status, 200);
  assert.equal((await s.complete()).status, 200);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 352.82);
});

test("staff draft and checkout paths cannot turn an unapproved amount into an issued invoice or payment request", async () => {
  const s = setup();
  await s.submit(draft([charge()]));
  const id = oid(231);
  const fromJob = "app/api/invoices/from-job/route.ts";
  const finalize = "app/api/invoices/[id]/finalize/route.ts";
  assert.equal(
    (
      await s.post(fromJob, s.ids.jobId, s.ids.admin, {
        jobId: String(s.ids.jobId),
      })
    ).status,
    409,
  );
  s.f.table("Invoice").push({
    _id: id,
    invoiceNumber: "CONTROLLED-DRAFT",
    status: "draft",
    currency: "INR",
    jobId: s.ids.jobId,
    bookingId: s.ids.bookingId,
    customerId: s.ids.customerId,
    items: [],
    amountPaid: 0,
    grandTotal: 1119.82,
    balanceDue: 1119.82,
  });
  assert.equal((await s.post(finalize, id, s.ids.admin)).status, 409);
  s.f.table("Invoice")[0].status = "issued";
  assert.equal((await s.post(orderPath, id, s.ids.customerActor)).status, 409);
  assert.equal(s.orders(), 0);
  const direct = s.f.load("lib/finance-ledger.ts");
  await assert.rejects(
    direct.billAction(String(id), s.ids.techActor, {
      action: "submit",
      requestId: randomUUID(),
      invoiceVersion: 1,
      paymentMode: "direct_upi",
      collectedPaise: 111982,
    }),
    (error) => error.status === 409,
  );
  s.f.table("Invoice")[0].status = "draft";
  await s.decide(1, "reject");
  assert.equal((await s.complete()).status, 200);
  assert.equal((await s.post(finalize, id, s.ids.admin)).status, 200);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 352.82);
  assert.equal(s.f.table("Invoice")[0].items.length, 1);
});

function scheduleSetup() {
  const s = setup();
  s.f.table("Booking").length = 0;
  s.f.table("Job").length = 0;
  const pro = s.f.table("Technician")[0];
  pro.skillKeys = ["plumbing"];
  const addBooking = (n, start, { makeJob = false, ...fields } = {}) => {
    const booking = {
      _id: oid(n),
      serviceProviderId: s.ids.providerId,
      customerId: s.ids.customerId,
      serviceOfferingId: s.ids.offeringId,
      serviceType: "Test service",
      requiredSkillKeys: ["plumbing"],
      status: "confirmed",
      scheduledAt: start ? new Date(start) : undefined,
      commissionSnapshot: { state: "missing_policy" },
      ...fields,
    };
    s.f.table("Booking").push(booking);
    if (makeJob)
      s.f.table("Job").push({
        _id: oid(n + 100),
        bookingId: booking._id,
        serviceProviderId: booking.serviceProviderId,
        status: "scheduled",
      });
    return booking;
  };
  const providerAssign = (booking, end, technicianId = s.ids.techId) =>
    s.post(providerAssignPath, booking._id, s.ids.owner, {
      technicianId: String(technicianId),
      scheduledEndAt: end,
    });
  const staffAssign = (booking, end, technicianId = s.ids.techId) =>
    s.post(
      staffAssignPath,
      oid(Number.parseInt(String(booking._id), 16) + 100),
      { ...s.ids.admin, role: "dispatcher" },
      {
        technicianId: String(technicianId),
        scheduledEndAt: end,
      },
    );
  return { ...s, pro, addBooking, providerAssign, staffAssign };
}

test("provider and staff can assign a busy Pro on different days, adjacent slots and non-overlapping times", async () => {
  const s = scheduleSetup();
  const a = s.addBooking(11, "2027-01-15T10:00:00+05:30");
  const b = s.addBooking(12, "2027-01-17T10:00:00+05:30", { makeJob: true });
  const c = s.addBooking(13, "2027-01-17T15:00:00+05:30");
  const adjacent = s.addBooking(14, "2027-01-17T06:30:00Z");
  assert.equal(
    (await s.providerAssign(a, "2027-01-15T12:00:00+05:30")).status,
    200,
  );
  assert.equal(
    (await s.staffAssign(b, "2027-01-17T12:00:00+05:30")).status,
    200,
  );
  assert.equal(
    (await s.providerAssign(c, "2027-01-17T17:00:00+05:30")).status,
    200,
  );
  assert.equal(
    (await s.providerAssign(adjacent, "2027-01-17T07:30:00Z")).status,
    200,
  );
  assert.equal(
    s.f.table("Job").filter((job) => job.status === "assigned").length,
    4,
  );
  assert.equal(s.f.table("Technician")[0].status, "busy");
});

test("overlap, leave, incomplete times and orphaned confirmed reservations fail safely", async () => {
  const s = scheduleSetup();
  const held = s.addBooking(11, "2027-01-17T10:00:00+05:30");
  const overlap = s.addBooking(12, "2027-01-17T11:00:00+05:30", {
    makeJob: true,
  });
  const unknown = s.addBooking(13, "2027-01-20T10:00:00+05:30");
  const next = s.addBooking(14, "2027-01-21T10:00:00+05:30");
  assert.equal(
    (await s.providerAssign(held, "2027-01-17T12:00:00+05:30")).status,
    200,
  );
  assert.equal(
    (await s.staffAssign(overlap, "2027-01-17T13:00:00+05:30")).status,
    409,
  );
  assert.equal((await s.providerAssign(unknown)).status, 409);
  s.f.table("Technician")[0].status = "on_leave";
  assert.equal(
    (await s.providerAssign(next, "2027-01-21T12:00:00+05:30")).status,
    409,
  );
  s.f.table("Technician")[0].status = "busy";
  const orphan = s.addBooking(15, "2027-01-21T10:00:00+05:30", {
    technicianId: s.ids.techId,
    timeWindow: {
      from: new Date("2027-01-21T04:30:00Z"),
      to: new Date("2027-01-21T06:30:00Z"),
    },
  });
  assert.equal(
    (await s.providerAssign(next, "2027-01-21T12:00:00+05:30")).status,
    409,
  );
  s.f
    .table("Booking")
    .find((booking) => String(booking._id) === String(orphan._id)).status =
    "cancelled";
  const active = s.f
    .table("Job")
    .find((job) => String(job.bookingId) === String(held._id));
  delete active.scheduledEndAt;
  assert.equal(
    (await s.providerAssign(next, "2027-01-21T12:00:00+05:30")).status,
    409,
  );
  s.f
    .table("Job")
    .find((job) => String(job._id) === String(active._id)).status = "completed";
  assert.equal(
    (await s.providerAssign(next, "2027-01-21T12:00:00+05:30")).status,
    200,
  );
});

test("an overlapping provider and dispatcher request share the same reservation fence; another Pro can take the slot", async () => {
  const s = scheduleSetup();
  const a = s.addBooking(21, "2027-01-17T10:00:00+05:30");
  const b = s.addBooking(22, "2027-01-17T11:00:00+05:30", { makeJob: true });
  const other = s.addBooking(23, "2027-01-17T11:00:00+05:30");
  const end = "2027-01-17T13:00:00+05:30";
  const results = await Promise.all([
    s.providerAssign(a, end),
    s.staffAssign(b, end),
  ]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [200, 409],
  );
  assert.equal(s.f.table("Technician")[0].__v, 1);
  const secondPro = oid(77);
  s.f
    .table("Technician")
    .push({ ...s.f.table("Technician")[0], _id: secondPro, __v: 0 });
  assert.equal((await s.providerAssign(other, end, secondPro)).status, 200);
  assert.equal(
    s.f.table("Job").filter((job) => job.status === "assigned").length,
    2,
  );
});

test("dispatch can repair a legacy reservation without resetting the same Pro's locked code or workflow", async () => {
  const s = scheduleSetup();
  const legacy = s.addBooking(31, "2027-01-20T10:00:00+05:30", {
    makeJob: true,
    technicianId: s.ids.techId,
    status: "assigned",
  });
  Object.assign(s.f.table("Job")[0], {
    technicianId: s.ids.techId,
    status: "arrived",
    scheduledAt: legacy.scheduledAt,
    otpAttempts: 5,
    otpLockedAt: new Date("2027-01-20T05:00:00Z"),
    otpVersion: 7,
  });
  assert.equal(
    (await s.staffAssign(legacy, "2027-01-20T12:00:00+05:30")).status,
    200,
  );
  const [repaired] = s.f.table("Job");
  assert.equal(repaired.status, "arrived");
  assert.equal(
    repaired.scheduledEndAt.toISOString(),
    "2027-01-20T06:30:00.000Z",
  );
  assert.equal(repaired.otpAttempts, 5);
  assert.equal(repaired.otpVersion, 7);
});
