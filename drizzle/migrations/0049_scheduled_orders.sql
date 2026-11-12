ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS scheduled_notified_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_scheduled_pending_idx ON public.orders (scheduled_for) WHERE scheduled_for IS NOT NULL AND scheduled_notified_at IS NULL;