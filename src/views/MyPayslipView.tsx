import React from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  User, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Receipt,
  Utensils,
  Gift,
  Building2,
  Phone
} from 'lucide-react';
import { Employee, PayrollRecord, SystemSettings, TimekeepingRecord } from '../types';
import { formatVND } from '../utils/payrollCalculator';
import { useAuthRole } from '../context/AuthRoleContext';

interface MyPayslipViewProps {
  employees: Employee[];
  payrolls: PayrollRecord[];
  timekeepings: TimekeepingRecord[];
  settings: SystemSettings;
  onPrintSlip: (empId: string) => void;
}

export const MyPayslipView: React.FC<MyPayslipViewProps> = ({
  employees,
  payrolls,
  timekeepings,
  settings,
  onPrintSlip
}) => {
  const { selectedEmployeeIdForSelf, currentUser } = useAuthRole();

  // Find employee corresponding to the logged in user
  const currentEmpId = currentUser?.employeeId || selectedEmployeeIdForSelf || employees[0]?.id;
  const currentEmp = employees.find(e => e.id === currentEmpId) || employees[0];
  const currentPayroll = payrolls.find(p => p.employeeId === currentEmp?.id);
  const currentTk = timekeepings.find(t => t.employeeId === currentEmp?.id);

  const dep = settings.departments.find(d => d.id === currentEmp?.departmentId)?.name || 'Chưa phân bổ';
  const pos = settings.positions.find(p => p.id === currentEmp?.positionId)?.name || 'Chưa thiết lập';

  if (!currentEmp || !currentPayroll) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto my-12">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Không tìm thấy thông tin phiếu lương</h3>
        <p className="text-xs text-slate-500 mt-1">
          Hồ sơ của bạn chưa được liên kết với mã nhân viên hoặc chưa có dữ liệu tính lương tháng {settings.currentMonth}/{settings.currentYear}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-3">
              <Calendar className="w-3.5 h-3.5" />
              <span>Phiếu Lương Tháng {settings.currentMonth}/{settings.currentYear}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Xin chào, {currentEmp.fullName}!
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
              Mã NV: <strong className="font-mono text-white">{currentEmp.employeeCode}</strong> • Phòng ban: <strong className="text-white">{dep}</strong> • Chức vụ: <strong className="text-white">{pos}</strong>
            </p>
          </div>

          <div className="text-left md:text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <span className="text-xs text-emerald-100 uppercase tracking-wider block font-semibold">
              Thực Lĩnh (Net Salary):
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-white block mt-0.5">
              {formatVND(currentPayroll.netSalary)}
            </span>
            <div className="mt-2 flex items-center md:justify-end gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                currentPayroll.paymentStatus === 'paid' ? 'bg-white text-emerald-800' :
                currentPayroll.paymentStatus === 'approved' ? 'bg-blue-100 text-blue-900' :
                'bg-amber-100 text-amber-900'
              }`}>
                {currentPayroll.paymentStatus === 'paid' ? '✓ Đã thanh toán ngân hàng' :
                 currentPayroll.paymentStatus === 'approved' ? '✓ Đã phê duyệt chi' : 'Dự thảo tính toán'}
              </span>

              <button
                onClick={() => onPrintSlip(currentEmp.id)}
                className="px-3 py-1 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Phiếu Lương</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards: 4 Summary Pillars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[11px]">Tổng Thu Nhập (Gross):</span>
          <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
            {formatVND(currentPayroll.grossIncome)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Lương chính + OT + Phụ cấp</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[11px]">BHXH Cá Nhân (10.5%):</span>
          <span className="text-lg font-black font-mono text-red-600 mt-1 block">
            {formatVND(currentPayroll.totalInsuranceEmp)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">BHXH 8%, BHYT 1.5%, BHTN 1%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[11px]">Thuế TNCN Khấu Trừ:</span>
          <span className="text-lg font-black font-mono text-amber-600 mt-1 block">
            {formatVND(currentPayroll.personalIncomeTax)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Giảm trừ NPT: {currentPayroll.dependentCount} người
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block text-[11px]">Công Thực Tế / Chuẩn:</span>
          <span className="text-lg font-black font-mono text-blue-600 mt-1 block">
            {currentPayroll.actualPaidDays} / {currentPayroll.standardDays} ngày
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Tăng ca: {(currentTk?.totalOtNormalHours || 0) + (currentTk?.totalOtWeekendHours || 0) + (currentTk?.totalOtHolidayHours || 0)} giờ
          </span>
        </div>
      </div>

      {/* Chi tiết thu nhập & các khoản trừ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Box 1: CÁC KHOẢN THU NHẬP */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
            <h3 className="font-bold text-emerald-950 flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>1. Chi Tiết Thu Nhập Trong Tháng</span>
            </h3>
            <span className="font-mono font-bold text-emerald-800">
              {formatVND(currentPayroll.grossIncome)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Lương Cơ Bản / Hợp Đồng</span>
                <span className="text-[11px] text-slate-500">Mức lương thỏa thuận trên HĐLĐ</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{formatVND(currentPayroll.baseSalary)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Lương Theo Ngày Công Thực Tế</span>
                <span className="text-[11px] text-slate-500">
                  {currentPayroll.actualPaidDays} công / {currentPayroll.standardDays} ngày chuẩn
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900">{formatVND(currentPayroll.mainSalary)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Tiền Làm Thêm Giờ (OT)</span>
                <span className="text-[11px] text-slate-500">
                  Chịu thuế: {formatVND(currentPayroll.otPayTaxable)} • Miễn thuế: {formatVND(currentPayroll.otPayTaxExempt)}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                {formatVND(currentPayroll.otPayTaxable + currentPayroll.otPayTaxExempt)}
              </span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Phụ Cấp Chịu Thuế</span>
                <span className="text-[11px] text-slate-500">Trách nhiệm, chuyên cần, chức vụ...</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{formatVND(currentPayroll.taxableAllowances)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Phụ Cấp Miễn Thuế</span>
                <span className="text-[11px] text-slate-500">Ăn trưa, xăng xe, điện thoại trong định mức</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{formatVND(currentPayroll.taxExemptAllowances)}</span>
            </div>
          </div>
        </div>

        {/* Box 2: CÁC KHOẢN KHẤU TRỪ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-red-50/70 border-b border-red-100 flex items-center justify-between">
            <h3 className="font-bold text-red-950 flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-red-600" />
              <span>2. Chi Tiết Các Khoản Khấu Trừ</span>
            </h3>
            <span className="font-mono font-bold text-red-800">
              {formatVND(currentPayroll.grossIncome - currentPayroll.netSalary)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Bảo Hiểm Xã Hội (8%)</span>
                <span className="text-[11px] text-slate-500">Lương đóng: {formatVND(currentPayroll.insuranceSalary)}</span>
              </div>
              <span className="font-mono font-bold text-red-600">{formatVND(currentPayroll.socialInsuranceEmp)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Bảo Hiểm Y Tế (1.5%)</span>
                <span className="text-[11px] text-slate-500">Trích theo tỷ lệ quy định</span>
              </div>
              <span className="font-mono font-bold text-red-600">{formatVND(currentPayroll.healthInsuranceEmp)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Bảo Hiểm Thất Nghiệp (1%)</span>
                <span className="text-[11px] text-slate-500">Trích quỹ BHTN</span>
              </div>
              <span className="font-mono font-bold text-red-600">{formatVND(currentPayroll.unempInsuranceEmp)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Thuế Thu Nhập Cá Nhân (TNCN)</span>
                <span className="text-[11px] text-slate-500">
                  Thu nhập tính thuế: {formatVND(currentPayroll.assessableIncome)}
                </span>
              </div>
              <span className="font-mono font-bold text-red-600">{formatVND(currentPayroll.personalIncomeTax)}</span>
            </div>

            <div className="py-2.5 px-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Khấu Trừ Tiền Ăn / Tạm Ứng</span>
                <span className="text-[11px] text-slate-500">Tiền ăn ca trừ lương: {formatVND(currentPayroll.mealDeduction)}</span>
              </div>
              <span className="font-mono font-bold text-red-600">
                {formatVND(currentPayroll.advancePayment + currentPayroll.mealDeduction)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin hồ sơ & Hỗ trợ nội bộ */}
      <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-800 block">Bạn có thắc mắc về bảng tính lương này?</span>
          <span className="text-slate-500">
            Vui lòng liên hệ Phòng Kế toán / Nhân sự ({settings.reportPreparerName}) hoặc Kế toán trưởng ({settings.chiefAccountantName}).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${settings.phoneNumber}`}
            className="px-3 py-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 font-semibold transition-colors flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hotline: {settings.phoneNumber}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
