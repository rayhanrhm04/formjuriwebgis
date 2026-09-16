"use client";

import Link from "next/link";
import { ClipboardList, Gavel, LayoutDashboard, LogOut, Settings, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui";

const nav=[["Overview","/admin",LayoutDashboard],["Ranking","/admin/leaderboard",Trophy],["Scores","/admin/scores",ClipboardList],["Teams","/admin/teams",Users],["Judges","/admin/judges",Gavel],["Settings","/admin/settings",Settings]] as const;

export function AdminShell({children}:{children:React.ReactNode}) {
  const path=usePathname();
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const [demo,setDemo]=useState(false);
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let active=true;
    void fetch("/api/admin/session",{cache:"no-store"}).then(response=>response.json()).then((result:{authenticated:boolean;demo:boolean})=>{
      if(active){setAuthenticated(result.authenticated);setDemo(result.demo)}
    }).catch(()=>{if(active){setAuthenticated(false);setError("Unable to check committee access.")}});
    return()=>{active=false};
  },[]);

  async function login(event:React.FormEvent) {
    event.preventDefault();setError("");setLoading(true);
    try {
      const response=await fetch("/api/admin/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
      const result=await response.json() as {authenticated?:boolean;demo?:boolean;error?:string};
      if(!response.ok || !result.authenticated) throw new Error(result.error || "Sign-in failed.");
      setCode("");setDemo(Boolean(result.demo));setAuthenticated(true);
    } catch(value) {setError(value instanceof Error?value.message:"Sign-in failed.")}
    finally{setLoading(false)}
  }

  async function logout() {
    await fetch("/api/admin/session",{method:"DELETE"});
    setAuthenticated(false);
  }

  if(authenticated===null)return <div className="admin-login"><div className="skeleton" style={{width:250,height:28}}/></div>;
  if(!authenticated)return <main className="admin-login"><form className="card" onSubmit={login} style={{width:"min(100%,420px)",padding:"clamp(24px,5vw,34px)"}}><Brand/><div style={{margin:"35px 0 24px"}}><span className="eyebrow">Committee Panel</span><h1 style={{fontSize:31,letterSpacing:"-.04em",margin:"14px 0 8px"}}>Enter access code</h1><p className="muted" style={{lineHeight:1.55,margin:0}}>Use the access code provided to the competition committee.</p></div><label style={{display:"grid",gap:7,fontSize:13,fontWeight:750,marginBottom:18}}>Access code<input className="input" type="password" autoComplete="off" required value={code} onChange={event=>setCode(event.target.value)} autoFocus/></label>{error&&<p role="alert" className="status status-progress" style={{margin:"0 0 14px"}}>{error}</p>}<button className="button gradient-button" disabled={loading} style={{width:"100%"}}>{loading?"Checking…":"Open dashboard"}</button><Link href="/" style={{display:"block",textAlign:"center",marginTop:20,color:"#929bb0",fontSize:13}}>Back to home</Link></form></main>;

  return <div className="admin-grid"><aside className="admin-sidebar"><Brand/>{demo&&<span className="demo-pill">DEMO MODE</span>}<nav>{nav.map(([label,href,Icon])=><Link key={href} href={href} className={path===href?"active":""}><Icon size={19}/><span>{label}</span></Link>)}</nav><button className="button button-secondary" onClick={logout}><LogOut size={17}/> Sign out</button></aside><div className="admin-content"><header className="admin-mobile-head"><Brand compact/><button aria-label="Sign out" onClick={logout}><LogOut size={18}/></button></header>{demo&&<div className="demo-banner">Demo mode is active. Changes are local to this view until the database is connected.</div>}{children}</div><nav className="admin-bottom">{nav.slice(0,4).map(([label,href,Icon])=><Link key={href} href={href} className={path===href?"active":""}><Icon size={19}/><span>{label}</span></Link>)}</nav></div>;
}

export function AdminHeading({title,description,action}:{title:string;description:string;action?:React.ReactNode}){return <div className="admin-heading"><div><span className="eyebrow">Competition Control</span><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>}
