import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Sparkles, Building, Briefcase, CreditCard, DollarSign } from 'lucide-react';
import { Employee, Department, Position, SalaryCalculationBasis, WorkStatus } from '../types';
import { generateEmployeeCode } from '../data/initialData';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  departments: Department[];
  positions: Position[];
  employeeToEdit?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  departments,
  positions,
  employeeToEdit
}) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    fullName: '',
    idCardNumber: '',
    birthDate: '1995-01-01',
    issueDate: '2021-01-01',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: '',
    phoneNumber: '',
    email: '',
    departmentId: departments[0]?.id || '',
    positionId: positions[0]?.id || '',
    employeeCode: '',
    workStatus: 'active',
    startDate: new Date().toISOString().slice(0, 10),
    salaryBasis: 'monthly',
    baseSalary: 10000000,
    hourlyRate: 50000,
    salaryPercent: 100,
    bankAccount: '',
    bankName: 'Vietcombank',
    taxId: ''
  });

  const [autoCodeRule, setAutoCodeRule] = useState<boolean>(true);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        ...employeeToEdit,
        hourlyRate: employeeToEdit.hourlyRate || (employeeToEdit.salaryBasis === 'hourly' ? 50000 : 0)
      });
      setAutoCodeRule(false);
    } else {
      const defaultDep = departments[0]?.id || '';
      const defaultPos = positions[0]?.id || '';
      setFormData({
        id: `emp-${Date.now()}`,
        fullName: '',
        idCardNumber: '',
        birthDate: '1995-01-01',
        issueDate: '2021-01-01',
        issuePlace: 'Cục Cảnh sát QLHC về TTXH',
        address: '',
        phoneNumber: '',
        email: '',
        departmentId: defaultDep,
        positionId: defaultPos,
        employeeCode: '',
        workStatus: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        salaryBasis: 'monthly',
        baseSalary: 10000000,
        hourlyRate: 50000,
        salaryPercent: 100,
        bankAccount: '',
        bankName: 'Vietcombank',
        taxId: ''
      });
      setAutoCodeRule(true);
    }
  }, [employeeToEdit, isOpen, departments, positions]);


  // Tự động sinh mã nhân viên khi thay đổi chức vụ hoặc CCCD nếu bật autoCodeRule
  useEffect(() => {
    if (autoCodeRule && formData.positionId && formData.idCardNumber) {
      const pos = positions.find(p => p.id === formData.positionId);
      const code = generateEmployeeCode(pos?.code || 'NV', formData.idCardNumber);
      setFormData(prev => ({ ...prev, employeeCode: code }));
    }
  }, [formData.positionId, formData.idCardNumber, autoCodeRule, positions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.idCardNumber) {
      alert('Vui lòng nhập Họ tên và Số CCCD!');
      return;
    }

    const pos = positions.find(p => p.id === formData.positionId);
    const finalCode = formData.employeeCode || generateEmployeeCode(pos?.code || 'NV', formData.idCardNumber);

    const newEmp: Employee = {
      id: formData.id || `emp-${Date.now()}`,
      employeeCode: finalCode,
      fullName: formData.fullName || '',
      idCardNumber: formData.idCardNumber || '',
      birthDate: formData.birthDate || '1995-01-01',
      issueDate: formData.issueDate || '2021-01-01',
      issuePlace: formData.issuePlace || 'Cục Cảnh sát QLHC về TTXH',
      address: formData.address || '',
      phoneNumber: formData.phoneNumber || '',
      email: formData.email || '',
      departmentId: formData.departmentId || departments[0]?.id || '',
      positionId: formData.positionId || positions[0]?.id || '',
      workStatus: formData.workStatus as WorkStatus || 'active',
      startDate: formData.startDate || '2024-01-01',
      salaryBasis: formData.salaryBasis as SalaryCalculationBasis || 'monthly',
      baseSalary: Number(formData.baseSalary) || 0,
      salaryPercent: Number(formData.salaryPercent) || 100,
      bankAccount: formData.bankAccount || '',
      bankName: formData.bankName || '',
      taxId: formData.taxId || ''
    };

    onSave(newEmp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {employeeToEdit ? 'Chỉnh Sửa Hồ Sơ Người Lao Động' : 'Thêm Mới Hồ Sơ Người Lao Động'}
              </h3>
              <p className="text-xs text-slate-400">
                Mã NV được sinh tự động theo quy tắc: [Mã Chức Vụ]-[4 số cuối CCCD]
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. Thông tin định danh & Cá nhân */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span>1. Thông Tin Cá Nhân & Căn Cước Công Dân</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Căn Cước (CCCD) *</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="12 chữ số CCCD"
                  value={formData.idCardNumber}
                  onChange={e => setFormData({ ...formData, idCardNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Mã Nhân Viên *</label>
                  <span className="text-[10px] text-emerald-600 font-medium">Auto: [CV]-[4 số CCCD]</span>
                </div>
                <input
                  type="text"
                  required
                  value={formData.employeeCode}
                  onChange={e => {
                    setAutoCodeRule(false);
                    setFormData({ ...formData, employeeCode: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Sinh</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Cấp CCCD</label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nơi Cấp</label>
                <input
                  type="text"
                  value={formData.issuePlace}
                  onChange={e => setFormData({ ...formData, issuePlace: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ Thường Trú</label>
                <input
                  type="text"
                  placeholder="Số nhà, đường phố, phường/xã, quận/huyện, tỉnh/thành"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  value={formData.phoneNumber || ''}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Số Thuế Cá Nhân (MST)</label>
                <input
                  type="text"
                  placeholder="Mã số thuế 10 số"
                  value={formData.taxId}
                  onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Công việc, phòng ban, chức vụ */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span>2. Vị Trí & Trạng Thái Công Việc</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng Ban *</label>
                <select
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chức Vụ *</label>
                <select
                  value={formData.positionId}
                  onChange={e => setFormData({ ...formData, positionId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng Thái Công Việc *</label>
                <select
                  value={formData.workStatus}
                  onChange={e => setFormData({ ...formData, workStatus: e.target.value as WorkStatus })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="active">Đang làm việc</option>
                  <option value="probation">Thử việc</option>
                  <option value="resigned">Đã nghỉ việc</option>
                  <option value="transferred">Điều chuyển công tác</option>
                  <option value="maternity">Nghỉ thai sản</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Vào Làm</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Lương & Thanh toán */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>3. Cơ Sở Tính Lương & Tài Khoản Ngân Hàng</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hình Thức Tính Lương *</label>
                <select
                  value={formData.salaryBasis}
                  onChange={e => setFormData({ ...formData, salaryBasis: e.target.value as SalaryCalculationBasis })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="monthly">Lương tháng cố định</option>
                  <option value="daily">Lương theo ngày công thực tế</option>
                  <option value="hourly">Lương theo giờ làm việc (Hourly)</option>
                  <option value="percent">Lương theo % hiệu quả (KPI)</option>
                  <option value="department">Lương theo bộ phận</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formData.salaryBasis === 'hourly' ? 'Mức Lương Tham Chiếu / HĐ (VNĐ)' : 'Lương Cơ Bản / HĐ (VNĐ) *'}
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={100000}
                  value={formData.baseSalary}
                  onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-semibold"
                />
              </div>

              {formData.salaryBasis === 'hourly' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">Đơn Giá Lương / Giờ (VNĐ/giờ) *</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    placeholder="Ví dụ: 50000"
                    value={formData.hourlyRate || ''}
                    onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-emerald-900 bg-emerald-50/50"
                  />
                  <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Lương chính = Giờ làm × Đơn giá/giờ</span>
                </div>
              )}

              {formData.salaryBasis === 'percent' && (

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tỷ lệ hưởng lương (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={formData.salaryPercent}
                    onChange={e => setFormData({ ...formData, salaryPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 190333221100"
                  value={formData.bankAccount}
                  onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Ngân Hàng & Chi Nhánh</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vietcombank CN Hà Nội"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{employeeToEdit ? 'Lưu Thay Đổi' : 'Thêm Nhân Viên'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
