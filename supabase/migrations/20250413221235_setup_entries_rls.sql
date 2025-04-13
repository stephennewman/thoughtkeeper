-- Enable SELECT access for users based on user_id
CREATE POLICY "Allow individual user SELECT access"
ON public.entries FOR SELECT
USING (auth.uid() = user_id);

-- Enable INSERT access for authenticated users
-- The user_id column in the insert payload MUST match the user's auth.uid()
-- Note: addEntryService already fetches and includes the correct user_id
CREATE POLICY "Allow individual user INSERT access"
ON public.entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable UPDATE access for users based on user_id
-- Users can only update their own entries
CREATE POLICY "Allow individual user UPDATE access"
ON public.entries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); -- Optional check, often good practice

-- Enable DELETE access for users based on user_id
-- Users can only delete their own entries
CREATE POLICY "Allow individual user DELETE access"
ON public.entries FOR DELETE
USING (auth.uid() = user_id);
