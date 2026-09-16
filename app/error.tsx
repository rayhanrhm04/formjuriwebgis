"use client";
import { AlertCircle } from "lucide-react";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="admin-login"><section className="card" style={{padding:30,textAlign:"center",maxWidth:430}}><AlertCircle size={35} color="#d92d20"/><h1>Something went wrong</h1><p className="muted">We couldn’t load the data. Check your connection and try again.</p><button className="button gradient-button" onClick={reset}>Try again</button></section></main>}
