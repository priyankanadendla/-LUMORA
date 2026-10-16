import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { hashToken, formatDateTime, timeAgo } from '@/lib/utils';
import type { LocationShare, LocationUpdate } from '@/types';
import { Spinner, EmptyState } from '@/components/ui';
import { MapPin, Clock, Compass, AlertCircle, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 10000;

export function SharePage({ token }: { token: string }) {
  const [share, setShare] = useState<LocationShare | null>(null);
  const [updates, setUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadData() {
    const tokenHash = await hashToken(token);
    const { data: shareData, error: shareErr } = await supabase
      .from('location_shares')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (shareErr || !shareData) {
      setError('Invalid or expired location share link.');
      setLoading(false);
      return;
    }

    const s = shareData as LocationShare;
    if (s.revoked_at || (s.expires_at && new Date(s.expires_at) < new Date())) {
      setExpired(true);
      setShare(s);
      setLoading(false);
      return;
    }

    setShare(s);

    const { data: updatesData } = await supabase
      .from('location_updates')
      .select('*')
      .eq('share_id', s.id)
      .order('recorded_at', { ascending: false })
      .limit(50);

    setUpdates((updatesData as LocationUpdate[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <EmptyState
          icon={AlertCircle}
          title="Link Invalid"
          description={error}
        />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto">
            <Clock size={32} className="text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Location Sharing Ended</h1>
          <p className="mt-2 text-sm text-slate-500">
            {share?.revoked_at
              ? 'The user has manually stopped location sharing.'
              : 'This sharing link has expired.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Last active: {formatDateTime(share?.last_updated_at || share?.expires_at)}
          </p>
        </div>
      </div>
    );
  }

  const latest = updates[0];
  const displayName = share?.display_name || 'LUMORA User';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600">
              <Compass size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">LUMORA Safety Share</h1>
              <p className="text-xs text-slate-400">Live location for {displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-teal-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
            <span className="font-medium">Live</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {/* Map */}
        {latest ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Location Map"
              className="h-72 w-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${latest.lng - 0.01},${latest.lat - 0.01},${latest.lng + 0.01},${latest.lat + 0.01}&layer=mapnik&marker=${latest.lat},${latest.lng}`}
            />
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <MapPin size={15} className="text-teal-600" /> {latest.lat.toFixed(5)}, {latest.lng.toFixed(5)}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} /> Updated {timeAgo(latest.recorded_at)}
                </p>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${latest.lat}&mlon=${latest.lng}#map=16/${latest.lat}/${latest.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs"
              >
                Open in Maps
              </a>
            </div>
          </div>
        ) : share?.last_lat && share?.last_lng ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Location Map"
              className="h-72 w-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${share.last_lng - 0.01},${share.last_lat - 0.01},${share.last_lng + 0.01},${share.last_lat + 0.01}&layer=mapnik&marker=${share.last_lat},${share.last_lng}`}
            />
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <MapPin size={15} className="text-teal-600" /> {share.last_lat.toFixed(5)}, {share.last_lng.toFixed(5)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={12} /> Last known location — updated {timeAgo(share.last_updated_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <MapPin size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Waiting for location data...</p>
            <p className="mt-1 text-xs text-slate-400">The user hasn't sent any location updates yet.</p>
          </div>
        )}

        {/* Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Sharing Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">User</span>
              <span className="font-medium text-slate-700">{displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sharing started</span>
              <span className="font-medium text-slate-700">{formatDateTime(share?.started_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Expires</span>
              <span className="font-medium text-slate-700">{formatDateTime(share?.expires_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Last update</span>
              <span className="font-medium text-slate-700">{timeAgo(share?.last_updated_at || share?.started_at)}</span>
            </div>
          </div>
        </div>

        {/* Location History */}
        {updates.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Location History ({updates.length})</h2>
            <div className="max-h-60 space-y-1.5 overflow-y-auto scrollbar-thin">
              {updates.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-mono text-slate-500">{u.lat.toFixed(4)}, {u.lng.toFixed(4)}</span>
                  <span className="text-slate-400">{timeAgo(u.recorded_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-400">
          <RefreshCw size={12} className="mr-1 inline" />
          This page auto-refreshes every 10 seconds. Location sharing stops when the user ends the session or the link expires.
        </div>
      </div>
    </div>
  );
}
