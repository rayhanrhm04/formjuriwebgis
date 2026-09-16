import "server-only";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { committeeCookieName, hasCommitteeSession } from "@/lib/committee-auth";
import { isDemoServer } from "@/lib/demo-data";
import { isSameOrigin } from "@/lib/request-origin";

export async function requireCommittee(request: NextRequest, mutation = false): Promise<NextResponse | null> {
  if (mutation) {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
  }

  try {
    const session = (await cookies()).get(committeeCookieName)?.value;
    if (!(await hasCommitteeSession(session))) {
      return NextResponse.json({ error: "Committee access is required." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Committee access is temporarily unavailable." }, { status: 503 });
  }

  if (isDemoServer()) {
    return NextResponse.json({ error: "Database mode is not active." }, { status: 409 });
  }
  return null;
}

export function adminResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
