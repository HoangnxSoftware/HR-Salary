import React, { useState } from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { Employee, InsuranceRecord, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

export interface AnnualEmployeeInsuranceData {
  employee: Employee;
  insurance: InsuranceRecord | null;
  departmentName: string;
  positionName: string;
  isParticipatingYear: boolean;
  activeMonthsCount: number;
  monthlySalary: { [month: number]: number };
  monthlyEmpTotal: { [month: number]: number };
  monthlyErTotal: { [month: number]: number };
  monthlyGrandTotal: { [month: number]: number };
  
  totalInsuranceSalaryYear: number;
  totalSocEmpYear: number;
  totalMedEmpYear: number;
  totalUnempEmpYear: number;
  totalEmpYear: number;
  
  totalSocErYear: number;
  totalMedErYear: number;
  totalUnempErYear: number;
  totalUnionErYear: number;
  totalErYear: number;
  
  totalContributionYear: number;
  avgMonthlyContribution: number;
}

interface PrintAnnualInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  annualData: AnnualEmployeeInsuranceData[];
  year: number;
  settings: SystemSettings;
}

export const PrintAnnualInsuranceModal: React.FC<PrintAnnualInsuranceModalProps> = ({
  isOpen,
  onClose,
  annualData,
  year,
  settings,
}) => {
  const [printViewMode, setPrintViewMode] = useState<'12_months' | 'funds_breakdown'>('12_months');

  // Tập hợp các số CCCD bị trùng lặp - Phải gọi hook TRƯỚC mọi return để tuân thủ React Rules of Hooks
  const duplicateIdCards = React.useMemo(() => {
    const counts = new Map<string, number>();
    annualData.forEach(d => {
      const cccd = (d.employee?.idCardNumber || '').trim();
      if (cccd) counts.set(cccd, (counts.get(cccd) || 0) + 1);
    });
    const dupSet = new Set<string>();
    counts.forEach((cnt, cccd) => {
      if (cnt > 1) dupSet.add(cccd);
    });
    return dupSet;
  }, [annualData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Grand totals across company
  const grandSalaryAll = annualData.reduce((sum, d) => sum + (d.totalInsuranceSalaryYear || 0), 0);
  const grandEmpSocAll = annualData.reduce((sum, d) => sum + (d.totalSocEmpYear || 0), 0);
  const grandEmpMedAll = annualData.reduce((sum, d) => sum + (d.totalMedEmpYear || 0), 0);
  const grandEmpUnempAll = annualData.reduce((sum, d) => sum + (d.totalUnempEmpYear || 0), 0);
  const grandEmpTotalAll = annualData.reduce((sum, d) => sum + (d.totalEmpYear || 0), 0);

  const grandErSocAll = annualData.reduce((sum, d) => sum + (d.totalSocErYear || 0), 0);
  const grandErMedAll = annualData.reduce((sum, d) => sum + (d.totalMedErYear || 0), 0);
  const grandErUnempAll = annualData.reduce((sum, d) => sum + (d.totalUnempErYear || 0), 0);
  const grandErUnionAll = annualData.reduce((sum, d) => sum + (d.totalUnionErYear || 0), 0);
  const grandErTotalAll = annualData.reduce((sum, d) => sum + (d.totalErYear || 0), 0);

  const grandTotalAll = annualData.reduce((sum, d) => sum + (d.totalContributionYear || 0), 0);
  const participatingCount = annualData.filter(d => d.isParticipatingYear).length;

  // Monthly totals across company (Tổng nộp từng tháng)
  const monthlyTotals: { [month: number]: number } = {};
  const monthlySalaryTotals: { [month: number]: number } = {};
  for (let m = 1; m <= 12; m++) {
    monthlyTotals[m] = annualData.reduce((sum, d) => sum + (d.monthlyGrandTotal?.[m] || 0), 0);
    monthlySalaryTotals[m] = annualData.reduce((sum, d) => sum + (d.monthlySalary?.[m] || 0), 0);
  }

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col print:shadow-none print:border-none print:max-h-none print:max-w-none print:w-full print:rounded-none">
        {/* Header Modal Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Xem Trước Bản In: Báo Cáo Đóng BHXH Cả Năm {year}</h3>
              <p className="text-xs text-slate-500">Khổ giấy A4 Ngang (Landscape) • Tổng hợp 12 tháng trích nộp BHXH, BHYT, BHTN & KPCĐ</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPrintViewMode('12_months')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  printViewMode === '12_months' 
                    ? 'bg-white text-purple-800 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12 Tháng Nộp
              </button>
              <button
                type="button"
                onClick={() => setPrintViewMode('funds_breakdown')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  printViewMode === 'funds_breakdown' 
                    ? 'bg-white text-purple-800 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chi Tiết Các Quỹ
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-purple-600/20 transition-all cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 6mm 4mm;
              }
              body * {
                visibility: hidden;
              }
              #annual-insurance-print-sheet, #annual-insurance-print-sheet * {
                visibility: visible;
              }
              #annual-insurance-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                display: block !important;
              }
            }
          `}} />

          <div id="annual-insurance-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                <div className="text-xs font-semibold text-slate-800">Báo cáo: Cả năm {year}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Ngày in: {currentDateStr}</div>
                <div className="text-[10px] text-purple-800 font-bold mt-0.5">
                  Tỷ lệ chuẩn: NLĐ 10.5% • Doanh nghiệp 23.5% (Tổng 34%)
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BÁO CÁO TỔNG HỢP TRÍCH NỘP BẢO HIỂM XÃ HỘI CẢ NĂM {year}
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                (Theo dõi tổng quỹ lương căn cứ đóng, số tiền NLĐ trích nộp và Doanh nghiệp đóng BHXH, BHYT, BHTN & KPCĐ 12 tháng)
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Số lao động tham gia:</span>{' '}
                <strong className="text-slate-900 font-bold">{participatingCount} / {annualData.length} người</strong>
              </div>
              <div>
                <span className="text-slate-500">Tổng quỹ lương đóng năm:</span>{' '}
                <strong className="text-slate-900 font-mono font-bold">{formatVND(grandSalaryAll)}</strong>
              </div>
              <div>
                <span className="text-red-700 font-medium">Tổng NLĐ trích nộp (10.5%):</span>{' '}
                <strong className="text-red-700 font-mono font-bold">{formatVND(grandEmpTotalAll)}</strong>
              </div>
              <div>
                <span className="text-purple-900 font-bold">Tổng nộp cơ quan BHXH (34%):</span>{' '}
                <strong className="text-purple-900 font-mono font-black">{formatVND(grandTotalAll)}</strong>
              </div>
            </div>

            {/* Table: View Mode 1 - 12 Months Contributions */}
            {printViewMode === '12_months' && (
              <div className="overflow-x-auto my-2">
                <table className="w-full border-collapse border border-slate-400 text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-400 p-1 w-7" rowSpan={2}>STT</th>
                      <th className="border border-slate-400 p-1 w-16" rowSpan={2}>Mã NV</th>
                      <th className="border border-slate-400 p-1 text-center min-w-[85px]" rowSpan={2}>Số CCCD</th>
                      <th className="border border-slate-400 p-1 text-left min-w-[120px]" rowSpan={2}>Họ và Tên</th>
                      <th className="border border-slate-400 p-1 text-left min-w-[90px]" rowSpan={2}>Phòng Ban</th>
                      <th className="border border-slate-400 p-1 text-center" colSpan={12}>
                        Số Tiền Trích Nộp BHXH Từng Tháng Trong Năm {year} (VNĐ)
                      </th>
                      <th className="border border-slate-400 p-1 min-w-[90px] bg-slate-50" rowSpan={2}>Tổng Quỹ Lương Năm</th>
                      <th className="border border-slate-400 p-1 min-w-[80px] bg-red-50 text-red-950" rowSpan={2}>Tổng NLĐ Đóng</th>
                      <th className="border border-slate-400 p-1 min-w-[80px] bg-blue-50 text-blue-950" rowSpan={2}>Tổng DN Đóng</th>
                      <th className="border border-slate-400 p-1 min-w-[95px] bg-purple-50 text-purple-950 font-black" rowSpan={2}>
                        Tổng Nộp Cả Năm (34%)
                      </th>
                      <th className="border border-slate-400 p-1 min-w-[75px] bg-purple-50 text-purple-950" rowSpan={2}>
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
                    {annualData.length === 0 ? (
                      <tr>
                        <td colSpan={22} className="border border-slate-400 p-8 text-center text-slate-500 font-medium">
                          Chưa có dữ liệu trích nộp BHXH năm {year}. Hãy kiểm tra danh sách nhân sự hoặc bộ lọc phòng ban!
                        </td>
                      </tr>
                    ) : (
                      annualData.map((row, idx) => {
                      const isDuplicateCccd = row.employee.idCardNumber ? duplicateIdCards.has(row.employee.idCardNumber.trim()) : false;

                      return (
                        <tr key={row.employee.id} className="hover:bg-slate-50">
                          <td className="border border-slate-400 p-1">{idx + 1}</td>
                          <td className="border border-slate-400 p-1 font-mono font-bold text-slate-800">{row.employee.employeeCode}</td>
                          <td className="border border-slate-400 p-1 font-mono text-center">
                            <div className="font-semibold">{row.employee.idCardNumber || '—'}</div>
                            {isDuplicateCccd && (
                              <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded block mt-0.5 print:border print:border-amber-400">
                                *Trùng CCCD
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-400 p-1 text-left font-bold text-slate-900">{row.employee.fullName}</td>
                          <td className="border border-slate-400 p-1 text-left text-slate-700">{row.departmentName}</td>

                          {/* 12 Months */}
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                            const val = row.monthlyGrandTotal[m];
                            return (
                              <td key={m} className="border border-slate-400 p-1 font-mono text-right text-[10px]">
                                {val ? formatVND(val) : <span className="text-slate-300">-</span>}
                              </td>
                            );
                          })}

                          <td className="border border-slate-400 p-1 font-mono text-right text-slate-800">
                            {formatVND(row.totalInsuranceSalaryYear)}
                          </td>
                          <td className="border border-slate-400 p-1 font-mono text-right font-semibold text-red-700">
                            {formatVND(row.totalEmpYear)}
                          </td>
                          <td className="border border-slate-400 p-1 font-mono text-right text-blue-700">
                            {formatVND(row.totalErYear)}
                          </td>
                          <td className="border border-slate-400 p-1 font-mono text-right font-black text-purple-900 bg-purple-50/40">
                            {formatVND(row.totalContributionYear)}
                          </td>
                          <td className="border border-slate-400 p-1 font-mono text-right font-semibold text-slate-800">
                            {formatVND(Math.round(row.avgMonthlyContribution))}
                          </td>
                        </tr>
                      );
                    }))}

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
                      <td className="border border-slate-400 p-1 font-mono text-right font-black">
                        {formatVND(grandSalaryAll)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-black text-red-700">
                        {formatVND(grandEmpTotalAll)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-black text-blue-700">
                        {formatVND(grandErTotalAll)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-black text-purple-950 bg-purple-100">
                        {formatVND(grandTotalAll)}
                      </td>
                      <td className="border border-slate-400 p-1 font-mono text-right font-bold">
                        {formatVND(Math.round(grandTotalAll / 12))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: View Mode 2 - Detailed Funds Breakdown */}
            {printViewMode === 'funds_breakdown' && (
              <div className="overflow-x-auto my-2">
                <table className="w-full border-collapse border border-slate-400 text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th rowSpan={2} className="border border-slate-400 p-1 w-7">STT</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 min-w-[55px]">Mã NV</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 min-w-[85px] text-center">Số CCCD</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[120px]">Họ và Tên</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[90px]">Phòng Ban</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 w-12 text-center">Số Tháng</th>
                      <th rowSpan={2} className="border border-slate-400 p-1 text-right min-w-[90px] bg-slate-200">
                        Tổng Quỹ Lương Năm
                      </th>
                      <th colSpan={4} className="border border-slate-400 p-0.5 bg-red-50 text-red-950">
                        Người Lao Động Đóng Cả Năm (10.5%)
                      </th>
                      <th colSpan={5} className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">
                        Doanh Nghiệp Đóng Cả Năm (23.5%)
                      </th>
                      <th rowSpan={2} className="border border-slate-400 p-1 min-w-[95px] bg-purple-100 text-purple-950 font-black">
                        Tổng Nộp Cả Năm (34%)
                      </th>
                    </tr>
                    <tr className="text-[9px]">
                      {/* Emp */}
                      <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950">BHXH 8%</th>
                      <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950">BHYT 1.5%</th>
                      <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950">BHTN 1%</th>
                      <th className="border border-slate-400 p-0.5 bg-red-100 text-red-950 font-black">Cộng NLĐ</th>
                      {/* Er */}
                      <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">BHXH 17.5%</th>
                      <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">BHYT 3%</th>
                      <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">BHTN 1%</th>
                      <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">KPCĐ 2%</th>
                      <th className="border border-slate-400 p-0.5 bg-blue-100 text-blue-950 font-black">Cộng DN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualData.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="border border-slate-400 p-8 text-center text-slate-500 font-medium">
                          Chưa có dữ liệu trích nộp BHXH năm {year}. Hãy kiểm tra danh sách nhân sự hoặc bộ lọc phòng ban!
                        </td>
                      </tr>
                    ) : (
                      annualData.map((row, idx) => {
                      const isDuplicateCccd = row.employee.idCardNumber ? duplicateIdCards.has(row.employee.idCardNumber.trim()) : false;

                      return (
                        <tr key={row.employee.id} className="hover:bg-slate-50">
                          <td className="border border-slate-400 p-0.5">{idx + 1}</td>
                          <td className="border border-slate-400 p-0.5 font-mono font-semibold">{row.employee.employeeCode}</td>
                          <td className="border border-slate-400 p-0.5 font-mono text-center">
                            <div>{row.employee.idCardNumber || '-'}</div>
                            {isDuplicateCccd && (
                              <span className="text-[7px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded block mt-0.5 print:border print:border-amber-400">
                                *Trùng CCCD
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-400 p-0.5 text-left font-bold text-slate-900 truncate">{row.employee.fullName}</td>
                          <td className="border border-slate-400 p-0.5 text-left text-slate-600 truncate">{row.departmentName}</td>
                          <td className="border border-slate-400 p-0.5 font-mono text-center">{row.activeMonthsCount}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono font-semibold bg-slate-50">
                            {formatVND(row.totalInsuranceSalaryYear)}
                          </td>

                          {/* Emp */}
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalSocEmpYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalMedEmpYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalUnempEmpYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono font-bold text-red-700 bg-red-50/50">
                            {formatVND(row.totalEmpYear)}
                          </td>

                          {/* Er */}
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalSocErYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalMedErYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalUnempErYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono">{formatVND(row.totalUnionErYear)}</td>
                          <td className="border border-slate-400 p-0.5 text-right font-mono font-bold text-blue-800 bg-blue-50/50">
                            {formatVND(row.totalErYear)}
                          </td>

                          {/* Total */}
                          <td className="border border-slate-400 p-0.5 text-right font-mono font-black text-purple-900 bg-purple-50">
                            {formatVND(row.totalContributionYear)}
                          </td>
                        </tr>
                      );
                    }))}

                    {/* Summary row */}
                    <tr className="bg-slate-200 font-bold text-slate-900">
                      <td colSpan={6} className="border border-slate-400 p-1 text-center uppercase">
                        TỔNG CỘNG ({participatingCount} người tham gia)
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono font-black">
                        {formatVND(grandSalaryAll)}
                      </td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpSocAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpMedAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpUnempAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono font-black text-red-700 bg-red-100">
                        {formatVND(grandEmpTotalAll)}
                      </td>

                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErSocAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErMedAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErUnempAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErUnionAll)}</td>
                      <td className="border border-slate-400 p-1 text-right font-mono font-black text-blue-800 bg-blue-100">
                        {formatVND(grandErTotalAll)}
                      </td>

                      <td className="border border-slate-400 p-1 text-right font-mono font-black text-purple-900 bg-purple-200">
                        {formatVND(grandTotalAll)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature Area */}
            <div className="grid grid-cols-3 gap-6 text-center mt-6 pt-4 text-xs font-semibold print:text-[9px]">
              <div>
                <p className="uppercase text-slate-800 font-bold">Người Lập Biểu</p>
                <p className="text-[10px] text-slate-500 italic mb-12">(Ký, ghi rõ họ tên)</p>
                <p className="text-slate-700 font-medium">Chuyên viên Nhân sự / BHXH</p>
              </div>
              <div>
                <p className="uppercase text-slate-800 font-bold">Kế Toán Trưởng</p>
                <p className="text-[10px] text-slate-500 italic mb-12">(Ký, ghi rõ họ tên)</p>
                <p className="text-slate-700 font-medium">Kế toán trưởng</p>
              </div>
              <div>
                <p className="uppercase text-slate-800 font-bold">Giám Đốc Doanh Nghiệp</p>
                <p className="text-[10px] text-slate-500 italic mb-12">(Ký, đóng dấu, ghi rõ họ tên)</p>
                <p className="text-slate-700 font-medium">Đại diện theo pháp luật</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
