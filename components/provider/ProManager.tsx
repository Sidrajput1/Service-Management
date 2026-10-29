"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Copy, KeyRound } from "lucide-react";
import {
  useProviderTechnicians,
  useCreateProviderTechnician,
} from "@/hooks/useProviderOnboarding";
import { useProviderServiceCatalog } from "@/hooks/useProviderServiceCatalog";
import { SkillPicker } from "./CatalogControls";
import {
  ProviderHeading,
  ProviderState,
  Feedback,
  errorMessage,
} from "./ProviderUi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CursorPager } from "@/components/customer/CustomerUi";
import api from "@/lib/api";
import type { ProRecord } from "@/lib/marketplace-types";

type Credential = {
  temporaryPassword: string;
  loginEmail: string;
  credentialExpiresAt: string;
};
function InitialCredentialDialog({
  value,
  clear,
}: {
  value: Credential | null;
  clear: () => void;
}) {
  const [copied, setCopied] = useState("");
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(clear, 120000);
    return () => clearTimeout(timer);
  }, [value, clear]);
  return (
    <Dialog
      open={Boolean(value)}
      onOpenChange={(open) => {
        if (!open) {
          setCopied("");
          clear();
        }
      }}
    >
      <DialogContent className="w-[calc(100%_-_2rem)]! max-w-130! p-6">
        <DialogTitle>Pro account created</DialogTitle>
        <DialogDescription>
          This initial password is shown only now. Share it securely with your
          Pro. It expires in 24 hours, and they must set their own password
          before using the app.
        </DialogDescription>
        {value && (
          <div className="space-y-4">
            <div>
              <label htmlFor="pro-login" className="provider-label">
                Login email
              </label>
              <Input
                id="pro-login"
                readOnly
                value={value.loginEmail}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <div>
              <label htmlFor="pro-initial-password" className="provider-label">
                One-time initial password
              </label>
              <Input
                id="pro-initial-password"
                readOnly
                autoComplete="off"
                spellCheck={false}
                value={value.temporaryPassword}
                className="font-mono"
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Expires:{" "}
              {new Date(value.credentialExpiresAt).toLocaleString("en-IN")}.
              This panel clears automatically after two minutes.
            </p>
            <Button
              className="h-11"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(value.temporaryPassword);
                  setCopied("Password copied. Share it securely.");
                } catch {
                  setCopied(
                    "Clipboard is unavailable. Select the password above and copy it manually.",
                  );
                }
              }}
            >
              <Copy className="size-4" />
              Copy password
            </Button>
            <Feedback message={copied} />
            <Button variant="outline" className="h-11 w-full" onClick={clear}>
              I’ve saved it securely — close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ProManager({ embedded = false }: { embedded?: boolean }) {
  const [history, setHistory] = useState<string[]>([]),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<ProRecord | null>(null),
    [skills, setSkills] = useState<string[]>([]),
    [credential, setCredential] = useState<Credential | null>(null),
    [feedback, setFeedback] = useState(""),
    [failure, setFailure] = useState(""),
    [pending, setPending] = useState(false),
    [reissue, setReissue] = useState<ProRecord | null>(null);
  const [search, setSearch] = useState("");
  const query = useProviderTechnicians(history.at(-1), search),
    catalog = useProviderServiceCatalog(),
    create = useCreateProviderTechnician(),
    client = useQueryClient();
  const creationKey = useRef("");
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["provider-technicians"] });
    client.invalidateQueries({ queryKey: ["provider-onboarding"] });
  };
  const resetCredentialMutation = create.reset;
  const clearCredential = useCallback(() => {
    setCredential(null);
    resetCredentialMutation();
  }, [resetCredentialMutation]);
  return (
    <>
      {!embedded && (
        <ProviderHeading
          title="Your Pros"
          description="Build your team with catalog skills. New accounts get an expiring initial password and must set their own password before working."
        />
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Only your business’s Pros are shown.
        </p>
        <Button
          className="h-11 px-5"
          onClick={() => {
            setEditing(null);
            setSkills([]);
            creationKey.current = crypto.randomUUID();
            setFailure("");
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Pro
        </Button>
      </div>
      <form
        className="mb-5 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setHistory([]);
          setSearch(
            String(
              new FormData(event.currentTarget).get("teamSearch") || "",
            ).trim(),
          );
        }}
      >
        <Input
          name="teamSearch"
          aria-label="Search your Pros by name, email or phone"
          placeholder="Search name, email or phone"
          maxLength={100}
          className="h-11"
        />
        <Button type="submit" variant="outline" className="h-11">
          Search team
        </Button>
      </form>
      <Feedback message={feedback} />
      <ProviderState
        loading={query.isLoading || catalog.isLoading}
        error={query.isError || catalog.isError}
        retry={() => {
          query.refetch();
          catalog.refetch();
        }}
      >
        <div className="space-y-3">
          {!query.data?.technicians.length && (
            <div className="provider-panel py-10 text-center">
              <h2 className="font-semibold">
                A skilled team starts with one Pro
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Add a team member and select the work they are qualified to
                perform.
              </p>
            </div>
          )}
          {query.data?.technicians.map((pro) => (
            <article
              key={pro._id}
              className="provider-panel flex flex-wrap items-start justify-between gap-5"
            >
              <div>
                <h2 className="font-semibold">{pro.userId?.name || "Pro"}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {pro.userId?.email} · {pro.userId?.phone}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="provider-badge">
                    {pro.isActive ? pro.status.replace("_", " ") : "Inactive"}
                  </span>
                  {pro.skills.map((skill) => (
                    <span key={skill} className="provider-badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setEditing(pro);
                    setSkills(pro.skillKeys || []);
                    setFailure("");
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit skills & status
                </Button>
                {pro.isActive && (
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setReissue(pro);
                      setFailure("");
                    }}
                  >
                    <KeyRound className="size-4" />
                    Initial credential
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        <CursorPager
          history={history}
          change={setHistory}
          nextCursor={query.data?.nextCursor}
        />
      </ProviderState>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending && !create.isPending) setOpen(value);
        }}
      >
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-170! max-h-[92dvh] overflow-y-auto p-6">
          <DialogTitle>
            {editing ? "Edit your Pro" : "Add a Pro to your business"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Skills and work status remain scoped to your business. Active jobs must be finished or reassigned before deactivation."
              : "Choose their skills and contact details. You’ll receive an initial password to share securely with your Pro."}
          </DialogDescription>
          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (pending || create.isPending) return;
              setFailure("");
              const form = event.currentTarget,
                fields = new FormData(form);
              if (!skills.length && !editing?.skills.length) {
                setFailure("Choose at least one catalog skill.");
                return;
              }
              try {
                if (editing) {
                  if (
                    editing.isActive &&
                    fields.get("isActive") !== "on" &&
                    !window.confirm(
                      "Deactivate this Pro? They will no longer be eligible for new assignments. Existing job history stays available.",
                    )
                  )
                    return;
                  setPending(true);
                  await api.patch(
                    `/service-provider/technicians/${editing._id}`,
                    {
                      ...(skills.length ? { skillKeys: skills } : {}),
                      vehicleType: fields.get("vehicleType"),
                      status: fields.get("status") || undefined,
                      isActive: fields.get("isActive") === "on",
                    },
                  );
                  refresh();
                  setFeedback("Pro details updated.");
                } else {
                  const result = await create.mutateAsync({
                    name: String(fields.get("name")),
                    email: String(fields.get("email") || ""),
                    phone: String(fields.get("phone")),
                    skillKeys: skills,
                    vehicleType: String(fields.get("vehicleType") || ""),
                    creationKey: creationKey.current,
                  });
                  create.reset();
                  if (
                    result.temporaryPassword &&
                    result.loginEmail &&
                    result.credentialExpiresAt
                  )
                    setCredential({
                      temporaryPassword: result.temporaryPassword,
                      loginEmail: result.loginEmail,
                      credentialExpiresAt: result.credentialExpiresAt,
                    });
                  else {
                    create.reset();
                    setFeedback(
                      "This account was already created. The original credential cannot be retrieved; use Initial credential to issue a new one if the Pro has not yet set a password.",
                    );
                  }
                  form.reset();
                }
                setOpen(false);
              } catch (error) {
                setFailure(errorMessage(error));
              } finally {
                setPending(false);
              }
            }}
          >
            {!editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    key: "name",
                    label: "Full name",
                    type: "text",
                    required: true,
                  },
                  {
                    key: "phone",
                    label: "Phone number",
                    type: "tel",
                    required: true,
                  },
                  {
                    key: "email",
                    label: "Login email (optional)",
                    type: "email",
                    required: false,
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={`pro-${field.key}`}
                      className="provider-label"
                    >
                      {field.label}
                    </label>
                    <Input
                      id={`pro-${field.key}`}
                      name={field.key}
                      type={field.type}
                      required={field.required}
                      maxLength={
                        field.key === "email"
                          ? 254
                          : field.key === "phone"
                            ? 20
                            : 100
                      }
                      className="h-11"
                    />
                  </div>
                ))}
                <p className="text-xs leading-6 text-muted-foreground">
                  If email is omitted, the generated login identifier appears in
                  the credential panel. It is not an email delivery address.
                </p>
              </div>
            )}
            {catalog.data && (
              <SkillPicker
                catalog={catalog.data}
                value={skills}
                change={setSkills}
                retained={editing?.skillKeys || []}
              />
            )}
            {editing?.skills.length && !editing.skillKeys?.length ? (
              <p className="text-xs leading-6 text-muted-foreground">
                Previously saved skills: {editing.skills.join(", ")}. Select
                catalog skills to replace these labels with validated keys.
              </p>
            ) : null}
            <div>
              <label htmlFor="pro-vehicle" className="provider-label">
                Vehicle information (optional)
              </label>
              <Input
                id="pro-vehicle"
                name="vehicleType"
                maxLength={80}
                defaultValue={editing?.vehicleType || ""}
                className="h-11"
              />
            </div>
            {editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pro-status" className="provider-label">
                    Work status
                  </label>
                  <select
                    id="pro-status"
                    name="status"
                    className="customer-select"
                    defaultValue={
                      editing.status === "busy" ? "" : editing.status
                    }
                    disabled={editing.status === "busy"}
                  >
                    <option value="">Assigned job controls busy status</option>
                    <option value="offline">Offline</option>
                    <option value="available">Available</option>
                    <option value="on_leave">On leave</option>
                  </select>
                </div>
                <label className="flex min-h-11 items-center gap-3 self-end text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editing.isActive}
                    className="size-4 accent-primary"
                  />
                  Active team member
                </label>
              </div>
            )}
            <Feedback message={failure} error />
            <Button
              type="submit"
              className="h-11 px-6"
              disabled={pending || create.isPending}
            >
              {pending || create.isPending
                ? "Saving…"
                : editing
                  ? "Save Pro details"
                  : "Create Pro & show initial password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <InitialCredentialDialog value={credential} clear={clearCredential} />
      <Dialog
        open={Boolean(reissue)}
        onOpenChange={(value) => {
          if (!pending && !value) setReissue(null);
        }}
      >
        <DialogContent className="w-[calc(100%_-_2rem)]! max-w-120! p-6">
          <DialogTitle>Reissue an initial password?</DialogTitle>
          <DialogDescription>
            This invalidates any previous initial credential and session. It
            works only before the Pro sets their own password; existing personal
            passwords cannot be retrieved or reset here.
          </DialogDescription>
          <Feedback message={failure} error />
          <Button
            className="h-11"
            disabled={pending}
            onClick={async () => {
              if (!reissue) return;
              setPending(true);
              setFailure("");
              try {
                const { data } = await api.post<Credential>(
                  `/service-provider/technicians/${reissue._id}/credential`,
                );
                setCredential(data);
                setReissue(null);
              } catch (error) {
                setFailure(errorMessage(error));
              } finally {
                setPending(false);
              }
            }}
          >
            Reissue & invalidate previous credential
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setReissue(null)}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
