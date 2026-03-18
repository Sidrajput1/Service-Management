import { connectToDb } from "@/lib/db";
import Otp from "@/models/otp";
import { NextResponse } from "next/server";
import Twilio from "twilio";

const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  : null;

function generateOtp(length = 6) {
  return Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone_number = body?.phone_number;
    if (!phone_number) return NextResponse.json({ error: "phone required" }, { status: 400 });

    await connectToDb();

    const code = generateOtp(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await Otp.create({ phone_number, code, expiresAt });

    // send SMS via Twilio (or swap with your provider)
    if (twilioClient && process.env.TWILIO_FROM) {
      await twilioClient.messages.create({
        body: `Your OTP for ${process.env.NEXTAUTH_URL || "ServiceApp"} is ${code}. It expires in 5 minutes.`,
        from: process.env.TWILIO_FROM,
        to: phone_number,
      });
    } else {
      console.warn("Twilio not configured — OTP:", code);
    }

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}