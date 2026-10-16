import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { EmptyState, Spinner, Modal, ErrorBanner, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate, tripStatusColor, daysBetween } from '@/lib/utils';
import type { Trip } from '@/types';
import { Luggage, Plus, MapPin, Calendar, Users, Wallet, Search, Trash2, Pencil } from 'lucide-react';

const STATUS_OPTIONS = ['planned', 'ongoing', 'completed', 'cancelled'] as const;

export function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteTrip, setDeleteTrip] = useState<Trip | null>(null);

  async function loadTrips() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('trips').select('*').order('start_date', { ascending: false });
    setTrips((data as Trip[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrips();
  }, [user]);

  const filtered = trips.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase()) ||
      t.origin.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete() {
    if (!deleteTrip) return;
    await supabase.from('trips').delete().eq('id', deleteTrip.id);
    setTrips((prev) => prev.filter((t) => t.id !== deleteTrip.id));
    setDeleteTrip(null);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Trips</h1>
          <p className="mt-1 text-sm text-slate-500">Plan, manage, and revisit your travel adventures.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} /> New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search trips by name, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Trip Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Luggage}
          title={search || statusFilter !== 'all' ? "No trips match your filters" : "No trips yet"}
          description={search || statusFilter !== 'all' ? "Try adjusting your search or filter." : "Create your first trip to start planning itineraries, budget, and activities."}
          action={!search && statusFilter === 'all' ? <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Trip</button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trip) => (
            <div key={trip.id} className="card group overflow-hidden transition-all hover:shadow-md">
              {trip.cover_image_url ? (
                <img src={trip.cover_image_url} alt={trip.name} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
                  <MapPin size={32} className="text-white/70" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{trip.name}</h3>
                  <span className={`badge ${tripStatusColor(trip.status)}`}>{trip.status}</span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin size={13} /> {trip.origin || '—'} → {trip.destination}
                </p>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(trip.start_date)} — {formatDate(trip.end_date)} · {daysBetween(trip.start_date, trip.end_date)} days</p>
                  <p className="flex items-center gap-1.5"><Users size={12} /> {trip.travellers} traveller{trip.travellers > 1 ? 's' : ''}</p>
                  <p className="flex items-center gap-1.5"><Wallet size={12} /> Budget: {formatCurrency(trip.budget)}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => navigate(`/trips/${trip.id}`)} className="btn-primary flex-1 text-xs">View Details</button>
                  <button onClick={() => setEditingTrip(trip)} className="btn-secondary px-3"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTrip(trip)} className="btn-secondary px-3 text-red-600 hover:border-red-200 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <TripFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadTrips(); }} />}
      {editingTrip && <TripFormModal trip={editingTrip} onClose={() => setEditingTrip(null)} onSaved={() => { setEditingTrip(null); loadTrips(); }} />}
      <ConfirmDialog
        open={!!deleteTrip}
        onClose={() => setDeleteTrip(null)}
        onConfirm={handleDelete}
        title="Delete Trip"
        message={`Are you sure you want to delete "${deleteTrip?.name}"? This will also remove all itinerary items and expenses for this trip.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function TripFormModal({ trip, onClose, onSaved }: { trip?: Trip; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: trip?.name || '',
    origin: trip?.origin || '',
    destination: trip?.destination || '',
    start_date: trip?.start_date || '',
    end_date: trip?.end_date || '',
    travellers: trip?.travellers || 1,
    budget: trip?.budget || 0,
    status: trip?.status || 'planned',
    notes: trip?.notes || '',
    cover_image_url: trip?.cover_image_url || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Trip name is required.');
    if (!form.destination.trim()) return setError('Destination is required.');
    if (!form.start_date || !form.end_date) return setError('Start and end dates are required.');
    if (new Date(form.end_date) < new Date(form.start_date)) return setError('End date must be after start date.');
    if (form.travellers < 1) return setError('At least 1 traveller is required.');

    setSaving(true);
    const payload = {
      ...form,
      budget: Number(form.budget),
      travellers: Number(form.travellers),
    };

    if (trip) {
      const { error: err } = await supabase.from('trips').update(payload).eq('id', trip.id);
      if (err) setError(err.message);
      else onSaved();
    } else {
      const { error: err } = await supabase.from('trips').insert({ ...payload, user_id: user?.id });
      if (err) setError(err.message);
      else onSaved();
    }
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={trip ? 'Edit Trip' : 'Create New Trip'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Trip Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer in Japan" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Starting From</label>
            <input className="input" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="New York" />
          </div>
          <div>
            <label className="label">Destination *</label>
            <input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Tokyo" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label">End Date *</label>
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Travellers *</label>
            <input type="number" min={1} className="input" value={form.travellers} onChange={(e) => setForm({ ...form, travellers: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Budget ($) *</label>
            <input type="number" min={0} step="0.01" className="input" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Trip['status'] })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Cover Image URL</label>
          <input className="input" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Trip notes, reminders, ideas..." />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            {trip ? 'Save Changes' : 'Create Trip'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
