import React from 'react';
import { Printer, X, FileSpreadsheet } from 'lucide-react';
import { Employee, PayrollRecord, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  payrolls: PayrollRecord[];
  settings: SystemSettings;
  month: string;
}

export const PrintPayrollModal: React.FC<PrintPayrollModalProps> = ({
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

  // Totals
  const totalBaseSalary = employees.reduce((sum, e) => sum + e.baseSalary, 0);
  const totalMainSalary = payrolls.reduce((sum, p) => sum + p.mainSalary, 0);
  const totalOT = payrolls.reduce((sum, p) => sum + p.otPayTaxable + p.otPayTaxExempt, 0);
  const totalGross = payrolls.reduce((sum, p) => sum + p.grossIncome, 0);
  const totalInsuranceEmp = payrolls.reduce((sum, p) => sum + p.totalInsuranceEmp, 0);
  const totalTax = payrolls.reduce((sum, p) => sum + p.personalIncomeTax, 0);
  const totalNet = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const totalCompanyInsurance = payrolls.reduce((sum, p) => sum + p.totalInsuranceEmployer, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Bảng Thanh Toán Lương Tổng Hợp</h3>
              <p className="text-xs text-slate-400">Khổ giấy A4 Ngang - Tháng {month}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payroll Sheet */}
        <div className="p-6 overflow-x-auto overflow-y-auto bg-white text-slate-800 text-[11px] print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
              body * {
                visibility: hidden;
              }
              #payroll-print-sheet, #payroll-print-sheet * {
                visibility: visible;
              }
              #payroll-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="payroll-print-sheet" className="p-4">
            {/* Header info */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-bold text-xs uppercase text-slate-700">{settings.companyName}</div>
                <div className="text-[11px] text-slate-500">Mã số thuế: {settings.taxCode}</div>
                <div className="text-[11px] text-slate-500">Địa chỉ: {settings.address}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-600 font-medium">Kỳ tính lương: Tháng {settings.currentMonth}/{settings.currentYear}</div>
                <div className="text-[10px] text-slate-400">Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>

            <div className="text-center mb-5">
              <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">
                BẢNG THANH TOÁN TIỀN LƯƠNG & CÁC KHOẢN TRÍCH THEO LƯƠNG
              </h1>
              <p className="text-xs italic text-slate-600 font-medium">
                Tháng {settings.currentMonth} năm {settings.currentYear} - Ngày công chuẩn: {settings.standardWorkDays} ngày
              </p>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-slate-400 text-center text-[10px]">
              <thead className="bg-slate-100 font-bold text-slate-900">
                <tr>
                  <th rowSpan={2} className="border border-slate-400 p-1">STT</th>
                  <th rowSpan={2} className="border border-slate-400 p-1">Mã NV</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[110px]">Họ và Tên</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[80px]">Chức Vụ</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 min-w-[85px] bg-slate-200/70">Hình thức lương</th>
                  <th rowSpan={2} className="border border-slate-400 p-1">Lương CB (HĐ)</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 min-w-[70px]">Công / Giờ / KPI</th>
                  <th colSpan={4} className="border border-slate-400 p-1 bg-emerald-50">CÁC KHOẢN THU NHẬP</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 bg-emerald-100 font-black">TỔNG GROSS</th>
                  <th colSpan={3} className="border border-slate-400 p-1 bg-amber-50">
                    TRÍCH NỘP BHXH NLĐ ({((settings.socialInsRateEmployee || 0) + (settings.healthInsRateEmployee || 0) + (settings.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%)
                  </th>
                  <th colSpan={2} className="border border-slate-400 p-1 bg-blue-50">THUẾ TNCN</th>
                  <th rowSpan={2} className="border border-slate-400 p-1">Tạm ứng</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 bg-teal-100 font-black">THỰC LĨNH</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 min-w-[70px]">Ký nhận</th>
                </tr>
                <tr>
                  <th className="border border-slate-400 p-1">Lương chính</th>
                  <th className="border border-slate-400 p-1">Làm thêm</th>
                  <th className="border border-slate-400 p-1">Phụ cấp</th>
                  <th className="border border-slate-400 p-1">Tiền ăn</th>
                  <th className="border border-slate-400 p-1">BHXH({settings.socialInsRateEmployee}%)</th>
                  <th className="border border-slate-400 p-1">BHYT({settings.healthInsRateEmployee}%)</th>
                  <th className="border border-slate-400 p-1">BHTN({settings.unemploymentInsRateEmployee}%)</th>
                  <th className="border border-slate-400 p-1">TN Chịu thuế</th>
                  <th className="border border-slate-400 p-1 text-red-600 font-bold">Thuế TNCN</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p, idx) => {
                  const emp = empMap.get(p.employeeId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-1 font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 font-mono font-bold">{emp?.employeeCode}</td>
                      <td className="border border-slate-300 p-1 text-left font-semibold">{emp?.fullName}</td>
                      <td className="border border-slate-300 p-1 text-left">{posMap.get(emp?.positionId || '')}</td>
                      <td className="border border-slate-300 p-1 text-left font-medium text-slate-800">
                        {emp?.salaryBasis === 'monthly' ? 'Lương tháng' :
                         emp?.salaryBasis === 'daily' ? 'Theo ngày công' :
                         emp?.salaryBasis === 'hourly' ? 'Theo giờ' :
                         emp?.salaryBasis === 'percent' ? `Theo KPI (${emp.salaryPercent || 100}%)` :
                         'Theo bộ phận'}
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{formatVND(p.baseSalary)}</td>
                      <td className="border border-slate-300 p-1 text-center font-bold text-emerald-900">
                        {emp?.salaryBasis === 'hourly' ? (
                          <div className="leading-tight">
                            <span className="font-mono text-emerald-950 font-black">{p.actualWorkHours ?? (p.actualPaidDays * 8)}</span>
                            <span className="text-[8.5px] font-semibold text-slate-500 block">giờ làm</span>
                          </div>
                        ) : emp?.salaryBasis === 'daily' ? (
                          <div className="leading-tight">
                            <span className="font-mono text-emerald-950 font-black">{p.actualPaidDays}</span>
                            <span className="text-[8.5px] font-semibold text-slate-500 block">ngày công</span>
                          </div>
                        ) : emp?.salaryBasis === 'percent' ? (
                          <div className="leading-tight">
                            <span className="font-mono text-emerald-950 font-black">{p.actualPaidDays} công</span>
                            <span className="text-[8.5px] font-bold text-blue-600 block">{emp.salaryPercent || 100}% KPI</span>
                          </div>
                        ) : (
                          <div className="leading-tight">
                            <span className="font-mono text-emerald-950 font-black">{p.actualPaidDays}</span>
                            <span className="text-[8.5px] font-semibold text-slate-500 block">ngày công</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{formatVND(p.mainSalary)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{formatVND(p.otPayTaxable + p.otPayTaxExempt)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{formatVND(p.taxableAllowances + p.taxExemptAllowances)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{formatVND(p.mealAllowance)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-bold bg-emerald-50 text-emerald-950">
                        {formatVND(p.grossIncome)}
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatVND(p.socialInsuranceEmp)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatVND(p.healthInsuranceEmp)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatVND(p.unempInsuranceEmp)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono text-slate-600">{formatVND(p.taxableIncome)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-bold text-red-600">{formatVND(p.personalIncomeTax)}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono">{p.advancePayment > 0 ? formatVND(p.advancePayment) : '-'}</td>
                      <td className="border border-slate-300 p-1 text-right font-mono font-black bg-teal-50 text-emerald-900">
                        {formatVND(p.netSalary)}
                      </td>
                      <td className="border border-slate-300 p-1 text-slate-300 italic">Chuyển khoản</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800 text-slate-900">
                <tr>
                  <td colSpan={5} className="border border-slate-400 p-1.5 text-center uppercase">TỔNG CỘNG</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalBaseSalary)}</td>
                  <td className="border border-slate-400 p-1.5">-</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalMainSalary)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">{formatVND(totalOT)}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">-</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono">-</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono font-black bg-emerald-100 text-emerald-950">
                    {formatVND(totalGross)}
                  </td>
                  <td colSpan={3} className="border border-slate-400 p-1.5 text-right font-mono text-red-700">
                    {formatVND(totalInsuranceEmp)}
                  </td>
                  <td className="border border-slate-400 p-1.5">-</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono font-bold text-red-700">
                    {formatVND(totalTax)}
                  </td>
                  <td className="border border-slate-400 p-1.5">-</td>
                  <td className="border border-slate-400 p-1.5 text-right font-mono font-black bg-teal-100 text-emerald-950">
                    {formatVND(totalNet)}
                  </td>
                  <td className="border border-slate-400 p-1.5"></td>
                </tr>
              </tfoot>
            </table>

            {/* Note on Enterprise Insurance Cost */}
            <div className="mt-3 flex justify-between items-center text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800">Chi phí BHXH, BHYT, BHTN, KPCĐ người sử dụng lao động chịu (23.5%):</span>{' '}
                <span className="font-mono font-bold text-slate-900">{formatVND(totalCompanyInsurance)}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Tổng ngân sách chi trả lương & bảo hiểm toàn doanh nghiệp:</span>{' '}
                <span className="font-mono font-black text-emerald-800">{formatVND(totalGross + totalCompanyInsurance)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 text-center text-xs mt-6 pt-4 border-t border-slate-300">
              <div>
                <div className="font-bold text-slate-800">NGƯỜI LẬP BIỂU</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-700">
                  {settings.reportPreparerName}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-800">KẾ TOÁN TRƯỞNG</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-700">
                  {settings.chiefAccountantName}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-800">GIÁM ĐỐC ĐƠN VỊ</div>
                <div className="text-slate-400 italic text-[10px] mt-0.5">(Ký tên, đóng dấu)</div>
                <div className="h-16 flex items-end justify-center font-bold text-slate-700">
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
