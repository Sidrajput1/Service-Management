"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { LoginInput } from "@/components/ui/login-input";

function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if ((res as any)?.error) {
        setErr((res as any).error);
      } else {
        // after sign in , always send user to profile completion flow.
        // that page will redirect to dashboard if profile is already complete.

        router.push("/profile/complete");
      }
    } catch (error: any) {
      setErr(error?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  // gotr goole auth

  async function handleGoogle() {
    // redirect handled by next-auth
    await signIn("google", { callbackUrl: "/profile/complete" });
  }

  // Send OTP
  async function sendOtp() {
    setErr(null);
    setInfo(null);
    if (!phone) {
      setErr("Please enter phone with country code (e.g., +9198...)");
      return;
    }
    try {
      setLoading(true);
      const r = await axios.post("/api/auth/send-otp", { phone });
      if (r.data?.error) setErr(r.data.error);
      else {
        setOtpSent(true);
        setInfo("OTP sent. It expires in 5 minutes.");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpAndSignIn() {
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        phone,
        otp,
      });
      if ((res as any)?.error) {
        setErr((res as any).error || "Unable to sign in with OTP");
      } else {
        router.push("/profile/complete");
      }
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-white via-white to-zinc-50">
      <div className="absolute left-1/2 top-0 h-100 w-150 -translate-x-1/2 rounded-full bg-brand-coral/8 blur-[120px]" />
      <div className="absolute right-0 top-1/3 h-75 w-75 rounded-full bg-brand-teal/8 blur-[100px]" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Link
          href="/"
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 text-sm dark:text-muted text-muted-foreground transition hover:text-secondary-foreground sm:left-6 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-6xl overflow-hidden rounded-3xl border border-border/60 bg-white shadow-2xl shadow-brand-coral/5 lg:grid lg:grid-cols-2"
        >
          {/* LEFT — Branding panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-brand-coral-dark via-brand-coral to-brand-coral-dark p-10 text-white lg:flex">
            <div className="absolute inset-0 bg-grid opacity-10" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-10 top-1/3 h-40 w-40 rounded-full bg-brand-teal/20 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2.5 ">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Zap className="h-5 w-5 b" fill="currentcolor" />
                </div>
                <div className="flex flex-col leading-none ">
                  <span className="font-poppins text-lg font-bold tracking-tight text-white">
                    Servi<span className="text-[#140307]">zato</span>
                  </span>

                  <span className="mt-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Services Made Simple
                  </span>
                </div>
              </div>

              <h2 className="mt-10 font-display text-3xl font-bold leading-tight tracking-tight text-balance">
                The marketplace that runs itself
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/80">
                Customers find trusted technicians. Providers manage their
                business. Servfast handles discovery, matching, booking,
                payments, and reviews.
              </p>
            </div>

            <div className="relative space-y-3.5">
              {[
                { icon: CheckCircle2, text: "Smart discovery & matching" },
                { icon: ShieldCheck, text: "OTP-verified job workflow" },
                { icon: Zap, text: "Automated invoices & payments" },
                { icon: Sparkles, text: "Role-based dashboards for everyone" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-white/90">{item.text}</span>
                  </div>
                );
              })}
            </div>

            <div className="relative flex items-center gap-3 border-t border-white/15 pt-6">
              <div className="flex -space-x-2">
                {["R", "B", "A", "C"].map((initial, i) => (
                  <div
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-coral-dark bg-linear-to-br from-white/30 to-white/10 text-xs font-semibold backdrop-blur-sm"
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/70">
                Trusted by 200+ providers and 4,800+ customers
              </p>
            </div>
          </div>

          {/* RIGHT — Form panel */}
          <div className="bg-white p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              {/* Mobile logo */}
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25">
                  <Zap className="h-5 w-5" fill="currentColor" />
                </div>
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  Serv<span className="text-brand-coral">fast</span>
                </span>
              </div>

              {/* Header */}
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold tracking-tight text-black">
                  Welcome back
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to continue managing your services
                </p>
              </div>

              {err && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert className="mb-4 border-brand-teal/20 bg-brand-teal/5 text-brand-teal-dark">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{info}</AlertDescription>
                </Alert>
              )}

              {/* Email Login */}
              <form onSubmit={onSignIn} className="space-y-4">
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium dark:text-background text-foreground"
                  >
                    Email
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    {/* <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10 bg-white"
                    /> */}
                    <LoginInput
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium dark:text-background text-foreground"
                    >
                      Password
                    </Label>
                    <Link
                      href="/signin"
                      className="text-xs font-medium text-brand-coral transition hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    {/* <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                    /> */}
                    <LoginInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-linear-to-r from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 transition hover:shadow-xl hover:shadow-brand-coral/40"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">
                  OR
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Social Login */}
              <Button
                onClick={handleGoogle}
                variant="link"
                className="w-full border-border dark:text-background text-foreground  transition hover:bg-accent-foreground"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* OTP Section */}
              <div className="mt-6 rounded-2xl border border-border/60 bg-muted/0 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-teal-dark" />
                  <Label className="text-sm font-medium text-foreground dark:text-background">
                    Sign in with phone
                  </Label>
                </div>
                <LoginInput
                  className="mt-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                />

                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={sendOtp}
                    disabled={loading}
                    className="flex-1 bg-linear-to-r from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/25 transition hover:shadow-xl hover:shadow-brand-teal/40"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhone("");
                      setOtp("");
                      setOtpSent(false);
                    }}
                  >
                    Reset
                  </Button>
                </div>

                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 border-t border-border/60 pt-4"
                  >
                    <Label className="text-sm font-medium text-foreground">
                      Enter OTP
                    </Label>
                    <Input
                      className="mt-1.5"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                    />
                    <Button
                      className="mt-3 w-full bg-linear-to-r from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/25 transition hover:shadow-xl hover:shadow-brand-teal/40"
                      onClick={verifyOtpAndSignIn}
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify & Sign in"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-brand-coral transition hover:underline"
                >
                  Create account
                </Link>
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-brand-teal" />
                Want to explore first?{" "}
                <Link
                  href="/demo"
                  className="font-medium text-brand-teal-dark transition hover:underline"
                >
                  Try the demo
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
  {
    /* <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4">
  <div className="absolute left-1/2 top-0 h-100 w-150 -translate-x-1/2 rounded-full bg-brand-coral/8 blur-[120px]" />
      <div className="absolute right-0 top-1/3 h-75 w-75 rounded-full bg-brand-teal/8 blur-[100px]" />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <Link
          href="/"
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground sm:left-6 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

  <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-blue-100 bg-white">

    
    <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white p-10">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">ServiceFlow SaaS</h2>
        <p className="mt-4 text-sm text-white/80">
          Manage bookings, technicians, payments, and customers — all in one modern platform.
        </p>
      </div>

      <div className="space-y-4 text-sm">
        <p>✔ Booking & Job Management</p>
        <p>✔ Technician Workflow Tracking</p>
        <p>✔ Invoice & Razorpay Payments</p>
        <p>✔ Role-based Dashboards</p>
      </div>

      <p className="text-xs text-white/70">Built for modern service businesses</p>
    </div>

   
    <div className="p-6 sm:p-10 bg-slate-900">
      <div className="max-w-md mx-auto">

        
        <div className="mb-6 ">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome back 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to continue managing your services
          </p>
        </div>

        {err && <Alert variant="destructive" className="mb-4">{err}</Alert>}
        {info && <Alert className="mb-4">{info}</Alert>}

        
        <form onSubmit={onSignIn} className="space-y-4 ">
          <div>
            <Label className="text-sm font-medium text-slate-100 ">Email</Label>
            <Input className="mt-1 " value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-200">Password</Label>
            <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <Button type="submit" className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

       
        <div className="flex  gap-3">
          <Button onClick={handleGoogle}  className="w-full bg-linear-to-r  from-blue-600 via-indigo-600 to-cyan-500 hover:to-indigo-700 text-slate-100 font-bold">
            Use Google
          </Button>
           <Button onClick={() => { setOtpSent(false); setInfo(null); setErr(null); }} variant="default" className="w-full">
            Phone
          </Button> 
        </div>

        
        <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-900">
          <Label className="text-sm font-medium text-slate-100">Phone</Label>
          <Input className="mt-1 text-slate-100" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />

          <div className="flex gap-2 mt-3">
            <Button onClick={sendOtp} disabled={loading} className="flex-1 bg-linear-to-r  from-blue-600 via-indigo-600 to-cyan-500 hover:to-indigo-700 text-white">
              {loading ? "Sending..." : "Send OTP"}
            </Button>
            <Button variant="outline" onClick={() => { setPhone(""); setOtp(""); setOtpSent(false); }}>
              Reset
            </Button>
          </div>

          {otpSent && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-slate-700">Enter OTP</Label>
              <Input className="mt-1" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
              <Button className="mt-3 w-full" onClick={verifyOtpAndSignIn} disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign in"}
              </Button>
            </div>
          )}
        </div>

        
        <p className="text-sm text-slate-500 mt-6 text-center">
          New here? <a href="/signup" className="text-blue-600 font-medium hover:underline">Create account</a>
        </p>
      </div>
    </div>
  </div>
  </div>
</div> */
  }
}

export default SignIn;
