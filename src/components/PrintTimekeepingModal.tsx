import React from 'react';
import { Printer, X, CalendarCheck, Info } from 'lucide-react';
import { Employee, TimekeepingRecord, SystemSettings } from '../types';
import { isEmployeeActiveInMonth } from '../utils/payrollCalculator';

interface PrintTimekeepingModalProps {
  isOpen: boolean;
  onClose: () => void;
  timekeepings: TimekeepingRecord[];
  employees: Employee[];
  settings: SystemSettings;
}

export const PrintTimekeepingModal: React.FC<PrintTimekeepingModalProps> = ({
  isOpen,
  onClose,
  timekeepings,
  employees,
  settings,
}) => {
  if (!isOpen) return null;

  const year = settings.currentYear;
  const month = settings.currentMonth;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const tkMap = new Map(timekeepings.map(t => [t.employeeId, t]));

  // Check weekend / holiday
  const isWeekendDay = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d.getDay() === 0; // Chủ nhật
  };
  const isSaturday = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d.getDay() === 6; // Thứ 7
  };
  const isHoliday = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return settings.holidays.some(h => h.date === dateStr);
  };

  // Chỉ in danh sách người lao động đang làm việc trong tháng
  const activeEmployees = employees.filter(e => isEmployeeActiveInMonth(e, month, year));
  const activeEmpIds = new Set(activeEmployees.map(e => e.id));

  // Summaries
  let grandTotalWorkDays = 0;
  let grandTotalPaidLeave = 0;
  let grandTotalHolidayDays = 0;
  let grandTotalUnpaidLeave = 0;
  let grandTotalOtNormal = 0;
  let grandTotalOtWeekend = 0;
  let grandTotalOtHoliday = 0;
  let grandTotalMeals = 0;

  timekeepings.filter(t => activeEmpIds.has(t.employeeId)).forEach(t => {
    grandTotalWorkDays += t.actualWorkDays || 0;
    grandTotalPaidLeave += t.paidLeaveDays || 0;
    grandTotalHolidayDays += t.holidayDays || 0;
    grandTotalUnpaidLeave += t.unpaidLeaveDays || 0;
    grandTotalOtNormal += t.totalOtNormalHours || 0;
    grandTotalOtWeekend += t.totalOtWeekendHours || 0;
    grandTotalOtHoliday += t.totalOtHolidayHours || 0;
    grandTotalMeals += t.totalMeals || 0;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Bảng Chấm Công & Theo Dõi Tăng Ca (OT)</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Tháng {month}/{year} • {employees.length} nhân sự
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
                margin: 6mm 4mm;
              }
              body {
                visibility: hidden;
              }
              #timekeeping-print-sheet, #timekeeping-print-sheet * {
                visibility: visible;
              }
              #timekeeping-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="timekeeping-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                <div className="text-xs font-semibold text-slate-800">Kỳ chấm công: Tháng {month}/{year}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  Chuẩn: {settings.standardWorkDays} công / tháng
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BẢNG CHẤM CÔNG VÀ THEO DÕI LÀM THÊM GIỜ (OT)
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                Tháng {month} năm {year} (Tổng số nhân sự: {employees.length} người)
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-center text-[9px] print:text-[8px]">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th rowSpan={2} className="border border-slate-400 p-1 w-7">STT</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 min-w-[55px]">Mã NV</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[120px]">Họ và Tên</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[80px]">Phòng Ban</th>
                    <th colSpan={daysInMonth} className="border border-slate-400 p-0.5">
                      Các ngày trong tháng {month}/{year}
                    </th>
                    <th colSpan={4} className="border border-slate-400 p-0.5 bg-emerald-50 text-emerald-950">
                      Tổng Hợp Công (Ngày)
                    </th>
                    <th colSpan={3} className="border border-slate-400 p-0.5 bg-orange-50 text-orange-950">
                      Giờ Làm Thêm (Giờ)
                    </th>
                    <th rowSpan={2} className="border border-slate-400 p-1 min-w-[40px] bg-teal-50 text-teal-950">
                      Ăn Ca
                    </th>
                  </tr>
                  <tr>
                    {daysArray.map(day => {
                      const isSun = isWeekendDay(day);
                      const isSat = isSaturday(day);
                      const isHol = isHoliday(day);
                      return (
                        <th
                          key={day}
                          className={`border border-slate-400 p-0.5 w-[22px] ${
                            isHol ? 'bg-red-200 text-red-900' : isSun ? 'bg-red-100 text-red-800' : isSat ? 'bg-amber-50 text-amber-900' : ''
                          }`}
                        >
                          <div>{day}</div>
                          <div className="text-[7px] font-normal">
                            {isSun ? 'CN' : isSat ? 'T7' : `T${new Date(year, month - 1, day).getDay() + 1}`}
                          </div>
                        </th>
                      );
                    })}
                    {/* Columns summary */}
                    <th className="border border-slate-400 p-0.5 bg-emerald-50 text-emerald-950 min-w-[32px]">Đi làm</th>
                    <th className="border border-slate-400 p-0.5 bg-emerald-50 text-emerald-950 min-w-[28px]">Phép</th>
                    <th className="border border-slate-400 p-0.5 bg-emerald-50 text-emerald-950 min-w-[28px]">Lễ</th>
                    <th className="border border-slate-400 p-0.5 bg-emerald-50 text-emerald-950 min-w-[28px]">KL</th>
                    <th className="border border-slate-400 p-0.5 bg-orange-50 text-orange-950 min-w-[32px]">Thường</th>
                    <th className="border border-slate-400 p-0.5 bg-orange-50 text-orange-950 min-w-[32px]">CN</th>
                    <th className="border border-slate-400 p-0.5 bg-orange-50 text-orange-950 min-w-[32px]">Lễ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((emp, idx) => {
                    const tk = tkMap.get(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-0.5">{idx + 1}</td>
                        <td className="border border-slate-400 p-0.5 font-mono font-semibold">{emp.employeeCode}</td>
                        <td className="border border-slate-400 p-0.5 text-left font-semibold text-slate-900 truncate">
                          {emp.fullName}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-left text-slate-600 truncate">
                          {depMap.get(emp.departmentId) || ''}
                        </td>

                        {/* Day cells */}
                        {daysArray.map(day => {
                          const dayData = tk?.days?.[day];
                          const sym = dayData?.symbol || '';
                          const isSun = isWeekendDay(day);
                          const isHol = isHoliday(day);

                          const ot = (dayData?.otNormalHours || 0) + (dayData?.otWeekendHours || 0) + (dayData?.otHolidayHours || 0);

                          let cellBg = '';
                          if (sym === 'P') cellBg = 'bg-blue-100 font-bold text-blue-900';
                          else if (sym === 'L' || isHol) cellBg = 'bg-red-100 font-bold text-red-900';
                          else if (sym === 'K') cellBg = 'bg-slate-200 text-slate-700';
                          else if (isSun) cellBg = 'bg-slate-100 text-slate-400';
                          else if (sym === 'X') cellBg = 'font-semibold text-slate-900';

                          return (
                            <td key={day} className={`border border-slate-400 p-0.5 ${cellBg}`}>
                              <div>{sym}</div>
                              {ot > 0 && (
                                <div className="text-[7px] text-orange-600 font-bold">+{ot}h</div>
                              )}
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="border border-slate-400 p-0.5 font-bold bg-emerald-50/50 text-slate-900">
                          {tk?.actualWorkDays ?? 0}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-slate-700">
                          {tk?.paidLeaveDays || '-'}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-slate-700">
                          {tk?.holidayDays || '-'}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-slate-700">
                          {tk?.unpaidLeaveDays || '-'}
                        </td>

                        <td className="border border-slate-400 p-0.5 font-mono text-orange-700">
                          {tk?.totalOtNormalHours ? tk.totalOtNormalHours.toFixed(1) : '-'}
                        </td>
                        <td className="border border-slate-400 p-0.5 font-mono text-orange-700">
                          {tk?.totalOtWeekendHours ? tk.totalOtWeekendHours.toFixed(1) : '-'}
                        </td>
                        <td className="border border-slate-400 p-0.5 font-mono text-orange-700">
                          {tk?.totalOtHolidayHours ? tk.totalOtHolidayHours.toFixed(1) : '-'}
                        </td>

                        <td className="border border-slate-400 p-0.5 font-bold text-teal-800 bg-teal-50/50">
                          {tk?.totalMeals ?? 0}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={4} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG ({employees.length} Nhân Sự)
                    </td>
                    <td colSpan={daysInMonth} className="border border-slate-400 p-1 text-slate-600 text-left pl-2">
                      Ngày công chuẩn: {settings.standardWorkDays} ngày
                    </td>
                    <td className="border border-slate-400 p-1 bg-emerald-100 font-black">{grandTotalWorkDays.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1">{grandTotalPaidLeave.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1">{grandTotalHolidayDays.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1">{grandTotalUnpaidLeave.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1 bg-orange-100 font-mono">{grandTotalOtNormal.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1 bg-orange-100 font-mono">{grandTotalOtWeekend.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1 bg-orange-100 font-mono">{grandTotalOtHoliday.toFixed(1)}</td>
                    <td className="border border-slate-400 p-1 bg-teal-100 font-black">{grandTotalMeals}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legend notes */}
            <div className="mt-3 p-2 bg-slate-50 border border-slate-300 rounded text-[9px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-bold text-slate-800">Quy ước ký hiệu:</span>
              <span><strong>X</strong>: Đi làm cả ngày</span>
              <span><strong>1/2X</strong>: Làm nửa ngày (0.5 công)</span>
              <span><strong>P</strong>: Nghỉ phép năm hưởng lương</span>
              <span><strong>L</strong>: Nghỉ lễ, tết hưởng lương</span>
              <span><strong>O</strong>: Nghỉ ốm đau hưởng BHXH</span>
              <span><strong>TS</strong>: Thai sản</span>
              <span><strong>K</strong>: Nghỉ không lương</span>
              <span><strong>+Nh</strong>: Số giờ làm thêm ngoài giờ</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 text-center mt-6 pt-4 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-900">NGƯỜI CHẤM CÔNG</div>
                <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="font-bold uppercase text-slate-900">PHỤ TRÁCH NHÂN SỰ</div>
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
