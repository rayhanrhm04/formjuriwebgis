import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { judgeCookieName, verifyJudgeSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoJudges, demoTeams, isDemoServer } from "@/lib/demo-data";

export async function GET() {
  try {
    if (isDemoServer()) {
      const judgeId = (await cookies()).get("mapid_demo_judge")?.value;
      return NextResponse.json({ judge: demoJudges.find(judge => judge.id === judgeId) ?? null, teams: demoTeams, scores: [], demo: true });
    }
    const judgeId = verifyJudgeSession((await cookies()).get(judgeCookieName)?.value);
    if (!judgeId) return NextResponse.json({ judge: null });
    const db = createAdminClient();
    const [{ data: judge }, { data: teams }, { data: scores }] = await Promise.all([
      db.from("judges").select("id,name,email").eq("id", judgeId).single(),
      db.from("teams").select("id,name,institution,project_title,created_at").order("name"),
      db.from("scores").select("team_id,status,scoring_sessions(slug)").eq("judge_id", judgeId),
    ]);
    return NextResponse.json({ judge, teams: teams ?? [], scores: scores ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to read the judge session" }, { status: 500 });
  }
}
