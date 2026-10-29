import { NextResponse } from "next/server";
import { z } from "zod";

import { billAction } from "@/lib/finance-ledger";
import { FinanceLedger } from "@/models/finance";
import { paise } from "@/lib/finance-policy.mjs";
import { assertFinanceWrite } from "@/lib/finance-security";
import { objectIdSchema } from "@/lib/pagination";
import { requestIdSchema } from "@/lib/finance-validation";
import { apiFailure, privateJson } from "@/lib/api-response";
import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Payment from "@/models/payment";

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("invoiceId");

    const filter: any = {};
    if (invoiceId) filter.invoiceId = invoiceId;

    const payments = await Payment.find(filter)
      .populate("invoiceId")
      .populate("jobId")
      .populate("customerId")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ payments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: err.status || 500 });
  }
}

export async function POST(request:Request) {
  try {
    const {user}=await requireRole(["admin"]); assertFinanceWrite(request);
    const input=z.object({invoiceId:objectIdSchema,amount:z.number().positive(),mode:z.enum(["cash","upi"]),requestId:requestIdSchema,note:z.string().trim().max(500).optional()}).strict().parse(await request.json());
    const ledger=await FinanceLedger.findOne({invoiceId:input.invoiceId}).select("invoiceVersion").lean();
    const result=await billAction(input.invoiceId,user,{action:"submit",requestId:input.requestId,invoiceVersion:ledger?.invoiceVersion||1,paymentMode:input.mode==="cash"?"cash":"direct_upi",collectedPaise:paise(input.amount),note:input.note});
    return privateJson({pendingCustomerConfirmation:true,result},202);
  } catch(error){return apiFailure(error);}
}
