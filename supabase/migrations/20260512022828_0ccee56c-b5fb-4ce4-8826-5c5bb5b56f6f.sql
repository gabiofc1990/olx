ALTER TABLE public.pix_payments
  ADD COLUMN IF NOT EXISTS gateway_provider text,
  ADD COLUMN IF NOT EXISTS gateway_id uuid;