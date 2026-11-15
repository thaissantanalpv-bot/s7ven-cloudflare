GRANT INSERT, UPDATE ON public.admin_push_subscriptions TO authenticated;
CREATE POLICY admin_push_insert_own ON public.admin_push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_push_update_own ON public.admin_push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE OR REPLACE FUNCTION public.protect_push_subscription_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.endpoint IS DISTINCT FROM OLD.endpoint THEN
    RAISE EXCEPTION 'Push subscription owner and endpoint are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_push_subscription_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_push_subscription_owner BEFORE UPDATE ON public.admin_push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.protect_push_subscription_owner();