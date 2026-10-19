import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Feed from './pages/Feed';
import PathFinder from './pages/PathFinder';
import Explore from './pages/Explore';
import PlaceholderPage from './pages/PlaceholderPage';
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
            <PlaceholderPage
              title="BT5: Phân tích ảnh hưởng & Lan truyền"
              description="Xếp hạng PageRank, phát hiện cộng đồng WCC và truy vết cây lan truyền chia sẻ."
              sprint="Sprint 2 - 3"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['analyst', 'admin']}>
            <PlaceholderPage
              title="Thống kê tổng quan & Bậc mạng lưới"
              description="Tổng quan quy mô node/edge, phân phối bậc và nhật ký hoạt động hệ thống."
              sprint="Sprint 3"
            />
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
            <PlaceholderPage
              title="Nhập / Xuất dữ liệu & Kiểm tra toàn vẹn"
              description="Import/Export CSV/JSON, chạy kiểm tra 9 ràng buộc toàn vẹn dữ liệu."
              sprint="Sprint 3"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/backup',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <PlaceholderPage
              title="Sao lưu & Phục hồi CSDL"
              description="Quy trình 4 bước: Sao lưu -> Xóa trắng đồ thị -> Phục hồi -> Đối chiếu số node/cạnh."
              sprint="Sprint 3"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/audit',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <PlaceholderPage
              title="Nhật ký thao tác hệ thống (Audit Log)"
              description="Theo dõi toàn bộ lịch sử các tác vụ ghi (POST/PUT/PATCH/DELETE) trên hệ thống."
              sprint="Sprint 3"
            />
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
