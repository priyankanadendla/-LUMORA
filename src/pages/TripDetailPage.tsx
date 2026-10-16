import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { Card, EmptyState, Spinner, Modal, ErrorBanner, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate, tripStatusColor, daysBetween } from '@/lib/utils';
import type { Trip, ItineraryItem, Expense } from '@/types';
import {
  ArrowLeft, MapPin, Calendar, Users, Wallet, Plus, Clock, Trash2,
  Pencil, ListChecks, DollarSign, ChevronRight,
} from 'lucide-react';

export function TripDetailPage({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ItineraryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses'>('itinerary');

  async function loadData() {
    if (!user) return;
    const [tripRes, itinRes, expRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
      supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('day_number', { ascending: true }).order('start_time', { ascending: true }),
      supabase.from('expenses').select('*').eq('trip_id', tripId).order('expense_date', { ascending: false }),
    ]);
    setTrip((tripRes.data as Trip) || null);
    setItinerary((itinRes.data as ItineraryItem[]) || []);
    setExpenses((expRes.data as Expense[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [user, tripId]);

  async function deleteItineraryItem() {
    if (!deleteItem) return;
    await supabase.from('itinerary_items').delete().eq('id', deleteItem.id);
    setItinerary((prev) => prev.filter((i) => i.id !== deleteItem.id));
    setDeleteItem(null);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon={MapPin}
          title="Trip not found"
          description="This trip may have been deleted or you don't have access to it."
          action={<button onClick={() => navigate('/trips')} className="btn-primary">Back to Trips</button>}
        />
      </div>
    );
  }

  const totalDays = daysBetween(trip.start_date, trip.end_date);
  const totalSpent = expenses.filter((e) => !e.is_planned).reduce((s, e) => s + Number(e.amount), 0);

  // Group itinerary by day
  const byDay: Record<number, ItineraryItem[]> = {};
  itinerary.forEach((item) => {
    if (!byDay[item.day_number]) byDay[item.day_number] = [];
    byDay[item.day_number].push(item);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={() => navigate('/trips')} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to Trips
      </button>

      {/* Trip Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {trip.cover_image_url ? (
          <img src={trip.cover_image_url} alt={trip.name} className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
            <MapPin size={40} className="text-white/60" />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-slate-500">
                <MapPin size={15} /> {trip.origin || '—'} → {trip.destination}
              </p>
            </div>
            <span className={`badge ${tripStatusColor(trip.status)}`}>{trip.status}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDate(trip.start_date)} — {formatDate(trip.end_date)}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {totalDays} days</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {trip.travellers} traveller{trip.travellers > 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><Wallet size={14} /> Budget: {formatCurrency(trip.budget)}</span>
          </div>
          {trip.notes && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{trip.notes}</p>
          )}
        </div>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-medium text-slate-400">Trip Budget</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(trip.budget)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-400">Spent</p>
          <p className="mt-1 text-xl font-bold text-rose-600">{formatCurrency(totalSpent)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-slate-400">Remaining</p>
          <p className={`mt-1 text-xl font-bold ${trip.budget - totalSpent >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {formatCurrency(trip.budget - totalSpent)}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('itinerary')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeTab === 'itinerary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <ListChecks size={15} className="mr-1.5 inline" /> Itinerary ({itinerary.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeTab === 'expenses' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <DollarSign size={15} className="mr-1.5 inline" /> Expenses ({expenses.length})
        </button>
      </div>

      {activeTab === 'itinerary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Day-wise Itinerary</h2>
            <button onClick={() => setShowItineraryForm(true)} className="btn-primary text-xs">
              <Plus size={16} /> Add Activity
            </button>
          </div>

          {itinerary.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No itinerary items yet"
              description="Add activities, sights, and plans for each day of your trip."
              action={<button onClick={() => setShowItineraryForm(true)} className="btn-primary">Add First Activity</button>}
            />
          ) : (
            <div className="space-y-4">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                <div key={day}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-xs font-bold text-teal-700">
                      D{day}
                    </div>
                    <span className="text-sm font-medium text-slate-600">
                      {formatDate(new Date(new Date(trip.start_date).getTime() + (day - 1) * 86400000).toISOString())}
                    </span>
                  </div>
                  {(byDay[day] || []).length === 0 ? (
                    <p className="ml-9 text-xs text-slate-400">No activities planned for this day.</p>
                  ) : (
                    <div className="ml-9 space-y-2">
                      {byDay[day].map((item) => (
                        <div key={item.id} className="card flex items-start justify-between p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {item.start_time && <span className="text-xs font-medium text-teal-600">{item.start_time}{item.end_time && ` – ${item.end_time}`}</span>}
                              <h4 className="text-sm font-medium text-slate-800">{item.title}</h4>
                            </div>
                            {item.location && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin size={11} /> {item.location}</p>}
                            {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                            {item.estimated_cost > 0 && <p className="mt-1 text-xs font-medium text-slate-500">Est. cost: {formatCurrency(item.estimated_cost)}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditingItem(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteItem(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Trip Expenses</h2>
            <button onClick={() => navigate('/budget')} className="btn-secondary text-xs">
              Manage in Budget <ChevronRight size={14} className="inline" />
            </button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses recorded"
              description="Track your spending in the Budget section to see it here."
              action={<button onClick={() => navigate('/budget')} className="btn-secondary">Go to Budget</button>}
            />
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="card flex items-center justify-between p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-slate-100 text-slate-600">{exp.category}</span>
                      {exp.is_planned && <span className="badge bg-blue-100 text-blue-600">planned</span>}
                      <p className="text-sm font-medium text-slate-800">{exp.description}</p>
                    </div>
                    {exp.expense_date && <p className="mt-0.5 text-xs text-slate-400">{formatDate(exp.expense_date)}</p>}
                  </div>
                  <span className={`text-sm font-bold ${exp.is_planned ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatCurrency(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showItineraryForm && (
        <ItineraryFormModal
          tripId={tripId}
          totalDays={totalDays}
          item={null}
          onClose={() => setShowItineraryForm(false)}
          onSaved={() => { setShowItineraryForm(false); loadData(); }}
        />
      )}
      {editingItem && (
        <ItineraryFormModal
          tripId={tripId}
          totalDays={totalDays}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); loadData(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={deleteItineraryItem}
        title="Delete Activity"
        message={`Remove "${deleteItem?.title}" from your itinerary?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ItineraryFormModal({
  tripId, totalDays, item, onClose, onSaved,
}: {
  tripId: string; totalDays: number; item: ItineraryItem | null; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    day_number: item?.day_number || 1,
    title: item?.title || '',
    description: item?.description || '',
    location: item?.location || '',
    estimated_cost: item?.estimated_cost || 0,
    start_time: item?.start_time || '',
    end_time: item?.end_time || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Activity title is required.');
    setSaving(true);

    const payload = { ...form, trip_id: tripId, estimated_cost: Number(form.estimated_cost) };

    if (item) {
      const { error: err } = await supabase.from('itinerary_items').update(payload).eq('id', item.id);
      if (err) setError(err.message); else onSaved();
    } else {
      const { error: err } = await supabase.from('itinerary_items').insert({ ...payload, user_id: user?.id });
      if (err) setError(err.message); else onSaved();
    }
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Activity' : 'Add Itinerary Activity'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Day *</label>
            <select className="input" value={form.day_number} onChange={(e) => setForm({ ...form, day_number: Number(e.target.value) })}>
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => <option key={d} value={d}>Day {d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start Time</label>
            <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <label className="label">End Time</label>
            <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Activity Title *</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Visit Senso-ji Temple" />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Asakusa, Tokyo" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes about this activity..." />
        </div>
        <div>
          <label className="label">Estimated Cost ($)</label>
          <input type="number" min={0} step="0.01" className="input" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: Number(e.target.value) })} />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            {item ? 'Save Changes' : 'Add Activity'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
