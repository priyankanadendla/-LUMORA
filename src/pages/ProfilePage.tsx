import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Spinner, ErrorBanner, SuccessBanner } from '@/components/ui';
import { User as UserIcon, Mail, Phone, Home, Save, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    home_base: profile?.home_base || '',
    avatar_url: profile?.avatar_url || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (form.display_name.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name.trim(),
        phone: form.phone.trim(),
        home_base: form.home_base.trim(),
        avatar_url: form.avatar_url.trim(),
      })
      .eq('id', user?.id);
    if (err) {
      setError(err.message);
    } else {
      setSuccess('Profile updated successfully.');
      await refreshProfile();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your personal information and account settings.</p>
      </div>

      {/* Profile Header Card */}
      <Card className="flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-teal-500/20">
          {(form.display_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">{form.display_name || 'Your Name'}</h2>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <Mail size={14} /> {user?.email}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={12} /> Member since {formatDate(profile?.created_at)}
          </p>
        </div>
        <button onClick={() => signOut()} className="btn-secondary text-sm">
          Sign Out
        </button>
      </Card>

      {/* Edit Form */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Edit Information</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Jane Traveler" />
            </div>
          </div>
          <div>
            <label className="label">Email (read-only)</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10 opacity-60" value={user?.email || ''} disabled />
            </div>
          </div>
          <div>
            <label className="label">Phone Number</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
            </div>
          </div>
          <div>
            <label className="label">Home Base</label>
            <div className="relative">
              <Home size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" value={form.home_base} onChange={(e) => setForm({ ...form, home_base: e.target.value })} placeholder="San Francisco, CA" />
            </div>
          </div>
          <div>
            <label className="label">Avatar URL</label>
            <input className="input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." />
          </div>
          {error && <ErrorBanner message={error} />}
          {success && <SuccessBanner message={success} />}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
