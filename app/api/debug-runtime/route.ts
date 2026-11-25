import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[DEBUG RUNTIME] Route executed");

  return NextResponse.json({
    message: "Latest route code executed",
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    nodeEnv: process.env.NODE_ENV ?? null,
    pid: process.pid,
  });
}