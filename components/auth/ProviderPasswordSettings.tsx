"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { changePasswordInput, passwordPolicyText } from "@/lib/password-policy";
import {
  passwordFieldErrors,
  passwordRequestFailure,
} from "@/lib/password-client";
import { signOut } from "@/lib/push-client";
import api from "@/lib/api";

function ChangePasswordForm({
  completed,
  pending,
}: {
  completed: () => void;
  pending: (busy: boolean) => void;
}) {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    submitting = useRef(false);
  return (
    <form
      noValidate
      aria-busy={busy}
      className="mt-5 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        setErrors({});
        setError("");
        const parsed = changePasswordInput.safeParse(values);
        if (!parsed.success) {
          setErrors(passwordFieldErrors(parsed.error));
          setError("Check the highlighted fields.");
          return;
        }
        submitting.current = true;
        setBusy(true);
        pending(true);
        try {
          const { data } = await api.post(
            "/service-provider/change-password",
            parsed.data,
          );
          if (data?.success !== true || data?.signInRequired !== true)
            throw new Error("Unconfirmed mutation");
          setValues({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          completed();
        } catch (failure) {
          setError(passwordRequestFailure(failure));
        } finally {
          submitting.current = false;
          setBusy(false);
          pending(false);
        }
      }}
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-border bg-muted p-4 text-sm leading-6"
        >
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">Change password details</legend>
        <PasswordInput
          id="provider-current-password"
          label="Current Password"
          current
          value={values.currentPassword}
          onChange={(currentPassword) =>
            setValues((value) => ({ ...value, currentPassword }))
          }
          error={errors.currentPassword}
        />
        <p className="text-xs leading-6 text-muted-foreground">
          {passwordPolicyText}
        </p>
        <PasswordInput
          id="provider-new-password"
          label="New Password"
          value={values.newPassword}
          onChange={(newPassword) =>
            setValues((value) => ({ ...value, newPassword }))
          }
          error={errors.newPassword}
        />
        <PasswordInput
          id="provider-confirm-password"
          label="Confirm New Password"
          value={values.confirmPassword}
          onChange={(confirmPassword) =>
            setValues((value) => ({ ...value, confirmPassword }))
          }
          error={errors.confirmPassword}
        />
        <Button type="submit" className="h-12 w-full">
          {busy && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {busy ? "Updating password…" : "Change Password"}
        </Button>
      </fieldset>
      <p className="text-xs leading-6 text-muted-foreground">
        If you normally use Google, you can continue with Google. Verify your
        mailbox through{" "}
        <Link
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          href="/forgot-password"
        >
          Forgot Password
        </Link>{" "}
        to recover access. Accounts without a stored password cannot use this
        dialog.
      </p>
    </form>
  );
}
export function ProviderPasswordSettings() {
  const [open, setOpen] = useState(false),
    [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <section
      aria-labelledby="password-settings-title"
      className="provider-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="password-settings-title"
            className="flex items-center gap-2 font-semibold"
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            Account security
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            Change the password you use to sign in to Servizato.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => {
            setComplete(false);
            setOpen(true);
          }}
        >
          Change Password
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          if (complete && !next) {
            void signOut({ callbackUrl: "/signin" });
            return;
          }
          setOpen(next);
        }}
      >
        <DialogContent
          showCloseButton={!pending}
          className="w-[calc(100%_-_2rem)]! max-w-lg! max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:p-7"
        >
          <DialogTitle>
            {complete ? "Password updated" : "Change Password"}
          </DialogTitle>
          <DialogDescription>
            {complete
              ? "Your previous sessions have been revoked. Sign in again on all devices to continue."
              : "Confirm your current password before choosing a new one. You will need to sign in again on all devices."}
          </DialogDescription>
          {complete ? (
            <div className="mt-4 space-y-5">
              <p role="status" className="text-sm leading-7">
                Your password has been changed successfully.
              </p>
              <Button
                className="h-12 w-full"
                onClick={() => signOut({ callbackUrl: "/signin" })}
              >
                Sign in again
              </Button>
            </div>
          ) : (
            <ChangePasswordForm
              key={open ? "open" : "closed"}
              completed={() => setComplete(true)}
              pending={setPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
