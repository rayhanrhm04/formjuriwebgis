import { NextRequest } from "next/server";
import { z } from "zod";
import { adminResponse, requireCommittee } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const judgeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.union([z.string().trim().email().max(254), z.null()]),
});

export async function GET(request: NextRequest) {
  const denied = await requireCommittee(request);
  if (denied) return denied;
  const { data, error } = await createAdminClient().from("judges").select("id,name,email").order("created_at");
  return error ? adminResponse({ error: "Unable to load judges." }, 502) : adminResponse({ judges: data ?? [] });
}

export async function POST(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = judgeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Enter valid judge details." }, 400);
  const { error } = await createAdminClient().from("judges").insert(parsed.data);
  return error ? adminResponse({ error: "Unable to add the judge." }, 502) : adminResponse({ ok: true }, 201);
}

export async function PATCH(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = judgeSchema.extend({ id: idSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Enter valid judge details." }, 400);
  const { id, ...judge } = parsed.data;
  const { data, error } = await createAdminClient().from("judges").update(judge).eq("id", id).select("id").maybeSingle();
  if (error) return adminResponse({ error: "Unable to update the judge." }, 502);
  return data ? adminResponse({ ok: true }) : adminResponse({ error: "Judge not found." }, 404);
}

export async function DELETE(request: NextRequest) {
  const denied = await requireCommittee(request, true);
  if (denied) return denied;
  const parsed = z.object({ id: idSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminResponse({ error: "Invalid judge ID." }, 400);
  const { data, error } = await createAdminClient().from("judges").delete().eq("id", parsed.data.id).select("id").maybeSingle();
  if (error) return adminResponse({ error: "Unable to delete the judge." }, 502);
  return data ? adminResponse({ ok: true }) : adminResponse({ error: "Judge not found." }, 404);
}
