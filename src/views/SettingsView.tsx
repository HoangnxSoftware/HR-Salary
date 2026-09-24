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
  Sliders
} from 'lucide-react';
import { SystemSettings, Department, Position, Holiday, SalaryCalculationBasis, FixedDaysOffPolicy, TaxBracket, TaxExemptionRules } from '../types';
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
                {formData.departments.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{d.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{d.name}</td>
                    <td className="px-4 py-3 text-slate-600">{d.managerName || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{d.description || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {canEditSettings && (
                        <button
                          onClick={() => handleDeleteDepartment(d.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
                {formData.positions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                      {formatVND(p.responsibilityAllowance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEditSettings && (
                        <button
                          onClick={() => handleDeletePosition(p.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
                {formData.holidays.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{h.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{h.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                        Hưởng 100% Lương
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEditSettings && (
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
    </div>
  );
};
