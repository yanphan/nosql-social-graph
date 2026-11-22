import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import { authService, homePathFor } from '@/services/auth';

function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(false);

  useEffect(() => {
    setProgress(true);
    const timer = setTimeout(() => {
      setProgress(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!progress) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-transparent">
      <div className="h-full bg-[#2563EB] animate-in slide-in-from-left duration-300 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
    </div>
  );
}

const KNOWN_ROLES = ['user', 'admin'];

// Chỉ cho vào khi đã đăng nhập và đúng vai trò. Admin là thành viên có thêm quyền nên vào được cả "/". Mỗi lần vào, kiểm tra lại phiên với backend
// (vai trò hoặc trạng thái khóa có thể đã đổi từ phía quản trị).
function RequireRole({ roles, children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, user: null });

  useEffect(() => {
    let alive = true;
    authService.restoreSession().then((user) => alive && setState({ checking: false, user }));
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  if (state.checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F5F7FA] text-xs text-[#64748B]" role="status">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }
  if (!state.user) return <Navigate to="/login" replace />;
  // Vai trò không còn được hỗ trợ (vd. phiên cũ của vai trò đã bỏ): đăng xuất để tránh vòng chuyển hướng
  if (!KNOWN_ROLES.includes(state.user.role)) {
    authService.logout();
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(state.user.role)) return <Navigate to={homePathFor(state.user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteProgressBar />
      <Routes>
        <Route
          path="/"
          element={
            <RequireRole roles={['user', 'admin']}>
              <MainLayout />
            </RequireRole>
          }
        />
        <Route
          path="/suggestions"
          element={
            <RequireRole roles={['user', 'admin']}>
              <MainLayout view="suggestions" />
            </RequireRole>
          }
        />
        <Route
          path="/u/:username"
          element={
            <RequireRole roles={['user', 'admin']}>
              <MainLayout view="profile" />
            </RequireRole>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
