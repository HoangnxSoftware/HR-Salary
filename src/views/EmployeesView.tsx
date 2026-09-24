import React, { useState, useRef, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  CreditCard,
  Building,
  Phone,
  Mail,
  Printer,
  Check,
  X,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Employee, Department, Position, SystemSettings } from '../types';
import { formatVND, getEmployeeWorkStatusDetails } from '../utils/payrollCalculator';
import { exportEmployeesToExcel, downloadEmployeeTemplate, readEmployeeExcel } from '../utils/excelHelper';
import { useAuthRole } from '../context/AuthRoleContext';
import { PrintEmployeesModal } from '../components/PrintEmployeesModal';
import { PrintBatchContractsModal, DocumentType } from '../components/PrintBatchContractsModal';

interface EmployeesViewProps {
  employees: Employee[];
  departments: Department[];
  positions: Position[];
  settings?: SystemSettings;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onImportEmployees: (newEmployees: Partial<Employee>[]) => void;
  onUpdateEmployeeSalary?: (employeeId: string, newSalary: number) => void;
  onUpdateSettings?: (newSettings: SystemSettings) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  departments,
  positions,
  settings,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onImportEmployees,
  onUpdateEmployeeSalary,
  onUpdateSettings
}) => {
  const { canEditEmployees, canExportData } = useAuthRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDuplicateCccdOnly, setFilterDuplicateCccdOnly] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // In hàng loạt hợp đồng lao động & cam kết thu nhập
  const [isBatchContractsModalOpen, setIsBatchContractsModalOpen] = useState(false);
  const [batchModalSelectedIds, setBatchModalSelectedIds] = useState<string[]>([]);
  const [batchModalInitialDocType, setBatchModalInitialDocType] = useState<DocumentType>('contract');
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());

  // Chỉnh sửa nhanh mức lương đến hàng đơn vị (vd: 525.454 hoặc 525454)
  const [editingSalaryEmpId, setEditingSalaryEmpId] = useState<string | null>(null);
  const [salaryInputText, setSalaryInputText] = useState<string>('');

  // 1. PHÁT HIỆN LAO ĐỘNG TRÙNG SỐ CĂN CƯỚC CÔNG DÂN (CCCD)
  const duplicateCccdMap = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach(emp => {
      const cccd = (emp.idCardNumber || '').trim();
      if (cccd) {
        counts.set(cccd, (counts.get(cccd) || 0) + 1);
      }
    });
    return counts;
  }, [employees]);

  const duplicateCccdSet = useMemo(() => {
    const set = new Set<string>();
    duplicateCccdMap.forEach((count, cccd) => {
      if (count > 1) set.add(cccd);
    });
    return set;
  }, [duplicateCccdMap]);

  const totalDuplicateEmployees = useMemo(() => {
    return employees.filter(e => {
      const cccd = (e.idCardNumber || '').trim();
      return cccd && duplicateCccdSet.has(cccd);
    }).length;
  }, [employees, duplicateCccdSet]);

  const startEditSalary = (emp: Employee) => {
    setEditingSalaryEmpId(emp.id);
    setSalaryInputText(new Intl.NumberFormat('vi-VN').format(emp.baseSalary || 0));
  };

  const cancelEditSalary = () => {
    setEditingSalaryEmpId(null);
    setSalaryInputText('');
  };

  const saveEditSalary = (empId: string) => {
    const digitsOnly = salaryInputText.replace(/[^\d]/g, '');
    const newSalary = digitsOnly ? parseInt(digitsOnly, 10) : 0;
    if (onUpdateEmployeeSalary) {
      onUpdateEmployeeSalary(empId, newSalary);
    } else {
      const target = employees.find(e => e.id === empId);
      if (target) {
        onEditEmployee({ ...target, baseSalary: newSalary });
      }
    }
    setEditingSalaryEmpId(null);
  };

  const depMap = new Map(departments.map(d => [d.id, d.name]));
  const posMap = new Map(positions.map(p => [p.id, p.name]));

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = 
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.idCardNumber.includes(searchTerm) ||
      (emp.phoneNumber && emp.phoneNumber.includes(searchTerm));

    const matchDep = filterDepartment === 'all' || emp.departmentId === filterDepartment;
    const matchStatus = filterStatus === 'all' || emp.workStatus === filterStatus;
    const matchDupe = !filterDuplicateCccdOnly || duplicateCccdSet.has((emp.idCardNumber || '').trim());

    return matchSearch && matchDep && matchStatus && matchDupe;
  });

  const toggleSelectEmp = (id: string) => {
    setSelectedEmpIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const handleOpenBatchPrint = (employeeIds?: string[], docType: DocumentType = 'contract') => {
    if (employeeIds && employeeIds.length > 0) {
      setBatchModalSelectedIds(employeeIds);
    } else if (selectedEmpIds.size > 0) {
      setBatchModalSelectedIds(Array.from(selectedEmpIds));
    } else {
      setBatchModalSelectedIds(filteredEmployees.map(e => e.id));
    }
    setBatchModalInitialDocType(docType);
    setIsBatchContractsModalOpen(true);
  };

  const handleExportExcel = () => {
    exportEmployeesToExcel(filteredEmployees, departments, positions);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await readEmployeeExcel(file);
      onImportEmployees(imported);
      setImportNotification(`Đã nhập thành công ${imported.length} nhân viên từ file Excel!`);
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: any) {
      alert(`Lỗi khi đọc file Excel: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Hồ Sơ & Danh Sách Người Lao Động</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin định danh, CCCD, chức vụ, mức lương và mã nhân viên tự động
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
                title="Nhập danh sách từ Excel"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Nhập Excel</span>
              </button>

              <button
                onClick={downloadEmployeeTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="Tải mẫu Excel chuẩn để nhập liệu"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tải Mẫu Excel</span>
              </button>
            </>
          )}

          {canExportData && (
            <>
              {/* In Hàng Loạt Hợp Đồng Lao Động & Bản Cam Kết Thu Nhập */}
              <button
                onClick={() => handleOpenBatchPrint()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                title="In hàng loạt Hợp đồng lao động, Bản cam kết thu nhập theo mẫu (có thể chỉnh sửa mẫu)"
              >
                <FileText className="w-4 h-4" />
                <span>In Hợp Đồng & Cam Kết</span>
              </button>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="In danh sách người lao động"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>In Danh Sách</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </>
          )}

          {canEditEmployees && (
            <button
              onClick={onAddEmployee}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Nhân Viên</span>
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

      {/* CẢNH BÁO BÔI ĐỎ LAO ĐỘNG TRÙNG SỐ CĂN CƯỚC CÔNG DÂN (CCCD) */}
      {totalDuplicateEmployees > 0 && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-red-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-red-900 flex items-center gap-2">
                <span>Cảnh báo: Có {totalDuplicateEmployees} người lao động trùng số Căn cước công dân (CCCD)!</span>
                <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold rounded-full text-[11px] border border-red-300">
                  Đã bôi đỏ trên danh sách
                </span>
              </div>
              <p className="text-[11px] text-red-700 mt-0.5">
                Các hồ sơ trùng số CCCD có thể gây sai sót khi kê khai Thuế TNCN, đóng BHXH hoặc ký hợp đồng lao động. Hãy kiểm tra và điều chỉnh kịp thời.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterDuplicateCccdOnly(!filterDuplicateCccdOnly)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs ${
                filterDuplicateCccdOnly 
                  ? 'bg-red-700 text-white hover:bg-red-800' 
                  : 'bg-white hover:bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{filterDuplicateCccdOnly ? 'Xem tất cả nhân viên' : `Chỉ xem ${totalDuplicateEmployees} người trùng CCCD`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo Tên, Mã NV, Số CCCD, Số điện thoại..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">Tất cả phòng ban</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="probation">Thử việc</option>
            <option value="resigned">Đã nghỉ việc</option>
            <option value="transferred">Điều chuyển</option>
            <option value="maternity">Nghỉ thai sản</option>
          </select>
        </div>

        {/* Lọc nhanh lao động trùng CCCD */}
        <div>
          <button
            type="button"
            onClick={() => setFilterDuplicateCccdOnly(!filterDuplicateCccdOnly)}
            className={`w-full px-3 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border text-xs ${
              filterDuplicateCccdOnly
                ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                : totalDuplicateEmployees > 0
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title="Lọc nhanh danh sách người lao động trùng số Căn cước công dân"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${filterDuplicateCccdOnly ? 'text-white' : totalDuplicateEmployees > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            <span>Trùng CCCD {totalDuplicateEmployees > 0 ? `(${totalDuplicateEmployees})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Thanh tác vụ chọn hàng loạt (Batch Action Bar) */}
      {selectedEmpIds.size > 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">
              Đã tích chọn <strong>{selectedEmpIds.size}</strong> người lao động
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenBatchPrint(Array.from(selectedEmpIds), 'contract')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>In Hợp Đồng ({selectedEmpIds.size})</span>
            </button>
            <button
              onClick={() => handleOpenBatchPrint(Array.from(selectedEmpIds), 'commitment')}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>In Cam Kết Thu Nhập ({selectedEmpIds.size})</span>
            </button>
            <button
              onClick={() => handleOpenBatchPrint(Array.from(selectedEmpIds), 'both')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Cả Bộ Hồ Sơ ({selectedEmpIds.size})</span>
            </button>
            <button
              onClick={() => setSelectedEmpIds(new Set())}
              className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && selectedEmpIds.size === filteredEmployees.length}
                    onChange={selectAllFiltered}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Chọn tất cả danh sách đang hiển thị để in hàng loạt"
                  />
                </th>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Số Căn Cước (CCCD)</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Phòng Ban & Chức Vụ</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3">Hình Thức Lương</th>
                <th className="px-4 py-3 text-right">
                  <div>Lương Cơ Bản / HĐ</div>
                  <div className="text-[10px] font-normal text-slate-400 lowercase">hàng đơn vị (vd: 525.454)</div>
                </th>
                <th className="px-4 py-3">Số Tài Khoản NH</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-slate-400">
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const cccdClean = (emp.idCardNumber || '').trim();
                  const isDupeCccd = cccdClean ? duplicateCccdSet.has(cccdClean) : false;
                  const dupeCount = cccdClean ? duplicateCccdMap.get(cccdClean) || 0 : 0;
                  const isSelected = selectedEmpIds.has(emp.id);

                  return (
                    <tr 
                      key={emp.id} 
                      className={`transition-colors ${
                        isDupeCccd
                          ? 'bg-red-50/90 hover:bg-red-100/90 border-l-4 border-l-red-600 text-red-950 font-medium'
                          : isSelected
                            ? 'bg-emerald-50/70 hover:bg-emerald-100/60'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox for batch printing */}
                      <td className="px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectEmp(emp.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        <span className={`px-2 py-1 rounded border text-slate-800 ${isDupeCccd ? 'bg-red-100 border-red-300 font-black text-red-900' : 'bg-slate-100 border-slate-200'}`}>
                          {emp.employeeCode}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Sinh: {emp.birthDate}</span>
                          {emp.email && <span className="truncate max-w-[120px]">• {emp.email}</span>}
                        </div>
                      </td>

                      {/* Cột Số Căn Cước (CCCD) - Bôi đỏ nổi bật khi trùng */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className={isDupeCccd ? 'text-red-700 font-black text-[13px] tracking-wide' : 'text-slate-800 font-semibold'}>
                          {emp.idCardNumber}
                        </div>
                        {isDupeCccd && (
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded font-sans font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                            <span>Trùng số CCCD ({dupeCount} người)</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">Cấp: {emp.issueDate}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {emp.phoneNumber ? (
                          <a 
                            href={`tel:${emp.phoneNumber}`}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded border border-slate-200 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{emp.phoneNumber}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{depMap.get(emp.departmentId) || '-'}</div>
                        <div className="text-slate-500 text-[11px]">{posMap.get(emp.positionId) || '-'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {(() => {
                          const statusInfo = getEmployeeWorkStatusDetails(emp);
                          return (
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${statusInfo.colorClass}`}>
                                {statusInfo.label}
                              </span>
                              {statusInfo.details && (
                                <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                                  {statusInfo.details}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-700">
                          {emp.salaryBasis === 'monthly' ? 'Lương tháng' :
                           emp.salaryBasis === 'daily' ? 'Theo ngày công' :
                           emp.salaryBasis === 'percent' ? `Theo % (${emp.salaryPercent || 100}%)` : 'Theo bộ phận'}
                        </span>
                      </td>

                      {editingSalaryEmpId === emp.id ? (
                        <td className="px-2 py-2 text-right bg-emerald-50/70 border-y border-emerald-200" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="flex flex-col items-end">
                              <input
                                type="text"
                                autoFocus
                                value={salaryInputText}
                                onChange={e => setSalaryInputText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditSalary(emp.id);
                                  if (e.key === 'Escape') cancelEditSalary();
                                }}
                                placeholder="VD: 525.454"
                                className="w-32 px-2 py-1 text-right font-mono font-bold text-xs bg-white border-2 border-emerald-500 rounded-lg focus:outline-none shadow-xs"
                                title="Nhập mức lương đến hàng đơn vị (vd: 525.454 hoặc 525454)"
                              />
                              <span className="text-[10px] text-emerald-800 font-mono mt-0.5 font-bold">
                                ={formatVND(parseInt(salaryInputText.replace(/[^\d]/g, '') || '0', 10))}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => saveEditSalary(emp.id)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors shadow-xs"
                                title="Lưu mức lương mới (Enter)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditSalary}
                                className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer transition-colors"
                                title="Hủy (Esc)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <td 
                          className={`px-4 py-3.5 text-right font-mono font-bold text-slate-900 group ${canEditEmployees ? 'cursor-pointer hover:bg-emerald-50/60 transition-colors' : ''}`}
                          onClick={() => {
                            if (canEditEmployees) startEditSalary(emp);
                          }}
                          title={canEditEmployees ? "Nhấp để sửa nhanh mức lương đến hàng đơn vị (vd: 525.454)" : undefined}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <span>{formatVND(emp.baseSalary)}</span>
                            {canEditEmployees && (
                              <span className="opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity p-0.5 hover:bg-emerald-100 rounded">
                                <Edit3 className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {emp.bankAccount ? (
                          <div>
                            <div className="font-semibold text-slate-800">{emp.bankAccount}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{emp.bankName}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Tiền mặt</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Nút in Hợp đồng / Cam kết riêng cho từng nhân viên */}
                          <button
                            onClick={() => handleOpenBatchPrint([emp.id], 'contract')}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title="In Hợp đồng lao động & Cam kết thu nhập cho nhân viên này"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {canEditEmployees && (
                            <>
                              <button
                                onClick={() => onEditEmployee(emp)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Sửa thông tin nhân viên"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteEmployee(emp.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa nhân viên"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal In Danh Sách Người Lao Động */}
      {settings && (
        <PrintEmployeesModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          employees={filteredEmployees.length ? filteredEmployees : employees}
          departments={departments}
          positions={positions}
          settings={settings}
        />
      )}

      {/* Modal In Hàng Loạt Hợp Đồng Lao Động & Bản Cam Kết Thu Nhập (Mẫu tùy biến) */}
      {settings && (
        <PrintBatchContractsModal
          isOpen={isBatchContractsModalOpen}
          onClose={() => setIsBatchContractsModalOpen(false)}
          employees={employees}
          departments={departments}
          positions={positions}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          initialSelectedEmployeeIds={batchModalSelectedIds}
          initialDocType={batchModalInitialDocType}
        />
      )}
    </div>
  );
};
