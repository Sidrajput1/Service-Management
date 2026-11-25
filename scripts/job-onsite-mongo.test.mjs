import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mongoose from "mongoose";
import ts from "typescript";

const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, ".."),
  uri = process.env.PHASE1_LOCAL_MONGO_URI;
function runtime(boundaries) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(root, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} };
    cache.set(absolute, mod);
    const source = ts.transpileModule(readFileSync(absolute, "utf8"), {
      fileName: absolute,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    new Function("require", "module", "exports", source)(
      (name) => {
        if (name in boundaries) return boundaries[name];
        const base = name.startsWith("@/")
          ? path.resolve(root, name.slice(2))
          : name.startsWith(".")
            ? path.resolve(path.dirname(absolute), name)
            : null;
        if (!base) return require(name);
        if (base.endsWith(".mjs")) return require(base);
        const file = [
          base,
          base + ".ts",
          base + ".tsx",
          path.join(base, "index.ts"),
        ].find(
          (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
        );
        if (!file) throw new Error("Missing test module " + name);
        return load(file);
      },
      mod,
      mod.exports,
    );
    return mod.exports;
  }
  return load;
}
test(
  "on-site parts and single-action completion use isolated MongoDB transactions",
  { skip: !uri },
  async (t) => {
    const host = new URL(uri);
    assert.equal(host.protocol, "mongodb:");
    assert.ok(["127.0.0.1", "localhost"].includes(host.hostname));
    assert.ok(!host.username && !host.password && !host.host.includes(","));
    const dbName = `servizato_onsite_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
      try {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
      } finally {
        await mongoose.disconnect();
      }
    });
    const oid = () => new mongoose.Types.ObjectId();
    const actors = {
      technician: { _id: oid(), role: "technician", name: "Fixture Pro" },
      customer: { _id: oid(), role: "customer" },
      service_provider: { _id: oid(), role: "service_provider" },
      admin: { _id: oid(), role: "admin" },
    };
    const providerId = oid(),
      techId = oid(),
      customerId = oid(),
      offeringId = oid();
    let role = "technician";
    class AuthError extends Error {
      constructor(message, status = 401) {
        super(message);
        this.status = status;
      }
    }
    const auth = {
      ApiAuthError: AuthError,
      requireCurrentUser: async () => actors[role],
      requireRole: async (roles) => {
        if (!roles.includes(role)) throw new AuthError("Forbidden", 403);
        return { user: actors[role] };
      },
    };
    const load = runtime({
      "@/lib/auth": auth,
      "./auth": auth,
      "@/lib/db": { connectToDb: async () => mongoose },
      "./db": { connectToDb: async () => mongoose },
      "@/lib/technician": {
        requireTechnicianProfile: async () => {
          if (role !== "technician") throw new AuthError("Forbidden", 403);
          return { tech: { _id: techId }, user: actors.technician };
        },
      },
      "@/lib/notification-recipients": {
        getJobNotificationRecipients: async () => ({}),
      },
      "./push-delivery": { scheduleNotificationPush() {} },
      "@/lib/push-delivery": { scheduleNotificationPush() {} },
    });
    const Booking = load("models/booking.ts").default,
      Job = load("models/job.ts").default,
      Invoice = load("models/invoice.ts").default,
      JobPartEvent = load("models/job-part-event.ts").default,
      JobQuote = load("models/job-quote.ts").default,
      Technician = load("models/technician.ts").default,
      User = load("models/user.ts").default;
    load("models/ServiceProvider.ts");
    load("models/customer.ts");
    load("models/ServiceOffering.ts");
    load("models/PriceItem.ts");
    const { FinanceLedger } = load("models/finance.ts");
    const Payment = load("models/payment.ts").default;
    for (const model of Object.values(mongoose.models)) await model.init();
    for (const [
      collection,
      keys,
      options,
    ] of require("../lib/finance-indexes.mjs").financeIndexDefinitions)
      await mongoose.connection
        .collection(collection)
        .createIndex(keys, options);
    for (const user of Object.values(actors))
      await User.collection.insertOne({ ...user, isActive: true });
    await Technician.create({
      _id: techId,
      userId: actors.technician._id,
      serviceProviderId: providerId,
      isActive: true,
      status: "busy",
    });
    await mongoose.connection
      .collection("serviceproviders")
      .insertOne({
        _id: providerId,
        ownerId: actors.service_provider._id,
        companyName: "Fixture business",
      });
    const add = load("app/api/technician/jobs/[id]/parts/route.ts");
    const edit = load(
      "app/api/technician/jobs/[id]/parts/[partIndex]/route.ts",
    );
    const finish = load("app/api/technician/jobs/[id]/complete/route.ts");
    const call = (handler, id, body, partId) =>
      handler(
        new Request("http://onsite.test/api", {
          method: "POST",
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: String(id), partIndex: partId }) },
      );
    const part = (extra = {}) => ({
      requestId: randomUUID(),
      partName: "Fixture fitting",
      qty: 1,
      price: 100,
      ...extra,
    });
    async function working() {
      const booking = await Booking.create({
        customerId,
        serviceProviderId: providerId,
        technicianId: techId,
        serviceOfferingId: offeringId,
        serviceType: "Fixture service",
        status: "assigned",
        pricing: {
          basePrice: 499,
          finalPrice: 449,
          discountAmount: 50,
          taxPercent: 18,
          offerName: "Fixture offer",
        },
        commissionSnapshot: {
          state: "missing_policy",
          establishedAt: new Date(),
        },
      });
      return Job.create({
        bookingId: booking._id,
        serviceProviderId: providerId,
        technicianId: techId,
        status: "in_progress",
        proofRequired: false,
      });
    }
    let job;
    await t.test(
      "parallel retries add each part once and preserve complete audit rows",
      async () => {
        role = "technician";
        job = await working();
        const request = part();
        const responses = await Promise.all([
          call(add.POST, job._id, request),
          call(add.POST, job._id, request),
          call(add.POST, job._id, part({ price: 75, qty: 2 })),
        ]);
        assert.deepEqual(
          responses.map((r) => r.status),
          [200, 200, 200],
        );
        const saved = await Job.findById(job._id);
        assert.equal(saved.partsUsed.length, 2);
        assert.equal(saved.partsVersion, 2);
        assert.equal(await JobPartEvent.countDocuments({ jobId: job._id }), 2);
        const event = await JobPartEvent.findOne({ jobId: job._id });
        assert.equal(String(event.actorId), String(actors.technician._id));
        assert.equal(event.actorName, "Fixture Pro");
        assert.equal(await JobQuote.countDocuments({ jobId: job._id }), 0);
        await assert.rejects(
          JobPartEvent.updateOne(
            { _id: event._id },
            { $set: { totalAfter: 1 } },
          ),
          /append-only/,
        );
      },
    );
    await t.test(
      "concurrent quantity edits serialize and a retry cannot remove a different part",
      async () => {
        const saved = await Job.findById(job._id),
          partId = saved.partsUsed[0].partId;
        const editBody = {
          requestId: randomUUID(),
          expectedVersion: 2,
          qty: 3,
        };
        const responses = await Promise.all([
          call(edit.PATCH, job._id, editBody, partId),
          call(
            edit.PATCH,
            job._id,
            { ...editBody, requestId: randomUUID(), qty: 4 },
            partId,
          ),
        ]);
        assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
        const current = await Job.findById(job._id);
        const request = {
          requestId: randomUUID(),
          expectedVersion: current.partsVersion,
        };
        assert.equal(
          (await call(edit.DELETE, job._id, request, partId)).status,
          200,
        );
        assert.equal(
          (await call(edit.DELETE, job._id, request, partId)).status,
          200,
        );
        assert.equal((await Job.findById(job._id)).partsUsed.length, 1);
      },
    );
    await t.test(
      "invoice persistence failure rolls back completion, frozen pricing and ledger creation",
      async () => {
        const original = Invoice.collection.insertOne;
        Invoice.collection.insertOne = async () => {
          throw new Error("Fixture invoice persistence failure");
        };
        try {
          assert.equal(
            (
              await call(finish.POST, job._id, {
                paymentMode: "servizato_online",
              })
            ).status,
            500,
          );
        } finally {
          Invoice.collection.insertOne = original;
        }
        const saved = await Job.findById(job._id).select("+finalQuote");
        assert.equal(saved.status, "in_progress");
        assert.equal(saved.finalQuote, undefined);
        assert.equal(await Invoice.countDocuments({ jobId: job._id }), 0);
        assert.equal(await FinanceLedger.countDocuments({ jobId: job._id }), 0);
        assert.equal((await Technician.findById(techId)).jobsCompleted, 0);
      },
    );
    await t.test(
      "simultaneous completions finalize one invoice from saved parts and open online checkout",
      async () => {
        const responses = await Promise.all([
          call(finish.POST, job._id, { paymentMode: "servizato_online" }),
          call(finish.POST, job._id, { paymentMode: "servizato_online" }),
        ]);
        assert.deepEqual(
          responses.map((r) => r.status),
          [200, 200],
        );
        const invoice = await Invoice.findOne({ jobId: job._id });
        assert.equal(invoice.grandTotal, 706.82);
        assert.equal(invoice.items.length, 2);
        assert.equal(invoice.appliedPromotion?.name, "Fixture offer");
        assert.equal(invoice.completionBilling, true);
        assert.equal(await Invoice.countDocuments({ jobId: job._id }), 1);
        assert.equal(
          await FinanceLedger.countDocuments({ invoiceId: invoice._id }),
          1,
        );
        assert.equal((await Technician.findById(techId)).jobsCompleted, 1);
        assert.equal(
          await Payment.countDocuments({ invoiceId: invoice._id }),
          0,
        );
        assert.equal(
          await load("lib/invoice-online-payment.ts").invoiceCanStartCheckout(
            invoice,
          ),
          true,
        );
        assert.equal((await call(add.POST, job._id, part())).status, 409);
      },
    );
    await t.test(
      "an existing draft is updated and finalized once, while cash stays unpaid",
      async () => {
        const job = await working();
        const draft = await Invoice.create({
          invoiceNumber: "ONSITE-DRAFT",
          jobId: job._id,
          bookingId: job.bookingId,
          customerId,
          status: "draft",
        });
        assert.equal((await call(add.POST, job._id, part())).status, 200);
        assert.equal((await Invoice.findById(draft._id)).grandTotal, 647.82);
        assert.equal(
          (
            await call(finish.POST, job._id, {
              paymentMode: "cash",
              collected: true,
            })
          ).status,
          200,
        );
        const invoice = await Invoice.findById(draft._id);
        assert.equal(invoice.status, "issued");
        assert.equal(invoice.amountPaid, 0);
        assert.ok(invoice.finalizedAt);
        assert.equal(
          await Payment.countDocuments({ invoiceId: invoice._id }),
          0,
        );
        assert.equal(
          (await FinanceLedger.findOne({ invoiceId: invoice._id }))
            .paymentState,
          "claimed",
        );
      },
    );
    await t.test(
      "verified online funds confirm only the original completion bill and settle once",
      async () => {
        const invoice = await Invoice.findOne({ jobId: job._id });
        const { finalizeSuccessfulRazorpayPayment } = load(
          "lib/razorpay-payment.ts",
        );
        const input = {
          invoiceId: String(invoice._id),
          orderId: "order_OnsiteLocal",
          paymentId: "pay_OnsiteLocal",
          paidAmountPaise: 70682,
          expectedAmountPaise: 70682,
          method: "card",
          source: "callback",
        };
        await finalizeSuccessfulRazorpayPayment(input);
        assert.equal(
          (
            await finalizeSuccessfulRazorpayPayment({
              ...input,
              source: "webhook",
            })
          ).duplicate,
          true,
        );
        const row = await FinanceLedger.findOne({ invoiceId: invoice._id });
        assert.equal(row.paymentState, "paid");
        assert.equal(row.billState, "confirmed");
        assert.equal(row.confirmedBy, undefined);
        assert.equal(
          await Payment.countDocuments({ invoiceId: invoice._id }),
          1,
        );
      },
    );
  },
);
