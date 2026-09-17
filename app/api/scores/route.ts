import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { judgeCookieName, verifyJudgeSession } from "@/lib/session";
import { scorePayloadSchema } from "@/lib/validations/score";

async function currentJudgeId() { return verifyJudgeSession((await cookies()).get(judgeCookieName)?.value); }

export async function GET(request: Request) {
  try {
    const judgeId = await currentJudgeId();
    if (!judgeId) return NextResponse.json({ error: "The judge session has expired" }, { status: 401 });
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    const sessionSlug = url.searchParams.get("session");
    if (!teamId || !sessionSlug) return NextResponse.json({ error: "Required parameters are missing" }, { status: 400 });
    const db = createAdminClient();
    const { data: session, error: sessionError } = await db.from("scoring_sessions").select("id,slug,name,weight").eq("slug", sessionSlug).single();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ error: "Scoring session not found" }, { status: 404 });
    const [teamResult, criteriaResult, scoreResult] = await Promise.all([
      db.from("teams").select("id,name,institution,project_title").eq("id", teamId).single(),
      db.from("criteria").select("*").eq("session_id", session.id).order("sort_order"),
      db.from("scores").select("id,status,updated_at,score_items(criterion_id,value)").eq("judge_id", judgeId).eq("team_id", teamId).eq("session_id", session.id).maybeSingle(),
    ]);
    if (teamResult.error || criteriaResult.error || scoreResult.error) throw new Error("Database query failed");
    const team = teamResult.data, criteria = criteriaResult.data, score = scoreResult.data;
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ team, session, criteria: criteria ?? [], score });
  } catch {
    return NextResponse.json({ error: "Unable to load scoring data" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const judgeId = await currentJudgeId();
    if (!judgeId) return NextResponse.json({ error: "The judge session has expired" }, { status: 401 });
    const payload = scorePayloadSchema.parse(await request.json());
    const db = createAdminClient();
    const { data, error } = await db.rpc("save_judge_score", { p_judge_id: judgeId, p_team_id: payload.teamId, p_session_slug: payload.sessionSlug, p_status: payload.status, p_items: payload.items.map(item => ({ criterion_id: item.criterionId, value: item.value })) });
    if (error) throw error;

    if (payload.status === "submitted" && process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
      after(async () => { await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scoreId: data, judgeId, ...payload }) }).catch(() => undefined); });
    }
    return NextResponse.json({ ok: true, scoreId: data });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    return NextResponse.json({ error: invalid ? "Invalid score" : "Unable to save the score" }, { status: invalid ? 400 : 502 });
  }
}
