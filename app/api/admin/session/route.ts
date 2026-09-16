import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { committeeCookieName, committeeSessionSeconds, createCommitteeSession, hasCommitteeSession, verifyCommitteeCode } from "@/lib/committee-auth";
import { isDemoServer } from "@/lib/demo-data";
import { isSameOrigin } from "@/lib/request-origin";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function GET() {
  const session = (await cookies()).get(committeeCookieName)?.value;
  return NextResponse.json({ authenticated: await hasCommitteeSession(session), demo: isDemoServer() });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  let code: unknown;
  try { code = (await request.json()).code; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof code !== "string" || !code || code.length > 128) return NextResponse.json({ error: "Enter a valid access code." }, { status: 400 });

  try {
    const codeHash = await verifyCommitteeCode(code);
    if (!codeHash) {
      const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 15 * 60 * 1000 };
      attempts.set(ip, { count: current.count + 1, resetAt: current.resetAt });
      return NextResponse.json({ error: "Incorrect access code." }, { status: 401 });
    }
    attempts.delete(ip);
    const response = NextResponse.json({ authenticated: true, demo: isDemoServer() });
    response.cookies.set(committeeCookieName, createCommitteeSession(codeHash), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: committeeSessionSeconds,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Committee access is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(committeeCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
