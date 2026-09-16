import "server-only";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoServer } from "@/lib/demo-data";

export const committeeCookieName = "mapid_committee_session";
export const committeeSessionSeconds = 60 * 60 * 12;

async function currentCodeHash(): Promise<string | null> {
  if (isDemoServer()) return process.env.COMMITTEE_CODE_HASH ?? null;

  const { data, error } = await createAdminClient()
    .from("committee_access_codes")
    .select("code_hash")
    .eq("id", 1)
    .single();
  if (error || !data) return null;
  return data.code_hash;
}

function signature(expires: string, codeHash: string): string {
  const sessionSecret = process.env.JUDGE_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("Session secret is not configured");
  return createHmac("sha256", sessionSecret).update(`committee:${expires}:${codeHash}`).digest("hex");
}

export async function verifyCommitteeCode(code: string): Promise<string | null> {
  const stored = await currentCodeHash();
  if (!stored) return null;
  const [salt, expectedHex] = stored.split(":");
  if (!/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expectedHex ?? "")) return null;
  const actual = scryptSync(code, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return timingSafeEqual(actual, expected) ? stored : null;
}

export function createCommitteeSession(codeHash: string): string {
  const expires = String(Date.now() + committeeSessionSeconds * 1000);
  return `${expires}.${signature(expires, codeHash)}`;
}

export async function hasCommitteeSession(value?: string): Promise<boolean> {
  if (!value) return false;
  const [expires, supplied] = value.split(".");
  if (!/^[0-9]{13}$/.test(expires ?? "") || !/^[a-f0-9]{64}$/.test(supplied ?? "")) return false;
  if (Number(expires) < Date.now()) return false;
  const codeHash = await currentCodeHash();
  if (!codeHash) return false;
  const actual = Buffer.from(supplied, "hex");
  const expected = Buffer.from(signature(expires, codeHash), "hex");
  return timingSafeEqual(actual, expected);
}
