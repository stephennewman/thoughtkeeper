ALTER TABLE public.entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;