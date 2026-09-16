import { z } from "zod";

export const scorePayloadSchema = z.object({
  teamId: z.string().uuid(),
  sessionSlug: z.enum(["booth", "pitching"]),
  status: z.enum(["draft", "submitted"]),
  items: z.array(z.object({ criterionId: z.string().uuid(), value: z.number().int().min(0).nullable() })).min(1),
});
