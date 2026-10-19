import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { http } from '../api/client';
import { DEMO_PASSWORD } from '../../../database/seed/config.js';

export default function Login() {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('Passw0rd!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await http.post('/auth/login', { username, password });
      setAuth(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (uname) => {
    setUsername(uname);
    setPassword('Passw0rd!');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1E1B4B] via-bg to-bg">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative border border-surfaceBorder">
        {/* Glow behind */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-user/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-post/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <div className="w-14 h-14 rounded-2xl bg-accent mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-glow mb-4">
            FG
          </div>
          <h2 className="text-2xl font-bold text-ink">FalkorDB Social Graph</h2>
          <p className="text-xs text-muted mt-1">Đồ án NoSQL Graph Database - Nhóm 3 thành viên</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-sm focus:outline-none focus:border-user focus:ring-1 focus:ring-user transition-all"
              placeholder="admin, analyst, alice..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-sm focus:outline-none focus:border-user focus:ring-1 focus:ring-user transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-medium text-sm shadow-glow hover:opacity-95 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập vào hệ thống'}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="mt-8 pt-6 border-t border-surfaceBorder relative">
          <p className="text-xs text-muted text-center mb-3">Tài khoản demo sẵn có (mật khẩu: Passw0rd!):</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              className="px-2 py-2 rounded-xl bg-surface border border-surfaceBorder hover:border-danger/50 text-[11px] text-center transition-all"
            >
              <span className="block font-semibold text-danger">admin</span>
              <span className="text-[10px] text-muted">Quản trị viên</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('analyst')}
              className="px-2 py-2 rounded-xl bg-surface border border-surfaceBorder hover:border-topic/50 text-[11px] text-center transition-all"
            >
              <span className="block font-semibold text-topic">analyst</span>
              <span className="text-[10px] text-muted">Phân tích</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('alice')}
              className="px-2 py-2 rounded-xl bg-surface border border-surfaceBorder hover:border-user/50 text-[11px] text-center transition-all"
            >
              <span className="block font-semibold text-user">alice</span>
              <span className="text-[10px] text-muted">Người dùng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
