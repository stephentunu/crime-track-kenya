
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'investigator', 'officer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Stations
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  county TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads stations" ON public.stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage stations" ON public.stations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  badge_number TEXT,
  rank TEXT,
  phone TEXT,
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "user inserts own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Offenders
CREATE TABLE public.offenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  alias TEXT,
  date_of_birth DATE,
  gender TEXT,
  national_id TEXT,
  address TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offenders TO authenticated;
GRANT ALL ON public.offenders TO service_role;
ALTER TABLE public.offenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads offenders" ON public.offenders FOR SELECT TO authenticated USING (true);
CREATE POLICY "any authenticated inserts offenders" ON public.offenders FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator or admin updates offenders" ON public.offenders FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes offenders" ON public.offenders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- OB Entries
CREATE SEQUENCE IF NOT EXISTS public.ob_number_seq START 1000;
CREATE TABLE public.ob_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ob_number TEXT NOT NULL UNIQUE DEFAULT ('OB-' || lpad(nextval('public.ob_number_seq')::text, 6, '0')),
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reporter_name TEXT,
  reporter_contact TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ob_entries TO authenticated;
GRANT ALL ON public.ob_entries TO service_role;
ALTER TABLE public.ob_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads ob" ON public.ob_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "any authenticated inserts ob" ON public.ob_entries FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "recorder or admin updates ob" ON public.ob_entries FOR UPDATE TO authenticated
  USING (recorded_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'investigator'))
  WITH CHECK (true);
CREATE POLICY "admin deletes ob" ON public.ob_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Cases
CREATE SEQUENCE IF NOT EXISTS public.case_number_seq START 100;
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE DEFAULT ('CASE-' || lpad(nextval('public.case_number_seq')::text, 5, '0')),
  ob_entry_id UUID REFERENCES public.ob_entries(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads cases" ON public.cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "any authenticated inserts cases" ON public.cases FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "assignee creator or admin updates cases" ON public.cases FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (true);
CREATE POLICY "admin deletes cases" ON public.cases FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Case updates
CREATE TABLE public.case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.case_updates TO authenticated;
GRANT ALL ON public.case_updates TO service_role;
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads case updates" ON public.case_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "any authenticated adds case updates" ON public.case_updates FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "author or admin deletes case updates" ON public.case_updates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Case <-> Offender link
CREATE TABLE public.case_offenders (
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  offender_id UUID NOT NULL REFERENCES public.offenders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, offender_id)
);
GRANT SELECT, INSERT, DELETE ON public.case_offenders TO authenticated;
GRANT ALL ON public.case_offenders TO service_role;
ALTER TABLE public.case_offenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "any authenticated reads case offenders" ON public.case_offenders FOR SELECT TO authenticated USING (true);
CREATE POLICY "any authenticated links case offenders" ON public.case_offenders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "any authenticated unlinks case offenders" ON public.case_offenders FOR DELETE TO authenticated USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_offenders_touch BEFORE UPDATE ON public.offenders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ob_touch BEFORE UPDATE ON public.ob_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cases_touch BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile + officer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, badge_number, rank, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'badge_number',
    NEW.raw_user_meta_data->>'rank',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'officer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed a few stations
INSERT INTO public.stations (name, county, address) VALUES
  ('Central Police Station', 'Nairobi', 'University Way, Nairobi CBD'),
  ('Kilimani Police Station', 'Nairobi', 'Kilimani Road, Nairobi'),
  ('Mombasa Central', 'Mombasa', 'Nyerere Avenue, Mombasa'),
  ('Kisumu Central', 'Kisumu', 'Oginga Odinga Street, Kisumu');
