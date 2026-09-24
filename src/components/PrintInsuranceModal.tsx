import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { Employee, InsuranceRecord, SystemSettings } from '../types';
import { formatVND } from '../utils/payrollCalculator';

interface PrintInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  insurances: InsuranceRecord[];
  employees: Employee[];
  settings: SystemSettings;
}

export const PrintInsuranceModal: React.FC<PrintInsuranceModalProps> = ({
  isOpen,
  onClose,
  insurances,
  employees,
  settings,
}) => {
  if (!isOpen) return null;

  const empMap = new Map(employees.map(e => [e.id, e]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  // System rates
  const socRateEmp = settings.socialInsRateEmployee ?? 8;
  const medRateEmp = settings.healthInsRateEmployee ?? 1.5;
  const unempRateEmp = settings.unemploymentInsRateEmployee ?? 1;
  const totalRateEmp = socRateEmp + medRateEmp + unempRateEmp;

  const socRateEr = settings.socialInsRateEmployer ?? 17.5;
  const medRateEr = settings.healthInsRateEmployer ?? 3;
  const unempRateEr = settings.unemploymentInsRateEmployer ?? 1;
  const unionRateEr = settings.tradeUnionRateEmployer ?? 2;
  const totalRateEr = socRateEr + medRateEr + unempRateEr + unionRateEr;

  // Filter only participating records or all
  const dataRows = insurances.map(ins => {
    const emp = empMap.get(ins.employeeId);
    const salary = ins.isParticipating ? (ins.insuranceSalary || 0) : 0;

    // Custom rates or default
    const rSocEmp = ins.customSocialRate !== undefined ? ins.customSocialRate : socRateEmp;
    const rMedEmp = ins.customHealthRate !== undefined ? ins.customHealthRate : medRateEmp;
    const rUnempEmp = ins.customUnempRate !== undefined ? ins.customUnempRate : unempRateEmp;

    const rSocEr = socRateEr;
    const rMedEr = medRateEr;
    const rUnempEr = unempRateEr;
    const rUnionEr = unionRateEr;

    const empSoc = Math.round(salary * (rSocEmp / 100));
    const empMed = Math.round(salary * (rMedEmp / 100));
    const empUnemp = Math.round(salary * (rUnempEmp / 100));
    const empTotal = empSoc + empMed + empUnemp;

    const erSoc = Math.round(salary * (rSocEr / 100));
    const erMed = Math.round(salary * (rMedEr / 100));
    const erUnemp = Math.round(salary * (rUnempEr / 100));
    const erUnion = Math.round(salary * (rUnionEr / 100));
    const erTotal = erSoc + erMed + erUnemp + erUnion;

    const totalContribution = empTotal + erTotal;

    return {
      ins,
      emp,
      salary,
      isParticipating: ins.isParticipating,
      empSoc,
      empMed,
      empUnemp,
      empTotal,
      erSoc,
      erMed,
      erUnemp,
      erUnion,
      erTotal,
      totalContribution
    };
  });

  const grandSalary = dataRows.reduce((sum, r) => sum + r.salary, 0);
  const grandEmpSoc = dataRows.reduce((sum, r) => sum + r.empSoc, 0);
  const grandEmpMed = dataRows.reduce((sum, r) => sum + r.empMed, 0);
  const grandEmpUnemp = dataRows.reduce((sum, r) => sum + r.empUnemp, 0);
  const grandEmpTotal = dataRows.reduce((sum, r) => sum + r.empTotal, 0);

  const grandErSoc = dataRows.reduce((sum, r) => sum + r.erSoc, 0);
  const grandErMed = dataRows.reduce((sum, r) => sum + r.erMed, 0);
  const grandErUnemp = dataRows.reduce((sum, r) => sum + r.erUnemp, 0);
  const grandErUnion = dataRows.reduce((sum, r) => sum + r.erUnion, 0);
  const grandErTotal = dataRows.reduce((sum, r) => sum + r.erTotal, 0);

  const grandTotal = dataRows.reduce((sum, r) => sum + r.totalContribution, 0);
  const participatingCount = dataRows.filter(r => r.isParticipating).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">In Danh Sách Trích Nộp BHXH, BHYT, BHTN & KPCĐ</h3>
              <p className="text-xs text-slate-400">
                Khổ giấy A4 Ngang (Landscape) • Tháng {settings.currentMonth}/{settings.currentYear} • {participatingCount}/{insurances.length} người tham gia
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
              #insurance-print-sheet, #insurance-print-sheet * {
                visibility: visible;
              }
              #insurance-print-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}} />

          <div id="insurance-print-sheet" className="bg-white mx-auto p-6 rounded-xl shadow-xs print:shadow-none print:p-1 max-w-[1550px] border border-slate-200 print:border-none text-slate-900 text-[10px]">
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
                  Kỳ trích nộp: Tháng {settings.currentMonth}/{settings.currentYear}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ngày in: {new Date().toLocaleDateString('vi-VN')}
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                  Tỷ lệ chuẩn: NLĐ {totalRateEmp}% • Doanh nghiệp {totalRateEr}%
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                BẢNG TỔNG HỢP TRÍCH NỘP BẢO HIỂM XÃ HỘI, BHYT, BHTN & KINH PHÍ CÔNG ĐOÀN
              </h1>
              <p className="text-[11px] text-slate-600 italic mt-0.5">
                Tháng {settings.currentMonth} năm {settings.currentYear} (Tham gia: {participatingCount} / {insurances.length} nhân sự)
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-slate-50 border border-slate-300 rounded text-[10px]">
              <div>
                <span className="text-slate-500">Tổng quỹ lương đóng:</span>{' '}
                <strong className="text-slate-900 font-mono font-bold">{formatVND(grandSalary)}</strong>
              </div>
              <div>
                <span className="text-red-700 font-medium">NLĐ đóng trừ lương ({totalRateEmp}%):</span>{' '}
                <strong className="text-red-700 font-mono font-bold">{formatVND(grandEmpTotal)}</strong>
              </div>
              <div>
                <span className="text-blue-800 font-medium">Doanh nghiệp đóng ({totalRateEr}%):</span>{' '}
                <strong className="text-blue-800 font-mono font-bold">{formatVND(grandErTotal)}</strong>
              </div>
              <div>
                <span className="text-emerald-800 font-bold">Tổng cộng trích nộp:</span>{' '}
                <strong className="text-emerald-800 font-mono font-black">{formatVND(grandTotal)}</strong>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-center text-[9px] print:text-[8px]">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th rowSpan={2} className="border border-slate-400 p-1 w-7">STT</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 min-w-[55px]">Mã NV</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[120px]">Họ và Tên</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 text-left min-w-[80px]">Phòng Ban</th>
                    <th rowSpan={2} className="border border-slate-400 p-1 text-right min-w-[80px] bg-slate-200">
                      Lương Đóng BHXH (đ)
                    </th>
                    <th colSpan={4} className="border border-slate-400 p-0.5 bg-red-50 text-red-950">
                      Người Lao Động Đóng ({totalRateEmp}%)
                    </th>
                    <th colSpan={5} className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950">
                      Doanh Nghiệp Đóng ({totalRateEr}%)
                    </th>
                    <th rowSpan={2} className="border border-slate-400 p-1 min-w-[80px] bg-emerald-100 text-emerald-950">
                      Tổng Trích Nộp (đ)
                    </th>
                    <th rowSpan={2} className="border border-slate-400 p-1 min-w-[70px]">Ghi Chú</th>
                  </tr>
                  <tr>
                    {/* Emp */}
                    <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950 min-w-[48px]">BHXH ({socRateEmp}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950 min-w-[48px]">BHYT ({medRateEmp}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-red-50 text-red-950 min-w-[48px]">BHTN ({unempRateEmp}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-red-100 text-red-950 min-w-[55px] font-black">Cộng NLĐ</th>
                    {/* Er */}
                    <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950 min-w-[48px]">BHXH ({socRateEr}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950 min-w-[48px]">BHYT ({medRateEr}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950 min-w-[48px]">BHTN ({unempRateEr}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-blue-50 text-blue-950 min-w-[48px]">KPCĐ ({unionRateEr}%)</th>
                    <th className="border border-slate-400 p-0.5 bg-blue-100 text-blue-950 min-w-[55px] font-black">Cộng DN</th>
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, idx) => {
                    const emp = row.emp;
                    return (
                      <tr key={row.ins.id} className="hover:bg-slate-50">
                        <td className="border border-slate-400 p-0.5">{idx + 1}</td>
                        <td className="border border-slate-400 p-0.5 font-mono font-semibold">{emp?.employeeCode || '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-left font-bold text-slate-900 truncate">{emp?.fullName || '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-left text-slate-600 truncate">{depMap.get(emp?.departmentId || '') || ''}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono font-semibold bg-slate-50">
                          {row.isParticipating ? formatVND(row.salary) : <span className="text-slate-400 italic">Không đóng</span>}
                        </td>

                        {/* Emp */}
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.empSoc) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.empMed) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.empUnemp) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono font-bold text-red-700 bg-red-50/50">
                          {row.isParticipating ? formatVND(row.empTotal) : '-'}
                        </td>

                        {/* Er */}
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.erSoc) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.erMed) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.erUnemp) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono">{row.isParticipating ? formatVND(row.erUnion) : '-'}</td>
                        <td className="border border-slate-400 p-0.5 text-right font-mono font-bold text-blue-800 bg-blue-50/50">
                          {row.isParticipating ? formatVND(row.erTotal) : '-'}
                        </td>

                        {/* Total */}
                        <td className="border border-slate-400 p-0.5 text-right font-mono font-black text-emerald-900 bg-emerald-50">
                          {row.isParticipating ? formatVND(row.totalContribution) : '-'}
                        </td>
                        <td className="border border-slate-400 p-0.5 text-slate-500 text-[8px] truncate">
                          {!row.isParticipating ? 'Không tham gia' : (row.ins.note || '')}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary row */}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={4} className="border border-slate-400 p-1 text-center uppercase">
                      TỔNG CỘNG ({participatingCount} người tham gia)
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black">
                      {formatVND(grandSalary)}
                    </td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpSoc)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpMed)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandEmpUnemp)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-red-700 bg-red-100">
                      {formatVND(grandEmpTotal)}
                    </td>

                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErSoc)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErMed)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErUnemp)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono">{formatVND(grandErUnion)}</td>
                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-blue-800 bg-blue-100">
                      {formatVND(grandErTotal)}
                    </td>

                    <td className="border border-slate-400 p-1 text-right font-mono font-black text-emerald-900 bg-emerald-200">
                      {formatVND(grandTotal)}
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
