import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import Otp from "@/models/otp";

// export const authOptions = {
//   providers: [
//     CredentialsProvider({
//       name: "Credentials",

//       credentials: {
//         email: { label:"Email", type:"text"},
//         password: { label:"Password", type:"password" },
//       },

//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           throw new Error("Email and password are required");
//         }
//         await connectToDb();

//         const user = await User.findOne({
//           email: credentials.email,
//         });

//         if (!user) {
//           throw new Error("User not found");
//         }

//         const isMatch = await bcrypt.compare(
//           credentials.password,
//           user.password,
//         );

//         if (!isMatch) {
//           throw new Error("Invalid password");
//         }

//         return {
//           id: user._id.toString(),
//           email: user.email,
//           role: user.role,
//           name: user.name,
//         };
//       },
//     }),
//   ],

//   session: {
//     strategy: "jwt" as const,
//     maxAge : 60 * 60 * 24 * 7
//   },

//   jwt:{
//     secret:process.env.NEXTAUTH_SECRET,
//   },
//   secret:process.env.NEXTAUTH_SECRET,

//   callbacks: {
//     async jwt({ token, user }: { token: any; user?: any }) {
//       if (user) {
//         token.role = user.role;
//       }

//       return token;
//     },

//     async session({ session, token }: { session: any; token: any }) {
//       session.user.role = token.role;

//       return session;
//     },
//   },
// };

export const authOptions = {
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    // Credentials provider: supports email+password OR phone+otp
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        // credentials can be email/password OR phone/otp depending on flow
        email: { label: "Email", type: "text", placeholder: "john@doe.com" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) throw new Error("Missing credentials");
        await connectToDb();

        // 1) Email + Password login
        if (credentials.email && credentials.password) {
          const user = await User.findOne({ email: credentials.email });
          if (!user) throw new Error("User not found");
          const ok = await bcrypt.compare(credentials.password, user.password);
          if (!ok) throw new Error("Invalid credentials");
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        // 2) Phone + OTP login
        if (credentials.phone && credentials.otp) {
          const cleanPhone = credentials.phone.replace(/\s+/g, "");
          // find most recent unused OTP for phone
         // console.log("Looking for OTP for phone:", cleanPhone);
          const otpDoc = await Otp.findOne({
            phone: cleanPhone, 
            code: credentials.otp, 
            used: false,
          }).sort({ createdAt: -1 });
          console.log("Found OTP doc:", otpDoc);
          if (!otpDoc) throw new Error("OTP not found or expired");
          if (otpDoc.expiresAt < new Date()) throw new Error("OTP expired");
          if (otpDoc.code !== credentials.otp) throw new Error("Invalid OTP");

          // mark OTP used
          otpDoc.used = true;
          await otpDoc.save();

          // find or create user by phone
          let user = await User.findOne({ phone: credentials.phone });
          if (!user) {
            // create a user with a random password (you can prompt for profile creation later)
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashed = await bcrypt.hash(randomPassword, 10);
            user = await User.create({
              name: `User${credentials.phone.slice(-4)}`,
              email: `user${credentials.phone.slice(-4)}@example.com`, // dummy email
              password: hashed,
              phone: credentials.phone,
              role: "customer",
            });
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        throw new Error("Invalid sign in method");
      },
    }),
  ],

  session: { strategy: "jwt" as const, maxAge: 60 * 60 * 24 * 7 },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user?: any;
      account?: any;
      profile?: any;
    }) {
      // When OAuth (Google) signs in, upsert user in DB
      try {
        await connectToDb();
        if (account?.provider === "google") {
          const email = (profile as any)?.email;
          const name =
            (profile as any)?.name || (profile as any)?.email?.split("@")[0];
          if (!email) return false;

          // upsert user
          let dbUser = await User.findOne({ email });
          if (!dbUser) {
            // create with random password
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashed = await bcrypt.hash(randomPassword, 10);
            dbUser = await User.create({
              name,
              email,
              password: hashed,
              role: "customer",
            });
          } else {
            // update name if missing
            if (!dbUser.name && name) {
              dbUser.name = name;
              await dbUser.save();
            }
          }
        }
        return true;
      } catch (err) {
        console.error("signIn callback error", err);
        return false;
      }
    },

    async jwt({ token, user }: { token: any; user?: any }) {
      // attach role and id from returned user when possible
      if (user) {
        if ((user as any).id) token.id = (user as any).id;
        if ((user as any).role) token.role = (user as any).role;
        if ((user as any).email) token.email = (user as any).email;
      }
      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      (session as any).user.id = token.id;
      (session as any).user.role = token.role;
      (session as any).user.email = token.email;
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },
};
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
