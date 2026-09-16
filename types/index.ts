export type ScoreStatus = "draft" | "submitted";
export type SessionSlug = "booth" | "pitching";

export interface Judge { id: string; name: string; email: string | null; user_id?: string | null }
export interface Team { id: string; name: string; institution: string | null; project_title: string | null; created_at?: string }
export interface ScoringSession { id: string; slug: SessionSlug; name: string; weight: number }
export interface Criterion { id: string; session_id: string; code: string; name: string; description: string; max_score: number; sort_order: number }
export interface ScoreItem { criterion_id: string; value: number | null }
export interface Score { id: string; judge_id: string; team_id: string; session_id: string; status: ScoreStatus; score_items?: ScoreItem[]; updated_at: string }
export interface LeaderboardRow { team_id: string; team_name: string; institution: string | null; booth_avg: number | null; pitching_avg: number | null; final_avg: number | null; completed_judges: number; total_judges: number; status: "Not Scored" | "In Progress" | "Complete"; rank: number; is_tie: boolean }
export interface TeamProgress extends Team { booth_status: ScoreStatus | null; pitching_status: ScoreStatus | null }
