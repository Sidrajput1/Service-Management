import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";
import {
  createPasswordFixture,
  fixtureCurrent,
  fixtureNew,
  installPasswordTestEnv,
  oid,
} from "./helpers/password-fixture.mjs";
import { credentialSessionIsCurrent } from "../lib/credential-session-policy.mjs";
import { installSocketSecurity } from "../lib/socket-server.mjs";
const restore = installPasswordTestEnv();
test.after(restore);
const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const { AuthHandler } = require(
  path.join(path.dirname(require.resolve("next-auth")), "core/index.js"),
);
const pushBoundary = {
  newPushSessionId: () => randomBytes(32).toString("hex"),
  pushSessionHash: (value) =>
    typeof value === "string" && /^[a-f\d]{64}$/i.test(value),
  deactivatePushSession: async () => {},
};
function options(f) {
  return f.load("lib/auth-options.ts", { "@/lib/push-session": pushBoundary })
    .authOptions;
}
async function coreSession(f, token) {
  const encrypted = await encode({
    token,
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 600,
  });
  const codes = [];
  const response = await AuthHandler({
    req: {
      action: "session",
      method: "GET",
      headers: {},
      cookies: { "next-auth.session-token": encrypted },
    },
    options: {
      ...options(f),
      cookies: {
        sessionToken: {
          name: "next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: false,
          },
        },
      },
      logger: {
        error: (code) => codes.push(code),
        warn: () => {},
        debug: () => {},
      },
    },
  });
  return { response, codes };
}
for (const role of [
  "service_provider",
  "customer",
  "technician",
  "admin",
  "dispatcher",
])
  test(`existing credentials authentication and fresh JWT sessions still work for ${role}`, async () => {
    const f = createPasswordFixture();
    f.state.users[0].role = role;
    const auth = options(f),
      authorize = auth.providers.find(
        (provider) => provider.type === "credentials",
      ).options.authorize;
    const user = await authorize({
      email: " PROVIDER@SERVIZATO.EXAMPLE ",
      password: fixtureCurrent,
    });
    assert.equal(user.role, role);
    await assert.rejects(
      authorize({
        email: "provider@servizato.example",
        password: "incorrect controlled input",
      }),
      /Invalid credentials/,
    );
    const result = await coreSession(f, {
      id: String(user.id),
      role,
      credentialVersion: 0,
    });
    assert.equal(result.response.body.user.id, String(oid(1)));
    assert.equal(result.response.body.user.role, role);
    assert.equal(result.response.body.user.password, undefined);
    assert.equal(result.response.body.user.pushSessionId, undefined);
  });
test("NextAuth's real session handler rejects a revoked JWT and clears its cookie for legacy getServerSession callers", async () => {
  const f = createPasswordFixture(),
    claims = {
      id: String(oid(1)),
      role: "service_provider",
      credentialVersion: 0,
    };
  assert.equal(
    (await coreSession(f, claims)).response.body.user.id,
    String(oid(1)),
  );
  const response = await f
    .load("app/api/service-provider/change-password/route.ts")
    .POST(
      f.request({
        currentPassword: fixtureCurrent,
        newPassword: fixtureNew,
        confirmPassword: fixtureNew,
      }),
    );
  assert.equal(response.status, 200);
  const stale = await coreSession(f, claims);
  assert.deepEqual(stale.response.body, {});
  assert.ok(
    stale.response.cookies.some(
      (cookie) =>
        cookie.name === "next-auth.session-token" && cookie.value === "",
    ),
  );
  assert.ok(stale.codes.includes("JWT_SESSION_ERROR"));
  assert.equal(
    (await coreSession(f, { ...claims, credentialVersion: 1 })).response.body
      .user.id,
    String(oid(1)),
  );
});
test("session validation fails closed for inactive, deleted, role-changed and database-unavailable accounts", async () => {
  for (const change of [
    (f) => {
      f.state.users[0].isActive = false;
    },
    (f) => {
      f.state.users = [];
    },
    (f) => {
      f.state.users[0].role = "admin";
    },
    (f) => {
      f.state.databaseFailure = true;
    },
  ]) {
    const f = createPasswordFixture();
    change(f);
    assert.deepEqual(
      (
        await coreSession(f, {
          id: String(oid(1)),
          role: "service_provider",
          credentialVersion: 0,
        })
      ).response.body,
      {},
    );
  }
});
test("a legacy version-zero JWT is supported but is never upgraded after credential rotation", async () => {
  const f = createPasswordFixture();
  delete f.state.users[0].credentialVersion;
  assert.ok(
    (await coreSession(f, { id: String(oid(1)), role: "service_provider" }))
      .response.body.user,
  );
  f.state.users[0].credentialVersion = 1;
  assert.deepEqual(
    (await coreSession(f, { id: String(oid(1)), role: "service_provider" }))
      .response.body,
    {},
  );
});
test("protected-page proxy checks the persisted version and mandatory initial credential state", async () => {
  const f = createPasswordFixture();
  let claims = {
    id: String(oid(1)),
    role: "service_provider",
    credentialVersion: 0,
  };
  const proxy = f.load("proxy.ts", {
    "next-auth/jwt": { getToken: async () => claims },
  }).proxy;
  const request = new NextRequest(
    "https://servizato.example/service-provider/profile",
  );
  assert.equal((await proxy(request)).headers.get("x-middleware-next"), "1");
  f.state.users[0].credentialVersion = 1;
  assert.equal(
    new URL((await proxy(request)).headers.get("location")).pathname,
    "/signin",
  );
  claims = { ...claims, credentialVersion: 1 };
  f.state.users[0].mustChangePassword = true;
  assert.equal(
    new URL((await proxy(request)).headers.get("location")).pathname,
    "/change-password",
  );
});
test("Google authentication still creates the existing random-hash account without invented verification state", async () => {
  const f = createPasswordFixture(),
    auth = options(f),
    user = {
      email: "google@servizato.example",
      name: "Controlled Google account",
    };
  assert.equal(
    await auth.callbacks.signIn({
      user,
      account: { provider: "google" },
      profile: { email: user.email, name: user.name },
    }),
    true,
  );
  const row = f.state.users.find((candidate) => candidate.email === user.email);
  assert.equal(row.role, "customer");
  assert.ok(row.password.startsWith("$2"));
  assert.equal(row.emailVerified, undefined);
  const token = await auth.callbacks.jwt({ token: {}, user });
  assert.equal(token.id, String(row._id));
  await f.load("lib/password-management.ts").issuePasswordReset(row.email);
  assert.equal(
    f.state.sent.length,
    1,
    "An existing random-hash Google account can verify mailbox control through the reset link",
  );
});
test("phone OTP still consumes a valid OTP and creates the existing phone identity", async () => {
  const f = createPasswordFixture(),
    auth = options(f);
  const otp = {
    phone: "+12025550123",
    code: "123456",
    used: false,
    expiresAt: new Date(Date.now() + 60_000),
  };
  otp.save = async function () {
    otp.used = this.used;
  };
  f.state.otp.push(otp);
  const authorize = auth.providers.find(
    (provider) => provider.type === "credentials",
  ).options.authorize;
  const user = await authorize({ phone: otp.phone, otp: otp.code });
  assert.equal(otp.used, true);
  assert.equal(user.role, "customer");
  const row = f.state.users.find(
    (candidate) => String(candidate._id) === user.id,
  );
  assert.match(row.email, /@service\.local$/);
  assert.ok(row.password.startsWith("$2"));
  assert.equal((await auth.callbacks.jwt({ token: {}, user })).id, user.id);
  await assert.rejects(
    authorize({ phone: otp.phone, otp: otp.code }),
    /OTP not found/,
  );
});
test("version policy accepts legacy zero and rejects stale, invalid and expired initial sessions", () => {
  assert.equal(credentialSessionIsCurrent({}, {}), true);
  assert.equal(credentialSessionIsCurrent({ credentialVersion: 1 }, {}), false);
  assert.equal(
    credentialSessionIsCurrent(
      { credentialVersion: 1 },
      { credentialVersion: -1 },
    ),
    false,
  );
  assert.equal(credentialSessionIsCurrent({ isActive: false }, {}), false);
  assert.equal(
    credentialSessionIsCurrent({ role: "customer" }, { role: "admin" }),
    false,
  );
  assert.equal(
    credentialSessionIsCurrent(
      { mustChangePassword: true, temporaryPasswordExpiresAt: new Date(0) },
      {},
    ),
    false,
  );
});
test("open sockets stop receiving conversation payloads and idle sockets disconnect after credential rotation", async () => {
  const user = {
    _id: oid(1),
    role: "customer",
    credentialVersion: 0,
    isActive: true,
  };
  const conversation = {
    _id: oid(2),
    type: "support",
    participants: [{ userId: user._id }],
  };
  const socket = {
    data: {},
    request: { headers: {} },
    events: {},
    seen: [],
    rooms: [],
    on(event, callback) {
      this.events[event] = callback;
    },
    join(room) {
      this.rooms.push(room);
    },
    leave() {},
    emit(event, payload) {
      this.seen.push({ event, payload });
    },
    disconnect() {
      this.disconnected = true;
      this.events.disconnect?.();
    },
  };
  const io = {
    use(callback) {
      this.middleware = callback;
    },
    on(event, callback) {
      if (event === "connection") this.connection = callback;
    },
    in() {
      return { fetchSockets: async () => [socket] };
    },
  };
  const database = async () => ({
    collection: (name) => ({
      findOne: async () =>
        name === "users"
          ? { ...user }
          : name === "conversations"
            ? conversation
            : null,
      find: () => ({ toArray: async () => [{ ...user }] }),
    }),
  });
  installSocketSecurity(io, {
    database,
    getToken: async () => ({
      id: String(user._id),
      exp: Math.floor(Date.now() / 1000) + 600,
      credentialVersion: 0,
    }),
  });
  await new Promise((resolve, reject) =>
    io.middleware(socket, (error) => (error ? reject(error) : resolve())),
  );
  let periodic;
  const previous = globalThis.setInterval;
  globalThis.setInterval = (callback) => {
    periodic = callback;
    return { unref() {} };
  };
  try {
    io.connection(socket);
  } finally {
    globalThis.setInterval = previous;
  }
  await io.emitAuthorizedConversation(String(conversation._id), "message:new", {
    text: "Controlled fixture",
  });
  assert.equal(socket.seen.length, 1);
  user.credentialVersion = 1;
  await io.emitAuthorizedConversation(String(conversation._id), "message:new", {
    text: "Revoked fixture",
  });
  assert.equal(socket.seen.length, 1);
  await periodic();
  assert.equal(socket.disconnected, true);
});
