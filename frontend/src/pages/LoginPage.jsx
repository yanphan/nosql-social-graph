import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Network,
} from 'lucide-react';
import { authService, homePathFor } from '@/services/auth';

// Lý do bị đưa về trang đăng nhập (do api.js gắn vào URL)
const REASONS = {
  expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  locked: 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên để được hỗ trợ.',
};

// Tài khoản có sẵn sau khi seed (database/seed/config.js)
const DEMO_PASSWORD = 'Passw0rd!';
const DEMO_ACCOUNTS = [
  { username: 'admin', label: 'Quản trị viên' },
  { username: 'alice', label: 'Người dùng' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(() => REASONS[searchParams.get('reason')] ?? '');
  const [successMsg, setSuccessMsg] = useState('');
  const [signedIn] = useState(() => authService.getStoredUser());

  const [form, setForm] = useState({
    username: '',
    password: '',
    remember: true,
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập');
      return;
    }
    if (!form.password) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({
        username: form.username,
        password: form.password,
        remember: form.remember,
      });
      setSuccessMsg(`Chào mừng trở lại, ${res.user.fullName || res.user.username}!`);
      // Mỗi vai trò vào đúng giao diện của mình
      setTimeout(() => navigate(homePathFor(res.user.role), { replace: true }), 500);
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập không thành công');
      setLoading(false);
    }
  };

  // Đã đăng nhập thì không ở lại trang đăng nhập
  if (signedIn) return <Navigate to={homePathFor(signedIn.role)} replace />;

  return (
    <div className="relative min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center text-slate-800 antialiased font-sans px-4 py-10">
      {/* Login Card đặt ngay trung tâm quang học (nâng nhẹ lên để cân đối thị giác) */}
      <div className="w-full max-w-[440px] -translate-y-4 sm:-translate-y-8">
          {/* Brand */}
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] ring-4 ring-white">
              <Network className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Đăng nhập FalkorDB
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Truy cập vào mạng xã hội và đồ thị tri thức
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-slate-100/90">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-2 text-emerald-700 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Tên đăng nhập */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-1">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Nhập username (vd: alice, admin...)"
                    className="w-full h-11 pl-10 pr-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] focus:bg-white rounded-2xl text-xs text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 bg-[#F8FAFC] hover:bg-[#F1F5F9] focus:bg-white rounded-2xl text-xs text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Ghi nhớ đăng nhập */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                  className="w-4 h-4 rounded-lg text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              {/* Nút Đăng nhập */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(37,99,235,0.25)] transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tài khoản demo: bấm để điền sẵn vào form */}
          <div className="mt-4 bg-white/70 rounded-3xl p-4 border border-slate-100/90">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tài khoản demo</span>
              <span className="text-[11px] text-slate-500">
                Mật khẩu: <code className="font-mono font-semibold text-slate-700">{DEMO_PASSWORD}</code>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, username: acc.username, password: DEMO_PASSWORD }));
                    setErrorMsg('');
                  }}
                  className="text-left px-3 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-800">{acc.username}</div>
                  <div className="text-[11px] text-slate-500">{acc.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* Footer cố định góc đáy */}
      <div className="absolute bottom-5 inset-x-0 text-center text-[11px] text-slate-400">
        © 2024 NoSQL Social Graph Network
      </div>
    </div>
  );
}
