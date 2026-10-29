import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import * as policy from "../lib/finance-policy.mjs";
import { createFinanceFixture, fixtureId } from "./helpers/finance-fixture.mjs";
const rid = () => randomUUID(),
  oid = (n) => new mongoose.Types.ObjectId(fixtureId(n));
async function submit(f, ids, mode = "cash", collected = 100000) {
  return f
    .load("lib/finance-ledger.ts")
    .billAction(String(ids.invoiceId), ids.techActor, {
      action: "submit",
      requestId: rid(),
      invoiceVersion: 1,
      paymentMode: mode,
      collectedPaise: collected,
    });
}
async function confirm(f, ids, paid = true) {
  return f
    .load("lib/finance-ledger.ts")
    .billAction(String(ids.invoiceId), ids.customerActor, {
      action: "confirm",
      requestId: rid(),
      invoiceVersion: f.table("FinanceLedger")[0].invoiceVersion,
      grossPaise: 100000,
      paymentMode: f.table("FinanceLedger")[0].paymentMode,
      directPaymentReceived: paid,
    });
}
async function capture(f, ids, paymentId = "pay_CustomerFixture") {
  f.state.gatewayPayments.set(paymentId, {
    id: paymentId,
    order_id: "order_InvoiceFixture",
    amount: 100000,
    currency: "INR",
    status: "captured",
    method: "upi",
  });
  return f.load("lib/razorpay-payment.ts").finalizeSuccessfulRazorpayPayment({
    invoiceId: String(ids.invoiceId),
    orderId: "order_InvoiceFixture",
    paymentId,
    paidAmountPaise: 100000,
    expectedAmountPaise: 100000,
    method: "upi",
    source: "webhook",
  });
}
async function cashReady(f, ids) {
  await submit(f, ids);
  await confirm(f, ids);
  return f.table("FinanceLedger")[0];
}
async function onlineReady(f, ids) {
  await submit(f, ids, "servizato_online", 0);
  await confirm(f, ids, false);
  await capture(f, ids);
  return f.table("FinanceLedger")[0];
}
async function profileReady(f, ids) {
  const key = process.env.PAYOUT_ENCRYPTION_KEY;
  process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 31).toString("base64");
  try {
    const ops = f.load("lib/finance-operations.ts");
    await ops.savePayoutProfile(ids.owner, ids.providerId, {
      method: "bank",
      holderName: "Controlled Fixture Business",
      accountNumber: "123456789012",
      ifsc: "TEST0123456",
      bankName: "Fixture Bank",
      expectedVersion: 0,
      requestId: rid(),
    });
    await ops.adminFinanceOperation(ids.admin, {
      action: "review_payout",
      providerId: String(ids.providerId),
      expectedVersion: 1,
      status: "verified",
      reason: "Controlled verification evidence",
      requestId: rid(),
    });
    return f.table("ProviderPayoutProfile")[0];
  } finally {
    if (key === undefined) delete process.env.PAYOUT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ENCRYPTION_KEY = key;
  }
}

test("integer paise, basis points and invoice basis avoid floating point drift or double-discounting", () => {
  assert.equal(policy.paise("1000.01"), 100001);
  assert.equal(policy.multiplyRate(100001, 1000), 10000);
  assert.equal(policy.multiplyRate(1, 5000), 1);
  assert.deepEqual(
    policy.invoiceAmounts({
      currency: "INR",
      grandTotal: 1180,
      taxAmount: 180,
      discountAmount: 100,
      subtotal: 1000,
    }),
    { grossPaise: 118000, eligiblePaise: 100000 },
  );
  for (const value of [NaN, Infinity, -1, 1.001, Number.MAX_SAFE_INTEGER])
    assert.throws(() => policy.paise(value));
  assert.throws(() => policy.multiplyRate(100, 10001));
  assert.throws(() =>
    policy.invoiceAmounts({ currency: "USD", grandTotal: 100, taxAmount: 0 }),
  );
});
test("provider/category/global precedence uses only active dated policies and stable historical snapshots", () => {
  const at = new Date("2026-10-28T10:00:00Z"),
    global = {
      _id: "1",
      scope: "global",
      scopeKey: "global",
      rateBps: 1000,
      effectiveAt: new Date("2026-10-01"),
    },
    category = {
      ...global,
      _id: "2",
      scope: "category",
      scopeKey: "electrical",
      rateBps: 1200,
    },
    provider = {
      ...global,
      _id: "3",
      scope: "provider",
      scopeKey: "business",
      rateBps: 1500,
    },
    future = {
      ...provider,
      _id: "4",
      rateBps: 2000,
      effectiveAt: new Date("2026-11-01"),
    };
  assert.equal(
    policy.selectCommissionPolicy(
      [future, global, category, provider],
      "business",
      "electrical",
      at,
    )._id,
    "3",
  );
  assert.equal(
    policy.selectCommissionPolicy(
      [global, category],
      "business",
      "electrical",
      at,
    )._id,
    "2",
  );
  assert.equal(
    policy.selectCommissionPolicy([global], "business", "electrical", at)._id,
    "1",
  );
  assert.equal(
    policy.selectCommissionPolicy([future], "business", "electrical", at),
    null,
  );
});
test("actual commission service never invents a rate, requires business acceptance and freezes policy before work", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    service = f.load("lib/finance-commission.ts");
  f.state.tables.CommissionPolicy = [];
  assert.deepEqual(
    Object.keys(
      await service.commissionForBooking(ids.providerId, ids.offeringId),
    ).sort(),
    ["establishedAt", "state"],
  );
  assert.equal(
    (await service.commissionForBooking(ids.providerId, ids.offeringId)).state,
    "missing_policy",
  );
  f.table("CommissionPolicy").push(ids.policyRow);
  f.state.tables.FinanceTermsAcceptance = [];
  await assert.rejects(
    service.commissionForBooking(ids.providerId, ids.offeringId),
    (error) => error.status === 409,
  );
  await service.acceptFinanceTerms(
    ids.providerId,
    ids.owner._id,
    String(ids.policyId),
    f.session,
  );
  const snapshot = await service.commissionForBooking(
    ids.providerId,
    ids.offeringId,
  );
  assert.equal(snapshot.rateBps, 1000);
  assert.equal(snapshot.state, "ready");
  ids.policyRow.rateBps = 2500;
  assert.equal(snapshot.rateBps, 1000);
});
test("admin creates an audited immutable policy version; actor checks, future dates and request retries are enforced", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    ops = f.load("lib/finance-operations.ts"),
    input = {
      action: "create_policy",
      requestId: rid(),
      scope: "global",
      scopeKey: "global",
      rateBps: 875,
      effectiveAt: new Date(Date.now() + 3600000).toISOString(),
      collectionDays: 14,
      reason: "New published business commission rule",
    };
  await assert.rejects(
    ops.adminFinanceOperation(ids.owner, input),
    (error) => error.status === 403,
  );
  await ops.adminFinanceOperation(ids.admin, input);
  await ops.adminFinanceOperation(ids.admin, input);
  assert.equal(f.table("CommissionPolicy").length, 2);
  assert.equal(f.table("CommissionPolicy")[0].rateBps, 1000);
  assert.equal(
    f.table("FinanceEvent").filter((row) => row.kind === "create_policy")
      .length,
    1,
  );
  assert.equal(f.table("FinanceEvent")[0].details.old.rateBps, 1000);
  await assert.rejects(
    ops.adminFinanceOperation(ids.admin, { ...input, rateBps: 100 }),
    (error) => error.status === 409,
  );
  await assert.rejects(
    ops.adminFinanceOperation(ids.admin, {
      ...input,
      requestId: rid(),
      effectiveAt: "2020-01-01T00:00:00.000Z",
    }),
    (error) => error.status === 400,
  );
});
test("cash claim, customer bill approval, actual payment and commission receivable remain separate events", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids);
  let row = f.table("FinanceLedger")[0];
  assert.equal(row.billState, "pending");
  assert.equal(row.paymentState, "claimed");
  assert.equal(f.table("Invoice")[0].amountPaid, 0);
  assert.equal(f.table("Payment").length, 0);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  await confirm(f, ids);
  row = f.table("FinanceLedger")[0];
  assert.equal(row.billState, "confirmed");
  assert.equal(row.paymentState, "paid");
  assert.equal(f.table("Payment").length, 1);
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
  assert.equal(f.table("Invoice")[0].status, "paid");
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 10000);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
  assert.equal(policy.ledgerBalances(row).providerRetainedPaise, 90000);
  assert.ok(row.dueAt > new Date());
});
test("an allowed direct UPI report creates a business commission debt, never an online payout", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids, "direct_upi");
  await confirm(f, ids);
  const row = f.table("FinanceLedger")[0];
  assert.equal(f.table("Payment")[0].mode, "upi");
  assert.equal(f.table("Payment")[0].gateway, "provider_direct");
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 10000);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
});
test("customer/team disagreement and a reported bill problem never silently settle money", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids);
  await confirm(f, ids, false);
  let row = f.table("FinanceLedger")[0];
  assert.equal(row.billState, "disputed");
  assert.equal(f.table("Payment").length, 0);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  assert.equal(policy.ledgerBalances(row).underReviewPaise, 100000);
  await assert.rejects(
    f
      .load("lib/finance-ledger.ts")
      .billAction(String(ids.invoiceId), ids.techActor, {
        action: "submit",
        requestId: rid(),
        invoiceVersion: row.invoiceVersion,
        paymentMode: "cash",
        collectedPaise: 100000,
      }),
    (error) => error.status === 409,
  );
});
test("Pro cannot impersonate the customer; foreign customers and unrelated providers or Pros cannot access the bill", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    ledger = f.load("lib/finance-ledger.ts");
  await submit(f, ids);
  const input = {
    action: "confirm",
    requestId: rid(),
    invoiceVersion: 1,
    grossPaise: 100000,
    paymentMode: "cash",
    directPaymentReceived: true,
  };
  await assert.rejects(
    ledger.billAction(String(ids.invoiceId), ids.techActor, input),
    (error) => error.status === 403,
  );
  for (const role of ["customer", "service_provider", "technician"]) {
    await assert.rejects(
      ledger.invoiceContext(String(ids.invoiceId), { _id: oid(90), role }),
      (error) => error.status === 404,
    );
  }
  assert.equal(f.table("Payment").length, 0);
});
test("same-request and parallel confirmation retries create exactly one ledger, receipt and confirmation", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    ledger = f.load("lib/finance-ledger.ts");
  await submit(f, ids);
  const input = {
    action: "confirm",
    requestId: rid(),
    invoiceVersion: 1,
    grossPaise: 100000,
    paymentMode: "cash",
    directPaymentReceived: true,
  };
  await Promise.all([
    ledger.billAction(String(ids.invoiceId), ids.customerActor, input),
    ledger.billAction(String(ids.invoiceId), ids.customerActor, input),
  ]);
  assert.equal(f.table("FinanceLedger").length, 1);
  assert.equal(f.table("Payment").length, 1);
  assert.equal(
    f.table("FinanceEvent").filter((row) => row.kind === "bill_confirm").length,
    1,
  );
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
});
test("cash confirmation rollback retains the unpaid invoice and all pending records on a persistence failure", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids);
  f.state.fail = "FinanceLedger.save";
  await assert.rejects(confirm(f, ids));
  assert.equal(f.table("Payment").length, 0);
  assert.equal(f.table("Invoice")[0].status, "issued");
  assert.equal(f.table("Invoice")[0].amountPaid, 0);
  assert.equal(f.table("FinanceLedger")[0].billState, "pending");
});
test("a missing policy does not block customer cash confirmation but cannot finalize an invented commission", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  delete f.table("Booking")[0].commissionSnapshot;
  await cashReady(f, ids);
  const row = f.table("FinanceLedger")[0];
  assert.equal(row.policyState, "legacy_review");
  assert.equal(row.commissionPaise, undefined);
  assert.equal(f.table("Invoice")[0].status, "paid");
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
});
test("bill approval alone does not prove online receipt; a verified payment creates provider liability only", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids, "servizato_online", 0);
  await confirm(f, ids, false);
  let row = f.table("FinanceLedger")[0];
  assert.equal(row.billState, "confirmed");
  assert.equal(row.paymentState, "unpaid");
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
  await capture(f, ids);
  row = f.table("FinanceLedger")[0];
  const b = policy.ledgerBalances(row);
  assert.equal(b.commissionRetainedPaise, 10000);
  assert.equal(b.commissionDuePaise, 0);
  assert.equal(b.payoutWaitingPaise, 90000);
  assert.equal(b.payoutPaidPaise, 0);
  assert.equal(row.onlineReceivedPaise, 100000);
});
test("verified online capture and callback/webhook retries do not duplicate receipts, ledger credits or commission", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await onlineReady(f, ids);
  await capture(f, ids);
  assert.equal(f.table("Payment").length, 1);
  assert.equal(f.table("FinanceLedger").length, 1);
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
  assert.equal(f.table("FinanceLedger")[0].onlineReceivedPaise, 100000);
});
test("an additional verified payment is held for review rather than discarded or paid out twice", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await onlineReady(f, ids);
  await capture(f, ids, "pay_ExtraFixture");
  const row = f.table("FinanceLedger")[0];
  assert.equal(f.table("Payment").length, 2);
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
  assert.equal(row.onlineReceivedPaise, 200000);
  assert.equal(row.billState, "disputed");
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter((row) => row.kind === "unexpected_customer_payment").length,
    1,
  );
});
test("wrong captured amounts, order binding and reused foreign payment IDs are rejected", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    finalize = f.load(
      "lib/razorpay-payment.ts",
    ).finalizeSuccessfulRazorpayPayment;
  for (const input of [
    { paidAmountPaise: 99999, expectedAmountPaise: 99999 },
    {
      paidAmountPaise: 100000,
      expectedAmountPaise: 100000,
      orderId: "order_Foreign",
    },
  ])
    await assert.rejects(
      finalize({
        invoiceId: String(ids.invoiceId),
        paymentId: "pay_Wrong",
        source: "webhook",
        orderId: "order_InvoiceFixture",
        ...input,
      }),
      (error) => error.status === 409,
    );
  assert.equal(f.table("Payment").length, 0);
});
test("ordinary verified customer payment remains available while financial indexes are not installed", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.state.ready = false;
  await capture(f, ids);
  assert.equal(f.table("Invoice")[0].status, "paid");
  assert.equal(f.table("Payment").length, 1);
  assert.equal(f.table("FinanceLedger").length, 0);
  await assert.rejects(submit(f, ids), (error) => error.status === 503);
  assert.equal(
    await f.load("lib/finance-ledger.ts").prepareInvoiceFinance(ids.invoiceId),
    null,
  );
});
test("saving payout details encrypts account holder, account and IFSC; default output and audit hide plaintext", async () => {
  const previous = process.env.PAYOUT_ENCRYPTION_KEY;
  process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 41).toString("base64");
  try {
    const f = createFinanceFixture(),
      ids = f.seed(),
      ops = f.load("lib/finance-operations.ts");
    await ops.savePayoutProfile(ids.owner, ids.providerId, {
      method: "bank",
      holderName: "Private Fixture Holder",
      accountNumber: "987654321098",
      ifsc: "TEST0123456",
      bankName: "Fixture Bank",
      expectedVersion: 0,
      requestId: rid(),
    });
    const profile = f.table("ProviderPayoutProfile")[0];
    assert.equal(profile.masked, "Account ending 1098");
    assert.equal(profile.holderName, undefined);
    assert.ok(!JSON.stringify(profile).includes("987654321098"));
    assert.ok(!JSON.stringify(profile).includes("Private Fixture Holder"));
    assert.ok(
      !JSON.stringify(f.table("FinanceEvent")).includes("987654321098"),
    );
    assert.ok(
      !JSON.stringify(ops.auditDto(f.table("FinanceEvent")[0])).includes(
        profile.encrypted,
      ),
    );
    const opened = await ops.adminFinanceOperation(ids.admin, {
      action: "reveal_payout",
      requestId: rid(),
      providerId: String(ids.providerId),
      reason: "Prepare the authorized manual payout",
    });
    assert.equal(opened.payoutDetails.accountNumber, "987654321098");
    assert.equal(
      f.table("FinanceEvent").filter((row) => row.kind === "reveal_payout")
        .length,
      1,
    );
  } finally {
    if (previous === undefined) delete process.env.PAYOUT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ENCRYPTION_KEY = previous;
  }
});
test("missing encryption configuration fails closed without storing plaintext or breaking other finance work", async () => {
  const previous = process.env.PAYOUT_ENCRYPTION_KEY;
  delete process.env.PAYOUT_ENCRYPTION_KEY;
  try {
    const f = createFinanceFixture(),
      ids = f.seed();
    await assert.rejects(
      f
        .load("lib/finance-operations.ts")
        .savePayoutProfile(ids.owner, ids.providerId, {
          method: "upi",
          holderName: "Fixture owner",
          upiId: "fixture@bank",
          expectedVersion: 0,
          requestId: rid(),
        }),
      (error) => error.status === 503,
    );
    assert.equal(f.table("ProviderPayoutProfile").length, 0);
    await cashReady(f, ids);
    assert.equal(
      policy.ledgerBalances(f.table("FinanceLedger")[0]).commissionDuePaise,
      10000,
    );
  } finally {
    if (previous !== undefined) process.env.PAYOUT_ENCRYPTION_KEY = previous;
  }
});
test("AES-GCM uses random IVs and binds ciphertext to provider, profile version and method", () => {
  const old = process.env.PAYOUT_ENCRYPTION_KEY;
  process.env.PAYOUT_ENCRYPTION_KEY = Buffer.alloc(32, 51).toString("base64");
  try {
    const f = createFinanceFixture(),
      s = f.load("lib/finance-security.ts"),
      one = s.encryptPayout({ accountNumber: "1234567890" }, "provider:1:bank"),
      two = s.encryptPayout({ accountNumber: "1234567890" }, "provider:1:bank");
    assert.notEqual(one, two);
    assert.equal(
      s.decryptPayout(one, "provider:1:bank").accountNumber,
      "1234567890",
    );
    for (const context of ["other:1:bank", "provider:2:bank", "provider:1:upi"])
      assert.throws(() => s.decryptPayout(one, context));
    const parts = one.split(".");
    parts[3] = Buffer.from("tampered").toString("base64");
    assert.throws(() => s.decryptPayout(parts.join("."), "provider:1:bank"));
  } finally {
    if (old === undefined) delete process.env.PAYOUT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ENCRYPTION_KEY = old;
  }
});
test("manual payout records actual paid amount/reference once, require reviewed current details, and never transfer money", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await onlineReady(f, ids),
    ops = f.load("lib/finance-operations.ts");
  await profileReady(f, ids);
  const input = {
    action: "record_payout",
    requestId: rid(),
    ledgerId: String(row._id),
    amountPaise: 90000,
    profileVersion: 1,
    paidAt: new Date().toISOString(),
    reference: "CONTROLLED-UTR-ONE",
    reason: "Checked completed transfer receipt",
    acknowledged: true,
  };
  await assert.rejects(
    ops.adminFinanceOperation(ids.owner, input),
    (error) => error.status === 403,
  );
  await ops.adminFinanceOperation(ids.admin, input);
  await ops.adminFinanceOperation(ids.admin, input);
  assert.equal(
    policy.ledgerBalances(f.table("FinanceLedger")[0]).payoutWaitingPaise,
    0,
  );
  assert.equal(f.table("FinanceLedger")[0].payoutPaidPaise, 90000);
  assert.equal(
    f.table("FinanceEvent").filter((row) => row.kind === "record_payout")
      .length,
    1,
  );
  assert.equal(f.state.gatewayCreates, 0);
  await assert.rejects(
    ops.adminFinanceOperation(ids.admin, {
      ...input,
      requestId: rid(),
      reference: "CONTROLLED-UTR-TWO",
      amountPaise: 1,
    }),
    (error) => error.status === 409,
  );
});
test("payout profile changes invalidate previous approval and stale payout recording", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await onlineReady(f, ids);
  await profileReady(f, ids);
  const profile = f.table("ProviderPayoutProfile")[0];
  profile.version = 2;
  profile.status = "pending";
  await assert.rejects(
    f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
      action: "record_payout",
      requestId: rid(),
      ledgerId: String(row._id),
      amountPaise: 90000,
      profileVersion: 1,
      paidAt: new Date().toISOString(),
      reference: "CONTROLLED-STALE-UTR",
      reason: "Stale details must not be used",
      acknowledged: true,
    }),
    (error) => error.status === 409,
  );
  assert.equal(f.table("FinanceLedger")[0].payoutPaidPaise, 0);
});
test("disputed bills freeze payout even after verified funds were captured", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await onlineReady(f, ids);
  await f
    .load("lib/finance-ledger.ts")
    .billAction(String(ids.invoiceId), ids.customerActor, {
      action: "dispute",
      requestId: rid(),
      invoiceVersion: 1,
      reason: "The service amount does not match the agreement",
    });
  assert.equal(
    policy.ledgerBalances(f.table("FinanceLedger")[0]).payoutWaitingPaise,
    0,
  );
  assert.equal(f.table("FinanceLedger")[0].onlineReceivedPaise, 100000);
  assert.equal(row.commissionPaise, 10000);
});
test("collection link amount comes only from eligible business debts and uncertain creation reuses its unique reference", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  f.state.uncertainCreation = true;
  const collections = f.load("lib/finance-collections.ts");
  const one = await collections.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    ),
    two = await collections.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    );
  assert.equal(String(one.collection._id), String(two.collection._id));
  assert.equal(f.state.gatewayLinks.size, 1);
  assert.equal(f.table("CommissionCollection")[0].amountPaise, 10000);
  assert.equal(f.table("FinanceLedger")[0].collectionReservedPaise, 10000);
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 0);
  assert.equal(f.state.gatewayNotifications, 0);
});
test("parallel collection requests never reserve the same due twice or create two active balances", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts");
  await Promise.all([
    service.createCollectionLink(ids.owner, ids.providerId, rid()),
    service.createCollectionLink(ids.owner, ids.providerId, rid()),
  ]);
  assert.equal(f.table("CommissionCollection").length, 1);
  assert.equal(f.state.gatewayLinks.size, 1);
  assert.equal(f.table("FinanceLedger")[0].collectionReservedPaise, 10000);
});
test("verified collection capture allocates a payment once, clears only reserved dues and never creates a provider payout", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    ),
    link = f.state.gatewayLinks.get(collection.reference);
  link.status = "paid";
  link.amount_paid = 10000;
  link.payments = [
    { payment_id: "pay_CommissionFixture", amount: 10000, status: "captured" },
  ];
  f.state.gatewayPayments.set("pay_CommissionFixture", {
    id: "pay_CommissionFixture",
    amount: 10000,
    currency: "INR",
    status: "captured",
    order_id: link.order_id,
  });
  await service.reconcileCollection(String(collection._id));
  await service.reconcileCollection(String(collection._id));
  const row = f.table("FinanceLedger")[0];
  assert.equal(row.collectedPaise, 10000);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  assert.equal(row.payoutPaidPaise, 0);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter((row) => row.kind === "commission_collection_allocated").length,
    1,
  );
});
test("foreign provider cannot reconcile a collection; partial/incorrect captures are not allocated", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    );
  await assert.rejects(
    service.reconcileCollection(String(collection._id), oid(99)),
    (error) => error.status === 404,
  );
  const link = f.state.gatewayLinks.get(collection.reference);
  link.status = "paid";
  link.amount_paid = 5000;
  link.payments = [
    { payment_id: "pay_Partial", amount: 5000, status: "captured" },
  ];
  await assert.rejects(
    service.reconcileCollection(String(collection._id)),
    (error) => error.status === 409,
  );
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 0);
});
test("a dispute during an active collection holds a captured payment for review instead of settling the disputed debt", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    );
  await f
    .load("lib/finance-ledger.ts")
    .billAction(String(ids.invoiceId), ids.customerActor, {
      action: "dispute",
      requestId: rid(),
      invoiceVersion: 1,
      reason: "Please review this payment dispute",
    });
  const link = f.state.gatewayLinks.get(collection.reference);
  link.status = "paid";
  link.amount_paid = 10000;
  link.payments = [
    { payment_id: "pay_Held", amount: 10000, status: "captured" },
  ];
  f.state.gatewayPayments.set("pay_Held", {
    id: "pay_Held",
    amount: 10000,
    currency: "INR",
    status: "captured",
    order_id: link.order_id,
  });
  const result = await service.reconcileCollection(String(collection._id));
  assert.equal(result.review, true);
  assert.equal(f.table("CommissionCollection")[0].status, "review");
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 0);
});
test("verified link cancellation releases the exact reservation and preserves collection history", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    );
  await service.cancelCollectionLink(
    ids.admin,
    String(collection._id),
    "Customer payment dispute needs review",
    rid(),
  );
  assert.equal(f.table("CommissionCollection")[0].status, "cancelled");
  assert.equal(f.table("FinanceLedger")[0].collectionId, undefined);
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 0);
  assert.equal(f.table("CommissionCollection").length, 1);
});
test("weekly reminder preparation is idempotent, excludes future/disputed dues and uses only in-app notifications", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await cashReady(f, ids),
    service = f.load("lib/finance-collections.ts");
  assert.equal((await service.prepareWeeklyReminders()).providersPrepared, 0);
  row.dueAt = new Date(Date.now() - 86400000);
  await Promise.all([
    service.prepareWeeklyReminders(),
    service.prepareWeeklyReminders(),
  ]);
  assert.equal(f.table("CollectionReminder").length, 1);
  assert.equal(f.state.notifications.length, 1);
  assert.equal(f.state.notifications[0].channel, "in_app");
  assert.match(f.state.notifications[0].message, /100/);
  row.billState = "disputed";
  assert.equal((await service.prepareWeeklyReminders()).providersPrepared, 0);
});
test("verified partial/full customer refunds reverse commission proportionally, retain receipts and flag paid-out recovery", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await onlineReady(f, ids);
  row.payoutPaidPaise = 90000;
  const gateway = f.state.gatewayPayments.get("pay_CustomerFixture");
  gateway.amount_refunded = 50000;
  f.state.gatewayRefunds.set("rfnd_One", {
    id: "rfnd_One",
    payment_id: gateway.id,
    amount: 50000,
    status: "processed",
  });
  const refunds = f.load("lib/finance-refunds.ts");
  await refunds.recordVerifiedRefund("rfnd_One");
  await refunds.recordVerifiedRefund("rfnd_One");
  let current = f.table("FinanceLedger")[0],
    b = policy.ledgerBalances(current);
  assert.equal(current.refundedPaise, 50000);
  assert.equal(b.commissionEarnedPaise, 5000);
  assert.equal(b.providerRecoveryPaise, 45000);
  assert.equal(f.table("Payment").length, 1);
  assert.equal(f.table("Invoice")[0].amountPaid, 1000);
  assert.equal(f.table("Invoice")[0].balanceDue, 0);
  gateway.amount_refunded = 100000;
  f.state.gatewayRefunds.set("rfnd_Two", {
    id: "rfnd_Two",
    payment_id: gateway.id,
    amount: 50000,
    status: "processed",
  });
  await refunds.recordVerifiedRefund("rfnd_Two");
  current = f.table("FinanceLedger")[0];
  assert.equal(current.paymentState, "refunded");
  assert.equal(f.table("Invoice")[0].status, "refunded");
  assert.equal(f.table("Job")[0].paymentStatus, "refunded");
  assert.equal(policy.ledgerBalances(current).providerRecoveryPaise, 90000);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter((row) => row.kind === "customer_refund_recorded").length,
    2,
  );
});
test("commission collection refunds restore original allocated dues without duplicating payments", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    ),
    link = f.state.gatewayLinks.get(collection.reference);
  link.status = "paid";
  link.amount_paid = 10000;
  link.payments = [
    { payment_id: "pay_CollectedRefund", amount: 10000, status: "captured" },
  ];
  f.state.gatewayPayments.set("pay_CollectedRefund", {
    id: "pay_CollectedRefund",
    amount: 10000,
    currency: "INR",
    status: "captured",
    order_id: link.order_id,
    amount_refunded: 5000,
  });
  await service.reconcileCollection(String(collection._id));
  f.state.gatewayRefunds.set("rfnd_Collection", {
    id: "rfnd_Collection",
    payment_id: "pay_CollectedRefund",
    amount: 5000,
    status: "processed",
  });
  await f
    .load("lib/finance-refunds.ts")
    .recordVerifiedRefund("rfnd_Collection");
  assert.equal(f.table("FinanceLedger")[0].collectedPaise, 5000);
  assert.equal(
    policy.ledgerBalances(f.table("FinanceLedger")[0]).commissionDuePaise,
    5000,
  );
  assert.equal(f.table("CommissionCollection")[0].refundedPaise, 5000);
});
test("admin adjustments append events and never delete or silently overwrite the original rate/commission", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const row = await cashReady(f, ids),
    ops = f.load("lib/finance-operations.ts");
  await ops.adminFinanceOperation(ids.admin, {
    action: "adjust_ledger",
    requestId: rid(),
    ledgerId: String(row._id),
    commissionDeltaPaise: -1000,
    payoutDeltaPaise: 0,
    reason: "Agreed correction to the commission charge",
  });
  const current = f.table("FinanceLedger")[0];
  assert.equal(current.commissionPaise, 10000);
  assert.equal(current.snapshot.rateBps, 1000);
  assert.equal(current.commissionAdjustmentPaise, -1000);
  assert.equal(policy.ledgerBalances(current).commissionDuePaise, 9000);
  assert.equal(
    f.table("FinanceEvent").filter((row) => row.kind === "adjust_ledger")
      .length,
    1,
  );
});
test("current bill version and amount must match; completed invoices are locked outside audited correction", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids);
  const ledger = f.load("lib/finance-ledger.ts"),
    invoice = await f.models.Invoice.findById(ids.invoiceId);
  await assert.rejects(
    ledger.assertInvoiceMutable(invoice),
    (error) => error.status === 409,
  );
  await assert.rejects(
    ledger.billAction(String(ids.invoiceId), ids.customerActor, {
      action: "confirm",
      requestId: rid(),
      invoiceVersion: 99,
      grossPaise: 100000,
      paymentMode: "cash",
      directPaymentReceived: true,
    }),
    (error) => error.status === 409,
  );
  assert.equal(f.table("Payment").length, 0);
});
test("customer, provider and Pro cancellations save reasons/actor/previous state atomically and create no commission debt", async () => {
  for (const role of ["customerActor", "owner", "techActor"]) {
    const f = createFinanceFixture(),
      ids = f.seed();
    f.table("Job")[0].status = "enroute";
    const actor = ids[role],
      service = f.load("lib/booking-cancellation.ts");
    await service.cancelBooking(actor, String(ids.bookingId), {
      requestId: rid(),
      reason: role === "customerActor" ? "no_longer_needed" : "unavailable",
      note: "Controlled cancellation",
    });
    assert.equal(f.table("Booking")[0].status, "cancelled");
    assert.equal(f.table("Job")[0].status, "cancelled");
    assert.equal(f.table("CancellationCase")[0].previousJobStatus, "enroute");
    assert.equal(f.table("CancellationCase")[0].actorRole, actor.role);
    assert.equal(f.table("FinanceLedger").length, 0);
    assert.equal(f.table("Technician")[0].status, "available");
  }
});
test("cancellation requires a role-valid reason, blocks foreign users and cannot reopen completed work", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    service = f.load("lib/booking-cancellation.ts");
  await assert.rejects(
    service.cancelBooking(ids.customerActor, String(ids.bookingId), {
      requestId: rid(),
      reason: "other",
    }),
    (error) => error.status === 409,
  );
  f.table("Job")[0].status = "assigned";
  await assert.rejects(
    service.cancelBooking(ids.customerActor, String(ids.bookingId), {
      requestId: rid(),
      reason: "safety",
    }),
    (error) => error.status === 400,
  );
  await assert.rejects(
    service.cancelBooking(
      { _id: oid(99), role: "technician" },
      String(ids.bookingId),
      { requestId: rid(), reason: "other" },
    ),
    (error) => error.status === 404,
  );
  assert.equal(f.table("CancellationCase").length, 0);
});
test("cancellation rollback and repeat requests preserve original job state and only one case", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.table("Job")[0].status = "arrived";
  const service = f.load("lib/booking-cancellation.ts"),
    input = { requestId: rid(), reason: "no_longer_needed" };
  f.state.fail = "CancellationCase.create";
  await assert.rejects(
    service.cancelBooking(ids.customerActor, String(ids.bookingId), input),
  );
  assert.equal(f.table("Booking")[0].status, "assigned");
  assert.equal(f.table("Job")[0].status, "arrived");
  await Promise.all([
    service.cancelBooking(ids.customerActor, String(ids.bookingId), input),
    service.cancelBooking(ids.customerActor, String(ids.bookingId), input),
  ]);
  assert.equal(f.table("CancellationCase").length, 1);
});
test("only the linked customer answers cancellation feedback once; admin review is audited without automatic penalties or fees", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.table("Job")[0].status = "enroute";
  const service = f.load("lib/booking-cancellation.ts");
  await service.cancelBooking(ids.customerActor, String(ids.bookingId), {
    requestId: rid(),
    reason: "no_arrival",
  });
  await assert.rejects(
    service.cancellationFeedback(ids.techActor, String(ids.bookingId), {
      requestId: rid(),
      answer: "yes",
    }),
    (error) => error.status === 403,
  );
  const input = {
    requestId: rid(),
    answer: "yes",
    note: "Please review this customer report",
  };
  await service.cancellationFeedback(
    ids.customerActor,
    String(ids.bookingId),
    input,
  );
  await service.cancellationFeedback(
    ids.customerActor,
    String(ids.bookingId),
    input,
  );
  await assert.rejects(
    service.cancellationFeedback(ids.customerActor, String(ids.bookingId), {
      ...input,
      requestId: rid(),
    }),
    (error) => error.status === 409,
  );
  const record = f.table("CancellationCase")[0];
  await f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
    action: "review_cancellation",
    requestId: rid(),
    caseId: String(record._id),
    status: "under_review",
    reason: "Checking chat and both parties' reports",
  });
  assert.equal(f.table("CancellationCase")[0].reviewStatus, "under_review");
  assert.equal(f.table("FinanceLedger").length, 0);
  assert.equal(f.table("ServiceProvider")[0].status, "active");
});
test("actual finance HTTP routes reject unauthenticated and wrong-role callers before reading financial data", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  const admin = f.load("app/api/admin/finance/route.ts"),
    provider = f.load(
      "app/api/service-provider/finance/payout-details/route.ts",
    );
  for (const role of [
    "customer",
    "technician",
    "service_provider",
    "dispatcher",
  ]) {
    f.state.actor = { _id: ids.owner._id, role };
    assert.equal(
      (await admin.GET(f.request("/api/admin/finance", null, "GET"))).status,
      403,
    );
  }
  for (const role of ["customer", "technician", "admin"]) {
    f.state.actor = { _id: ids.owner._id, role };
    assert.equal((await provider.GET()).status, 403);
  }
  f.state.actor = null;
  assert.equal(
    (await admin.GET(f.request("/api/admin/finance", null, "GET"))).status,
    401,
  );
  assert.equal((await provider.GET()).status, 401);
});
test("actual bill route enforces same-origin JSON writes and never exposes business commission or payout details to the customer", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids);
  f.state.actor = ids.customerActor;
  const route = f.load("app/api/finance/invoices/[id]/route.ts"),
    params = { params: Promise.resolve({ id: String(ids.invoiceId) }) };
  const read = await route.GET(
      f.request("/api/finance/invoices/" + ids.invoiceId, null, "GET"),
      params,
    ),
    json = await read.json();
  assert.equal(read.status, 200);
  assert.equal(json.bill.grossPaise, 100000);
  assert.equal(JSON.stringify(json).includes("rateBps"), false);
  assert.equal(JSON.stringify(json).includes("providerId"), false);
  assert.match(read.headers.get("cache-control"), /no-store/);
  const response = await route.POST(
    f.request(
      "/api/finance/invoices/" + ids.invoiceId,
      {
        action: "confirm",
        requestId: rid(),
        invoiceVersion: 1,
        grossPaise: 100000,
        paymentMode: "cash",
        directPaymentReceived: true,
      },
      "POST",
      { origin: "https://other.example" },
    ),
    params,
  );
  assert.equal(response.status, 403);
  assert.equal(f.table("Payment").length, 0);
});
test("protected maintenance job rejects missing/wrong secrets and has no unprotected public write path", async () => {
  const previous = process.env.FINANCE_COLLECTION_JOB_TOKEN;
  process.env.FINANCE_COLLECTION_JOB_TOKEN = "a".repeat(64);
  try {
    const f = createFinanceFixture();
    f.seed();
    const route = f.load("app/api/internal/finance/maintenance/route.ts");
    for (const authorization of ["", `Bearer ${"b".repeat(64)}`]) {
      const response = await route.POST(
        f.request(
          "/api/internal/finance/maintenance",
          { action: "weekly_reminders" },
          "POST",
          { authorization },
        ),
      );
      assert.equal(response.status, 401);
    }
    assert.equal(f.table("CollectionReminder").length, 0);
  } finally {
    if (previous === undefined) delete process.env.FINANCE_COLLECTION_JOB_TOKEN;
    else process.env.FINANCE_COLLECTION_JOB_TOKEN = previous;
  }
});

test("zero-value bills require approval but create no fictitious payment or commission collection", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    invoice = f.table("Invoice")[0];
  invoice.grandTotal = 0;
  invoice.subtotal = 0;
  invoice.balanceDue = 0;
  invoice.items = [];
  await submit(f, ids, "cash", 0);
  await f
    .load("lib/finance-ledger.ts")
    .billAction(String(ids.invoiceId), ids.customerActor, {
      action: "confirm",
      requestId: rid(),
      invoiceVersion: 1,
      grossPaise: 0,
      paymentMode: "cash",
      directPaymentReceived: false,
    });
  const row = f.table("FinanceLedger")[0];
  assert.equal(row.paymentState, "not_required");
  assert.equal(f.table("Job")[0].paymentStatus, "not_required");
  assert.equal(policy.ledgerBalances(row).ready, true);
  assert.equal(f.table("Payment").length, 0);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  await assert.rejects(
    f
      .load("lib/finance-collections.ts")
      .createCollectionLink(ids.owner, ids.providerId, rid()),
    (error) => error.status === 409,
  );
});
test("a configured zero percent commission remains a valid saved rule", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  f.table("Booking")[0].commissionSnapshot.rateBps = 0;
  await cashReady(f, ids);
  const row = f.table("FinanceLedger")[0];
  assert.equal(row.commissionPaise, 0);
  assert.equal(row.policyState, "ready");
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 0);
  assert.equal(policy.ledgerBalances(row).providerRetainedPaise, 100000);
});
test("a partial refund reverses the adjusted commission proportionally while preserving the original charge", async () => {
  const f = createFinanceFixture(),
    ids = f.seed(),
    row = await onlineReady(f, ids);
  await f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
    action: "adjust_ledger",
    requestId: rid(),
    ledgerId: String(row._id),
    commissionDeltaPaise: -1000,
    payoutDeltaPaise: 0,
    reason: "Agreed original commission correction",
  });
  f.state.gatewayPayments.get("pay_CustomerFixture").amount_refunded = 50000;
  f.state.gatewayRefunds.set("rfnd_Adjusted", {
    id: "rfnd_Adjusted",
    payment_id: "pay_CustomerFixture",
    amount: 50000,
    status: "processed",
  });
  await f.load("lib/finance-refunds.ts").recordVerifiedRefund("rfnd_Adjusted");
  const current = f.table("FinanceLedger")[0],
    balance = policy.ledgerBalances(current);
  assert.equal(current.commissionPaise, 10000);
  assert.equal(balance.commissionEarnedPaise, 4500);
  assert.equal(balance.commissionReversedPaise, 4500);
  assert.equal(balance.payoutWaitingPaise, 45500);
});
test("refunding an extra online capture does not reverse the original bill, commission or provider payable", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await onlineReady(f, ids);
  await capture(f, ids, "pay_ExtraOnline");
  let row = f.table("FinanceLedger")[0];
  assert.equal(row.billState, "disputed");
  assert.equal(row.onlineReceivedPaise, 200000);
  assert.equal(row.unallocatedReceivedPaise, 100000);
  f.state.gatewayPayments.get("pay_ExtraOnline").amount_refunded = 100000;
  f.state.gatewayRefunds.set("rfnd_Extra", {
    id: "rfnd_Extra",
    payment_id: "pay_ExtraOnline",
    amount: 100000,
    status: "processed",
  });
  await f.load("lib/finance-refunds.ts").recordVerifiedRefund("rfnd_Extra");
  await f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
    action: "review_bill",
    requestId: rid(),
    ledgerId: String(row._id),
    resolution: "verified_online",
    reason: "Verified original payment and returned the duplicate",
  });
  row = f.table("FinanceLedger")[0];
  assert.equal(row.refundedPaise, 0);
  assert.equal(row.unallocatedRefundedPaise, 100000);
  assert.equal(f.table("Invoice")[0].status, "paid");
  assert.equal(policy.ledgerBalances(row).commissionEarnedPaise, 10000);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 90000);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter((event) => event.externalKey?.startsWith("razorpay-payment:"))
      .length,
    2,
  );
});
test("an extra online capture after cash confirmation is returned without creating an online provider payout", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  await capture(f, ids, "pay_ExtraAfterCash");
  let row = f.table("FinanceLedger")[0];
  assert.equal(row.paymentMode, "cash");
  assert.equal(row.billState, "disputed");
  f.state.gatewayPayments.get("pay_ExtraAfterCash").amount_refunded = 100000;
  f.state.gatewayRefunds.set("rfnd_CashExtra", {
    id: "rfnd_CashExtra",
    payment_id: "pay_ExtraAfterCash",
    amount: 100000,
    status: "processed",
  });
  await f.load("lib/finance-refunds.ts").recordVerifiedRefund("rfnd_CashExtra");
  await f.load("lib/finance-operations.ts").adminFinanceOperation(ids.admin, {
    action: "review_bill",
    requestId: rid(),
    ledgerId: String(row._id),
    resolution: "verified_direct",
    reference: "Cash receipt and duplicate refund evidence",
    reason:
      "Verified original cash receipt and returned duplicate online payment",
  });
  row = f.table("FinanceLedger")[0];
  assert.equal(row.paymentMode, "cash");
  assert.equal(row.refundedPaise, 0);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 10000);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
  assert.equal(policy.financeSummary([row]).onlineReceivedPaise, 100000);
  assert.equal(f.table("Payment").length, 2);
});
test("switching an approved unpaid cash bill to online funds requires a new customer confirmation", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await submit(f, ids, "cash", 0);
  await confirm(f, ids, false);
  await capture(f, ids);
  const row = f.table("FinanceLedger")[0];
  assert.equal(row.paymentMode, "servizato_online");
  assert.equal(row.billState, "pending");
  assert.equal(row.invoiceVersion, 2);
  assert.equal(row.confirmedAt, undefined);
  assert.equal(policy.ledgerBalances(row).payoutWaitingPaise, 0);
});
test("financial sums reject unsafe integer totals instead of silently rounding balances", () => {
  assert.equal(
    policy.sumPaise([Number.MAX_SAFE_INTEGER - 1, 1]),
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(
    () => policy.sumPaise([Number.MAX_SAFE_INTEGER, 1]),
    RangeError,
  );
  assert.throws(() => policy.sumPaise([-1]), /Invalid amount/);
  const row = {
    grossPaise: Number.MAX_SAFE_INTEGER,
    jobCompleted: true,
    billState: "pending",
    paymentState: "unpaid",
    policyState: "missing_policy",
  };
  assert.throws(() => policy.financeSummary([row, row]), RangeError);
});

test("a collection refund arriving before its capture is audited without settling debt; a full return releases its reservation", async () => {
  const f = createFinanceFixture(),
    ids = f.seed();
  await cashReady(f, ids);
  const service = f.load("lib/finance-collections.ts"),
    { collection } = await service.createCollectionLink(
      ids.owner,
      ids.providerId,
      rid(),
    ),
    link = f.state.gatewayLinks.get(collection.reference);
  link.status = "paid";
  link.amount_paid = 10000;
  link.payments = [
    { payment_id: "pay_EarlyRefund", amount: 10000, status: "captured" },
  ];
  f.state.gatewayPayments.set("pay_EarlyRefund", {
    id: "pay_EarlyRefund",
    order_id: link.order_id,
    amount: 10000,
    currency: "INR",
    status: "refunded",
    captured: true,
    amount_refunded: 10000,
  });
  f.state.gatewayRefunds.set("rfnd_Early", {
    id: "rfnd_Early",
    payment_id: "pay_EarlyRefund",
    amount: 10000,
    status: "processed",
  });
  await f.load("lib/finance-refunds.ts").recordVerifiedRefund("rfnd_Early");
  await service.reconcileCollection(String(collection._id));
  const current = f.table("CommissionCollection")[0],
    row = f.table("FinanceLedger")[0];
  assert.equal(current.status, "review");
  assert.equal(current.refundedPaise, 10000);
  assert.equal(current.activeKey, undefined);
  assert.equal(row.collectionId, undefined);
  assert.equal(row.collectedPaise, 0);
  assert.equal(policy.ledgerBalances(row).commissionDuePaise, 10000);
  assert.equal(
    f
      .table("FinanceEvent")
      .filter(
        (event) => event.externalKey === "razorpay-payment:pay_EarlyRefund",
      ).length,
    1,
  );
  await service.createCollectionLink(ids.owner, ids.providerId, rid());
  assert.equal(f.table("CommissionCollection").length, 2);
});
