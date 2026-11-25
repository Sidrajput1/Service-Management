import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  createPasswordFixture,
  fixtureCurrent,
  fixtureNew,
  installPasswordTestEnv,
  oid,
} from "./helpers/password-fixture.mjs";
const restore = installPasswordTestEnv();
test.after(restore);
const changeBody = (extra = {}) => ({
  currentPassword: fixtureCurrent,
  newPassword: fixtureNew,
  confirmPassword: fixtureNew,
  ...extra,
});
async function issue(f) {
  const route = f.load("app/api/auth/forgot-password/route.ts");
  const response = await route.POST(
    f.request({ email: f.state.users[0].email }),
  );
  assert.equal(response.status, 200);
  await f.settle();
  const raw = f.state.sent[0]?.payload.text.match(/Reset Password: (\S+)/)?.[1];
  assert.ok(raw, "A mocked reset email was not accepted");
  return new URL(raw).searchParams.get("token");
}

test("authenticated provider mutation verifies the current password, ignores injected identity and signs out every session", async () => {
  const f = createPasswordFixture(),
    original = f.state.users[0].password;
  f.state.users.push({
    ...f.state.users[0],
    _id: oid(2),
    email: "other@servizato.example",
  });
  const response = await f
    .load("app/api/service-provider/change-password/route.ts")
    .POST(f.request(changeBody({ userId: String(oid(2)), role: "admin" })));
  assert.equal(response.status, 200);
  assert.equal(f.state.users[0].credentialVersion, 1);
  assert.ok(await bcrypt.compare(fixtureNew, f.state.users[0].password));
  assert.ok(
    f.state.users[0].password !== fixtureNew &&
      f.state.users[0].password !== original,
  );
  assert.equal(bcrypt.getRounds(f.state.users[0].password), 12);
  assert.equal(f.state.users[1].password, original);
  assert.deepEqual(f.state.disconnected, [`user:${oid(1)}`]);
  assert.deepEqual(await response.json(), {
    success: true,
    signInRequired: true,
    message: "Password updated. Sign in again on all devices.",
  });
  await f.settle();
  assert.equal(
    f.state.sent[0].payload.subject,
    "Your Servizato password was changed",
  );
  assert.ok(!JSON.stringify(f.state.sent[0]).includes(fixtureNew));
});
for (const [label, body] of [
  [
    "incorrect current password",
    changeBody({ currentPassword: "incorrect controlled input" }),
  ],
  [
    "short password",
    changeBody({ newPassword: "short", confirmPassword: "short" }),
  ],
  [
    "confirmation mismatch",
    changeBody({ confirmPassword: "different controlled confirmation" }),
  ],
  [
    "same password",
    changeBody({
      newPassword: fixtureCurrent,
      confirmPassword: fixtureCurrent,
    }),
  ],
  [
    "bcrypt UTF-8 overflow",
    changeBody({
      newPassword: "😀".repeat(20),
      confirmPassword: "😀".repeat(20),
    }),
  ],
  ["non-string password", changeBody({ newPassword: { $ne: "" } })],
])
  test(`change rejects ${label} without updating a credential`, async () => {
    const f = createPasswordFixture(),
      original = f.state.users[0].password;
    const response = await f
      .load("app/api/service-provider/change-password/route.ts")
      .POST(f.request(body));
    assert.equal(response.status, 400);
    assert.equal(f.state.users[0].password, original);
    assert.equal(f.state.users[0].credentialVersion, 0);
  });
test("provider-specific change rejects anonymous and every other account role", async () => {
  for (const role of [null, "customer", "technician", "admin", "dispatcher"]) {
    const f = createPasswordFixture();
    if (!role) f.state.actor = null;
    else {
      f.state.users[0].role = role;
      f.state.actor.role = role;
    }
    assert.equal(
      (
        await f
          .load("app/api/service-provider/change-password/route.ts")
          .POST(f.request(changeBody()))
      ).status,
      role ? 403 : 401,
    );
  }
});
test("change rate limits and concurrent requests cannot overwrite a successful mutation", async () => {
  const f = createPasswordFixture(),
    route = f.load("app/api/service-provider/change-password/route.ts");
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await route.POST(
          f.request(
            changeBody({ currentPassword: "incorrect controlled input" }),
          ),
        )
      ).status,
      400,
    );
  assert.equal((await route.POST(f.request(changeBody()))).status, 429);
  const concurrent = createPasswordFixture(),
    handler = concurrent.load(
      "app/api/service-provider/change-password/route.ts",
    );
  const responses = await Promise.all([
    handler.POST(concurrent.request(changeBody())),
    handler.POST(concurrent.request(changeBody())),
  ]);
  assert.equal(
    responses.filter((response) => response.status === 200).length,
    1,
  );
  assert.equal(concurrent.state.users[0].credentialVersion, 1);
});
test("legacy profile route remains usable for customer accounts with reauthentication required", async () => {
  const f = createPasswordFixture();
  f.state.users[0].role = "customer";
  f.state.actor.role = "customer";
  assert.equal(
    (
      await f
        .load("app/api/profile/change-password/route.ts")
        .POST(f.request(changeBody()))
    ).status,
    200,
  );
  assert.equal(f.state.users[0].credentialVersion, 1);
});
test("mandatory Pro change retains 12-character policy, confirmation and atomic initial-credential retirement", async () => {
  const f = createPasswordFixture();
  Object.assign(f.state.users[0], {
    mustChangePassword: true,
    temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
  });
  const route = f.load("app/api/auth/change-password/route.ts");
  assert.equal(
    (
      await route.POST(
        f.request(
          changeBody({ newPassword: "sixchr", confirmPassword: "sixchr" }),
        ),
      )
    ).status,
    400,
  );
  const response = await route.POST(f.request(changeBody()));
  assert.equal(response.status, 200);
  assert.equal(f.state.users[0].mustChangePassword, false);
  assert.equal(f.state.users[0].temporaryPasswordExpiresAt, undefined);
  assert.equal(f.state.users[0].credentialVersion, 1);
});
test("an account with no password hash cannot silently set a password through change", async () => {
  const f = createPasswordFixture();
  delete f.state.users[0].password;
  assert.equal(
    (
      await f
        .load("app/api/service-provider/change-password/route.ts")
        .POST(f.request(changeBody()))
    ).status,
    400,
  );
  assert.equal(f.state.users[0].password, undefined);
});

test("forgot responses are identical and returned before known/unknown account work or email delivery", async () => {
  const f = createPasswordFixture(),
    route = f.load("app/api/auth/forgot-password/route.ts");
  const before = f.state.reads;
  const known = await route.POST(
    f.request({ email: " PROVIDER@SERVIZATO.EXAMPLE " }),
  );
  const unknown = await route.POST(
    f.request({ email: "unknown@servizato.example" }),
  );
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(f.state.reads, before);
  assert.equal(f.state.sent.length, 0);
  assert.equal(f.state.afters.length, 2);
  await f.settle();
  assert.equal(f.state.sent.length, 1);
});
test("forgot stores only a high-entropy token hash with expiry and a recipient binding", async () => {
  const f = createPasswordFixture(),
    raw = await issue(f),
    security = f.load("lib/password-security.ts");
  assert.ok(/^[a-f\d]{64}$/i.test(raw));
  assert.equal(f.state.tokens.length, 1);
  const row = f.state.tokens[0];
  assert.ok(
    row.tokenHash !== raw && row.tokenHash === security.hashResetToken(raw),
  );
  assert.ok(!JSON.stringify(f.state.tokens).includes(raw));
  assert.equal(row.expiresAt - row.createdAt, 30 * 60_000);
  assert.equal(row.emailHash, security.hashResetToken(f.state.users[0].email));
  assert.equal(row.usedAt, null);
  assert.equal(
    new URL(f.state.sent[0].payload.text.match(/Reset Password: (\S+)/)[1])
      .origin,
    "https://servizato.example",
  );
});
test("a replacement token invalidates the earlier reset link", async () => {
  const f = createPasswordFixture(),
    first = await issue(f);
  await f
    .load("lib/password-management.ts")
    .issuePasswordReset(f.state.users[0].email);
  const next = new URL(
    f.state.sent[1].payload.text.match(/Reset Password: (\S+)/)[1],
  ).searchParams.get("token");
  assert.ok(first !== next);
  assert.equal(f.state.tokens.length, 1);
  assert.equal(
    (
      await f
        .load("app/api/auth/reset-password/route.ts")
        .POST(
          f.request({
            token: first,
            newPassword: fixtureNew,
            confirmPassword: fixtureNew,
          }),
        )
    ).status,
    400,
  );
});
test("reset atomically changes the hash, consumes the token and revokes all previous sessions", async () => {
  const f = createPasswordFixture(),
    raw = await issue(f),
    route = f.load("app/api/auth/reset-password/route.ts");
  const body = {
    token: raw,
    newPassword: fixtureNew,
    confirmPassword: fixtureNew,
  };
  assert.equal((await route.POST(f.request(body))).status, 200);
  assert.ok(await bcrypt.compare(fixtureNew, f.state.users[0].password));
  assert.equal(bcrypt.getRounds(f.state.users[0].password), 12);
  assert.equal(f.state.users[0].credentialVersion, 1);
  assert.ok(f.state.tokens[0].usedAt instanceof Date);
  assert.equal((await route.POST(f.request(body))).status, 400);
});
test("two concurrent reset submissions can consume the token only once", async () => {
  const f = createPasswordFixture(),
    raw = await issue(f),
    route = f.load("app/api/auth/reset-password/route.ts");
  const body = {
    token: raw,
    newPassword: fixtureNew,
    confirmPassword: fixtureNew,
  };
  const responses = await Promise.all([
    route.POST(f.request(body)),
    route.POST(f.request(body)),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 400],
  );
  assert.equal(f.state.users[0].credentialVersion, 1);
});
test("mailbox recovery can replace an expired temporary credential while retaining its stronger password policy", async () => {
  const f = createPasswordFixture(),
    raw = await issue(f);
  Object.assign(f.state.users[0], {
    mustChangePassword: true,
    temporaryPasswordExpiresAt: new Date(0),
  });
  const route = f.load("app/api/auth/reset-password/route.ts");
  assert.equal(
    (
      await route.POST(
        f.request({
          token: raw,
          newPassword: "sixchr",
          confirmPassword: "sixchr",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await route.POST(
        f.request({
          token: raw,
          newPassword: fixtureNew,
          confirmPassword: fixtureNew,
        }),
      )
    ).status,
    200,
  );
  assert.equal(f.state.users[0].mustChangePassword, false);
});
test("a transaction failure rolls back token consumption along with the password write", async () => {
  const f = createPasswordFixture(),
    raw = await issue(f);
  f.state.failUserUpdate = true;
  const original = f.state.users[0].password;
  assert.equal(
    (
      await f
        .load("app/api/auth/reset-password/route.ts")
        .POST(
          f.request({
            token: raw,
            newPassword: fixtureNew,
            confirmPassword: fixtureNew,
          }),
        )
    ).status,
    400,
  );
  assert.equal(f.state.tokens[0].usedAt, null);
  assert.equal(f.state.users[0].password, original);
  assert.equal(f.state.users[0].credentialVersion, 0);
});
for (const [name, mutate] of [
  [
    "expired",
    (f) => {
      f.state.tokens[0].expiresAt = new Date(Date.now() - 1);
    },
  ],
  [
    "used",
    (f) => {
      f.state.tokens[0].usedAt = new Date();
    },
  ],
  [
    "credential version changed",
    (f) => {
      f.state.users[0].credentialVersion++;
    },
  ],
  [
    "inactive account",
    (f) => {
      f.state.users[0].isActive = false;
    },
  ],
  [
    "changed mailbox",
    (f) => {
      f.state.users[0].email = "changed@servizato.example";
    },
  ],
])
  test(`reset rejects ${name} without disclosing the account`, async () => {
    const f = createPasswordFixture(),
      raw = await issue(f);
    mutate(f);
    const response = await f
      .load("app/api/auth/reset-password/route.ts")
      .POST(
        f.request({
          token: raw,
          newPassword: fixtureNew,
          confirmPassword: fixtureNew,
        }),
      );
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /invalid or expired/);
    assert.ok(!JSON.stringify(body).includes(f.state.users[0].email));
  });
test("reset rejects unknown tokens, invalid input and mismatched confirmation", async () => {
  const f = createPasswordFixture(),
    route = f.load("app/api/auth/reset-password/route.ts");
  for (const body of [
    {
      token: "a".repeat(64),
      newPassword: fixtureNew,
      confirmPassword: fixtureNew,
    },
    { token: "invalid", newPassword: fixtureNew, confirmPassword: fixtureNew },
    {
      token: "a".repeat(64),
      newPassword: fixtureNew,
      confirmPassword: "mismatch",
    },
  ])
    assert.equal((await route.POST(f.request(body))).status, 400);
});
test("forgot and reset rate limits apply to unknown addresses/tokens without account lookup", async () => {
  const f = createPasswordFixture(),
    forgot = f.load("app/api/auth/forgot-password/route.ts");
  assert.equal(
    (await forgot.POST(f.request({ email: "unknown@servizato.example" })))
      .status,
    200,
  );
  assert.equal(
    (await forgot.POST(f.request({ email: "unknown@servizato.example" })))
      .status,
    429,
  );
  assert.equal(f.state.reads, 0);
  const reset = f.load("app/api/auth/reset-password/route.ts");
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await reset.POST(
          f.request({
            token: "b".repeat(64),
            newPassword: fixtureNew,
            confirmPassword: fixtureNew,
          }),
        )
      ).status,
      400,
    );
  assert.equal(
    (
      await reset.POST(
        f.request({
          token: "b".repeat(64),
          newPassword: fixtureNew,
          confirmPassword: fixtureNew,
        }),
      )
    ).status,
    429,
  );
  assert.ok(f.state.limits.every((row) => /^[a-f\d]{64}$/.test(row._id)));
});
test("ineligible phone identities and accounts without a password receive no email or tokens", async () => {
  for (const kind of ["phone", "no-hash"]) {
    const f = createPasswordFixture();
    if (kind === "phone")
      f.state.users[0].email = "phone-1234567890@service.local";
    else delete f.state.users[0].password;
    await f
      .load("lib/password-management.ts")
      .issuePasswordReset(f.state.users[0].email);
    assert.equal(f.state.tokens.length, 0);
    assert.equal(f.state.sent.length, 0);
  }
});
test("email failures leave the reset unusable and never leak provider diagnostics", async () => {
  const previous = console.warn,
    logs = [];
  console.warn = (value) => logs.push(String(value));
  try {
    for (const outcome of ["error", "throw", "missing-id"]) {
      const f = createPasswordFixture();
      f.state.emailResult = outcome;
      await f
        .load("lib/password-management.ts")
        .issuePasswordReset(f.state.users[0].email);
      assert.ok(f.state.tokens[0].usedAt instanceof Date);
    }
  } finally {
    console.warn = previous;
  }
  assert.ok(
    logs.length === 3 &&
      logs.every(
        (value) =>
          !value.includes("Controlled provider") && !value.includes("@"),
      ),
  );
});
test("missing Resend setup fails uniformly and does not claim delivery", async () => {
  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const f = createPasswordFixture(),
      route = f.load("app/api/auth/forgot-password/route.ts");
    for (const email of [
      "provider@servizato.example",
      "unknown@servizato.example",
    ])
      assert.equal((await route.POST(f.request({ email }))).status, 503);
    assert.equal(f.state.sent.length, 0);
    assert.equal(f.state.afters.length, 0);
  } finally {
    process.env.RESEND_API_KEY = previous;
  }
});
test("SDK configuration validates sender/reply-to, disables debug logging and pins the provider origin", async () => {
  const f = createPasswordFixture(),
    mail = f.load("lib/email/resend.ts"),
    before = process.env.EMAIL_FROM;
  for (const sender of [
    "not-an-email",
    "Servizato <no-reply@mail.servizato.example",
    "no-reply@mail.servizato.example>",
    "a@b.example\r\nBcc:attacker@b.example",
  ]) {
    process.env.EMAIL_FROM = sender;
    assert.equal(mail.getEmailConfiguration(), null);
  }
  process.env.EMAIL_FROM = before;
  process.env.RESEND_DEBUG = "true";
  assert.equal(mail.getEmailConfiguration(), null);
  process.env.RESEND_DEBUG = "false";
  assert.equal(
    await mail.sendTransactionalEmail({
      to: "test@servizato.example",
      subject: "Controlled message",
      html: "<p>Controlled message</p>",
      text: "Controlled message",
      idempotencyKey: "controlled-test",
    }),
    true,
  );
  assert.equal(f.state.sent[0].timeoutConfigured, true);
});
test("trusted origin, CSRF, bounded JSON and forwarded-IP handling fail safely", async () => {
  const f = createPasswordFixture(),
    security = f.load("lib/password-security.ts");
  await assert.rejects(
    security.readPasswordBody(
      f.request({}, { Origin: "https://attacker.example" }),
    ),
    (error) => error.status === 403,
  );
  await assert.rejects(
    security.readPasswordBody(f.request({}, { "Content-Type": "text/plain" })),
    (error) => error.status === 415,
  );
  await assert.rejects(
    security.readPasswordBody(f.request({ message: "x".repeat(9000) })),
    (error) => error.status === 413,
  );
  const before = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = "https://servizato.example/path";
  assert.equal(security.passwordAppOrigin(), null);
  process.env.NEXTAUTH_URL = before;
  assert.equal(
    security.passwordClientKey(f.request({}, { "X-Real-IP": "127.0.0.1" })),
    "shared-untrusted-client",
  );
  process.env.PASSWORD_TRUST_PROXY = "true";
  assert.equal(
    security.passwordClientKey(f.request({}, { "X-Real-IP": "127.0.0.1" })),
    "127.0.0.1",
  );
  process.env.PASSWORD_TRUST_PROXY = "false";
});
test("missing indexes or transaction support fail closed without automatic index writes", async () => {
  for (const key of ["indexesReady", "transactionsReady"]) {
    const f = createPasswordFixture();
    f.state[key] = false;
    assert.equal(
      (
        await f
          .load("app/api/service-provider/change-password/route.ts")
          .POST(f.request(changeBody()))
      ).status,
      503,
    );
    assert.equal(f.state.users[0].credentialVersion, 0);
  }
});
test("reset model defines explicit unique and TTL indexes, hides hashes and disables automatic index creation", async () => {
  const f = createPasswordFixture(),
    model = f.load("models/PasswordResetToken.ts", { mongoose }).default;
  assert.equal(model.schema.get("autoIndex"), false);
  assert.equal(model.schema.get("autoCreate"), false);
  const indexes = model.schema.indexes();
  assert.ok(
    indexes.some(([key, options]) => key.userId === 1 && options.unique),
  );
  assert.ok(
    indexes.some(([key, options]) => key.tokenHash === 1 && options.unique),
  );
  assert.ok(
    indexes.some(
      ([key, options]) =>
        key.expiresAt === 1 && options.expireAfterSeconds === 0,
    ),
  );
  const output = new model({
    userId: oid(1),
    tokenHash: "controlled hash",
    emailHash: "controlled recipient binding",
    credentialVersion: 0,
    expiresAt: new Date(),
    createdAt: new Date(),
  }).toJSON();
  assert.equal(output.tokenHash, undefined);
  assert.equal(output.emailHash, undefined);
});
