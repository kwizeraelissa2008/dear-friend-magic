-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('dod', 'dos', 'principal', 'teacher', 'discipline_staff');

-- Create enum for incident severity
CREATE TYPE public.incident_severity AS ENUM ('minor', 'moderate', 'serious', 'severe', 'critical');

-- Create enum for permission status
CREATE TYPE public.permission_status AS ENUM ('active', 'expired');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  grade_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  date_of_birth DATE NOT NULL,
  photo_url TEXT,
  total_marks INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  description TEXT NOT NULL,
  severity incident_severity NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  marks_deducted INTEGER DEFAULT 0,
  deduction_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status permission_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  banner_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- RLS Policies for classes
CREATE POLICY "All authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "DOS can insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dos'));
CREATE POLICY "DOS can update classes" ON public.classes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dos'));
CREATE POLICY "DOS can delete classes" ON public.classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dos'));

-- RLS Policies for students
CREATE POLICY "All authenticated users can view students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "DOS can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dos'));
CREATE POLICY "DOS and DOD can update students" ON public.students FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['dos', 'dod']::app_role[]));
CREATE POLICY "DOS can delete students" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dos'));

-- RLS Policies for incidents
CREATE POLICY "All authenticated users can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and discipline staff can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['teacher', 'discipline_staff']::app_role[]));
CREATE POLICY "DOD can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dod'));

-- RLS Policies for permissions
CREATE POLICY "All authenticated users can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "DOD can create permissions" ON public.permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'dod'));
CREATE POLICY "DOD can update permissions" ON public.permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'dod'));
CREATE POLICY "DOD can delete permissions" ON public.permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'dod'));

-- RLS Policies for events
CREATE POLICY "All authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Principal can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'principal'));
CREATE POLICY "Principal can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'principal'));
CREATE POLICY "Principal can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'principal'));

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to expire permissions automatically
CREATE OR REPLACE FUNCTION public.expire_permissions()
RETURNS void
LANGUAGE SQL
AS $$
  UPDATE public.permissions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
$$;