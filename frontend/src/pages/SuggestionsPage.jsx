import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Search, Check, Plus } from 'lucide-react';
import { recommendService } from '@/services/recommend';

// Trang "Gợi ý theo dõi" (BT3). Nhận trạng thái theo dõi từ MainLayout để đồng bộ với cột bên.
// Backend trả tối đa 50 gợi ý, bộ lọc và tìm theo tên chạy phía client.

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'mutual', label: 'Từ 2 kết nối chung' },
  { key: 'topics', label: 'Cùng chủ đề quan tâm' },
  { key: 'popular', label: 'Người nổi bật' },
];

const applyFilter = (list, key) => {
  switch (key) {
    case 'mutual':
      return list.filter((u) => u.mutual >= 2).sort((a, b) => b.mutual - a.mutual || b.score - a.score);
    case 'topics':
      return list.filter((u) => u.sharedTopics > 0).sort((a, b) => b.sharedTopics - a.sharedTopics || b.score - a.score);
    case 'popular':
      return list.filter((u) => u.source === 'popular');
    default:
      return list;
  }
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2';

function Stat({ label, value, highlight }) {
  return (
    <div className="flex-1 min-w-0 text-center flex flex-col-reverse">
      <dt className="text-[11px] text-[#64748B] mt-0.5">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${highlight ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>{value}</dd>
    </div>
  );
}

function SuggestionCard({ user, maxScore, isFollowed, onToggle }) {
  const name = user.fullName || user.username;
  const isPopular = user.source === 'popular';
  const profileUrl = `/u/${encodeURIComponent(user.username)}`;
  const pct = isPopular || !maxScore ? 0 : Math.max(6, Math.round((user.score / maxScore) * 100));

  return (
    <li className="bg-white rounded-[16px] border border-[#E5E9F0] p-5 flex flex-col gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <Link to={profileUrl} tabIndex={-1} aria-hidden="true" className="shrink-0">
          <img
            src={user.avatar}
            alt=""
            width={48}
            height={48}
            className="w-12 h-12 rounded-full bg-[#EFF4FF] border border-[#E5E9F0]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#0F172A] truncate" title={name}>
            <Link to={profileUrl} className={`rounded hover:text-[#2563EB] hover:underline ${focusRing}`}>
              {name}
            </Link>
          </h2>
          <p className="text-xs text-[#64748B] truncate">@{user.username}</p>
          {isPopular && <p className="mt-1.5 text-xs text-[#475569] line-clamp-2">{user.reason}</p>}
        </div>
      </div>

      <dl className="flex items-stretch rounded-[12px] bg-[#F8FAFC] border border-[#EEF2F6] py-2.5 divide-x divide-[#E5E9F0]">
        {isPopular ? (
          <>
            <Stat label="Người theo dõi" value={user.followers ?? user.score} highlight />
            <Stat label="Kết nối chung" value={0} />
          </>
        ) : (
          <>
            <Stat label="Kết nối chung" value={user.mutual} />
            <Stat label="Chủ đề chung" value={user.sharedTopics} />
            <Stat label="Điểm gợi ý" value={user.score} highlight />
          </>
        )}
      </dl>

      {!isPopular && (
        <div className="h-1.5 rounded-full bg-[#EEF2F6] overflow-hidden -mt-1" aria-hidden="true">
          <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${pct}%` }} />
        </div>
      )}

      <button
        type="button"
        onClick={() => onToggle(user.id)}
        aria-pressed={isFollowed}
        aria-label={isFollowed ? `Bỏ theo dõi ${name}` : `Theo dõi ${name}`}
        className={`mt-auto h-10 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-2 transition-colors btn-press ${focusRing} ${
          isFollowed
            ? 'bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
            : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
        }`}
      >
        {isFollowed ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        <span>{isFollowed ? 'Đang theo dõi' : 'Theo dõi'}</span>
      </button>
    </li>
  );
}

export default function SuggestionsPage({ followedUsers, onToggleFollow }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setItems(await recommendService.getFriendRecommendations(50));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Gợi ý theo dõi · FalkorDB Social';
    load();
    return () => {
      document.title = 'FalkorDB Social';
    };
  }, []);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, applyFilter([...items], f.key).length])),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = applyFilter([...items], filter);
    if (!q) return list;
    return list.filter((u) => `${u.fullName ?? ''} ${u.username}`.toLowerCase().includes(q));
  }, [items, filter, query]);

  const maxScore = useMemo(
    () => Math.max(0, ...items.filter((u) => u.source !== 'popular').map((u) => u.score)),
    [items]
  );

  return (
    <main id="main-content" className="w-full max-w-[1120px] mx-auto space-y-5" aria-labelledby="suggestions-title">
      {/* Phần đầu */}
      <div className="flex items-end justify-between gap-6 pt-1">
          <div className="min-w-0">
            <h1 id="suggestions-title" className="text-xl font-semibold tracking-[-0.01em] text-[#0F172A]">
              Gợi ý theo dõi
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              Những người bạn có thể quen, dựa trên người bạn đang theo dõi và chủ đề bạn quan tâm.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={`shrink-0 h-9 px-3.5 rounded-[10px] border border-[#E5E9F0] text-xs font-medium text-[#334155] flex items-center gap-2 hover:bg-[#F8FAFC] disabled:opacity-60 btn-press ${focusRing}`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Làm mới</span>
          </button>
      </div>

      {/* Thanh lọc */}
      <div className="flex items-center justify-between gap-4">
        <div role="group" aria-label="Lọc gợi ý" className="flex items-center gap-1 bg-white border border-[#E5E9F0] rounded-[12px] p-1">
          {FILTERS.filter((f) => loading || f.key === 'all' || counts[f.key] > 0).map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.key)}
                className={`h-8 px-3 rounded-[9px] text-xs font-medium flex items-center gap-1.5 transition-colors ${focusRing} ${
                  active ? 'bg-[#2563EB] text-white' : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`tabular-nums text-[11px] rounded-full px-1.5 ${active ? 'bg-white text-[#1D4ED8]' : 'bg-[#F1F5F9] text-[#475569]'}`}
                >
                  {loading ? '–' : counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-72">
          <label htmlFor="suggestion-search" className="sr-only">
            Tìm trong gợi ý theo tên
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
          <input
            id="suggestion-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc username"
            className="w-full h-9 pl-9 pr-3 rounded-[10px] bg-white border border-[#E5E9F0] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25"
          />
        </div>
      </div>

      <p className="text-xs text-[#475569]" aria-live="polite">
        {loading ? 'Đang tải gợi ý…' : `Hiển thị ${visible.length} tài khoản`}
      </p>

      {/* Danh sách */}
      {loading ? (
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-[236px] rounded-[16px] bg-white border border-[#E5E9F0] p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="mt-6 h-14 rounded-[12px] bg-slate-100" />
              <div className="mt-6 h-10 rounded-[12px] bg-slate-100" />
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-dashed border-[#CBD5E1] py-14 text-center">
          <p className="text-sm font-medium text-[#0F172A]">Không có gợi ý phù hợp</p>
          <p className="mt-1 text-xs text-[#475569]">
            {query ? 'Thử từ khóa khác hoặc chọn bộ lọc "Tất cả".' : 'Theo dõi thêm vài người để hệ thống có dữ liệu kết nối chung.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((u) => (
            <SuggestionCard
              key={u.id}
              user={u}
              maxScore={maxScore}
              isFollowed={!!followedUsers[u.id]}
              onToggle={onToggleFollow}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
