// app/profile/complete/CompleteProfileForm.tsx
"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface Props {
  initialName?: string;
  initialEmail?: string;
}

export default function CompleteProfileForm({ initialName = "", initialEmail = "" }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name || !email) {
      setErr("Please provide both name and email.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("/api/auth/complete-profile", { name, email });
      if (res.data?.error) {
        setErr(res.data.error);
      } else {
        // redirect to dashboard
        router.push("/dashboard");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
        </CardHeader>

        <CardContent>
          {err && <Alert variant="destructive">{err}</Alert>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="text-sm text-muted-foreground">
              This will be used for receipts and communications.
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save & Continue"}
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Signed in as: <strong>{(session as any)?.user?.email || (session as any)?.user?.name}</strong>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}