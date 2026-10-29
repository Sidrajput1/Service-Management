import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import mongoose from "mongoose";
import { renderToStaticMarkup } from "react-dom/server";
import * as locations from "../lib/service-location.mjs";
import * as clientLocations from "../lib/service-location-client.mjs";
import * as maps from "../lib/map-links.mjs";
import * as policy from "../lib/arrival-policy.mjs";
import { watchJourney } from "../lib/journey-watch.mjs";
import { arrivalMessage } from "../lib/arrival-message.mjs";
import { installSocketSecurity } from "../lib/socket-server.mjs";
const require = createRequire(import.meta.url),
  id = (character) => character.repeat(24);
async function load(path, modules = {}) {
  const text = await readFile(new URL(path, import.meta.url), "utf8"),
    output = ts.transpileModule(text, {
      fileName: path,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      if (name === "./finance-fields") return financeFields;
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith("./"))
        throw new Error(`Missing test dependency ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const financeFields = await load("../models/finance-fields.ts");
function chain(value) {
  const query = {
    then: (resolve, reject) =>
      Promise.resolve()
        .then(() => (typeof value === "function" ? value() : value))
        .then(resolve, reject),
  };
  for (const method of [
    "select",
    "session",
    "lean",
    "populate",
    "sort",
    "limit",
    "setOptions",
  ])
    query[method] = () => query;
  return query;
}
const get = (row, key) =>
  key.split(".").reduce((value, part) => value?.[part], row);
function set(row, key, value) {
  const parts = key.split(".");
  let cursor = row;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ||= {};
  cursor[parts.at(-1)] = value;
}
function matches(row, filter) {
  return (
    Boolean(row) &&
    Object.entries(filter).every(([key, value]) => {
      if (key === "$or") return value.some((branch) => matches(row, branch));
      const current = get(row, key);
      if (value && typeof value === "object" && !value._bsontype) {
        if ("$exists" in value)
          return (current !== undefined) === value.$exists;
        if ("$ne" in value) return String(current) !== String(value.$ne);
        if ("$nin" in value)
          return !value.$nin.map(String).includes(String(current));
        if ("$in" in value)
          return value.$in.map(String).includes(String(current));
      }
      return String(current) === String(value);
    })
  );
}
function update(row, changes) {
  for (const [key, value] of Object.entries(changes.$set || {}))
    set(row, key, value);
  for (const [key, value] of Object.entries(changes.$inc || {}))
    set(row, key, (get(row, key) || 0) + value);
  for (const key of Object.keys(changes.$unset || {})) {
    const parts = key.split(".");
    let parent = row;
    for (const part of parts.slice(0, -1)) parent = parent?.[part];
    if (parent) delete parent[parts.at(-1)];
  }
  return structuredClone(row);
}
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
  apiFailure: (error) =>
    Response.json(
      { error: error.message },
      { status: error.status || (error.name === "ZodError" ? 400 : 500) },
    ),
};
const pagination = await load("../lib/pagination.ts"),
  validation = await load("../lib/location-validation.ts");
const capture = await load("../lib/confirmed-address.ts", {
  "./auth": { ApiAuthError: ApiError },
  "./service-location.mjs": locations,
  "./location-validation": validation,
});
function address(now = Date.now()) {
  const value = {
    addressLine: "42 Saved street",
    city: "Patna",
    state: "Bihar",
    pincode: "800001",
  };
  return capture.captureServiceDestination(
    value,
    {
      latitude: 25.61,
      longitude: 85.14,
      accuracy: 8,
      observedAt: now,
      confirmed: true,
    },
    id("a"),
    now,
  );
}
function reading(now = Date.now(), changes = {}) {
  return {
    latitude: 25.61,
    longitude: 85.14,
    accuracy: 8,
    observedAt: now,
    ...changes,
  };
}
const request = (body) =>
  new Request("http://test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
async function fixture(t) {
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  t.after(() => {
    Date.now = realNow;
  });
  let db = {
    jobs: [
      {
        _id: id("1"),
        bookingId: id("2"),
        technicianId: id("3"),
        serviceProviderId: id("4"),
        status: "enroute",
        otp: "682194",
        arrivalVersion: 0,
      },
    ],
    bookings: [
      {
        _id: id("2"),
        customerId: id("5"),
        serviceProviderId: id("4"),
        technicianId: id("3"),
        status: "assigned",
        address: address(now),
        pricing: { finalPrice: 499 },
      },
    ],
    techs: [{ _id: id("3"), userId: id("6"), isActive: true, status: "busy" }],
    customers: [{ _id: id("5"), userId: id("a") }],
    notifications: [],
  };
  const state = {
    role: "technician",
    userId: id("6"),
    deliveryFails: false,
    markFails: false,
    writeFails: false,
    active: false,
    events: 0,
  };
  let tail = Promise.resolve();
  const mongo = {
    Types: mongoose.Types,
    startSession: async () => ({
      withTransaction: async (operation) => {
        const previous = tail;
        let release;
        tail = new Promise((resolve) => {
          release = resolve;
        });
        await previous;
        const snapshot = structuredClone(db);
        state.active = true;
        state.dirty = false;
        try {
          return await operation();
        } catch (error) {
          if (state.dirty) {
            const notifications = db.notifications;
            db = snapshot;
            db.notifications = notifications;
          }
          throw error;
        } finally {
          state.active = false;
          release();
        }
      },
      endSession: async () => {},
    }),
  };
  const model = (key) => ({
    findOne: (filter) =>
      chain(() =>
        structuredClone(db[key].find((row) => matches(row, filter)) || null),
      ),
    findById: (value) =>
      chain(() =>
        structuredClone(
          db[key].find((row) => String(row._id) === String(value)) || null,
        ),
      ),
    findOneAndUpdate: async (filter, changes, options) => {
      assert.equal(state.active, true);
      assert.ok(options.session);
      if (state.writeFails) throw new Error("Injected persistence failure");
      const row = db[key].find((row) => matches(row, filter));
      if (row) {
        state.dirty = true;
        return update(row, changes);
      }
      return null;
    },
    updateOne: async (filter, changes, options) => {
      if (options?.session) {
        assert.equal(state.active, true);
        state.dirty = true;
      }
      if (
        state.markFails &&
        key === "jobs" &&
        changes.$set?.["arrivalNotification.state"]
      )
        throw new Error("Injected delivery marker failure");
      const row = db[key].find((row) => matches(row, filter));
      if (row) update(row, changes);
      return { matchedCount: row ? 1 : 0 };
    },
  });
  const jobs = model("jobs"),
    bookings = model("bookings"),
    techs = model("techs"),
    customers = model("customers");
  const modules = {
    mongoose: mongo,
    "./auth": { ApiAuthError: ApiError },
    "./db": { connectToDb: async () => {} },
    "./service-location.mjs": locations,
    "./arrival-policy.mjs": policy,
    "@/models/job": jobs,
    "@/models/booking": bookings,
    "@/models/technician": techs,
    "@/models/customer": customers,
  };
  const notification = {
    createNotification: async (input) => {
      if (state.deliveryFails) throw new Error("Injected notification outage");
      if (!db.notifications.some((row) => row.dedupeKey === input.dedupeKey))
        db.notifications.push(input);
    },
  };
  const events = await load("../lib/notify-events.ts", {
    "./notification": notification,
    "./arrival-message.mjs": { arrivalMessage },
  });
  const delivery = await load("../lib/arrival-delivery.ts", {
    ...modules,
    "./notify-events": events,
    "./socket": {
      getIO: () => ({
        emitAuthorizedJobStatus: async () => {
          assert.equal(db.jobs[0].status, "arrived");
          state.events++;
        },
      }),
    },
  });
  const engine = await load("../lib/job-arrival.ts", {
    ...modules,
    "./arrival-delivery": delivery,
  });
  const technician = await load("../lib/technician.ts", {
    "@/models/technician": techs,
    "./auth": {
      ApiAuthError: ApiError,
      requireCurrentUser: async () => ({ _id: state.userId, role: state.role }),
    },
  });
  const route = await load(
    "../app/api/technician/jobs/[id]/location/route.ts",
    {
      "@/lib/technician": technician,
      "@/lib/location-validation": validation,
      "@/lib/job-arrival": engine,
      "@/lib/pagination": pagination,
      "@/lib/api-response": responses,
    },
  );
  return {
    get db() {
      return db;
    },
    get now() {
      return now;
    },
    advance: (ms) => {
      now += ms;
    },
    state,
    engine,
    route,
    models: { jobs, bookings, techs, customers },
    modules,
    delivery,
    technician,
    submit: (body) =>
      route.POST(request(body), { params: Promise.resolve({ id: id("1") }) }),
    send: (changes) =>
      engine.recordJobArrival(id("1"), id("3"), id("6"), reading(now, changes)),
  };
}

test("map links encode the authoritative address and need no guessed coordinates", () => {
  const saved = {
    addressLine: "A&B #5 / Lane? café",
    city: "Patna",
    pincode: "800001",
    location: { coordinates: [0, 0] },
  };
  const link = new URL(maps.googleMapsLink(saved, true));
  assert.equal(link.origin, "https://www.google.com");
  assert.equal(link.searchParams.get("api"), "1");
  assert.equal(
    link.searchParams.get("destination"),
    "A&B #5 / Lane? café, Patna, 800001",
  );
  assert.ok(!link.searchParams.get("destination").startsWith("0,0"));
  assert.equal(maps.googleMapsLink({}), null);
  assert.equal(maps.googleMapsEmbed(saved, ""), null);
});
test("confirmed coordinate navigation and iframe URLs preserve longitude/latitude order", () => {
  const saved = locations.serviceAddressForViewer(address(), true);
  assert.equal(
    new URL(maps.googleMapsLink(saved, true)).searchParams.get("destination"),
    "25.61,85.14",
  );
  const embed = new URL(maps.googleMapsEmbed(saved, "placeholder-test-key"));
  assert.equal(embed.pathname, "/maps/embed/v1/place");
  assert.equal(embed.searchParams.get("q"), "25.61,85.14");
  assert.equal(embed.searchParams.get("key"), "placeholder-test-key");
});
test("missing Embed configuration renders the saved address and navigation fallback without an iframe", async () => {
  const old = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  try {
    const ui = await load("../components/maps/ServiceAddressPreview.tsx", {
      "@/lib/map-links.mjs": maps,
      "@/lib/service-location-client.mjs": clientLocations,
      "@/components/ui/button": {
        Button: (props) => require("react").createElement("button", props),
      },
    });
    const html = renderToStaticMarkup(
      require("react").createElement(ui.ServiceAddressPreview, {
        address: { addressLine: "Saved address", city: "Patna" },
        navigate: true,
      }),
    );
    assert.match(html, /Saved address/);
    assert.match(html, /Navigate to Customer/);
    assert.match(html, /noopener noreferrer/);
    assert.doesNotMatch(html, /<iframe/);
  } finally {
    if (old === undefined)
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY = old;
  }
});
test("destination confirmation is optional, fresh, bounded, tied to the address, and server-owned", () => {
  const now = Date.now(),
    text = {
      addressLine: "42 Saved street",
      city: "Patna",
      state: "Bihar",
      pincode: "800001",
    };
  assert.equal(
    capture.captureServiceDestination(text, undefined, id("a")),
    text,
  );
  const saved = address(now);
  assert.equal(saved.locationConfirmation.confirmedBy, id("a"));
  assert.deepEqual(locations.confirmedDestination(saved), {
    latitude: 25.61,
    longitude: 85.14,
  });
  assert.equal(
    locations.confirmedDestination({ ...saved, addressLine: "Another house" }),
    null,
  );
  assert.equal(
    locations.confirmedDestination({ location: { coordinates: [0, 0] } }),
    null,
  );
  assert.throws(() =>
    capture.captureServiceDestination(
      text,
      { ...reading(now - 600001), confirmed: true },
      id("a"),
      now,
    ),
  );
  assert.throws(() =>
    capture.captureServiceDestination(
      text,
      { ...reading(now, { accuracy: 80 }), confirmed: true },
      id("a"),
      now,
    ),
  );
  assert.throws(() =>
    validation.destinationCaptureSchema.parse({
      ...reading(now),
      confirmed: false,
    }),
  );
});
test("coordinate validation rejects strings, NaN, ranges, timestamps and forged destination/status fields", () => {
  for (const bad of [
    { latitude: 91 },
    { longitude: -181 },
    { latitude: "25.61" },
    { accuracy: 0 },
    { latitude: NaN },
    { observedAt: "now" },
    { status: "arrived" },
    { destination: { latitude: 25.61, longitude: 85.14 } },
    { userId: id("6") },
  ])
    assert.throws(() =>
      validation.gpsReadingSchema.parse({ ...reading(), ...bad }),
    );
  assert.equal(locations.validCoordinates([85.14, 25.61]), true);
  assert.equal(locations.validCoordinates([25.61, 185.14]), false);
});
test("Haversine distance and configuration defaults are bounded and predictable", () => {
  assert.equal(
    policy.haversineMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    ),
    0,
  );
  assert.ok(
    Math.abs(
      policy.haversineMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ) - 111195,
    ) < 2,
  );
  assert.equal(policy.arrivalConfig({}).requiredReadings, 2);
  assert.throws(() => policy.arrivalConfig({ ARRIVAL_REQUIRED_READINGS: "1" }));
  assert.throws(() =>
    policy.arrivalConfig({ ARRIVAL_RADIUS_METERS: "100000" }),
  );
});
test("one valid reading cannot arrive; two separated reliable readings trigger one committed transition", async (t) => {
  const f = await fixture(t);
  const first = await f.send();
  assert.equal(first.state, "qualifying");
  assert.equal(f.db.jobs[0].status, "enroute");
  assert.equal(f.db.notifications.length, 0);
  f.advance(10000);
  const second = await f.send();
  assert.equal(second.status, "arrived");
  assert.equal(second.transitioned, true);
  assert.equal(f.db.jobs[0].arrivalMethod, "automatic");
  assert.ok(f.db.jobs[0].arrivedAt);
  assert.equal(f.db.jobs[0].arrivalTracking, undefined);
  assert.equal(f.db.jobs[0].otp, "682194");
  assert.equal(f.db.jobs[0].customerOtpVerifiedAt, undefined);
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.state.events, 1);
  assert.equal(f.db.bookings[0].pricing.finalPrice, 499);
});
test("poor accuracy and an outside observation reset consecutive qualification", async (t) => {
  const f = await fixture(t);
  await f.send();
  f.advance(10000);
  assert.equal((await f.send({ accuracy: 200 })).state, "poor_accuracy");
  assert.equal(f.db.jobs[0].arrivalTracking.qualifyingCount, 0);
  f.advance(10000);
  assert.equal((await f.send()).status, "enroute");
  f.advance(10000);
  const result = await f.send({ latitude: 25.615 });
  assert.equal(result.status, "enroute");
  assert.equal(f.db.jobs[0].arrivalTracking.qualifyingCount, 0);
  assert.equal(f.db.notifications.length, 0);
});
test("uncertainty must fit inside the radius and time gaps cannot reuse an old qualifier", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.send({ latitude: 25.6108, accuracy: 30 })).state,
    "outside",
  );
  f.advance(10000);
  await f.send();
  f.advance(50000);
  assert.equal((await f.send()).status, "enroute");
  assert.equal(f.db.jobs[0].arrivalTracking.qualifyingCount, 1);
});
test("stale, future and out-of-order observations are rejected without changing status", async (t) => {
  const f = await fixture(t);
  for (const observedAt of [f.now - 31000, f.now + 6000])
    assert.equal((await f.submit(reading(observedAt))).status, 400);
  await f.send();
  f.advance(10000);
  await assert.rejects(
    f.send({ observedAt: f.now - 10000 }),
    (error) => error.status === 400,
  );
  assert.equal(f.db.jobs[0].status, "enroute");
});
test("server update cadence and minimum separated readings prevent fast repeated observations", async (t) => {
  const f = await fixture(t);
  await f.send();
  f.advance(1000);
  assert.equal((await f.submit(reading(f.now))).status, 429);
  f.advance(4000);
  assert.equal((await f.send()).status, "enroute");
  assert.equal(f.db.jobs[0].arrivalTracking.qualifyingCount, 1);
  f.advance(5000);
  assert.equal((await f.send()).status, "arrived");
});
test("implausible jumps are ignored and cannot erase the last trustworthy point", async (t) => {
  const f = await fixture(t);
  await f.send({ latitude: 25.7 });
  f.advance(10000);
  const jump = await f.send();
  assert.equal(jump.state, "implausible_jump");
  assert.equal(jump.status, "enroute");
  assert.equal(f.db.jobs[0].arrivalTracking.latitude, 25.7);
  f.advance(10000);
  assert.equal((await f.send()).state, "implausible_jump");
  assert.equal(f.db.notifications.length, 0);
});
test("unassigned users and non-Pro roles cannot report locations or select another destination", async (t) => {
  const f = await fixture(t);
  for (const role of ["customer", "service_provider", "admin", "dispatcher"]) {
    f.state.role = role;
    assert.equal((await f.submit(reading(f.now))).status, 403);
  }
  f.state.role = "technician";
  f.state.userId = id("b");
  assert.equal((await f.submit(reading(f.now))).status, 403);
  f.state.userId = id("6");
  f.db.jobs[0].technicianId = id("b");
  assert.equal((await f.submit(reading(f.now))).status, 404);
  f.db.jobs[0].technicianId = id("3");
  assert.equal(
    (
      await f.submit({
        ...reading(f.now),
        destinationLatitude: 25.61,
        status: "arrived",
        role: "technician",
      })
    ).status,
    400,
  );
  assert.equal(f.db.jobs[0].status, "enroute");
});
test("offline or inactive Pros, cancelled bookings and reassigned bookings cannot qualify", async (t) => {
  const f = await fixture(t);
  f.db.techs[0].status = "offline";
  await assert.rejects(f.send(), (error) => error.status === 403);
  f.db.techs[0].status = "busy";
  f.db.techs[0].isActive = false;
  assert.equal((await f.submit(reading(f.now))).status, 403);
  f.db.techs[0].isActive = true;
  f.db.bookings[0].status = "cancelled";
  assert.equal((await f.submit(reading(f.now))).status, 409);
  f.db.bookings[0].status = "assigned";
  f.db.bookings[0].technicianId = id("c");
  assert.equal((await f.submit(reading(f.now))).status, 409);
  assert.equal(f.db.notifications.length, 0);
});
test("missing or unconfirmed destination never auto-arrives and authorized manual arrival remains available", async (t) => {
  const f = await fixture(t);
  f.db.bookings[0].address = {
    addressLine: "Saved address",
    city: "Patna",
    location: { type: "Point", coordinates: [0, 0] },
  };
  assert.equal((await f.submit(reading(f.now))).status, 409);
  const manual = await f.engine.recordJobArrival(id("1"), id("3"), id("6"));
  assert.equal(manual.status, "arrived");
  assert.equal(f.db.jobs[0].arrivalMethod, "manual");
  assert.equal(f.db.jobs[0].customerOtpVerifiedAt, undefined);
});
test("assigned, cancelled, completed and in-progress jobs reject updates; arrived replays are harmless", async (t) => {
  const f = await fixture(t);
  for (const status of ["assigned", "cancelled", "completed", "in_progress"]) {
    f.db.jobs[0].status = status;
    assert.equal((await f.submit(reading(f.now))).status, 409);
  }
  f.db.jobs[0].status = "enroute";
  await f.engine.recordJobArrival(id("1"), id("3"), id("6"));
  const stamp = f.db.jobs[0].arrivedAt;
  for (let i = 0; i < 3; i++) {
    const result = await f.send();
    assert.equal(result.transitioned, false);
  }
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.db.jobs[0].arrivedAt.getTime(), stamp.getTime());
  assert.equal(f.state.events, 1);
});
test("simultaneous GPS and manual arrivals commit one transition with one notification", async (t) => {
  const f = await fixture(t);
  await f.send();
  f.advance(10000);
  const results = await Promise.all([
    f.send(),
    f.engine.recordJobArrival(id("1"), id("3"), id("6")),
  ]);
  assert.equal(results.filter((result) => result.transitioned).length, 1);
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.db.jobs[0].status, "arrived");
  assert.equal(f.state.events, 1);
});
test("persistence failure rolls back arrival and produces no success, notification or event", async (t) => {
  const f = await fixture(t);
  f.state.writeFails = true;
  await assert.rejects(
    f.engine.recordJobArrival(id("1"), id("3"), id("6")),
    /persistence failure/,
  );
  assert.equal(f.db.jobs[0].status, "enroute");
  assert.equal(f.db.jobs[0].arrivedAt, undefined);
  assert.equal(f.db.notifications.length, 0);
  assert.equal(f.state.events, 0);
});
test("notification outages preserve arrival and crash/retry deduplicates the existing DB-backed event", async (t) => {
  const f = await fixture(t);
  f.state.deliveryFails = true;
  assert.equal(
    (await f.engine.recordJobArrival(id("1"), id("3"), id("6")))
      .notificationPending,
    true,
  );
  assert.equal(f.db.jobs[0].status, "arrived");
  assert.equal(f.db.jobs[0].arrivalNotification.state, "pending");
  f.state.deliveryFails = false;
  f.state.markFails = true;
  await f.send();
  assert.equal(f.db.notifications.length, 1);
  f.state.markFails = false;
  await f.send();
  assert.equal(f.db.notifications.length, 1);
  assert.equal(f.db.jobs[0].arrivalNotification.state, "sent");
  assert.ok(!JSON.stringify(f.db.notifications).includes("25.61"));
});
test("destination or assigned-Pro changes invalidate a previous qualification", async (t) => {
  const f = await fixture(t);
  await f.send();
  f.advance(10000);
  f.db.bookings[0].address.locationConfirmation.confirmedAt = new Date(f.now);
  assert.equal((await f.send()).status, "enroute");
  assert.equal(f.db.jobs[0].arrivalTracking.qualifyingCount, 1);
});

function fakeGeo() {
  let receive,
    fail,
    calls = 0,
    cleared = 0;
  return {
    get calls() {
      return calls;
    },
    get cleared() {
      return cleared;
    },
    watchPosition: (success, error, options) => {
      calls++;
      receive = success;
      fail = error;
      assert.equal(options.maximumAge, 0);
      assert.equal(options.enableHighAccuracy, true);
      return 73;
    },
    clearWatch: (watchId) => {
      assert.equal(watchId, 73);
      cleared++;
    },
    position: (time, coords = {}) =>
      receive({
        coords: { latitude: 25.61, longitude: 85.14, accuracy: 8, ...coords },
        timestamp: time,
      }),
    fail: (code) => fail({ code }),
  };
}
test("browser controller does not observe an ineligible journey", () => {
  const geo = fakeGeo();
  const watcher = watchJourney({
    geolocation: geo,
    send: () => {},
    onState: () => {},
    onArrival: () => {},
    eligible: false,
  });
  assert.equal(geo.calls, 0);
  watcher.stop();
  assert.equal(geo.cleared, 0);
});
test("browser controller stops on authoritative arrival and ignores later observations", async () => {
  const geo = fakeGeo(),
    states = [];
  let now = 1,
    sends = 0,
    arrivals = 0;
  watchJourney({
    eligible: true,
    geolocation: geo,
    now: () => now,
    onState: (state) => states.push(state),
    onArrival: () => arrivals++,
    send: async () => {
      sends++;
      return sends === 2
        ? {
            success: true,
            status: "arrived",
            state: "arrived",
            transitioned: true,
          }
        : { success: true, status: "enroute", state: "qualifying" };
    },
  });
  await geo.position(now);
  now = 10001;
  await geo.position(now);
  now = 20000;
  await geo.position(now);
  assert.equal(sends, 2);
  assert.equal(arrivals, 1);
  assert.equal(geo.cleared, 1);
  assert.equal(states.at(-1), "arrived");
});
test("permission denial and unavailable GPS stop watching without changing server job status", () => {
  for (const [code, state] of [
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ]) {
    const geo = fakeGeo(),
      states = [];
    let sends = 0;
    watchJourney({
      eligible: true,
      geolocation: geo,
      send: async () => {
        sends++;
      },
      onState: (value) => states.push(value),
      onArrival: () => {
        throw new Error("Arrival must not be inferred locally");
      },
    });
    geo.fail(code);
    assert.equal(states.at(-1), state);
    assert.equal(geo.cleared, 1);
    assert.equal(sends, 0);
  }
});
test("cleanup aborts an in-flight observation and suppresses unmounted/hidden-page callbacks", async () => {
  const geo = fakeGeo(),
    states = [];
  let finish,
    signal,
    arrivals = 0;
  const watcher = watchJourney({
    eligible: true,
    geolocation: geo,
    onState: (state) => states.push(state),
    onArrival: () => arrivals++,
    send: (_reading, currentSignal) => {
      signal = currentSignal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const pending = geo.position(Date.now());
  watcher.stop();
  assert.equal(signal.aborted, true);
  finish({
    success: true,
    status: "arrived",
    state: "arrived",
    transitioned: true,
  });
  await pending;
  assert.equal(arrivals, 0);
  assert.equal(geo.cleared, 1);
  assert.deepEqual(states, ["requesting", "reporting"]);
});
test("browser cadence and in-flight control bound transmissions; auth/resource loss stops observation", async () => {
  const geo = fakeGeo();
  let now = 1,
    sends = 0;
  const states = [];
  watchJourney({
    eligible: true,
    geolocation: geo,
    now: () => now,
    onState: (value) => states.push(value),
    onArrival: () => {},
    send: async () => {
      sends++;
      if (sends === 2) throw { status: 409 };
      return { success: true, status: "enroute", state: "outside" };
    },
  });
  await geo.position(now);
  now = 1000;
  await geo.position(now);
  assert.equal(sends, 1);
  now = 10001;
  await geo.position(now);
  assert.equal(states.at(-1), "ineligible");
  assert.equal(geo.cleared, 1);
});
test("privacy projection strips coordinates from unrelated lists and permits only confirmed active detail DTOs", () => {
  const saved = address();
  assert.equal(
    locations.serviceAddressForViewer(saved, false).location,
    undefined,
  );
  assert.equal(
    locations.serviceAddressForViewer(saved, true).locationConfirmed,
    true,
  );
  const payload = {
    rows: [
      { address: structuredClone(saved), arrivalTracking: { latitude: 25.61 } },
    ],
    customer: { addresses: [structuredClone(saved), null] },
  };
  locations.stripServiceLocations(payload);
  assert.equal(payload.rows[0].address.location, undefined);
  assert.equal(payload.rows[0].arrivalTracking, undefined);
  assert.equal(payload.customer.addresses[0].location, undefined);
  assert.equal(payload.rows[0].address.addressLine, "42 Saved street");
});
test("real Mongoose snapshot schemas retain internal evidence, hide JSON coordinates and reject invalid points", async () => {
  const fields = await load("../models/service-location-fields.ts", {
    "@/lib/service-location.mjs": locations,
  });
  const Booking = (
    await load("../models/booking.ts", {
      "./service-location-fields": fields,
      "./request-coverage-fields": await load(
        "../models/request-coverage-fields.ts",
      ),
    })
  ).default;
  const value = {
    customerId: id("a"),
    serviceProviderId: id("b"),
    serviceOfferingId: id("c"),
    serviceType: "Service",
    pricing: { basePrice: 10, finalPrice: 10 },
    address: address(),
  };
  const booking = new Booking(value);
  await booking.validate();
  assert.deepEqual([...booking.address.location.coordinates], [85.14, 25.61]);
  assert.equal(booking.toJSON().address.location, undefined);
  assert.equal(Booking.schema.path("address.location").options.select, false);
  const legacy = new Booking({
    ...value,
    address: { addressLine: "Saved address" },
  });
  assert.equal(legacy.address.location, undefined);
  const bad = new Booking({
    ...value,
    address: {
      ...address(),
      location: { type: "Point", coordinates: [181, 25] },
    },
  });
  await assert.rejects(bad.validate());
  const cloned = structuredClone(value.address);
  value.address.addressLine = "Changed saved address";
  assert.equal(booking.address.addressLine, cloned.addressLine);
});
test("real lean query privacy survives explicit parent address projection, with an internal opt-in for owned detail", async () => {
  const fields = await load("../models/service-location-fields.ts", {
    "@/lib/service-location.mjs": locations,
  });
  const Booking = (
    await load("../models/booking.ts", {
      "./service-location-fields": fields,
      "./request-coverage-fields": await load(
        "../models/request-coverage-fields.ts",
      ),
    })
  ).default;
  const original = Booking.collection.findOne;
  const value = {
    _id: new mongoose.Types.ObjectId(id("a")),
    address: address(),
  };
  Booking.collection.findOne = async () => structuredClone(value);
  try {
    const hidden = await Booking.findOne({ _id: id("a") })
      .select("address")
      .lean();
    assert.equal(hidden.address.location, undefined);
    const internal = await Booking.findOne({ _id: id("a") })
      .select("+address.location +address.locationConfirmation")
      .setOptions({ includeServiceLocation: true })
      .lean();
    assert.ok(locations.confirmedDestination(internal.address));
  } finally {
    Booking.collection.findOne = original;
  }
});
test("real Job JSON excludes OTP and private tracking state, and status changes clear the latest point", async () => {
  const fields = await load("../models/arrival-fields.ts");
  const Job = (
    await load("../models/job.ts", {
      "./arrival-fields": fields,
      "@/lib/service-location.mjs": locations,
    })
  ).default;
  const job = new Job({
    bookingId: id("a"),
    serviceProviderId: id("b"),
    technicianId: id("c"),
    status: "enroute",
    otp: "682194",
    arrivalTracking: { latitude: 25.61 },
  });
  const json = job.toJSON();
  assert.equal(json.otp, undefined);
  assert.equal(json.arrivalTracking, undefined);
  assert.equal(Job.schema.path("otp").options.select, false);
  assert.equal(Job.schema.path("arrivalTracking").options.select, false);
  job.status = "arrived";
  const original = Job.collection.insertOne;
  Job.collection.insertOne = async () => ({
    acknowledged: true,
    insertedId: job._id,
  });
  try {
    await job.save();
  } finally {
    Job.collection.insertOne = original;
  }
  assert.equal(job.arrivalTracking, undefined);
});
test("OTP start still rejects a wrong code and cannot start an en-route job", async () => {
  let status = "enroute",
    writes = 0;
  const stored = {
    _id: id("1"),
    bookingId: id("2"),
    technicianId: id("3"),
    otp: "682194",
    get status() {
      return status;
    },
    set status(value) {
      status = value;
    },
  };
  const handler = await load("../app/api/technician/jobs/[id]/start/route.ts", {
    "@/lib/auth": { requireRole: async () => {}, ApiAuthError: ApiError },
    "@/lib/api-response": responses,
    "@/lib/assigned-job-transaction": {
      withAssignedJob: async (jobId, techId, operation) => {
        assert.equal(jobId, id("1"));
        assert.equal(techId, id("3"));
        return operation({ job: { ...stored }, session: {} });
      },
    },
    "@/lib/technician": {
      requireTechnicianProfile: async () => ({ tech: { _id: id("3") } }),
    },
    "@/lib/db": { connectToDb: async () => {} },
    "@/models/job": {
      findById: () => chain({ ...stored }),
      findOneAndUpdate: async (filter, changes) => {
        assert.equal(filter.status, "arrived");
        assert.equal(filter.otp, "682194");
        writes++;
        status = changes.$set.status;
        return { _id: id("1"), bookingId: id("2"), status };
      },
    },
    "@/models/booking": {
      findById: () => chain({ customerId: { userId: id("a") } }),
    },
    "@/models/customer": {},
    "@/lib/notify-events": { notifyCustomerOtpVerified: async () => {} },
    "@/lib/notification-recipents": {
      getJobNotificationRecipients: async () => ({ customerUserId: id("a") }),
    },
  });
  const start = (otp) =>
    handler.POST(request({ otp }), {
      params: Promise.resolve({ id: id("1") }),
    });
  assert.equal((await start("682194")).status, 400);
  status = "arrived";
  assert.equal((await start("wrong-code")).status, 400);
  assert.equal(writes, 0);
  assert.equal((await start("682194")).status, 200);
  assert.equal(writes, 1);
  assert.equal(status, "in_progress");
});
test("job realtime delivery checks the current customer/assigned Pro and emits no precise location", async () => {
  const a = new mongoose.Types.ObjectId(id("a")),
    p = new mongoose.Types.ObjectId(id("6")),
    other = new mongoose.Types.ObjectId(id("7")),
    tech = new mongoose.Types.ObjectId(id("3")),
    jobId = new mongoose.Types.ObjectId(id("1")),
    bookingId = new mongoose.Types.ObjectId(id("2"));
  const emitted = [];
  let assignment = tech;
  const users = [
      { _id: a, role: "customer", credentialVersion: 0 },
      { _id: p, role: "technician", credentialVersion: 0 },
      { _id: other, role: "technician", credentialVersion: 0 },
    ],
    sockets = users.map((user) => ({
      data: { user: { ...user }, expiresAt: Date.now() + 60000 },
      emit: (event, payload) =>
        emitted.push({ id: String(user._id), event, payload }),
    }));
  const db = {
    collection: (name) => ({
      findOne: async () =>
        name === "jobs"
          ? {
              _id: jobId,
              bookingId,
              technicianId: assignment,
              status: "arrived",
            }
          : name === "bookings"
            ? { _id: bookingId, customerId: a, technicianId: assignment }
            : name === "customers"
              ? { userId: a }
              : name === "technicians"
                ? { userId: assignment === tech ? p : other }
                : null,
      find: (filter) => ({
        toArray: async () =>
          users.filter((user) =>
            filter._id.$in.some((id) => String(id) === String(user._id)),
          ),
      }),
    }),
  };
  const io = {
    use: () => {},
    on: () => {},
    in: () => ({ fetchSockets: async () => sockets }),
  };
  installSocketSecurity(io, { database: async () => db });
  await io.emitAuthorizedJobStatus(String(jobId));
  assert.deepEqual(
    emitted.map((row) => row.id).sort(),
    [String(a), String(p)].sort(),
  );
  assert.ok(
    emitted.every(
      (row) =>
        row.payload.status === "arrived" &&
        !JSON.stringify(row).includes("latitude"),
    ),
  );
  emitted.length = 0;
  assignment = new mongoose.Types.ObjectId(id("8"));
  await io.emitAuthorizedJobStatus(String(jobId));
  assert.deepEqual(
    emitted.map((row) => row.id).sort(),
    [String(a), String(other)].sort(),
  );
  users[0].credentialVersion = 1;
  emitted.length = 0;
  await io.emitAuthorizedJobStatus(String(jobId));
  assert.ok(!emitted.some((row) => row.id === String(a)));
});

test("invalid automatic-arrival configuration never blocks manual arrival", async (t) => {
  const f = await fixture(t),
    old = process.env.ARRIVAL_RADIUS_METERS;
  process.env.ARRIVAL_RADIUS_METERS = "invalid";
  try {
    assert.equal((await f.submit(reading(f.now))).status, 503);
    assert.equal(
      (await f.engine.recordJobArrival(id("1"), id("3"), id("6"))).status,
      "arrived",
    );
  } finally {
    if (old === undefined) delete process.env.ARRIVAL_RADIUS_METERS;
    else process.env.ARRIVAL_RADIUS_METERS = old;
  }
});

test("browser geolocation policy exceptions fall back without crashing the job interface", () => {
  const states = [];
  const controller = watchJourney({
    eligible: true,
    geolocation: {
      watchPosition: () => {
        throw new Error("Permissions policy");
      },
      clearWatch: () => {},
    },
    send: async () => {},
    onState: (value) => states.push(value),
    onArrival: () => {
      throw new Error("Not arrived");
    },
  });
  assert.deepEqual(states, ["requesting", "unavailable"]);
  controller.stop();
});

test("authorized Pro detail uses only the assigned active booking snapshot and hides completed coordinates", async () => {
  let status = "enroute",
    owned = true;
  const row = () => ({
    _id: id("1"),
    status,
    bookingId: {
      _id: id("2"),
      status: "assigned",
      technicianId: id("3"),
      address: address(),
    },
  });
  const handler = await load("../app/api/technician/jobs/[id]/route.ts", {
    "@/lib/technician": {
      requireTechnicianProfile: async () => ({
        tech: { _id: id("3"), status: "busy" },
      }),
    },
    "@/lib/api-response": responses,
    "@/lib/pagination": pagination,
    "@/lib/service-location.mjs": locations,
    "@/lib/arrival-policy.mjs": policy,
    "@/lib/arrival-delivery": { deliverArrival: async () => false },
    "@/models/job": {
      findOne: (filter) => {
        assert.equal(String(filter.technicianId), id("3"));
        return chain(owned ? row() : null);
      },
    },
    "@/models/booking": {},
    "@/models/customer": {},
    "@/models/technician": {},
    "@/models/jobProof": {},
  });
  const get = () =>
    handler.GET(new Request("http://test"), {
      params: Promise.resolve({ id: id("1") }),
    });
  const active = await (await get()).json();
  assert.equal(active.journey.canTrack, true);
  assert.deepEqual(
    active.job.bookingId.address.location.coordinates,
    [85.14, 25.61],
  );
  assert.equal(active.job.bookingId.address.locationConfirmation, undefined);
  status = "completed";
  const complete = await (await get()).json();
  assert.equal(complete.journey.canTrack, false);
  assert.equal(complete.job.bookingId.address.location, undefined);
  owned = false;
  assert.equal((await get()).status, 404);
});

test("customer booking detail keeps the confirmed address and arrival timeline while coordinates are active-only", async () => {
  let status = "arrived",
    owned = true;
  const saved = address();
  const handler = await load("../app/api/customer/bookings/[id]/route.ts", {
    "@/lib/service-location.mjs": locations,
    "@/lib/api-response": {
      ...responses,
      privateHeaders: { "Cache-Control": "private, no-store" },
    },
    "@/lib/pagination": pagination,
    "@/lib/customer": {
      requireCustomerProfile: async () => ({
        customer: { _id: id("5"), name: "Saved customer" },
      }),
    },
    "@/lib/db": { connectToDb: async () => {} },
    "@/models/job": {
      findOne: () =>
        chain({
          _id: id("1"),
          status,
          arrivedAt: new Date(),
          acceptedAt: new Date(),
          technicianId: { _id: id("3"), userId: { name: "Assigned Pro" } },
          otp: "682194",
        }),
    },
    "@/models/invoice": {},
    "@/models/index": {
      Booking: {
        findOne: (filter) => {
          assert.equal(String(filter.customerId), id("5"));
          return chain(
            owned
              ? {
                  _id: id("2"),
                  status: "assigned",
                  createdAt: new Date(),
                  address: structuredClone(saved),
                  serviceProviderId: {
                    _id: id("4"),
                    companyName: "Saved business",
                  },
                  serviceOfferingId: { name: "Saved service" },
                }
              : null,
          );
        },
      },
    },
    "@/models/ServiceProvider": {},
    "@/models/jobProof": {},
    "@/models/technician": {},
    "next-auth": { getServerSession: async () => ({ user: { id: id("a") } }) },
    "@/lib/auth-options": { authOptions: {} },
  });
  const get = () =>
    handler.GET(new Request("http://test"), {
      params: Promise.resolve({ id: id("2") }),
    });
  const active = await (await get()).json();
  assert.equal(active.booking.address.locationConfirmed, true);
  assert.equal(active.job.status, "arrived");
  assert.equal(active.job.otp, "682194");
  assert.ok(
    active.timeline.some(
      (step) => step.key === "technician_arrived" && step.completed,
    ),
  );
  status = "completed";
  const complete = await (await get()).json();
  assert.equal(complete.booking.address.location, undefined);
  assert.equal(complete.booking.address.addressLine, saved.addressLine);
  owned = false;
  assert.equal((await get()).status, 404);
});
