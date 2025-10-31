create table public.events (
  id uuid not null default gen_random_uuid (),
  organization_id uuid null,
  event_name character varying(255) not null,
  event_code character varying(50) null,
  event_type character varying(50) null,
  venue_name character varying(255) null,
  city character varying(100) null,
  country character varying(2) null,
  event_date_from date not null,
  event_date_to date not null,
  event_status character varying(20) null default 'scheduled'::character varying,
  description text null,
  event_image_url text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint events_pkey primary key (id),
  constraint events_organization_id_fkey foreign KEY (organization_id) references organizations (id)
) TABLESPACE pg_default;

create index IF not exists idx_events_dates on public.events using btree (event_date_from, event_date_to) TABLESPACE pg_default;

create index IF not exists idx_events_upcoming on public.events using btree (event_date_from) TABLESPACE pg_default;

create trigger update_events_updated_at BEFORE
update on events for EACH row
execute FUNCTION update_updated_at_column ();