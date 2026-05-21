ALTER TABLE public.listings
  DROP COLUMN IF EXISTS coupon_code,
  DROP COLUMN IF EXISTS coupon_label;