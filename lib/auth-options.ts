import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { connectToDb } from "@/lib/db";
import User from "@/models/user";
import Otp from "@/models/otp";
import { deactivatePushSession, newPushSessionId, pushSessionHash } from "@/lib/push-session";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "john@doe.com" },
        password: { label: "Password", type: "password" },
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) throw new Error("Missing credentials");
        await connectToDb();

        if (credentials.email && credentials.password) {
          const user = await User.findOne({
            email: credentials.email.trim().toLowerCase(),
            isActive: { $ne: false },
          });
          if (!user) throw new Error("User not found");
          const ok = await bcrypt.compare(credentials.password, user.password);
          if (!ok) throw new Error("Invalid credentials");
          if (
            user.mustChangePassword &&
            user.temporaryPasswordExpiresAt <= new Date()
          )
            throw new Error(
              "Temporary password expired. Ask your provider for a new credential.",
            );
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            mustChangePassword: Boolean(user.mustChangePassword),
            credentialVersion: user.credentialVersion || 0,
          };
        }

        if (credentials.phone && credentials.otp) {
          const cleanPhone = credentials.phone.replace(/[\s()-]/g, "");

          const otpDoc = await Otp.findOne({
            phone: cleanPhone,
            code: credentials.otp,
            used: false,
          }).sort({ createdAt: -1 });
          if (!otpDoc) throw new Error("OTP not found or expired");
          if (otpDoc.expiresAt < new Date()) throw new Error("OTP expired");
          if (otpDoc.code !== credentials.otp) throw new Error("Invalid OTP");

          otpDoc.used = true;
          await otpDoc.save();

          let user = await User.findOne({ phone: cleanPhone });
          if (
            user &&
            (user.isActive === false ||
              (user.mustChangePassword &&
                user.temporaryPasswordExpiresAt <= new Date()))
          )
            throw new Error(
              "This account needs an active credential from its provider.",
            );
          if (!user) {
            const randomPassword = randomBytes(32).toString("base64url");
            const hashed = await bcrypt.hash(randomPassword, 10);
            user = await User.create({
              name: `User${credentials.phone.slice(-4)}`,
              email: `phone-${cleanPhone.replace(/\D/g, "")}@service.local`,
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
            mustChangePassword: Boolean(user.mustChangePassword),
            credentialVersion: user.credentialVersion || 0,
          };
        }

        throw new Error("Invalid sign in method");
      },
    }),
  ],

  session: { strategy: "jwt" as const, maxAge: 60 * 60 * 24 * 7 },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connectToDb();

        if (account?.provider === "google") {
          const email = profile?.email || user?.email;

          const name =
            profile?.name || user?.name || email?.split("@")[0] || "Customer";

          if (!email) {
            console.error("Google sign-in failed: email missing");

            return false;
          }

          let dbUser = await User.findOne({
            email,
          });

          if (!dbUser) {
            const randomPassword = randomBytes(32).toString("base64url");

            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            dbUser = await User.create({
              name,
              email,
              password: hashedPassword,
              role: "customer",
              phone: null,
            });
          } else {
            let changed = false;

            if (!dbUser.name && name) {
              dbUser.name = name;

              changed = true;
            }

            if (changed) {
              await dbUser.save();
            }
          }

          user.id = dbUser._id.toString();

          user.name = dbUser.name;

          user.email = dbUser.email;

          user.role = dbUser.role;

          user.phone = dbUser.phone ?? null;
          if (dbUser.isActive === false) return false;
          user.mustChangePassword = Boolean(dbUser.mustChangePassword);
          user.credentialVersion = dbUser.credentialVersion || 0;

          return true;
        }

        return true;
      } catch (error) {
        console.error("signIn callback error:", error);

        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.pushSessionId = newPushSessionId();
        token.mustChangePassword = Boolean(user.mustChangePassword);
        token.credentialVersion = user.credentialVersion || 0;

        token.role = user.role;

        token.email = user.email;

        token.phone = user.phone ?? null;

        token.name = user.name;

        return token;
      }

      // Older trusted sessions acquire a private push association on their next refresh.
      if (token.id && !pushSessionHash(token.pushSessionId)) token.pushSessionId = newPushSessionId();
      try {
        if (
          token.email &&
          (!token.id || !token.role || token.phone === undefined)
        ) {
          await connectToDb();

          const dbUser = await User.findOne({
            email: token.email,
          }).lean();

          if (dbUser) {
            token.id = dbUser._id.toString();

            token.role = dbUser.role;

            token.email = dbUser.email;

            token.phone = dbUser.phone ?? null;

            token.name = dbUser.name;
          }
        }
      } catch (error) {
        console.error("jwt callback DB fetch error:", error);
      }

      return token;
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id || "";
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.credentialVersion = token.credentialVersion || 0;

        session.user.role = token.role || "";

        session.user.email = token.email;

        session.user.phone = token.phone ?? null;

        session.user.name = token.name;
      }

      return session;
    },
  },

  events: {
    async signOut(message) {
      if ("token" in message) await deactivatePushSession(message.token);
    },
  },

  pages: {
    signIn: "/signin",
  },
};
