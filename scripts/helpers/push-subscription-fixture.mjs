/** Controlled backend boundaries only; never imported by the application. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createECDH } from "node:crypto";
import ts from "typescript";
import mongoose from "mongoose";
const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, "../..");
const oid = (n) =>
  new mongoose.Types.ObjectId(n.toString(16).padStart(24, "0"));
function clone(v) {
  if (v instanceof Date) return new Date(v);
  if (v instanceof mongoose.Types.ObjectId)
    return new mongoose.Types.ObjectId(String(v));
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
}
const get = (row, key) => key.split(".").reduce((v, k) => v?.[k], row),
  eq = (a, b) => (a == null || b == null ? a == b : String(a) === String(b));
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some((f) => matches(row, f));
    const current = get(row, key);
    if (
      value &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !(value instanceof mongoose.Types.ObjectId)
    ) {
      return Object.entries(value).every(([op, next]) =>
        op === "$ne"
          ? !eq(current, next)
          : op === "$gt"
            ? current > next
            : op === "$lte"
              ? current <= next
              : op === "$type"
                ? next === "date"
                  ? current instanceof Date
                  : typeof current === next
                : op === "$in"
                  ? next.some((x) => eq(current, x))
                  : op === "$exists"
                    ? (current !== undefined) === next
                    : eq(current, value),
      );
    }
    return eq(current, value);
  });
}
export function controlledKeys(seed = 7) {
  const curve = createECDH("prime256v1");
  curve.setPrivateKey(Buffer.alloc(32, seed));
  return {
    p256dh: curve.getPublicKey().toString("base64url"),
    auth: Buffer.alloc(16, seed).toString("base64url"),
  };
}
export function installControlledVapid() {
  const previous = Object.fromEntries(
      ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"].map((k) => [
        k,
        process.env[k],
      ]),
    ),
    curve = createECDH("prime256v1");
  curve.setPrivateKey(Buffer.alloc(32, 33));
  process.env.VAPID_PUBLIC_KEY = curve.getPublicKey().toString("base64url");
  process.env.VAPID_PRIVATE_KEY = curve.getPrivateKey().toString("base64url");
  process.env.VAPID_SUBJECT = "mailto:controlled@example.invalid";
  return () => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}
export function createPushFixture() {
  globalThis.servizatoPushRates?.clear();
  const state = {
    subscriptions: [],
    notifications: [],
    users: [
      { _id: oid(1), role: "customer", isActive: true, credentialVersion: 0 },
      { _id: oid(2), role: "technician", isActive: true, credentialVersion: 0 },
    ],
    actor: null,
    token: null,
    ready: true,
    failCleanup: false,
  };
  let nextId = 100,
    tail = Promise.resolve();
  class ApiAuthError extends Error {
    constructor(message, status = 401) {
      super(message);
      this.status = status;
    }
  }
  const hidden = [
    "endpoint",
    "keys",
    "sessionHash",
    "bindingToken",
    "sessionExpiresAt",
    "expirationTime",
    "activatedAt",
  ];
  class Query {
    constructor(operation, privateRow = false) {
      this.operation = operation;
      this.privateRow = privateRow;
      this.fields = "";
      this.order = null;
      this.maximum = null;
    }
    select(fields) {
      this.fields = fields;
      return this;
    }
    session() {
      return this;
    }
    lean() {
      return this;
    }
    sort(value) {
      this.order = value;
      return this;
    }
    limit(value) {
      this.maximum = value;
      return this;
    }
    async exec() {
      let value = await this.operation();
      if (Array.isArray(value)) {
        if (this.order)
          value.sort((a, b) => {
            for (const [k, direction] of Object.entries(this.order)) {
              if (eq(a[k], b[k])) continue;
              return a[k] > b[k] ? direction : -direction;
            }
            return 0;
          });
        if (this.maximum !== null) value = value.slice(0, this.maximum);
      }
      const visible = (row) => {
        if (!row || typeof row !== "object") return row;
        const result = clone(row);
        if (this.privateRow)
          for (const key of hidden)
            if (!this.fields.includes("+" + key)) delete result[key];
        return result;
      };
      return Array.isArray(value) ? value.map(visible) : visible(value);
    }
    then(yes, no) {
      return this.exec().then(yes, no);
    }
    catch(no) {
      return this.exec().catch(no);
    }
  }
  const apply = (row, update) => {
    for (const [k, v] of Object.entries(update.$set || {})) row[k] = clone(v);
    for (const [k, v] of Object.entries(update.$inc || {}))
      row[k] = (row[k] || 0) + v;
    row.updatedAt = new Date();
    return row;
  };
  const push = {
    find: (filter) =>
      new Query(
        () => state.subscriptions.filter((r) => matches(r, filter)),
        true,
      ),
    findOne: (filter) =>
      new Query(
        () => state.subscriptions.find((r) => matches(r, filter)) || null,
        true,
      ),
    countDocuments: (filter) =>
      new Query(
        () => state.subscriptions.filter((r) => matches(r, filter)).length,
      ),
    findOneAndUpdate: (filter, update) =>
      new Query(() => {
        const row = state.subscriptions.find((r) => matches(r, filter));
        return row ? apply(row, update) : null;
      }, true),
    updateMany: (filter, update) =>
      new Query(() => {
        if (state.failCleanup) throw Error("Controlled cleanup outage");
        const rows = state.subscriptions.filter((r) => matches(r, filter));
        for (const row of rows) apply(row, update);
        return { modifiedCount: rows.length };
      }),
    create: async (rows) =>
      rows.map((input) => {
        if (state.subscriptions.some((r) => r.endpoint === input.endpoint)) {
          const error = Error("Controlled unique endpoint");
          error.code = 11000;
          throw error;
        }
        const row = {
          _id: oid(nextId++),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...clone(input),
        };
        state.subscriptions.push(row);
        return clone(row);
      }),
  };
  const User = {
    updateOne: (filter, update) =>
      new Query(() => {
        const row = state.users.find((r) => matches(r, filter));
        if (row) apply(row, update);
        return { matchedCount: row ? 1 : 0 };
      }),
  };
  const Notification = {
    findOne: (filter) =>
      new Query(
        () => state.notifications.find((r) => matches(r, filter)) || null,
      ),
  };
  const indexes = {
    pushsubscriptions: [
      { key: { endpoint: 1 }, unique: true },
      { key: { userId: 1, isActive: 1 } },
    ],
    notifications: [
      {
        key: { dedupeKey: 1 },
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
      },
    ],
  };
  const fakeMongoose = Object.create(mongoose);
  Object.defineProperty(fakeMongoose, "connection", {
    value: {
      db: {
        collection: (name) => ({
          listIndexes: () => ({
            toArray: async () =>
              state.ready ? clone(indexes[name] || []) : [],
          }),
        }),
      },
    },
    configurable: true,
  });
  fakeMongoose.startSession = async () => ({
    withTransaction: async (operation) => {
      let release;
      const before = tail;
      tail = new Promise((resolve) => {
        release = resolve;
      });
      await before;
      const snapshot = clone({
        subscriptions: state.subscriptions,
        users: state.users,
      });
      try {
        return await operation();
      } catch (error) {
        state.subscriptions = snapshot.subscriptions;
        state.users = snapshot.users;
        throw error;
      } finally {
        release();
      }
    },
    endSession: async () => {},
  });
  const auth = {
    ApiAuthError,
    requireCurrentUser: async () => {
      if (!state.actor) throw new ApiAuthError("Unauthorized", 401);
      return clone(state.actor);
    },
  };
  const responses = {
    privateJson: (value, status = 200) =>
      Response.json(value, {
        status,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Vary: "Cookie",
        },
      }),
    apiFailure: (error) =>
      Response.json(
        {
          error:
            error instanceof ApiAuthError
              ? error.message
              : "Check the notification request.",
        },
        {
          status:
            error.status ||
            (["ZodError", "SyntaxError"].includes(error.name) ? 400 : 500),
          headers: { "Cache-Control": "private, no-store" },
        },
      ),
  };
  const boundaries = {
    "server-only": {},
    mongoose: fakeMongoose,
    "@/models/PushSubscription": {
      default: push,
      __esModule: true,
      pushIndexDefinitions: [
        ["pushsubscriptions", { endpoint: 1 }, { unique: true }],
        ["pushsubscriptions", { userId: 1, isActive: 1 }, {}],
        [
          "notifications",
          { dedupeKey: 1 },
          {
            unique: true,
            partialFilterExpression: { dedupeKey: { $type: "string" } },
          },
        ],
      ],
    },
    "@/models/user": { default: User, __esModule: true },
    "@/models/otp": { default: {}, __esModule: true },
    "@/models/notification": { default: Notification, __esModule: true },
    "@/lib/auth": auth,
    "@/lib/api-response": responses,
    "@/lib/db": { connectToDb: async () => {} },
    "next-auth/jwt": { getToken: async () => clone(state.token) },
  };
  const cache = new Map();
  function load(file, overrides = {}) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute) && !Object.keys(overrides).length)
      return cache.get(absolute);
    const js = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
        fileName: absolute,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      loaded = { exports: {} };
    new Function("require", "module", "exports", js)(
      (name) => {
        const resolved =
            name.startsWith("./") || name.startsWith("../")
              ? path.resolve(path.dirname(absolute), name)
              : name.startsWith("@/")
                ? path.resolve(root, name.slice(2))
                : null,
          alias = resolved
            ? "@/" + path.relative(root, resolved).replaceAll("\\", "/")
            : name;
        if (name in overrides) return overrides[name];
        if (alias in overrides) return overrides[alias];
        if (name in boundaries) return boundaries[name];
        if (alias in boundaries) return boundaries[alias];
        if (resolved) {
          if (resolved.endsWith(".mjs")) return require(resolved);
          const target = [resolved, resolved + ".ts"].find(
            (f) => fs.existsSync(f) && fs.statSync(f).isFile(),
          );
          if (target) return load(target, overrides);
        }
        return require(name);
      },
      loaded,
      loaded.exports,
    );
    if (!Object.keys(overrides).length) cache.set(absolute, loaded.exports);
    return loaded.exports;
  }
  function login(index = 0, session = "a".repeat(64)) {
    state.actor = state.users[index];
    state.token = {
      id: String(state.actor._id),
      pushSessionId: session,
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    return state.actor;
  }
  function request(path, body, method = "POST", headers = {}) {
    return new Request("http://localhost:3000" + path, {
      method,
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        ...headers,
      },
      ...(method === "GET"
        ? {}
        : { body: body === undefined ? undefined : JSON.stringify(body) }),
    });
  }
  return { state, load, login, request, auth, oid, push, indexes };
}
