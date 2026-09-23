import React, { useState, useRef } from 'react';
import { Gift, Plus, Trash2, Edit3, Download, Search, CheckCircle2, ShieldCheck, DollarSign, Upload, FileSpreadsheet } from 'lucide-react';
import { SpecialAllowance, Employee } from '../types';
import { formatVND } from '../utils/payrollCalculator';
import { downloadAllowanceTemplate, readAllowanceExcel } from '../utils/excelHelper';
import * as XLSX from 'xlsx';
import { useAuthRole } from '../context/AuthRoleContext';

interface AllowancesViewProps {
  specialAllowances: SpecialAllowance[];
  employees: Employee[];
  onAddAllowance: (allowance: SpecialAllowance) => void;
  onUpdateAllowance: (allowance: SpecialAllowance) => void;
  onDeleteAllowance: (id: string) => void;
  onBatchAddAllowances?: (items: SpecialAllowance[]) => void;
}

export const AllowancesView: React.FC<AllowancesViewProps> = ({
  specialAllowances,
  employees,
  onAddAllowance,
  onUpdateAllowance,
  onDeleteAllowance,
  onBatchAddAllowances
}) => {
  const { canEditEmployees, canExportData } = useAuthRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SpecialAllowance | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<SpecialAllowance>>({
    employeeId: employees[0]?.id || '',
    name: 'Phụ cấp trách nhiệm',
    amount: 1000000,
    isTaxable: true,
    month: '2026-09',
    note: ''
  });

  const empMap = new Map(employees.map(e => [e.id, e]));

  const filteredAllowances = specialAllowances.filter(a => {
    const emp = empMap.get(a.employeeId);
    const search = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(search) ||
      (emp && emp.fullName.toLowerCase().includes(search)) ||
      (emp && emp.employeeCode.toLowerCase().includes(search))
    );
  });

  // Calculate totals
  const totalTaxable = specialAllowances.filter(a => a.isTaxable).reduce((sum, a) => sum + a.amount, 0);
  const totalExempt = specialAllowances.filter(a => !a.isTaxable).reduce((sum, a) => sum + a.amount, 0);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: `allow-${Date.now()}`,
      employeeId: employees[0]?.id || '',
      name: 'Phụ cấp trách nhiệm',
      amount: 1000000,
      isTaxable: true,
      month: '2026-09',
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SpecialAllowance) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.name || !formData.amount) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    const item: SpecialAllowance = {
      id: formData.id || `allow-${Date.now()}`,
      employeeId: formData.employeeId || employees[0]?.id || '',
      name: formData.name || '',
      amount: Number(formData.amount) || 0,
      isTaxable: Boolean(formData.isTaxable),
      month: formData.month || '2026-09',
      note: formData.note || ''
    };

    if (editingItem) {
      onUpdateAllowance(item);
    } else {
      onAddAllowance(item);
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = specialAllowances.map((a, idx) => {
      const emp = empMap.get(a.employeeId);
      return {
        'STT': idx + 1,
        'Mã Nhân Viên': emp?.employeeCode || '',
        'Họ Tên Nhân Viên': emp?.fullName || '',
        'Tên Khoản Phụ Cấp': a.name,
        'Số Tiền (VNĐ)': a.amount,
        'Tính Thuế TNCN': a.isTaxable ? 'Có tính thuế' : 'Miễn thuế',
        'Tháng Áp Dụng': a.month,
        'Ghi Chú': a.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Phu_Cap_Dac_Thu');
    XLSX.writeFile(wb, `Danh_Sach_Phu_Cap_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readAllowanceExcel(file, employees);
      if (imported.length === 0) {
        alert('File không có dữ liệu phụ cấp hoặc không đúng định dạng!');
        return;
      }
      if (onBatchAddAllowances) {
        onBatchAddAllowances(imported);
      } else {
        imported.forEach(item => onAddAllowance(item));
      }
      setImportNotification(`Đã nhập thành công ${imported.length} khoản phụ cấp đặc thù từ file Excel!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      alert(`Lỗi khi đọc file Excel phụ cấp: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Phụ Cấp Đặc Thù Theo Tháng</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các khoản phụ cấp trách nhiệm, chuyên cần, độc hại, xăng xe công tác... Phân loại tính thuế & miễn thuế TNCN
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input for Excel Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {canEditEmployees && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="Nhập danh sách phụ cấp từ Excel"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Nhập Excel</span>
              </button>

              <button
                onClick={downloadAllowanceTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="Tải mẫu Excel chuẩn phụ cấp đặc thù"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tải Mẫu Excel</span>
              </button>
            </>
          )}

          {canExportData && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          {canEditEmployees && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Phụ Cấp Mới</span>
            </button>
          )}
        </div>
      </div>

      {importNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{importNotification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Khoản Phụ Cấp</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatVND(totalTaxable + totalExempt)}
          </div>
          <span className="text-slate-400 mt-0.5 block">{specialAllowances.length} khoản chi tháng</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Phụ Cấp Phải Tính Thuế TNCN</span>
          <div className="text-xl font-black font-mono text-red-600 mt-1">
            {formatVND(totalTaxable)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Trách nhiệm, chuyên cần, hiệu quả...</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider block">Phụ Cấp Miễn Thuế TNCN</span>
          <div className="text-xl font-black font-mono text-emerald-700 mt-1">
            {formatVND(totalExempt)}
          </div>
          <span className="text-slate-400 mt-0.5 block">Xăng xe công tác, trang phục, độc hại...</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Tên Phụ Cấp, Tên Nhân Viên, Mã NV..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nhân Viên Hưởng</th>
                <th className="px-4 py-3">Tên Khoản Phụ Cấp</th>
                <th className="px-4 py-3 text-right">Số Tiền (VNĐ)</th>
                <th className="px-4 py-3 text-center">Phân Loại Thuế TNCN</th>
                <th className="px-4 py-3 font-mono">Tháng Áp Dụng</th>
                <th className="px-4 py-3">Ghi Chú</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllowances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Chưa có khoản phụ cấp đặc thù nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredAllowances.map(item => {
                  const emp = empMap.get(item.employeeId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{emp?.fullName}</div>
                        <div className="font-mono text-[11px] text-emerald-700">{emp?.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 text-sm">
                        {item.name}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatVND(item.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.isTaxable ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.isTaxable ? 'Có tính thuế TNCN' : 'Miễn thuế TNCN'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {item.month}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {item.note || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canEditEmployees && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteAllowance(item.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              {editingItem ? 'Chỉnh Sửa Phụ Cấp Đặc Thù' : 'Thêm Khoản Phụ Cấp Mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhân Viên Hưởng *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.employeeCode} - {e.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Khoản Phụ Cấp *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phụ cấp trách nhiệm dự án"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Tiền Phụ Cấp (VNĐ) *</label>
                <input
                  type="number"
                  required
                  step={50000}
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="block font-semibold text-slate-700">Quy Định Tính Thuế TNCN *</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxable"
                    checked={formData.isTaxable === true}
                    onChange={() => setFormData({ ...formData, isTaxable: true })}
                    className="text-emerald-600"
                  />
                  <span>Có tính vào thu nhập chịu thuế TNCN (trách nhiệm, chuyên cần, chức vụ...)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxable"
                    checked={formData.isTaxable === false}
                    onChange={() => setFormData({ ...formData, isTaxable: false })}
                    className="text-emerald-600"
                  />
                  <span>Được miễn thuế TNCN (khoán công tác phí, điện thoại, trang phục, độc hại...)</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tháng Áp Dụng (YYYY-MM)</label>
                <input
                  type="month"
                  value={formData.month}
                  onChange={e => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú căn cứ phê duyệt..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Lưu Phụ Cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
