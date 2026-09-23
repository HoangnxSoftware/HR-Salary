import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Cloud, 
  Calendar, 
  ExternalLink, 
  UserCircle2, 
  ChevronDown,
  Menu,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { SystemSettings, GoogleSyncState, UserRole, Employee } from '../types';
import { useAuthRole } from '../context/AuthRoleContext';

interface NavbarProps {
  settings: SystemSettings;
  syncState: GoogleSyncState;
  onOpenSync: () => void;
  onToggleSidebar: () => void;
  employees: Employee[];
  onMonthChange: (month: number, year: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  syncState,
  onOpenSync,
  onToggleSidebar,
  employees,
  onMonthChange
}) => {
  const { 
    currentUserRole, 
    setCurrentUserRole, 
    selectedEmployeeIdForSelf, 
    setSelectedEmployeeIdForSelf, 
    roleLabel 
  } = useAuthRole();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Unit */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                  {settings.companyName}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  MST: {settings.taxCode}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:block">
                Phần mềm Quản lý Tiền lương & Nhân sự Doanh nghiệp
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls & Security Role */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Month / Year selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <select
              value={settings.currentMonth}
              onChange={e => onMonthChange(Number(e.target.value), settings.currentYear)}
              className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <span className="text-slate-400">/</span>
            <select
              value={settings.currentYear}
              onChange={e => onMonthChange(settings.currentMonth, Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pl-1"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Google Sheets Sync Pill */}
          <button
            onClick={onOpenSync}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              syncState.isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title={syncState.isConnected ? `Google Sheets: ${syncState.userEmail}` : 'Kết nối Google Sheets'}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {syncState.isConnected ? 'Google Sheets' : 'Lưu Google Drive'}
            </span>
            <span className={`w-2 h-2 rounded-full ${syncState.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </button>

          {/* Role Access Selector (Requirement 11: quản lý quyền truy cập dữ liệu bảo mật) */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="relative">
              <select
                value={currentUserRole}
                onChange={e => setCurrentUserRole(e.target.value as UserRole)}
                className="pl-2 pr-6 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="accountant">Kế toán trưởng</option>
                <option value="payroll">Kế toán tiền lương</option>
                <option value="employee">Người lao động (Xem lương)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
            </div>

            {/* If Employee mode, show dropdown to select which employee payslip to view */}
            {currentUserRole === 'employee' && (
              <select
                value={selectedEmployeeIdForSelf}
                onChange={e => setSelectedEmployeeIdForSelf(e.target.value)}
                className="px-2 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 focus:outline-none cursor-pointer max-w-[140px]"
                title="Chọn nhân viên để xem phiếu lương cá nhân"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
