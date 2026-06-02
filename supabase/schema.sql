create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  original_prompt text,
  redacted_prompt text not null,
  ai_response text not null,
  summary text,
  selected_mode text not null,
  privacy_risk text not null default 'low',
  idea_prompt_needed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now()
);

create table if not exists conversation_boards (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  tag_name text not null
);

create table if not exists feed_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  card_type text not null,
  title text not null,
  description text not null,
  suggested_action text not null,
  created_at timestamptz default now(),
  dismissed boolean default false
);

create table if not exists privacy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  risk_level text not null,
  detected_items jsonb not null default '[]'::jsonb,
  redacted_version text not null,
  created_at timestamptz default now()
);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_tone text,
  preferred_ai_mode text,
  common_use_cases text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table boards enable row level security;
alter table conversation_boards enable row level security;
alter table tags enable row level security;
alter table feed_cards enable row level security;
alter table privacy_events enable row level security;
alter table user_preferences enable row level security;

create policy "profiles own rows" on profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "conversations own rows" on conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "boards own rows" on boards
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversation_boards own rows" on conversation_boards
for all using (
  exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid())
);

create policy "tags own rows" on tags
for all using (
  exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid())
);

create policy "feed_cards own rows" on feed_cards
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "privacy_events own rows" on privacy_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preferences own rows" on user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
