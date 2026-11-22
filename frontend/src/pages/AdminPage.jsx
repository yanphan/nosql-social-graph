import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EditTopicModal, DeleteTopicModal } from '@/components/admin/TopicModals';
import { ConfirmUserActionModal, ResetPasswordModal } from '@/components/admin/UserModals';
import PostsPanel from '@/components/admin/PostsPanel';
import SystemPanel from '@/components/admin/SystemPanel';
import DashboardPanel from '@/components/admin/DashboardPanel';
import {
  useDebounced,
  usePagedList,
  SearchBox,
  FilterSelect,
  Pager,
  TableStatusRow,
} from '@/components/admin/listing';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Hash,
  Database,
  Search,
  LogOut,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  Share2,
  Network,
  Eye,
  EyeOff,
  KeyRound,
  MoreHorizontal,
  Edit,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { adminApi } from '@/services/admin';
import { authService } from '@/services/auth';
import { getTopicColor } from '@/lib/topicColor';
import '@/styles/tokens.css';

// Animated CountUp for KPI Numbers
function CountUp({ value = 0, duration = 600 }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    const end = Number(value) || 0;
    if (end === 0) {
      setDisplayVal(0);
      return;
    }
    const startTime = performance.now();
    let frameId;

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutQuad
      const ease = 1 - (1 - progress) * (1 - progress);
      setDisplayVal(Math.round(end * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <span className="tabular-nums">{displayVal.toLocaleString('vi-VN')}</span>;
}

// Modal Thêm người dùng hoàn chỉnh với Portal, Trap focus và Validate client-side
function AddUserModal({ isOpen, onClose, onSuccess, triggerRef }) {
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const modalRef = useRef(null);
  const usernameInputRef = useRef(null);
  const roleDropdownRef = useRef(null);

  // Khóa cuộn body và tự động focus ô đầu tiên
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      setForm({ username: '', fullName: '', password: '', role: 'user' });
      setErrors({});
      setTouched({});
      setApiError('');
      setShowPassword(false);
      setCopiedPass(false);
      setIsRoleDropdownOpen(false);
    }
  }, [isOpen]);

  // Trap focus trong modal & bắt phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Đóng dropdown vai trò khi click ra ngoài dropdown
  useEffect(() => {
    const handleClickOutsideRole = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideRole);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideRole);
  }, [isRoleDropdownOpen]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 50);
  };

  // Hàm validate client-side từng trường
  const validateField = (name, value) => {
    switch (name) {
      case 'username': {
        const val = value.trim();
        if (!val) return 'Tên đăng nhập không được để trống';
        if (val.length < 3 || val.length > 30) return 'Tên đăng nhập từ 3 đến 30 ký tự';
        if (!/^[a-z0-9_.]+$/.test(val)) return 'Chỉ gồm chữ thường, số, dấu gạch dưới (_) và dấu chấm (.)';
        return '';
      }
      case 'fullName': {
        if (!value.trim()) return 'Họ và tên không được để trống';
        return '';
      }
      case 'password': {
        if (!value) return 'Mật khẩu không được để trống';
        if (value.length < 8) return 'Mật khẩu phải từ 8 ký tự trở lên';
        if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
          return 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
        }
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setApiError('');
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Đánh giá độ mạnh mật khẩu (Yếu / Trung bình / Mạnh)
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '', text: '' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'bg-red-500', text: 'text-red-600' };
    if (score <= 4) return { score: 2, label: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-600' };
    return { score: 3, label: 'Mạnh', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getPasswordStrength(form.password);

  // Tạo mật khẩu ngẫu nhiên mạnh 12 ký tự
  const handleGenerateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specials = '@#$%!&*';
    let pass = '';
    pass += upper[Math.floor(Math.random() * upper.length)];
    pass += lower[Math.floor(Math.random() * lower.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    pass += specials[Math.floor(Math.random() * specials.length)];
    const all = upper + lower + numbers + specials;
    for (let i = 0; i < 8; i++) {
      pass += all[Math.floor(Math.random() * all.length)];
    }
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');

    setForm((prev) => ({ ...prev, password: pass }));
    setErrors((prev) => ({ ...prev, password: '' }));
    setTouched((prev) => ({ ...prev, password: true }));
    setShowPassword(true);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pass).catch(() => {});
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 3000);
    }
  };

  // Kiểm tra tính hợp lệ của toàn bộ form
  const usernameErr = validateField('username', form.username);
  const fullNameErr = validateField('fullName', form.fullName);
  const passwordErr = validateField('password', form.password);
  const isFormValid = !usernameErr && !fullNameErr && !passwordErr && form.username.trim() && form.fullName.trim() && form.password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, fullName: true, password: true });
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setApiError('');
    try {
      const created = await adminApi.createUser({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        password: form.password,
        role: form.role,
      });
      onSuccess(created);
      handleClose();
    } catch (err) {
      setApiError(err.message || 'Lỗi khi tạo người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-user-modal-title"
        className="bg-white border border-[#E5E9F0] rounded-[16px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3">
          <h3 id="add-user-modal-title" className="font-semibold text-base text-[#0F172A]">
            Thêm người dùng
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thông báo lỗi từ API nếu có */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[10px] flex items-center gap-2">
            <span className="font-semibold">Lỗi:</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-[13px]">
          {/* Ô Tên đăng nhập */}
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Tên đăng nhập <span className="text-red-500">*</span>
            </label>
            <input
              ref={usernameInputRef}
              type="text"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              onBlur={() => handleBlur('username')}
              placeholder="vd: john_doe.99"
              className={`w-full h-9 px-3 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                touched.username && errors.username
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                  : 'border-[#E5E9F0] focus:border-[#2563EB]'
              }`}
            />
            {touched.username && errors.username && (
              <p className="text-xs text-red-600 mt-1">{errors.username}</p>
            )}
          </div>

          {/* Ô Họ và tên */}
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              placeholder="vd: Nguyễn Văn A"
              className={`w-full h-9 px-3 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                touched.fullName && errors.fullName
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                  : 'border-[#E5E9F0] focus:border-[#2563EB]'
              }`}
            />
            {touched.fullName && errors.fullName && (
              <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Ô Mật khẩu */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#475569]">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1 hover:underline focus:outline-none focus:ring-1 focus:ring-[#2563EB] rounded px-1"
              >
                <KeyRound className="h-3 w-3" />
                <span>Tạo ngẫu nhiên</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)..."
                className={`w-full h-9 pl-3 pr-10 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                  touched.password && errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                    : 'border-[#E5E9F0] focus:border-[#2563EB]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Thanh đo độ mạnh mật khẩu */}
            {form.password && (
              <div className="mt-1.5 space-y-1">
                <div className="flex gap-1.5 h-1.5">
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#64748B]">
                    Độ mạnh: <strong className={strength.text}>{strength.label}</strong>
                  </span>
                  {copiedPass && (
                    <span className="text-emerald-600 font-medium animate-fade-in">Đã sao chép vào bộ nhớ tạm!</span>
                  )}
                </div>
              </div>
            )}

            {touched.password && errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Dropdown Vai trò tùy biến */}
          <div className="relative" ref={roleDropdownRef}>
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Vai trò
            </label>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="w-full h-9 px-3 bg-white border border-[#E5E9F0] rounded-[10px] text-xs text-[#0F172A] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 transition-colors"
            >
              <span>
                {form.role === 'admin'
                  ? 'Quản trị viên'
                  : 'Thành viên'}
              </span>
              <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E9F0] rounded-[10px] shadow-lg z-20 py-1 text-xs divide-y divide-[#E5E9F0]/60 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role: 'user' }));
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F1F5F9] transition-colors flex items-center justify-between ${
                    form.role === 'user' ? 'text-[#2563EB] font-medium bg-[#EFF4FF]' : 'text-[#0F172A]'
                  }`}
                >
                  <span>Thành viên</span>
                  {form.role === 'user' && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role: 'admin' }));
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F1F5F9] transition-colors flex items-center justify-between ${
                    form.role === 'admin' ? 'text-[#2563EB] font-medium bg-[#EFF4FF]' : 'text-[#0F172A]'
                  }`}
                >
                  <span>Quản trị viên</span>
                  {form.role === 'admin' && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Nút bấm hành động */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9F0]">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-[10px] border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-medium text-xs transition-colors btn-press focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="h-9 px-4 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center gap-1.5 transition-colors btn-press shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Modal Chỉnh sửa người dùng hoàn chỉnh với Portal, Trap focus và Validate client-side
function EditUserModal({ isOpen, user, onClose, onSuccess, triggerRef }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    bio: '',
    country: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const modalRef = useRef(null);
  const fullNameInputRef = useRef(null);
  const roleDropdownRef = useRef(null);

  // Điền dữ liệu ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && user) {
      document.body.style.overflow = 'hidden';
      setForm({
        fullName: user.fullName || '',
        email: user.email || '',
        bio: user.bio || '',
        country: user.country || '',
        role: user.role || 'user',
      });
      setErrors({});
      setTouched({});
      setApiError('');
      setIsRoleDropdownOpen(false);

      const timer = setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, user]);

  // Trap focus trong modal & bắt phím Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Đóng dropdown vai trò khi click ra ngoài dropdown
  useEffect(() => {
    const handleClickOutsideRole = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutsideRole);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideRole);
  }, [isRoleDropdownOpen]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 50);
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName': {
        if (!value.trim()) return 'Họ và tên không được để trống';
        return '';
      }
      case 'email': {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Email không đúng định dạng';
        }
        return '';
      }
      case 'bio': {
        if (value && value.length > 300) return 'Tiểu sử tối đa 300 ký tự';
        return '';
      }
      case 'country': {
        if (value && value.length > 50) return 'Tên quốc gia tối đa 50 ký tự';
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setApiError('');
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const fullNameErr = validateField('fullName', form.fullName);
  const emailErr = validateField('email', form.email);
  const bioErr = validateField('bio', form.bio);
  const countryErr = validateField('country', form.country);
  const isFormValid = !fullNameErr && !emailErr && !bioErr && !countryErr && form.fullName.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, bio: true, country: true });
    if (!isFormValid || isSubmitting || !user) return;

    setIsSubmitting(true);
    setApiError('');
    try {
      const updateData = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        bio: form.bio.trim(),
        country: form.country.trim(),
      };
      let updatedUser = await adminApi.updateUser(user.id, updateData);

      // Nếu vai trò thay đổi, cập nhật role
      if (form.role !== user.role) {
        const roleRes = await adminApi.setUserRole(user.id, form.role);
        updatedUser = { ...updatedUser, role: roleRes.role || form.role };
      }

      onSuccess({ ...user, ...updatedUser });
      handleClose();
    } catch (err) {
      setApiError(err.message || 'Lỗi khi cập nhật thông tin người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Không cho tự gỡ quyền quản trị của chính mình (backend cũng chặn)
  const isSelfEdit = user?.id === authService.getStoredUser()?.id;

  if (!isOpen || !user) return null;

  return createPortal(
    <div
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-modal-title"
        className="bg-white border border-[#E5E9F0] rounded-[16px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3">
          <div>
            <h3 id="edit-user-modal-title" className="font-semibold text-base text-[#0F172A]">
              Chỉnh sửa người dùng
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Cập nhật thông tin tài khoản và vai trò trong hệ thống
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            aria-label="Đóng hộp thoại"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thông tin tài khoản cố định */}
        <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E5E9F0] rounded-[12px]">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={user.fullName}
            className="w-10 h-10 rounded-full object-cover bg-white ring-2 ring-white border border-[#E5E9F0] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-[#0F172A] truncate">
                @{user.username}
              </span>
              <span className="text-[10px] text-[#64748B] bg-white border border-[#E5E9F0] px-1.5 py-0.5 rounded font-mono truncate max-w-[120px]">
                {user.id}
              </span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2">
              <span>Trạng thái:</span>
              <span className={`font-medium ${user.status === 'locked' ? 'text-rose-600' : 'text-emerald-600'}`}>
                {user.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
              </span>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi từ API nếu có */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[10px] flex items-center gap-2">
            <span className="font-semibold">Lỗi:</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-[13px]">
          {/* Ô Họ và tên */}
          <div>
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              ref={fullNameInputRef}
              type="text"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              onBlur={() => handleBlur('fullName')}
              placeholder="vd: Nguyễn Văn A"
              className={`w-full h-9 px-3 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                touched.fullName && errors.fullName
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                  : 'border-[#E5E9F0] focus:border-[#2563EB]'
              }`}
            />
            {touched.fullName && errors.fullName && (
              <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Ô Email & Quốc gia (2 cột) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="vd: user@example.com"
                className={`w-full h-9 px-3 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                  touched.email && errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                    : 'border-[#E5E9F0] focus:border-[#2563EB]'
                }`}
              />
              {touched.email && errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[#475569] block mb-1">
                Quốc gia
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                onBlur={() => handleBlur('country')}
                placeholder="vd: Việt Nam"
                className={`w-full h-9 px-3 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                  touched.country && errors.country
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                    : 'border-[#E5E9F0] focus:border-[#2563EB]'
                }`}
              />
              {touched.country && errors.country && (
                <p className="text-xs text-red-600 mt-1">{errors.country}</p>
              )}
            </div>
          </div>

          {/* Dropdown Vai trò */}
          <div className="relative" ref={roleDropdownRef}>
            <label className="text-xs font-medium text-[#475569] block mb-1">
              Vai trò
            </label>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              disabled={isSelfEdit}
              aria-describedby={isSelfEdit ? 'edit-role-self-hint' : undefined}
              className="w-full h-9 px-3 bg-white border border-[#E5E9F0] rounded-[10px] text-xs text-[#0F172A] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 transition-colors disabled:bg-[#F8FAFC] disabled:text-[#475569] disabled:cursor-not-allowed"
            >
              <span>
                {form.role === 'admin'
                  ? 'Quản trị viên (Admin)'
                  : 'Thành viên (User)'}
              </span>
              <ChevronDown className={`h-4 w-4 text-[#64748B] transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSelfEdit && (
              <p id="edit-role-self-hint" className="mt-1 text-[11px] text-[#475569]">
                Bạn không thể tự đổi vai trò của chính mình.
              </p>
            )}

            {isRoleDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E9F0] rounded-[10px] shadow-lg z-20 py-1 text-xs divide-y divide-[#E5E9F0]/60 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role: 'user' }));
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F1F5F9] transition-colors flex items-center justify-between ${
                    form.role === 'user' ? 'text-[#2563EB] font-medium bg-[#EFF4FF]' : 'text-[#0F172A]'
                  }`}
                >
                  <span>Thành viên (User)</span>
                  {form.role === 'user' && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role: 'admin' }));
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F1F5F9] transition-colors flex items-center justify-between ${
                    form.role === 'admin' ? 'text-[#2563EB] font-medium bg-[#EFF4FF]' : 'text-[#0F172A]'
                  }`}
                >
                  <span>Quản trị viên (Admin)</span>
                  {form.role === 'admin' && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Ô Tiểu sử */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#475569]">
                Tiểu sử
              </label>
              <span className="text-[11px] text-[#64748B]">
                {form.bio?.length || 0}/300
              </span>
            </div>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              onBlur={() => handleBlur('bio')}
              placeholder="Giới thiệu tóm tắt về người dùng..."
              maxLength={300}
              className={`w-full p-2.5 bg-white border rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 ${
                touched.bio && errors.bio
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-300'
                  : 'border-[#E5E9F0] focus:border-[#2563EB]'
              }`}
            />
            {touched.bio && errors.bio && (
              <p className="text-xs text-red-600 mt-1">{errors.bio}</p>
            )}
          </div>

          {/* Nút bấm hành động */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9F0]">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-[10px] border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] font-medium text-xs transition-colors btn-press focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="h-9 px-4 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center gap-1.5 transition-colors btn-press shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
            >
              {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const USERS_PER_PAGE = 10;
const TOPICS_PER_PAGE = 10;
const TOPIC_SORT_OPTIONS = [
  { value: 'posts', label: 'Nhiều bài viết nhất' },
  { value: 'fewest', label: 'Ít bài viết nhất' },
  { value: 'name', label: 'Tên A–Z' },
];
const fetchAdminUsers = (query, signal) => adminApi.getUsers({ ...query, limit: USERS_PER_PAGE }, signal);
const ROLE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'user', label: 'Thành viên' },
];
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Đã khóa' },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => authService.getStoredUser());

  // Active Tab: 'dashboard' | 'users' | 'topics_posts' | 'system'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('topics'); // For topics_posts: 'topics' | 'posts'

  // Loading & Toast State
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Avatar Dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Chart Hover State

  // Data States
  // Danh sách người dùng: tìm kiếm + lọc + phân trang phía máy chủ (có tổng số)
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userPage, setUserPage] = useState(1);
  const userQ = useDebounced(userSearch.trim(), 300);
  const usersQuery = useMemo(
    () => ({ q: userQ, role: userRole, status: userStatus, page: userPage }),
    [userQ, userRole, userStatus, userPage]
  );
  const users = usePagedList(fetchAdminUsers, usersQuery);
  const usersList = users.items;
  const [userAction, setUserAction] = useState(null); // { user, action: 'lock' | 'unlock' | 'delete' }
  const [resettingUser, setResettingUser] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [topicsList, setTopicsList] = useState([]);
  // Chủ đề ít (vài chục) và API trả cả danh sách: tìm / sắp xếp / phân trang ngay trên trình duyệt
  const [topicSearch, setTopicSearch] = useState('');
  const [topicSort, setTopicSort] = useState('posts');
  const [topicPage, setTopicPage] = useState(1);
  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase().replace(/^#/, '');
    const list = topicsList.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
    );
    return list.sort((a, b) =>
      topicSort === 'name'
        ? a.name.localeCompare(b.name)
        : topicSort === 'fewest'
          ? (a.postCount ?? 0) - (b.postCount ?? 0) || a.name.localeCompare(b.name)
          : (b.postCount ?? 0) - (a.postCount ?? 0) || a.name.localeCompare(b.name)
    );
  }, [topicsList, topicSearch, topicSort]);
  const topicPages = Math.max(1, Math.ceil(filteredTopics.length / TOPICS_PER_PAGE));
  const pagedTopics = filteredTopics.slice((topicPage - 1) * TOPICS_PER_PAGE, topicPage * TOPICS_PER_PAGE);
  useEffect(() => setTopicPage(1), [topicSearch, topicSort]);
  useEffect(() => {
    if (topicPage > topicPages) setTopicPage(topicPages);
  }, [topicPage, topicPages]);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const addUserTriggerRef = useRef(null);

  const [editingUser, setEditingUser] = useState(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const editUserTriggerRef = useRef(null);

  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [deletingTopic, setDeletingTopic] = useState(null);
  const [newTopicForm, setNewTopicForm] = useState({
    name: '',
    description: '',
  });

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  // Hủy hẹn giờ của toast trước, nếu không toast mới (vd. lỗi) bị tắt sớm bởi hẹn giờ cũ
  const toastTimerRef = useRef(null);
  const showToast = (message, type = 'success') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000);
  };

  // Chủ đề và người nổi bật (dùng ở tổng quan + tab chủ đề). Số liệu tổng quan do DashboardPanel tự tải. Danh sách người dùng / bài viết tự tải theo bộ lọc của từng bảng.
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tData, top] = await Promise.all([
        adminApi.getTopics(),
        adminApi.getTopUsers(5).catch(() => []),
      ]);
      setTopicsList(tData || []);
      setTopUsers(top || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Đổi bộ lọc thì về trang 1
  useEffect(() => setUserPage(1), [userQ, userRole, userStatus]);
  // Xóa người cuối cùng của trang cuối: lùi về trang trước
  useEffect(() => {
    if (!users.loading && !users.error && users.items.length === 0 && userPage > 1) setUserPage((p) => p - 1);
  }, [users.loading, users.error, users.items.length, userPage]);

  // Tổng quan: bấm một mục "Cần chú ý" để mở đúng tab, đã lọc sẵn
  const handleDashboardNavigate = (target) => {
    if (target === 'locked-users') {
      setUserSearch('');
      setUserRole('');
      setUserStatus('locked');
      setActiveTab('users');
    } else if (target === 'empty-topics') {
      setTopicSearch('');
      setTopicSort('fewest');
      setSubTab('topics');
      setActiveTab('topics_posts');
    } else if (target === 'backups') {
      setActiveTab('system');
    }
  };

  // Search Handler
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await adminApi.searchGlobal(q.trim());
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    }
  };

  // Khóa / mở khóa / xóa qua hộp thoại xác nhận (UserModals); backend chặn admin tự khóa / tự xóa mình
  const isSelf = (u) => u.id === currentUser?.id;
  const handleUserActionDone = (user, action) => {
    setUserAction(null);
    if (action === 'delete') {
      showToast(`Đã xóa tài khoản @${user.username}`);
      users.reload();
      loadAllData();
    } else {
      const status = action === 'lock' ? 'locked' : 'active';
      users.updateItems((items) => items.map((u) => (u.id === user.id ? { ...u, status } : u)));
      showToast(`Đã ${action === 'lock' ? 'khóa' : 'mở khóa'} tài khoản @${user.username}`);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
  };

  // Topic Actions
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicForm.name.trim()) return;
    try {
      const created = await adminApi.createTopic(newTopicForm);
      setTopicsList([created, ...topicsList]);
      setIsAddTopicOpen(false);
      setNewTopicForm({ name: '', description: '' });
      showToast(`Đã thêm chủ đề #${created.name}`);
      setTopicSearch(created.name); // chủ đề mới có 0 bài, nằm cuối danh sách: lọc để thấy ngay
      loadAllData();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo chủ đề', 'error');
    }
  };

  // Sửa / xóa chủ đề qua hộp thoại (TopicModals): hộp xóa hiển thị số bài viết, người quan tâm bị ảnh hưởng
  const handleTopicSaved = (updated) => {
    setTopicsList((list) => list.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setEditingTopic(null);
    showToast(`Đã cập nhật chủ đề #${updated.name}`);
  };

  const handleTopicDeleted = (topic) => {
    setTopicsList((list) => list.filter((t) => t.id !== topic.id));
    setDeletingTopic(null);
    showToast(`Đã xóa chủ đề #${topic.name}`);
    loadAllData();
  };

  // Người dùng nổi bật: số người theo dõi thật (GET /analytics/influence)


  return (
    <div className="min-h-screen bg-[#F3F5F9] bg-[radial-gradient(ellipse_100%_320px_at_50%_0%,rgba(239,244,255,0.6),transparent)] text-[#0F172A] flex font-sans antialiased">
      {/* ======================================================== */}
      {/* 1. ADMIN SIDEBAR (Full Viewport Height on EVERY page)     */}
      {/* ======================================================== */}
      <aside className="w-16 lg:w-64 bg-white border-r border-[#E5E9F0] flex flex-col shrink-0 h-screen sticky top-0 z-30 transition-all duration-150 ease-out">
        {/* Logo Brand: Khớp với User App + Tag Quản trị */}
        <div className="h-16 flex items-center gap-2.5 px-4 lg:px-6 border-b border-[#E5E9F0] shrink-0">
          <Link to="/admin" className="flex items-center gap-2.5 group btn-press">
            <div className="h-9 w-9 rounded-[10px] bg-[#EFF4FF] text-[#2563EB] flex items-center justify-center shrink-0 transition-colors duration-150 group-hover:bg-[#DBEAFE]">
              <Network className="h-5 w-5" />
            </div>
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <span className="font-semibold text-[15px] tracking-[-0.01em] text-[#0F172A] truncate">
                FalkorDB <span className="text-[#2563EB]">Social</span>
              </span>
              <span className="text-[10px] font-semibold bg-[#EFF4FF] text-[#2563EB] px-1.5 py-0.5 rounded-[6px] shrink-0">
                Quản trị
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Links: flex-1 to fill all vertical space above footer */}
        <nav className="p-3 space-y-6 flex-1 overflow-y-auto">
          <div>
            <div className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 mb-2">
              Tổng quan
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors duration-150 btn-press ${
                activeTab === 'dashboard'
                  ? 'bg-[#EFF4FF] text-[#2563EB]'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
              title="Tổng quan"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="hidden lg:inline">Tổng quan</span>
            </button>
          </div>

          <div>
            <div className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 mb-2">
              Quản lý nghiệp vụ
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors duration-150 btn-press ${
                  activeTab === 'users'
                    ? 'bg-[#EFF4FF] text-[#2563EB]'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
                title="Người dùng"
              >
                <Users className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="hidden lg:inline">Người dùng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('topics_posts')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors duration-150 btn-press ${
                  activeTab === 'topics_posts'
                    ? 'bg-[#EFF4FF] text-[#2563EB]'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
                title="Chủ đề & bài viết"
              >
                <Hash className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="hidden lg:inline">Chủ đề &amp; bài viết</span>
              </button>
            </div>
          </div>

          <div>
            <div className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 mb-2">
              Quản trị hệ thống
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors duration-150 btn-press ${
                  activeTab === 'system'
                    ? 'bg-[#EFF4FF] text-[#2563EB]'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
                title="Nhập/xuất & sao lưu"
              >
                <Database className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="hidden lg:inline">Nhập/xuất &amp; sao lưu</span>
              </button>

              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-[13px] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors duration-150 btn-press"
                title="FalkorDB Browser"
              >
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="h-4 w-4 text-[#64748B] shrink-0" strokeWidth={1.5} />
                  <span className="hidden lg:inline">FalkorDB Browser</span>
                </div>
              </a>
            </div>
          </div>
        </nav>

      </aside>

      {/* ======================================================== */}
      {/* 2. TOPBAR & MAIN CONTENT AREA                             */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-[#E5E9F0] sticky top-0 z-20 px-6 sm:px-8 flex items-center justify-between gap-4">
          {/* Flat 1px Border Search */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm người dùng, bài viết, chủ đề…"
              className="w-full h-9 pl-9 pr-14 bg-white border border-[#E5E9F0] rounded-[10px] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all duration-150"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] border border-[#E5E9F0] rounded px-1.5 py-0.5 pointer-events-none">
              Ctrl K
            </span>

            {/* Popup Kết Quả Tìm Kiếm Tức Thì */}
            {searchResults && searchQuery && (
              <div className="absolute top-11 left-0 right-0 p-3 z-30 max-h-80 overflow-y-auto space-y-3 bg-white border border-[#E5E9F0] rounded-[12px] shadow-md animate-in fade-in zoom-in-95 duration-120">
                {searchResults.users?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-[#64748B] px-2 mb-1">Người dùng</div>
                    {searchResults.users.slice(0, 3).map((u) => (
                      <div key={u.id} className="p-2 hover:bg-[#F3F5F9] rounded-lg flex items-center justify-between text-[13px]">
                        <span className="font-medium text-[#0F172A]">@{u.username} ({u.fullName})</span>
                        <span className="text-[11px] text-[#64748B]">{u.role}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.topics?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-[#64748B] px-2 mb-1">Chủ đề</div>
                    {searchResults.topics.slice(0, 3).map((t) => (
                      <div key={t.id} className="p-2 hover:bg-[#F3F5F9] rounded-lg text-[13px] font-medium text-[#2563EB]">
                        #{t.name}
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.posts?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-[#64748B] px-2 mb-1">Bài viết</div>
                    {searchResults.posts.slice(0, 2).map((p) => (
                      <div key={p.id} className="p-2 hover:bg-[#F3F5F9] rounded-lg text-[13px] text-[#475569] truncate">
                        {p.content}
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.users?.length === 0 && searchResults.topics?.length === 0 && searchResults.posts?.length === 0 && (
                  <div className="p-2 text-center text-[13px] text-[#64748B]">Không tìm thấy kết quả</div>
                )}
              </div>
            )}
          </div>

          {/* User Avatar with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-[10px] hover:bg-slate-100 transition-colors duration-150 btn-press"
            >
              <img
                src={currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover bg-slate-100 ring-2 ring-white border border-[#E5E9F0]"
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#0F172A] leading-tight flex items-center gap-1.5">
                  <span>{currentUser?.fullName || 'Quản trị viên'}</span>
                  <span className="text-[10px] text-[#2563EB] bg-[#EFF4FF] px-1.5 py-0.2 rounded font-medium">
                    Admin
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] tabular-nums">@{currentUser?.username || 'admin'}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" strokeWidth={1.5} />
            </button>

            {/* Avatar Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-[#E5E9F0] rounded-[12px] p-1.5 shadow-md z-40 space-y-1 animate-in fade-in zoom-in-95 duration-120">
                <div className="px-3 py-2 border-b border-[#E5E9F0] mb-1">
                  <div className="text-xs font-semibold text-[#0F172A] truncate">{currentUser?.fullName}</div>
                  <div className="text-[11px] text-[#64748B] tabular-nums">@{currentUser?.username}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Mở mạng xã hội</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    authService.logout();
                    navigate('/login', { replace: true });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-150"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Toast Popup */}
        {toast && (
          <div
            className="fixed top-20 right-8 z-[1000] animate-in fade-in duration-150"
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <div className="px-3.5 py-2 rounded-[10px] bg-[#0F172A] text-white text-[13px] flex items-center gap-2 shadow-md">
              {toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-[#F87171]" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MAIN CONTENT: 1200px MAX-WIDTH CENTERED GRID           */}
        {/* ======================================================== */}
        <main className="flex-1 p-6 sm:p-8 max-w-[1200px] w-full mx-auto space-y-6">
          {/* TAB 1: TỔNG QUAN (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <DashboardPanel topUsers={topUsers} topics={topicsList} onNavigate={handleDashboardNavigate} />
          )}

          {/* TAB 2: QUẢN LÝ NGƯỜI DÙNG */}
          {activeTab === 'users' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-semibold text-[#0F172A] tracking-[-0.01em]">
                    Người dùng
                  </h1>
                  <p className="text-[14px] text-[#475569] mt-0.5">
                    Quản lý danh sách tài khoản và trạng thái hoạt động
                  </p>
                </div>

                {/* Single Solid Accent Button in Header */}
                <button
                  ref={addUserTriggerRef}
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="h-9 px-4 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Thêm người dùng</span>
                </button>
              </div>

              {/* Modal Thêm Người Dùng bằng Portal */}
              <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onSuccess={(created) => {
                  showToast(`Đã tạo người dùng @${created.username}`);
                  users.reload();
                  loadAllData();
                }}
                triggerRef={addUserTriggerRef}
              />

              {/* Modal Chỉnh Sửa Người Dùng bằng Portal */}
              <EditUserModal
                isOpen={isEditUserOpen}
                user={editingUser}
                onClose={() => {
                  setIsEditUserOpen(false);
                  setEditingUser(null);
                }}
                onSuccess={(updated) => {
                  users.updateItems((prev) =>
                    prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
                  );
                  showToast(`Đã cập nhật thông tin @${updated.username || editingUser?.username}`);
                }}
                triggerRef={editUserTriggerRef}
              />

              {/* Bộ lọc: tìm theo tên / tên đăng nhập / email, vai trò, trạng thái */}
              <div className="flex flex-wrap items-center gap-3">
                <SearchBox
                  id="admin-user-search"
                  label="Tìm người dùng theo họ tên, tên đăng nhập hoặc email"
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="Tìm theo họ tên, @tên đăng nhập, email…"
                />
                <FilterSelect id="admin-user-role" label="Vai trò" value={userRole} onChange={setUserRole} options={ROLE_OPTIONS} />
                <FilterSelect
                  id="admin-user-status"
                  label="Trạng thái"
                  value={userStatus}
                  onChange={setUserStatus}
                  options={STATUS_OPTIONS}
                />
              </div>

              <div className="bg-white border border-[#E5E9F0] rounded-[16px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <table className="w-full text-left text-[13px]" aria-busy={users.loading}>
                  <caption className="sr-only">Danh sách người dùng</caption>
                  <thead className="bg-[#F8FAFC] border-b border-[#E5E9F0] [&_th]:font-medium [&_th]:text-[13px] [&_th]:text-[#475569]">
                    <tr>
                      <th scope="col" className="py-3 px-4">Người dùng</th>
                      <th scope="col" className="py-3 px-4 min-w-[140px]">Tên đăng nhập</th>
                      <th scope="col" className="py-3 px-4">Vai trò</th>
                      <th scope="col" className="py-3 px-4 text-right">Người theo dõi</th>
                      <th scope="col" className="py-3 px-4 text-right">Bài viết</th>
                      <th scope="col" className="py-3 px-4">Trạng thái</th>
                      <th scope="col" className="py-3 px-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-[#E5E9F0]/60 ${users.loading ? 'opacity-60' : ''}`}>
                    <TableStatusRow
                      colSpan={7}
                      loading={users.loading}
                      error={users.error}
                      empty={usersList.length === 0}
                      onRetry={users.reload}
                      emptyText={
                        userQ || userRole || userStatus
                          ? 'Không có người dùng nào khớp bộ lọc.'
                          : 'Chưa có người dùng nào.'
                      }
                    />
                    {!users.error && usersList.map((u) => {
                      const isLocked = u.status === 'locked';
                      const self = isSelf(u);

                      return (
                        <tr key={u.id} className="hover:bg-[#F3F5F9]/60 transition-colors duration-150">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover bg-slate-100 ring-1 ring-white border border-[#E5E9F0]"
                              />
                              <span className="font-medium text-[#0F172A]">{u.fullName}</span>
                              {self && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-[#475569]">Bạn</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-[12px] text-[#475569] tabular-nums">
                            <span className="inline-block max-w-[160px] truncate align-middle" title={`@${u.username}`}>
                              @{u.username}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                Quản trị viên
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-[#475569] border border-slate-200">
                                Thành viên
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-[#0F172A]">
                            {Number(u.followers ?? 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-[#0F172A]">
                            {Number(u.posts ?? 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isLocked
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-rose-600' : 'bg-emerald-600'}`} aria-hidden="true" />
                              <span>{isLocked ? 'Đã khóa' : 'Hoạt động'}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setUserAction({ user: u, action: isLocked ? 'unlock' : 'lock' })}
                                disabled={self}
                                title={self ? 'Không thể tự khóa tài khoản của mình' : undefined}
                                aria-label={`${isLocked ? 'Mở khóa' : 'Khóa'} tài khoản @${u.username}`}
                                className={`h-7 px-2.5 rounded-[8px] text-[12px] font-medium transition-colors duration-150 btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none ${
                                  isLocked
                                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 focus-visible:ring-emerald-600'
                                    : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-600'
                                }`}
                              >
                                {isLocked ? 'Mở khóa' : 'Khóa'}
                              </button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-7 w-7 rounded-[8px] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 border border-[#E5E9F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1 transition-colors"
                                    aria-label={`Tùy chọn khác cho @${u.username}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 bg-white border border-[#E5E9F0] rounded-[10px] shadow-lg p-1 text-xs">
                                  <DropdownMenuItem
                                    onClick={() => handleEditUser(u)}
                                    className="px-2.5 py-1.5 rounded-[6px] text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-2"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                                    <span>Sửa thông tin</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setResettingUser(u)}
                                    className="px-2.5 py-1.5 rounded-[6px] text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer flex items-center gap-2"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
                                    <span>Đặt lại mật khẩu</span>
                                  </DropdownMenuItem>
                                  {!self && (
                                    <DropdownMenuItem
                                      onClick={() => setUserAction({ user: u, action: 'delete' })}
                                      className="px-2.5 py-1.5 rounded-[6px] text-rose-700 hover:bg-rose-50 cursor-pointer flex items-center gap-2"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                                      <span>Xóa người dùng</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <Pager
                  label="Phân trang người dùng"
                  noun="người dùng"
                  page={userPage}
                  limit={USERS_PER_PAGE}
                  total={users.total}
                  shown={users.error ? 0 : usersList.length}
                  loading={users.loading}
                  onPage={setUserPage}
                />
              </div>

              {userAction && (
                <ConfirmUserActionModal
                  user={userAction.user}
                  action={userAction.action}
                  onClose={() => setUserAction(null)}
                  onDone={handleUserActionDone}
                />
              )}
              {resettingUser && (
                <ResetPasswordModal
                  user={resettingUser}
                  onClose={() => setResettingUser(null)}
                  onDone={(u) => {
                    setResettingUser(null);
                    showToast(`Đã đặt lại mật khẩu cho @${u.username}`);
                  }}
                />
              )}
            </div>
          )}

          {/* TAB 3: CHỦ ĐỀ & BÀI VIẾT */}
          {activeTab === 'topics_posts' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-semibold text-[#0F172A] tracking-[-0.01em]">
                    Chủ đề &amp; bài viết
                  </h1>
                  <p className="text-[14px] text-[#475569] mt-0.5">
                    Quản lý danh mục chủ đề và kiểm duyệt nội dung
                  </p>
                </div>
                {/* Segmented Control (Clearly distinct active tab) */}
                <div className="p-1 bg-[#F1F5F9] border border-[#E5E9F0] rounded-[10px] flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSubTab('topics')}
                    className={`h-7 px-3.5 rounded-[7px] text-xs transition-all duration-150 btn-press ${
                      subTab === 'topics' 
                        ? 'bg-white text-[#2563EB] font-semibold shadow-xs' 
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Chủ đề
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('posts')}
                    className={`h-7 px-3.5 rounded-[7px] text-xs transition-all duration-150 btn-press ${
                      subTab === 'posts' 
                        ? 'bg-white text-[#2563EB] font-semibold shadow-xs' 
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Bài viết
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Chủ đề */}
              {subTab === 'topics' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <SearchBox
                      id="admin-topic-search"
                      label="Tìm chủ đề theo tên hoặc mô tả"
                      value={topicSearch}
                      onChange={setTopicSearch}
                      placeholder="Tìm theo tên hoặc mô tả chủ đề…"
                    />
                    <FilterSelect
                      id="admin-topic-sort"
                      label="Sắp xếp"
                      value={topicSort}
                      onChange={setTopicSort}
                      options={TOPIC_SORT_OPTIONS}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAddTopicOpen(true)}
                      className="ml-auto h-9 px-4 rounded-[10px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 btn-press shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Thêm chủ đề</span>
                    </button>
                  </div>

                  {isAddTopicOpen && (
                    <form onSubmit={handleCreateTopic} className="bg-white border border-[#E5E9F0] rounded-[12px] p-3 flex items-center gap-3">
                      <input
                        type="text"
                        required
                        aria-label="Tên chủ đề mới"
                        value={newTopicForm.name}
                        onChange={(e) => setNewTopicForm({ ...newTopicForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                        placeholder="Tên chủ đề (vd: ai-machine-learning)"
                        className="h-9 px-3 bg-[#F8FAFC] rounded-[10px] text-xs w-60 border border-[#E5E9F0] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      />
                      <input
                        type="text"
                        aria-label="Mô tả chủ đề mới"
                        value={newTopicForm.description}
                        onChange={(e) => setNewTopicForm({ ...newTopicForm, description: e.target.value })}
                        placeholder="Mô tả tóm tắt…"
                        className="flex-1 h-9 px-3 bg-[#F8FAFC] rounded-[10px] text-xs border border-[#E5E9F0] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      />
                      <button type="submit" className="h-9 px-4 bg-[#2563EB] text-white text-xs rounded-[10px] font-medium btn-press shadow-2xs">
                        Lưu
                      </button>
                      <button type="button" onClick={() => setIsAddTopicOpen(false)} className="h-9 px-3 text-[#475569] text-xs hover:text-[#0F172A] btn-press">
                        Hủy
                      </button>
                    </form>
                  )}

                  <div className="bg-white border border-[#E5E9F0] rounded-[16px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <table className="w-full text-left text-[13px]">
                      <caption className="sr-only">Danh sách chủ đề</caption>
                      <thead className="bg-[#F8FAFC] border-b border-[#E5E9F0] [&_th]:font-medium [&_th]:text-[13px] [&_th]:text-[#475569]">
                        <tr>
                          <th scope="col" className="py-3 px-4">Tên chủ đề</th>
                          <th scope="col" className="py-3 px-4">Mô tả</th>
                          <th scope="col" className="py-3 px-4 text-right">Bài viết</th>
                          <th scope="col" className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E9F0]/60">
                        <TableStatusRow
                          colSpan={4}
                          loading={loading}
                          error=""
                          empty={pagedTopics.length === 0}
                          onRetry={loadAllData}
                          emptyText={topicSearch.trim() ? 'Không có chủ đề nào khớp từ khóa.' : 'Chưa có chủ đề nào.'}
                        />
                        {pagedTopics.map((t) => (
                          <tr key={t.id} className="hover:bg-[#F3F5F9]/60 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-[#1D4ED8] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getTopicColor(t.name) }} aria-hidden="true" />
                                <span>#{t.name}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-[#475569]">{t.description || 'Chưa có mô tả'}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums text-[#0F172A]">
                              {Number(t.postCount ?? 0).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setEditingTopic(t)}
                                className="text-[#64748B] hover:text-[#2563EB] p-1.5 rounded-lg hover:bg-[#EFF4FF] transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                                title="Sửa chủ đề"
                                aria-label={`Sửa chủ đề #${t.name}`}
                              >
                                <Edit className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTopic(t)}
                                className="text-[#64748B] hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors btn-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                                title="Xóa chủ đề"
                                aria-label={`Xóa chủ đề #${t.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Pager
                      label="Phân trang chủ đề"
                      noun="chủ đề"
                      page={topicPage}
                      limit={TOPICS_PER_PAGE}
                      total={filteredTopics.length}
                      shown={pagedTopics.length}
                      loading={false}
                      onPage={setTopicPage}
                    />
                  </div>
                </div>
              )}

              {editingTopic && (
                <EditTopicModal topic={editingTopic} onClose={() => setEditingTopic(null)} onSaved={handleTopicSaved} />
              )}
              {deletingTopic && (
                <DeleteTopicModal topic={deletingTopic} onClose={() => setDeletingTopic(null)} onDeleted={handleTopicDeleted} />
              )}

              {/* Sub-tab 2: Bài viết (kiểm duyệt) */}
              {subTab === 'posts' && <PostsPanel topics={topicsList} showToast={showToast} onChanged={loadAllData} />}
            </div>
          )}

          {/* TAB 4: NHẬP/XUẤT & SAO LƯU */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h1 className="text-[24px] font-semibold text-[#0F172A] tracking-[-0.01em]">
                  Nhập/xuất &amp; sao lưu
                </h1>
                <p className="text-[14px] text-[#475569] mt-0.5">
                  Xuất, nhập dữ liệu đồ thị và sao lưu, phục hồi toàn hệ thống
                </p>
              </div>

              <SystemPanel showToast={showToast} onChanged={loadAllData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
