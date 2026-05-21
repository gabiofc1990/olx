
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read chat-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can upload chat-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media');
