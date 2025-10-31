create table public.product_options (
  id uuid not null default gen_random_uuid (),
  product_id uuid not null,
  option_name character varying(255) not null,
  option_code character varying(100) not null,
  description text null,
  attributes jsonb null default '{}'::jsonb,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  sort_order integer null,
  constraint product_options_pkey primary key (id),
  constraint product_options_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_product_options_product on public.product_options using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_product_options_active on public.product_options using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create trigger update_product_options_updated_at BEFORE
update on product_options for EACH row
execute FUNCTION update_updated_at_column ();