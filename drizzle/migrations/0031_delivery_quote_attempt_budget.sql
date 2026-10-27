CREATE TABLE public.delivery_quote_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.delivery_quote_attempts TO service_role;
ALTER TABLE public.delivery_quote_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX delivery_quote_attempts_created_idx ON public.delivery_quote_attempts (created_at);
CREATE INDEX delivery_quote_attempts_client_idx ON public.delivery_quote_attempts (client_hash, created_at);
COMMENT ON TABLE public.delivery_quote_attempts IS 'Paid Maps calculation attempts for public delivery quotes; server-only budget ledger.';

CREATE OR REPLACE FUNCTION public.claim_delivery_quote_attempt(_client_hash text, _global_limit integer, _client_limit integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - interval '1 hour';
BEGIN
  IF _client_hash IS NULL OR length(_client_hash) < 16 OR length(_client_hash) > 128 THEN
    RETURN 'client';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('delivery_quote_attempts'));
  DELETE FROM public.delivery_quote_attempts WHERE created_at < now() - interval '1 day';
  IF (SELECT count(*) FROM public.delivery_quote_attempts WHERE created_at >= since) >= _global_limit THEN
    RETURN 'global';
  END IF;
  IF (SELECT count(*) FROM public.delivery_quote_attempts WHERE client_hash = _client_hash AND created_at >= since) >= _client_limit THEN
    RETURN 'client';
  END IF;
  INSERT INTO public.delivery_quote_attempts (client_hash) VALUES (_client_hash);
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.claim_delivery_quote_attempt(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_delivery_quote_attempt(text, integer, integer) TO service_role;