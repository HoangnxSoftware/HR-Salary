import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AppUser } from '../types';

interface AuthRoleContextType {
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  selectedEmployeeIdForSelf: string;
  setSelectedEmployeeIdForSelf: (id: string) => void;
  canEditSettings: boolean;
  canEditEmployees: boolean;
  canEditTimekeeping: boolean;
  canApprovePayroll: boolean;
  canExportData: boolean;
  roleLabel: string;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('admin');
  const [selectedEmployeeIdForSelf, setSelectedEmployeeIdForSelf] = useState<string>('emp-004'); // Mặc định là NV Dev nếu chuyển vai trò

  const canEditSettings = currentUserRole === 'admin';
  const canEditEmployees = currentUserRole === 'admin' || currentUserRole === 'accountant';
  const canEditTimekeeping = currentUserRole === 'admin' || currentUserRole === 'accountant' || currentUserRole === 'payroll';
  const canApprovePayroll = currentUserRole === 'admin' || currentUserRole === 'accountant';
  const canExportData = currentUserRole !== 'employee';

  const roleLabel = 
    currentUserRole === 'admin' ? 'Quản trị viên (Admin)' :
    currentUserRole === 'accountant' ? 'Kế toán trưởng (Chief Accountant)' :
    currentUserRole === 'payroll' ? 'Kế toán tiền lương (Payroll Officer)' : 'Người lao động (Employee)';

  return (
    <AuthRoleContext.Provider
      value={{
        currentUserRole,
        setCurrentUserRole,
        selectedEmployeeIdForSelf,
        setSelectedEmployeeIdForSelf,
        canEditSettings,
        canEditEmployees,
        canEditTimekeeping,
        canApprovePayroll,
        canExportData,
        roleLabel
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
