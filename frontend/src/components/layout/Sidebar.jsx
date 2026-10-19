import { NavLink } from 'react-router-dom';
import {
  Home,
  Network,
  GitCommit,
  TrendingUp,
  Compass,
  BarChart3,
  Users,
  Tag,
  Database,
  ShieldCheck,
  ExternalLink,
  History,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../store/auth';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'user';

  const userNav = [
    { to: '/', label: 'Bảng tin (Feed)', icon: Home },
    { to: '/explore', label: 'Khám phá mạng lưới', icon: Network },
    { to: '/path', label: 'Tìm đường đi (BT1)', icon: GitCommit },
    { to: '/trending', label: 'Chủ đề nóng (BT2)', icon: TrendingUp },
    { to: '/discover', label: 'Gợi ý kết nối (BT3/4)', icon: Compass },
  ];

  const analystNav = [
    { to: '/analytics', label: 'Phân tích mạng lưới (BT5)', icon: BarChart3 },
    { to: '/dashboard', label: 'Thống kê tổng quan', icon: Activity },
  ];

  const adminNav = [
    { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
    { to: '/admin/topics', label: 'Quản lý chủ đề', icon: Tag },
    { to: '/admin/data', label: 'Dữ liệu & Kiểm tra', icon: Database },
    { to: '/admin/backup', label: 'Sao lưu & Phục hồi', icon: ShieldCheck },
    { to: '/admin/audit', label: 'Nhật ký thao tác', icon: History },
  ];

  const browserUrl = import.meta.env.VITE_BROWSER_URL || 'http://localhost:3000';

  return (
    <aside className="w-64 glass-panel border-r border-surfaceBorder h-screen flex flex-col p-4 select-none shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-surfaceBorder">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white shadow-glow font-bold">
          FG
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-ink">FalkorDB Social</h1>
          <p className="text-xs text-muted">Graph Knowledge Lab</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* User section */}
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
            Mạng xã hội
          </p>
          <div className="space-y-1">
            {userNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-user text-white shadow-glow font-medium'
                        : 'text-muted hover:text-ink hover:bg-surface'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Analyst section */}
        {(role === 'analyst' || role === 'admin') && (
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
              Phân tích dữ liệu
            </p>
            <div className="space-y-1">
              {analystNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-user text-white shadow-glow font-medium'
                          : 'text-muted hover:text-ink hover:bg-surface'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin section */}
        {role === 'admin' && (
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
              Quản trị hệ thống
            </p>
            <div className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-user text-white shadow-glow font-medium'
                          : 'text-muted hover:text-ink hover:bg-surface'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FalkorDB Browser link for Analyst and Admin */}
      {(role === 'analyst' || role === 'admin') && (
        <div className="pt-3 border-t border-surfaceBorder mt-2">
          <a
            href={browserUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs bg-topic/10 text-topic hover:bg-topic/20 transition-all font-medium border border-topic/30"
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Mở FalkorDB Browser
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </aside>
  );
}
