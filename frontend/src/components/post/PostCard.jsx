import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  CheckCircle2, 
  Send,
  X,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { postsService } from '@/services/posts';
import { getTopicColor } from '@/lib/topicColor';
import '@/styles/tokens.css';

export default function PostCard({ post, onTopicClick, currentUser, selectedTopic }) {
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [likeBounce, setLikeBounce] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentLikes, setCommentLikes] = useState({});
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(post.shareCount || 0);

  // Author & Topics normalization
  const authorFullName = post.author?.fullName || post.author?.username || 'Người dùng';
  const authorAvatar = post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username || post.author?.id || 'user'}&backgroundColor=b6e3f4`;
  const postTopics = (post.topics || []).map((t) => 
    typeof t === 'string' ? { id: t, name: t } : { id: t.id || t.name, name: t.name || t.id }
  );

  // Toggle Like with backend call & animation
  const handleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeBounce(true);
    setTimeout(() => setLikeBounce(false), 200);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      if (nextLiked) {
        await postsService.likePost(post.id);
      } else {
        await postsService.unlikePost(post.id);
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ like:', e.message);
    }
  };

  // Toggle Comments & fetch on demand
  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && !commentsLoaded) {
      setLoadingComments(true);
      try {
        const res = await postsService.getComments(post.id);
        if (res?.items) {
          setComments(res.items);
          setCommentsLoaded(true);
        }
      } catch (err) {
        console.warn('Lỗi lấy bình luận:', err.message);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  // Submit comment to backend
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const text = newComment.trim();
    setNewComment('');

    // Optimistic UI
    const optimisticCmt = {
      id: `cmt_${Date.now()}`,
      userId: currentUser?.id,
      username: currentUser?.username || 'me',
      author: currentUser,
      content: text,
      text,
      createdAt: Date.now(),
      at: Date.now(),
      likeCount: 0,
    };
    setComments((prev) => [optimisticCmt, ...prev]);
    setShowComments(true);
    setCommentsLoaded(true);

    try {
      await postsService.addComment(post.id, text);
    } catch (err) {
      console.warn('Lỗi gửi bình luận đến backend:', err.message);
    }
  };

  // Share post
  const handleShare = async () => {
    setShareCount((c) => c + 1);
    try {
      await postsService.sharePost(post.id, 'web');
    } catch (err) {
      console.warn('Lỗi share:', err.message);
    }
  };

  // Format thời gian ngắn gọn
  const formatTime = (epochMs) => {
    if (!epochMs) return 'Vừa xong';
    const diff = Date.now() - epochMs;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const totalCommentCount = Math.max(post.commentCount || 0, comments.length);

  return (
    <article className="bg-white rounded-[16px] p-5 sm:p-6 border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5 animate-fade-up">
      {/* 1. HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={authorAvatar}
            alt={authorFullName}
            className="w-10 h-10 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0] shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 
                className="font-semibold text-[15px] text-[#0F172A] hover:text-[#2563EB] cursor-pointer leading-snug tracking-tight"
              >
                {authorFullName}
              </h3>
              
              {post.author?.isVerified === true && (
                <CheckCircle2 className="h-4 w-4 text-[#2563EB] fill-[#EFF4FF] shrink-0" title="Tài khoản đã xác minh" />
              )}

              {likeCount >= 10 && (
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-[#EFF4FF] text-[#2563EB] border border-[#2563EB]/20">
                  Nổi bật
                </span>
              )}
            </div>
            
            <div className="text-[13px] text-[#64748B] mt-0.5 font-normal">
              <span>{formatTime(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 3-dot Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="h-8 w-8 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 flex items-center justify-center transition-colors duration-150 btn-press"
              title="Tùy chọn bài viết"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white text-[#475569] shadow-md border border-[#E5E9F0] rounded-[12px] p-1.5 animate-in fade-in zoom-in-95 duration-120">
            <DropdownMenuItem 
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs cursor-pointer rounded-lg font-medium py-2"
            >
              {copied ? '✓ Đã sao chép liên kết' : 'Sao chép liên kết'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setBookmarked(!bookmarked)}
              className="text-xs cursor-pointer rounded-lg font-medium py-2"
            >
              {bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E5E9F0] my-1" />
            <DropdownMenuItem className="text-xs text-rose-600 cursor-pointer rounded-lg font-medium py-2 hover:bg-rose-50">
              Báo cáo bài viết
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="space-y-3">
        <p className="text-[15px] text-[#0F172A] leading-[1.65] font-normal whitespace-pre-line tracking-normal">
          {post.content}
        </p>

        {/* Hashtag chips */}
        {postTopics.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {postTopics.map((topic) => {
              const isActive = selectedTopic === topic.name;
              const dotColor = getTopicColor(topic.name);

              return (
                <button
                  key={topic.id || topic.name}
                  onClick={() => onTopicClick?.(isActive ? null : topic.name)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 border transition-all duration-150 btn-press ${
                    isActive
                      ? 'bg-[#EFF4FF] text-[#2563EB] border-[#2563EB]/40 shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E5E9F0] hover:bg-[#EFF4FF] hover:text-[#2563EB] hover:border-[#2563EB]/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                  <span>#{topic.name}</span>
                  {isActive && <X className="h-3 w-3 text-[#2563EB]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ACTION ROW */}
      <div className="flex items-center gap-1 pt-1 border-t border-[#E5E9F0]">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press ${
            liked
              ? 'text-[#2563EB] bg-[#EFF4FF]'
              : 'text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF4FF]'
          }`}
          title="Thích"
        >
          <Heart 
            className={`h-4 w-4 transition-transform duration-150 ease-out motion-reduce:transition-none ${
              liked ? 'fill-[#2563EB] text-[#2563EB]' : 'text-[#64748B]'
            } ${likeBounce ? 'scale-125' : 'scale-100'}`} 
          />
          <span className={`tabular-nums ${liked ? 'text-[#2563EB] font-semibold' : 'text-[#64748B]'}`}>
            {likeCount > 0 ? likeCount : ''}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={handleToggleComments}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press ${
            showComments
              ? 'text-[#2563EB] bg-[#EFF4FF]'
              : 'text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF4FF]'
          }`}
          title="Bình luận"
          aria-label="Bình luận"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{totalCommentCount}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF4FF] flex items-center gap-1.5 transition-colors duration-150 btn-press"
          title="Chia sẻ"
        >
          <Share2 className="h-4 w-4" />
          {shareCount > 0 && <span className="tabular-nums">{shareCount}</span>}
        </button>

        <div className="flex-1" />

        {/* Bookmark Button */}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-colors duration-150 btn-press ${
            bookmarked 
              ? 'text-[#2563EB] bg-[#EFF4FF]' 
              : 'text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF4FF]'
          }`}
          title={bookmarked ? 'Bỏ lưu' : 'Lưu'}
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-[#2563EB]' : ''}`} />
        </button>
      </div>

      {/* 4. EXPANDED COMMENTS */}
      {showComments && (
        <div className="pt-3 border-t border-[#E5E9F0] space-y-3">
          {/* Form nhập comment */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2.5">
            <img
              src={currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=You'}
              alt="You"
              className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100 ring-1 ring-white border border-[#E5E9F0]"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận của bạn..."
                className="w-full h-9 pl-3.5 pr-10 bg-white rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#64748B] border border-[#E5E9F0] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all duration-150"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-30 disabled:hover:bg-[#2563EB] text-white flex items-center justify-center transition-colors duration-150 btn-press"
                title="Gửi bình luận"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>

          {/* Loading indicator */}
          {loadingComments && (
            <div className="py-2 flex items-center justify-center gap-2 text-xs text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
              <span>Đang tải bình luận...</span>
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-3 pt-1">
            {comments.map((cmt, idx) => {
              const cmtId = cmt.id || `cmt_${idx}`;
              const cmtAuthor = cmt.author?.fullName || cmt.username || 'Người dùng';
              const cmtText = cmt.content || cmt.text;
              const cmtTime = cmt.createdAt || cmt.at;
              const cmtAvatar = cmt.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cmt.username || cmt.userId || idx}&backgroundColor=b6e3f4`;

              return (
                <div key={cmtId} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={cmtAvatar}
                    alt={cmtAuthor}
                    className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100 ring-1 ring-white border border-[#E5E9F0] mt-0.5"
                  />
                  <div className="flex-1 bg-[#F8FAFC] rounded-[12px] p-2.5 space-y-1 border border-[#E5E9F0]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F172A] text-xs hover:underline cursor-pointer">
                        {cmtAuthor}
                      </span>
                      <span className="text-[11px] text-[#64748B]">{formatTime(cmtTime)}</span>
                    </div>
                    <p className="text-[#475569] leading-relaxed text-xs">
                      {cmtText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
