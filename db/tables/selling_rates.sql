create table public.selling_rates (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  product_id uuid not null,
  product_option_id uuid null,
  rate_name character varying(255) null,
  rate_basis character varying(50) not null,
  pricing_model character varying(50) not null default 'standard',
  valid_from date not null,
  valid_to date not null,
  base_price numeric(10, 2) not null,
  currency character varying(3) null default 'USD'::character varying,
  markup_type character varying(20) null,
  markup_amount numeric(10, 2) null,
  pricing_details jsonb null,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  target_cost numeric(10, 2) null,
  constraint selling_rates_pkey primary key (id),
  constraint selling_rates_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint selling_rates_product_id_fkey foreign KEY (product_id) references products (id),
  constraint selling_rates_product_option_id_fkey foreign KEY (product_option_id) references product_options (id),
  constraint check_selling_rate_dates check ((valid_to >= valid_from))
) TABLESPACE pg_default;

create index IF not exists idx_selling_rates_org on public.selling_rates using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_selling_rates_product on public.selling_rates using btree (product_id) TABLESPACE pg_default;

create trigger update_selling_rates_updated_at BEFORE
update on selling_rates for EACH row
execute FUNCTION update_updated_at_column ();