
-- Restringe execute da função has_role
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Substitui policy de leads para limitar role
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.captured_leads;
CREATE POLICY "Anon and auth insert leads" ON public.captured_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Bucket: restringir LIST (mantém leitura individual do arquivo via URL pública)
DROP POLICY IF EXISTS "Public read listing-images" ON storage.objects;
CREATE POLICY "Public read listing-images files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-images');
