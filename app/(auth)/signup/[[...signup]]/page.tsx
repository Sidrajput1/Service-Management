'use client';
import React, { useState } from 'react'
import { z } from 'zod';
import {useForm} from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import axios from 'axios';
import { signIn } from 'next-auth/react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert } from "@/components/ui/alert";

const SignupSchema = z.object({
    name:z.string().min(2,"name too short"),
    email:z.string().email("Invalid mail"),
    password:z.string().min(6,"Password must be atleast 6 chars"),
    phone:z.string().optional(),
});

type SignupData = z.infer<typeof SignupSchema>;



function SignUpPage() {
    const [errorMessage,setErrorMessage] = useState<string | null>(null);
    const [loading,setLoading] = useState(false);
    const [phoneMode,setPhoneMode] = useState(false);
    const [phone_number, setPhone_number] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {register,handleSubmit,formState:{errors}} = useForm<SignupData>({resolver:zodResolver(SignupSchema)});

  async function onSubmit(data:SignupData){
    setLoading(true);
    setErrorMessage(null);

    try {
        const res = await axios.post('/api/auth/signup',data);
        if(res?.data?.error){
            setErrorMessage(res.data.error);
        }else{
            // auto sign in after signup
            const signInRes = await signIn("credentials",{
                redirect:false,
                email:data.email,
                password:data.password
            });

            if((signInRes as any)?.error){
                setErrorMessage((signInRes as any).error)
            }else{
                window.location.href = "/dashboard"
            }
        }
    } catch (err : any) {
        setErrorMessage(err?.response?.data?.error ||  err.message);
    }finally{
        setLoading(false);
    }
  };

  async function onGoogle(){
    await signIn("google",{callbackUrl:"/profile/complete"});
  };

  function normalizePhone(phone_number:string){
    return phone_number.replace(/\D/g, "");
  }

  async function sendOtp(){
    setInfoMessage(null);
    setErrorMessage(null);

    if (!phone_number) {
      setErrorMessage("Enter phone number with country code (e.g. +919876543210)");
      return;
    };

    //const cleanPhone = normalizePhone(phone_number);

    try {
        setLoading(true);
        const res = await axios.post("/api/auth/send-otp",{phone: phone_number});
        if(res?.data?.error) setErrorMessage(res.data.error);
        else{
            setOtpSent(true);
            setInfoMessage("OTP sent = please check your phone.");
        }
    } catch (err:any) {
        setErrorMessage(err?.response?.data?.error || err.message);
    }finally {
      setLoading(false);
    }
  };

   async function verifyOtpAndSignin() {
    setErrorMessage(null);
    setLoading(true);
   // const cleanPhone = normalizePhone(phone_number);
   // console.log("Verifying OTP for phone:", cleanPhone);
    try {
      const signInRes = await signIn("credentials", {
        redirect: false,
        phone:phone_number,
        otp:code,
      });
     // console.log("SignIn response:", otp,phone);
      console.log("OTP signIn response:", signInRes);
      if ((signInRes as any)?.error) {
        setErrorMessage((signInRes as any).error || "Unable to sign in");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  }
   return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
          {infoMessage && <Alert>{infoMessage}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="+91 9876543210" {...register("phone")} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>


            <div>
              <Label>Email</Label>
              <Input placeholder="john@doe.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>

          <div className="my-4">
            <Separator />
            <div className="text-center py-3">or</div>
            <div className="flex gap-3 justify-center">
              <Button onClick={onGoogle} variant="outline">Continue with Google</Button>
              <Button onClick={() => setPhoneMode((v) => !v)} variant="ghost">Sign up with phone</Button>
            </div>
          </div>

          {phoneMode && (
            <div className="border rounded p-4">
              <Label>Phone (with country code)</Label>
              <Input value={phone_number} onChange={(e) => setPhone_number(e.target.value)} placeholder="+919876543210" />
              <div className="flex gap-2 mt-2">
                <Button onClick={sendOtp} disabled={loading}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
                <Button onClick={() => { setPhone_number(""); setCode(""); setOtpSent(false); }}>
                  Reset
                </Button>
              </div>

              {otpSent && (
                <div className="mt-4">
                  <Label>Enter OTP</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
                  <Button className="mt-2" onClick={verifyOtpAndSignin} disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign in"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Already have an account? <a href="/signin" className="text-primary underline">Sign in</a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default SignUpPage;