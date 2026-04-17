import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Job from "@/models/job";
import Payment from "@/models/payment";
import Technician from "@/models/technician";
import User from "@/models/user";
import { NextResponse } from "next/server";


export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "dispatcher"]);
    await connectToDb();

    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status") || "";

    const filter: any = {};
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (q) {
      const users = await User.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      }).select("_id").lean();

      filter.userId = { $in: users.map((u: any) => u._id) };
    }

    const technicians = await Technician.find(filter)
      .populate("userId")
      .sort({ createdAt: -1 })
      .lean();

    const jobAgg = await Job.aggregate([
      {
        $group: {
          _id: "$technicianId",
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          pendingJobs: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["assigned", "accepted", "arrived", "otp_verified", "in_progress", "on_hold"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          activeJobs: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["assigned", "accepted", "arrived", "otp_verified", "in_progress", "on_hold"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastJobAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const paymentAgg = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $group: {
          _id: "$job.technicianId",
          totalEarnings: { $sum: "$amount" },
          paymentCount: { $sum: 1 },
        },
      },
    ]);

    const jobMap = new Map<string, any>();
    jobAgg.forEach((row: any) => jobMap.set(String(row._id), row));

    const paymentMap = new Map<string, any>();
    paymentAgg.forEach((row: any) => paymentMap.set(String(row._id), row));

    const result = technicians.map((tech: any) => {
      const jobs = jobMap.get(String(tech._id)) || {};
      const payments = paymentMap.get(String(tech._id)) || {};

      return {
        ...tech,
        totalJobs: jobs.totalJobs || 0,
        completedJobs: jobs.completedJobs || 0,
        pendingJobs: jobs.pendingJobs || 0,
        activeJobs: jobs.activeJobs || 0,
        lastJobAt: jobs.lastJobAt || null,
        totalEarnings: payments.totalEarnings || 0,
        paymentCount: payments.paymentCount || 0,
      };
    });

    return NextResponse.json({ technicians: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.status || 500 }
    );
  }
}