import React from 'react';
import { Printer, X, Award } from 'lucide-react';
import { Employee, SpecialAllowance, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintAllowancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialAllowances: SpecialAllowance[];
  employees: Employee[];
  settings: SystemSettings;
}

export const PrintAllowancesModal: React.FC<PrintAllowancesModalProps> = ({
  isOpen,
  onClose,
  specialAllowances,
  employees,
  settings,
}) => {
  if (!isOpen) return null;

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  const totalAmount = specialAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const taxableAmount = specialAllowances.filter(a => a.isTaxable).reduce((sum, a) => sum + (a.amount || 0), 0);
  const exemptAmount = specialAllowances.filter(a => !a.isTaxable).reduce((sum, a) => sum + (a.amount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Danh Sách Phụ Cấp Đặc Thù</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • {specialAllowances.length} khoản phụ cấp • Kỳ tháng {settings.currentMonth}/{settings.currentYear}
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
              #allowances-print-sheet, #allowances-print-sheet * {
                visibility: visible;
              }
              #allowances-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="allowances-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                  Kỳ chi trả: Tháng {settings.currentMonth}/{settings.currentYear}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                  Tổng số mục phụ cấp: {specialAllowances.length}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BẢNG TỔNG HỢP CÁC KHOẢN PHỤ CẤP ĐẶC THÙ & HỖ TRỢ
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                (Phân biệt phụ cấp chịu thuế TNCN & phụ cấp thuộc diện miễn thuế theo chế độ)
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Phụ cấp chịu thuế TNCN:</span>{' '}
                <strong className="text-red-700 font-mono font-bold">{formatVND(taxableAmount)}</strong>
              </div>
              <div>
                <span className="text-emerald-700 font-medium">Phụ cấp miễn thuế TNCN:</span>{' '}
                <strong className="text-emerald-800 font-mono font-bold">{formatVND(exemptAmount)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Tổng chi trả phụ cấp:</span>{' '}
                <strong className="text-slate-900 font-mono font-black">{formatVND(totalAmount)}</strong>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-center text-[10px] print:text-[8.5px]">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th className="border border-slate-400 p-1 w-8">STT</th>
                    <th className="border border-slate-400 p-1 w-20">Mã NV</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[130px]">Họ và Tên Nhân Viên</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[100px]">Phòng Ban</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[100px]">Chức Vụ</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[140px]">Tên Khoản Phụ Cấp</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[100px]">Số Tiền (VNĐ)</th>
                    <th className="border border-slate-400 p-1 w-28">Tính Thuế TNCN</th>
                    <th className="border border-slate-400 p-1 w-24">Tháng Áp Dụng</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[120px]">Ghi Chú</th>
                    <th className="border border-slate-400 p-1 w-24">Ký Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {specialAllowances.map((item, idx) => {
                    const emp = empMap.get(item.employeeId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-1">{idx + 1}</td>
                        <td className="border border-slate-400 p-1 font-mono font-semibold">{emp?.employeeCode || '-'}</td>
                        <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{emp?.fullName || '-'}</td>
                        <td className="border border-slate-400 p-1 text-left text-slate-600">{depMap.get(emp?.departmentId || '') || ''}</td>
                        <td className="border border-slate-400 p-1 text-left text-slate-600">{posMap.get(emp?.positionId || '') || ''}</td>
                        <td className="border border-slate-400 p-1 text-left font-semibold text-slate-800">{item.name}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono font-bold text-slate-900">
                          {formatVND(item.amount)}
                        </td>
                        <td className="border border-slate-400 p-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                            item.isTaxable ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.isTaxable ? 'Có tính thuế' : 'Miễn thuế'}
                          </span>
                        </td>
                        <td className="border border-slate-400 p-1 font-mono">{item.month}</td>
                        <td className="border border-slate-400 p-1 text-left text-slate-500 text-[9px]">{item.note || ''}</td>
                        <td className="border border-slate-400 p-1"></td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={6} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG CHI TRẢ PHỤ CẤP ({specialAllowances.length} Khoản)
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-emerald-900">
                      {formatVND(totalAmount)}
                    </td>
                    <td colSpan={4} className="border border-slate-400 p-1 text-left text-[9px] text-slate-600 pl-2">
                      (Chịu thuế: {formatVND(taxableAmount)} | Miễn thuế: {formatVND(exemptAmount)})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 text-center mt-6 pt-4 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-900">NGƯỜI LẬP BIỂU</div>
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
