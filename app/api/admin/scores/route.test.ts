import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/admin-api", () => ({
  adminResponse: (body: unknown, status = 200) => NextResponse.json(body, { status }),
  requireCommittee: vi.fn(async () => null),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { DELETE } from "./route";
import { requireCommittee } from "@/lib/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

function request(confirm: string) {
  return new NextRequest("http://localhost:3001/api/admin/scores", {
    method: "DELETE",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ confirm }),
  });
}

describe("DELETE /api/admin/scores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated requests before touching the database", async () => {
    vi.mocked(requireCommittee).mockResolvedValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const response = await DELETE(request("RESET_ALL_SCORES"));
    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("requires an explicit confirmation token before touching the database", async () => {
    const response = await DELETE(request("NO"));
    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("deletes only score rows, verifies emptiness, and refreshes the leaderboard signal", async () => {
    const deleteFilter = vi.fn().mockResolvedValue({ count: 2, error: null });
    const scoreDelete = vi.fn().mockReturnValue({ not: deleteFilter });
    const scoreSelect = vi.fn().mockResolvedValue({ count: 0, error: null });
    const updateFilter = vi.fn().mockResolvedValue({ error: null });
    const signalUpdate = vi.fn().mockReturnValue({ eq: updateFilter });
    const from = vi.fn((table: string) => {
      if (table === "scores") return { delete: scoreDelete, select: scoreSelect };
      if (table === "leaderboard_updates") return { update: signalUpdate };
      throw new Error(`Unexpected table: ${table}`);
    });
    vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);

    const response = await DELETE(request("RESET_ALL_SCORES"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2 });
    expect(from.mock.calls.map(([table]) => table)).toEqual(["scores", "scores", "leaderboard_updates"]);
    expect(deleteFilter).toHaveBeenCalledWith("id", "is", null);
    expect(signalUpdate).toHaveBeenCalledOnce();
  });
});
