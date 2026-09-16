export const BOOTH_MAX = 100;
export const PITCHING_MAX = 100;

export function calculateBoothScore(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculatePitchingScore(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculateJudgeFinal(booth: number | null, pitching: number | null): number | null {
  if (booth === null || pitching === null) return null;
  return Math.round((booth * 0.5 + pitching * 0.5) * 100) / 100;
}

export function calculateTeamAverage(finalScores: Array<number | null>): number | null {
  const complete = finalScores.filter((score): score is number => score !== null);
  if (!complete.length) return null;
  return Math.round((complete.reduce((sum, score) => sum + score, 0) / complete.length) * 100) / 100;
}
