-- ============================================================
-- PORTFOLIO — Supabase schema (clean install, safe to re-run).
-- HOW TO RUN:
--   1. Open SQL Editor -> NEW QUERY (a fresh empty tab).
--   2. Select ALL of this file, copy, paste into the empty editor.
--   3. Click RUN. It drops partial objects from earlier attempts
--      and rebuilds everything.
-- ============================================================

-- 0. Clean slate (safe: there is no real data yet)
drop table if exists public.feedback cascade;
drop table if exists public.admin_profiles cascade;
drop table if exists public.portfolio_content cascade;

-- 1. Editable content storage (one row per section, JSON blobs)
create table public.portfolio_content (
  section     text primary key,
  "data"      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;

drop policy if exists "public read content" on public.portfolio_content;
create policy "public read content" on public.portfolio_content
  for select using (true);
-- Writes go through the backend using the service role key (bypasses RLS),
-- so no insert/update policy is needed here.

-- 2. Admin allow-list. After you sign up on the site, run the
--    PROMOTE statement at the bottom with your auth.users id.
create table public.admin_profiles (
  id          bigint generated always as identity primary key,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.admin_profiles enable row level security;

-- 3. Feedback / testimonials from the public
create table public.feedback (
  id          bigint generated always as identity primary key,
  name        text not null,
  role        text default '',
  message     text not null,
  rating      int  default 5,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "public read approved feedback" on public.feedback;
create policy "public read approved feedback" on public.feedback
  for select using (approved = true);
-- Inserts go through the backend (service role), so no insert policy.

-- 4. Storage bucket for images / resume (public)
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

drop policy if exists "public read posts bucket" on storage.objects;
create policy "public read posts bucket" on storage.objects
  for select using (bucket_id = 'posts');

-- 5. Seed content so the site renders before you edit anything.
--    All of this is editable later from the Admin page in the site.
insert into public.portfolio_content (section, "data") values
('profile', '{
  "name": "Your Name",
  "title": "Full-Stack Developer",
  "tagline": "I build fast, beautiful web experiences.",
  "profile_image_url": "",
  "banner_image_url": "",
  "resume_url": ""
}'),
('about', '{
  "heading": "About Me",
  "paragraphs": [
    "Hi! I am a developer who loves crafting digital products end to end.",
    "This text is editable from the Admin page - log in and change anything."
  ]
}'),
('projects', '{
  "items": [
    {"title": "Project One", "description": "A cool thing I built.", "tech": ["React", "FastAPI"], "link": "", "image_url": ""},
    {"title": "Project Two", "description": "Another cool thing.", "tech": ["Python", "Supabase"], "link": "", "image_url": ""}
  ]
}'),
('skills', '{
  "items": ["React", "Python", "FastAPI", "JavaScript", "Supabase", "Three.js", "GSAP", "Tailwind", "Node.js", "PostgreSQL"]
}'),
('certifications', '{
  "items": [
    {"title": "Example Certification", "issuer": "Issuer Name", "year": "2025", "link": ""}
  ]
}'),
('social', '{
  "linkedin": "https://linkedin.com/in/your-handle",
  "instagram": "https://instagram.com/your-handle",
  "whatsapp": "https://wa.me/919999999999",
  "phone": "+91 99999 99999",
  "email": "you@example.com"
}'),
('cta', '{
  "heading": "Let us build something together",
  "text": "Open for freelance work and full-time roles.",
  "button_label": "Contact Me", "button_link": "/contact"
}');

-- 6. PROMOTE YOURSELF TO ADMIN
--    Sign up on the deployed site first, then run:
--
--    insert into public.admin_profiles (user_id)
--    select id from auth.users where email = 'you@example.com';
