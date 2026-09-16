"use client";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminHeading } from "./admin-shell";
export function AdminLeaderboard(){return <><AdminHeading title="Leaderboard" description="Public rankings with real-time synchronization." action={<Link href="/leaderboard" className="button gradient-button" style={{textDecoration:"none"}}>Open live view <ExternalLink size={17}/></Link>}/><div className="card" style={{padding:26}}><h2 style={{marginTop:0}}>Presentation mode</h2><p className="muted" style={{lineHeight:1.6}}>Open the live view on a separate display to show the podium and full standings. It updates automatically whenever a submitted score changes.</p></div></>}
