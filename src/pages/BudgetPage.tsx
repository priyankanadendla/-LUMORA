import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { Card, EmptyState, Spinner, Modal, ErrorBanner, ConfirmDialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Trip, Expense } from '@/types';
import { Wallet, Plus, Trash2, Pencil, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';

const CATEGORIES = ['transport', 'accommodation', 'food', 'activities', 'other'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  transport: 'bg-blue-100 text-blue-700',
  accommodation: 'bg-teal-100 text-teal-700',
  food: 'bg-amber-100 text-amber-700',
  activities: 'bg-rose-100 text-rose-700',
  other: 'bg-slate-100 text-slate-600',
};

export function BudgetPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

  async function loadData() {
    if (!user) return;
    const [tripsRes, expRes] = await Promise.all([
      supabase.from('trips').select('*').order('start_date', { ascending: false }),
      supabase.from('expenses').select('*, trip:trips(name)').order('expense_date', { ascending: false }),
    ]);
    setTrips((tripsRes.data as Trip[]) || []);
    setExpenses((expRes.data as (Expense & { trip: { name: string } })[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const filtered = selectedTrip === 'all' ? expenses : expenses.filter((e) => e.trip_id === selectedTrip);

  const actual = filtered.filter((e) => !e.is_planned);
  const planned = filtered.filter((e) => e.is_planned);
  const totalActual = actual.reduce((s, e) => s + Number(e.amount), 0);
  const totalPlanned = planned.reduce((s, e) => s + Number(e.amount), 0);

  const byCategory: Record<string, { actual: number; planned: number }> = {};
  CATEGORIES.forEach((c) => { byCategory[c] = { actual: 0, planned: 0 }; });
  filtered.forEach((e) => {
    if (byCategory[e.category]) {
      if (e.is_planned) byCategory[e.category].planned += Number(e.amount);
      else byCategory[e.category].actual += Number(e.amount);
    }
  });

  async function handleDelete() {
    if (!deleteExpense) return;
    await supabase.from('expenses').delete().eq('id', deleteExpense.id);
    setExpenses((prev) => prev.filter((e) => e.id !== deleteExpense.id));
    setDeleteExpense(null);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center"><Spinner size={32} /></div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Track planned vs actual expenses across all your trips.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No trips to track expenses for"
          description="Create a trip first, then you can start tracking your budget and expenses."
          action={<button onClick={() => navigate('/trips')} className="btn-primary">Create a Trip</button>}
        />
      ) : (
        <>
          {/* Trip Filter */}
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-slate-400" />
            <select value={selectedTrip} onChange={(e) => setSelectedTrip(e.target.value)} className="input w-auto">
              <option value="all">All Trips</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100"><TrendingUp size={18} className="text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Planned</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalPlanned)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><TrendingDown size={18} className="text-rose-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Actual Spent</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalActual)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100"><DollarSign size={18} className="text-teal-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Difference</p>
                  <p className={`text-lg font-bold ${totalPlanned - totalActual >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                    {formatCurrency(totalPlanned - totalActual)}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><Wallet size={18} className="text-amber-600" /></div>
                <div>
                  <p className="text-xs text-slate-400">Transactions</p>
                  <p className="text-lg font-bold text-slate-900">{filtered.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-slate-900">By Category</h2>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const data = byCategory[cat];
                const maxVal = Math.max(data.actual, data.planned, 1);
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 capitalize">{cat}</span>
                      <span className="text-slate-400">
                        <span className="text-rose-600">{formatCurrency(data.actual)}</span>
                        {' / '}
                        <span className="text-blue-600">{formatCurrency(data.planned)}</span>
                      </span>
                    </div>
                    <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-rose-400 transition-all" style={{ width: `${(data.actual / maxVal) * 50}%` }} />
                      <div className="bg-blue-400 transition-all" style={{ width: `${(data.planned / maxVal) * 50}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Actual</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Planned</span>
            </div>
          </Card>

          {/* Expense List */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">All Expenses</h2>
            {filtered.length === 0 ? (
              <EmptyState icon={Wallet} title="No expenses recorded" description="Add your first expense to start tracking your spending." />
            ) : (
              <div className="space-y-2">
                {filtered.map((exp) => {
                  const tripName = (exp as Expense & { trip?: { name: string } }).trip?.name || '';
                  return (
                    <div key={exp.id} className="card flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${CATEGORY_COLORS[exp.category]}`}>
                          <Wallet size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800">{exp.description || exp.category}</p>
                            {exp.is_planned && <span className="badge bg-blue-100 text-blue-600">planned</span>}
                          </div>
                          <p className="text-xs text-slate-400">
                            <span className={`badge mr-1.5 ${CATEGORY_COLORS[exp.category]}`}>{exp.category}</span>
                            {tripName && `${tripName} · `}{formatDate(exp.expense_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${exp.is_planned ? 'text-blue-600' : 'text-rose-600'}`}>{formatCurrency(exp.amount)}</span>
                        <button onClick={() => setEditingExpense(exp)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteExpense(exp)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {(showForm || editingExpense) && (
        <ExpenseFormModal
          trips={trips}
          expense={editingExpense}
          onClose={() => { setShowForm(false); setEditingExpense(null); }}
          onSaved={() => { setShowForm(false); setEditingExpense(null); loadData(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteExpense}
        onClose={() => setDeleteExpense(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Delete "${deleteExpense?.description || deleteExpense?.category}" expense?`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function ExpenseFormModal({
  trips, expense, onClose, onSaved,
}: {
  trips: Trip[]; expense: Expense | null; onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    trip_id: expense?.trip_id || trips[0]?.id || '',
    category: expense?.category || 'other',
    description: expense?.description || '',
    amount: expense?.amount || 0,
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    is_planned: expense?.is_planned || false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.trip_id) return setError('Please select a trip.');
    if (form.amount <= 0) return setError('Amount must be greater than 0.');
    setSaving(true);

    const payload = { ...form, amount: Number(form.amount) };
    if (expense) {
      const { error: err } = await supabase.from('expenses').update(payload).eq('id', expense.id);
      if (err) setError(err.message); else onSaved();
    } else {
      const { error: err } = await supabase.from('expenses').insert({ ...payload, user_id: user?.id });
      if (err) setError(err.message); else onSaved();
    }
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Trip *</label>
          <select className="input" value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })}>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Expense['category'] })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount ($) *</label>
            <input type="number" min={0.01} step="0.01" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Flight to Tokyo" />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_planned} onChange={(e) => setForm({ ...form, is_planned: e.target.checked })} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-slate-600">This is a planned (not yet spent) expense</span>
        </label>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            {expense ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
