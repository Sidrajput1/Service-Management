import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);

async function load(path, modules = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name in modules) return modules[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/")) throw new Error(`Missing test module ${name}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
const validation = await load("../lib/location-validation.ts");
const geocoding = await load("../lib/reverse-geocoding.ts", {
  "@/lib/location-validation": validation,
});
const reading = () => ({
  latitude: 25.612,
  longitude: 85.123,
  accuracy: 20,
  observedAt: Date.now(),
});
const component = (long_name, ...types) => ({ long_name, types });
const googleResponse = (components) => ({
  status: "OK",
  results: [{ address_components: components }],
});
const sample = googleResponse([
  component("12", "street_number"),
  component("Sample Road", "route"),
  component("Kankarbagh", "sublocality_level_1", "sublocality"),
  component("Patna", "locality"),
  component("Bihar", "administrative_area_level_1"),
  component("800020", "postal_code"),
]);

test("GPS validation requires fresh bounded coordinates and no extra fields", () => {
  const now = Date.now();
  assert.deepEqual(
    geocoding.validatedGeocodingReading(reading(), now).accuracy,
    20,
  );
  for (const value of [
    null,
    {},
    { ...reading(), latitude: 91 },
    { ...reading(), longitude: -181 },
    { ...reading(), accuracy: 0 },
    { ...reading(), accuracy: 1001 },
    { ...reading(), observedAt: now - 120001 },
    { ...reading(), observedAt: now + 5001 },
    { ...reading(), confirmed: true },
  ]) {
    assert.throws(() => geocoding.validatedGeocodingReading(value, now), {
      status: 400,
    });
  }
});

test("structured components produce only supported editable address fields", () => {
  assert.deepEqual(geocoding.addressSuggestion(sample), {
    addressLine: "12 Sample Road",
    locality: "Kankarbagh",
    city: "Patna",
    state: "Bihar",
    pincode: "800020",
  });
  const incomplete = googleResponse([
    component("Patna district", "administrative_area_level_2"),
    component("Bihar", "administrative_area_level_1"),
    component("80000", "postal_code"),
  ]);
  assert.deepEqual(geocoding.addressSuggestion(incomplete), { state: "Bihar" });
  assert.equal(
    geocoding.addressSuggestion({ status: "ZERO_RESULTS", results: [] }),
    null,
  );
  assert.equal(geocoding.addressSuggestion(googleResponse([])), null);
  assert.deepEqual(
    geocoding.addressSuggestion(
      googleResponse([
        component("A".repeat(151), "locality"),
        component("Bihar", "administrative_area_level_1"),
      ]),
    ),
    { state: "Bihar" },
  );
});

test("upstream call is one fixed-host no-store request; no geometry or key is returned", async () => {
  let calls = 0;
  const result = await geocoding.reverseGeocode(
    reading(),
    "server-secret",
    async (url, options) => {
      calls++;
      assert.equal(url.origin, "https://maps.googleapis.com");
      assert.equal(url.pathname, "/maps/api/geocode/json");
      assert.equal(url.searchParams.get("key"), "server-secret");
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      return Response.json({ ...sample, geometry: { secret: true } });
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.city, "Patna");
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("timeouts abort a pending upstream request and expose only a safe fallback", async () => {
  let aborted = false;
  await assert.rejects(
    geocoding.reverseGeocode(
      reading(),
      "server-secret",
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("server-secret and private coordinates"));
          });
        }),
      5,
    ),
    (error) => error.status === 503 && !error.message.includes("secret"),
  );
  assert.equal(aborted, true);
});

test("quota, key rejection, transport, malformed and oversized upstream data fail safely", async () => {
  for (const make of [
    () =>
      Response.json({
        status: "OVER_QUERY_LIMIT",
        error_message: "server-secret",
      }),
    () =>
      Response.json({
        status: "REQUEST_DENIED",
        error_message: "server-secret",
      }),
    () => new Response("server-secret", { status: 500 }),
    () => new Response("{malformed server-secret"),
    () => new Response("x".repeat(131073)),
    () => {
      throw new Error("server-secret");
    },
  ]) {
    await assert.rejects(
      geocoding.reverseGeocode(reading(), "server-secret", make),
      (error) => error.status === 503 && !error.message.includes("secret"),
    );
  }
  await assert.rejects(
    geocoding.reverseGeocode(reading(), "server-secret", () =>
      Response.json({ status: "ZERO_RESULTS", results: [] }),
    ),
    { status: 422 },
  );
});

test("bounded stream parsing cancels an oversized input", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(2000)));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(geocoding.readBoundedJson(body, 1024), { status: 413 });
  assert.equal(cancelled, true);
});

test("per-client, process-minute and process-day budgets are enforced without precise data", () => {
  const limiter = geocoding.createGeocodingLimiter();
  for (let index = 0; index < 5; index++)
    assert.equal(limiter.consume("one-browser", 1000), true);
  assert.equal(limiter.consume("one-browser", 1000), false);
  for (let index = 0; index < 25; index++)
    assert.equal(limiter.consume(`browser-${index}`, 1000), true);
  assert.equal(limiter.consume("rotated-cookie", 1000), false);
  assert.equal(limiter.consume("one-browser", 61000), true);
  const daily = geocoding.createGeocodingLimiter();
  for (let index = 0; index < 500; index++) {
    assert.equal(
      daily.consume(String(index), Math.floor(index / 20) * 60000),
      true,
    );
  }
  assert.equal(daily.consume("daily-limit", 1_600_000), false);
  assert.equal(daily.consume("tomorrow", 86_400_000), true);
});

async function routeFixture(
  t,
  fetcher = () => Response.json(sample),
  key = "route-secret",
) {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
  const oldLimiter = globalThis.servizatoGeocodingLimiter;
  globalThis.fetch = fetcher;
  if (key) process.env.GOOGLE_MAPS_GEOCODING_API_KEY = key;
  else delete process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
  delete globalThis.servizatoGeocodingLimiter;
  t.after(() => {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
    else process.env.GOOGLE_MAPS_GEOCODING_API_KEY = oldKey;
    if (oldLimiter === undefined) delete globalThis.servizatoGeocodingLimiter;
    else globalThis.servizatoGeocodingLimiter = oldLimiter;
  });
  return load("../app/api/location/reverse/route.ts", {
    "@/lib/reverse-geocoding": geocoding,
  });
}
function request(body = reading(), headers = {}) {
  return new Request("https://servizato.example/api/location/reverse", {
    method: "POST",
    headers: {
      origin: "https://servizato.example",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("actual public route serves anonymous discovery with safe cookie and no-store attribution", async (t) => {
  const { POST } = await routeFixture(t);
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /Secure/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=strict/i);
  assert.deepEqual(await response.json(), {
    address: geocoding.addressSuggestion(sample),
    attribution: "Google Maps",
  });
});

test("actual route rejects cross-origin, malformed and inaccurate GPS before a paid call", async (t) => {
  let calls = 0;
  const { POST } = await routeFixture(t, () => {
    calls++;
    return Response.json(sample);
  });
  const cases = [
    [request(reading(), { origin: "https://attacker.example" }), 403],
    [request(reading(), { "sec-fetch-site": "cross-site" }), 403],
    [request(reading(), { "content-type": "text/plain" }), 415],
    [request("{broken"), 400],
    [request({ ...reading(), accuracy: 1001 }), 400],
    [request({ ...reading(), userId: "someone-else" }), 400],
    [request("x".repeat(1025)), 413],
    [request(reading(), { "content-length": "3000" }), 413],
  ];
  for (const [input, status] of cases)
    assert.equal((await POST(input)).status, status);
  assert.equal(calls, 0);
});

test("actual route missing key, no result and provider failure retain safe manual fallback", async (t) => {
  let calls = 0;
  const { POST } = await routeFixture(
    t,
    () => {
      calls++;
      throw new Error("route-secret");
    },
    "",
  );
  assert.equal((await POST(request())).status, 503);
  assert.equal(calls, 0);
  process.env.GOOGLE_MAPS_GEOCODING_API_KEY = "route-secret";
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(
    JSON.stringify(await response.json()).includes("route-secret"),
    false,
  );
  assert.equal(calls, 1);
  globalThis.fetch = () =>
    Response.json({ status: "ZERO_RESULTS", results: [] });
  const empty = await POST(request());
  assert.equal(empty.status, 422);
  assert.match((await empty.json()).error, /manually/);
});

test("actual route repeated cookie and rotated cookies cannot exceed request budgets", async (t) => {
  let calls = 0;
  const { POST } = await routeFixture(t, () => {
    calls++;
    return Response.json(sample);
  });
  const first = await POST(request());
  const cookie = first.headers.get("set-cookie").split(";")[0];
  for (let index = 0; index < 4; index++)
    assert.equal((await POST(request(reading(), { cookie }))).status, 200);
  const limited = await POST(request(reading(), { cookie }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  for (let index = 0; index < 25; index++)
    assert.equal((await POST(request())).status, 200);
  assert.equal((await POST(request())).status, 429);
  assert.equal(calls, 30);
});
