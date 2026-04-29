import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/prisma";

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();

        // Check if Google user already exists with this email → reuse their ID
        const existing = await db.execute({
          sql: "SELECT id FROM UserSettings WHERE email = ?",
          args: [email],
        });
        const userId = existing.rows.length > 0 ? (existing.rows[0].id as string) : email;

        const pwResult = await db.execute({
          sql: "SELECT * FROM UserPasswords WHERE id = ?",
          args: [email],
        });
        if (pwResult.rows.length === 0) {
          const passwordHash = await hash(credentials.password, 10);
          await db.execute({
            sql: "INSERT INTO UserPasswords (id, passwordHash) VALUES (?, ?)",
            args: [email, passwordHash],
          });
        } else {
          const valid = await compare(credentials.password, pwResult.rows[0].passwordHash as string);
          if (!valid) return null;
        }

        return { id: userId, email, name: email.split("@")[0] };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Save email to UserSettings on Google sign-in so credentials can find it later
      if (account?.provider === "google" && token.sub && token.email) {
        await db.execute({
          sql: "INSERT INTO UserSettings (id, email) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email",
          args: [token.sub, token.email],
        }).catch(() => {});
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
