import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Edit2, 
  Check, 
  X, 
  SlidersHorizontal, 
  Info, 
  CheckCircle2,
  Sparkles,
  Save,
  Calendar,
  History,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { InsuranceRecord, Employee, SystemSettings, InsuranceSalaryHistory } from '../types';
import { formatVND } from '../utils/payrollCalculator';
import * as XLSX from 'xlsx';
import { useAuthRole } from '../context/AuthRoleContext';

interface InsuranceViewProps {
  insurances: InsuranceRecord[];
  employees: Employee[];
  settings: SystemSettings;
  onUpdateInsurance: (updated: InsuranceRecord) => void;
  onUpdateSettings?: (newSettings: SystemSettings) => void;
}

export const InsuranceView: React.FC<InsuranceViewProps> = ({
  insurances,
  employees,
  settings,
  onUpdateInsurance,
  onUpdateSettings
}) => {
  const { canEditEmployees, canExportData, canEditSettings } = useAuthRole();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ 
    isParticipating: boolean; 
    insuranceSalary: number; 
    startDate: string;
    customSocialRate?: number;
    customHealthRate?: number;
    customUnempRate?: number;
    useCustomRates: boolean;
    note: string 
  }>({
    isParticipating: true,
    insuranceSalary: 0,
    startDate: '',
    useCustomRates: false,
    note: ''
  });

  // Modal quản lý quá trình mức đóng BHXH từng thời gian cụ thể
  const [historyTarget, setHistoryTarget] = useState<{
    employee: Employee;
    insurance: InsuranceRecord;
  } | null>(null);

  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyForm, setHistoryForm] = useState<{
    editingId: string | null;
    fromMonth: string;
    toMonth: string;
    isOngoing: boolean;
    salary: number;
    note: string;
  }>({
    editingId: null,
    fromMonth: new Date().toISOString().slice(0, 7),
    toMonth: '',
    isOngoing: true,
    salary: 10000000,
    note: ''
  });
  const [historySuccessMsg, setHistorySuccessMsg] = useState<string | null>(null);

  // Modal chỉnh sửa tỷ lệ đóng toàn công ty
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState({
    socialInsRateEmployee: settings.socialInsRateEmployee,
    healthInsRateEmployee: settings.healthInsRateEmployee,
    unemploymentInsRateEmployee: settings.unemploymentInsRateEmployee,
    socialInsRateEmployer: settings.socialInsRateEmployer,
    healthInsRateEmployer: settings.healthInsRateEmployer,
    unemploymentInsRateEmployer: settings.unemploymentInsRateEmployer,
    tradeUnionRateEmployer: settings.tradeUnionRateEmployer,
  });

  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  // Tỷ lệ chuẩn toàn hệ thống
  const empTotalRate = Number(((settings.socialInsRateEmployee || 0) + (settings.healthInsRateEmployee || 0) + (settings.unemploymentInsRateEmployee || 0)).toFixed(2));
  const erTotalRate = Number(((settings.socialInsRateEmployer || 0) + (settings.healthInsRateEmployer || 0) + (settings.unemploymentInsRateEmployer || 0) + (settings.tradeUnionRateEmployer || 0)).toFixed(2));
  const overallTotalRate = Number((empTotalRate + erTotalRate).toFixed(2));

  // Tính tổng
  let totalFundEmployee = 0;
  let totalFundEmployer = 0;
  let totalInsuranceSalarySum = 0;
  let participatingCount = 0;

  insurances.forEach(ins => {
    if (ins.isParticipating) {
      participatingCount++;
      totalInsuranceSalarySum += ins.insuranceSalary;
      const thisEmpRate = ((ins.customSocialRate ?? settings.socialInsRateEmployee) + 
                           (ins.customHealthRate ?? settings.healthInsRateEmployee) + 
                           (ins.customUnempRate ?? settings.unemploymentInsRateEmployee)) / 100;
      const thisErRate = erTotalRate / 100;
      totalFundEmployee += Math.round(ins.insuranceSalary * thisEmpRate);
      totalFundEmployer += Math.round(ins.insuranceSalary * thisErRate);
    }
  });

  const startEdit = (ins: InsuranceRecord) => {
    setEditingId(ins.id);
    const hasCustom = ins.customSocialRate !== undefined || ins.customHealthRate !== undefined || ins.customUnempRate !== undefined;
    setEditValues({
      isParticipating: ins.isParticipating,
      insuranceSalary: ins.insuranceSalary,
      startDate: ins.startDate || '',
      customSocialRate: ins.customSocialRate ?? settings.socialInsRateEmployee,
      customHealthRate: ins.customHealthRate ?? settings.healthInsRateEmployee,
      customUnempRate: ins.customUnempRate ?? settings.unemploymentInsRateEmployee,
      useCustomRates: hasCustom,
      note: ins.note || ''
    });
  };

  const saveEdit = (ins: InsuranceRecord) => {
    onUpdateInsurance({
      ...ins,
      isParticipating: editValues.isParticipating,
      insuranceSalary: Number(editValues.insuranceSalary) || 0,
      startDate: editValues.startDate || undefined,
      customSocialRate: editValues.useCustomRates ? editValues.customSocialRate : undefined,
      customHealthRate: editValues.useCustomRates ? editValues.customHealthRate : undefined,
      customUnempRate: editValues.useCustomRates ? editValues.customUnempRate : undefined,
      note: editValues.note
    });
    setEditingId(null);
  };

  // Quản lý quá trình đóng BHXH theo từng thời gian cụ thể
  const handleOpenHistory = (emp: Employee, ins: InsuranceRecord) => {
    setHistoryTarget({ employee: emp, insurance: ins });
    setHistoryStartDate(ins.startDate || '');
    setHistoryForm({
      editingId: null,
      fromMonth: new Date().toISOString().slice(0, 7),
      toMonth: '',
      isOngoing: true,
      salary: ins.insuranceSalary || emp.baseSalary,
      note: ''
    });
    setHistorySuccessMsg(null);
  };

  const handleSaveStartDate = () => {
    if (!historyTarget) return;
    const updatedIns: InsuranceRecord = {
      ...historyTarget.insurance,
      startDate: historyStartDate
    };
    onUpdateInsurance(updatedIns);
    setHistoryTarget({
      ...historyTarget,
      insurance: updatedIns
    });
    setHistorySuccessMsg('Đã cập nhật thời gian bắt đầu đóng BHXH!');
    setTimeout(() => setHistorySuccessMsg(null), 3000);
  };

  const handleEditHistoryItem = (item: InsuranceSalaryHistory) => {
    setHistoryForm({
      editingId: item.id,
      fromMonth: item.fromMonth,
      toMonth: item.toMonth || '',
      isOngoing: !item.toMonth,
      salary: item.salary,
      note: item.note || ''
    });
  };

  const handleSaveHistoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyTarget) return;

    const currentHistory = [...(historyTarget.insurance.history || [])];
    const toMonthVal = historyForm.isOngoing ? '' : historyForm.toMonth;

    let updatedHistory: InsuranceSalaryHistory[];

    if (historyForm.editingId) {
      updatedHistory = currentHistory.map(h => 
        h.id === historyForm.editingId 
          ? { ...h, fromMonth: historyForm.fromMonth, toMonth: toMonthVal, salary: Number(historyForm.salary) || 0, note: historyForm.note }
          : h
      );
    } else {
      const newItem: InsuranceSalaryHistory = {
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromMonth: historyForm.fromMonth,
        toMonth: toMonthVal,
        salary: Number(historyForm.salary) || 0,
        note: historyForm.note
      };
      updatedHistory = [...currentHistory, newItem];
    }

    // Sắp xếp theo thứ tự thời gian tăng dần
    updatedHistory.sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));

    // Nếu kỳ này đang là giai đoạn hiện tại (không có toMonth hoặc là kỳ mới nhất), cập nhật luôn mức lương đóng BHXH hiện tại
    const isLatest = historyForm.isOngoing || !toMonthVal;
    const newSalary = isLatest ? Number(historyForm.salary) : historyTarget.insurance.insuranceSalary;

    // Tự động thiết lập startDate từ kỳ sớm nhất nếu chưa có
    const earliestMonth = updatedHistory[0]?.fromMonth;
    const resolvedStartDate = historyTarget.insurance.startDate || earliestMonth;

    const updatedIns: InsuranceRecord = {
      ...historyTarget.insurance,
      startDate: resolvedStartDate,
      insuranceSalary: newSalary,
      history: updatedHistory
    };

    onUpdateInsurance(updatedIns);
    setHistoryTarget({
      ...historyTarget,
      insurance: updatedIns
    });
    setHistoryStartDate(resolvedStartDate || '');

    // Reset form
    setHistoryForm({
      editingId: null,
      fromMonth: new Date().toISOString().slice(0, 7),
      toMonth: '',
      isOngoing: true,
      salary: Number(historyForm.salary) || 10000000,
      note: ''
    });

    setHistorySuccessMsg('Đã lưu thông tin mức đóng BHXH cho thời kỳ này!');
    setTimeout(() => setHistorySuccessMsg(null), 3000);
  };

  const handleDeleteHistoryItem = (historyId: string) => {
    if (!historyTarget) return;
    if (!confirm('Bạn có chắc muốn xóa thời kỳ đóng BHXH này?')) return;

    const updatedHistory = (historyTarget.insurance.history || []).filter(h => h.id !== historyId);
    const updatedIns: InsuranceRecord = {
      ...historyTarget.insurance,
      history: updatedHistory
    };

    onUpdateInsurance(updatedIns);
    setHistoryTarget({
      ...historyTarget,
      insurance: updatedIns
    });
    setHistorySuccessMsg('Đã xóa giai đoạn đóng BHXH!');
    setTimeout(() => setHistorySuccessMsg(null), 3000);
  };

  const handleOpenRateModal = () => {
    setRateForm({
      socialInsRateEmployee: settings.socialInsRateEmployee,
      healthInsRateEmployee: settings.healthInsRateEmployee,
      unemploymentInsRateEmployee: settings.unemploymentInsRateEmployee,
      socialInsRateEmployer: settings.socialInsRateEmployer,
      healthInsRateEmployer: settings.healthInsRateEmployer,
      unemploymentInsRateEmployer: settings.unemploymentInsRateEmployer,
      tradeUnionRateEmployer: settings.tradeUnionRateEmployer,
    });
    setIsRateModalOpen(true);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        ...rateForm
      });
    }
    setIsRateModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = employees.map((emp, idx) => {
      const ins = insurances.find(i => i.employeeId === emp.id);
      const isPart = ins?.isParticipating ?? true;
      const salary = isPart ? (ins?.insuranceSalary || emp.baseSalary) : 0;

      const socEmpRate = ins?.customSocialRate ?? settings.socialInsRateEmployee;
      const heaEmpRate = ins?.customHealthRate ?? settings.healthInsRateEmployee;
      const uneEmpRate = ins?.customUnempRate ?? settings.unemploymentInsRateEmployee;

      const socEmp = Math.round(salary * (socEmpRate / 100));
      const heaEmp = Math.round(salary * (heaEmpRate / 100));
      const uneEmp = Math.round(salary * (uneEmpRate / 100));
      const totEmp = socEmp + heaEmp + uneEmp;

      const socEr = Math.round(salary * (settings.socialInsRateEmployer / 100));
      const heaEr = Math.round(salary * (settings.healthInsRateEmployer / 100));
      const uneEr = Math.round(salary * (settings.unemploymentInsRateEmployer / 100));
      const unionEr = Math.round(salary * (settings.tradeUnionRateEmployer / 100));
      const totEr = socEr + heaEr + uneEr + unionEr;

      return {
        'STT': idx + 1,
        'Mã Nhân Viên': emp.employeeCode,
        'Họ và Tên': emp.fullName,
        'Phòng Ban': depMap.get(emp.departmentId) || '',
        'Chức Vụ': posMap.get(emp.positionId) || '',
        'Thời Gian Bắt Đầu Đóng': ins?.startDate || '',
        'Số Giai Đoạn Đóng': ins?.history?.length || 0,
        'Tham Gia BHXH': isPart ? 'Có' : 'Không',
        'Mức Lương Đóng BHXH': salary,
        [`BHXH NLĐ (${socEmpRate}%)`]: socEmp,
        [`BHYT NLĐ (${heaEmpRate}%)`]: heaEmp,
        [`BHTN NLĐ (${uneEmpRate}%)`]: uneEmp,
        [`TỔNG TRÍCH NLĐ (${(socEmpRate + heaEmpRate + uneEmpRate).toFixed(1)}%)`]: totEmp,
        [`BHXH NSDLĐ (${settings.socialInsRateEmployer}%)`]: socEr,
        [`BHYT NSDLĐ (${settings.healthInsRateEmployer}%)`]: heaEr,
        [`BHTN NSDLĐ (${settings.unemploymentInsRateEmployer}%)`]: uneEr,
        [`KPCĐ NSDLĐ (${settings.tradeUnionRateEmployer}%)`]: unionEr,
        [`TỔNG TRÍCH NSDLĐ (${erTotalRate}%)`]: totEr,
        [`TỔNG NỘP CƠ QUAN BHXH (${(socEmpRate + heaEmpRate + uneEmpRate + erTotalRate).toFixed(1)}%)`]: totEmp + totEr,
        'Ghi Chú': ins?.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trich_Nop_BHXH');
    XLSX.writeFile(wb, `Danh_Sach_Dong_BHXH_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Danh Sách Tham Gia & Trích Nộp BHXH</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Tổng trích nộp: {overallTotalRate}% (NLĐ: {empTotalRate}%, DN: {erTotalRate}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý mức lương căn cứ đóng BHXH, BHYT, BHTN, KPCĐ & tùy chỉnh linh hoạt tỷ lệ trích đóng
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canEditSettings && onUpdateSettings && (
            <button
              onClick={handleOpenRateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              title="Chỉnh sửa tỷ lệ trích đóng BHXH, BHYT, BHTN, KPCĐ của toàn công ty"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Chỉnh Sửa Tỷ Lệ Đóng BHXH</span>
            </button>
          )}

          {canExportData && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất Danh Sách BHXH (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Người Tham Gia</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {participatingCount} / {employees.length} nhân viên
          </div>
          <span className="text-emerald-600 font-medium mt-0.5 block">
            {Math.round((participatingCount / (employees.length || 1)) * 100)}% quân số
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Quỹ Lương Đóng BHXH</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {formatVND(totalInsuranceSalarySum)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Căn cứ trích nộp tháng</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">NLĐ Đóng ({empTotalRate}%)</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded">Trừ lương</span>
          </div>
          <div className="text-xl font-black font-mono text-red-600 mt-1">
            {formatVND(totalFundEmployee)}
          </div>
          <span className="text-slate-500 mt-0.5 block">BHXH {settings.socialInsRateEmployee}% • BHYT {settings.healthInsRateEmployee}% • BHTN {settings.unemploymentInsRateEmployee}%</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">NSDLĐ Đóng ({erTotalRate}%)</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">Chi phí DN</span>
          </div>
          <div className="text-xl font-black font-mono text-blue-600 mt-1">
            {formatVND(totalFundEmployer)}
          </div>
          <span className="text-slate-500 mt-0.5 block">BHXH {settings.socialInsRateEmployer}% • BHYT {settings.healthInsRateEmployer}% • BHTN {settings.unemploymentInsRateEmployer}% • KPCĐ {settings.tradeUnionRateEmployer}%</span>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Chính sách & Tỷ lệ trích nộp bảo hiểm hiện đang áp dụng:</div>
            <p className="text-slate-700">
              • <strong>Người lao động trích {empTotalRate}%:</strong> BHXH ({settings.socialInsRateEmployee}%) + BHYT ({settings.healthInsRateEmployee}%) + BHTN ({settings.unemploymentInsRateEmployee}%). Số tiền trích trừ trực tiếp vào thu nhập trước thuế.
            </p>
            <p className="text-slate-700">
              • <strong>Doanh nghiệp đóng {erTotalRate}%:</strong> BHXH ({settings.socialInsRateEmployer}%) + BHYT ({settings.healthInsRateEmployer}%) + BHTN ({settings.unemploymentInsRateEmployer}%) + Kinh phí Công đoàn ({settings.tradeUnionRateEmployer}%).
            </p>
          </div>
        </div>

        {canEditSettings && onUpdateSettings && (
          <button
            onClick={handleOpenRateModal}
            className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Thay đổi tỷ lệ
          </button>
        )}
      </div>

      {/* Insurance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Phòng Ban</th>
                <th className="px-4 py-3 text-center">Bắt Đầu Đóng</th>
                <th className="px-4 py-3 text-center">Tham Gia</th>
                <th className="px-4 py-3 text-right">Lương Đóng BHXH</th>
                <th className="px-4 py-3 text-center">Quá Trình Đóng</th>
                <th className="px-4 py-3 text-right text-red-600 font-bold">NLĐ Trích ({empTotalRate}%)</th>
                <th className="px-4 py-3 text-right text-blue-600 font-bold">DN Đóng ({erTotalRate}%)</th>
                <th className="px-4 py-3 text-right font-black text-purple-900">Tổng Nộp ({overallTotalRate}%)</th>
                <th className="px-4 py-3">Ghi Chú</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => {
                const ins = insurances.find(i => i.employeeId === emp.id) || {
                  id: `ins-${emp.id}`,
                  employeeId: emp.id,
                  isParticipating: true,
                  insuranceSalary: emp.baseSalary,
                  startDate: '',
                  history: [],
                  note: ''
                };

                const isEditing = editingId === ins.id;
                const salary = ins.isParticipating ? (isEditing ? Number(editValues.insuranceSalary) || 0 : ins.insuranceSalary) : 0;
                
                const currentEmpRate = isEditing 
                  ? (editValues.useCustomRates 
                      ? ((editValues.customSocialRate || 0) + (editValues.customHealthRate || 0) + (editValues.customUnempRate || 0))
                      : empTotalRate)
                  : ((ins.customSocialRate ?? settings.socialInsRateEmployee) + 
                     (ins.customHealthRate ?? settings.healthInsRateEmployee) + 
                     (ins.customUnempRate ?? settings.unemploymentInsRateEmployee));

                const empCost = Math.round(salary * (currentEmpRate / 100));
                const erCost = Math.round(salary * (erTotalRate / 100));
                const totalCost = empCost + erCost;

                const hasCustomRates = ins.customSocialRate !== undefined || ins.customHealthRate !== undefined || ins.customUnempRate !== undefined;
                const historyCount = ins.history?.length || 0;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <div>{emp.fullName}</div>
                      {hasCustomRates && !isEditing && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                          Tỷ lệ riêng ({currentEmpRate.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{depMap.get(emp.departmentId)}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="month"
                          value={editValues.startDate}
                          onChange={e => setEditValues({ ...editValues, startDate: e.target.value })}
                          className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      ) : (
                        ins.startDate ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{ins.startDate}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa đặt</span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={editValues.isParticipating}
                          onChange={e => setEditValues({ ...editValues, isParticipating: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          ins.isParticipating ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ins.isParticipating ? 'Tham gia' : 'Miễn đóng'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {isEditing ? (
                        <input
                          type="number"
                          step={100000}
                          value={editValues.insuranceSalary}
                          onChange={e => setEditValues({ ...editValues, insuranceSalary: Number(e.target.value) })}
                          className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-right text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      ) : (
                        formatVND(salary)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenHistory(emp, ins)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Xem và chỉnh sửa các mức đóng BHXH theo từng giai đoạn cụ thể"
                      >
                        <History className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{historyCount > 0 ? `${historyCount} giai đoạn` : 'Tạo quá trình'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                      {formatVND(empCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                      {formatVND(erCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-purple-900">
                      {formatVND(totalCost)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Ghi chú..."
                            value={editValues.note}
                            onChange={e => setEditValues({ ...editValues, note: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editValues.useCustomRates}
                              onChange={e => setEditValues({ ...editValues, useCustomRates: e.target.checked })}
                              className="rounded text-emerald-600 cursor-pointer"
                            />
                            <span>Tùy chỉnh tỷ lệ NLĐ riêng</span>
                          </label>
                          {editValues.useCustomRates && (
                            <div className="grid grid-cols-3 gap-1 text-[10px]">
                              <div>
                                <span className="text-slate-500">BHXH:</span>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={editValues.customSocialRate}
                                  onChange={e => setEditValues({ ...editValues, customSocialRate: Number(e.target.value) })}
                                  className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono"
                                />
                              </div>
                              <div>
                                <span className="text-slate-500">BHYT:</span>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={editValues.customHealthRate}
                                  onChange={e => setEditValues({ ...editValues, customHealthRate: Number(e.target.value) })}
                                  className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono"
                                />
                              </div>
                              <div>
                                <span className="text-slate-500">BHTN:</span>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={editValues.customUnempRate}
                                  onChange={e => setEditValues({ ...editValues, customUnempRate: Number(e.target.value) })}
                                  className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        ins.note || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEditEmployees && (
                        isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(ins)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              title="Lưu"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenHistory(emp, ins)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              title="Quá trình & mức đóng BHXH từng thời gian"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(ins)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="Điều chỉnh nhanh hàng này"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Quản Lý Quá Trình Đóng BHXH Từng Thời Gian Cụ Thể */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Quá Trình & Mức Đóng BHXH Từng Thời Gian Cụ Thể</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-semibold">
                      {historyTarget.employee.employeeCode}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nhân viên: <strong className="text-slate-800">{historyTarget.employee.fullName}</strong> • Phòng ban: {depMap.get(historyTarget.employee.departmentId) || 'Chưa xếp'} • CCCD: <span className="font-mono">{historyTarget.employee.idCardNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message */}
            {historySuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{historySuccessMsg}</span>
              </div>
            )}

            <div className="mt-5 space-y-6 text-xs">
              {/* Card 1: Chỉnh sửa thời gian bắt đầu đóng BHXH & Mức hiện tại */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Thời Gian Bắt Đầu Đóng BHXH</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={historyStartDate}
                      onChange={e => setHistoryStartDate(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {canEditEmployees && (
                      <button
                        type="button"
                        onClick={handleSaveStartDate}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Ngày Bắt Đầu</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Định dạng: Tháng/Năm bắt đầu phát sinh tham gia BHXH tại doanh nghiệp
                  </span>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Mức Đóng Hiện Tại:</span>
                    <span className="text-base font-black font-mono text-emerald-700">
                      {formatVND(historyTarget.insurance.insuranceSalary)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Trạng thái:</span>
                    <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                      historyTarget.insurance.isParticipating ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {historyTarget.insurance.isParticipating ? 'Đang tham gia' : 'Miễn đóng'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Bảng danh sách các giai đoạn mức đóng */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Lịch Sử Mức Lương Đóng BHXH Qua Các Thời Kỳ ({historyTarget.insurance.history?.length || 0} giai đoạn)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Tự động tính theo tỷ lệ chuẩn hệ thống (NLĐ 10.5%, DN 21.5%)</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Thời Gian (Từ - Đến)</th>
                        <th className="px-3 py-2.5 text-right">Mức Lương Đóng BHXH</th>
                        <th className="px-3 py-2.5 text-right text-red-600">NLĐ (10.5%)</th>
                        <th className="px-3 py-2.5 text-right text-blue-600">DN (21.5%)</th>
                        <th className="px-3 py-2.5 text-right font-bold text-purple-900">Tổng Nộp (32%)</th>
                        <th className="px-3 py-2.5">Căn Cứ / Ghi Chú</th>
                        <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                        {canEditEmployees && <th className="px-3 py-2.5 text-right">Thao Tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(!historyTarget.insurance.history || historyTarget.insurance.history.length === 0) ? (
                        <tr>
                          <td colSpan={canEditEmployees ? 8 : 7} className="px-4 py-6 text-center text-slate-400">
                            Chưa có dữ liệu giai đoạn đóng BHXH nào. Hãy thêm giai đoạn đầu tiên bên dưới!
                          </td>
                        </tr>
                      ) : (
                        historyTarget.insurance.history.map((item, idx) => {
                          const isOngoing = !item.toMonth;
                          const empPart = Math.round(item.salary * 0.105);
                          const erPart = Math.round(item.salary * 0.215);
                          const totalPart = empPart + erPart;

                          return (
                            <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isOngoing ? 'bg-emerald-50/30' : ''}`}>
                              <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                                <span className="inline-flex items-center gap-1">
                                  <span>{item.fromMonth}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className={isOngoing ? 'text-emerald-700 font-bold' : ''}>
                                    {isOngoing ? 'Đến nay' : item.toMonth}
                                  </span>
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                                {formatVND(item.salary)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-red-600 font-semibold">
                                {formatVND(empPart)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-blue-600 font-semibold">
                                {formatVND(erPart)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono font-black text-purple-900">
                                {formatVND(totalPart)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                                {item.note || <span className="text-slate-300 italic">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOngoing ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isOngoing ? 'Đang áp dụng' : 'Đã kết thúc'}
                                </span>
                              </td>
                              {canEditEmployees && (
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditHistoryItem(item)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                      title="Sửa giai đoạn này"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteHistoryItem(item.id)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                      title="Xóa giai đoạn này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: Form Thêm / Sửa giai đoạn */}
              {canEditEmployees && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {historyForm.editingId ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                      <span>{historyForm.editingId ? 'Chỉnh Sửa Giai Đoạn Đóng BHXH' : 'Thêm Giai Đoạn Mức Đóng BHXH Mới'}</span>
                    </span>
                    {historyForm.editingId && (
                      <button
                        type="button"
                        onClick={() => setHistoryForm({
                          editingId: null,
                          fromMonth: new Date().toISOString().slice(0, 7),
                          toMonth: '',
                          isOngoing: true,
                          salary: 10000000,
                          note: ''
                        })}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Hủy chế độ sửa
                      </button>
                    )}
                  </h4>

                  <form onSubmit={handleSaveHistoryItem} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Từ Tháng (Bắt đầu) *
                        </label>
                        <input
                          type="month"
                          required
                          value={historyForm.fromMonth}
                          onChange={e => setHistoryForm({ ...historyForm, fromMonth: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Đến Tháng (Kết thúc)
                        </label>
                        <input
                          type="month"
                          disabled={historyForm.isOngoing}
                          value={historyForm.toMonth}
                          onChange={e => setHistoryForm({ ...historyForm, toMonth: e.target.value })}
                          className={`w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                            historyForm.isOngoing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
                          }`}
                        />
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-700 mt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={historyForm.isOngoing}
                            onChange={e => setHistoryForm({ ...historyForm, isOngoing: e.target.checked })}
                            className="rounded text-emerald-600 cursor-pointer"
                          />
                          <span>Đang áp dụng đến nay</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Mức Lương Đóng BHXH (VNĐ) *
                        </label>
                        <input
                          type="number"
                          required
                          step={100000}
                          min={0}
                          value={historyForm.salary}
                          onChange={e => setHistoryForm({ ...historyForm, salary: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-emerald-700 mt-0.5 block font-mono">
                          {formatVND(historyForm.salary)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Lý Do / Quyết Định / Căn Cứ
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Tăng lương cơ sở, nâng bậc..."
                          value={historyForm.note}
                          onChange={e => setHistoryForm({ ...historyForm, note: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[11px] text-slate-500 italic">
                        * Mức đóng của giai đoạn hiện tại sẽ tự động cập nhật vào cột "Lương Đóng BHXH" trong danh sách.
                      </span>

                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>{historyForm.editingId ? 'Cập Nhật Giai Đoạn' : 'Lưu Giai Đoạn Mới'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Card 4: Trực quan hóa diễn biến mức đóng BHXH */}
              {historyTarget.insurance.history && historyTarget.insurance.history.length > 0 && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Diễn Biến Mức Đóng BHXH Theo Dòng Thời Gian</span>
                  </h4>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {historyTarget.insurance.history.map((h, i) => (
                      <div
                        key={h.id}
                        className={`shrink-0 p-3 rounded-xl border text-xs min-w-[170px] ${
                          !h.toMonth 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium shadow-xs' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-[10px] text-slate-500 font-mono">
                          {h.fromMonth} → {!h.toMonth ? 'Nay' : h.toMonth}
                        </div>
                        <div className="text-sm font-black font-mono text-slate-900 mt-1">
                          {formatVND(h.salary)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {h.note || 'Điều chỉnh lương đóng'}
                        </div>
                        {!h.toMonth && (
                          <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Hiện hành
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-4 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tùy Chỉnh Tỷ Lệ Đóng Bảo Hiểm Toàn Đơn Vị */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cấu Hình Tỷ Lệ Trích Đóng Bảo Hiểm Toàn Đơn Vị
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng tự động vào Bảng lương, Trích nộp BHXH & Giảm trừ thuế TNCN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="mt-5 space-y-5 text-xs">
              {/* Preset buttons */}
              <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-600 text-[11px]">Chọn nhanh mẫu thiết lập:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRateForm({
                      socialInsRateEmployee: 8.0,
                      healthInsRateEmployee: 1.5,
                      unemploymentInsRateEmployee: 1.0,
                      socialInsRateEmployer: 17.5,
                      healthInsRateEmployer: 3.0,
                      unemploymentInsRateEmployer: 1.0,
                      tradeUnionRateEmployer: 2.0
                    });
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  Chuẩn Luật (NLĐ 10.5% - DN 23.5%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRateForm(prev => ({
                      ...prev,
                      unemploymentInsRateEmployee: 0,
                      unemploymentInsRateEmployer: 0
                    }));
                  }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-semibold border border-amber-200 transition-colors cursor-pointer"
                >
                  Chính sách miễn BHTN (0%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRateForm(prev => ({
                      ...prev,
                      tradeUnionRateEmployer: 0
                    }));
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-semibold border border-blue-200 transition-colors cursor-pointer"
                >
                  Chưa có KPCĐ (0%)
                </button>
              </div>

              {/* Tỷ lệ NLĐ */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">1. Tỷ Lệ Trích Đóng Người Lao Động (NLĐ)</span>
                    <span className="text-[11px] text-slate-500">Khấu trừ trực tiếp vào tiền lương của người lao động</span>
                  </div>
                  <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-mono font-black text-xs">
                    Tổng: {((rateForm.socialInsRateEmployee || 0) + (rateForm.healthInsRateEmployee || 0) + (rateForm.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHXH NLĐ (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.socialInsRateEmployee}
                      onChange={e => setRateForm({ ...rateForm, socialInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 8.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHYT NLĐ (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.healthInsRateEmployee}
                      onChange={e => setRateForm({ ...rateForm, healthInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.5%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHTN NLĐ (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.unemploymentInsRateEmployee}
                      onChange={e => setRateForm({ ...rateForm, unemploymentInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.0%</span>
                  </div>
                </div>
              </div>

              {/* Tỷ lệ NSDLĐ */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">2. Tỷ Lệ Trích Đóng Doanh Nghiệp (NSDLĐ)</span>
                    <span className="text-[11px] text-slate-500">Chi phí bảo hiểm và kinh phí công đoàn do công ty chi trả</span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-mono font-black text-xs">
                    Tổng: {((rateForm.socialInsRateEmployer || 0) + (rateForm.healthInsRateEmployer || 0) + (rateForm.unemploymentInsRateEmployer || 0) + (rateForm.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHXH DN (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.socialInsRateEmployer}
                      onChange={e => setRateForm({ ...rateForm, socialInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 17.5%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHYT DN (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.healthInsRateEmployer}
                      onChange={e => setRateForm({ ...rateForm, healthInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 3.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHTN DN (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.unemploymentInsRateEmployer}
                      onChange={e => setRateForm({ ...rateForm, unemploymentInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">KPCĐ DN (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={rateForm.tradeUnionRateEmployer}
                      onChange={e => setRateForm({ ...rateForm, tradeUnionRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 2.0%</span>
                  </div>
                </div>
              </div>

              {/* Total preview callout */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-emerald-900 font-semibold">
                    Tổng Tỷ Lệ Nộp Vào Cơ Quan BHXH & Công Đoàn:
                  </span>
                </div>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {((rateForm.socialInsRateEmployee || 0) + (rateForm.healthInsRateEmployee || 0) + (rateForm.unemploymentInsRateEmployee || 0) + (rateForm.socialInsRateEmployer || 0) + (rateForm.healthInsRateEmployer || 0) + (rateForm.unemploymentInsRateEmployer || 0) + (rateForm.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}%
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Áp Dụng Tỷ Lệ Mới</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
