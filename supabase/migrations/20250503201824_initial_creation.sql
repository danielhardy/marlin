create type "public"."invoice_status" as enum ('draft', 'sent', 'paid', 'void', 'overdue');

create type "public"."transaction_status" as enum ('pending', 'cleared');

create table "public"."bank_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "plaid_account_id" text not null,
    "name" text not null,
    "mask" text,
    "type" text,
    "current_balance" numeric(15,2) not null default 0.00,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."businesses" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "legal_name" text not null,
    "tax_id" text,
    "country" text,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "parent_id" uuid,
    "name" text not null,
    "schedule_c_code" text,
    "is_system" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."daily_digests" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "date" date not null,
    "cash_in" numeric(15,2) not null default 0.00,
    "cash_out" numeric(15,2) not null default 0.00,
    "tax_reserved" numeric(15,2) not null default 0.00,
    "unreviewed_count" integer not null default 0
);


create table "public"."invoice_items" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid not null,
    "description" text not null,
    "quantity" numeric(10,2) not null default 1,
    "unit_price" numeric(15,2) not null,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."invoices" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "stripe_invoice_id" text,
    "invoice_number" text,
    "customer_name" text,
    "customer_email" text,
    "status" invoice_status not null default 'draft'::invoice_status,
    "currency" text not null default 'USD'::text,
    "total_amount" numeric(15,2) not null default 0.00,
    "amount_due" numeric(15,2) not null default 0.00,
    "amount_paid" numeric(15,2) not null default 0.00,
    "issue_date" date not null default CURRENT_DATE,
    "due_date" date,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."receipts" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "storage_path" text not null,
    "transaction_id" uuid,
    "uploaded_by" uuid not null,
    "uploaded_at" timestamp with time zone not null default now(),
    "parsed_total" numeric(15,2),
    "parsed_date" date,
    "parsed_vendor" text,
    "file_name" text,
    "content_type" text
);


create table "public"."rules" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "match" jsonb not null,
    "category_id" uuid not null,
    "auto" boolean not null default false,
    "priority" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."tax_vaults" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "destination_bank_account_id" uuid,
    "sales_tax_rate" numeric(5,4),
    "income_tax_rate" numeric(5,4),
    "last_sweep_at" timestamp with time zone,
    "is_enabled" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "business_id" uuid not null,
    "bank_account_id" uuid not null,
    "date" date not null,
    "amount" numeric(15,2) not null,
    "currency" text not null,
    "raw_description" text,
    "category_id" uuid,
    "ai_confidence" real,
    "status" transaction_status not null default 'pending'::transaction_status,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "full_name" text,
    "created_at" timestamp with time zone not null default now()
);


CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);

CREATE UNIQUE INDEX bank_accounts_plaid_account_id_key ON public.bank_accounts USING btree (plaid_account_id);

CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX daily_digests_pkey ON public.daily_digests USING btree (id);

CREATE INDEX idx_bank_accounts_business_id ON public.bank_accounts USING btree (business_id);

CREATE INDEX idx_bank_accounts_plaid_account_id ON public.bank_accounts USING btree (plaid_account_id);

CREATE INDEX idx_businesses_owner_id ON public.businesses USING btree (owner_id);

CREATE INDEX idx_categories_business_id ON public.categories USING btree (business_id);

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);

CREATE INDEX idx_daily_digests_business_id_date ON public.daily_digests USING btree (business_id, date);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE INDEX idx_invoices_business_id ON public.invoices USING btree (business_id);

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_invoices_stripe_invoice_id ON public.invoices USING btree (stripe_invoice_id);

CREATE INDEX idx_receipts_business_id ON public.receipts USING btree (business_id);

CREATE INDEX idx_receipts_transaction_id ON public.receipts USING btree (transaction_id);

CREATE INDEX idx_receipts_uploaded_at ON public.receipts USING btree (uploaded_at);

CREATE INDEX idx_receipts_uploaded_by ON public.receipts USING btree (uploaded_by);

CREATE INDEX idx_rules_business_id ON public.rules USING btree (business_id);

CREATE INDEX idx_rules_category_id ON public.rules USING btree (category_id);

CREATE INDEX idx_rules_match ON public.rules USING gin (match);

CREATE INDEX idx_tax_vaults_business_id ON public.tax_vaults USING btree (business_id);

CREATE INDEX idx_tax_vaults_destination_bank_account_id ON public.tax_vaults USING btree (destination_bank_account_id);

CREATE INDEX idx_transactions_bank_account_id ON public.transactions USING btree (bank_account_id);

CREATE INDEX idx_transactions_business_id ON public.transactions USING btree (business_id);

CREATE INDEX idx_transactions_category_id ON public.transactions USING btree (category_id);

CREATE INDEX idx_transactions_date ON public.transactions USING btree (date);

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE UNIQUE INDEX invoice_items_pkey ON public.invoice_items USING btree (id);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX invoices_stripe_invoice_id_key ON public.invoices USING btree (stripe_invoice_id);

CREATE UNIQUE INDEX receipts_pkey ON public.receipts USING btree (id);

CREATE UNIQUE INDEX receipts_storage_path_key ON public.receipts USING btree (storage_path);

CREATE UNIQUE INDEX rules_pkey ON public.rules USING btree (id);

CREATE UNIQUE INDEX tax_vaults_business_id_key ON public.tax_vaults USING btree (business_id);

CREATE UNIQUE INDEX tax_vaults_pkey ON public.tax_vaults USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX unique_category_name ON public.categories USING btree (business_id, parent_id, name);

CREATE UNIQUE INDEX unique_digest_per_day ON public.daily_digests USING btree (business_id, date);

CREATE UNIQUE INDEX unique_invoice_number_per_business ON public.invoices USING btree (business_id, invoice_number);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."bank_accounts" add constraint "bank_accounts_pkey" PRIMARY KEY using index "bank_accounts_pkey";

alter table "public"."businesses" add constraint "businesses_pkey" PRIMARY KEY using index "businesses_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."daily_digests" add constraint "daily_digests_pkey" PRIMARY KEY using index "daily_digests_pkey";

alter table "public"."invoice_items" add constraint "invoice_items_pkey" PRIMARY KEY using index "invoice_items_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."receipts" add constraint "receipts_pkey" PRIMARY KEY using index "receipts_pkey";

alter table "public"."rules" add constraint "rules_pkey" PRIMARY KEY using index "rules_pkey";

alter table "public"."tax_vaults" add constraint "tax_vaults_pkey" PRIMARY KEY using index "tax_vaults_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."bank_accounts" add constraint "bank_accounts_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."bank_accounts" validate constraint "bank_accounts_business_id_fkey";

alter table "public"."bank_accounts" add constraint "bank_accounts_plaid_account_id_key" UNIQUE using index "bank_accounts_plaid_account_id_key";

alter table "public"."businesses" add constraint "businesses_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT not valid;

alter table "public"."businesses" validate constraint "businesses_owner_id_fkey";

alter table "public"."categories" add constraint "categories_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_business_id_fkey";

alter table "public"."categories" add constraint "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL not valid;

alter table "public"."categories" validate constraint "categories_parent_id_fkey";

alter table "public"."categories" add constraint "unique_category_name" UNIQUE using index "unique_category_name";

alter table "public"."daily_digests" add constraint "daily_digests_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."daily_digests" validate constraint "daily_digests_business_id_fkey";

alter table "public"."daily_digests" add constraint "unique_digest_per_day" UNIQUE using index "unique_digest_per_day";

alter table "public"."invoice_items" add constraint "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_invoice_id_fkey";

alter table "public"."invoice_items" add constraint "invoice_items_quantity_check" CHECK ((quantity > (0)::numeric)) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_quantity_check";

alter table "public"."invoice_items" add constraint "invoice_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)) not valid;

alter table "public"."invoice_items" validate constraint "invoice_items_unit_price_check";

alter table "public"."invoices" add constraint "invoices_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."invoices" validate constraint "invoices_business_id_fkey";

alter table "public"."invoices" add constraint "invoices_stripe_invoice_id_key" UNIQUE using index "invoices_stripe_invoice_id_key";

alter table "public"."invoices" add constraint "unique_invoice_number_per_business" UNIQUE using index "unique_invoice_number_per_business";

alter table "public"."receipts" add constraint "receipts_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."receipts" validate constraint "receipts_business_id_fkey";

alter table "public"."receipts" add constraint "receipts_storage_path_key" UNIQUE using index "receipts_storage_path_key";

alter table "public"."receipts" add constraint "receipts_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL not valid;

alter table "public"."receipts" validate constraint "receipts_transaction_id_fkey";

alter table "public"."receipts" add constraint "receipts_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) not valid;

alter table "public"."receipts" validate constraint "receipts_uploaded_by_fkey";

alter table "public"."rules" add constraint "rules_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."rules" validate constraint "rules_business_id_fkey";

alter table "public"."rules" add constraint "rules_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE not valid;

alter table "public"."rules" validate constraint "rules_category_id_fkey";

alter table "public"."tax_vaults" add constraint "tax_vaults_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."tax_vaults" validate constraint "tax_vaults_business_id_fkey";

alter table "public"."tax_vaults" add constraint "tax_vaults_business_id_key" UNIQUE using index "tax_vaults_business_id_key";

alter table "public"."tax_vaults" add constraint "tax_vaults_destination_bank_account_id_fkey" FOREIGN KEY (destination_bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL not valid;

alter table "public"."tax_vaults" validate constraint "tax_vaults_destination_bank_account_id_fkey";

alter table "public"."tax_vaults" add constraint "tax_vaults_income_tax_rate_check" CHECK (((income_tax_rate >= (0)::numeric) AND (income_tax_rate <= (1)::numeric))) not valid;

alter table "public"."tax_vaults" validate constraint "tax_vaults_income_tax_rate_check";

alter table "public"."tax_vaults" add constraint "tax_vaults_sales_tax_rate_check" CHECK (((sales_tax_rate >= (0)::numeric) AND (sales_tax_rate <= (1)::numeric))) not valid;

alter table "public"."tax_vaults" validate constraint "tax_vaults_sales_tax_rate_check";

alter table "public"."transactions" add constraint "transactions_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "transactions_bank_account_id_fkey";

alter table "public"."transactions" add constraint "transactions_business_id_fkey" FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "transactions_business_id_fkey";

alter table "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL not valid;

alter table "public"."transactions" validate constraint "transactions_category_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

grant delete on table "public"."bank_accounts" to "anon";

grant insert on table "public"."bank_accounts" to "anon";

grant references on table "public"."bank_accounts" to "anon";

grant select on table "public"."bank_accounts" to "anon";

grant trigger on table "public"."bank_accounts" to "anon";

grant truncate on table "public"."bank_accounts" to "anon";

grant update on table "public"."bank_accounts" to "anon";

grant delete on table "public"."bank_accounts" to "authenticated";

grant insert on table "public"."bank_accounts" to "authenticated";

grant references on table "public"."bank_accounts" to "authenticated";

grant select on table "public"."bank_accounts" to "authenticated";

grant trigger on table "public"."bank_accounts" to "authenticated";

grant truncate on table "public"."bank_accounts" to "authenticated";

grant update on table "public"."bank_accounts" to "authenticated";

grant delete on table "public"."bank_accounts" to "service_role";

grant insert on table "public"."bank_accounts" to "service_role";

grant references on table "public"."bank_accounts" to "service_role";

grant select on table "public"."bank_accounts" to "service_role";

grant trigger on table "public"."bank_accounts" to "service_role";

grant truncate on table "public"."bank_accounts" to "service_role";

grant update on table "public"."bank_accounts" to "service_role";

grant delete on table "public"."businesses" to "anon";

grant insert on table "public"."businesses" to "anon";

grant references on table "public"."businesses" to "anon";

grant select on table "public"."businesses" to "anon";

grant trigger on table "public"."businesses" to "anon";

grant truncate on table "public"."businesses" to "anon";

grant update on table "public"."businesses" to "anon";

grant delete on table "public"."businesses" to "authenticated";

grant insert on table "public"."businesses" to "authenticated";

grant references on table "public"."businesses" to "authenticated";

grant select on table "public"."businesses" to "authenticated";

grant trigger on table "public"."businesses" to "authenticated";

grant truncate on table "public"."businesses" to "authenticated";

grant update on table "public"."businesses" to "authenticated";

grant delete on table "public"."businesses" to "service_role";

grant insert on table "public"."businesses" to "service_role";

grant references on table "public"."businesses" to "service_role";

grant select on table "public"."businesses" to "service_role";

grant trigger on table "public"."businesses" to "service_role";

grant truncate on table "public"."businesses" to "service_role";

grant update on table "public"."businesses" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."daily_digests" to "anon";

grant insert on table "public"."daily_digests" to "anon";

grant references on table "public"."daily_digests" to "anon";

grant select on table "public"."daily_digests" to "anon";

grant trigger on table "public"."daily_digests" to "anon";

grant truncate on table "public"."daily_digests" to "anon";

grant update on table "public"."daily_digests" to "anon";

grant delete on table "public"."daily_digests" to "authenticated";

grant insert on table "public"."daily_digests" to "authenticated";

grant references on table "public"."daily_digests" to "authenticated";

grant select on table "public"."daily_digests" to "authenticated";

grant trigger on table "public"."daily_digests" to "authenticated";

grant truncate on table "public"."daily_digests" to "authenticated";

grant update on table "public"."daily_digests" to "authenticated";

grant delete on table "public"."daily_digests" to "service_role";

grant insert on table "public"."daily_digests" to "service_role";

grant references on table "public"."daily_digests" to "service_role";

grant select on table "public"."daily_digests" to "service_role";

grant trigger on table "public"."daily_digests" to "service_role";

grant truncate on table "public"."daily_digests" to "service_role";

grant update on table "public"."daily_digests" to "service_role";

grant delete on table "public"."invoice_items" to "anon";

grant insert on table "public"."invoice_items" to "anon";

grant references on table "public"."invoice_items" to "anon";

grant select on table "public"."invoice_items" to "anon";

grant trigger on table "public"."invoice_items" to "anon";

grant truncate on table "public"."invoice_items" to "anon";

grant update on table "public"."invoice_items" to "anon";

grant delete on table "public"."invoice_items" to "authenticated";

grant insert on table "public"."invoice_items" to "authenticated";

grant references on table "public"."invoice_items" to "authenticated";

grant select on table "public"."invoice_items" to "authenticated";

grant trigger on table "public"."invoice_items" to "authenticated";

grant truncate on table "public"."invoice_items" to "authenticated";

grant update on table "public"."invoice_items" to "authenticated";

grant delete on table "public"."invoice_items" to "service_role";

grant insert on table "public"."invoice_items" to "service_role";

grant references on table "public"."invoice_items" to "service_role";

grant select on table "public"."invoice_items" to "service_role";

grant trigger on table "public"."invoice_items" to "service_role";

grant truncate on table "public"."invoice_items" to "service_role";

grant update on table "public"."invoice_items" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant delete on table "public"."receipts" to "anon";

grant insert on table "public"."receipts" to "anon";

grant references on table "public"."receipts" to "anon";

grant select on table "public"."receipts" to "anon";

grant trigger on table "public"."receipts" to "anon";

grant truncate on table "public"."receipts" to "anon";

grant update on table "public"."receipts" to "anon";

grant delete on table "public"."receipts" to "authenticated";

grant insert on table "public"."receipts" to "authenticated";

grant references on table "public"."receipts" to "authenticated";

grant select on table "public"."receipts" to "authenticated";

grant trigger on table "public"."receipts" to "authenticated";

grant truncate on table "public"."receipts" to "authenticated";

grant update on table "public"."receipts" to "authenticated";

grant delete on table "public"."receipts" to "service_role";

grant insert on table "public"."receipts" to "service_role";

grant references on table "public"."receipts" to "service_role";

grant select on table "public"."receipts" to "service_role";

grant trigger on table "public"."receipts" to "service_role";

grant truncate on table "public"."receipts" to "service_role";

grant update on table "public"."receipts" to "service_role";

grant delete on table "public"."rules" to "anon";

grant insert on table "public"."rules" to "anon";

grant references on table "public"."rules" to "anon";

grant select on table "public"."rules" to "anon";

grant trigger on table "public"."rules" to "anon";

grant truncate on table "public"."rules" to "anon";

grant update on table "public"."rules" to "anon";

grant delete on table "public"."rules" to "authenticated";

grant insert on table "public"."rules" to "authenticated";

grant references on table "public"."rules" to "authenticated";

grant select on table "public"."rules" to "authenticated";

grant trigger on table "public"."rules" to "authenticated";

grant truncate on table "public"."rules" to "authenticated";

grant update on table "public"."rules" to "authenticated";

grant delete on table "public"."rules" to "service_role";

grant insert on table "public"."rules" to "service_role";

grant references on table "public"."rules" to "service_role";

grant select on table "public"."rules" to "service_role";

grant trigger on table "public"."rules" to "service_role";

grant truncate on table "public"."rules" to "service_role";

grant update on table "public"."rules" to "service_role";

grant delete on table "public"."tax_vaults" to "anon";

grant insert on table "public"."tax_vaults" to "anon";

grant references on table "public"."tax_vaults" to "anon";

grant select on table "public"."tax_vaults" to "anon";

grant trigger on table "public"."tax_vaults" to "anon";

grant truncate on table "public"."tax_vaults" to "anon";

grant update on table "public"."tax_vaults" to "anon";

grant delete on table "public"."tax_vaults" to "authenticated";

grant insert on table "public"."tax_vaults" to "authenticated";

grant references on table "public"."tax_vaults" to "authenticated";

grant select on table "public"."tax_vaults" to "authenticated";

grant trigger on table "public"."tax_vaults" to "authenticated";

grant truncate on table "public"."tax_vaults" to "authenticated";

grant update on table "public"."tax_vaults" to "authenticated";

grant delete on table "public"."tax_vaults" to "service_role";

grant insert on table "public"."tax_vaults" to "service_role";

grant references on table "public"."tax_vaults" to "service_role";

grant select on table "public"."tax_vaults" to "service_role";

grant trigger on table "public"."tax_vaults" to "service_role";

grant truncate on table "public"."tax_vaults" to "service_role";

grant update on table "public"."tax_vaults" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


