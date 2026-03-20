import { getServerSessionOrNull, requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Lead from "@/models/lead";
import { NextResponse } from "next/server";
import { z } from "zod";

const LeadCreateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
  serviceRequested: z.string().min(1),
  source: z
    .enum(["whatsapp", "ads", "call", "website", "walkin", "referral"])
    .optional(),
  sourceDetails: z.record(z.string(), z.any()).optional(),
  remarks: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);

    await connectToDb();

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(200, Number(url.searchParams.get("limit") || "20"));
    const q = url.searchParams.get("q") || "";

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { serviceRequested: { $regex: q, $options: "i" } },
      ];
    }

    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ leads, total, page, limit });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDb();

    // Public creation allowed (customer website/form). But if the caller is authenticated,
    // attach createdBy.
    const body = await request.json();
    const parsed = LeadCreateSchema.parse(body);

    // if request has a server session we attempt to attach createdBy (optional).

    let createdBy: string | undefined = undefined;

    try {
      const session = await getServerSessionOrNull();
      if (session && (session as any).user?.id) {
        createdBy = (session as any).user.id;
      }
    } catch (e) {
      // ignore
    }

    const lead = await Lead.create({
      ...parsed,
      source: parsed.source || "website",
      status: "new",
      assignedTo: undefined,
      convertedToCustomerId: undefined,
    // createdBy,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err: any) {
    if (err.name === "zodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status },
    );
  }
}
