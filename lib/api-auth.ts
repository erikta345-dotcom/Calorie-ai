import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextResponse } from "next/server";

type AuthOk = { uid: string; session: Session; error: null };
type AuthFail = { uid: null; session: null; error: NextResponse };
type AuthResult = AuthOk | AuthFail;

export async function requireAuth(rateLimitKey: string, limit: number, windowMs = 60_000): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { uid: null, session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`${rateLimitKey}:${uid}`, limit, windowMs))) {
    return { uid: null, session: null, error: NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 }) };
  }
  return { uid, session, error: null };
}

export async function requireAuthOnly(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { uid: null, session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { uid: (session.user as any).id as string, session, error: null };
}
