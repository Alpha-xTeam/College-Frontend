import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SchedulePage = lazy(() => import('@/pages/SchedulePage').then(m => ({ default: m.SchedulePage })));
const RoomsPage = lazy(() => import('@/pages/RoomsPage').then(m => ({ default: m.RoomsPage })));
const ClassroomsPage = lazy(() => import('@/pages/ClassroomsPage').then(m => ({ default: m.ClassroomsPage })));
const AttendancePage = lazy(() => import('@/pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })));
const DepartmentDetailsPage = lazy(() => import('@/pages/DepartmentDetailsPage').then(m => ({ default: m.DepartmentDetailsPage })));
const RoomPublicSchedulePage = lazy(() => import('@/pages/RoomPublicSchedulePage').then(m => ({ default: m.RoomPublicSchedulePage })));
const GeneralPage = lazy(() => import('@/pages/GeneralPage').then(m => ({ default: m.GeneralPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AnnouncementsPage = lazy(() => import('@/pages/AnnouncementsPage'));
const TeachersPage = lazy(() => import('@/pages/TeachersPage'));

import type { UserRole } from '@/types';
import type { ReactNode } from 'react';

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: UserRole[] }) {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" state={{ from: location.pathname + location.search }} replace />;
  }
  
  // If student haven't changed password, force redirect to reset-password
  if (currentUser.role === 'student' && !currentUser.password_changed) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  if (isAuthenticated) return <Navigate to={from} replace />;
  return <>{children}</>;
}

// Loading component for Suspense
function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/general" element={<GeneralPage />} />
        <Route path="/rooms" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod']}>
            <RoomsPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student']}>
            <SchedulePage />
          </ProtectedRoute>
        } />
        <Route path="/classrooms" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student']}>
            <ClassroomsPage />
          </ProtectedRoute>
        } />
        <Route path="/attendance" element={
          <ProtectedRoute allowedRoles={['owner', 'teacher', 'student']}>
            <AttendancePage />
          </ProtectedRoute>
        } />
        <Route path="/departments/:id" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod']}>
            <DepartmentDetailsPage />
          </ProtectedRoute>
        } />
        <Route path="/departments" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod']}>
            <DepartmentsPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/teachers" element={
          <ProtectedRoute allowedRoles={['owner', 'dean']}>
            <TeachersPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student']}>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/announcements" element={
          <ProtectedRoute allowedRoles={['owner', 'dean', 'supervisor', 'hod', 'teacher', 'student']}>
            <AnnouncementsPage />
          </ProtectedRoute>
        } />
        <Route path="/room/:id" element={<RoomPublicSchedulePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
