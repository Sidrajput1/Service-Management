import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import mongoose from "mongoose";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createFinanceFixture,
  fixtureId,
  clone,
} from "./helpers/finance-fixture.mjs";
import {
  financeIndexDefinitions,
  matchingFinanceIndex,
} from "../lib/finance-indexes.mjs";
const rid = () => randomUUID(),
  oid = (n) => new mongoose.Types.ObjectId(fixtureId(n));
async function readyCash(f, ids) {
  const ledger = f.load("lib/finance-ledger.ts");
  await ledger.billAction(String(ids.invoiceId), ids.techActor, {
    action: "submit",
    requestId: rid(),
    invoiceVersion: 1,
    paymentMode: "cash",
    collectedPaise: 100000,
  });
  await ledger.billAction(String(ids.invoiceId), ids.customerActor, {
    action: "confirm",
    requestId: rid(),
    invoiceVersion: 1,
    grossPaise: 100000,
    paymentMode: "cash",
    directPaymentReceived: true,
  });
  return f.table("FinanceLedger")[0];
}
test("actual finance Mongoose schemas enforce unique references, private ciphertext and explicit index deployment", () => {
  const f = createFinanceFixture(),
    models = f.load("models/finance.ts", { mongoose });
  for (const [name, model] of Object.entries(models)) {
    assert.equal(model.schema.options.autoIndex, false, name);
    assert.equal(model.schema.options.autoCreate, false, name);
  }
  assert.equal(
    models.ProviderPayoutProfile.schema.path("encrypted").options.select,
    false,
  );
  assert.equal(
    models.ProviderPayoutProfile.schema.path("accountNumber"),
    undefined,
  );
  assert.equal(
    models.ProviderPayoutProfile.schema.path("holderName"),
    undefined,
  );
  assert.ok(
    models.FinanceLedger.schema
      .indexes()
      .some(([key, options]) => key.invoiceId === 1 && options.unique),
  );
  assert.ok(
    models.FinanceEvent.schema
      .indexes()
      .some(([key, options]) => key.externalKey === 1 && options.unique),
  );
  const profile = new models.ProviderPayoutProfile({
    providerId: oid(1),
    method: "upi",
    masked: "f***@bank",
    encrypted: "ciphertext-fixture",
    version: 1,
    changedBy: oid(2),
  });
  assert.equal(profile.toJSON().encrypted, undefined);
  for (const [collection] of financeIndexDefinitions.filter(
    ([name]) => !["payments", "invoices", "notifications"].includes(name),
  ))
    assert.ok(
      Object.values(models).some(
        (model) => model.collection.name === collection,
      ),
      collection,
    );
});
test("index readiness compares unique/partial semantics rather than object key order", () => {
  const keys = { gateway: 1, gatewayTxnId: 1 },
    options = {
      unique: true,
      partialFilterExpression: {
        gateway: { $type: "string" },
        gatewayTxnId: { $type: "string" },
      },
    };
  assert.equal(
    matchingFinanceIndex(
      [
        {
          key: keys,
          unique: true,
          partialFilterExpression: {
            gatewayTxnId: { $type: "string" },
            gateway: { $type: "string" },
          },
        },
      ],
      keys,
      options,
    ),
    true,
  );
  assert.equal(
    matchingFinanceIndex(
      [
        {
          key: keys,
          unique: false,
          partialFilterExpression: options.partialFilterExpression,
        },
      ],
      keys,
      options,
    ),
    false,
  );
  assert.equal(
    matchingFinanceIndex([{ key: keys, unique: true }], keys, options),
    false,
  );
});
test("actual payout settings route derives the owner and masks encrypted details; body provider overrides are rejected", async () => {
  const old = process.env.PAYOUT_ENCRYPTION_KEY;
  process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 61).toString("base64");
  try {
    const f = createFinanceFixture(),
      ids = f.seed();
    f.state.actor = ids.owner;
    const route = f.load(
      "app/api/service-provider/finance/payout-details/route.ts",
    );
    const input = {
      method: "upi",
      holderName: "Private Fixture Name",
      upiId: "privatefixture@bank",
      expectedVersion: 0,
      requestId: rid(),
    };
    assert.equal(
      (
        await route.PUT(
          f.request(
            "/api/service-provider/finance/payout-details",
            input,
            "PUT",
          ),
        )
      ).status,
      200,
    );
    const read = await route.GET(),
      value = await read.json();
    assert.equal(value.profile.masked, "p***@bank");
    assert.equal(JSON.stringify(value).includes("privatefixture@bank"), false);
    assert.equal(JSON.stringify(value).includes("encrypted"), false);
    const response = await route.PUT(
      f.request(
        "/api/service-provider/finance/payout-details",
        {
          ...input,
          requestId: rid(),
          expectedVersion: 1,
          providerId: fixtureId(99),
        },
        "PUT",
      ),
    );
    assert.equal(response.status, 400);
    f.table("ServiceProvider").push({
      _id: oid(99),
      ownerId: oid(98),
      companyName: "Other business",
    });
    f.state.actor = { _id: oid(98), role: "service_provider" };
    assert.equal((await (await route.GET()).json()).profile, null);
  } finally {
    if (old === undefined) delete process.env.PAYOUT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ENCRYPTION_KEY = old;
  }
});
test("profile version updates retain encrypted prior details, reset review, and reject stale updates", async () => {
  const old = process.env.PAYOUT_ENCRYPTION_KEY;
  process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 62).toString("base64");
  try {
    const f = createFinanceFixture(),
      ids = f.seed(),
      ops = f.load("lib/finance-operations.ts");
    const input = {
      method: "upi",
      holderName: "Fixture owner",
      upiId: "firstfixture@bank",
      expectedVersion: 0,
      requestId: rid(),
    };
    await ops.savePayoutProfile(ids.owner, ids.providerId, input);
    const first = f.table("ProviderPayoutProfile")[0].encrypted;
    await ops.adminFinanceOperation(ids.admin, {
      action: "review_payout",
      requestId: rid(),
      providerId: String(ids.providerId),
      expectedVersion: 1,
      status: "verified",
      reason: "Initial details checked by administrator",
    });
    await ops.savePayoutProfile(ids.owner, ids.providerId, {
      ...input,
      requestId: rid(),
      expectedVersion: 1,
      upiId: "secondfixture@bank",
    });
    const profile = f.table("ProviderPayoutProfile")[0];
    assert.equal(profile.version, 2);
    assert.equal(profile.status, "pending");
    assert.equal(profile.reviewedBy, undefined);
    assert.equal(
      f
        .table("FinanceEvent")
        .find(
          (row) =>
            row.kind === "payout_details_changed" && row.details.version === 2,
        ).details.previousEncrypted,
      first,
    );
    await assert.rejects(
      ops.savePayoutProfile(ids.owner, ids.providerId, {
        ...input,
        requestId: rid(),
        expectedVersion: 1,
      }),
      (error) => error.status === 409,
    );
  } finally {
    if (old === undefined) delete process.env.PAYOUT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ENCRYPTION_KEY = old;
  }
});
test("actual Razorpay adapter disables all gateway reminders for commission links and sends integer server amounts", async () => {
  const keys = {
    id: process.env.RAZORPAY_KEY_ID,
    secret: process.env.RAZORPAY_KEY_SECRET,
    webhook: process.env.RAZORPAY_WEBHOOK_SECRET,
  };
  process.env.RAZORPAY_KEY_ID = "rzp_test_CONTROLLED";
  process.env.RAZORPAY_KEY_SECRET = "controlled-sdk-secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "controlled-webhook-secret";
  try {
    let sent;
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      sent = { url, body: JSON.parse(options.body) };
      return Response.json({
        id: "plink_AdapterFixture",
        short_url: "https://rzp.io/i/fixture",
      });
    };
    try {
      const f = createFinanceFixture(),
        adapter = f.load("lib/razorpay.ts");
      await adapter.createRazorpayPaymentLink({
        amountPaise: 12345,
        currency: "INR",
        description: "Commission collection",
        reference_id: "sc_controlled",
        suppressNotifications: true,
        expireBy: Math.floor(Date.now() / 1000) + 3600,
        notes: { purpose: "servizato_commission" },
      });
      assert.equal(sent.body.amount, 12345);
      assert.equal(sent.body.accept_partial, false);
      assert.equal(sent.body.reminder_enable, false);
      assert.deepEqual(sent.body.notify, { email: false, sms: false });
      assert.equal(sent.body.customer, undefined);
      assert.equal(sent.url, "https://api.razorpay.com/v1/payment_links");
      const raw = '{"event":"payment.captured"}',
        signature = createHmac("sha256", "controlled-webhook-secret")
          .update(raw)
          .digest("hex");
      assert.equal(
        adapter.verifyWebhookSignature({ rawBody: raw, signature }),
        true,
      );
      assert.equal(
        adapter.verifyWebhookSignature({ rawBody: raw + " ", signature }),
        false,
      );
      assert.equal(
        adapter.verifyWebhookSignature({ rawBody: raw, signature: "x" }),
        false,
      );
    } finally {
      globalThis.fetch = original;
    }
  } finally {
    for (const [name, value] of [
      ["RAZORPAY_KEY_ID", keys.id],
      ["RAZORPAY_KEY_SECRET", keys.secret],
      ["RAZORPAY_WEBHOOK_SECRET", keys.webhook],
    ])
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  }
});
test("actual webhook re-fetches captured funds, rejects forged/mismatched data, and only returns a minimal acknowledgement", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    route = f.load("app/api/webhooks/razorpay/route.ts");
  f.state.gatewayPayments.set("pay_Webhook", {
    id: "pay_Webhook",
    order_id: "order_InvoiceFixture",
    amount: 100000,
    currency: "INR",
    status: "captured",
    method: "upi",
  });
  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_Webhook",
          order_id: "order_InvoiceFixture",
          amount: 1,
          currency: "INR",
          notes: { invoiceId: String(ids.invoiceId) },
        },
      },
    },
  };
  const deliver = (eventId = "event_Fixture", data = payload) =>
    route.POST(
      f.request("/api/webhooks/razorpay", data, "POST", {
        "x-razorpay-signature": "controlled",
        "x-razorpay-event-id": eventId,
      }),
    );
  f.state.signatureValid = false;
  assert.equal((await deliver()).status, 400);
  assert.equal(f.table("Payment").length, 0);
  f.state.signatureValid = true;
  const first = await deliver();
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, processed: true });
  assert.equal(f.table("Payment")[0].amount, 1000);
  assert.equal((await (await deliver()).json()).duplicate, true);
  assert.equal(f.table("Payment").length, 1);
  assert.equal(
    (await deliver("event_Fixture", { ...payload, event: "payment.failed" }))
      .status,
    409,
  );
  assert.equal(
    JSON.stringify(f.table("WebhookEvent")).includes("notes"),
    false,
  );
});
test("webhook retries recover a failed accounting transaction; failed/pending events never mark an invoice paid", async () => {
  const f = createFinanceFixture();
  f.seed();
  const route = f.load("app/api/webhooks/razorpay/route.ts");
  f.state.gatewayPayments.set("pay_Retry", {
    id: "pay_Retry",
    order_id: "order_InvoiceFixture",
    amount: 100000,
    currency: "INR",
    status: "captured",
  });
  const body = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: "pay_Retry", order_id: "order_InvoiceFixture" },
      },
    },
  };
  const deliver = () =>
    route.POST(
      f.request("/api/webhooks/razorpay", body, "POST", {
        "x-razorpay-signature": "controlled",
        "x-razorpay-event-id": "event_Retry",
      }),
    );
  f.state.fail = "Payment.create";
  assert.equal((await deliver()).status, 500);
  assert.equal(f.table("WebhookEvent").length, 0);
  assert.equal(f.table("Invoice")[0].status, "issued");
  assert.equal((await deliver()).status, 200);
  assert.equal(f.table("Payment").length, 1);
  const failed = await route.POST(
    f.request(
      "/api/webhooks/razorpay",
      { event: "payment.failed", payload: {} },
      "POST",
      {
        "x-razorpay-signature": "controlled",
        "x-razorpay-event-id": "event_Failed",
      },
    ),
  );
  assert.equal((await failed.json()).ignored, true);
  assert.equal(f.table("Payment").length, 1);
});
test("webhook validates currency/order and bounds its input before financial writes", async () => {
  for (const override of [
    { currency: "USD" },
    { order_id: "order_Foreign" },
    { status: "authorized" },
  ]) {
    const f = createFinanceFixture(),
      ids = f.seed();
    f.state.gatewayPayments.set("pay_Invalid", {
      id: "pay_Invalid",
      order_id: "order_InvoiceFixture",
      amount: 100000,
      currency: "INR",
      status: "captured",
      notes: { invoiceId: String(ids.invoiceId) },
      ...override,
    });
    const route = f.load("app/api/webhooks/razorpay/route.ts"),
      response = await route.POST(
        f.request(
          "/api/webhooks/razorpay",
          {
            event: "payment.captured",
            payload: { payment: { entity: { id: "pay_Invalid" } } },
          },
          "POST",
          { "x-razorpay-signature": "controlled" },
        ),
      );
    assert.ok([400, 409].includes(response.status));
    assert.equal(f.table("Payment").length, 0);
  }
  const f = createFinanceFixture(),
    route = f.load("app/api/webhooks/razorpay/route.ts");
  const response = await route.POST(
    new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "controlled" },
      body: "x".repeat(524289),
    }),
  );
  assert.equal(response.status, 413);
});
test("admin direct-refund recording reverses a confirmed cash commission proportionally and keeps payment history", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await readyCash(f, ids),
    ops = f.load("lib/finance-operations.ts"),
    input = {
      action: "record_direct_refund",
      requestId: rid(),
      ledgerId: String(row._id),
      amountPaise: 50000,
      paidAt: new Date().toISOString(),
      reference: "DIRECT-REFUND-FIXTURE",
      reason: "Verified customer cash refund receipt",
      acknowledged: true,
    };
  await ops.adminFinanceOperation(ids.admin, input);
  await ops.adminFinanceOperation(ids.admin, input);
  assert.equal(f.table("FinanceLedger")[0].refundedPaise, 50000);
  assert.equal(
    f.policy.ledgerBalances(f.table("FinanceLedger")[0]).commissionDuePaise,
    5000,
  );
  assert.equal(f.table("Payment").length, 1);
  assert.equal(f.table("Payment")[0].refundedPaise, 50000);
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
  assert.equal(f.table("Invoice")[0].balanceDue, 0);
  assert.equal(
    f.table("FinanceEvent").filter((row) => row.kind === "record_direct_refund")
      .length,
    1,
  );
  assert.equal(f.state.gatewayCreates, 0);
});
test("manual commission collection supports a bounded single-ledger partial allocation and rejects reused references", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await readyCash(f, ids),
    ops = f.load("lib/finance-operations.ts"),
    input = {
      action: "record_manual_collection",
      requestId: rid(),
      ledgerId: String(row._id),
      amountPaise: 5000,
      paidAt: new Date().toISOString(),
      reference: "MANUAL-COMMISSION-FIXTURE",
      reason: "Bank receipt checked against this job commission",
      acknowledged: true,
    };
  await ops.adminFinanceOperation(ids.admin, input);
  await ops.adminFinanceOperation(ids.admin, input);
  assert.equal(
    f.policy.ledgerBalances(f.table("FinanceLedger")[0]).commissionDuePaise,
    5000,
  );
  await assert.rejects(
    ops.adminFinanceOperation(ids.admin, { ...input, requestId: rid() }),
    (error) => error.status === 409,
  );
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 5000);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter((row) => row.kind === "record_manual_collection").length,
    1,
  );
});
test("unfunded payout adjustments and role-forged manual refund/collection commands are rejected", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await readyCash(f, ids),
    ops = f.load("lib/finance-operations.ts");
  await assert.rejects(
    ops.adminFinanceOperation(ids.admin, {
      action: "adjust_ledger",
      requestId: rid(),
      ledgerId: String(row._id),
      commissionDeltaPaise: 0,
      payoutDeltaPaise: 10000,
      reason: "No separate funding rule is configured",
    }),
    (error) => error.status === 409,
  );
  for (const action of ["record_direct_refund", "record_manual_collection"])
    await assert.rejects(
      ops.adminFinanceOperation(ids.owner, {
        action,
        requestId: rid(),
        ledgerId: String(row._id),
        amountPaise: 1,
        paidAt: new Date().toISOString(),
        reference: "CONTROLLED-FORGED",
        reason: "Provider cannot perform admin action",
        acknowledged: true,
      }),
      (error) => error.status === 403,
    );
  assert.equal(f.table("FinanceLedger")[0].payoutAdjustmentPaise, 0);
});
test("unpaid bill correction preserves old totals/rate in history and requires a new customer bill version", async () => {
  const f = createFinanceFixture(),
    ids = f.seed({ razorpayOrderId: undefined }),
    ledger = f.load("lib/finance-ledger.ts");
  await ledger.billAction(String(ids.invoiceId), ids.techActor, {
    action: "submit",
    requestId: rid(),
    invoiceVersion: 1,
    paymentMode: "cash",
    collectedPaise: 0,
  });
  const row = f.table("FinanceLedger")[0];
  await f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
    action: "correct_bill",
    requestId: rid(),
    ledgerId: String(row._id),
    reason: "Confirmed correction before customer approval",
    items: [
      {
        itemType: "service",
        description: "Corrected supported service line",
        qty: 1,
        unitPrice: 900,
        taxable: true,
      },
    ],
    discountAmount: 0,
    taxPercent: 18,
  });
  const changed = f.table("FinanceLedger")[0],
    event = f.table("FinanceEvent").find((row) => row.kind === "correct_bill");
  assert.equal(changed.grossPaise, 106200);
  assert.equal(changed.eligiblePaise, 90000);
  assert.equal(changed.commissionPaise, 9000);
  assert.equal(changed.snapshot.rateBps, 1000);
  assert.equal(changed.invoiceVersion, 2);
  assert.equal(changed.billState, "pending");
  assert.equal(event.details.old.grandTotal, 1000);
  assert.equal(event.details.new.grandTotal, 1062);
  await assert.rejects(
    ledger.billAction(String(ids.invoiceId), ids.customerActor, {
      action: "confirm",
      requestId: rid(),
      invoiceVersion: 1,
      grossPaise: 100000,
      paymentMode: "cash",
      directPaymentReceived: false,
    }),
    (error) => error.status === 409,
  );
});
test("a paid bill cannot be repriced; adjustments and refunds must keep the original invoice", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await readyCash(f, ids);
  await assert.rejects(
    f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
      action: "correct_bill",
      requestId: rid(),
      ledgerId: String(row._id),
      reason: "Must not rewrite an already paid bill",
      items: [
        {
          itemType: "service",
          description: "Changed service",
          qty: 1,
          unitPrice: 10,
          taxable: true,
        },
      ],
      discountAmount: 0,
      taxPercent: 0,
    }),
    (error) => error.status === 409,
  );
  assert.equal(f.table("Invoice")[0].grandTotal, 1000);
});
test("actual staff invoice routes cannot mark a draft paid, mutate a locked invoice or let a customer finalize another bill", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    auth = f.auth;
  auth.requireRole = async (allowed) => {
    const user = await auth.requireCurrentUser();
    if (!allowed.includes(user.role))
      throw new f.auth.ApiAuthError("Forbidden", 403);
    return { user };
  };
  f.state.actor = ids.admin;
  const route = f.load("app/api/invoices/[id]/route.ts"),
    params = { params: Promise.resolve({ id: String(ids.invoiceId) }) };
  assert.equal(
    (
      await route.PUT(
        f.request("/api/invoices/" + ids.invoiceId, { status: "paid" }, "PUT"),
        params,
      )
    ).status,
    409,
  );
  await readyCash(f, ids);
  assert.equal(
    (
      await route.PUT(
        f.request("/api/invoices/" + ids.invoiceId, { taxPercent: 0 }, "PUT"),
        params,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await route.DELETE(
        f.request("/api/invoices/" + ids.invoiceId, null, "DELETE"),
        params,
      )
    ).status,
    409,
  );
  f.state.actor = ids.customerActor;
  const finalize = f.load("app/api/invoices/[id]/finalize/route.ts");
  assert.equal(
    (
      await finalize.POST(
        f.request("/api/invoices/" + ids.invoiceId + "/finalize", {}),
        params,
      )
    ).status,
    403,
  );
  assert.equal(f.table("Invoice")[0].grandTotal, 1000);
});
test("the old development invoice route requires a persisted admin before any invoice generation", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    route = f.load("app/api/dev/test-invoice/[jobId]/route.ts"),
    params = { params: Promise.resolve({ jobId: String(ids.jobId) }) };
  f.state.actor = null;
  assert.equal(
    (
      await route.POST(
        f.request("/api/dev/test-invoice/" + ids.jobId, {}),
        params,
      )
    ).status,
    401,
  );
  f.state.actor = ids.customerActor;
  assert.equal(
    (
      await route.POST(
        f.request("/api/dev/test-invoice/" + ids.jobId, {}),
        params,
      )
    ).status,
    403,
  );
  assert.equal(f.table("FinanceLedger").length, 0);
});
test("staff assignment cannot cross business boundaries, restart completed work or overwrite a cancelled booking", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    service = f.load("lib/staff-job-assignment.ts");
  await assert.rejects(
    service.staffAssignJob(ids.admin, {
      jobId: String(ids.jobId),
      technicianId: String(ids.techId),
    }),
    (error) => error.status === 409,
  );
  f.table("Job")[0].status = "assigned";
  f.table("Technician").push({
    _id: oid(91),
    userId: oid(92),
    serviceProviderId: oid(93),
    isActive: true,
    status: "available",
  });
  await assert.rejects(
    service.staffAssignJob(ids.admin, {
      jobId: String(ids.jobId),
      technicianId: fixtureId(91),
    }),
    (error) => error.status === 409,
  );
  f.table("Booking")[0].status = "cancelled";
  await assert.rejects(
    service.staffAssignJob(ids.admin, {
      jobId: String(ids.jobId),
      technicianId: String(ids.techId),
    }),
    (error) => error.status === 409,
  );
  assert.equal(String(f.table("Job")[0].technicianId), String(ids.techId));
});
test("staff reassignment uses the booking fence and keeps the business's agreed commission snapshot", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.table("Job")[0].status = "enroute";
  f.table("Technician").push({
    _id: oid(91),
    userId: oid(92),
    serviceProviderId: ids.providerId,
    isActive: true,
    status: "available",
    skillKeys: [],
  });
  const result = await f
    .load("lib/staff-job-assignment.ts")
    .staffAssignJob(ids.admin, {
      jobId: String(ids.jobId),
      technicianId: fixtureId(91),
    });
  assert.equal(result.job.status, "assigned");
  assert.equal(result.job.otp, undefined);
  assert.equal(String(f.table("Booking")[0].technicianId), fixtureId(91));
  assert.equal(f.table("Booking")[0].commissionSnapshot.rateBps, 1000);
  assert.equal(f.table("Technician")[0].status, "available");
  assert.equal(f.table("Technician")[1].status, "busy");
  assert.ok(f.table("Booking")[0].__v > 0);
});
test("repeat booking preflight is customer-owned and rechecks the actual current provider/catalog approval", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.state.actor = ids.customerActor;
  const route = f.load("app/api/customer/bookings/[id]/repeat/route.ts"),
    params = { params: Promise.resolve({ id: String(ids.bookingId) }) };
  const first = await route.GET(
    f.request(
      "/api/customer/bookings/" + ids.bookingId + "/repeat",
      null,
      "GET",
    ),
    params,
  );
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.match(body.destination, /repeatBookingId=/);
  assert.match(body.destination, /offeringId=/);
  assert.match(body.message, /Previous payments and invoices are not reused/);
  f.table("ServiceOffering")[0].approvalStatus = "pending";
  assert.equal(
    (
      await route.GET(
        f.request(
          "/api/customer/bookings/" + ids.bookingId + "/repeat",
          null,
          "GET",
        ),
        params,
      )
    ).status,
    409,
  );
  assert.equal(f.table("Booking").length, 1);
  assert.equal(f.table("Invoice").length, 1);
  assert.equal(f.table("Payment").length, 0);
});
test("actual provider finance summary scopes ledger rows, payout profiles and collections to the logged-in business", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await readyCash(f, ids);
  const foreign = clone(f.table("FinanceLedger")[0]);
  foreign._id = oid(99);
  foreign.providerId = oid(98);
  foreign.invoiceId = oid(97);
  foreign.grossPaise = 900000;
  f.table("FinanceLedger").push(foreign);
  f.state.actor = ids.owner;
  const route = f.load("app/api/service-provider/finance/ledger/route.ts"),
    response = await route.GET(
      f.request("/api/service-provider/finance/ledger", null, "GET"),
    ),
    body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.rows.length, 1);
  assert.equal(body.summary.commissionDuePaise, 10000);
  assert.ok(
    body.rows.every((row) => row.providerId === String(ids.providerId)),
  );
  assert.equal(body.providerMetrics.completedJobs, 1);
});
test("in-app reminder retries after delivery failure preserve one notification and one weekly history record", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await readyCash(f, ids);
  row.dueAt = new Date(Date.now() - 86400000);
  const service = f.load("lib/finance-collections.ts");
  f.state.notificationsFail = true;
  await assert.rejects(service.prepareWeeklyReminders());
  assert.equal(f.table("CollectionReminder").length, 1);
  assert.equal(f.table("CollectionReminder")[0].deliveredAt, undefined);
  f.state.notificationsFail = false;
  await service.prepareWeeklyReminders();
  await service.prepareWeeklyReminders();
  assert.equal(f.state.notifications.length, 1);
  assert.ok(f.table("CollectionReminder")[0].deliveredAt);
});
test("deployment and maintenance commands have offline/dry-run modes without creating payments or sending messages", () => {
  const migrate = execFileSync(
      process.execPath,
      ["scripts/migrate-finance.mjs", "--print"],
      { cwd: process.cwd(), encoding: "utf8" },
    ),
    weekly = execFileSync(
      process.execPath,
      ["scripts/finance-maintenance.mjs", "--help"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
  assert.match(migrate, /"automaticRates": false/);
  assert.match(migrate, /"deletes": false/);
  assert.match(weekly, /"dryRun": true/);
  assert.match(weekly, /No email\/WhatsApp\/SMS/);
  assert.match(weekly, /"automaticPayouts": false/);
});
test("actual final-bill UI shows the saved amount and confirmation state without a client payment-success shortcut", () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    bill = {
      invoiceId: String(ids.invoiceId),
      invoiceNumber: "CONTROLLED-UI",
      jobId: String(ids.jobId),
      bookingId: String(ids.bookingId),
      jobStatus: "completed",
      currency: "INR",
      items: [
        {
          itemType: "service",
          description: "Controlled service line",
          qty: 1,
          unitPrice: 1000,
          amount: 1000,
        },
      ],
      subtotal: 1000,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 1000,
      amountPaid: 0,
      balanceDue: 1000,
      invoiceStatus: "issued",
      invoiceVersion: 1,
      grossPaise: 100000,
      billState: "pending",
      paymentMode: "cash",
      paymentState: "claimed",
      claimedCollectedPaise: 100000,
      refundedPaise: 0,
    };
  const modules = {
    "next-auth/react": {
      useSession: () => ({
        data: { user: ids.customerActor },
        status: "authenticated",
      }),
    },
    "@/hooks/useFinance": {
      useFinanceQuery: () => ({
        data: { bill },
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch() {},
      }),
      useFinanceAction: () => ({
        isPending: false,
        mutateAsync: async () => ({}),
      }),
    },
    sonner: { toast: { success() {}, error() {} } },
  };
  const { FinalBillPanel } = f.load(
    "components/finance/FinalBillPanel.tsx",
    modules,
  );
  const html = renderToStaticMarkup(
    React.createElement(FinalBillPanel, { invoiceId: String(ids.invoiceId) }),
  );
  assert.match(html, /Confirm bill and payment details/);
  assert.match(html, /Report a problem/);
  assert.match(html, /Controlled service line/);
  assert.match(html, /1,000/);
  assert.doesNotMatch(html, /rateBps|accountNumber|bank account|mark paid/i);
});

test("finance reads bind cache keys to the signed-in account and forward cancellation signals", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  let options, received;
  const signal = new AbortController().signal;
  const api = {
    get: async (path, input) => {
      received = { path, signal: input.signal };
      return { data: { ok: true } };
    },
  };
  const hooks = f.load("hooks/useFinance.ts", {
    "next-auth/react": {
      useSession: () => ({
        data: { user: { id: String(ids.owner._id), role: "service_provider" } },
        status: "authenticated",
      }),
    },
    "@tanstack/react-query": {
      useQuery: (input) => {
        options = input;
        return input;
      },
    },
    "@/lib/api": { default: api, __esModule: true },
  });
  hooks.useFinanceQuery("/service-provider/finance/ledger");
  assert.deepEqual(options.queryKey, [
    "finance",
    String(ids.owner._id),
    "service_provider",
    "/service-provider/finance/ledger",
  ]);
  assert.equal(options.enabled, true);
  assert.equal(options.gcTime, 0);
  assert.deepEqual(await options.queryFn({ signal }), { ok: true });
  assert.equal(received.signal, signal);
});
test("financial actions keep the same retry UUID after an uncertain response and block clicks through the refresh gap", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  let mutationOptions,
    fail = true,
    releaseRefresh;
  const requests = [],
    refresh = new Promise((resolve) => {
      releaseRefresh = resolve;
    }),
    api = {
      post: async (path, input) => {
        requests.push(input);
        if (fail) throw new Error("Lost response");
        return { data: { saved: true } };
      },
    };
  const client = {
    cancelQueries: async () => {},
    invalidateQueries: async () => refresh,
  };
  const hooks = f.load("hooks/useFinance.ts", {
    react: { useRef: (value) => ({ current: value }) },
    "next-auth/react": {
      useSession: () => ({ data: { user: { id: String(ids.owner._id) } } }),
    },
    "@tanstack/react-query": {
      useQueryClient: () => client,
      useMutation: (input) => {
        mutationOptions = input;
        return {
          isPending: false,
          reset() {},
          mutateAsync: async (body) => {
            const result = await input.mutationFn(body);
            await input.onSuccess();
            return result;
          },
        };
      },
    },
    "@/lib/api": { default: api, __esModule: true },
  });
  const action = hooks.useFinanceAction("/service-provider/finance/ledger"),
    body = { action: "dispute", reason: "Controlled report" };
  assert.equal(mutationOptions.retry, false);
  await assert.rejects(action.mutateAsync(body), /Lost response/);
  fail = false;
  const pending = action.mutateAsync(body);
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(action.mutateAsync(body), /already running/);
  assert.equal(requests[0].requestId, requests[1].requestId);
  releaseRefresh();
  await pending;
  await action.mutateAsync(body);
  assert.notEqual(requests[1].requestId, requests[2].requestId);
});

test("the real provider acceptance route snapshots accepted terms atomically before work and blocks unaccepted new rules", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.state.actor = ids.owner;
  const requestId = oid(96);
  f.table("ServiceRequest").push({
    _id: requestId,
    serviceProviderId: ids.providerId,
    customerId: ids.customerId,
    serviceOfferingId: ids.offeringId,
    serviceName: "Controlled repeat service",
    status: "open",
    address: {
      line1: "Controlled address",
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
    },
    pricing: { basePrice: 1000, finalPrice: 1000 },
    preferredDate: new Date(Date.now() + 86400000),
  });
  const route = f.load(
      "app/api/service-provider/booking-requests/[id]/accept/route.ts",
      {
        "@/lib/booking-eligibility": {
          confirmMarketplaceEligibility: async () => ({
            status: "within_area",
            requiresProviderConfirmation: false,
            assessedAt: new Date(),
          }),
        },
        "@/lib/notify-events": { notifyBookingAccepted: async () => {} },
      },
    ),
    params = { params: Promise.resolve({ id: String(requestId) }) };
  const response = await route.POST(
    f.request(
      "/api/service-provider/booking-requests/" + requestId + "/accept",
      {},
    ),
    params,
  );
  assert.equal(response.status, 200);
  const booking = f
    .table("Booking")
    .find((row) => String(row._id) !== String(ids.bookingId));
  assert.equal(booking.commissionSnapshot.rateBps, 1000);
  assert.equal(booking.commissionSnapshot.state, "ready");
  assert.equal(
    String(booking.commissionSnapshot.policyId),
    String(ids.policyId),
  );
  assert.equal(f.table("ServiceRequest")[0].status, "booked");
  const newer = oid(97);
  f.table("CommissionPolicy").push({
    _id: newer,
    ...clone(ids.policyRow),
    _id: newer,
    rateBps: 1500,
    effectiveAt: new Date(),
  });
  f.table("ServiceRequest")[0].status = "open";
  const held = await route.POST(
    f.request(
      "/api/service-provider/booking-requests/" + requestId + "/accept",
      {},
    ),
    params,
  );
  assert.equal(held.status, 409);
  assert.equal(f.table("ServiceRequest")[0].status, "open");
  assert.equal(f.table("Booking").length, 2);
  assert.equal(booking.commissionSnapshot.rateBps, 1000);
});
