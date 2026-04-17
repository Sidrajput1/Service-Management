import { NextResponse } from "next/server";
import { requireCustomerProfile } from "@/lib/customer";

export async function GET() {
  try {
    const {customer,user} = await requireCustomerProfile();
    console.log(customer);

    return NextResponse.json({
      user,
      customer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}