-- Phones/computers of store admins that receive new-order push notifications.
CREATE TABLE public.admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.admin_push_subscriptions TO authenticated;
GRANT ALL ON public.admin_push_subscriptions TO service_role;
ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_push_read_own ON public.admin_push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY admin_push_delete_own ON public.admin_push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX admin_push_subscriptions_user_idx ON public.admin_push_subscriptions (user_id);