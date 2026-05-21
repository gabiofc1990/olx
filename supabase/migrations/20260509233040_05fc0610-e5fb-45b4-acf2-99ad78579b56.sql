
CREATE TABLE public.pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE,
  external_id text,
  listing_id uuid,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  qrcode text NOT NULL,
  payer_name text,
  payer_document text,
  payer_email text,
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pix payments" ON public.pix_payments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage pix payments" ON public.pix_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_pix_payments_tx ON public.pix_payments(transaction_id);
