"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  forgotPasswordInput,
  genericResetResponse,
  passwordPolicyText,
  resetPasswordInput,
} from "@/lib/password-policy";
import {
  passwordFieldErrors,
  passwordRequestFailure,
} from "@/lib/password-client";
import { signOut } from "@/lib/push-client";
import api from "@/lib/api";

export function PasswordRecoveryPage({
  reset = false,
  initialToken = "",
}: {
  reset?: boolean;
  initialToken?: string;
}) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [values, setValues] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const submitting = useRef(false),
    captured = useRef(false);
  useEffect(() => {
    if (!reset || captured.current) return;
    captured.current = true;
    const value = new URL(window.location.href).searchParams.get("token") || "";
    setToken(/^[a-f\d]{64}$/i.test(value) ? value : "");
    // Keep the bearer credential in component memory, never browser persistence/history URLs.
    //window.history.replaceState(window.history.state, "", "/reset-password");
  }, [reset]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setErrors({});
    const result = reset
      ? resetPasswordInput.safeParse({ ...values, token })
      : forgotPasswordInput.safeParse({ email });
    if (!result.success) {
      setErrors(passwordFieldErrors(result.error));
      setError("Check the highlighted fields.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const { data } = await api.post(
        reset ? "/auth/reset-password" : "/auth/forgot-password",
        result.data,
      );
      if (reset && (data?.success !== true || data?.signInRequired !== true))
        throw new Error("Unconfirmed mutation");
      if (!reset && data?.message !== genericResetResponse)
        throw new Error("Unconfirmed request");
      setComplete(true);
      setValues({ newPassword: "", confirmPassword: "" });
      setToken("");
      setEmail("");
    } catch (failure) {
      setError(passwordRequestFailure(failure));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <main
        id="main-content"
        className="public-container flex min-h-screen flex-col items-center justify-center gap-8 py-10 sm:py-16"
      >
        <Link
          href="/"
          aria-label="Servizato home"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandLogo priority />
        </Link>
        <section
          aria-labelledby="recovery-title"
          className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9"
        >
          <ShieldCheck
            aria-hidden="true"
            className="mb-4 size-8 text-foreground"
          />
          <h1
            id="recovery-title"
            className="text-2xl font-semibold tracking-tight"
          >
            {reset ? "Reset Password" : "Forgot Password?"}
          </h1>
          {complete ? (
            <div role="status" className="mt-6 space-y-5">
              <CheckCircle2 aria-hidden="true" className="size-7" />
              <p className="text-sm leading-7">
                {reset
                  ? "Your password has been updated. Sign in again on all devices to continue."
                  : genericResetResponse}
              </p>
              {!reset && (
                <p className="text-sm leading-7 text-muted-foreground">
                  If instructions arrive, use the most recent link within 30
                  minutes. You can request another link after a minute. You may
                  also continue with Google or your existing phone sign-in.
                </p>
              )}
              {reset ? (
                <Button
                  className="h-12 w-full"
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                >
                  Back to Sign In
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-12 w-full"
                    onClick={() => setComplete(false)}
                  >
                    Request another link
                  </Button>
                  <Link
                    href="/signin"
                    className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to Sign In
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {reset
                  ? "Choose a new password for your account. Your reset link is checked securely when you submit."
                  : "Enter your registered email address to request a secure password reset link."}
              </p>
              {reset && token === null ? (
                <p role="status" className="mt-6 text-sm">
                  Checking the reset link…
                </p>
              ) : reset && !token ? (
                <div className="mt-6 space-y-4">
                  <p role="alert" className="text-sm leading-7">
                    This reset link is missing or invalid. Request a new link to
                    continue.
                  </p>
                  <Link
                    href="/forgot-password"
                    className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Request a new reset link
                  </Link>
                </div>
              ) : (
                <form
                  noValidate
                  aria-busy={busy}
                  className="mt-6 space-y-5"
                  onSubmit={submit}
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
                    <legend className="sr-only">
                      {reset ? "New password details" : "Registered email"}
                    </legend>
                    {reset ? (
                      <>
                        <p className="text-xs leading-6 text-muted-foreground">
                          {passwordPolicyText} Temporary Pro credentials require
                          at least 12 characters.
                        </p>
                        <PasswordInput
                          id="reset-new-password"
                          label="New Password"
                          value={values.newPassword}
                          onChange={(newPassword) =>
                            setValues((current) => ({
                              ...current,
                              newPassword,
                            }))
                          }
                          error={errors.newPassword}
                        />
                        <PasswordInput
                          id="reset-confirm-password"
                          label="Confirm New Password"
                          value={values.confirmPassword}
                          onChange={(confirmPassword) =>
                            setValues((current) => ({
                              ...current,
                              confirmPassword,
                            }))
                          }
                          error={errors.confirmPassword}
                        />
                      </>
                    ) : (
                      <div className="space-y-2">
                        <label
                          className="provider-label"
                          htmlFor="recovery-email"
                        >
                          Registered email address
                        </label>
                        <Input
                          id="recovery-email"
                          type="email"
                          autoComplete="email"
                          required
                          maxLength={254}
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={
                            errors.email ? "recovery-email-error" : undefined
                          }
                          className="h-12"
                        />
                        {errors.email && (
                          <p
                            id="recovery-email-error"
                            className="text-sm font-medium text-foreground"
                          >
                            {errors.email}
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="h-12 w-full whitespace-normal"
                    >
                      {busy && (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      )}
                      {busy
                        ? "Please wait…"
                        : reset
                          ? "Reset Password"
                          : "Send Reset Link"}
                    </Button>
                  </fieldset>
                </form>
              )}
              <Link
                href="/signin"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to Sign In
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
