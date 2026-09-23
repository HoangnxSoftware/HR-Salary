import React from 'react';
import { Printer, X, Receipt, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { Employee, PayrollRecord, SystemSettings } from '../types';
import { formatVND, calculateTaxBreakdown } from '../utils/payrollCalculator';

interface PrintTaxReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  payrolls: PayrollRecord[];
  settings: SystemSettings;
  month: string;
}

export const PrintTaxReportModal: React.FC<PrintTaxReportModalProps> = ({
  isOpen,
  onClose,
  employees,
  payrolls,
  settings,
  month
}) => {
  if (!isOpen) return null;

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  // Totals for all items
  const totalMainSalary = payrolls.reduce((sum, p) => sum + p.mainSalary, 0);
  const totalOtTaxable = payrolls.reduce((sum, p) => sum + p.otPayTaxable, 0);
  const totalTaxableAllowances = payrolls.reduce((sum, p) => sum + p.taxableAllowances, 0);
  const totalTaxableIncome = payrolls.reduce((sum, p) => sum + p.taxableIncome, 0);

  const totalOtTaxExempt = payrolls.reduce((sum, p) => sum + p.otPayTaxExempt, 0);
  const totalMealExempt = payrolls.reduce((sum, p) => sum + (p.mealAllowance || 0), 0);
  const totalExemptAllowances = payrolls.reduce((sum, p) => sum + p.taxExemptAllowances, 0);
  const totalTaxExemptIncome = payrolls.reduce((sum, p) => sum + (p.otPayTaxExempt + p.taxExemptAllowances + (p.mealAllowance || 0)), 0);

  const totalGross = payrolls.reduce((sum, p) => sum + p.grossIncome, 0);

  const totalPersonalDeduction = payrolls.reduce((sum, p) => sum + p.personalDeduction, 0);
  const totalDependentCount = payrolls.reduce((sum, p) => sum + p.dependentCount, 0);
  const totalDependentDeduction = payrolls.reduce((sum, p) => sum + p.dependentDeduction, 0);
  const totalInsuranceDeduction = payrolls.reduce((sum, p) => sum + p.totalInsuranceEmp, 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductionsForTax, 0);

  const totalAssessableIncome = payrolls.reduce((sum, p) => sum + p.assessableIncome, 0);
  const totalTax = payrolls.reduce((sum, p) => sum + p.personalIncomeTax, 0);

  const totalTaxPayers = payrolls.filter(p => p.personalIncomeTax > 0).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[96vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Bảng Tổng Hợp Tính Thuế Thu Nhập Cá Nhân (TNCN)</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Phân biệt rõ ràng các khoản chịu thuế và không chịu thuế • Tháng {month}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100 print:bg-white print:p-0">
          <div className="bg-white mx-auto p-8 rounded-xl shadow-xs print:shadow-none print:p-2 max-w-[1400px] border border-slate-200 print:border-none text-slate-900">
            {/* Enterprise Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <h1 className="font-black text-sm uppercase tracking-wide text-slate-900">
                  {settings.companyName}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">Địa chỉ: {settings.address}</p>
                <div className="flex gap-4 text-xs text-slate-600 mt-0.5">
                  <p>Mã số thuế: <strong className="font-mono text-slate-900">{settings.taxCode}</strong></p>
                  <p>Điện thoại: {settings.phoneNumber}</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <span className="font-bold block text-slate-900 uppercase">Mẫu Biểu Kê Khai Thuế TNCN</span>
                <span>Ban hành kèm TT 111/2013/TT-BTC</span>
                <span className="block mt-0.5 font-semibold text-emerald-800">Biểu lũy tiến từng phần</span>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-4">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                BẢNG TỔNG HỢP TÍNH THUẾ THU NHẬP CÁ NHÂN
              </h2>
              <p className="text-xs text-slate-600 font-medium italic mt-0.5">
                (Thu nhập từ tiền lương, tiền công • Phân biệt các khoản chịu thuế và không chịu thuế)
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full font-bold text-xs text-slate-800 border border-slate-300">
                Kỳ tính thuế: Tháng {month} (Năm {settings.currentYear}) • Ngày in: {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-4 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs print:text-[10px]">
              <div>
                <span className="text-slate-500 block">Tổng số người lao động:</span>
                <strong className="text-slate-900 font-bold">{employees.length} người</strong> (Có {totalTaxPayers} người phát sinh nộp thuế)
              </div>
              <div>
                <span className="text-slate-500 block">Tổng thu nhập phát sinh (Gross):</span>
                <strong className="text-slate-900 font-mono font-bold">{formatVND(totalGross)}</strong>
              </div>
              <div>
                <span className="text-emerald-700 block font-semibold">Thu nhập không chịu thuế (Miễn thuế):</span>
                <strong className="text-emerald-800 font-mono font-bold">{formatVND(totalTaxExemptIncome)}</strong>
              </div>
              <div className="bg-red-50 p-1.5 rounded border border-red-200">
                <span className="text-red-700 block font-semibold">TỔNG THUẾ TNCN PHẢI KHẤU TRỪ:</span>
                <strong className="text-red-700 font-mono font-black text-sm">{formatVND(totalTax)}</strong>
              </div>
            </div>

            {/* Comprehensive Tax Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[10px] print:text-[8px] text-left">
                <thead>
                  {/* Top Header Group */}
                  <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                    <th colSpan={5} className="border border-slate-400 p-1">I. THÔNG TIN NHÂN SỰ</th>
                    <th colSpan={4} className="border border-slate-400 p-1 bg-amber-100 text-amber-950">II. CÁC KHOẢN CHỊU THUẾ</th>
                    <th colSpan={4} className="border border-slate-400 p-1 bg-emerald-100 text-emerald-950">III. CÁC KHOẢN KHÔNG CHỊU THUẾ (MIỄN THUẾ)</th>
                    <th className="border border-slate-400 p-1 bg-slate-300 text-slate-950">IV. TỔNG TN</th>
                    <th colSpan={4} className="border border-slate-400 p-1 bg-blue-100 text-blue-950">V. CÁC KHOẢN GIẢM TRỪ</th>
                    <th colSpan={3} className="border border-slate-400 p-1 bg-red-100 text-red-950">VI. NGHĨA VỤ THUẾ TNCN</th>
                    <th className="border border-slate-400 p-1">VII.</th>
                  </tr>
                  
                  {/* Sub Header Columns */}
                  <tr className="bg-slate-100 text-slate-800 text-center font-semibold">
                    <th className="border border-slate-400 p-1 min-w-[24px]">STT</th>
                    <th className="border border-slate-400 p-1 min-w-[50px]">Mã NV</th>
                    <th className="border border-slate-400 p-1 min-w-[120px] text-left">Họ và Tên</th>
                    <th className="border border-slate-400 p-1 min-w-[90px] text-left">Phòng Ban</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] font-mono">MST TNCN</th>

                    {/* Chịu thuế */}
                    <th className="border border-slate-400 p-1 min-w-[65px] bg-amber-50 text-right">Lương Chính</th>
                    <th className="border border-slate-400 p-1 min-w-[60px] bg-amber-50 text-right">OT Chịu Thuế (100%)</th>
                    <th className="border border-slate-400 p-1 min-w-[60px] bg-amber-50 text-right">Phụ Cấp Tính Thuế</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-amber-100 font-bold text-amber-950 text-right">TỔNG CHỊU THUẾ [1]</th>

                    {/* Không chịu thuế / Miễn thuế */}
                    <th className="border border-slate-400 p-1 min-w-[60px] bg-emerald-50 text-right">OT Vượt Mức Miễn Thuế</th>
                    <th className="border border-slate-400 p-1 min-w-[55px] bg-emerald-50 text-right">Ăn Ca Định Mức</th>
                    <th className="border border-slate-400 p-1 min-w-[55px] bg-emerald-50 text-right">Phụ Cấp Miễn Thuế</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-emerald-100 font-bold text-emerald-950 text-right">TỔNG MIỄN THUẾ [2]</th>

                    {/* Tổng Gross */}
                    <th className="border border-slate-400 p-1 min-w-[75px] font-bold bg-slate-200 text-right">TỔNG THU NHẬP [3]=[1]+[2]</th>

                    {/* Giảm trừ */}
                    <th className="border border-slate-400 p-1 min-w-[65px] bg-blue-50 text-right">Bản Thân</th>
                    <th className="border border-slate-400 p-1 min-w-[30px] bg-blue-50">NPT</th>
                    <th className="border border-slate-400 p-1 min-w-[60px] bg-blue-50 text-right">Giảm NPT</th>
                    <th className="border border-slate-400 p-1 min-w-[65px] bg-blue-50 text-right">BHXH 10.5%</th>

                    {/* Thuế */}
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-red-50 text-right font-bold text-slate-900">TN TÍNH THUẾ [4]</th>
                    <th className="border border-slate-400 p-1 min-w-[35px] bg-red-50">Bậc Max</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-red-100 font-black text-red-700 text-right">THUẾ KHẤU TRỪ [5]</th>
                    
                    <th className="border border-slate-400 p-1 min-w-[45px]">Ký Nhận</th>
                  </tr>
                </thead>

                <tbody>
                  {payrolls.map((p, idx) => {
                    const emp = empMap.get(p.employeeId);
                    const exempt = p.otPayTaxExempt + p.taxExemptAllowances + (p.mealAllowance || 0);
                    const breakdown = calculateTaxBreakdown(p.assessableIncome, settings.taxBrackets);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-1 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-400 p-1 font-mono font-bold">{emp?.employeeCode}</td>
                        <td className="border border-slate-400 p-1 font-semibold whitespace-nowrap">{emp?.fullName}</td>
                        <td className="border border-slate-400 p-1 whitespace-nowrap">{depMap.get(emp?.departmentId || '')}</td>
                        <td className="border border-slate-400 p-1 font-mono">{emp?.taxId || '-'}</td>

                        {/* Chịu thuế */}
                        <td className="border border-slate-400 p-1 text-right font-mono bg-amber-50/40">{formatVND(p.mainSalary)}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-amber-50/40">
                          {p.otPayTaxable > 0 ? formatVND(p.otPayTaxable) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-amber-50/40">
                          {p.taxableAllowances > 0 ? formatVND(p.taxableAllowances) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono font-bold bg-amber-100/60 text-amber-950">
                          {formatVND(p.taxableIncome)}
                        </td>

                        {/* Miễn thuế */}
                        <td className="border border-slate-400 p-1 text-right font-mono bg-emerald-50/40 text-emerald-800">
                          {p.otPayTaxExempt > 0 ? formatVND(p.otPayTaxExempt) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-emerald-50/40 text-emerald-800">
                          {p.mealAllowance > 0 ? formatVND(p.mealAllowance) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-emerald-50/40 text-emerald-800">
                          {p.taxExemptAllowances > 0 ? formatVND(p.taxExemptAllowances) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono font-bold bg-emerald-100/60 text-emerald-950">
                          {formatVND(exempt)}
                        </td>

                        {/* Tổng thu nhập */}
                        <td className="border border-slate-400 p-1 text-right font-mono font-bold bg-slate-100">
                          {formatVND(p.grossIncome)}
                        </td>

                        {/* Giảm trừ */}
                        <td className="border border-slate-400 p-1 text-right font-mono bg-blue-50/30">{formatVND(p.personalDeduction)}</td>
                        <td className="border border-slate-400 p-1 text-center font-bold bg-blue-50/30">{p.dependentCount || '-'}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-blue-50/30">
                          {p.dependentDeduction > 0 ? formatVND(p.dependentDeduction) : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono bg-blue-50/30">{formatVND(p.totalInsuranceEmp)}</td>

                        {/* Thuế */}
                        <td className="border border-slate-400 p-1 text-right font-mono font-bold text-slate-900 bg-red-50/30">
                          {formatVND(p.assessableIncome)}
                        </td>
                        <td className="border border-slate-400 p-1 text-center font-mono font-bold text-slate-700 bg-red-50/30">
                          {breakdown.highestBracket > 0 ? `B${breakdown.highestBracket}` : '-'}
                        </td>
                        <td className="border border-slate-400 p-1 text-right font-mono font-black text-red-700 bg-red-100/60">
                          {p.personalIncomeTax > 0 ? formatVND(p.personalIncomeTax) : '0 đ'}
                        </td>

                        <td className="border border-slate-400 p-1 text-center text-slate-300"></td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand Totals */}
                <tfoot className="bg-slate-200 font-bold border-t-2 border-slate-900">
                  <tr>
                    <td colSpan={5} className="border border-slate-400 p-1.5 text-center uppercase tracking-wider">
                      TỔNG CỘNG TOÀN DOANH NGHIỆP ({payrolls.length} NV)
                    </td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalMainSalary)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalOtTaxable)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalTaxableAllowances)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono font-black bg-amber-200 text-amber-950">
                      {formatVND(totalTaxableIncome)}
                    </td>

                    <td className="border border-slate-400 p-1.5 text-right font-mono text-emerald-800">{formatVND(totalOtTaxExempt)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono text-emerald-800">{formatVND(totalMealExempt)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono text-emerald-800">{formatVND(totalExemptAllowances)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono font-black bg-emerald-200 text-emerald-950">
                      {formatVND(totalTaxExemptIncome)}
                    </td>

                    <td className="border border-slate-400 p-1.5 text-right font-mono font-black bg-slate-300">
                      {formatVND(totalGross)}
                    </td>

                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalPersonalDeduction)}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono">{totalDependentCount}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalDependentDeduction)}</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalInsuranceDeduction)}</td>

                    <td className="border border-slate-400 p-1.5 text-right font-mono font-black text-slate-900 bg-red-100">
                      {formatVND(totalAssessableIncome)}
                    </td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono">-</td>
                    <td className="border border-slate-400 p-1.5 text-right font-mono font-black text-red-700 bg-red-200 text-xs">
                      {formatVND(totalTax)}
                    </td>
                    <td className="border border-slate-400 p-1.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Legal References & Tax Explanations */}
            {(() => {
              const exRules = settings.taxExemptionRules;
              const otDesc = exRules?.otExemptMode === 'fully_exempt'
                ? 'Toàn bộ tiền làm thêm giờ (100%) được miễn thuế theo chính sách ưu đãi'
                : exRules?.otExemptMode === 'fully_taxable'
                ? 'Toàn bộ tiền làm thêm giờ được tính vào thu nhập chịu thuế'
                : exRules?.otExemptMode === 'custom_rate'
                ? `Tiền làm thêm giờ được miễn thuế theo tỷ lệ ${exRules.otCustomExemptRate}%`
                : 'Phần tiền lương làm thêm giờ vượt mức so với đơn giá ngày thường (chênh lệch 50% ngày thường, 100% ngày nghỉ tuần, 200% ngày lễ)';

              const mealDesc = exRules?.mealExemptMode === 'fully_exempt'
                ? 'Miễn thuế toàn bộ tiền ăn ca chi bằng tiền'
                : exRules?.mealExemptMode === 'fully_taxable'
                ? 'Tính thuế toàn bộ tiền ăn ca chi bằng tiền'
                : `Tiền ăn ca chi bằng tiền mặt được miễn thuế tối đa ${formatVND(exRules?.mealExemptMonthlyCap || 730000)}/tháng (phần vượt mức tính vào thu nhập chịu thuế)`;

              const uniformDesc = exRules?.uniformExemptMode === 'fully_exempt'
                ? 'Miễn thuế toàn bộ phụ cấp trang phục'
                : exRules?.uniformExemptMode === 'fully_taxable'
                ? 'Tính thuế toàn bộ phụ cấp trang phục'
                : `Phụ cấp trang phục chi bằng tiền được miễn thuế tối đa ${formatVND(exRules?.uniformExemptMonthlyCap || 416667)}/tháng (~5,000,000 đ/năm)`;

              return (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded text-[9px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 text-[10px] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>Căn cứ pháp lý & Quy định miễn thuế TNCN áp dụng:</span>
                    </span>
                    <span className="font-mono text-slate-500 font-normal">
                      {exRules?.legalNote || 'Luật Thuế TNCN, TT 111/2013/TT-BTC & TT 26/2016/TT-BLĐTBXH'}
                    </span>
                  </div>
                  <p>
                    <strong>1. Khoản chịu thuế:</strong> Tiền lương thời gian/sản phẩm; phần tiền tăng ca tính thuế; phụ cấp trách nhiệm, chuyên cần, chức vụ, hiệu quả kinh doanh và các khoản vượt mức định mức miễn thuế.
                  </p>
                  <p>
                    <strong>2. Khoản miễn thuế / không chịu thuế:</strong> {otDesc}; {mealDesc}; {uniformDesc}; phụ cấp điện thoại, xăng xe công tác phí khoán chi theo quy chế nội bộ.
                  </p>
                  <p>
                    <strong>3. Giảm trừ gia cảnh:</strong> Bản thân người nộp thuế: {formatVND(settings.personalDeduction || 11000000)}/tháng; Giảm trừ mỗi người phụ thuộc: {formatVND(settings.dependentDeduction || 4400000)}/tháng; Các khoản bảo hiểm bắt buộc trích nộp từ lương NLĐ ({((settings.socialInsRateEmployee || 8) + (settings.healthInsRateEmployee || 1.5) + (settings.unemploymentInsRateEmployee || 1)).toFixed(1).replace(/\.0$/, '')}%).
                  </p>
                </div>
              );
            })()}

            {/* Signature Block */}
            <div className="grid grid-cols-3 text-center text-xs mt-6 pt-4 border-t border-slate-300">
              <div>
                <div className="font-bold text-slate-900 uppercase">NGƯỜI LẬP BIỂU</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-800">
                  {settings.reportPreparerName}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">KẾ TOÁN TRƯỞNG</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-800">
                  {settings.chiefAccountantName}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900 uppercase">GIÁM ĐỐC ĐƠN VỊ</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký tên, đóng dấu)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-800">
                  {settings.directorName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
