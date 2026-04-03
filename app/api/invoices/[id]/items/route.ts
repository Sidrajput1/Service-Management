import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Invoice from "@/models/invoice";
import { calculateInvoiceTotal } from "@/lib/billing";



const AddItemsSchema = z.object({
  items: z.array(
    z.object({
      itemType: z.enum(["service", "part", "visit", "discount", "other"]),
      description: z.string().min(1),
      qty: z.coerce.number().positive(),
      unitPrice: z.coerce.number().min(0),
      taxable: z.boolean().optional(),
      meta: z.record(z.string(), z.any()).optional(),
    })
  ).min(1),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const body = await request.json();
    const parsed = AddItemsSchema.parse(body);

    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const newItems = parsed.items.map((item) => ({
      ...item,
      amount: Number(item.qty) * Number(item.unitPrice),
    }));

    invoice.items = [...invoice.items, ...newItems] as any;

    const totals = calculateInvoiceTotal(invoice.items as any, invoice.discountAmount, invoice.taxPercent);
    invoice.subtotal = totals.subtotal;
    invoice.discountAmount = totals.discountAmount;
    invoice.taxAmount = totals.taxAmount;
    invoice.grandTotal = totals.grandTotal;
    invoice.balanceDue = Math.max(0, invoice.grandTotal - invoice.amountPaid);

    await invoice.save();

    return NextResponse.json({ invoice });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}