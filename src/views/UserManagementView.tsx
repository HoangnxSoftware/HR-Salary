import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  Lock, 
  Unlock, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Info,
  Building2,
  UserCheck,
  UserX,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { AppUser, UserRole, Employee, RolePermissions } from '../types';

interface UserManagementViewProps {
  employees: Employee[];
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ employees }) => {
  const { 
    users, 
    currentUser, 
    addUser, 
    updateUser, 
    deleteUser, 
    switchUser,
    canManageUsers 
  } = useAuthRole();

  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'policy'>('users');
  const [notification, setNotification] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    name: string;
    email: string;
    role: UserRole;
    employeeId: string;
    status: 'active' | 'locked';
  }>({
    username: '',
    password: '123',
    name: '',
    email: '',
    role: 'payroll',
    employeeId: '',
    status: 'active'
  });

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '123',
      name: '',
      email: '',
      role: 'payroll',
      employeeId: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password || '123',
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId || '',
      status: user.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      updateUser({
        ...editingUser,
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        employeeId: formData.role === 'employee' ? formData.employeeId : undefined,
        status: formData.status
      });
      showToast(`Đã cập nhật tài khoản "${formData.username}" thành công!`);
    } else {
      // Check duplicate username
      if (users.some(u => u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
        alert('Tên đăng nhập này đã tồn tại! Vui lòng chọn tên khác.');
        return;
      }

      const newUser: AppUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        employeeId: formData.role === 'employee' ? formData.employeeId : undefined,
        status: formData.status,
        lastLogin: 'Chưa đăng nhập'
      };

      addUser(newUser);
      showToast(`Đã thêm mới người dùng "${formData.name}" thành công!`);
    }

    setIsModalOpen(false);
  };

  const handleToggleLock = (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('Không thể khóa tài khoản đang đăng nhập!');
      return;
    }
    const newStatus = user.status === 'locked' ? 'active' : 'locked';
    updateUser({
      ...user,
      status: newStatus
    });
    showToast(`Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản "${user.username}"!`);
  };

  const handleDelete = (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('Không thể xóa tài khoản bạn đang đăng nhập!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.name}" (@${user.username})?`)) {
      deleteUser(user.id);
      showToast(`Đã xóa tài khoản "${user.username}" khỏi hệ thống!`);
    }
  };

  const handleResetPassword = (user: AppUser) => {
    const newPwd = prompt(`Đặt lại mật khẩu mới cho tài khoản @${user.username}:`, '123');
    if (newPwd !== null && newPwd.trim() !== '') {
      updateUser({
        ...user,
        password: newPwd.trim()
      });
      showToast(`Đã đổi mật khẩu cho tài khoản "${user.username}" thành "${newPwd.trim()}"!`);
    }
  };

  // Helper map employees
  const empMap = new Map(employees.map(e => [e.id, e.fullName]));

  // Ma trận phân quyền theo vai trò
  const permissionsMatrix = [
    {
      module: '1. Bảng điều khiển (Dashboard)',
      desc: 'Xem biểu đồ KPI lương, tổng chi phí công ty, biến động tháng',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '2. Bảng thanh toán lương (Payroll)',
      desc: 'Xem danh sách lương toàn công ty, in bảng lương tổng hợp',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '3. Phê duyệt & Chốt chi trả lương',
      desc: 'Chuyển trạng thái dự thảo -> đã duyệt -> đã chi trả ngân hàng',
      admin: true,
      accountant: true,
      payroll: false,
      employee: false
    },
    {
      module: '4. Chấm công & Làm thêm giờ (OT)',
      desc: 'Nhập công, ca làm việc, giờ OT ngày thường, CN, lễ, ăn ca',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '5. Danh sách Người lao động',
      desc: 'Xem và sửa hồ sơ nhân sự, mã NV, CCCD, ngày sinh, chức vụ',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '6. Bảo hiểm xã hội (BHXH)',
      desc: 'Quản lý mức lương đóng BHXH, quá trình đóng từng thời kỳ, tỷ lệ',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '7. Người phụ thuộc giảm trừ thuế',
      desc: 'Kê khai người phụ thuộc, thời gian giảm trừ, CCCD, mã số thuế',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '8. Phụ cấp đặc thù & Tạm ứng',
      desc: 'Khai báo phụ cấp theo tháng (chịu thuế / miễn thuế) và tạm ứng',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '9. Báo cáo Quyết toán Thuế TNCN',
      desc: 'Xem báo cáo thuế luỹ tiến 7 bậc toàn đơn vị và từng nhân viên',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '10. Phiếu lương cá nhân (Payslip)',
      desc: 'Xem và in phiếu lương chi tiết từng người lao động',
      admin: true,
      accountant: true,
      payroll: true,
      employee: true
    },
    {
      module: '11. Xuất Excel & Tải Mẫu chuẩn',
      desc: 'Xuất file Excel bảng lương, BHXH, nhân sự, người phụ thuộc',
      admin: true,
      accountant: true,
      payroll: true,
      employee: false
    },
    {
      module: '12. Đồng bộ Google Sheets / Drive',
      desc: 'Kết nối tài khoản Google Drive & sao lưu dữ liệu lên đám mây',
      admin: true,
      accountant: true,
      payroll: false,
      employee: false
    },
    {
      module: '13. Cài đặt hệ thống & Bậc thuế',
      desc: 'Đổi tên công ty, MST, ngày công chuẩn, biểu thuế 7 bậc TT111',
      admin: true,
      accountant: false,
      payroll: false,
      employee: false
    },
    {
      module: '14. Quản lý Người dùng & Phân quyền',
      desc: 'Thêm/sửa tài khoản, phân quyền đăng nhập, đặt lại mật khẩu',
      admin: true,
      accountant: false,
      payroll: false,
      employee: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>Quản Lý Người Dùng & Phân Quyền Hệ Thống</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập danh sách tài khoản đăng nhập, gán vai trò và kiểm soát phân quyền truy cập dữ liệu tiền lương nội bộ
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Tài Khoản Mới</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Tài Khoản ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Ma Trận Phân Quyền (RBAC Matrix)</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'policy'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Chính Sách & Quy Định Bảo Mật</span>
        </button>
      </div>

      {/* TAB 1: Danh sách tài khoản */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Người Dùng / Họ Tên</th>
                    <th className="px-4 py-3.5">Tên Đăng Nhập & Email</th>
                    <th className="px-4 py-3.5">Vai Trò & Quyền Hạn</th>
                    <th className="px-4 py-3.5">Liên Kết Nhân Sự</th>
                    <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                    <th className="px-4 py-3.5">Đăng Nhập Gần Nhất</th>
                    <th className="px-4 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map(u => {
                    const isSelf = u.id === currentUser?.id;
                    const isLocked = u.status === 'locked';

                    return (
                      <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isLocked ? 'bg-slate-50/60 opacity-70' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                              u.role === 'admin' ? 'bg-emerald-600' :
                              u.role === 'accountant' ? 'bg-blue-600' :
                              u.role === 'payroll' ? 'bg-purple-600' : 'bg-teal-600'
                            }`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-800">@{u.username}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            u.role === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            u.role === 'accountant' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            u.role === 'payroll' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                            'bg-teal-50 text-teal-800 border-teal-300'
                          }`}>
                            {u.role === 'admin' ? '👑 Quản Trị Viên' :
                             u.role === 'accountant' ? '💼 Kế Toán Trưởng' :
                             u.role === 'payroll' ? '📝 Kế Toán Lương' : '👤 Người Lao Động'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {u.employeeId ? (
                            <div className="font-medium text-slate-800">
                              <span className="font-mono text-emerald-700 font-bold">{u.employeeId}</span>
                              <span className="text-slate-500 block text-[11px]">
                                {empMap.get(u.employeeId) || 'Không xác định'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Toàn bộ công ty</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{isLocked ? 'Đã Khóa' : 'Hoạt Động'}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                          {u.lastLogin || 'Chưa đăng nhập'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isSelf && (
                              <button
                                onClick={() => switchUser(u.id)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                                title="Chuyển ngay sang tài khoản này để kiểm thử"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                            )}

                            {canManageUsers && (
                              <>
                                <button
                                  onClick={() => handleResetPassword(u)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                                  title="Đặt lại mật khẩu"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {!isSelf && (
                                  <>
                                    <button
                                      onClick={() => handleToggleLock(u)}
                                      className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                        isLocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                                      }`}
                                      title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                    >
                                      {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    </button>

                                    <button
                                      onClick={() => handleDelete(u)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                      title="Xóa tài khoản"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Ma trận phân quyền chi tiết (RBAC Matrix) */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Bảng So Sánh Quyền Hạn Theo Vai Trò (RBAC Matrix)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm soát phân quyền theo nguyên tắc tách biệt nghĩa vụ và bảo mật thông tin thu nhập người lao động
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 min-w-[280px]">Chức Năng & Nghiệp Vụ</th>
                    <th className="px-4 py-3.5 text-center min-w-[120px] text-emerald-800 bg-emerald-50/50">
                      👑 Admin
                    </th>
                    <th className="px-4 py-3.5 text-center min-w-[130px] text-blue-800 bg-blue-50/50">
                      💼 Kế Toán Trưởng
                    </th>
                    <th className="px-4 py-3.5 text-center min-w-[130px] text-purple-800 bg-purple-50/50">
                      📝 Kế Toán Lương
                    </th>
                    <th className="px-4 py-3.5 text-center min-w-[130px] text-teal-800 bg-teal-50/50">
                      👤 Người Lao Động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {permissionsMatrix.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.module}</div>
                        <div className="text-[11px] text-slate-500">{item.desc}</div>
                      </td>

                      <td className="px-4 py-3 text-center bg-emerald-50/20">
                        {item.admin ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-4 h-4 font-black" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center bg-blue-50/20">
                        {item.accountant ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700">
                            <Check className="w-4 h-4 font-black" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center bg-purple-50/20">
                        {item.payroll ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700">
                            <Check className="w-4 h-4 font-black" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center bg-teal-50/20">
                        {item.employee ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700">
                            <Check className="w-4 h-4 font-black" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Chính sách bảo mật & quy định */}
      {activeTab === 'policy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Nguyên Tắc Phân Quyền Bảo Mật Lương (SoD)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Theo quy chuẩn quản trị tài chính doanh nghiệp và Luật An toàn thông tin mạng, hệ thống áp dụng nguyên tắc <strong>Tách biệt trách nhiệm (Segregation of Duties)</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong>Kế toán tiền lương (Payroll Officer):</strong> Trực tiếp tổng hợp chấm công, tăng ca, tính toán lương dự thảo nhưng <em>không có quyền tự duyệt chi trả</em>.
              </li>
              <li>
                <strong>Kế toán trưởng (Chief Accountant):</strong> Kiểm tra, soát xét tính hợp lệ của số liệu và có quyền <em>Phê duyệt bảng thanh toán lương</em>.
              </li>
              <li>
                <strong>Người lao động (Employee):</strong> Chỉ được phép tra cứu phiếu lương cá nhân của chính mình, bảo đảm quyền riêng tư bí mật thu nhập.
              </li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>Quy Định Về Mật Khẩu & Phiên Đăng Nhập</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Để bảo vệ dữ liệu nội bộ doanh nghiệp trước các rủi ro xâm nhập:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>Mỗi cán bộ nhân viên được cấp một tài khoản định danh riêng biệt (Username) gắn liền với mã nhân viên.</li>
              <li>Tài khoản bị tạm khóa sẽ không thể truy cập bất kỳ dữ liệu nào trên hệ thống.</li>
              <li>Quản trị viên có quyền cấp lại mật khẩu hoặc đổi vai trò của người dùng bất kỳ lúc nào.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh Sửa Tài Khoản */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
                  {editingUser ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingUser ? 'Chỉnh Sửa Thông Tin Tài Khoản' : 'Thêm Mới Tài Khoản Người Dùng'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser ? `Chỉnh sửa tài khoản @${editingUser.username}` : 'Cấp quyền truy cập phần mềm cho nhân sự'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên Đăng Nhập *</label>
                  <input
                    type="text"
                    required
                    placeholder="admin, ketoan, hoanglong..."
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mật Khẩu *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mật khẩu truy cập"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và Tên Hiển Thị *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Liên Hệ *</label>
                  <input
                    type="email"
                    required
                    placeholder="example@vietthanh.com.vn"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai Trò Phân Quyền *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="admin">👑 Quản trị viên (Admin) - Toàn quyền hệ thống</option>
                  <option value="accountant">💼 Kế toán trưởng - Phê duyệt lương & Báo cáo thuế</option>
                  <option value="payroll">📝 Kế toán tiền lương - Chấm công, BHXH, tính toán lương</option>
                  <option value="employee">👤 Người lao động - Chỉ xem phiếu lương cá nhân</option>
                </select>
              </div>

              {formData.role === 'employee' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gán Với Nhân Viên Trong Danh Sách *</label>
                  <select
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-emerald-50/50 border-emerald-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Chọn nhân viên liên kết --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} - {emp.fullName}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Người lao động sẽ chỉ được xem phiếu lương và bảng công của nhân viên được chọn ở trên.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trạng Thái Hoạt Động</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-emerald-800">Hoạt động (Được phép đăng nhập)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="locked"
                      checked={formData.status === 'locked'}
                      onChange={() => setFormData({ ...formData, status: 'locked' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-red-700">Tạm khóa tài khoản</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUser ? 'Cập Nhật Tài Khoản' : 'Lưu Tài Khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
