-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  privacy_no_background_tracking BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create countries reference table
CREATE TABLE public.countries (
  iso2 TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  continent TEXT NOT NULL,
  flag_primary_color TEXT,
  silhouette_asset_url TEXT
);

-- Create places table (cities + POIs)
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('city', 'poi')),
  name TEXT NOT NULL,
  country_iso2 TEXT NOT NULL REFERENCES public.countries(iso2),
  lat NUMERIC,
  lng NUMERIC,
  external_place_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  inferred BOOLEAN DEFAULT false,
  source TEXT NOT NULL CHECK (source IN ('google', 'flight', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create visits table (heart of the system)
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  country_iso2 TEXT NOT NULL REFERENCES public.countries(iso2),
  place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
  arrival_date DATE NOT NULL,
  departure_date DATE,
  source TEXT NOT NULL CHECK (source IN ('google', 'flight', 'manual')),
  source_confidence TEXT CHECK (source_confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create country_notes table
CREATE TABLE public.country_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_iso2 TEXT NOT NULL REFERENCES public.countries(iso2),
  note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, country_iso2)
);

-- Create country_images table
CREATE TABLE public.country_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_iso2 TEXT NOT NULL REFERENCES public.countries(iso2),
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flights table
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flight_date DATE NOT NULL,
  from_airport TEXT NOT NULL,
  to_airport TEXT NOT NULL,
  from_country_iso2 TEXT REFERENCES public.countries(iso2),
  to_country_iso2 TEXT REFERENCES public.countries(iso2),
  airline TEXT,
  flight_number TEXT,
  source TEXT NOT NULL CHECK (source IN ('csv', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create share_links table
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  detail_level TEXT DEFAULT 'overview' CHECK (detail_level IN ('overview', 'detailed')),
  scope_map BOOLEAN DEFAULT true,
  scope_stats BOOLEAN DEFAULT true,
  scope_timeline BOOLEAN DEFAULT true,
  scope_badges BOOLEAN DEFAULT true,
  scope_notes BOOLEAN DEFAULT true,
  scope_images BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all user-scoped tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Trips policies
CREATE POLICY "Users can view their own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- Visits policies
CREATE POLICY "Users can view their own visits" ON public.visits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own visits" ON public.visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own visits" ON public.visits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own visits" ON public.visits
  FOR DELETE USING (auth.uid() = user_id);

-- Country notes policies
CREATE POLICY "Users can view their own notes" ON public.country_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON public.country_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.country_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.country_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Country images policies
CREATE POLICY "Users can view their own images" ON public.country_images
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own images" ON public.country_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own images" ON public.country_images
  FOR DELETE USING (auth.uid() = user_id);

-- Flights policies
CREATE POLICY "Users can view their own flights" ON public.flights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own flights" ON public.flights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own flights" ON public.flights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flights" ON public.flights
  FOR DELETE USING (auth.uid() = user_id);

-- Share links policies
CREATE POLICY "Users can view their own share links" ON public.share_links
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own share links" ON public.share_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own share links" ON public.share_links
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own share links" ON public.share_links
  FOR DELETE USING (auth.uid() = user_id);

-- Public read access for share links via token (for shared views)
CREATE POLICY "Anyone can view active share links by token" ON public.share_links
  FOR SELECT USING (active = true);

-- Countries table is public reference data
-- No RLS needed, but we enable it and allow public read
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read countries" ON public.countries
  FOR SELECT USING (true);

-- Places are public reference data
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read places" ON public.places
  FOR SELECT USING (true);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_country_notes_updated_at BEFORE UPDATE ON public.country_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();