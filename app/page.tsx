import Link from "next/link";
import { ArrowRight, Gavel, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/ui";

export default function HomePage() {
  return <main style={{minHeight:"100vh",display:"grid",alignItems:"center",padding:"28px 0"}}><div className="shell">
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"clamp(45px,8vw,90px)"}}><Brand/><Link href="/leaderboard" className="button button-secondary" style={{textDecoration:"none",paddingInline:14}}>Live leaderboard <ArrowRight size={17}/></Link></nav>
    <section style={{textAlign:"center",maxWidth:800,margin:"0 auto 38px"}}><span className="eyebrow"><Sparkles size={13}/> Competition 2026</span><h1 style={{fontSize:"clamp(38px,8vw,72px)",lineHeight:1,letterSpacing:"-.055em",margin:"20px 0 18px"}}>Judge with confidence.<br/><span className="gradient-text">See results in real time.</span></h1><p className="muted" style={{fontSize:"clamp(16px,2vw,19px)",lineHeight:1.65,margin:"0 auto",maxWidth:610}}>The official platform for judging teams and tracking results at the MAPID WebGIS Competition 2026.</p></section>
    <section aria-label="Choose your access" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:16,maxWidth:760,margin:"0 auto"}}>
      <Link href="/judge" className="card" style={{padding:"clamp(23px,4vw,32px)",textDecoration:"none",color:"inherit",minHeight:210,display:"flex",flexDirection:"column",transition:"transform .2s,box-shadow .2s"}}><div style={{width:50,height:50,borderRadius:16,display:"grid",placeItems:"center",background:"linear-gradient(135deg,#eaf3ff,#eeeaff)",color:"#5665df"}}><Gavel/></div><h2 style={{fontSize:24,margin:"25px 0 8px"}}>I’m a Judge</h2><p className="muted" style={{margin:0,lineHeight:1.55}}>Score each team using the official competition rubric.</p><span style={{marginTop:"auto",paddingTop:20,color:"#5865d8",fontWeight:750,display:"flex",alignItems:"center",gap:7}}>Start judging <ArrowRight size={17}/></span></Link>
      <Link href="/admin" className="card" style={{padding:"clamp(23px,4vw,32px)",textDecoration:"none",color:"inherit",minHeight:210,display:"flex",flexDirection:"column"}}><div style={{width:50,height:50,borderRadius:16,display:"grid",placeItems:"center",background:"linear-gradient(135deg,#f3ecff,#ffeef7)",color:"#9850c8"}}><ShieldCheck/></div><h2 style={{fontSize:24,margin:"25px 0 8px"}}>Committee</h2><p className="muted" style={{margin:0,lineHeight:1.55}}>Monitor scoring progress and manage the competition.</p><span style={{marginTop:"auto",paddingTop:20,color:"#8b4fc0",fontWeight:750,display:"flex",alignItems:"center",gap:7}}>Open dashboard <ArrowRight size={17}/></span></Link>
    </section>
  </div></main>;
}
