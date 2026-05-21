
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-audio', 'chat-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read chat-audio" ON storage.objects FOR SELECT USING (bucket_id = 'chat-audio');
CREATE POLICY "Public upload chat-audio" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'chat-audio');
