import React from 'react';
import { Printer, X, Calendar, TrendingUp } from 'lucide-react';
import { Employee, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

export interface AnnualEmployeeData {
  employee: Employee;
  departmentName: string;
  positionName: string;
  statusLabel: string;
  monthlyNet: { [month: number]: number };
  totalBaseSalaryYear: number;
  totalGrossYear: number;
  totalOtYear: number;
  totalInsuranceEmpYear: number;
  totalTaxYear: number;
  totalNetYear: number;
  avgMonthlyNet: number;
}

interface PrintAnnualPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  annualData: AnnualEmployeeData[];
  year: number;
  settings: SystemSettings;
}

export const PrintAnnualPayrollModal: React.FC<PrintAnnualPayrollModalProps> = ({
  isOpen,
  onClose,
  annualData,
  year,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Grand totals
  const totalBaseAll = annualData.reduce((sum, d) => sum + d.totalBaseSalaryYear, 0);
  const totalGrossAll = annualData.reduce((sum, d) => sum + d.totalGrossYear, 0);
  const totalOtAll = annualData.reduce((sum, d) => sum + d.totalOtYear, 0);
  const totalInsAll = annualData.reduce((sum, d) => sum + d.totalInsuranceEmpYear, 0);
  const totalTaxAll = annualData.reduce((sum, d) => sum + d.totalTaxYear, 0);
  const totalNetAll = annualData.reduce((sum, d) => sum + d.totalNetYear, 0);

  // Monthly totals across company
  const monthlyTotals: { [month: number]: number } = {};
  for (let m = 1; m <= 12; m++) {
    monthlyTotals[m] = annualData.reduce((sum, d) => sum + (d.monthlyNet[m] || 0), 0);
  }

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[95vh] flex flex-col print:shadow-none print:border-none print:max-h-none print:max-w-none print:w-full print:rounded-none">
        {/* Header Modal Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Xem Trước Bản In: Báo Cáo Lương Toàn Bộ Lao Động Năm {year}</h3>
              <p className="text-xs text-slate-500">Khổ giấy A4 Ngang (Landscape) • Tổng hợp 12 tháng & Quyết toán thu nhập</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Lưu PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/50 print:bg-white print:p-0 print:overflow-visible">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 max-w-[1400px] mx-auto print:border-none print:shadow-none print:p-0 text-slate-900 print:text-[9px] text-[11px] leading-tight">
            {/* Header Doanh Nghiệp */}
            <div className="flex justify-between items-start border-b border-slate-300 pb-3 mb-4">
              <div>
                <h1 className="font-bold uppercase text-xs sm:text-sm text-slate-900">{settings.companyName}</h1>
                <p className="text-[10px] text-slate-600 mt-0.5">Địa chỉ: {settings.address}</p>
                <p className="text-[10px] text-slate-600">MST: {settings.taxCode} • Điện thoại: {settings.phoneNumber}</p>
              </div>
              <div className="text-right text-[10px] text-slate-500">
                <p>Năm tài chính: <strong className="text-slate-800">{year}</strong></p>
                <p>Ngày in: {currentDateStr}</p>
              </div>
            </div>

            {/* Tiêu đề Báo Cáo */}
            <div className="text-center my-4">
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide">
                BÁO CÁO LƯƠNG & THU NHẬP TOÀN BỘ LAO ĐỘNG CẢ NĂM {year}
              </h2>
              <p className="text-xs text-slate-600 italic mt-0.5">
                (Theo dõi biến động chi trả 12 tháng, tổng thu nhập Gross, trích nộp BHXH, thuế TNCN và lương thực lĩnh)
              </p>
            </div>

            {/* Bảng Dữ Liệu 12 Tháng */}
            <div className="overflow-x-auto my-3">
              <table className="w-full border-collapse border border-slate-400 text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="border border-slate-400 p-1 w-7" rowSpan={2}>STT</th>
                    <th className="border border-slate-400 p-1 w-16" rowSpan={2}>Mã NV</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[120px]" rowSpan={2}>Họ và Tên</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[90px]" rowSpan={2}>Phòng Ban</th>
                    <th className="border border-slate-400 p-1 text-left min-w-[80px]" rowSpan={2}>Chức Vụ</th>
                    <th className="border border-slate-400 p-1 text-center" colSpan={12}>
                      Lương Thực Lĩnh Từng Tháng Trong Năm {year} (VNĐ)
                    </th>
                    <th className="border border-slate-400 p-1 min-w-[85px] bg-slate-50" rowSpan={2}>Tổng Lương CB Cả Năm</th>
                    <th className="border border-slate-400 p-1 min-w-[85px] bg-slate-50" rowSpan={2}>Tổng Gross Cả Năm</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-slate-50" rowSpan={2}>Tổng BHXH Trừ Lương</th>
                    <th className="border border-slate-400 p-1 min-w-[75px] bg-slate-50" rowSpan={2}>Tổng Thuế TNCN</th>
                    <th className="border border-slate-400 p-1 min-w-[95px] bg-emerald-50 text-emerald-950 font-black" rowSpan={2}>
                      Tổng Thực Lĩnh Cả Năm (Net)
                    </th>
                    <th className="border border-slate-400 p-1 min-w-[80px] bg-emerald-50 text-emerald-950" rowSpan={2}>
                      Bình Quân / Tháng
                    </th>
                  </tr>
                  <tr className="bg-slate-50 font-semibold text-slate-700 text-[10px]">
                    <th className="border border-slate-400 p-0.5 w-14">T1</th>
                    <th className="border border-slate-400 p-0.5 w-14">T2</th>
                    <th className="border border-slate-400 p-0.5 w-14">T3</th>
                    <th className="border border-slate-400 p-0.5 w-14">T4</th>
                    <th className="border border-slate-400 p-0.5 w-14">T5</th>
                    <th className="border border-slate-400 p-0.5 w-14">T6</th>
                    <th className="border border-slate-400 p-0.5 w-14">T7</th>
                    <th className="border border-slate-400 p-0.5 w-14">T8</th>
                    <th className="border border-slate-400 p-0.5 w-14">T9</th>
                    <th className="border border-slate-400 p-0.5 w-14">T10</th>
                    <th className="border border-slate-400 p-0.5 w-14">T11</th>
                    <th className="border border-slate-400 p-0.5 w-14">T12</th>
                  </tr>
                </thead>
                <tbody>
                  {annualData.map((row, idx) => (
                    <tr key={row.employee.id} className="hover:bg-slate-50">
                      <td className="border border-slate-400 p-1">{idx + 1}</td>
                      <td className="border border-slate-400 p-1 font-mono font-bold text-slate-800">{row.employee.employeeCode}</td>
                      <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{row.employee.fullName}</td>
                      <td className="border border-slate-400 p-1 text-left text-slate-700">{row.departmentName}</td>
                      <td className="border border-slate-400 p-1 text-left text-slate-600">{row.positionName}</td>

                      {/* 12 Months */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                        const val = row.monthlyNet[m];
                        return (
                          <td key={m} className="border border-slate-400 p-1 font-mono text-right text-[10px]">
                            {val ? formatVND(val) : <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}

                      <td className="border border-slate-400 p-1 font-mono text-right text-slate-800">
                        {formatVND(row.totalBaseSalaryYear)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-semibold text-slate-900">
                        {formatVND(row.totalGrossYear)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right text-slate-700">
                        {formatVND(row.totalInsuranceEmpYear)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right text-slate-700">
                        {formatVND(row.totalTaxYear)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-black text-emerald-700 bg-emerald-50/40">
                        {formatVND(row.totalNetYear)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-semibold text-slate-800">
                        {formatVND(Math.round(row.avgMonthlyNet))}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Total Row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={5} className="border border-slate-400 p-1 text-center uppercase tracking-wide">
                      TỔNG CỘNG TOÀN CÔNG TY
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <td key={m} className="border border-slate-400 p-1 font-mono text-right text-[10px]">
                        {monthlyTotals[m] ? formatVND(monthlyTotals[m]) : '-'}
                      </td>
                    ))}
                    <td className="border border-slate-400 p-1 font-mono text-right">
                      {formatVND(totalBaseAll)}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-right font-black">
                      {formatVND(totalGrossAll)}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-right">
                      {formatVND(totalInsAll)}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-right">
                      {formatVND(totalTaxAll)}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-right font-black text-emerald-900 bg-emerald-100">
                      {formatVND(totalNetAll)}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-right">
                      {formatVND(Math.round(totalNetAll / 12))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-3 text-center mt-8 pt-4 gap-4 break-inside-avoid">
              <div>
                <p className="font-bold text-slate-900 uppercase">Người Lập Biểu</p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900">{settings.reportPreparerName || 'Phạm Hồng Phúc'}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 uppercase">Kế Toán Trưởng</p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900">{settings.chiefAccountantName || 'Trần Thị Thu Hương'}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 uppercase">Giám Đốc / Người Đại Diện</p>
                <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký tên, đóng dấu)</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900">{settings.directorName || 'Nguyễn Văn Thành'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
          body {
            background-color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          nav, aside, header, footer, button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
