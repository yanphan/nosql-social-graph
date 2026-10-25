import { useState, useEffect } from 'react';
import { Tag, Plus, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { http } from '../../api/client';

export default function AdminTopics() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const data = await http.get('/topics');
      setTopics(data || []);
    } catch (err) {
      console.error('Fetch topics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setMessage('');
    try {
      await http.post('/topics', { name: name.trim().toLowerCase(), description: description.trim() });
      setName('');
      setDescription('');
      setMessage('Tạo chủ đề mới thành công!');
      fetchTopics();
    } catch (err) {
      alert(err.message || 'Không thể tạo chủ đề');
    } finally {
      setCreating(false);
    }
  };

  const filtered = topics.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-surfaceBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-topic font-semibold text-xs uppercase tracking-wider mb-1">
            <Tag className="w-4 h-4 text-topic" />
            Quản trị Hệ thống
          </div>
          <h1 className="text-xl font-bold text-ink">Quản lý Chủ đề Thảo luận ({topics.length} chủ đề)</h1>
          <p className="text-xs text-muted mt-1">
            Quản lý các nhãn chủ đề được liên kết với bài viết ([:ABOUT]) và sở thích người dùng ([:INTERESTED_IN])
          </p>
        </div>

        <button
          onClick={fetchTopics}
          className="p-2 glass-panel rounded-xl border border-surfaceBorder text-muted hover:text-ink transition-colors self-start sm:self-auto"
          title="Tải lại"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="glass-panel rounded-2xl p-6 border border-surfaceBorder h-fit space-y-4">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Plus className="w-4 h-4 text-topic" />
            Tạo chủ đề mới
          </h2>

          {message && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase mb-1">
                Tên chủ đề (không dấu, cách nhau bởi gạch nối)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs font-mono">#</span>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: machinelearning"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink placeholder-muted focus:border-topic focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted uppercase mb-1">
                Mô tả ngắn
              </label>
              <textarea
                rows={3}
                placeholder="Mô tả tóm tắt về chủ đề này..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink placeholder-muted focus:border-topic focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full py-2.5 rounded-xl bg-topic text-white text-xs font-semibold shadow-glow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Đang tạo...' : 'Tạo chủ đề'}
            </button>
          </form>
        </div>

        {/* Topics List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm chủ đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-surfaceBorder text-xs text-ink placeholder-muted focus:border-topic focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-muted">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-topic" />
                Đang nạp danh sách chủ đề...
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-muted glass-panel rounded-2xl border border-surfaceBorder">
                Không tìm thấy chủ đề nào.
              </div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id || t.name}
                  className="glass-panel p-4 rounded-xl border border-surfaceBorder hover:border-topic/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-sm font-bold text-ink text-topic">
                      #{t.name}
                    </span>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {t.description || 'Không có mô tả'}
                    </p>
                  </div>
                  <div className="pt-2 text-[10px] text-muted flex items-center justify-between border-t border-surfaceBorder/40 mt-3">
                    <span className="font-mono">ID: {t.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
