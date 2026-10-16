import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { AppLayout } from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui';
import { AuthPage } from '@/pages/AuthPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { TripsPage } from '@/pages/TripsPage';
import { TripDetailPage } from '@/pages/TripDetailPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ContactsPage } from '@/pages/ContactsPage';
import { SafetyPage } from '@/pages/SafetyPage';
import { SharePage } from '@/pages/SharePage';

function AppRoutes() {
  const { route } = useRouter();
  const { user, loading, passwordRecovery } = useAuth();

  // Public routes: share link viewer
  if (route.name === 'share') {
    return <SharePage token={route.token} />;
  }

  // Password recovery takes priority — user has a valid recovery session
  // but needs to set a new password before accessing the app
  if (passwordRecovery) {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <AuthPage />;
  }

  // Protected routes
  const page = (() => {
    switch (route.name) {
      case 'dashboard':
        return <DashboardPage />;
      case 'explore':
        return <ExplorePage />;
      case 'trips':
        return <TripsPage />;
      case 'trip-detail':
        return <TripDetailPage tripId={route.id} />;
      case 'budget':
        return <BudgetPage />;
      case 'profile':
        return <ProfilePage />;
      case 'contacts':
        return <ContactsPage />;
      case 'safety':
        return <SafetyPage />;
      case 'favorites':
        return <ExplorePage />;
      default:
        return <DashboardPage />;
    }
  })();

  return <AppLayout currentRoute={route.name}>{page}</AppLayout>;
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
