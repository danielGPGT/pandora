create table public.product_types (
  id uuid not null default gen_random_uuid (),
  type_code character varying(50) not null,
  type_name character varying(255) not null,
  description text null,
  icon character varying(50) null,
  is_active boolean null default true,
  constraint product_types_pkey primary key (id),
  constraint product_types_type_code_key unique (type_code)
) TABLESPACE pg_default;