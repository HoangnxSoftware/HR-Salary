import React, { useState } from 'react';
import { 
  Utensils, 
  Download, 
  Edit2, 
  Check, 
  X, 
  Printer, 
  Calendar, 
  Users, 
  Sparkles, 
  Layers, 
  Sun, 
  Sunset, 
  Moon, 
  Clock, 
  CheckCircle2, 
  Filter,
  DollarSign
} from 'lucide-react';
import { MealRegistration, Employee, SystemSettings, MealType, TimekeepingRecord } from '../types';
import { formatVND } from '../utils/payrollCalculator';
import * as XLSX from 'xlsx';
import { useAuthRole } from '../context/AuthRoleContext';
import { PrintMealModal } from '../components/PrintMealModal';

interface MealViewProps {
  mealRegistrations: MealRegistration[];
  employees: Employee[];
  timekeepings: TimekeepingRecord[];
  settings: SystemSettings;
  onUpdateMeal: (updated: MealRegistration) => void;
  onBatchUpdateMeals?: (meals: MealRegistration[]) => void;
}

export const MealView: React.FC<MealViewProps> = ({
  mealRegistrations,
  employees,
  timekeepings,
  settings,
  onUpdateMeal,
  onBatchUpdateMeals
}) => {
  const { canEditEmployees, canExportData } = useAuthRole();
  const currentMonthStr = `${settings.currentYear}-${String(settings.currentMonth).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Row inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    mealType: MealType;
    ratePerMeal: number;
    monthlyAllowance: number;
    registerLunch: boolean;
    registerAfternoon: boolean;
    registerDinner: boolean;
    note: string;
  }>({
    mealType: 'canteen',
    ratePerMeal: settings.standardMealPerDay || 35000,
    monthlyAllowance: settings.monthlyMealFlatRate || 1200000,
    registerLunch: true,
    registerAfternoon: false,
    registerDinner: false,
    note: ''
  });

  // Batch registration modal state
  const [batchForm, setBatchForm] = useState<{
    targetType: 'all' | 'department';
    departmentId: string;
    mealType: MealType;
    ratePerMeal: number;
    monthlyAllowance: number;
    registerLunch: boolean;
    registerAfternoon: boolean;
    registerDinner: boolean;
    note: string;
  }>({
    targetType: 'all',
    departmentId: settings.departments[0]?.id || '',
    mealType: 'canteen',
    ratePerMeal: settings.standardMealPerDay || 35000,
    monthlyAllowance: settings.monthlyMealFlatRate || 1200000,
    registerLunch: true,
    registerAfternoon: false,
    registerDinner: false,
    note: ''
  });

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  // Lọc timekeeping theo tháng đang chọn
  const tkListForMonth = timekeepings.filter(t => String(t.month) === selectedMonth || String(t.month) === String(settings.currentMonth));
  const tkMap = new Map(tkListForMonth.map(t => [t.employeeId, t]));

  // Danh sách các tháng để chọn
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const val = `${settings.currentYear}-${String(m).padStart(2, '0')}`;
    return {
      value: val,
      label: `Tháng ${m}/${settings.currentYear}`
    };
  });

  // Tìm bản ghi đăng ký ăn ca của nhân viên theo tháng đang chọn
  const getEmployeeMealReg = (empId: string): MealRegistration => {
    const found = mealRegistrations.find(
      m => m.employeeId === empId && (m.month === selectedMonth || (!m.month && selectedMonth === currentMonthStr))
    );
    if (found) return found;

    return {
      id: `meal-${empId}-${selectedMonth}`,
      employeeId: empId,
      month: selectedMonth,
      planType: 'registered',
      mealType: 'canteen',
      ratePerMeal: settings.standardMealPerDay || 35000,
      monthlyAllowance: settings.monthlyMealFlatRate || 1200000,
      registerLunch: true,
      registerAfternoon: false,
      registerDinner: false,
      note: ''
    };
  };

  const startEdit = (m: MealRegistration) => {
    setEditingId(m.id);
    const effectiveMealType = (m.mealType || (m.planType === 'registered' ? 'canteen' : m.planType) || 'canteen') as MealType;
    setEditValues({
      mealType: effectiveMealType,
      ratePerMeal: m.ratePerMeal ?? m.customRatePerMeal ?? settings.standardMealPerDay ?? 35000,
      monthlyAllowance: m.monthlyAllowance ?? m.monthlyFlatAmount ?? settings.monthlyMealFlatRate ?? 1200000,
      registerLunch: m.registerLunch !== undefined ? m.registerLunch : true,
      registerAfternoon: m.registerAfternoon ?? false,
      registerDinner: m.registerDinner ?? false,
      note: m.note || ''
    });
  };

  const saveEdit = (m: MealRegistration) => {
    const updated: MealRegistration = {
      ...m,
      month: selectedMonth,
      mealType: editValues.mealType,
      planType: editValues.mealType === 'canteen' ? 'registered' : editValues.mealType === 'cash' ? 'cash' : 'none',
      ratePerMeal: Number(editValues.ratePerMeal) || 0,
      customRatePerMeal: Number(editValues.ratePerMeal) || 0,
      monthlyAllowance: Number(editValues.monthlyAllowance) || 0,
      monthlyFlatAmount: Number(editValues.monthlyAllowance) || 0,
      registerLunch: editValues.registerLunch,
      registerAfternoon: editValues.registerAfternoon,
      registerDinner: editValues.registerDinner,
      note: editValues.note
    };
    onUpdateMeal(updated);
    setEditingId(null);
  };

  // Áp dụng đăng ký hàng loạt theo tháng
  const handleApplyBatchRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmployees = employees.filter(e => {
      if (batchForm.targetType === 'all') return true;
      return e.departmentId === batchForm.departmentId;
    });

    const updatedList: MealRegistration[] = targetEmployees.map(emp => {
      const existing = getEmployeeMealReg(emp.id);
      return {
        ...existing,
        month: selectedMonth,
        mealType: batchForm.mealType,
        planType: batchForm.mealType === 'canteen' ? 'registered' : batchForm.mealType === 'cash' ? 'cash' : 'none',
        ratePerMeal: Number(batchForm.ratePerMeal) || 0,
        customRatePerMeal: Number(batchForm.ratePerMeal) || 0,
        monthlyAllowance: Number(batchForm.monthlyAllowance) || 0,
        monthlyFlatAmount: Number(batchForm.monthlyAllowance) || 0,
        registerLunch: batchForm.registerLunch,
        registerAfternoon: batchForm.registerAfternoon,
        registerDinner: batchForm.registerDinner,
        note: batchForm.note
      };
    });

    if (onBatchUpdateMeals) {
      onBatchUpdateMeals(updatedList);
    } else {
      updatedList.forEach(m => onUpdateMeal(m));
    }

    setIsBatchModalOpen(false);
  };

  // Lọc danh sách nhân viên theo phòng ban
  const filteredEmployees = employees.filter(emp => {
    if (selectedDepartment === 'all') return true;
    return emp.departmentId === selectedDepartment;
  });

  // Tính tổng số liệu theo tháng đang chọn
  let totalCanteenMealsAll = 0;
  let totalLunchMeals = 0;
  let totalAfternoonMeals = 0;
  let totalDinnerMeals = 0;
  let totalCashMealExpense = 0;
  let totalRegisteredEmployees = 0;

  filteredEmployees.forEach(emp => {
    const reg = getEmployeeMealReg(emp.id);
    const tk = tkMap.get(emp.id);
    const effectiveType = reg.mealType || (reg.planType === 'registered' ? 'canteen' : reg.planType) || 'canteen';

    if (effectiveType === 'canteen') {
      const meals = tk?.totalMeals ?? 0;
      totalCanteenMealsAll += meals;
      totalLunchMeals += tk?.totalMealsLunch ?? meals;
      totalAfternoonMeals += tk?.totalMealsAfternoon ?? 0;
      totalDinnerMeals += tk?.totalMealsDinner ?? 0;
      totalRegisteredEmployees++;
    } else if (effectiveType === 'cash') {
      totalCashMealExpense += reg.monthlyAllowance ?? reg.monthlyFlatAmount ?? settings.monthlyMealFlatRate ?? 1200000;
      totalRegisteredEmployees++;
    }
  });

  // Xuất file Excel chi tiết
  const handleExportExcel = () => {
    const rows = filteredEmployees.map((emp, idx) => {
      const reg = getEmployeeMealReg(emp.id);
      const tk = tkMap.get(emp.id);
      const effectiveMealType = reg.mealType || (reg.planType === 'registered' ? 'canteen' : reg.planType) || 'canteen';
      const effectiveRate = reg.ratePerMeal ?? reg.customRatePerMeal ?? settings.standardMealPerDay ?? 35000;
      const effectiveAllowance = reg.monthlyAllowance ?? reg.monthlyFlatAmount ?? settings.monthlyMealFlatRate ?? 1200000;
      const actualMeals = tk?.totalMeals ?? 0;

      const registeredMealsList = [];
      if (reg.registerLunch !== false) registeredMealsList.push('Trưa');
      if (reg.registerAfternoon) registeredMealsList.push('Chiều');
      if (reg.registerDinner) registeredMealsList.push('Tối');

      const cost = effectiveMealType === 'canteen' ? actualMeals * effectiveRate :
                   effectiveMealType === 'cash' ? effectiveAllowance : 0;

      return {
        'STT': idx + 1,
        'Mã Nhân Viên': emp.employeeCode,
        'Họ và Tên': emp.fullName,
        'Phòng Ban': depMap.get(emp.departmentId) || '',
        'Tháng Áp Dụng': selectedMonth,
        'Hình Thức': effectiveMealType === 'canteen' ? 'Ăn tại bếp căng tin' : effectiveMealType === 'cash' ? 'Nhận tiền mặt' : 'Không ăn',
        'Bữa Đăng Ký': registeredMealsList.join(', ') || 'Chưa đăng ký',
        'ĐK Ăn Trưa': reg.registerLunch !== false ? 'Có' : 'Không',
        'ĐK Ăn Chiều': reg.registerAfternoon ? 'Có' : 'Không',
        'ĐK Ăn Tối': reg.registerDinner ? 'Có' : 'Không',
        'Thực Tế Bữa Trưa (Suất)': tk?.totalMealsLunch || 0,
        'Thực Tế Bữa Chiều (Suất)': tk?.totalMealsAfternoon || 0,
        'Thực Tế Bữa Tối (Suất)': tk?.totalMealsDinner || 0,
        'Tổng Suất Ăn Thực Tế': effectiveMealType === 'canteen' ? actualMeals : 0,
        'Đơn Giá / Suất (VNĐ)': effectiveRate,
        'Mức Tiền Khoán (VNĐ)': effectiveMealType === 'cash' ? effectiveAllowance : 0,
        'Thành Tiền Chi Phí (VNĐ)': cost,
        'Ghi Chú': reg.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dang_Ky_An_Ca');
    XLSX.writeFile(wb, `Dang_Ky_An_Ca_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Quản Lý Đăng Ký Ăn Ca (Trưa / Chiều / Tối)</h2>
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold text-xs font-mono">
              {selectedMonth}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý đăng ký từng bữa ăn theo tháng, tự động liên kết với tích chọn trên Bảng chấm công
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Kỳ Quản Lý:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {canEditEmployees && (
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Đăng ký nhanh cho toàn bộ nhân sự hoặc theo phòng ban"
            >
              <Layers className="w-4 h-4" />
              <span>Đăng Ký Nhanh Hàng Loạt</span>
            </button>
          )}

          {canExportData && (
            <>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="In danh sách đăng ký và sử dụng suất ăn ca"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>In Danh Sách</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Suất Ăn Phục Vụ Tại Bếp</span>
            <div className="text-2xl font-black font-mono text-amber-700 mt-1">
              {totalCanteenMealsAll} <span className="text-sm font-normal text-slate-500">suất</span>
            </div>
            <div className="text-[11px] text-amber-800 font-medium mt-1 flex items-center gap-2">
              <span>☀️ Trưa: <strong>{totalLunchMeals}</strong></span>
              <span>•</span>
              <span>🌤️ Chiều: <strong>{totalAfternoonMeals}</strong></span>
              <span>•</span>
              <span>🌙 Tối: <strong>{totalDinnerMeals}</strong></span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Chi Phí Trợ Cấp Tiền Mặt</span>
            <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
              {formatVND(totalCashMealExpense)}
            </div>
            <span className="text-slate-400 mt-0.5 block">Chi trả kèm theo bảng thanh toán lương</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Nhân Sự Đăng Ký Ăn Ca</span>
            <div className="text-2xl font-black font-mono text-blue-700 mt-1">
              {totalRegisteredEmployees} / {employees.length} <span className="text-sm font-normal text-slate-500">người</span>
            </div>
            <span className="text-blue-600 mt-0.5 block font-medium">Áp dụng trong {selectedMonth}</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Định Mức Miễn Thuế TNCN</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {formatVND(settings.monthlyMealFlatRate || 1200000)} / tháng
            </div>
            <span className="text-slate-400 mt-0.5 block">Tối đa 1.200.000 đ/tháng được miễn thuế</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter by Department */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700">Lọc Theo Phòng Ban:</span>
          <select
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800 bg-white"
          >
            <option value="all">Tất cả phòng ban ({employees.length} người)</option>
            {settings.departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Hiển thị: <strong>{filteredEmployees.length}</strong> nhân sự
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Phòng Ban</th>
                <th className="px-4 py-3">Hình Thức Đăng Ký</th>
                <th className="px-4 py-3 bg-teal-50/50 text-teal-900">Bữa Ăn Đăng Ký (Trưa / Chiều / Tối)</th>
                <th className="px-4 py-3 text-center">Bữa Thực Tế (Từ Chấm Công)</th>
                <th className="px-4 py-3 text-right">Đơn Giá / Suất</th>
                <th className="px-4 py-3 text-right">Tiền Khoán (Tiền Mặt)</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-900">Chi Phí Hưởng</th>
                <th className="px-4 py-3">Ghi Chú</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => {
                const reg = getEmployeeMealReg(emp.id);
                const tk = tkMap.get(emp.id);
                const actualMeals = tk?.totalMeals ?? 0;
                const isEditing = editingId === reg.id;

                const effectiveType = reg.mealType || (reg.planType === 'registered' ? 'canteen' : reg.planType) || 'canteen';
                const effectiveRate = reg.ratePerMeal ?? reg.customRatePerMeal ?? settings.standardMealPerDay ?? 35000;
                const effectiveAllowance = reg.monthlyAllowance ?? reg.monthlyFlatAmount ?? settings.monthlyMealFlatRate ?? 1200000;

                const currentCost = effectiveType === 'canteen' ? actualMeals * effectiveRate :
                                    effectiveType === 'cash' ? effectiveAllowance : 0;

                return (
                  <tr key={emp.id} className={isEditing ? "bg-amber-50/60" : "hover:bg-slate-50/80 transition-colors"}>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{emp.fullName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{depMap.get(emp.departmentId)}</td>

                    {/* Hình thức */}
                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <select
                          value={editValues.mealType}
                          onChange={e => setEditValues({ ...editValues, mealType: e.target.value as MealType })}
                          className="px-2.5 py-1.5 border border-amber-300 rounded font-bold text-slate-800 bg-white"
                        >
                          <option value="canteen">Ăn tại bếp căng tin</option>
                          <option value="cash">Nhận tiền mặt</option>
                          <option value="none">Không đăng ký ăn</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          effectiveType === 'canteen' ? 'bg-amber-100 text-amber-800' :
                          effectiveType === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {effectiveType === 'canteen' ? 'Ăn tại bếp' : effectiveType === 'cash' ? 'Tiền mặt' : 'Không ăn'}
                        </span>
                      )}
                    </td>

                    {/* Bữa đăng ký (Trưa / Chiều / Tối) */}
                    <td className="px-4 py-3.5 bg-teal-50/20">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editValues.registerLunch}
                              onChange={e => setEditValues({ ...editValues, registerLunch: e.target.checked })}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span>☀️ Trưa</span>
                          </label>
                          <label className="flex items-center gap-1 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editValues.registerAfternoon}
                              onChange={e => setEditValues({ ...editValues, registerAfternoon: e.target.checked })}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span>🌤️ Chiều</span>
                          </label>
                          <label className="flex items-center gap-1 font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editValues.registerDinner}
                              onChange={e => setEditValues({ ...editValues, registerDinner: e.target.checked })}
                              className="w-3.5 h-3.5 text-purple-600 rounded"
                            />
                            <span>🌙 Tối</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {reg.registerLunch !== false && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                              ☀️ Trưa
                            </span>
                          )}
                          {reg.registerAfternoon && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                              🌤️ Chiều
                            </span>
                          )}
                          {reg.registerDinner && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold text-[10px]">
                              🌙 Tối
                            </span>
                          )}
                          {reg.registerLunch === false && !reg.registerAfternoon && !reg.registerDinner && (
                            <span className="text-slate-400 italic">Không chọn bữa</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Bữa thực tế từ chấm công */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="font-extrabold font-mono text-slate-900">
                        {effectiveType === 'canteen' ? `${actualMeals} suất` : '-'}
                      </div>
                      {effectiveType === 'canteen' && (tk?.totalMealsLunch || tk?.totalMealsAfternoon || tk?.totalMealsDinner) ? (
                        <div className="text-[10px] text-teal-700 mt-0.5 font-medium">
                          Trưa: {tk.totalMealsLunch || 0} • Chiều: {tk.totalMealsAfternoon || 0} • Tối: {tk.totalMealsDinner || 0}
                        </div>
                      ) : null}
                    </td>

                    {/* Đơn giá */}
                    <td className="px-4 py-3.5 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.ratePerMeal}
                          onChange={e => setEditValues({ ...editValues, ratePerMeal: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border border-amber-300 rounded text-right font-bold"
                        />
                      ) : (
                        formatVND(effectiveRate)
                      )}
                    </td>

                    {/* Tiền khoán */}
                    <td className="px-4 py-3.5 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.monthlyAllowance}
                          onChange={e => setEditValues({ ...editValues, monthlyAllowance: Number(e.target.value) })}
                          className="w-28 px-2 py-1 border border-amber-300 rounded text-right font-bold"
                        />
                      ) : (
                        effectiveType === 'cash' ? formatVND(effectiveAllowance) : '-'
                      )}
                    </td>

                    {/* Thành tiền */}
                    <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700">
                      {formatVND(currentCost)}
                    </td>

                    {/* Ghi chú */}
                    <td className="px-4 py-3.5 text-slate-500">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.note}
                          onChange={e => setEditValues({ ...editValues, note: e.target.value })}
                          className="w-full px-2 py-1 border border-amber-300 rounded"
                          placeholder="Ghi chú"
                        />
                      ) : (
                        reg.note || '-'
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {canEditEmployees && (
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(reg)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] shadow-xs cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Lưu</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold text-[11px] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Hủy</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(reg)}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold text-[11px] cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
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

      {/* Batch Registration Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  <span>Đăng Ký Ăn Ca Hàng Loạt - {selectedMonth}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Áp dụng nhanh đăng ký bữa ăn (Trưa/Chiều/Tối) và hình thức chi trả cho nhiều nhân sự
                </p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBatchRegistration} className="space-y-4">
              {/* Phạm vi áp dụng */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">1. Đối Tượng Áp Dụng *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    batchForm.targetType === 'all' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="batchTarget"
                      checked={batchForm.targetType === 'all'}
                      onChange={() => setBatchForm({ ...batchForm, targetType: 'all' })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="font-semibold text-slate-900">Tất cả nhân sự ({employees.length} người)</span>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    batchForm.targetType === 'department' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="batchTarget"
                      checked={batchForm.targetType === 'department'}
                      onChange={() => setBatchForm({ ...batchForm, targetType: 'department' })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="font-semibold text-slate-900">Theo phòng ban cụ thể</span>
                  </label>
                </div>

                {batchForm.targetType === 'department' && (
                  <select
                    value={batchForm.departmentId}
                    onChange={e => setBatchForm({ ...batchForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold mt-1"
                  >
                    {settings.departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Hình thức */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">2. Hình Thức Chi Trả Ăn Ca *</label>
                <select
                  value={batchForm.mealType}
                  onChange={e => setBatchForm({ ...batchForm, mealType: e.target.value as MealType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="canteen">Ăn tại bếp căng tin tập thể</option>
                  <option value="cash">Chi trả trợ cấp tiền mặt</option>
                  <option value="none">Không đăng ký ăn</option>
                </select>
              </div>

              {/* Tích chọn bữa ăn */}
              <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                <label className="block font-bold text-teal-950">3. Đăng Ký Các Bữa Ăn Trong Ngày *</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer bg-white ${
                    batchForm.registerLunch ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={batchForm.registerLunch}
                        onChange={e => setBatchForm({ ...batchForm, registerLunch: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="font-bold text-slate-900">☀️ Trưa</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer bg-white ${
                    batchForm.registerAfternoon ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={batchForm.registerAfternoon}
                        onChange={e => setBatchForm({ ...batchForm, registerAfternoon: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-900">🌤️ Chiều</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer bg-white ${
                    batchForm.registerDinner ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={batchForm.registerDinner}
                        onChange={e => setBatchForm({ ...batchForm, registerDinner: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-900">🌙 Tối</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Đơn giá & mức khoán */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn Giá / Suất Ăn (Bếp)</label>
                  <input
                    type="number"
                    value={batchForm.ratePerMeal}
                    onChange={e => setBatchForm({ ...batchForm, ratePerMeal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiền Khoán (Tiền Mặt/Tháng)</label>
                  <input
                    type="number"
                    value={batchForm.monthlyAllowance}
                    onChange={e => setBatchForm({ ...batchForm, monthlyAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Áp Dụng Đăng Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Modal */}
      <PrintMealModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mealRegistrations={mealRegistrations.filter(m => m.month === selectedMonth || (!m.month && selectedMonth === currentMonthStr))}
        employees={filteredEmployees}
        timekeepings={tkListForMonth}
        settings={{
          ...settings,
          currentMonth: Number(selectedMonth.split('-')[1]) || settings.currentMonth,
          currentYear: Number(selectedMonth.split('-')[0]) || settings.currentYear
        }}
      />
    </div>
  );
};
