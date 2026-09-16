import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "mapid_judge_session";
export const judgeCookieName = COOKIE;

function secret() {
  const value = process.env.JUDGE_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("JUDGE_SESSION_SECRET must contain at least 32 characters");
  return value;
}

export function signJudgeSession(judgeId: string) {
  const signature = createHmac("sha256", secret()).update(judgeId).digest("base64url");
  return `${judgeId}.${signature}`;
}

export function verifyJudgeSession(value?: string): string | null {
  if (!value) return null;
  const [judgeId, signature] = value.split(".");
  if (!judgeId || !signature) return null;
  const expected = createHmac("sha256", secret()).update(judgeId).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right) ? judgeId : null;
}
