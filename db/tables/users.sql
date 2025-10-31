create table public.users (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  email character varying(255) not null,
  password_hash character varying(255) null,
  first_name character varying(100) null,
  last_name character varying(100) null,
  phone character varying(50) null,
  role character varying(50) null default 'agent'::character varying,
  is_active boolean null default true,
  email_verified boolean null default false,
  last_login_at timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  auth_id uuid null,
  is_super_admin boolean null default false,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_auth_id_fkey foreign KEY (auth_id) references auth.users (id),
  constraint users_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_users_org on public.users using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;

create index IF not exists idx_users_auth_id on public.users using btree (auth_id) TABLESPACE pg_default;

create index IF not exists idx_users_super_admin on public.users using btree (is_super_admin) TABLESPACE pg_default
where
  (is_super_admin = true);

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();