import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import AnalystPage from '@/pages/AnalystPage';

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

export default function App() {
  return (
    <BrowserRouter>
      <RouteProgressBar />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/analytics" element={<AnalystPage />} />
        <Route path="/analyst" element={<AnalystPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
