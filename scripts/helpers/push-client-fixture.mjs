/** Isolated browser API doubles. No permission prompt, registration, network call or push is real. */
import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export function loadPushTs(path, modules = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const result = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => {
      if (name in modules) return modules[name];
      if (name.startsWith("@/"))
        throw Error("Missing controlled push import " + name);
      return require(name);
    },
    result,
    result.exports,
  );
  return result.exports;
}
export function browserFixture(options = {}) {
  const saved = new Map(),
    storage = new Map(),
    calls = {
      permission: 0,
      register: 0,
      subscribe: 0,
      unsubscribe: 0,
      bind: 0,
      clear: 0,
      signOut: [],
      requests: [],
    };
  const state = {
    owner: "a".repeat(24),
    permission: "default",
    configured: true,
    storageReady: true,
    binding: null,
    native: null,
    rows: [],
    token: "controlled-binding-1",
    failBind: false,
    failNetwork: false,
    ...options,
  };
  const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 9)]),
    publicKey = key.toString("base64url");
  let next = 1;
  function subscription(keyBytes = key) {
    const item = {
      endpoint: "https://push.example.invalid/controlled/" + next++,
      options: { applicationServerKey: Uint8Array.from(keyBytes).buffer },
      toJSON: () => ({
        endpoint: item.endpoint,
        expirationTime: null,
        keys: {
          p256dh: "controlled-public-encryption-key",
          auth: "controlled-auth-secret",
        },
      }),
      unsubscribe: async () => {
        calls.unsubscribe++;
        if (state.failUnsubscribe) return false;
        if (state.native === item) state.native = null;
        return true;
      },
    };
    return item;
  }
  const registration = {
    scope: "http://localhost:3000/",
    active: {
      scriptURL: "http://localhost:3000/servizato-push-sw.js",
      postMessage(message, ports) {
        if (message.type === "SERVIZATO_PUSH_STATE")
          ports[0].postMessage({ ok: true, binding: state.binding });
        else if (message.type === "SERVIZATO_PUSH_CLEAR") {
          calls.clear++;
          state.binding = null;
          ports[0].postMessage({ ok: true });
        } else if (message.type === "SERVIZATO_PUSH_BIND") {
          calls.bind++;
          if (state.failBind) ports[0].postMessage({ ok: false });
          else {
            state.binding = message.binding;
            ports[0].postMessage({ ok: true });
          }
        }
      },
    },
    pushManager: {
      getSubscription: async () => state.native,
      subscribe: async (input) => {
        calls.subscribe++;
        state.native = subscription(new Uint8Array(input.applicationServerKey));
        return state.native;
      },
    },
    getNotifications: async () => [],
  };
  function set(name, value) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const window = new EventTarget();
  window.isSecureContext = true;
  window.Notification = {};
  window.PushManager = {};
  set("window", window);
  set("location", { origin: "http://localhost:3000" });
  set("localStorage", {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  });
  set("navigator", {
    userAgent: "Controlled Chrome/120 Windows",
    serviceWorker: {
      getRegistration: async () =>
        state.hasRegistration === false ? undefined : registration,
      register: async () => {
        calls.register++;
        state.hasRegistration = true;
        return registration;
      },
    },
  });
  set("Notification", {
    get permission() {
      return state.permission;
    },
    requestPermission: async () => {
      calls.permission++;
      state.permission = state.permissionResult || "granted";
      return state.permission;
    },
  });
  set(
    "MessageChannel",
    class {
      constructor() {
        this.port1 = { onmessage: null, close() {} };
        this.port2 = {
          postMessage: (value) =>
            queueMicrotask(() => this.port1.onmessage?.({ data: value })),
        };
      }
    },
  );
  set("fetch", async (path, input = {}) => {
    calls.requests.push({ path, method: input.method || "GET" });
    if (state.failNetwork) throw Error("Controlled offline error");
    if (path.endsWith("/config"))
      return Response.json({
        configured: state.configured,
        storageReady: state.storageReady,
        publicKey: state.configured ? publicKey : null,
        serviceWorkerPath: "/servizato-push-sw.js",
      });
    if (path.endsWith("/subscriptions/current")) {
      const { endpoint } = JSON.parse(input.body);
      const device =
        state.rows.find(
          (row) => row.owner === state.owner && row.endpoint === endpoint,
        ) || null;
      return Response.json({
        device: device
          ? {
              id: device.id,
              deviceLabel: device.deviceLabel,
              isActive: device.isActive,
            }
          : null,
        binding: device?.isActive
          ? {
              subscriptionId: device.id,
              bindingToken: state.token,
              ownerId: state.owner,
            }
          : null,
      });
    }
    if (path.endsWith("/subscriptions") && input.method === "POST") {
      const body = JSON.parse(input.body);
      let row = state.rows.find(
        (row) => row.endpoint === body.subscription.endpoint,
      );
      if (!row) {
        row = {
          id: next.toString(16).padStart(24, "0"),
          endpoint: body.subscription.endpoint,
        };
        state.rows.push(row);
      }
      Object.assign(row, {
        owner: state.owner,
        isActive: true,
        deviceLabel: body.deviceLabel,
      });
      if (state.lostResponse) {
        state.lostResponse = false;
        throw Error("Controlled lost response after registration");
      }
      return Response.json({
        device: { id: row.id, deviceLabel: row.deviceLabel, isActive: true },
        binding: {
          subscriptionId: row.id,
          bindingToken: state.token,
          ownerId: state.owner,
        },
      });
    }
    if (path.endsWith("/subscriptions"))
      return Response.json({
        devices: state.rows
          .filter((row) => row.owner === state.owner)
          .map(({ id, deviceLabel, isActive }) => ({
            id,
            deviceLabel,
            isActive,
          })),
        storageReady: state.storageReady,
      });
    if (input.method === "DELETE") {
      const id = path.split("/").at(-1),
        row = state.rows.find(
          (row) => row.id === id && row.owner === state.owner,
        );
      if (!row) return Response.json({ error: "not found" }, { status: 404 });
      row.isActive = false;
      return Response.json({ disabled: true });
    }
    return Response.json({ error: "unknown request" }, { status: 400 });
  });
  const client = loadPushTs("lib/push-client.ts", {
    "next-auth/react": {
      signOut: async (options) => {
        calls.signOut.push(options);
        return { url: "/signin" };
      },
    },
  });
  return {
    state,
    calls,
    client,
    registration,
    storage,
    publicKey,
    subscription,
    restore() {
      for (const [name, descriptor] of saved)
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
    },
  };
}
