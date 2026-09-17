"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "@/lib/admin-request";
import { AdminHeading } from "./admin-shell";
import { EmptyState, SkeletonCards, StatusBadge, Toast } from "@/components/ui";

type MatrixRow = { team_id: string; team_name: string; judge_id: string; judge_name: string; booth: number | null; pitching: number | null; final: number | null };
type Criterion = { code: string; name: string; max_score: number; sort_order: number };
type DetailItem = { value: number; criteria: Criterion | Criterion[] };
type Session = { name: string; slug: string };
type DetailScore = { id: string; status: string; scoring_sessions: Session | Session[]; score_items: DetailItem[] };

const format = (value: number | null) => value === null ? "—" : Number(value).toFixed(2);
export function ScoresMatrix() {
  const [rows, setRows] = useState<MatrixRow[] | null>(null);
  const [detail, setDetail] = useState<{ team: string; judge: string; scores: DetailScore[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void adminRequest<{ rows: MatrixRow[] }>("/api/admin/scores")
      .then(({ rows }) => setRows(rows))
      .catch(value => { setRows([]); setError(value instanceof Error ? value.message : "Unable to load scores."); });
  }, []);

  const teams = useMemo(() => {
    const grouped = new Map<string, { name: string; rows: MatrixRow[] }>();
    for (const row of rows ?? []) {
      const entry = grouped.get(row.team_id) ?? { name: row.team_name, rows: [] };
      entry.rows.push(row);
      grouped.set(row.team_id, entry);
    }
    return [...grouped.values()];
  }, [rows]);

  async function show(row: MatrixRow) {
    try {
      const params = new URLSearchParams({ teamId: row.team_id, judgeId: row.judge_id });
      const { scores } = await adminRequest<{ scores: DetailScore[] }>(`/api/admin/scores?${params}`);
      setDetail({ team: row.team_name, judge: row.judge_name, scores });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load score details.");
    }
  }

  return <>
    <AdminHeading title="Scores" description="Submitted score matrix by team and judge." />
    {rows === null ? <SkeletonCards /> : !teams.length ? <EmptyState title="No teams" description="The matrix will be available after teams are added." /> :
      <section style={{ display: "grid", gap: 13 }}>
        {teams.map(team => {
          const finals = team.rows.map(row => row.final).filter((value): value is number => value !== null);
          const average = finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null;
          return <details className="card score-team" key={team.name}>
            <summary><div><h2>{team.name}</h2><span className="muted">{finals.length} of {team.rows.length} judges complete</span></div><div><small>Average</small><strong>{format(average)}</strong></div><ChevronDown size={20} /></summary>
            <div className="score-judge-list">{team.rows.map(row => <button key={row.judge_id} onClick={() => show(row)}><span><b>{row.judge_name}</b><small>Click to view criterion details</small></span><span><small>Booth</small>{format(row.booth)}</span><span><small>Pitching</small>{format(row.pitching)}</span><strong>{format(row.final)}</strong><StatusBadge status={row.final === null ? null : "Complete"} /></button>)}</div>
          </details>;
        })}
      </section>}
    {detail && <div style={{ position: "fixed", zIndex: 60, inset: 0, background: "rgba(2,4,10,.75)", display: "grid", placeItems: "center", padding: 14 }}>
      <section role="dialog" aria-modal="true" className="card score-detail">
        <button aria-label="Close" onClick={() => setDetail(null)}><X size={18} /></button>
        <span className="eyebrow">Score Details</span><h2>{detail.team}</h2><p className="muted">{detail.judge}</p>
        {detail.scores.length ? detail.scores.map(score => {
          const session = Array.isArray(score.scoring_sessions) ? score.scoring_sessions[0] : score.scoring_sessions;
          return <div key={score.id} className="detail-session"><h3>{session?.name}</h3>{[...score.score_items].sort((a, b) => {
            const ca = Array.isArray(a.criteria) ? a.criteria[0] : a.criteria;
            const cb = Array.isArray(b.criteria) ? b.criteria[0] : b.criteria;
            return (ca?.sort_order ?? 0) - (cb?.sort_order ?? 0);
          }).map(item => {
            const criterion = Array.isArray(item.criteria) ? item.criteria[0] : item.criteria;
            return <div key={criterion?.code}><span><b>{criterion?.code}</b> {criterion?.name}</span><strong>{item.value} / {criterion?.max_score}</strong></div>;
          })}</div>;
        }) : <p className="muted">No submitted criterion scores for this judge and team.</p>}
      </section>
    </div>}
    {error && <Toast tone="error">{error}</Toast>}
  </>;
}
