import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminApi } from '@/services/admin';
import { ModalShell, ModalHeader, focusRing } from './ModalShell';

// Tên chủ đề giống cách backend chuẩn hóa (chữ thường, khoảng trắng thành "-"), chỉ giữ a-z 0-9 _ -
const normalizeTopicName = (value) =>
  value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');

export function EditTopicModal({ topic, onClose, onSaved }) {
  const [name, setName] = useState(topic.name ?? '');
  const [description, setDescription] = useState(topic.description ?? '');
  const [nameError, setNameError] = useState('');
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const unchanged = name === topic.name && description.trim() === (topic.description ?? '').trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!name) {
      setNameError('Tên chủ đề không được để trống');
      nameRef.current?.focus();
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const updated = await adminApi.updateTopic(topic.id, { name, description: description.trim() });
      onSaved(updated);
    } catch (err) {
      // Tên trùng thì báo ngay dưới ô tên, lỗi khác hiện ở đầu form
      if (/tên chủ đề/i.test(err.message)) {
        setNameError(err.message);
        nameRef.current?.focus();
      } else {
        setApiError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell titleId="edit-topic-title" descId="edit-topic-desc" onClose={onClose} busy={saving}>
      <ModalHeader
        titleId="edit-topic-title"
        descId="edit-topic-desc"
        title={`Sửa chủ đề #${topic.name}`}
        description={`Đang gắn với ${topic.postCount ?? 0} bài viết. Đổi tên không làm mất liên kết với bài viết.`}
        onClose={onClose}
        busy={saving}
      />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {apiError && (
          <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2">
            {apiError}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="topic-name" className="text-xs font-medium text-[#0F172A]">
            Tên chủ đề
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]" aria-hidden="true">
              #
            </span>
            <input
              id="topic-name"
              ref={nameRef}
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => {
                setName(normalizeTopicName(e.target.value));
                setNameError('');
              }}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'topic-name-error' : 'topic-name-hint'}
              className={`w-full h-9 pl-6 pr-3 bg-[#F8FAFC] rounded-[10px] text-xs text-[#0F172A] border focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 ${
                nameError ? 'border-rose-400 focus:border-rose-500' : 'border-[#E5E9F0] focus:border-[#2563EB]'
              }`}
            />
          </div>
          {nameError ? (
            <p id="topic-name-error" className="text-xs text-rose-700">
              {nameError}
            </p>
          ) : (
            <p id="topic-name-hint" className="text-xs text-[#64748B]">
              Chữ thường, số, dấu "-" hoặc "_". Khoảng trắng tự đổi thành "-".
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="topic-description" className="text-xs font-medium text-[#0F172A]">
            Mô tả <span className="font-normal text-[#64748B]">(không bắt buộc)</span>
          </label>
          <textarea
            id="topic-description"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[#F8FAFC] rounded-[10px] text-xs text-[#0F172A] border border-[#E5E9F0] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25 resize-none"
          />
          <p className="text-[11px] text-[#64748B] text-right tabular-nums">{description.length}/300</p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`h-9 px-4 rounded-[10px] text-xs font-medium text-[#334155] border border-[#E5E9F0] hover:bg-[#F8FAFC] ${focusRing}`}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`h-9 px-4 rounded-[10px] text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 ${focusRing}`}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function DeleteTopicModal({ topic, onClose, onDeleted }) {
  const [impact, setImpact] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [apiError, setApiError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    adminApi
      .getTopicImpact(topic.id)
      .then(setImpact)
      .catch((err) => setLoadError(err.message));
  }, [topic.id]);

  const blocked = impact?.orphanPosts > 0;

  const handleDelete = async () => {
    setApiError('');
    setDeleting(true);
    try {
      await adminApi.deleteTopic(topic.id);
      onDeleted(topic);
    } catch (err) {
      setApiError(err.message);
      setDeleting(false);
    }
  };

  return (
    <ModalShell titleId="delete-topic-title" descId="delete-topic-desc" onClose={onClose} busy={deleting}>
      <ModalHeader
        titleId="delete-topic-title"
        descId="delete-topic-desc"
        title={`Xóa chủ đề #${topic.name}?`}
        description="Thao tác này không thể hoàn tác."
        onClose={onClose}
        busy={deleting}
      />

      <div className="space-y-3 text-xs" aria-live="polite">
        {!impact && !loadError && <p className="text-[#475569]">Đang kiểm tra dữ liệu liên quan…</p>}
        {loadError && (
          <p role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2">
            {loadError}
          </p>
        )}
        {impact && (
          <>
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] px-3 py-2.5">
                <dt className="text-[#475569]">Bài viết đang gắn</dt>
                <dd className="mt-0.5 text-base font-semibold text-[#0F172A] tabular-nums">
                  {impact.posts.toLocaleString('vi-VN')}
                </dd>
              </div>
              <div className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] px-3 py-2.5">
                <dt className="text-[#475569]">Người đang quan tâm</dt>
                <dd className="mt-0.5 text-base font-semibold text-[#0F172A] tabular-nums">
                  {impact.interested.toLocaleString('vi-VN')}
                </dd>
              </div>
            </dl>

            {blocked ? (
              <div role="alert" className="flex gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  Không thể xóa: <strong>{impact.orphanPosts.toLocaleString('vi-VN')}</strong> bài viết chỉ gắn chủ đề này
                  và sẽ không còn chủ đề nào. Hãy gắn thêm chủ đề khác cho các bài đó hoặc xóa chúng trước.
                </p>
              </div>
            ) : (
              <p className="text-[#475569]">
                Chủ đề sẽ bị gỡ khỏi các bài viết và danh sách quan tâm của người dùng. Mọi bài viết đều còn ít nhất một chủ đề
                khác.
              </p>
            )}
          </>
        )}
        {apiError && (
          <p role="alert" className="text-rose-700 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2">
            {apiError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          ref={cancelRef}
          type="button"
          onClick={onClose}
          disabled={deleting}
          className={`h-9 px-4 rounded-[10px] text-xs font-medium text-[#334155] border border-[#E5E9F0] hover:bg-[#F8FAFC] ${focusRing}`}
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!impact || blocked || deleting}
          className={`h-9 px-4 rounded-[10px] text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`}
        >
          {deleting ? 'Đang xóa…' : 'Xóa chủ đề'}
        </button>
      </div>
    </ModalShell>
  );
}
