import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}

const {
  safeBookingDestination,
  bookingDestination,
  authHref,
  profileCompletionHref,
} = await importTypeScript("../lib/booking-redirect.ts");
const { getRoleHome } = await importTypeScript("../lib/role-route.ts");
const serviceId = "69d012345678901234567890";
const offeringId = "69d098765432109876543210";
const destination = `/customer/services?serviceId=${serviceId}&offeringId=${offeringId}`;

test("preserves the catalog service and provider offering as distinct IDs", () => {
  assert.equal(bookingDestination(serviceId, offeringId), destination);
  assert.equal(safeBookingDestination(destination), destination);
});

test("both authentication actions preserve the selected booking", () => {
  for (const page of ["/signin", "/signup"]) {
    const url = new URL(
      authHref(page, destination),
      "https://servizato.invalid",
    );
    assert.equal(url.pathname, page);
    assert.equal(url.searchParams.get("callbackUrl"), destination);
    if (page === "/signup")
      assert.equal(url.searchParams.get("role"), "customer");
  }
  assert.equal(
    new URL(
      profileCompletionHref(destination),
      "https://servizato.invalid",
    ).searchParams.get("callbackUrl"),
    destination,
  );
});

test("rejects external URLs, protocol-relative URLs, and alternate schemes", () => {
  for (const value of [
    "https://example.com",
    "//example.com/customer/services",
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://servizato.invalid.evil/customer/services",
  ]) {
    assert.equal(safeBookingDestination(value), null, value);
  }
});

test("rejects backslashes, whitespace, control characters, and encoded path tricks", () => {
  for (const value of [
    "/\\evil.com/customer/services",
    " /customer/services",
    "/customer/services\n",
    "/%2fexample.com/customer/services",
    "/customer%2fservices",
    "/customer/services/../bookings",
  ]) {
    assert.equal(safeBookingDestination(value), null, value);
  }
});

test("rejects other application routes and invalid or incomplete service IDs", () => {
  for (const value of [
    "/admin/dashboard",
    "/service-provider",
    "/profile/complete",
    "/customer/services?serviceId=invalid",
    `/customer/services?offeringId=${offeringId}`,
    `/customer/services?serviceId=${serviceId}&offeringId=invalid`,
  ]) {
    assert.equal(safeBookingDestination(value), null, value);
  }
});

test("drops arbitrary redirect parameters and fragments", () => {
  assert.equal(
    safeBookingDestination(
      `${destination}&redirect=https://example.com#external`,
    ),
    destination,
  );
});

test("falls back safely when no valid booking was supplied", () => {
  for (const value of [undefined, null, "", "https://example.com"]) {
    assert.equal(profileCompletionHref(value), "/profile/complete");
    assert.equal(authHref("/signin", value), "/signin");
  }
});

test("non-customer dashboard links stay within the user's existing role", () => {
  assert.equal(getRoleHome("customer"), "/customer");
  assert.equal(getRoleHome("service_provider"), "/service-provider");
  assert.equal(getRoleHome("technician"), "/technician/dashboard");
  assert.equal(getRoleHome("admin"), "/admin/dashboard");
  assert.equal(getRoleHome("dispatcher"), "/dispatcher");
  assert.equal(getRoleHome(undefined), "/profile/complete");
});
