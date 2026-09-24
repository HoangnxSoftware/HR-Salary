import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, CheckCircle } from 'lucide-react';
import { Employee, PayrollRecord, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  payrolls: PayrollRecord[];
  settings: SystemSettings;
  selectedEmployeeId?: string; // Nếu chọn 1 người thì in 1 người, nếu không thì in hàng loạt
  month: string;
}

export const PrintSlipModal: React.FC<PrintSlipModalProps> = ({
  isOpen,
  onClose,
  employees,
  payrolls,
  settings,
  selectedEmployeeId,
  month
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const targetEmployees = selectedEmployeeId
    ? employees.filter(e => e.id === selectedEmployeeId)
    : employees;

  const empPayrollMap = new Map(payrolls.map(p => [p.employeeId, p]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Actions */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">
                {selectedEmployeeId ? 'In Phiếu Lương Cá Nhân' : `In Hàng Loạt Phiếu Lương (${targetEmployees.length} nhân viên)`}
              </h3>
              <p className="text-xs text-slate-400">Tháng {month} - Phiếu thanh toán tiền lương nhân viên</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Lương (Print / Save PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Slips Content */}
        <div ref={printAreaRef} className="p-6 overflow-y-auto space-y-8 bg-slate-100 print:bg-white print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-area, #printable-area * {
                visibility: visible;
              }
              #printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .payslip-page {
                page-break-after: always;
                break-after: page;
                margin-bottom: 2rem;
              }
            }
          `}} />

          <div id="printable-area" className="space-y-8">
            {targetEmployees.map((emp) => {
              const p = empPayrollMap.get(emp.id);
              if (!p) return null;

              return (
                <div 
                  key={emp.id} 
                  className="payslip-page bg-white p-8 rounded-xl shadow-xs border border-slate-300 max-w-3xl mx-auto text-slate-800 text-sm print:border-none print:shadow-none print:p-6"
                >
                  {/* Header */}
                  <div className="border-b-2 border-slate-900 pb-4 mb-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wider text-slate-600">{settings.companyName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Địa chỉ: {settings.address}</div>
                        <div className="text-xs text-slate-500">Mã số thuế: {settings.taxCode} | ĐT: {settings.phoneNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded border border-slate-300 inline-block font-mono">
                          MÃ NV: {emp.employeeCode}
                        </div>
                      </div>
                    </div>

                    <div className="text-center mt-3">
                      <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
                        PHIẾU THANH TOÁN LƯƠNG
                      </h2>
                      <p className="text-xs font-semibold text-emerald-700 italic mt-0.5">
                        Tháng {settings.currentMonth} năm {settings.currentYear}
                      </p>
                    </div>
                  </div>

                  {/* Employee Info Grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-5 text-xs">
                    <div>
                      <span className="text-slate-500">Họ và tên:</span>{' '}
                      <span className="font-bold text-slate-900 uppercase">{emp.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Số CCCD:</span>{' '}
                      <span className="font-mono font-medium">{emp.idCardNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phòng ban:</span>{' '}
                      <span className="font-semibold text-slate-800">{depMap.get(emp.departmentId) || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Chức vụ:</span>{' '}
                      <span className="font-semibold text-slate-800">{posMap.get(emp.positionId) || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Hình thức lương:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {emp.salaryBasis === 'hourly' ? `Lương theo giờ (${formatVND(p.hourlyRateApplied || emp.hourlyRate || 0)}/h)` : (
                          emp.salaryBasis === 'daily' ? 'Theo ngày công' : (
                            emp.salaryBasis === 'percent' ? `Theo % KPI (${emp.salaryPercent || 100}%)` : 'Lương tháng cố định'
                          )
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ngày công chuẩn:</span>{' '}
                      <span className="font-medium">{p.standardDays} ngày</span>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        {emp.salaryBasis === 'hourly' ? 'Số giờ làm việc thực tế:' : 'Ngày công hưởng lương:'}
                      </span>{' '}
                      <span className="font-bold text-emerald-700">
                        {emp.salaryBasis === 'hourly' 
                          ? `${p.actualWorkHours ?? p.actualPaidDays * 8} giờ (${p.actualPaidDays} công)` 
                          : `${p.actualPaidDays} ngày`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Số tài khoản:</span>{' '}
                      <span className="font-mono font-semibold">{emp.bankAccount || 'Tiền mặt'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ngân hàng:</span>{' '}
                      <span className="font-medium">{emp.bankName || '-'}</span>
                    </div>
                  </div>

                  {/* Two-Column Salary breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-xs">
                    {/* Left: CÁC KHOẢN THU NHẬP */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="bg-slate-800 text-white px-3 py-2 font-bold uppercase tracking-wider text-[11px] flex justify-between">
                          <span>I. CÁC KHOẢN THU NHẬP</span>
                          <span>SỐ TIỀN (VNĐ)</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">
                              {emp.salaryBasis === 'hourly' ? '1. Đơn giá lương / giờ' : '1. Lương cơ bản / thỏa thuận'}
                            </span>
                            <span className="font-mono">
                              {emp.salaryBasis === 'hourly' ? `${formatVND(p.hourlyRateApplied || emp.hourlyRate || 0)}/h` : formatVND(p.baseSalary)}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">
                              {emp.salaryBasis === 'hourly' ? '2. Lương chính theo giờ' : '2. Lương chính theo ngày công'}
                            </span>
                            <span className="font-mono font-medium">{formatVND(p.mainSalary)}</span>
                          </div>

                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">3. Làm thêm giờ (chịu thuế)</span>
                            <span className="font-mono">{formatVND(p.otPayTaxable)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">4. Làm thêm giờ (miễn thuế)</span>
                            <span className="font-mono">{formatVND(p.otPayTaxExempt)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">5. Phụ cấp tính thuế TNCN</span>
                            <span className="font-mono">{formatVND(p.taxableAllowances)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">6. Phụ cấp miễn thuế (đi lại, ĐH...)</span>
                            <span className="font-mono">{formatVND(p.taxExemptAllowances)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">7. Tiền ăn trưa / ăn ca</span>
                            <span className="font-mono">{formatVND(p.mealAllowance)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 border-t border-emerald-200 flex justify-between">
                        <span>TỔNG THU NHẬP (GROSS):</span>
                        <span className="font-mono font-extrabold text-sm">{formatVND(p.grossIncome)}</span>
                      </div>
                    </div>

                    {/* Right: TRÍCH NỘP & GIẢM TRỪ */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="bg-slate-800 text-white px-3 py-2 font-bold uppercase tracking-wider text-[11px] flex justify-between">
                          <span>II. KHẤU TRỪ & THUẾ TNCN</span>
                          <span>SỐ TIỀN (VNĐ)</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">1. BHXH NLĐ đóng ({settings.socialInsRateEmployee}%)</span>
                            <span className="font-mono">{formatVND(p.socialInsuranceEmp)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">2. BHYT NLĐ đóng ({settings.healthInsRateEmployee}%)</span>
                            <span className="font-mono">{formatVND(p.healthInsuranceEmp)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">3. BHTN NLĐ đóng ({settings.unemploymentInsRateEmployee}%)</span>
                            <span className="font-mono">{formatVND(p.unempInsuranceEmp)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1 bg-amber-50/50 px-1 rounded">
                            <span className="font-semibold text-slate-700">
                              Tổng trích BHXH ({((settings.socialInsRateEmployee || 0) + (settings.healthInsRateEmployee || 0) + (settings.unemploymentInsRateEmployee || 0)).toFixed(1).replace(/\.0$/, '')}%)
                            </span>
                            <span className="font-mono font-semibold text-red-600">-{formatVND(p.totalInsuranceEmp)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">4. Giảm trừ bản thân (11tr) + NPT ({p.dependentCount} người)</span>
                            <span className="font-mono text-slate-500">{formatVND(p.personalDeduction + p.dependentDeduction)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">5. Thu nhập tính thuế TNCN</span>
                            <span className="font-mono text-slate-700">{formatVND(p.assessableIncome)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1 bg-red-50/50 px-1 rounded">
                            <span className="font-semibold text-slate-700">6. Thuế TNCN phải nộp</span>
                            <span className="font-mono font-semibold text-red-600">-{formatVND(p.personalIncomeTax)}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-600">7. Tạm ứng / Khấu trừ khác</span>
                            <span className="font-mono text-red-600">-{formatVND(p.advancePayment + p.mealDeduction + p.otherDeductions)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-red-50 px-3 py-2 font-bold text-red-900 border-t border-red-200 flex justify-between">
                        <span>TỔNG CÁC KHOẢN TRÍCH TRỪ:</span>
                        <span className="font-mono font-extrabold text-sm">
                          -{formatVND(p.totalInsuranceEmp + p.personalIncomeTax + p.advancePayment + p.mealDeduction + p.otherDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* THỰC LĨNH BOX (NET SALARY) */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl flex items-center justify-between shadow-xs mb-6">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-emerald-100 font-semibold">
                        SỐ TIỀN THỰC LĨNH (NET SALARY)
                      </div>
                      <div className="text-xs text-emerald-200 mt-0.5">
                        (Tổng thu nhập trừ Bảo hiểm, Thuế TNCN và các khoản tạm ứng/khấu trừ)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono tracking-tight">
                        {formatVND(p.netSalary)}
                      </div>
                      <div className="text-[11px] text-emerald-100 flex items-center gap-1 justify-end mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Chuyển khoản qua số TK: {emp.bankAccount || 'Tiền mặt'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 text-center text-xs pt-4 border-t border-slate-200 gap-4">
                    <div>
                      <div className="font-bold text-slate-800">NGƯỜI LẬP BIỂU</div>
                      <div className="text-slate-400 italic text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                      <div className="h-16 flex items-end justify-center font-semibold text-slate-700">
                        {settings.reportPreparerName}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">KẾ TOÁN TRƯỞNG</div>
                      <div className="text-slate-400 italic text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</div>
                      <div className="h-16 flex items-end justify-center font-semibold text-slate-700">
                        {settings.chiefAccountantName}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">NGƯỜI LAO ĐỘNG</div>
                      <div className="text-slate-400 italic text-[11px] mt-0.5">(Ký xác nhận)</div>
                      <div className="h-16 flex items-end justify-center font-semibold text-slate-700">
                        {emp.fullName}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
