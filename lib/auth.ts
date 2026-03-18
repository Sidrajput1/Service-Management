import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";


export class ApiAuthError extends Error {
     status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiAuthError.prototype);
  }
}

/**
 * Get session on server (App Router compatible)
 */
export async function getServerSessionOrNull() {
  const session = await getServerSession(authOptions);
  return session;
};

/**
 * Require session (throws ApiAuthError 401 if missing)
 */
export async function requireAuth() {
  const session = await getServerSessionOrNull();
  if (!session || !session.user) {
    throw new ApiAuthError("Unauthorized", 401);
  }
  return session;
}

/**
 * Require server session AND application user (from DB). Returns DB user.
 * Throws 401 if not logged in, 404 if DB user not found.
 */


export async function requireCurrentUser(){
    const session = await requireAuth();

};
// requires at least one role

export async function requireRole(allowedRoles:string[]){

};

export async function requireAdmin(){

};

export async function requireTechnician(){
    
}