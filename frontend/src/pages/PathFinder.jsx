import { useState } from 'react';
import { Search, ArrowRight, Route, AlertCircle } from 'lucide-react';
import { http } from '../api/client';
import GraphCanvas from '../components/graph/GraphCanvas';

export default function PathFinder() {
  const [from, setFrom] = useState('alice');
  const [to, setTo] = useState('david');
  const [maxDepth, setMaxDepth] = useState(6);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!from || !to) return;
    setLoading(true);
    setError('');

    try {
      const data = await http.get('/path', {
        params: { from: from.trim(), to: to.trim(), maxDepth },
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Không thể tìm đường đi');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Search Header */}
      <div className="glass-panel rounded-2xl p-4 border border-surfaceBorder shrink-0">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-user" />
            <span className="font-semibold text-sm text-ink">BT1: Tìm đường đi ngắn nhất</span>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="User A (VD: alice)"
              className="px-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user flex-1"
            />
            <ArrowRight className="w-4 h-4 text-muted shrink-0" />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="User B (VD: david)"
              className="px-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Độ sâu max:</span>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d} bước
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-medium shadow-glow hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              {loading ? 'Đang duyệt...' : 'Tìm đường'}
            </button>
          </div>
        </form>

        {/* Result summary chip */}
        {result && (
          <div className="mt-3 pt-3 border-t border-surfaceBorder/60 flex items-center justify-between text-xs">
            {result.found ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-good/20 text-good border border-good/30 font-semibold text-[11px]">
                  Tìm thấy kết nối
                </span>
                <span className="text-ink">
                  Khoảng cách: <strong>{result.length} bước</strong> ({result.steps?.join(' ➔ ')})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted">
                <AlertCircle className="w-4 h-4 text-topic" />
                <span>Không tìm thấy đường đi giữa 2 người dùng trong phạm vi {maxDepth} bước.</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 pt-3 border-t border-surfaceBorder/60 text-xs text-danger flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Canvas container */}
      <div className="flex-1 glass-panel rounded-2xl border border-surfaceBorder relative overflow-hidden p-2">
        <GraphCanvas
          graph={result?.graph || { nodes: [], edges: [] }}
          highlight={result?.steps ? result.steps.map((u) => `usr_${u}`) : []}
        />
      </div>
    </div>
  );
}
