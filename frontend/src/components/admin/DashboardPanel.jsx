import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  FileText,
  Activity,
  DatabaseBackup,
  RefreshCw,
  Lock,
  Trash2,
  MessageSquareX,
  Hash,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { adminApi } from '@/services/admin';
import { getTopicColor } from '@/lib/topicColor';
import { focusRing, btnSecondary } from './ModalShell';
import { ModerationLogModal } from './PostModeration';

const DAY = 86_400_000;
const ACCENT = '#2563EB';
const card = 'p-5 bg-white border border-[#E5E9F0] rounded-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const fmt = (n) => Number(n ?? 0).toLocaleString('vi-VN');
const fmtDay = (ms) => new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const EDGE_LABELS = {
  FOLLOWS: 'Theo dõi',
  LIKED: 'Thích',
  ABOUT: 'Bài thuộc chủ đề',
  POSTED: 'Đăng bài',
  INTERESTED_IN: 'Quan tâm chủ đề',
  COMMENTED: 'Bình luận',
  SHARED: 'Chia sẻ',
};

const METRICS = [
  { key: 'posts', label: 'Bài viết mới' },
  { key: 'interactions', label: 'Tương tác' },
  { key: 'users', label: 'Người dùng mới' },
];

// Nhóm số người theo dõi theo khoảng (phân phối lũy thừa: vài người rất nhiều, đa số rất ít)
const DEGREE_RANGES = [
  ['0', 0, 0],
  ['1–5', 1, 5],
  ['6–15', 6, 15],
  ['16–30', 16, 30],
  ['31–60', 31, 60],
  ['61–120', 61, 120],
  ['> 120', 121, Infinity],
];

function relativeTime(ms, now) {
  const diff = now - ms;
  if (diff < 60_000) return 'vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return `${Math.floor(diff / DAY)} ngày trước`;
}

/** So sánh 7 ngày gần nhất với 7 ngày trước đó */
function WeekDelta({ current, previous }) {
  if (!previous) return <span>7 ngày trước: {fmt(previous)}</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone = pct > 0 ? 'text-emerald-700' : pct < 0 ? 'text-rose-700' : 'text-[#64748B]';
  return (
    <span>
      <span className={`font-medium ${tone}`}>
        {pct > 0 ? '+' : ''}
        {pct}%
      </span>{' '}
      so với 7 ngày trước
    </span>
  );
}

function Kpi({ icon: Icon, label, value, children, tone }) {
  return (
    <div className={`${card} flex flex-col gap-2 ${tone === 'warn' ? 'border-amber-300 bg-amber-50/40' : ''}`}>
      <div className="flex items-center justify-between text-[13px] font-medium text-[#475569]">
        {label}
        <Icon className="h-4 w-4 text-[#64748B]" aria-hidden="true" />
      </div>
      <div className="text-[28px] font-semibold text-[#0F172A] leading-none tabular-nums">{value}</div>
      <div className="text-[12px] text-[#64748B] space-y-0.5 tabular-nums">{children}</div>
    </div>
  );
}

/** Một dòng trong khối "Cần chú ý": bấm để tới đúng chỗ xử lý */
function AttentionItem({ icon: Icon, count, label, hint, onClick, actionLabel }) {
  const active = count > 0;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}: ${fmt(count)}. ${actionLabel}`}
        className={`w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-[10px] text-left hover:bg-[#F8FAFC] ${focusRing}`}
      >
        <span
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            active ? 'bg-amber-50 text-amber-700' : 'bg-[#F1F5F9] text-[#64748B]'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] text-[#0F172A]">{label}</span>
          {hint && <span className="block text-[12px] text-[#64748B] truncate">{hint}</span>}
        </span>
        <span className={`text-[15px] font-semibold tabular-nums ${active ? 'text-amber-700' : 'text-[#94A3B8]'}`}>
          {fmt(count)}
        </span>
        <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
      </button>
    </li>
  );
}

function IntegrityCard({ state, onRun }) {
  const { checks, loading, error, at } = state;
  const failed = checks?.filter((c) => !c.ok) ?? [];
  return (
    <section aria-labelledby="ov-integrity" className={`${card} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="ov-integrity" className="text-[15px] font-semibold text-[#0F172A]">
            Kiểm tra toàn vẹn dữ liệu
          </h2>
          <p className="text-[13px] text-[#475569] mt-0.5" aria-live="polite">
            {loading
              ? 'Đang kiểm tra…'
              : error
                ? 'Chưa kiểm tra được'
                : checks
                  ? failed.length === 0
                    ? `Đạt cả ${checks.length} phép kiểm tra (lúc ${new Date(at).toLocaleTimeString('vi-VN')})`
                    : `${failed.length}/${checks.length} phép kiểm tra không đạt`
                  : ''}
          </p>
        </div>
        <button type="button" onClick={onRun} disabled={loading} className={`${btnSecondary} inline-flex items-center gap-1.5 shrink-0`}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Kiểm tra lại
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
      {checks && (
        <ul className="grid grid-cols-1 gap-1">
          {checks.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-[12px]">
              {c.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="Đạt" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" aria-label="Không đạt" />
              )}
              <span className={c.ok ? 'text-[#475569]' : 'text-rose-700 font-medium'}>{c.name}</span>
              {!c.ok && (
                <span className="ml-auto tabular-nums text-rose-700">
                  {c.count < 0 ? 'lỗi truy vấn' : `${fmt(c.count)} vi phạm`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityCard({ activity }) {
  const [metric, setMetric] = useState('posts');
  const current = METRICS.find((m) => m.key === metric);
  const total = activity.reduce((s, d) => s + d[metric], 0);
  const data = activity.map((d) => ({ ...d, label: fmtDay(d.date) }));
  return (
    <section aria-labelledby="ov-activity" className={`${card} space-y-3`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="ov-activity" className="text-[15px] font-semibold text-[#0F172A]">
            Hoạt động {activity.length} ngày qua
          </h2>
                    <p className="text-[13px] text-[#475569] mt-0.5 tabular-nums">
            {current.label}: tổng {fmt(total)}, trung bình {fmt(Math.round(total / Math.max(1, activity.length)))}/ngày
            {metric === 'interactions' && ' (thích, bình luận, chia sẻ)'}. Không tính hôm nay.
          </p>
        </div>
        <div role="group" aria-label="Chọn số liệu" className="inline-flex p-0.5 rounded-[10px] bg-[#F1F5F9] shrink-0">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={`h-8 px-3 rounded-[8px] text-xs font-medium ${focusRing} ${
                metric === m.key ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[220px]">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#64748B] text-center px-6">
            Không có {current.label.toLowerCase()} nào trong {activity.length} ngày qua.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EEF1F5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={44} tickFormatter={fmt} />
              <Tooltip
                cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-[#0F172A] text-white px-3 py-1.5 rounded-[8px] text-xs tabular-nums shadow-md">
                      {new Date(payload[0].payload.date).toLocaleDateString('vi-VN')}: {fmt(payload[0].value)}{' '}
                      {current.label.toLowerCase()}
                    </div>
                  ) : null
                }
              />
              <Line type="monotone" dataKey={metric} stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function EdgesCard({ edges, total }) {
  const rows = Object.entries(edges).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  return (
    <section aria-labelledby="ov-edges" className={`${card} space-y-3`}>
      <div>
        <h2 id="ov-edges" className="text-[15px] font-semibold text-[#0F172A]">
          Quan hệ trong đồ thị
        </h2>
        <p className="text-[13px] text-[#475569] mt-0.5 tabular-nums">Tổng {fmt(total)} quan hệ, 7 loại</p>
      </div>
      <ul className="space-y-2">
        {rows.map(([type, c]) => (
          <li key={type} className="text-[12px]">
            <div className="flex justify-between gap-2 mb-1">
              <span className="text-[#334155]">
                {EDGE_LABELS[type] ?? type} <span className="text-[#64748B]">{type}</span>
              </span>
              <span className="tabular-nums text-[#0F172A] font-medium">
                {fmt(c)} <span className="text-[#64748B] font-normal">({Math.round((c / total) * 100)}%)</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F1F5F9]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${(c / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopList({ id, title, items, empty }) {
  return (
    <section aria-labelledby={id} className={`${card} space-y-3`}>
      <h2 id={id} className="text-[15px] font-semibold text-[#0F172A]">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-[#64748B]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#E5E9F0]/60">{items}</ul>
      )}
    </section>
  );
}

function DegreeCard({ buckets }) {
  const data = useMemo(
    () =>
      DEGREE_RANGES.map(([bucket, min, max]) => ({
        bucket,
        users: buckets.filter((b) => b.degree >= min && b.degree <= max).reduce((s, b) => s + b.users, 0),
      })),
    [buckets]
  );
  return (
    <section aria-labelledby="ov-degree" className={`${card} space-y-3`}>
      <div>
        <h2 id="ov-degree" className="text-[15px] font-semibold text-[#0F172A]">
          Phân bố số người theo dõi
        </h2>
        <p className="text-[13px] text-[#475569] mt-0.5">
          Số người dùng theo khoảng số người theo dõi họ. Đa số có ít người theo dõi, một nhóm nhỏ có rất nhiều.
        </p>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#EEF1F5" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={44} tickFormatter={fmt} />
            <Tooltip
              cursor={{ fill: '#EFF4FF' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-[#0F172A] text-white px-3 py-1.5 rounded-[8px] text-xs tabular-nums shadow-md">
                    {fmt(payload[0].value)} người có {payload[0].payload.bucket} người theo dõi
                  </div>
                ) : null
              }
            />
            <Bar dataKey="users" fill={ACCENT} maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="users" position="top" fill="#475569" fontSize={11} formatter={fmt} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/**
 * Trang tổng quan của admin.
 * onNavigate(target): 'locked-users' | 'empty-topics' | 'backups' để mở đúng tab xử lý.
 */
export default function DashboardPanel({ topUsers = [], topics = [], onNavigate }) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [integrity, setIntegrity] = useState({ checks: null, loading: true, error: '', at: 0 });
  const [showModLog, setShowModLog] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ data: await adminApi.getOverview(), loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  const runIntegrity = useCallback(async () => {
    setIntegrity((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await adminApi.getIntegrity();
      setIntegrity({ checks: res.checks, loading: false, error: '', at: Date.now() });
    } catch (e) {
      setIntegrity((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    load();
    runIntegrity();
  }, [load, runIntegrity]);

  const d = state.data;
  const now = d?.generatedAt ?? Date.now();
  const week = d?.activity?.slice(-7) ?? [];
  const prevWeek = d?.activity?.slice(-14, -7) ?? [];
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const lastBackup = d?.backups?.last;
  const backupStale = !lastBackup || now - lastBackup.createdAt > 7 * DAY;
  const topTopics = topics.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#0F172A] tracking-[-0.01em]">Tổng quan</h1>
          <p className="text-[14px] text-[#475569] mt-0.5" aria-live="polite">
            {d ? `Số liệu lúc ${new Date(d.generatedAt).toLocaleTimeString('vi-VN')}` : 'Tình hình mạng xã hội và hệ thống'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            load();
            runIntegrity();
          }}
          disabled={state.loading}
          className={`${btnSecondary} inline-flex items-center gap-1.5`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? 'animate-spin text-[#2563EB]' : ''}`} aria-hidden="true" />
          Làm mới
        </button>
      </div>

      {state.error && (
        <div role="alert" className="p-4 rounded-[12px] border border-rose-200 bg-rose-50 text-sm text-rose-800 flex items-center justify-between gap-4">
          <span>{state.error}. Các số liệu bên dưới chưa được cập nhật.</span>
          <button type="button" onClick={load} className={btnSecondary}>
            Thử lại
          </button>
        </div>
      )}

      {!d && state.loading && <p className="text-sm text-[#64748B]">Đang tải số liệu…</p>}

      {d && (
        <>
          <div className="grid grid-cols-4 gap-4 items-stretch">
            <Kpi icon={Users} label="Người dùng" value={fmt(d.users.total)}>
              <p>+{fmt(d.users.newWeek)} người mới trong 7 ngày</p>
              <p>
                {fmt(d.users.locked)} bị khóa, {fmt(d.users.admins)} quản trị viên
              </p>
            </Kpi>
            <Kpi icon={FileText} label="Bài viết" value={fmt(d.posts.total)}>
              <p>+{fmt(d.posts.newWeek)} bài trong 7 ngày</p>
              <p>
                <WeekDelta current={d.posts.newWeek} previous={d.posts.newPrevWeek} />
              </p>
            </Kpi>
            <Kpi icon={Activity} label="Tương tác 7 ngày" value={fmt(sum(week, 'interactions'))}>
              <p>Thích, bình luận, chia sẻ</p>
              <p>
                <WeekDelta current={sum(week, 'interactions')} previous={sum(prevWeek, 'interactions')} />
              </p>
            </Kpi>
            <Kpi
              icon={DatabaseBackup}
              label="Sao lưu gần nhất"
              value={lastBackup ? relativeTime(lastBackup.createdAt, now) : 'Chưa có'}
              tone={backupStale ? 'warn' : undefined}
            >
              <p>
                {lastBackup
                  ? `${new Date(lastBackup.createdAt).toLocaleString('vi-VN')}${lastBackup.auto ? ' (tự động)' : ''}`
                  : 'Chưa có bản sao lưu nào'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('backups')}
                className={`text-[12px] font-medium text-[#2563EB] hover:underline rounded ${focusRing}`}
              >
                {backupStale ? 'Tạo bản sao lưu ngay' : `Xem ${fmt(d.backups.count)} bản sao lưu`}
              </button>
            </Kpi>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <section aria-labelledby="ov-attention" className={`${card}`}>
              <h2 id="ov-attention" className="text-[15px] font-semibold text-[#0F172A]">
                Cần chú ý
              </h2>
              <ul className="mt-2">
                <AttentionItem
                  icon={Lock}
                  count={d.users.locked}
                  label="Tài khoản đang bị khóa"
                  actionLabel="Mở danh sách tài khoản bị khóa"
                  onClick={() => onNavigate('locked-users')}
                />
                <AttentionItem
                  icon={Trash2}
                  count={d.moderation.postsRemovedWeek}
                  label="Bài viết bị gỡ trong 7 ngày"
                  actionLabel="Mở nhật ký kiểm duyệt"
                  onClick={() => setShowModLog(true)}
                />
                <AttentionItem
                  icon={MessageSquareX}
                  count={d.moderation.commentsRemovedWeek}
                  label="Bình luận bị gỡ trong 7 ngày"
                  actionLabel="Mở nhật ký kiểm duyệt"
                  onClick={() => setShowModLog(true)}
                />
                <AttentionItem
                  icon={Hash}
                  count={d.emptyTopics.count}
                  label="Chủ đề chưa có bài viết"
                  hint={d.emptyTopics.names.length ? d.emptyTopics.names.map((n) => `#${n}`).join(', ') : undefined}
                  actionLabel="Mở danh sách chủ đề, ít bài nhất trước"
                  onClick={() => onNavigate('empty-topics')}
                />
              </ul>
            </section>
            <IntegrityCard state={integrity} onRun={runIntegrity} />
          </div>

          <ActivityCard activity={d.activity} />

          <div className="grid grid-cols-3 gap-4 items-start">
            <EdgesCard edges={d.edges} total={d.totalEdges} />
            <TopList
              id="ov-top-users"
              title="Người được theo dõi nhiều nhất"
              empty="Chưa có dữ liệu"
              items={topUsers.map((u) => (
                <li key={u.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                      alt=""
                      className="w-7 h-7 rounded-full bg-slate-100 border border-[#E5E9F0] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[#0F172A] truncate">{u.fullName}</div>
                      <div className="text-[11px] text-[#64748B]">@{u.username}</div>
                    </div>
                  </div>
                  <span className="text-[12px] text-[#475569] tabular-nums shrink-0">{fmt(u.followers)} người theo dõi</span>
                </li>
              ))}
            />
            <TopList
              id="ov-top-topics"
              title="Chủ đề nhiều bài nhất"
              empty="Chưa có chủ đề"
              items={topTopics.map((t) => (
                <li key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getTopicColor(t.name) }} aria-hidden="true" />
                    <span className="font-medium text-[#0F172A] truncate">#{t.name}</span>
                  </span>
                  <span className="text-[12px] text-[#475569] tabular-nums shrink-0">{fmt(t.postCount)} bài</span>
                </li>
              ))}
            />
          </div>

          <DegreeCard buckets={d.degreeBuckets} />
        </>
      )}

      {showModLog && <ModerationLogModal onClose={() => setShowModLog(false)} />}
    </div>
  );
}
