import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import PriceItem from "@/models/PriceItem";
import { NextResponse } from "next/server";

import {z} from "zod";

const UpdateSchema = z.object({
    itemType: z.enum(["service", "part", "visit", "other"]).optional(),
  name: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  taxPercent: z.coerce.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_: Request, { params }: { params: { id: string } }){
    try {
        await connectToDb();

        const item = await PriceItem.findById(params.id).lean();

        if(!item){
            return NextResponse.json({
                error:"Price item not found",
            },{status:404})
        };

        return NextResponse.json({item});
        
    } catch (err:any) {
        return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
    }
};

export async function PUT(request:Request,{params}:{params:{id:String}}){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();

        const body = await request.json();

        const parsed = UpdateSchema.parse(body);

        const item = await PriceItem.findByIdAndUpdate(params.id , parsed , {new:true});

        if(!item){
            return NextResponse.json({error:"price item not found"},{status:404});
        };

        return NextResponse.json({item});


    } catch (err:any) {
        if(err.name === "zodError"){``
            return NextResponse.json({
                error:err.errors
            },{status:400});
        };

        return NextResponse.json({error:err.message || "Server error"},{status:500})
    };
};


// for delete

export async function DELETE(_:Request,{params}:{params:{id:string}}){
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();

        const item = await PriceItem.findByIdAndDelete(params.id);

         if(!item){
            return NextResponse.json({error:"price item not found"},{status:404});
        };

        return NextResponse.json({success:true});

        } catch (err:any) {
         return NextResponse.json({error:err.message || "Server error"},{status:500})
    }
}