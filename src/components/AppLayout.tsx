import { useState, type ReactNode } from 'react';
import {
  Compass,
  LayoutDashboard,
  Map,
  Luggage,
  Wallet,
  Heart,
  User as UserIcon,
  Phone,
  Shield,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { navigate, type Route } from '@/lib/router';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { route: Route['name']; label: string; icon: LucideIcon; path: string }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { route: 'explore', label: 'Explore', icon: Map, path: '/explore' },
  { route: 'trips', label: 'My Trips', icon: Luggage, path: '/trips' },
  { route: 'budget', label: 'Budget', icon: Wallet, path: '/budget' },
  { route: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
  { route: 'contacts', label: 'Emergency Contacts', icon: Phone, path: '/contacts' },
  { route: 'safety', label: 'Night Safety Mode', icon: Shield, path: '/safety' },
  { route: 'profile', label: 'Profile', icon: UserIcon, path: '/profile' },
];

export function AppLayout({ children, currentRoute }: { children: ReactNode; currentRoute: Route['name'] }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.display_name || 'Traveler';

  function handleNav(path: string) {
    navigate(path);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-md shadow-teal-500/20">
            <Compass size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">LUMORA</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Travel & Safety</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const active = currentRoute === item.route || (item.route === 'trips' && currentRoute === 'trip-detail');
            return (
              <button
                key={item.route}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon size={18} className={active ? 'text-teal-600' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-sm font-semibold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{profile?.id ? 'View profile' : ''}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600">
            <Compass size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">LUMORA</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 animate-slide-up bg-white shadow-xl">
            <div className="space-y-0.5 px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const active = currentRoute === item.route || (item.route === 'trips' && currentRoute === 'trip-detail');
                return (
                  <button
                    key={item.route}
                    onClick={() => handleNav(item.path)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <item.icon size={18} className={active ? 'text-teal-600' : 'text-slate-400'} />
                    {item.label}
                  </button>
                );
              })}
              <div className="my-2 border-t border-slate-100" />
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
