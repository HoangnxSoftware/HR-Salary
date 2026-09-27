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
  Eye,
  Calendar,
  RotateCcw,
  Percent,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  PayrollRecord, 
  Employee, 
  SystemSettings, 
  TaxBracket, 
  TaxExemptionRules,
  TimekeepingRecord,
  InsuranceRecord,
  MealRegistration,
  SpecialAllowance,
  Dependent,
  TaxCalculationMethod
} from '../types';
import { 
  formatVND, 
  DEFAULT_TAX_BRACKETS, 
  DEFAULT_TAX_EXEMPTION_RULES,
  calculateTaxBreakdown,
  calculateCombinedAnnualTaxReport,
  CombinedAnnualTaxRecord
} from '../utils/payrollCalculator';
import { exportTaxReportToExcel, exportAnnualTaxReportToExcel } from '../utils/excelHelper';
import { useAuthRole } from '../context/AuthRoleContext';
import { PrintTaxReportModal } from '../components/PrintTaxReportModal';
import { PrintAnnualTaxModal } from '../components/PrintAnnualTaxModal';
import { EditTaxBracketsModal } from '../components/EditTaxBracketsModal';
import { EditTaxExemptionModal } from '../components/EditTaxExemptionModal';

interface TaxReportViewProps {
  payrolls: PayrollRecord[];
  employees: Employee[];
  settings: SystemSettings;
  timekeepings?: TimekeepingRecord[];
  insurances?: InsuranceRecord[];
  mealRegistrations?: MealRegistration[];
  specialAllowances?: SpecialAllowance[];
  dependents?: Dependent[];
  onUpdateSettings?: (settings: SystemSettings) => void;
}

export const TaxReportView: React.FC<TaxReportViewProps> = ({
  payrolls,
  employees,
  settings,
  timekeepings = [],
  insurances = [],
  mealRegistrations = [],
  specialAllowances = [],
  dependents = [],
  onUpdateSettings
}) => {
  const { canExportData, canEditSettings } = useAuthRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [taxFilter, setTaxFilter] = useState<'all' | 'tax_only' | 'no_tax'>('all');
  const [annualDifferenceFilter, setAnnualDifferenceFilter] = useState<'all' | 'overpaid' | 'underpaid' | 'matched'>('all');
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'summary' | 'annual_tax' | 'taxable_breakdown' | 'withholding_settings'>('summary');
  
  // Annual report target year
  const [annualTargetYear, setAnnualTargetYear] = useState<number>(settings.currentYear || 2026);

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintAnnualModalOpen, setIsPrintAnnualModalOpen] = useState(false);
  const [isEditBracketsOpen, setIsEditBracketsOpen] = useState(false);
  const [isEditExemptionOpen, setIsEditExemptionOpen] = useState(false);

  // Inline withholding config state for quick edit in tab 4
  const [withholdingFormRate, setWithholdingFormRate] = useState<number>(settings.taxWithholdingRateResident ?? 10);
  const [withholdingFormThreshold, setWithholdingFormThreshold] = useState<number>(settings.taxWithholdingThreshold ?? 5000000);
  const [withholdingFormNonResidentRate, setWithholdingFormNonResidentRate] = useState<number>(settings.taxWithholdingRateNonResident ?? 20);
  const [saveWithholdingSuccess, setSaveWithholdingSuccess] = useState(false);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const depMap = useMemo(() => new Map(settings.departments.map(d => [d.id, d.name])), [settings.departments]);

  // Current active tax brackets
  const activeBrackets: TaxBracket[] = useMemo(() => {
    return (settings.taxBrackets && settings.taxBrackets.length > 0)
      ? settings.taxBrackets
      : DEFAULT_TAX_BRACKETS;
  }, [settings.taxBrackets]);

  // Month key for current system month
  const currentMonthKey = `${settings.currentYear}-${String(settings.currentMonth).padStart(2, '0')}`;

  // Filtered payrolls for monthly summary
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
        const matchCccd = emp.idCardNumber ? emp.idCardNumber.includes(search) : false;
        return matchName || matchCode || matchTax || matchCccd;
      }

      return true;
    });
  }, [payrolls, empMap, selectedDepartment, taxFilter, searchTerm]);

  // Grand Totals for current month
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

  // ANNUAL TAX REPORT: Calculate combined annual tax records
  // "Trong Danh sách người lao động, mã số thuế TNCN chính là số Căn cước công dân; trường hợp danh sách người lao động có lao động trùng căn cước công dân (mã số thuế) nhưng khác mã NV (do thay đổi vị trí công việc, thay đổi cách tính lương, nghỉ việc rồi đi làm lại... được tạo mã NV mới và bị trùng số căn cước) thì trong bảng tính thuế TNCN cả năm sẽ được tính gộp thu nhập của những lao động trùng căn cước công dân nhưng khác mã NV để tính thuế TNCN"
  const annualTaxRecords: CombinedAnnualTaxRecord[] = useMemo(() => {
    return calculateCombinedAnnualTaxReport(
      employees,
      timekeepings,
      insurances,
      mealRegistrations,
      specialAllowances,
      dependents,
      settings,
      annualTargetYear
    );
  }, [employees, timekeepings, insurances, mealRegistrations, specialAllowances, dependents, settings, annualTargetYear]);

  // Filtered annual records
  const filteredAnnualRecords = useMemo(() => {
    return annualTaxRecords.filter(r => {
      // Department filter (check if employee is in department)
      if (selectedDepartment !== 'all') {
        const primaryEmp = employees.find(e => (e.idCardNumber || e.taxId) === r.idCardNumber);
        if (primaryEmp && primaryEmp.departmentId !== selectedDepartment) {
          return false;
        }
      }

      // Difference filter
      if (annualDifferenceFilter === 'overpaid' && r.taxDifference <= 0) return false;
      if (annualDifferenceFilter === 'underpaid' && r.taxDifference >= 0) return false;
      if (annualDifferenceFilter === 'matched' && r.taxDifference !== 0) return false;

      // Search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchName = r.fullName.toLowerCase().includes(search);
        const matchCccd = r.idCardNumber.includes(search);
        const matchCode = r.employeeCodes.some(c => c.toLowerCase().includes(search));
        return matchName || matchCccd || matchCode;
      }

      return true;
    });
  }, [annualTaxRecords, selectedDepartment, annualDifferenceFilter, searchTerm, employees]);

  // Annual grand totals
  const annualGrandTotals = useMemo(() => {
    const totalTaxWithheldYear = annualTaxRecords.reduce((s, r) => s + r.totalTaxWithheldYear, 0);
    const totalTaxableIncomeYear = annualTaxRecords.reduce((s, r) => s + r.totalTaxableIncomeYear, 0);
    const totalDeductionsYear = annualTaxRecords.reduce((s, r) => s + r.totalDeductionsYear, 0);
    const totalAssessableIncomeYear = annualTaxRecords.reduce((s, r) => s + r.totalAssessableIncomeYear, 0);
    const totalAnnualPayableTax = annualTaxRecords.reduce((s, r) => s + r.annualPayableTax, 0);
    const totalDifference = totalTaxWithheldYear - totalAnnualPayableTax;

    const overpaidCount = annualTaxRecords.filter(r => r.taxDifference > 0).length;
    const underpaidCount = annualTaxRecords.filter(r => r.taxDifference < 0).length;
    const matchedCount = annualTaxRecords.filter(r => r.taxDifference === 0).length;

    const totalOverpaidAmount = annualTaxRecords
      .filter(r => r.taxDifference > 0)
      .reduce((s, r) => s + r.taxDifference, 0);

    const totalUnderpaidAmount = annualTaxRecords
      .filter(r => r.taxDifference < 0)
      .reduce((s, r) => s + Math.abs(r.taxDifference), 0);

    const totalMultipleCodesCount = annualTaxRecords.filter(r => r.hasMultipleCodes).length;

    return {
      totalTaxWithheldYear,
      totalTaxableIncomeYear,
      totalDeductionsYear,
      totalAssessableIncomeYear,
      totalAnnualPayableTax,
      totalDifference,
      overpaidCount,
      underpaidCount,
      matchedCount,
      totalOverpaidAmount,
      totalUnderpaidAmount,
      totalMultipleCodesCount
    };
  }, [annualTaxRecords]);

  // Handle employee tax calculation method change
  // "Trong bảng tổng hợp kê khai thuế TNCN của từng tháng có thêm cột Phương Thức Tính Thuế TNCN, Phương thức tính thuế TNCN có thể là Theo Biểu Lũy Tiến Hoặc Khấu trừ % Thuế tại nguồn, để mặc định là Theo biểu lũy Tiến; khi có lao động thay đổi phương thức tính thuế thì lựa chọn lại, khi đó bảng tổng hợp kê khai thuế TNCN, bảng thanh toán lương của từng tháng cũng được tính toán lại"
  const handleTaxMethodChange = (employeeId: string, method: TaxCalculationMethod) => {
    if (!onUpdateSettings) return;
    const methodKey = `${currentMonthKey}_${employeeId}`;
    const updatedMap = {
      ...(settings.monthlyEmployeeTaxMethods || {}),
      [methodKey]: method
    };

    onUpdateSettings({
      ...settings,
      monthlyEmployeeTaxMethods: updatedMap
    });
  };

  // Save quick withholding settings
  const handleSaveWithholdingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSettings) return;
    onUpdateSettings({
      ...settings,
      taxWithholdingRateResident: withholdingFormRate,
      taxWithholdingThreshold: withholdingFormThreshold,
      taxWithholdingRateNonResident: withholdingFormNonResidentRate
    });
    setSaveWithholdingSuccess(true);
    setTimeout(() => setSaveWithholdingSuccess(false), 3000);
  };

  const handleExportMonthlyExcel = () => {
    exportTaxReportToExcel(payrolls, employees, settings, `${settings.currentMonth}_${settings.currentYear}`);
  };

  const handleExportAnnualExcel = () => {
    exportAnnualTaxReportToExcel(filteredAnnualRecords, annualTargetYear);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Báo Cáo Thuế Thu Nhập Cá Nhân (TNCN)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Kỳ tính tháng: Tháng {settings.currentMonth}/{settings.currentYear}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
              Quyết toán năm: {annualTargetYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp kê khai thuế TNCN từng tháng & Báo cáo quyết toán cả năm • Mã số thuế chính là số CCCD • Tự động tính gộp lao động trùng CCCD khác mã NV
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Monthly / Annual Excel */}
          {canExportData && (
            <>
              {activeTab === 'annual_tax' ? (
                <button
                  onClick={handleExportAnnualExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Xuất bảng tổng hợp quyết toán thuế TNCN cả năm ra Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Xuất Excel Quyết Toán Năm {annualTargetYear}</span>
                </button>
              ) : (
                <button
                  onClick={handleExportMonthlyExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  title="Xuất bảng tổng hợp kê khai thuế tháng ra Excel"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Xuất Excel Thuế Tháng</span>
                </button>
              )}
            </>
          )}

          {/* Print Buttons */}
          {activeTab === 'annual_tax' ? (
            <button
              onClick={() => setIsPrintAnnualModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-200" />
              <span>In Báo Cáo Quyết Toán Năm</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>In Bảng Tổng Hợp Kê Khai</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Dynamic based on Active Tab */}
      {activeTab === 'annual_tax' ? (
        /* Annual Tax KPI Summary */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
              1. Tổng Thu Nhập Chịu Thuế Năm
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-1.5">
              {formatVND(annualGrandTotals.totalTaxableIncomeYear)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gộp <strong>{annualTaxRecords.length} người nộp thuế</strong> (theo CCCD/MST)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
            <span className="text-indigo-800 font-bold uppercase tracking-wider block text-[10px]">
              2. Tổng Thuế Bị Khấu Trừ Cả Năm
            </span>
            <div className="text-xl font-black font-mono text-indigo-700 mt-1.5">
              {formatVND(annualGrandTotals.totalTaxWithheldYear)}
            </div>
            <div className="text-[11px] text-indigo-600 mt-1">
              Tổng số thuế đã tạm trừ 12 tháng
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-amber-800 font-bold uppercase tracking-wider block text-[10px]">
              3. Thuế Tính Theo Cả Năm (Quyết Toán)
            </span>
            <div className="text-xl font-black font-mono text-amber-700 mt-1.5">
              {formatVND(annualGrandTotals.totalAnnualPayableTax)}
            </div>
            <div className="text-[11px] text-amber-600 mt-1">
              Theo biểu lũy tiến quy năm (5 bậc)
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <span className="text-emerald-800 font-bold uppercase tracking-wider block text-[10px]">
              4. Thuế Nộp Thừa (Hoàn Thuế)
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-1.5">
              +{formatVND(annualGrandTotals.totalOverpaidAmount)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Có <strong>{annualGrandTotals.overpaidCount} cá nhân</strong> được hoàn/bù trừ
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
            <span className="text-rose-800 font-bold uppercase tracking-wider block text-[10px]">
              5. Thuế Nộp Thiếu (Cần Nộp Thêm)
            </span>
            <div className="text-xl font-black font-mono text-rose-700 mt-1.5">
              -{formatVND(annualGrandTotals.totalUnderpaidAmount)}
            </div>
            <div className="text-[11px] text-rose-600 mt-1">
              Có <strong>{annualGrandTotals.underpaidCount} cá nhân</strong> phải nộp thêm
            </div>
          </div>
        </div>
      ) : (
        /* Monthly Tax KPI Summary */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 font-semibold uppercase tracking-wider block">1. Các Khoản Chịu Thuế</span>
              <span className="p-1.5 bg-amber-50 rounded-lg text-amber-700 border border-amber-200 font-bold">
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
              <span>• Ăn ca định mức (1.2tr): <strong className="font-mono text-emerald-700">{formatVND(totalMealExempt)}</strong></span>
              <span>• Phụ cấp miễn thuế: <strong className="font-mono text-emerald-700">{formatVND(totalExemptAllowances)}</strong></span>
            </div>
          </div>

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
              <span>• Bản thân (15.5tr) & NPT ({totalDependentCount} người): <strong className="font-mono text-blue-700">{formatVND(totalPersonalDeduction + totalDependentDeduction)}</strong></span>
              <span>• BHXH NLĐ 10.5%: <strong className="font-mono text-blue-700">{formatVND(totalInsuranceDeduction)}</strong></span>
              <span className="text-amber-800 font-semibold pt-1 border-t border-slate-100">
                Thu nhập tính thuế: <strong className="font-mono font-bold">{formatVND(totalAssessable)}</strong>
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white p-4 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-red-100 font-bold uppercase tracking-wider block text-[10px]">4. TỔNG THUẾ TNCN THÁNG</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                  Tháng {settings.currentMonth}
                </span>
              </div>
              <div className="text-2xl font-black font-mono mt-2 tracking-tight">
                {formatVND(totalTax)}
              </div>
            </div>
            <div className="text-[11px] text-red-100 mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
              <span>Có {totalTaxPayers}/{payrolls.length} người có thuế</span>
              <span className="font-semibold underline cursor-pointer" onClick={() => setTaxFilter('tax_only')}>
                Lọc người nộp thuế →
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x shrink-0 ${
            activeTab === 'summary'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          <span>Bảng Tổng Hợp Kê Khai Thuế TNCN (Tháng {settings.currentMonth})</span>
        </button>

        <button
          onClick={() => setActiveTab('annual_tax')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x shrink-0 ${
            activeTab === 'annual_tax'
              ? 'bg-white text-amber-900 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Báo Cáo Thuế TNCN Cả Năm (Quyết Toán Năm {annualTargetYear})</span>
          {annualGrandTotals.totalMultipleCodesCount > 0 && (
            <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[10px] rounded-full font-bold">
              Gộp {annualGrandTotals.totalMultipleCodesCount} trùng CCCD
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('taxable_breakdown')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x shrink-0 ${
            activeTab === 'taxable_breakdown'
              ? 'bg-white text-emerald-800 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bóc Tách Thu Nhập Chịu Thuế vs Miễn Thuế</span>
        </button>

        <button
          onClick={() => setActiveTab('withholding_settings')}
          className={`px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x shrink-0 ${
            activeTab === 'withholding_settings'
              ? 'bg-white text-indigo-700 border-slate-200 border-b-transparent shadow-xs -mb-[1px]'
              : 'bg-slate-100 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Percent className="w-4 h-4 text-indigo-600" />
          <span>Cấu Hình Biểu Lũy Tiến & Khấu Trừ % Tại Nguồn</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Họ tên, Mã NV, CCCD/MST..."
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

          {/* Tab-specific Filters */}
          {activeTab === 'summary' ? (
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
                Chưa nộp ({payrolls.length - totalTaxPayers})
              </button>
            </div>
          ) : activeTab === 'annual_tax' ? (
            <div className="flex items-center gap-2">
              {/* Year Selector */}
              <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-600 text-[11px]">Năm quyết toán:</span>
                <select
                  value={annualTargetYear}
                  onChange={e => setAnnualTargetYear(Number(e.target.value))}
                  className="bg-transparent font-bold text-indigo-700 focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Difference Status Filter */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setAnnualDifferenceFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    annualDifferenceFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({annualTaxRecords.length})
                </button>
                <button
                  onClick={() => setAnnualDifferenceFilter('overpaid')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-emerald-800 ${
                    annualDifferenceFilter === 'overpaid' ? 'bg-emerald-50 text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thừa ({annualGrandTotals.overpaidCount})
                </button>
                <button
                  onClick={() => setAnnualDifferenceFilter('underpaid')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-rose-800 ${
                    annualDifferenceFilter === 'underpaid' ? 'bg-rose-50 text-rose-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thiếu ({annualGrandTotals.underpaidCount})
                </button>
                <button
                  onClick={() => setAnnualDifferenceFilter('matched')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    annualDifferenceFilter === 'matched' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Khớp ({annualGrandTotals.matchedCount})
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUMMARY MONTHLY TAX DECLARATION TABLE (WITH NEW METHOD COLUMN)     */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">STT</th>
                  <th className="px-3 py-3 w-24">Mã NV</th>
                  <th className="px-3 py-3 min-w-[140px]">Họ và Tên</th>
                  <th className="px-3 py-3 min-w-[120px]">Phòng Ban</th>
                  <th className="px-3 py-3 font-mono min-w-[110px]">
                    <div>Mã Số Thuế (CCCD)</div>
                  </th>
                  
                  {/* CỘT MỚI: PHƯƠNG THỨC TÍNH THUẾ TNCN */}
                  <th className="px-3 py-3 bg-indigo-50/80 text-indigo-950 font-black min-w-[200px] border-x border-indigo-200">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Phương Thức Tính Thuế TNCN</span>
                    </div>
                    <div className="text-[10px] font-normal text-indigo-700 normal-case">
                      Biểu lũy tiến hoặc Khấu trừ % tại nguồn
                    </div>
                  </th>

                  {/* Thu nhập chịu thuế */}
                  <th className="px-3 py-3 text-right bg-amber-50/60 text-amber-950 font-bold min-w-[110px]">
                    TN Chịu Thuế [1]
                  </th>

                  {/* Thu nhập miễn thuế */}
                  <th className="px-3 py-3 text-right bg-emerald-50/60 text-emerald-900 font-bold min-w-[110px]">
                    TN Miễn Thuế [2]
                  </th>

                  {/* Tổng thu nhập (Gross) */}
                  <th className="px-3 py-3 text-right font-bold min-w-[110px]">
                    Tổng TN [3]
                  </th>

                  {/* Giảm trừ */}
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">Bản Thân</th>
                  <th className="px-3 py-3 text-center text-slate-600 w-12">NPT</th>
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">Giảm NPT</th>
                  <th className="px-3 py-3 text-right text-slate-600 min-w-[95px]">BHXH 10.5%</th>
                  
                  {/* Tính thuế */}
                  <th className="px-3 py-3 text-right font-bold text-amber-900 bg-amber-50/30 min-w-[110px]">
                    TN Tính Thuế [4]
                  </th>
                  <th className="px-3 py-3 text-center w-14">Bậc/%</th>
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
                  const methodKey = `${currentMonthKey}_${p.employeeId}`;
                  const currentMethod: TaxCalculationMethod = settings.monthlyEmployeeTaxMethods?.[methodKey] || p.taxCalculationMethod || 'progressive';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{emp?.employeeCode}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">{emp?.fullName}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{depMap.get(emp?.departmentId || '')}</td>
                      <td className="px-3 py-3 font-mono text-slate-800 font-semibold">{emp?.idCardNumber || emp?.taxId || '-'}</td>

                      {/* LỰA CHỌN PHƯƠNG THỨC TÍNH THUẾ TNCN CỦA LAO ĐỘNG */}
                      <td className="px-3 py-3 bg-indigo-50/30 border-x border-indigo-100">
                        {canEditSettings ? (
                          <select
                            value={currentMethod}
                            onChange={e => handleTaxMethodChange(p.employeeId, e.target.value as TaxCalculationMethod)}
                            className="w-full px-2 py-1.5 border border-indigo-300 rounded-lg text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            title="Thay đổi phương thức tính thuế: Bảng kê khai thuế và Bảng lương tháng sẽ tự động tính lại ngay lập tức"
                          >
                            <option value="progressive">Theo Biểu Lũy Tiến (Mặc định)</option>
                            <option value="withholding_resident">Khấu trừ 10% tại nguồn (HĐ &lt; 3T / Vãng lai &gt;= 5tr)</option>
                            <option value="withholding_request">Khấu trừ 10% tại nguồn theo yêu cầu (&lt; 5tr)</option>
                            <option value="withholding_non_resident">Khấu trừ 20% tại nguồn (Cá nhân không cư trú)</option>
                          </select>
                        ) : (
                          <span className="font-bold text-slate-800">
                            {currentMethod === 'progressive' ? 'Theo Biểu Lũy Tiến' :
                             currentMethod === 'withholding_non_resident' ? 'Khấu trừ 20% (Không cư trú)' :
                             currentMethod === 'withholding_request' ? 'Khấu trừ 10% (Theo yêu cầu)' : 'Khấu trừ 10% tại nguồn'}
                          </span>
                        )}
                      </td>

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
                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {currentMethod === 'progressive' ? formatVND(p.personalDeduction) : '-'}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        {currentMethod === 'progressive' ? (p.dependentCount || '-') : '-'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {currentMethod === 'progressive' && p.dependentDeduction > 0 ? formatVND(p.dependentDeduction) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {formatVND(p.totalInsuranceEmp)}
                      </td>

                      {/* Thu nhập tính thuế */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-amber-900 bg-amber-50/30">
                        {formatVND(p.assessableIncome)}
                      </td>

                      {/* Bậc thuế hoặc % khấu trừ */}
                      <td className="px-3 py-3 text-center font-mono">
                        {currentMethod === 'progressive' ? (
                          breakdown.highestBracket > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              B{breakdown.highestBracket}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )
                        ) : currentMethod === 'withholding_non_resident' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            20%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            10%
                          </span>
                        )}
                      </td>

                      {/* Thuế TNCN */}
                      <td className="px-3 py-3 text-right font-mono font-black text-red-600 bg-red-50/60">
                        {p.personalIncomeTax > 0 ? formatVND(p.personalIncomeTax) : '0 đ'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <td colSpan={5} className="px-3 py-3 text-center uppercase text-slate-800">
                    TỔNG CỘNG ({filteredPayrolls.length} người):
                  </td>
                  <td className="px-3 py-3 text-center text-indigo-800 font-mono text-[11px] bg-indigo-50/40 border-x border-indigo-200">
                    {totalTaxPayers} người có phát sinh thuế
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-amber-950 bg-amber-100/50">
                    {formatVND(totalTaxable)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/50">
                    {formatVND(totalTaxExempt)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-slate-900">
                    {formatVND(totalGross)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">
                    {formatVND(totalPersonalDeduction)}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-700 font-mono">
                    {totalDependentCount}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">
                    {formatVND(totalDependentDeduction)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">
                    {formatVND(totalInsuranceDeduction)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-black text-amber-900 bg-amber-100/50">
                    {formatVND(totalAssessable)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-slate-500">-</td>
                  <td className="px-3 py-3 text-right font-mono font-black text-red-700 bg-red-100/70 text-sm">
                    {formatVND(totalTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANNUAL PIT TAX REPORT (BÁO CÁO QUYẾT TOÁN THUẾ TNCN CẢ NĂM)        */}
      {/* ========================================================================= */}
      {activeTab === 'annual_tax' && (
        <div className="space-y-4">
          {/* Information Notice on Duplicate CCCD Combination */}
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3 text-xs leading-relaxed shadow-2xs">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-amber-900">
                Quy Tắc Quyết Toán Thuế TNCN Năm {annualTargetYear}:
              </h4>
              <p className="mt-0.5 text-amber-900">
                • <strong>Mã số thuế TNCN chính là số Căn cước công dân (CCCD).</strong> Trường hợp danh sách người lao động có lao động trùng CCCD (mã số thuế) nhưng khác mã NV (do thay đổi vị trí công việc, thay đổi cách tính lương, nghỉ việc rồi đi làm lại... được tạo mã NV mới), hệ thống <strong>tự động tính gộp toàn bộ thu nhập, các khoản giảm trừ và thuế đã khấu trừ của những lao động trùng CCCD</strong> để tính quyết toán thuế TNCN cả năm.
              </p>
              <p className="mt-0.5 text-amber-900">
                • <strong>Chênh lệch quyết toán [6 = 1 - 5]:</strong> Nếu số thuế tạm khấu trừ [1] lớn hơn thuế tính theo cả năm [5] là <strong>Nộp thừa (Hoàn thuế)</strong>; nếu nhỏ hơn là <strong>Nộp thiếu (Phải nộp thêm vào NSNN)</strong>.
              </p>
            </div>
          </div>

          {/* Annual Tax Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-3 w-10 text-center">STT</th>
                    <th className="px-3 py-3 min-w-[125px]">
                      <div>Số CCCD (MST)</div>
                      <div className="text-[10px] text-emerald-700 font-semibold normal-case">Mã định danh thuế</div>
                    </th>
                    <th className="px-3 py-3 min-w-[140px]">Họ và Tên</th>
                    <th className="px-3 py-3 min-w-[110px]">
                      <div>Mã Nhân Viên</div>
                      <div className="text-[10px] text-slate-500 normal-case">Gộp nếu trùng CCCD</div>
                    </th>

                    {/* Chi tiết số thuế TNCN bị khấu trừ 12 tháng */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <th key={m} className="px-1.5 py-3 text-right min-w-[65px] font-mono text-slate-700 bg-slate-50/80 border-x border-slate-200">
                        T{m}
                      </th>
                    ))}

                    {/* Tổng số thuế TNCN bị khấu trừ cả năm */}
                    <th className="px-3 py-3 text-right bg-indigo-50 font-black text-indigo-950 min-w-[110px] border-l border-indigo-200">
                      <div>Tổng Đã Trừ [1]</div>
                      <div className="text-[9px] text-indigo-700 normal-case font-medium">Tổng 12 tháng</div>
                    </th>

                    {/* Tổng thu nhập chịu thuế cả năm */}
                    <th className="px-3 py-3 text-right bg-amber-50 font-bold text-amber-950 min-w-[115px]">
                      <div>TN Chịu Thuế Năm [2]</div>
                      <div className="text-[9px] text-amber-800 normal-case font-medium">Gộp cả năm</div>
                    </th>

                    {/* Tổng giảm trừ cả năm */}
                    <th className="px-3 py-3 text-right text-slate-700 min-w-[105px]">
                      <div>Tổng Giảm Trừ [3]</div>
                      <div className="text-[9px] text-slate-500 normal-case">Bản thân+NPT+BH</div>
                    </th>

                    {/* Thu nhập tính thuế cả năm */}
                    <th className="px-3 py-3 text-right bg-blue-50 font-bold text-blue-900 min-w-[115px]">
                      <div>TNTT Năm [4]</div>
                      <div className="text-[9px] text-blue-700 normal-case font-medium">[4] = [2] - [3]</div>
                    </th>

                    {/* Thuế TNCN tính theo cả năm */}
                    <th className="px-3 py-3 text-right bg-red-50 font-black text-red-900 min-w-[115px]">
                      <div>Thuế Cả Năm [5]</div>
                      <div className="text-[9px] text-red-700 normal-case font-medium">Quyết toán năm</div>
                    </th>

                    {/* Chênh lệch giữa khấu trừ và thuế năm */}
                    <th className="px-3 py-3 text-right font-black text-slate-900 min-w-[125px] border-l border-slate-300">
                      <div>Chênh Lệch [6 = 1 - 5]</div>
                      <div className="text-[9px] text-slate-600 normal-case font-medium">Nộp thừa / Nộp thiếu</div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredAnnualRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-2.5 py-3 text-slate-400 font-mono text-center font-sans">{idx + 1}</td>
                      
                      {/* CCCD / MST */}
                      <td className="px-3 py-3 font-bold text-slate-900">
                        {r.idCardNumber}
                      </td>

                      {/* Họ tên */}
                      <td className="px-3 py-3 font-bold text-slate-800 font-sans whitespace-nowrap">
                        {r.fullName}
                      </td>

                      {/* Mã NV (nếu trùng CCCD hiển thị các mã NV gộp) */}
                      <td className="px-3 py-3 font-sans">
                        <div className="font-bold text-slate-900">{r.employeeCodes.join(', ')}</div>
                        {r.hasMultipleCodes && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 font-extrabold text-[9px] mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Gộp {r.employeeCodes.length} mã NV
                          </span>
                        )}
                      </td>

                      {/* 12 Cột tháng */}
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const taxVal = r.monthlyTaxWithheld[m] || 0;
                        return (
                          <td 
                            key={m} 
                            className={`px-1.5 py-3 text-right border-x border-slate-100 ${
                              taxVal > 0 ? 'text-red-700 font-bold' : 'text-slate-300'
                            }`}
                          >
                            {taxVal > 0 ? taxVal.toLocaleString('vi-VN') : '-'}
                          </td>
                        );
                      })}

                      {/* Tổng thuế TNCN bị khấu trừ cả năm [1] */}
                      <td className="px-3 py-3 text-right font-black text-indigo-700 bg-indigo-50/40 border-l border-indigo-100">
                        {r.totalTaxWithheldYear > 0 ? r.totalTaxWithheldYear.toLocaleString('vi-VN') : '0'}
                      </td>

                      {/* Tổng thu nhập chịu thuế cả năm [2] */}
                      <td className="px-3 py-3 text-right font-bold text-amber-950 bg-amber-50/30">
                        {r.totalTaxableIncomeYear.toLocaleString('vi-VN')}
                      </td>

                      {/* Tổng giảm trừ cả năm [3] */}
                      <td className="px-3 py-3 text-right text-slate-600">
                        {r.totalDeductionsYear.toLocaleString('vi-VN')}
                      </td>

                      {/* Thu nhập tính thuế cả năm [4] */}
                      <td className="px-3 py-3 text-right font-bold text-blue-900 bg-blue-50/30">
                        {r.totalAssessableIncomeYear.toLocaleString('vi-VN')}
                      </td>

                      {/* Thuế TNCN tính theo cả năm [5] */}
                      <td className="px-3 py-3 text-right font-black text-red-700 bg-red-50/40">
                        {r.annualPayableTax > 0 ? r.annualPayableTax.toLocaleString('vi-VN') : '0'}
                      </td>

                      {/* Chênh lệch quyết toán [6 = 1 - 5] */}
                      <td className="px-3 py-3 text-right border-l border-slate-200">
                        {r.taxDifference > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full font-black text-emerald-800 bg-emerald-100 border border-emerald-300">
                            +{r.taxDifference.toLocaleString('vi-VN')} (Thừa)
                          </span>
                        ) : r.taxDifference < 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full font-black text-rose-800 bg-rose-100 border border-rose-300">
                            {r.taxDifference.toLocaleString('vi-VN')} (Thiếu)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">0 (Khớp)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs font-mono">
                    <td colSpan={4} className="px-3 py-3 text-center uppercase text-slate-800 font-sans">
                      TỔNG CỘNG TOÀN NĂM ({filteredAnnualRecords.length} NGƯỜI):
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                      const mSum = filteredAnnualRecords.reduce((s, r) => s + (r.monthlyTaxWithheld[m] || 0), 0);
                      return (
                        <td key={m} className="px-1.5 py-3 text-right font-bold text-slate-800 border-x border-slate-200">
                          {mSum > 0 ? mSum.toLocaleString('vi-VN') : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right font-black text-indigo-900 bg-indigo-100/60 border-l border-indigo-200">
                      {annualGrandTotals.totalTaxWithheldYear.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-amber-950 bg-amber-100/60">
                      {annualGrandTotals.totalTaxableIncomeYear.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700">
                      {annualGrandTotals.totalDeductionsYear.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-blue-900 bg-blue-100/60">
                      {annualGrandTotals.totalAssessableIncomeYear.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-red-900 bg-red-100/60">
                      {annualGrandTotals.totalAnnualPayableTax.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3 text-right font-black border-l border-slate-300">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${annualGrandTotals.totalDifference > 0 ? 'bg-emerald-100 text-emerald-900' : annualGrandTotals.totalDifference < 0 ? 'bg-rose-100 text-rose-900' : 'text-slate-700'}`}>
                        {annualGrandTotals.totalDifference > 0 ? `+${annualGrandTotals.totalDifference.toLocaleString('vi-VN')} đ` : `${annualGrandTotals.totalDifference.toLocaleString('vi-VN')} đ`}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BREAKDOWN TAXABLE VS NON-TAXABLE INCOME                            */}
      {/* ========================================================================= */}
      {activeTab === 'taxable_breakdown' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Chi Tiết Bóc Tách Thu Nhập Chịu Thuế vs Thu Nhập Miễn Thuế</h3>
                <p className="text-xs text-slate-500">Phân định từng thành phần theo quy định của Luật Thuế TNCN và Bộ luật Lao động</p>
              </div>
            </div>
            {canEditSettings && (
              <button
                onClick={() => setIsEditExemptionOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Chỉnh Sửa Quy Tắc Miễn Thuế</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-3 w-12 text-center">STT</th>
                  <th className="px-3 py-3 w-24">Mã NV</th>
                  <th className="px-3 py-3 min-w-[150px]">Họ và Tên</th>
                  <th className="px-3 py-3 text-right bg-amber-50/60 font-bold min-w-[110px]">Lương Thời Gian</th>
                  <th className="px-3 py-3 text-right bg-amber-50/60 font-bold min-w-[110px]">OT Tính Thuế (100%)</th>
                  <th className="px-3 py-3 text-right bg-amber-50/60 font-bold min-w-[110px]">Phụ Cấp Chịu Thuế</th>
                  <th className="px-3 py-3 text-right bg-amber-100/70 font-black text-amber-950 min-w-[120px]">TỔNG CHỊU THUẾ</th>
                  
                  <th className="px-3 py-3 text-right bg-emerald-50/60 text-emerald-900 font-bold min-w-[110px]">OT Vượt Mức Miễn</th>
                  <th className="px-3 py-3 text-right bg-emerald-50/60 text-emerald-900 font-bold min-w-[110px]">Ăn Ca Miễn Thuế</th>
                  <th className="px-3 py-3 text-right bg-emerald-50/60 text-emerald-900 font-bold min-w-[110px]">Phụ Cấp Miễn Thuế</th>
                  <th className="px-3 py-3 text-right bg-emerald-100/70 font-black text-emerald-950 min-w-[120px]">TỔNG MIỄN THUẾ</th>
                  
                  <th className="px-3 py-3 text-right font-black text-slate-900 min-w-[120px]">TỔNG THU NHẬP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPayrolls.map((p, idx) => {
                  const emp = empMap.get(p.employeeId);
                  const totalExempt = p.otPayTaxExempt + (p.mealAllowance || 0) + p.taxExemptAllowances;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{emp?.employeeCode}</td>
                      <td className="px-3 py-3 font-sans font-bold text-slate-800">{emp?.fullName}</td>
                      
                      <td className="px-3 py-3 text-right bg-amber-50/20">{formatVND(p.mainSalary)}</td>
                      <td className="px-3 py-3 text-right bg-amber-50/20">{formatVND(p.otPayTaxable)}</td>
                      <td className="px-3 py-3 text-right bg-amber-50/20">{formatVND(p.taxableAllowances)}</td>
                      <td className="px-3 py-3 text-right font-black text-amber-950 bg-amber-50/50">{formatVND(p.taxableIncome)}</td>

                      <td className="px-3 py-3 text-right text-emerald-800 bg-emerald-50/20">{formatVND(p.otPayTaxExempt)}</td>
                      <td className="px-3 py-3 text-right text-emerald-800 bg-emerald-50/20">{formatVND(p.mealAllowance || 0)}</td>
                      <td className="px-3 py-3 text-right text-emerald-800 bg-emerald-50/20">{formatVND(p.taxExemptAllowances)}</td>
                      <td className="px-3 py-3 text-right font-black text-emerald-900 bg-emerald-50/50">{formatVND(totalExempt)}</td>

                      <td className="px-3 py-3 text-right font-black text-slate-900">{formatVND(p.grossIncome)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WITHHOLDING TAX CONFIGURATION & PROGRESSIVE BRACKETS (5 BRACKETS)   */}
      {/* ========================================================================= */}
      {activeTab === 'withholding_settings' && (
        <div className="space-y-6">
          {/* Card 1: Cấu hình Phương thức khấu trừ % thuế tại nguồn */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cấu Hình Phương Thức Khấu Trừ % Thuế Tại Nguồn (Luật Thuế TNCN Hiện Hành)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng cho người lao động thời vụ, vãng lai, hợp đồng dưới 3 tháng hoặc cá nhân không cư trú
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-bold text-xs border border-amber-300">
                Tỷ lệ mặc định: {settings.taxWithholdingRateResident ?? 10}%
              </span>
            </div>

            <form onSubmit={handleSaveWithholdingSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                {/* 1. Tỷ lệ % khấu trừ tại nguồn */}
                <div className="space-y-1.5 p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                  <label className="block font-bold text-slate-900">
                    1. Tỷ Lệ Khấu Trừ Tại Nguồn Cư Trú (%) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!canEditSettings}
                      value={withholdingFormRate}
                      onChange={e => setWithholdingFormRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-base"
                    />
                    <span className="text-sm font-bold text-slate-700">%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Mặc định là <strong>10%</strong>. Khấu trừ trực tiếp trước khi chi trả thu nhập cho cá nhân cư trú không ký HĐLĐ hoặc ký dưới 03 tháng.
                  </p>
                </div>

                {/* 2. Mức chi trả từ 5 triệu trở lên */}
                <div className="space-y-1.5 p-4 rounded-xl border border-amber-200 bg-amber-50/30">
                  <label className="block font-bold text-slate-900">
                    2. Ngưỡng Chi Trả Áp Dụng Khấu Trừ (VNĐ/lần) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500000}
                    disabled={!canEditSettings}
                    value={withholdingFormThreshold}
                    onChange={e => setWithholdingFormThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-base"
                  />
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Quy định: Mức chi trả từ <strong>5.000.000 đồng/lần trở lên</strong> thì khấu trừ 10%. Dưới 5.000.000 đồng/lần chỉ khấu trừ khi cá nhân có yêu cầu.
                  </p>
                </div>

                {/* 3. Cá nhân không cư trú: 20% */}
                <div className="space-y-1.5 p-4 rounded-xl border border-rose-200 bg-rose-50/30">
                  <label className="block font-bold text-slate-900">
                    3. Thuế Suất Cá Nhân Không Cư Trú (%) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!canEditSettings}
                      value={withholdingFormNonResidentRate}
                      onChange={e => setWithholdingFormNonResidentRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-rose-900 bg-white focus:ring-2 focus:ring-rose-500 outline-none text-base"
                    />
                    <span className="text-sm font-bold text-slate-700">%</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Quy định: Áp dụng mức thuế suất cố định <strong>20%</strong> trên thu nhập từ tiền lương, tiền công đối với cá nhân không cư trú.
                  </p>
                </div>
              </div>

              {/* Callout box: Legal Explanation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Quy Định Pháp Luật Hiện Hành Về Khấu Trừ Thuế TNCN Tại Nguồn:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                  <li>
                    <strong>Không ký hợp đồng lao động hoặc ký dưới 03 tháng:</strong> Mức chi trả từ <strong>5.000.000 đồng/lần trở lên</strong>: Khấu trừ theo tỷ lệ 10% trước khi trả thu nhập. Dưới 5.000.000 đồng/lần: Chỉ khấu trừ 10% khi cá nhân có yêu cầu.
                  </li>
                  <li>
                    <strong>Cá nhân không cư trú:</strong> Áp dụng mức thuế suất cố định <strong>20%</strong> trên thu nhập từ tiền lương, tiền công.
                  </li>
                  <li>
                    <strong>Đồng bộ tức thì:</strong> Trong <em>Bảng tổng hợp kê khai thuế TNCN của từng tháng</em>, người dùng có thể lựa chọn chuyển đổi Phương Thức Tính Thuế TNCN cho từng người lao động (Theo Biểu lũy tiến hoặc Khấu trừ % tại nguồn). Bảng lương và kê khai thuế sẽ tự động tính toán lại ngay lập tức.
                  </li>
                </ul>
              </div>

              {canEditSettings && (
                <div className="flex justify-end gap-3 pt-2">
                  {saveWithholdingSuccess && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đã lưu cấu hình khấu trừ tại nguồn!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu Cấu Hình Khấu Trừ % Tại Nguồn
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Card 2: Biểu thuế lũy tiến từng phần 5 bậc */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Biểu Thuế Lũy Tiến Từng Phần ({activeBrackets.length} Bậc)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng cho cá nhân cư trú ký hợp đồng lao động từ 03 tháng trở lên
                  </p>
                </div>
              </div>
              {canEditSettings && (
                <button
                  onClick={() => setIsEditBracketsOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Chỉnh Sửa Biểu Thuế 5 Bậc</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {activeBrackets.map(b => (
                <div key={b.bracket} className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 text-center space-y-1">
                  <div className="font-extrabold text-indigo-950 text-sm">{b.name}</div>
                  <div className="text-2xl font-black text-indigo-700 font-mono">
                    {b.rate > 1 ? b.rate : Math.round(b.rate * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    {b.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Modal In Bảng Kê Khai Thuế Tháng */}
      <PrintTaxReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        employees={employees}
        payrolls={payrolls}
        settings={settings}
        month={`${settings.currentMonth}/${settings.currentYear}`}
      />

      {/* Modal In Báo Cáo Quyết Toán Thuế TNCN Cả Năm */}
      <PrintAnnualTaxModal
        isOpen={isPrintAnnualModalOpen}
        onClose={() => setIsPrintAnnualModalOpen(false)}
        annualRecords={filteredAnnualRecords}
        settings={settings}
        year={annualTargetYear}
      />

      {/* Modal Sửa Biểu Thuế Lũy Tiến */}
      <EditTaxBracketsModal
        isOpen={isEditBracketsOpen}
        onClose={() => setIsEditBracketsOpen(false)}
        settings={settings}
        payrolls={payrolls}
        onSave={(updated) => {
          if (onUpdateSettings) {
            onUpdateSettings({ ...settings, taxBrackets: updated });
          }
        }}
      />

      {/* Modal Sửa Thiết Lập Miễn Thuế */}
      <EditTaxExemptionModal
        isOpen={isEditExemptionOpen}
        onClose={() => setIsEditExemptionOpen(false)}
        settings={settings}
        onSave={(updated) => {
          if (onUpdateSettings) {
            onUpdateSettings({ ...settings, taxExemptionRules: updated });
          }
        }}
      />
    </div>
  );
};
