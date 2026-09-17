import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data, error } = await createAdminClient().from("judges").select("id,name").order("created_at");
    if (error) throw error;
    return NextResponse.json({ judges: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load the judge list" }, { status: 500 });
  }
}
