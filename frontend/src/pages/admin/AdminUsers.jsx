import { useState, useEffect } from 'react';
import { Users, Search, Shield, Lock, Unlock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { http } from '../../api/client';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const limit = 15;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await http.get('/users', { params: { page, limit } });
      setUsers(data.users || data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await http.patch(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err.message || 'Không thể đổi vai trò');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'locked' ? 'active' : 'locked';
    try {
      await http.patch(`/users/${userId}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
    } catch (err) {
      alert(err.message || 'Không thể đổi trạng thái');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-surfaceBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-danger font-semibold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-danger" />
            Quản trị Hệ thống (Admin Only)
          </div>
          <h1 className="text-xl font-bold text-ink">Quản lý Người dùng ({total.toLocaleString()} tài khoản)</h1>
          <p className="text-xs text-muted mt-1">
            Xem danh sách, phân quyền vai trò (RBAC) và khóa/mở khóa tài khoản
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc trang hiện tại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink placeholder-muted focus:border-user focus:outline-none w-52"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 glass-panel rounded-xl border border-surfaceBorder text-muted hover:text-ink transition-colors"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-surfaceBorder overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/70 border-b border-surfaceBorder text-muted uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-user" />
                    Đang nạp dữ liệu người dùng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-user/20 border border-user/40 flex items-center justify-center text-user font-bold text-xs shrink-0">
                          {u.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{u.fullName || u.username}</p>
                          <p className="text-[10px] text-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted">{u.email || '—'}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-surface border border-surfaceBorder text-ink text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-user"
                      >
                        <option value="user">User</option>
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'locked'
                            ? 'bg-danger/20 text-danger border border-danger/30'
                            : 'bg-accent/20 text-accent border border-accent/30'
                        }`}
                      >
                        {u.status === 'locked' ? 'Bị khóa' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleStatusToggle(u.id, u.status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          u.status === 'locked'
                            ? 'bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/30'
                            : 'bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/30'
                        }`}
                      >
                        {u.status === 'locked' ? (
                          <>
                            <Unlock className="w-3 h-3" /> Mở khóa
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Khóa tài khoản
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-surfaceBorder/60 flex items-center justify-between text-xs text-muted">
          <span>
            Trang {page} / {Math.ceil(total / limit) || 1} ({total.toLocaleString()} người dùng)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-surfaceBorder hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="p-1.5 rounded-lg border border-surfaceBorder hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
