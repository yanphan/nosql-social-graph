import { useEffect, useState } from 'react';
import { Heart, MessageSquare, Share2, Sparkles, Send } from 'lucide-react';
import { http } from '../api/client';
import { timeAgo, formatNumber } from '../lib/format';
import { useAuth } from '../store/auth';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [newTopic, setNewTopic] = useState('nosql');
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const data = await http.get('/posts');
      setPosts(data.items || []);
    } catch (err) {
      console.error('Fetch feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      await http.post('/posts', {
        content: newContent,
        topics: [newTopic],
      });
      setNewContent('');
      fetchFeed();
    } catch (err) {
      alert(err.message || 'Lỗi khi đăng bài');
    }
  };

  const handleLike = async (postId, currentLiked) => {
    try {
      if (currentLiked) {
        await http.delete(`/posts/${postId}/like`);
      } else {
        await http.post(`/posts/${postId}/like`);
      }
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likedByMe: !currentLiked,
              likeCount: currentLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post Card */}
      <div className="glass-panel rounded-2xl p-5 border border-surfaceBorder">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-user/20 border border-user/40 flex items-center justify-center text-user font-bold text-xs">
            {user?.username?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-xs font-semibold text-ink">{user?.fullName || user?.username}</p>
            <p className="text-[10px] text-muted">Chia sẻ kiến thức lên mạng lưới</p>
          </div>
        </div>

        <form onSubmit={handleCreatePost}>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-surfaceBorder text-ink text-sm focus:outline-none focus:border-user transition-all resize-none placeholder:text-muted/60"
            placeholder="Bạn đang nghĩ gì về đồ thị tri thức hôm nay?..."
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Chủ đề:</span>
              <select
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surfaceBorder text-xs text-ink focus:outline-none focus:border-topic"
              >
                <option value="nosql">#nosql</option>
                <option value="ai">#ai</option>
                <option value="technology">#technology</option>
                <option value="music">#music</option>
                <option value="travel">#travel</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!newContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-user text-white text-xs font-medium shadow-glow hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Đăng bài
            </button>
          </div>
        </form>
      </div>

      {/* Feed Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 border border-surfaceBorder animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 bg-surface rounded" />
                  <div className="w-16 h-2 bg-surface rounded" />
                </div>
              </div>
              <div className="w-full h-12 bg-surface rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-surfaceBorder">
          <Sparkles className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm text-ink font-medium">Chưa có bài viết nào trong bảng tin</p>
          <p className="text-xs text-muted mt-1">Hãy đăng bài đầu tiên để bắt đầu kết nối!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="glass-panel glass-panel-hover rounded-2xl p-5 border border-surfaceBorder space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-user/20 border border-user/40 flex items-center justify-center text-user font-bold text-xs">
                    {post.author?.username?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-ink">{post.author?.fullName || post.author?.username}</span>
                    <span className="text-[11px] text-muted ml-1.5">@{post.author?.username}</span>
                    <p className="text-[10px] text-muted">{timeAgo(post.createdAt)}</p>
                  </div>
                </div>

                {/* Topics Tag */}
                <div className="flex items-center gap-1">
                  {post.topics?.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-topic/10 text-topic border border-topic/20"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.content}</p>

              {/* Action Buttons */}
              <div className="flex items-center gap-6 pt-2 border-t border-surfaceBorder/60 text-xs text-muted">
                <button
                  onClick={() => handleLike(post.id, post.likedByMe)}
                  className={`flex items-center gap-1.5 hover:text-danger transition-all ${
                    post.likedByMe ? 'text-danger font-semibold' : ''
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-danger text-danger' : ''}`} />
                  <span>{formatNumber(post.likeCount)}</span>
                </button>

                <button className="flex items-center gap-1.5 hover:text-post transition-all">
                  <MessageSquare className="w-4 h-4" />
                  <span>{formatNumber(post.commentCount)}</span>
                </button>

                <button className="flex items-center gap-1.5 hover:text-good transition-all">
                  <Share2 className="w-4 h-4" />
                  <span>{formatNumber(post.shareCount)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
