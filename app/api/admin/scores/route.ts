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

  const [matrix, scoreCount] = await Promise.all([
    db.rpc("get_admin_score_matrix"),
    db.from("scores").select("id", { count: "exact", head: true }),
  ]);
  return matrix.error || scoreCount.error
    ? adminResponse({ error: "Unable to load the score matrix." }, 502)
    : adminResponse({ rows: matrix.data ?? [], scoreCount: scoreCount.count ?? 0 });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!z.object({ confirm: z.literal("RESET_ALL_SCORES") }).safeParse(body).success) {
    return adminResponse({ error: "Confirm the score reset before continuing." }, 400);
  }

  try {
    const db = createAdminClient();
    // Every score has a non-null primary key. Deleting scores also cascades to score_items.
    const { count, error } = await db.from("scores").delete({ count: "exact" }).not("id", "is", null);
    if (error) return adminResponse({ error: "Unable to reset scores." }, 502);

    const { count: remaining, error: verifyError } = await db.from("scores")
      .select("id", { count: "exact", head: true });
    if (verifyError || remaining !== 0) {
      return adminResponse({ error: "Score reset could not be verified. Reload the page and check the remaining scores." }, 502);
    }

    const { error: signalError } = await db.from("leaderboard_updates")
      .update({ changed_at: new Date().toISOString() }).eq("id", true);
    if (signalError) {
      return adminResponse({ error: "Scores were cleared, but the live leaderboard could not be refreshed. Reload the page." }, 502);
    }

    return adminResponse({ deleted: count ?? 0 });
  } catch {
    return adminResponse({ error: "Unable to reset scores." }, 502);
  }
}
