import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import {
  createAddressLookup,
  getCurrentLocation,
  mergeSuggestedAddress,
} from "../lib/current-location.mjs";
const require = createRequire(import.meta.url);
const now = 1800000000000;
const reading = {
  latitude: 25.61,
  longitude: 85.14,
  accuracy: 12,
  observedAt: now,
};
const position = { coords: { ...reading }, timestamp: now };

test("one-shot location calls browser only when explicitly invoked, requesting fresh GPS", async () => {
  let calls = 0;
  const geolocation = {
    getCurrentPosition(success, _error, options) {
      calls++;
      assert.deepEqual(options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      });
      success(position);
    },
  };
  assert.equal(calls, 0);
  assert.deepEqual(
    await getCurrentLocation({ geolocation, secure: true, now: () => now }),
    reading,
  );
  assert.equal(calls, 1);
});
test("denied, unavailable, timeout and browser-policy errors leave manual entry usable", async () => {
  for (const code of [1, 2, 3])
    await assert.rejects(
      getCurrentLocation({
        secure: true,
        geolocation: {
          getCurrentPosition(_success, error) {
            error({ code });
          },
        },
        now: () => now,
      }),
      /manual|manually/,
    );
  await assert.rejects(
    getCurrentLocation({ secure: false, geolocation: undefined }),
    /manually/,
  );
  await assert.rejects(
    getCurrentLocation({
      secure: true,
      geolocation: {
        getCurrentPosition() {
          throw new Error("blocked");
        },
      },
    }),
    /manual/,
  );
});
test("malformed, inaccurate, stale and future browser locations are rejected", async () => {
  for (const patch of [
    { latitude: NaN },
    { longitude: 181 },
    { latitude: -91 },
    { accuracy: 0 },
    { accuracy: 100001 },
  ]) {
    await assert.rejects(
      getCurrentLocation({
        secure: true,
        now: () => now,
        geolocation: {
          getCurrentPosition(success) {
            success({ coords: { ...reading, ...patch }, timestamp: now });
          },
        },
      }),
      /invalid location/,
    );
  }
  for (const timestamp of [now - 600001, now + 5001, undefined, -1])
    await assert.rejects(
      getCurrentLocation({
        secure: true,
        now: () => now,
        geolocation: {
          getCurrentPosition(success) {
            success({ coords: reading, timestamp });
          },
        },
      }),
      /invalid location/,
    );
});
test("autofill uses only available components, preserves missing fields and ignores geometry", () => {
  const original = {
    addressLine: "Flat 8, existing street",
    city: "Patna",
    pincode: "800001",
    state: "Bihar",
  };
  const result = mergeSuggestedAddress(original, {
    city: " Noida ",
    pincode: "bad",
    addressLine: "",
    locality: "Sector 18",
    location: { coordinates: [1, 2] },
    role: "admin",
  });
  assert.deepEqual(result, {
    ...original,
    city: "Noida",
    locality: "Sector 18",
  });
  assert.deepEqual(original, {
    addressLine: "Flat 8, existing street",
    city: "Patna",
    pincode: "800001",
    state: "Bihar",
  });
  assert.deepEqual(mergeSuggestedAddress(original, null), original);
});
test("unchanged points reuse only this form's suggestion and failed lookups remain retryable", async () => {
  let calls = 0;
  const lookup = createAddressLookup({
    fetcher: async () => {
      calls++;
      return { ok: true, json: async () => ({ address: { city: "Patna" } }) };
    },
  });
  const [a, b] = await Promise.all([lookup(reading), lookup(reading)]);
  a.city = "Edited";
  assert.equal(b.city, "Patna");
  assert.deepEqual(await lookup({ ...reading, observedAt: now + 1000 }), {
    city: "Patna",
  });
  assert.equal(calls, 1);
  await lookup({ ...reading, latitude: reading.latitude + 0.001 });
  assert.equal(calls, 2);
  let failures = 0;
  const failing = createAddressLookup({
    fetcher: async () => {
      failures++;
      throw new Error("offline");
    },
  });
  await assert.rejects(failing(reading));
  await assert.rejects(failing(reading));
  assert.equal(failures, 2);
});
function loadComponent(file, imports) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) => {
      if (Object.hasOwn(imports, name)) return imports[name];
      if (["react", "react/jsx-runtime"].includes(name)) return require(name);
      throw new Error(`Unexpected component import ${name}`);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}
test("initial destination form offers explicit capture with no browser request or inferred address", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  let calls = 0;
  const { DestinationCapture } = loadComponent(
    "components/customer/DestinationCapture.tsx",
    {
      "@/components/ui/button": {
        Button: ({ children, ...props }) =>
          React.createElement("button", props, children),
      },
      "@/lib/current-location.mjs": {
        createAddressLookup,
        getCurrentLocation: () => {
          calls++;
          throw new Error("Must be explicit");
        },
      },
    },
  );
  const html = renderToStaticMarkup(
    React.createElement(DestinationCapture, {
      onChange() {},
      onSuggestedAddress() {},
    }),
  );
  assert.equal(calls, 0);
  assert.match(html, /Use my current location/);
  assert.match(html, /No GPS destination attached/);
  assert.match(html, /browsing location is separate/);
});

function componentHarness(file, imports, props) {
  const values = [],
    cleanups = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values))
        values[index] = typeof initial === "function" ? initial() : initial;
      return [
        values[index],
        (next) => {
          values[index] =
            typeof next === "function" ? next(values[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in values)) {
        values[index] = true;
        cleanups.push(effect());
      }
    },
  };
  const component = Object.values(
    loadComponent(file, { ...imports, react: hooks }),
  )[0];
  return {
    render() {
      cursor = 0;
      return component(props);
    },
    unmount() {
      for (const cleanup of cleanups) cleanup?.();
    },
  };
}
function elements(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(elements)];
}
test("capture autofills available address components and attaches a point only after explicit confirmation", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let calls = 0,
    suggestion,
    attached;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.deepEqual(JSON.parse(options.body), reading);
    return {
      ok: true,
      json: async () => ({
        address: { city: "Patna", state: "Bihar" },
        attribution: "Google Maps",
      }),
    };
  };
  const harness = componentHarness(
    "components/customer/DestinationCapture.tsx",
    {
      "@/components/ui/button": { Button: "button" },
      "@/lib/current-location.mjs": {
        createAddressLookup,
        getCurrentLocation: async () => reading,
      },
    },
    {
      onChange(value) {
        attached = value;
      },
      onSuggestedAddress(value) {
        suggestion = value;
      },
    },
  );
  await elements(harness.render())
    .find((item) => item.props?.onClick)
    ?.props.onClick();
  assert.equal(calls, 1);
  assert.deepEqual(suggestion, { city: "Patna", state: "Bihar" });
  assert.equal(attached, undefined);
  const tree = harness.render();
  assert.ok(
    elements(tree).some(
      (item) => item.props?.children === "Address suggestion by Google Maps",
    ),
  );
  elements(tree)
    .find((item) => item.type === "input")
    .props.onChange({ target: { checked: true } });
  assert.deepEqual(attached, { ...reading, confirmed: true });
  harness.unmount();
});
test("lookup failure preserves form values, and late GPS callbacks cannot autofill an edited/unmounted form", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let updates = 0,
    requests = 0;
  globalThis.fetch = async () => {
    requests++;
    throw new Error("offline");
  };
  const imports = {
    "@/components/ui/button": { Button: "button" },
    "@/lib/current-location.mjs": {
      createAddressLookup,
      getCurrentLocation: async () => reading,
    },
  };
  const harness = componentHarness(
    "components/customer/DestinationCapture.tsx",
    imports,
    {
      onChange() {},
      onSuggestedAddress() {
        updates++;
      },
    },
  );
  await elements(harness.render())
    .find((item) => item.props?.onClick)
    .props.onClick();
  assert.equal(requests, 1);
  assert.equal(updates, 0);
  assert.ok(
    elements(harness.render()).some(
      (item) =>
        typeof item.props?.children === "string" &&
        item.props.children.includes("Your entries were kept"),
    ),
  );
  harness.unmount();
  let resolve;
  imports["@/lib/current-location.mjs"] = {
    createAddressLookup,
    getCurrentLocation: () =>
      new Promise((done) => {
        resolve = done;
      }),
  };
  const late = componentHarness(
    "components/customer/DestinationCapture.tsx",
    imports,
    {
      onChange() {},
      onSuggestedAddress() {
        updates++;
      },
    },
  );
  const work = elements(late.render())
    .find((item) => item.props?.onClick)
    .props.onClick();
  late.unmount();
  resolve(reading);
  await work;
  assert.equal(requests, 1);
  assert.equal(updates, 0);
});

test("booking address is separate from discovery; address edits and saved selection clear confirmation and GPS", async () => {
  const policy = await import("../lib/marketplace-policy.mjs");
  const saved = {
    addressLine: "Parent home, Sector 18",
    city: "Noida",
    state: "UP",
    pincode: "201301",
  };
  const imports = {
    "./DestinationCapture": { DestinationCapture: "capture" },
    axios: { isAxiosError: () => false },
    "next/link": { default: "a" },
    "lucide-react": { ArrowRight: "arrow", Check: "check" },
    "@/hooks/useCustomDiscovery": {
      useCreateServiceRequest: () => ({ isPending: false }),
    },
    "@/hooks/useCustomer": {
      useCustomerMe: () => ({ data: { customer: { addresses: [saved] } } }),
    },
    "@/components/ui/dialog": {
      Dialog: "dialog",
      DialogContent: "dialog-content",
      DialogTitle: "h2",
      DialogDescription: "p",
    },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/input": { Input: "input" },
    "@/lib/customer-types": { money: String },
    "@/lib/current-location.mjs": {
      createAddressLookup,
      mergeSuggestedAddress,
    },
    "@/lib/marketplace-policy.mjs": policy,
  };
  const harness = componentHarness(
    "components/customer/BookingRequestForm.tsx",
    imports,
    {
      close() {},
      location: { city: "Patna", pincode: "800001" },
      offering: {
        offeringId: "offer",
        service: { name: "Repair" },
        provider: { companyName: "Provider", coverageAreas: [] },
        pricing: {
          model: "fixed",
          finalPrice: 100,
          taxPercent: 18,
          unit: "job",
        },
      },
    },
  );
  const initial = elements(harness.render());
  assert.equal(
    initial.find((item) => item.props?.id === "booking-city").props.value,
    "",
  );
  const captureKey = initial.find((item) => item.type === "capture").key;
  initial
    .find((item) => item.type === "capture")
    .props.onSuggestedAddress({ city: "Patna", pincode: "800001" });
  initial
    .find((item) => item.type === "capture")
    .props.onChange({ ...reading, confirmed: true });
  elements(harness.render())
    .find((item) => item.props?.type === "checkbox")
    .props.onChange({ target: { checked: true } });
  let tree = elements(harness.render());
  assert.equal(
    tree.find((item) => item.props?.type === "checkbox").props.checked,
    true,
  );
  tree.find((item) => item.type === "capture").props.onPendingChange(true);
  tree = elements(harness.render());
  assert.equal(
    tree.find((item) => item.props?.type === "checkbox").props.checked,
    false,
  );
  assert.equal(
    tree.find((item) => item.props?.type === "submit").props.disabled,
    true,
  );
  tree.find((item) => item.type === "capture").props.onPendingChange(false);
  tree
    .find((item) => item.props?.type === "checkbox")
    .props.onChange({ target: { checked: true } });
  tree = elements(harness.render());
  assert.equal(tree.find((item) => item.type === "capture").key, captureKey);
  tree
    .find((item) => item.props?.id === "booking-addressLine")
    .props.onChange({ target: { value: "New building" } });
  tree = elements(harness.render());
  assert.equal(
    tree.find((item) => item.props?.type === "checkbox").props.checked,
    false,
  );
  assert.equal(
    tree.find((item) => item.type === "capture").props.value,
    undefined,
  );
  assert.notEqual(tree.find((item) => item.type === "capture").key, captureKey);
  tree
    .find((item) => item.props?.id === "saved-address")
    .props.onChange({ target: { value: "0" } });
  tree = elements(harness.render());
  assert.equal(
    tree.find((item) => item.props?.id === "booking-city").props.value,
    "Noida",
  );
  tree
    .find((item) => item.props?.id === "booking-city")
    .props.onChange({ target: { value: "Delhi" } });
  assert.equal(saved.city, "Noida");
  harness.unmount();
});
