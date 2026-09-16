import { AlertCircle, CheckCircle2, LoaderCircle, Radio } from "lucide-react";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div style={{display:"flex",alignItems:"center",gap:11}}>
    <Image className="brand-logo" src="/brand/mapid-webgis-2026-official.png" alt="MAPID WebGIS Competition 2026" width={compact?64:78} height={compact?43:52} priority />
    <div><div style={{fontWeight:850,fontSize:compact?14:16}}>MAPID WebGIS Competition 2026</div><div className="muted" style={{fontSize:11,marginTop:2}}>Official Judging System</div></div>
  </div>;
}

export function GradientHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: React.ReactNode; description?: string; children?: React.ReactNode }) {
  return <header style={{padding:"22px 0 28px"}}><div className="shell">
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",marginBottom:42}}><Brand compact />{children}</div>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h1 style={{fontSize:"clamp(30px,7vw,54px)",lineHeight:1.06,letterSpacing:"-.045em",margin:"15px 0 12px",maxWidth:760}}>{title}</h1>
    {description && <p className="muted" style={{fontSize:"clamp(15px,2vw,18px)",lineHeight:1.65,maxWidth:650,margin:0}}>{description}</p>}
  </div></header>;
}

export function StatusBadge({ status }: { status: string | null }) {
  const normalized = status === "submitted" || status === "Complete" ? "complete" : status === "draft" || status === "In Progress" ? "progress" : "empty";
  const label = status === "submitted" ? "Complete" : status === "draft" ? "In Progress" : status ?? "Not Started";
  return <span className={`status status-${normalized}`}>{label}</span>;
}

export function LiveBadge({ state = "live" }: { state?: "live" | "connecting" | "error" }) {
  return <span className={`status ${state === "error" ? "status-progress" : "status-complete"}`} style={{gap:7}}>
    {state === "connecting" ? <LoaderCircle size={13} className="live-dot"/> : <Radio size={13} className={state === "live" ? "live-dot" : ""}/>} {state === "live" ? "LIVE" : state === "connecting" ? "CONNECTING" : "DISCONNECTED"}
  </span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="card" style={{padding:"44px 24px",textAlign:"center"}}><div style={{width:48,height:48,borderRadius:16,background:"#f0f2ff",display:"grid",placeItems:"center",margin:"0 auto 16px"}}><AlertCircle color="#6670dc"/></div><h3 style={{margin:"0 0 8px"}}>{title}</h3><p className="muted" style={{margin:0,lineHeight:1.6}}>{description}</p></div>;
}

export function Toast({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return <div role="status" style={{position:"fixed",zIndex:70,right:16,bottom:"calc(16px + env(safe-area-inset-bottom))",maxWidth:370,padding:"13px 16px",borderRadius:14,color:tone==="success"?"#067647":"#b42318",background:tone==="success"?"#ecfdf3":"#fef3f2",border:`1px solid ${tone==="success"?"#abefc6":"#fecdca"}`,boxShadow:"0 12px 35px rgba(30,40,70,.16)",display:"flex",gap:9,alignItems:"center"}}>{tone === "success" ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>} {children}</div>;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return <div style={{display:"grid",gap:14}}>{Array.from({length:count},(_,i)=><div className="card" key={i} style={{padding:20}}><div className="skeleton" style={{height:18,width:"45%",marginBottom:15}}/><div className="skeleton" style={{height:13,width:"72%",marginBottom:24}}/><div className="skeleton" style={{height:8,width:"100%"}}/></div>)}</div>;
}
