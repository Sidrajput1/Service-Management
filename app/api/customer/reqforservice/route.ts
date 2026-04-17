import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCustomerProfile } from "@/lib/customer";

import PriceItem from "@/models/PriceItem";
import { connectToDb } from "@/lib/db";
import Lead from "@/models/lead";

const RequestSchema = z.object({
 // phone:z.string().min(6),
  priceItemId: z.string().min(1),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  preferredAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await connectToDb();

    const  {customer,user } = await requireCustomerProfile();

    console.log(user.phone);
    const body = await request.json();
    const parsed = RequestSchema.parse(body);

    console.log("parsed body:", parsed);
console.log("customer profile phone:", customer?.phone);

    const service = await PriceItem.findById(parsed.priceItemId);
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service.itemType !== "service") {
      return NextResponse.json({ error: "Please select a service item" }, { status: 400 });
    }
    
const leadPhone = (user?.phone || "").toString().trim();
    const lead = await Lead.create({
      customerId: customer._id,
      name: customer.name,
      phone: leadPhone,
      email: customer.email,
      serviceRequested: service.name as any,
      source: "customer_portal",
      sourceDetails: {
        priceItemId: service._id,
        priceItemName: service.name,
        priceItemPrice: service.price,
        priceItemType: service.itemType,
        preferredAt: parsed.preferredAt || null,
        address: {
          addressLine: parsed.addressLine || "",
          city: parsed.city || "",
          state: parsed.state || "",
          pincode: parsed.pincode || "",
        },
      },
      status: "new",
      remarks: parsed.notes || "",
    });

    console.log("created lead:", lead);


    return NextResponse.json({ lead }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}