import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { judgeCookieName, verifyJudgeSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const judgeId = verifyJudgeSession((await cookies()).get(judgeCookieName)?.value);
    if (!judgeId) {
      const response = NextResponse.json({ judge: null, teams: [], scores: [] });
      response.cookies.set("mapid_demo_judge", "", { httpOnly: true, path: "/", maxAge: 0 });
      return response;
    }
    const db = createAdminClient();
    const [judgeResult, teamsResult, scoresResult] = await Promise.all([
      db.from("judges").select("id,name,email").eq("id", judgeId).single(),
      db.from("teams").select("id,name,institution,project_title,created_at").order("name"),
      db.from("scores").select("team_id,status,scoring_sessions(slug)").eq("judge_id", judgeId),
    ]);
    if (judgeResult.error || teamsResult.error || scoresResult.error) throw new Error("Database query failed");
    const response = NextResponse.json({ judge: judgeResult.data, teams: teamsResult.data ?? [], scores: scoresResult.data ?? [] });
    response.cookies.set("mapid_demo_judge", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to read the judge session" }, { status: 500 });
  }
}
