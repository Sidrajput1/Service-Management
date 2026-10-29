import type { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      phone?: string | null;
      mustChangePassword?: boolean;
      credentialVersion?: number;
    };
  }
  interface User {
    role?: string;
    phone?: string | null;
    mustChangePassword?: boolean;
    credentialVersion?: number;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    phone?: string | null;
    mustChangePassword?: boolean;
    credentialVersion?: number;
  }
}
