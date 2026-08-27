import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { requireCurrentUser } from "@/lib/auth";
import { connectToDb } from "@/lib/db";

import User from "@/models/user";

export async function POST(
  request: Request,
) {
  try {
    const currentUser =
      await requireCurrentUser();

    await connectToDb();

    const body =
      await request.json();

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = body;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "All password fields are required",
        },
        {
          status: 400,
        },
      );
    }

    if (
      newPassword.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "New password must be at least 6 characters",
        },
        {
          status: 400,
        },
      );
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "New passwords do not match",
        },
        {
          status: 400,
        },
      );
    }

    const user =
      await User.findById(
        currentUser._id,
      );

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Verify old password.
     */
    const valid =
      await bcrypt.compare(
        currentPassword,
        user.password,
      );

    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Current password is incorrect",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Don't allow the same password.
     */
    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password,
      );

    if (samePassword) {
      return NextResponse.json(
        {
          error:
            "New password must be different from current password",
        },
        {
          status: 400,
        },
      );
    }

    user.password =
      await bcrypt.hash(
        newPassword,
        10,
      );

    await user.save();

    return NextResponse.json({
      success: true,
      message:
        "Password changed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to change password",
      },
      {
        status: error.status || 500,
      },
    );
  }
}