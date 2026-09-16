import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { judgeCookieName, signJudgeSession } from "@/lib/session";
import { demoJudges, isDemoServer } from "@/lib/demo-data";

export async function POST(request: Request) {
  try {
    const { judgeId } = z.object({ judgeId: z.string().uuid() }).parse(await request.json());
    if (isDemoServer()) {
      if (!demoJudges.some(judge => judge.id === judgeId)) return NextResponse.json({ error: "Judge not found" }, { status: 404 });
      const response = NextResponse.json({ ok: true, demo: true });
      response.cookies.set("mapid_demo_judge", judgeId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
      return response;
    }
    const { data, error } = await createAdminClient().from("judges").select("id").eq("id", judgeId).single();
    if (error || !data) return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(judgeCookieName, signJudgeSession(judgeId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(judgeCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("mapid_demo_judge", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
