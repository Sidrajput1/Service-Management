import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import * as preference from "../lib/discovery-location.mjs";
import * as queryPolicy from "../lib/discovery-query.mjs";
import {
  discoveryParams,
  discoveryQueryIdentity,
  discoveryAreaIdentity,
  discoveryQueryOptions,
  discoveryFreshnessMs,
  initialDiscoverySearchState,
  reconcileDiscoverySearch,
  repairDiscoverySearch,
  stageDiscoverySearch,
} from "../lib/discovery-query.mjs";

const noida = {
  city: "Noida",
  state: "Uttar Pradesh",
  locality: "Sector 62",
  pincode: "201309",
};
const patna = {
  city: "Patna",
  state: "Bihar",
  locality: "",
  pincode: "800001",
};
const result = (city) => ({
  providers: [{ provider: { companyName: city } }],
  page: 1,
  hasMore: false,
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
const freshClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

test("discovery identifiers canonicalize aliases, NFKC whitespace/PINs, field order and equivalent defaults", () => {
  const one = {
    city: " BANGALORE ",
    state: "ka",
    locality: " Whitefield ",
    pincode: "５６０ ０６６",
    q: "  AC   Repair ",
    page: "01",
    minRating: "0.0",
    sort: "relevance",
    limit: "12",
    scope: "local",
  };
  const other = {
    q: "ac repair",
    locality: "whitefield",
    state: "Karnataka",
    city: "Bengaluru",
    pincode: "560066",
  };
  assert.equal(discoveryQueryIdentity(one), discoveryQueryIdentity(other));
  assert.equal(
    discoveryAreaIdentity({
      city: "NOIDA",
      state: "UP",
      pincode: "201 309",
      locality: " sector 62 ",
    }),
    discoveryAreaIdentity(noida),
  );
  assert.doesNotMatch(
    discoveryQueryIdentity(one),
    /page=|minRating=|sort=|limit=|scope=/,
  );
  assert.match(discoveryParams(one).toString(), /city=BANGALORE/);
});
test("invalid limits remain invalid and public/customer, full areas and scope have independent cache identities", () => {
  assert.match(discoveryQueryIdentity({ limit: "100" }), /limit=100/);
  const get = async () => result("fixture");
  const publicOne = discoveryQueryOptions(noida, "public", get);
  for (const other of [
    discoveryQueryOptions(noida, "customer:one", get),
    discoveryQueryOptions(noida, "customer:two", get),
    discoveryQueryOptions({ ...noida, state: "Bihar" }, "public", get),
    discoveryQueryOptions(
      { ...noida, locality: "Other locality" },
      "public",
      get,
    ),
    discoveryQueryOptions({ ...noida, pincode: "201301" }, "public", get),
    discoveryQueryOptions({ ...noida, scope: "other" }, "public", get),
  ])
    assert.notDeepEqual(publicOne.queryKey, other.queryKey);
  const continuation = "a".repeat(24);
  assert.equal(
    discoveryQueryIdentity({ ...noida, offeringId: continuation }),
    discoveryQueryIdentity(noida),
  );
  assert.equal(
    discoveryParams({ ...noida, offeringId: continuation }).get("offeringId"),
    continuation,
  );
});
test("actual TanStack queries deduplicate canonical concurrent requests and reuse a short fresh cache on navigation", async () => {
  const client = freshClient();
  let calls = 0;
  const get = async (path, { signal }) => {
    calls++;
    assert.equal(signal instanceof AbortSignal, true);
    assert.match(path, /^\/discovery\?/);
    await tick();
    return result("Bengaluru");
  };
  const first = discoveryQueryOptions(
    { city: "Bangalore", state: "KA" },
    "public",
    get,
  );
  const second = discoveryQueryOptions(
    { state: "Karnataka", city: "bengaluru", page: "1" },
    "public",
    get,
  );
  await Promise.all([client.fetchQuery(first), client.fetchQuery(second)]);
  assert.equal(calls, 1);
  await client.fetchQuery(second);
  assert.equal(calls, 1);
  assert.equal(first.staleTime, 30_000);
  client.setQueryData(first.queryKey, result("expired"), {
    updatedAt: Date.now() - discoveryFreshnessMs - 1,
  });
  await client.fetchQuery(first);
  assert.equal(calls, 2);
  client.clear();
});
test("changing area aborts the previous observer request and late old results cannot replace the new area's data", async () => {
  const client = freshClient(),
    pending = new Map();
  const get = (path, { signal }) =>
    new Promise((resolve, reject) => {
      const city = new URL(`http://test${path}`).searchParams.get("city");
      pending.set(city, { resolve, signal });
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    });
  const observer = new QueryObserver(
    client,
    discoveryQueryOptions(noida, "public", get),
  );
  const snapshots = [],
    unsubscribe = observer.subscribe((snapshot) => {
      if (snapshot.data) snapshots.push(snapshot.data);
    });
  await tick();
  observer.setOptions(discoveryQueryOptions(patna, "public", get));
  await tick();
  assert.equal(pending.get("noida").signal.aborted, true);
  pending.get("patna").resolve(result("Patna"));
  await tick();
  pending.get("noida").resolve(result("Noida late"));
  await tick();
  assert.equal(
    observer.getCurrentResult().data.providers[0].provider.companyName,
    "Patna",
  );
  assert.equal(
    snapshots.some(
      (value) => value.providers[0].provider.companyName === "Noida late",
    ),
    false,
  );
  unsubscribe();
  client.clear();
});
test("top-rated requests use the complete chosen area and stable public-only query options", async () => {
  let requested;
  const get = async (path) => {
    requested = path;
    return result("Noida");
  };
  const options = discoveryQueryOptions(noida, "public", get, {
    topRated: true,
  });
  const alias = discoveryQueryOptions(
    { ...noida, state: " UP ", sort: "price_desc", limit: "12", page: "3" },
    "public",
    get,
    { topRated: true },
  );
  assert.deepEqual(options.queryKey, alias.queryKey);
  await options.queryFn({ signal: new AbortController().signal });
  const query = new URL(`http://test${requested}`);
  assert.equal(query.pathname, "/discovery/top-rated");
  assert.equal(query.searchParams.get("city"), "noida");
  assert.equal(query.searchParams.get("state"), "uttar pradesh");
  assert.equal(query.searchParams.get("locality"), "sector 62");
  assert.equal(query.searchParams.get("pincode"), "201309");
  assert.equal(query.searchParams.get("limit"), "6");
});
test("hydration waits for the shared preference and unchanged navigation does no extra choose or URL replacement", () => {
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    {},
    null,
    false,
  );
  assert.equal(initial.state, initialDiscoverySearchState);
  const restored = reconcileDiscoverySearch(
    initial.state,
    { q: "Plumbing" },
    noida,
    true,
  );
  assert.equal(restored.chooseArea, null);
  assert.equal(restored.replaceSearch, null);
  assert.equal(restored.state.filters.city, "Noida");
  assert.equal(
    reconcileDiscoverySearch(restored.state, { q: "Plumbing" }, noida, true)
      .state,
    restored.state,
  );
});
test("a new header area overrides an old explicit URL and resets page/scope together before fetching", () => {
  const oldUrl = { ...noida, page: "4", scope: "other", q: "Repair" };
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    oldUrl,
    noida,
    true,
  ).state;
  const changed = reconcileDiscoverySearch(initial, oldUrl, patna, true);
  assert.equal(changed.chooseArea, null);
  assert.equal(changed.state.filters.city, "Patna");
  assert.equal(changed.state.filters.page, "1");
  assert.equal(changed.state.filters.scope, "local");
  assert.equal(changed.state.filters.q, "Repair");
  assert.equal(new URLSearchParams(changed.replaceSearch).has("city"), false);
  const pending = reconcileDiscoverySearch(changed.state, oldUrl, patna, true);
  assert.equal(pending.state, changed.state);
  assert.equal(pending.replaceSearch, null);
  const nextUrl = Object.fromEntries(
    new URLSearchParams(changed.replaceSearch),
  );
  const committed = reconcileDiscoverySearch(
    changed.state,
    nextUrl,
    patna,
    true,
  );
  assert.equal(committed.state.pendingUrl, null);
  assert.equal(
    discoveryQueryIdentity(committed.state.filters),
    discoveryQueryIdentity(changed.state.filters),
  );
});
test("a header change on the default services URL updates discovery without scheduling a URL rewrite that could override Home navigation", () => {
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    {},
    patna,
    true,
  ).state;
  const changed = reconcileDiscoverySearch(initial, {}, noida, true);
  assert.equal(changed.state.filters.city, "Noida");
  assert.equal(changed.state.filters.page, "1");
  assert.equal(changed.state.filters.scope, "local");
  assert.equal(changed.replaceSearch, null);
  assert.equal(changed.state.pendingUrl, null);
  assert.equal(
    reconcileDiscoverySearch(changed.state, {}, noida, true).state,
    changed.state,
  );
});
test("a header change with a non-area search resets pagination/scope while keeping preference fields out of the URL", () => {
  const url = { q: "Repair", page: "4", scope: "other" };
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    url,
    patna,
    true,
  ).state;
  const changed = reconcileDiscoverySearch(initial, url, noida, true);
  assert.equal(changed.replaceSearch, "q=Repair");
  assert.equal(changed.state.filters.city, "Noida");
  const committed = reconcileDiscoverySearch(
    changed.state,
    { q: "Repair" },
    noida,
    true,
  );
  assert.equal(committed.state.pendingUrl, null);
  assert.equal(committed.state.filters.city, "Noida");
});
test("automatic URL repair is synchronous, preserves the anchor, and cannot return a later Home navigation to services", () => {
  const calls = [];
  const browser = {
    location: {
      pathname: "/services",
      search: "?city=Patna&page=4&scope=other&q=Repair",
      hash: "#results",
    },
    history: {
      replaceState: (state, title, path) => {
        calls.push({ state, title, path });
        const url = new URL(path, "http://test");
        browser.location.pathname = url.pathname;
        browser.location.search = url.search;
      },
    },
  };
  const expected = browser.location.search;
  assert.equal(
    repairDiscoverySearch(browser, "/services", expected, "q=Repair"),
    true,
  );
  assert.deepEqual(calls, [
    { state: null, title: "", path: "/services?q=Repair#results" },
  ]);
  // A later link navigation has no outstanding router.replace promise to race with.
  browser.location.pathname = "/";
  browser.location.search = "";
  assert.equal(
    repairDiscoverySearch(browser, "/services", expected, "q=Repair"),
    false,
  );
  assert.equal(browser.location.pathname, "/");
  assert.equal(calls.length, 1);
});
test("an obsolete URL repair cannot overwrite another services search or a different route", () => {
  let calls = 0;
  const browser = {
    location: { pathname: "/services", search: "?q=Cleaning", hash: "" },
    history: {
      replaceState: () => {
        calls++;
      },
    },
  };
  assert.equal(
    repairDiscoverySearch(browser, "/services", "q=Repair&page=4", "q=Repair"),
    false,
  );
  browser.location.pathname = "/customer";
  assert.equal(
    repairDiscoverySearch(browser, "/services", "q=Cleaning", ""),
    false,
  );
  assert.equal(calls, 0);
});
test("browser back to another explicit URL area applies that choice once without stripping the URL", () => {
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    noida,
    noida,
    true,
  ).state;
  const changed = reconcileDiscoverySearch(initial, patna, noida, true);
  assert.deepEqual(changed.chooseArea, patna);
  assert.equal(changed.replaceSearch, null);
  const afterChoice = reconcileDiscoverySearch(
    changed.state,
    patna,
    patna,
    true,
  );
  assert.equal(afterChoice.state.awaitingPreferenceFrom, null);
  assert.equal(
    reconcileDiscoverySearch(afterChoice.state, patna, patna, true).state,
    afterChoice.state,
  );
  assert.equal(afterChoice.chooseArea, null);
  const back = reconcileDiscoverySearch(changed.state, noida, patna, true);
  assert.deepEqual(back.chooseArea, noida);
});
test("clearing a location acknowledges the empty target URL and does not restore the old explicit area", () => {
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    noida,
    noida,
    true,
  ).state;
  const cleared = reconcileDiscoverySearch(initial, noida, null, true);
  assert.equal(cleared.replaceSearch, "");
  assert.equal(cleared.state.pendingUrl, "");
  const pending = reconcileDiscoverySearch(cleared.state, noida, null, true);
  assert.equal(pending.state, cleared.state);
  const committed = reconcileDiscoverySearch(cleared.state, {}, null, true);
  assert.equal(committed.state.pendingUrl, null);
  assert.equal(committed.state.urlKey, "");
  assert.equal(preference.areaFromFilters(committed.state.filters), null);
});
test("an explicit URL selection waits for its one preference update instead of treating the old store snapshot as a header change", () => {
  const changed = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    patna,
    noida,
    true,
  );
  assert.deepEqual(changed.chooseArea, patna);
  const beforeEffect = reconcileDiscoverySearch(
    changed.state,
    patna,
    noida,
    true,
  );
  assert.equal(beforeEffect.state, changed.state);
  assert.equal(beforeEffect.chooseArea, null);
  assert.equal(beforeEffect.replaceSearch, null);
  assert.equal(beforeEffect.state.filters.city, "Patna");
});
test("the actual discovery component settles its initial ready render before making exactly one selected-area query", async () => {
  const require = createRequire(import.meta.url);
  const source = await readFile(
    new URL("../components/public/SmartDiscovery.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const client = freshClient(),
    pending = [],
    observations = [],
    calls = [];
  const empty = () => null;
  const modules = {
    react: React,
    "next/image": empty,
    "next/link": empty,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("q=Repair"),
      useRouter: () => ({ push() {}, replace() {} }),
    },
    "next-auth/react": {
      useSession: () => ({ data: null, status: "unauthenticated" }),
    },
    "lucide-react": Object.fromEntries(
      ["Search", "Building2", "MapPin", "Star", "ArrowRight", "X"].map(
        (key) => [key, empty],
      ),
    ),
    "@/hooks/useCustomDiscovery": {
      discoveryParams,
      useCustomerServices: () => ({}),
      useCustomerProviders: (filters, enabled) => {
        observations.push({ filters, enabled });
        if (enabled)
          pending.push(
            client.fetchQuery(
              discoveryQueryOptions(filters, "public", async (path) => {
                calls.push(path);
                return { providers: [], page: 1, hasMore: false };
              }),
            ),
          );
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          refetch() {},
        };
      },
    },
    "@/hooks/useCustomer": { useCustomerMe: () => ({}) },
    "@/components/customer/CustomerUi": { CustomerState: empty },
    "@/components/customer/BookingRequestForm": { BookingRequestForm: empty },
    "./BookingButton": { BookingButton: empty },
    "@/components/ui/button": { Button: empty },
    "@/components/ui/input": { Input: empty },
    "@/lib/booking-redirect": { bookingDestination: () => "" },
    "@/lib/customer-types": { money: String },
    "@/hooks/useDiscoveryLocation": {
      useDiscoveryLocation: () => ({
        ready: true,
        area: noida,
        choose() {},
        clear() {},
      }),
    },
    "@/lib/discovery-location.mjs": preference,
    "@/lib/discovery-query.mjs": queryPolicy,
    "./DiscoveryLocationControl": { DiscoveryLocationControl: empty },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) =>
      name in modules
        ? modules[name]
        : name.startsWith("@/")
          ? (() => {
              throw new Error(`Unmocked ${name}`);
            })()
          : require(name),
    loaded,
    loaded.exports,
  );
  renderToStaticMarkup(React.createElement(loaded.exports.SmartDiscovery));
  await Promise.all(pending);
  assert.equal(observations[0].enabled, false);
  assert.equal(observations.filter((value) => value.enabled).length, 1);
  assert.equal(calls.length, 1);
  assert.equal(
    new URL(`http://test${calls[0]}`).searchParams.get("city"),
    "noida",
  );
  client.clear();
});
test("search/reset/scope navigation stages its new query atomically and never calls GPS or geocoding", () => {
  const initial = reconcileDiscoverySearch(
    initialDiscoverySearchState,
    { ...noida, page: "4", scope: "other" },
    noida,
    true,
  ).state;
  const reset = stageDiscoverySearch(initial, {
    ...noida,
    page: "1",
    scope: "local",
  });
  const waiting = reconcileDiscoverySearch(reset, initial.filters, noida, true);
  assert.equal(waiting.state, reset);
  assert.equal(waiting.chooseArea, null);
  assert.equal(waiting.replaceSearch, null);
  const other = stageDiscoverySearch(reset, {
    ...noida,
    page: "1",
    scope: "other",
  });
  assert.equal(other.filters.scope, "other");
  assert.equal(other.filters.page, "1");
  assert.equal(other.areaKey, reset.areaKey);
  assert.equal(typeof other.captureCurrent, "undefined");
});
