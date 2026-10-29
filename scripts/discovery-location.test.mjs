import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as preference from "../lib/discovery-location.mjs";
import { createAddressLookup } from "../lib/current-location.mjs";
import * as discoveryQuery from "../lib/discovery-query.mjs";
import * as policy from "../lib/marketplace-policy.mjs";
import * as moderation from "../lib/moderation-policy.mjs";
import * as catalog from "../lib/catalog/definition.mjs";

const require = createRequire(import.meta.url);
async function load(path, modules = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/")) throw new Error(`Missing dependency ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}
test("first visit has a stable hydration snapshot and never requests browser position", () => {
  const store = preference.createDiscoveryLocationStore(memoryStorage());
  assert.equal(preference.emptyDiscoverySnapshot.ready, false);
  assert.equal(preference.emptyDiscoverySnapshot.area, null);
  assert.equal(preference.emptyDiscoverySnapshot.dismissed, false);
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().area, null);
  assert.equal(store.getSnapshot().dismissed, false);
  assert.equal(store.getSnapshot(), store.getSnapshot());
});
test("manual area persists across navigation while whitelisting area data and preserving saved addresses", () => {
  const storage = memoryStorage(),
    store = preference.createDiscoveryLocationStore(storage);
  const savedAddress = Object.freeze({
    addressLine: "Customer's own service address",
    city: "Patna",
    state: "Bihar",
    pincode: "800020",
    location: { coordinates: [85.1, 25.6] },
  });
  store.choose({
    ...savedAddress,
    city: "  Noida  ",
    state: "UP",
    pincode: "201 301",
    latitude: 28.5,
  });
  const nextPage = preference
    .createDiscoveryLocationStore(storage)
    .getSnapshot();
  assert.equal(nextPage.area.city, "Noida");
  assert.equal(nextPage.area.pincode, "201301");
  assert.equal(nextPage.dismissed, true);
  const serialized = storage.getItem(preference.discoveryStorageKey);
  for (const privateField of [
    "coordinates",
    "latitude",
    "addressLine",
    "location",
  ])
    assert.equal(serialized.includes(privateField), false);
  assert.equal(savedAddress.city, "Patna");
  assert.deepEqual(savedAddress.location.coordinates, [85.1, 25.6]);
});
test("dismissal and clearing survive visits without a repeated invitation", () => {
  const storage = memoryStorage(),
    store = preference.createDiscoveryLocationStore(storage);
  store.dismiss();
  assert.equal(
    preference.createDiscoveryLocationStore(storage).getSnapshot().dismissed,
    true,
  );
  store.choose({ city: "Noida" });
  store.clear();
  const cleared = preference
    .createDiscoveryLocationStore(storage)
    .getSnapshot();
  assert.equal(cleared.ready, true);
  assert.equal(cleared.area, null);
  assert.equal(cleared.dismissed, true);
});
test("blocked or missing local storage retains a usable memory preference", () => {
  for (const storage of [
    undefined,
    {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
  ]) {
    const store = preference.createDiscoveryLocationStore(storage);
    store.choose({ city: "Noida" });
    assert.equal(store.getSnapshot().area.city, "Noida");
    store.clear();
    assert.equal(store.getSnapshot().dismissed, true);
  }
});
test("malformed preferences and PINs cannot become a selected area", () => {
  const storage = memoryStorage();
  storage.setItem(preference.discoveryStorageKey, "invalid-json");
  assert.equal(
    preference.createDiscoveryLocationStore(storage).getSnapshot().area,
    null,
  );
  assert.equal(
    preference.discoveryArea({ city: "Noida", pincode: "2013017" }),
    null,
  );
  assert.equal(
    preference.discoveryArea({ city: "", locality: "", pincode: "" }),
    null,
  );
});
test("separate tabs update discovery subscribers and cleanup their event listeners", () => {
  const storage = memoryStorage(),
    handlers = new Set();
  const events = {
    addEventListener: (_, fn) => handlers.add(fn),
    removeEventListener: (_, fn) => handlers.delete(fn),
  };
  const a = preference.createDiscoveryLocationStore(storage, events),
    b = preference.createDiscoveryLocationStore(storage, events);
  let count = 0;
  const unsubscribe = b.subscribe(() => count++);
  b.getSnapshot();
  a.choose({ city: "Noida" });
  for (const handler of handlers)
    handler({ key: preference.discoveryStorageKey });
  assert.equal(b.getSnapshot().area.city, "Noida");
  assert.equal(count, 1);
  unsubscribe();
  assert.equal(handlers.size, 0);
});

const pagination = await load("../lib/pagination.ts");
const validation = await load("../lib/marketplace-validation.ts", {
  "@/lib/pagination": pagination,
  "@/lib/marketplace-policy.mjs": policy,
  "@/lib/catalog/definition.mjs": catalog,
  "@/lib/auth": { ApiAuthError: Error },
});
async function discoveryFixture(rows = []) {
  let captured,
    calls = 0;
  const loaded = await load("../lib/discovery.ts", {
    "@/lib/moderation-policy.mjs": moderation,
    "@/lib/marketplace-policy.mjs": policy,
    "@/lib/catalog/definition.mjs": catalog,
    "@/lib/marketplace-validation": validation,
    "@/lib/db": { connectToDb: async () => {} },
    "@/models/PriceItem": { collection: { name: "priceitems" } },
    "@/models/ServiceProvider": { collection: { name: "serviceproviders" } },
    "@/models/ServiceOffering": {
      aggregate: (pipeline) => {
        calls++;
        captured = pipeline;
        return { option: async () => rows };
      },
    },
  });
  return { module: loaded, pipeline: () => captured, calls: () => calls };
}
test("selected area query uses aliases on the same active area and bounded pagination", async () => {
  const fixture = await discoveryFixture();
  await fixture.module.discover(
    new Request(
      "http://test?city=Noida&state=UP&pincode=201301&limit=6&page=2",
    ),
  );
  const stages = fixture.pipeline(),
    match = stages.find((stage) => stage.$lookup?.from === "serviceproviders")
      .$lookup.pipeline[0].$match;
  const area = match.$or[0].coverageAreas.$elemMatch;
  assert.equal(area.cityKey, "noida");
  assert.equal(area.isActive, true);
  const state = area.$and.find((condition) => condition.$or?.[0]?.stateKey);
  assert.ok(state.$or[0].stateKey.$in.includes("uttar pradesh"));
  assert.ok(state.$or[0].stateKey.$in.includes("up"));
  assert.ok(state.$or.some((condition) => condition.stateKey === ""));
  assert.ok(
    state.$or.some((condition) => condition.stateKey?.$exists === false),
  );
  assert.equal(match.status, "active");
  assert.equal(match.verificationStatus, "verified");
  assert.equal(stages[0].$match.approvalStatus, "approved");
  assert.equal(stages[0].$match.isActive, true);
  assert.equal(stages.find((stage) => stage.$skip).$skip, 6);
  assert.equal(stages.find((stage) => stage.$limit).$limit, 7);
});
test("empty local query never reruns nationwide; explicit other area query retains eligibility and excludes local matches", async () => {
  const fixture = await discoveryFixture();
  const local = await fixture.module.discover(
    new Request("http://test?city=Noida&pincode=201301"),
  );
  assert.deepEqual(local.providers, []);
  assert.equal(fixture.calls(), 1);
  await fixture.module.discover(
    new Request("http://test?city=Noida&pincode=201301&scope=other"),
  );
  const provider = fixture
    .pipeline()
    .find((stage) => stage.$lookup?.from === "serviceproviders").$lookup
    .pipeline[0].$match;
  assert.equal(provider.verificationStatus, "verified");
  assert.equal(provider.status, "active");
  assert.ok(provider.$and[0].$or);
  assert.equal(
    provider.$and[1].$nor[0].$or[0].coverageAreas.$elemMatch.cityKey,
    "noida",
  );
});
test("public discovery projects actual coverage and ratings without precise destination coordinates", async () => {
  const fixture = await discoveryFixture([
    {
      _id: "offering",
      name: "Plumbing",
      catalog: { _id: "service", name: "Plumbing" },
      provider: {
        _id: "provider",
        companyName: "Reviewed business",
        coverageVersion: 1,
        coverageAreas: [
          { city: "Patna", state: "Bihar", pincode: "800020", isActive: true },
        ],
        address: { location: { coordinates: [85.1, 25.6] } },
        ratingSummary: { count: 3, average: 4.3 },
      },
      price: 250,
      finalPrice: 250,
      taxPercent: 18,
      rankingScore: 2.4,
    },
  ]);
  const result = await fixture.module.discover(
    new Request("http://test?city=Noida&pincode=201301&scope=other"),
  );
  assert.equal(result.providers[0].reviewCount, 3);
  assert.equal(result.providers[0].rating, 4.3);
  assert.equal(result.providers[0].discoveryCoverage, "outside");
  assert.equal(result.providers[0].provider.coverageAreas[0].city, "Patna");
  assert.equal(JSON.stringify(result).includes("coordinates"), false);
});
test("discovery validation normalizes PIN whitespace and rejects unknown scope or excessive result size", () => {
  assert.equal(
    validation.parseDiscovery(
      new Request("http://test?pincode=201%20301&state=UP"),
    ).pincode,
    "201301",
  );
  for (const query of ["scope=all", "limit=100", "pincode=2013017"])
    assert.throws(() =>
      validation.parseDiscovery(new Request(`http://test?${query}`)),
    );
});

async function locationControl(
  snapshot,
  {
    open = false,
    capture = async () => {
      throw new Error(
        "Location permission was denied. Enter your area manually.",
      );
    },
  } = {},
) {
  let hook = 0,
    captures = 0;
  const buttons = [];
  const storage = memoryStorage();
  const store = preference.createDiscoveryLocationStore(storage, undefined, {
    getCurrentLocation: async () => {
      captures++;
      return capture();
    },
    createLookup: () => createAddressLookup(),
  });
  if (snapshot.area) store.choose(snapshot.area);
  else if (snapshot.dismissed) store.dismiss();
  const passthrough = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  const loaded = await load(
    "../components/public/DiscoveryLocationControl.tsx",
    {
      react: {
        ...React,
        useState: (value) =>
          React.useState(++hook === 1 && open ? true : value),
      },
      "lucide-react": {
        LocateFixed: () => null,
        MapPin: () => null,
        ArrowRight: () => null,
        X: () => null,
      },
      "@/hooks/useDiscoveryLocation": {
        useDiscoveryLocation: () => ({
          ...store.getSnapshot(),
          ready: snapshot.ready,
          choose: store.choose,
          dismiss: store.dismiss,
          clear: store.clear,
          captureCurrent: store.captureCurrent,
          cancelCapture: store.cancelCapture,
        }),
      },
      "@/lib/discovery-location.mjs": preference,
      "@/lib/current-location.mjs": {
        getCurrentLocation: async () => {
          captures++;
          return capture();
        },
      },
      "@/components/ui/dialog": Object.fromEntries(
        [
          "Dialog",
          "DialogContent",
          "DialogDescription",
          "DialogHeader",
          "DialogTitle",
        ].map((key) => [key, passthrough]),
      ),
      "@/components/ui/button": {
        Button: ({ children, ...props }) => {
          buttons.push({ children, ...props });
          return React.createElement("button", { type: props.type }, children);
        },
      },
      "@/components/ui/input": {
        Input: (props) => React.createElement("input", props),
      },
    },
  );
  const render = () => {
    hook = 0;
    buttons.length = 0;
    return renderToStaticMarkup(
      React.createElement(loaded.DiscoveryLocationControl, { invite: true }),
    );
  };
  const html = render();
  return { html, render, buttons, storage, store, captures: () => captures };
}
test("first-visit invitation offers location and manual continuation without automatically capturing GPS", async () => {
  const rendered = await locationControl({
    ready: true,
    area: null,
    dismissed: false,
  });
  assert.ok(
    rendered.html.includes(
      "Set your location for better service recommendations",
    ),
  );
  assert.ok(rendered.html.includes("Enter location manually"));
  assert.ok(rendered.html.includes("Continue browsing without location"));
  assert.equal(rendered.captures(), 0);
  const dismissed = await locationControl({
    ready: true,
    area: null,
    dismissed: true,
  });
  assert.equal(
    dismissed.html.includes(
      "Set your location for better service recommendations",
    ),
    false,
  );
});
test("GPS is requested only by the explicit button and denied permission leaves manual fields available", async () => {
  const rendered = await locationControl(
    { ready: true, area: null, dismissed: false },
    { open: true },
  );
  assert.equal(rendered.captures(), 0);
  const button = rendered.buttons.find(
    (item) =>
      item.children === "Use my current location" ||
      (Array.isArray(item.children) &&
        item.children.includes("Use my current location")),
  );
  assert.ok(button);
  await button.onClick();
  assert.equal(rendered.captures(), 1);
  assert.equal(rendered.store.getSnapshot().permissionDenied, true);
  assert.ok(rendered.render().includes("How to enable location"));
  assert.ok(
    rendered
      .render()
      .includes("Servizato cannot change your browser permission"),
  );
  assert.ok(rendered.html.includes('id="discovery-location-city"'));
  assert.ok(rendered.html.includes("Save discovery area"));
});
test("explicit discovery lookup sends one current GPS reading and reuses a successful unchanged-coordinate suggestion", async (context) => {
  const originalFetch = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return Response.json({
      address: { city: "Noida", state: "Uttar Pradesh", pincode: "201301" },
      attribution: "Google Maps",
    });
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const reading = {
    latitude: 28.56,
    longitude: 77.32,
    accuracy: 20,
    observedAt: Date.now(),
  };
  const rendered = await locationControl(
    { ready: true, area: null, dismissed: false },
    { open: true, capture: async () => reading },
  );
  const button = rendered.buttons.find(
    (item) =>
      item.children === "Use my current location" ||
      (Array.isArray(item.children) &&
        item.children.includes("Use my current location")),
  );
  assert.equal(calls.length, 0);
  await button.onClick();
  await button.onClick();
  assert.equal(rendered.captures(), 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/location/reverse");
  assert.deepEqual(calls[0].body, reading);
  const restored = preference
    .createDiscoveryLocationStore(rendered.storage)
    .getSnapshot();
  assert.equal(restored.area.city, "Noida");
  assert.equal(restored.source, "current");
  assert.ok(rendered.render().includes("Google Maps"));
});

test("restored selection suppresses first-visit invitation and permission requests; hydration remains neutral", async () => {
  const restored = await locationControl({
    ready: true,
    area: { city: "Patna", state: "Bihar", pincode: "800001" },
    dismissed: true,
  });
  assert.match(restored.html, /Patna/);
  assert.equal(
    restored.html.includes(
      "Set your location for better service recommendations",
    ),
    false,
  );
  assert.equal(restored.captures(), 0);
  restored.render();
  assert.equal(restored.captures(), 0);
  const loading = await locationControl({
    ready: false,
    area: null,
    dismissed: false,
  });
  assert.match(loading.html, /Restoring your area/);
  assert.equal(
    loading.html.includes(
      "Set your location for better service recommendations",
    ),
    false,
  );
  assert.equal(loading.captures(), 0);
});
test("service search uses the persistent discovery area and offers explicit exploration after empty local results", async () => {
  const captured = [],
    pushes = [],
    buttons = [],
    area = {
      city: "Noida",
      state: "UP",
      locality: "Sector 18",
      pincode: "201301",
    };
  const loaded = await load("../components/public/SmartDiscovery.tsx", {
    "next/image": () => null,
    "next/link": ({ children }) => React.createElement("span", null, children),
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("q=Plumbing"),
      useRouter: () => ({ push: (url) => pushes.push(url), replace: () => {} }),
    },
    "next-auth/react": { useSession: () => ({ data: null }) },
    "lucide-react": Object.fromEntries(
      ["Search", "Building2", "MapPin", "Star", "ArrowRight", "X"].map(
        (key) => [key, () => null],
      ),
    ),
    "@/hooks/useCustomDiscovery": {
      useCustomerServices: () => ({}),
      useCustomerProviders: (filters, enabled) => {
        captured.push({ filters, enabled });
        return { data: { providers: [] }, isLoading: false, isError: false };
      },
      discoveryParams: (filters) =>
        new URLSearchParams(
          Object.entries(filters).filter(([, value]) => Boolean(value)),
        ),
    },
    "@/hooks/useCustomer": { useCustomerMe: () => ({}) },
    "@/hooks/useDiscoveryLocation": {
      useDiscoveryLocation: () => ({
        ready: true,
        area,
        choose: () => {},
        clear: () => {},
      }),
    },
    "@/lib/discovery-location.mjs": preference,
    "@/lib/discovery-query.mjs": {
      ...discoveryQuery,
      initialDiscoverySearchState: discoveryQuery.reconcileDiscoverySearch(
        discoveryQuery.initialDiscoverySearchState,
        { q: "Plumbing" },
        area,
        true,
      ).state,
    },
    "@/components/customer/CustomerUi": {
      CustomerState: ({ message, emptyFooter }) =>
        React.createElement("div", null, message, emptyFooter),
    },
    "@/components/customer/BookingRequestForm": {
      BookingRequestForm: () => null,
    },
    "./BookingButton": { BookingButton: () => null },
    "./DiscoveryLocationControl": { DiscoveryLocationControl: () => null },
    "@/components/ui/button": {
      Button: ({ children, ...props }) => {
        buttons.push({ children, ...props });
        return React.createElement("button", { type: props.type }, children);
      },
    },
    "@/components/ui/input": {
      Input: (props) => React.createElement("input", props),
    },
    "@/lib/booking-redirect": {
      bookingDestination: () => "/customer/services",
    },
    "@/lib/customer-types": { money: String },
  });
  const html = renderToStaticMarkup(React.createElement(loaded.SmartDiscovery));
  assert.equal(captured[0].enabled, true);
  assert.equal(captured[0].filters.city, "Noida");
  assert.equal(captured[0].filters.pincode, "201301");
  assert.equal(captured[0].filters.q, "Plumbing");
  assert.ok(html.includes("No eligible offerings match"));
  assert.ok(html.includes("Explore other eligible providers"));
  const explore = buttons.find(
    (item) =>
      Array.isArray(item.children) &&
      item.children.includes("Explore other eligible providers"),
  );
  explore.onClick();
  assert.ok(pushes[0].includes("scope=other"));
  assert.equal(pushes[0].includes("address"), false);
  assert.equal(pushes[0].includes("coordinates"), false);
});
