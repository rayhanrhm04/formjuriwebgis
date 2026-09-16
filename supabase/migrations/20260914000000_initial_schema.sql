create extension if not exists pgcrypto;

create table public.judges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email text,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  institution text,
  project_title text,
  created_at timestamptz not null default now()
);

create table public.scoring_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('booth', 'pitching')),
  name text not null,
  weight numeric(4,3) not null check (weight > 0 and weight <= 1)
);

create table public.criteria (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scoring_sessions(id) on delete cascade,
  code text not null unique,
  name text not null,
  description text not null default '',
  max_score integer not null check (max_score > 0),
  sort_order integer not null,
  unique(session_id, sort_order)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.judges(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  session_id uuid not null references public.scoring_sessions(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique(judge_id, team_id, session_id)
);

create table public.score_items (
  id uuid primary key default gen_random_uuid(),
  score_id uuid not null references public.scores(id) on delete cascade,
  criterion_id uuid not null references public.criteria(id) on delete restrict,
  value numeric not null check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(score_id, criterion_id)
);

-- Server-only committee code. Store a salted scrypt hash, never the plaintext code.
create table public.committee_access_codes (
  id integer primary key check (id = 1),
  code_hash text not null,
  updated_at timestamptz not null default now()
);
insert into public.committee_access_codes(id, code_hash) values
  (1, '3ccdad320400e7c42c886f2597820ade:dd8fb4e19fff02478d6c61b8d873b343095eb792dd3bf1323c075fb76c1455559d37ecb18efcb8d371fbca06e5ac331e99d4b0f755608a73329208dccade3113');

-- A payload-free signal table lets public clients refresh aggregate ranking without
-- exposing individual score rows through Realtime.
create table public.leaderboard_updates (
  id boolean primary key default true check (id),
  changed_at timestamptz not null default now()
);
insert into public.leaderboard_updates(id) values (true);

create index scores_judge_idx on public.scores(judge_id);
create index scores_team_status_idx on public.scores(team_id, status);
create index score_items_score_idx on public.score_items(score_id);
create index criteria_session_idx on public.criteria(session_id, sort_order);

create function public.is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin' $$;

create function public.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create trigger scores_touch before update on public.scores
for each row execute function public.touch_updated_at();
create trigger score_items_touch before update on public.score_items
for each row execute function public.touch_updated_at();

-- Called only by the server secret key. One RPC means score header and items commit atomically.
create function public.save_judge_score(
  p_judge_id uuid,
  p_team_id uuid,
  p_session_slug text,
  p_status text,
  p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_session_id uuid;
  v_score_id uuid;
  v_expected integer;
  v_valid integer;
begin
  if p_status not in ('draft', 'submitted') then raise exception 'Invalid status'; end if;
  select id into v_session_id from public.scoring_sessions where slug = p_session_slug;
  if v_session_id is null then raise exception 'Unknown session'; end if;

  select count(*) into v_expected from public.criteria where session_id = v_session_id;
  select count(*) into v_valid
  from jsonb_to_recordset(p_items) as item(criterion_id uuid, value numeric)
  join public.criteria c on c.id = item.criterion_id and c.session_id = v_session_id
  where item.value between 0 and c.max_score;

  if v_valid <> jsonb_array_length(p_items) then raise exception 'Invalid criterion or score'; end if;
  if p_status = 'submitted' and v_valid <> v_expected then raise exception 'All criteria are required'; end if;

  insert into public.scores(judge_id, team_id, session_id, status, submitted_at)
  values (p_judge_id, p_team_id, v_session_id, p_status,
    case when p_status = 'submitted' then now() else null end)
  on conflict (judge_id, team_id, session_id) do update set
    status = excluded.status,
    submitted_at = case when excluded.status = 'submitted' then now() else public.scores.submitted_at end
  returning id into v_score_id;

  delete from public.score_items where score_id = v_score_id;
  insert into public.score_items(score_id, criterion_id, value)
  select v_score_id, item.criterion_id, item.value
  from jsonb_to_recordset(p_items) as item(criterion_id uuid, value numeric)
  where item.value is not null;
  return v_score_id;
end $$;

create function public.signal_leaderboard_update() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.status = 'submitted' or (tg_op = 'UPDATE' and old.status = 'submitted') then
    update public.leaderboard_updates set changed_at = now() where id = true;
  end if;
  return new;
end $$;

create trigger scores_signal after insert or update on public.scores
for each row execute function public.signal_leaderboard_update();

create function public.get_leaderboard()
returns table (
  team_id uuid, team_name text, institution text, booth_avg numeric,
  pitching_avg numeric, final_avg numeric, completed_judges bigint,
  total_judges bigint, status text, rank bigint, is_tie boolean
)
language sql stable security definer set search_path = ''
as $$
with session_totals as (
  select s.judge_id, s.team_id, ss.slug,
    round(sum(si.value), 2) as normalized
  from public.scores s
  join public.scoring_sessions ss on ss.id = s.session_id
  join public.score_items si on si.score_id = s.id
  where s.status = 'submitted'
  group by s.id, s.judge_id, s.team_id, ss.slug
), judge_finals as (
  select judge_id, team_id,
    max(normalized) filter (where slug = 'booth') as booth,
    max(normalized) filter (where slug = 'pitching') as pitching
  from session_totals group by judge_id, team_id
), aggregates as (
  select t.id, t.name, t.institution,
    round(avg(j.booth), 2) filter (where j.booth is not null) as booth_avg,
    round(avg(j.pitching), 2) filter (where j.pitching is not null) as pitching_avg,
    round(avg((j.booth + j.pitching) / 2), 2) filter (where j.booth is not null and j.pitching is not null) as final_avg,
    count(*) filter (where j.booth is not null and j.pitching is not null) as completed_judges,
    (select count(*) from public.judges) as total_judges
  from public.teams t left join judge_finals j on j.team_id = t.id
  group by t.id
), ranked as (
  select *, dense_rank() over (order by final_avg desc nulls last, booth_avg desc nulls last, pitching_avg desc nulls last) as position
  from aggregates
)
select id, name, institution, booth_avg, pitching_avg, final_avg,
  completed_judges, total_judges,
  case when completed_judges = 0 then 'Not Scored'
       when completed_judges = total_judges then 'Complete' else 'In Progress' end,
  position,
  count(*) over (partition by final_avg, booth_avg, pitching_avg) > 1 and final_avg is not null
from ranked order by position, name;
$$;

create function public.get_admin_score_matrix()
returns table (team_id uuid, team_name text, judge_id uuid, judge_name text, booth numeric, pitching numeric, final numeric)
language sql stable security invoker set search_path = ''
as $$
with totals as (
  select s.team_id, s.judge_id, ss.slug,
    round(sum(si.value), 2) value
  from public.scores s
  join public.scoring_sessions ss on ss.id = s.session_id
  join public.score_items si on si.score_id = s.id
  where s.status = 'submitted'
  group by s.id, s.team_id, s.judge_id, ss.slug
), paired as (
  select team_id, judge_id, max(value) filter(where slug='booth') booth, max(value) filter(where slug='pitching') pitching
  from totals group by team_id, judge_id
)
select t.id, t.name, j.id, j.name, p.booth, p.pitching,
  case when p.booth is not null and p.pitching is not null then round((p.booth+p.pitching)/2,2) end
from public.teams t cross join public.judges j left join paired p on p.team_id=t.id and p.judge_id=j.id
order by t.name,j.name;
$$;

alter table public.judges enable row level security;
alter table public.teams enable row level security;
alter table public.scoring_sessions enable row level security;
alter table public.criteria enable row level security;
alter table public.scores enable row level security;
alter table public.score_items enable row level security;
alter table public.leaderboard_updates enable row level security;
alter table public.committee_access_codes enable row level security;

create policy teams_public_read on public.teams for select to anon, authenticated using (true);
create policy sessions_public_read on public.scoring_sessions for select to anon, authenticated using (true);
create policy criteria_public_read on public.criteria for select to anon, authenticated using (true);
create policy updates_public_read on public.leaderboard_updates for select to anon, authenticated using (true);

create policy judges_admin_all on public.judges for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy teams_admin_all on public.teams for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy sessions_admin_all on public.scoring_sessions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy criteria_admin_all on public.criteria for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy scores_admin_read on public.scores for select to authenticated using ((select public.is_admin()));
create policy items_admin_read on public.score_items for select to authenticated using ((select public.is_admin()));

-- Restrict only this application's tables; never alter unrelated tables in the project.
revoke all on public.judges, public.teams, public.scoring_sessions, public.criteria,
  public.scores, public.score_items, public.leaderboard_updates,
  public.committee_access_codes from anon, authenticated;
grant select on public.teams, public.scoring_sessions, public.criteria, public.leaderboard_updates to anon, authenticated;
grant select on public.judges to authenticated;
grant insert, update, delete on public.judges, public.teams, public.scoring_sessions, public.criteria to authenticated;
grant select on public.scores, public.score_items to authenticated;
grant select, insert, update, delete on public.judges, public.teams, public.scoring_sessions, public.criteria, public.scores, public.score_items, public.leaderboard_updates to service_role;
grant select, update on public.committee_access_codes to service_role;
revoke all on function public.save_judge_score(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_judge_score(uuid, uuid, text, text, jsonb) to service_role;
revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated, service_role;
revoke all on function public.get_admin_score_matrix() from public, anon, authenticated;
grant execute on function public.get_admin_score_matrix() to service_role;
grant execute on function public.is_admin() to authenticated;

alter publication supabase_realtime add table public.leaderboard_updates;

insert into public.scoring_sessions(slug, name, weight) values
  ('booth', 'WebGIS Application & Live Demo', 0.5),
  ('pitching', 'Presentation / Pitching', 0.5);

insert into public.criteria(session_id, code, name, description, max_score, sort_order)
select s.id, v.code, v.name, v.description, v.max_score, v.sort_order
from public.scoring_sessions s
join (values
  ('booth','1.1','WebGIS functionality and interactivity','Core features work reliably and the map provides meaningful, intuitive interactions.',25,1),
  ('booth','1.2','AI chatbot and response quality','The chatbot is useful, relevant, and produces accurate responses.',15,2),
  ('booth','1.3','Responsiveness, performance, and stability','Speed, reliability, and adaptability across devices.',15,3),
  ('booth','1.4','UI/UX and visual design','Interface clarity and the overall quality of the user experience.',15,4),
  ('booth','1.5','Solution relevance and data suitability','The solution addresses the stated problem and uses appropriate data.',15,5),
  ('booth','1.6','Innovation and development potential','Originality of the idea and its potential for further development.',5,6),
  ('booth','1.7','Live product demonstration','The team demonstrates the product directly and shows its core user flow.',10,7),
  ('pitching','2.1','Clarity and structure of presentation','The presentation connects the problem, solution, and intended impact in a clear narrative.',30,1),
  ('pitching','2.2','Subject-matter and technical mastery','The team demonstrates a strong understanding of its product and technical decisions.',25,2),
  ('pitching','2.3','Ability to answer judges'' questions','Answers are accurate, relevant, and sufficiently detailed.',30,3),
  ('pitching','2.4','Communication of deliverables','The presentation slides explain project deliverables clearly and effectively.',15,4)
) as v(slug,code,name,description,max_score,sort_order) on v.slug = s.slug;

insert into public.judges(name) values
  ('Aditya Chandra Reymonza'),
  ('Akihiro Kawano'),
  ('Ir. Nurul Hamid, S.T., M.Sc.'),
  ('Muftia Oktavialih'),
  ('Angga Nurdiansyah');
