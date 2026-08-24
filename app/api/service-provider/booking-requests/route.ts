import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
// import Customer from "@/models/customer";
// import ServiceRequest from "@/models/ServiceRequest";
// import ServiceOffering from "@/models/ServiceOffering";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDb } from "@/lib/db";
import { requireServiceProvider } from "@/lib/service-provider";
import { Customer, ServiceRequest, ServiceOffering } from "@/models";





export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDb();

    const { provider } = await requireServiceProvider(session.user.id);

//      if (!mongoose.models.Customer) {
//   console.error("Customer model not registered yet");
// }
    //const Customer = mongoose.models.Customer || require("./models/customer").default;
    console.log("Registered models:", mongoose.modelNames());

    const requests = await ServiceRequest.find({
      serviceProviderId: provider._id,

      status: "open",
    })
       .populate("customerId", "name phone email")
       .populate(
            "serviceOfferingId",
            "name price offerEnabled offerName discountType discountValue",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error: any) {
    console.error("Provider booking requests:", error);

    return NextResponse.json(
      {
        error: error.message || "Unable to load booking requests",
      },
      { status: 500 },
    );
  }
}
