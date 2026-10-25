import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Feed from './pages/Feed';
import PathFinder from './pages/PathFinder';
import Explore from './pages/Explore';
import Trending from './pages/Trending';
import Discover from './pages/Discover';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTopics from './pages/admin/AdminTopics';
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import AdminData from './pages/admin/AdminData';
import AdminBackup from './pages/admin/AdminBackup';
import AdminAudit from './pages/admin/AdminAudit';
import Benchmark from './pages/Benchmark';
import { useAuth } from './store/auth';

function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Feed />,
      },
      {
        path: 'explore',
        element: <Explore />,
      },
      {
        path: 'path',
        element: <PathFinder />,
      },
      {
        path: 'trending',
        element: <Trending />,
      },
      {
        path: 'discover',
        element: <Discover />,
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={['analyst', 'admin']}>
            <Analytics />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['analyst', 'admin']}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'benchmark',
        element: (
          <ProtectedRoute allowedRoles={['analyst', 'admin']}>
            <Benchmark />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/topics',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminTopics />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/data',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminData />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/backup',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminBackup />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/audit',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAudit />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
