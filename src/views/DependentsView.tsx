import React, { useState, useRef } from 'react';
import { Users, UserPlus, Trash2, Edit3, Download, Search, CheckCircle2, ShieldAlert, Upload, FileSpreadsheet } from 'lucide-react';
import { Dependent, Employee, RelationshipType } from '../types';
import { formatVND } from '../utils/payrollCalculator';
import { downloadDependentTemplate, readDependentExcel } from '../utils/excelHelper';
import * as XLSX from 'xlsx';
import { useAuthRole } from '../context/AuthRoleContext';

interface DependentsViewProps {
  dependents: Dependent[];
  employees: Employee[];
  onAddDependent: (dependent: Dependent) => void;
  onUpdateDependent: (dependent: Dependent) => void;
  onDeleteDependent: (id: string) => void;
  onBatchAddDependents?: (deps: Dependent[]) => void;
}

export const DependentsView: React.FC<DependentsViewProps> = ({
  dependents,
  employees,
  onAddDependent,
  onUpdateDependent,
  onDeleteDependent,
  onBatchAddDependents
}) => {
  const { canEditEmployees, canExportData } = useAuthRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDep, setEditingDep] = useState<Dependent | null>(null);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Dependent>>({
    employeeId: employees[0]?.id || '',
    fullName: '',
    taxCodeOrId: '',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2018-01-01',
    startDate: '2024-01',
    endDate: '',
    deductionAmount: 4400000,
    note: ''
  });

  const empMap = new Map(employees.map(e => [e.id, e]));

  const filteredDependents = dependents.filter(dep => {
    const emp = empMap.get(dep.employeeId);
    const search = searchTerm.toLowerCase();
    return (
      dep.fullName.toLowerCase().includes(search) ||
      dep.taxCodeOrId.toLowerCase().includes(search) ||
      (emp && emp.fullName.toLowerCase().includes(search)) ||
      (emp && emp.employeeCode.toLowerCase().includes(search))
    );
  });

  const handleOpenAdd = () => {
    setEditingDep(null);
    setFormData({
      id: `dep-${Date.now()}`,
      employeeId: employees[0]?.id || '',
      fullName: '',
      taxCodeOrId: '',
      relationship: 'Con đẻ/Con nuôi',
      birthDate: '2018-01-01',
      startDate: '2024-01',
      endDate: '',
      deductionAmount: 4400000,
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dep: Dependent) => {
    setEditingDep(dep);
    setFormData(dep);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.employeeId) {
      alert('Vui lòng chọn Nhân viên và nhập Họ tên người phụ thuộc!');
      return;
    }

    const item: Dependent = {
      id: formData.id || `dep-${Date.now()}`,
      employeeId: formData.employeeId || employees[0]?.id || '',
      fullName: formData.fullName || '',
      taxCodeOrId: formData.taxCodeOrId || '',
      relationship: formData.relationship as RelationshipType || 'Con đẻ/Con nuôi',
      birthDate: formData.birthDate || '2018-01-01',
      startDate: formData.startDate || '2024-01',
      endDate: formData.endDate || '',
      deductionAmount: Number(formData.deductionAmount) || 4400000,
      note: formData.note || ''
    };

    if (editingDep) {
      onUpdateDependent(item);
    } else {
      onAddDependent(item);
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const rows = dependents.map((d, idx) => {
      const emp = empMap.get(d.employeeId);
      return {
        'STT': idx + 1,
        'Mã Nhân Viên': emp?.employeeCode || '',
        'Họ Tên Nhân Viên': emp?.fullName || '',
        'Họ Tên Người Phụ Thuộc': d.fullName,
        'CCCD / Mã Định Danh / MST': d.taxCodeOrId,
        'Mối Quan Hệ': d.relationship,
        'Ngày Sinh': d.birthDate,
        'Bắt Đầu Giảm Trừ': d.startDate,
        'Kết Thúc Giảm Trừ': d.endDate || 'Hiện tại',
        'Mức Giảm Trừ (VNĐ/tháng)': d.deductionAmount,
        'Ghi Chú': d.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nguoi_Phu_Thuoc');
    XLSX.writeFile(wb, `Danh_Sach_Nguoi_Phu_Thuoc_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readDependentExcel(file, employees);
      if (imported.length === 0) {
        alert('File không có dữ liệu người phụ thuộc hoặc không đúng định dạng!');
        return;
      }
      if (onBatchAddDependents) {
        onBatchAddDependents(imported);
      } else {
        imported.forEach(item => onAddDependent(item));
      }
      setImportNotification(`Đã nhập thành công ${imported.length} người phụ thuộc từ file Excel!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      alert(`Lỗi khi đọc file Excel người phụ thuộc: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Danh Sách Người Phụ Thuộc Của NLĐ</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý đăng ký giảm trừ gia cảnh thuế TNCN (Mức chuẩn: 4.400.000 VNĐ / người / tháng)
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
                title="Nhập danh sách người phụ thuộc từ Excel"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Nhập Excel</span>
              </button>

              <button
                onClick={downloadDependentTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="Tải mẫu Excel chuẩn người phụ thuộc"
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
              <UserPlus className="w-4 h-4" />
              <span>Đăng Ký Người Phụ Thuộc</span>
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

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Tên NPT, Tên Nhân Viên, Mã NV, CCCD..."
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
                <th className="px-4 py-3">Nhân Viên Liên Quan</th>
                <th className="px-4 py-3">Họ và Tên NPT</th>
                <th className="px-4 py-3">CCCD / Mã Số NPT</th>
                <th className="px-4 py-3">Mối Quan Hệ</th>
                <th className="px-4 py-3">Ngày Sinh</th>
                <th className="px-4 py-3">Thời Gian Giảm Trừ</th>
                <th className="px-4 py-3 text-right">Mức Giảm Trừ</th>
                <th className="px-4 py-3">Ghi Chú</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDependents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Chưa có người phụ thuộc nào được đăng ký.
                  </td>
                </tr>
              ) : (
                filteredDependents.map(dep => {
                  const emp = empMap.get(dep.employeeId);
                  return (
                    <tr key={dep.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{emp?.fullName || 'Không rõ'}</div>
                        <div className="font-mono text-[11px] text-emerald-700 font-semibold">{emp?.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800 text-sm">
                        {dep.fullName}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {dep.taxCodeOrId || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]">
                          {dep.relationship}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {dep.birthDate}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        <span>{dep.startDate}</span>
                        <span className="text-slate-400"> đến </span>
                        <span>{dep.endDate || 'Hiện tại'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                        {formatVND(dep.deductionAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {dep.note || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canEditEmployees && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(dep)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteDependent(dep.id)}
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              {editingDep ? 'Chỉnh Sửa Người Phụ Thuộc' : 'Đăng Ký Người Phụ Thuộc Mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhân Viên Liên Quan *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Họ và Tên Người Phụ Thuộc *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Minh Khang"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CCCD / MST / Mã NPT</label>
                  <input
                    type="text"
                    placeholder="Mã số hoặc CCCD"
                    value={formData.taxCodeOrId}
                    onChange={e => setFormData({ ...formData, taxCodeOrId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mối Quan Hệ</label>
                  <select
                    value={formData.relationship}
                    onChange={e => setFormData({ ...formData, relationship: e.target.value as RelationshipType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Con đẻ/Con nuôi">Con đẻ / Con nuôi</option>
                    <option value="Vợ/Chồng">Vợ / Chồng</option>
                    <option value="Cha mẹ ruột">Cha mẹ ruột</option>
                    <option value="Cha mẹ vợ/chồng">Cha mẹ vợ / chồng</option>
                    <option value="Người không nơi nương tựa">Người không nơi nương tựa</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày Sinh</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bắt Đầu (YYYY-MM)</label>
                  <input
                    type="month"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kết Thúc (Nếu có)</label>
                  <input
                    type="month"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức Giảm Trừ (VNĐ/tháng)</label>
                <input
                  type="number"
                  step={100000}
                  value={formData.deductionAmount}
                  onChange={e => setFormData({ ...formData, deductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <input
                  type="text"
                  placeholder="Ghi chú hồ sơ chứng minh..."
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
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
