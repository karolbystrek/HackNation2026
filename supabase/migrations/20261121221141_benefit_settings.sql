create table public.benefit_settings (
  id boolean primary key default true check (id),
  overrides jsonb not null check (jsonb_typeof(overrides) = 'object')
);

alter table public.benefit_settings enable row level security;
revoke all on public.benefit_settings from anon, authenticated;
grant select, insert, update on public.benefit_settings to service_role;
