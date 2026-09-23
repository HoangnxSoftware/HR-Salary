import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  Building2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { SystemSettings } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  settings: SystemSettings;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, settings }) => {
  const { login, users } = useAuthRole();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = login(username, password);
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công!');
      return;
    }

    setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
    setTimeout(() => {
      setSuccessMessage(null);
      if (onClose) onClose();
    }, 600);
  };

  const handleQuickLogin = (uname: string, pwd?: string) => {
    setUsername(uname);
    setPassword(pwd || '123');
    setErrorMessage(null);

    const result = login(uname, pwd || '123');
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công!');
      return;
    }

    setSuccessMessage(`Đăng nhập thành công với tài khoản "${uname}"!`);
    setTimeout(() => {
      setSuccessMessage(null);
      if (onClose) onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

        {/* Company Header */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Đăng Nhập Phần Mềm
          </h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-1">
            {settings.companyName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-[11px] text-slate-500">MST: {settings.taxCode}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phân Quyền Đa Cấp</span>
            </span>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Tên đăng nhập hoặc Email</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="admin, ketoantruong, nhanvien..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-3.5 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Mật khẩu truy cập</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Nhập mật khẩu (Mặc định: 123)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Hệ Thống</span>
          </button>
        </form>

        {/* Quick Demo One-Click Accounts */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tài Khoản Mẫu Trải Nghiệm (1-Click)</span>
            </span>
            <span className="text-[10px] text-slate-400">Pass: 123</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', '123')}
              className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 group-hover:text-emerald-700">👑 Quản Trị Viên</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">admin / Toàn quyền</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ketoantruong', '123')}
              className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 group-hover:text-blue-700">💼 Kế Toán Trưởng</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">ketoantruong / Duyệt lương</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ketoanluong', '123')}
              className="p-2.5 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 group-hover:text-purple-700">📝 Kế Toán Lương</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">ketoanluong / Chấm công, BH</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('nhanvien', '123')}
              className="p-2.5 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 group-hover:text-teal-700">👤 Người Lao Động</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">nhanvien / Xem phiếu lương</div>
            </button>
          </div>
        </div>

        {/* Security Footnote */}
        <div className="mt-5 text-center text-[10px] text-slate-400">
          Hệ thống bảo mật dữ liệu lương & nhân sự nội bộ theo quy định pháp luật.
        </div>
      </div>
    </div>
  );
};
