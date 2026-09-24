import React from 'react';
import { Printer, X, UtensilsCrossed } from 'lucide-react';
import { Employee, MealRegistration, TimekeepingRecord, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealRegistrations: MealRegistration[];
  employees: Employee[];
  timekeepings: TimekeepingRecord[];
  settings: SystemSettings;
}

export const PrintMealModal: React.FC<PrintMealModalProps> = ({
  isOpen,
  onClose,
  mealRegistrations,
  employees,
  timekeepings,
  settings,
}) => {
  if (!isOpen) return null;

  const mealMap = new Map(mealRegistrations.map(m => [m.employeeId, m]));
  const tkMap = new Map(timekeepings.map(t => [t.employeeId, t]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  const rows = employees.map((emp, idx) => {
    const reg = mealMap.get(emp.id) || {
      id: `meal-${emp.id}`,
      employeeId: emp.id,
      mealType: 'canteen',
      ratePerMeal: 30000,
      monthlyAllowance: 730000
    };
    const tk = tkMap.get(emp.id);
    const actualMeals = tk?.totalMeals ?? tk?.actualWorkDays ?? 22;

    const effectiveMealType = reg.mealType || (reg.planType === 'registered' ? 'canteen' : reg.planType) || 'canteen';
    const effectiveRate = reg.ratePerMeal ?? reg.customRatePerMeal ?? 30000;
    const effectiveAllowance = reg.monthlyAllowance ?? reg.monthlyFlatAmount ?? 730000;

    let canteenCost = 0;
    let cashAllowance = 0;
    let totalCost = 0;

    if (effectiveMealType === 'canteen') {
      canteenCost = actualMeals * effectiveRate;
      totalCost = canteenCost;
    } else if (effectiveMealType === 'cash') {
      cashAllowance = effectiveAllowance;
      totalCost = cashAllowance;
    }

    const exemptLimit = 730000;
    const taxableCash = effectiveMealType === 'cash' ? Math.max(0, cashAllowance - exemptLimit) : 0;
    const exemptAmount = effectiveMealType === 'canteen' ? canteenCost : Math.min(cashAllowance, exemptLimit);

    return {
      idx: idx + 1,
      emp,
      mealType: effectiveMealType,
      rate: effectiveRate,
      actualMeals: effectiveMealType === 'none' ? 0 : actualMeals,
      canteenCost,
      cashAllowance,
      totalCost,
      exemptAmount,
      taxableCash,
      note: (reg as any).note || ''
    };
  });

  const grandMeals = rows.reduce((sum, r) => sum + r.actualMeals, 0);
  const grandCanteenCost = rows.reduce((sum, r) => sum + r.canteenCost, 0);
  const grandCashAllowance = rows.reduce((sum, r) => sum + r.cashAllowance, 0);
  const grandTotalCost = rows.reduce((sum, r) => sum + r.totalCost, 0);
  const grandTaxableCash = rows.reduce((sum, r) => sum + r.taxableCash, 0);

  const canteenCount = rows.filter(r => r.mealType === 'canteen').length;
  const cashCount = rows.filter(r => r.mealType === 'cash').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Bảng Đăng Ký & Sử Dụng Suất Ăn Ca</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Tháng {settings.currentMonth}/{settings.currentYear} • {employees.length} người
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: landscape;
                margin: 7mm 5mm;
              }
              body {
                visibility: hidden;
              }
              #meal-print-sheet, #meal-print-sheet * {
                visibility: visible;
              }
              #meal-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="meal-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
            {/* Enterprise Header */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-3">
              <div>
                <div className="font-black text-xs uppercase tracking-wide text-slate-900">
                  {settings.companyName}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">Địa chỉ: {settings.address}</div>
                <div className="text-[11px] text-slate-600">
                  Mã số thuế: <strong className="font-mono text-slate-900">{settings.taxCode}</strong>
                  {settings.phoneNumber && ` | Điện thoại: ${settings.phoneNumber}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">
                  Kỳ theo dõi: Tháng {settings.currentMonth}/{settings.currentYear}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                  Định mức miễn thuế: 730.000 đ/người/tháng
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BẢNG TỔNG HỢP ĐĂNG KÝ VÀ SỬ DỤNG SUẤT ĂN CA
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                Tháng {settings.currentMonth} năm {settings.currentYear} (Ăn tại bếp: {canteenCount} | Trợ cấp tiền mặt: {cashCount})
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Tổng số suất ăn tại bếp:</span>{' '}
                <strong className="text-slate-900 font-bold">{grandMeals} suất</strong>
              </div>
              <div>
                <span className="text-slate-500">Chi phí ăn tại bếp căng tin:</span>{' '}
                <strong className="text-emerald-800 font-mono font-bold">{formatVND(grandCanteenCost)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tiền trợ cấp chi bằng tiền mặt:</span>{' '}
                <strong className="text-blue-800 font-mono font-bold">{formatVND(grandCashAllowance)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tổng ngân sách ăn ca:</span>{' '}
                <strong className="text-slate-900 font-mono font-black">{formatVND(grandTotalCost)}</strong>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-center text-[10px] print:text-[8.5px]">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th className="border border-slate-400 p-1 w-8">STT</th>
                    <th className="border border-slate-400 p-1 w-20">Mã NV</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[130px]">Họ và Tên</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[100px]">Phòng Ban</th>
                    <th className="border border-slate-400 p-1 w-28">Hình Thức Ăn</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[80px]">Đơn Giá / Suất</th>
                    <th className="border border-slate-400 p-1 w-20">Số Suất Ăn Thực Tế</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[90px]">Tiền Ăn Căng Tin</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[90px]">Tiền Mặt Chi Trả</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[90px]">Tổng Chi Phí</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[80px]">Chịu Thuế (Vượt 730k)</th>
                    <th className="border border-slate-400 p-1 w-24">Ký Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.emp.id} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-1">{r.idx}</td>
                      <td className="border border-slate-400 p-1 font-mono font-semibold">{r.emp.employeeCode}</td>
                      <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{r.emp.fullName}</td>
                      <td className="border border-slate-400 p-1 text-left text-slate-600">{depMap.get(r.emp.departmentId) || ''}</td>
                      <td className="border border-slate-400 p-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                          r.mealType === 'canteen' ? 'bg-emerald-100 text-emerald-800' :
                          r.mealType === 'cash' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.mealType === 'canteen' ? 'Ăn tại bếp' : r.mealType === 'cash' ? 'Tiền mặt' : 'Không ăn'}
                        </span>
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono">
                        {r.mealType === 'canteen' ? formatVND(r.rate) : '-'}
                      </td>
                      <td className="border border-slate-400 p-1 font-bold">
                        {r.mealType === 'canteen' ? `${r.actualMeals} bữa` : '-'}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono text-emerald-800">
                        {r.canteenCost > 0 ? formatVND(r.canteenCost) : '-'}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono text-blue-800">
                        {r.cashAllowance > 0 ? formatVND(r.cashAllowance) : '-'}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                        {formatVND(r.totalCost)}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono text-red-600">
                        {r.taxableCash > 0 ? formatVND(r.taxableCash) : '-'}
                      </td>
                      <td className="border border-slate-400 p-1"></td>
                    </tr>
                  ))}

                  {/* Summary Row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={6} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG ({employees.length} Người)
                    </td>
                    <td className="border border-slate-400 p-1 font-black">{grandMeals} bữa</td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-emerald-900">
                      {formatVND(grandCanteenCost)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-blue-900">
                      {formatVND(grandCashAllowance)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-slate-950 bg-slate-300">
                      {formatVND(grandTotalCost)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-red-700">
                      {formatVND(grandTaxableCash)}
                    </td>
                    <td className="border border-slate-400 p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-4 gap-4 text-center mt-6 pt-4 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-900">NGƯỜI LẬP BIỂU</div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold uppercase text-slate-900">PHỤ TRÁCH BẾP / HCNS</div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold uppercase text-slate-900">KẾ TOÁN TRƯỞNG</div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold uppercase text-slate-900">GIÁM ĐỐC DOANH NGHIỆP</div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, đóng dấu, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
