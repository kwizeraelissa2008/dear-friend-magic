
-- Add status and desired_role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS desired_role text;

-- Create conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL DEFAULT 'group',
  name text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create conversation_members table
CREATE TABLE public.conversation_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS for conversations: users can see conversations they belong to
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Conversation creators can update"
ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- RLS for conversation_members
CREATE POLICY "Users can view members of their conversations"
ON public.conversation_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can add members"
ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can remove themselves"
ON public.conversation_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- RLS for messages
CREATE POLICY "Users can read messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages as themselves"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create default group conversations
INSERT INTO public.conversations (id, type, name, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'group', 'All Staff', null),
  ('00000000-0000-0000-0000-000000000002', 'group', 'Teachers', null),
  ('00000000-0000-0000-0000-000000000003', 'group', 'Discipline Team', null);

-- Update existing profiles to 'approved' (existing users are already approved)
UPDATE public.profiles SET status = 'approved' WHERE status = 'approved';
