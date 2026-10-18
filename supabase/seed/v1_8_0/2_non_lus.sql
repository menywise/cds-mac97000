CREATE INDEX IF NOT EXISTS messages_unread_idx ON public.messages (conversation_id) WHERE read_at IS NULL;
