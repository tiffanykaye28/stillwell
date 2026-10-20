-- Stillwell / PostgreSQL 15+ on Supabase. Apply once to a NEW project.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 60),
 role text not null default 'student' check(role in ('student','counselor','admin')),
 policy_version text not null default '1',
 policy_accepted_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create function private.current_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=(select auth.uid()) and auth.uid() is not null
$$;
revoke all on function private.current_role() from public;
grant execute on function private.current_role() to authenticated;
create function private.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(new.raw_user_meta_data->>'adult_confirmed','false') <> 'true' then raise exception 'Adult eligibility and policy acceptance required'; end if;
 insert into public.profiles(id,display_name,policy_version) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Student'),60),'1');
 return new;
end $$;
revoke all on function private.create_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
create table public.mood_entries (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 entry_date date not null default current_date,mood text not null check(mood in ('Happy','Neutral','Sad','Anxious','Angry')),
 intensity smallint not null check(intensity between 1 and 5),note text not null default '' check(length(note)<=1000),
 created_at timestamptz not null default now(),unique(user_id,entry_date)
);
create table public.assessments (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions) between 1 and 10),
 created_at timestamptz not null default now()
);
create table public.assessment_results (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 assessment_id uuid references public.assessments(id) on delete set null,answers jsonb not null,
 questions_snapshot jsonb not null default '[]',score integer not null check(score>=0),max_score integer not null check(max_score>0 and score<=max_score),
 created_at timestamptz not null default now()
);
create function private.score_reflection() returns trigger language plpgsql security invoker set search_path='' as $$
declare q jsonb; n integer; a jsonb; s integer:=0;
begin
 select questions into q from public.assessments where id=new.assessment_id;
 if q is null or jsonb_typeof(new.answers)<>'array' then raise exception 'Invalid assessment'; end if;
 n:=jsonb_array_length(q);
 if jsonb_array_length(new.answers)<>n then raise exception 'Answer count mismatch'; end if;
 for a in select value from jsonb_array_elements(new.answers) loop
  if jsonb_typeof(a)<>'number' or a::text not in ('0','1','2','3') then raise exception 'Answer must be 0, 1, 2 or 3'; end if;
  s:=s+(a::text)::integer;
 end loop;
 new.score:=s;new.max_score:=n*3;new.questions_snapshot:=q;return new;
end $$;
revoke all on function private.score_reflection() from public;
create trigger score_reflection before insert on public.assessment_results for each row execute function private.score_reflection();
create table public.appointments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 student_name text not null check(length(student_name) between 1 and 60),
 requested_at timestamptz not null,mode text not null check(mode in ('In person','Online')),
 reason text not null check(reason in ('Study and workload','General wellbeing','Relationships and belonging','I prefer to discuss this in person')),
 status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled')),
 sharing_consent boolean not null check(sharing_consent),created_at timestamptz not null default now()
);
create table public.resources (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 120),
 category text not null check(length(category) between 1 and 60),body text not null check(length(body) between 1 and 10000),created_at timestamptz not null default now()
);
-- AI provider credentials belong in Vercel server environment variables
-- (GEMINI_API_KEY and GEMINI_MODEL), never in this database.
-- This private table stores only per-user daily usage counts, not prompts or keys.
create table private.ai_usage (
 user_id uuid not null references public.profiles(id) on delete cascade,usage_date date not null default current_date,
 requests integer not null default 0 check(requests>=0),primary key(user_id,usage_date)
);
alter table private.ai_usage enable row level security;
create index assessment_results_user_created on public.assessment_results(user_id,created_at desc);
create index assessment_results_template on public.assessment_results(assessment_id);
create index appointments_user_time on public.appointments(user_id,requested_at desc);
create index appointments_status_time on public.appointments(status,requested_at);
alter table public.profiles enable row level security;
alter table public.mood_entries enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;
alter table public.appointments enable row level security;
alter table public.resources enable row level security;
revoke all on public.profiles,public.mood_entries,public.assessments,public.assessment_results,public.appointments,public.resources from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.current_role())='admin');
create policy profiles_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select,insert,update,delete on public.mood_entries to authenticated;
create policy moods_read on public.mood_entries for select to authenticated using(user_id=(select auth.uid()));
create policy moods_add on public.mood_entries for insert to authenticated with check(user_id=(select auth.uid()));
create policy moods_edit on public.mood_entries for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy moods_delete on public.mood_entries for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,delete on public.assessment_results to authenticated;
create policy results_read on public.assessment_results for select to authenticated using(user_id=(select auth.uid()));
create policy results_add on public.assessment_results for insert to authenticated with check(user_id=(select auth.uid()));
create policy results_delete on public.assessment_results for delete to authenticated using(user_id=(select auth.uid()));
grant select,insert,update,delete on public.assessments to authenticated;
create policy templates_read on public.assessments for select to authenticated using(true);
create policy templates_manage on public.assessments for all to authenticated using((select private.current_role())='admin') with check((select private.current_role())='admin');
grant select,insert,update,delete on public.resources to authenticated;
create policy resources_read on public.resources for select to authenticated using(true);
create policy resources_manage on public.resources for all to authenticated using((select private.current_role()) in ('admin','counselor')) with check((select private.current_role()) in ('admin','counselor'));
grant select,insert on public.appointments to authenticated;
create policy appointments_read on public.appointments for select to authenticated using(user_id=(select auth.uid()) or (select private.current_role()) in ('counselor','admin'));
create policy appointments_add on public.appointments for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and sharing_consent and requested_at>now());
-- Restricted RPCs. These must be exposed for REST, so each checks the caller and
-- revokes PUBLIC/anon execution. No arbitrary table names or dynamic SQL.
create function public.set_appointment_status(appointment_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
declare a public.appointments; r text;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 select * into a from public.appointments where id=appointment_id for update;
 if not found then raise exception 'Request not found'; end if;
 select role into r from public.profiles where id=auth.uid();
 if r in ('admin','counselor') then
  if new_status not in ('confirmed','completed','cancelled') then raise exception 'Invalid status'; end if;
 elsif a.user_id=auth.uid() and r='student' then
  if new_status<>'cancelled' then raise exception 'Cancellation only'; end if;
 else raise exception 'Forbidden'; end if;
 if a.status not in ('pending','confirmed') then raise exception 'Request already closed'; end if;
 update public.appointments set status=new_status where id=appointment_id;
end $$;
create function public.admin_set_role(target_user uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Admin required'; end if;
 if target_user=auth.uid() then raise exception 'Cannot change your own admin role'; end if;
 if new_role not in ('student','counselor','admin') then raise exception 'Invalid role'; end if;
 update public.profiles set role=new_role where id=target_user;
 if not found then raise exception 'Account not found'; end if;
end $$;
create function public.consume_ai_quota() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Unauthorized'; end if;
 insert into private.ai_usage(user_id,usage_date,requests) values(auth.uid(),current_date,1)
 on conflict(user_id,usage_date) do update set requests=private.ai_usage.requests+1 where private.ai_usage.requests<20
 returning requests into n;
 return n is not null;
end $$;
revoke all on function public.set_appointment_status(uuid,text),public.admin_set_role(uuid,text),public.consume_ai_quota() from public,anon;
grant execute on function public.set_appointment_status(uuid,text),public.admin_set_role(uuid,text),public.consume_ai_quota() to authenticated;
insert into public.assessments(title,questions) values('Everyday wellbeing reflection','["I had enough energy for everyday tasks.","I felt able to manage my study workload.","I made time to rest.","I felt connected to someone I trust."]');
commit;
