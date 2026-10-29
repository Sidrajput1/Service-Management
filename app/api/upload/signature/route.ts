import crypto from "crypto";
import { requireCurrentUser } from "@/lib/auth";
import { apiFailure, privateJson } from "@/lib/api-response";
export async function POST() {
  try {
    await requireCurrentUser();
    if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) return privateJson({ error: "Uploads are unavailable" }, 503);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash("sha1").update(`timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
    return privateJson({ timestamp, signature, api_key: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
  } catch (error) { return apiFailure(error); }
}