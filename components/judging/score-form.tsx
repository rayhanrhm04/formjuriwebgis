"use client";

import Link from "next/link";
import { ArrowLeft, Check, Info, Save, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateBoothScore, calculatePitchingScore } from "@/lib/scoring/calculate";
import type { Criterion, Score, ScoringSession, SessionSlug, Team } from "@/types";
import { Brand, SkeletonCards, Toast } from "@/components/ui";

type Payload = { team: Team; session: ScoringSession; criteria: Criterion[]; score: (Score & { score_items: Array<{criterion_id:string;value:number}> }) | null };

export function ScoreForm({teamId,sessionSlug}:{teamId:string;sessionSlug:SessionSlug}) {
  const [data,setData] = useState<Payload|null>(null);
  const [values,setValues] = useState<Record<string,number|null>>({});
  const [saving,setSaving] = useState(false);
  const [confirm,setConfirm] = useState(false);
  const [toast,setToast] = useState<{tone:"success"|"error";text:string}|null>(null);
  const refs = useRef<Record<string,HTMLElement|null>>({});

  useEffect(()=>{ let active=true; (async()=>{try{const response=await fetch(`/api/scores?teamId=${teamId}&session=${sessionSlug}`,{cache:"no-store"}); if(!response.ok) throw new Error(); const payload=await response.json() as Payload; if(!active)return; setData(payload); const existing=new Map((payload.score?.score_items??[]).map(item=>[item.criterion_id,Number(item.value)])); setValues(Object.fromEntries(payload.criteria.map(item=>[item.id,existing.get(item.id)??null])));}catch{setToast({tone:"error",text:"Unable to load the scoring form."});}})(); return()=>{active=false};},[teamId,sessionSlug]);

  const orderedValues = useMemo(() => data?.criteria.map(item=>values[item.id] ?? null) ?? [], [data?.criteria, values]);
  const total = useMemo(()=>sessionSlug==="booth"?calculateBoothScore(orderedValues):calculatePitchingScore(orderedValues),[orderedValues,sessionSlug]);
  const missing = orderedValues.filter(value=>value===null).length;
  const raw = orderedValues.reduce<number>((sum,value)=>sum+(value??0),0);
  const completed = orderedValues.length-missing;

  async function save(status:"draft"|"submitted") {
    if (!data) return;
    if (status === "submitted" && missing) {
      setToast({tone:"error",text:`${missing} criteria still need a score.`});
      const first=data.criteria.find(item=>values[item.id]===null); if(first) refs.current[first.id]?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    const items=data.criteria.filter(item=>values[item.id]!==null).map(item=>({criterionId:item.id,value:values[item.id]}));
    if (!items.length) { setToast({tone:"error",text:"Score at least one criterion before saving a draft."}); return; }
    setSaving(true); setConfirm(false);
    try { const response=await fetch("/api/scores",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({teamId,sessionSlug,status,items})}); const result=await response.json() as {error?:string}; if(!response.ok) throw new Error(result.error); setData({...data,score:{...(data.score??{id:"",judge_id:"",team_id:teamId,session_id:data.session.id,updated_at:new Date().toISOString(),score_items:[]}),status,score_items:items.map(item=>({criterion_id:item.criterionId,value:item.value??0}))}}); setToast({tone:"success",text:status==="submitted"?"Score saved. The leaderboard has been updated.":"Draft saved."}); }
    catch(error){setToast({tone:"error",text:error instanceof Error?error.message:"We couldn’t save your score. Your input is still safe on this screen."});}
    finally{setSaving(false); setTimeout(()=>setToast(null),4200);}
  }

  if (!data) return <main><div className="shell" style={{padding:"22px 0"}}><Brand/><div style={{marginTop:50}}>{toast ? <div className="card" role="alert" style={{padding:24}}><p>{toast.text}</p><Link href="/judge" className="button button-secondary">Back to teams</Link></div> : <SkeletonCards count={4}/>}</div></div></main>;
  const wasSubmitted=data.score?.status==="submitted";
  return <main className="score-page">
    <header className="score-nav"><div className="shell"><Link href="/judge" className="score-back" aria-label="Back to the team list"><ArrowLeft size={18}/><span>All teams</span></Link><div className="score-team-label"><span>{data.team.institution || "Competition team"}</span><strong>{data.team.name}</strong></div></div></header>

    <div className="shell score-heading"><div><span className="score-kicker">{sessionSlug==="booth"?"01 / Booth Evaluation":"02 / Presentation Evaluation"}</span><h1>{data.session.name}</h1><p>Assign a score for every criterion. Each section totals 100 points and contributes 50% to the final score.</p></div>{wasSubmitted&&<div className="score-notice"><Info size={16}/><span>This score has already been submitted. Any changes will update the leaderboard.</span></div>}</div>

    <div className="shell score-layout">
      <section className="criteria-panel" aria-label={`${data.session.name} scoring criteria`}>
        <div className="criteria-header"><span>Criterion</span><span>Judge score</span></div>
        {data.criteria.map(criterion=>{const value=values[criterion.id];const progress=((value??0)/criterion.max_score)*100;return <article key={criterion.id} ref={node=>{refs.current[criterion.id]=node}} className={`criterion-row ${value===null?"is-empty":"is-scored"}`}>
          <div className="criterion-copy"><div className="criterion-meta"><span>{criterion.code}</span><span>{criterion.max_score} points</span></div><h2>{criterion.name}</h2><p>{criterion.description}</p></div>
          <div className="criterion-control"><output aria-live="polite">{value===null?"—":value}<small> / {criterion.max_score}</small></output><label><span className="sr-only">Score for {criterion.name}</span><input className="score-slider" style={{"--slider-progress":`${progress}%`} as React.CSSProperties} type="range" min={0} max={criterion.max_score} step={1} value={value??0} onChange={event=>setValues(current=>({...current,[criterion.id]:Number(event.target.value)}))}/></label><div className="slider-scale"><span>0</span><span>{criterion.max_score}</span></div></div>
        </article>})}
      </section>

      <aside className="score-summary">
        <div className="summary-card"><div className="summary-label">Section score</div><div className="summary-total"><strong>{total===null?raw:total.toFixed(0)}</strong><span>/ 100</span></div><div className="summary-progress"><span style={{width:`${(completed/data.criteria.length)*100}%`}}/></div><p>{missing?`${completed} of ${data.criteria.length} criteria scored`:`All ${data.criteria.length} criteria completed`}</p><dl><div><dt>Section weight</dt><dd>50%</dd></div><div><dt>Status</dt><dd>{wasSubmitted?"Submitted":missing?"In progress":"Ready"}</dd></div></dl><div className="summary-actions"><button className="button button-secondary" disabled={saving} onClick={()=>save("draft")}><Save size={16}/> Save draft</button><button className="button gradient-button" disabled={saving} onClick={()=>missing?save("submitted"):setConfirm(true)}><Send size={16}/> {saving?"Saving…":"Submit score"}</button></div></div>
      </aside>
    </div>

    {confirm&&<div role="presentation" onMouseDown={()=>setConfirm(false)} className="dialog-backdrop"><div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card confirm-dialog" onMouseDown={event=>event.stopPropagation()}><button aria-label="Close" onClick={()=>setConfirm(false)} className="dialog-close"><X size={19}/></button><div className="dialog-icon"><Check/></div><h2 id="confirm-title">{wasSubmitted?"Update this score?":"Submit this score?"}</h2><p>Submitted scores immediately affect the real-time leaderboard.</p><div><button className="button button-secondary" onClick={()=>setConfirm(false)}>Go back</button><button className="button gradient-button" onClick={()=>save("submitted")}>Yes, submit</button></div></div></div>}
    {toast&&<Toast tone={toast.tone}>{toast.text}</Toast>}
  </main>;
}
