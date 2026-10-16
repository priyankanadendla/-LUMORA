import { useState, useEffect } from 'react';
import { Compass, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { validateEmail, normalizeEmail } from '@/lib/email-validation';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('reset=success')) {
      setResetSuccess(true);
      window.location.hash = '/auth';
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedEmail = normalizeEmail(email);

    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode !== 'forgot' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && displayName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(normalizedEmail, password);
      if (error) setError(error);
    } else if (mode === 'signup') {
      const { error } = await signUp(normalizedEmail, password, displayName.trim());
      if (error) {
        setError(error);
      } else {
        // Check if we got a session (email confirmation off) or not
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSuccess('Account created! Redirecting to your dashboard...');
        } else {
          setSuccess('Account created! Please check your email to confirm your account, then sign in.');
        }
      }
    } else if (mode === 'forgot') {
      const { error } = await resetPassword(normalizedEmail);
      if (error) {
        setError(error);
      } else {
        setSuccess('Password reset link sent to your email.');
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/30">
              <Compass size={26} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">LUMORA</h1>
          <p className="mt-1 text-sm text-slate-400">Smart Travel Planner & Personal Safety</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-7 shadow-2xl backdrop-blur-xl">
          {resetSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} className="shrink-0" />
              Your password has been updated. You can now sign in with your new password.
            </div>
          )}

          <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className="mb-4 text-sm text-teal-600 hover:text-teal-700"
            >
              ← Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Traveler"
                    className="input pl-10"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                  className="text-sm text-teal-600 hover:text-teal-700"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={16} className="shrink-0" />
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-5 text-center text-xs text-slate-400">
              New to LUMORA? Click "Sign Up" to create your account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
