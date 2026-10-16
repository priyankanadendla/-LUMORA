import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, EmptyState, Spinner, Modal, ErrorBanner, ConfirmDialog } from '@/components/ui';
import { validateEmail, validatePhone } from '@/lib/utils';
import type { EmergencyContact } from '@/types';
import { Phone, Plus, Trash2, Pencil, Star, Mail, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

export function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<EmergencyContact | null>(null);

  async function loadContacts() {
    if (!user) return;
    const { data } = await supabase.from('emergency_contacts').select('*').order('is_primary', { ascending: false }).order('created_at', { ascending: true });
    setContacts((data as EmergencyContact[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadContacts();
  }, [user]);

  async function setPrimary(id: string) {
    // Unset all other primaries first
    await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', user?.id).neq('id', id);
    // Set the new primary
    await supabase.from('emergency_contacts').update({ is_primary: true }).eq('id', id);
    loadContacts();
  }

  async function handleDelete() {
    if (!deleteContact) return;
    await supabase.from('emergency_contacts').delete().eq('id', deleteContact.id);
    setContacts((prev) => prev.filter((c) => c.id !== deleteContact.id));
    setDeleteContact(null);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Spinner size={32} /></div>;
  }

  const primary = contacts.find((c) => c.is_primary);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
          <p className="mt-1 text-sm text-slate-500">Manage trusted contacts who will receive your safety alerts.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Contact
        </button>
      </div>

      {/* Primary contact highlight */}
      {primary && (
        <Card className="border-teal-200 bg-teal-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100">
              <Star size={26} className="text-teal-600" fill="currentColor" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-teal-600">Primary Emergency Contact</p>
              <h3 className="text-lg font-bold text-slate-900">{primary.name}</h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Phone size={13} /> {primary.phone}</span>
                {primary.email && <span className="flex items-center gap-1"><Mail size={13} /> {primary.email}</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No emergency contacts yet"
          description="Add a trusted friend or family member who will receive alerts when you activate Night Safety Mode."
          action={<button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Contact</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className={contact.is_primary ? 'border-teal-200' : ''}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${contact.is_primary ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                    {contact.is_primary ? <Star size={20} fill="currentColor" /> : <Phone size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                    {contact.is_primary && <span className="badge bg-teal-100 text-teal-700">Primary</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingContact(contact)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteContact(contact)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400" /> {contact.phone}</p>
                {contact.email && <p className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400" /> {contact.email}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Alert channels:</span>
                  {contact.alert_channels.includes('sms') && (
                    <span className="badge bg-blue-100 text-blue-700"><MessageSquare size={11} /> SMS</span>
                  )}
                  {contact.alert_channels.includes('email') && (
                    <span className="badge bg-amber-100 text-amber-700"><Mail size={11} /> Email</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {contact.verified ? (
                    <><CheckCircle2 size={13} className="text-green-500" /> <span className="text-green-600">Verified</span></>
                  ) : (
                    <><AlertCircle size={13} className="text-slate-400" /> <span className="text-slate-400">Unverified</span></>
                  )}
                </div>
              </div>
              {!contact.is_primary && (
                <button onClick={() => setPrimary(contact.id)} className="btn-ghost mt-3 w-full text-xs">
                  <Star size={13} /> Set as Primary
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {(showForm || editingContact) && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => { setShowForm(false); setEditingContact(null); }}
          onSaved={() => { setShowForm(false); setEditingContact(null); loadContacts(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Remove "${deleteContact?.name}" from your emergency contacts?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ContactFormModal({
  contact, onClose, onSaved,
}: {
  contact: EmergencyContact | null; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    alert_channels: contact?.alert_channels || (['email'] as ('sms' | 'email')[]),
    is_primary: contact?.is_primary || false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) return setError('Contact name is required.');
    if (!validatePhone(form.phone)) return setError('Please enter a valid phone number with country code (e.g., +1 555 123 4567).');
    if (form.email && !validateEmail(form.email)) return setError('Please enter a valid email address.');
    if (form.alert_channels.length === 0) return setError('Select at least one alert channel.');

    setSaving(true);

    if (form.is_primary && !contact?.is_primary) {
      await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', user?.id);
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      alert_channels: form.alert_channels,
      is_primary: form.is_primary,
    };

    if (contact) {
      const { error: err } = await supabase.from('emergency_contacts').update(payload).eq('id', contact.id);
      if (err) setError(err.message); else onSaved();
    } else {
      const { error: err } = await supabase.from('emergency_contacts').insert({ ...payload, user_id: user?.id });
      if (err) setError(err.message); else onSaved();
    }
    setSaving(false);
  }

  function toggleChannel(ch: 'sms' | 'email') {
    setForm((prev) => ({
      ...prev,
      alert_channels: prev.alert_channels.includes(ch)
        ? prev.alert_channels.filter((c) => c !== ch)
        : [...prev.alert_channels, ch],
    }));
  }

  return (
    <Modal open onClose={onClose} title={contact ? 'Edit Contact' : 'Add Emergency Contact'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Contact Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label">Phone Number * (with country code)</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
          <p className="mt-1 text-xs text-slate-400">Include the country code, e.g., +1 for US, +44 for UK.</p>
        </div>
        <div>
          <label className="label">Email Address</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
        </div>
        <div>
          <label className="label">Alert Channels *</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => toggleChannel('sms')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                form.alert_channels.includes('sms') ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <MessageSquare size={15} className="mr-1.5 inline" /> SMS
            </button>
            <button
              type="button"
              onClick={() => toggleChannel('email')}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                form.alert_channels.includes('email') ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500'
              }`}
            >
              <Mail size={15} className="mr-1.5 inline" /> Email
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_primary}
            onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-600">Set as primary emergency contact</span>
        </label>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            {contact ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
