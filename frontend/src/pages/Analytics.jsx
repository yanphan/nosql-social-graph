import { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  GitBranch,
  RefreshCw,
  Trophy,
  Globe,
  Share2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { http } from '../api/client';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('influence');

  // --- Influence state ---
  const [metric, setMetric] = useState('pagerank');
  const [influenceLimit, setInfluenceLimit] = useState(10);
  const [influenceList, setInfluenceList] = useState([]);
  const [influenceLoading, setInfluenceLoading] = useState(false);
  const [influenceError, setInfluenceError] = useState('');

  // --- Communities state ---
  const [communitiesData, setCommunitiesData] = useState(null);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesError, setCommunitiesError] = useState('');

  // --- Spread Tree state ---
  const [postId, setPostId] = useState('post_mock_1');
  const [spreadData, setSpreadData] = useState(null);
  const [spreadLoading, setSpreadLoading] = useState(false);
  const [spreadError, setSpreadError] = useState('');

  // Load Influence
  const loadInfluence = async () => {
    setInfluenceLoading(true);
    setInfluenceError('');
    try {
      const data = await http.get('/analytics/influence', {
        params: { metric, limit: influenceLimit },
      });
      setInfluenceList(Array.isArray(data) ? data : []);
    } catch (err) {
      setInfluenceError(err.message || 'Không thể tải bảng xếp hạng ảnh hưởng');
    } finally {
      setInfluenceLoading(false);
    }
  };

  // Load Communities
  const loadCommunities = async () => {
    setCommunitiesLoading(true);
    setCommunitiesError('');
    try {
      const data = await http.get('/analytics/communities');
      setCommunitiesData(data);
    } catch (err) {
      setCommunitiesError(err.message || 'Không thể phát hiện cộng đồng mạng');
    } finally {
      setCommunitiesLoading(false);
    }
  };

  // Load Spread Tree
  const loadSpreadTree = async (id = postId) => {
    if (!id.trim()) return;
    setSpreadLoading(true);
    setSpreadError('');
    try {
      const data = await http.get(`/analytics/spread/${id.trim()}`);
      setSpreadData(data);
    } catch (err) {
      setSpreadError(err.message || 'Không thể dựng cây lan truyền bài viết');
      setSpreadData(null);
    } finally {
      setSpreadLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'influence') loadInfluence();
    if (activeTab === 'communities') loadCommunities();
    if (activeTab === 'spread') loadSpreadTree();
  }, [activeTab, metric, influenceLimit]);

  // Recursive Tree Node Renderer for Spread Tree
  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;
    return (
      <div key={node.userId || node.user} className="ml-4 pl-3 border-l-2 border-user/30 my-2 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-user/20 border border-user/40 flex items-center justify-center text-[10px] font-bold text-user">
            {depth === 0 ? 'Root' : `G${depth}`}
          </div>
          <span className="font-semibold text-xs text-ink">{node.user}</span>
          {depth === 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-topic/20 text-topic border border-topic/30 font-medium">
              Tác giả gốc
            </span>
          )}
          {node.at && (
            <span className="text-[10px] text-muted">
              {new Date(node.at).toLocaleTimeString()}
            </span>
          )}
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surfaceBorder">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-user" />
            Phân tích mạng lưới nâng cao (BT5)
          </h1>
          <p className="text-xs text-muted mt-1">
            Sprint 2 & 3 (UC-13, UC-14): Xếp hạng ảnh hưởng PageRank, phân cụm WCC và truy vết cây lan truyền chia sẻ.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-surfaceBorder self-start">
          <button
            onClick={() => setActiveTab('influence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'influence'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Người ảnh hưởng
          </button>
          <button
            onClick={() => setActiveTab('communities')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'communities'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Cộng đồng WCC
          </button>
          <button
            onClick={() => setActiveTab('spread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'spread'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Cây lan truyền
          </button>
        </div>
      </div>

      {/* TAB 1: INFLUENCE RANKING */}
      {activeTab === 'influence' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink">Tiêu chí xếp hạng:</span>
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-surfaceBorder">
                <button
                  onClick={() => setMetric('pagerank')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    metric === 'pagerank'
                      ? 'bg-user text-white shadow-glow'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  PageRank (Native Graph Algo)
                </button>
                <button
                  onClick={() => setMetric('followers')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    metric === 'followers'
                      ? 'bg-user text-white shadow-glow'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Số người theo dõi (In-Degree)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={influenceLimit}
                onChange={(e) => setInfluenceLimit(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none focus:border-user"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
              </select>

              <button
                onClick={loadInfluence}
                disabled={influenceLoading}
                className="p-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted hover:text-ink border border-surfaceBorder transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${influenceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {influenceError && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{influenceError}</span>
            </div>
          )}

          {/* Top 3 Podium */}
          {influenceList.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Silver (Hạng 2) */}
              <div className="glass-panel p-4 rounded-xl border border-surfaceBorder flex flex-col items-center text-center order-2 sm:order-1">
                <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-400/40 mb-2">
                  #2
                </div>
                <h4 className="font-semibold text-sm text-ink">{influenceList[1].fullName || influenceList[1].username}</h4>
                <p className="text-xs text-muted font-mono">@{influenceList[1].username}</p>
                <div className="mt-2 text-xs font-bold text-user">
                  {metric === 'pagerank'
                    ? (influenceList[1].score || 0).toFixed(4)
                    : `${influenceList[1].inDegree || influenceList[1].score || 0} followers`}
                </div>
              </div>

              {/* Gold (Hạng 1) */}
              <div className="glass-panel p-5 rounded-2xl border border-topic/40 bg-topic/5 flex flex-col items-center text-center order-1 sm:order-2 shadow-glow">
                <div className="w-12 h-12 rounded-full bg-topic/20 text-topic font-bold flex items-center justify-center text-base border border-topic/40 mb-2">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base text-ink">{influenceList[0].fullName || influenceList[0].username}</h4>
                <p className="text-xs text-topic font-mono">@{influenceList[0].username}</p>
                <div className="mt-2 text-sm font-extrabold text-topic">
                  {metric === 'pagerank'
                    ? (influenceList[0].score || 0).toFixed(4)
                    : `${influenceList[0].inDegree || influenceList[0].score || 0} followers`}
                </div>
              </div>

              {/* Bronze (Hạng 3) */}
              <div className="glass-panel p-4 rounded-xl border border-surfaceBorder flex flex-col items-center text-center order-3 sm:order-3">
                <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-500 font-bold flex items-center justify-center text-sm border border-amber-700/40 mb-2">
                  #3
                </div>
                <h4 className="font-semibold text-sm text-ink">{influenceList[2].fullName || influenceList[2].username}</h4>
                <p className="text-xs text-muted font-mono">@{influenceList[2].username}</p>
                <div className="mt-2 text-xs font-bold text-user">
                  {metric === 'pagerank'
                    ? (influenceList[2].score || 0).toFixed(4)
                    : `${influenceList[2].inDegree || influenceList[2].score || 0} followers`}
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="glass-panel rounded-2xl border border-surfaceBorder overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surfaceBorder text-muted uppercase text-[10px] tracking-wider bg-surface/30">
                    <th className="py-2.5 px-3">Thứ hạng</th>
                    <th className="py-2.5 px-3">Người dùng</th>
                    <th className="py-2.5 px-3">Vai trò</th>
                    <th className="py-2.5 px-3">Quốc gia</th>
                    <th className="py-2.5 px-3 text-right">Điểm ảnh hưởng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder/40">
                  {influenceList.map((u, idx) => (
                    <tr key={u.id || u.username} className="hover:bg-surface/50 transition-all">
                      <td className="py-2.5 px-3 font-bold text-ink">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <div>
                          <span className="font-semibold text-ink">{u.fullName || u.username}</span>
                          <span className="text-muted ml-1.5 font-mono">@{u.username}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-surfaceBorder text-muted">
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted">{u.country || 'Vietnam'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-user">
                        {metric === 'pagerank' ? Number(u.score || 0).toFixed(4) : (u.inDegree || u.score || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNITIES (WCC) */}
      {activeTab === 'communities' && (
        <div className="space-y-4">
          {communitiesError && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{communitiesError}</span>
            </div>
          )}

          {communitiesData && (
            <div className="space-y-4">
              <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-ink">
                    Phát hiện {communitiesData.count || communitiesData.communities?.length || 0} cộng đồng liên thông yếu (WCC)
                  </h3>
                  <p className="text-xs text-muted">
                    Thuật toán phân tích thành phần liên thông trên đồ thị quan hệ FOLLOWS của người dùng.
                  </p>
                </div>
                <button
                  onClick={loadCommunities}
                  disabled={communitiesLoading}
                  className="p-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted hover:text-ink border border-surfaceBorder"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${communitiesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Grid of Communities */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(communitiesData.communities || []).map((comm) => (
                  <div
                    key={comm.id}
                    className="glass-panel p-4 rounded-xl border border-surfaceBorder space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-surfaceBorder/40 pb-2">
                      <span className="font-bold text-sm text-ink flex items-center gap-2">
                        <Users className="w-4 h-4 text-user" />
                        Cộng đồng #{comm.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-user/20 text-user border border-user/30">
                        {comm.size} thành viên
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-muted block mb-1.5">
                        Thành viên tiêu biểu (Core Users):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(comm.top || []).map((m) => (
                          <span
                            key={m.id || m.username}
                            className="px-2 py-0.5 rounded bg-surface border border-surfaceBorder text-ink text-xs font-mono"
                          >
                            @{m.username}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPREAD TREE */}
      {activeTab === 'spread' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-ink">Mã bài viết (Post ID):</span>
            <input
              type="text"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="post_mock_1..."
              className="px-3 py-1.5 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user min-w-[200px]"
            />
            <button
              onClick={() => loadSpreadTree(postId)}
              disabled={spreadLoading}
              className="px-3 py-1.5 rounded-xl bg-user text-white hover:bg-user/90 font-medium text-xs transition-all shadow-glow flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${spreadLoading ? 'animate-spin' : ''}`} />
              <span>Dựng cây lan truyền</span>
            </button>
          </div>

          {spreadError && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{spreadError}</span>
            </div>
          )}

          {spreadData && (
            <div className="glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surfaceBorder/50 pb-3">
                <div>
                  <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-post" />
                    Cây phân cấp lan truyền chia sẻ (Share Cascade)
                  </h3>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">
                    "{spreadData.post?.content || 'Bài viết được chia sẻ'}"
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    Lượt chia sẻ: <strong className="text-ink">{spreadData.total}</strong>
                  </div>
                  <div>
                    Độ sâu tối đa: <strong className="text-post">{spreadData.depth} tầng</strong>
                  </div>
                </div>
              </div>

              {/* Render Tree */}
              <div className="p-3 rounded-xl bg-surface border border-surfaceBorder max-h-96 overflow-y-auto">
                {renderTreeNode(spreadData.tree, 0)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
