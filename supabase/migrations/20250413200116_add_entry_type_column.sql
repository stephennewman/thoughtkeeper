ALTER TABLE public.entries
ADD COLUMN entry_type TEXT CHECK (entry_type IN ('voice', 'text'));

-- Optional: Set a default value for existing rows if desired
-- UPDATE public.entries
-- SET entry_type = 'text'
-- WHERE entry_type IS NULL;