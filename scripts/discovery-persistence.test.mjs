import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as location from "../lib/discovery-location.mjs";

const {
  createDiscoveryLocationStore,
  discoveryStorageKey,
  discoveryStorageKeyForScope,
  discoveryArea,
  emptyDiscoverySnapshot,
} = location;
const now = 1800000000000;
const reading = {
  latitude: 28.56,
  longitude: 77.32,
  accuracy: 20,
  observedAt: now,
};
const area = {
  city: "Noida",
  state: "UP",
  locality: "Sector 18",
  pincode: "201301",
};
const otherArea = {
  city: "Patna",
  state: "Bihar",
  locality: "",
  pincode: "800020",
};
function storageFixture() {
  const data = new Map();
  let reads = 0,
    writes = 0,
    readFails = false,
    writeFails = false;
  return {
    data,
    get reads() {
      return reads;
    },
    get writes() {
      return writes;
    },
    set readFails(value) {
      readFails = value;
    },
    set writeFails(value) {
      writeFails = value;
    },
    getItem(key) {
      reads++;
      if (readFails) throw new Error("Blocked storage");
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      writes++;
      if (writeFails) throw new Error("Quota exhausted");
      data.set(key, value);
    },
  };
}
function eventsFixture() {
  const listeners = new Set();
  return {
    listeners,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
    send(key) {
      for (const fn of listeners) fn({ key });
    },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function envelope(value, extra = {}) {
  return JSON.stringify({ version: 1, area: value, dismissed: true, ...extra });
}
const offline = {
  now: () => now,
  getCurrentLocation: async () => {
    throw new Error("Automatic location must never run");
  },
  lookup: async () => {
    throw new Error("Automatic lookup must never run");
  },
};

test("manual preference restores on refresh, reads storage once, and never invokes GPS or geocoding", () => {
  const storage = storageFixture();
  let gps = 0,
    reverse = 0;
  const options = {
    now: () => now,
    getCurrentLocation: async () => {
      gps++;
      return reading;
    },
    lookup: async () => {
      reverse++;
      return area;
    },
  };
  const store = createDiscoveryLocationStore(storage, undefined, options);
  assert.equal(store.choose(area), true);
  assert.equal(store.getSnapshot().source, "manual");
  assert.equal(store.getSnapshot().updatedAt, now);
  const nextPage = createDiscoveryLocationStore(storage, undefined, options);
  assert.deepEqual(nextPage.getSnapshot().area, area);
  const reads = storage.reads;
  for (let index = 0; index < 10; index++)
    assert.equal(nextPage.getSnapshot(), nextPage.getSnapshot());
  assert.equal(storage.reads, reads);
  assert.equal(nextPage.getSnapshot().dismissed, true);
  assert.equal(gps, 0);
  assert.equal(reverse, 0);
});

test("current capture saves immediately, restores owned structured preference, and reuses unchanged coordinates only after another click", async () => {
  const storage = storageFixture();
  let gps = 0,
    reverse = 0;
  const options = {
    now: () => now,
    getCurrentLocation: async () => {
      gps++;
      return { ...reading, observedAt: now + gps };
    },
    fetcher: async (url, request) => {
      reverse++;
      assert.equal(url, "/api/location/reverse");
      assert.equal(request.cache, "no-store");
      assert.equal(JSON.parse(request.body).latitude, reading.latitude);
      return Response.json({
        address: {
          ...area,
          addressLine: "Private building and street",
          location: { coordinates: [77.32, 28.56] },
        },
        attribution: "Google Maps",
      });
    },
  };
  const store = createDiscoveryLocationStore(storage, undefined, options);
  assert.equal(gps, 0);
  assert.equal(reverse, 0);
  assert.deepEqual(await store.captureCurrent(), area);
  assert.equal(store.getSnapshot().source, "current");
  assert.equal(store.getSnapshot().pending, false);
  const raw = storage.data.get(discoveryStorageKey),
    saved = JSON.parse(raw);
  assert.equal(saved.ownerScope, "anonymous");
  assert.equal(saved.source, "current");
  for (const secret of [
    "addressLine",
    "Private building",
    "coordinates",
    "latitude",
    "longitude",
    "accuracy",
    "observedAt",
  ])
    assert.equal(raw.includes(secret), false);
  assert.deepEqual(
    createDiscoveryLocationStore(storage, undefined, options).getSnapshot()
      .area,
    area,
  );
  assert.equal(gps, 1);
  assert.equal(reverse, 1);
  await store.captureCurrent();
  assert.equal(gps, 2);
  assert.equal(reverse, 1);
  store.clear();
  await store.captureCurrent();
  assert.equal(gps, 3);
  assert.equal(reverse, 2);
});

test("legacy preferences remain valid indefinitely in their original context without guessing origin", () => {
  const storage = storageFixture();
  storage.data.set(discoveryStorageKey, envelope(area));
  const store = createDiscoveryLocationStore(storage, undefined, offline);
  assert.deepEqual(store.getSnapshot().area, area);
  assert.equal(store.getSnapshot().source, undefined);
  store.dismiss();
  assert.equal(
    JSON.parse(storage.data.get(discoveryStorageKey)).source,
    undefined,
  );
  store.setCaptureScope("customer:a");
  assert.equal(store.getSnapshot().area, null);
  storage.data.set(
    discoveryStorageKey,
    envelope(area, { source: "manual", updatedAt: 1 }),
  );
  const owned = createDiscoveryLocationStore(storage, undefined, {
    ...offline,
    scope: "customer:b",
  });
  assert.deepEqual(owned.getSnapshot().area, area);
  assert.equal(owned.getSnapshot().updatedAt, 1);
  owned.clear();
  owned.setCaptureScope("anonymous");
  owned.setCaptureScope("customer:b");
  assert.equal(owned.getSnapshot().area, null);
  assert.equal(owned.getSnapshot().dismissed, true);
});

test("Google-derived preferences never transfer across logical users and returning owners keep their selection", async () => {
  const storage = storageFixture();
  let gps = 0,
    lookupInstances = 0,
    reverse = 0;
  const store = createDiscoveryLocationStore(storage, undefined, {
    now: () => now,
    getCurrentLocation: async () => {
      gps++;
      return reading;
    },
    createLookup: () => {
      lookupInstances++;
      return async () => {
        reverse++;
        return area;
      };
    },
  });
  await store.captureCurrent();
  store.setCaptureScope("customer:a");
  assert.equal(store.getSnapshot().area, null);
  await store.captureCurrent();
  const keyA = discoveryStorageKeyForScope("customer:a");
  assert.equal(JSON.parse(storage.data.get(keyA)).ownerScope, "customer:a");
  store.setCaptureScope("customer:b");
  assert.equal(store.getSnapshot().area, null);
  store.choose(otherArea);
  store.setCaptureScope("customer:a");
  assert.deepEqual(store.getSnapshot().area, area);
  store.setCaptureScope("anonymous");
  assert.deepEqual(store.getSnapshot().area, area);
  assert.equal(gps, 2);
  assert.equal(reverse, 2);
  assert.equal(lookupInstances, 5);
  const freshOwner = createDiscoveryLocationStore(storage, undefined, {
    ...offline,
    scope: "customer:a",
  });
  assert.equal(freshOwner.getSnapshot().source, "current");
});

test("unsupported, malformed, oversized, wrong-owner and invalid saved values stay safe", () => {
  const bad = [
    "not json",
    JSON.stringify([]),
    JSON.stringify({ version: 2, area }),
    "x".repeat(2049),
    envelope({ ...area, city: 1 }),
    envelope({ ...area, state: null }),
    envelope({ ...area, city: "x".repeat(81) }),
    envelope({ ...area, locality: "line\nfeed" }),
    envelope({ ...area, pincode: "2013017" }),
    envelope({ ...area, coordinates: [1, 2] }),
    envelope(area, { dismissed: "true" }),
    envelope(area, { source: "ip_guess" }),
    envelope(area, { updatedAt: -1 }),
    envelope(area, { updatedAt: "today" }),
    envelope(area, { source: "current" }),
    envelope(area, { source: "current", ownerScope: "customer:a" }),
    envelope(area, {
      source: "current",
      ownerScope: "customer:" + "a".repeat(129),
    }),
    envelope(area, { extra: true }),
  ];
  for (const raw of bad) {
    const storage = storageFixture();
    storage.data.set(discoveryStorageKey, raw);
    const snapshot = createDiscoveryLocationStore(
      storage,
      undefined,
      offline,
    ).getSnapshot();
    assert.equal(snapshot.ready, true);
    assert.equal(snapshot.area, null, raw);
    assert.equal(snapshot.pending, false);
  }
});

test("manual input rejects corruption without erasing the previous valid selection or its stored value", () => {
  const storage = storageFixture(),
    store = createDiscoveryLocationStore(storage, undefined, offline);
  assert.equal(
    store.choose({ city: "  Noida  ", state: "UP", pincode: "201 301" }),
    true,
  );
  const selected = store.getSnapshot(),
    persisted = storage.data.get(discoveryStorageKey);
  for (const invalid of [
    null,
    [],
    { city: 1 },
    { city: "Noida", state: [] },
    { city: "Noida", pincode: "123" },
    { city: "\u202eNoida" },
    { city: "x".repeat(81) },
    { city: "\ufb03".repeat(80) },
    { state: "UP" },
  ]) {
    assert.equal(store.choose(invalid), false);
    assert.equal(store.getSnapshot(), selected);
    assert.equal(storage.data.get(discoveryStorageKey), persisted);
  }
  assert.equal(
    discoveryArea({ city: "Noida", pincode: "２０１３０１" }).pincode,
    "201301",
  );
});

test("one shared capture promise coalesces concurrent controls and survives subscription cleanup", async () => {
  const gps = deferred(),
    storage = storageFixture(),
    events = eventsFixture();
  let captures = 0,
    lookups = 0;
  const store = createDiscoveryLocationStore(storage, events, {
    now: () => now,
    getCurrentLocation: () => {
      captures++;
      return gps.promise;
    },
    lookup: async () => {
      lookups++;
      return area;
    },
  });
  const offA = store.subscribe(() => {}),
    offB = store.subscribe(() => {});
  assert.equal(events.listeners.size, 1);
  const a = store.captureCurrent(),
    b = store.captureCurrent();
  assert.equal(a, b);
  offA();
  offB();
  assert.equal(events.listeners.size, 0);
  const offAgain = store.subscribe(() => {});
  await tick();
  assert.equal(captures, 1);
  assert.equal(store.getSnapshot().pending, true);
  gps.resolve(reading);
  assert.deepEqual(await a, area);
  assert.deepEqual(await b, area);
  assert.equal(lookups, 1);
  offAgain();
  assert.equal(store.getSnapshot().pending, false);
});

test("manual selection wins over a late GPS callback", async () => {
  const gps = deferred();
  let lookups = 0;
  const store = createDiscoveryLocationStore(storageFixture(), undefined, {
    now: () => now,
    getCurrentLocation: () => gps.promise,
    lookup: async () => {
      lookups++;
      return area;
    },
  });
  const pending = store.captureCurrent();
  await tick();
  assert.equal(store.choose(otherArea), true);
  assert.equal(await pending, null);
  gps.resolve(reading);
  await tick();
  assert.deepEqual(store.getSnapshot().area, otherArea);
  assert.equal(lookups, 0);
});

test("clear, dismissal, and explicit cancellation abort lookup and reject late resolved data", async () => {
  for (const method of ["clear", "dismiss", "cancelCapture"]) {
    const response = deferred();
    let signal;
    const store = createDiscoveryLocationStore(storageFixture(), undefined, {
      now: () => now,
      getCurrentLocation: async () => reading,
      lookup: (_, value) => {
        signal = value;
        return response.promise;
      },
    });
    store.choose(otherArea);
    const pending = store.captureCurrent();
    await tick();
    store[method]();
    assert.equal(await pending, null);
    assert.equal(signal.aborted, true);
    response.resolve(area);
    await tick();
    assert.equal(store.getSnapshot().pending, false);
    assert.deepEqual(
      store.getSnapshot().area,
      method === "clear" ? null : otherArea,
    );
  }
});

test("failed, denied, malformed or incomplete captures preserve the previous selected area", async () => {
  for (const [gps, lookup, denied] of [
    [
      async () => {
        throw new Error("Location permission was denied.");
      },
      async () => area,
      true,
    ],
    [
      async () => reading,
      async () => {
        throw new Error("secret URL and coordinates must never appear");
      },
      false,
    ],
    [async () => ({ ...reading, latitude: NaN }), async () => area, false],
    [
      async () => reading,
      async () => ({ addressLine: "Street without a supported area" }),
      false,
    ],
  ]) {
    const storage = storageFixture(),
      store = createDiscoveryLocationStore(storage, undefined, {
        now: () => now,
        getCurrentLocation: gps,
        lookup,
      });
    store.choose(otherArea);
    const before = storage.data.get(discoveryStorageKey);
    assert.equal(await store.captureCurrent(), null);
    assert.deepEqual(store.getSnapshot().area, otherArea);
    assert.equal(storage.data.get(discoveryStorageKey), before);
    assert.equal(store.getSnapshot().permissionDenied, denied);
    assert.ok(store.getSnapshot().error.includes("manually"));
    assert.equal(store.getSnapshot().error.includes("secret URL"), false);
    store.choose(area);
    assert.equal(store.getSnapshot().permissionDenied, false);
    assert.equal(store.getSnapshot().error, "");
  }
});

test("bounded lookup timeout aborts a stalled operation and keeps manual discovery available", async () => {
  let signal;
  const store = createDiscoveryLocationStore(storageFixture(), undefined, {
    now: () => now,
    lookupTimeoutMs: 5,
    getCurrentLocation: async () => reading,
    lookup: (_, value) => {
      signal = value;
      return new Promise(() => {});
    },
  });
  store.choose(otherArea);
  assert.equal(await store.captureCurrent(), null);
  assert.equal(signal.aborted, true);
  assert.equal(store.getSnapshot().pending, false);
  assert.deepEqual(store.getSnapshot().area, otherArea);
  assert.ok(store.getSnapshot().error.includes("timed out"));
});

test("changing account scope aborts a pending operation and prevents old-user data from appearing", async () => {
  const result = deferred();
  let signal;
  const store = createDiscoveryLocationStore(storageFixture(), undefined, {
    now: () => now,
    scope: "customer:a",
    getCurrentLocation: async () => reading,
    lookup: (_, value) => {
      signal = value;
      return result.promise;
    },
  });
  store.choose(area);
  const capture = store.captureCurrent();
  await tick();
  store.setCaptureScope("customer:b");
  assert.equal(await capture, null);
  assert.equal(signal.aborted, true);
  result.resolve(otherArea);
  await tick();
  assert.equal(store.getSnapshot().area, null);
  store.setCaptureScope("customer:a");
  assert.deepEqual(store.getSnapshot().area, area);
});

test("loading auth scope stays neutral without storage, GPS or geocoding until a settled owner is selected", () => {
  const storage = storageFixture();
  storage.data.set(discoveryStorageKey, envelope(area, { source: "manual" }));
  const store = createDiscoveryLocationStore(storage, undefined, {
    ...offline,
    scope: null,
  });
  assert.equal(store.getSnapshot(), emptyDiscoverySnapshot);
  assert.equal(storage.reads, 0);
  assert.equal(store.choose(area), false);
  store.setCaptureScope("anonymous");
  assert.equal(store.getSnapshot().ready, true);
  assert.deepEqual(store.getSnapshot().area, area);
  store.setCaptureScope(null);
  assert.equal(store.getSnapshot(), emptyDiscoverySnapshot);
});

test("read and write restrictions expose memory mode and cannot roll back a newer explicit choice", () => {
  const storage = storageFixture(),
    events = eventsFixture();
  storage.data.set(discoveryStorageKey, envelope(area, { source: "manual" }));
  storage.readFails = true;
  const store = createDiscoveryLocationStore(storage, events, offline);
  const off = store.subscribe(() => {});
  assert.equal(store.getSnapshot().storageAvailable, false);
  storage.readFails = false;
  storage.writeFails = true;
  store.choose(otherArea);
  assert.equal(store.getSnapshot().storageAvailable, false);
  for (let index = 0; index < 5; index++) {
    events.send(discoveryStorageKey);
    assert.deepEqual(store.getSnapshot().area, otherArea);
  }
  store.setCaptureScope("customer:a");
  store.setCaptureScope("anonymous");
  assert.deepEqual(store.getSnapshot().area, otherArea);
  storage.writeFails = false;
  store.choose(otherArea);
  assert.equal(store.getSnapshot().storageAvailable, true);
  assert.deepEqual(
    createDiscoveryLocationStore(storage, undefined, offline).getSnapshot()
      .area,
    otherArea,
  );
  off();
});

test("cross-tab discovery updates synchronize areas and never modify unrelated service-address storage", () => {
  const storage = storageFixture(),
    events = eventsFixture(),
    saved = JSON.stringify({ city: "Patna", coordinates: [85.1, 25.6] });
  storage.data.set("customer-address", saved);
  const a = createDiscoveryLocationStore(storage, events, offline),
    b = createDiscoveryLocationStore(storage, events, offline);
  const off = b.subscribe(() => {});
  b.getSnapshot();
  a.choose(area);
  events.send(discoveryStorageKey);
  assert.deepEqual(b.getSnapshot().area, area);
  b.clear();
  assert.equal(storage.data.get("customer-address"), saved);
  off();
});

test("a failed write followed by capture and account changes cannot leave a phantom pending operation", async () => {
  const storage = storageFixture(),
    gps = deferred();
  storage.writeFails = true;
  const store = createDiscoveryLocationStore(storage, undefined, {
    now: () => now,
    scope: "customer:a",
    getCurrentLocation: () => gps.promise,
    lookup: async () => area,
  });
  store.choose(otherArea);
  const pending = store.captureCurrent();
  await tick();
  store.setCaptureScope("customer:b");
  assert.equal(await pending, null);
  store.setCaptureScope("customer:a");
  assert.equal(store.getSnapshot().pending, false);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.deepEqual(store.getSnapshot().area, otherArea);
  gps.resolve(reading);
  await tick();
  assert.deepEqual(store.getSnapshot().area, otherArea);
});

test("server rendering the actual shared hook never accesses browser storage or requests GPS", async () => {
  const source = await readFile(
    new URL("../hooks/useDiscoveryLocation.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const require = createRequire(import.meta.url),
    compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) =>
      name === "@/lib/discovery-location.mjs"
        ? location
        : name === "next-auth/react"
          ? { useSession: () => ({ status: "loading", data: null }) }
          : require(name),
    compiled,
    compiled.exports,
  );
  function Probe() {
    const state = compiled.exports.useDiscoveryLocation();
    return React.createElement(
      "span",
      null,
      `${state.ready}:${state.area === null}`,
    );
  }
  assert.equal(
    renderToStaticMarkup(React.createElement(Probe)),
    "<span>false:true</span>",
  );
});
