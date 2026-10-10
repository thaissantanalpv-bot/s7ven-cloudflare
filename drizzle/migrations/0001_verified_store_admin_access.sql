CREATE TABLE public.admin_invites (email text PRIMARY KEY);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.grant_verified_store_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.email_confirmed_at IS NOT NULL AND EXISTS(SELECT 1 FROM public.admin_invites WHERE email=lower(NEW.email)) THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT(user_id,role) DO NOTHING; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.grant_verified_store_admin() FROM PUBLIC;
CREATE TRIGGER verified_store_admin AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_verified_store_admin();