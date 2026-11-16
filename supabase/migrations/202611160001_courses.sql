-- StillWell course catalog, lessons, and private student completion tracking.
-- Apply after 202610190001_initial.sql on the existing Supabase project.
begin;
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  category text not null check (length(category) between 1 and 60),
  description text not null check (length(description) between 1 and 1200),
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 600),
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'All levels')),
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  content text not null check (length(content) between 1 and 10000),
  video_url text check (video_url is null or (length(video_url) <= 2000 and video_url ~ '^https://')),
  sort_order integer not null default 1 check (sort_order between 1 and 100),
  created_at timestamptz not null default now(),
  unique(course_id, sort_order)
);
create table public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index course_lessons_course_order on public.course_lessons(course_id, sort_order);
create index course_progress_user on public.course_progress(user_id, completed_at desc);
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_progress enable row level security;
revoke all on public.courses, public.course_lessons, public.course_progress from anon, authenticated;
grant select, insert, update, delete on public.courses, public.course_lessons to authenticated;
grant select, insert on public.course_progress to authenticated;
create policy courses_read on public.courses for select to authenticated
using (published or (select private.current_role()) in ('admin','counselor'));
create policy courses_manage on public.courses for all to authenticated
using ((select private.current_role()) = 'admin')
with check ((select private.current_role()) = 'admin');
create policy course_lessons_read on public.course_lessons for select to authenticated
using (exists(select 1 from public.courses c where c.id = course_id and
  (c.published or (select private.current_role()) in ('admin','counselor'))));
create policy course_lessons_manage on public.course_lessons for all to authenticated
using ((select private.current_role()) = 'admin')
with check ((select private.current_role()) = 'admin');
create policy course_progress_read on public.course_progress for select to authenticated
using (user_id = (select auth.uid()));
create policy course_progress_add on public.course_progress for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.course_lessons l join public.courses c on c.id=l.course_id
  where l.id=lesson_id and c.published
));
commit;
