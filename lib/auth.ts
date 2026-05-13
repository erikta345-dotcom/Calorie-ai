import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        mode: { label: "Mode", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const mode = credentials.mode === "register" ? "register" : "login";

        const pwResult = await db.execute({
          sql: "SELECT * FROM UserPasswords WHERE id = ?",
          args: [email],
        });

        if (mode === "register") {
          if (pwResult.rows.length > 0) return null; // already exists
          const passwordHash = await hash(credentials.password, 10);
          await db.execute({
            sql: "INSERT INTO UserPasswords (id, passwordHash) VALUES (?, ?)",
            args: [email, passwordHash],
          });
          sendWelcomeEmail(email, email.split("@")[0]).catch(() => {});
        } else {
          if (pwResult.rows.length === 0) {
            // Always compare to prevent timing oracle (user enumeration)
            await compare(credentials.password, "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh6y");
            return null;
          }
          const valid = await compare(credentials.password, pwResult.rows[0].passwordHash as string);
          if (!valid) return null;
        }

        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Save email to UserSettings on Google sign-in so credentials can find it later
      if (account?.provider === "google" && token.sub && token.email) {
        const existing = await db.execute({
          sql: "SELECT id FROM UserSettings WHERE id = ?",
          args: [token.sub],
        }).catch(() => ({ rows: [1] }));
        const isNew = existing.rows.length === 0;
        await db.execute({
          sql: "INSERT INTO UserSettings (id, email) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email",
          args: [token.sub, token.email],
        }).catch(() => {});
        if (isNew) {
          const name = token.name || token.email.split("@")[0];
          sendWelcomeEmail(token.email, name as string).catch(() => {});
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub!;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
