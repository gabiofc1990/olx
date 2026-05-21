CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment gateways"
ON public.payment_gateways
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX payment_gateways_only_one_active
ON public.payment_gateways ((is_active))
WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.payment_gateways_single_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.payment_gateways
       SET is_active = false, updated_at = now()
     WHERE id <> NEW.id AND is_active = true;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_gateways_single_active
BEFORE INSERT OR UPDATE ON public.payment_gateways
FOR EACH ROW
EXECUTE FUNCTION public.payment_gateways_single_active();

INSERT INTO public.payment_gateways (name, provider, credentials, enabled, is_active, notes) VALUES
  ('BSPay', 'bspay', '{}'::jsonb, true, true, 'Gateway principal atual. Campos: client_id, client_secret.'),
  ('PushinPay', 'pushinpay', '{}'::jsonb, true, false, 'Campo: token (Bearer).'),
  ('Asaas', 'asaas', '{}'::jsonb, true, false, 'Campos: api_key, sandbox (true/false).'),
  ('Mercado Pago', 'mercadopago', '{}'::jsonb, true, false, 'Campo: access_token.');