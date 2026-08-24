import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import ServiceProvider from "@/models/ServiceProvider";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Debug: log incoming body to help diagnose client vs server payload mismatches
    try { console.log('provider signup body:', JSON.stringify(body)); } catch(e) {}

    // Accept either new keys (email, phone, password) or legacy client keys (provEmail, provPhone, provPassword)
    const ownerName = body.ownerName || body.owner || body.owner_name;
    const companyName = body.companyName || body.company || body.company_name;
    const email = body.email || body.provEmail || body.prov_email || body.prov_email_address;
    const phone = body.phone || body.provPhone || body.prov_phone;
    const password = body.password || body.provPassword || body.prov_password;
    const businessType = body.businessType || body.business_type || "";
    const city = body.city || "";
    const state = body.state || "";

    if (
      !ownerName ||
      !companyName ||
      !email ||
      !phone ||
      !password
    ) {
      return NextResponse.json(
        { error: "Required provider information is missing" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectToDb();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\s+/g, "");

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    const existingPhone = await User.findOne({
      phone: normalizedPhone,
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number is already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: ownerName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "service_provider",
    });

    const now = new Date();

    const trialEndsAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const provider = await ServiceProvider.create({
      ownerId: user._id,
      companyName: companyName.trim(),
      businessType: businessType || "",
      email: normalizedEmail,
      phone: normalizedPhone,

      address: {
        city: city || "",
        state: state || "",
      },

      verificationStatus: "pending",
      status: "active",

      trialStartedAt: now,
      trialEndsAt,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        provider: {
          id: provider._id.toString(),
          companyName: provider.companyName,
          verificationStatus: provider.verificationStatus,
          trialEndsAt: provider.trialEndsAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message || "Unable to create service provider account",
      },
      { status: 500 }
    );
  }
}