import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, ShieldAlert } from 'lucide-react';
import { adminApi } from '@/services/admin';
import { ModalShell, ModalHeader, ErrorNote, focusRing, btnSecondary, btnDanger } from './ModalShell';

// Lý do gỡ nội dung, trùng với MODERATION_REASONS ở backend
export const REASONS = [
  { value: 'spam', label: 'Spam hoặc quảng cáo' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'off_topic', label: 'Sai chủ đề' },
  { value: 'other', label: 'Khác' },
];
export const reasonLabel = (v) => REASONS.find((r) => r.value === v)?.label ?? v;

const COMMENTS_PER_PAGE = 10;
const fmtTime = (ms) => (ms ? new Date(Number(ms)).toLocaleString('vi-VN') : '');
const fmtNum = (n) => Number(n ?? 0).toLocaleString('vi-VN');

// Kiểm tra lựa chọn lý do; trả về thông báo lỗi hoặc ''
const reasonError = ({ reason, note }) => {
  if (!reason) return 'Hãy chọn lý do gỡ.';
  if (reason === 'other' && !note.trim()) return 'Hãy ghi rõ lý do khi chọn "Khác".';
  return '';
};

function ReasonPicker({ idPrefix, value, onChange, error }) {
  const noteId = `${idPrefix}-note`;
  const errId = `${idPrefix}-error`;
  return (
    <fieldset className="space-y-2" aria-describedby={error ? errId : undefined}>
      <legend className="text-xs font-medium text-[#0F172A] mb-1.5">Lý do gỡ</legend>
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map((r) => {
          const checked = value.reason === r.value;
          return (
            <label
              key={r.value}
              className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-xs cursor-pointer ${
                checked
                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                  : 'border-[#E5E9F0] text-[#334155] hover:bg-[#F8FAFC]'
              } focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:ring-offset-1`}
            >
              <input
                type="radio"
                name={`${idPrefix}-reason`}
                value={r.value}
                checked={checked}
                onChange={() => onChange({ ...value, reason: r.value })}
                className="accent-rose-600"
              />
              {r.label}
            </label>
          );
        })}
      </div>
      <div>
        <label htmlFor={noteId} className="block text-xs text-[#475569] mb-1">
          Ghi chú {value.reason === 'other' ? '(bắt buộc)' : '(không bắt buộc)'}
        </label>
        <textarea
          id={noteId}
          rows={2}
          maxLength={300}
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          aria-invalid={value.reason === 'other' && Boolean(error) ? 'true' : undefined}
          className={`w-full rounded-[10px] border border-[#E5E9F0] px-3 py-2 text-xs text-[#0F172A] resize-none ${focusRing}`}
        />
      </div>
      {error && (
        <p id={errId} role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function CountTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[#475569]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-[#0F172A] tabular-nums">{fmtNum(value)}</dd>
    </div>
  );
}

function CommentItem({ postId, comment, onRemoved }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState({ reason: '', note: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const idPrefix = `cmt-${comment.userId}-${comment.at}`;

  const submit = async () => {
    const msg = reasonError(value);
    if (msg) return setError(msg);
    setBusy(true);
    setError('');
    try {
      const res = await adminApi.deleteComment(postId, comment, { reason: value.reason, note: value.note.trim() });
      onRemoved(comment, res.commentCount);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <li className="py-2.5 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#475569]">
            <span className="font-medium text-[#0F172A]">@{comment.username}</span>
            <span className="ml-2 tabular-nums">{fmtTime(comment.at)}</span>
          </p>
          <p className="mt-0.5 text-[#0F172A] whitespace-pre-wrap break-words">{comment.text}</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Gỡ bình luận của @${comment.username}`}
            className={`shrink-0 h-7 px-2.5 rounded-[8px] text-[11px] font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 ${focusRing}`}
          >
            Gỡ
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-[12px] border border-rose-200 bg-white p-3 space-y-3">
          <ReasonPicker idPrefix={idPrefix} value={value} onChange={setValue} error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className={btnSecondary}>
              Hủy
            </button>
            <button type="button" onClick={submit} disabled={busy} className={btnDanger}>
              {busy ? 'Đang gỡ…' : 'Gỡ bình luận'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Xem toàn bộ bài viết + bình luận; gỡ từng bình luận hoặc gỡ cả bài (kèm lý do).
 * Admin không sửa nội dung: chỉ tác giả được sửa bài của mình.
 */
export function PostDetailModal({ post: initialPost, onClose, onRemoved, onCommentCountChange }) {
  const [post, setPost] = useState(initialPost);
  const [mode, setMode] = useState('view'); // 'view' | 'remove'
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [removal, setRemoval] = useState({ reason: '', note: '' });
  const [removeError, setRemoveError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState('');
  const removeBtnRef = useRef(null);
  const backBtnRef = useRef(null);

  const loadComments = async (nextPage) => {
    setLoadingComments(true);
    setLoadError('');
    try {
      const data = await adminApi.getComments(post.id, { page: nextPage, limit: COMMENTS_PER_PAGE });
      setComments((prev) => {
        const base = nextPage === 1 ? [] : prev;
        const seen = new Set(base.map((c) => `${c.userId}-${c.at}`));
        return [...base, ...(data.items ?? []).filter((c) => !seen.has(`${c.userId}-${c.at}`))];
      });
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    // Lấy số liệu mới nhất (danh sách có thể đã cũ) và trang bình luận đầu
    adminApi
      .getPost(initialPost.id)
      .then((fresh) => fresh && setPost((p) => ({ ...p, ...fresh })))
      .catch(() => {});
    loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPost.id]);

  // Chuyển giữa xem / gỡ trong cùng một hộp thoại: đưa focus tới nút tương ứng
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (mode === 'remove') backBtnRef.current?.focus();
    else removeBtnRef.current?.focus();
  }, [mode]);

  const handleCommentRemoved = (comment, commentCount) => {
    setComments((list) => list.filter((c) => !(c.userId === comment.userId && c.at === comment.at)));
    setPost((p) => ({ ...p, commentCount }));
    setStatus(`Đã gỡ bình luận của @${comment.username}.`);
    onCommentCountChange?.(post.id, commentCount);
  };

  const handleRemovePost = async () => {
    const msg = reasonError(removal);
    if (msg) return setRemoveError(msg);
    setRemoving(true);
    setRemoveError('');
    try {
      await adminApi.deletePost(post.id, { reason: removal.reason, note: removal.note.trim() });
      onRemoved(post, removal.reason);
    } catch (err) {
      setRemoveError(err.message);
      setRemoving(false);
    }
  };

  const author = post.author ?? {};

  const removeView = (
    <>
      <ModalHeader
        titleId="remove-post-title"
        descId="remove-post-desc"
        title={`Gỡ bài viết của @${author.username}?`}
        description="Bài viết bị xóa khỏi đồ thị cùng mọi lượt thích, bình luận, chia sẻ. Không thể hoàn tác."
        onClose={onClose}
        busy={removing}
      />
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <CountTile icon={Heart} label="Lượt thích" value={post.likeCount} />
        <CountTile icon={MessageCircle} label="Bình luận" value={post.commentCount} />
        <CountTile icon={Share2} label="Chia sẻ" value={post.shareCount} />
      </dl>
      <blockquote className="text-xs text-[#334155] bg-[#F8FAFC] border-l-2 border-[#CBD5E1] px-3 py-2 line-clamp-3 whitespace-pre-wrap break-words">
        {post.content}
      </blockquote>
      <ReasonPicker idPrefix="remove-post" value={removal} onChange={setRemoval} error={removeError} />
      <p className="text-[11px] text-[#475569]">
        Nội dung, tác giả, số liệu và lý do được lưu vào nhật ký kiểm duyệt để đối chiếu khi có khiếu nại.
      </p>
      <div className="flex justify-end gap-2 pt-1">
        <button
          ref={backBtnRef}
          type="button"
          onClick={() => {
            setMode('view');
            setRemoveError('');
          }}
          disabled={removing}
          className={btnSecondary}
        >
          Quay lại
        </button>
        <button type="button" onClick={handleRemovePost} disabled={removing} className={btnDanger}>
          {removing ? 'Đang gỡ…' : 'Gỡ bài viết'}
        </button>
      </div>
    </>
  );

  const detailView = (
    <>
      <ModalHeader
        titleId="post-detail-title"
        descId="post-detail-desc"
        title={`Bài viết của ${author.fullName || author.username} (@${author.username})`}
        description={`Đăng lúc ${fmtTime(post.createdAt)}`}
        onClose={onClose}
      />

      <p className="text-sm text-[#0F172A] whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
      {post.topics?.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chủ đề">
          {post.topics.map((t) => (
            <li key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
              #{t}
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <CountTile icon={Heart} label="Lượt thích" value={post.likeCount} />
        <CountTile icon={MessageCircle} label="Bình luận" value={post.commentCount} />
        <CountTile icon={Share2} label="Chia sẻ" value={post.shareCount} />
      </dl>

      <section aria-labelledby="post-comments-title" className="border-t border-[#E5E9F0] pt-3">
        <h4 id="post-comments-title" className="text-xs font-semibold text-[#0F172A]">
          Bình luận
        </h4>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        <ErrorNote>{loadError}</ErrorNote>
        {page >= 1 && comments.length === 0 && !loadingComments && !loadError && (
          <p className="text-xs text-[#475569] py-2">Bài viết chưa có bình luận.</p>
        )}
        <ul className="divide-y divide-[#E5E9F0]">
          {comments.map((c) => (
            <CommentItem key={`${c.userId}-${c.at}`} postId={post.id} comment={c} onRemoved={handleCommentRemoved} />
          ))}
        </ul>
        {loadingComments && <p className="text-xs text-[#475569] py-2">Đang tải bình luận…</p>}
        {hasMore && !loadingComments && (
          <button
            type="button"
            onClick={() => loadComments(page + 1)}
            className={`mt-1 text-xs font-medium text-[#1D4ED8] hover:underline rounded ${focusRing}`}
          >
            Xem thêm bình luận
          </button>
        )}
      </section>

      <div className="flex items-center justify-between gap-2 border-t border-[#E5E9F0] pt-3">
        <p className="text-[11px] text-[#475569]">Chỉ tác giả được sửa nội dung bài viết.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Đóng
          </button>
          <button ref={removeBtnRef} type="button" onClick={() => setMode('remove')} className={btnDanger}>
            Gỡ bài viết
          </button>
        </div>
      </div>
    </>
  );

  const removingMode = mode === 'remove';
  return (
    <ModalShell
      titleId={removingMode ? 'remove-post-title' : 'post-detail-title'}
      descId={removingMode ? 'remove-post-desc' : 'post-detail-desc'}
      onClose={onClose}
      busy={removing}
      size={removingMode ? 'md' : 'lg'}
    >
      {removingMode ? removeView : detailView}
    </ModalShell>
  );
}

// Nhật ký kiểm duyệt: các bài viết / bình luận đã bị gỡ, kèm lý do và nội dung đã lưu
export function ModerationLogModal({ onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .getModerationLog(100)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <ModalShell titleId="modlog-title" descId="modlog-desc" onClose={onClose} size="lg">
      <ModalHeader
        titleId="modlog-title"
        descId="modlog-desc"
        title="Nhật ký kiểm duyệt"
        description="100 lần gỡ nội dung gần nhất. Nội dung gốc được lưu lại tại thời điểm gỡ."
        onClose={onClose}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items && !error && <p className="text-xs text-[#475569]">Đang tải…</p>}
      {items?.length === 0 && <p className="text-xs text-[#475569]">Chưa có nội dung nào bị gỡ.</p>}
      {items?.length > 0 && (
        <ul className="divide-y divide-[#E5E9F0]">
          {items.map((it, i) => {
            const isPost = it.action === 'remove_post';
            const text = isPost ? it.post?.content : it.comment?.text;
            return (
              <li key={`${it.at}-${i}`} className="py-3 text-xs space-y-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#475569]">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                  <span className="font-medium text-[#0F172A]">{isPost ? 'Gỡ bài viết' : 'Gỡ bình luận'}</span>
                  <span>của @{it.author?.username}</span>
                  <span>bởi @{it.by?.username}</span>
                  <span className="tabular-nums">{fmtTime(it.at)}</span>
                </p>
                <p className="text-[#0F172A]">
                  Lý do: {reasonLabel(it.reason)}
                  {it.note ? ` (${it.note})` : ''}
                </p>
                <p className="text-[#334155] bg-[#F8FAFC] border-l-2 border-[#CBD5E1] px-2 py-1 line-clamp-2 break-words">
                  {text}
                </p>
                {isPost && (
                  <p className="text-[#475569] tabular-nums">
                    Khi gỡ: {fmtNum(it.post?.likeCount)} thích, {fmtNum(it.post?.commentCount)} bình luận,{' '}
                    {fmtNum(it.post?.shareCount)} chia sẻ
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
}
