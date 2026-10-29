import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getRoleHome } from "@/lib/role-route";
import { safeCustomerDestination, authHref } from "@/lib/booking-redirect";
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  let token;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch {
    token = null;
  }
  if (!token) {
    const destination =
      safeCustomerDestination(pathname + search) ||
      safeCustomerDestination(pathname);
    return NextResponse.redirect(
      new URL(authHref("/signin", destination), req.url),
    );
  }
  const role = typeof token.role === "string" ? token.role : "";
  if (token.mustChangePassword)
    return NextResponse.redirect(new URL("/change-password", req.url));
  const required = pathname.startsWith("/customer")
    ? ["customer"]
    : pathname.startsWith("/service-provider")
      ? ["service_provider"]
      : pathname.startsWith("/technician")
        ? ["technician"]
        : pathname.startsWith("/admin")
          ? ["admin"]
          : pathname.startsWith("/dispatcher")
            ? ["dispatcher"]
            : null;
  if (required && !required.includes(role))
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/dispatcher/:path*",
    "/technician/:path*",
    "/customer/:path*",
    "/service-provider/:path*",
    "/notifications",
    "/your-profile",
  ],
};
