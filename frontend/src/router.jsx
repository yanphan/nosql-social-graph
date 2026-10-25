import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Feed from './pages/Feed';
import PathFinder from './pages/PathFinder';
import Explore from './pages/Explore';
import PlaceholderPage from './pages/PlaceholderPage';
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
        element: (
          <PlaceholderPage
            title="BT2: Chủ đề nóng (Trending Topics)"
            description="Thống kê các chủ đề có lượng tương tác Like/Comment/Share cao nhất theo mốc 1, 7, 30 ngày."
            sprint="Sprint 2"
          />
        ),
      },
      {
        path: 'discover',
        element: (
          <PlaceholderPage
            title="BT3 & BT4: Gợi ý bạn bè & Bài viết"
            description="Tìm bạn chung (FOAF), gợi ý kết nối và phân phối bài viết theo điểm sở thích."
            sprint="Sprint 2"
          />
        ),
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
            <PlaceholderPage
              title="Quản trị người dùng"
              description="Danh sách tài khoản, tạo mới, khóa/mở khóa tài khoản và phân quyền."
              sprint="Sprint 1"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/topics',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <PlaceholderPage
              title="Quản trị chủ đề"
              description="Thêm, sửa, xóa các nhãn chủ đề và danh mục quan tâm."
              sprint="Sprint 1"
            />
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
