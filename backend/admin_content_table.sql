-- ============================================================
-- SEPARATE ADMIN CONTENT DATABASE
-- Paste this into Supabase -> SQL Editor -> New query -> Run.
-- It creates a dedicated "admin_content" table (kept separate from
-- visitor feedback and auth data), copies your current site content
-- into it, and the backend starts using it automatically.
-- ============================================================

create table if not exists public.admin_content (
  section     text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.admin_content enable row level security;

drop policy if exists "public read admin content" on public.admin_content;
create policy "public read admin content" on public.admin_content
  for select using (true);

-- copy everything you have already edited into the new admin table
insert into public.admin_content (section, data)
select section, data from public.portfolio_content
on conflict (section) do update set data = excluded.data;
