create table public.suppliers (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name character varying(255) not null,
  code character varying(50) not null,
  supplier_type character varying(50) null,
  email character varying(255) null,
  phone character varying(50) null,
  contact_info jsonb null,
  address_line1 character varying(255) null,
  city character varying(100) null,
  country character varying(2) null,
  default_currency character varying(3) null default 'USD'::character varying,
  is_active boolean null default true,
  notes text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint suppliers_pkey primary key (id),
  constraint suppliers_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_suppliers_org on public.suppliers using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_suppliers_active on public.suppliers using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create trigger update_suppliers_updated_at BEFORE
update on suppliers for EACH row
execute FUNCTION update_updated_at_column ();