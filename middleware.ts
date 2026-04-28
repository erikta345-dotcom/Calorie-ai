export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)",
  ],
};
