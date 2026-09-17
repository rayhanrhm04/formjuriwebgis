"use client";

import { CheckCircle2, ClipboardList, Gavel, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-request";
import { AdminHeading } from "./admin-shell";
import { SkeletonCards } from "@/components/ui";

type Stats = [number, number, number, number];
type StatItem = { label: string; value: number; icon: LucideIcon };

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void adminRequest<{ stats: Stats }>("/api/admin/overview")
      .then(({ stats }) => setStats(stats))
      .catch(() => setError("Unable to load competition statistics. Check the database connection."));
  }, []);
  const items: StatItem[] = stats ? [
    { label: "Total Teams", value: stats[0], icon: Users },
    { label: "Judges", value: stats[1], icon: Gavel },
    { label: "Fully Scored", value: stats[2], icon: CheckCircle2 },
    { label: "In Progress", value: stats[3], icon: ClipboardList },
  ] : [];
  return <>
    <AdminHeading title="Overview" description="Monitor competition readiness and judging progress in real time." />
    {error ? <p role="alert" className="status status-progress">{error}</p> : !stats ? <SkeletonCards count={4} /> : <section className="admin-stats">{items.map(item => { const Icon = item.icon; return <article className="card" key={item.label}><Icon size={21} color="#626cdc" /><strong>{item.value}</strong><span className="muted">{item.label}</span></article>; })}</section>}
    <section className="card" style={{ padding: 24, marginTop: 18 }}><h2 style={{ margin: "0 0 8px" }}>System status</h2><p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>Supabase is the primary data source. Submitted scores trigger real-time leaderboard updates without polling.</p></section>
  </>;
}
