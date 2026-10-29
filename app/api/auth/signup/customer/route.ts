import bcrypt from "bcryptjs";
import { connectToDb } from "@/lib/db";
import { customerRegistration } from "@/lib/registration";
import { apiFailure, privateJson } from "@/lib/api-response";
import User from "@/models/user";
export async function POST(request: Request) {
  try {
    const value = customerRegistration.parse(await request.json());
    await connectToDb();
    if (
      await User.exists({
        $or: [{ email: value.email }, { phone: value.phone }],
      })
    )
      return privateJson(
        { error: "This email or phone is already registered. Please sign in." },
        409,
      );
    const user = await User.create({
      ...value,
      password: await bcrypt.hash(value.password, 12),
      role: "customer",
    });
    return privateJson(
      {
        success: true,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      201,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      return privateJson(
        { error: "This account already exists. Please sign in." },
        409,
      );
    return apiFailure(error);
  }
}
