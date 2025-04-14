-- Assign existing entries with NULL user_id to a specific user

-- Declare a variable to hold the target user's ID
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user_id for the specified email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'stephen@krezzo.com';

    -- Check if the user was found
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email stephen@krezzo.com not found in auth.users';
    ELSE
        -- Update the entries table
        UPDATE public.entries
        SET user_id = target_user_id
        WHERE user_id IS NULL;

        RAISE NOTICE 'Updated entries with NULL user_id to belong to user %', target_user_id;
    END IF;
END $$;