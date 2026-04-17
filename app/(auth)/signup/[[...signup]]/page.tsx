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
    phone:z.string(),
});

type SignupData = z.infer<typeof SignupSchema>;



function SignUpPage() {
    const [errorMessage,setErrorMessage] = useState<string | null>(null);
    const [loading,setLoading] = useState(false);
    const [phoneMode,setPhoneMode] = useState(false);
    const [phone, setPhone] = useState("");
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
                window.location.href = "/customer"
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

    if (!phone) {
      setErrorMessage("Enter phone number with country code (e.g. +919876543210)");
      return;
    };

    //const cleanPhone = normalizePhone(phone_number);

    try {
        setLoading(true);
        const res = await axios.post("/api/auth/send-otp",{phone: phone});
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
        phone:phone,
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
    // <div className="min-h-screen flex items-center justify-center bg-muted p-4">
    //   <Card className="w-full max-w-2xl">
    //     <CardHeader>
    //       <CardTitle>Create your account</CardTitle>
    //     </CardHeader>
    //     <CardContent>
    //       {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
    //       {infoMessage && <Alert>{infoMessage}</Alert>}

    //       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
    //         <div>
    //           <Label>Name</Label>
    //           <Input placeholder="John Doe" {...register("name")} />
    //           {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
    //         </div>
    //         <div>
    //           <Label>Phone Number</Label>
    //           <Input placeholder="+91 9876543210" {...register("phone")} />
    //           {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
    //         </div>


    //         <div>
    //           <Label>Email</Label>
    //           <Input placeholder="john@doe.com" {...register("email")} />
    //           {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
    //         </div>

    //         <div>
    //           <Label>Password</Label>
    //           <Input type="password" placeholder="••••••••" {...register("password")} />
    //           {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
    //         </div>

    //         <Button type="submit" className="w-full" disabled={loading}>
    //           {loading ? "Creating..." : "Create account"}
    //         </Button>
    //       </form>

    //       <div className="my-4">
    //         <Separator />
    //         <div className="text-center py-3">or</div>
    //         <div className="flex gap-3 justify-center">
    //           <Button onClick={onGoogle} variant="outline">Continue with Google</Button>
    //           <Button onClick={() => setPhoneMode((v) => !v)} variant="ghost">Sign up with phone</Button>
    //         </div>
    //       </div>

    //       {phoneMode && (
    //         <div className="border rounded p-4">
    //           <Label>Phone (with country code)</Label>
    //           <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" />
    //           <div className="flex gap-2 mt-2">
    //             <Button onClick={sendOtp} disabled={loading}>
    //               {loading ? "Sending..." : "Send OTP"}
    //             </Button>
    //             <Button onClick={() => { setPhone(""); setCode(""); setOtpSent(false); }}>
    //               Reset
    //             </Button>
    //           </div>

    //           {otpSent && (
    //             <div className="mt-4">
    //               <Label>Enter OTP</Label>
    //               <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
    //               <Button className="mt-2" onClick={verifyOtpAndSignin} disabled={loading}>
    //                 {loading ? "Verifying..." : "Verify & Sign in"}
    //               </Button>
    //             </div>
    //           )}
    //         </div>
    //       )}
    //     </CardContent>

    //     <CardFooter>
    //       <div className="text-sm text-muted-foreground">
    //         Already have an account? <a href="/signin" className="text-primary underline">Sign in</a>
    //       </div>
    //     </CardFooter>
    //   </Card>
    // </div>

    // ✅ PROFESSIONAL SIGN UP PAGE (MATCHING SIGN IN STYLE)

<div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4">
  <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-blue-100 bg-white">

    {/* LEFT SIDE */}
    <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white p-10">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">ServiceFlow SaaS</h2>
        <p className="mt-4 text-sm text-white/80">
          Start managing your service business with a modern and powerful platform.
        </p>
      </div>

      <div className="space-y-4 text-sm">
        <p>✔ Smart Booking Management</p>
        <p>✔ Technician Tracking System</p>
        <p>✔ Invoice & Payment Automation</p>
        <p>✔ Real-time Notifications</p>
      </div>

      <p className="text-xs text-white/70">Built for scalable service businesses</p>
    </div>

    {/* RIGHT SIDE */}
    <div className="p-6 sm:p-10">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Create your account 🚀
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Get started in seconds and manage everything in one place
          </p>
        </div>

        {errorMessage && <Alert variant="destructive" className="mb-4">{errorMessage}</Alert>}
        {infoMessage && <Alert className="mb-4">{infoMessage}</Alert>}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div>
            <Label className="text-sm font-medium text-slate-700">Full Name</Label>
            <Input className="mt-1" placeholder="John Doe" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Phone Number</Label>
            <Input className="mt-1" placeholder="+91 9876543210" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Email</Label>
            <Input className="mt-1" placeholder="john@doe.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Password</Label>
            <Input className="mt-1" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">OR</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Social */}
        <div className="flex gap-3">
          <Button onClick={onGoogle} variant="outline" className="w-full">
            Google
          </Button>
          <Button onClick={() => setPhoneMode((v) => !v)} variant="ghost" className="w-full">
            Phone
          </Button>
        </div>

        {/* OTP */}
        {phoneMode && (
          <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
            <Label className="text-sm font-medium text-slate-700">Phone</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />

            <div className="flex gap-2 mt-3">
              <Button onClick={sendOtp} disabled={loading} className="flex-1">
                {loading ? "Sending..." : "Send OTP"}
              </Button>
              <Button variant="outline" onClick={() => { setPhone(""); setCode(""); setOtpSent(false); }}>
                Reset
              </Button>
            </div>

            {otpSent && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-slate-700">Enter OTP</Label>
                <Input className="mt-1" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
                <Button className="mt-3 w-full" onClick={verifyOtpAndSignin} disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign up"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-sm text-slate-500 mt-6 text-center">
          Already have an account? <a href="/signin" className="text-blue-600 font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  </div>
</div>

  )
}

export default SignUpPage;