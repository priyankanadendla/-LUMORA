import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'auth' }
  | { name: 'dashboard' }
  | { name: 'explore' }
  | { name: 'trips' }
  | { name: 'trip-detail'; id: string }
  | { name: 'budget' }
  | { name: 'favorites' }
  | { name: 'profile' }
  | { name: 'contacts' }
  | { name: 'safety' }
  | { name: 'share'; token: string }
  | { name: 'reset-password' };

function parseHash(): Route {
  let rawHash = window.location.hash.replace(/^#\/?/, '');
  // Strip query string (e.g. "?reset=success")
  rawHash = rawHash.split('?')[0];
  // Strip GoTrue auth params that use & as separator (e.g. "type=recovery&access_token=...")
  if (rawHash.includes('type=') || rawHash.includes('access_token=')) {
    rawHash = '';
  }
  const parts = rawHash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'dashboard' };
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'explore') return { name: 'explore' };
  if (parts[0] === 'trips' && parts[1]) return { name: 'trip-detail', id: parts[1] };
  if (parts[0] === 'trips') return { name: 'trips' };
  if (parts[0] === 'budget') return { name: 'budget' };
  if (parts[0] === 'favorites') return { name: 'favorites' };
  if (parts[0] === 'profile') return { name: 'profile' };
  if (parts[0] === 'contacts') return { name: 'contacts' };
  if (parts[0] === 'safety') return { name: 'safety' };
  if (parts[0] === 'share' && parts[1]) return { name: 'share', token: parts[1] };
  if (parts[0] === 'reset-password') return { name: 'reset-password' };
  return { name: 'dashboard' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}

export function navigate(path: string) {
  window.location.hash = path;
}
