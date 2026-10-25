import { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  MessageSquare,
  Tag,
  Share2,
  ExternalLink,
  RefreshCw,
  Database,
  Layers,
  Network,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { http } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const browserUrl = import.meta.env.VITE_BROWSER_URL || 'http://localhost:3000';

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await http.get('/stats');
      setStats(data);
    } catch (err) {
      setError(err.message || 'Không thể tải số liệu thống kê hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalNodes = stats?.totalNodes || 0;
  const totalEdges = stats?.totalEdges || 0;
  const nodeCounts = stats?.nodes || {};
  const edgeCounts = stats?.edges || {};
  const degreeBuckets = stats?.degreeBuckets || [];
  const currentScale = stats?.scale || 'S';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surfaceBorder">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Activity className="w-5 h-5 text-user" />
            Bảng điều khiển & Thống kê đồ thị (Dashboard)
          </h1>
          <p className="text-xs text-muted mt-1">
            Sprint 3 (UC-16): Thống kê tổng thể quy mô mạng xã hội, phân phối bậc đồ thị và kết nối FalkorDB Browser.
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-medium transition-all shadow-glow disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Nodes */}
        <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs">Tổng số Node</span>
            <Database className="w-4 h-4 text-user" />
          </div>
          <p className="text-xl font-extrabold text-ink mt-1">
            {totalNodes.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Đỉnh đồ thị</p>
        </div>

        {/* Total Edges */}
        <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs">Tổng số Cạnh</span>
            <Network className="w-4 h-4 text-post" />
          </div>
          <p className="text-xl font-extrabold text-post mt-1">
            {totalEdges.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Quan hệ liên kết</p>
        </div>

        {/* Users */}
        <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs">Người dùng</span>
            <Users className="w-4 h-4 text-user" />
          </div>
          <p className="text-xl font-extrabold text-ink mt-1">
            {(nodeCounts['User'] || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Node nhãn :User</p>
        </div>

        {/* Posts */}
        <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs">Bài viết</span>
            <MessageSquare className="w-4 h-4 text-topic" />
          </div>
          <p className="text-xl font-extrabold text-ink mt-1">
            {(nodeCounts['Post'] || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted mt-0.5">Node nhãn :Post</p>
        </div>

        {/* Scale Badge */}
        <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted mb-1">
            <span className="text-xs">Quy mô hiện tại</span>
            <Layers className="w-4 h-4 text-good" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-extrabold text-good">Scale {currentScale}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-good/20 text-good font-mono uppercase font-bold">
              {currentScale === 'L' ? 'Large' : currentScale === 'M' ? 'Medium' : 'Small'}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">Hệ thống đồ thị</p>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DEGREE DISTRIBUTION HISTOGRAM */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
          <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
            <div>
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Network className="w-4 h-4 text-user" />
                Biểu đồ phân phối bậc người dùng (Degree Distribution)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Kiểm chứng đặc trưng phân phối luỹ thừa (Power Law / Scale-Free) của mô hình Barabási–Albert.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {degreeBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={degreeBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="degree"
                    stroke="#8B93B0"
                    fontSize={11}
                    tickFormatter={(v) => `k=${v}`}
                  />
                  <YAxis stroke="#8B93B0" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B1020',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} người dùng`, 'Số lượng']}
                    labelFormatter={(label) => `Bậc kết nối k = ${label}`}
                  />
                  <Bar dataKey="users" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted">
                Chưa có dữ liệu phân phối bậc
              </div>
            )}
          </div>
        </div>

        {/* RELATIONSHIP BREAKDOWN */}
        <div className="glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
          <div className="border-b border-surfaceBorder pb-3">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Share2 className="w-4 h-4 text-post" />
              Cơ cấu các loại quan hệ (Edges)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Phân bố số lượng quan hệ theo 6 loại cạnh chính.
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(edgeCounts).map(([type, count]) => {
              const pct = totalEdges > 0 ? Math.round((count / totalEdges) * 100) : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-ink font-medium">{type}</span>
                    <span className="text-muted font-mono">
                      {count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-user transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FALKORDB BROWSER PROMINENT LAUNCH CARD */}
      <div className="glass-panel p-5 rounded-2xl border border-topic/30 bg-topic/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-topic/20 border border-topic/30 flex items-center justify-center text-topic shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-ink">FalkorDB Browser Interface</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-good/20 text-good border border-good/30">
                CỔNG 3000 SẴN SÀNG
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Khám phá đồ thị trực quan, thực thi truy vấn openCypher tùy biến, xem schema và đồ thị mạng 3D trực tiếp trên công cụ quản trị chính thức của FalkorDB.
            </p>
          </div>
        </div>

        <a
          href={browserUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs bg-topic text-white hover:bg-topic/90 font-bold transition-all shadow-glow shrink-0"
        >
          <span>Mở FalkorDB Browser</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
