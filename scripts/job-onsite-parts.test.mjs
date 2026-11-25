import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFinanceFixture, fixtureId } from "./helpers/finance-fixture.mjs";

function setup() {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.table("Invoice").length = 0;
  const job = () => f.table("Job")[0];
  Object.assign(job(), {
    status: "in_progress",
    proofRequired: false,
    partsUsed: [],
  });
  delete job().invoiceId;
  f.table("Booking")[0].pricing = {
    basePrice: 499,
    finalPrice: 449,
    discountAmount: 50,
    taxPercent: 18,
    offerName: "Original offer",
  };
  f.auth.requireRole = async (roles) => {
    const user = await f.auth.requireCurrentUser();
    if (!roles.includes(user.role))
      throw new f.auth.ApiAuthError("Forbidden", 403);
    return { user };
  };
  const notices = f.load("lib/notify-events.ts");
  const responses = f.load("lib/api-response.ts");
  const boundaries = {
    "@/lib/api-response": {
      ...responses,
      apiFailure(error) {
        f.state.lastApiError = error;
        return responses.apiFailure(error);
      },
    },
    "@/lib/technician": {
      async requireTechnicianProfile() {
        const user = await f.auth.requireCurrentUser();
        if (user.role !== "technician")
          throw new f.auth.ApiAuthError("Pro required", 403);
        const tech = await f.models.Technician.findOne({
          userId: user._id,
          isActive: { $ne: false },
        });
        if (!tech) throw new f.auth.ApiAuthError("Active Pro required", 403);
        return { user, tech };
      },
    },
    "@/lib/notify-events": notices,
    "@/lib/notification-recipients": {
      getJobNotificationRecipients: async () => ({
        customerUserId: String(ids.customerActor._id),
        providerUserId: String(ids.owner._id),
      }),
    },
  };
  const parts = f.load(
    "app/api/technician/jobs/[id]/parts/route.ts",
    boundaries,
  );
  const edit = f.load(
    "app/api/technician/jobs/[id]/parts/[partIndex]/route.ts",
    boundaries,
  );
  const complete = f.load(
    "app/api/technician/jobs/[id]/complete/route.ts",
    boundaries,
  );
  const context = (partId) => ({
    params: Promise.resolve({ id: String(ids.jobId), partIndex: partId }),
  });
  const call = (
    handler,
    body,
    actor = ids.techActor,
    partId,
    method = "POST",
  ) => {
    f.state.actor = actor;
    return handler(f.request("/api/fixture", body, method), context(partId));
  };
  const add = (input = {}, actor = ids.techActor) =>
    call(
      parts.POST,
      {
        requestId: randomUUID(),
        partName: "Fixture fitting",
        qty: 2,
        price: 125,
        ...input,
      },
      actor,
    );
  const finish = (input = {}, actor = ids.techActor) =>
    call(complete.POST, { paymentMode: "servizato_online", ...input }, actor);
  return { f, ids, job, add, finish, call, parts, edit, context, boundaries };
}

test("assigned Pro parts update the saved running bill and retry once without a pending quote", async () => {
  const s = setup(),
    requestId = randomUUID();
  const first = await s.add({ requestId, note: "Existing fitting worn" });
  assert.equal(first.status, 200, await first.clone().text());
  const result = await first.json();
  assert.equal(result.runningBill.breakdown.rows.at(-1).amount, 824.82);
  assert.equal(result.runningBill.breakdown.items[0].unitPrice, 499);
  assert.equal(result.runningBill.breakdown.items[1].amount, 250);
  assert.equal(
    (await s.add({ requestId, note: "Existing fitting worn" })).status,
    200,
  );
  assert.equal(s.job().partsUsed.length, 1);
  assert.equal(s.job().partsVersion, 1);
  assert.equal(s.f.table("JobQuote").length, 0);
  assert.equal(s.f.table("JobPartEvent").length, 1);
  assert.equal(s.f.table("JobPartEvent")[0].actorRole, "technician");
  assert.equal(
    String(s.f.table("JobPartEvent")[0].actorId),
    String(s.ids.techActor._id),
  );
  assert.equal((await s.add({ requestId, qty: 3 })).status, 409);
});

test("part permissions reject unrelated roles, assignment changes, closed jobs and finalized invoices", async () => {
  for (const role of ["customerActor", "owner", "admin"]) {
    const s = setup();
    assert.equal((await s.add({}, s.ids[role])).status, 403, role);
    assert.equal(s.f.table("JobPartEvent").length, 0);
  }
  for (const state of [
    "arrived",
    "otp_verified",
    "on_hold",
    "completed",
    "cancelled",
  ]) {
    const s = setup();
    s.job().status = state;
    assert.equal((await s.add()).status, 409, state);
  }
  for (const change of [
    (s) => {
      s.job().technicianId = fixtureId(202);
    },
    (s) => {
      s.f.table("Booking")[0].status = "cancelled";
    },
    (s) => {
      s.f.table("Booking")[0].serviceProviderId = fixtureId(203);
    },
    (s) => {
      s.f.table("Technician")[0].isActive = false;
    },
    (s) => {
      s.f
        .table("Invoice")
        .push({ _id: s.ids.invoiceId, jobId: s.ids.jobId, status: "issued" });
    },
  ]) {
    const s = setup();
    change(s);
    assert.ok([403, 404, 409].includes((await s.add()).status));
    assert.equal(s.f.table("JobPartEvent").length, 0);
  }
});

test("catalog prices come from the master and manual parts retain quantity and price validation", async () => {
  const s = setup(),
    id = fixtureId(301);
  s.f
    .table("PriceItem")
    .push({
      _id: id,
      name: "Catalog washer",
      itemType: "part",
      isActive: true,
      price: 75,
    });
  assert.equal((await s.add({ priceItemId: id, price: 1 })).status, 409);
  assert.equal(
    (await s.add({ priceItemId: id, partName: "Spoofed name", price: 75 }))
      .status,
    200,
  );
  assert.equal(s.job().partsUsed[0].partName, "Catalog washer");
  assert.equal(s.job().partsUsed[0].price, 75);
  for (const invalid of [
    { qty: 0 },
    { qty: -1 },
    { price: -1 },
    { price: 1.001 },
    { partName: "" },
    { chargeType: "labour" },
    { amount: 1 },
  ]) {
    assert.equal((await s.add(invalid)).status, 400);
  }
});

test("quantity changes and removals are versioned and append old and new line snapshots", async () => {
  const s = setup();
  await s.add();
  const partId = s.job().partsUsed[0].partId;
  const requestId = randomUUID();
  assert.equal(
    (
      await s.call(
        s.edit.PATCH,
        { requestId, expectedVersion: 1, qty: 3 },
        s.ids.techActor,
        partId,
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await s.call(
        s.edit.PATCH,
        { requestId, expectedVersion: 1, qty: 3 },
        s.ids.techActor,
        partId,
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(s.job().partsUsed[0].qty, 3);
  assert.equal(s.f.table("JobPartEvent")[1].before.qty, 2);
  assert.equal(s.f.table("JobPartEvent")[1].after.lineTotal, 375);
  assert.equal(
    (
      await s.call(
        s.edit.DELETE,
        { requestId: randomUUID(), expectedVersion: 1 },
        s.ids.techActor,
        partId,
        "DELETE",
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await s.call(
        s.edit.DELETE,
        { requestId: randomUUID(), expectedVersion: 2 },
        s.ids.techActor,
        partId,
        "DELETE",
      )
    ).status,
    200,
  );
  assert.equal(s.job().partsUsed.length, 0);
  assert.equal(s.f.table("JobPartEvent").length, 3);
  assert.equal(s.f.table("JobPartEvent")[2].totalAfter, 529.82);
});

test("concurrent additions share the booking transaction and keep one existing draft synchronized", async () => {
  const s = setup();
  s.f
    .table("Invoice")
    .push({
      _id: s.ids.invoiceId,
      invoiceNumber: "ONSITE-DRAFT",
      currency: "INR",
      jobId: s.ids.jobId,
      bookingId: s.ids.bookingId,
      customerId: s.ids.customerId,
      status: "draft",
      items: [],
      amountPaid: 0,
    });
  const key = randomUUID();
  const responses = await Promise.all([
    s.add({ requestId: key }),
    s.add({ requestId: key }),
    s.add({ price: 50, qty: 1 }),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200, 200],
  );
  assert.equal(s.job().partsUsed.length, 2);
  assert.equal(s.f.table("Invoice").length, 1);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 883.82);
  assert.equal(s.f.table("JobPartEvent").length, 2);
  assert.equal((await s.finish()).status, 200, s.f.state.lastApiError?.stack);
  assert.equal(s.f.table("Invoice").length, 1);
  assert.equal(s.f.table("Invoice")[0].status, "issued");
  assert.equal(s.f.table("Invoice")[0].grandTotal, 883.82);
});

test("pending provider revisions stay pending when on-site parts are added, while approved provider labour remains in the bill", async () => {
  const s = setup();
  const quotes = s.f.load("lib/job-quotes.ts");
  const command = {
    requestId: randomUUID(),
    charges: [
      {
        chargeType: "labour",
        description: "Extra repair",
        qty: 1,
        unitPrice: 100,
      },
    ],
    partsDraftVersion: 0,
    expectedVersion: 0,
  };
  await quotes.submitJobQuote(
    String(s.ids.jobId),
    s.ids.providerId,
    s.ids.owner._id,
    command,
  );
  assert.equal((await s.add()).status, 200);
  assert.equal(s.f.table("JobQuote")[0].status, "pending_customer_approval");
  assert.equal((await s.finish()).status, 409);
  await quotes.decideJobQuote(
    String(s.ids.bookingId),
    s.ids.customerActor._id,
    { version: 1, decision: "approve" },
  );
  assert.equal((await s.finish()).status, 200);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 942.82);
  assert.equal(s.f.table("Invoice")[0].items.length, 3);
});

test("part audit and invoice failures roll back the service, totals, completion counter and payment reports", async () => {
  const s = setup();
  s.f.state.fail = "JobPartEvent.create";
  assert.equal((await s.add()).status, 500);
  assert.equal(s.job().partsUsed.length, 0);
  await s.add();
  s.f.state.fail = "Invoice.create";
  assert.equal((await s.finish()).status, 500);
  assert.equal(s.job().status, "in_progress");
  assert.equal(s.job().finalQuote, undefined);
  assert.equal(s.f.table("Invoice").length, 0);
  assert.equal(s.f.table("FinanceLedger").length, 0);
  assert.equal(s.f.table("Technician")[0].jobsCompleted || 0, 0);
  assert.equal((await s.finish()).status, 200);
  assert.equal((await s.finish()).status, 200);
  assert.equal(s.f.table("Invoice").length, 1);
  assert.equal(s.f.table("FinanceLedger").length, 1);
  assert.equal(s.f.table("Technician")[0].jobsCompleted, 1);
  assert.equal(s.f.table("Payment").length, 0);
});

test("pre-job scope increases keep customer approval and cannot use the on-site part exception", async () => {
  const s = setup();
  s.job().status = "assigned";
  const quotes = s.f.load("lib/job-quotes.ts");
  const proposal = await quotes.submitJobQuote(
    String(s.ids.jobId),
    s.ids.providerId,
    s.ids.owner._id,
    {
      requestId: randomUUID(),
      charges: [
        {
          chargeType: "labour",
          description: "Pre-job repair scope",
          qty: 1,
          unitPrice: 100,
        },
      ],
      partsDraftVersion: 0,
      expectedVersion: 0,
    },
  );
  assert.equal(proposal.quote.status, "pending_customer_approval");
  assert.equal((await s.add()).status, 409);
  await quotes.decideJobQuote(
    String(s.ids.bookingId),
    s.ids.customerActor._id,
    { version: 1, decision: "approve" },
  );
  s.job().status = "in_progress";
  assert.equal((await s.add()).status, 200);
  assert.equal((await s.finish()).status, 200);
  assert.equal(s.f.table("Invoice")[0].grandTotal, 942.82);
});

test("customer and provider handlers expose the same saved bill and scope activity to the owning business", async () => {
  const s = setup();
  await s.add();
  const runtime = {
    ...s.boundaries,
    "next-auth": {
      getServerSession: async () => ({
        user: { id: String(s.ids.customerActor._id) },
      }),
    },
    "@/lib/auth-options": { authOptions: {} },
    "@/models/index": { Booking: s.f.models.Booking },
    "@/lib/service-provider": {
      requireServiceProvider: async () => ({
        provider: { _id: s.ids.providerId },
      }),
    },
    "@/models/jobProof": {
      find: () => ({
        sort() {
          return this;
        },
        lean: async () => [],
      }),
    },
  };
  const customer = s.f.load("app/api/customer/bookings/[id]/route.ts", runtime);
  s.f.state.actor = s.ids.customerActor;
  const customerResult = await customer.GET(
    new Request("http://fixture.test/booking"),
    { params: Promise.resolve({ id: String(s.ids.bookingId) }) },
  );
  assert.equal(customerResult.status, 200, await customerResult.clone().text());
  const customerBody = await customerResult.json();
  const provider = s.f.load(
    "app/api/service-provider/assigned-jobs/[id]/route.ts",
    runtime,
  );
  const providerResult = await provider.GET(
    new Request("http://fixture.test/job"),
    s.context(),
  );
  assert.equal(providerResult.status, 200, await providerResult.clone().text());
  const providerBody = await providerResult.json();
  assert.deepEqual(customerBody.runningBill, providerBody.runningBill);
  assert.equal(providerBody.partsActivity.length, 1);
  const outsider = s.f.load(
    "app/api/service-provider/assigned-jobs/[id]/route.ts",
    {
      ...runtime,
      "@/lib/service-provider": {
        requireServiceProvider: async () => ({
          provider: { _id: fixtureId(999) },
        }),
      },
    },
  );
  assert.equal(
    (await outsider.GET(new Request("http://fixture.test/job"), s.context()))
      .status,
    404,
  );
});

test("online completion enables the existing server checkout without fabricating customer approval, and disputes still block it", async () => {
  const s = setup();
  await s.add();
  await s.finish();
  const invoice = await s.f.models.Invoice.findOne({ jobId: s.ids.jobId });
  const row = s.f.table("FinanceLedger")[0];
  assert.equal(row.billState, "pending");
  assert.equal(row.confirmedBy, undefined);
  const { invoiceCanStartCheckout } = s.f.load("lib/invoice-online-payment.ts");
  assert.equal(await invoiceCanStartCheckout(invoice), true);
  const due = Math.round(invoice.balanceDue * 100);
  assert.equal(due, 82482);
  const { billAction } = s.f.load("lib/finance-ledger.ts");
  await billAction(String(invoice._id), s.ids.customerActor, {
    action: "dispute",
    requestId: randomUUID(),
    invoiceVersion: 1,
    reason: "Fixture part quantity needs checking",
  });
  assert.equal(await invoiceCanStartCheckout(invoice), false);
});

test("cash and direct UPI completion record the team report and require the existing customer confirmation", async () => {
  for (const paymentMode of ["cash", "direct_upi"]) {
    const s = setup();
    await s.add();
    assert.equal(
      (await s.finish({ paymentMode, collected: true })).status,
      200,
    );
    const invoice = await s.f.models.Invoice.findOne({ jobId: s.ids.jobId });
    assert.equal(invoice.amountPaid, 0);
    assert.equal(invoice.status, "issued");
    assert.equal(s.f.table("Payment").length, 0);
    const { invoiceCanStartCheckout } = s.f.load(
      "lib/invoice-online-payment.ts",
    );
    assert.equal(await invoiceCanStartCheckout(invoice), false);
    const { billAction } = s.f.load("lib/finance-ledger.ts");
    await billAction(String(invoice._id), s.ids.customerActor, {
      action: "confirm",
      requestId: randomUUID(),
      invoiceVersion: 1,
      grossPaise: 82482,
      paymentMode,
      directPaymentReceived: true,
    });
    assert.equal(s.f.table("Payment").length, 1);
    assert.equal(s.f.table("Invoice")[0].status, "paid");
  }
});

test("verified online settlement releases the existing commission and payout amounts once", async () => {
  const s = setup();
  await s.add();
  await s.finish();
  const invoice = s.f.table("Invoice")[0];
  const { finalizeSuccessfulRazorpayPayment } = s.f.load(
    "lib/razorpay-payment.ts",
  );
  const payment = {
    invoiceId: String(invoice._id),
    orderId: "order_OnsiteFixture",
    paymentId: "pay_OnsiteFixture",
    paidAmountPaise: 82482,
    expectedAmountPaise: 82482,
    method: "card",
    source: "callback",
  };
  await finalizeSuccessfulRazorpayPayment(payment);
  assert.equal(
    (await finalizeSuccessfulRazorpayPayment({ ...payment, source: "webhook" }))
      .duplicate,
    true,
  );
  const row = s.f.table("FinanceLedger")[0];
  assert.equal(row.billState, "confirmed");
  assert.equal(row.paymentState, "paid");
  assert.equal(row.confirmedBy, undefined);
  const { ledgerBalances } = await import("../lib/finance-policy.mjs");
  const balances = ledgerBalances(row);
  assert.equal(balances.commissionEarnedPaise, 6990);
  assert.equal(balances.payoutWaitingPaise, 75492);
  assert.equal(s.f.table("Payment").length, 1);
  assert.equal(
    s.f
      .table("FinanceEvent")
      .filter((e) => e.kind === "bill_confirmed_by_online_payment").length,
    1,
  );
});

test("completion reuses a saved booking payment method and rejects a conflicting client method", async () => {
  const s = setup();
  s.f.table("Booking")[0].paymentMethod = "direct_upi";
  assert.equal(
    (await s.finish({ paymentMode: "servizato_online" })).status,
    409,
  );
  assert.equal((await s.finish({ paymentMode: undefined })).status, 200);
  assert.equal(s.f.table("Invoice")[0].paymentMethod, "direct_upi");
  assert.equal(s.f.table("Payment").length, 0);
});

test("provider activity renders the actor, quantities, amounts and time alongside the shared running bill", async () => {
  const s = setup();
  await s.add();
  const { JobPartsActivity } = s.f.load(
    "components/finance/JobPartsActivity.tsx",
  );
  const { RunningBillPanel } = s.f.load(
    "components/finance/RunningBillPanel.tsx",
  );
  const event = s.f.table("JobPartEvent")[0];
  const { jobRunningBill } = s.f.load("lib/job-running-bill.ts");
  const bill = await jobRunningBill(s.job(), s.f.table("Booking")[0]);
  const html = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(JobPartsActivity, {
        events: [
          {
            ...event,
            actorId: String(event.actorId),
            createdAt: event.createdAt.toISOString(),
          },
        ],
      }),
      React.createElement(RunningBillPanel, { bill }),
    ),
  );
  assert.match(html, /Fixture fitting/);
  assert.match(html, /Pro/);
  assert.match(html, /₹824\.82/);
  assert.match(html, /₹250\.00/);
  assert.match(html, /Running bill/);
  assert.doesNotMatch(html, /Approve revised quote/);
});
