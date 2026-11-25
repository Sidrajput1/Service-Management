import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";


// console.log("[NextAuth Route Loaded]", {
//   hasMongoUri: Boolean(process.env.MONGODB_URI),
//   nodeEnv: process.env.NODE_ENV,
//   pid: process.pid,
// });

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
