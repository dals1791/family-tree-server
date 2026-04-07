-- Supabase setup SQL
-- Run this in the Supabase SQL editor after connecting to your project.

-- Auto-create a Profile row when a new auth user signs up.
-- This keeps Postgres referential integrity intact without manual Profile creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."Profile" (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
