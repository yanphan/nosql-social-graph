import { useState, useEffect, useMemo } from 'react';
import {
  History,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Shield,
  FileText,
  X,
  AlertCircle,
} from 'lucide-react';
import { http } from '../../api/client';

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(100);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await http.get('/admin/audit', {
        params: { limit },
      });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải nhật ký thao tác hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [limit]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Method filter
      if (methodFilter !== 'ALL' && log.method !== methodFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === '2xx' && (log.status < 200 || log.status >= 300)) {
        return false;
      }
      if (statusFilter === '4xx' && (log.status < 400 || log.status >= 500)) {
        return false;
      }
      if (statusFilter === '5xx' && log.status < 500) {
        return false;
      }

      // Search query (user, path, ip)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = (log.user || '').toLowerCase().includes(q);
        const matchesPath = (log.path || '').toLowerCase().includes(q);
        const matchesIp = (log.ip || '').toLowerCase().includes(q);
        return matchesUser || matchesPath || matchesIp;
      }

      return true;
    });
  }, [logs, methodFilter, statusFilter, searchQuery]);

  // Statistics
  const totalLoaded = logs.length;
  const writeOpsCount = logs.filter((l) => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(l.method)).length;
  const errorCount = logs.filter((l) => l.status >= 400).length;
  const avgDuration =
    logs.length > 0
      ? Math.round(
          logs.reduce((acc, curr) => acc + (Number(curr.durationMs) || 0), 0) / logs.length
        )
      : 0;

  const getMethodBadge = (m) => {
    switch (m) {
      case 'POST':
        return 'bg-good/20 text-good border-good/30';
      case 'PUT':
      case 'PATCH':
        return 'bg-post/20 text-post border-post/30';
      case 'DELETE':
        return 'bg-danger/20 text-danger border-danger/30';
      case 'GET':
      default:
        return 'bg-surface text-muted border-surfaceBorder';
    }
  };

  const getStatusBadge = (s) => {
    if (s >= 200 && s < 300) return 'text-good';
    if (s >= 400 && s < 500) return 'text-topic font-semibold';
    if (s >= 500) return 'text-danger font-bold';
    return 'text-muted';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surfaceBorder">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <History className="w-5 h-5 text-user" />
            Nhật ký thao tác hệ thống (Audit Trail)
          </h1>
          <p className="text-xs text-muted mt-1">
            Sprint 3 (UC-16): Giám sát toàn bộ các tác vụ ghi (POST/PUT/DELETE) và lưu vết bảo mật hệ thống.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-medium transition-all shadow-glow disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới log</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-surfaceBorder">
          <span className="text-[11px] text-muted">Tổng số bản ghi</span>
          <p className="text-lg font-bold text-ink mt-0.5">{totalLoaded}</p>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-surfaceBorder">
          <span className="text-[11px] text-muted">Tác vụ ghi (Ghi vết)</span>
          <p className="text-lg font-bold text-good mt-0.5">{writeOpsCount}</p>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-surfaceBorder">
          <span className="text-[11px] text-muted">Phát hiện lỗi (4xx/5xx)</span>
          <p className="text-lg font-bold text-danger mt-0.5">{errorCount}</p>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-surfaceBorder">
          <span className="text-[11px] text-muted">Độ trễ trung bình</span>
          <p className="text-lg font-bold text-post mt-0.5">{avgDuration} ms</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo user, đường dẫn URL, địa chỉ IP..."
            className="w-full px-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none focus:border-user"
          >
            <option value="ALL">Mọi phương thức</option>
            <option value="POST">POST (Tạo mới)</option>
            <option value="PUT">PUT (Cập nhật)</option>
            <option value="DELETE">DELETE (Xóa)</option>
            <option value="GET">GET (Truy vấn)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none focus:border-user"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="2xx">2xx Thành công</option>
            <option value="4xx">4xx Lỗi client</option>
            <option value="5xx">5xx Lỗi máy chủ</option>
          </select>

          {/* Limit */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none focus:border-user"
          >
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
            <option value={200}>200 dòng</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-surfaceBorder overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surfaceBorder text-muted uppercase text-[10px] tracking-wider bg-surface/30">
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3">Phương thức</th>
                <th className="py-2.5 px-3">Đường dẫn (Endpoint)</th>
                <th className="py-2.5 px-3">Người thực hiện</th>
                <th className="py-2.5 px-3">Địa chỉ IP</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3">Độ trễ</th>
                <th className="py-2.5 px-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceBorder/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted">
                    {loading ? 'Đang tải dữ liệu log...' : 'Không tìm thấy bản ghi nhật ký phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-surface/50 transition-all">
                    <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-ink max-w-[220px] truncate">
                      {log.path}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ink">{log.user || 'anonymous'}</span>
                        {log.role && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-surface border border-surfaceBorder text-muted">
                            {log.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted">{log.ip || '127.0.0.1'}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={getStatusBadge(log.status)}>{log.status || 200}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted font-mono">{log.durationMs || 0} ms</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 rounded-lg text-[11px] bg-surface text-ink hover:bg-user hover:text-white transition-all border border-surfaceBorder"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-surfaceBorder p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-user" />
                Chi tiết bản ghi thao tác
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Thời điểm:</span>
                <span className="text-ink font-mono">
                  {selectedLog.timestamp
                    ? new Date(selectedLog.timestamp).toLocaleString()
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Phương thức & URL:</span>
                <span className="text-ink font-mono font-semibold">
                  {selectedLog.method} {selectedLog.path}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Người thực hiện:</span>
                <span className="text-ink font-medium">
                  {selectedLog.user} ({selectedLog.role || 'user'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Mã phản hồi HTTP:</span>
                <span className={`font-mono font-bold ${getStatusBadge(selectedLog.status)}`}>
                  {selectedLog.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Thời gian thực thi:</span>
                <span className="text-ink font-mono">{selectedLog.durationMs || 0} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surfaceBorder/40">
                <span className="text-muted">Client IP:</span>
                <span className="text-ink font-mono">{selectedLog.ip || '—'}</span>
              </div>
              <div>
                <span className="text-muted block mb-1">User Agent:</span>
                <p className="p-2 rounded-lg bg-surface font-mono text-[11px] text-muted break-all border border-surfaceBorder">
                  {selectedLog.userAgent || 'Không có dữ liệu'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-medium transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
