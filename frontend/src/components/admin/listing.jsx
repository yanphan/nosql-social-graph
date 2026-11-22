import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { focusRing } from './ModalShell';

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Tải một trang dữ liệu theo `query`. Đổi query thì hủy request cũ (AbortController),
 * nên kết quả trả về chậm của lần gõ trước không ghi đè kết quả mới.
 * fetchFn(query, signal) -> { items, total, hasMore }
 */
export function usePagedList(fetchFn, query) {
  const [state, setState] = useState({ items: [], total: 0, hasMore: false, loading: true, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const key = JSON.stringify(query);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetchRef
      .current(query, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setState({
          items: data?.items ?? [],
          total: Number(data?.total ?? 0),
          hasMore: Boolean(data?.hasMore),
          loading: false,
          error: '',
        });
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: err.message || 'Không tải được dữ liệu' }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadKey]);

  return {
    ...state,
    reload: () => setReloadKey((k) => k + 1),
    updateItems: (fn) => setState((s) => ({ ...s, items: fn(s.items) })),
  };
}

export function SearchBox({ id, label, value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-[240px] max-w-md">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full h-9 pl-9 pr-9 rounded-[10px] border border-[#E5E9F0] bg-white text-xs text-[#0F172A] placeholder:text-[#64748B] ${focusRing}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xóa từ khóa tìm kiếm"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-[#64748B] hover:text-[#0F172A] ${focusRing}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs text-[#475569] whitespace-nowrap">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 pl-2.5 pr-7 rounded-[10px] border border-[#E5E9F0] bg-white text-xs text-[#0F172A] ${focusRing}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const pagerBtn = `h-8 px-2.5 rounded-[8px] bg-white border border-[#E5E9F0] text-xs font-medium text-[#475569] hover:bg-slate-50 hover:text-[#0F172A] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 ${focusRing}`;

/** Chân bảng: "Hiển thị 11–20 trên 1.234 …", số trang, nút trước/sau. */
export function Pager({ label, noun, page, limit, total, shown, loading, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + shown;
  return (
    <nav
      aria-label={label}
      className="p-3.5 bg-[#F8FAFC] border-t border-[#E5E9F0] flex items-center justify-between gap-3 text-xs text-[#475569]"
    >
      <p aria-live="polite" className="tabular-nums">
        {total === 0 ? (
          `Không có ${noun} nào`
        ) : (
          <>
            Hiển thị <span className="font-semibold text-[#0F172A]">{from.toLocaleString('vi-VN')}</span>–
            <span className="font-semibold text-[#0F172A]">{to.toLocaleString('vi-VN')}</span> trên{' '}
            <span className="font-semibold text-[#0F172A]">{total.toLocaleString('vi-VN')}</span> {noun}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Trang {page.toLocaleString('vi-VN')} / {pages.toLocaleString('vi-VN')}
        </span>
        <button
          type="button"
          className={pagerBtn}
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Trước
        </button>
        <button
          type="button"
          className={pagerBtn}
          disabled={page >= pages || loading}
          onClick={() => onPage(page + 1)}
          aria-label="Trang sau"
        >
          Sau
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

/** Dòng trạng thái trong bảng: đang tải / lỗi (kèm thử lại) / rỗng */
export function TableStatusRow({ colSpan, loading, error, empty, onRetry, emptyText }) {
  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-6 px-4 text-center">
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={`mt-2 h-8 px-3 rounded-[8px] border border-[#E5E9F0] text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] ${focusRing}`}
          >
            Thử lại
          </button>
        </td>
      </tr>
    );
  }
  if (loading && empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-6 px-4 text-center text-xs text-[#475569]">
          Đang tải…
        </td>
      </tr>
    );
  }
  if (empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="py-6 px-4 text-center text-xs text-[#475569]">
          {emptyText}
        </td>
      </tr>
    );
  }
  return null;
}
