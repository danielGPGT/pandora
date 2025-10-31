create table public.products (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  product_type_id uuid not null,
  name character varying(255) not null,
  code character varying(100) not null,
  description text null,
  location jsonb null,
  venue_name character varying(255) null,
  attributes jsonb null default '{}'::jsonb,
  event_id uuid null,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  created_by uuid null,
  media jsonb null default '[]'::jsonb,
  tags text[] null default '{}'::text[],
  constraint products_pkey primary key (id),
  constraint products_created_by_fkey foreign KEY (created_by) references users (id),
  constraint products_event_id_fkey foreign KEY (event_id) references events (id),
  constraint products_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint products_product_type_id_fkey foreign KEY (product_type_id) references product_types (id),
  constraint products_media_is_array check ((jsonb_typeof(media) = 'array'::text))
) TABLESPACE pg_default;

create index IF not exists idx_products_org on public.products using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_products_type on public.products using btree (product_type_id) TABLESPACE pg_default;

create index IF not exists idx_products_event on public.products using btree (event_id) TABLESPACE pg_default
where
  (event_id is not null);

create index IF not exists idx_products_active on public.products using btree (is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_products_tags on public.products using gin (tags) TABLESPACE pg_default;

create index IF not exists idx_products_media on public.products using gin (media) TABLESPACE pg_default;

create trigger update_products_updated_at BEFORE
update on products for EACH row
execute FUNCTION update_updated_at_column ();