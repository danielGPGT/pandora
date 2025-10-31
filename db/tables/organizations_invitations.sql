create table public.organization_invitations (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  email character varying(255) not null,
  role character varying(50) null default 'agent'::character varying,
  token text not null,
  status character varying(20) null default 'pending'::character varying,
  invited_by uuid null,
  invited_by_name character varying(255) null,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint organization_invitations_pkey primary key (id),
  constraint organization_invitations_token_key unique (token),
  constraint organization_invitations_invited_by_fkey foreign KEY (invited_by) references users (id),
  constraint organization_invitations_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_invitations_org on public.organization_invitations using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_invitations_token on public.organization_invitations using btree (token) TABLESPACE pg_default;

create index IF not exists idx_invitations_email on public.organization_invitations using btree (email) TABLESPACE pg_default;

create index IF not exists idx_invitations_status on public.organization_invitations using btree (status) TABLESPACE pg_default;