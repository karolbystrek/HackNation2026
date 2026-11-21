-- Sample ZUS case files (scans from the challenge) live outside the public repo in a private bucket.
-- index.json lists the files with labels free of personal data.
-- Only server code with the secret key reads them; there are no policies for anon or authenticated users.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('zus-cases', 'zus-cases', false, array['application/pdf', 'application/json'])
on conflict (id) do nothing;

-- Cache of AI extractions keyed by the SHA-256 of the uploaded PDF, so repeated checks skip the model call.
create table public.case_extractions (
  sha256 text primary key check (sha256 ~ '^[0-9a-f]{64}$'),
  model text not null,
  extraction jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.case_extractions enable row level security;
revoke all on public.case_extractions from anon, authenticated;
