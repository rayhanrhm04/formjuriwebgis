import { ScoreForm } from "@/components/judging/score-form";
import type { SessionSlug } from "@/types";

export default async function ScorePage({ params }: { params: Promise<{ teamId:string; session:SessionSlug }> }) {
  const {teamId,session} = await params;
  return <ScoreForm teamId={teamId} sessionSlug={session}/>;
}
