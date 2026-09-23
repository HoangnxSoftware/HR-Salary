import React from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Utensils, 
  Gift, 
  CalendarCheck, 
  FileSpreadsheet, 
  Receipt, 
  Cloud,
  X
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSyncModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenSyncModal
}) => {
  const { currentUserRole, roleLabel } = useAuthRole();

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan Bảng Lương', icon: LayoutDashboard },
    { id: 'payroll', label: 'Bảng Thanh Toán Lương', icon: FileSpreadsheet },
    { id: 'timekeeping', label: 'Bảng Chấm Công & OT', icon: CalendarCheck },
    { id: 'employees', label: 'Danh Sách Người Lao Động', icon: Users },
    { id: 'insurance', label: 'Bảo Hiểm Xã Hội (BHXH)', icon: ShieldCheck },
    { id: 'dependents', label: 'Người Phụ Thuộc (Thuế)', icon: UserCheck },
    { id: 'meal', label: 'Đăng Ký Ăn Ca / Trưa', icon: Utensils },
    { id: 'allowances', label: 'Phụ Cấp Đặc Thù', icon: Gift },
    { id: 'tax', label: 'Báo Cáo Thuế TNCN', icon: Receipt },
    { id: 'settings', label: 'Cài Đặt Hệ Thống', icon: Settings },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-2xs"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              L
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">PAYROLL PRO</span>
              <span className="text-[11px] text-emerald-400 font-medium block">Hệ thống Tiền lương & Thuế</span>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Role Badge */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-[11px]">
          <span className="text-slate-500 block uppercase tracking-wider font-semibold">Quyền truy cập hiện tại:</span>
          <span className="font-bold text-emerald-300 mt-0.5 block">{roleLabel}</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-semibold">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer: Google Sheets Sync Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => {
              onOpenSyncModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Google Drive / Sheets</span>
          </button>
        </div>
      </aside>
    </>
  );
};
