import React from 'react';
import { Printer, X, HeartHandshake } from 'lucide-react';
import { Dependent, Employee, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintDependentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependents: Dependent[];
  employees: Employee[];
  settings: SystemSettings;
}

export const PrintDependentsModal: React.FC<PrintDependentsModalProps> = ({
  isOpen,
  onClose,
  dependents,
  employees,
  settings,
}) => {
  if (!isOpen) return null;

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  const totalDeduction = dependents.reduce((sum, d) => sum + (d.deductionAmount || 4400000), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Danh Sách Người Phụ Thuộc (Giảm Trừ Gia Cảnh)</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Tổng số: {dependents.length} người phụ thuộc
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
              #dependents-print-sheet, #dependents-print-sheet * {
                visibility: visible;
              }
              #dependents-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="dependents-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                  Hồ sơ giảm trừ gia cảnh thuế TNCN
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                  Mức giảm trừ: {formatVND(settings.dependentDeduction || 4400000)} / người / tháng
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BẢNG TỔNG HỢP ĐĂNG KÝ NGƯỜI PHỤ THUỘC GIẢM TRỪ GIA CẢNH
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                Căn cứ Luật Thuế thu nhập cá nhân • Tổng số: {dependents.length} người phụ thuộc
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Tổng số người phụ thuộc:</span>{' '}
                <strong className="text-slate-900">{dependents.length} người</strong>
              </div>
              <div>
                <span className="text-slate-500">Mức giảm trừ chuẩn:</span>{' '}
                <strong className="text-slate-900 font-mono font-bold">{formatVND(settings.dependentDeduction || 4400000)}/tháng</strong>
              </div>
              <div>
                <span className="text-slate-500">Tổng mức giảm trừ hàng tháng:</span>{' '}
                <strong className="text-emerald-800 font-mono font-black">{formatVND(totalDeduction)}</strong>
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
                    <th className="border border-slate-400 p-1 text-left min-w-[130px]">Họ Tên Người Phụ Thuộc</th>
                    <th className="border border-slate-400 p-1 min-w-[90px]">Quan Hệ</th>
                    <th className="border border-slate-400 p-1 w-20">Ngày Sinh</th>
                    <th className="border border-slate-400 p-1 min-w-[110px]">Số CCCD / MST / Định Danh</th>
                    <th className="border border-slate-400 p-1 w-24">Bắt Đầu</th>
                    <th className="border border-slate-400 p-1 w-24">Kết Thúc</th>
                    <th className="border border-slate-400 p-1 text-right min-w-[100px]">Mức Giảm Trừ (VNĐ)</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[90px]">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.map((dep, idx) => {
                    const emp = empMap.get(dep.employeeId);
                    return (
                      <tr key={dep.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-1">{idx + 1}</td>
                        <td className="border border-slate-400 p-1 font-mono font-semibold">{emp?.employeeCode || '-'}</td>
                        <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{emp?.fullName || '-'}</td>
                        <td className="border border-slate-400 p-1 text-left text-slate-600">{depMap.get(emp?.departmentId || '') || ''}</td>
                        <td className="border border-slate-400 p-1 text-left font-semibold text-slate-800">{dep.fullName}</td>
                        <td className="border border-slate-400 p-1">{dep.relationship}</td>
                        <td className="border border-slate-400 p-1 font-mono">{dep.birthDate || '-'}</td>
                        <td className="border border-slate-400 p-1 font-mono">{dep.taxCodeOrId || '-'}</td>
                        <td className="border border-slate-400 p-1 font-mono">{dep.startDate || '-'}</td>
                        <td className="border border-slate-400 p-1 font-mono">{dep.endDate || 'Hiện tại'}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono font-semibold text-emerald-800">
                          {formatVND(dep.deductionAmount || 4400000)}
                        </td>
                        <td className="border border-slate-400 p-1 text-left text-slate-500 text-[9px]">{dep.note || ''}</td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={10} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG MỨC GIẢM TRỪ GIA CẢNH ({dependents.length} Người)
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-emerald-900">
                      {formatVND(totalDeduction)}
                    </td>
                    <td className="border border-slate-400 p-1"></td>
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
