import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { formatCurrency, formatDate, tripStatusColor } from '@/lib/utils';
import type { Trip, Favorite, SafetySession } from '@/types';
import { Luggage, Heart, Wallet, Shield, Plus, MapPin, TrendingUp, Clock, type LucideIcon } from 'lucide-react';

export function DashboardPage() {
  const { profile, user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [activeSession, setActiveSession] = useState<SafetySession | null>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tripsRes, favRes, sessionRes, expensesRes] = await Promise.all([
        supabase.from('trips').select('*').order('start_date', { ascending: false }),
        supabase.from('favorites').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('safety_sessions').select('*').eq('status', 'active').maybeSingle(),
        supabase.from('expenses').select('amount, is_planned').eq('is_planned', false),
      ]);

      setTrips((tripsRes.data as Trip[]) || []);
      setFavorites((favRes.data as Favorite[]) || []);
      setActiveSession((sessionRes.data as SafetySession) || null);

      if (expensesRes.data) {
        const spent = expensesRes.data.reduce((sum, e) => sum + Number(e.amount), 0);
        setTotalSpent(spent);
      }

      if (tripsRes.data) {
        const budget = (tripsRes.data as Trip[]).reduce((sum, t) => sum + Number(t.budget), 0);
        setTotalBudget(budget);
      }

      setLoading(false);
    })();
  }, [user]);

  const now = new Date();
  const upcoming = trips.filter((t) => new Date(t.start_date) >= now && t.status !== 'cancelled');
  const past = trips.filter((t) => new Date(t.end_date) < now).slice(0, 3);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const displayName = profile?.display_name || 'Traveler';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-teal-900 to-slate-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {displayName}</h1>
            <p className="mt-1 text-sm text-slate-300">Here's your travel overview at a glance.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/trips')} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
              <Plus size={16} className="mr-1.5 inline" /> New Trip
            </button>
            <button onClick={() => navigate('/safety')} className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-400">
              <Shield size={16} className="mr-1.5 inline" /> Night Safety
            </button>
          </div>
        </div>

        {activeSession && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-500/20 px-4 py-2.5 text-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />
            <span>Live safety session active — your location is being shared.</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Luggage} label="Total Trips" value={String(trips.length)} color="teal" />
        <StatCard icon={Wallet} label="Planned Budget" value={formatCurrency(totalBudget)} color="amber" />
        <StatCard icon={TrendingUp} label="Total Spent" value={formatCurrency(totalSpent)} color="rose" />
        <StatCard icon={Heart} label="Saved Places" value={String(favorites.length)} color="blue" />
      </div>

      {/* Upcoming Trips */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Trips</h2>
          <button onClick={() => navigate('/trips')} className="text-sm font-medium text-teal-600 hover:text-teal-700">View all →</button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={Luggage}
            title="No upcoming trips"
            description="Start planning your next adventure — create a trip with dates, budget, and itinerary."
            action={<button onClick={() => navigate('/trips')} className="btn-primary">Create a Trip</button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.slice(0, 4).map((trip) => (
              <button
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="card group p-5 text-left transition-all hover:shadow-md hover:border-teal-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">{trip.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin size={14} /> {trip.destination}
                    </p>
                  </div>
                  <span className={`badge ${tripStatusColor(trip.status)}`}>{trip.status}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock size={13} /> {formatDate(trip.start_date)} — {formatDate(trip.end_date)}</span>
                  <span>{trip.travellers} traveller{trip.travellers > 1 ? 's' : ''}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Budget: {formatCurrency(trip.budget)}</span>
                  <span className="text-xs text-teal-600 group-hover:font-medium">View details →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Two column: Past trips + Favorites */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Past Trips</h2>
          {past.length === 0 ? (
            <Card><p className="py-4 text-center text-sm text-slate-400">No completed trips yet.</p></Card>
          ) : (
            <div className="space-y-2">
              {past.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="card flex w-full items-center justify-between p-4 text-left transition-all hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{trip.name}</p>
                    <p className="text-sm text-slate-400">{trip.destination} · {formatDate(trip.end_date)}</p>
                  </div>
                  <span className={`badge ${tripStatusColor(trip.status)}`}>{trip.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Saved Places</h2>
          {favorites.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No saved places"
              description="Save destinations you want to visit from the Explore page."
              action={<button onClick={() => navigate('/explore')} className="btn-secondary">Explore Destinations</button>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((fav) => (
                <div key={fav.id} className="card overflow-hidden">
                  {fav.image_url && (
                    <img src={fav.image_url} alt={fav.name} className="h-24 w-full object-cover" />
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-slate-800">{fav.name}</p>
                    <p className="truncate text-xs text-slate-400">{fav.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Status */}
      <Card className="border-teal-200 bg-teal-50/50">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
            <Shield size={24} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Safety Status</h3>
            <p className="text-sm text-slate-500">
              {activeSession
                ? 'Night Safety Mode is active. Your trusted contact can see your location.'
                : 'Night Safety Mode is off. Activate it before heading out for real-time safety sharing.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/safety')}
            className={activeSession ? 'btn-secondary' : 'btn-primary'}
          >
            {activeSession ? 'Manage' : 'Activate'}
          </button>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: 'teal' | 'amber' | 'rose' | 'blue';
}) {
  const colorMap = {
    teal: 'bg-teal-100 text-teal-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
  };
  return (
    <Card className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  );
}
