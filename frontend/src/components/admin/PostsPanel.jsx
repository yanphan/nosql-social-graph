import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { adminApi } from '@/services/admin';
import { focusRing } from './ModalShell';
import { useDebounced, usePagedList, SearchBox, FilterSelect, Pager, TableStatusRow } from './listing';
import { PostDetailModal, ModerationLogModal, reasonLabel } from './PostModeration';

const PER_PAGE = 10;
const fmtDate = (ms) => (ms ? new Date(Number(ms)).toLocaleDateString('vi-VN') : '');
const fetchPosts = (query, signal) => adminApi.getPosts({ ...query, limit: PER_PAGE }, signal);

/**
 * Kiểm duyệt bài viết: tìm theo nội dung / tác giả, lọc theo chủ đề, phân trang phía máy chủ,
 * xem toàn bộ bài + bình luận, gỡ bài / gỡ bình luận kèm lý do.
 */
export default function PostsPanel({ topics = [], showToast, onChanged }) {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const q = useDebounced(search.trim(), 300);

  // Đổi bộ lọc thì về trang 1
  useEffect(() => setPage(1), [q, topic]);

  const list = usePagedList(fetchPosts, { q, topic, page });

  // Gỡ bài cuối cùng của trang cuối: lùi về trang trước
  useEffect(() => {
    if (!list.loading && !list.error && list.items.length === 0 && page > 1) setPage((p) => p - 1);
  }, [list.loading, list.error, list.items.length, page]);

  const handleRemoved = (post, reason) => {
    setViewing(null);
    showToast(`Đã gỡ bài viết của @${post.author?.username} (${reasonLabel(reason).toLowerCase()})`);
    list.reload();
    onChanged?.();
  };

  const handleCommentCount = (postId, commentCount) => {
    list.updateItems((items) => items.map((p) => (p.id === postId ? { ...p, commentCount } : p)));
  };

  const topicOptions = [
    { value: '', label: 'Tất cả' },
    ...[...topics].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ value: t.name, label: `#${t.name}` })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          id="admin-post-search"
          label="Tìm bài viết theo nội dung hoặc tác giả"
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo nội dung, @tên đăng nhập, họ tên…"
        />
        <FilterSelect id="admin-post-topic" label="Chủ đề" value={topic} onChange={setTopic} options={topicOptions} />
        <button
          type="button"
          onClick={() => setShowLog(true)}
          className={`ml-auto h-9 px-3 rounded-[10px] border border-[#E5E9F0] bg-white text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5 ${focusRing}`}
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Nhật ký kiểm duyệt
        </button>
      </div>

      <div className="bg-white border border-[#E5E9F0] rounded-[16px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <table className="w-full text-left text-[13px]" aria-busy={list.loading}>
          <caption className="sr-only">Danh sách bài viết</caption>
          <thead className="bg-[#F8FAFC] border-b border-[#E5E9F0] [&_th]:font-medium [&_th]:text-[13px] [&_th]:text-[#475569]">
            <tr>
              <th scope="col" className="py-3 px-4">Tác giả</th>
              <th scope="col" className="py-3 px-4">Nội dung</th>
              <th scope="col" className="py-3 px-4">Chủ đề</th>
              <th scope="col" className="py-3 px-4 text-right">Thích</th>
              <th scope="col" className="py-3 px-4 text-right">Bình luận</th>
              <th scope="col" className="py-3 px-4">Ngày đăng</th>
              <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-[#E5E9F0]/60 ${list.loading ? 'opacity-60' : ''}`}>
            <TableStatusRow
              colSpan={7}
              loading={list.loading}
              error={list.error}
              empty={list.items.length === 0}
              onRetry={list.reload}
              emptyText={q || topic ? 'Không có bài viết nào khớp bộ lọc.' : 'Chưa có bài viết nào.'}
            />
            {!list.error &&
              list.items.map((p) => (
                <tr key={p.id} className="hover:bg-[#F3F5F9]/60">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-[#0F172A]">@{p.author?.username}</span>
                  </td>
                  <td className="py-2.5 px-4 text-[#334155] max-w-[360px]">
                    <span className="line-clamp-2 break-words">{p.content}</span>
                  </td>
                  <td className="py-2.5 px-4 text-[12px] text-[#1D4ED8] max-w-[160px]">
                    <span className="line-clamp-2">{(p.topics ?? []).map((t) => `#${t}`).join(' ')}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-[#475569]">{p.likeCount ?? 0}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-[#475569]">{p.commentCount ?? 0}</td>
                  <td className="py-2.5 px-4 tabular-nums text-[#475569] whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setViewing(p)}
                      aria-label={`Xem và kiểm duyệt bài viết của @${p.author?.username}`}
                      className={`h-7 px-2.5 rounded-[8px] border border-[#E5E9F0] text-[12px] font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] ${focusRing}`}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <Pager
          label="Phân trang bài viết"
          noun="bài viết"
          page={page}
          limit={PER_PAGE}
          total={list.total}
          shown={list.error ? 0 : list.items.length}
          loading={list.loading}
          onPage={setPage}
        />
      </div>

      {viewing && (
        <PostDetailModal
          post={viewing}
          onClose={() => setViewing(null)}
          onRemoved={handleRemoved}
          onCommentCountChange={handleCommentCount}
        />
      )}
      {showLog && <ModerationLogModal onClose={() => setShowLog(false)} />}
    </div>
  );
}
