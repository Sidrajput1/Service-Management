import test from "node:test";
import assert from "node:assert/strict";
import { renderPasswordUi } from "./helpers/password-ui-fixture.mjs";
import { fixtureCurrent, fixtureNew } from "./helpers/password-fixture.mjs";
import { loadTs } from "./helpers/technician-workflow-fixture.mjs";
const policy = loadTs("lib/password-policy.ts"),
  submit = { preventDefault() {} };
test("sign-in includes a public Forgot Password link without removing Google or phone sign-in", () => {
  const f = renderPasswordUi({ kind: "signin" });
  assert.match(f.html, /href="\/forgot-password"/);
  assert.match(f.html, /Continue with Google/);
  assert.match(f.html, /Use a phone verification code/);
});
test("forgot form labels and validates email without sending invalid input", async () => {
  const f = renderPasswordUi({ states: { 0: "not-an-email" } });
  assert.match(f.html, /Forgot Password\?/);
  assert.match(f.html, /for="recovery-email"/);
  assert.match(f.html, /href="\/signin"/);
  await f.forms[0].onSubmit(submit);
  assert.equal(f.calls.length, 0);
  assert.ok(f.writes.some((row) => row.value.email));
});
test("forgot submit normalizes the address, handles loading and shows only the generic response", async () => {
  const f = renderPasswordUi({
    states: { 0: " PROVIDER@SERVIZATO.EXAMPLE " },
    post: async () => ({ data: { message: policy.genericResetResponse } }),
  });
  await f.forms[0].onSubmit(submit);
  assert.deepEqual(f.calls, [
    {
      url: "/auth/forgot-password",
      payload: { email: "provider@servizato.example" },
    },
  ]);
  assert.ok(f.writes.some((row) => row.position === 5 && row.value === true));
  assert.ok(f.writes.some((row) => row.position === 5 && row.value === false));
  assert.ok(f.writes.some((row) => row.position === 6 && row.value === true));
  const success = renderPasswordUi({ states: { 6: true } });
  assert.match(success.html, /role="status"/);
  assert.ok(success.html.includes(policy.genericResetResponse));
  assert.doesNotMatch(
    success.html,
    /email (?:was |has been )?delivered|email sent successfully/i,
  );
});
test("forgot does not claim success for a failed or unconfirmed response", async () => {
  for (const post of [
    async () => {
      throw new Error("Controlled network failure");
    },
    async () => ({ data: {} }),
  ]) {
    const f = renderPasswordUi({
      states: { 0: "provider@servizato.example" },
      post,
    });
    await f.forms[0].onSubmit(submit);
    assert.ok(
      !f.writes.some((row) => row.position === 6 && row.value === true),
    );
  }
  const pending = renderPasswordUi({ states: { 5: true } });
  assert.match(pending.html, /aria-busy="true"/);
  assert.match(pending.html, /<fieldset[^>]*disabled=""/);
});
test("reset link is captured only in memory and removed from the address bar", () => {
  const f = renderPasswordUi({ kind: "reset" }),
    history = [],
    previous = globalThis.window;
  globalThis.window = {
    location: {
      href: "https://servizato.example/reset-password?token=" + "a".repeat(64),
    },
    history: { state: {}, replaceState: (...args) => history.push(args) },
  };
  try {
    f.effects[0]();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
  assert.equal(history[0][2], "/reset-password");
  assert.ok(
    f.writes.some((row) => row.position === 1 && row.value.length === 64),
  );
  assert.ok(!f.html.includes("a".repeat(64)));
  assert.doesNotMatch(f.html, /password has been updated/);
});
test("missing reset token does not show a password submission form or success", () => {
  const f = renderPasswordUi({ kind: "reset", states: { 1: "" } });
  assert.equal(f.forms.length, 0);
  assert.match(f.html, /missing or invalid/);
  assert.match(f.html, /href="\/forgot-password"/);
  assert.doesNotMatch(f.html, /password has been updated/);
});
test("reset validates confirmation, submits to the backend and requires a confirmed mutation", async () => {
  const base = {
    1: "a".repeat(64),
    2: { newPassword: fixtureNew, confirmPassword: fixtureNew },
  };
  const mismatch = renderPasswordUi({
    kind: "reset",
    states: {
      ...base,
      2: {
        newPassword: fixtureNew,
        confirmPassword: "different controlled confirmation",
      },
    },
  });
  await mismatch.forms[0].onSubmit(submit);
  assert.equal(mismatch.calls.length, 0);
  const valid = renderPasswordUi({ kind: "reset", states: base });
  await valid.forms[0].onSubmit(submit);
  assert.equal(valid.calls[0].url, "/auth/reset-password");
  assert.ok(
    valid.writes.some((row) => row.position === 6 && row.value === true),
  );
  const unconfirmed = renderPasswordUi({
    kind: "reset",
    states: base,
    post: async () => ({ data: {} }),
  });
  await unconfirmed.forms[0].onSubmit(submit);
  assert.ok(
    !unconfirmed.writes.some((row) => row.position === 6 && row.value === true),
  );
});
test("provider dialog contains labelled password controls and validates before mutation", async () => {
  const f = renderPasswordUi({
    kind: "provider",
    states: {
      0: true,
      3: {
        currentPassword: fixtureCurrent,
        newPassword: fixtureNew,
        confirmPassword: "mismatch",
      },
    },
  });
  for (const id of [
    "provider-current-password",
    "provider-new-password",
    "provider-confirm-password",
  ])
    assert.ok(f.html.includes(`for="${id}"`));
  assert.equal((f.html.match(/aria-pressed="false"/g) || []).length, 3);
  await f.forms[0].onSubmit(submit);
  assert.equal(f.calls.length, 0);
});
test("provider mutation blocks duplicate UI submits, clears values and shows reauthentication guidance", async () => {
  let resolve;
  const waiting = new Promise((done) => {
    resolve = done;
  });
  const f = renderPasswordUi({
    kind: "provider",
    states: {
      0: true,
      3: {
        currentPassword: fixtureCurrent,
        newPassword: fixtureNew,
        confirmPassword: fixtureNew,
      },
    },
    post: () => waiting,
  });
  const first = f.forms[0].onSubmit(submit);
  await f.forms[0].onSubmit(submit);
  assert.equal(f.calls.length, 1);
  resolve({ data: { success: true, signInRequired: true } });
  await first;
  assert.equal(f.calls[0].url, "/service-provider/change-password");
  assert.ok(f.writes.some((row) => row.position === 1 && row.value === true));
  const success = renderPasswordUi({
    kind: "provider",
    states: { 0: true, 1: true },
  });
  assert.match(success.html, /Your previous sessions have been revoked/);
  assert.match(success.html, /Sign in again/);
  assert.doesNotMatch(success.html, /type="password"/);
});
test("inline errors have accessible field associations and loading disables the provider inputs", () => {
  const f = renderPasswordUi({
    kind: "provider",
    states: {
      0: true,
      3: { currentPassword: "", newPassword: "", confirmPassword: "" },
      4: { newPassword: "Controlled validation error" },
      5: "Check the highlighted fields.",
      6: true,
    },
  });
  assert.match(f.html, /role="alert"/);
  assert.match(f.html, /id="provider-new-password-error"/);
  assert.match(f.html, /aria-describedby="provider-new-password-error"/);
  assert.match(f.html, /<fieldset[^>]*disabled=""/);
});
