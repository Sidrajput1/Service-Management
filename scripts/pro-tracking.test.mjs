import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { watchJourney } from "../lib/journey-watch.mjs";
import * as tracking from "../lib/pro-tracking.mjs";

const require = createRequire(import.meta.url);
const baseTime = 1_800_000_000_000;
function fakeGeo({ synchronousError } = {}) {
  let receive,
    fail,
    watches = 0,
    clears = 0;
  return {
    get watches() {
      return watches;
    },
    get clears() {
      return clears;
    },
    watchPosition(success, error, options) {
      watches++;
      receive = success;
      fail = error;
      assert.deepEqual(options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      });
      if (synchronousError) error({ code: synchronousError });
      return 17;
    },
    clearWatch(id) {
      assert.equal(id, 17);
      clears++;
    },
    position(timestamp = baseTime, changes = {}) {
      return receive({
        timestamp,
        coords: { latitude: 25.6, longitude: 85.1, accuracy: 9, ...changes },
      });
    },
    fail(code) {
      fail({ code });
    },
  };
}
function fixture(options = {}) {
  const geo = options.geolocation || fakeGeo(),
    states = [],
    accepted = [];
  let arrivals = 0;
  const controller = watchJourney({
    eligible: true,
    geolocation: geo,
    now: () => baseTime,
    onState: (state) => states.push(state),
    onAccepted: (update) => accepted.push(update),
    onArrival: () => arrivals++,
    send: async () => ({ success: true, status: "enroute", state: "outside" }),
    ...options,
  });
  return { geo, states, accepted, controller, arrivals: () => arrivals };
}

test("an explicit eligible start requests device location but cannot show active before a server-accepted observation", async () => {
  let finish;
  const watch = fixture({
    send: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  assert.equal(watch.geo.watches, 1);
  assert.deepEqual(watch.states, ["requesting"]);
  const pending = watch.geo.position();
  assert.equal(watch.states.at(-1), "reporting");
  assert.deepEqual(watch.accepted, []);
  assert.equal(
    watch.states.some((state) =>
      tracking.journeyStateInfo(state).title.startsWith("Tracking active"),
    ),
    false,
  );
  finish({ success: true, status: "enroute", state: "outside" });
  await pending;
  assert.equal(watch.states.at(-1), "outside");
  assert.deepEqual(watch.accepted, [
    { acceptedAt: baseTime, accuracyMeters: 9 },
  ]);
  assert.equal(
    tracking.journeyStateInfo(watch.states.at(-1)).title,
    "Tracking active",
  );
  watch.controller.stop();
});

test("missing or invalid successful response bodies cannot activate tracking or publish update metadata", async () => {
  for (const body of [
    null,
    {},
    { success: false, status: "enroute", state: "outside" },
    { success: true, status: "completed", state: "outside" },
    { success: true, status: "enroute", state: "arrived" },
  ]) {
    const watch = fixture({ send: async () => body });
    await watch.geo.position();
    assert.equal(watch.states.at(-1), "interrupted");
    assert.deepEqual(watch.accepted, []);
    assert.equal(watch.arrivals(), 0);
    watch.controller.stop();
  }
});

test("poor accuracy and sudden jump acknowledgements never become accepted point metadata", async () => {
  for (const state of ["poor_accuracy", "implausible_jump"]) {
    const watch = fixture({
      send: async () => ({ success: true, status: "enroute", state }),
    });
    await watch.geo.position(baseTime, { accuracy: 200 });
    assert.equal(watch.states.at(-1), state);
    assert.deepEqual(watch.accepted, []);
    assert.equal(watch.arrivals(), 0);
    watch.controller.stop();
  }
});

test("only the server confirms arrival and a replay does not claim this observation was newly accepted", async () => {
  for (const transitioned of [true, false]) {
    const watch = fixture({
      send: async () => ({
        success: true,
        status: "arrived",
        state: "arrived",
        transitioned,
      }),
    });
    await watch.geo.position();
    assert.equal(watch.states.at(-1), "arrived");
    assert.equal(watch.arrivals(), 1);
    assert.equal(watch.accepted.length, transitioned ? 1 : 0);
    assert.equal(watch.geo.clears, 1);
    await watch.geo.position();
    assert.equal(watch.arrivals(), 1);
    assert.match(tracking.journeyStateInfo("arrived").text, /OTP/);
  }
});

test("permission denial, unavailable GPS and browser timeout are distinct and stop the watcher once", () => {
  for (const [code, expected] of [
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ]) {
    let calls = 0;
    const watch = fixture({
      send: async () => {
        calls++;
      },
    });
    watch.geo.fail(code);
    watch.geo.fail(code);
    watch.controller.stop();
    assert.equal(watch.states.at(-1), expected);
    assert.equal(watch.geo.clears, 1);
    assert.equal(calls, 0);
    assert.equal(tracking.offersAppInformation(expected), true);
  }
  const watch = fixture({ geolocation: fakeGeo({ synchronousError: 1 }) });
  assert.equal(watch.geo.clears, 1);
  watch.controller.stop();
  assert.equal(watch.geo.clears, 1);
});

test("invalid browser coordinates and stale samples are rejected before transmission", async () => {
  for (const [timestamp, coords] of [
    [baseTime, { latitude: NaN }],
    [baseTime, { longitude: 181 }],
    [baseTime, { accuracy: 0 }],
    [baseTime - 30001, {}],
    [baseTime + 5001, {}],
    [0, {}],
  ]) {
    let sends = 0;
    const watch = fixture({
      send: async () => {
        sends++;
      },
    });
    await watch.geo.position(timestamp, coords);
    assert.equal(sends, 0);
    assert.deepEqual(watch.accepted, []);
    assert.equal(watch.states.at(-1), "unavailable");
    assert.equal(watch.geo.clears, 1);
  }
});

test("network timeout aborts a stalled request, publishes no false success and permits a later foreground observation", async () => {
  let signal,
    calls = 0,
    now = baseTime;
  const watch = fixture({
    now: () => now,
    requestTimeoutMs: 5,
    send: (_reading, currentSignal) => {
      signal = currentSignal;
      calls++;
      return calls === 1
        ? new Promise(() => {})
        : Promise.resolve({
            success: true,
            status: "enroute",
            state: "outside",
          });
    },
  });
  await watch.geo.position();
  assert.equal(signal.aborted, true);
  assert.equal(watch.states.at(-1), "network_timeout");
  assert.deepEqual(watch.accepted, []);
  now += 10000;
  await watch.geo.position(now);
  assert.equal(watch.states.at(-1), "outside");
  assert.equal(watch.accepted.length, 1);
  watch.controller.stop();
});

test("stop settles even an abort-ignoring request, clears its watch and ignores late arrival responses", async () => {
  let signal, finish;
  const watch = fixture({
    send: (_reading, currentSignal) => {
      signal = currentSignal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const pending = watch.geo.position();
  watch.controller.stop();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(watch.geo.clears, 1);
  finish({
    success: true,
    status: "arrived",
    state: "arrived",
    transitioned: true,
  });
  await Promise.resolve();
  assert.deepEqual(watch.accepted, []);
  assert.equal(watch.arrivals(), 0);
});

test("an abort-aware transport still reports a network deadline distinctly from a GPS timeout", async () => {
  const watch = fixture({
    requestTimeoutMs: 5,
    send: (_reading, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
  });
  await watch.geo.position();
  assert.equal(watch.states.at(-1), "network_timeout");
  assert.deepEqual(watch.accepted, []);
  watch.controller.stop();
});

test("one in-flight request and client cadence prevent duplicate transmissions; authorization loss stops reporting", async () => {
  let now = baseTime,
    calls = 0,
    finish;
  const watch = fixture({
    now: () => now,
    send: () => {
      calls++;
      if (calls === 1)
        return new Promise((resolve) => {
          finish = resolve;
        });
      return Promise.reject(
        Object.assign(new Error("Reassigned"), { status: 409 }),
      );
    },
  });
  const pending = watch.geo.position();
  await watch.geo.position();
  now += 2000;
  await watch.geo.position(now);
  assert.equal(calls, 1);
  finish({ success: true, status: "enroute", state: "qualifying" });
  await pending;
  await watch.geo.position(now);
  assert.equal(calls, 1);
  now += 10000;
  await watch.geo.position(now);
  assert.equal(calls, 2);
  assert.equal(watch.states.at(-1), "ineligible");
  assert.equal(watch.arrivals(), 1);
  assert.equal(watch.geo.clears, 1);
});

test("Coming Soon accepts only a whitelisted job identifier and never an arbitrary return URL", () => {
  const id = "A".repeat(24);
  assert.equal(
    tracking.proJobReturn(id),
    `/technician/all-jobs/${id.toLowerCase()}`,
  );
  assert.equal(
    tracking.comingSoonHref(id),
    `/app-coming-soon?job=${id.toLowerCase()}`,
  );
  for (const invalid of [
    undefined,
    null,
    [],
    "//evil.example",
    "https://evil.example",
    "../admin",
    "a".repeat(24) + "?next=//evil",
  ]) {
    assert.equal(tracking.proJobReturn(invalid), "/technician/all-jobs");
    assert.equal(tracking.comingSoonHref(invalid), "/app-coming-soon");
  }
});

async function load(path, modules) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) =>
      name in modules
        ? modules[name]
        : name.startsWith("@/")
          ? (() => {
              throw new Error(`Missing dependency ${name}`);
            })()
          : require(name),
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
test("actual Pro panel server-renders an idle state without browser access, GPS requests or active claims", async () => {
  const { ProJourney } = await load(
    "../components/technicians/ProJourney.tsx",
    {
      "next-auth/react": {
        useSession: () => ({
          data: { user: { id: "tech-user", role: "technician" } },
          status: "authenticated",
        }),
      },
      "@tanstack/react-query": {
        useQueryClient: () => ({ invalidateQueries() {} }),
      },
      "@/components/ui/button": {
        Button: ({ children }) => React.createElement("button", null, children),
      },
      "@/lib/journey-watch.mjs": {
        watchJourney() {
          throw new Error("SSR must never request location");
        },
      },
      "@/lib/pro-tracking.mjs": tracking,
    },
  );
  const html = renderToStaticMarkup(
    React.createElement(ProJourney, {
      jobId: "a".repeat(24),
      status: "enroute",
      journey: {
        canTrack: true,
        destinationAvailable: true,
        clientIntervalMs: 10000,
        requiredReadings: 2,
        radiusMeters: 100,
      },
    }),
  );
  assert.match(html, /Tracking not started/);
  assert.equal(html.includes("Tracking active"), false);
  assert.match(html, /Only the server confirms arrival/);
  assert.match(html, /OTP/);
});

test("actual Pro panel cannot show a retained or late active acknowledgement after consent ends", async () => {
  const jobId = "a".repeat(24), owner = `tech-user:${jobId}`;
  let seeds = [], index = 0;
  const { ProJourney } = await load("../components/technicians/ProJourney.tsx", {
    react: {
      ...React,
      // Seed retained state at the React cleanup boundary; render the real panel.
      useState: () => [seeds[index++], () => {}],
    },
    "next-auth/react": {
      useSession: () => ({ data: { user: { id: "tech-user", role: "technician" } }, status: "authenticated" }),
    },
    "@tanstack/react-query": { useQueryClient: () => ({ invalidateQueries() {} }) },
    "@/components/ui/button": { Button: ({ children }) => React.createElement("button", null, children) },
    "@/lib/journey-watch.mjs": { watchJourney() { throw new Error("Rendering must not request location"); } },
    "@/lib/pro-tracking.mjs": tracking,
  });
  for (const scenario of [
    { state: "outside", consent: null, accepted: true, expected: "Tracking not started" },
    { state: "qualifying", consent: null, accepted: true, expected: "Tracking not started" },
    { state: "reporting", consent: null, accepted: true, expected: "Tracking not started" },
    { state: "outside", consent: owner, accepted: false, expected: "Tracking not started" },
    { state: "outside", consent: owner, accepted: true, expected: "Tracking active" },
    { state: "qualifying", consent: owner, accepted: true, expected: "Tracking active" },
    { state: "outside", consent: null, accepted: true, status: "arrived", expected: "Arrival confirmed" },
  ]) {
    index = 0;
    seeds = [scenario.consent, {
      owner, state: scenario.state,
      ...(scenario.accepted ? { accepted: { acceptedAt: baseTime, accuracyMeters: 9 } } : {}),
    }];
    const html = renderToStaticMarkup(React.createElement(ProJourney, {
      jobId, status: scenario.status || "enroute",
      journey: { canTrack: true, destinationAvailable: true, clientIntervalMs: 10000, requiredReadings: 2, radiusMeters: 100 },
    }));
    assert.equal(index, 2);
    assert.ok(html.includes(scenario.expected), JSON.stringify(scenario));
    if (scenario.expected !== "Tracking active") assert.equal(html.includes("Tracking active"), false);
    if (scenario.accepted) assert.match(html, /Last server-accepted update/);
  }
});

test("actual informational page uses the public shell, a safe return link and no installation functionality", async () => {
  const empty = () => null;
  const { default: Page } = await load("../app/app-coming-soon/page.tsx", {
    "@/components/SiteHeader": { SiteHeader: empty },
    "@/components/SiteFooter": { SiteFooter: empty },
    "@/lib/pro-tracking.mjs": tracking,
  });
  const html = renderToStaticMarkup(
    await Page({ searchParams: Promise.resolve({ job: "b".repeat(24) }) }),
  );
  assert.match(html, /Servizato App/);
  assert.match(html, /Coming Soon/);
  assert.match(html, new RegExp(`/technician/all-jobs/${"b".repeat(24)}`));
  for (const forbidden of [
    "beforeinstallprompt",
    "serviceWorker",
    "manifest",
    "play.google.com",
    "apps.apple.com",
    ".apk",
    "Install Now",
    "Download App",
  ])
    assert.equal(html.includes(forbidden), false);
  const bad = renderToStaticMarkup(
    await Page({
      searchParams: Promise.resolve({ job: "https://evil.example" }),
    }),
  );
  assert.equal(bad.includes("evil.example"), false);
  assert.match(bad, /href="\/technician\/all-jobs"/);
});
