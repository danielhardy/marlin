-- 004_plaid_items_encryption.sql

-- 1) Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Raw table: encrypted storage
CREATE TABLE IF NOT EXISTS plaid_items_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL 
                     REFERENCES businesses(id) ON DELETE CASCADE,
  item_id          TEXT NOT NULL UNIQUE,
  access_token     BYTEA   NOT NULL,       -- encrypted blob
  cursor           TEXT,
  last_synced_at   TIMESTAMPTZ,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at   TIMESTAMPTZ,
  institution_id   TEXT,
  institution_name TEXT,
  products         TEXT[]
);
CREATE INDEX IF NOT EXISTS idx_plaid_items_raw_business_id
  ON plaid_items_raw(business_id);

-- 3) Public view: decrypt on read (returns TEXT)
CREATE OR REPLACE VIEW plaid_items AS
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
FROM plaid_items_raw;

-- 4) Trigger fn: encrypt on INSERT
CREATE OR REPLACE FUNCTION plaid_items_insert_tr() RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

-- 5) Trigger fn: re-encrypt on UPDATE
CREATE OR REPLACE FUNCTION plaid_items_update_tr() RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

-- 6) Trigger fn: pass-through DELETE
CREATE OR REPLACE FUNCTION plaid_items_delete_tr() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM plaid_items_raw WHERE id = OLD.id;
  RETURN NULL;
END;
$$;

-- 7) Wire up triggers on the view (dropping any old ones)
DROP TRIGGER IF EXISTS on_plaid_items_ins ON plaid_items;
DROP TRIGGER IF EXISTS on_plaid_items_upd ON plaid_items;
DROP TRIGGER IF EXISTS on_plaid_items_del ON plaid_items;

CREATE TRIGGER on_plaid_items_ins
  INSTEAD OF INSERT ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION plaid_items_insert_tr();

CREATE TRIGGER on_plaid_items_upd
  INSTEAD OF UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION plaid_items_update_tr();

CREATE TRIGGER on_plaid_items_del
  INSTEAD OF DELETE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION plaid_items_delete_tr();

-- 8) RPC function: upsert + encrypt + decrypt in one call
CREATE OR REPLACE FUNCTION rpc_upsert_plaid_item(
  _item_id          TEXT,
  _business_id      UUID,
  _access_token     TEXT,
  _cursor           TEXT,
  _active           BOOLEAN,
  _institution_id   TEXT,
  _institution_name TEXT,
  _products         TEXT[]
)
RETURNS TABLE (
  id               UUID,
  business_id      UUID,
  item_id          TEXT,
  access_token     TEXT,
  cursor           TEXT,
  last_synced_at   TIMESTAMPTZ,
  active           BOOLEAN,
  created_at       TIMESTAMPTZ,
  last_failed_at   TIMESTAMPTZ,
  institution_id   TEXT,
  institution_name TEXT,
  products         TEXT[]
)
LANGUAGE sql AS $$
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
$$;
