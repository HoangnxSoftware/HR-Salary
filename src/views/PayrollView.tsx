import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  Filter, 
  CreditCard, 
  ShieldCheck, 
  Receipt, 
  Utensils, 
  Cloud,
  ChevronRight,
  User,
  TrendingUp
} from 'lucide-react';
import { 
  PayrollRecord, 
  Employee, 
  SystemSettings, 
  PaymentStatus, 
  GoogleSyncState 
} from '../types';
import { formatVND } from '../utils/payrollCalculator';
import { exportPayrollToExcel } from '../utils/excelHelper';
import { useAuthRole } from '../context/AuthRoleContext';

interface PayrollViewProps {
  payrolls: PayrollRecord[];
  employees: Employee[];
  settings: SystemSettings;
  syncState: GoogleSyncState;
  onOpenSync: () => void;
  onPrintPayroll: () => void;
  onPrintSlip: (employeeId?: string) => void;
  onUpdatePayrollStatus: (payrollId: string, status: PaymentStatus) => void;
  onUpdateAdvancePayment: (payrollId: string, amount: number) => void;
  onNavigateToAnnual?: () => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  payrolls,
  employees,
  settings,
  syncState,
  onOpenSync,
  onPrintPayroll,
  onPrintSlip,
  onUpdatePayrollStatus,
  onUpdateAdvancePayment,
  onNavigateToAnnual
}) => {
  const { canApprovePayroll, canExportData, currentUserRole, selectedEmployeeIdForSelf } = useAuthRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [advanceModal, setAdvanceModal] = useState<{ id: string; name: string; amount: number } | null>(null);

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  // Nếu là vai trò Employee, chỉ xem phiếu lương của chính mình
  const displayPayrolls = currentUserRole === 'employee'
    ? payrolls.filter(p => p.employeeId === selectedEmployeeIdForSelf)
    : payrolls.filter(p => {
        const emp = empMap.get(p.employeeId);
        const search = searchTerm.toLowerCase();
        const matchSearch = (emp && (emp.fullName.toLowerCase().includes(search) || emp.employeeCode.toLowerCase().includes(search))) || false;
        const matchDep = filterDepartment === 'all' || (emp && emp.departmentId === filterDepartment);
        const matchStatus = filterStatus === 'all' || p.paymentStatus === filterStatus;
        return matchSearch && matchDep && matchStatus;
      });

  // Totals
  const totalBase = payrolls.reduce((s, p) => s + p.baseSalary, 0);
  const totalGross = payrolls.reduce((s, p) => s + p.grossIncome, 0);
  const totalInsurance = payrolls.reduce((s, p) => s + p.totalInsuranceEmp, 0);
  const totalTax = payrolls.reduce((s, p) => s + p.personalIncomeTax, 0);
  const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);

  const handleExportExcel = () => {
    exportPayrollToExcel(payrolls, employees, settings, `${settings.currentMonth}_${settings.currentYear}`);
  };

  const handleSaveAdvance = () => {
    if (!advanceModal) return;
    onUpdateAdvancePayment(advanceModal.id, advanceModal.amount);
    setAdvanceModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Bảng Thanh Toán Lương & Thu Nhập Chi Tiết
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tháng {settings.currentMonth}/{settings.currentYear} • Tự động tính toán theo 7 bậc thuế lũy tiến & trích trừ bảo hiểm xã hội 10.5%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenSync}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            title="Đồng bộ trực tiếp lên Google Sheets"
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>Đồng Bộ Sheets</span>
          </button>

          {canExportData && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          <button
            onClick={() => onPrintSlip()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>In Phiếu Lương</span>
          </button>

          <button
            onClick={onPrintPayroll}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>In Bảng Lương (A4)</span>
          </button>

          {onNavigateToAnnual && (
            <button
              onClick={onNavigateToAnnual}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              title="Xem Báo Cáo Lương Toàn Bộ Lao Động Cả Năm"
            >
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Báo Cáo Năm</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Lương Cơ Bản</span>
          <div className="text-lg font-black font-mono text-slate-900 mt-1">
            {formatVND(totalBase)}
          </div>
          <span className="text-slate-400 mt-0.5 block">{payrolls.length} nhân sự</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Thu Nhập (Gross)</span>
          <div className="text-lg font-black font-mono text-slate-900 mt-1">
            {formatVND(totalGross)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Bao gồm OT & Phụ cấp</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Trích Nộp BHXH (10.5%)</span>
          <div className="text-lg font-black font-mono text-red-600 mt-1">
            -{formatVND(totalInsurance)}
          </div>
          <span className="text-slate-400 mt-0.5 block">BHXH, BHYT, BHTN</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Thuế TNCN Phải Nộp</span>
          <div className="text-lg font-black font-mono text-red-600 mt-1">
            -{formatVND(totalTax)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Biểu thuế 7 bậc</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-xs">
          <span className="text-emerald-100 font-semibold uppercase tracking-wider block">TỔNG THỰC LĨNH (NET)</span>
          <div className="text-xl font-black font-mono mt-1 text-white tracking-tight">
            {formatVND(totalNet)}
          </div>
          <span className="text-emerald-200 text-[11px] mt-0.5 block">Ngân sách chi trả thực tế</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {currentUserRole !== 'employee' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo Tên nhân viên, Mã NV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="all">Tất cả phòng ban</option>
              {settings.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Dự thảo</option>
              <option value="approved">Đã duyệt bảng lương</option>
              <option value="paid">Đã chuyển khoản</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
              <tr>
                <th className="px-3 py-3">Mã NV</th>
                <th className="px-3 py-3">Họ và Tên</th>
                <th className="px-3 py-3">Phòng Ban</th>
                <th className="px-3 py-3">Hình Thức</th>
                <th className="px-3 py-3 text-right">Lương CB</th>
                <th className="px-3 py-3 text-center">Công / Giờ</th>
                <th className="px-3 py-3 text-right">Lương Chính</th>
                <th className="px-3 py-3 text-right">OT & Phụ Cấp</th>
                <th className="px-3 py-3 text-right font-black text-slate-900 bg-emerald-50">TỔNG GROSS</th>
                <th className="px-3 py-3 text-right text-red-600">
                  BHXH ({((settings.socialInsRateEmployee || 0) + (settings.healthInsRateEmployee || 0) + (settings.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%)
                </th>
                <th className="px-3 py-3 text-right text-red-600">Thuế TNCN</th>
                <th className="px-3 py-3 text-right">Tạm Ứng</th>
                <th className="px-3 py-3 text-right font-black text-emerald-800 bg-teal-50">THỰC LĨNH (NET)</th>
                <th className="px-3 py-3 text-center">Trạng Thái</th>
                <th className="px-3 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-slate-400">
                    Không có bản ghi bảng lương nào phù hợp.
                  </td>
                </tr>
              ) : (
                displayPayrolls.map(p => {
                  const emp = empMap.get(p.employeeId);
                  const totalOtAndAllowances = p.otPayTaxable + p.otPayTaxExempt + p.taxableAllowances + p.taxExemptAllowances + p.mealAllowance;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-slate-800">
                        {emp?.employeeCode}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-900">
                        <div>{emp?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{posMap.get(emp?.positionId || '')}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {depMap.get(emp?.departmentId || '')}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {emp?.salaryBasis === 'monthly' ? 'Lương tháng' :
                           emp?.salaryBasis === 'daily' ? 'Ngày công' :
                           emp?.salaryBasis === 'hourly' ? 'Theo giờ' :
                           emp?.salaryBasis === 'percent' ? `${emp.salaryPercent || 100}% KPI` :
                           'Bộ phận'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-medium">
                        <div>{formatVND(p.baseSalary)}</div>
                        {emp?.salaryBasis === 'hourly' && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            {formatVND(p.hourlyRateApplied || emp.hourlyRate || 0)}/h
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {emp?.salaryBasis === 'hourly' ? (
                          <div>
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {p.actualWorkHours ?? p.actualPaidDays * 8}h
                            </span>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">({p.actualPaidDays} công)</div>
                          </div>
                        ) : emp?.salaryBasis === 'daily' ? (
                          <div>
                            <span className="font-bold text-emerald-800 font-mono text-sm">{p.actualPaidDays}</span>
                            <div className="text-[10px] text-slate-500 font-medium">ngày công</div>
                          </div>
                        ) : emp?.salaryBasis === 'percent' ? (
                          <div>
                            <span className="font-bold text-emerald-800 font-mono">{p.actualPaidDays}</span>
                            <span className="text-[10px] text-slate-400">/{p.standardDays}</span>
                            <div className="text-[10px] text-blue-600 font-semibold">{emp.salaryPercent || 100}% KPI</div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-emerald-700 font-mono">{p.actualPaidDays}</span>
                            <span className="text-[10px] text-slate-400">/{p.standardDays}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-mono">
                        {formatVND(p.mainSalary)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700">
                        {formatVND(totalOtAndAllowances)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold bg-emerald-50 text-slate-900">
                        {formatVND(p.grossIncome)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-red-600">
                        -{formatVND(p.totalInsuranceEmp)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-red-600">
                        {p.personalIncomeTax > 0 ? `-${formatVND(p.personalIncomeTax)}` : '0 đ'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {canApprovePayroll ? (
                          <button
                            onClick={() => setAdvanceModal({ id: p.id, name: emp?.fullName || '', amount: p.advancePayment })}
                            className="text-blue-600 hover:underline cursor-pointer"
                          >
                            {p.advancePayment > 0 ? `-${formatVND(p.advancePayment)}` : '0 đ'}
                          </button>
                        ) : (
                          p.advancePayment > 0 ? `-${formatVND(p.advancePayment)}` : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black text-sm text-emerald-800 bg-teal-50">
                        {formatVND(p.netSalary)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          p.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          p.paymentStatus === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.paymentStatus === 'paid' ? 'Đã thanh toán' :
                           p.paymentStatus === 'approved' ? 'Đã duyệt' : 'Dự thảo'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPrintSlip(p.employeeId)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] cursor-pointer"
                            title="In phiếu lương cá nhân"
                          >
                            Phiếu Lương
                          </button>

                          {canApprovePayroll && (
                            <select
                              value={p.paymentStatus}
                              onChange={e => onUpdatePayrollStatus(p.id, e.target.value as PaymentStatus)}
                              className="px-1.5 py-1 border border-slate-300 rounded text-[10px] font-semibold"
                            >
                              <option value="draft">Dự thảo</option>
                              <option value="approved">Duyệt</option>
                              <option value="paid">Đã chuyển khoản</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance Payment Modal */}
      {advanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              Khấu Trừ Tạm Ứng Trong Tháng
            </h3>
            <p className="text-slate-600">
              Nhân viên: <strong className="text-slate-900">{advanceModal.name}</strong>
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số tiền đã tạm ứng (VNĐ):</label>
              <input
                type="number"
                step={100000}
                value={advanceModal.amount}
                onChange={e => setAdvanceModal({ ...advanceModal, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdvanceModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveAdvance}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
