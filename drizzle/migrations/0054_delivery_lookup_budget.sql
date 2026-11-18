-- SEVEN HOTFIX 08 — Brasil Supabase only. Run in SQL Editor BEFORE publishing patch.
-- A new ledger is intentionally separate from paid/distance quote attempts.
-- No deletes of existing quotas, products, orders, or billing records.
BEGIN;

CREATE TABLE IF NOT EXISTS public.delivery_address_lookup_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_address_lookup_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_address_lookup_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.delivery_address_lookup_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_address_lookup_attempts_id_seq TO service_role;
CREATE INDEX IF NOT EXISTS delivery_address_lookup_attempts_created_idx
  ON public.delivery_address_lookup_attempts (created_at);
CREATE INDEX IF NOT EXISTS delivery_address_lookup_attempts_client_idx
  ON public.delivery_address_lookup_attempts (client_hash, created_at);
COMMENT ON TABLE public.delivery_address_lookup_attempts IS
  'Separate server-only ORS autocomplete/GPS quota; no raw IP or customer addresses stored.';

CREATE OR REPLACE FUNCTION public.claim_delivery_lookup_attempt(_client_hash text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _hour timestamptz := now() - interval '1 hour';
  _day timestamptz := now() - interval '24 hours';
BEGIN
  IF _client_hash IS NULL OR _client_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN 'client';
  END IF;
  -- Single short advisory lock makes quota check + increment atomic.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('s7ven-address-lookup-budget-v1'));
  DELETE FROM public.delivery_address_lookup_attempts WHERE created_at < now() - interval '2 days';
  -- Under public ORS geocoding allowances: failures consume budget too.
  IF (SELECT count(*) FROM public.delivery_address_lookup_attempts WHERE created_at >= _day) >= 1200 THEN
    RETURN 'day-global';
  END IF;
  IF (SELECT count(*) FROM public.delivery_address_lookup_attempts WHERE created_at >= _hour) >= 300 THEN
    RETURN 'hour-global';
  END IF;
  IF (SELECT count(*) FROM public.delivery_address_lookup_attempts
      WHERE client_hash = _client_hash AND created_at >= _day) >= 180 THEN
    RETURN 'day-client';
  END IF;
  IF (SELECT count(*) FROM public.delivery_address_lookup_attempts
      WHERE client_hash = _client_hash AND created_at >= _hour) >= 60 THEN
    RETURN 'hour-client';
  END IF;
  INSERT INTO public.delivery_address_lookup_attempts (client_hash) VALUES (_client_hash);
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_delivery_lookup_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_delivery_lookup_attempt(text) TO service_role;
COMMIT;

-- Check after execution: should return true, and no rows yet.
SELECT
  to_regprocedure('public.claim_delivery_lookup_attempt(text)') IS NOT NULL AS funcao_instalada,
  (SELECT count(*) FROM public.delivery_address_lookup_attempts) AS buscas_novas,
  (SELECT count(*) FROM public.delivery_quote_attempts
   WHERE created_at >= now() - interval '1 hour') AS tentativas_antigas_na_ultima_hora;
