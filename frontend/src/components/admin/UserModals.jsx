import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '@/services/admin';
import { ModalShell, ModalHeader, ErrorNote, focusRing, btnSecondary, btnDanger, btnPrimary } from './ModalShell';

const fmtNum = (n) => Number(n ?? 0).toLocaleString('vi-VN');

const ACTIONS = {
  lock: {
    title: (u) => `Khóa tài khoản @${u.username}?`,
    description: 'Người dùng bị đăng xuất ngay và không thể đăng nhập cho tới khi được mở khóa.',
    confirm: 'Khóa tài khoản',
    busy: 'Đang khóa…',
    danger: true,
  },
  unlock: {
    title: (u) => `Mở khóa tài khoản @${u.username}?`,
    description: 'Người dùng có thể đăng nhập và sử dụng lại bình thường.',
    confirm: 'Mở khóa',
    busy: 'Đang mở khóa…',
    danger: false,
  },
  delete: {
    title: (u) => `Xóa tài khoản @${u.username}?`,
    description: 'Thao tác này không thể hoàn tác.',
    confirm: 'Xóa tài khoản',
    busy: 'Đang xóa…',
    danger: true,
  },
};

/** Xác nhận khóa / mở khóa / xóa tài khoản, nêu rõ dữ liệu bị ảnh hưởng. */
export function ConfirmUserActionModal({ user, action, onClose, onDone }) {
  const cfg = ACTIONS[action];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      if (action === 'delete') await adminApi.deleteUser(user.id);
      else await adminApi.setUserStatus(user.id, action === 'lock' ? 'locked' : 'active');
      onDone(user, action);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <ModalShell titleId="user-action-title" descId="user-action-desc" onClose={onClose} busy={busy}>
      <ModalHeader
        titleId="user-action-title"
        descId="user-action-desc"
        title={cfg.title(user)}
        description={cfg.description}
        onClose={onClose}
        busy={busy}
      />
      {action === 'delete' && (
        <div className="space-y-3 text-xs">
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] px-3 py-2.5">
              <dt className="text-[#475569]">Bài viết sẽ bị xóa</dt>
              <dd className="mt-0.5 text-base font-semibold text-[#0F172A] tabular-nums">{fmtNum(user.posts)}</dd>
            </div>
            <div className="rounded-[12px] border border-[#E5E9F0] bg-[#F8FAFC] px-3 py-2.5">
              <dt className="text-[#475569]">Người đang theo dõi</dt>
              <dd className="mt-0.5 text-base font-semibold text-[#0F172A] tabular-nums">{fmtNum(user.followers)}</dd>
            </div>
          </dl>
          <div className="flex gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Mọi quan hệ theo dõi, lượt thích, bình luận và chia sẻ của tài khoản cũng bị xóa; số liệu các bài viết liên
              quan được tính lại. Nếu chỉ cần ngăn truy cập, hãy khóa tài khoản.
            </p>
          </div>
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>
      <div className="flex justify-end gap-2 pt-1">
        <button ref={cancelRef} type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
          Hủy
        </button>
        <button type="button" onClick={run} disabled={busy} className={cfg.danger ? btnDanger : btnPrimary}>
          {busy ? cfg.busy : cfg.confirm}
        </button>
      </div>
    </ModalShell>
  );
}

const passwordProblem = (p) => {
  if (p.length < 8) return 'Tối thiểu 8 ký tự.';
  if (!/[a-z]/.test(p)) return 'Cần có chữ thường.';
  if (!/[A-Z]/.test(p)) return 'Cần có chữ hoa.';
  if (!/[0-9]/.test(p)) return 'Cần có chữ số.';
  return '';
};

/** Đặt lại mật khẩu cho người dùng (trước đây là window.prompt và backend bỏ qua mật khẩu mới). */
export function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const problem = passwordProblem(password);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.resetPassword(user.id, password);
      onDone(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <ModalShell titleId="reset-pass-title" descId="reset-pass-desc" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <ModalHeader
          titleId="reset-pass-title"
          descId="reset-pass-desc"
          title={`Đặt lại mật khẩu cho @${user.username}`}
          description="Gửi mật khẩu mới cho người dùng qua kênh riêng và đề nghị họ đổi lại."
          onClose={onClose}
          busy={busy}
        />
        <div>
          <label htmlFor="reset-pass-input" className="block text-xs font-medium text-[#0F172A] mb-1">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="reset-pass-input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && problem ? 'true' : undefined}
              aria-describedby="reset-pass-hint"
              className={`w-full h-10 rounded-[10px] border border-[#E5E9F0] pl-3 pr-10 text-sm text-[#0F172A] ${focusRing}`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={show}
              className={`absolute right-1 top-1 h-8 w-8 flex items-center justify-center rounded-md text-[#64748B] hover:text-[#0F172A] ${focusRing}`}
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <p id="reset-pass-hint" className={`mt-1 text-xs ${touched && problem ? 'text-rose-700' : 'text-[#475569]'}`}>
            {touched && problem ? problem : 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.'}
          </p>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
            Hủy
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
