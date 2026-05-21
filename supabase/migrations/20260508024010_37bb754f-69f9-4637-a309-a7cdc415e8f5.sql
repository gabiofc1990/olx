ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE POLICY "Public update read receipts on visitor messages"
ON public.chat_messages FOR UPDATE TO anon, authenticated
USING (sender = 'visitor') WITH CHECK (sender = 'visitor');

CREATE POLICY "Public update read receipts on seller messages"
ON public.chat_messages FOR UPDATE TO anon, authenticated
USING (sender = 'seller') WITH CHECK (sender = 'seller');

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quick replies"
ON public.quick_replies FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));