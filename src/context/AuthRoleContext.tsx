import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AppUser, RolePermissions } from '../types';
import { INITIAL_USERS } from '../data/initialData';

interface AuthRoleContextType {
  users: AppUser[];
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  addUser: (user: AppUser) => void;
  updateUser: (user: AppUser) => void;
  deleteUser: (userId: string) => void;

  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  selectedEmployeeIdForSelf: string;
  setSelectedEmployeeIdForSelf: (id: string) => void;

  // Quyền thao tác
  canEditSettings: boolean;
  canEditEmployees: boolean;
  canEditTimekeeping: boolean;
  canApprovePayroll: boolean;
  canExportData: boolean;

  // Quyền chi tiết
  canViewDashboard: boolean;
  canViewEmployees: boolean;
  canViewTimekeeping: boolean;
  canViewInsurance: boolean;
  canEditInsurance: boolean;
  canViewDependents: boolean;
  canEditDependents: boolean;
  canViewMeal: boolean;
  canEditMeal: boolean;
  canViewAllowances: boolean;
  canEditAllowances: boolean;
  canViewPayroll: boolean;
  canEditPayroll: boolean;
  canViewTaxReport: boolean;
  canSyncGoogleSheets: boolean;
  canManageUsers: boolean;

  roleLabel: string;
  roleDescription: string;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'vietthanh_payroll_users';
const CURRENT_USER_STORAGE_KEY = 'vietthanh_current_user';

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load current user', e);
    }
    // Mặc định đăng nhập với tài khoản Quản trị viên (Admin)
    return INITIAL_USERS[0] || null;
  });

  // Lưu danh sách người dùng vào localStorage khi thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }, [users]);

  // Lưu phiên đăng nhập hiện tại
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save currentUser', e);
    }
  }, [currentUser]);

  const [selectedEmployeeIdForSelf, setSelectedEmployeeIdForSelf] = useState<string>(() => {
    return currentUser?.employeeId || 'emp-004';
  });

  useEffect(() => {
    if (currentUser?.employeeId) {
      setSelectedEmployeeIdForSelf(currentUser.employeeId);
    }
  }, [currentUser]);

  const currentUserRole: UserRole = currentUser?.role || 'admin';

  const setCurrentUserRole = (role: UserRole) => {
    if (currentUser) {
      const updated = { ...currentUser, role };
      setCurrentUser(updated);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    }
  };

  const login = (username: string, password?: string): { success: boolean; error?: string } => {
    const cleanUsername = username.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.username.toLowerCase() === cleanUsername || 
      u.email.toLowerCase() === cleanUsername
    );

    if (!foundUser) {
      return { success: false, error: 'Tên đăng nhập hoặc Email không tồn tại trong hệ thống!' };
    }

    if (foundUser.status === 'locked') {
      return { success: false, error: 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên!' };
    }

    // Nếu có mật khẩu cấu hình, kiểm tra mật khẩu
    if (foundUser.password && password !== undefined) {
      if (foundUser.password !== password) {
        return { success: false, error: 'Mật khẩu không chính xác. Vui lòng thử lại!' };
      }
    }

    const updatedUser: AppUser = {
      ...foundUser,
      lastLogin: new Date().toLocaleString('vi-VN', { hour12: false })
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (updatedUser.employeeId) {
      setSelectedEmployeeIdForSelf(updatedUser.employeeId);
    }
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      const updatedUser: AppUser = {
        ...target,
        lastLogin: new Date().toLocaleString('vi-VN', { hour12: false })
      };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === target.id ? updatedUser : u));
      if (target.employeeId) {
        setSelectedEmployeeIdForSelf(target.employeeId);
      }
    }
  };

  const addUser = (newUser: AppUser) => {
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (updatedUser: AppUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const deleteUser = (userId: string) => {
    if (currentUser?.id === userId) {
      alert('Không thể xóa tài khoản đang đăng nhập!');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Tính toán quyền hạn (Custom permissions overrides default role rules if specified)
  const custom = currentUser?.customPermissions || {};

  const canEditSettings = custom.canEditSettings ?? (currentUserRole === 'admin');
  const canManageUsers = custom.canManageUsers ?? (currentUserRole === 'admin');
  
  const canApprovePayroll = custom.canApprovePayroll ?? (currentUserRole === 'admin' || currentUserRole === 'accountant');
  const canEditPayroll = custom.canEditPayroll ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewPayroll = custom.canViewPayroll ?? (currentUserRole !== 'employee');

  const canEditEmployees = custom.canEditEmployees ?? (currentUserRole === 'admin' || currentUserRole === 'accountant');
  const canViewEmployees = custom.canViewEmployees ?? (currentUserRole !== 'employee');

  const canEditTimekeeping = custom.canEditTimekeeping ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewTimekeeping = custom.canViewTimekeeping ?? (currentUserRole !== 'employee');

  const canEditInsurance = custom.canEditInsurance ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewInsurance = custom.canViewInsurance ?? (currentUserRole !== 'employee');

  const canEditDependents = custom.canEditDependents ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewDependents = custom.canViewDependents ?? (currentUserRole !== 'employee');

  const canEditMeal = custom.canEditMeal ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewMeal = custom.canViewMeal ?? (currentUserRole !== 'employee');

  const canEditAllowances = custom.canEditAllowances ?? (currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll');
  const canViewAllowances = custom.canViewAllowances ?? (currentUserRole !== 'employee');

  const canViewTaxReport = custom.canViewTaxReport ?? (currentUserRole !== 'employee');
  const canExportData = custom.canExportData ?? (currentUserRole !== 'employee');
  const canSyncGoogleSheets = custom.canSyncGoogleSheets ?? (currentUserRole === 'admin' || currentUserRole === 'accountant');
  const canViewDashboard = custom.canViewDashboard ?? (currentUserRole !== 'employee');

  const roleLabel = 
    currentUserRole === 'admin' ? 'Quản trị viên (Admin)' :
    currentUserRole === 'accountant' ? 'Kế toán trưởng (Chief Accountant)' :
    currentUserRole === 'payroll' ? 'Kế toán tiền lương (Payroll Officer)' : 'Người lao động (Employee)';

  const roleDescription =
    currentUserRole === 'admin' ? 'Toàn quyền cấu hình hệ thống, quản lý tài khoản & phân quyền, phê duyệt lương.' :
    currentUserRole === 'accountant' ? 'Phê duyệt bảng lương, chốt chi, xem báo cáo tài chính & thuế TNCN, xuất dữ liệu.' :
    currentUserRole === 'payroll' ? 'Chấm công, tính lương, cập nhật BHXH, phụ cấp, giảm trừ và in phiếu lương.' :
    'Xem bảng chấm công, phiếu lương chi tiết và thuế cá nhân của mình.';

  return (
    <AuthRoleContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
        deleteUser,

        currentUserRole,
        setCurrentUserRole,
        selectedEmployeeIdForSelf,
        setSelectedEmployeeIdForSelf,

        canEditSettings,
        canEditEmployees,
        canEditTimekeeping,
        canApprovePayroll,
        canExportData,

        canViewDashboard,
        canViewEmployees,
        canViewTimekeeping,
        canViewInsurance,
        canEditInsurance,
        canViewDependents,
        canEditDependents,
        canViewMeal,
        canEditMeal,
        canViewAllowances,
        canEditAllowances,
        canViewPayroll,
        canEditPayroll,
        canViewTaxReport,
        canSyncGoogleSheets,
        canManageUsers,

        roleLabel,
        roleDescription
      }}
    >
      {children}
    </AuthRoleContext.Provider>
  );
};

export const useAuthRole = () => {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider');
  }
  return context;
};
