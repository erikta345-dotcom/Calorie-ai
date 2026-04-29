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
        const result = await db.execute({
          sql: "SELECT * FROM UserPasswords WHERE id = ?",
          args: [email],
        });
        if (result.rows.length === 0) {
          const passwordHash = await hash(credentials.password, 10);
          await db.execute({
            sql: "INSERT INTO UserPasswords (id, passwordHash) VALUES (?, ?)",
            args: [email, passwordHash],
          });
          return { id: email, email, name: email.split("@")[0] };
        }
        const valid = await compare(credentials.password, result.rows[0].passwordHash as string);
        if (!valid) return null;
        return { id: email, email, name: email.split("@")[0] };
      },
    }),
  ],
  callbacks: {
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
