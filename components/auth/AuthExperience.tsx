"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Wrench } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  safeCustomerDestination,
  profileCompletionHref,
  authHref,
} from "@/lib/booking-redirect";
import { Feedback, errorMessage } from "@/components/provider/ProviderUi";
import api from "@/lib/api";

function PasswordField({
  id,
  name = "password",
  label = "Password",
  minLength = 6,
  autoComplete = "current-password",
}: {
  id: string;
  name?: string;
  label?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="provider-label">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          maxLength={72}
          autoComplete={autoComplete}
          className="h-12 pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-lg text-muted-foreground"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
export function AuthExperience({ signup = false }: { signup?: boolean }) {
  const params = useSearchParams();
  const destination = safeCustomerDestination(params.get("callbackUrl")),
    completion = profileCompletionHref(destination);
  const [role, setRole] = useState(
      params.get("role") === "provider" ? "provider" : "customer",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState(""),
    [phoneMode, setPhoneMode] = useState(false),
    [otpSent, setOtpSent] = useState(false),
    [phone, setPhone] = useState("");
  async function finish() {
    const session = await getSession();
    window.location.assign(
      session?.user.mustChangePassword
        ? "/change-password"
        : signup && role === "provider"
          ? "/service-provider/onboarding"
          : completion,
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    const fields = new FormData(event.currentTarget);
    try {
      if (phoneMode && !otpSent) {
        await api.post("/auth/send-otp", { phone });
        setOtpSent(true);
        setInfo("Code sent. It expires in five minutes.");
        return;
      }
      const email = String(fields.get("email") || "")
          .trim()
          .toLowerCase(),
        password = String(fields.get("password") || "");
      if (signup && !phoneMode) {
        const payload =
          role === "provider"
            ? {
                ownerName: fields.get("name"),
                companyName: fields.get("companyName"),
                businessType: fields.get("businessType"),
                city: fields.get("city"),
                state: fields.get("state"),
                email,
                password,
                phone: fields.get("phone"),
              }
            : {
                name: fields.get("name"),
                email,
                password,
                phone: fields.get("phone"),
              };
        await api.post(
          `/auth/signup/${role === "provider" ? "provider" : "customer"}`,
          payload,
        );
      }
      const result = await signIn("credentials", {
        redirect: false,
        ...(phoneMode
          ? { phone, otp: String(fields.get("otp") || "") }
          : { email, password }),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      await finish();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main
        id="main-content"
        className="public-container grid min-h-[75vh] items-center gap-12 py-12 lg:grid-cols-[.8fr_1.2fr]"
      >
        <section className="hidden max-w-md lg:block">
          <p className="public-eyebrow">ALL YOUR SERVICES, ONE PLACE</p>
          <h2 className="public-section-title mt-4">
            {signup
              ? "A little help.\nA lot more possible."
              : "Your everyday,\nmade a little easier."}
          </h2>
          <p className="mt-6 text-sm leading-8 text-muted-foreground">
            Customers find service teams. Businesses manage their services,
            coverage and Pros. Stay connected from the first request to the
            finishing touches.
          </p>
          <div className="mt-8 space-y-4 text-sm">
            <p className="flex items-center gap-3">
              <Wrench className="size-5 text-primary" />A clear service menu and
              your own prices
            </p>
            <p className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-secondary-foreground" />
              Your bookings and account, kept together
            </p>
          </div>
        </section>
        <section className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {signup ? "Create your Servizato account" : "Welcome back"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {signup
              ? "Choose a customer account or register your service business."
              : "Sign in to your account and pick up where you left off."}
          </p>
          {signup && (
            <div
              role="group"
              aria-label="Registration account type"
              className="my-6 grid grid-cols-2 gap-2 rounded-xl border border-border p-1"
            >
              {["customer", "provider"].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  aria-pressed={role === value}
                  onClick={() => {
                    setRole(value);
                    setPhoneMode(false);
                    setError("");
                  }}
                  className={`min-h-11 rounded-lg text-xs font-semibold ${role === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {value === "customer" ? "Customer" : "Service business"}
                </button>
              ))}
            </div>
          )}
          <div className="my-5 space-y-3">
            <Feedback message={error} error />
            <Feedback message={info} />
          </div>
          <form className="space-y-5" onSubmit={submit}>
            {phoneMode ? (
              <>
                <div>
                  <label htmlFor="auth-otp-phone" className="provider-label">
                    Phone number with country code
                  </label>
                  <Input
                    id="auth-otp-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    maxLength={20}
                    placeholder="+919876543210"
                    disabled={otpSent}
                    className="h-12"
                  />
                </div>
                {otpSent && (
                  <div>
                    <label htmlFor="auth-otp" className="provider-label">
                      Verification code
                    </label>
                    <Input
                      id="auth-otp"
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="h-12"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {signup && (
                  <div>
                    <label htmlFor="auth-name" className="provider-label">
                      {role === "provider"
                        ? "Business owner name"
                        : "Full name"}
                    </label>
                    <Input
                      id="auth-name"
                      name="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      className="h-12"
                    />
                  </div>
                )}
                {signup && role === "provider" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["companyName", "Business name"],
                      ["businessType", "Business type"],
                      ["city", "City"],
                      ["state", "State"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label
                          htmlFor={`auth-${key}`}
                          className="provider-label"
                        >
                          {label}
                        </label>
                        <Input
                          id={`auth-${key}`}
                          name={key}
                          required={key === "companyName"}
                          maxLength={120}
                          className="h-12"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label htmlFor="auth-email" className="provider-label">
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className="h-12"
                  />
                </div>
                {signup && (
                  <div>
                    <label htmlFor="auth-phone" className="provider-label">
                      Phone number with country code
                    </label>
                    <Input
                      id="auth-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={20}
                      placeholder="+919876543210"
                      className="h-12"
                    />
                  </div>
                )}
                <PasswordField
                  id="auth-password"
                  minLength={signup ? 6 : 1}
                  autoComplete={signup ? "new-password" : "current-password"}
                />
              </>
            )}
            <Button
              type="submit"
              className="public-button public-button-primary w-full"
              disabled={busy}
            >
              {busy
                ? "Please wait…"
                : phoneMode
                  ? otpSent
                    ? "Verify code & sign in"
                    : "Send verification code"
                  : signup
                    ? "Create account"
                    : "Sign in"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
          {(!signup || role === "customer") && (
            <div className="mt-5 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full"
                disabled={busy}
                onClick={() => {
                  setPhoneMode(!phoneMode);
                  setOtpSent(false);
                  setError("");
                  setInfo("");
                }}
              >
                {phoneMode
                  ? "Use email & password"
                  : "Use a phone verification code"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full"
                disabled={busy}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    await signIn("google", { callbackUrl: completion });
                  } catch {
                    setError("Google sign-in is temporarily unavailable.");
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </Button>
            </div>
          )}
          {signup && role === "provider" && (
            <p className="mt-5 text-xs leading-6 text-muted-foreground">
              After registration, set up your business profile, services,
              coverage and team. Your business must be approved before it
              appears in customer search.
            </p>
          )}
          <p className="mt-7 text-center text-xs text-muted-foreground">
            {signup ? "Already have an account?" : "New to Servizato?"}{" "}
            <Link
              className="font-bold text-primary underline underline-offset-4"
              href={authHref(signup ? "/signin" : "/signup", destination)}
            >
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
export function InitialPasswordChange() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="public-site min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main
        className="public-container flex min-h-[75vh] items-center justify-center py-12"
        id="main-content"
      >
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7">
          <h1 className="font-display text-2xl font-semibold">
            Make this account yours
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Replace the initial password from your provider with a private
            password of at least 12 characters. Your initial credential and
            existing sessions will stop working.
          </p>
          <form
            className="mt-6 space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              const fields = new FormData(event.currentTarget);
              if (fields.get("newPassword") !== fields.get("confirmation")) {
                setError("The new passwords do not match.");
                setBusy(false);
                return;
              }
              try {
                await api.post("/auth/change-password", {
                  currentPassword: fields.get("currentPassword"),
                  newPassword: fields.get("newPassword"),
                });
                await signOut({ redirect: false });
                window.location.assign("/signin");
              } catch (failure) {
                setError(errorMessage(failure));
                setBusy(false);
              }
            }}
          >
            <PasswordField
              id="initial-password"
              name="currentPassword"
              label="Initial password"
              minLength={1}
            />
            <PasswordField
              id="new-password"
              name="newPassword"
              label="Your new password"
              minLength={12}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-password"
              name="confirmation"
              label="Confirm your new password"
              minLength={12}
              autoComplete="new-password"
            />
            <Feedback message={error} error />
            <Button
              type="submit"
              className="public-button public-button-primary w-full"
              disabled={busy}
            >
              {busy ? "Updating password…" : "Set my password & sign in again"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
