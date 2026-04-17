import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import bcrypt from "bcryptjs";

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password, name, phone, role = "customer" } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json({
        error: "All fields are required",
        status: 400,
      });
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password must be at least 6 characters",
        },
        {
          status: 400,
        },
      );
    }

    await connectToDb();

    const existing = await User.findOne({ email });

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      phone,
    });

    const safe = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
    };

    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 },
    );
  }
}
