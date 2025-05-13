drop index if exists "public"."idx_transactions_date";

alter table "public"."transactions" alter column "status" drop default;

alter type "public"."transaction_status" rename to "transaction_status__old_version_to_be_dropped";

create type "public"."transaction_status" as enum ('pending', 'posted', 'reviewed', 'deleted', 'cleared');

alter table "public"."transactions" alter column status type "public"."transaction_status" using status::text::"public"."transaction_status";

alter table "public"."transactions" alter column "status" set default 'pending'::transaction_status;

drop type "public"."transaction_status__old_version_to_be_dropped";

alter table "public"."plaid_items" add column "active" boolean default true;

alter table "public"."plaid_items" add column "cursor" text;

alter table "public"."plaid_items" add column "last_failed_at" timestamp with time zone;

alter table "public"."plaid_items" add column "last_synced_at" timestamp with time zone;

alter table "public"."transactions" drop column "currency";

alter table "public"."transactions" drop column "date";

alter table "public"."transactions" drop column "raw_description";

alter table "public"."transactions" add column "date_posted" date not null;

alter table "public"."transactions" add column "iso_currency_code" text not null;

alter table "public"."transactions" add column "item_id" uuid not null;

alter table "public"."transactions" add column "merchant_name" text;

alter table "public"."transactions" add column "name" text;

alter table "public"."transactions" add column "pending" boolean not null default false;

alter table "public"."transactions" add column "plaid_transaction_id" text not null;

alter table "public"."transactions" add column "raw_details" jsonb not null;

alter table "public"."transactions" add column "reviewed_at" timestamp with time zone;

alter table "public"."transactions" add column "synced_at" timestamp with time zone not null default now();

CREATE INDEX idx_transactions_date_posted ON public.transactions USING btree (date_posted);

CREATE INDEX idx_transactions_item_id ON public.transactions USING btree (item_id);

CREATE UNIQUE INDEX transactions_plaid_transaction_id_key ON public.transactions USING btree (plaid_transaction_id);

alter table "public"."transactions" add constraint "transactions_item_id_fkey" FOREIGN KEY (item_id) REFERENCES plaid_items(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "transactions_item_id_fkey";

alter table "public"."transactions" add constraint "transactions_plaid_transaction_id_key" UNIQUE using index "transactions_plaid_transaction_id_key";


