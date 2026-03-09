-- Chat sessions (project-specific)
create table if not exists payer_claims_analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'default',
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat messages (project-specific)
create table if not exists payer_claims_analysis_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references payer_claims_analysis_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null default '',
  tool_call jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_pca_messages_session on payer_claims_analysis_messages(session_id);
create index if not exists idx_pca_sessions_updated on payer_claims_analysis_sessions(updated_at desc);

-- RLS
alter table payer_claims_analysis_sessions enable row level security;
alter table payer_claims_analysis_messages enable row level security;

create policy "Allow all on payer_claims_analysis_sessions" on payer_claims_analysis_sessions for all using (true);
create policy "Allow all on payer_claims_analysis_messages" on payer_claims_analysis_messages for all using (true);
