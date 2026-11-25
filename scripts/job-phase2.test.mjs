import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as pdfRenderer from "@react-pdf/renderer";
import { createFinanceFixture, fixtureId } from "./helpers/finance-fixture.mjs";
import {
  deliveryFixture,
  drainPushTasks,
} from "./helpers/push-delivery-fixture.mjs";
import { safePushPath } from "../lib/push-policy.mjs";
import { invoicePaymentNotificationLink } from "../lib/notification-client.mjs";

const price = (basePrice, discountAmount, taxPercent = 18, offerName) => ({
  basePrice,
  discountAmount,
  finalPrice: basePrice - discountAmount,
  taxPercent,
  offerName,
});
const line = (amount, extra = {}) => ({
  itemType: "service",
  description: "Fixture tap service",
  qty: 1,
  unitPrice: amount,
  amount,
  taxable: true,
  ...extra,
});
const build = (
  items,
  subtotal,
  discountAmount,
  taxAmount,
  grandTotal,
  extra = {},
) => ({
  currency: "INR",
  items,
  subtotal,
  discountAmount,
  taxPercent: 18,
  taxAmount,
  grandTotal,
  ...extra,
});
const rows = (view) =>
  Object.fromEntries(view.rows.map(({ label, amount }) => [label, amount]));
const cents = (value) => Math.round(value * 100);
function checkTotal(view, total) {
  const figures = rows(view);
  const net =
    figures["Taxable subtotal"] ??
    figures["Subtotal after discount"] ??
    figures["Subtotal before tax"];
  const original = figures["Subtotal before discount"] ?? net;
  assert.equal(
    cents(
      original +
        (figures.Discount ?? 0) +
        (figures["Rounding adjustment"] ?? 0),
    ),
    cents(net),
  );
  const tax = view.rows.find(({ label }) => label.startsWith("Tax (")).amount;
  assert.equal(cents(net + tax), cents(total));
  assert.equal(figures["Total payable"], total);
}

test("job, fixed, percentage, no-discount and multi-line invoice views reconcile to the saved payable", () => {
  const f = createFinanceFixture();
  const { invoiceBreakdown } = f.load("lib/invoice-breakdown.ts");
  const sample = build([line(449)], 449, 50, 80.82, 529.82, {
    quotePricingSource: "job",
  });
  const before = f.clone(sample);
  const visible = invoiceBreakdown(sample, price(499, 50, 18, "WELCOME50"));
  assert.equal(visible.items[0].unitPrice, 499);
  assert.equal(visible.promotion, "WELCOME50");
  assert.deepEqual(rows(visible), {
    "Subtotal before discount": 499,
    Discount: -50,
    "Taxable subtotal": 449,
    "Tax (18%)": 80.82,
    "Total payable": 529.82,
  });
  assert.deepEqual(sample, before);
  for (const [input, booking, expectedUnit] of [
    [build([line(100)], 100, 0, 18, 118), price(100, 0), 100],
    [
      build(
        [line(180, { qty: 2, unitPrice: 90 }), line(25, { itemType: "part" })],
        205,
        20,
        36.9,
        241.9,
      ),
      { ...price(200, 20), pricingModel: "per_unit", quantity: 2 },
      100,
    ],
    [
      build(
        [line(100), line(150, { description: "Second service line" })],
        250,
        25,
        45,
        270,
      ),
      price(250, 25),
      100,
    ],
    [build([line(200), line(150)], 350, 50, 54, 354), undefined, 200],
    [
      build(
        [line(100), line(20, { itemType: "part", taxable: false })],
        120,
        0,
        18,
        138,
      ),
      undefined,
      100,
    ],
  ]) {
    const view = invoiceBreakdown(input, booking);
    checkTotal(view, input.grandTotal);
    assert.equal(view.items[0].unitPrice, expectedUnit);
  }
  const uncertain = invoiceBreakdown(
    build([line(100), line(150)], 250, 25, 45, 295),
  );
  assert.equal(uncertain.pricesIncludeDiscount, true);
  assert.equal(uncertain.promotion, undefined);
});

test("issued promotion snapshot survives edits and an unsigned legacy discount does not acquire an invented name", async () => {
  const f = createFinanceFixture();
  const ids = f.seed();
  f.table("Invoice").length = 0;
  const booking = f.table("Booking")[0];
  const job = f.table("Job")[0];
  delete job.invoiceId;
  booking.pricing = price(499, 50, 18, "Original fixture promo");
  const { generateInvoiceForJob } = f.load(
    "lib/billing/generateInvoiceForJob.ts",
  );
  const invoice = await generateInvoiceForJob(ids.jobId);
  assert.deepEqual(invoice.appliedPromotion, {
    name: "Original fixture promo",
  });
  const { invoiceBreakdown } = f.load("lib/invoice-breakdown.ts");
  booking.pricing.offerName = "Altered name";
  f.table("ServiceOffering")[0].offerName = "New master offer";
  assert.equal(
    invoiceBreakdown(invoice, booking.pricing).promotion,
    "Original fixture promo",
  );
  assert.equal(invoice.grandTotal, 529.82);
  await generateInvoiceForJob(ids.jobId);
  assert.equal(f.table("Invoice").length, 1);
  const legacy = {
    ...invoice,
    quotePricingSource: undefined,
    appliedPromotion: undefined,
  };
  assert.equal(invoiceBreakdown(legacy, price(499, 50)).promotion, undefined);
  assert.equal(
    invoiceBreakdown({
      ...legacy,
      appliedPromotion: { name: "Welcome", code: "FIXTURE50" },
    }).promotion,
    "Welcome (FIXTURE50)",
  );
  assert.equal(
    invoiceBreakdown({ ...legacy, appliedPromotion: null }, booking.pricing)
      .promotion,
    undefined,
  );
});

test("shared customer and provider invoice breakdown and real PDF renderer display the original price and saved promotion", async () => {
  const f = createFinanceFixture();
  const ids = f.seed();
  Object.assign(
    f.table("Invoice")[0],
    build([line(449)], 449, 50, 80.82, 529.82, {
      quotePricingSource: "job",
      appliedPromotion: { name: "Fixture WELCOME50" },
      balanceDue: 529.82,
    }),
  );
  const runtime = {
    "@react-pdf/renderer": pdfRenderer,
    "next-auth": {
      getServerSession: async () => ({
        user: { id: String(ids.customerActor._id) },
      }),
    },
    "@/lib/auth-options": { authOptions: {} },
    "@/lib/customer": {
      requireCustomer: async () => ({ customer: { _id: ids.customerId } }),
    },
    "@/lib/service-provider": {
      requireServiceProvider: async () => ({
        provider: { _id: ids.providerId },
      }),
    },
  };
  const params = { params: Promise.resolve({ id: String(ids.invoiceId) }) };
  const request = new Request("http://localhost/invoice");
  const customer = await f
    .load("app/api/customer/invoices/[id]/route.ts", runtime)
    .GET(request, params);
  const provider = await f
    .load("app/api/service-provider/finance/invoices/[id]/route.ts", runtime)
    .GET(request, params);
  assert.equal(customer.status, 200);
  assert.equal(provider.status, 200);
  const customerView = (await customer.json()).breakdown;
  const providerView = (await provider.json()).breakdown;
  assert.deepEqual(customerView, providerView);
  const { InvoiceBreakdown } = f.load(
    "components/invoice/InvoiceBreakdown.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(InvoiceBreakdown, { breakdown: customerView }),
  );
  assert.match(html, /₹499\.00/);
  assert.match(html, /-₹50\.00/);
  assert.match(html, /₹529\.82/);
  assert.match(html, /Fixture WELCOME50/);

  f.state.actor = ids.customerActor;
  const pdf = await f
    .load("app/api/invoices/[id]/pdf/route.tsx", runtime)
    .GET(request, params);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
  assert.match(pdf.headers.get("Content-Disposition"), /attachment/);
  assert.match(
    Buffer.from(await pdf.arrayBuffer()).toString("latin1", 0, 8),
    /^%PDF-/,
  );
});

function requestFixture() {
  const f = createFinanceFixture();
  const ids = f.seed();
  const actual = f.models.ServiceOffering;
  const provider = f.table("ServiceProvider")[0];
  provider.coverageVersion = 1;
  provider.coverageAreas = [
    { city: "Patna", state: "Bihar", pincode: "800001", isActive: true },
  ];
  const route = f.load("app/api/customer/service-requests/route.ts", {
    "@/models/ServiceOffering": {
      findOne: actual.findOne,
      findById(id) {
        const query = actual.findById(id);
        return {
          populate() {
            return this;
          },
          async lean() {
            const service = await query.lean();
            if (!service) return null;
            return {
              ...service,
              serviceProviderId: await f.models.ServiceProvider.findById(
                service.serviceProviderId,
              ).lean(),
              priceItemId: await f.models.PriceItem.findById(
                service.priceItemId,
              ).lean(),
            };
          },
        };
      },
    },
    "next-auth": {
      getServerSession: async () => ({
        user: { id: String(ids.customerActor._id) },
      }),
    },
    "@/lib/auth-options": { authOptions: {} },
  });
  f.state.actor = ids.customerActor;
  const payload = () => ({
    requestKey: randomUUID(),
    destinationConfirmed: true,
    serviceOfferingId: String(ids.offeringId),
    address: {
      addressLine: "Fixture private address line",
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
    },
    description: "Fixture private notes",
  });
  return {
    f,
    ids,
    route,
    provider,
    payload,
    post: (body) =>
      route.POST(f.request("/api/customer/service-requests", body)),
  };
}

test("successful request notifies only the chosen eligible business, once across identical retries", async () => {
  const { f, provider, ids, payload, post } = requestFixture();
  const alternate = fixtureId(21);
  f.table("User").push({
    _id: alternate,
    role: "service_provider",
    isActive: true,
  });
  f.table("ServiceProvider").push({
    ...provider,
    _id: fixtureId(22),
    ownerId: alternate,
  });
  f.table("ServiceOffering").push({
    ...f.table("ServiceOffering")[0],
    _id: fixtureId(23),
    serviceProviderId: fixtureId(22),
  });
  const body = payload();
  const responses = await Promise.all([post(body), post(body)]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 201]);
  assert.equal(f.table("ServiceRequest").length, 1);
  assert.equal(f.state.notifications.length, 1);
  const [notice] = f.state.notifications;
  assert.equal(notice.recipientUserId, String(ids.owner._id));
  assert.equal(notice.recipientRole, "service_provider");
  assert.equal(notice.type, "booking");
  assert.equal(notice.entityType, "service_request");
  assert.equal(notice.pushEvent, "service_request_created");
  assert.equal(
    safePushPath(notice.actionUrl, "service_provider"),
    "/service-provider/booking-requests",
  );
  assert.doesNotMatch(
    JSON.stringify(notice),
    /private address|private notes|800001/,
  );
  assert.equal(
    (await post({ ...body, description: "Changed request" })).status,
    409,
  );
  assert.equal(f.state.notifications.length, 1);
});

test("uncovered, inactive, wrong-category, non-provider and failed saves create no provider notification", async () => {
  for (const [name, change, status] of [
    [
      "outside coverage",
      (s, body) => {
        body.address.pincode = "800020";
      },
      201,
    ],
    [
      "suspended provider",
      (s) => {
        s.provider.status = "suspended";
      },
      400,
    ],
    [
      "inactive catalog",
      (s) => {
        s.f.table("PriceItem")[0].isActive = false;
      },
      400,
    ],
    [
      "wrong category",
      (s) => {
        s.f.table("PriceItem")[0].categoryKey = "fixture_unknown";
      },
      400,
    ],
    [
      "inactive owner",
      (s) => {
        s.f.table("User")[1].isActive = false;
      },
      201,
    ],
    [
      "wrong role",
      (s) => {
        s.f.table("User")[1].role = "technician";
      },
      201,
    ],
    [
      "failed save",
      (s) => {
        s.f.state.fail = "ServiceRequest.create";
      },
      500,
    ],
  ]) {
    const s = requestFixture(),
      body = s.payload();
    change(s, body);
    assert.equal((await s.post(body)).status, status, name);
    assert.equal(s.f.state.notifications.length, 0, name);
  }
  const s = requestFixture(),
    request = s.payload();
  s.f.state.notificationsFail = true;
  assert.equal((await s.post(request)).status, 201);
  assert.equal(s.f.table("ServiceRequest").length, 1);
  s.f.state.notificationsFail = false;
  assert.equal((await s.post(request)).status, 200);
  assert.equal(s.f.state.notifications.length, 1);
});

test("new provider notification schedules generic push through existing device ownership and delivery claims", async () => {
  for (const count of [0, 2]) {
    const f = deliveryFixture();
    f.user.role = "service_provider";
    for (let index = 0; index < count; index++) f.device(index + 2);
    const input = {
      recipientUserId: f.user._id,
      recipientRole: "service_provider",
      type: "booking",
      entityType: "service_request",
      actionUrl: "/service-provider/booking-requests",
      title: "New service request",
      message: "Fixture private details stay in app",
      pushEvent: "service_request_created",
      dedupeKey: "service-request:" + count,
    };
    await f.creator.createNotification(input);
    await f.creator.createNotification(input);
    await drainPushTasks();
    assert.equal(f.state.notifications.length, 1);
    assert.equal(f.state.sent.length, count);
    for (const sent of f.state.sent)
      assert.deepEqual(Object.keys(JSON.parse(sent.payload)), [
        "v",
        "notificationId",
        "subscriptionId",
        "bindingToken",
      ]);
  }
});

function checkoutFixture() {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  const f = createFinanceFixture();
  const ids = f.seed({ razorpayOrderId: undefined });
  const finance = f.load("lib/finance-ledger.ts");
  f.auth.requireRole = async (roles) => {
    const user = await f.auth.requireCurrentUser();
    if (!roles.includes(user.role))
      throw new f.auth.ApiAuthError("Forbidden", 403);
    return { user };
  };
  const orders = new Map();
  let loseResponse = false;
  let paused;
  const gateway = {
    ...f.gateway,
    async createRazorpayOrder({ amountPaise, currency, receipt }) {
      if (orders.has(receipt)) throw new Error("Duplicate fixture receipt");
      const order = {
        id: "order_ExistingCheckout",
        amount: amountPaise,
        amount_due: amountPaise,
        currency,
        status: "created",
        receipt,
      };
      orders.set(receipt, order);
      if (paused) await paused();
      if (loseResponse) throw new Error("Gateway response lost after creation");
      return order;
    },
    async findRazorpayOrderByReceipt(receipt) {
      return orders.get(receipt) ?? null;
    },
    async getRazorpayOrder(orderId) {
      return Array.from(orders.values()).find((order) => order.id === orderId);
    },
  };
  const invoicePath = "/api/invoices/" + ids.invoiceId + "/razorpay";
  const billPath = "/api/finance/invoices/" + ids.invoiceId;
  const params = { params: Promise.resolve({ id: String(ids.invoiceId) }) };
  const orderHandler = f.load("app/api/invoices/[id]/razorpay/order/route.ts", {
    "@/lib/razorpay": gateway,
  });
  const paymentLink = f.load(
    "app/api/invoices/[id]/razorpay/payment-link/route.ts",
  );
  const bill = f.load("app/api/finance/invoices/[id]/route.ts");
  const submit = (paymentMode = "servizato_online") =>
    finance.billAction(String(ids.invoiceId), ids.owner, {
      action: "submit",
      paymentMode,
      requestId: randomUUID(),
      invoiceVersion: f.table("FinanceLedger")[0]?.invoiceVersion ?? 1,
      collectedPaise: 0,
    });
  function callConfirm(
    requestId = randomUUID(),
    paymentMode = "servizato_online",
  ) {
    f.state.actor = ids.customerActor;
    return bill.POST(
      f.request(billPath, {
        action: "confirm",
        paymentMode,
        requestId,
        invoiceVersion: f.table("FinanceLedger")[0].invoiceVersion,
        grossPaise: 100000,
        directPaymentReceived: false,
      }),
      params,
    );
  }
  const readBill = async () => {
    f.state.actor = ids.customerActor;
    const response = await bill.GET(
      f.request(billPath, undefined, "GET"),
      params,
    );
    assert.equal(response.status, 200);
    return (await response.json()).bill;
  };
  function createOrder(actor = ids.customerActor) {
    f.state.actor = actor;
    return orderHandler.POST(
      f.request(invoicePath + "/order", { amount: 1, status: "paid" }),
      params,
    );
  }
  function createLink() {
    f.state.actor = ids.admin;
    return paymentLink.POST(
      f.request(invoicePath + "/payment-link", {}),
      params,
    );
  }
  return {
    f,
    ids,
    orders,
    submit,
    callConfirm,
    readBill,
    createOrder,
    createLink,
    loseResponse: () => {
      loseResponse = true;
    },
    pauseGateway: (wait) => {
      paused = wait;
    },
  };
}

test("checkout and bill CTA turn on only after online confirmation, reuse the server-priced order, and turn off after verified funds", async () => {
  const s = checkoutFixture();
  assert.equal((await s.readBill()).canPayOnline, false);
  assert.equal((await s.createOrder()).status, 409);
  await s.submit();
  assert.equal((await s.readBill()).canPayOnline, false);
  assert.equal((await s.createOrder()).status, 409);
  const key = randomUUID();
  assert.equal((await s.callConfirm(key)).status, 200);
  assert.equal((await s.readBill()).canPayOnline, true);
  assert.equal((await s.callConfirm(key)).status, 200);
  const ready = s.f.state.notifications.filter(
    (notice) => notice.actionKind === "pay_invoice",
  );
  assert.equal(ready.length, 1);
  assert.equal(ready[0].recipientUserId, String(s.ids.customerActor._id));
  assert.equal(ready[0].pushEvent, "bill_review");
  assert.equal(
    invoicePaymentNotificationLink(ready[0], "customer"),
    `/customer/bookings/${s.ids.bookingId}#final-bill`,
  );
  assert.equal(
    safePushPath(ready[0].actionUrl, "customer"),
    `/customer/bookings/${s.ids.bookingId}`,
  );
  assert.equal(invoicePaymentNotificationLink(ready[0], "technician"), null);
  assert.equal(
    invoicePaymentNotificationLink(
      { ...ready[0], actionUrl: "//example.invalid" },
      "customer",
    ),
    null,
  );
  assert.doesNotMatch(
    JSON.stringify(ready[0]),
    /100000|phone|email|signature|order_/,
  );

  const outsider = { _id: fixtureId(121), role: "customer" };
  s.f.table("Customer").push({ _id: fixtureId(122), userId: outsider._id });
  assert.equal((await s.createOrder(outsider)).status, 403);
  s.loseResponse();
  const first = await s.createOrder();
  const retry = await s.createOrder();
  assert.equal(first.status, 200);
  assert.equal(retry.status, 200);
  const { order } = await first.json();
  assert.equal(order.amount, 100000);
  assert.deepEqual((await retry.json()).order, order);
  assert.equal(s.orders.size, 1);
  assert.equal((await s.createLink()).status, 409);
  const verify = s.f.load(
    "lib/razorpay-payment.ts",
  ).finalizeSuccessfulRazorpayPayment;
  const verified = {
    invoiceId: String(s.ids.invoiceId),
    orderId: order.id,
    paymentId: "pay_ControlledPhaseTwo",
    paidAmountPaise: 100000,
    expectedAmountPaise: 100000,
    method: "upi",
    source: "webhook",
  };
  await verify(verified);
  assert.equal((await verify(verified)).duplicate, true);
  assert.equal(s.f.table("Payment").length, 1);
  assert.equal(s.f.table("FinanceLedger").length, 1);
  assert.equal(s.f.table("FinanceLedger")[0].commissionPaise, 10000);
  assert.deepEqual(
    [(await s.readBill()).canPayOnline, (await s.readBill()).invoiceStatus],
    [false, "paid"],
  );
  assert.equal((await s.createOrder()).status, 409);
  await s.callConfirm(key);
  assert.equal(
    s.f.state.notifications.filter((notice) =>
      notice.title.startsWith("Your bill is ready"),
    ).length,
    1,
  );
});

test("ineligible booking invoices never reach the Razorpay order or link APIs", async () => {
  const examples = [
    [
      "cash",
      (s) => {
        s.f.table("FinanceLedger")[0].paymentMode = "cash";
      },
    ],
    [
      "UPI",
      (s) => {
        s.f.table("FinanceLedger")[0].paymentMode = "direct_upi";
      },
    ],
    [
      "disputed",
      (s) => {
        s.f.table("FinanceLedger")[0].billState = "disputed";
      },
    ],
    [
      "cancelled booking",
      (s) => {
        s.f.table("Booking")[0].status = "cancelled";
      },
    ],
    [
      "cancelled invoice",
      (s) => {
        s.f.table("Invoice")[0].status = "cancelled";
      },
    ],
    [
      "draft",
      (s) => {
        s.f.table("Invoice")[0].status = "draft";
      },
    ],
    [
      "zero due",
      (s) => {
        s.f.table("Invoice")[0].balanceDue = 0;
      },
    ],
    [
      "pending receipt",
      (s) => {
        s.f
          .table("Payment")
          .push({ invoiceId: s.ids.invoiceId, status: "created" });
      },
    ],
    [
      "successful payment",
      (s) => {
        s.f
          .table("Payment")
          .push({ invoiceId: s.ids.invoiceId, status: "success" });
      },
    ],
    [
      "pending revised quote",
      (s) => {
        s.f.table("Job")[0].latestQuoteId = "fixture_quote";
        s.f
          .table("JobQuote")
          .push({
            _id: "fixture_quote",
            jobId: s.ids.jobId,
            status: "pending_customer_approval",
          });
      },
    ],
    [
      "invoice price mismatch",
      (s) => {
        s.f.table("Booking")[0].pricing.finalPrice = 700;
      },
    ],
  ];
  for (const [name, edit] of examples) {
    const s = checkoutFixture();
    await s.submit();
    assert.equal((await s.callConfirm()).status, 200, name);
    edit(s);
    assert.equal((await s.readBill()).canPayOnline, false, name);
    assert.equal((await s.createOrder()).status, 409, name);
    assert.equal((await s.createLink()).status, 409, name);
    assert.equal(s.orders.size, 0, name);
    assert.equal(s.f.state.gatewayCreates, 0, name);
  }
});

test("new checkout channel is serialized against staff links, bill resubmission and dispute while the gateway runs", async () => {
  const s = checkoutFixture();
  await s.submit();
  assert.equal((await s.callConfirm()).status, 200);
  let notify, release;
  const reachedGateway = new Promise((resolve) => {
    notify = resolve;
  });
  s.pauseGateway(() => {
    notify();
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  const creating = s.createOrder();
  await reachedGateway;
  const other = await s.createOrder();
  assert.equal(other.status, 200);
  assert.equal((await s.createLink()).status, 409);
  await assert.rejects(s.submit("cash"), (error) => error.status === 409);
  const { billAction } = s.f.load("lib/finance-ledger.ts");
  await billAction(String(s.ids.invoiceId), s.ids.customerActor, {
    action: "dispute",
    reason: "Fixture asks for bill review",
    invoiceVersion: 1,
    requestId: randomUUID(),
  });
  release();
  assert.equal((await creating).status, 409);
  assert.equal(s.orders.size, 1);
  assert.equal((await s.readBill()).canPayOnline, false);
});

test("confirmed final-bill UI renders one prominent payment button and preserves other bill actions", async () => {
  const s = checkoutFixture();
  await s.submit();
  assert.equal((await s.callConfirm()).status, 200);
  const bill = await s.readBill();
  const { FinalBillPanel } = s.f.load("components/finance/FinalBillPanel.tsx", {
    "next-auth/react": {
      useSession: () => ({ data: { user: s.ids.customerActor } }),
    },
    "@/hooks/useFinance": {
      useFinanceQuery: () => ({ data: { bill } }),
      useFinanceAction: () => ({ isPending: false }),
    },
    "@tanstack/react-query": { useQueryClient: () => ({}) },
  });
  const render = () =>
    renderToStaticMarkup(
      React.createElement(FinalBillPanel, {
        invoiceId: String(s.ids.invoiceId),
        checkout: { customer: { name: "Fixture Customer" } },
      }),
    );
  const confirmed = render();
  assert.equal(confirmed.match(/Pay securely with Razorpay/g)?.length, 1);
  assert.match(confirmed, /Online payment due/);
  assert.match(confirmed, /Report a problem/);
  bill.canPayOnline = false;
  bill.billState = "pending";
  const pending = render();
  assert.doesNotMatch(pending, /Pay securely with Razorpay/);
  assert.match(pending, /Confirm bill and payment details/);
});
