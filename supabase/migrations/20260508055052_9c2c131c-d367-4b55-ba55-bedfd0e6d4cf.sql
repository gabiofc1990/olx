
-- Limpa carrosséis antigos (mantém o main)
DELETE FROM public.listings WHERE carousel_section IN ('tambem','mais') AND is_main = false;

-- Insere os 6 novos anúncios
INSERT INTO public.listings (slug, title, description, price_cents, installment_label, condition, storage_capacity, color, location_text, seller_name, seller_since, seller_sales, posted_at, is_main, carousel_section, display_order, published) VALUES
('iphone-13-128-itauna', 'iPhone 13 128GB Branco - Seminovo',
 E'iPhone 13 em ótimo estado, sem nenhum arranhão ou qualquer detalhe! ✅\nO melhor preço da cidade 💰\n- Armazenamento de 128GB 💽\n- Acompanha película de brinde! 🎁\niPhone 13 128GB em perfeita condição.',
 169000, '10x sem juros de R$ 169,00', 'Usado — seminovo', '128GB', 'Branco', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado em Itaúna, MG', false, 'tambem', 1, true),

('iphone-14-pro-max-128-roxo-itauna', 'iPhone 14 Pro Max 128GB Roxo',
 E'Telefone muito bom\n128GB\nBateria 95%\nTodo ORIGINAL\n6 meses de GARANTIA L\nIPHONE 14 PRO MAX 128GB',
 279900, '10x sem juros de R$ 279,90', 'Usado — seminovo', '128GB', 'Roxo', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado há uma semana em Itaúna, MG', false, 'tambem', 2, true),

('iphone-12-64-itauna', 'iPhone 12 64GB Branco',
 E'📲 iPhone 12\niPhone 12 - 64GB\nSaúde da bateria 75% Original\nFuncionando tudo!\niPhone 12 barato',
 115000, '10x sem juros de R$ 115,00', 'Usado — em boas condições', '64GB', 'Branco', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado há 5 dias em Itaúna, MG', false, 'tambem', 3, true),

('iphone-14-128-azul-itauna', 'iPhone 14 128GB Azul',
 E'Telefone muito NOVO\n128GB\nBateria 79%\nCondição: Usado — seminovo\nIPHONE 14 128GB',
 209900, '10x sem juros de R$ 209,90', 'Usado — seminovo', '128GB', 'Azul', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado há 2 semanas em Itaúna, MG', false, 'mais', 1, true),

('iphone-xs-max-itauna', 'iPhone XS Max - Bateria 100%',
 E'BARATO DEMAIS. iPhone ZERO sem arranhão. Bateria 100%. Funciona Face ID tudo ✅\nIMPECÁVEL ÚNICO DONO.',
 80000, '10x sem juros de R$ 80,00', 'Usado — seminovo', '64GB', 'Dourado', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado há 10 semanas em Itaúna, MG', false, 'mais', 2, true),

('iphone-15-pro-max-512-itauna', 'iPhone 15 Pro Max 512GB',
 E'iPhone 15 Pro Max\nCondição: Novo\n512GB\n91% Bateria',
 310000, '10x sem juros de R$ 310,00', 'Novo', '512GB', 'Titânio Natural', 'Itaúna - MG', 'Jonatan', 'Na OLX desde dezembro de 2022', 50, 'Anunciado há 3 dias em Itaúna, MG', false, 'mais', 3, true);

-- Insere as imagens
INSERT INTO public.listing_images (listing_id, url, display_order)
SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-13-128-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-13-128-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/3.png', 2 FROM public.listings WHERE slug='iphone-13-128-itauna'

UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip14pm-roxo-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-14-pro-max-128-roxo-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip14pm-roxo-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-14-pro-max-128-roxo-itauna'

UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip12-64-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-12-64-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip12-64-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-12-64-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip12-64-itauna/3.png', 2 FROM public.listings WHERE slug='iphone-12-64-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip12-64-itauna/4.png', 3 FROM public.listings WHERE slug='iphone-12-64-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip12-64-itauna/5.png', 4 FROM public.listings WHERE slug='iphone-12-64-itauna'

UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip14-128-azul-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-14-128-azul-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip14-128-azul-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-14-128-azul-itauna'

UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ipxsmax-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-xs-max-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ipxsmax-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-xs-max-itauna'

UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip15pm-512-itauna/1.png', 0 FROM public.listings WHERE slug='iphone-15-pro-max-512-itauna'
UNION ALL SELECT id, 'https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/ip15pm-512-itauna/2.png', 1 FROM public.listings WHERE slug='iphone-15-pro-max-512-itauna';
