import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  DollarSign, 
  Users, 
  ShieldCheck, 
  Receipt, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  Employee, 
  TimekeepingRecord, 
  InsuranceRecord, 
  MealRegistration, 
  SpecialAllowance, 
  Dependent, 
  SystemSettings 
} from '../types';
import { 
  calculateEmployeePayroll, 
  formatVND, 
  isEmployeeActiveInMonth,
  getEmployeeWorkStatusDetails 
} from '../utils/payrollCalculator';
import { exportAnnualPayrollToExcel } from '../utils/excelHelper';
import { PrintAnnualPayrollModal, AnnualEmployeeData } from '../components/PrintAnnualPayrollModal';
import { useAuthRole } from '../context/AuthRoleContext';

interface AnnualPayrollViewProps {
  employees: Employee[];
  timekeepings: TimekeepingRecord[];
  insurances: InsuranceRecord[];
  mealRegistrations: MealRegistration[];
  specialAllowances: SpecialAllowance[];
  dependents: Dependent[];
  settings: SystemSettings;
}

export const AnnualPayrollView: React.FC<AnnualPayrollViewProps> = ({
  employees,
  timekeepings,
  insurances,
  mealRegistrations,
  specialAllowances,
  dependents,
  settings,
}) => {
  const { canExportData } = useAuthRole();
  const [selectedYear, setSelectedYear] = useState<number>(settings.currentYear || 2026);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [viewMode, setViewMode] = useState<'monthly_net' | 'yearly_breakdown'>('monthly_net');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  // Tính toán dữ liệu 12 tháng cho toàn bộ nhân viên trong năm được chọn
  const annualData: AnnualEmployeeData[] = useMemo(() => {
    return employees.map(emp => {
      const depName = depMap.get(emp.departmentId) || '';
      const posName = posMap.get(emp.positionId) || '';
      const statusInfo = getEmployeeWorkStatusDetails(emp);
      const statusLabel = statusInfo.details ? `${statusInfo.label} ${statusInfo.details}` : statusInfo.label;

      const monthlyNet: { [month: number]: number } = {};
      let totalBaseSalaryYear = 0;
      let totalGrossYear = 0;
      let totalOtYear = 0;
      let totalInsuranceEmpYear = 0;
      let totalTaxYear = 0;
      let totalNetYear = 0;
      let activeMonthsCount = 0;

      for (let m = 1; m <= 12; m++) {
        // Kiểm tra nhân viên có hoạt động/phát sinh lương trong tháng m hay không
        const isActive = isEmployeeActiveInMonth(emp, m, selectedYear);
        if (!isActive) {
          monthlyNet[m] = 0;
          continue;
        }

        activeMonthsCount++;

        // Tìm hồ sơ công/bảo hiểm/phụ cấp/ăn ca của tháng m
        const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const tk = timekeepings.find(t => t.employeeId === emp.id && (t.month === monthStr || (!t.month && m === settings.currentMonth && selectedYear === settings.currentYear)));
        const ins = insurances.find(i => i.employeeId === emp.id);
        const meal = mealRegistrations.find(mReg => mReg.employeeId === emp.id);
        const empAllowances = specialAllowances.filter(a => a.employeeId === emp.id && (a.month === monthStr || !a.month));
        const empDependents = dependents.filter(d => d.employeeId === emp.id);

        const monthSettings: SystemSettings = {
          ...settings,
          currentMonth: m,
          currentYear: selectedYear
        };

        const payroll = calculateEmployeePayroll(
          emp,
          tk,
          ins,
          meal,
          empAllowances,
          empDependents,
          monthSettings
        );

        monthlyNet[m] = payroll.netSalary;
        totalBaseSalaryYear += payroll.baseSalary;
        totalGrossYear += payroll.grossIncome;
        totalOtYear += (payroll.otPayTaxable + payroll.otPayTaxExempt);
        totalInsuranceEmpYear += payroll.totalInsuranceEmp;
        totalTaxYear += payroll.personalIncomeTax;
        totalNetYear += payroll.netSalary;
      }

      const avgMonthlyNet = activeMonthsCount > 0 ? (totalNetYear / activeMonthsCount) : 0;

      return {
        employee: emp,
        departmentName: depName,
        positionName: posName,
        statusLabel,
        monthlyNet,
        totalBaseSalaryYear,
        totalGrossYear,
        totalOtYear,
        totalInsuranceEmpYear,
        totalTaxYear,
        totalNetYear,
        avgMonthlyNet,
      };
    });
  }, [employees, timekeepings, insurances, mealRegistrations, specialAllowances, dependents, settings, selectedYear, depMap, posMap]);

  // Bộ lọc tìm kiếm & phòng ban
  const filteredData = useMemo(() => {
    return annualData.filter(d => {
      const search = searchTerm.toLowerCase();
      const matchSearch = d.employee.fullName.toLowerCase().includes(search) || 
                          d.employee.employeeCode.toLowerCase().includes(search);
      const matchDep = filterDepartment === 'all' || d.employee.departmentId === filterDepartment;
      return matchSearch && matchDep;
    });
  }, [annualData, searchTerm, filterDepartment]);

  // Tổng hợp KPIs cả năm
  const summaryKPIs = useMemo(() => {
    const totalGross = filteredData.reduce((s, d) => s + d.totalGrossYear, 0);
    const totalNet = filteredData.reduce((s, d) => s + d.totalNetYear, 0);
    const totalTax = filteredData.reduce((s, d) => s + d.totalTaxYear, 0);
    const totalInsurance = filteredData.reduce((s, d) => s + d.totalInsuranceEmpYear, 0);
    const totalOt = filteredData.reduce((s, d) => s + d.totalOtYear, 0);
    const avgPerPerson = filteredData.length > 0 ? (totalNet / filteredData.length / 12) : 0;

    const monthlyTotals: { [month: number]: number } = {};
    for (let m = 1; m <= 12; m++) {
      monthlyTotals[m] = filteredData.reduce((s, d) => s + (d.monthlyNet[m] || 0), 0);
    }

    return {
      totalGross,
      totalNet,
      totalTax,
      totalInsurance,
      totalOt,
      avgPerPerson,
      monthlyTotals
    };
  }, [filteredData]);

  // Handler: Xuất Excel
  const handleExportExcel = () => {
    exportAnnualPayrollToExcel(filteredData, selectedYear, settings.companyName);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Báo Cáo Lương Toàn Bộ Lao Động Cả Năm {selectedYear}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp dữ liệu 12 tháng • Tự động loại trừ người lao động đã nghỉ việc, điều chuyển, thai sản ở các tháng không liên quan
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Chọn Năm */}
          <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300">
            <Calendar className="w-4 h-4 text-slate-500 mr-2" />
            <label className="text-xs font-semibold text-slate-700 mr-2">Năm:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-colors cursor-pointer"
            title="In bảng báo cáo lương cả năm khổ A4 ngang"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>In Báo Cáo Năm</span>
          </button>

          {canExportData && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel Báo Cáo Năm</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Tổng Quỹ Lương Gross</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black font-mono text-slate-900">
            {formatVND(summaryKPIs.totalGross)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Cả năm {selectedYear}</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">Tổng Thực Lĩnh (Net)</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-lg font-black font-mono text-emerald-900">
            {formatVND(summaryKPIs.totalNet)}
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">Đã chi trả thực tế</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Thuế TNCN Đã Khấu Trừ</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black font-mono text-purple-900">
            {formatVND(summaryKPIs.totalTax)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Quyết toán thuế cả năm</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">BHXH Khấu Trừ Lương</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black font-mono text-blue-900">
            {formatVND(summaryKPIs.totalInsurance)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">10.5% NLĐ đóng cả năm</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600">Thu Nhập TB / Tháng</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black font-mono text-amber-900">
            {formatVND(Math.round(summaryKPIs.avgPerPerson))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Bình quân / người / tháng</p>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã NV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Phòng ban */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả phòng ban</option>
              {settings.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto justify-center">
          <button
            onClick={() => setViewMode('monthly_net')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'monthly_net'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bảng Lương 12 Tháng (Net)
          </button>
          <button
            onClick={() => setViewMode('yearly_breakdown')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'yearly_breakdown'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chi Tiết Thu Nhập & Thuế Năm
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'monthly_net' ? (
            /* Mode 1: 12 Months Net Table */
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 min-w-[90px]">Mã NV</th>
                  <th className="py-3 px-3 min-w-[150px]">Họ và Tên</th>
                  <th className="py-3 px-3 min-w-[110px]">Phòng Ban</th>
                  <th className="py-3 px-3 min-w-[120px]">Trạng Thái</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <th key={m} className="py-3 px-2 text-right min-w-[75px] font-semibold text-slate-800">
                      T{m}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right min-w-[110px] bg-emerald-50 text-emerald-950 font-black">
                    Tổng Thực Lĩnh
                  </th>
                  <th className="py-3 px-3 text-right min-w-[90px] bg-emerald-50/50 text-emerald-900 font-bold">
                    TB / Tháng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, idx) => {
                  const statusInfo = getEmployeeWorkStatusDetails(row.employee);
                  return (
                    <tr key={row.employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.employee.employeeCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {row.employee.fullName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{row.departmentName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusInfo.colorClass}`}>
                          {statusInfo.label}
                        </span>
                        {statusInfo.details && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {statusInfo.details}
                          </div>
                        )}
                      </td>

                      {/* 12 Months Net */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                        const val = row.monthlyNet[m];
                        return (
                          <td key={m} className="py-2.5 px-2 text-right font-mono text-[11px]">
                            {val ? (
                              <span className="text-slate-800 font-medium">{formatVND(val)}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {formatVND(row.totalNetYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 bg-emerald-50/20">
                        {formatVND(Math.round(row.avgMonthlyNet))}
                      </td>
                    </tr>
                  );
                })}

                {/* Company Grand Total Row */}
                <tr className="bg-slate-200/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3 px-3 text-center uppercase tracking-wide">
                    TỔNG CỘNG TOÀN CÔNG TY ({filteredData.length} LAO ĐỘNG)
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <td key={m} className="py-3 px-2 text-right font-mono text-[11px] font-bold">
                      {summaryKPIs.monthlyTotals[m] ? formatVND(summaryKPIs.monthlyTotals[m]) : '-'}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">
                    {formatVND(summaryKPIs.totalNet)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-100">
                    {formatVND(Math.round(summaryKPIs.totalNet / 12))}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            /* Mode 2: Detailed Yearly Breakdown Table */
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 w-10 text-center">STT</th>
                  <th className="py-3 px-3 min-w-[90px]">Mã NV</th>
                  <th className="py-3 px-3 min-w-[150px]">Họ và Tên</th>
                  <th className="py-3 px-3 min-w-[110px]">Phòng Ban</th>
                  <th className="py-3 px-3 min-w-[120px]">Trạng Thái</th>
                  <th className="py-3 px-3 text-right min-w-[110px]">Tổng Lương CB</th>
                  <th className="py-3 px-3 text-right min-w-[115px]">Tổng Gross Năm</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">Tổng Tiền OT</th>
                  <th className="py-3 px-3 text-right min-w-[105px]">Tổng BHXH Trừ</th>
                  <th className="py-3 px-3 text-right min-w-[105px]">Thuế TNCN Đã Khấu Trừ</th>
                  <th className="py-3 px-3 text-right min-w-[120px] bg-emerald-50 text-emerald-950 font-black">
                    Tổng Thực Lĩnh Cả Năm
                  </th>
                  <th className="py-3 px-3 text-right min-w-[100px]">TB / Tháng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, idx) => {
                  const statusInfo = getEmployeeWorkStatusDetails(row.employee);
                  return (
                    <tr key={row.employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.employee.employeeCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.employee.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{row.departmentName}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusInfo.colorClass}`}>
                          {statusInfo.label}
                        </span>
                        {statusInfo.details && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {statusInfo.details}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatVND(row.totalBaseSalaryYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatVND(row.totalGrossYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatVND(row.totalOtYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatVND(row.totalInsuranceEmpYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-semibold">
                        {formatVND(row.totalTaxYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                        {formatVND(row.totalNetYear)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatVND(Math.round(row.avgMonthlyNet))}
                      </td>
                    </tr>
                  );
                })}

                {/* Company Grand Total Row */}
                <tr className="bg-slate-200/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3 px-3 text-center uppercase tracking-wide">
                    TỔNG CỘNG TOÀN CÔNG TY
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatVND(filteredData.reduce((s, d) => s + d.totalBaseSalaryYear, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black">
                    {formatVND(summaryKPIs.totalGross)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatVND(summaryKPIs.totalOt)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {formatVND(summaryKPIs.totalInsurance)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-purple-950">
                    {formatVND(summaryKPIs.totalTax)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">
                    {formatVND(summaryKPIs.totalNet)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black">
                    {formatVND(Math.round(summaryKPIs.totalNet / 12))}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Notice & Regulations */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Ghi chú về Báo Cáo Lương Toàn Bộ Lao Động Cả Năm:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-blue-800">
            <li>Báo cáo tự động tổng hợp toàn bộ 12 tháng làm việc của toàn bộ nhân viên có phát sinh hợp đồng hoặc làm việc trong năm <strong>{selectedYear}</strong>.</li>
            <li>Những tháng người lao động đã nghỉ việc, đang trong thời gian nghỉ thai sản hoặc điều chuyển công tác đi đơn vị khác sẽ hiển thị dấu <strong>&quot;-&quot;</strong> và không tính vào chi phí lương của công ty trong các tháng đó.</li>
            <li>Có thể bấm nút <strong>&quot;In Báo Cáo Năm&quot;</strong> để xuất bản in khổ A4 ngang gửi Ban Giám Đốc hoặc lưu trữ hồ sơ kế toán thuế cuối năm.</li>
          </ul>
        </div>
      </div>

      {/* Modal In Báo Cáo Năm */}
      <PrintAnnualPayrollModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        annualData={filteredData}
        year={selectedYear}
        settings={settings}
      />
    </div>
  );
};
