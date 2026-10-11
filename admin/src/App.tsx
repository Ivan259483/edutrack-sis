import { LoginRedirect, RequireAdmin, SessionProvider } from '@/auth/session';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PageLoading } from '@/components/shared/PageLoading';
import { Toaster } from '@/components/ui/sonner';
import { RemoteAdminProvider } from '@/data/remote';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
const Dashboard = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const Students = lazy(() =>
  import('@/pages/StudentDirectoryPage').then((m) => ({
    default: m.StudentDirectoryPage,
  }))
);
const Enrollment = lazy(() =>
  import('@/pages/EnrollmentPage').then((m) => ({ default: m.EnrollmentPage }))
);
const Grades = lazy(() =>
  import('@/pages/AcademicRecordsPage').then((m) => ({
    default: m.AcademicRecordsPage,
  }))
);
const Schedules = lazy(() =>
  import('@/pages/ClassSchedulesPage').then((m) => ({
    default: m.ClassSchedulesPage,
  }))
);
const Announcements = lazy(() =>
  import('@/pages/AnnouncementsPage').then((m) => ({
    default: m.AnnouncementsPage,
  }))
);
const Helpdesk = lazy(() =>
  import('@/pages/SupportHelpdeskPage').then((m) => ({
    default: m.SupportHelpdeskPage,
  }))
);
const Settings = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="enrollment" element={<Enrollment />} />
          <Route path="grades" element={<Grades />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="helpdesk" element={<Helpdesk />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <RemoteAdminProvider>
            <Suspense fallback={<PageLoading />}>
              <AdminRoutes />
            </Suspense>
          </RemoteAdminProvider>
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
