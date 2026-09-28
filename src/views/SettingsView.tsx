import React, { useState } from 'react';
import { 
  Building, 
  UserCheck, 
  Calendar, 
  Settings2, 
  ShieldCheck, 
  Percent, 
  Clock, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Utensils, 
  CalendarDays, 
  Sparkles, 
  Sliders, 
  Pencil, 
  Check, 
  X,
  CalendarRange,
  History,
  Info
} from 'lucide-react';
import { SystemSettings, Department, Position, Holiday, SalaryCalculationBasis, FixedDaysOffPolicy, TaxBracket, TaxExemptionRules, InsuranceRatePeriod } from '../types';
import { formatVND, calculateStandardDaysFromPolicy, DEFAULT_TAX_BRACKETS, DEFAULT_TAX_EXEMPTION_RULES } from '../utils/payrollCalculator';
import { useAuthRole } from '../context/AuthRoleContext';
import { EditTaxBracketsModal } from '../components/EditTaxBracketsModal';
import { EditTaxExemptionModal } from '../components/EditTaxExemptionModal';


interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const { canEditSettings } = useAuthRole();
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'departments' | 'positions' | 'holidays' | 'payroll_rules'>('general');

  // Modals / new items
  const [newDep, setNewDep] = useState({ code: '', name: '', managerName: '', description: '' });
  const [newPos, setNewPos] = useState({ code: '', name: '', responsibilityAllowance: 0 });
  const [newHol, setNewHol] = useState({ date: '2026-09-02', name: '', isPaid: true });
  const [isTaxBracketsModalOpen, setIsTaxBracketsModalOpen] = useState(false);
  const [isTaxExemptionModalOpen, setIsTaxExemptionModalOpen] = useState(false);

  // Modal quản lý giai đoạn áp dụng tỷ lệ đóng BHXH theo thời gian
  const [isInsurancePeriodModalOpen, setIsInsurancePeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState<{
    id: string | null;
    fromMonth: string;
    toMonth: string;
    isOngoing: boolean;
    name: string;
    socialInsRateEmployee: number;
    healthInsRateEmployee: number;
    unemploymentInsRateEmployee: number;
    socialInsRateEmployer: number;
    healthInsRateEmployer: number;
    unemploymentInsRateEmployer: number;
    tradeUnionRateEmployer: number;
    note: string;
  }>({
    id: null,
    fromMonth: `${settings.currentYear || 2026}-01`,
    toMonth: '',
    isOngoing: true,
    name: 'Giai đoạn chuẩn quy định',
    socialInsRateEmployee: 8.0,
    healthInsRateEmployee: 1.5,
    unemploymentInsRateEmployee: 1.0,
    socialInsRateEmployer: 17.5,
    healthInsRateEmployer: 3.0,
    unemploymentInsRateEmployer: 1.0,
    tradeUnionRateEmployer: 2.0,
    note: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddDepartment = () => {
    if (!newDep.code || !newDep.name) {
      alert('Vui lòng nhập Mã và Tên phòng ban');
      return;
    }
    const item: Department = {
      id: `dep-${Date.now()}`,
      code: newDep.code.toUpperCase().trim(),
      name: newDep.name.trim(),
      managerName: newDep.managerName.trim(),
      description: newDep.description.trim()
    };
    setFormData(prev => ({ ...prev, departments: [...prev.departments, item] }));
    setNewDep({ code: '', name: '', managerName: '', description: '' });
  };

  const handleDeleteDepartment = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) return;
    setFormData(prev => ({ ...prev, departments: prev.departments.filter(d => d.id !== id) }));
  };

  const handleAddPosition = () => {
    if (!newPos.code || !newPos.name) {
      alert('Vui lòng nhập Mã và Tên chức vụ');
      return;
    }
    const item: Position = {
      id: `pos-${Date.now()}`,
      code: newPos.code.toUpperCase().trim(),
      name: newPos.name.trim(),
      responsibilityAllowance: Number(newPos.responsibilityAllowance) || 0
    };
    setFormData(prev => ({ ...prev, positions: [...prev.positions, item] }));
    setNewPos({ code: '', name: '', responsibilityAllowance: 0 });
  };

  const handleDeletePosition = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chức vụ này?')) return;
    setFormData(prev => ({ ...prev, positions: prev.positions.filter(p => p.id !== id) }));
  };

  const handleAddHoliday = () => {
    if (!newHol.name || !newHol.date) {
      alert('Vui lòng nhập Ngày và Tên ngày nghỉ lễ');
      return;
    }
    const item: Holiday = {
      id: `hol-${Date.now()}`,
      date: newHol.date,
      name: newHol.name.trim(),
      isPaid: newHol.isPaid
    };
    setFormData(prev => ({ ...prev, holidays: [...prev.holidays, item] }));
    setNewHol({ date: '2026-09-02', name: '', isPaid: true });
  };

  const handleDeleteHoliday = (id: string) => {
    setFormData(prev => ({ ...prev, holidays: prev.holidays.filter(h => h.id !== id) }));
  };

  // Handlers: Quản lý giai đoạn áp dụng tỷ lệ đóng BHXH theo thời gian
  const handleOpenAddPeriod = () => {
    setPeriodForm({
      id: null,
      fromMonth: `${formData.currentYear || 2026}-01`,
      toMonth: '',
      isOngoing: true,
      name: `Quy định mới áp dụng từ năm ${formData.currentYear || 2026}`,
      socialInsRateEmployee: formData.socialInsRateEmployee ?? 8.0,
      healthInsRateEmployee: formData.healthInsRateEmployee ?? 1.5,
      unemploymentInsRateEmployee: formData.unemploymentInsRateEmployee ?? 1.0,
      socialInsRateEmployer: formData.socialInsRateEmployer ?? 17.5,
      healthInsRateEmployer: formData.healthInsRateEmployer ?? 3.0,
      unemploymentInsRateEmployer: formData.unemploymentInsRateEmployer ?? 1.0,
      tradeUnionRateEmployer: formData.tradeUnionRateEmployer ?? 2.0,
      note: ''
    });
    setIsInsurancePeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (period: InsuranceRatePeriod) => {
    setPeriodForm({
      id: period.id,
      fromMonth: period.fromMonth,
      toMonth: period.toMonth || '',
      isOngoing: !period.toMonth,
      name: period.name || '',
      socialInsRateEmployee: period.socialInsRateEmployee,
      healthInsRateEmployee: period.healthInsRateEmployee,
      unemploymentInsRateEmployee: period.unemploymentInsRateEmployee,
      socialInsRateEmployer: period.socialInsRateEmployer,
      healthInsRateEmployer: period.healthInsRateEmployer,
      unemploymentInsRateEmployer: period.unemploymentInsRateEmployer,
      tradeUnionRateEmployer: period.tradeUnionRateEmployer,
      note: period.note || ''
    });
    setIsInsurancePeriodModalOpen(true);
  };

  const handleDeletePeriod = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giai đoạn áp dụng tỷ lệ đóng BHXH này?')) return;
    setFormData(prev => ({
      ...prev,
      insuranceRatePeriods: (prev.insuranceRatePeriods || []).filter(p => p.id !== id)
    }));
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.fromMonth) {
      alert('Vui lòng chọn tháng bắt đầu áp dụng');
      return;
    }
    const toMonthVal = periodForm.isOngoing ? '' : periodForm.toMonth;
    if (toMonthVal && toMonthVal < periodForm.fromMonth) {
      alert('Tháng kết thúc phải lớn hơn hoặc bằng tháng bắt đầu áp dụng');
      return;
    }

    const currentList = [...(formData.insuranceRatePeriods || [])];
    let updatedList: InsuranceRatePeriod[];

    if (periodForm.id) {
      updatedList = currentList.map(p => 
        p.id === periodForm.id
          ? {
              ...p,
              fromMonth: periodForm.fromMonth,
              toMonth: toMonthVal,
              name: periodForm.name.trim() || `Quy định từ ${periodForm.fromMonth}`,
              socialInsRateEmployee: Number(periodForm.socialInsRateEmployee) || 0,
              healthInsRateEmployee: Number(periodForm.healthInsRateEmployee) || 0,
              unemploymentInsRateEmployee: Number(periodForm.unemploymentInsRateEmployee) || 0,
              socialInsRateEmployer: Number(periodForm.socialInsRateEmployer) || 0,
              healthInsRateEmployer: Number(periodForm.healthInsRateEmployer) || 0,
              unemploymentInsRateEmployer: Number(periodForm.unemploymentInsRateEmployer) || 0,
              tradeUnionRateEmployer: Number(periodForm.tradeUnionRateEmployer) || 0,
              note: periodForm.note.trim()
            }
          : p
      );
    } else {
      const newPeriod: InsuranceRatePeriod = {
        id: `irp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromMonth: periodForm.fromMonth,
        toMonth: toMonthVal,
        name: periodForm.name.trim() || `Quy định từ ${periodForm.fromMonth}`,
        socialInsRateEmployee: Number(periodForm.socialInsRateEmployee) || 0,
        healthInsRateEmployee: Number(periodForm.healthInsRateEmployee) || 0,
        unemploymentInsRateEmployee: Number(periodForm.unemploymentInsRateEmployee) || 0,
        socialInsRateEmployer: Number(periodForm.socialInsRateEmployer) || 0,
        healthInsRateEmployer: Number(periodForm.healthInsRateEmployer) || 0,
        unemploymentInsRateEmployer: Number(periodForm.unemploymentInsRateEmployer) || 0,
        tradeUnionRateEmployer: Number(periodForm.tradeUnionRateEmployer) || 0,
        note: periodForm.note.trim()
      };
      updatedList = [...currentList, newPeriod];
    }

    // Sắp xếp theo fromMonth giảm dần (giai đoạn mới nhất lên trên)
    updatedList.sort((a, b) => (b.fromMonth || '').localeCompare(a.fromMonth || ''));

    setFormData(prev => ({
      ...prev,
      insuranceRatePeriods: updatedList
    }));

    setIsInsurancePeriodModalOpen(false);
  };

  // Editing states for departments, positions, holidays
  const [editingDepId, setEditingDepId] = useState<string | null>(null);
  const [editDepData, setEditDepData] = useState<Department | null>(null);

  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editPosData, setEditPosData] = useState<Position | null>(null);

  const [editingHolId, setEditingHolId] = useState<string | null>(null);
  const [editHolData, setEditHolData] = useState<Holiday | null>(null);

  // Department edit handlers
  const handleStartEditDepartment = (dep: Department) => {
    setEditingDepId(dep.id);
    setEditDepData({ ...dep });
  };

  const handleSaveEditDepartment = () => {
    if (!editDepData) return;
    if (!editDepData.code.trim() || !editDepData.name.trim()) {
      alert('Vui lòng nhập Mã và Tên phòng ban');
      return;
    }
    const updatedDep: Department = {
      ...editDepData,
      code: editDepData.code.toUpperCase().trim(),
      name: editDepData.name.trim(),
      managerName: editDepData.managerName?.trim() || '',
      description: editDepData.description?.trim() || ''
    };
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.map(d => d.id === updatedDep.id ? updatedDep : d)
    }));
    setEditingDepId(null);
    setEditDepData(null);
  };

  const handleCancelEditDepartment = () => {
    setEditingDepId(null);
    setEditDepData(null);
  };

  // Position edit handlers
  const handleStartEditPosition = (pos: Position) => {
    setEditingPosId(pos.id);
    setEditPosData({ ...pos });
  };

  const handleSaveEditPosition = () => {
    if (!editPosData) return;
    if (!editPosData.code.trim() || !editPosData.name.trim()) {
      alert('Vui lòng nhập Mã và Tên chức vụ');
      return;
    }
    const updatedPos: Position = {
      ...editPosData,
      code: editPosData.code.toUpperCase().trim(),
      name: editPosData.name.trim(),
      responsibilityAllowance: Number(editPosData.responsibilityAllowance) || 0
    };
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.map(p => p.id === updatedPos.id ? updatedPos : p)
    }));
    setEditingPosId(null);
    setEditPosData(null);
  };

  const handleCancelEditPosition = () => {
    setEditingPosId(null);
    setEditPosData(null);
  };

  // Holiday edit handlers
  const handleStartEditHoliday = (hol: Holiday) => {
    setEditingHolId(hol.id);
    setEditHolData({ ...hol });
  };

  const handleSaveEditHoliday = () => {
    if (!editHolData) return;
    if (!editHolData.name.trim() || !editHolData.date.trim()) {
      alert('Vui lòng nhập Ngày và Tên ngày nghỉ lễ');
      return;
    }
    const updatedHol: Holiday = {
      ...editHolData,
      name: editHolData.name.trim(),
      date: editHolData.date.trim()
    };
    setFormData(prev => ({
      ...prev,
      holidays: prev.holidays.map(h => h.id === updatedHol.id ? updatedHol : h)
    }));
    setEditingHolId(null);
    setEditHolData(null);
  };

  const handleCancelEditHoliday = () => {
    setEditingHolId(null);
    setEditHolData(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Cài Đặt Hệ Thống & Quy Định Tính Lương</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin doanh nghiệp, đại diện ký biểu, phòng ban, chức vụ, ngày nghỉ lễ và chính sách tiền lương
          </p>
        </div>

        {canEditSettings && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Toàn Bộ Cấu Hình</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Cấu hình hệ thống và chính sách tiền lương đã được lưu trữ thành công!</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('general')}
          className={`py-3.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'general' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Thông Tin Chung & Người Ký
        </button>
        <button
          onClick={() => setActiveTab('payroll_rules')}
          className={`py-3.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'payroll_rules' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Cơ Sở Tính Lương, BHXH & Thuế
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`py-3.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'departments' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Danh Mục Phòng Ban ({formData.departments.length})
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`py-3.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'positions' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          4. Danh Mục Chức Vụ ({formData.positions.length})
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`py-3.5 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'holidays' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          5. Ngày Nghỉ Lễ Tết Trong Năm ({formData.holidays.length})
        </button>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Thông Tin Pháp Nhân Đơn Vị</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tên Đơn Vị / Doanh Nghiệp *</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã Số Thuế (MST) *</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.taxCode}
                  onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Địa Chỉ Trụ Sở</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại Liên Hệ</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Cán Bộ Ký Duyệt Bảng Lương (Hiển Thị Trên Phiếu Lương & Báo Cáo)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Giám Đốc (Người ký duyệt) *</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.directorName}
                  onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Kế Toán Trưởng (Kiểm soát) *</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.chiefAccountantName}
                  onChange={e => setFormData({ ...formData, chiefAccountantName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Người Lập Biểu (Chuyên viên tính lương) *</label>
                <input
                  type="text"
                  disabled={!canEditSettings}
                  value={formData.reportPreparerName}
                  onChange={e => setFormData({ ...formData, reportPreparerName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Payroll Rules */}
      {activeTab === 'payroll_rules' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-slate-200 shadow-xs space-y-6">
          {/* Working basis */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Cơ Sở Tính Lương & Quy Định Thời Gian Làm Việc Chuẩn</span>
              </h3>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
                Tháng hiện tại: Tháng {formData.currentMonth}/{formData.currentYear}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chính Sách Ngày Nghỉ Cố Định Mặc Định *</label>
                <select
                  disabled={!canEditSettings}
                  value={formData.fixedDaysOffPolicy || 'sundays_and_half_saturdays'}
                  onChange={e => {
                    const policy = e.target.value as FixedDaysOffPolicy;
                    setFormData(prev => {
                      const calculated = calculateStandardDaysFromPolicy(prev.currentYear, prev.currentMonth, policy, prev.holidays);
                      return {
                        ...prev,
                        fixedDaysOffPolicy: policy,
                        standardWorkDays: policy === 'custom' ? prev.standardWorkDays : calculated
                      };
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="sundays_and_half_saturdays">Nghỉ tất cả CN + 2 Thứ 7 (~24 công)</option>
                  <option value="all_sundays">CN: Nghỉ tất cả ngày Chủ nhật (~26 công)</option>
                  <option value="half_sundays">1/2 CN: Nghỉ 2 Chủ nhật trong tháng (~28 công)</option>
                  <option value="all_weekends">T7 + CN: Nghỉ cả Thứ 7 và Chủ nhật (~20-22 công)</option>
                  <option value="custom">Tự thiết lập số ngày công chuẩn</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Áp dụng mặc định cho các tháng</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Ngày Công Chuẩn Tháng Này *</label>
                <input
                  type="number"
                  min={15}
                  max={31}
                  disabled={!canEditSettings}
                  value={formData.standardWorkDays}
                  onChange={e => {
                    const days = Number(e.target.value);
                    const curKey = `${formData.currentYear}-${String(formData.currentMonth).padStart(2, '0')}`;
                    setFormData(prev => ({
                      ...prev,
                      standardWorkDays: days,
                      monthlyStandardConfigs: {
                        ...(prev.monthlyStandardConfigs || {}),
                        [curKey]: days
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Ngày công chuẩn của T{formData.currentMonth}/{formData.currentYear}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giờ Làm Tiêu Chuẩn / Ngày</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  disabled={!canEditSettings}
                  value={formData.standardWorkHoursPerDay}
                  onChange={e => setFormData({ ...formData, standardWorkHoursPerDay: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Quy định luật: 8 giờ/ngày</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cơ Sở Tính Lương Mặc Định</label>
                <select
                  disabled={!canEditSettings}
                  value={formData.defaultSalaryBasis}
                  onChange={e => setFormData({ ...formData, defaultSalaryBasis: e.target.value as SalaryCalculationBasis })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                >
                  <option value="monthly">Lương tháng cố định</option>
                  <option value="daily">Theo ngày công thực tế</option>
                  <option value="hourly">Theo giờ làm việc (Hourly)</option>
                  <option value="percent">Lương theo % hiệu quả (KPI)</option>
                  <option value="department">Lương theo bộ phận</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Hỗ trợ tính lương theo giờ</span>
              </div>
            </div>

            {/* Hourly info banner */}
            <div className="mt-4 p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-900">
                  Phương án tính lương theo giờ (Hourly Wage Calculation) & Ngày nghỉ cố định:
                </p>
                <p className="text-slate-700 leading-relaxed">
                  • <strong>Tính lương theo giờ:</strong> Công thức: <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-bold">Lương chính = Số giờ làm việc thực tế × Đơn giá theo giờ</code>. Phù hợp cho lao động thời vụ, bán thời gian hoặc làm theo ca. Đơn giá OT cũng được tính trực tiếp từ đơn giá giờ này (150%, 200%, 300%).
                </p>
                <p className="text-slate-700 leading-relaxed">
                  • <strong>Chính sách ngày nghỉ cố định:</strong> Hỗ trợ lựa chọn <strong>CN</strong> (nghỉ tất cả các ngày Chủ nhật), <strong>1/2 CN</strong> (nghỉ 2 ngày Chủ nhật trong tháng, 2 ngày còn lại làm việc), <strong>T7 + CN</strong> (nghỉ cả thứ 7 và CN), hoặc <strong>CN + 2 Thứ 7</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Month-by-month standard days setup table */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>Bảng Thiết Lập Ngày Công Chuẩn Từng Tháng Trong Năm ({formData.currentYear})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tùy chỉnh số ngày công chuẩn và chính sách ngày nghỉ cố định cho từng tháng cụ thể (tính theo số ngày trong tháng, số ngày nghỉ CN/T7 và ngày lễ)
                </p>
              </div>

              {canEditSettings && (
                <button
                  type="button"
                  onClick={() => {
                    const newConfigs: Record<string, number> = { ...(formData.monthlyStandardConfigs || {}) };
                    const newPolicies: Record<string, FixedDaysOffPolicy> = { ...(formData.monthlyPolicyConfigs || {}) };
                    const defaultPolicy = formData.fixedDaysOffPolicy || 'sundays_and_half_saturdays';

                    for (let m = 1; m <= 12; m++) {
                      const key = `${formData.currentYear}-${String(m).padStart(2, '0')}`;
                      const pol = newPolicies[key] || defaultPolicy;
                      newConfigs[key] = calculateStandardDaysFromPolicy(formData.currentYear, m, pol, formData.holidays);
                      newPolicies[key] = pol;
                    }

                    const curKey = `${formData.currentYear}-${String(formData.currentMonth).padStart(2, '0')}`;
                    setFormData(prev => ({
                      ...prev,
                      monthlyStandardConfigs: newConfigs,
                      monthlyPolicyConfigs: newPolicies,
                      standardWorkDays: newConfigs[curKey] || prev.standardWorkDays
                    }));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tự Động Tính Chuẩn Cả 12 Tháng Theo Lịch</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3">Tháng</th>
                    <th className="py-2.5 px-3 text-center">Số Ngày Lịch</th>
                    <th className="py-2.5 px-3 text-center">Số Ngày Lễ</th>
                    <th className="py-2.5 px-3">Chính Sách Ngày Nghỉ Cố Định</th>
                    <th className="py-2.5 px-3 text-center">Ngày Công Chuẩn</th>
                    <th className="py-2.5 px-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                    const monthKey = `${formData.currentYear}-${String(month).padStart(2, '0')}`;
                    const daysInMonth = new Date(formData.currentYear, month, 0).getDate();
                    const isCurrent = month === formData.currentMonth;
                    
                    // Count holidays in this month
                    const holidayCount = (formData.holidays || []).filter(h => {
                      const hMonth = parseInt(h.date.split('-')[1], 10);
                      const hYear = parseInt(h.date.split('-')[0], 10);
                      return hYear === formData.currentYear && hMonth === month;
                    }).length;

                    const currentPolicy = formData.monthlyPolicyConfigs?.[monthKey] || formData.fixedDaysOffPolicy || 'sundays_and_half_saturdays';
                    const currentStandardDays = formData.monthlyStandardConfigs?.[monthKey] ?? (
                      currentPolicy !== 'custom' 
                        ? calculateStandardDaysFromPolicy(formData.currentYear, month, currentPolicy, formData.holidays)
                        : (isCurrent ? formData.standardWorkDays : 24)
                    );

                    return (
                      <tr 
                        key={month} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCurrent ? 'bg-emerald-50/40 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">Tháng {String(month).padStart(2, '0')}/{formData.currentYear}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                Đang tính lương
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {daysInMonth} ngày
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {holidayCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                              {holidayCount} ngày lễ
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            disabled={!canEditSettings}
                            value={currentPolicy}
                            onChange={e => {
                              const pol = e.target.value as FixedDaysOffPolicy;
                              const calculated = calculateStandardDaysFromPolicy(formData.currentYear, month, pol, formData.holidays);
                              
                              setFormData(prev => {
                                const newPolicies = { ...(prev.monthlyPolicyConfigs || {}), [monthKey]: pol };
                                const newConfigs = { ...(prev.monthlyStandardConfigs || {}), [monthKey]: pol === 'custom' ? (prev.monthlyStandardConfigs?.[monthKey] || 24) : calculated };
                                return {
                                  ...prev,
                                  monthlyPolicyConfigs: newPolicies,
                                  monthlyStandardConfigs: newConfigs,
                                  ...(isCurrent ? { standardWorkDays: newConfigs[monthKey] } : {})
                                };
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="sundays_and_half_saturdays">Nghỉ tất cả CN + 2 T7</option>
                            <option value="all_sundays">CN: Nghỉ tất cả Chủ nhật</option>
                            <option value="half_sundays">1/2 CN: Nghỉ 2 Chủ nhật trong tháng</option>
                            <option value="all_weekends">T7 + CN: Nghỉ cả Thứ 7 và CN</option>
                            <option value="custom">Tùy chỉnh số ngày</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min={10}
                            max={31}
                            disabled={!canEditSettings}
                            value={currentStandardDays}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setFormData(prev => {
                                const newConfigs = { ...(prev.monthlyStandardConfigs || {}), [monthKey]: val };
                                return {
                                  ...prev,
                                  monthlyStandardConfigs: newConfigs,
                                  ...(isCurrent ? { standardWorkDays: val } : {})
                                };
                              });
                            }}
                            className="w-20 text-center px-2 py-1 border-2 border-slate-300 focus:border-emerald-500 rounded-lg font-mono font-bold text-slate-900 bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {canEditSettings && (
                            <button
                              type="button"
                              onClick={() => {
                                const calculated = calculateStandardDaysFromPolicy(formData.currentYear, month, currentPolicy, formData.holidays);
                                setFormData(prev => {
                                  const newConfigs = { ...(prev.monthlyStandardConfigs || {}), [monthKey]: calculated };
                                  return {
                                    ...prev,
                                    monthlyStandardConfigs: newConfigs,
                                    ...(isCurrent ? { standardWorkDays: calculated } : {})
                                  };
                                });
                              }}
                              className="px-2.5 py-1 text-[11px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded font-semibold transition-colors cursor-pointer"
                              title="Tính lại ngày công chuẩn dựa trên lịch tháng và chính sách nghỉ"
                            >
                              Tính lại
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* OT Rates */}

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Hệ Số Tính Tiền Làm Thêm Giờ (Overtime) Theo Luật Lao Động</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Làm thêm ngày thường</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    disabled={!canEditSettings}
                    value={formData.otWeekdayRate * 100}
                    onChange={e => setFormData({ ...formData, otWeekdayRate: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
                <span className="text-[10px] text-slate-500">100% chịu thuế, 50% miễn thuế</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Làm thêm ngày nghỉ tuần (CN)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    disabled={!canEditSettings}
                    value={formData.otWeekendRate * 100}
                    onChange={e => setFormData({ ...formData, otWeekendRate: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
                <span className="text-[10px] text-slate-500">100% chịu thuế, 100% miễn thuế</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Làm thêm ngày Lễ, Tết</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    disabled={!canEditSettings}
                    value={formData.otHolidayRate * 100}
                    onChange={e => setFormData({ ...formData, otHolidayRate: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
                <span className="text-[10px] text-slate-500">100% chịu thuế, 200% miễn thuế</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phụ cấp làm thêm ban đêm</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step={0.1}
                    disabled={!canEditSettings}
                    value={formData.otNightBonusRate * 100}
                    onChange={e => setFormData({ ...formData, otNightBonusRate: Number(e.target.value) / 100 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
                <span className="text-[10px] text-slate-500">Tối thiểu 30% lương giờ</span>
              </div>
            </div>
          </div>

          {/* Tax & Deductions */}
          <div className="pt-4 border-t border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mức Giảm Trừ Gia Cảnh & Tỷ Lệ Trích Đóng Bảo Hiểm Xã Hội</span>
              </h3>
              {canEditSettings && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        socialInsRateEmployee: 8.0,
                        healthInsRateEmployee: 1.5,
                        unemploymentInsRateEmployee: 1.0,
                        socialInsRateEmployer: 17.5,
                        healthInsRateEmployer: 3.0,
                        unemploymentInsRateEmployer: 1.0,
                        tradeUnionRateEmployer: 2.0
                      }));
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer border border-slate-300"
                  >
                    Chuẩn Luật (10.5% / 23.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        unemploymentInsRateEmployee: 0,
                        unemploymentInsRateEmployer: 0
                      }));
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg transition-colors cursor-pointer border border-amber-200"
                    title="Áp dụng chính sách hỗ trợ miễn nộp BHTN"
                  >
                    Miễn BHTN (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        tradeUnionRateEmployer: 0
                      }));
                    }}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded-lg transition-colors cursor-pointer border border-blue-200"
                    title="Chưa thành lập công đoàn cơ sở"
                  >
                    KPCĐ (0%)
                  </button>
                </div>
              )}
            </div>

            {/* Giảm trừ gia cảnh & Định mức tiền ăn ca */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giảm Trừ Bản Thân (VNĐ/tháng) *</label>
                <input
                  type="number"
                  step={500000}
                  disabled={!canEditSettings}
                  value={formData.personalDeduction}
                  onChange={e => setFormData({ ...formData, personalDeduction: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Mức quy định hiện hành: 15,500,000 đ/tháng</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giảm Trừ 1 Người Phụ Thuộc (VNĐ/tháng) *</label>
                <input
                  type="number"
                  step={100000}
                  disabled={!canEditSettings}
                  value={formData.dependentDeduction}
                  onChange={e => setFormData({ ...formData, dependentDeduction: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Mức quy định hiện hành: 6,200,000 đ/tháng/người</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Định Mức Tiền Ăn Ca Miễn Thuế (VNĐ/tháng) *</label>
                <input
                  type="number"
                  step={50000}
                  disabled={!canEditSettings}
                  value={formData.monthlyMealFlatRate ?? 1200000}
                  onChange={e => {
                    const newMealRate = Number(e.target.value);
                    setFormData({
                      ...formData,
                      monthlyMealFlatRate: newMealRate,
                      taxExemptionRules: {
                        ...(formData.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES),
                        mealExemptMonthlyCap: newMealRate
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Mức quy định hiện hành: 1,200,000 đ/tháng</span>
              </div>
            </div>

            {/* Biểu thuế lũy tiến từng phần */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-indigo-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Biểu Thuế Lũy Tiến Từng Phần (Thu nhập từ tiền lương, tiền công)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Đang áp dụng: <strong>{(formData.taxBrackets && formData.taxBrackets.length > 0) ? formData.taxBrackets.length : 5} bậc thuế (Chuẩn hiện hành)</strong>
                  </span>
                </div>
                {canEditSettings && (
                  <button
                    type="button"
                    onClick={() => setIsTaxBracketsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Chỉnh Sửa Biểu Thuế Lũy Tiến</span>
                  </button>
                )}
              </div>

              {/* Grid of current brackets preview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 text-xs">
                {((formData.taxBrackets && formData.taxBrackets.length > 0) ? formData.taxBrackets : DEFAULT_TAX_BRACKETS).map(b => (
                  <div key={b.bracket} className="bg-white p-2.5 rounded-lg border border-indigo-100 text-center shadow-2xs">
                    <div className="font-bold text-slate-800 text-[11px]">{b.name}</div>
                    <div className="text-indigo-700 font-black text-xs mt-0.5">
                      {b.rate > 1 ? b.rate : Math.round(b.rate * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate" title={b.description}>
                      {b.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cấu hình Phương thức khấu trừ % thuế tại nguồn */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-amber-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-600" />
                    Cấu Hình Phương Thức Khấu Trừ % Thuế Tại Nguồn (Theo Pháp Luật Hiện Hành)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Áp dụng cho hợp đồng dưới 3 tháng, vãng lai, yêu cầu khấu trừ hoặc cá nhân không cư trú
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] border border-amber-300">
                  Mặc định: {formData.taxWithholdingRateResident ?? 10}%
                </span>
              </div>

              {/* Form nhập thông số khấu trừ tại nguồn */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tỷ Lệ Khấu Trừ Tại Nguồn (%) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!canEditSettings}
                      value={formData.taxWithholdingRateResident ?? 10}
                      onChange={e => setFormData({ ...formData, taxWithholdingRateResident: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Mặc định 10% (có thể tùy chỉnh theo quy chế)
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mức Chi Trả Áp Dụng Khấu Trừ (VNĐ/lần) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500000}
                    disabled={!canEditSettings}
                    value={formData.taxWithholdingThreshold ?? 5000000}
                    onChange={e => setFormData({ ...formData, taxWithholdingThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Quy định: từ 5.000.000 đ/lần trở lên khấu trừ 10%
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thuế Suất Cá Nhân Không Cư Trú (%) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!canEditSettings}
                      value={formData.taxWithholdingRateNonResident ?? 20}
                      onChange={e => setFormData({ ...formData, taxWithholdingRateNonResident: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-rose-800 bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Áp dụng thuế suất cố định 20% theo quy định
                  </span>
                </div>
              </div>

              {/* Hướng dẫn pháp lý */}
              <div className="p-3 bg-white/80 rounded-lg border border-amber-200 text-[11px] text-amber-950 space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Căn Cứ Pháp Luật Thuế TNCN Hiện Hành:</span>
                </div>
                <div className="leading-relaxed text-slate-700 space-y-0.5 pl-1">
                  <p>• <strong>Không ký HĐLĐ hoặc ký dưới 03 tháng:</strong> Mức chi trả từ <strong>5.000.000 đồng/lần trở lên</strong>: Khấu trừ theo tỷ lệ <strong>10%</strong> trước khi trả thu nhập.</p>
                  <p>• <strong>Mức chi trả dưới 5.000.000 đồng/lần:</strong> Chỉ khấu trừ 10% khi cá nhân có yêu cầu.</p>
                  <p>• <strong>Cá nhân không cư trú:</strong> Áp dụng mức thuế suất cố định <strong>20%</strong> trên thu nhập từ tiền lương, tiền công.</p>
                  <p>• Trong <strong>Bảng kê khai thuế TNCN từng tháng</strong>, bạn có thể chuyển đổi phương thức tính thuế cho từng nhân sự; bảng lương và kê khai thuế sẽ tự động tính toán lại tức thì.</p>
                </div>
              </div>
            </div>

            {/* Cấu hình miễn thuế TNCN */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                <div>
                  <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Thiết Lập Thu Nhập Miễn Thuế TNCN (Tăng ca trần 40h/tháng & 200h/năm, Ăn ca 1.200.000 đ...)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Khống chế mức trần OT 40h/tháng, 200h/năm; mức ăn ca 1.200.000 đ; trang phục, điện thoại, xăng xe
                  </span>
                </div>
                {canEditSettings && (
                  <button
                    type="button"
                    onClick={() => setIsTaxExemptionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Chỉnh Sửa Thiết Lập Miễn Thuế</span>
                  </button>
                )}
              </div>

              {/* Grid of current rules preview */}
              {(() => {
                const exRules = formData.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="font-bold text-slate-700 text-[11px]">1. Làm thêm giờ (Tăng ca)</div>
                      <div className="text-emerald-700 font-bold text-xs mt-0.5">
                        {exRules.otExemptMode === 'differential_only' && 'Miễn phần vượt mức'}
                        {exRules.otExemptMode === 'fully_exempt' && 'Miễn 100% tiền OT'}
                        {exRules.otExemptMode === 'fully_taxable' && 'Tính thuế toàn bộ'}
                        {exRules.otExemptMode === 'custom_rate' && `Miễn ${exRules.otCustomExemptRate}%`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Trần: {exRules.otMonthlyHoursCap ?? 40}h/tháng & {exRules.otYearlyHoursCap ?? 200}h/năm. Vượt trần tính thuế 100%.
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="font-bold text-slate-700 text-[11px]">2. Ăn ca tiền mặt</div>
                      <div className="text-emerald-700 font-bold text-xs mt-0.5">
                        {exRules.mealExemptMode === 'capped' && `Trần: ${formatVND(exRules.mealExemptMonthlyCap || 1200000)}`}
                        {exRules.mealExemptMode === 'fully_exempt' && 'Miễn toàn bộ tiền mặt'}
                        {exRules.mealExemptMode === 'fully_taxable' && 'Tính thuế toàn bộ'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {exRules.mealExemptMode === 'capped' ? 'Vượt 1.200.000 đ sẽ tính thuế' : 'Theo quy chế'}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="font-bold text-slate-700 text-[11px]">3. Trang phục tiền mặt</div>
                      <div className="text-emerald-700 font-bold text-xs mt-0.5">
                        {exRules.uniformExemptMode === 'capped' && `Trần: ${formatVND(exRules.uniformExemptMonthlyCap)}`}
                        {exRules.uniformExemptMode === 'fully_exempt' && 'Miễn toàn bộ'}
                        {exRules.uniformExemptMode === 'fully_taxable' && 'Tính thuế toàn bộ'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {exRules.uniformExemptMode === 'capped' ? 'Tối đa 5tr/năm (~416k/tháng)' : 'Theo quy chế'}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <div className="font-bold text-slate-700 text-[11px]">4. Điện thoại & Xăng xe</div>
                      <div className="text-emerald-700 font-bold text-xs mt-0.5">
                        {exRules.phoneExemptMode === 'company_policy' ? 'Theo quy chế khoán chi' : exRules.phoneExemptMode === 'capped' ? `Trần: ${formatVND(exRules.phoneExemptMonthlyCap || 0)}` : 'Tính thuế'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={exRules.legalNote}>
                        {exRules.legalNote || 'Khoán chi nội bộ'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Editable Insurance Rates Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              {/* Tỷ lệ NLĐ */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">1. Tỷ Lệ Trích Đóng Người Lao Động (NLĐ)</span>
                    <span className="text-[11px] text-slate-500">Khấu trừ trực tiếp vào thu nhập của nhân viên</span>
                  </div>
                  <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-mono font-black text-xs">
                    Tổng: {((formData.socialInsRateEmployee || 0) + (formData.healthInsRateEmployee || 0) + (formData.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHXH NLĐ (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.socialInsRateEmployee}
                        onChange={e => setFormData({ ...formData, socialInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 8.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHYT NLĐ (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.healthInsRateEmployee}
                        onChange={e => setFormData({ ...formData, healthInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.5%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHTN NLĐ (%)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.unemploymentInsRateEmployee}
                        onChange={e => setFormData({ ...formData, unemploymentInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.0%</span>
                  </div>
                </div>
              </div>

              {/* Tỷ lệ NSDLĐ */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">2. Tỷ Lệ Trích Đóng Doanh Nghiệp (NSDLĐ)</span>
                    <span className="text-[11px] text-slate-500">Chi phí bảo hiểm và kinh phí công đoàn DN chi trả</span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-mono font-black text-xs">
                    Tổng: {((formData.socialInsRateEmployer || 0) + (formData.healthInsRateEmployer || 0) + (formData.unemploymentInsRateEmployer || 0) + (formData.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHXH DN</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.socialInsRateEmployer}
                        onChange={e => setFormData({ ...formData, socialInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500 text-[11px]">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 17.5%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHYT DN</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.healthInsRateEmployer}
                        onChange={e => setFormData({ ...formData, healthInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500 text-[11px]">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 3.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">BHTN DN</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.unemploymentInsRateEmployer}
                        onChange={e => setFormData({ ...formData, unemploymentInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500 text-[11px]">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 1.0%</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">KPCĐ DN</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={!canEditSettings}
                        value={formData.tradeUnionRateEmployer}
                        onChange={e => setFormData({ ...formData, tradeUnionRateEmployer: Math.max(0, Number(e.target.value)) })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <span className="font-bold text-slate-500 text-[11px]">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 2.0%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Summary Callout */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Tổng Tỷ Lệ Toàn Đơn Vị (NLĐ + DN):</strong>{' '}
                  {((formData.socialInsRateEmployee || 0) + (formData.healthInsRateEmployee || 0) + (formData.unemploymentInsRateEmployee || 0) + (formData.socialInsRateEmployer || 0) + (formData.healthInsRateEmployer || 0) + (formData.unemploymentInsRateEmployer || 0) + (formData.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}% quỹ lương đóng bảo hiểm
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold italic">
                Cập nhật tự động vào Bảng lương & Báo cáo BHXH khi Lưu Cài Đặt
              </span>
            </div>

            {/* Giai đoạn áp dụng tỷ lệ đóng BHXH theo từng thời điểm (Từ tháng... đến tháng...) */}
            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-purple-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-slate-900 text-xs">
                      Cấu Hình Tỷ Lệ Đóng BHXH Theo Từng Thời Điểm (Từ Tháng Đến Tháng)
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px] border border-purple-300">
                      {(formData.insuranceRatePeriods?.length || 0)} giai đoạn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Khi quy định pháp luật hoặc tỷ lệ đóng thay đổi theo từng thời kỳ (ví dụ chính sách hỗ trợ giảm BHTN, điều chỉnh Luật BHXH mới...), hệ thống tự động áp dụng đúng tỷ lệ của từng tháng khi tính <strong>Bảng lương</strong> và <strong>Báo cáo BHXH cả năm</strong>.
                  </p>
                </div>

                {canEditSettings && (
                  <button
                    type="button"
                    onClick={handleOpenAddPeriod}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Giai Đoạn Mới</span>
                  </button>
                )}
              </div>

              {/* Table of periods */}
              <div className="overflow-x-auto bg-white rounded-lg border border-purple-200 shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-purple-100/70 text-purple-950 font-bold border-b border-purple-200 text-[11px]">
                    <tr>
                      <th className="p-2.5">Tên Giai Đoạn / Căn Cứ</th>
                      <th className="p-2.5 text-center min-w-[150px]">Thời Gian Áp Dụng</th>
                      <th className="p-2.5 text-center min-w-[120px] bg-red-50 text-red-950">NLĐ Đóng (%)</th>
                      <th className="p-2.5 text-center min-w-[140px] bg-blue-50 text-blue-950">DN Đóng (%)</th>
                      <th className="p-2.5 text-center min-w-[100px] bg-purple-200/80 font-black">Tổng Nộp (%)</th>
                      <th className="p-2.5">Ghi Chú</th>
                      <th className="p-2.5 text-center w-24">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100 text-[11px]">
                    {(!formData.insuranceRatePeriods || formData.insuranceRatePeriods.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                          Chưa thiết lập giai đoạn riêng lẻ. Hệ thống hiện đang áp dụng tỷ lệ chuẩn chung phía trên cho toàn bộ các tháng.
                        </td>
                      </tr>
                    ) : (
                      formData.insuranceRatePeriods.map((period) => {
                        const empSum = Number(((period.socialInsRateEmployee || 0) + (period.healthInsRateEmployee || 0) + (period.unemploymentInsRateEmployee || 0)).toFixed(2));
                        const erSum = Number(((period.socialInsRateEmployer || 0) + (period.healthInsRateEmployer || 0) + (period.unemploymentInsRateEmployer || 0) + (period.tradeUnionRateEmployer || 0)).toFixed(2));
                        const totalSum = Number((empSum + erSum).toFixed(2));
                        const currentMonthKey = `${formData.currentYear}-${String(formData.currentMonth).padStart(2, '0')}`;
                        const isCurrentActive = (!period.toMonth || currentMonthKey <= period.toMonth) && (currentMonthKey >= period.fromMonth);

                        return (
                          <tr key={period.id} className="hover:bg-purple-50/40 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{period.name || 'Giai đoạn áp dụng'}</span>
                                {isCurrentActive && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Tháng hiện tại
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-center">
                              <span className="font-bold text-purple-900">{period.fromMonth}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              {period.toMonth ? (
                                <span className="font-bold text-purple-900">{period.toMonth}</span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[10px]">
                                  Đang áp dụng
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center bg-red-50/30">
                              <div className="font-black text-red-700 font-mono text-xs">{empSum}%</div>
                              <div className="text-[10px] text-slate-500">
                                BHXH {period.socialInsRateEmployee}% • BHYT {period.healthInsRateEmployee}% • BHTN {period.unemploymentInsRateEmployee}%
                              </div>
                            </td>
                            <td className="p-2.5 text-center bg-blue-50/30">
                              <div className="font-black text-blue-700 font-mono text-xs">{erSum}%</div>
                              <div className="text-[10px] text-slate-500">
                                BHXH {period.socialInsRateEmployer}% • BHYT {period.healthInsRateEmployer}% • BHTN {period.unemploymentInsRateEmployer}% • KPCĐ {period.tradeUnionRateEmployer}%
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-black font-mono text-purple-950 text-xs bg-purple-50/50">
                              {totalSum}%
                            </td>
                            <td className="p-2.5 text-slate-600 max-w-xs truncate" title={period.note}>
                              {period.note || '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {canEditSettings && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPeriod(period)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                    title="Chỉnh sửa giai đoạn"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePeriod(period.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Xóa giai đoạn"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Departments */}
      {activeTab === 'departments' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-slate-200 shadow-xs space-y-6">
          {canEditSettings && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <span className="font-bold text-slate-900 block">Thêm Mới Phòng Ban</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Mã phòng (vd: PKT)"
                  value={newDep.code}
                  onChange={e => setNewDep({ ...newDep, code: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg uppercase font-bold"
                />
                <input
                  type="text"
                  placeholder="Tên phòng ban"
                  value={newDep.name}
                  onChange={e => setNewDep({ ...newDep, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Trưởng phòng"
                  value={newDep.managerName}
                  onChange={e => setNewDep({ ...newDep, managerName: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddDepartment}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Phòng Ban</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Phòng</th>
                  <th className="px-4 py-3">Tên Phòng Ban</th>
                  <th className="px-4 py-3">Trưởng Phòng</th>
                  <th className="px-4 py-3">Mô Tả Chức Năng</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.departments.map(d => {
                  const isEditing = editingDepId === d.id && editDepData;
                  return (
                    <tr key={d.id} className={isEditing ? "bg-amber-50/60" : "hover:bg-slate-50 transition-colors"}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDepData.code}
                            onChange={e => setEditDepData({ ...editDepData, code: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded font-mono font-bold uppercase text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Mã PB"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-900">{d.code}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDepData.name}
                            onChange={e => setEditDepData({ ...editDepData, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Tên phòng ban"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{d.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDepData.managerName || ''}
                            onChange={e => setEditDepData({ ...editDepData, managerName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Trưởng phòng"
                          />
                        ) : (
                          <span className="text-slate-600">{d.managerName || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDepData.description || ''}
                            onChange={e => setEditDepData({ ...editDepData, description: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded text-slate-700 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Mô tả chức năng"
                          />
                        ) : (
                          <span className="text-slate-500">{d.description || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEditSettings && (
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveEditDepartment}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                                  title="Lưu thay đổi"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Lưu</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditDepartment}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Hủy chỉnh sửa"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditDepartment(d)}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Chỉnh sửa phòng ban"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDepartment(d.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Xóa phòng ban"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Positions */}
      {activeTab === 'positions' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-slate-200 shadow-xs space-y-6">
          {canEditSettings && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <span className="font-bold text-slate-900 block">Thêm Mới Chức Vụ / Chức Danh</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Mã chức vụ (vd: GD, TP, DEV)"
                  value={newPos.code}
                  onChange={e => setNewPos({ ...newPos, code: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg uppercase font-bold"
                />
                <input
                  type="text"
                  placeholder="Tên chức vụ"
                  value={newPos.name}
                  onChange={e => setNewPos({ ...newPos, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Phụ cấp trách nhiệm (VNĐ)"
                  value={newPos.responsibilityAllowance}
                  onChange={e => setNewPos({ ...newPos, responsibilityAllowance: Number(e.target.value) })}
                  className="px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddPosition}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Chức Vụ</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Chức Vụ</th>
                  <th className="px-4 py-3">Tên Chức Vụ</th>
                  <th className="px-4 py-3 text-right">Phụ Cấp Trách Nhiệm Định Mức</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.positions.map(p => {
                  const isEditing = editingPosId === p.id && editPosData;
                  return (
                    <tr key={p.id} className={isEditing ? "bg-amber-50/60" : "hover:bg-slate-50 transition-colors"}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPosData.code}
                            onChange={e => setEditPosData({ ...editPosData, code: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded font-mono font-bold uppercase text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Mã CV"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-900">{p.code}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editPosData.name}
                            onChange={e => setEditPosData({ ...editPosData, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            placeholder="Tên chức vụ"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{p.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPosData.responsibilityAllowance}
                            onChange={e => setEditPosData({ ...editPosData, responsibilityAllowance: Number(e.target.value) })}
                            className="w-36 ml-auto px-2.5 py-1.5 border border-amber-300 rounded font-mono font-bold text-right text-emerald-700 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-emerald-700">
                            {formatVND(p.responsibilityAllowance)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEditSettings && (
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveEditPosition}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                                  title="Lưu thay đổi"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Lưu</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditPosition}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Hủy chỉnh sửa"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPosition(p)}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Chỉnh sửa chức vụ"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePosition(p.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Xóa chức vụ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Holidays */}
      {activeTab === 'holidays' && (
        <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-slate-200 shadow-xs space-y-6">
          {canEditSettings && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <span className="font-bold text-slate-900 block">Thêm Ngày Nghỉ Lễ Trong Năm</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="date"
                  value={newHol.date}
                  onChange={e => setNewHol({ ...newHol, date: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Tên ngày nghỉ (vd: Tết Dương Lịch)"
                  value={newHol.name}
                  onChange={e => setNewHol({ ...newHol, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg md:col-span-2"
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Ngày Lễ</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ngày Nghỉ (YYYY-MM-DD)</th>
                  <th className="px-4 py-3">Tên Ngày Nghỉ Lễ / Tết</th>
                  <th className="px-4 py-3 text-center">Hưởng Nguyên Lương</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.holidays.map(h => {
                  const isEditing = editingHolId === h.id && editHolData;
                  return (
                    <tr key={h.id} className={isEditing ? "bg-amber-50/60" : "hover:bg-slate-50 transition-colors"}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editHolData.date}
                            onChange={e => setEditHolData({ ...editHolData, date: e.target.value })}
                            className="px-2.5 py-1.5 border border-amber-300 rounded font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-900">{h.date}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editHolData.name}
                            onChange={e => setEditHolData({ ...editHolData, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-amber-300 rounded font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{h.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <select
                            value={editHolData.isPaid ? 'true' : 'false'}
                            onChange={e => setEditHolData({ ...editHolData, isPaid: e.target.value === 'true' })}
                            className="px-2 py-1.5 border border-amber-300 rounded text-xs font-semibold bg-white"
                          >
                            <option value="true">Hưởng 100% Lương</option>
                            <option value="false">Không hưởng lương</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                            {h.isPaid ? 'Hưởng 100% Lương' : 'Không hưởng lương'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEditSettings && (
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveEditHoliday}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                                  title="Lưu thay đổi"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Lưu</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditHoliday}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Hủy chỉnh sửa"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Hủy</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditHoliday(h)}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Chỉnh sửa ngày lễ"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHoliday(h.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded font-semibold text-[11px] transition-colors cursor-pointer"
                                  title="Xóa ngày lễ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Tax Brackets Modal */}
      <EditTaxBracketsModal
        isOpen={isTaxBracketsModalOpen}
        onClose={() => setIsTaxBracketsModalOpen(false)}
        settings={formData}
        payrolls={[]}
        onSave={(updatedBrackets) => {
          const updated = {
            ...formData,
            taxBrackets: updatedBrackets
          };
          setFormData(updated);
          onUpdateSettings(updated);
        }}
      />

      {/* Edit Tax Exemption Modal */}
      <EditTaxExemptionModal
        isOpen={isTaxExemptionModalOpen}
        onClose={() => setIsTaxExemptionModalOpen(false)}
        settings={formData}
        onSave={(updatedRules) => {
          const updated = {
            ...formData,
            taxExemptionRules: updatedRules
          };
          setFormData(updated);
          onUpdateSettings(updated);
        }}
      />

      {/* Modal Thêm Mới / Chỉnh Sửa Giai Đoạn Đóng BHXH Theo Thời Gian */}
      {isInsurancePeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {periodForm.id ? 'Chỉnh Sửa Giai Đoạn Áp Dụng Tỷ Lệ Đóng BHXH' : 'Thêm Mới Giai Đoạn Áp Dụng Tỷ Lệ Đóng BHXH'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Căn cứ pháp lý theo từng thời điểm (từ tháng nào đến tháng nào)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInsurancePeriodModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="mt-5 space-y-4 text-xs">
              {/* Presets */}
              <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
                <span className="font-semibold text-slate-600 text-[11px]">Mẫu chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodForm(prev => ({
                      ...prev,
                      name: 'Luật BHXH chuẩn (NLĐ 10.5% - DN 23.5%)',
                      socialInsRateEmployee: 8.0,
                      healthInsRateEmployee: 1.5,
                      unemploymentInsRateEmployee: 1.0,
                      socialInsRateEmployer: 17.5,
                      healthInsRateEmployer: 3.0,
                      unemploymentInsRateEmployer: 1.0,
                      tradeUnionRateEmployer: 2.0
                    }));
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  Chuẩn Luật (10.5% / 23.5%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodForm(prev => ({
                      ...prev,
                      name: 'Hỗ trợ NQ 116 (giảm 1% BHTN DN)',
                      socialInsRateEmployee: 8.0,
                      healthInsRateEmployee: 1.5,
                      unemploymentInsRateEmployee: 1.0,
                      socialInsRateEmployer: 17.5,
                      healthInsRateEmployer: 3.0,
                      unemploymentInsRateEmployer: 0,
                      tradeUnionRateEmployer: 2.0
                    }));
                  }}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-semibold border border-amber-200 transition-colors cursor-pointer"
                >
                  Giảm 1% BHTN DN (0%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodForm(prev => ({
                      ...prev,
                      name: 'Miễn BHTN cả NLĐ và DN',
                      socialInsRateEmployee: 8.0,
                      healthInsRateEmployee: 1.5,
                      unemploymentInsRateEmployee: 0,
                      socialInsRateEmployer: 17.5,
                      healthInsRateEmployer: 3.0,
                      unemploymentInsRateEmployer: 0,
                      tradeUnionRateEmployer: 2.0
                    }));
                  }}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg font-semibold border border-rose-200 transition-colors cursor-pointer"
                >
                  Miễn BHTN cả 2 bên (0%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodForm(prev => ({
                      ...prev,
                      tradeUnionRateEmployer: 0
                    }));
                  }}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-semibold border border-blue-200 transition-colors cursor-pointer"
                >
                  Chưa có KPCĐ (0%)
                </button>
              </div>

              {/* Tên giai đoạn */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Giai Đoạn / Căn Cứ Pháp Lý *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Luật BHXH 2024 có hiệu lực, Nghị quyết 116/NQ-CP..."
                  value={periodForm.name}
                  onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Thời gian áp dụng: Từ tháng -> Đến tháng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/40 p-3.5 rounded-xl border border-purple-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Từ Tháng (Bắt đầu áp dụng) *</span>
                  </label>
                  <input
                    type="month"
                    required
                    value={periodForm.fromMonth}
                    onChange={e => setPeriodForm({ ...periodForm, fromMonth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Định dạng YYYY-MM (Ví dụ: 2026-01)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Đến Tháng (Kết thúc)
                  </label>
                  <input
                    type="month"
                    disabled={periodForm.isOngoing}
                    value={periodForm.toMonth}
                    onChange={e => setPeriodForm({ ...periodForm, toMonth: e.target.value })}
                    className={`w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                      periodForm.isOngoing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
                    }`}
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-700 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={periodForm.isOngoing}
                      onChange={e => setPeriodForm({ ...periodForm, isOngoing: e.target.checked })}
                      className="rounded text-purple-600 cursor-pointer"
                    />
                    <span className="font-semibold text-purple-900">Đang áp dụng đến nay (chưa có hạn kết thúc)</span>
                  </label>
                </div>
              </div>

              {/* Tỷ lệ trích đóng NLĐ */}
              <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-orange-200">
                  <span className="font-bold text-slate-900 text-xs">1. Tỷ Lệ Trích Đóng Người Lao Động (NLĐ)</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-lg font-mono font-black text-xs">
                    Tổng NLĐ: {((periodForm.socialInsRateEmployee || 0) + (periodForm.healthInsRateEmployee || 0) + (periodForm.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHXH NLĐ (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.socialInsRateEmployee}
                      onChange={e => setPeriodForm({ ...periodForm, socialInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHYT NLĐ (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.healthInsRateEmployee}
                      onChange={e => setPeriodForm({ ...periodForm, healthInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHTN NLĐ (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.unemploymentInsRateEmployee}
                      onChange={e => setPeriodForm({ ...periodForm, unemploymentInsRateEmployee: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tỷ lệ trích đóng DN */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                  <span className="font-bold text-slate-900 text-xs">2. Tỷ Lệ Trích Đóng Doanh Nghiệp (NSDLĐ)</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg font-mono font-black text-xs">
                    Tổng DN: {((periodForm.socialInsRateEmployer || 0) + (periodForm.healthInsRateEmployer || 0) + (periodForm.unemploymentInsRateEmployer || 0) + (periodForm.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHXH DN (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.socialInsRateEmployer}
                      onChange={e => setPeriodForm({ ...periodForm, socialInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHYT DN (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.healthInsRateEmployer}
                      onChange={e => setPeriodForm({ ...periodForm, healthInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">BHTN DN (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.unemploymentInsRateEmployer}
                      onChange={e => setPeriodForm({ ...periodForm, unemploymentInsRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">KPCĐ DN (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={100}
                      value={periodForm.tradeUnionRateEmployer}
                      onChange={e => setPeriodForm({ ...periodForm, tradeUnionRateEmployer: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi Chú / Số Hiệu Văn Bản Hướng Dẫn
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Theo Nghị định số... hoặc Quyết định của HĐQT..."
                  value={periodForm.note}
                  onChange={e => setPeriodForm({ ...periodForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* Total Callout */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900">
                  Tổng Nộp Toàn Đơn Vị Trong Giai Đoạn Này:
                </span>
                <span className="font-mono font-black text-purple-950 text-sm">
                  {((periodForm.socialInsRateEmployee || 0) + (periodForm.healthInsRateEmployee || 0) + (periodForm.unemploymentInsRateEmployee || 0) + (periodForm.socialInsRateEmployer || 0) + (periodForm.healthInsRateEmployer || 0) + (periodForm.unemploymentInsRateEmployer || 0) + (periodForm.tradeUnionRateEmployer || 0)).toFixed(1).replace(/\.0$/, '')}%
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInsurancePeriodModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{periodForm.id ? 'Cập Nhật Giai Đoạn' : 'Lưu Giai Đoạn Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
