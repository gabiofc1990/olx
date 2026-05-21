
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  listing_id UUID,
  visitor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_sessions_visitor ON public.chat_sessions(visitor_id);
CREATE INDEX idx_chat_sessions_last ON public.chat_sessions(last_message_at DESC);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('visitor','seller')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can create/read/update (so visitors can manage their session); admins full access
CREATE POLICY "Public insert chat sessions" ON public.chat_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public read chat sessions" ON public.chat_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public update chat sessions" ON public.chat_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins delete chat sessions" ON public.chat_sessions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages: anyone can insert as 'visitor'; admins insert as 'seller'; everyone can read
CREATE POLICY "Public insert visitor messages" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (sender = 'visitor');
CREATE POLICY "Admin insert seller messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender = 'seller' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public read chat messages" ON public.chat_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins delete chat messages" ON public.chat_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
