import { getAuth } from "@clerk/nextjs/server";
import { connectToDb } from "./db";
import User from "@/models/user";

export class ApiError extends Error {
    status:number;
    constructor(message:string,status=500){
        super(message);
        this.status = status;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
};

/**
 * Get the application User (from your DB) tied to the Clerk session.
 * Throws ApiError with 401 if not authenticated, or 404 if not found.
 */

export async function getServerUserOrThrow(){
    const {userId} = getAuth();

    if(!userId){
        throw new ApiError("Unauthorized",401);
    }

    await connectToDb();

    const user = await User.findOne({clerkId:userId});
    if(!user){
        // Not created in app DB yet (frontend should call /api/auth/sync)
    throw new ApiError("App user not found. Call /api/auth/sync to create profile.", 404);
    };

    return user;
 };

 /**
 * Ensure the current user has at least one role from allowedRoles array.
 * allowedRoles example: ['admin', 'dispatcher']
 */
export async function requireRoleOrThrow(allowedRoles: string[] = []) {
  const user = await getServerUserOrThrow();
  if (!allowedRoles || allowedRoles.length === 0) return user;
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError("Forbidden", 403);
  }
  return user;
}