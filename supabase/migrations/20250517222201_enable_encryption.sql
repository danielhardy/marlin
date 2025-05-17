revoke delete on table "public"."plaid_items" from "anon";

revoke insert on table "public"."plaid_items" from "anon";

revoke references on table "public"."plaid_items" from "anon";

revoke select on table "public"."plaid_items" from "anon";

revoke trigger on table "public"."plaid_items" from "anon";

revoke truncate on table "public"."plaid_items" from "anon";

revoke update on table "public"."plaid_items" from "anon";

revoke delete on table "public"."plaid_items" from "authenticated";

revoke insert on table "public"."plaid_items" from "authenticated";

revoke references on table "public"."plaid_items" from "authenticated";

revoke select on table "public"."plaid_items" from "authenticated";

revoke trigger on table "public"."plaid_items" from "authenticated";

revoke truncate on table "public"."plaid_items" from "authenticated";

revoke update on table "public"."plaid_items" from "authenticated";

revoke delete on table "public"."plaid_items" from "service_role";

revoke insert on table "public"."plaid_items" from "service_role";

revoke references on table "public"."plaid_items" from "service_role";

revoke select on table "public"."plaid_items" from "service_role";

revoke trigger on table "public"."plaid_items" from "service_role";

revoke truncate on table "public"."plaid_items" from "service_role";

revoke update on table "public"."plaid_items" from "service_role";

alter table "public"."plaid_items" drop constraint "plaid_items_business_id_fkey";

alter table "public"."plaid_items" drop constraint "plaid_items_item_id_key";

alter table "public"."transactions" drop constraint "transactions_item_id_fkey";

alter table "public"."plaid_items" drop constraint "plaid_items_pkey";

drop index if exists "public"."idx_plaid_items_business_id";

drop index if exists "public"."plaid_items_item_id_key";

drop index if exists "public"."plaid_items_pkey";

drop table "public"."plaid_items";

create table "public"."plaid_items_raw" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "item_id" text not null,
    "access_token" bytea not null,
    "cursor" text,
    "last_synced_at" timestamp with time zone,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "last_failed_at" timestamp with time zone,
    "institution_id" text,
    "institution_name" text,
    "products" text[]
);


CREATE INDEX idx_plaid_items_raw_business_id ON public.plaid_items_raw USING btree (business_id);

CREATE UNIQUE INDEX plaid_items_raw_item_id_key ON public.plaid_items_raw USING btree (item_id);

CREATE UNIQUE INDEX plaid_items_raw_pkey ON public.plaid_items_raw USING btree (id);

alter table "public"."plaid_items_raw" add constraint "plaid_items_raw_pkey" PRIMARY KEY using index "plaid_items_raw_pkey";

alter table "public"."plaid_items_raw" add constraint "plaid_items_raw_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."plaid_items_raw" validate constraint "plaid_items_raw_business_id_fkey";

alter table "public"."plaid_items_raw" add constraint "plaid_items_raw_item_id_key" UNIQUE using index "plaid_items_raw_item_id_key";

alter table "public"."transactions" add constraint "transactions_item_id_fkey" FOREIGN KEY (item_id) REFERENCES plaid_items_raw(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "transactions_item_id_fkey";

set check_function_bodies = off;

create or replace view "public"."plaid_items" as  SELECT plaid_items_raw.id,
    plaid_items_raw.business_id,
    plaid_items_raw.item_id,
    pgp_sym_decrypt(plaid_items_raw.access_token, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg'::text) AS access_token,
    plaid_items_raw.cursor,
    plaid_items_raw.last_synced_at,
    plaid_items_raw.active,
    plaid_items_raw.created_at,
    plaid_items_raw.last_failed_at,
    plaid_items_raw.institution_id,
    plaid_items_raw.institution_name,
    plaid_items_raw.products
   FROM plaid_items_raw;


CREATE OR REPLACE FUNCTION public.plaid_items_delete_tr()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM plaid_items_raw WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.plaid_items_insert_tr()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO plaid_items_raw (
    id, business_id, item_id, access_token, cursor,
    last_synced_at, active, created_at, last_failed_at,
    institution_id, institution_name, products
  ) VALUES (
    NEW.id,
    NEW.business_id,
    NEW.item_id,
    pgp_sym_encrypt(NEW.access_token::text, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg'),
    NEW.cursor,
    NEW.last_synced_at,
    NEW.active,
    NEW.created_at,
    NEW.last_failed_at,
    NEW.institution_id,
    NEW.institution_name,
    NEW.products
  );
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.plaid_items_update_tr()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE plaid_items_raw SET
    business_id      = NEW.business_id,
    item_id          = NEW.item_id,
    access_token     = pgp_sym_encrypt(NEW.access_token::text, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg'),
    cursor           = NEW.cursor,
    last_synced_at   = NEW.last_synced_at,
    active           = NEW.active,
    created_at       = NEW.created_at,
    last_failed_at   = NEW.last_failed_at,
    institution_id   = NEW.institution_id,
    institution_name = NEW.institution_name,
    products         = NEW.products
  WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

grant delete on table "public"."plaid_items_raw" to "anon";

grant insert on table "public"."plaid_items_raw" to "anon";

grant references on table "public"."plaid_items_raw" to "anon";

grant select on table "public"."plaid_items_raw" to "anon";

grant trigger on table "public"."plaid_items_raw" to "anon";

grant truncate on table "public"."plaid_items_raw" to "anon";

grant update on table "public"."plaid_items_raw" to "anon";

grant delete on table "public"."plaid_items_raw" to "authenticated";

grant insert on table "public"."plaid_items_raw" to "authenticated";

grant references on table "public"."plaid_items_raw" to "authenticated";

grant select on table "public"."plaid_items_raw" to "authenticated";

grant trigger on table "public"."plaid_items_raw" to "authenticated";

grant truncate on table "public"."plaid_items_raw" to "authenticated";

grant update on table "public"."plaid_items_raw" to "authenticated";

grant delete on table "public"."plaid_items_raw" to "service_role";

grant insert on table "public"."plaid_items_raw" to "service_role";

grant references on table "public"."plaid_items_raw" to "service_role";

grant select on table "public"."plaid_items_raw" to "service_role";

grant trigger on table "public"."plaid_items_raw" to "service_role";

grant truncate on table "public"."plaid_items_raw" to "service_role";

grant update on table "public"."plaid_items_raw" to "service_role";

CREATE TRIGGER on_plaid_items_del INSTEAD OF DELETE ON public.plaid_items FOR EACH ROW EXECUTE FUNCTION plaid_items_delete_tr();

CREATE TRIGGER on_plaid_items_ins INSTEAD OF INSERT ON public.plaid_items FOR EACH ROW EXECUTE FUNCTION plaid_items_insert_tr();

CREATE TRIGGER on_plaid_items_upd INSTEAD OF UPDATE ON public.plaid_items FOR EACH ROW EXECUTE FUNCTION plaid_items_update_tr();


