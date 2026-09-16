"use client";

import Link from "next/link";
import { ArrowLeft, Award, Medal, Radio, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { LeaderboardRow } from "@/types";
import { EmptyState, GradientHeader, LiveBadge, SkeletonCards, StatusBadge } from "@/components/ui";
import { demoLeaderboard } from "@/lib/demo-data";

function score(value:number|null){ return value===null?"—":Number(value).toFixed(2); }

export function Leaderboard() {
  const [rows,setRows]=useState<LeaderboardRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [state,setState]=useState<"live"|"connecting"|"error">("connecting");
  const [updated,setUpdated]=useState<Date|null>(null);
  const configured=isSupabaseConfigured();
  const load=useCallback(async()=>{if(!configured){setRows(demoLeaderboard);setLoading(false);setState("live");setUpdated(new Date());return;} const {data,error}=await createClient().rpc("get_leaderboard"); if(error){setState("error");setLoading(false);return;} setRows((data??[]) as LeaderboardRow[]);setUpdated(new Date());setLoading(false);},[configured]);
  useEffect(()=>{void load();if(!configured)return;const client=createClient();const channel=client.channel("leaderboard-live").on("postgres_changes",{event:"UPDATE",schema:"public",table:"leaderboard_updates"},()=>{void load();}).subscribe(status=>setState(status==="SUBSCRIBED"?"live":status==="CHANNEL_ERROR"||status==="TIMED_OUT"?"error":"connecting"));return()=>{void client.removeChannel(channel)};},[configured,load]);
  const ranked=useMemo(()=>rows.filter(row=>row.final_avg!==null),[rows]);
  const top=ranked.slice(0,3);
  return <main style={{paddingBottom:55}}><GradientHeader eyebrow="Real-Time Rankings" title={<>Live <span className="gradient-text">Leaderboard</span></>} description="Rankings update automatically whenever a judge completes both the Booth and Pitching evaluations."><div style={{display:"flex",gap:8}}><Link href="/" aria-label="Back to home" className="button button-secondary" style={{textDecoration:"none",paddingInline:13}}><ArrowLeft size={18}/></Link><LiveBadge state={state}/></div></GradientHeader>
  <div className="shell">{!configured&&<div className="demo-banner">Demo data is active • Connect Supabase to use live production data</div>}{loading?<SkeletonCards count={5}/>:!ranked.length?<EmptyState title="No scores yet" description="Rankings will appear after judges complete both sessions."/>:<>
    <section aria-label="Top three teams" className="podium">{top.map((row,index)=><article key={row.team_id} className={`card podium-card podium-${index+1}`}><div className="podium-icon">{index===0?<Trophy/>:index===1?<Medal/>:<Award/>}</div><span className="rank-label">#{row.rank}{row.is_tie?" • TIE":""}</span><h2>{row.team_name}</h2><strong>{score(row.final_avg)}</strong><span className="muted">Final score</span></article>)}</section>
    <section className="card leaderboard-wrap"><div className="leaderboard-title"><div><h2>Full standings</h2><p className="muted">{rows.length} teams • {updated?`Updated ${updated.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`:""}</p></div><Radio size={21} color="#6670dc"/></div>
      <div className="leaderboard-table"><div className="leaderboard-row table-head"><span>Rank</span><span>Team</span><span>Booth</span><span>Pitching</span><span>Final</span><span>Judges</span><span>Status</span></div>{rows.map(row=><div className="leaderboard-row" key={row.team_id}><span className="rank-cell">#{row.rank}{row.is_tie&&<small>TIE</small>}</span><span><b>{row.team_name}</b><small>{row.institution||"—"}</small></span><span>{score(row.booth_avg)}</span><span>{score(row.pitching_avg)}</span><strong>{score(row.final_avg)}</strong><span>{row.completed_judges} / {row.total_judges}</span><StatusBadge status={row.status}/></div>)}</div>
      <div className="leaderboard-cards">{rows.map(row=><article key={row.team_id} className="mobile-rank"><div><span className="rank-label">#{row.rank}{row.is_tie?" • TIE":""}</span><h3>{row.team_name}</h3><p className="muted">{row.institution||"Competition team"}</p></div><strong className="mobile-score">{score(row.final_avg)}</strong><div className="mobile-metrics"><span><small>Booth</small>{score(row.booth_avg)}</span><span><small>Pitching</small>{score(row.pitching_avg)}</span><span><small>Judges complete</small>{row.completed_judges} / {row.total_judges}</span></div><StatusBadge status={row.status}/></article>)}</div>
    </section></>}</div></main>;
}
