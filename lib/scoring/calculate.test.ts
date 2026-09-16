import { describe, expect, it } from "vitest";
import { calculateBoothScore, calculateJudgeFinal, calculatePitchingScore, calculateTeamAverage } from "./calculate";

describe("scoring", () => {
  it("treats zero as a valid score", () => expect(calculateBoothScore([0, 0])).toBe(0));
  it("requires every criterion", () => expect(calculateBoothScore([10, null])).toBeNull());
  it("totals presentation criteria on a 100-point scale", () => expect(calculatePitchingScore([30, 25, 30, 15])).toBe(100));
  it("weights sessions equally", () => expect(calculateJudgeFinal(80, 100)).toBe(90));
  it("excludes incomplete judges", () => expect(calculateTeamAverage([90, null, 80])).toBe(85));
});
