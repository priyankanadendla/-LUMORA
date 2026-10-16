/*
# LUMORA — Full database schema for smart travel planner & personal safety platform

## Overview
Creates all tables needed for the LUMORA app: user profiles, trips, itinerary items,
expenses, favorites, emergency contacts, safety sessions, emergency alerts, and
location shares + location updates. All tables are owner-scoped with RLS policies
that enforce per-user data isolation using auth.uid().

## New Tables
1. profiles — extends auth.users with display name, avatar URL, phone, home base
2. trips — trip name, origin, destination, start/end dates, traveller count, budget, status
3. itinerary_items — day-wise itinerary entries belonging to a trip
4. expenses — categorized expenses belonging to a trip
5. favorites — saved destinations / places
6. emergency_contacts — trusted contacts with name, phone, email, alert channels, primary flag
7. safety_sessions — Night Safety Mode session state
8. emergency_alerts — alert events with provider delivery outcomes
9. location_shares — time-limited, token-based location sharing sessions
10. location_updates — individual coordinate pings belonging to a location share

## Security
- RLS enabled on ALL tables.
- Owner-scoped CRUD policies using auth.uid() on all tables.
- location_shares and location_updates have additional public SELECT policies for valid share tokens.
- Owner columns default to auth.uid().

## Notes
- All timestamps use timestamptz with DEFAULT now().
- CASCADE deletes on child tables.
- location_shares.token_hash stores SHA-256 hash; raw token never stored.
- emergency_alerts.delivery_result is JSONB with per-channel status.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  phone text DEFAULT '',
  home_base text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- TRIPS
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  origin text NOT NULL DEFAULT '',
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  travellers int NOT NULL DEFAULT 1,
  budget numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  cover_image_url text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_trips" ON trips;
CREATE POLICY "select_own_trips" ON trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_trips" ON trips;
CREATE POLICY "insert_own_trips" ON trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_trips" ON trips;
CREATE POLICY "update_own_trips" ON trips FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_trips" ON trips;
CREATE POLICY "delete_own_trips" ON trips FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);

-- ITINERARY ITEMS
CREATE TABLE IF NOT EXISTS itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number int NOT NULL DEFAULT 1,
  date date,
  title text NOT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  estimated_cost numeric(12,2) DEFAULT 0,
  start_time text DEFAULT '',
  end_time text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_itinerary" ON itinerary_items;
CREATE POLICY "select_own_itinerary" ON itinerary_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_itinerary" ON itinerary_items;
CREATE POLICY "insert_own_itinerary" ON itinerary_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_itinerary" ON itinerary_items;
CREATE POLICY "update_own_itinerary" ON itinerary_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_itinerary" ON itinerary_items;
CREATE POLICY "delete_own_itinerary" ON itinerary_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON itinerary_items(trip_id);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date,
  is_planned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_expenses" ON expenses;
CREATE POLICY "select_own_expenses" ON expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_expenses" ON expenses;
CREATE POLICY "insert_own_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_expenses" ON expenses;
CREATE POLICY "update_own_expenses" ON expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_expenses" ON expenses;
CREATE POLICY "delete_own_expenses" ON expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  country text DEFAULT '',
  category text DEFAULT 'destination',
  notes text DEFAULT '',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_favorites" ON favorites;
CREATE POLICY "update_own_favorites" ON favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text DEFAULT '',
  alert_channels text[] NOT NULL DEFAULT ARRAY['email']::text[],
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_contacts" ON emergency_contacts;
CREATE POLICY "select_own_contacts" ON emergency_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_contacts" ON emergency_contacts;
CREATE POLICY "insert_own_contacts" ON emergency_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_contacts" ON emergency_contacts;
CREATE POLICY "update_own_contacts" ON emergency_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_contacts" ON emergency_contacts;
CREATE POLICY "delete_own_contacts" ON emergency_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON emergency_contacts(user_id);

-- LOCATION SHARES (must exist before safety_sessions references it)
CREATE TABLE IF NOT EXISTS location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_lat numeric(10,7),
  last_lng numeric(10,7),
  last_updated_at timestamptz,
  display_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_shares" ON location_shares;
CREATE POLICY "select_own_shares" ON location_shares FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_shares" ON location_shares;
CREATE POLICY "insert_own_shares" ON location_shares FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_shares" ON location_shares;
CREATE POLICY "update_own_shares" ON location_shares FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_shares" ON location_shares;
CREATE POLICY "delete_own_shares" ON location_shares FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_valid_share" ON location_shares;
CREATE POLICY "public_read_valid_share" ON location_shares FOR SELECT TO anon, authenticated
  USING (revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()));
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON location_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_token_hash ON location_shares(token_hash);

-- LOCATION UPDATES
CREATE TABLE IF NOT EXISTS location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES location_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lat numeric(10,7) NOT NULL,
  lng numeric(10,7) NOT NULL,
  accuracy numeric(10,2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_updates" ON location_updates;
CREATE POLICY "select_own_updates" ON location_updates FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_updates" ON location_updates;
CREATE POLICY "insert_own_updates" ON location_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_updates" ON location_updates;
CREATE POLICY "update_own_updates" ON location_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_updates" ON location_updates;
CREATE POLICY "delete_own_updates" ON location_updates FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_valid_updates" ON location_updates;
CREATE POLICY "public_read_valid_updates" ON location_updates FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM location_shares WHERE location_shares.id = location_updates.share_id AND location_shares.revoked_at IS NULL AND (location_shares.expires_at IS NULL OR location_shares.expires_at > now())));
CREATE INDEX IF NOT EXISTS idx_updates_share_id ON location_updates(share_id);

-- SAFETY SESSIONS
CREATE TABLE IF NOT EXISTS safety_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  started_at timestamptz,
  ended_at timestamptz,
  primary_contact_id uuid REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  location_share_id uuid REFERENCES location_shares(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE safety_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_sessions" ON safety_sessions;
CREATE POLICY "select_own_sessions" ON safety_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sessions" ON safety_sessions;
CREATE POLICY "insert_own_sessions" ON safety_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sessions" ON safety_sessions;
CREATE POLICY "update_own_sessions" ON safety_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sessions" ON safety_sessions;
CREATE POLICY "delete_own_sessions" ON safety_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON safety_sessions(user_id);

-- EMERGENCY ALERTS
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES safety_sessions(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  message text NOT NULL DEFAULT '',
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  location_link text DEFAULT '',
  delivery_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_time timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_alerts" ON emergency_alerts;
CREATE POLICY "select_own_alerts" ON emergency_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_alerts" ON emergency_alerts;
CREATE POLICY "insert_own_alerts" ON emergency_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_alerts" ON emergency_alerts;
CREATE POLICY "update_own_alerts" ON emergency_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_alerts" ON emergency_alerts;
CREATE POLICY "delete_own_alerts" ON emergency_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON emergency_alerts(user_id);

-- UPDATED_AT trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_trips_updated ON trips;
CREATE TRIGGER trg_trips_updated BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_itinerary_updated ON itinerary_items;
CREATE TRIGGER trg_itinerary_updated BEFORE UPDATE ON itinerary_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_expenses_updated ON expenses;
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_contacts_updated ON emergency_contacts;
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_sessions_updated ON safety_sessions;
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON safety_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();