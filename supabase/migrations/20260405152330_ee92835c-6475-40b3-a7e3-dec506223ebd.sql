
-- Update handle_new_user to store desired_role and set pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, status, desired_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'pending',
    NEW.raw_user_meta_data->>'desired_role'
  );
  RETURN NEW;
END;
$function$;

-- Allow Principal to insert user_roles (for approving users)
CREATE POLICY "Principal can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'principal'::app_role));

-- Allow Principal to update user_roles (for changing roles)
CREATE POLICY "Principal can update user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'principal'::app_role));

-- Allow Principal to update any profile status
CREATE POLICY "Principal can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR has_role(auth.uid(), 'principal'::app_role));

-- Drop existing restrictive update policy first
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
