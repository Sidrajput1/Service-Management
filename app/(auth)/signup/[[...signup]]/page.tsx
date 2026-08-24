// "use client";
// import React, { useState } from "react";
// import { z } from "zod";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import axios from "axios";
// import { signIn } from "next-auth/react";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import { Alert } from "@/components/ui/alert";

// function SignUpPage() {
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [phoneMode, setPhoneMode] = useState(false);
//   const [phone, setPhone] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [code, setCode] = useState("");
//   const [infoMessage, setInfoMessage] = useState<string | null>(null);

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm<SignupData>({ resolver: zodResolver(SignupSchema) });

//   async function onSubmit(data: SignupData) {
//     setLoading(true);
//     setErrorMessage(null);

//     try {
//       const res = await axios.post("/api/auth/signup", data);
//       if (res?.data?.error) {
//         setErrorMessage(res.data.error);
//       } else {
//         // auto sign in after signup
//         const signInRes = await signIn("credentials", {
//           redirect: false,
//           email: data.email,
//           password: data.password,
//         });

//         if ((signInRes as any)?.error) {
//           setErrorMessage((signInRes as any).error);
//         } else {
//           window.location.href = "/customer";
//         }
//       }
//     } catch (err: any) {
//       setErrorMessage(err?.response?.data?.error || err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function onGoogle() {
//     await signIn("google", { callbackUrl: "/profile/complete" });
//   }

//   function normalizePhone(phone_number: string) {
//     return phone_number.replace(/\D/g, "");
//   }

//   async function sendOtp() {
//     setInfoMessage(null);
//     setErrorMessage(null);

//     if (!phone) {
//       setErrorMessage(
//         "Enter phone number with country code (e.g. +919876543210)",
//       );
//       return;
//     }

//     //const cleanPhone = normalizePhone(phone_number);

//     try {
//       setLoading(true);
//       const res = await axios.post("/api/auth/send-otp", { phone: phone });
//       if (res?.data?.error) setErrorMessage(res.data.error);
//       else {
//         setOtpSent(true);
//         setInfoMessage("OTP sent = please check your phone.");
//       }
//     } catch (err: any) {
//       setErrorMessage(err?.response?.data?.error || err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function verifyOtpAndSignin() {
//     setErrorMessage(null);
//     setLoading(true);
//     // const cleanPhone = normalizePhone(phone_number);
//     // console.log("Verifying OTP for phone:", cleanPhone);
//     try {
//       const signInRes = await signIn("credentials", {
//         redirect: false,
//         phone: phone,
//         otp: code,
//       });
//       // console.log("SignIn response:", otp,phone);
//       console.log("OTP signIn response:", signInRes);
//       if ((signInRes as any)?.error) {
//         setErrorMessage((signInRes as any).error || "Unable to sign in");
//       } else {
//         window.location.href = "/dashboard";
//       }
//     } catch (err: any) {
//       setErrorMessage(err?.message || "Error");
//     } finally {
//       setLoading(false);
//     }
//   }
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-50 p-4">
//       <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-blue-100 bg-white">
//         {/* LEFT SIDE */}
//         <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white p-10">
//           <div>
//             <h2 className="text-3xl font-semibold tracking-tight">
//               ServiceFlow SaaS
//             </h2>
//             <p className="mt-4 text-sm text-white/80">
//               Start managing your service business with a modern and powerful
//               platform.
//             </p>
//           </div>

//           <div className="space-y-4 text-sm">
//             <p>✔ Smart Booking Management</p>
//             <p>✔ Technician Tracking System</p>
//             <p>✔ Invoice & Payment Automation</p>
//             <p>✔ Real-time Notifications</p>
//           </div>

//           <p className="text-xs text-white/70">
//             Built for scalable service businesses
//           </p>
//         </div>

//         {/* RIGHT SIDE */}
//         <div className="p-6 sm:p-10">
//           <div className="max-w-md mx-auto">
//             {/* Header */}
//             <div className="mb-6">
//               <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
//                 Create your account 🚀
//               </h1>
//               <p className="text-sm text-slate-500 mt-1">
//                 Get started in seconds and manage everything in one place
//               </p>
//             </div>

//             {errorMessage && (
//               <Alert variant="destructive" className="mb-4">
//                 {errorMessage}
//               </Alert>
//             )}
//             {infoMessage && <Alert className="mb-4">{infoMessage}</Alert>}

//             {/* Form */}
//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div>
//                 <Label className="text-sm font-medium text-slate-700">
//                   Full Name
//                 </Label>
//                 <Input
//                   className="mt-1 text-black"
//                   placeholder="John Doe"
//                   {...register("name")}
//                 />
//                 {errors.name && (
//                   <p className="text-xs text-red-500 mt-1">
//                     {errors.name.message}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label className="text-sm font-medium text-slate-700">
//                   Phone Number
//                 </Label>
//                 <Input
//                   className="mt-1 text-slate-900"
//                   placeholder="+91 9876543210"
//                   {...register("phone")}
//                 />
//                 {errors.phone && (
//                   <p className="text-xs text-red-500 mt-1">
//                     {errors.phone.message}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label className="text-sm font-medium text-slate-700">
//                   Email
//                 </Label>
//                 <Input
//                   className="mt-1 text-slate-900"
//                   placeholder="john@doe.com"
//                   {...register("email")}
//                 />
//                 {errors.email && (
//                   <p className="text-xs text-red-500 mt-1">
//                     {errors.email.message}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label className="text-sm font-medium text-slate-700">
//                   Password
//                 </Label>
//                 <Input
//                   className="mt-1 text-slate-900"
//                   type="password"
//                   placeholder="••••••••"
//                   {...register("password")}
//                 />
//                 {errors.password && (
//                   <p className="text-xs text-red-500 mt-1">
//                     {errors.password.message}
//                   </p>
//                 )}
//               </div>

//               <Button
//                 type="submit"
//                 className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
//                 disabled={loading}
//               >
//                 {loading ? "Creating..." : "Create account"}
//               </Button>
//             </form>

//             {/* Divider */}
//             <div className="my-6 flex items-center gap-3">
//               <div className="flex-1 h-px bg-slate-200" />
//               <span className="text-xs text-slate-400">OR</span>
//               <div className="flex-1 h-px bg-slate-200" />
//             </div>

//             {/* Social */}
//             <div className="flex flex-col gap-3">
//               <Button
//                 onClick={onGoogle}
//                 variant="default"
//                 className="w-full bg-linear-to-r  from-blue-600 via-indigo-600 to-cyan-500 hover:to-indigo-700 text-white font-semibold"
//               >
//                 Google
//               </Button>
//               <Button
//                 onClick={() => setPhoneMode((v) => !v)}
//                 variant="default"
//                 className="w-full bg-linear-to-r  from-blue-600 via-indigo-600 to-cyan-500 hover:to-indigo-700 text-white font-semibold"
//               >
//                 Phone
//               </Button>
//             </div>

//             {/* OTP */}
//             {phoneMode && (
//               <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
//                 <Label className="text-sm font-medium text-slate-700">
//                   Phone
//                 </Label>
//                 <Input
//                   className="mt-1"
//                   value={phone}
//                   onChange={(e) => setPhone(e.target.value)}
//                   placeholder="+91 9876543210"
//                 />

//                 <div className="flex gap-2 mt-3">
//                   <Button
//                     onClick={sendOtp}
//                     disabled={loading}
//                     className="flex-1 bg-linear-to-r  from-blue-600 via-indigo-600 to-cyan-500 hover:to-indigo-700 text-white"
//                   >
//                     {loading ? "Sending..." : "Send OTP"}
//                   </Button>
//                   <Button
//                     variant="outline"
//                     onClick={() => {
//                       setPhone("");
//                       setCode("");
//                       setOtpSent(false);
//                     }}
//                   >
//                     Reset
//                   </Button>
//                 </div>

//                 {otpSent && (
//                   <div className="mt-4">
//                     <Label className="text-sm font-medium text-slate-700">
//                       Enter OTP
//                     </Label>
//                     <Input
//                       className="mt-1"
//                       value={code}
//                       onChange={(e) => setCode(e.target.value)}
//                       placeholder="123456"
//                     />
//                     <Button
//                       className="mt-3 w-full"
//                       onClick={verifyOtpAndSignin}
//                       disabled={loading}
//                     >
//                       {loading ? "Verifying..." : "Verify & Sign up"}
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Footer */}
//             <p className="text-sm text-slate-500 mt-6 text-center">
//               Already have an account?{" "}
//               <a
//                 href="/signin"
//                 className="text-blue-600 font-medium hover:underline"
//               >
//                 Sign in
//               </a>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default SignUpPage;

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle2,
  Zap,
  Clock,
  Briefcase,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/SiteHeader";
import z from "zod";
import axios from "axios";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput } from "@/components/ui/login-input";

type SignupRole = "customer" | "provider";

const SignupSchema = z.object({
  name: z.string().min(2, "name too short"),
  email: z.string().email("Invalid mail"),
  password: z.string().min(6, "Password must be atleast 6 chars"),
  phone: z.string(),
});

const providerSignupSchema = z.object({
  ownerName: z.string().min(2, "owner name too short"),
  companyName: z.string().min(2, "company name too short"),
  provPhone: z.string(),
  provEmail: z.string().email("Invalid email"),
  provPassword: z.string().min(6, "Password must be at least 6 chars"),
  businessType: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type SignupData = z.infer<typeof SignupSchema>;

function SignupPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [otpMode, setOtpMode] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // provider form state
  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [provPhone, setProvPhone] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [providerErrors, setProviderErrors] = useState<Record<string, string>>(
    {},
  );

  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as SignupRole) || "customer";
  const [role, setRole] = useState<SignupRole>(initialRole);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupData>({ resolver: zodResolver(SignupSchema) });

  //  async function handleSendCustomerOtp() {
  //   try {
  //     setOtpLoading(true);
  //     setOtpMessage(null);
  //     setErrorMessage(null);

  //     const phone = getValues("phone");
  //     const name = getValues("name");
  //     const email = getValues("email");

  //     if (!name) {
  //       setErrorMessage(
  //         "Please enter your full name first"
  //       );
  //       return;
  //     }

  //     if (!email) {
  //       setErrorMessage(
  //         "Please enter your email first"
  //       );
  //       return;
  //     }

  //     if (!phone) {
  //       setErrorMessage(
  //         "Please enter your phone number"
  //       );
  //       return;
  //     }

  //     await axios.post(
  //       "/api/auth/send-otp",
  //       {
  //         phone: phone.replace(/\D/g, ""),
  //       }
  //     );

  //     setOtpSent(true);

  //     setOtpMessage(
  //       "OTP sent. Please check your phone."
  //     );
  //   } catch (error: any) {
  //     setErrorMessage(
  //       error?.response?.data?.error ||
  //       error?.message ||
  //       "Unable to send OTP"
  //     );
  //   } finally {
  //     setOtpLoading(false);
  //   }
  // }

  async function handleCustomerSubmit(values: any) {
    try {
      setErrorMessage(null);

      const response = await axios.post("/api/auth/signup/customer", {
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "Unable to create customer account",
        );
      }

      const result = await signIn("credentials", {
        redirect: false,

        email: values.email,
        password: values.password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      window.location.href = "/customer";
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to create account",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // async function onGoogle() {
  //   await signIn("google", { callbackUrl: "/profile/complete" });
  // }

  async function onGoogleSignup() {
    try {
      setErrorMessage(null);
      setSubmitting(true);

      await signIn("google", {
        callbackUrl: "/profile/complete",
      });
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to continue with Google");
      setSubmitting(false);
    }
  }

  function normalizePhone(phone_number: string) {
    return phone_number.replace(/\D/g, "");
  }

  async function sendOtp() {
    setInfoMessage(null);
    setErrorMessage(null);

    if (!phone) {
      setErrorMessage(
        "Enter phone number with country code (e.g. +919876543210)",
      );
      return;
    }

    //const cleanPhone = normalizePhone(phone_number);

    try {
      setLoading(true);
      const res = await axios.post("/api/auth/send-otp", { phone: phone });
      if (res?.data?.error) setErrorMessage(res.data.error);
      else {
        setOtpSent(true);
        setInfoMessage("OTP sent = please check your phone.");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpAndSignin() {
    setErrorMessage(null);
    setLoading(true);
    // const cleanPhone = normalizePhone(phone_number);
    // console.log("Verifying OTP for phone:", cleanPhone);
    try {
      const signInRes = await signIn("credentials", {
        redirect: false,
        phone: phone,
        otp: code,
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

  async function handleProviderSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        ownerName,
        companyName,
        email: provEmail,
        phone: provPhone,
        password: provPassword,
        businessType,
        city,
        state,
      };

      // Debug: log payload to browser console so we can confirm what is sent
      try {
        console.log("provider submit payload", payload);
      } catch (e) {}

      const response = await axios.post("/api/auth/signup/provider", payload);

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "Unable to create business account",
        );
      }

      const result = await signIn("credentials", {
        redirect: false,

        email: provEmail,
        password: provPassword,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      window.location.href = "/service-provider/onboarding";
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.error ||
          error?.message ||
          "Unable to create provider account",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-white">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 ">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm dark:text-muted text-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Role toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-2xl border border-border bg-muted/10 p-1.5">
            <button
              onClick={() => setRole("customer")}
              className={`flex items-center gap-2 rounded-xl  px-5 py-2.5 text-sm font-medium transition ${
                role === "customer"
                  ? "bg-linear-to-r from-brand-coral to-brand-coral text-background dark:text-foreground shadow-md shadow-brand-coral/20"
                  : "dark:text-muted text-foreground hover:text-muted-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              Customer
            </button>
            <button
              onClick={() => setRole("provider")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                role === "provider"
                  ? "bg-linear-to-r from-brand-teal to-brand-teal-dark  text-background dark:text-foreground  shadow-md shadow-brand-teal/20"
                  : "dark:text-muted text-foreground hover:text-muted-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Service Provider
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {role === "customer" ? (
            <motion.div
              key="customer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/60 bg-white shadow-xl">
                <CardContent className="p-8">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25">
                      <User className="h-6 w-6" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-black">
                      Create your customer account
                    </h1>
                    <p className="mt-2 text-sm dark:text-muted text-muted-foreground">
                      Find trusted professionals for your service needs
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit(handleCustomerSubmit)}
                    className="space-y-4"
                  >
                    <div>
                      <Label
                        htmlFor="custName"
                        className="text-sm font-medium text-foreground dark:text-background"
                      >
                        Full name
                      </Label>
                      <div className="relative mt-1.5">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground " />
                        <LoginInput
                          id="custName"
                          {...register("name")}
                          placeholder="Rahul Sharma"
                          className="pl-10 "
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="custPhone"
                        className="text-sm font-medium text-foreground dark:text-background"
                      >
                        Phone number
                      </Label>
                      <div className="relative mt-1.5">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground " />
                        <LoginInput
                          id="custPhone"
                          {...register("phone")}
                          placeholder="98765 43210"
                          className="pl-10 "
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="custEmail"
                        className="text-sm font-medium text-foreground dark:text-background"
                      >
                        Email
                      </Label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                        <LoginInput
                          id="custEmail"
                          type="email"
                          {...register("email")}
                          placeholder="you@example.com"
                          className="pl-10"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="custPassword"
                        className="text-sm font-medium text-foreground dark:text-background"
                      >
                        Password
                      </Label>
                      <div className="relative mt-1.5">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                        <LoginInput
                          id="custPassword"
                          type={showPassword ? "text" : "password"}
                          {...register("password")}
                          placeholder="At least 6 characters"
                          className="pl-10 pr-10 "
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-linear-to-r from-brand-coral to-brand-coral-dark text-white shadow-lg shadow-brand-coral/25 hover:shadow-xl hover:shadow-brand-coral/40"
                    >
                      {submitting
                        ? "Creating account..."
                        : "Create Customer Account"}
                      {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Or continue with
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={onGoogleSignup}
                    className="h-11 w-full rounded-xl border-border bg-card dark:bg-card-foreground text-foreground dark:text-background hover:bg-accent hover:dark:bg-accent-foreground"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.28-4.74 3.28-8.07z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.68l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.52H2.16v2.84A11 11 0 0 0 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.85 14.11A6.64 6.64 0 0 1 5.5 12c0-.73.12-1.44.35-2.11V7.05H2.16A11 11 0 0 0 1 12c0 1.79.43 3.48 1.16 4.95l3.69-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.08.56 4.23 1.67l3.17-3.17C17.45 2.4 14.97 1 12 1a11 11 0 0 0-9.84 6.05l3.69 2.84C6.72 7.31 9.14 5.38 12 5.38z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 dark:bg-primary-foreground p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
                        <Phone className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground dark:text-background">
                              Sign up with phone
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Create your account using a one-time password.
                            </p>
                          </div>

                          <Badge
                            variant="secondary"
                            className="shrink-0 rounded-full bg-brand-teal/10 text-brand-teal"
                          >
                            Available soon
                          </Badge>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <LoginInput
                            disabled
                            placeholder="+91 98765 43210"
                            className="bg-background"
                          />

                          <Button
                            type="button"
                            disabled
                            variant="outline"
                            className="shrink-0 rounded-xl"
                          >
                            Send OTP
                          </Button>
                        </div>

                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Phone-based signup will be available soon.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/signin"
                      className="font-medium text-brand-coral hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="provider"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/60 bg-white shadow-xl">
                <CardContent className="p-8">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/25">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-black">
                      Start your business with us
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Register your company and start receiving jobs
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-teal/10 px-4 py-1.5 text-sm font-medium text-brand-teal-dark">
                      <Clock className="h-4 w-4" />
                      First 30 days free
                    </div>
                  </div>

                  {/* Section: Business owner */}
                  <div className="mb-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-coral/10">
                        <User className="h-4 w-4 text-brand-coral" />
                      </div>
                      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-coral">
                        Business owner
                      </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor="ownerName"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Full name
                        </Label>
                        <div className="relative mt-1.5">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="ownerName"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            placeholder="Rajesh Kumar"
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.ownerName && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.ownerName}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="companyName"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Company name
                        </Label>
                        <div className="relative mt-1.5">
                          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="CoolCare Services"
                            className="pl-10 text-foreground dark:text-background"
                          />
                        </div>
                        {providerErrors.companyName && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.companyName}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="provPhone"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Phone
                        </Label>
                        <div className="relative mt-1.5">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="provPhone"
                            value={provPhone}
                            onChange={(e) => setProvPhone(e.target.value)}
                            placeholder="98765 43210"
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.provPhone && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.provPhone}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="provEmail"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Email
                        </Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="provEmail"
                            type="email"
                            value={provEmail}
                            onChange={(e) => setProvEmail(e.target.value)}
                            placeholder="business@example.com"
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.provEmail && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.provEmail}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <Label
                          htmlFor="provPassword"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Password
                        </Label>
                        <div className="relative mt-1.5">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="provPassword"
                            type={showPassword ? "text" : "password"}
                            value={provPassword}
                            onChange={(e) => setProvPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="pl-10 pr-10 "
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-muted text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {providerErrors.provPassword && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.provPassword}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Business details */}
                  <div className="mb-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal/10">
                        <Briefcase className="h-4 w-4 text-brand-teal-dark" />
                      </div>
                      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-brand-teal">
                        Business details
                      </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label
                          htmlFor="businessType"
                          className="text-sm text-foreground dark:text-background"
                        >
                          Business type
                        </Label>
                        <div className="relative mt-1.5">
                          <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="businessType"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                            placeholder="AC Repair, Electrical, Plumbing..."
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.businessType && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.businessType}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="city"
                          className="text-sm text-foreground dark:text-background"
                        >
                          City
                        </Label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Patna"
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.city && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.city}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <Label
                          htmlFor="state"
                          className="text-sm text-foreground dark:text-background"
                        >
                          State
                        </Label>
                        <div className="relative mt-1.5">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 dark:text-muted text-muted-foreground" />
                          <LoginInput
                            id="state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="Bihar"
                            className="pl-10 "
                          />
                        </div>
                        {providerErrors.state && (
                          <p className="mt-1 text-xs text-destructive">
                            {providerErrors.state}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trial notice */}
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/10">
                      <CheckCircle2 className="h-5 w-5 text-brand-teal-dark" />
                    </div>
                    <div>
                      <p className="text-sm font-medium  dark:text-muted text-muted-foreground">
                        First 30 days free
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-muted ">
                        No credit card required. After your trial, choose a plan
                        that works for you.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    onClick={handleProviderSubmit}
                    disabled={submitting}
                    className="w-full bg-linear-to-r from-brand-teal to-brand-teal-dark text-white shadow-lg shadow-brand-teal/25 hover:shadow-xl hover:shadow-brand-teal/40"
                  >
                    {submitting
                      ? "Creating account..."
                      : "Create Business Account"}
                    {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href="/signin"
                      className="font-medium text-brand-teal-dark hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-brand-coral" />
          Want to explore first?{" "}
          <Link
            href="/demo"
            className="font-medium text-brand-coral hover:underline"
          >
            Try the demo
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupPageContent />
    </Suspense>
  );
}
