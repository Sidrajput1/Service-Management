import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Lead from "@/models/lead";
import { NextResponse } from "next/server";
import z from "zod";

const LeadUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  serviceRequested: z.string().optional(),
  source: z.string().optional(),
  sourceDetails: z.record(z.string(),z.any()).optional(),
  remarks: z.string().optional(),
  status: z.enum(["new", "contacted", "interested", "quotation_sent", "booked", "not_interested"]).optional(),
  assignedTo: z.string().optional().nullable(),
  convertedToCustomerId: z.string().optional().nullable(),
});

export async function GET(_: Request, { params }:  { params: Promise<{ id: string }> }){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();
        const {id} = await params;

        const lead = await Lead.findById(id).lean();
        if(!lead) return NextResponse.json({error:"Lead not found"},{status:404});

        return NextResponse.json({lead});
    } catch (err:any) {
         const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Server error" }, { status });
        
    }
};

export async function PUT(request: Request, { params }:  { params: Promise<{ id: string }> }){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();

        const {id} = await params;
        
        const body = await request.json();

        const parsed = LeadUpdateSchema.parse(body);

        const lead = await Lead.findByIdAndUpdate(id,parsed,{new:true});

        if(!lead) return NextResponse.json({error:"lead not found"}, {status:404});
        return NextResponse.json({lead});
    } catch (err:any) {
         if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Server error" }, { status });
    }
};

export async function DELETE(_: Request, { params }:  { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const {id} = await params;
    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json({ error: err?.message || "Server error" }, { status });
  }
}