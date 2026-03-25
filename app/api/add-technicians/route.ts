import { requireRole } from "@/lib/auth";
import { connectToDb } from "@/lib/db";
import Technician from "@/models/technician";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import z from "zod";


const CreateTechnicianSchema = z.object({
  mode: z.enum(["new", "existing"]),
  userId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  skills: z.array(z.string()).default([]),
  vehicleType: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

function generateTempPassword(length = 8) {
     return Math.random().toString(36).slice(2, 10) + "A1";
}

export async function GET(request: Request) {
    try {
        await requireRole(["admin","dispatcher"]);
        await connectToDb();
        const technician = await Technician.find()
            .populate("userId")
            .sort({createdAt:-1});
        
        return NextResponse.json({technicians:technician});
    } catch (error : any) {
        return NextResponse.json(
            {error:error.message || "Internal Server Error"},
            {status:error.status || 500}
        )
    }
};

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    await connectToDb();

    const body = await request.json();
    const parsed = CreateTechnicianSchema.parse(body);

    let user: any = null;
    let tempPassword: string | undefined;

    if (parsed.mode === "new") {
      if (!parsed.name || !parsed.email) {
        return NextResponse.json(
          { error: "Name and email are required for new technician" },
          { status: 400 }
        );
      }

      const existing = await User.findOne({ email: parsed.email });
      if (existing) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }

      const plainPassword = parsed.password || generateTempPassword();
      tempPassword = parsed.password ? undefined : plainPassword;
      const hashed = await bcrypt.hash(plainPassword, 10);

      user = await User.create({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        password: hashed,
        role: "technician",
      });
    }

    if (parsed.mode === "existing") {
      if (!parsed.userId) {
        return NextResponse.json(
          { error: "userId is required for existing user mode" },
          { status: 400 }
        );
      }

      user = await User.findById(parsed.userId);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (user.role === "technician") {
        const alreadyTech = await Technician.findOne({ userId: user._id });
        if (alreadyTech) {
          return NextResponse.json(
            { error: "Technician profile already exists for this user" },
            { status: 400 }
          );
        }
      }

      user.role = "technician";
      await user.save();
    }

    const existingTech = await Technician.findOne({ userId: user._id });
    if (existingTech) {
      return NextResponse.json(
        { error: "Technician profile already exists" },
        { status: 400 }
      );
    }

    const technician = await Technician.create({
      userId: user._id,
      skills: parsed.skills,
      vehicleType: parsed.vehicleType,
      status: "offline",
      metadata: parsed.metadata || {},
    });

    const populated = await Technician.findById(technician._id).populate("userId");

    return NextResponse.json(
      {
        technician: populated,
        tempPassword,
      },
      { status: 201 }
    );
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