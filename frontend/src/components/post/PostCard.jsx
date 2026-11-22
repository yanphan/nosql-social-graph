import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  CheckCircle2, 
  Send,
  X 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockApi } from '@/mock/mockData';
import { postsService } from '@/services/posts';
import { getTopicColor } from '@/lib/topicColor';
import '@/styles/tokens.css';

export default function PostCard({ post, onTopicClick, currentUser, selectedTopic }) {
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [likeBounce, setLikeBounce] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  // Bài thật (id pst_) lấy bình luận từ backend khi mở; chỉ bài mock mới dùng dữ liệu mẫu
  // Bài mock có id dạng post_xxx; bài thật: pst_xxx (seed) hoặc nanoid (tạo qua API)
  const isRealPost = Boolean(post.id) && !post.id.startsWith('post_');
  const [comments, setComments] = useState(() => (isRealPost ? [] : mockApi.getCommentsByPostId(post.id) || []));
  // Tổng số bình luận lấy từ API (commentCount), không phụ thuộc việc đã tải nội dung hay chưa
  const [commentTotal, setCommentTotal] = useState(() => post.commentCount ?? comments.length);
  const [commentLikes, setCommentLikes] = useState({});
  const [newComment, setNewComment] = useState('');
  // Chia sẻ (cạnh SHARED) một chiều: muốn bỏ thì "Xóa bài chia sẻ" ở trang cá nhân. Không chia sẻ bài của chính mình
  const [shared, setShared] = useState(post.sharedByMe ?? false);
  const [shareCount, setShareCount] = useState(post.shareCount || 0);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const isOwnPost = Boolean(currentUser?.id) && post.author?.id === currentUser.id;
  const authorLink = `/u/${encodeURIComponent(post.author?.username || '')}`;

  // Bình luận thật: tải trang đầu khi mở, sau đó "Xem thêm" tải tiếp từng trang
  const COMMENTS_PER_PAGE = 20;
  const [commentPage, setCommentPage] = useState(0); // số trang đã tải
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const toComment = (c) => ({
    id: `cmt_${post.id}_${c.userId ?? c.username}_${c.at}`,
    userId: c.userId,
    at: c.at,
    author: {
      fullName: c.username || 'Người dùng',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username || 'user'}&backgroundColor=b6e3f4`,
    },
    content: c.text,
    createdAt: c.at,
    likeCount: 0,
  });

  const loadComments = async (page) => {
    setLoadingComments(true);
    try {
      const res = await postsService.getComments(post.id, { page, limit: COMMENTS_PER_PAGE });
      const items = (res?.items || []).map(toComment);
      setComments((prev) => {
        const base = page === 1 ? prev.filter((c) => c.pending) : prev; // giữ bình luận vừa gửi
        const seen = new Set(base.map((c) => c.id));
        return [...base, ...items.filter((c) => !seen.has(c.id))];
      });
      setHasMoreComments(!!res?.hasMore);
      setCommentPage(page);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (showComments && isRealPost && commentPage === 0) loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, post.id]);

  // Toggle Like with 150ms bounce animation & sync backend
  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      postsService.unlikePost(post.id).catch(() => {});
    } else {
      setLiked(true);
      setLikeBounce(true);
      setTimeout(() => setLikeBounce(false), 200);
      setLikeCount((c) => c + 1);
      postsService.likePost(post.id).catch(() => {});
    }
  };

  const handleShare = async () => {
    if (isOwnPost || shareBusy || shared) return;
    setShareError('');
    setShared(true);
    setShareCount((c) => c + 1);
    if (!isRealPost) return; // bài mẫu: chỉ đổi trên giao diện
    setShareBusy(true);
    try {
      const res = await postsService.sharePost(post.id);
      setShareCount(res.shareCount);
    } catch (err) {
      setShared(false);
      setShareCount((c) => Math.max(0, c - 1));
      setShareError(err.message);
    } finally {
      setShareBusy(false);
    }
  };

  // Toggle comment like
  const handleToggleCommentLike = (commentId, initialCount = 0) => {
    setCommentLikes((prev) => {
      const isCurrentlyLiked = prev[commentId]?.liked || false;
      const currentCount = prev[commentId]?.count !== undefined ? prev[commentId].count : initialCount;
      return {
        ...prev,
        [commentId]: {
          liked: !isCurrentlyLiked,
          count: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
        },
      };
    });
  };

  // Submit comment
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const created = {
      id: `cmt_${Date.now()}`,
      postId: post.id,
      authorId: currentUser?.id || 'usr_alice',
      author: currentUser || mockApi.getCurrentUser(),
      content: newComment.trim(),
      createdAt: Date.now(),
      likeCount: 0,
      pending: true,
    };

    setComments((prev) => [created, ...prev]);
    setCommentTotal((t) => t + 1);
    setNewComment('');
    setShowComments(true);
    // Server trả về khóa (userId, at) của bình luận: cần để xóa được ngay sau khi gửi
    postsService
      .addComment(post.id, created.content)
      .then((res) => {
        if (!res?.comment) return;
        setComments((prev) =>
          prev.map((c) => (c.id === created.id ? { ...c, userId: res.comment.userId, at: res.comment.at } : c))
        );
        setCommentTotal(res.commentCount);
      })
      .catch(() => {});
  };

  // Người viết bình luận hoặc tác giả bài được xóa bình luận
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [commentError, setCommentError] = useState('');
  const canDeleteComment = (cmt) =>
    isRealPost && cmt.userId && cmt.at && currentUser?.id && (cmt.userId === currentUser.id || post.author?.id === currentUser.id);

  const handleDeleteComment = async (cmt) => {
    setCommentError('');
    try {
      const res = await postsService.deleteComment(post.id, cmt.userId, cmt.at);
      setComments((prev) => prev.filter((c) => c.id !== cmt.id));
      setCommentTotal(res?.commentCount ?? ((t) => Math.max(0, t - 1)));
      setConfirmingDelete(null);
    } catch (err) {
      setCommentError(err.message);
    }
  };

  // Format thời gian ngắn gọn
  const formatTime = (epochMs) => {
    const diff = Date.now() - epochMs;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const latestComment = comments.length > 0 ? comments[0] : null;
  const commentCount = Math.max(commentTotal, comments.length);

  return (
    <article className="bg-white rounded-[16px] p-5 sm:p-6 border border-[#E5E9F0] card-hover shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-3.5 animate-fade-up">
      {/* 1. HEADER: Avatar tròn (2px white ring + 1px border) + Tên tác giả + Nổi bật + Thời gian + Menu 3 chấm */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={authorLink} tabIndex={-1} aria-hidden="true" className="shrink-0">
            <img
              src={post.author?.avatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0]"
            />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-[15px] text-[#0F172A] leading-snug tracking-tight">
                <Link
                  to={authorLink}
                  className="hover:text-[#2563EB] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  {post.author?.fullName}
                </Link>
              </h3>
              
              {/* Verified badge: chỉ hiện khi author.isVerified === true */}
              {post.author?.isVerified === true && (
                <CheckCircle2 className="h-4 w-4 text-[#2563EB] fill-[#EFF4FF] shrink-0" title="Tài khoản đã xác minh" />
              )}

              {/* Tag Nổi bật nếu bài viết có likeCount >= 60 */}
              {likeCount >= 60 && (
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-[#EFF4FF] text-[#2563EB] border border-[#2563EB]/20">
                  Nổi bật
                </span>
              )}

              {/* Số người mình đang theo dõi đã thích bài (BT4) */}
              {post.friendLikes > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {post.friendLikes} người bạn theo dõi đã thích
                </span>
              )}
            </div>
            
            {/* Secondary text: 13px #64748B chuẩn AA */}
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

      {/* 2. BODY CONTENT: line-height 1.65 */}
      <div className="space-y-3">
        <p className="text-[15px] text-[#0F172A] leading-[1.65] font-normal whitespace-pre-line tracking-normal">
          {post.content}
        </p>

        {/* Hashtag chips with stable pastel color dot */}
        {post.topics?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {post.topics.map((topic) => {
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

      {/* 3. ACTION ROW: Ghost icon buttons, icon + count only, tooltips */}
      <div className="flex items-center gap-1 pt-1 border-t border-[#E5E9F0]">
        {/* Like Button: 1 -> 1.2 -> 1 scale on click, accent color fill & text */}
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

        {/* Comment Button: Always show count (0 included), hover = accent tint */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press ${
            showComments
              ? 'text-[#2563EB] bg-[#EFF4FF]'
              : 'text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF4FF]'
          }`}
          title="Bình luận"
          aria-label={`Bình luận (${commentCount})`}
          aria-expanded={showComments}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
        </button>

        {/* Share Button: tạo / bỏ cạnh SHARED, hiện số lượt chia sẻ */}
        <button
          type="button"
          onClick={handleShare}
          disabled={isOwnPost || shareBusy || shared}
          aria-pressed={shared}
          aria-label={
            isOwnPost
              ? `Chia sẻ (${shareCount}). Không thể chia sẻ bài của chính bạn`
              : shared
                ? `Đã chia sẻ (${shareCount}). Xóa bài chia sẻ trong trang cá nhân của bạn`
                : `Chia sẻ (${shareCount})`
          }
          title={
            isOwnPost
              ? 'Không thể chia sẻ bài viết của chính bạn'
              : shared
                ? 'Đã chia sẻ. Muốn xóa, vào trang cá nhân > Đã chia sẻ'
                : 'Chia sẻ'
          }
          className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press disabled:cursor-default ${
            shared
              ? 'text-[#2563EB] bg-[#EFF4FF]'
              : 'text-[#64748B] enabled:hover:text-[#2563EB] enabled:hover:bg-[#EFF4FF]'
          }`}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span className={`tabular-nums ${shared ? 'font-semibold' : ''}`}>{shareCount}</span>
        </button>

        {/* Bookmark Button */}
        <button
          onClick={() => setBookmarked(!bookmarked)}
          className={`ml-auto h-8 w-8 rounded-lg flex items-center justify-center transition-colors duration-150 btn-press ${
            bookmarked 
              ? 'text-[#2563EB] bg-[#EFF4FF]' 
              : 'text-[#64748B] hover:bg-[#EFF4FF] hover:text-[#2563EB]'
          }`}
          title="Lưu bài viết"
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-[#2563EB] text-[#2563EB]' : ''}`} />
        </button>
      </div>
      {shareError && (
        <p role="alert" className="text-xs text-rose-700 -mt-2">
          {shareError}
        </p>
      )}

      {/* 4. PREVIEW OR EXPANDED COMMENTS */}
      {/* 4a. Collapsed: Preview on separate lines */}
      {!showComments && (
        <>
          {commentCount > 0 ? (
            <div className="pt-2 space-y-1 text-xs border-t border-[#E5E9F0]">
              {latestComment && (
                <div className="text-[13px] text-[#475569] leading-snug">
                  <span className="font-semibold text-[#0F172A]">{latestComment.author?.fullName}: </span>
                  <span>{latestComment.content}</span>
                </div>
              )}
              <div>
                <button
                  onClick={() => setShowComments(true)}
                  className="text-[13px] text-[#2563EB] hover:underline font-medium"
                >
                  Xem tất cả {commentCount} bình luận
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#E5E9F0]">
              <button
                onClick={() => setShowComments(true)}
                className="text-[13px] text-[#64748B] hover:text-[#2563EB] hover:underline transition-colors duration-150 flex items-center gap-1.5 group"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#64748B] group-hover:text-[#2563EB] transition-colors duration-150" />
                <span>Hãy là người đầu tiên bình luận</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* 4b. Expanded Comments Thread */}
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

          {/* Danh sách bình luận */}
          <div className="space-y-3 pt-1">
            {comments.map((cmt) => {
              const currentLikeState = commentLikes[cmt.id];
              const isLiked = currentLikeState ? currentLikeState.liked : false;
              const currentCount = currentLikeState ? currentLikeState.count : (cmt.likeCount || 0);

              return (
                <div key={cmt.id} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={cmt.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                    alt={cmt.author?.fullName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100 ring-1 ring-white border border-[#E5E9F0] mt-0.5"
                  />
                  <div className="flex-1 bg-[#F8FAFC] rounded-[12px] p-2.5 space-y-1 border border-[#E5E9F0]/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F172A] text-xs hover:underline cursor-pointer">
                        {cmt.author?.fullName}
                      </span>
                      <span className="text-[11px] text-[#64748B]">{formatTime(cmt.createdAt)}</span>
                    </div>
                    <p className="text-[#475569] leading-relaxed text-xs">
                      {cmt.content}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[#64748B] pt-1">
                      <button 
                        type="button"
                        onClick={() => handleToggleCommentLike(cmt.id, cmt.likeCount || 0)}
                        aria-pressed={isLiked}
                        aria-label={`Thích bình luận của ${cmt.author?.fullName || 'người dùng'}${currentCount > 0 ? ` (${currentCount} lượt thích)` : ''}`}
                        className={`flex items-center gap-1 transition-colors duration-150 btn-press ${
                          isLiked ? 'text-[#2563EB] font-medium' : 'hover:text-[#2563EB]'
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${isLiked ? 'fill-[#2563EB] text-[#2563EB]' : ''}`} />
                        {currentCount > 0 && <span className="tabular-nums">{currentCount}</span>}
                      </button>
                      <button className="hover:text-[#2563EB] transition-colors duration-150">
                        Trả lời
                      </button>
                      {canDeleteComment(cmt) && confirmingDelete !== cmt.id && (
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(cmt.id)}
                          aria-label={`Xóa bình luận của ${cmt.author?.fullName || 'người dùng'}`}
                          className="hover:text-rose-700 transition-colors duration-150"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    {confirmingDelete === cmt.id && (
                      <div className="flex items-center gap-2 pt-1 text-[11px]" role="group" aria-label="Xác nhận xóa bình luận">
                        <span className="text-[#475569]">Xóa bình luận này?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cmt)}
                          className="h-6 px-2 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingDelete(null);
                            setCommentError('');
                          }}
                          className="h-6 px-2 rounded-md border border-[#E5E9F0] text-[#334155] hover:bg-white"
                        >
                          Hủy
                        </button>
                        {commentError && (
                          <span role="alert" className="text-rose-700">
                            {commentError}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phân trang bình luận */}
          {isRealPost && (hasMoreComments || loadingComments) && (
            <div className="flex items-center justify-between gap-3 pl-[38px]">
              <button
                type="button"
                onClick={() => loadComments(commentPage + 1)}
                disabled={loadingComments}
                className="text-[13px] font-medium text-[#1D4ED8] hover:underline disabled:no-underline disabled:text-[#64748B] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {loadingComments
                  ? 'Đang tải bình luận…'
                  : `Xem thêm ${Math.min(COMMENTS_PER_PAGE, Math.max(0, commentCount - comments.length)) || ''} bình luận`.replace('  ', ' ')}
              </button>
              <span className="text-xs text-[#64748B] tabular-nums" aria-live="polite">
                Đã hiện {comments.length}/{commentCount}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
