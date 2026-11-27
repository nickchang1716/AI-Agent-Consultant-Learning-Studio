-- AI Agent Consultant Learning Studio — 完整 schema（於 Supabase SQL Editor 一次執行）
create extension if not exists pgcrypto;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_module_id int not null default 0,
  theme text not null default 'light',
  streak_days int not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int not null check (module_id >= 0 and module_id <= 11),
  is_completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table if not exists public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int not null,
  video_key text not null,
  watched boolean not null default false,
  last_position_sec int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id, video_key)
);

create table if not exists public.custom_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int not null,
  title text not null,
  url text not null,
  replaces_index int,
  created_at timestamptz not null default now()
);

create table if not exists public.module_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int not null,
  content_md text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table if not exists public.timestamp_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int not null,
  video_key text not null,
  timestamp_sec int not null check (timestamp_sec >= 0),
  note_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcard_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  ease_factor real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_rating text check (last_rating in ('again','hard','good')),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table if not exists public.parking_lot_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id int,
  question text not null,
  answer text not null default '',
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 索引
create index if not exists idx_custom_videos_user_module on public.custom_videos (user_id, module_id);
create index if not exists idx_timestamp_notes_user_video on public.timestamp_notes (user_id, module_id, video_key);
create index if not exists idx_flashcard_due on public.flashcard_reviews (user_id, next_review_at);
create index if not exists idx_parking_user on public.parking_lot_questions (user_id, is_resolved);

-- RLS：8 張表皆啟用，且 SELECT/INSERT/UPDATE/DELETE 均驗證 auth.uid() = user_id
alter table public.user_preferences enable row level security;
alter table public.module_progress enable row level security;
alter table public.video_progress enable row level security;
alter table public.custom_videos enable row level security;
alter table public.module_notes enable row level security;
alter table public.timestamp_notes enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.parking_lot_questions enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'user_preferences','module_progress','video_progress','custom_videos',
    'module_notes','timestamp_notes','flashcard_reviews','parking_lot_questions'
  ] loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- Data API 授權：僅登入使用者（authenticated）可存取；不授權 anon。
-- 即使專案設定「不自動授權新資料表」也能正常運作；實際資料列仍由上面的 RLS 限制為本人。
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.user_preferences, public.module_progress, public.video_progress, public.custom_videos,
  public.module_notes, public.timestamp_notes, public.flashcard_reviews, public.parking_lot_questions
  to authenticated;

-- Storage：note-images（Private，5MB，限圖片格式）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', false, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

-- 路徑規則：{user_id}/{module_id}/{uuid}.{ext}，第一層資料夾必須等於 auth.uid()
drop policy if exists "note_images_select_own" on storage.objects;
drop policy if exists "note_images_insert_own" on storage.objects;
drop policy if exists "note_images_update_own" on storage.objects;
drop policy if exists "note_images_delete_own" on storage.objects;
create policy "note_images_select_own" on storage.objects for select
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_images_insert_own" on storage.objects for insert
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_images_update_own" on storage.objects for update
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "note_images_delete_own" on storage.objects for delete
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
