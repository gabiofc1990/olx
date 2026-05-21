ALTER TABLE public.listings REPLICA IDENTITY FULL;
ALTER TABLE public.captured_leads REPLICA IDENTITY FULL;
ALTER TABLE public.listing_images REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captured_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_images;