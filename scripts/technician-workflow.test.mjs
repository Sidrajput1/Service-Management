import test from "node:test";
import assert from "node:assert/strict";
import {
  technicianWorkflow,
  technicianStatusLabel,
  createTechnicianActionGate,
  technicianMutationMessage,
} from "../lib/technician-workflow.mjs";
import {
  fixtureData,
  fixtureId,
  loadTs,
  renderWorkflowFixture,
} from "./helpers/technician-workflow-fixture.mjs";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("workflow actions follow actual job states and require server capabilities", () => {
  for (const [status, action] of [
    ["scheduled", "accept"],
    ["assigned", "accept"],
    ["enroute", "arrive"],
    ["arrived", "start"],
    ["in_progress", "proof"],
    ["on_hold", "proof"],
    ["otp_verified", undefined],
    ["completed", "invoice"],
    ["cancelled", undefined],
    ["accepted", undefined],
    ["expired", undefined],
    ["rejected", undefined],
  ]) {
    const data = fixtureData(status),
      result = technicianWorkflow(data.job, data.workflow);
    assert.equal(result.action?.key, action, status);
    assert.equal(technicianWorkflow(data.job).action, null);
  }
  assert.equal(technicianStatusLabel("otp_verified"), "OTP verified");
  assert.equal(technicianStatusLabel("enroute"), "En route");
});
test("proof is a server prerequisite, saved proof is evidence, and completion does not expose an extra start transition", () => {
  const data = fixtureData("in_progress");
  assert.equal(technicianWorkflow(data.job, data.workflow).action.key, "proof");
  data.job.proofIds = ["proof-record"];
  assert.equal(
    technicianWorkflow(data.job, data.workflow).action.key,
    "complete",
  );
  assert.equal(
    technicianWorkflow(data.job, data.workflow).stages.find(
      (stage) => stage.key === "proof",
    ).state,
    "completed",
  );
  data.job.proofIds = [];
  data.job.proofRequired = false;
  assert.equal(
    technicianWorkflow(data.job, data.workflow).action.key,
    "complete",
  );
  const completed = fixtureData("completed", { invoiceId: "d".repeat(24) });
  assert.equal(
    technicianWorkflow(completed.job, completed.workflow).action,
    null,
  );
});
test("read-only, cancelled, missing-booking and unsupported states cannot gain actions from permissive client flags", () => {
  const data = fixtureData("in_progress"),
    permission = {
      ...data.workflow,
      canComplete: true,
      canStart: true,
      canAccept: true,
    };
  for (const job of [
    { ...data.job, status: "cancelled" },
    { ...data.job, status: "accepted" },
    { ...data.job, bookingId: null },
    { ...data.job, bookingId: { ...data.job.bookingId, status: "cancelled" } },
  ]) {
    const state = technicianWorkflow(job, permission);
    assert.equal(state.action, null);
    assert.equal(state.canUploadProof, false);
    assert.equal(state.canManageParts, false);
  }
  const reassigned = technicianWorkflow(data.job, {
    ...permission,
    access: "read_only",
    reason: "Assignment changed.",
  });
  assert.equal(reassigned.action, null);
  assert.equal(reassigned.blockedReason, "Assignment changed.");
  assert.equal(
    reassigned.stages.find((stage) => stage.key === "work").state,
    "blocked",
  );
});
test("stepper distinguishes current, completed, upcoming, blocked and exceptional facts", () => {
  const assigned = fixtureData("assigned");
  assert.equal(
    technicianWorkflow(assigned.job, assigned.workflow).stages[0].state,
    "current",
  );
  assert.equal(
    technicianWorkflow(assigned.job, assigned.workflow).stages[1].state,
    "upcoming",
  );
  const working = fixtureData("in_progress"),
    stages = technicianWorkflow(working.job, working.workflow).stages;
  assert.equal(stages[0].state, "completed");
  assert.equal(stages[3].state, "current");
  assert.equal(stages[4].state, "blocked");
  const held = fixtureData("on_hold");
  assert.equal(
    technicianWorkflow(held.job, held.workflow).stages[3].state,
    "exceptional",
  );
  const verified = fixtureData("otp_verified");
  assert.equal(
    technicianWorkflow(verified.job, verified.workflow).action,
    null,
  );
  assert.ok(
    technicianWorkflow(verified.job, verified.workflow).blockedReason.includes(
      "has not entered Work in progress",
    ),
  );
});
test("synchronous action gate rejects duplicate submissions before React pending state and recovers on failure", async () => {
  const gate = createTechnicianActionGate(),
    work = deferred();
  let calls = 0;
  const first = gate.run(async () => {
    calls++;
    return work.promise;
  });
  assert.equal(gate.isBusy(), true);
  assert.deepEqual(
    await gate.run(async () => {
      calls++;
    }),
    { ran: false },
  );
  work.resolve("saved");
  assert.deepEqual(await first, { ran: true, value: "saved" });
  assert.equal(calls, 1);
  await assert.rejects(
    gate.run(async () => {
      throw new Error("failure");
    }),
  );
  assert.equal(gate.isBusy(), false);
  assert.equal((await gate.run(async () => "retried")).value, "retried");
});
test("mutation errors retain useful validation messages without showing server internals", () => {
  assert.equal(
    technicianMutationMessage({
      response: { status: 400, data: { error: "Invalid OTP" } },
    }),
    "Invalid OTP",
  );
  for (const error of [
    { response: { status: 500, data: { error: "mongodb private stack" } } },
    { response: { status: 400, data: { error: ["schema"] } } },
    { message: "private request URL" },
  ])
    assert.equal(technicianMutationMessage(error).includes("private"), false);
});

function hooksFixture({
  role = "technician",
  userId = "c".repeat(24),
  status = "authenticated",
} = {}) {
  const calls = [],
    invalidations = [];
  const client = {
    invalidateQueries: async (value) => {
      invalidations.push(value.queryKey);
    },
  };
  const hooks = loadTs("hooks/useTechnicianJobs.ts", {
    react: { useCallback: (fn) => fn },
    "next-auth/react": {
      useSession: () => ({ status, data: { user: { id: userId, role } } }),
    },
    "@tanstack/react-query": {
      useQuery: (options) => options,
      useMutation: (options) => options,
      useQueryClient: () => client,
    },
    "@/lib/api": {
      get: async (url, options) => {
        calls.push({ method: "GET", url, options });
        return { data: { job: {} } };
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return { data: { job: { status: "in_progress" } } };
      },
    },
  });
  return { hooks, calls, invalidations };
}
test("actual job hooks isolate accounts, use abort signals and skip requests for other roles or unauthenticated users", async () => {
  const a = hooksFixture(),
    b = hooksFixture({ userId: "d".repeat(24) });
  const one = a.hooks.useTechnicianJob(fixtureId),
    two = b.hooks.useTechnicianJob(fixtureId);
  assert.notDeepEqual(one.queryKey, two.queryKey);
  assert.equal(one.gcTime, 0);
  assert.equal(one.enabled, true);
  const controller = new AbortController();
  await one.queryFn({ signal: controller.signal });
  assert.equal(a.calls[0].options.signal, controller.signal);
  await a.hooks.useTechnicianJobs().queryFn({ signal: controller.signal });
  assert.equal(a.calls[1].options.signal, controller.signal);
  assert.equal(one.retry(0, { response: { status: 404 } }), false);
  assert.equal(one.retry(0, new Error("network")), true);
  for (const config of [{ role: "customer" }, { status: "unauthenticated" }]) {
    const fixture = hooksFixture(config);
    assert.equal(fixture.hooks.useTechnicianJob(fixtureId).enabled, false);
    assert.equal(fixture.hooks.useTechnicianJobs().enabled, false);
    await assert.rejects(
      fixture.hooks.useAcceptTechnicianJob().mutationFn(fixtureId),
    );
    assert.equal(fixture.calls.length, 0);
  }
});
test("every existing mutation reconciles its exact authenticated detail and list without optimistic advancement", async () => {
  const fixture = hooksFixture();
  for (const [name, value, endpoint] of [
    ["useAcceptTechnicianJob", fixtureId, "accept"],
    ["useArriveTechnicianJob", fixtureId, "arrive"],
    ["useStartTechnicianJob", { id: fixtureId, otp: "123456" }, "start"],
    [
      "useUploadTechnicianProof",
      { id: fixtureId, payload: { proofs: [] } },
      "proof",
    ],
    ["useCompleteTechnicianJob", fixtureId, "complete"],
  ]) {
    const mutation = fixture.hooks[name]();
    assert.equal(mutation.onMutate, undefined);
    const result = await mutation.mutationFn(value);
    assert.ok(fixture.calls.at(-1).url.endsWith(`/${endpoint}`));
    fixture.invalidations.length = 0;
    await mutation.onSuccess(result, value);
    assert.deepEqual(fixture.invalidations, [
      ["technician-job", fixtureId, "c".repeat(24)],
      ["technician-jobs", "c".repeat(24)],
    ]);
    fixture.invalidations.length = 0;
    await mutation.onError(new Error("unconfirmed response"), value);
    assert.equal(fixture.invalidations.length, 2);
  }
});
test("actual workflow rendering shows exact status, back/retry, OTP prerequisite and no leaked stored OTP", () => {
  const data = fixtureData("arrived", { otp: "never-display-stored-otp" }),
    rendered = renderWorkflowFixture({ data });
  assert.ok(rendered.html.includes('href="/technician/all-jobs"'));
  assert.ok(rendered.html.includes("Arrived"));
  assert.ok(rendered.html.includes("Verify OTP &amp; start work"));
  assert.ok(rendered.html.includes('id="customer-job-otp"'));
  assert.equal(rendered.html.includes("never-display-stored-otp"), false);
  assert.equal(rendered.html.includes("unread"), false);
  const loading = renderWorkflowFixture({
    query: { data: undefined, isPending: true },
  }).html;
  assert.ok(loading.includes("Loading assigned job"));
  const denied = renderWorkflowFixture({
    query: { isError: true, error: { response: { status: 404 } } },
  }).html;
  assert.ok(denied.includes("Assigned job unavailable"));
  assert.ok(denied.includes("Try again"));
  assert.equal(denied.includes("Fixture customer"), false);
});
test("background failure preserves last confirmed details while blocking stale workflow actions", () => {
  const rendered = renderWorkflowFixture({
    query: { isError: true, error: { response: { status: 500 } } },
  });
  assert.ok(rendered.html.includes("last confirmed details"));
  assert.ok(rendered.html.includes("AC service &amp; inspection"));
  assert.equal(rendered.html.includes('id="customer-job-otp"'), false);
  assert.ok(rendered.html.includes("No action is currently available"));
});
test("actual OTP submit handler uses the supplied customer code once and only reports success after the server resolves", async () => {
  const response = deferred(),
    rendered = renderWorkflowFixture({
      states: { 0: "123456" },
      mutations: { start: () => response.promise },
    });
  const form = rendered.forms.find((value) => !value["aria-label"]);
  assert.ok(form);
  form.onSubmit({ preventDefault() {} });
  form.onSubmit({ preventDefault() {} });
  assert.deepEqual(rendered.recorded, [
    { name: "start", value: { id: fixtureId, otp: "123456" } },
  ]);
  assert.equal(rendered.toasts.length, 0);
  response.resolve({ job: { status: "in_progress" } });
  await tick();
  assert.equal(rendered.toasts[0].type, "success");
});
test("actual proof handler blocks duplicate Cloudinary batches and proof API writes throughout the external-upload gap", async () => {
  const upload = deferred(),
    data = fixtureData("in_progress");
  let calls = 0;
  const file = { name: "controlled-proof.jpg", type: "image/jpeg", size: 128 };
  const rendered = renderWorkflowFixture({
    data,
    states: { 2: [file] },
    cloudinary: async () => {
      calls++;
      return upload.promise;
    },
  });
  const form = rendered.forms.find(
    (value) => value["aria-label"] === "Service proof upload",
  );
  const a = form.onSubmit({ preventDefault() {} }),
    b = form.onSubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(rendered.recorded.length, 0);
  assert.equal(rendered.toasts.length, 0);
  upload.resolve({
    url: "https://example.invalid/controlled-proof.jpg",
    public_id: "fixture",
  });
  await Promise.all([a, b]);
  assert.equal(
    rendered.recorded.filter((item) => item.name === "proof").length,
    1,
  );
  assert.deepEqual(data.job.proofIds, []);
  assert.equal(data.job.status, "in_progress");
});
test("parts edit availability matches API states and unknown prices are not displayed as zero", () => {
  const arrived = renderWorkflowFixture({ data: fixtureData("arrived") }).html;
  assert.equal(arrived.includes("Add Part"), false);
  const working = renderWorkflowFixture({
    data: fixtureData("in_progress", {
      partsUsed: [{ partName: "Missing-price fixture", qty: 1 }],
    }),
  }).html;
  assert.ok(working.includes("Add Part"));
  assert.ok(working.includes("Not recorded"));
});
