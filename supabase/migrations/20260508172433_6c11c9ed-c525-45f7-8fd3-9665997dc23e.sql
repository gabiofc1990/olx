DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.listings WHERE id = 'cecefd45-78f9-4d52-9014-db1f1a77ff8a') THEN
    DELETE FROM public.listing_images WHERE listing_id = 'cecefd45-78f9-4d52-9014-db1f1a77ff8a';
    INSERT INTO public.listing_images (listing_id, url, display_order) VALUES
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=1200&auto=format&fit=crop', 0),
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1633053699034-459674171bbe?q=80&w=1200&auto=format&fit=crop', 1),
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1634403665481-74029226cfa1?q=80&w=1200&auto=format&fit=crop', 2),
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1695048133142-1a20484bce71?q=80&w=1200&auto=format&fit=crop', 3),
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1696446702183-be9605244600?q=80&w=1200&auto=format&fit=crop', 4),
    ('cecefd45-78f9-4d52-9014-db1f1a77ff8a', 'https://images.unsplash.com/photo-1696446700082-eecbef62c2c1?q=80&w=1200&auto=format&fit=crop', 5);
  END IF;
END $$;