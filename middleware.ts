import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|api/debug|api/health|api/cron|api/admin|login|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)",
  ],
};
