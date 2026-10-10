REVOKE ALL ON public.orders FROM anon;
REVOKE INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.orders FROM authenticated;
GRANT SELECT,UPDATE ON public.orders TO authenticated;
REVOKE ALL ON SEQUENCE public.orders_number_seq FROM anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.orders_number_seq TO service_role;