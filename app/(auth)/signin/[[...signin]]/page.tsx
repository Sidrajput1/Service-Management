"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
  };

  // gotr goole auth

  async function handleGoogle() {
    // redirect handled by next-auth
    await signIn("google", { callbackUrl: "/profile/complete" });
  };

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
  };

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
  };

  return (
    // <div className="min-h-screen flex items-center justify-center bg-muted p-4">
    //   <Card className="w-full max-w-xl">
    //     <CardHeader>
    //       <CardTitle className="text-blue-800 font-bold">Sign in to your account</CardTitle>
    //     </CardHeader>
    //     <CardContent>
    //       {err && <Alert variant="destructive">{err}</Alert>}
    //       {info && <Alert>{info}</Alert>}

    //       {/* Email sign in */}
    //       <form onSubmit={onSignIn} className="space-y-3">
    //         <div>
    //           <Label>Email</Label>
    //           <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
    //         </div>

    //         <div>
    //           <Label>Password</Label>
    //           <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
    //         </div>

    //         <Button type="submit" className="w-full" disabled={loading}>
    //           {loading ? "Signing in..." : "Sign in"}
    //         </Button>
    //       </form>

    //       <div className="my-4">
    //         <Separator />
    //         <div className="text-center py-3">or</div>
    //         <div className="flex gap-3 justify-center">
    //           <Button onClick={handleGoogle} variant="outline">Continue with Google</Button>
    //           <Button onClick={() => { setOtpSent(false); setInfo(null); setErr(null); }} variant="ghost">Sign in with phone</Button>
    //         </div>
    //       </div>

    //       {/* Phone OTP */}
    //       <div className="border rounded p-4">
    //         <Label>Phone (with country code)</Label>
    //         <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
    //         <div className="flex gap-2 mt-2">
    //           <Button onClick={sendOtp} disabled={loading}>
    //             {loading ? "Sending..." : "Send OTP"}
    //           </Button>
    //           <Button onClick={() => { setPhone(""); setOtp(""); setOtpSent(false); setErr(null); }}>
    //             Reset
    //           </Button>
    //         </div>

    //         {otpSent && (
    //           <div className="mt-4">
    //             <Label>Enter OTP</Label>
    //             <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
    //             <Button className="mt-2" onClick={verifyOtpAndSignIn} disabled={loading}>
    //               {loading ? "Verifying..." : "Verify & Sign in"}
    //             </Button>
    //           </div>
    //         )}
    //       </div>
    //     </CardContent>

    //     <CardFooter>
    //       <div className="text-sm text-muted-foreground">
    //         New here? <a href="/signup" className="text-primary underline">Create an account</a>
    //       </div>
    //     </CardFooter>
    //   </Card>
    // </div>
    // ✅ PROFESSIONAL AUTH UI (SIGN IN + SIGN UP STYLE UPGRADE)
// Clean SaaS style with gradient background, better spacing, and polished UI

<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4">
  <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-blue-100 bg-white">

    {/* LEFT SIDE (Branding / Info Panel) */}
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

    {/* RIGHT SIDE (FORM) */}
    <div className="p-6 sm:p-10">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Welcome back 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to continue managing your services
          </p>
        </div>

        {err && <Alert variant="destructive" className="mb-4">{err}</Alert>}
        {info && <Alert className="mb-4">{info}</Alert>}

        {/* Email Login */}
        <form onSubmit={onSignIn} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">Email</Label>
            <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Password</Label>
            <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <Button type="submit" className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Social Login */}
        <div className="flex gap-3">
          <Button onClick={handleGoogle} variant="outline" className="w-full">
            Google
          </Button>
          <Button onClick={() => { setOtpSent(false); setInfo(null); setErr(null); }} variant="ghost" className="w-full">
            Phone
          </Button>
        </div>

        {/* OTP Section */}
        <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
          <Label className="text-sm font-medium text-slate-700">Phone</Label>
          <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />

          <div className="flex gap-2 mt-3">
            <Button onClick={sendOtp} disabled={loading} className="flex-1">
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

        {/* Footer */}
        <p className="text-sm text-slate-500 mt-6 text-center">
          New here? <a href="/signup" className="text-blue-600 font-medium hover:underline">Create account</a>
        </p>
      </div>
    </div>
  </div>
</div>

  );
}

export default SignIn;
