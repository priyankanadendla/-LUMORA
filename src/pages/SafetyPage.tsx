import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { navigate } from '@/lib/router';
import { Card, EmptyState, Spinner, ConfirmDialog, ErrorBanner, SuccessBanner } from '@/components/ui';
import { formatDateTime, timeAgo, generateToken, hashToken } from '@/lib/utils';
import type { SafetySession, EmergencyAlert, EmergencyContact, LocationShare } from '@/types';
import {
  Shield, ShieldOff, AlertTriangle, MapPin, Clock, Send, CheckCircle2, XCircle,
  AlertCircle, Loader2, History, Link as LinkIcon, Copy, ExternalLink, Power, Phone,
} from 'lucide-react';

const SHARE_DURATION_HOURS = 4;
const LOCATION_UPDATE_INTERVAL = 15000; // 15 seconds

export function SafetyPage() {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<SafetySession | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [activeShare, setActiveShare] = useState<LocationShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const shareIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  async function loadData() {
    if (!user) return;
    const [sessRes, contactsRes, alertsRes, shareRes] = await Promise.all([
      supabase.from('safety_sessions').select('*').eq('status', 'active').maybeSingle(),
      supabase.from('emergency_contacts').select('*').order('is_primary', { ascending: false }),
      supabase.from('emergency_alerts').select('*').order('alert_time', { ascending: false }).limit(20),
      supabase.from('location_shares').select('*').eq('status', 'active').maybeSingle(),
    ]);
    setSession((sessRes.data as SafetySession) || null);
    setContacts((contactsRes.data as EmergencyContact[]) || []);
    setAlerts((alertsRes.data as EmergencyAlert[]) || []);
    setActiveShare((shareRes.data as LocationShare) || null);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  // Location tracking
  const startLocationWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('requesting');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setCurrentLocation({ lat, lng });
        setLocationStatus('granted');

        // Send update to backend
        if (shareIdRef.current) {
          supabase.from('location_updates').insert({
            share_id: shareIdRef.current,
            user_id: user?.id,
            lat,
            lng,
            accuracy,
          }).then(({ error }) => {
            if (error) console.error('Location update error:', error.message);
          });

          // Also update last known on the share record
          supabase.from('location_shares').update({
            last_lat: lat,
            last_lng: lng,
            last_updated_at: new Date().toISOString(),
          }).eq('id', shareIdRef.current).then();
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }, [user]);

  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Periodic update interval (backup to watchPosition)
  useEffect(() => {
    if (!activeShare) return;
    const interval = setInterval(() => {
      if (currentLocation && shareIdRef.current) {
        supabase.from('location_updates').insert({
          share_id: shareIdRef.current,
          user_id: user?.id,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        }).then();
      }
    }, LOCATION_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [activeShare, currentLocation, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLocationWatch();
  }, [stopLocationWatch]);

  async function startSafetySession() {
    if (!user || !primaryContact) {
      setError('Please add an emergency contact before starting a safety session.');
      return;
    }
    setError(null);

    // Generate sharing token
    const rawToken = generateToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SHARE_DURATION_HOURS * 3600000).toISOString();

    // Create location share
    const { data: shareData, error: shareErr } = await supabase.from('location_shares').insert({
      user_id: user.id,
      token_hash: tokenHash,
      status: 'active',
      expires_at: expiresAt,
      display_name: profile?.display_name || 'LUMORA User',
    }).select().single();

    if (shareErr) {
      setError('Failed to create location share: ' + shareErr.message);
      return;
    }

    // Create safety session
    const { data: sessData, error: sessErr } = await supabase.from('safety_sessions').insert({
      user_id: user.id,
      status: 'active',
      started_at: new Date().toISOString(),
      primary_contact_id: primaryContact.id,
      location_share_id: shareData.id,
    }).select().single();

    if (sessErr) {
      setError('Failed to start safety session: ' + sessErr.message);
      return;
    }

    shareIdRef.current = shareData.id;
    tokenRef.current = rawToken;
    setShareToken(rawToken);
    setSession(sessData as SafetySession);
    setActiveShare(shareData as LocationShare);
    startLocationWatch();
    setSuccess('Safety session activated. Location sharing is now live.');
    setTimeout(() => setSuccess(null), 5000);
  }

  async function stopSafetySession() {
    if (!session || !user) return;
    setError(null);

    stopLocationWatch();

    // End safety session
    await supabase.from('safety_sessions').update({
      status: 'inactive',
      ended_at: new Date().toISOString(),
    }).eq('id', session.id);

    // Revoke location share
    if (activeShare) {
      await supabase.from('location_shares').update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      }).eq('id', activeShare.id);
    }

    setSession(null);
    setActiveShare(null);
    setShareToken(null);
    setCurrentLocation(null);
    setLocationStatus('idle');
    shareIdRef.current = null;
    tokenRef.current = null;
    setSuccess('Safety session ended. Location sharing has been stopped.');
    setTimeout(() => setSuccess(null), 5000);
  }

  async function sendEmergencyAlert() {
    if (!user || !primaryContact) {
      setError('No emergency contact configured. Add one in Emergency Contacts.');
      return;
    }
    setSendingAlert(true);
    setError(null);

    const alertTime = new Date().toISOString();
    const displayName = profile?.display_name || 'LUMORA User';

    // Get current location if available
    let lat: number | null = null;
    let lng: number | null = null;
    let locationLink = '';

    if (currentLocation) {
      lat = currentLocation.lat;
      lng = currentLocation.lng;
    } else if (activeShare?.last_lat && activeShare?.last_lng) {
      lat = activeShare.last_lat;
      lng = activeShare.last_lng;
    }

    // Generate share link if we have an active share token
    if (shareToken) {
      locationLink = `${window.location.origin}/#/share/${shareToken}`;
    } else if (lat && lng) {
      locationLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
    }

    const message = `LUMORA SAFETY ALERT: ${displayName} has requested assistance. Alert time: ${formatDateTime(alertTime)}. Their latest available location is available here: ${locationLink || 'Location not available'}. Please contact them and check their safety.`;

    // Create alert record
    const { data: alertData, error: alertErr } = await supabase.from('emergency_alerts').insert({
      user_id: user.id,
      session_id: session?.id || null,
      contact_id: primaryContact.id,
      status: 'pending',
      message,
      location_lat: lat,
      location_lng: lng,
      location_link: locationLink,
      alert_time: alertTime,
    }).select().single();

    if (alertErr) {
      setError('Failed to create alert record: ' + alertErr.message);
      setSendingAlert(false);
      return;
    }

    // Call edge function to send alerts via email/SMS
    let deliveryResult: Record<string, { status: 'sent' | 'failed'; error?: string }> = {};
    let overallStatus: 'sent' | 'partially_sent' | 'failed' = 'failed';

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-alert`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: alertData.id,
          contactName: primaryContact.name,
          contactPhone: primaryContact.phone,
          contactEmail: primaryContact.email,
          alertChannels: primaryContact.alert_channels,
          userName: displayName,
          message,
          locationLink,
          alertTime,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        deliveryResult = result.deliveryResult || {};
        const sentCount = Object.values(deliveryResult).filter((r: { status: string }) => r.status === 'sent').length;
        const totalChannels = Object.keys(deliveryResult).length;
        if (sentCount === totalChannels && totalChannels > 0) overallStatus = 'sent';
        else if (sentCount > 0) overallStatus = 'partially_sent';
        else overallStatus = 'failed';
      } else {
        const errBody = await response.json().catch(() => ({}));
        deliveryResult = { edge_function: { status: 'failed', error: errBody.error || `HTTP ${response.status}` } };
        overallStatus = 'failed';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      deliveryResult = { network: { status: 'failed', error: msg } };
      overallStatus = 'failed';
    }

    // Update alert record with delivery results
    await supabase.from('emergency_alerts').update({
      status: overallStatus,
      delivery_result: deliveryResult,
    }).eq('id', alertData.id);

    // Refresh alerts
    setAlerts((prev) => [{ ...alertData, status: overallStatus, delivery_result: deliveryResult } as EmergencyAlert, ...prev]);
    setSendingAlert(false);
    setShowAlertConfirm(false);

    if (overallStatus === 'sent') {
      setSuccess('Emergency alert sent successfully to your contact.');
    } else if (overallStatus === 'partially_sent') {
      setSuccess('Emergency alert partially delivered. Some channels failed — check the alert history for details.');
    } else {
      setError('Emergency alert delivery failed. The alert has been recorded — you can retry from the alert history.');
    }
    setTimeout(() => { setSuccess(null); setError(null); }, 8000);
  }

  async function retryAlert(alert: EmergencyAlert) {
    if (!primaryContact) return;
    setSendingAlert(true);
    setError(null);

    let deliveryResult: Record<string, { status: 'sent' | 'failed'; error?: string }> = {};
    let overallStatus: 'sent' | 'partially_sent' | 'failed' = 'failed';

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-alert`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: alert.id,
          contactName: primaryContact.name,
          contactPhone: primaryContact.phone,
          contactEmail: primaryContact.email,
          alertChannels: primaryContact.alert_channels,
          userName: profile?.display_name || 'LUMORA User',
          message: alert.message,
          locationLink: alert.location_link,
          alertTime: alert.alert_time,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        deliveryResult = result.deliveryResult || {};
        const sentCount = Object.values(deliveryResult).filter((r: { status: string }) => r.status === 'sent').length;
        const totalChannels = Object.keys(deliveryResult).length;
        if (sentCount === totalChannels && totalChannels > 0) overallStatus = 'sent';
        else if (sentCount > 0) overallStatus = 'partially_sent';
        else overallStatus = 'failed';
      } else {
        deliveryResult = { edge_function: { status: 'failed', error: 'Retry failed' } };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      deliveryResult = { network: { status: 'failed', error: msg } };
    }

    await supabase.from('emergency_alerts').update({
      status: overallStatus,
      delivery_result: deliveryResult,
    }).eq('id', alert.id);

    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status: overallStatus, delivery_result: deliveryResult } : a));
    setSendingAlert(false);
  }

  function copyShareLink() {
    if (!shareToken) return;
    const link = `${window.location.origin}/#/share/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Spinner size={32} /></div>;
  }

  const isActive = !!session;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Night Safety Mode</h1>
        <p className="mt-1 text-sm text-slate-500">Activate real-time safety sharing and send emergency alerts to your trusted contacts.</p>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {/* Safety Session Control */}
      <Card className={isActive ? 'border-teal-300 bg-teal-50/30' : ''}>
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isActive ? 'bg-teal-100' : 'bg-slate-100'}`}>
            {isActive ? <Shield size={28} className="text-teal-600" /> : <ShieldOff size={28} className="text-slate-400" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {isActive ? 'Safety Session Active' : 'Safety Session Inactive'}
            </h2>
            <p className="text-sm text-slate-500">
              {isActive
                ? `Started ${timeAgo(session?.started_at)}. Location sharing is live.`
                : 'Activate to start sharing your live location with your emergency contact.'}
            </p>
          </div>
          <button
            onClick={isActive ? stopSafetySession : startSafetySession}
            className={isActive ? 'btn-danger' : 'btn-primary'}
            disabled={contacts.length === 0}
          >
            {isActive ? <><Power size={16} /> End Session</> : <><Shield size={16} /> Activate Safety</>}
          </button>
        </div>

        {contacts.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle size={16} />
            You need to add an emergency contact first.
            <button onClick={() => navigate('/contacts')} className="ml-1 font-medium underline">Add contact →</button>
          </div>
        )}
      </Card>

      {/* Primary Contact */}
      {primaryContact && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
              <Phone size={18} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Primary Contact</p>
              <p className="font-semibold text-slate-900">{primaryContact.name}</p>
              <p className="text-sm text-slate-500">{primaryContact.phone}</p>
            </div>
            {primaryContact.is_primary && <span className="badge bg-teal-100 text-teal-700">Primary</span>}
          </div>
        </Card>
      )}

      {/* Location Status */}
      {isActive && (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Live Location</h2>
          {locationStatus === 'requesting' && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Requesting location permission...
            </div>
          )}
          {locationStatus === 'denied' && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Location permission denied</p>
                <p className="mt-0.5 text-xs">Enable location access in your browser settings to share your live location. Without it, alerts will not include a location link unless you activate sharing with permission.</p>
              </div>
            </div>
          )}
          {locationStatus === 'unavailable' && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Geolocation not available</p>
                <p className="mt-0.5 text-xs">Your browser does not support geolocation. Emergency alerts will be sent without location data.</p>
              </div>
            </div>
          )}
          {locationStatus === 'granted' && currentLocation && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                <span className="font-medium text-teal-700">Live tracking active</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Latitude</p>
                  <p className="font-mono font-medium text-slate-700">{currentLocation.lat.toFixed(5)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-400">Longitude</p>
                  <p className="font-mono font-medium text-slate-700">{currentLocation.lng.toFixed(5)}</p>
                </div>
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${currentLocation.lat}&mlon=${currentLocation.lng}#map=15/${currentLocation.lat}/${currentLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
              >
                <MapPin size={14} /> View on map <ExternalLink size={12} />
              </a>
            </div>
          )}
          {locationStatus === 'idle' && (
            <p className="text-sm text-slate-400">Location tracking will start when you activate the safety session.</p>
          )}

          {/* Share Link */}
          {shareToken && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <LinkIcon size={13} /> Secure Share Link (expires in {SHARE_DURATION_HOURS}h)
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/#/share/${shareToken}`}
                  className="input flex-1 text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button onClick={copyShareLink} className="btn-secondary px-3 text-xs">
                  {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Share this link with your emergency contact so they can view your live location.</p>
            </div>
          )}
        </Card>
      )}

      {/* Emergency Alert Button */}
      <Card className="border-red-200 bg-red-50/30">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Emergency Alert</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Send an immediate safety alert to your primary contact with your name, time, and latest location.
            </p>
          </div>
          <button
            onClick={() => setShowAlertConfirm(true)}
            disabled={!primaryContact || sendingAlert}
            className="btn-danger w-full max-w-xs text-base"
          >
            {sendingAlert ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sendingAlert ? 'Sending Alert...' : 'I Feel Unsafe — Send Alert'}
          </button>
          {!primaryContact && (
            <p className="text-xs text-amber-600">Add an emergency contact to enable alerts.</p>
          )}
        </div>
      </Card>

      {/* Alert History */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <History size={18} /> Alert History
        </h2>
        {alerts.length === 0 ? (
          <EmptyState
            icon={History}
            title="No alerts sent"
            description="Your emergency alert history will appear here."
          />
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      alert.status === 'sent' ? 'bg-green-100' :
                      alert.status === 'partially_sent' ? 'bg-amber-100' :
                      alert.status === 'failed' ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      {alert.status === 'sent' ? <CheckCircle2 size={18} className="text-green-600" /> :
                       alert.status === 'partially_sent' ? <AlertCircle size={18} className="text-amber-600" /> :
                       alert.status === 'failed' ? <XCircle size={18} className="text-red-600" /> :
                       <Clock size={18} className="text-slate-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          alert.status === 'sent' ? 'bg-green-100 text-green-700' :
                          alert.status === 'partially_sent' ? 'bg-amber-100 text-amber-700' :
                          alert.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>{alert.status.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(alert.alert_time)}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{alert.message}</p>
                      {Object.keys(alert.delivery_result).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(alert.delivery_result).map(([channel, result]) => (
                            <div key={channel} className="flex items-center gap-1.5 text-xs">
                              {result.status === 'sent' ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                              <span className="font-medium text-slate-600">{channel}:</span>
                              <span className={result.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                                {result.status === 'sent' ? 'delivered' : `failed${result.error ? ` — ${result.error}` : ''}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {alert.status === 'failed' && (
                    <button
                      onClick={() => retryAlert(alert)}
                      disabled={sendingAlert}
                      className="btn-secondary px-3 text-xs"
                    >
                      <Send size={12} /> Retry
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showAlertConfirm}
        onClose={() => setShowAlertConfirm(false)}
        onConfirm={sendEmergencyAlert}
        title="Send Emergency Alert?"
        message={`An alert will be sent to ${primaryContact?.name || 'your primary contact'} with your name, the current time, and your latest location. Are you sure?`}
        confirmLabel="Yes, Send Alert"
        danger
      />
    </div>
  );
}
