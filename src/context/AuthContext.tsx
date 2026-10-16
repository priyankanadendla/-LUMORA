import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  passwordRecovery: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Profile load error:', error.message);
      return null;
    }
    setProfile(data as Profile | null);
    return data;
  }

  useEffect(() => {
    let mounted = true;

    // If the URL contains a recovery token, keep loading until the
    // PASSWORD_RECOVERY event fires so we don't flash the AuthPage.
    const urlHasRecoveryToken =
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token');

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user && !urlHasRecoveryToken) {
        loadProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else if (!urlHasRecoveryToken) {
        setLoading(false);
      }
      // If urlHasRecoveryToken, we keep loading=true and wait for
      // onAuthStateChange to fire PASSWORD_RECOVERY.
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setLoading(false);
        // Clean auth tokens from the URL so they don't linger in the
        // address bar or browser history.
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return;
      }

      if (s?.user) {
        (async () => {
          await loadProfile(s.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Safety net: if the URL had a recovery token but PASSWORD_RECOVERY
  // never fired within 5 seconds (expired/invalid token), stop loading
  // so the user isn't stuck on a blank page forever.
  useEffect(() => {
    const urlHasRecoveryToken =
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token');
    if (!urlHasRecoveryToken) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, displayName) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };

    if (data.user && !data.session) {
      return { error: null };
    }

    return { error: null };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
    setPasswordRecovery(false);
  };

  const resetPassword: AuthContextValue['resetPassword'] = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const updatePassword: AuthContextValue['updatePassword'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setPasswordRecovery(false);
    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, passwordRecovery, signUp, signIn, signOut, resetPassword, updatePassword, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
