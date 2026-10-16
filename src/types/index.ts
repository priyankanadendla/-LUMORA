export type Trip = {
  id: string;
  user_id: string;
  name: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  travellers: number;
  budget: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  cover_image_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ItineraryItem = {
  id: string;
  trip_id: string;
  user_id: string;
  day_number: number;
  date: string | null;
  title: string;
  description: string;
  location: string;
  estimated_cost: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  trip_id: string;
  user_id: string;
  category: 'transport' | 'accommodation' | 'food' | 'activities' | 'other';
  description: string;
  amount: number;
  expense_date: string | null;
  is_planned: boolean;
  created_at: string;
  updated_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  country: string;
  category: string;
  notes: string;
  image_url: string;
  created_at: string;
};

export type EmergencyContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  alert_channels: ('sms' | 'email')[];
  is_primary: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type SafetySession = {
  id: string;
  user_id: string;
  status: 'active' | 'inactive';
  started_at: string | null;
  ended_at: string | null;
  primary_contact_id: string | null;
  location_share_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EmergencyAlert = {
  id: string;
  user_id: string;
  session_id: string | null;
  contact_id: string | null;
  status: 'pending' | 'sent' | 'partially_sent' | 'failed';
  message: string;
  location_lat: number | null;
  location_lng: number | null;
  location_link: string;
  delivery_result: Record<string, { status: 'sent' | 'failed'; error?: string }>;
  alert_time: string;
  created_at: string;
};

export type LocationShare = {
  id: string;
  user_id: string;
  token_hash: string;
  status: 'active' | 'expired' | 'revoked';
  started_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_updated_at: string | null;
  display_name: string;
  created_at: string;
};

export type LocationUpdate = {
  id: string;
  share_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string;
  phone: string;
  home_base: string;
  created_at: string;
  updated_at: string;
};
