ALTER TABLE public.orders ADD COLUMN rating_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE public.order_ratings (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_ratings TO authenticated;
GRANT ALL ON public.order_ratings TO service_role;

ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ratings" ON public.order_ratings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX order_ratings_created_at_idx ON public.order_ratings (created_at DESC);