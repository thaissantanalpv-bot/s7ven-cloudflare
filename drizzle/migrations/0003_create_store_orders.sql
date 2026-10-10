CREATE TABLE public.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 customer_name text NOT NULL,
 customer_phone text NOT NULL,
 address text NOT NULL,
 payment text NOT NULL,
 change_for text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 items jsonb NOT NULL,
 subtotal numeric(12,2) NOT NULL CHECK(subtotal >= 0),
 delivery_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK(delivery_fee >= 0),
 delivery_zone text NOT NULL DEFAULT '',
 delivery_confirmed boolean NOT NULL DEFAULT false,
 total numeric(12,2) NOT NULL CHECK(total >= 0),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','preparing','out_for_delivery','delivered')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_number_seq TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read_orders ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_update_orders ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX orders_status_created ON public.orders(status,created_at DESC);
COMMENT ON TABLE public.orders IS 'Private customer orders: public submission only through validated application server function; admin-only read and update.';