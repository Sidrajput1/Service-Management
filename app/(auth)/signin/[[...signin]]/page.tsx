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
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          {err && <Alert variant="destructive">{err}</Alert>}
          {info && <Alert>{info}</Alert>}

          {/* Email sign in */}
          <form onSubmit={onSignIn} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="my-4">
            <Separator />
            <div className="text-center py-3">or</div>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleGoogle} variant="outline">Continue with Google</Button>
              <Button onClick={() => { setOtpSent(false); setInfo(null); setErr(null); }} variant="ghost">Sign in with phone</Button>
            </div>
          </div>

          {/* Phone OTP */}
          <div className="border rounded p-4">
            <Label>Phone (with country code)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
            <div className="flex gap-2 mt-2">
              <Button onClick={sendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
              <Button onClick={() => { setPhone(""); setOtp(""); setOtpSent(false); setErr(null); }}>
                Reset
              </Button>
            </div>

            {otpSent && (
              <div className="mt-4">
                <Label>Enter OTP</Label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                <Button className="mt-2" onClick={verifyOtpAndSignIn} disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign in"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <div className="text-sm text-muted-foreground">
            New here? <a href="/signup" className="text-primary underline">Create an account</a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignIn;
