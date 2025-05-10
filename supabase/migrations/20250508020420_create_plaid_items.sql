create table "public"."plaid_items" (
    "id" uuid not null,
    "business_id" uuid not null,
    "item_id" text not null,
    "access_token" text not null,
    "created_at" timestamp with time zone not null default now()
);


CREATE INDEX idx_plaid_items_business_id ON public.plaid_items USING btree (business_id);

CREATE UNIQUE INDEX plaid_items_item_id_key ON public.plaid_items USING btree (item_id);

CREATE UNIQUE INDEX plaid_items_pkey ON public.plaid_items USING btree (id);

alter table "public"."plaid_items" add constraint "plaid_items_pkey" PRIMARY KEY using index "plaid_items_pkey";

alter table "public"."plaid_items" add constraint "plaid_items_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."plaid_items" validate constraint "plaid_items_business_id_fkey";

alter table "public"."plaid_items" add constraint "plaid_items_item_id_key" UNIQUE using index "plaid_items_item_id_key";

grant delete on table "public"."plaid_items" to "anon";

grant insert on table "public"."plaid_items" to "anon";

grant references on table "public"."plaid_items" to "anon";

grant select on table "public"."plaid_items" to "anon";

grant trigger on table "public"."plaid_items" to "anon";

grant truncate on table "public"."plaid_items" to "anon";

grant update on table "public"."plaid_items" to "anon";

grant delete on table "public"."plaid_items" to "authenticated";

grant insert on table "public"."plaid_items" to "authenticated";

grant references on table "public"."plaid_items" to "authenticated";

grant select on table "public"."plaid_items" to "authenticated";

grant trigger on table "public"."plaid_items" to "authenticated";

grant truncate on table "public"."plaid_items" to "authenticated";

grant update on table "public"."plaid_items" to "authenticated";

grant delete on table "public"."plaid_items" to "service_role";

grant insert on table "public"."plaid_items" to "service_role";

grant references on table "public"."plaid_items" to "service_role";

grant select on table "public"."plaid_items" to "service_role";

grant trigger on table "public"."plaid_items" to "service_role";

grant truncate on table "public"."plaid_items" to "service_role";

grant update on table "public"."plaid_items" to "service_role";


