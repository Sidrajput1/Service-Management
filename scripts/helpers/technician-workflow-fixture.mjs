/** Controlled test fixtures only. Never imported by production application code. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as workflow from "../../lib/technician-workflow.mjs";
import * as maps from "../../lib/map-links.mjs";
import * as location from "../../lib/service-location-client.mjs";
const require = createRequire(import.meta.url);
export const fixtureId = "a".repeat(24);
export function fixtureData(status = "arrived", overrides = {}) {
  return {
    job: {
      _id: fixtureId,
      status,
      proofRequired: true,
      proofIds: [],
      partsUsed: [],
      createdAt: "2026-10-27T08:00:00.000Z",
      acceptedAt: "2026-10-27T08:10:00.000Z",
      ...(status === "arrived" || status === "in_progress"
        ? { arrivedAt: "2026-10-27T08:40:00.000Z" }
        : {}),
      ...(status === "in_progress"
        ? {
            customerOtpVerifiedAt: "2026-10-27T08:42:00.000Z",
            startTime: "2026-10-27T08:42:00.000Z",
          }
        : {}),
      scheduledAt: "2026-10-27T08:30:00.000Z",
      paymentStatus: "unbilled",
      bookingId: {
        _id: "b".repeat(24),
        serviceType: "AC service & inspection",
        status: "assigned",
        customerId: { name: "Fixture customer" },
        address: {
          addressLine: "Controlled test service address",
          locality: "Test area",
          city: "Patna",
          state: "Bihar",
          pincode: "800020",
        },
        estimatedPrice: 450,
        notes:
          "Controlled test instructions. No real customer, booking, payment or location is used.",
      },
      ...overrides,
    },
    workflow: {
      access: "active",
      canAccept: ["assigned", "scheduled"].includes(status),
      canArrive: status === "enroute",
      canStart: status === "arrived",
      canUploadProof: ["arrived", "in_progress", "on_hold"].includes(status),
      canManageParts: ["otp_verified", "in_progress", "on_hold"].includes(
        status,
      ),
      canComplete: ["in_progress", "on_hold"].includes(status),
      canRetryInvoice: status === "completed",
    },
    journey: {
      canTrack: false,
      destinationAvailable: false,
      clientIntervalMs: 10000,
      requiredReadings: 2,
      radiusMeters: 100,
    },
  };
}
export function loadTs(path, modules = {}) {
  const source = readFileSync(
    new URL(`../../${path}`, import.meta.url),
    "utf8",
  );
  const compiled = { exports: {} };
  const js = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", js)(
    (name) => {
      if (name in modules) return modules[name];
      if (name.startsWith("@/"))
        throw new Error(`Missing fixture dependency ${name} for ${path}`);
      return require(name);
    },
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}
export function renderWorkflowFixture({
  data = fixtureData(),
  query = {},
  states = {},
  mutations = {},
  cloudinary = async () => ({
    url: "https://example.invalid/controlled-proof.jpg",
    public_id: "fixture",
  }),
} = {}) {
  const forms = [],
    controls = [],
    toasts = [],
    recorded = [];
  let stateIndex = 0;
  const clientHooks = {
    ...React,
    useState: (initial) =>
      React.useState(
        Object.hasOwn(states, stateIndex)
          ? states[stateIndex++]
          : (stateIndex++, initial),
      ),
  };
  const runtime = { ...jsxRuntime };
  for (const key of ["jsx", "jsxs"])
    runtime[key] = (type, props, id) => {
      if (type === "form") forms.push(props);
      if (props?.onClick || props?.onChange) controls.push(props);
      return jsxRuntime[key](type, props, id);
    };
  const modules = {
    react: clientHooks,
    "react/jsx-runtime": runtime,
    "@/lib/technician-workflow.mjs": workflow,
    "@/lib/map-links.mjs": maps,
    "@/lib/service-location-client.mjs": location,
    "next/link": ({ children, ...props }) =>
      React.createElement("a", props, children),
    "next/image": (props) => {
      const attributes = { ...props };
      delete attributes.unoptimized;
      return React.createElement("img", attributes);
    },
    "@/components/finance/FinalBillPanel": { FinalBillPanel: () => null },
    "@/components/finance/BookingActions": { CancellationPanel: () => null },
    "@/hooks/useJobStatusConnection": { useJobStatusConnection() {} },
    "@/lib/cloudinary": { uploadToCloudinary: cloudinary },
    sonner: {
      toast: {
        success: (message) => toasts.push({ type: "success", message }),
        error: (message) => toasts.push({ type: "error", message }),
      },
    },
    "@/lib/api": { default: {} },
    "@/components/chat/JobChatPanel": ({ triggerLabel }) =>
      React.createElement(
        "button",
        { type: "button", className: "public-button public-button-primary" },
        triggerLabel,
      ),
    "./ProJourney": {
      ProJourney: () =>
        React.createElement(
          "div",
          {
            className:
              "rounded-2xl border border-border p-5 text-sm text-muted-foreground",
          },
          "Browser location is not started in this controlled test fixture.",
        ),
    },
  };
  modules["@/lib/utils"] = loadTs("lib/utils.ts", modules);
  for (const name of ["card", "button", "input", "textarea", "label", "badge"])
    modules[`@/components/ui/${name}`] = loadTs(
      `components/ui/${name}.tsx`,
      modules,
    );
  const mutation = (name) => () => ({
    isPending: false,
    mutateAsync: async (value) => {
      recorded.push({ name, value });
      return mutations[name]
        ? mutations[name](value)
        : { job: { _id: fixtureId } };
    },
  });
  modules["@/hooks/useTechnicianJobs"] = {
    useTechnicianJob: () => ({
      data,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: async () => {},
      ...query,
    }),
    useAcceptTechnicianJob: mutation("accept"),
    useArriveTechnicianJob: mutation("arrive"),
    useStartTechnicianJob: mutation("start"),
    useCompleteTechnicianJob: mutation("complete"),
    useUploadTechnicianProof: mutation("proof"),
    useRefreshTechnicianJob: () => async () => {},
  };
  modules["@/components/maps/ServiceAddressPreview"] = loadTs(
    "components/maps/ServiceAddressPreview.tsx",
    modules,
  );
  modules["./jobPartUsed"] = loadTs(
    "components/technicians/jobPartUsed.tsx",
    modules,
  );
  const loaded = loadTs(
    "components/technicians/TechnicianJobDetails.tsx",
    modules,
  );
  const session = {
    user: { id: "c".repeat(24), role: "technician", name: "Fixture Pro" },
    expires: "2099-01-01T00:00:00.000Z",
  };
  const html = renderToStaticMarkup(
    React.createElement(loaded.default, { session, jobId: fixtureId }),
  );
  return { html, forms, controls, toasts, recorded };
}
export function workflowPreviewDocument(body, cssHref = "/workflow.css") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controlled Servizato workflow fixture</title><link rel="stylesheet" href="${cssHref}"></head><body class="bg-background text-foreground"><div style="background:#fff5c2;color:#584500;padding:12px 20px;font:600 13px system-ui;border-bottom:1px solid #d2bf69">Controlled test fixture — no live job or mutations. Tracking, chat and forms are inactive in this saved preview.</div><main style="max-width:1280px;margin:0 auto;padding:24px 16px">${body}</main></body></html>`;
}
export const fixtureRoot = fileURLToPath(new URL("../../", import.meta.url));
