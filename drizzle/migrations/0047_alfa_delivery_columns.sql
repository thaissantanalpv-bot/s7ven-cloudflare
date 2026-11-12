ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS alfa_status text,
  ADD COLUMN IF NOT EXISTS alfa_delivery_id text,
  ADD COLUMN IF NOT EXISTS alfa_price numeric,
  ADD COLUMN IF NOT EXISTS alfa_message text,
  ADD COLUMN IF NOT EXISTS alfa_updated_at timestamptz;