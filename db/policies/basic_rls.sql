-- Enable RLS
alter table public.users enable row level security;
alter table public.organizations enable row level security;

-- Users policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = auth_id);

create policy "Users can view org members"
  on public.users for select
  using (
    organization_id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = auth_id);

-- Organizations policies
create policy "Users can view own organization"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

create policy "Admins can update organization"
  on public.organizations for update
  using (
    id in (
      select organization_id from public.users where auth_id = auth.uid() and role = 'admin'
    )
  );


