create table if not exists rooms (
  id bigint primary key,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 32),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on messages (room_id, created_at);

alter table rooms enable row level security;
alter table messages enable row level security;

create policy "rooms_select" on rooms for select to anon, authenticated using (true);
create policy "rooms_insert" on rooms for insert to anon, authenticated with check (true);

create policy "messages_select" on messages for select to anon, authenticated using (true);
create policy "messages_insert" on messages for insert to anon, authenticated
  with check (char_length(content) between 1 and 2000 and char_length(author) between 1 and 32);

alter publication supabase_realtime add table messages;