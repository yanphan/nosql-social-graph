import { useState, useEffect } from 'react';
import { Compass, Users, Sparkles, UserPlus, Heart, MessageSquare, Share2, Tag, RefreshCw } from 'lucide-react';
import { http } from '../api/client';

export default function Discover() {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'posts'
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({});

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') {
        const data = await http.get('/recommend/friends', { params: { limit: 12 } });
        setFriends(data || []);
      } else {
        const data = await http.get('/recommend/posts', { params: { limit: 12 } });
        setPosts(data || []);
      }
    } catch (err) {
      console.error('Fetch recommendations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab]);

  const handleFollow = async (userId) => {
    try {
      await http.post('/follow', { targetUserId: userId });
      setFollowingMap((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-surfaceBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-user font-semibold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4 text-user" />
            Bài toán đồ thị BT3 & BT4 (Lọc cộng tác Graph-based)
          </div>
          <h1 className="text-xl font-bold text-ink">Gợi ý Kết nối & Nội dung Cá nhân hóa</h1>
          <p className="text-xs text-muted mt-1">
            Sử dụng thuật toán Friend-of-Friends và độ tương đồng chủ đề sở thích (Interest overlap)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-surfaceBorder shrink-0">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Gợi ý bạn bè (BT3)
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'posts'
                ? 'bg-topic text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gợi ý bài viết (BT4)
          </button>
          <button
            onClick={fetchRecommendations}
            className="p-1.5 text-muted hover:text-ink transition-colors ml-1"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-surfaceBorder animate-pulse h-40" />
          ))}
        </div>
      ) : activeTab === 'friends' ? (
        /* BT3: Friend suggestions */
        friends.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-surfaceBorder text-muted">
            Chưa có gợi ý bạn bè nào tại thời điểm này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((f) => (
              <div
                key={f.id}
                className="glass-panel p-5 rounded-2xl border border-surfaceBorder hover:border-user/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-user/20 border border-user/40 flex items-center justify-center text-user font-bold text-sm">
                      {f.username?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-ink truncate">{f.fullName || f.username}</h3>
                      <p className="text-xs text-muted truncate">@{f.username}</p>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-user font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-user" />
                      {f.reason || `${f.mutual || 0} bạn chung`}
                    </div>
                    {f.sharedTopics > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-topic font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-topic" />
                        {f.sharedTopics} chủ đề cùng quan tâm
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleFollow(f.id)}
                  disabled={followingMap[f.id]}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                    followingMap[f.id]
                      ? 'bg-surface border border-surfaceBorder text-muted cursor-default'
                      : 'bg-user/20 text-user border border-user/40 hover:bg-user hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {followingMap[f.id] ? 'Đã theo dõi' : 'Theo dõi'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        /* BT4: Post suggestions */
        posts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-surfaceBorder text-muted">
            Chưa có gợi ý bài viết nào tại thời điểm này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((item, idx) => {
              const p = item.post || item.p || item;
              return (
                <div
                  key={p.id || idx}
                  className="glass-panel p-5 rounded-2xl border border-surfaceBorder hover:border-topic/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-topic/20 border border-topic/40 flex items-center justify-center text-topic font-bold text-xs">
                          {p.author?.username?.slice(0, 2).toUpperCase() || 'A'}
                        </div>
                        <span className="text-xs font-semibold text-ink">
                          @{p.author?.username || item.authorUsername || 'author'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted">
                        {p.createdAt ? new Date(Number(p.createdAt)).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>

                    <p className="text-xs text-ink line-clamp-3 mb-4 leading-relaxed">
                      {p.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-surfaceBorder/60 text-xs text-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-danger" />
                        {p.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-topic" />
                        {p.commentCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="w-3.5 h-3.5 text-accent" />
                        {p.shareCount || 0}
                      </span>
                    </div>

                    <div className="text-[10px] text-accent font-semibold bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                      Điểm phù hợp: {item.score?.toFixed ? item.score.toFixed(1) : item.score}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
