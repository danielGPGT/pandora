-- Enable RLS on selling_rates table
alter table public.selling_rates enable row level security;

-- Users can view selling rates for products in their organization
create policy "Users can view selling rates in their org"
  on public.selling_rates for select
  using (
    organization_id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

-- Users can insert selling rates for products in their organization
create policy "Users can create selling rates in their org"
  on public.selling_rates for insert
  with check (
    organization_id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

-- Users can update selling rates for products in their organization
create policy "Users can update selling rates in their org"
  on public.selling_rates for update
  using (
    organization_id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

-- Users can delete selling rates for products in their organization
create policy "Users can delete selling rates in their org"
  on public.selling_rates for delete
  using (
    organization_id in (
      select organization_id from public.users where auth_id = auth.uid()
    )
  );

