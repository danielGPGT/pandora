-- Function to create user profile after auth signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  org_slug text;
begin
  -- Invited user path
  if exists (
    select 1 from public.organization_invitations 
    where email = new.email and status = 'pending'
  ) then
    insert into public.users (
      auth_id,
      organization_id,
      email,
      role,
      email_verified,
      is_active
    )
    select 
      new.id,
      organization_id,
      new.email,
      role,
      new.email_confirmed_at is not null,
      true
    from public.organization_invitations
    where email = new.email and status = 'pending'
    limit 1;

    update public.organization_invitations
    set status = 'accepted', accepted_at = now()
    where email = new.email and status = 'pending';

  else
    -- New owner path: create org, then admin user
    org_slug := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '-', 'g'));

    insert into public.organizations (
      name, slug, email, subscription_plan, subscription_status, trial_ends_at, is_active
    ) values (
      split_part(new.email, '@', 1),
      org_slug || '-' || substr(gen_random_uuid()::text, 1, 8),
      new.email,
      'free', 'trial', now() + interval '14 days', true
    ) returning id into new_org_id;

    insert into public.users (
      auth_id, organization_id, email, role, email_verified, is_active
    ) values (
      new.id, new_org_id, new.email, 'admin', new.email_confirmed_at is not null, true
    );

    update public.organizations
    set current_users = current_users + 1
    where id = new_org_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


