import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { EmptyState, Spinner, Modal, ErrorBanner, ConfirmDialog } from '@/components/ui';
import type { Favorite } from '@/types';
import { Heart, Plus, Trash2, Pencil, Search, MapPin } from 'lucide-react';

const DESTINATION_CATEGORIES = ['beach', 'city', 'mountain', 'cultural', 'adventure', 'food'] as const;

const FEATURED_DESTINATIONS = [
  { name: 'Kyoto, Japan', location: 'Kyoto', country: 'Japan', category: 'cultural', image_url: 'https://images.pexels.com/photos/18063526/pexels-photo-18063526.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Santorini, Greece', location: 'Santorini', country: 'Greece', category: 'beach', image_url: 'https://images.pexels.com/photos/161342/greece-santorini-architecture-island-161342.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Banff, Canada', location: 'Banff', country: 'Canada', category: 'mountain', image_url: 'https://images.pexels.com/photos/13724338/pexels-photo-13724338.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Marrakech, Morocco', location: 'Marrakech', country: 'Morocco', category: 'cultural', image_url: 'https://images.pexels.com/photos/15260622/pexels-photo-15260622.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Reykjavik, Iceland', location: 'Reykjavik', country: 'Iceland', category: 'adventure', image_url: 'https://images.pexels.com/photos/20165201/pexels-photo-20165201.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Lisbon, Portugal', location: 'Lisbon', country: 'Portugal', category: 'city', image_url: 'https://images.pexels.com/photos/26824153/pexels-photo-26824153.png?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Bali, Indonesia', location: 'Bali', country: 'Indonesia', category: 'beach', image_url: 'https://images.pexels.com/photos/32314301/pexels-photo-32314301.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Patagonia, Chile', location: 'Patagonia', country: 'Chile', category: 'adventure', image_url: 'https://images.pexels.com/photos/13947005/pexels-photo-13947005.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Rome, Italy', location: 'Rome', country: 'Italy', category: 'food', image_url: 'https://images.pexels.com/photos/1024005/pexels-photo-1024005.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Cape Town, South Africa', location: 'Cape Town', country: 'South Africa', category: 'city', image_url: 'https://images.pexels.com/photos/36597753/pexels-photo-36597753.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Queenstown, New Zealand', location: 'Queenstown', country: 'New Zealand', category: 'mountain', image_url: 'https://images.pexels.com/photos/724948/pexels-photo-724948.png?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Istanbul, Turkey', location: 'Istanbul', country: 'Turkey', category: 'cultural', image_url: 'https://images.pexels.com/photos/19797677/pexels-photo-19797677.png?auto=compress&cs=tinysrgb&h=650&w=940' },
];

export function ExplorePage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFav, setEditingFav] = useState<Favorite | null>(null);
  const [deleteFav, setDeleteFav] = useState<Favorite | null>(null);

  async function loadFavorites() {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('*').order('created_at', { ascending: false });
    setFavorites((data as Favorite[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const favNames = new Set(favorites.map((f) => f.name));
  const favIds = new Map(favorites.map((f) => [f.name, f.id]));

  const filtered = FEATURED_DESTINATIONS.filter((d) => {
    const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  async function toggleFavorite(dest: typeof FEATURED_DESTINATIONS[0]) {
    const existingId = favIds.get(dest.name);
    if (existingId) {
      await supabase.from('favorites').delete().eq('id', existingId);
      setFavorites((prev) => prev.filter((f) => f.id !== existingId));
    } else {
      const { data } = await supabase.from('favorites').insert({
        name: dest.name,
        location: dest.location,
        country: dest.country,
        category: dest.category,
        image_url: dest.image_url,
        user_id: user?.id,
      }).select().single();
      if (data) setFavorites((prev) => [data as Favorite, ...prev]);
    }
  }

  async function handleDeleteFav() {
    if (!deleteFav) return;
    await supabase.from('favorites').delete().eq('id', deleteFav.id);
    setFavorites((prev) => prev.filter((f) => f.id !== deleteFav.id));
    setDeleteFav(null);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Explore Destinations</h1>
          <p className="mt-1 text-sm text-slate-500">Discover popular destinations and save your favorites.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={18} /> Add Custom Place
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input w-auto">
          <option value="all">All Categories</option>
          {DESTINATION_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((dest) => {
          const isFav = favNames.has(dest.name);
          return (
            <div key={dest.name} className="card group overflow-hidden transition-all hover:shadow-lg">
              <div className="relative h-48 overflow-hidden">
                <img src={dest.image_url} alt={dest.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <button
                  onClick={() => toggleFavorite(dest)}
                  className={`absolute right-3 top-3 rounded-full p-2 backdrop-blur-sm transition-all ${
                    isFav ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                </button>
                <div className="absolute bottom-3 left-3">
                  <span className="badge bg-white/90 text-slate-700 backdrop-blur-sm">{dest.category}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900">{dest.name}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin size={13} /> {dest.country}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Search} title="No destinations found" description="Try a different search or category filter." />
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your Saved Places</h2>
        {favorites.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved places yet"
            description="Tap the heart icon on any destination to save it here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="card overflow-hidden">
                {fav.image_url ? (
                  <img src={fav.image_url} alt={fav.name} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400">
                    <MapPin size={24} className="text-white/60" />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{fav.name}</p>
                      <p className="truncate text-xs text-slate-400">{fav.location}{fav.country && `, ${fav.country}`}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingFav(fav)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteFav(fav)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {fav.notes && <p className="mt-1.5 text-xs text-slate-400">{fav.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showAddModal || editingFav) && (
        <FavoriteFormModal
          favorite={editingFav}
          onClose={() => { setShowAddModal(false); setEditingFav(null); }}
          onSaved={() => { setShowAddModal(false); setEditingFav(null); loadFavorites(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteFav}
        onClose={() => setDeleteFav(null)}
        onConfirm={handleDeleteFav}
        title="Remove Favorite"
        message={`Remove "${deleteFav?.name}" from your saved places?`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}

function FavoriteFormModal({
  favorite, onClose, onSaved,
}: {
  favorite: Favorite | null; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: favorite?.name || '',
    location: favorite?.location || '',
    country: favorite?.country || '',
    category: favorite?.category || 'destination',
    notes: favorite?.notes || '',
    image_url: favorite?.image_url || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Place name is required.');
    setSaving(true);
    if (favorite) {
      const { error: err } = await supabase.from('favorites').update(form).eq('id', favorite.id);
      if (err) setError(err.message); else onSaved();
    } else {
      const { error: err } = await supabase.from('favorites').insert({ ...form, user_id: user?.id });
      if (err) setError(err.message); else onSaved();
    }
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={favorite ? 'Edit Place' : 'Add Custom Place'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Place Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hidden Beach Cove" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Phuket" />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Thailand" />
          </div>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {DESTINATION_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            <option value="destination">General</option>
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Why you want to visit..." />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            {favorite ? 'Save Changes' : 'Add Place'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
