import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Download, Upload, Plus, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { adminApi } from '@/services/admin';
import {
  ModalShell,
  ModalHeader,
  ErrorNote,
  focusRing,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from './ModalShell';
import { TableStatusRow } from './listing';

const NODE_KINDS = [
  { value: 'User', label: 'Người dùng (User)' },
  { value: 'Post', label: 'Bài viết (Post)' },
  { value: 'Topic', label: 'Chủ đề (Topic)' },
];
const EDGE_KINDS = [
  { value: 'FOLLOWS', label: 'Theo dõi (FOLLOWS)' },
  { value: 'POSTED', label: 'Đăng bài (POSTED)' },
  { value: 'ABOUT', label: 'Bài thuộc chủ đề (ABOUT)' },
  { value: 'INTERESTED_IN', label: 'Quan tâm chủ đề (INTERESTED_IN)' },
  { value: 'LIKED', label: 'Thích (LIKED)' },
  { value: 'COMMENTED', label: 'Bình luận (COMMENTED)' },
  { value: 'SHARED', label: 'Chia sẻ (SHARED)' },
];
// POSTED không nhập riêng: tạo cùng bài viết qua cột authorId
const IMPORT_EDGE_KINDS = EDGE_KINDS.filter((k) => k.value !== 'POSTED');

const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('vi-VN'));
const fmtSize = (b) => {
  if (!b && b !== 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
const fmtTime = (ms) => (ms ? new Date(Number(ms)).toLocaleString('vi-VN') : '—');
const fmtSec = (ms) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây`;
const diff = (a, b) => {
  const d = b - a;
  return d === 0 ? 'không đổi' : `${d > 0 ? '+' : ''}${d.toLocaleString('vi-VN')}`;
};

const card = 'p-5 bg-white border border-[#E5E9F0] rounded-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const fieldLabel = 'block text-xs font-medium text-[#334155] mb-1.5';
const selectCls = `w-full h-9 pl-2.5 pr-7 rounded-[10px] border border-[#E5E9F0] bg-white text-xs text-[#0F172A] disabled:bg-slate-50 ${focusRing}`;
const smallBtn = `h-7 px-2.5 rounded-[8px] border border-[#E5E9F0] text-[12px] text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 inline-flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none ${focusRing}`;

function KindOptions({ edges }) {
  return (
    <>
      <optgroup label="Node">
        {NODE_KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Quan hệ">
        {edges.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </optgroup>
    </>
  );
}

const Spinner = () => <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;

/** Xuất toàn đồ thị (JSON) hoặc một loại node / quan hệ (CSV). Không kèm mật khẩu. */
function ExportCard({ busy, setBusy, showToast }) {
  const [target, setTarget] = useState('graph');
  const [error, setError] = useState('');
  const running = busy === 'export';

  const handleExport = async () => {
    setError('');
    setBusy('export');
    try {
      const res =
        target === 'graph'
          ? await adminApi.exportData({ format: 'json' })
          : await adminApi.exportData({ format: 'csv', label: target });
      showToast(`Đã xuất ${res.file} (${fmtSize(res.sizeBytes)})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="sys-export-title" className={`${card} space-y-3`}>
      <div>
        <h2 id="sys-export-title" className="text-[15px] font-semibold text-[#0F172A]">
          Xuất dữ liệu
        </h2>
        <p className="text-[13px] text-[#475569] mt-0.5">
          Toàn đồ thị ra một file JSON, hoặc từng loại node / quan hệ ra CSV. File xuất không chứa mật khẩu.
        </p>
      </div>
      <div>
        <label htmlFor="sys-export-target" className={fieldLabel}>
          Dữ liệu cần xuất
        </label>
        <select
          id="sys-export-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={!!busy}
          className={selectCls}
        >
          <option value="graph">Toàn bộ đồ thị (JSON)</option>
          <KindOptions edges={EDGE_KINDS} />
        </select>
        <p className="text-[12px] text-[#64748B] mt-1.5">
          {target === 'graph'
            ? 'Gồm mọi node và quan hệ; dùng lại được bằng chức năng nhập.'
            : 'CSV của quan hệ có cột s, t là id hai đầu cùng các thuộc tính.'}
        </p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <button type="button" onClick={handleExport} disabled={!!busy} className={`${btnSecondary} inline-flex items-center gap-1.5`}>
        {running ? <Spinner /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
        {running ? 'Đang xuất…' : 'Tải xuống'}
      </button>
    </section>
  );
}

/** Nhập JSON (định dạng xuất) hoặc CSV một loại; cập nhật theo id, không tạo trùng. */
function ImportCard({ busy, setBusy, showToast, onChanged }) {
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const running = busy === 'import';
  const isCsv = file?.name.toLowerCase().endsWith('.csv');
  const isJson = file?.name.toLowerCase().endsWith('.json');

  const pickFile = (f) => {
    setError('');
    setResult(null);
    if (f && !/\.(csv|json)$/i.test(f.name)) {
      setFile(null);
      setError('Chỉ nhận file .csv hoặc .json');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFile(f ?? null);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return setError('Hãy chọn file cần nhập');
    if (isCsv && !kind) return setError('Hãy chọn loại dữ liệu của file CSV');
    setError('');
    setResult(null);
    setBusy('import');
    try {
      const res = await adminApi.importData(file, isCsv ? kind : undefined);
      setResult({ ...res, fileName: file.name });
      showToast(`Đã nhập ${file.name}`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="sys-import-title" className={`${card} space-y-3`}>
      <div>
        <h2 id="sys-import-title" className="text-[15px] font-semibold text-[#0F172A]">
          Nhập dữ liệu
        </h2>
        <p className="text-[13px] text-[#475569] mt-0.5">
          Gộp vào đồ thị hiện có theo id: bản ghi đã có thì cập nhật, chưa có thì thêm mới, không tạo trùng.
        </p>
      </div>
      <form onSubmit={handleImport} className="space-y-3" noValidate>
        <div>
          <label htmlFor="sys-import-file" className={fieldLabel}>
            File .json hoặc .csv (tối đa 50 MB)
          </label>
          <input
            id="sys-import-file"
            ref={inputRef}
            type="file"
            accept=".csv,.json"
            disabled={!!busy}
            onChange={(e) => pickFile(e.target.files?.[0])}
            className={`block w-full text-xs text-[#475569] file:mr-3 file:h-8 file:px-3 file:rounded-[8px] file:border file:border-[#E5E9F0] file:bg-white file:text-xs file:font-medium file:text-[#334155] hover:file:bg-slate-50 ${focusRing}`}
          />
        </div>
        {isCsv && (
          <div>
            <label htmlFor="sys-import-kind" className={fieldLabel}>
              Loại dữ liệu trong file CSV
            </label>
            <select
              id="sys-import-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={!!busy}
              aria-required="true"
              className={selectCls}
            >
              <option value="">Chọn loại…</option>
              <KindOptions edges={IMPORT_EDGE_KINDS} />
            </select>
            <p className="text-[12px] text-[#64748B] mt-1.5">
              {kind === 'Post'
                ? 'Cần cột id và authorId (id tác giả đã có); bài thiếu tác giả bị bỏ qua.'
                : kind === 'User'
                  ? 'Người dùng mới chưa có mật khẩu: đặt mật khẩu trong mục Người dùng để họ đăng nhập được.'
                  : kind === 'COMMENTED'
                    ? 'Cần cột s, t và at (thời điểm bình luận, epoch ms).'
                    : 'Cột giống file CSV xuất ra từ hệ thống.'}
            </p>
          </div>
        )}
        {isJson && (
          <p className="text-[12px] text-[#64748B]">
            File JSON phải theo định dạng của chức năng xuất (mảng nodes và edges).
          </p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" disabled={!!busy || !file} className={`${btnSecondary} inline-flex items-center gap-1.5`}>
          {running ? <Spinner /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
          {running ? 'Đang nhập…' : 'Nhập dữ liệu'}
        </button>
      </form>
      {result && <ImportResult result={result} />}
    </section>
  );
}

function ImportResult({ result }) {
  const { rows, skipped, errors = [], before, after, ms, fileName } = result;
  return (
    <div role="status" className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] p-3.5 text-xs text-[#334155] space-y-1.5">
      <p className="font-medium text-[#0F172A]">
        Đã nhập {fileName} trong {fmtSec(ms ?? 0)}
      </p>
      <p className="tabular-nums">
        {fmtNum(rows)} dòng, ghi {fmtNum(rows - skipped)}, bỏ qua {fmtNum(skipped)}
      </p>
      {before && after && (
        <p className="tabular-nums">
          Node: {fmtNum(before.nodes)} → {fmtNum(after.nodes)} ({diff(before.nodes, after.nodes)}) · Quan hệ:{' '}
          {fmtNum(before.edges)} → {fmtNum(after.edges)} ({diff(before.edges, after.edges)})
        </p>
      )}
      {skipped > 0 && (
        <p className="text-amber-800">
          Dòng bị bỏ qua thường do thiếu id, đầu mút quan hệ không tồn tại, bài viết không có tác giả hoặc bình luận
          thiếu thời điểm.
        </p>
      )}
      {errors.length > 0 && (
        <ul className="list-disc pl-4 text-rose-700">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RestoreModal({ backup, onClose, onDone }) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleRestore = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await adminApi.restoreBackup(backup.file);
      onDone(res);
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
        title="Phục hồi dữ liệu"
        description={`Từ bản sao lưu lúc ${fmtTime(backup.createdAt)}`}
        onClose={onClose}
        busy={busy}
      />
      <div className="text-[13px] text-[#334155] space-y-2">
        <p>
          Toàn bộ đồ thị hiện tại sẽ bị thay bằng nội dung bản sao lưu ({fmtNum(backup.nodes)} node,{' '}
          {fmtNum(backup.edges)} quan hệ). Mọi thay đổi sau thời điểm sao lưu sẽ mất.
        </p>
        <p>
          Trước khi phục hồi, hệ thống tự tạo một bản sao lưu của trạng thái hiện tại. Nếu phục hồi lỗi, dữ liệu được đưa
          về trạng thái trước đó.
        </p>
        <p className="text-[#64748B]">Có thể mất vài chục giây; trong lúc đó các thao tác nhập/xuất khác phải chờ.</p>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
          Hủy
        </button>
        <button type="button" onClick={handleRestore} disabled={busy} className={`${btnDanger} inline-flex items-center gap-1.5`}>
          {busy && <Spinner />}
          {busy ? 'Đang phục hồi…' : 'Phục hồi'}
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteBackupModal({ backup, onClose, onDone }) {
  const titleId = useId();
  const descId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.deleteBackup(backup.file);
      onDone();
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
        title="Xóa bản sao lưu"
        description={backup.file}
        onClose={onClose}
        busy={busy}
      />
      <p className="text-[13px] text-[#334155]">
        File sao lưu lúc {fmtTime(backup.createdAt)} sẽ bị xóa khỏi máy chủ và không phục hồi từ nó được nữa. Dữ liệu
        đồ thị hiện tại không bị ảnh hưởng.
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
          Hủy
        </button>
        <button type="button" onClick={handleDelete} disabled={busy} className={btnDanger}>
          {busy ? 'Đang xóa…' : 'Xóa bản sao lưu'}
        </button>
      </div>
    </ModalShell>
  );
}

/** Danh sách bản sao lưu trên máy chủ: tạo mới, phục hồi, xóa */
function BackupCard({ busy, setBusy, showToast, onChanged }) {
  const [list, setList] = useState({ items: [], loading: true, error: '' });
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [lastRestore, setLastRestore] = useState(null);
  const running = busy === 'backup';

  const load = useCallback(async () => {
    setList((s) => ({ ...s, loading: true, error: '' }));
    try {
      const items = await adminApi.getBackups();
      setList({ items: items ?? [], loading: false, error: '' });
    } catch (e) {
      setList({ items: [], loading: false, error: e.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setBusy('backup');
    try {
      const res = await adminApi.createBackup();
      showToast(`Đã tạo bản sao lưu (${fmtNum(res.nodes)} node, ${fmtNum(res.edges)} quan hệ)`);
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRestored = (res) => {
    setRestoring(null);
    setLastRestore(res);
    showToast(`Đã phục hồi ${fmtNum(res.nodes)} node, ${fmtNum(res.edges)} quan hệ`);
    load();
    onChanged?.();
  };

  const handleDeleted = () => {
    showToast(`Đã xóa ${deleting.file}`);
    setDeleting(null);
    load();
  };

  return (
    <section aria-labelledby="sys-backup-title" className={`${card} space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="sys-backup-title" className="text-[15px] font-semibold text-[#0F172A]">
            Sao lưu &amp; phục hồi
          </h2>
          <p className="text-[13px] text-[#475569] mt-0.5">
            Bản sao lưu lưu trên máy chủ gồm toàn bộ node, quan hệ và mật khẩu đã băm, để phục hồi nguyên trạng.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!!busy}
          className={`${btnPrimary} inline-flex items-center gap-1.5 shrink-0`}
        >
          {running ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {running ? 'Đang sao lưu…' : 'Tạo bản sao lưu'}
        </button>
      </div>

      {lastRestore && (
        <p role="status" className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[10px] px-3 py-2">
          Đã phục hồi từ {lastRestore.file}: {fmtNum(lastRestore.nodes)} node, {fmtNum(lastRestore.edges)} quan hệ, khớp
          bản sao lưu ({fmtSec(lastRestore.ms)}). Trạng thái trước đó được lưu ở {lastRestore.safetyBackup}.
        </p>
      )}

      <div className="border border-[#E5E9F0] rounded-[12px] overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Danh sách bản sao lưu, mới nhất trước</caption>
          <thead className="bg-[#F8FAFC] border-b border-[#E5E9F0] text-[#64748B] [&_th]:font-medium [&_th]:text-[13px]">
            <tr>
              <th scope="col" className="py-3 px-4">Thời gian</th>
              <th scope="col" className="py-3 px-4 text-right">Node</th>
              <th scope="col" className="py-3 px-4 text-right">Quan hệ</th>
              <th scope="col" className="py-3 px-4 text-right">Dung lượng</th>
              <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9F0]/60">
            <TableStatusRow
              colSpan={5}
              loading={list.loading}
              error={list.error}
              empty={list.items.length === 0}
              onRetry={load}
              emptyText="Chưa có bản sao lưu nào"
            />
            {!list.error &&
              list.items.map((b) => (
                <tr key={b.file} className="hover:bg-[#F3F5F9]/60">
                  <td className="py-2.5 px-4">
                    <div className="text-[#0F172A] tabular-nums">{fmtTime(b.createdAt)}</div>
                    <div className="text-[12px] text-[#64748B] flex items-center gap-1.5">
                      <span className="truncate">{b.file}</span>
                      {b.auto && (
                        <span className="shrink-0 px-1.5 py-px rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                          Tự động trước phục hồi
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right text-[#475569] tabular-nums">{fmtNum(b.nodes)}</td>
                  <td className="py-2.5 px-4 text-right text-[#475569] tabular-nums">{fmtNum(b.edges)}</td>
                  <td className="py-2.5 px-4 text-right text-[#475569] tabular-nums">{fmtSize(b.sizeBytes)}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRestoring(b)}
                        disabled={!!busy}
                        aria-label={`Phục hồi từ bản sao lưu lúc ${fmtTime(b.createdAt)}`}
                        className={smallBtn}
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        Phục hồi
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(b)}
                        disabled={!!busy}
                        aria-label={`Xóa bản sao lưu lúc ${fmtTime(b.createdAt)}`}
                        className={`${smallBtn} hover:text-rose-700`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {restoring && <RestoreModal backup={restoring} onClose={() => setRestoring(null)} onDone={handleRestored} />}
      {deleting && <DeleteBackupModal backup={deleting} onClose={() => setDeleting(null)} onDone={handleDeleted} />}
    </section>
  );
}

/**
 * Tab Nhập/xuất & sao lưu. Backend chỉ cho một thao tác nặng chạy tại một thời điểm (409),
 * nên giao diện cũng khóa các nút khác khi đang chạy.
 */
export default function SystemPanel({ showToast, onChanged }) {
  const [busy, setBusy] = useState(null);
  const shared = { busy, setBusy, showToast, onChanged };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6 items-start">
        <ExportCard {...shared} />
        <ImportCard {...shared} />
      </div>
      <BackupCard {...shared} />
    </div>
  );
}
