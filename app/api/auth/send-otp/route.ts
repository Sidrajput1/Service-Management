import { randomInt } from "node:crypto";
import { connectToDb } from "@/lib/db";
import Otp from "@/models/otp";
import { apiFailure, privateJson } from "@/lib/api-response";
import { z } from "zod";
import Twilio from "twilio";
const schema = z.object({
  phone: z
    .string()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\+[1-9]\d{9,14}$/, "Include a country code, for example +91"),
    ),
});
export async function POST(request: Request) {
  try {
    const { phone } = schema.parse(await request.json());
    const sid = process.env.TWILIO_ACCOUNT_SID,
      token = process.env.TWILIO_AUTH_TOKEN,
      from = process.env.TWILIO_FROM;
    if (!sid || !token || !from)
      return privateJson(
        {
          error:
            "SMS sign-in is temporarily unavailable. Use email and password.",
        },
        503,
      );
    await connectToDb();
    if (
      await Otp.exists({
        phone,
        createdAt: { $gt: new Date(Date.now() - 60000) },
      })
    )
      return privateJson(
        { error: "Wait one minute before requesting another code." },
        429,
      );
    const code = String(randomInt(100000, 1000000));
    const record = await Otp.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60000),
    });
    try {
      await Twilio(sid, token).messages.create({
        body: `Your Servizato sign-in code is ${code}. It expires in 5 minutes.`,
        from,
        to: phone,
      });
    } catch {
      await Otp.deleteOne({ _id: record._id });
      return privateJson(
        {
          error:
            "The SMS could not be sent. Please retry or use email and password.",
        },
        502,
      );
    }
    return privateJson({ success: true, message: "OTP sent" });
  } catch (error) {
    return apiFailure(error);
  }
}
