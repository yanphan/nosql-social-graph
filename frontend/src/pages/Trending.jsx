import { useState, useEffect } from 'react';
import { TrendingUp, Flame, ThumbsUp, MessageSquare, Share2, Calendar, RefreshCw } from 'lucide-react';
import { http } from '../api/client';

export default function Trending() {
  const [days, setDays] = useState(7);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const data = await http.get('/topics/trending', { params: { days, limit: 15 } });
      setTrending(data || []);
    } catch (err) {
      console.error('Fetch trending error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [days]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-surfaceBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-topic font-semibold text-xs uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-accent" />
            Bài toán đồ thị BT2 (UC-10)
          </div>
          <h1 className="text-xl font-bold text-ink">Chủ đề Thịnh hành (Trending Topics)</h1>
          <p className="text-xs text-muted mt-1">
            Xếp hạng chủ đề nóng theo công thức trọng số: <span className="font-mono text-ink">Score = 1×Like + 2×Comment + 3×Share</span>
          </p>
        </div>

        {/* Days selector */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-surfaceBorder shrink-0">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? 'bg-accent text-white shadow-glow'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {d === 1 ? '24 giờ qua' : `${d} ngày qua`}
            </button>
          ))}
          <button
            onClick={fetchTrending}
            className="p-1.5 text-muted hover:text-ink transition-colors ml-1"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Topics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-surfaceBorder animate-pulse h-36" />
          ))}
        </div>
      ) : trending.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-surfaceBorder text-muted">
          Chưa có tương tác nào trong khoảng thời gian này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((topic, idx) => (
            <div
              key={topic.id || topic.name}
              className="glass-panel p-5 rounded-2xl border border-surfaceBorder hover:border-topic/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                    'bg-surface text-muted border border-surfaceBorder'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-mono font-semibold text-accent">
                    {topic.interactions || topic.score || 0} điểm
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink">#{topic.name}</h3>
              </div>

              {/* Interaction breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-surfaceBorder/60 mt-3 text-center">
                <div className="bg-surface/50 p-1.5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted">
                    <ThumbsUp className="w-3 h-3 text-user" />
                    <span>{topic.likes || 0}</span>
                  </div>
                  <span className="text-[9px] text-muted block">Likes (1x)</span>
                </div>
                <div className="bg-surface/50 p-1.5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted">
                    <MessageSquare className="w-3 h-3 text-topic" />
                    <span>{topic.comments || 0}</span>
                  </div>
                  <span className="text-[9px] text-muted block">Comments (2x)</span>
                </div>
                <div className="bg-surface/50 p-1.5 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted">
                    <Share2 className="w-3 h-3 text-accent" />
                    <span>{topic.shares || 0}</span>
                  </div>
                  <span className="text-[9px] text-muted block">Shares (3x)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
