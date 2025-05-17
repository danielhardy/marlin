set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_upsert_plaid_item(_item_id text, _business_id uuid, _access_token text, _cursor text, _active boolean, _institution_id text, _institution_name text, _products text[])
 RETURNS TABLE(id uuid, business_id uuid, item_id text, access_token text, cursor text, last_synced_at timestamp with time zone, active boolean, created_at timestamp with time zone, last_failed_at timestamp with time zone, institution_id text, institution_name text, products text[])
 LANGUAGE sql
AS $function$
  WITH ins AS (
    INSERT INTO plaid_items_raw (
      item_id, business_id, access_token, cursor,
      last_synced_at, active, created_at, last_failed_at,
      institution_id, institution_name, products
    ) VALUES (
      _item_id, _business_id,
      pgp_sym_encrypt(_access_token, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg'),
      _cursor, NOW(), _active, NOW(), NULL,
      _institution_id, _institution_name, _products
    )
    ON CONFLICT (item_id) DO UPDATE
      SET access_token     = pgp_sym_encrypt(_access_token, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg'),
          cursor           = EXCLUDED.cursor,
          active           = EXCLUDED.active,
          institution_id   = EXCLUDED.institution_id,
          institution_name = EXCLUDED.institution_name,
          products         = EXCLUDED.products
    RETURNING *
  )
  SELECT
    id,
    business_id,
    item_id,
    pgp_sym_decrypt(access_token, 'IsupNQF7vp5amxcJJvsnKrGnkNfEXWPulL109Xcnihg') AS access_token,
    cursor,
    last_synced_at,
    active,
    created_at,
    last_failed_at,
    institution_id,
    institution_name,
    products
  FROM ins;
$function$
;


