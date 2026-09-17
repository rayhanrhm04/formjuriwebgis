"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, LogOut, Search, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Judge, ScoreStatus, Team } from "@/types";
import { EmptyState, GradientHeader, SkeletonCards, StatusBadge } from "@/components/ui";

type ScoreSummary = { team_id: string; status: ScoreStatus; scoring_sessions: { slug: string } | Array<{ slug: string }> | null };
type DashboardData = { judge: Judge | null; teams: Team[]; scores: ScoreSummary[] };

export function JudgeDashboard() {
  const [data,setData] = useState<DashboardData | null>(null);
  const [judges,setJudges] = useState<Judge[]>([]);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("All");
  const [error,setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/judge/me", { cache:"no-store" });
      if (!response.ok) throw new Error();
      const value = await response.json() as DashboardData;
      if (!value.judge) {
        const judgesResponse = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesResponse.ok) throw new Error("The judge list could not be loaded. Check the database connection.");
        const judgePayload = await judgesResponse.json() as { judges: Judge[] };
        setJudges(judgePayload.judges);
      }
      setData(value);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load judging data."); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  async function choose(judgeId:string) {
    const response = await fetch("/api/judge/select", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({judgeId}) });
    if (response.ok) await load(); else setError("We couldn’t select this judge.");
  }
  async function logout() { await fetch("/api/judge/select",{method:"DELETE"}); setData({judge:null,teams:[],scores:[]}); await load(); }

  const statusFor = useCallback((teamId:string, slug:string) => {
    const found = data?.scores.find(score => { const session = Array.isArray(score.scoring_sessions) ? score.scoring_sessions[0] : score.scoring_sessions; return score.team_id === teamId && session?.slug === slug; });
    return found?.status ?? null;
  },[data]);
  const completed = data?.teams.filter(team => statusFor(team.id,"booth") === "submitted" && statusFor(team.id,"pitching") === "submitted").length ?? 0;
  const filtered = useMemo(() => (data?.teams ?? []).filter(team => {
    const booth=statusFor(team.id,"booth"), pitching=statusFor(team.id,"pitching");
    const state = booth === "submitted" && pitching === "submitted" ? "Complete" : booth || pitching ? "In Progress" : "Not Scored";
    return (filter === "All" || state === filter) && `${team.name} ${team.institution ?? ""} ${team.project_title ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }),[data,filter,query,statusFor]);

  if (!data) return <main><GradientHeader title={error ? "Judging workspace unavailable" : "Loading the judging workspace…"}/><div className="shell">{error ? <div className="card" role="alert" style={{padding:24}}><p>{error}</p><button className="button button-secondary" onClick={()=>void load()}>Try again</button></div> : <SkeletonCards/>}</div></main>;
  if (!data.judge) return <main><GradientHeader eyebrow="Judge Access" title={<>Select <span className="gradient-text">your name</span></>} description="Your identity is used to save your progress and scores."/><div className="shell" style={{paddingBottom:50}}>{error && <p role="alert" className="status status-progress" style={{marginBottom:16}}>{error}</p>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:14}}>{judges.map((judge,index)=><button key={judge.id} onClick={()=>choose(judge.id)} className="card" style={{padding:20,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:15,color:"inherit"}}><span style={{width:44,height:44,borderRadius:14,background:"#eef0ff",display:"grid",placeItems:"center",fontWeight:850,color:"#5a65d7"}}>{index+1}</span><span style={{fontWeight:780,lineHeight:1.35,flex:1}}>{judge.name}</span><ArrowRight size={18} color="#7c8496"/></button>)}</div>{!judges.length && !error && <EmptyState title="No judges available" description="The committee can add judges from the admin dashboard."/>}</div></main>;

  return <main style={{paddingBottom:50}}><GradientHeader eyebrow="Judge Dashboard" title={<>Welcome,<br/><span className="gradient-text">{data.judge.name}</span></>} description="Select a team, then complete both the Booth and Pitching evaluations."><button onClick={logout} className="button button-secondary" aria-label="Switch judge"><LogOut size={17}/> <span className="hidden sm:inline">Switch judge</span></button></GradientHeader>
    <div className="shell"><section style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>{([
      {label:"Total Teams",value:data.teams.length,icon:Users},{label:"Complete",value:completed,icon:CheckCircle2},{label:"Incomplete",value:data.teams.length-completed,icon:ClipboardList}
    ] satisfies Array<{label:string;value:number;icon:LucideIcon}>).map(item=>{const Icon=item.icon;return <div className="card" key={item.label} style={{padding:"clamp(14px,3vw,21px)"}}><Icon size={19} color="#626cdc"/><div style={{fontSize:"clamp(23px,5vw,32px)",fontWeight:850,margin:"12px 0 3px"}}>{item.value}</div><div className="muted" style={{fontSize:12}}>{item.label}</div></div>})}</section>
    <section className="card" style={{padding:14,display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}><label style={{position:"relative",flex:"1 1 240px"}}><Search size={18} style={{position:"absolute",left:14,top:15,color:"#8b93a5"}}/><span className="sr-only">Search teams</span><input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by team, institution, or project" style={{paddingLeft:43}}/></label><select className="input" aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:"auto",minWidth:155}}>{["All","Not Scored","In Progress","Complete"].map(item=><option key={item}>{item}</option>)}</select></section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:14}}>{filtered.map(team=>{const booth=statusFor(team.id,"booth"),pitching=statusFor(team.id,"pitching"); const done=Number(booth==="submitted")+Number(pitching==="submitted"); return <article className="card" key={team.id} style={{padding:20}}><div style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"start"}}><div><h2 style={{fontSize:19,margin:"0 0 5px"}}>{team.name}</h2><p className="muted" style={{fontSize:13,margin:0}}>{team.institution || team.project_title || "Competition team"}</p></div><StatusBadge status={done===2?"Complete":done?"In Progress":null}/></div><div style={{height:7,background:"#eef0f5",borderRadius:99,overflow:"hidden",margin:"20px 0 17px"}}><div style={{height:"100%",width:`${done*50}%`,background:"linear-gradient(90deg,#4385f4,#8658e8)",transition:"width .3s"}}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><Link className="button button-secondary" href={`/judge/score/${team.id}/booth`} style={{textDecoration:"none",fontSize:13}}>Booth <StatusBadge status={booth}/></Link><Link className="button button-secondary" href={`/judge/score/${team.id}/pitching`} style={{textDecoration:"none",fontSize:13}}>Pitching <StatusBadge status={pitching}/></Link></div><p className="muted" style={{fontSize:12,margin:"14px 0 0"}}>{done} of 2 sessions complete</p></article>})}</section>
    {!filtered.length && <EmptyState title="No teams found" description={data.teams.length ? "Try a different search or status filter." : "The committee has not added any teams yet."}/>}</div>
  </main>;
}
