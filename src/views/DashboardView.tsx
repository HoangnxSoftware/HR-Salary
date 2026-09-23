import React from 'react';
import { 
  Users, 
  Wallet, 
  ShieldCheck, 
  Receipt, 
  TrendingUp, 
  CalendarCheck, 
  Utensils, 
  FileSpreadsheet,
  ArrowUpRight,
  ExternalLink,
  Printer,
  CloudCheck
} from 'lucide-react';
import { 
  Employee, 
  PayrollRecord, 
  SystemSettings, 
  GoogleSyncState, 
  TimekeepingRecord,
  Dependent 
} from '../types';
import { formatVND, formatNumber } from '../utils/payrollCalculator';

interface DashboardViewProps {
  employees: Employee[];
  payrolls: PayrollRecord[];
  timekeepings: TimekeepingRecord[];
  dependents: Dependent[];
  settings: SystemSettings;
  syncState: GoogleSyncState;
  onOpenSync: () => void;
  onNavigate: (tab: string) => void;
  onPrintPayroll: () => void;
  onPrintAllSlips: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  employees,
  payrolls,
  timekeepings,
  dependents,
  settings,
  syncState,
  onOpenSync,
  onNavigate,
  onPrintPayroll,
  onPrintAllSlips
}) => {
  const activeEmployees = employees.filter(e => e.workStatus === 'active');
  const totalGross = payrolls.reduce((sum, p) => sum + p.grossIncome, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const totalTax = payrolls.reduce((sum, p) => sum + p.personalIncomeTax, 0);
  const totalInsuranceEmp = payrolls.reduce((sum, p) => sum + p.totalInsuranceEmp, 0);
  const totalInsuranceEmployer = payrolls.reduce((sum, p) => sum + p.totalInsuranceEmployer, 0);
  const totalEnterprisePayrollBudget = totalGross + totalInsuranceEmployer;

  const totalMealsMonth = timekeepings.reduce((sum, t) => sum + (t.totalMeals || 0), 0);
  const totalOTHours = timekeepings.reduce((sum, t) => sum + (t.totalOtNormalHours || 0) + (t.totalOtWeekendHours || 0) + (t.totalOtHolidayHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Company Info & Sync Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Hệ Thống Tiền Lương & Quản Lý Lao Động Chuẩn Việt Nam
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">{settings.companyName}</h1>
          <p className="text-xs text-slate-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>MST: <strong className="text-white font-mono">{settings.taxCode}</strong></span>
            <span>• Giám đốc: <strong className="text-white">{settings.directorName}</strong></span>
            <span>• Kế toán trưởng: <strong className="text-white">{settings.chiefAccountantName}</strong></span>
            <span>• Chu kỳ tính: <strong className="text-emerald-300 font-mono">Tháng {settings.currentMonth}/{settings.currentYear}</strong></span>
          </p>
        </div>

        {/* Sync Status Badge & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenSync}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all border ${
              syncState.isConnected
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-200 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${syncState.isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span>{syncState.isConnected ? 'Google Sheets: Đã kết nối' : 'Kết nối Google Sheets / Drive'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrintPayroll}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>In Bảng Lương</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Salary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Thực Lĩnh (Net)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatVND(totalNet)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Gross: {formatVND(totalGross)}</span>
              <span className="text-emerald-600 font-semibold">{payrolls.length} người</span>
            </div>
          </div>
        </div>

        {/* Total Company Payroll Budget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Chi Phí DN (Gross + BH)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {formatVND(totalEnterprisePayrollBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>BH DN chịu (23.5%):</span>
              <span className="font-semibold text-blue-700">{formatVND(totalInsuranceEmployer)}</span>
            </div>
          </div>
        </div>

        {/* Total PIT Tax */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thuế TNCN Phải Nộp</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-red-600 tracking-tight">
              {formatVND(totalTax)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Biểu thuế 7 bậc</span>
              <span className="text-slate-600 font-medium">{dependents.length} NPT đăng ký</span>
            </div>
          </div>
        </div>

        {/* Total Social Insurance Contribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quỹ BHXH Toàn Công Ty (34%)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-purple-700 tracking-tight">
              {formatVND(totalInsuranceEmp + totalInsuranceEmployer)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>NLĐ: {formatVND(totalInsuranceEmp)}</span>
              <span>DN: {formatVND(totalInsuranceEmployer)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance & OT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Chấm Công & Làm Thêm</span>
            </h3>
            <button 
              onClick={() => onNavigate('timekeeping')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <span>Chi tiết</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Ngày công chuẩn tháng:</span>
              <span className="font-bold text-slate-900">{settings.standardWorkDays} ngày</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Tổng giờ làm thêm (OT):</span>
              <span className="font-bold text-emerald-700">{totalOTHours} giờ</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Số suất ăn ca phục vụ:</span>
              <span className="font-bold text-amber-700">{totalMealsMonth} suất</span>
            </div>
          </div>
        </div>

        {/* HR & Structure */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Nhân Sự & Bộ Máy</span>
            </h3>
            <button 
              onClick={() => onNavigate('employees')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
            >
              <span>Hồ sơ</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Tổng số lao động:</span>
              <span className="font-bold text-slate-900">{employees.length} người</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Đang làm việc chính thức:</span>
              <span className="font-bold text-emerald-700">{activeEmployees.length} người</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Số phòng ban / chức danh:</span>
              <span className="font-bold text-slate-800">{settings.departments.length} phòng / {settings.positions.length} chức vụ</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Thao Tác Nhanh Tiền Lương</span>
            </h3>
            <p className="text-xs text-emerald-800/80 mt-1">
              Xuất báo cáo thuế, in phiếu lương hàng loạt hoặc đồng bộ dữ liệu đám mây.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={onPrintAllSlips}
              className="px-3 py-2 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 shadow-2xs transition-all text-center cursor-pointer"
            >
              In Phiếu Lương Hàng Loạt
            </button>
            <button
              onClick={() => onNavigate('payroll')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all text-center cursor-pointer"
            >
              Bảng Thanh Toán Lương
            </button>
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Chi Phí Lương Theo Phòng Ban</h3>
            <p className="text-xs text-slate-500">Phân bổ quỹ lương theo cơ cấu tổ chức doanh nghiệp</p>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Quản lý phòng ban
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Mã Phòng</th>
                <th className="px-6 py-3">Tên Phòng Ban</th>
                <th className="px-6 py-3">Trưởng Phòng</th>
                <th className="px-6 py-3 text-center">Số Nhân Sự</th>
                <th className="px-6 py-3 text-right">Tổng Lương Cơ Bản</th>
                <th className="px-6 py-3 text-right">Tổng Thực Lĩnh (Net)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.departments.map(dep => {
                const depEmps = employees.filter(e => e.departmentId === dep.id);
                const depEmpIds = new Set(depEmps.map(e => e.id));
                const depPayrolls = payrolls.filter(p => depEmpIds.has(p.employeeId));
                const depBaseSum = depEmps.reduce((s, e) => s + e.baseSalary, 0);
                const depNetSum = depPayrolls.reduce((s, p) => s + p.netSalary, 0);

                return (
                  <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-800">{dep.code}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{dep.name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{dep.managerName || '-'}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-700">{depEmps.length}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-700">{formatVND(depBaseSum)}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-700">{formatVND(depNetSum)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
