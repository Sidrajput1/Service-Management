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
            phone: user.phone,
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

  // callbacks: {
  //   async signIn({
  //     user,
  //     account,
  //     profile,
  //   }: {
  //     user?: any;
  //     account?: any;
  //     profile?: any;
  //   }) {
  //     // When OAuth (Google) signs in, upsert user in DB
  //     try {
  //       await connectToDb();
  //       if (account?.provider === "google") {
  //         const email = (profile as any)?.email;
  //         const name =
  //           (profile as any)?.name || (profile as any)?.email?.split("@")[0];
  //         if (!email) return false;

  //         // upsert user
  //         let dbUser = await User.findOne({ email });
  //         if (!dbUser) {
  //           // create with random password
  //           const randomPassword = Math.random().toString(36).slice(-8);
  //           const hashed = await bcrypt.hash(randomPassword, 10);
  //           dbUser = await User.create({
  //             name,
  //             email,
  //             password: hashed,
  //             role: "customer",
  //             phone: null,
  //           });
  //         } else {
  //           // update name if missing
  //           if (!dbUser.name && name) {
  //             dbUser.name = name;
  //             await dbUser.save();
  //           }
  //           /*
  //            * Existing account:
  //            * NEVER overwrite the existing role.
  //            */
  //           // let changed = false;

  //           // if (!dbUser.name && name) {
  //           //   dbUser.name = name;
  //           //   changed = true;
  //           // }

  //           // if (changed) {
  //           //   await dbUser.save();
  //           // }
  //         }
  //       }
  //     } catch (err) {
  //       console.error("signIn callback error", err);
  //       return false;
  //     }
  //   },

  //   async jwt({ token, user }: { token: any; user?: any }) {
  //     // attach role and id from returned user when possible
  //     if (user) {
  //       if ((user as any).id) token.id = (user as any).id;
  //       if ((user as any).role) token.role = (user as any).role;
  //       if ((user as any).email) token.email = (user as any).email;
  //       if ((user as any).phone) token.phone = (user as any).phone;
  //       return token;
  //     }

  //     try {
  //       // only hit DB if we are missing important fields
  //       if (
  //         (!token.phone || !token.role || !token.id) &&
  //         (token.email || token.sub || token.id)
  //       ) {
  //         await connectToDb();

  //         // prefer id if available, otherwise email
  //         let dbUser = null;
  //         if (token.id) {
  //           dbUser = await User.findById(token.id).lean();
  //         }
  //         if (!dbUser && token.email) {
  //           dbUser = await User.findOne({ email: token.email }).lean();
  //         }

  //         if (dbUser) {
  //           token.id = dbUser._id.toString();
  //           token.role = dbUser.role;
  //           token.email = dbUser.email;
  //           token.phone = dbUser.phone;
  //         }
  //       }
  //     } catch (err) {
  //       console.error("jwt callback DB fetch error:", err);
  //     }
  //     return token;
  //   },

  //   async session({ session, token }: { session: any; token: any }) {
  //     (session as any).user.id = token.id;
  //     (session as any).user.role = token.role;
  //     (session as any).user.email = token.email;
  //     (session as any).user.phone = token.phone;
  //     return session;
  //   },
  // },

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
    try {
      await connectToDb();

      /*
       * -----------------------------------------
       * GOOGLE OAUTH
       * -----------------------------------------
       */
      if (account?.provider === "google") {
        const email =
          (profile as any)?.email ||
          user?.email;

        const name =
          (profile as any)?.name ||
          user?.name ||
          email?.split("@")[0] ||
          "Customer";

        if (!email) {
          console.error(
            "Google sign-in failed: email missing",
          );

          return false;
        }

        /*
         * Find application user by email.
         */
        let dbUser =
          await User.findOne({
            email,
          });

        /*
         * New Google account
         *
         * Google signup is ALWAYS customer signup.
         */
        if (!dbUser) {
          const randomPassword =
            Math.random()
              .toString(36)
              .slice(-12);

          const hashedPassword =
            await bcrypt.hash(
              randomPassword,
              10,
            );

          dbUser =
            await User.create({
              name,
              email,
              password:
                hashedPassword,
              role: "customer",
              phone: null,
            });
        } else {
          /*
           * Existing account:
           * NEVER overwrite its role.
           */
          let changed = false;

          if (
            !dbUser.name &&
            name
          ) {
            dbUser.name =
              name;

            changed = true;
          }

          if (changed) {
            await dbUser.save();
          }
        }

        /*
         * IMPORTANT
         *
         * Replace Google's provider ID with our
         * MongoDB User._id.
         */
        user.id =
          dbUser._id.toString();

        user.name =
          dbUser.name;

        user.email =
          dbUser.email;

        user.role =
          dbUser.role;

        user.phone =
          dbUser.phone ?? null;

        return true;
      }

      /*
       * -----------------------------------------
       * CREDENTIALS
       * -----------------------------------------
       *
       * authorize() already validated the user
       * and returned the DB user.
       *
       * Just allow the sign-in.
       */
      return true;
    } catch (error) {
      console.error(
        "signIn callback error:",
        error,
      );

      return false;
    }
  },

  async jwt({
    token,
    user,
  }: {
    token: any;
    user?: any;
  }) {
    /*
     * -----------------------------------------
     * FIRST LOGIN
     * -----------------------------------------
     */
    if (user) {
      /*
       * authorize() for Credentials and signIn()
       * for Google both provide the application
       * MongoDB user ID.
       */
      token.id =
        user.id;

      token.role =
        user.role;

      token.email =
        user.email;

      token.phone =
        user.phone ?? null;

      token.name =
        user.name;

      return token;
    }

    /*
     * -----------------------------------------
     * REFRESH TOKEN DATA
     * -----------------------------------------
     *
     * IMPORTANT:
     * Don't blindly call findById(token.id).
     *
     * Older/stale sessions may contain a Google
     * provider ID instead of a MongoDB ObjectId.
     *
     * Email is our safer recovery mechanism.
     * -----------------------------------------
     */
    try {
      /*
       * Only refresh when important fields are missing.
       */
      if (
        token.email &&
        (
          !token.id ||
          !token.role ||
          token.phone === undefined
        )
      ) {
        await connectToDb();

        const dbUser =
          await User.findOne({
            email:
              token.email,
          }).lean();

        if (dbUser) {
          token.id =
            dbUser._id.toString();

          token.role =
            dbUser.role;

          token.email =
            dbUser.email;

          token.phone =
            dbUser.phone ?? null;

          token.name =
            dbUser.name;
        }
      }
    } catch (error) {
      console.error(
        "jwt callback DB fetch error:",
        error,
      );
    }

    return token;
  },

  async session({
    session,
    token,
  }: {
    session: any;
    token: any;
  }) {
    if (session?.user) {
      session.user.id =
        token.id;

      session.user.role =
        token.role;

      session.user.email =
        token.email;

      session.user.phone =
        token.phone ?? null;

      session.user.name =
        token.name;
    }

    return session;
  },
},

  pages: {
    signIn: "/signin",
  },
};
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
