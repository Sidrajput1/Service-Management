/** Isolated model, email and transaction boundaries. No network or real account data. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { passwordIndexDefinitions } from "../../lib/password-indexes.mjs";
const require = createRequire(import.meta.url),
  root = path.resolve(import.meta.dirname, "../..");
export const fixtureCurrent = "Controlled current credential";
export const fixtureNew = "Controlled replacement credential";
const originalHash = bcrypt.hashSync(fixtureCurrent, 4);
export const oid = (number) =>
  new mongoose.Types.ObjectId(number.toString(16).padStart(24, "0"));
function clone(value) {
  if (value instanceof mongoose.Types.ObjectId)
    return new mongoose.Types.ObjectId(String(value));
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  return value;
}
function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or")
      return expected.some((candidate) => matches(row, candidate));
    const actual = row?.[key];
    if (
      expected &&
      typeof expected === "object" &&
      !(expected instanceof Date) &&
      !(expected instanceof mongoose.Types.ObjectId)
    )
      return Object.entries(expected).every(([op, value]) =>
        op === "$ne"
          ? actual !== value
          : op === "$exists"
            ? (actual !== undefined) === value
            : op === "$gt"
              ? actual > value
              : op === "$lt"
                ? actual < value
                : false,
      );
    return expected == null
      ? actual == null
      : String(actual) === String(expected);
  });
}
function update(row, mutation) {
  Object.assign(row, clone(mutation.$set || {}));
  for (const [key, amount] of Object.entries(mutation.$inc || {}))
    row[key] = (row[key] || 0) + amount;
  for (const key of Object.keys(mutation.$unset || {})) delete row[key];
}
export function installPasswordTestEnv() {
  const changes = {
    NEXTAUTH_URL: "https://servizato.example",
    NEXTAUTH_SECRET: "isolated-password-suite-secret",
    RESEND_API_KEY: "controlled-sdk-key",
    EMAIL_FROM: "Servizato <no-reply@mail.servizato.example>",
    EMAIL_REPLY_TO: "support@servizato.example",
    PASSWORD_TRUST_PROXY: "false",
    RESEND_DEBUG: "false",
  };
  const previous = Object.fromEntries(
    Object.keys(changes).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, changes);
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
export function createPasswordFixture() {
  const state = {
    users: [
      {
        _id: oid(1),
        name: "Controlled provider",
        email: "provider@servizato.example",
        password: originalHash,
        role: "service_provider",
        isActive: true,
        credentialVersion: 0,
      },
    ],
    tokens: [],
    limits: [],
    otp: [],
    sent: [],
    afters: [],
    disconnected: [],
    actor: null,
    emailResult: "ok",
    indexesReady: true,
    transactionsReady: true,
    failUserUpdate: false,
    databaseFailure: false,
    reads: 0,
    endedSessions: 0,
  };
  state.actor = clone(state.users[0]);
  class ApiAuthError extends Error {
    constructor(message, status = 401) {
      super(message);
      this.status = status;
    }
  }
  const query = (read) => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    then(resolve, reject) {
      try {
        return Promise.resolve(clone(read())).then(resolve, reject);
      } catch (error) {
        return Promise.reject(error).then(resolve, reject);
      }
    },
  });
  const User = {
    findOne(filter) {
      state.reads++;
      return query(
        () => state.users.find((row) => matches(row, filter)) || null,
      );
    },
    async create(value) {
      const user = {
        ...clone(value),
        _id: oid(state.users.length + 1),
        isActive: true,
        credentialVersion: 0,
      };
      state.users.push(user);
      return clone(user);
    },
    async updateOne(filter, mutation) {
      if (state.failUserUpdate) return { modifiedCount: 0 };
      const user = state.users.find((row) => matches(row, filter));
      if (!user) return { modifiedCount: 0 };
      update(user, mutation);
      return { modifiedCount: 1 };
    },
  };
  const Token = {
    findOne: (filter) =>
      query(() => state.tokens.find((row) => matches(row, filter)) || null),
    async findOneAndUpdate(filter, mutation) {
      let row = state.tokens.find((item) => matches(item, filter));
      if (!row) {
        row = { ...clone(filter) };
        state.tokens.push(row);
      }
      update(row, mutation);
      return clone(row);
    },
    async updateOne(filter, mutation) {
      const row = state.tokens.find((item) => matches(item, filter));
      if (!row) return { modifiedCount: 0 };
      update(row, mutation);
      return { modifiedCount: 1 };
    },
    async updateMany(filter, mutation) {
      let count = 0;
      for (const row of state.tokens.filter((item) => matches(item, filter))) {
        update(row, mutation);
        count++;
      }
      return { modifiedCount: count };
    },
  };
  const Rate = {
    findOneAndUpdate: (filter, mutation) =>
      query(() => {
        let row = state.limits.find((item) => matches(item, filter));
        if (!row && state.limits.some((item) => item._id === filter._id))
          throw Object.assign(new Error("Controlled duplicate key"), {
            code: 11000,
          });
        if (!row) {
          row = { _id: filter._id, ...clone(mutation.$setOnInsert) };
          state.limits.push(row);
        }
        update(row, mutation);
        return row;
      }),
  };
  let tail = Promise.resolve();
  const database = {
    connection: {
      db: {
        admin: () => ({
          command: async () =>
            state.transactionsReady ? { setName: "controlled-replica" } : {},
        }),
        collection: (name) => ({
          listIndexes: () => ({
            toArray: async () =>
              state.indexesReady
                ? passwordIndexDefinitions
                    .filter((row) => row[0] === name)
                    .map(([, key, options]) => ({ key, ...options }))
                : [],
          }),
        }),
      },
    },
    async startSession() {
      return {
        async withTransaction(fn) {
          const previous = tail;
          let release;
          tail = new Promise((resolve) => {
            release = resolve;
          });
          await previous;
          const snapshot = {
            users: clone(state.users),
            tokens: clone(state.tokens),
          };
          try {
            return await fn();
          } catch (error) {
            state.users = snapshot.users;
            state.tokens = snapshot.tokens;
            throw error;
          } finally {
            release();
          }
        },
        async endSession() {
          state.endedSessions++;
        },
      };
    },
  };
  const next = require("next/server");
  const boundaries = {
    "server-only": {},
    mongoose: database,
    "@/models/user": User,
    "@/models/PasswordResetToken": Token,
    "@/models/PasswordRateLimit": Rate,
    "@/models/otp": {
      findOne: (filter) =>
        query(() => state.otp.find((row) => matches(row, filter)) || null),
    },
    "@/lib/db": {
      connectToDb: async () => {
        if (state.databaseFailure)
          throw new Error("Controlled database failure");
      },
    },
    "@/lib/auth": {
      ApiAuthError,
      requireCurrentUser: async (options) => {
        if (!state.actor) throw new ApiAuthError("Unauthorized");
        const row = state.users.find(
          (user) => String(user._id) === String(state.actor._id),
        );
        if (
          !row ||
          row.isActive === false ||
          (row.credentialVersion || 0) !== (state.actor.credentialVersion || 0)
        )
          throw new ApiAuthError("Sign in again");
        if (row.mustChangePassword && !options?.allowPasswordChange)
          throw new ApiAuthError("Change your temporary password", 403);
        return clone(row);
      },
    },
    "@/lib/socket": {
      getIO: () => ({
        in: (room) => ({
          disconnectSockets: () => state.disconnected.push(room),
        }),
      }),
    },
    "next/server": {
      ...next,
      after: (callback) => state.afters.push(callback),
    },
    resend: {
      Resend: class {
        constructor(key, options) {
          if (!key || options.baseUrl !== "https://api.resend.com")
            throw new Error("Controlled SDK configuration failure");
        }
        emails = {
          send: async (payload, options) => {
            state.sent.push({
              payload: clone(payload),
              idempotencyKey: options.idempotencyKey,
              timeoutConfigured: options.signal instanceof AbortSignal,
            });
            if (state.emailResult === "throw")
              throw new Error("Controlled provider failure");
            return state.emailResult === "error"
              ? {
                  data: null,
                  error: { message: "Controlled provider rejection" },
                }
              : state.emailResult === "missing-id"
                ? { data: {}, error: null }
                : { data: { id: "controlled-email-id" }, error: null };
          },
        };
      },
    },
  };
  const cache = new Map();
  function load(file, overrides = {}) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute) && !Object.keys(overrides).length)
      return cache.get(absolute);
    const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      fileName: absolute,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const compiled = { exports: {} };
    new Function("require", "module", "exports", source)(
      (name) => {
        if (name in overrides) return overrides[name];
        if (name in boundaries) return boundaries[name];
        const resolved = name.startsWith("@/")
          ? path.resolve(root, name.slice(2))
          : name.startsWith(".")
            ? path.resolve(path.dirname(absolute), name)
            : null;
        if (resolved) {
          if (resolved.endsWith(".mjs")) return require(resolved);
          const target = [resolved, resolved + ".ts", resolved + ".tsx"].find(
            (value) => fs.existsSync(value) && fs.statSync(value).isFile(),
          );
          if (target) return load(target, overrides);
        }
        return require(name);
      },
      compiled,
      compiled.exports,
    );
    if (!Object.keys(overrides).length) cache.set(absolute, compiled.exports);
    return compiled.exports;
  }
  const request = (body, headers = {}) =>
    new Request("https://servizato.example/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://servizato.example",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  async function settle() {
    while (state.afters.length) await state.afters.shift()();
  }
  return {
    state,
    load,
    request,
    settle,
    User,
    Token,
    Rate,
    ApiAuthError,
    database,
  };
}
