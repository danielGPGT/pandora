create table public.organizations (
  id uuid not null default gen_random_uuid (),
  name character varying(255) not null,
  slug character varying(255) not null,
  code character varying(50) null,
  email character varying(255) null,
  phone character varying(50) null,
  website character varying(255) null,
  address_line1 character varying(255) null,
  city character varying(100) null,
  country character varying(2) null,
  default_currency character varying(3) null default 'USD'::character varying,
  base_currency character varying(3) null default 'USD'::character varying,
  timezone character varying(50) null default 'UTC'::character varying,
  logo_url text null,
  settings jsonb null default '{}'::jsonb,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  subscription_plan character varying(50) null default 'free'::character varying,
  subscription_status character varying(50) null default 'active'::character varying,
  trial_ends_at timestamp with time zone null,
  subscription_ends_at timestamp with time zone null,
  features jsonb null default '{}'::jsonb,
  max_users integer null default 5,
  current_users integer null default 0,
  constraint organizations_pkey primary key (id),
  constraint organizations_code_key unique (code),
  constraint organizations_slug_key unique (slug)
) TABLESPACE pg_default;

create index IF not exists idx_organizations_slug on public.organizations using btree (slug) TABLESPACE pg_default;

create index IF not exists idx_organizations_active on public.organizations using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_organizations_subscription on public.organizations using btree (subscription_plan, subscription_status) TABLESPACE pg_default;

create index IF not exists idx_organizations_active_subs on public.organizations using btree (is_active, subscription_status) TABLESPACE pg_default
where
  (is_active = true);

create trigger update_organizations_updated_at BEFORE
update on organizations for EACH row
execute FUNCTION update_updated_at_column ();