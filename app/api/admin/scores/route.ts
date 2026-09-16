import { NextRequest } from "next/server";
import { z } from "zod";
import { adminResponse, requireCommittee } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const denied = await requireCommittee(request);
  if (denied) return denied;
  const teamId = request.nextUrl.searchParams.get("teamId");
  const judgeId = request.nextUrl.searchParams.get("judgeId");
  const db = createAdminClient();

  if (teamId || judgeId) {
    if (!z.string().uuid().safeParse(teamId).success || !z.string().uuid().safeParse(judgeId).success) {
      return adminResponse({ error: "Invalid team or judge ID." }, 400);
    }
    const { data, error } = await db.from("scores")
      .select("id,status,scoring_sessions(name,slug),score_items(value,criteria(code,name,max_score,sort_order))")
      .eq("team_id", teamId!).eq("judge_id", judgeId!);
    return error ? adminResponse({ error: "Unable to load score details." }, 502) : adminResponse({ scores: data ?? [] });
  }

  const { data, error } = await db.rpc("get_admin_score_matrix");
  return error ? adminResponse({ error: "Unable to load the score matrix." }, 502) : adminResponse({ rows: data ?? [] });
}
