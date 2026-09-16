import { NextRequest } from "next/server";
import { adminResponse, requireCommittee } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeaderboardRow } from "@/types";

export async function GET(request: NextRequest) {
  const denied = await requireCommittee(request);
  if (denied) return denied;
  const db = createAdminClient();
  const [teams, judges, leaderboard] = await Promise.all([
    db.from("teams").select("id", { count: "exact", head: true }),
    db.from("judges").select("id", { count: "exact", head: true }),
    db.rpc("get_leaderboard"),
  ]);
  if (teams.error || judges.error || leaderboard.error) {
    return adminResponse({ error: "Unable to load competition statistics." }, 502);
  }
  const rows = (leaderboard.data ?? []) as LeaderboardRow[];
  return adminResponse({ stats: [
    teams.count ?? 0,
    judges.count ?? 0,
    rows.filter(row => row.status === "Complete").length,
    rows.filter(row => row.status === "In Progress").length,
  ] });
}
