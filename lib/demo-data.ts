import type { Criterion, Judge, LeaderboardRow, ScoringSession, Team } from "@/types";

export const demoJudges: Judge[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Aditya Chandra Reymonza", email: null },
  { id: "10000000-0000-4000-8000-000000000002", name: "Akihiro Kawano", email: null },
  { id: "10000000-0000-4000-8000-000000000003", name: "Ir. Nurul Hamid, S.T., M.Sc.", email: null },
  { id: "10000000-0000-4000-8000-000000000004", name: "Muftia Oktavialih", email: null },
  { id: "10000000-0000-4000-8000-000000000005", name: "Angga Nurdiansyah", email: null },
];

export const demoTeams: Team[] = [
  { id: "20000000-0000-4000-8000-000000000001", name: "GeoSphere", institution: "Universitas Indonesia", project_title: "GeoAI Disaster Intelligence" },
  { id: "20000000-0000-4000-8000-000000000002", name: "Atlas Nusantara", institution: "Institut Teknologi Bandung", project_title: "Peta Ketahanan Pangan" },
  { id: "20000000-0000-4000-8000-000000000003", name: "UrbanGIS Lab", institution: "Universitas Gadjah Mada", project_title: "Smart Mobility Explorer" },
  { id: "20000000-0000-4000-8000-000000000004", name: "Terra Vision", institution: "Universitas Brawijaya", project_title: "Forest Watch Indonesia" },
  { id: "20000000-0000-4000-8000-000000000005", name: "Blue Carbon", institution: "IPB University", project_title: "Mangrove Carbon Monitor" },
  { id: "20000000-0000-4000-8000-000000000006", name: "Civic Mapper", institution: "Universitas Airlangga", project_title: "Inclusive City Map" },
  { id: "20000000-0000-4000-8000-000000000007", name: "Spatial Minds", institution: "Telkom University", project_title: "Tourism Digital Twin" },
  { id: "20000000-0000-4000-8000-000000000008", name: "Ruang Data", institution: "Universitas Diponegoro", project_title: "Coastal Risk Platform" },
];

export const demoSessions: ScoringSession[] = [
  { id: "30000000-0000-4000-8000-000000000001", slug: "booth", name: "WebGIS Application & Live Demo", weight: .5 },
  { id: "30000000-0000-4000-8000-000000000002", slug: "pitching", name: "Presentation / Pitching", weight: .5 },
];

const criterion = (n:number, session:0|1, code:string, name:string, description:string, max_score:number): Criterion => ({
  id:`40000000-0000-4000-8000-${String(n).padStart(12,"0")}`, session_id:demoSessions[session].id, code, name, description, max_score, sort_order:n,
});
export const demoCriteria: Criterion[] = [
  criterion(1,0,"1.1","WebGIS functionality and interactivity","Core features work reliably and the map provides meaningful, intuitive interactions.",25),
  criterion(2,0,"1.2","AI chatbot and response quality","The chatbot is useful, relevant, and produces accurate responses.",15),
  criterion(3,0,"1.3","Responsiveness, performance, and stability","Speed, reliability, and adaptability across devices.",15),
  criterion(4,0,"1.4","UI/UX and visual design","Interface clarity and the overall quality of the user experience.",15),
  criterion(5,0,"1.5","Solution relevance and data suitability","The solution addresses the stated problem and uses appropriate data.",15),
  criterion(6,0,"1.6","Innovation and development potential","Originality of the idea and its potential for further development.",5),
  criterion(7,0,"1.7","Live product demonstration","The team demonstrates the product directly and shows its core user flow.",10),
  criterion(8,1,"2.1","Clarity and structure of presentation","The presentation connects the problem, solution, and intended impact in a clear narrative.",30),
  criterion(9,1,"2.2","Subject-matter and technical mastery","The team demonstrates a strong understanding of its product and technical decisions.",25),
  criterion(10,1,"2.3","Ability to answer judges’ questions","Answers are accurate, relevant, and sufficiently detailed.",30),
  criterion(11,1,"2.4","Communication of deliverables","The presentation slides explain project deliverables clearly and effectively.",15),
];

const ranking: Array<readonly [number | null, number | null, number]> = [[94.5,93.8,3],[92.8,91.9,3],[91.4,92.2,4],[89.7,90.4,3],[88.8,87.5,2],[86.1,88.2,2],[84.6,85.4,1],[null,null,0]];
export const demoLeaderboard: LeaderboardRow[] = demoTeams.map((team,index) => {
  const [booth,pitching,done]=ranking[index];
  const final=booth===null||pitching===null?null:Math.round((booth+pitching)/2*100)/100;
  return {...team,team_id:team.id,team_name:team.name,booth_avg:booth,pitching_avg:pitching,final_avg:final,completed_judges:done,total_judges:5,status:done===0?"Not Scored":done===5?"Complete":"In Progress",rank:index+1,is_tie:false};
});

export const isDemoServer = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_SECRET_KEY;
