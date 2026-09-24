import React from 'react';
import { Printer, X, Users } from 'lucide-react';
import { Employee, Department, Position, SystemSettings } from '../types';
import { formatVND, getEmployeeWorkStatusDetails } from '../utils/payrollCalculator';

interface PrintEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  settings: SystemSettings;
}

export const PrintEmployeesModal: React.FC<PrintEmployeesModalProps> = ({
  isOpen,
  onClose,
  employees,
  departments,
  positions,
  settings,
}) => {
  if (!isOpen) return null;

  const depMap = new Map(departments.map(d => [d.id, d.name]));
  const posMap = new Map(positions.map(p => [p.id, p.name]));

  const totalBaseSalary = employees.reduce((sum, e) => sum + (e.baseSalary || 0), 0);
  const activeCount = employees.filter(e => e.workStatus === 'active').length;
  const probationCount = employees.filter(e => e.workStatus === 'probation').length;

  const getSalaryBasisLabel = (basis?: string) => {
    switch (basis) {
      case 'daily': return 'Theo ngày';
      case 'hourly': return 'Theo giờ';
      case 'percent': return 'Theo %';
      case 'department': return 'Theo phòng';
      case 'monthly':
      default: return 'Lương tháng';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'probation': return 'Thử việc';
      case 'suspended': return 'Tạm hoãn';
      case 'resigned': return 'Nghỉ việc';
      case 'active':
      default: return 'Chính thức';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Danh Sách Người Lao Động</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Tổng số: {employees.length} nhân viên
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
              #employees-print-sheet, #employees-print-sheet * {
                visibility: visible;
              }
              #employees-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="employees-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                <div className="text-xs font-semibold text-slate-800">Sổ quản lý nhân sự nội bộ</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                  Quy mô: {employees.length} lao động
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                DANH SÁCH HỒ SƠ NGƯỜI LAO ĐỘNG
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                (Phân loại theo phòng ban, chức vụ, mức lương thỏa thuận và hình thức trả lương)
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Tổng nhân sự:</span>{' '}
                <strong className="text-slate-900">{employees.length} người</strong>
              </div>
              <div>
                <span className="text-slate-500">Chính thức / Thử việc:</span>{' '}
                <strong className="text-slate-900">{activeCount} / {probationCount}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tổng quỹ lương ký kết:</span>{' '}
                <strong className="text-emerald-800 font-mono font-bold">{formatVND(totalBaseSalary)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Lương TB / người:</span>{' '}
                <strong className="text-slate-900 font-mono font-bold">
                  {formatVND(employees.length ? Math.round(totalBaseSalary / employees.length) : 0)}
                </strong>
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
                    <th className="border border-slate-400 p-1 w-14">Giới Tính</th>
                    <th className="border border-slate-400 p-1 w-20">Ngày Sinh</th>
                    <th className="border border-slate-400 p-1 min-w-[90px]">Số CCCD / Định Danh</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[90px]">Phòng Ban</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[90px]">Chức Vụ</th>
                    <th className="border border-slate-400 p-1 w-20">Ngày Vào</th>
                    <th className="border border-slate-400 p-1 w-20">Hình Thức</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[90px]">Lương Cơ Bản (VNĐ)</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[130px]">Tài Khoản Ngân Hàng</th>
                    <th className="border border-slate-400 p-1 w-20">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-1">{idx + 1}</td>
                      <td className="border border-slate-400 p-1 font-mono font-semibold text-slate-800">{emp.employeeCode}</td>
                      <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{emp.fullName}</td>
                      <td className="border border-slate-400 p-1">{(emp as any).gender || 'Nam'}</td>
                      <td className="border border-slate-400 p-1 font-mono">{emp.birthDate || '-'}</td>
                      <td className="border border-slate-400 p-1 font-mono">{emp.idCardNumber || '-'}</td>
                      <td className="border border-slate-400 p-1 text-left">{depMap.get(emp.departmentId) || ''}</td>
                      <td className="border border-slate-400 p-1 text-left">{posMap.get(emp.positionId) || ''}</td>
                      <td className="border border-slate-400 p-1 font-mono">{emp.startDate || '-'}</td>
                      <td className="border border-slate-400 p-1 font-semibold text-slate-700">
                        {getSalaryBasisLabel(emp.salaryBasis)}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono font-semibold text-slate-900">
                        {formatVND(emp.baseSalary)}
                      </td>
                      <td className="border border-slate-400 p-1 text-left font-mono text-[9px]">
                        {emp.bankAccount ? `${emp.bankAccount} (${emp.bankName || ''})` : '-'}
                      </td>
                      <td className="border border-slate-400 p-1 text-center">
                        {(() => {
                          const statusInfo = getEmployeeWorkStatusDetails(emp);
                          return (
                            <div>
                              <div className="font-bold text-[9px] text-slate-800">
                                {statusInfo.label}
                              </div>
                              {statusInfo.details && (
                                <div className="text-[8px] text-slate-600 font-mono">
                                  {statusInfo.details}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={10} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG QUỸ LƯƠNG ({employees.length} Người)
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-emerald-900">
                      {formatVND(totalBaseSalary)}
                    </td>
                    <td colSpan={2} className="border border-slate-400 p-1 text-slate-600"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 text-center mt-6 pt-4 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-900">NGƯỜI LẬP DANH SÁCH</div>
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
