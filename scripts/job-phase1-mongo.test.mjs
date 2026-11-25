import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mongoose from "mongoose";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const uri = process.env.PHASE1_LOCAL_MONGO_URI;
const oid = () => new mongoose.Types.ObjectId();
const id = (value) => String(value);

function fixtureRuntime(boundaries) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(root, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const output = ts.transpileModule(readFileSync(absolute, "utf8"), {
      fileName: absolute,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const mod = { exports: {} };
    cache.set(absolute, mod);
    new Function("require", "module", "exports", output)(
      (name) => {
        if (name in boundaries) return boundaries[name];
        const base = name.startsWith("@/")
          ? path.resolve(root, name.slice(2))
          : name.startsWith(".")
            ? path.resolve(path.dirname(absolute), name)
            : null;
        if (!base) return require(name);
        if (base.endsWith(".mjs")) return require(base);
        const file = [base, base + ".ts", path.join(base, "index.ts")].find(
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
  "Phase 1 uses real MongoDB transactions on an isolated loopback replica set",
  { skip: !uri },
  async (t) => {
    const host = new URL(uri);
    assert.equal(host.protocol, "mongodb:");
    assert.ok(["127.0.0.1", "localhost"].includes(host.hostname));
    assert.ok(!host.username && !host.password && !host.host.includes(","));
    const dbName = `servizato_phase1_test_${randomUUID().replaceAll("-", "")}`;
    process.env.NEXTAUTH_URL = "http://phase-one.test";
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
      try {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
      } finally {
        await mongoose.disconnect();
      }
    });

    class AuthError extends Error {
      constructor(message, status = 401) {
        super(message);
        this.status = status;
      }
    }
    const actors = {
      admin: { _id: oid(), role: "admin" },
      dispatcher: { _id: oid(), role: "dispatcher" },
      provider: { _id: oid(), role: "service_provider" },
      customer: { _id: oid(), role: "customer" },
      technician: { _id: oid(), role: "technician" },
    };
    const providerId = oid(),
      customerId = oid(),
      techId = oid(),
      offeringId = oid(),
      priceItemId = oid();
    let role = "technician";
    let gatewayCreates = 0;
    let savedGatewayOrder;
    const auth = {
      ApiAuthError: AuthError,
      requireCurrentUser: async () => actors[role],
      requireRole: async (roles) => {
        if (!roles.includes(role)) throw new AuthError("Forbidden", 403);
        return { user: actors[role] };
      },
    };
    const load = fixtureRuntime({
      "@/lib/auth": auth,
      "./auth": auth,
      "@/lib/db": { connectToDb: async () => mongoose },
      "./db": { connectToDb: async () => mongoose },
      "@/lib/service-provider": {
        requireProvider: async () => ({
          provider: { _id: providerId, ownerId: actors.provider._id },
          user: actors.provider,
        }),
      },
      "@/lib/customer": {
        requireCustomerProfile: async () => ({
          user: actors.customer,
          customer: { _id: customerId },
        }),
      },
      "@/lib/technician": {
        requireTechnicianProfile: async () => ({
          tech: { _id: techId },
          user: actors.technician,
        }),
      },
      "@/lib/chat/ensure-job-conversation": {
        ensureJobConversation: async () => null,
      },
      "./chat/ensure-job-conversation": {
        ensureJobConversation: async () => null,
      },
      "@/lib/push-delivery": { scheduleNotificationPush() {} },
      "./push-delivery": { scheduleNotificationPush() {} },
      "@/lib/razorpay": {
        async createRazorpayOrder({ amountPaise, currency, receipt }) {
          if (savedGatewayOrder) throw new Error("Duplicate fixture receipt");
          gatewayCreates++;
          savedGatewayOrder = {
            id: "order_LocalPhaseOne",
            amount: amountPaise,
            amount_due: amountPaise,
            currency,
            status: "created",
            receipt,
          };
          return savedGatewayOrder;
        },
        async getRazorpayOrder() {
          return savedGatewayOrder;
        },
        async findRazorpayOrderByReceipt(receipt) {
          return savedGatewayOrder?.receipt === receipt
            ? savedGatewayOrder
            : null;
        },
      },
    });
    const Booking = load("models/booking.ts").default,
      Job = load("models/job.ts").default,
      JobQuote = load("models/job-quote.ts").default,
      Invoice = load("models/invoice.ts").default,
      Notification = load("models/notification.ts").default,
      User = load("models/user.ts").default,
      Customer = load("models/customer.ts").default,
      Technician = load("models/technician.ts").default,
      ServiceProvider = load("models/ServiceProvider.ts").default,
      ServiceOffering = load("models/ServiceOffering.ts").default;

    const financeReady = load("lib/finance-readiness.ts");
    load("models/finance.ts");
    load("models/payment.ts");
    const { financeIndexDefinitions } = require("../lib/finance-indexes.mjs");
    for (const model of Object.values(mongoose.models)) await model.init();
    for (const [collection, keys, options] of financeIndexDefinitions)
      await mongoose.connection
        .collection(collection)
        .createIndex(keys, options);
    assert.equal(await financeReady.financeReady(), true);
    for (const actor of Object.values(actors))
      await User.collection.insertOne({
        ...actor,
        name: "Fixture account",
        isActive: true,
      });
    await Customer.collection.insertOne({
      _id: customerId,
      userId: actors.customer._id,
      name: "Fixture customer",
      email: "fixture@example.invalid",
    });
    await ServiceProvider.collection.insertOne({
      _id: providerId,
      ownerId: actors.provider._id,
      companyName: "Fixture business",
    });
    await ServiceOffering.collection.insertOne({
      _id: offeringId,
      priceItemId,
      taxPercent: 18,
    });
    await Technician.create({
      _id: techId,
      userId: actors.technician._id,
      serviceProviderId: providerId,
      status: "available",
      skillKeys: ["plumbing"],
    });

    const providerAssign = load(
      "app/api/service-provider/bookings/[id]/assign-technician/route.ts",
    );
    const staffAssign = load("app/api/jobs/[id]/assign/route.ts");
    const providerQuote = load(
      "app/api/service-provider/assigned-jobs/[id]/quote/route.ts",
    );
    const decide = load("app/api/customer/bookings/[id]/quote/route.ts");
    const start = load("app/api/technician/jobs/[id]/start/route.ts");
    const recovery = load(
      "app/api/service-provider/assigned-jobs/[id]/start-code/route.ts",
    );
    const complete = load("app/api/technician/jobs/[id]/complete/route.ts");
    const checkout = load("app/api/invoices/[id]/razorpay/order/route.ts");
    const call = (route, identifier, body) =>
      route.POST(
        new Request("http://phase-one.test/api", {
          method: "POST",
          headers: {
            origin: "http://phase-one.test",
            "content-type": "application/json",
          },
          body: JSON.stringify(route === complete ? { paymentMode: "servizato_online", ...body } : body),
        }),
        { params: Promise.resolve({ id: id(identifier) }) },
      );

    async function newBooking(startTime) {
      return Booking.create({
        customerId,
        serviceProviderId: providerId,
        serviceOfferingId: offeringId,
        serviceType: "Fixture tap repair",
        status: "confirmed",
        scheduledAt: new Date(startTime),
        requiredSkillKeys: ["plumbing"],
        pricing: {
          basePrice: 350,
          finalPrice: 299,
          discountAmount: 51,
          offerName: "Fixture launch offer",
          taxPercent: 18,
        },
        commissionSnapshot: {
          state: "missing_policy",
          establishedAt: new Date(),
        },
      });
    }

    const first = await newBooking("2027-01-15T10:00:00+05:30");
    const overlapping = await newBooking("2027-01-15T11:00:00+05:30");
    const slot = await Job.create({
      bookingId: overlapping._id,
      serviceProviderId: providerId,
      status: "scheduled",
    });
    const separate = await newBooking("2027-01-17T10:00:00+05:30");
    let job;
    await t.test(
      "provider and dispatcher race for the same Pro, with one winner and a second non-overlapping assignment",
      async () => {
        role = "dispatcher";
        const results = await Promise.all([
          call(providerAssign, first._id, {
            technicianId: id(techId),
            scheduledEndAt: "2027-01-15T12:00:00+05:30",
          }),
          call(staffAssign, slot._id, {
            technicianId: id(techId),
            scheduledEndAt: "2027-01-15T13:00:00+05:30",
          }),
        ]);
        assert.deepEqual(
          results.map((response) => response.status).sort(),
          [200, 409],
        );
        assert.equal(
          await Job.countDocuments({
            technicianId: techId,
            status: "assigned",
          }),
          1,
        );
        const saved = await call(providerAssign, separate._id, {
          technicianId: id(techId),
          scheduledEndAt: "2027-01-17T12:00:00+05:30",
        });
        assert.equal(saved.status, 200);
        job = await Job.findOne({ bookingId: separate._id })
          .select("+otp +otpAttempts +otpVersion")
          .lean();
        assert.equal(
          job.scheduledEndAt.toISOString(),
          "2027-01-17T06:30:00.000Z",
        );
        assert.equal((await Technician.findById(techId)).status, "busy");
        await Job.updateOne(
          { _id: job._id },
          { $set: { status: "arrived", proofRequired: false } },
        );
      },
    );

    await t.test(
      "parallel incorrect OTPs persist exactly five attempts and one lockout notice; only the new code can start the job",
      async () => {
        role = "technician";
        const oldCode = job.otp;
        const invalid = oldCode === "100001" ? "100002" : "100001";
        const results = await Promise.all(
          Array.from({ length: 11 }, () =>
            call(start, job._id, { otp: invalid }),
          ),
        );
        assert.equal(
          results.filter((response) => response.status === 400).length,
          4,
        );
        assert.equal(
          results.filter((response) => response.status === 429).length,
          7,
        );
        const locked = await Job.findById(job._id).select(
          "+otpAttempts +otpLockedAt",
        );
        assert.equal(locked.status, "arrived");
        assert.equal(locked.otpAttempts, 5);
        assert.ok(locked.otpLockedAt instanceof Date);
        assert.equal(
          (await call(start, job._id, { otp: oldCode })).status,
          429,
        );
        assert.equal(
          await Notification.countDocuments({
            dedupeKey: `job-otp-locked:${job._id}:1`,
          }),
          1,
        );
        const replaced = await call(recovery, job._id, {});
        assert.deepEqual(await replaced.json(), { success: true });
        const current = await Job.findById(job._id)
          .select("+otp +otpAttempts +otpVersion +otpLockedAt")
          .lean();
        assert.equal(current.otpVersion, 2);
        assert.equal(current.otpAttempts, 0);
        assert.equal(current.otpLockedAt, undefined);
        assert.equal(
          (await call(start, job._id, { otp: oldCode })).status,
          400,
        );
        const simultaneous = await Promise.all([
          call(start, job._id, { otp: current.otp }),
          call(start, job._id, { otp: current.otp }),
        ]);
        assert.deepEqual(
          simultaneous.map((response) => response.status).sort(),
          [200, 400],
        );
        assert.equal(
          (await Job.findById(job._id).select("+otp")).otp,
          undefined,
        );
      },
    );

    await t.test(
      "competing quote responses commit once; completed snapshot drives one invoice and the same checkout amount",
      async () => {
        const proposal = await call(providerQuote, job._id, {
          requestId: randomUUID(),
          expectedVersion: 0,
          partsDraftVersion: 0,
          reason: "Fixture part approval",
          charges: [
            {
              chargeType: "part",
              description: "Fixture part",
              qty: 1,
              unitPrice: 650,
            },
          ],
        });
        assert.equal(proposal.status, 200);
        assert.equal((await proposal.json()).quote.pricing.grandTotal, 1119.82);
        assert.equal((await call(complete, job._id, {})).status, 409);
        assert.equal(await Invoice.countDocuments({ jobId: job._id }), 0);
        const responses = await Promise.all([
          call(decide, separate._id, { version: 1, decision: "approve" }),
          call(decide, separate._id, { version: 1, decision: "approve" }),
        ]);
        assert.equal(
          responses.every((response) => response.status === 200),
          true,
        );
        const results = await Promise.all(
          responses.map((response) => response.json()),
        );
        assert.equal(results.filter((result) => result.duplicate).length, 1);
        assert.equal(
          await JobQuote.countDocuments({ jobId: job._id, status: "approved" }),
          1,
        );
        assert.equal(
          await Notification.countDocuments({
            entityId: job._id,
            title: "Revised quote approved",
          }),
          1,
        );
        const completions = await Promise.all([
          call(complete, job._id, {}),
          call(complete, job._id, {}),
        ]);
        assert.deepEqual(
          completions.map((response) => response.status),
          [200, 200],
        );
        const invoice = await Invoice.findOne({ jobId: job._id });
        assert.equal(invoice.grandTotal, 1119.82);
        assert.equal(invoice.taxAmount, 170.82);
        assert.equal(invoice.discountAmount, 51);
        assert.equal(invoice.appliedPromotion?.name, "Fixture launch offer");
        invoice.appliedPromotion = { name: "Changed offer" };
        await invoice.save();
        assert.equal(
          (await Invoice.findById(invoice._id)).appliedPromotion?.name,
          "Fixture launch offer",
        );
        assert.equal(invoice.items.length, 2);
        assert.equal(await Invoice.countDocuments({ jobId: job._id }), 1);
        assert.equal((await Technician.findById(techId)).status, "busy");
        role = "customer";
        const orderResponses = await Promise.all([
          call(checkout, invoice._id, {}),
          call(checkout, invoice._id, {}),
        ]);
        assert.deepEqual(
          orderResponses.map(({ status }) => status),
          [200, 200],
        );
        const payloads = await Promise.all(
          orderResponses.map((response) => response.json()),
        );
        assert.equal(payloads[0].order.amount, 111982);
        assert.deepEqual(payloads[0].order, payloads[1].order);
        assert.equal(gatewayCreates, 1);
      },
    );

    await t.test("finalizing an existing job draft saves its historical offer", async () => {
      role = "admin";
      const booking = await newBooking("2027-01-22T10:00:00+05:30");
      const completed = await Job.create({
        bookingId: booking._id,
        serviceProviderId: providerId,
        status: "completed",
      });
      const draft = await Invoice.create({
        invoiceNumber: "PHASE2-FIXTURE-DRAFT",
        jobId: completed._id,
        bookingId: booking._id,
        customerId,
      });
      const finalize = load("app/api/invoices/[id]/finalize/route.ts");
      assert.equal((await call(finalize, draft._id, {})).status, 200);
      const finalized = await Invoice.findById(draft._id);
      assert.ok(finalized.finalizedAt);
      assert.equal(finalized.appliedPromotion?.name, "Fixture launch offer");
      assert.equal(finalized.grandTotal, 352.82);
      await Booking.updateOne({ _id: booking._id }, { $set: { "pricing.offerName": "A later name" } });
      assert.equal((await call(finalize, draft._id, {})).status, 200);
      assert.equal((await Invoice.findById(draft._id)).appliedPromotion?.name, "Fixture launch offer");
    });

    await t.test(
      "a correct OTP cannot start a second service while the Pro is already working",
      async () => {
        role = "technician";
        const firstActive = await Job.findOne({
          technicianId: techId,
          status: "assigned",
        }).select("+otp");
        assert.ok(firstActive);
        await Job.updateOne(
          { _id: firstActive._id },
          { $set: { status: "arrived" } },
        );
        await Job.updateOne(
          { _id: job._id },
          { $set: { status: "in_progress" } },
        );
        const startBlocked = await call(start, firstActive._id, {
          otp: firstActive.otp,
        });
        assert.equal(startBlocked.status, 409);
        assert.equal(
          (await Job.findById(firstActive._id).select("+otpAttempts"))
            .otpAttempts,
          0,
        );
        assert.equal((await Job.findById(firstActive._id)).status, "arrived");
      },
    );
  },
);
