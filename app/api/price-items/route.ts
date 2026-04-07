import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import PriceItem from "@/models/PriceItem";
import { NextResponse } from "next/server";
import z from "zod";

const CreateSchema = z.object({
    itemType:z.enum(["service","part","visit","other"]),
    name:z.string().min(1),
    price:z.coerce.number().min(0),
    unit:z.string().optional(),
    taxPercent: z.coerce.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
    
})

export async function GET(request:Request){
    try {
        await connectToDb();

        const url = new URL(request.url);

        const showInactive = url.searchParams.get("showInactive") === "true";

        

        const filter: any = {};

        if(!showInactive){
            filter.isActive = true;
        };

        const items = await PriceItem.find(filter).sort({itemType:1,name:1}).lean();

        return NextResponse.json({items});

    } catch (error:any) {
        return NextResponse.json(
        {error:error.message ||  "Server error"},
        {status:500}
        );
    }
};

export async function POST(request:Request){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();

        const body = await request.json();
        const parsed = CreateSchema.parse(body);

        const item = await PriceItem.create({
            ...parsed,
            taxPercent:parsed.taxPercent ??  18,
            isActive:parsed.isActive ??  true,
        });

        return NextResponse.json({item},{status:201});
        
    } catch (err:any) {
        if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }

}