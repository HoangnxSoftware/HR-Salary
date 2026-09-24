import React, { useState } from 'react';
import { Utensils, Download, Edit2, Check, X, Info, Printer } from 'lucide-react';
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
}

export const MealView: React.FC<MealViewProps> = ({
  mealRegistrations,
  employees,
  timekeepings,
  settings,
  onUpdateMeal
}) => {
  const { canEditEmployees, canExportData } = useAuthRole();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    mealType: MealType;
    ratePerMeal: number;
    monthlyAllowance: number;
    note: string;
  }>({
    mealType: 'canteen',
    ratePerMeal: 30000,
    monthlyAllowance: 730000,
    note: ''
  });

  const empMap = new Map(employees.map(e => [e.id, e]));
  const tkMap = new Map(timekeepings.map(t => [t.employeeId, t]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  const startEdit = (m: MealRegistration) => {
    setEditingId(m.id);
    setEditValues({
      mealType: (m.mealType || (m.planType === 'registered' ? 'canteen' : m.planType) || 'canteen') as MealType,
      ratePerMeal: m.ratePerMeal ?? m.customRatePerMeal ?? 30000,
      monthlyAllowance: m.monthlyAllowance ?? m.monthlyFlatAmount ?? 730000,
      note: m.note || ''
    });
  };


  const saveEdit = (m: MealRegistration) => {
    onUpdateMeal({
      ...m,
      mealType: editValues.mealType,
      ratePerMeal: Number(editValues.ratePerMeal) || 0,
      monthlyAllowance: Number(editValues.monthlyAllowance) || 0,
      note: editValues.note
    });
    setEditingId(null);
  };

  // Totals
  let totalCanteenMeals = 0;
  let totalCashMealExpense = 0;

  mealRegistrations.forEach(m => {
    const tk = tkMap.get(m.employeeId);
    const actualWorkDays = tk?.actualWorkDays || 22;
    if (m.mealType === 'canteen') {
      totalCanteenMeals += actualWorkDays;
    } else if (m.mealType === 'cash') {
      totalCashMealExpense += m.monthlyAllowance || 730000;
    }
  });

  const handleExportExcel = () => {
    const rows = employees.map((emp, idx) => {
      const reg: MealRegistration = mealRegistrations.find(m => m.employeeId === emp.id) || {
        id: `meal-${emp.id}`,
        employeeId: emp.id,
        mealType: 'canteen',
        ratePerMeal: 30000,
        monthlyAllowance: 730000
      };
      const tk = tkMap.get(emp.id);
      const actualMeals = tk?.totalMeals || tk?.actualWorkDays || 22;

      const effectiveMealType = reg.mealType || (reg.planType === 'registered' ? 'canteen' : reg.planType) || 'canteen';
      const effectiveRate = reg.ratePerMeal ?? reg.customRatePerMeal ?? 30000;
      const effectiveAllowance = reg.monthlyAllowance ?? reg.monthlyFlatAmount ?? 730000;


      return {
        'STT': idx + 1,
        'Mã Nhân Viên': emp.employeeCode,
        'Họ và Tên': emp.fullName,
        'Phòng Ban': depMap.get(emp.departmentId) || '',
        'Hình Thức Ăn': effectiveMealType === 'canteen' ? 'Ăn tại bếp căng tin' : effectiveMealType === 'cash' ? 'Nhận tiền mặt' : 'Không ăn',
        'Số Suất Ăn Thực Tế (Công)': effectiveMealType === 'none' ? 0 : actualMeals,
        'Đơn Giá / Suất (Bếp)': effectiveRate,
        'Tiền Trợ Cấp Tháng (Tiền mặt)': effectiveMealType === 'cash' ? effectiveAllowance : 0,
        'Thành Tiền Chi Phí Ăn Ca': effectiveMealType === 'canteen' ? actualMeals * effectiveRate : effectiveMealType === 'cash' ? effectiveAllowance : 0,
        'Ghi Chú': (reg as any).note || ''
      };

    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dang_Ky_An_Ca');
    XLSX.writeFile(wb, `Dang_Ky_An_Ca_Thang_${settings.currentMonth}_${settings.currentYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Đăng Ký Ăn Ca & Tiền Ăn Trưa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi đăng ký ăn tại bếp tập thể hoặc chi trả tiền mặt (Miễn thuế TNCN tối đa 730.000 VNĐ/tháng)
          </p>
        </div>

        {canExportData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              title="In danh sách đăng ký và sử dụng suất ăn ca"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>In Danh Sách Ăn Ca</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất Danh Sách Ăn Ca (Excel)</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Suất Ăn Phục Vụ Tại Bếp</span>
          <div className="text-xl font-black text-amber-700 mt-1">
            {totalCanteenMeals} suất / tháng
          </div>
          <span className="text-slate-400 mt-0.5 block">Đơn giá định mức: 30,000 đ/suất</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Chi Phí Trợ Cấp Tiền Mặt</span>
          <div className="text-xl font-black font-mono text-emerald-700 mt-1">
            {formatVND(totalCashMealExpense)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Chi trả kèm theo bảng thanh toán lương</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Chính Sách Thuế TNCN</span>
          <div className="text-sm font-bold text-slate-900 mt-1">
            Miễn thuế tối đa 730.000 đ/tháng
          </div>
          <span className="text-slate-400 mt-0.5 block">Phần vượt (nếu có) tính vào thu nhập chịu thuế</span>
        </div>
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
                <th className="px-4 py-3 text-center">Bữa Ăn Thực Tế (Công)</th>
                <th className="px-4 py-3 text-right">Đơn Giá Suất Ăn (Bếp)</th>
                <th className="px-4 py-3 text-right">Mức Khoán Tiền Mặt</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-900">Chi Phí Hưởng Tháng</th>
                <th className="px-4 py-3">Ghi Chú</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => {
                const reg = mealRegistrations.find(m => m.employeeId === emp.id) || {
                  id: `meal-${emp.id}`,
                  employeeId: emp.id,
                  mealType: 'canteen',
                  ratePerMeal: 30000,
                  monthlyAllowance: 730000,
                  note: ''
                };
                const tk = tkMap.get(emp.id);
                const actualMeals = tk?.totalMeals || tk?.actualWorkDays || 22;
                const isEditing = editingId === reg.id;

                const currentCost = reg.mealType === 'canteen' ? actualMeals * (reg.ratePerMeal ?? 30000) :
                                    reg.mealType === 'cash' ? (reg.monthlyAllowance ?? 730000) : 0;


                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{emp.employeeCode}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{emp.fullName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{depMap.get(emp.departmentId)}</td>
                    <td className="px-4 py-3.5">
                      {isEditing ? (
                        <select
                          value={editValues.mealType}
                          onChange={e => setEditValues({ ...editValues, mealType: e.target.value as MealType })}
                          className="px-2 py-1 border border-slate-300 rounded text-xs"
                        >
                          <option value="canteen">Ăn tại bếp đơn vị</option>
                          <option value="cash">Nhận tiền mặt</option>
                          <option value="none">Không đăng ký</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          reg.mealType === 'canteen' ? 'bg-amber-100 text-amber-800' :
                          reg.mealType === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {reg.mealType === 'canteen' ? 'Ăn tại bếp đơn vị' :
                           reg.mealType === 'cash' ? 'Nhận tiền mặt' : 'Không đăng ký'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                      {reg.mealType === 'none' ? '-' : `${actualMeals} suất`}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      {isEditing ? (
                        <input
                          type="number"
                          step={5000}
                          value={editValues.ratePerMeal}
                          onChange={e => setEditValues({ ...editValues, ratePerMeal: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                        />
                      ) : (
                        formatVND(reg.ratePerMeal)
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      {isEditing ? (
                        <input
                          type="number"
                          step={10000}
                          value={editValues.monthlyAllowance}
                          onChange={e => setEditValues({ ...editValues, monthlyAllowance: Number(e.target.value) })}
                          className="w-28 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                        />
                      ) : (
                        reg.mealType === 'cash' ? formatVND(reg.monthlyAllowance) : '-'
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                      {formatVND(currentCost)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.note}
                          onChange={e => setEditValues({ ...editValues, note: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        reg.note || '-'
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {canEditEmployees && (
                        isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(reg)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              title="Lưu"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(reg)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Điều chỉnh"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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

      {/* Modal In Danh Sách Ăn Ca */}
      <PrintMealModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mealRegistrations={mealRegistrations}
        employees={employees}
        timekeepings={timekeepings}
        settings={settings}
      />
    </div>
  );
};
