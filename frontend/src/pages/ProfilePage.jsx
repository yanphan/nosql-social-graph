import React, { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Repeat2, Trash2, CalendarDays } from 'lucide-react';
import PostCard from '@/components/post/PostCard';
import { ModalShell, ModalHeader, ErrorNote, btnSecondary, btnDanger, focusRing } from '@/components/admin/ModalShell';
import { usersService } from '@/services/users';
import { postsService } from '@/services/posts';

const PER_PAGE = 10;
const fmt = (n) => Number(n ?? 0).toLocaleString('vi-VN');

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/** Danh sách có "Xem thêm": load(page) trả { items, hasMore } */
function usePaged(load, key) {
  const [state, setState] = useState({ items: [], page: 0, hasMore: false, loading: true, error: '' });

  const fetchPage = useCallback(
    async (page) => {
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await load(page);
        setState((s) => ({
          items: page === 1 ? res.items : [...s.items, ...res.items],
          page,
          hasMore: res.hasMore,
          loading: false,
          error: '',
        }));
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    },
    [load]
  );

  useEffect(() => {
    if (key) fetchPage(1);
  }, [key, fetchPage]);

  return { ...state, more: () => fetchPage(state.page + 1), retry: () => fetchPage(Math.max(1, state.page || 1)), setState };
}

function ListFooter({ list, noun, emptyText }) {
  if (list.error) {
    return (
      <div className="text-center py-6">
        <p role="alert" className="text-xs text-rose-700">
          {list.error}
        </p>
        <button type="button" onClick={list.retry} className={`${btnSecondary} mt-2`}>
          Thử lại
        </button>
      </div>
    );
  }
  if (list.loading) return <p className="text-center text-xs text-[#64748B] py-6">Đang tải…</p>;
  if (!list.items.length) return <p className="text-center text-sm text-[#64748B] py-10">{emptyText}</p>;
  if (list.hasMore) {
    return (
      <div className="text-center">
        <button type="button" onClick={list.more} className={btnSecondary}>
          Xem thêm {noun}
        </button>
      </div>
    );
  }
  return null;
}

function DeleteShareModal({ item, onClose, onDone }) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await postsService.unsharePost(item.post.id);
      onDone(item);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalShell titleId={titleId} descId={descId} onClose={onClose} busy={busy}>
      <ModalHeader
        titleId={titleId}
        descId={descId}
        title="Xóa bài chia sẻ"
        description={`Bài của ${item.post.author?.fullName}`}
        onClose={onClose}
        busy={busy}
      />
      <p className="text-[13px] text-[#334155]">
        Bài này sẽ không còn trong mục Đã chia sẻ của bạn và số lượt chia sẻ giảm đi 1. Bài gốc của tác giả không bị ảnh
        hưởng; bạn có thể chia sẻ lại sau.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
          Hủy
        </button>
        <button type="button" onClick={handleDelete} disabled={busy} className={btnDanger}>
          {busy ? 'Đang xóa…' : 'Xóa bài chia sẻ'}
        </button>
      </div>
    </ModalShell>
  );
}

function FollowButton({ profile, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const following = profile.isFollowing;
  const name = profile.user.fullName || profile.user.username;

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      if (following) await usersService.unfollow(profile.user.id);
      else await usersService.follow(profile.user.id);
      onChange(!following);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        aria-label={`${following ? 'Bỏ theo dõi' : 'Theo dõi'} ${name}`}
        className={`h-9 px-4 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 ${focusRing} ${
          following
            ? 'bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE]'
            : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
        }`}
      >
        {following ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
        {following ? 'Đang theo dõi' : 'Theo dõi'}
      </button>
      {error && (
        <p role="alert" className="text-[11px] text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Trang cá nhân /u/:username (UC-07): hồ sơ, theo dõi, bài đã đăng, bài đã chia sẻ */
export default function ProfilePage({ username, currentUser, onFollowChange }) {
  const [profile, setProfile] = useState({ data: null, loading: true, error: '', notFound: false });
  const [tab, setTab] = useState('posts');
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    setProfile({ data: null, loading: true, error: '', notFound: false });
    setTab('posts');
    usersService
      .getProfile(username)
      .then((data) => alive && setProfile({ data, loading: false, error: '', notFound: false }))
      .catch((e) => alive && setProfile({ data: null, loading: false, error: e.message, notFound: !!e.notFound }));
    return () => {
      alive = false;
    };
  }, [username]);

  const p = profile.data;
  const userId = p?.user.id;
  const isMe = !!userId && userId === currentUser?.id;

  const loadPosts = useCallback((page) => usersService.getPosts(userId, page, PER_PAGE), [userId]);
  const loadShares = useCallback((page) => usersService.getShares(userId, page, PER_PAGE), [userId]);
  const posts = usePaged(loadPosts, tab === 'posts' && userId ? `${userId}-posts` : null);
  const shares = usePaged(loadShares, tab === 'shares' && userId ? `${userId}-shares` : null);

  const handleShareDeleted = (item) => {
    setDeleting(null);
    shares.setState((s) => ({ ...s, items: s.items.filter((x) => x.post.id !== item.post.id) }));
    setProfile((s) => ({ ...s, data: { ...s.data, shares: Math.max(0, s.data.shares - 1) } }));
    setNotice(`Đã xóa bài chia sẻ của ${item.post.author?.fullName}`);
    setTimeout(() => setNotice(''), 3000);
  };

  if (profile.loading) {
    return <p className="text-center text-sm text-[#64748B] py-16">Đang tải trang cá nhân…</p>;
  }
  if (!p) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <h1 className="text-lg font-semibold text-[#0F172A]">
          {profile.notFound ? `Không có người dùng @${username}` : 'Chưa tải được trang cá nhân'}
        </h1>
        <p className="text-sm text-[#475569]">{profile.notFound ? 'Tài khoản có thể đã bị xóa hoặc đổi tên.' : profile.error}</p>
        <Link to="/" className={`${btnSecondary} inline-flex items-center`}>
          Về bảng tin
        </Link>
      </div>
    );
  }

  const u = p.user;
  const tabs = [
    { key: 'posts', label: 'Bài viết', count: p.posts },
    { key: 'shares', label: 'Đã chia sẻ', count: p.shares },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <section aria-labelledby="profile-name" className="bg-white rounded-[16px] border border-[#E5E9F0] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#DBEAFE] to-[#EFF4FF]" aria-hidden="true" />
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between gap-4 -mt-10">
            <img src={u.avatar} alt="" className="w-20 h-20 rounded-full bg-slate-100 ring-4 ring-white border border-[#E5E9F0]" />
            {!isMe && (
              <FollowButton
                profile={p}
                onChange={(following) => {
                  setProfile((s) => ({
                    ...s,
                    data: { ...s.data, isFollowing: following, followers: s.data.followers + (following ? 1 : -1) },
                  }));
                  onFollowChange?.(p.user.id, following);
                }}
              />
            )}
          </div>
          <div className="mt-3">
            <h1 id="profile-name" className="text-xl font-semibold text-[#0F172A]">
              {u.fullName || u.username}
            </h1>
            <p className="text-sm text-[#64748B]">@{u.username}</p>
            {u.bio && <p className="mt-2 text-sm text-[#334155] whitespace-pre-line">{u.bio}</p>}
            {u.joinedAt && (
              <p className="mt-2 text-xs text-[#64748B] inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Tham gia {new Date(Number(u.joinedAt)).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-[#E5E9F0] pt-4 text-center">
            {[
              ['Bài viết', p.posts],
              ['Người theo dõi', p.followers],
              ['Đang theo dõi', p.following],
              ['Đã chia sẻ', p.shares],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-[#64748B]">{label}</dt>
                <dd className="text-lg font-semibold text-[#0F172A] tabular-nums">{fmt(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div role="tablist" aria-label="Nội dung trang cá nhân" className="flex gap-1 p-1 bg-white rounded-[12px] border border-[#E5E9F0]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`profile-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`profile-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex-1 h-9 rounded-[8px] text-sm font-medium ${focusRing} ${
              tab === t.key ? 'bg-[#EFF4FF] text-[#1D4ED8]' : 'text-[#475569] hover:bg-slate-50'
            }`}
          >
            {t.label} <span className="tabular-nums text-xs">({fmt(t.count)})</span>
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[10px] px-3 py-2">
          {notice}
        </p>
      )}

      {tab === 'posts' && (
        <div role="tabpanel" id="profile-panel-posts" aria-labelledby="profile-tab-posts" className="space-y-4">
          {posts.items.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))}
          <ListFooter list={posts} noun="bài viết" emptyText={isMe ? 'Bạn chưa đăng bài nào.' : 'Người này chưa đăng bài nào.'} />
        </div>
      )}

      {tab === 'shares' && (
        <div role="tabpanel" id="profile-panel-shares" aria-labelledby="profile-tab-shares" className="space-y-4">
          {shares.items.map((item) => (
            <div key={item.post.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs text-[#475569] inline-flex items-center gap-1.5">
                  <Repeat2 className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                  {isMe ? 'Bạn' : u.fullName || u.username} đã chia sẻ {timeAgo(item.sharedAt)}
                </p>
                {isMe && (
                  <button
                    type="button"
                    onClick={() => setDeleting(item)}
                    aria-label={`Xóa bài chia sẻ: bài của ${item.post.author?.fullName}`}
                    className={`h-7 px-2.5 rounded-[8px] text-xs font-medium text-[#475569] hover:text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 ${focusRing}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Xóa bài chia sẻ
                  </button>
                )}
              </div>
              <PostCard post={item.post} currentUser={currentUser} />
            </div>
          ))}
          <ListFooter
            list={shares}
            noun="bài đã chia sẻ"
            emptyText={isMe ? 'Bạn chưa chia sẻ bài nào. Bấm nút chia sẻ dưới một bài viết để lưu vào đây.' : 'Người này chưa chia sẻ bài nào.'}
          />
        </div>
      )}

      {deleting && <DeleteShareModal item={deleting} onClose={() => setDeleting(null)} onDone={handleShareDeleted} />}
    </div>
  );
}
