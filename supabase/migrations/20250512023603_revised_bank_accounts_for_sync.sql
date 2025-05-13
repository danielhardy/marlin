alter table "public"."bank_accounts" add column "available_balance" numeric(15,2) not null default 0.00;

alter table "public"."bank_accounts" add column "credit_limit" numeric(15,2) not null default 0.00;

alter table "public"."bank_accounts" add column "currency_code" text not null default 'USD'::text;

alter table "public"."bank_accounts" add column "official_name" text;

alter table "public"."bank_accounts" add column "subtype" text;


