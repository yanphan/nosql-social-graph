import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../store/auth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    admin: 'bg-danger/20 text-danger border-danger/30',
    analyst: 'bg-topic/20 text-topic border-topic/30',
    user: 'bg-user/20 text-user border-user/30',
  };

  return (
    <header className="h-16 glass-panel border-b border-surfaceBorder px-6 flex items-center justify-between shrink-0">
      {/* Search trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {}}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-muted text-xs hover:border-user/40 transition-all w-64"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Tìm kiếm người dùng, chủ đề...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-bg text-[10px] font-mono border border-surfaceBorder">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* User profile & actions */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span
              className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                roleColors[user.role] || roleColors.user
              }`}
            >
              {user.role}
            </span>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-user/20 border border-user/40 flex items-center justify-center text-user font-bold text-xs">
                {user.username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-ink leading-tight">{user.fullName || user.username}</p>
                <p className="text-[10px] text-muted leading-tight">@{user.username}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl text-muted hover:text-danger hover:bg-surface transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-1.5 rounded-xl bg-user text-white text-xs font-medium shadow-glow hover:opacity-90 transition-all"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
