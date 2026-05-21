ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_payments;
ALTER TABLE public.pix_payments REPLICA IDENTITY FULL;