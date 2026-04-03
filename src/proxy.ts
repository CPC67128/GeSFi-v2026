import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe auth check — no DB, verifies JWT only
const { auth } = NextAuth(authConfig);

export { auth as proxy };

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
