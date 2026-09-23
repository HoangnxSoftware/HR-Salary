import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Download, 
  Printer, 
  Search, 
  Info, 
  Sliders, 
  Filter, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle,
  TrendingDown,
  Layers,
  ChevronRight,
  Eye
} from 'lucide-react';
import { PayrollRecord, Employee, SystemSettings, TaxBracket, TaxExemptionRules } from '../types';
import { 
  formatVND, 
  DEFAULT_TAX_BRACKETS, 
  DEFAULT_TAX_EXEMPTION_RULES,
  calculateTaxBreakdown 
} from '../utils/payrollCalculator';
import { exportTaxReportToExcel } from '../utils/excelHelper';
import { useAuthRole } from '../context/AuthRoleContext';
import { PrintTaxReportModal } from '../components/PrintTaxReportModal';
import { EditTaxBracketsModal } from '../components/EditTaxBracketsModal';
import { EditTaxExemptionModal } from '../components/EditTaxExemptionModal';

interface TaxReportViewProps {
  payrolls: PayrollRecord[];
  employees: Employee[];
  settings: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
}

export const TaxReportView: React.FC<TaxReportViewProps> = ({
  payrolls,
  employees,
  settings,
  onUpdateSettings
}) => {
  const { canExportData, canEditSettings } = useAuthRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [taxFilter, setTaxFilter] = useState<'all' | 'tax_only' | 'no_tax'>('all');
  const [activeTab, setActiveTab] = useState<'summary' | 'taxable_breakdown' | 'brackets_view'>('summary');
  
  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isEditBracketsOpen, setIsEditBracketsOpen] = useState(false);
  const [isEditExemptionOpen, setIsEditExemptionOpen] = useState(false);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const depMap = useMemo(() => new Map(settings.departments.map(d => [d.id, d.name])), [settings.departments]);

  // Current active tax exemption rules
  const activeExemptionRules: TaxExemptionRules = useMemo(() => {
    return settings.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES;
  }, [settings.taxExemptionRules]);

  // Current active tax brackets
  const activeBrackets: TaxBracket[] = useMemo(() => {
    return (settings.taxBrackets && settings.taxBrackets.length > 0)
      ? settings.taxBrackets
      : DEFAULT_TAX_BRACKETS;
  }, [settings.taxBrackets]);

  // Filtered payrolls
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(p => {
      const emp = empMap.get(p.employeeId);
      if (!emp) return false;

      // Department filter
      if (selectedDepartment !== 'all' && emp.departmentId !== selectedDepartment) {
        return false;
      }

      // Tax status filter
      if (taxFilter === 'tax_only' && p.personalIncomeTax <= 0) return false;
      if (taxFilter === 'no_tax' && p.personalIncomeTax > 0) return false;

      // Search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(search);
        const matchCode = emp.employeeCode.toLowerCase().includes(search);
        const matchTax = emp.taxId ? emp.taxId.includes(search) : false;
        return matchName || matchCode || matchTax;
      }

      return true;
    });
  }, [payrolls, empMap, selectedDepartment, taxFilter, searchTerm]);

  // Grand Totals
  const totalGross = useMemo(() => payrolls.reduce((s, p) => s + p.grossIncome, 0), [payrolls]);
  const totalMainSalary = useMemo(() => payrolls.reduce((s, p) => s + p.mainSalary, 0), [payrolls]);
  const totalOtTaxable = useMemo(() => payrolls.reduce((s, p) => s + p.otPayTaxable, 0), [payrolls]);
  const totalTaxableAllowances = useMemo(() => payrolls.reduce((s, p) => s + p.taxableAllowances, 0), [payrolls]);
  const totalTaxable = useMemo(() => payrolls.reduce((s, p) => s + p.taxableIncome, 0), [payrolls]);

  const totalOtTaxExempt = useMemo(() => payrolls.reduce((s, p) => s + p.otPayTaxExempt, 0), [payrolls]);
  const totalMealExempt = useMemo(() => payrolls.reduce((s, p) => s + (p.mealAllowance || 0), 0), [payrolls]);
  const totalExemptAllowances = useMemo(() => payrolls.reduce((s, p) => s + p.taxExemptAllowances, 0), [payrolls]);
  const totalTaxExempt = useMemo(() => totalOtTaxExempt + totalMealExempt + totalExemptAllowances, [totalOtTaxExempt, totalMealExempt, totalExemptAllowances]);

  const totalPersonalDeduction = useMemo(() => payrolls.reduce((s, p) => s + p.personalDeduction, 0), [payrolls]);
  const totalDependentCount = useMemo(() => payrolls.reduce((s, p) => s + p.dependentCount, 0), [payrolls]);
  const totalDependentDeduction = useMemo(() => payrolls.reduce((s, p) => s + p.dependentDeduction, 0), [payrolls]);
  const totalInsuranceDeduction = useMemo(() => payrolls.reduce((s, p) => s + p.totalInsuranceEmp, 0), [payrolls]);
  const totalAllDeductions = useMemo(() => totalPersonalDeduction + totalDependentDeduction + totalInsuranceDeduction, [totalPersonalDeduction, totalDependentDeduction, totalInsuranceDeduction]);
  
  const totalAssessable = useMemo(() => payrolls.reduce((s, p) => s + p.assessableIncome, 0), [payrolls]);
  const totalTax = useMemo(() => payrolls.reduce((s, p) => s + p.personalIncomeTax, 0), [payrolls]);
  const totalTaxPayers = useMemo(() => payrolls.filter(p => p.personalIncomeTax > 0).length, [payrolls]);

  // Distribution of employees in brackets
  const bracketDistribution = useMemo(() => {
    const counts: Record<number, number> = {};
    activeBrackets.forEach(b => { counts[b.bracket] = 0; });
    
    payrolls.forEach(p => {
      const breakdown = calculateTaxBreakdown(p.assessableIncome, activeBrackets);
      if (breakdown.highestBracket > 0) {
        counts[breakdown.highestBracket] = (counts[breakdown.highestBracket] || 0) + 1;
      }
    });
    return counts;
  }, [payrolls, activeBrackets]);

  // Handle save updated brackets
  const handleSaveTaxBrackets = (updatedBrackets: TaxBracket[]) => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        taxBrackets: updatedBrackets
      });
    }
  };

  const handleSaveTaxExemptionRules = (updatedRules: TaxExemptionRules) => {
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        taxExemptionRules: updatedRules
      });
    }
  };

  const handleExportExcel = () => {
    exportTaxReportToExcel(payrolls, employees, settings, `${settings.currentMonth}_${settings.currentYear}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Báo Cáo Thuế Thu Nhập Cá Nhân (TNCN)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Kỳ tính: Tháng {settings.currentMonth}/{settings.currentYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp tính thuế từ tiền lương, tiền công • Phân định rõ ràng các khoản chịu thuế và không chịu thuế • Biểu lũy tiến {activeBrackets.length} bậc
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Edit Tax Exemption Rules Button */}
          {canEditSettings && (
            <button
              onClick={() => setIsEditExemptionOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Thiết Lập Khoản Miễn Thuế TNCN</span>
            </button>
          )}

          {/* Edit Tax Brackets Button */}
          {canEditSettings && (
            <button
              onClick={() => setIsEditBracketsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Chỉnh Sửa Biểu Thuế Lũy Tiến</span>
            </button>
          )}

          {/* Export Excel Button */}
          {canExportData && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel Thuế</span>
            </button>
          )}

          {/* Print Tax Report Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>In Bảng Tổng Hợp Thuế TNCN</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Taxable Income */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">1. Các Khoản Chịu Thuế</span>
            <span className="p-1.5 bg-amber-50 rounded-lg text-amber-700 border border-amber-200">
              Chịu thuế
            </span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 mt-2">
            {formatVND(totalTaxable)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
            <span>• Lương thời gian: <strong className="font-mono text-slate-700">{formatVND(totalMainSalary)}</strong></span>
            <span>• OT tính thuế (100%): <strong className="font-mono text-slate-700">{formatVND(totalOtTaxable)}</strong></span>
            <span>• Phụ cấp chịu thuế: <strong className="font-mono text-slate-700">{formatVND(totalTaxableAllowances)}</strong></span>
          </div>
        </div>

        {/* Tax-Exempt / Non-taxable Income */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-emerald-700 font-semibold uppercase tracking-wider block">2. Các Khoản Miễn Thuế</span>
            <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-200 font-bold">
              Miễn thuế
            </span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-700 mt-2">
            {formatVND(totalTaxExempt)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
            <span>• OT vượt mức miễn thuế: <strong className="font-mono text-emerald-700">{formatVND(totalOtTaxExempt)}</strong></span>
            <span>• Ăn ca định mức: <strong className="font-mono text-emerald-700">{formatVND(totalMealExempt)}</strong></span>
            <span>• Phụ cấp miễn thuế: <strong className="font-mono text-emerald-700">{formatVND(totalExemptAllowances)}</strong></span>
          </div>
        </div>

        {/* Total Deductions & Assessable Income */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-blue-700 font-semibold uppercase tracking-wider block">3. Giảm Trừ & TNTT</span>
            <span className="p-1.5 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
              Giảm trừ
            </span>
          </div>
          <div className="text-xl font-black font-mono text-blue-800 mt-2">
            {formatVND(totalAllDeductions)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-col gap-0.5">
            <span>• Bản thân & NPT ({totalDependentCount} người): <strong className="font-mono text-blue-700">{formatVND(totalPersonalDeduction + totalDependentDeduction)}</strong></span>
            <span>• BHXH NLĐ 10.5%: <strong className="font-mono text-blue-700">{formatVND(totalInsuranceDeduction)}</strong></span>
            <span className="text-amber-800 font-semibold pt-1 border-t border-slate-100">
              Thu nhập tính thuế (TNTT): <strong className="font-mono font-bold">{formatVND(totalAssessable)}</strong>
            </span>
          </div>
        </div>

        {/* Total Tax Payable */}
        <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white p-4 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-red-100 font-bold uppercase tracking-wider block">4. TỔNG THUẾ TNCN PHẢI NỘP</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                NSNN
              </span>
            </div>
            <div className="text-2xl font-black font-mono mt-2 tracking-tight">
              {formatVND(totalTax)}
            </div>
          </div>
          <div className="text-[11px] text-red-100 mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
            <span>Có {totalTaxPayers}/{payrolls.length} nhân viên phát sinh thuế</span>
            <span className="font-semibold underline cursor-pointer" onClick={() => setTaxFilter('tax_only')}>
              Xem chi tiết →
            </span>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
            activeTab === 'summary'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Bảng Tổng Hợp Kê Khai Thuế TNCN</span>
        </button>

        <button
          onClick={() => setActiveTab('taxable_breakdown')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
            activeTab === 'taxable_breakdown'
              ? 'bg-white text-emerald-800 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bóc Tách Thu Nhập Chịu Thuế vs Miễn Thuế</span>
        </button>

        <button
          onClick={() => setActiveTab('brackets_view')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
            activeTab === 'brackets_view'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Cấu Hình Biểu Lũy Tiến ({activeBrackets.length} Bậc)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Họ tên, Mã NV, MST..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Department */}
          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả phòng ban</option>
            {settings.departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Tax Status Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setTaxFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                taxFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({payrolls.length})
            </button>
            <button
              onClick={() => setTaxFilter('tax_only')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                taxFilter === 'tax_only' ? 'bg-red-50 text-red-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Có nộp thuế ({totalTaxPayers})
            </button>
            <button
              onClick={() => setTaxFilter('no_tax')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                taxFilter === 'no_tax' ? 'bg-emerald-50 text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa đến mức nộp ({payrolls.length - totalTaxPayers})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SUMMARY TAX DECLARATION TABLE */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">STT</th>
                  <th className="px-3 py-3 w-24">Mã NV</th>
                  <th className="px-3 py-3 min-w-[150px]">Họ và Tên</th>
                  <th className="px-3 py-3 min-w-[130px]">Phòng Ban</th>
                  <th className="px-3 py-3 font-mono min-w-[100px]">Mã Số Thuế</th>
                  
                  {/* Chịu thuế */}
                  <th className="px-3 py-3 text-right bg-amber-50/60 text-amber-950 font-bold min-w-[110px]">
                    TN Chịu Thuế [1]
                  </th>

                  {/* Miễn thuế */}
                  <th className="px-3 py-3 text-right bg-emerald-50/60 text-emerald-900 font-bold min-w-[110px]">
                    TN Miễn Thuế [2]
                  </th>

                  {/* Tổng Gross */}
                  <th className="px-3 py-3 text-right font-bold min-w-[110px]">
                    Tổng TN [3]
                  </th>

                  {/* Giảm trừ */}
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">Bản Thân</th>
                  <th className="px-3 py-3 text-center text-slate-600 w-14">NPT</th>
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">Giảm NPT</th>
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">BHXH 10.5%</th>
                  
                  {/* Tính thuế */}
                  <th className="px-3 py-3 text-right font-bold text-amber-800 bg-amber-50/30 min-w-[110px]">
                    TN Tính Thuế [4]
                  </th>
                  <th className="px-3 py-3 text-center w-16">Bậc</th>
                  <th className="px-3 py-3 text-right font-black text-red-700 bg-red-50 min-w-[110px]">
                    THUẾ TNCN [5]
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayrolls.map((p, idx) => {
                  const emp = empMap.get(p.employeeId);
                  const exempt = p.otPayTaxExempt + p.taxExemptAllowances + (p.mealAllowance || 0);
                  const breakdown = calculateTaxBreakdown(p.assessableIncome, activeBrackets);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp?.employeeCode}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">{emp?.fullName}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{depMap.get(emp?.departmentId || '')}</td>
                      <td className="px-3 py-3 font-mono text-slate-600">{emp?.taxId || '-'}</td>

                      {/* Chịu thuế */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-950 bg-amber-50/30">
                        {formatVND(p.taxableIncome)}
                      </td>

                      {/* Miễn thuế */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {formatVND(exempt)}
                      </td>

                      {/* Tổng thu nhập */}
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-800">
                        {formatVND(p.grossIncome)}
                      </td>

                      {/* Giảm trừ */}
                      <td className="px-3 py-3 text-right font-mono text-slate-600">{formatVND(p.personalDeduction)}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{p.dependentCount || '-'}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {p.dependentDeduction > 0 ? formatVND(p.dependentDeduction) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">{formatVND(p.totalInsuranceEmp)}</td>

                      {/* Thu nhập tính thuế */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-900 bg-amber-50/30">
                        {formatVND(p.assessableIncome)}
                      </td>

                      {/* Bậc thuế cao nhất */}
                      <td className="px-3 py-3 text-center font-mono">
                        {breakdown.highestBracket > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                            B{breakdown.highestBracket}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Thuế TNCN */}
                      <td className="px-3 py-3 text-right font-mono font-black text-red-600 bg-red-50/60">
                        {p.personalIncomeTax > 0 ? formatVND(p.personalIncomeTax) : '0 đ'}
                      </td>
                    </tr>
                  );
                })}

                {filteredPayrolls.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy nhân viên nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center uppercase tracking-wider text-slate-800">
                    TỔNG CỘNG ({filteredPayrolls.length} NHÂN VIÊN)
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-amber-950 bg-amber-100">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.taxableIncome, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-900 bg-emerald-100">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + (p.otPayTaxExempt + p.taxExemptAllowances + (p.mealAllowance || 0)), 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.grossIncome, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.personalDeduction, 0))}
                  </td>
                  <td className="px-3 py-3 text-center font-mono">
                    {filteredPayrolls.reduce((s, p) => s + p.dependentCount, 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.dependentDeduction, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.totalInsuranceEmp, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-amber-900 bg-amber-100">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.assessableIncome, 0))}
                  </td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-right font-mono font-black text-red-700 bg-red-100 text-sm">
                    {formatVND(filteredPayrolls.reduce((s, p) => s + p.personalIncomeTax, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED TAXABLE VS NON-TAXABLE BREAKDOWN */}
      {activeTab === 'taxable_breakdown' && (
        <div className="space-y-4">
          {/* Explanation & Active Configuration Banner */}
          <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-emerald-950 text-sm">
                  Thiết Lập Quy Định Miễn Thuế TNCN Đang Áp Dụng
                </h4>
              </div>
              {canEditSettings && (
                <button
                  type="button"
                  onClick={() => setIsEditExemptionOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Thay Đổi Thiết Lập Miễn Thuế</span>
                </button>
              )}
            </div>

            {/* Grid of active rules status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">1. Làm thêm giờ (Tăng ca)</div>
                <div className="font-bold text-slate-800 mt-0.5 text-[11px]">
                  {activeExemptionRules.otExemptMode === 'differential_only' && 'Chỉ miễn phần vượt mức (TT 111/2013)'}
                  {activeExemptionRules.otExemptMode === 'fully_exempt' && 'Miễn 100% toàn bộ tiền OT'}
                  {activeExemptionRules.otExemptMode === 'fully_taxable' && 'Tính thuế 100% tiền OT'}
                  {activeExemptionRules.otExemptMode === 'custom_rate' && `Miễn ${activeExemptionRules.otCustomExemptRate}% tổng tiền OT`}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">2. Ăn ca tiền mặt</div>
                <div className="font-bold text-slate-800 mt-0.5 text-[11px]">
                  {activeExemptionRules.mealExemptMode === 'capped' && `Trần: ${formatVND(activeExemptionRules.mealExemptMonthlyCap)}/tháng`}
                  {activeExemptionRules.mealExemptMode === 'fully_exempt' && 'Miễn 100% tiền mặt'}
                  {activeExemptionRules.mealExemptMode === 'fully_taxable' && 'Tính thuế 100% tiền mặt'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">3. Trang phục tiền mặt</div>
                <div className="font-bold text-slate-800 mt-0.5 text-[11px]">
                  {activeExemptionRules.uniformExemptMode === 'capped' && `Trần: ${formatVND(activeExemptionRules.uniformExemptMonthlyCap)}/tháng`}
                  {activeExemptionRules.uniformExemptMode === 'fully_exempt' && 'Miễn 100% tiền mặt'}
                  {activeExemptionRules.uniformExemptMode === 'fully_taxable' && 'Tính thuế 100%'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">4. Điện thoại & Xăng xe</div>
                <div className="font-bold text-slate-800 mt-0.5 text-[11px]">
                  {activeExemptionRules.phoneExemptMode === 'company_policy' ? 'Theo quy chế khoán chi công ty' : activeExemptionRules.phoneExemptMode === 'capped' ? `Trần ĐT: ${formatVND(activeExemptionRules.phoneExemptMonthlyCap || 0)}` : 'Tính thuế'}
                </div>
              </div>
            </div>

            <p className="text-emerald-800 leading-relaxed text-[11px] pt-1">
              • <strong>Thu nhập chịu thuế (Cột Cam):</strong> Lương chính/ngày công + Phần lương tăng ca tính thuế + Phụ cấp chịu thuế (trách nhiệm, chuyên cần, chức vụ...) + Phần vượt trần định mức.<br/>
              • <strong>Thu nhập không chịu thuế / Miễn thuế (Cột Xanh):</strong> Tiền tăng ca được miễn thuế theo quy định + Tiền ăn ca quy chế trong hạn mức + Phụ cấp trang phục trong định mức + Phụ cấp khoán chi.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-300">
                  {/* Top grouping */}
                  <tr className="border-b border-slate-200 text-center">
                    <th colSpan={3} className="px-3 py-2 bg-slate-200 text-slate-800">NHÂN SỰ</th>
                    <th colSpan={4} className="px-3 py-2 bg-amber-100 text-amber-950">I. CÁC KHOẢN CHỊU THUẾ TNCN</th>
                    <th colSpan={4} className="px-3 py-2 bg-emerald-100 text-emerald-950">II. CÁC KHOẢN MIỄN THUẾ / KHÔNG CHỊU THUẾ</th>
                    <th colSpan={2} className="px-3 py-2 bg-slate-200 text-slate-800">TỔNG HỢP</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2.5 w-12 text-center">STT</th>
                    <th className="px-3 py-2.5 w-24">Mã NV</th>
                    <th className="px-3 py-2.5 min-w-[140px]">Họ và Tên</th>

                    {/* Chịu thuế items */}
                    <th className="px-3 py-2.5 text-right bg-amber-50/70 text-amber-900 min-w-[100px]">Lương Thời Gian</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70 text-amber-900 min-w-[95px]">OT Tính Thuế (100%)</th>
                    <th className="px-3 py-2.5 text-right bg-amber-50/70 text-amber-900 min-w-[95px]">Phụ Cấp Tính Thuế</th>
                    <th className="px-3 py-2.5 text-right bg-amber-100 font-bold text-amber-950 min-w-[110px]">CỘNG CHỊU THUẾ</th>

                    {/* Miễn thuế items */}
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70 text-emerald-900 min-w-[100px]">OT Vượt Mức Miễn Thuế</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70 text-emerald-900 min-w-[90px]">Ăn Ca Miễn Thuế</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-50/70 text-emerald-900 min-w-[90px]">Phụ Cấp Miễn Thuế</th>
                    <th className="px-3 py-2.5 text-right bg-emerald-100 font-bold text-emerald-950 min-w-[110px]">CỘNG MIỄN THUẾ</th>

                    {/* Gross and Ratio */}
                    <th className="px-3 py-2.5 text-right font-bold text-slate-900 min-w-[110px]">Tổng Gross</th>
                    <th className="px-3 py-2.5 text-center w-24 font-bold text-emerald-800">% Miễn Thuế</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayrolls.map((p, idx) => {
                    const emp = empMap.get(p.employeeId);
                    const totalExempt = p.otPayTaxExempt + (p.mealAllowance || 0) + p.taxExemptAllowances;
                    const exemptPercent = p.grossIncome > 0 ? Math.round((totalExempt / p.grossIncome) * 100) : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{emp?.employeeCode}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">{emp?.fullName}</td>

                        {/* Chịu thuế */}
                        <td className="px-3 py-2.5 text-right font-mono bg-amber-50/30">{formatVND(p.mainSalary)}</td>
                        <td className="px-3 py-2.5 text-right font-mono bg-amber-50/30">
                          {p.otPayTaxable > 0 ? formatVND(p.otPayTaxable) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono bg-amber-50/30">
                          {p.taxableAllowances > 0 ? formatVND(p.taxableAllowances) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-950 bg-amber-100/60">
                          {formatVND(p.taxableIncome)}
                        </td>

                        {/* Miễn thuế */}
                        <td className="px-3 py-2.5 text-right font-mono bg-emerald-50/30 text-emerald-800">
                          {p.otPayTaxExempt > 0 ? formatVND(p.otPayTaxExempt) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono bg-emerald-50/30 text-emerald-800">
                          {p.mealAllowance > 0 ? formatVND(p.mealAllowance) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono bg-emerald-50/30 text-emerald-800">
                          {p.taxExemptAllowances > 0 ? formatVND(p.taxExemptAllowances) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-950 bg-emerald-100/60">
                          {formatVND(totalExempt)}
                        </td>

                        {/* Gross and Ratio */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatVND(p.grossIncome)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {exemptPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center uppercase tracking-wider text-slate-800">
                      TỔNG CỘNG TOÀN DOANH NGHIỆP
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatVND(totalMainSalary)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatVND(totalOtTaxable)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatVND(totalTaxableAllowances)}</td>
                    <td className="px-3 py-3 text-right font-mono font-black text-amber-950 bg-amber-200">
                      {formatVND(totalTaxable)}
                    </td>

                    <td className="px-3 py-3 text-right font-mono text-emerald-800">{formatVND(totalOtTaxExempt)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-800">{formatVND(totalMealExempt)}</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-800">{formatVND(totalExemptAllowances)}</td>
                    <td className="px-3 py-3 text-right font-mono font-black text-emerald-950 bg-emerald-200">
                      {formatVND(totalTaxExempt)}
                    </td>

                    <td className="px-3 py-3 text-right font-mono font-black text-slate-900 bg-slate-200">
                      {formatVND(totalGross)}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-black text-emerald-800">
                      {totalGross > 0 ? Math.round((totalTaxExempt / totalGross) * 100) : 0}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TAX BRACKETS CONFIGURATION VIEW */}
      {activeTab === 'brackets_view' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Cơ chế tính thuế</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {activeBrackets.length} Bậc thuế
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Biểu Thuế Lũy Tiến Từng Phần Đang Áp Dụng
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Thuế TNCN đối với thu nhập từ tiền lương, tiền công được tính theo phương pháp lũy tiến từng phần
              </p>
            </div>

            {canEditSettings && (
              <button
                onClick={() => setIsEditBracketsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Chỉnh Sửa Cấu Hình Biểu Thuế</span>
              </button>
            )}
          </div>

          {/* Cards of brackets with employee distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeBrackets.map((b) => {
              const ratePercent = b.rate > 1 ? b.rate : Math.round(b.rate * 100);
              const countInBracket = bracketDistribution[b.bracket] || 0;
              const isInfinity = b.max === null || b.max === undefined || b.max === Infinity;

              return (
                <div 
                  key={b.bracket}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-100">
                          {b.bracket}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-2xs">
                        {ratePercent}%
                      </span>
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Mức TNTT:</span>
                        <span className="font-mono font-semibold text-slate-800 text-right">
                          {isInfinity 
                            ? `Trên ${formatVND(b.min)}` 
                            : `${formatVND(b.min)} - ${formatVND(b.max!)}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Diễn giải:</span>
                        <span className="text-slate-700 italic truncate max-w-[150px]">
                          {b.description || 'Theo quy định'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Số nhân viên rơi vào bậc:</span>
                    <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
                      countInBracket > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {countInBracket} người
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Guidance Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Hướng Dẫn Chỉnh Sửa Biểu Thuế Lũy Tiến:</span>
            </h4>
            <p>
              • Bạn có thể bấm vào nút <strong>"Chỉnh Sửa Cấu Hình Biểu Thuế"</strong> ở trên để thay đổi các ngưỡng thu nhập tính thuế, mức thuế suất (%), thêm hoặc bớt số bậc.<br/>
              • Hệ thống hỗ trợ sẵn mẫu thiết lập nhanh: <strong>Biểu chuẩn 7 bậc hiện hành</strong> (Thông tư 111/2013/TT-BTC) và <strong>Dự thảo cải cách 5 bậc rút gọn</strong> của Bộ Tài chính.<br/>
              • Mọi thay đổi về biểu thuế sẽ lập tức cập nhật tự động toàn bộ bảng tính lương, phiếu lương và báo cáo thuế của toàn thể nhân viên trong doanh nghiệp.
            </p>
          </div>
        </div>
      )}

      {/* PRINT TAX REPORT MODAL */}
      <PrintTaxReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        employees={employees}
        payrolls={payrolls}
        settings={settings}
        month={`${settings.currentMonth}/${settings.currentYear}`}
      />

      {/* EDIT TAX BRACKETS MODAL */}
      <EditTaxBracketsModal
        isOpen={isEditBracketsOpen}
        onClose={() => setIsEditBracketsOpen(false)}
        settings={settings}
        payrolls={payrolls}
        onSave={handleSaveTaxBrackets}
      />

      {/* EDIT TAX EXEMPTION RULES MODAL */}
      <EditTaxExemptionModal
        isOpen={isEditExemptionOpen}
        onClose={() => setIsEditExemptionOpen(false)}
        settings={settings}
        onSave={handleSaveTaxExemptionRules}
      />
    </div>
  );
};
