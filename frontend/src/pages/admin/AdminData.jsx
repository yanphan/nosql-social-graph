import { useState, useEffect } from 'react';
import {
  Database,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { http } from '../../api/client';

export default function AdminData() {
  const [activeTab, setActiveTab] = useState('integrity');

  // --- Integrity state ---
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityChecks, setIntegrityChecks] = useState([]);
  const [integrityError, setIntegrityError] = useState('');

  // --- Import state ---
  const [importFormat, setImportFormat] = useState('csv');
  const [importKind, setImportKind] = useState('users');
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  // --- Export state ---
  const [exportFormat, setExportFormat] = useState('json');
  const [exportLabel, setExportLabel] = useState('User');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const [exportError, setExportError] = useState('');

  // --- Seed state ---
  const [seedScale, setSeedScale] = useState('S');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedError, setSeedError] = useState('');

  // Fetch integrity on load
  const loadIntegrity = async () => {
    setIntegrityLoading(true);
    setIntegrityError('');
    try {
      const data = await http.get('/admin/integrity');
      setIntegrityChecks(data.checks || []);
    } catch (err) {
      setIntegrityError(err.message || 'Không thể kiểm tra toàn vẹn dữ liệu');
    } finally {
      setIntegrityLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrity();
  }, []);

  // Handle Import
  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Vui lòng chọn một file dữ liệu để import');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const queryParams = importFormat === 'csv' ? `?kind=${importKind}` : '';
      const data = await http.post(`/admin/import${queryParams}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
      setImportFile(null);
    } catch (err) {
      setImportError(err.message || 'Lỗi khi nhập dữ liệu');
    } finally {
      setImportLoading(false);
    }
  };

  // Handle Export
  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    setExportSuccess('');

    try {
      const params = {
        format: exportFormat,
        ...(exportFormat === 'csv' ? { label: exportLabel } : {}),
      };

      const response = await http.get('/admin/export', {
        params,
        responseType: 'blob',
      });

      // Tạo link download blob
      const blob = new Blob([response], {
        type: exportFormat === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${exportFormat === 'json' ? 'graph' : exportLabel.toLowerCase()}-${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(`Đã xuất file thành công dạng ${exportFormat.toUpperCase()}`);
    } catch (err) {
      setExportError(err.message || 'Lỗi khi xuất dữ liệu');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle Seed
  const handleSeed = async () => {
    if (
      !window.confirm(
        `XÁC NHẬN: Khởi tạo lại đồ thị mức ${seedScale}?\nThao tác này sẽ xóa toàn bộ dữ liệu đồ thị hiện tại và nạp lại từ đầu!`
      )
    ) {
      return;
    }

    setSeedLoading(true);
    setSeedError('');
    setSeedResult(null);

    try {
      const data = await http.post('/admin/seed', { scale: seedScale });
      setSeedResult(data);
      loadIntegrity(); // Chạy lại kiểm tra toàn vẹn
    } catch (err) {
      setSeedError(err.message || 'Lỗi khi khởi tạo seed');
    } finally {
      setSeedLoading(false);
    }
  };

  const passedIntegrity = integrityChecks.filter((c) => c.ok).length;
  const totalIntegrity = integrityChecks.length;
  const allIntegrityPassed = totalIntegrity > 0 && passedIntegrity === totalIntegrity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surfaceBorder">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-user" />
            Quản trị dữ liệu & Ràng buộc toàn vẹn
          </h1>
          <p className="text-xs text-muted mt-1">
            Sprint 3 (UC-15): Nhập/Xuất CSV/JSON, khởi tạo Seed quy mô S/M/L và kiểm tra 9 ràng buộc hệ thống.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-surfaceBorder self-start">
          <button
            onClick={() => setActiveTab('integrity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'integrity'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Kiểm tra toàn vẹn
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'import'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Nhập dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'export'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Xuất dữ liệu
          </button>
          <button
            onClick={() => setActiveTab('seed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'seed'
                ? 'bg-user text-white shadow-glow'
                : 'text-muted hover:text-ink'
            }`}
          >
            Khởi tạo Seed
          </button>
        </div>
      </div>

      {/* TAB 1: INTEGRITY CHECKS */}
      {activeTab === 'integrity' && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="glass-panel p-4 rounded-2xl border border-surfaceBorder flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                  allIntegrityPassed ? 'bg-good shadow-glow' : 'bg-danger'
                }`}
              >
                {allIntegrityPassed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-ink">
                  {allIntegrityPassed
                    ? 'Toàn bộ 9 ràng buộc đồ thị hợp lệ'
                    : 'Phát hiện vi phạm ràng buộc toàn vẹn'}
                </h3>
                <p className="text-xs text-muted">
                  Đã kiểm tra {passedIntegrity}/{totalIntegrity} quy tắc đạt chuẩn 100%.
                </p>
              </div>
            </div>

            <button
              onClick={loadIntegrity}
              disabled={integrityLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-medium transition-all shadow-glow disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${integrityLoading ? 'animate-spin' : ''}`} />
              <span>Chạy kiểm tra lại</span>
            </button>
          </div>

          {integrityError && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{integrityError}</span>
            </div>
          )}

          {/* Grid of Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrityChecks.map((c) => (
              <div
                key={c.key}
                className="glass-panel p-3.5 rounded-xl border border-surfaceBorder flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-ink line-clamp-1">{c.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      c.ok
                        ? 'bg-good/20 text-good border border-good/30'
                        : 'bg-danger/20 text-danger border border-danger/30'
                    }`}
                  >
                    {c.ok ? 'ĐẠT' : `VI PHẠM (${c.count})`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted border-t border-surfaceBorder/50 pt-2">
                  <span className="font-mono text-[10px] text-muted">{c.key}</span>
                  <span className="font-semibold text-ink">{c.count} vi phạm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT DATA */}
      {activeTab === 'import' && (
        <div className="max-w-2xl space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-user" />
              Nhập dữ liệu đồ thị (Bulk Importer)
            </h3>
            <p className="text-xs text-muted">
              Hỗ trợ file CSV theo 9 loại dữ liệu chuẩn hoặc JSON toàn bộ đồ thị (Nodes & Edges) với cơ chế phân lô 2.000 dòng.
            </p>

            <form onSubmit={handleImport} className="space-y-4">
              {/* Định dạng */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Định dạng nạp vào
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImportFormat('csv')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      importFormat === 'csv'
                        ? 'bg-user/20 border-user text-ink font-semibold'
                        : 'bg-surface border-surfaceBorder text-muted'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-good" />
                    CSV (Từng loại bảng)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportFormat('json')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      importFormat === 'json'
                        ? 'bg-user/20 border-user text-ink font-semibold'
                        : 'bg-surface border-surfaceBorder text-muted'
                    }`}
                  >
                    <FileCode className="w-4 h-4 text-post" />
                    JSON (Toàn bộ Graph)
                  </button>
                </div>
              </div>

              {/* Loại dữ liệu nếu chọn CSV */}
              {importFormat === 'csv' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Loại dữ liệu CSV (Kind)
                  </label>
                  <select
                    value={importKind}
                    onChange={(e) => setImportKind(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user"
                  >
                    <option value="users">1. Users (Người dùng)</option>
                    <option value="topics">2. Topics (Chủ đề)</option>
                    <option value="posts">3. Posts (Bài viết)</option>
                    <option value="follows">4. FOLLOWS (Quan hệ theo dõi)</option>
                    <option value="about">5. ABOUT (Bài viết thuộc chủ đề)</option>
                    <option value="interests">6. INTERESTED_IN (Sở thích user)</option>
                    <option value="likes">7. LIKED (Tương tác thích)</option>
                    <option value="comments">8. COMMENTED (Bình luận bài viết)</option>
                    <option value="shares">9. SHARED (Chia sẻ bài viết)</option>
                  </select>
                </div>
              )}

              {/* File Input */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Chọn file tải lên ({importFormat.toUpperCase()})
                </label>
                <input
                  type="file"
                  accept={importFormat === 'csv' ? '.csv' : '.json'}
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-user file:text-white"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-4 rounded-xl bg-good/10 border border-good/30 text-ink text-xs space-y-1">
                  <div className="flex items-center gap-2 text-good font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Nạp dữ liệu thành công!</span>
                  </div>
                  <p className="text-muted">
                    Đã thêm <strong className="text-ink">{importResult.inserted}</strong> bản ghi.
                    Số node trước: {importResult.before} → sau: {importResult.after}.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={importLoading || !importFile}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-semibold transition-all shadow-glow disabled:opacity-50"
              >
                {importLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nạp dữ liệu vào đồ thị...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Thực hiện Import dữ liệu</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: EXPORT DATA */}
      {activeTab === 'export' && (
        <div className="max-w-2xl space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-user" />
              Xuất dữ liệu đồ thị (Graph Exporter)
            </h3>
            <p className="text-xs text-muted">
              Trích xuất dữ liệu từ FalkorDB ra định dạng JSON (toàn bộ đỉnh và cạnh) hoặc CSV phân tách theo từng loại nhãn/quan hệ.
            </p>

            <div className="space-y-4">
              {/* Định dạng */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Định dạng xuất file
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      exportFormat === 'json'
                        ? 'bg-user/20 border-user text-ink font-semibold'
                        : 'bg-surface border-surfaceBorder text-muted'
                    }`}
                  >
                    <FileCode className="w-4 h-4 text-post" />
                    JSON (Toàn bộ Graph)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      exportFormat === 'csv'
                        ? 'bg-user/20 border-user text-ink font-semibold'
                        : 'bg-surface border-surfaceBorder text-muted'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-good" />
                    CSV (Theo nhãn)
                  </button>
                </div>
              </div>

              {/* Loại nhãn nếu chọn CSV */}
              {exportFormat === 'csv' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Nhãn Node / Loại Edge muốn xuất
                  </label>
                  <select
                    value={exportLabel}
                    onChange={(e) => setExportLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surfaceBorder text-ink text-xs focus:outline-none focus:border-user"
                  >
                    <optgroup label="Node Labels">
                      <option value="User">User</option>
                      <option value="Topic">Topic</option>
                      <option value="Post">Post</option>
                    </optgroup>
                    <optgroup label="Relationship Types">
                      <option value="FOLLOWS">FOLLOWS</option>
                      <option value="LIKED">LIKED</option>
                      <option value="COMMENTED">COMMENTED</option>
                      <option value="SHARED">SHARED</option>
                      <option value="ABOUT">ABOUT</option>
                      <option value="INTERESTED_IN">INTERESTED_IN</option>
                    </optgroup>
                  </select>
                </div>
              )}

              {exportError && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {exportSuccess && (
                <div className="p-3 rounded-xl bg-good/10 border border-good/30 text-good text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleExport}
                disabled={exportLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs bg-user text-white hover:bg-user/90 font-semibold transition-all shadow-glow disabled:opacity-50"
              >
                {exportLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang trích xuất dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Tải xuống file Export ({exportFormat.toUpperCase()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SEED DATABASE */}
      {activeTab === 'seed' && (
        <div className="max-w-3xl space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-surfaceBorder space-y-4">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-topic" />
              Khởi tạo dữ liệu mẫu (Synthetic Seed Generator)
            </h3>
            <p className="text-xs text-muted">
              Sinh dữ liệu mạng xã hội quy mô lớn dựa trên mô hình mạng không thang đo Barabási–Albert, quy luật Zipf cho chủ đề và thuộc tính Small-World với hạt giống ngẫu nhiên cố định <code>seed=42</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Scale S */}
              <button
                type="button"
                onClick={() => setSeedScale('S')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  seedScale === 'S'
                    ? 'bg-user/20 border-user shadow-glow'
                    : 'bg-surface border-surfaceBorder hover:border-user/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-ink">Scale S</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-user/30 text-white font-mono">
                    Small
                  </span>
                </div>
                <p className="text-xs text-muted mb-2">1.000 Users</p>
                <p className="text-[11px] text-muted">
                  ~25.000 Nodes & Cạnh. Phù hợp demo kịch bản nhanh và kiểm thử đơn vị.
                </p>
              </button>

              {/* Scale M */}
              <button
                type="button"
                onClick={() => setSeedScale('M')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  seedScale === 'M'
                    ? 'bg-user/20 border-user shadow-glow'
                    : 'bg-surface border-surfaceBorder hover:border-user/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-ink">Scale M</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-topic/30 text-topic font-mono">
                    Medium
                  </span>
                </div>
                <p className="text-xs text-muted mb-2">10.000 Users</p>
                <p className="text-[11px] text-muted">
                  ~275.000 Nodes & Cạnh. Quy mô tiêu chuẩn cho bài thí nghiệm benchmark.
                </p>
              </button>

              {/* Scale L */}
              <button
                type="button"
                onClick={() => setSeedScale('L')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  seedScale === 'L'
                    ? 'bg-user/20 border-user shadow-glow'
                    : 'bg-surface border-surfaceBorder hover:border-user/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-ink">Scale L</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/30 text-danger font-mono">
                    Large
                  </span>
                </div>
                <p className="text-xs text-muted mb-2">100.000 Users</p>
                <p className="text-[11px] text-muted">
                  ~3.000.000 Nodes & Cạnh. Kiểm chứng năng lực chịu tải tối đa của FalkorDB.
                </p>
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3 rounded-xl bg-topic/10 border border-topic/30 text-xs text-ink flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-topic shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-topic">Cảnh báo ghi đè đồ thị</p>
                <p className="text-muted mt-0.5">
                  Thao tác Seed sẽ thực thi lệnh <code>MATCH (n) DETACH DELETE n</code> trước khi nạp. Đảm bảo bạn đã sao lưu dữ liệu nếu cần giữ trạng thái hiện tại.
                </p>
              </div>
            </div>

            {seedError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{seedError}</span>
              </div>
            )}

            {seedResult && (
              <div className="p-4 rounded-xl bg-good/10 border border-good/30 text-xs text-ink space-y-1">
                <div className="flex items-center gap-2 text-good font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Khởi tạo đồ thị mức {seedResult.scale} thành công!</span>
                </div>
                <p className="text-muted">
                  Đã tạo <strong className="text-ink">{seedResult.nodes.toLocaleString()}</strong> nodes,{' '}
                  <strong className="text-ink">{seedResult.edges.toLocaleString()}</strong> relationships trong{' '}
                  <strong className="text-ink">{seedResult.ms}ms</strong>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSeed}
              disabled={seedLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs bg-topic text-white hover:bg-topic/90 font-semibold transition-all shadow-glow disabled:opacity-50"
            >
              {seedLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang khởi tạo dữ liệu Seed {seedScale}...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Xác nhận & Khởi tạo dữ liệu Seed (Scale {seedScale})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
