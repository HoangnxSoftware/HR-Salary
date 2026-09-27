import React from 'react';
import { Printer, X, Receipt, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SystemSettings } from '../types';
import { formatVND, CombinedAnnualTaxRecord } from '../utils/payrollCalculator';

interface PrintAnnualTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  annualRecords: CombinedAnnualTaxRecord[];
  settings: SystemSettings;
  year: number;
}

export const PrintAnnualTaxModal: React.FC<PrintAnnualTaxModalProps> = ({
  isOpen,
  onClose,
  annualRecords,
  settings,
  year
}) => {
  if (!isOpen) return null;

  // Grand totals
  const totalTaxWithheld = annualRecords.reduce((sum, r) => sum + r.totalTaxWithheldYear, 0);
  const totalTaxableIncome = annualRecords.reduce((sum, r) => sum + r.totalTaxableIncomeYear, 0);
  const totalDeductions = annualRecords.reduce((sum, r) => sum + r.totalDeductionsYear, 0);
  const totalAssessable = annualRecords.reduce((sum, r) => sum + r.totalAssessableIncomeYear, 0);
  const totalAnnualPayable = annualRecords.reduce((sum, r) => sum + r.annualPayableTax, 0);
  const totalDifference = totalTaxWithheld - totalAnnualPayable;

  const totalOverpaid = annualRecords
    .filter(r => r.taxDifference > 0)
    .reduce((sum, r) => sum + r.taxDifference, 0);

  const totalUnderpaid = annualRecords
    .filter(r => r.taxDifference < 0)
    .reduce((sum, r) => sum + Math.abs(r.taxDifference), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-700" />
            <div>
              <h3 className="font-black text-sm text-slate-900">
                In Báo Cáo Quyết Toán Thuế Thu Nhập Cá Nhân Cả Năm {year}
              </h3>
              <p className="text-[11px] text-slate-500">
                Tổng hợp chi tiết 12 tháng • Tính gộp người lao động trùng CCCD khác mã NV • Chuẩn khổ in A3/A4 ngang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-200" />
              <span>In Báo Cáo Quyết Toán (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white print:p-0 print:overflow-visible">
          {/* Company & Legal Header */}
          <div className="flex justify-between items-start text-xs border-b border-slate-300 pb-4 mb-4">
            <div>
              <div className="font-bold uppercase text-slate-900">{settings.companyName}</div>
              <div className="text-slate-600 mt-0.5">Địa chỉ: {settings.address}</div>
              <div className="text-slate-600">
                Mã số thuế: <strong className="font-mono">{settings.taxCode}</strong> | Điện thoại: {settings.phoneNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold uppercase text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="text-slate-600 italic">Độc lập - Tự do - Hạnh phúc</div>
              <div className="text-slate-400 text-[10px] mt-1">Mẫu số: 05/QTT-TNCN (Tham chiếu)</div>
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center my-4">
            <h1 className="text-xl md:text-2xl font-black uppercase text-slate-900 tracking-tight">
              BẢNG TỔNG HỢP QUYẾT TOÁN THUẾ THU NHẬP CÁ NHÂN CẢ NĂM {year}
            </h1>
            <p className="text-xs text-slate-600 mt-1 italic">
              (Chi tiết số thuế TNCN khấu trừ 12 tháng, thu nhập chịu thuế, thuế theo năm và chênh lệch quyết toán)
            </p>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              * Mã số thuế TNCN chính là số Căn cước công dân. Thu nhập của các lao động trùng số CCCD đã được tự động tính gộp.
            </p>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Tổng Người Nộp Thuế:</span>
              <strong className="text-sm font-mono text-slate-900">{annualRecords.length} người</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Tổng TN Chịu Thuế Năm:</span>
              <strong className="text-sm font-mono text-slate-900">{formatVND(totalTaxableIncome)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Tổng Thuế Đã Khấu Trừ:</span>
              <strong className="text-sm font-mono text-indigo-700">{formatVND(totalTaxWithheld)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Thuế Quyết Toán Cả Năm:</span>
              <strong className="text-sm font-mono text-amber-700">{formatVND(totalAnnualPayable)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Chênh Lệch Quyết Toán:</span>
              <strong className={`text-sm font-mono ${totalDifference > 0 ? 'text-emerald-700' : totalDifference < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {totalDifference > 0 ? `+${formatVND(totalDifference)} (Nộp thừa)` : totalDifference < 0 ? `${formatVND(totalDifference)} (Nộp thiếu)` : '0 ₫ (Khớp)'}
              </strong>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-xl mb-6">
            <table className="w-full text-[11px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase text-[10px]">
                  <th className="p-2 border-r border-slate-300 text-center w-8">STT</th>
                  <th className="p-2 border-r border-slate-300 min-w-[110px]">Số CCCD (MST)</th>
                  <th className="p-2 border-r border-slate-300 min-w-[130px]">Họ và Tên</th>
                  <th className="p-2 border-r border-slate-300 min-w-[90px]">Mã NV</th>
                  
                  {/* 12 Months Columns */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <th key={m} className="p-1 border-r border-slate-200 text-right min-w-[65px] font-mono">
                      T{m}
                    </th>
                  ))}

                  <th className="p-2 border-r border-slate-300 text-right bg-indigo-50 font-black text-indigo-900 min-w-[100px]">
                    Tổng Đã Trừ [1]
                  </th>
                  <th className="p-2 border-r border-slate-300 text-right bg-amber-50 font-bold text-amber-950 min-w-[100px]">
                    TN Chịu Thuế [2]
                  </th>
                  <th className="p-2 border-r border-slate-300 text-right text-slate-700 min-w-[90px]">
                    Giảm Trừ [3]
                  </th>
                  <th className="p-2 border-r border-slate-300 text-right bg-blue-50 font-bold text-blue-900 min-w-[95px]">
                    TNTT Năm [4]
                  </th>
                  <th className="p-2 border-r border-slate-300 text-right bg-red-50 font-black text-red-900 min-w-[100px]">
                    Thuế Năm [5]
                  </th>
                  <th className="p-2 text-right font-black text-slate-900 min-w-[110px]">
                    Chênh Lệch [6=1-5]
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {annualRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center text-slate-500 font-sans">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.idCardNumber}</td>
                    <td className="p-2 border-r border-slate-200 font-sans font-bold text-slate-800">{r.fullName}</td>
                    <td className="p-2 border-r border-slate-200 font-sans">
                      <span className="font-bold text-slate-700">{r.employeeCodes.join(', ')}</span>
                      {r.hasMultipleCodes && (
                        <span className="block text-[9px] text-red-600 font-bold font-sans">Gộp {r.employeeCodes.length} mã</span>
                      )}
                    </td>

                    {/* 12 Months */}
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                      const taxVal = r.monthlyTaxWithheld[m] || 0;
                      return (
                        <td key={m} className={`p-1 border-r border-slate-200 text-right ${taxVal > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}`}>
                          {taxVal > 0 ? taxVal.toLocaleString('vi-VN') : '-'}
                        </td>
                      );
                    })}

                    {/* Tổng thuế đã khấu trừ */}
                    <td className="p-2 border-r border-slate-200 text-right font-black text-indigo-700 bg-indigo-50/50">
                      {r.totalTaxWithheldYear.toLocaleString('vi-VN')}
                    </td>

                    {/* Tổng thu nhập chịu thuế cả năm */}
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-amber-950 bg-amber-50/40">
                      {r.totalTaxableIncomeYear.toLocaleString('vi-VN')}
                    </td>

                    {/* Tổng giảm trừ */}
                    <td className="p-2 border-r border-slate-200 text-right text-slate-600">
                      {r.totalDeductionsYear.toLocaleString('vi-VN')}
                    </td>

                    {/* Thu nhập tính thuế năm */}
                    <td className="p-2 border-r border-slate-200 text-right font-bold text-blue-900 bg-blue-50/40">
                      {r.totalAssessableIncomeYear.toLocaleString('vi-VN')}
                    </td>

                    {/* Thuế tính theo cả năm */}
                    <td className="p-2 border-r border-slate-200 text-right font-black text-red-700 bg-red-50/50">
                      {r.annualPayableTax.toLocaleString('vi-VN')}
                    </td>

                    {/* Chênh lệch */}
                    <td className={`p-2 text-right font-black ${
                      r.taxDifference > 0 
                        ? 'text-emerald-700 bg-emerald-50/50' 
                        : r.taxDifference < 0 
                        ? 'text-rose-700 bg-rose-50/50' 
                        : 'text-slate-600'
                    }`}>
                      {r.taxDifference > 0 
                        ? `+${r.taxDifference.toLocaleString('vi-VN')}` 
                        : r.taxDifference < 0 
                        ? `${r.taxDifference.toLocaleString('vi-VN')}` 
                        : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-[11px] font-mono">
                  <td colSpan={4} className="p-2 border-r border-slate-300 text-center font-sans uppercase">
                    TỔNG CỘNG TOÀN DOANH NGHIỆP:
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                    const mSum = annualRecords.reduce((s, r) => s + (r.monthlyTaxWithheld[m] || 0), 0);
                    return (
                      <td key={m} className="p-1 border-r border-slate-200 text-right font-bold text-slate-800">
                        {mSum > 0 ? mSum.toLocaleString('vi-VN') : '-'}
                      </td>
                    );
                  })}
                  <td className="p-2 border-r border-slate-300 text-right font-black text-indigo-900 bg-indigo-100/60">
                    {totalTaxWithheld.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-black text-amber-950 bg-amber-100/60">
                    {totalTaxableIncome.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right text-slate-800">
                    {totalDeductions.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-black text-blue-900 bg-blue-100/60">
                    {totalAssessable.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-black text-red-900 bg-red-100/60">
                    {totalAnnualPayable.toLocaleString('vi-VN')}
                  </td>
                  <td className={`p-2 text-right font-black ${totalDifference > 0 ? 'text-emerald-800 bg-emerald-100/60' : totalDifference < 0 ? 'text-rose-800 bg-rose-100/60' : 'text-slate-800'}`}>
                    {totalDifference > 0 ? `+${totalDifference.toLocaleString('vi-VN')}` : `${totalDifference.toLocaleString('vi-VN')}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4 border-t border-slate-200 break-inside-avoid">
            <div>
              <div className="font-bold text-slate-800 uppercase">Người Lập Báo Cáo</div>
              <div className="text-slate-500 italic text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div className="font-bold text-slate-900">{settings.reportPreparerName || 'Phạm Hồng Phúc'}</div>
            </div>

            <div>
              <div className="font-bold text-slate-800 uppercase">Kế Toán Trưởng</div>
              <div className="text-slate-500 italic text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div className="font-bold text-slate-900">{settings.chiefAccountantName || 'Trần Thị Thu Hương'}</div>
            </div>

            <div>
              <div className="text-slate-500 italic text-[11px] mb-0.5">Ngày ..... tháng ..... năm {year}</div>
              <div className="font-bold text-slate-800 uppercase">Tổng Giám Đốc / Người Đại Diện PL</div>
              <div className="text-slate-500 italic text-[11px] mt-0.5">(Ký, đóng dấu, ghi rõ họ tên)</div>
              <div className="h-14"></div>
              <div className="font-bold text-slate-900">{settings.directorName || 'Nguyễn Văn Thành'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
