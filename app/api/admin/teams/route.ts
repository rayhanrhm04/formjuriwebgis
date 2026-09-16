import { NextRequest } from "next/server";
import { z } from "zod";
import { adminResponse, requireCommittee } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const teamSchema = z.object({
  name: z.string().trim().min(1).max(160),
  institution: z.string().trim().max(160).nullable(),
  project_title: z.string().trim().max(200).nullable(),
});

export async function GET(request: NextRequest) {
  const denied = await requireCommittee(request);
  if (denied) return denied;
  const { data, error } = await createAdminClient().from("teams").select("id,name,institution,project_title,created_at").order("name");
  return error ? adminResponse({ error: "Unable to load teams." }, 502) : adminResponse({ teams: data ?? [] });
}

export async function POST(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = teamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Enter valid team details." }, 400);
  const { error } = await createAdminClient().from("teams").insert(parsed.data);
  return error ? adminResponse({ error: "Unable to add the team." }, 502) : adminResponse({ ok: true }, 201);
}

export async function PATCH(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = teamSchema.extend({ id: idSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Enter valid team details." }, 400);
  const { id, ...team } = parsed.data;
  const { data, error } = await createAdminClient().from("teams").update(team).eq("id", id).select("id").maybeSingle();
  if (error) return adminResponse({ error: "Unable to update the team." }, 502);
  return data ? adminResponse({ ok: true }) : adminResponse({ error: "Team not found." }, 404);
}

export async function DELETE(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = z.object({ id: idSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Invalid team ID." }, 400);
  const { data, error } = await createAdminClient().from("teams").delete().eq("id", parsed.data.id).select("id").maybeSingle();
  if (error) return adminResponse({ error: "Unable to delete the team." }, 502);
  return data ? adminResponse({ ok: true }) : adminResponse({ error: "Team not found." }, 404);
}
