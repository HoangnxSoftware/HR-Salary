import React, { useState, useRef, useEffect } from 'react';
import { 
  UserCircle2, 
  ChevronDown, 
  ShieldCheck, 
  LogOut, 
  KeyRound, 
  Users, 
  Shield, 
  Check, 
  UserCheck,
  Building2,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { AppUser, UserRole } from '../types';

interface UserProfileMenuProps {
  onOpenUserManagement: () => void;
  onOpenChangePassword: () => void;
  onOpenLoginModal: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenUserManagement,
  onOpenChangePassword,
  onOpenLoginModal
}) => {
  const { 
    currentUser, 
    currentUserRole, 
    roleLabel, 
    roleDescription, 
    logout, 
    switchUser, 
    users, 
    canManageUsers 
  } = useAuthRole();

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSwitchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) {
    return (
      <button
        onClick={onOpenLoginModal}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Đăng Nhập</span>
      </button>
    );
  }

  const roleColors: Record<UserRole, { bg: string; text: string; badge: string }> = {
    admin: { bg: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    accountant: { bg: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    payroll: { bg: 'bg-purple-600', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
    employee: { bg: 'bg-teal-600', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800 border-teal-300' }
  };

  const currentRoleColor = roleColors[currentUserRole] || roleColors.admin;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
        title="Tài khoản & Phân quyền"
      >
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${currentRoleColor.bg} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="text-left hidden md:block">
          <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
            {currentUser.name}
          </div>
          <div className="text-[10px] text-slate-500 font-medium leading-tight">
            {roleLabel.split('(')[0]}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* User Header Info */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${currentRoleColor.bg} text-white flex items-center justify-center font-black text-base shadow-xs`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  @{currentUser.username} • {currentUser.email}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentRoleColor.badge}`}>
                {roleLabel}
              </span>
              <span className="text-[10px] text-slate-400">
                {currentUser.lastLogin ? `Vừa đăng nhập: ${currentUser.lastLogin}` : 'Đang hoạt động'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 italic leading-snug">
              {roleDescription}
            </p>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {canManageUsers && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenUserManagement();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl font-semibold transition-colors cursor-pointer text-left"
              >
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <div>Quản Lý Người Dùng & Phân Quyền</div>
                  <div className="text-[10px] text-slate-400 font-normal">Thêm tài khoản, phân vai trò & ma trận quyền</div>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenChangePassword();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-semibold transition-colors cursor-pointer text-left"
            >
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Đổi Mật Khẩu Cá Nhân</span>
            </button>

            {/* Quick Switch User Toggle */}
            <div className="pt-1 border-t border-slate-100">
              <button
                onClick={() => setIsSwitchMenuOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Chuyển Tài Khoản Nhanh</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSwitchMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSwitchMenuOpen && (
                <div className="mt-1 pl-2 pr-1 py-1 space-y-1 bg-slate-50 rounded-xl border border-slate-200">
                  {users.map(u => {
                    const isSelected = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setIsSwitchMenuOpen(false);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-100/80 text-emerald-900 font-bold' : 'hover:bg-slate-200/70 text-slate-700'
                        }`}
                      >
                        <div className="truncate max-w-[190px]">
                          <span className="block truncate font-semibold text-[11px]">{u.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">@{u.username} ({u.role})</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Logout button */}
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Đăng Xuất Khỏi Phần Mềm</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
