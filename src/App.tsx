import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  INITIAL_SETTINGS, 
  INITIAL_EMPLOYEES, 
  INITIAL_DEPENDENTS, 
  INITIAL_INSURANCES, 
  INITIAL_MEAL_REGISTRATIONS, 
  INITIAL_SPECIAL_ALLOWANCES, 
  INITIAL_TIMEKEEPINGS 
} from './data/initialData';
import { 
  SystemSettings, 
  Employee, 
  Dependent, 
  InsuranceRecord, 
  MealRegistration, 
  SpecialAllowance, 
  TimekeepingRecord, 
  PayrollRecord, 
  GoogleSyncState,
  PaymentStatus 
} from './types';
import { calculateEmployeePayroll } from './utils/payrollCalculator';
import { FullPayrollData, importFullDataFromGoogleSheets } from './services/googleSheetsService';
import { getCurrentUser } from './services/authService';

import { AuthRoleProvider, useAuthRole } from './context/AuthRoleContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { PrintSlipModal } from './components/PrintSlipModal';
import { PrintPayrollModal } from './components/PrintPayrollModal';
import { EmployeeModal } from './components/EmployeeModal';

import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { EmployeesView } from './views/EmployeesView';
import { DependentsView } from './views/DependentsView';
import { InsuranceView } from './views/InsuranceView';
import { MealView } from './views/MealView';
import { AllowancesView } from './views/AllowancesView';
import { TimekeepingView } from './views/TimekeepingView';
import { PayrollView } from './views/PayrollView';
import { TaxReportView } from './views/TaxReportView';
import { UserManagementView } from './views/UserManagementView';
import { MyPayslipView } from './views/MyPayslipView';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

function PayrollAppContent() {
  const { currentUser, isAuthenticated, currentUserRole } = useAuthRole();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Auto redirect employee to my_payslip
  useEffect(() => {
    if (currentUserRole === 'employee' && activeTab !== 'my_payslip' && activeTab !== 'timekeeping') {
      setActiveTab('my_payslip');
    }
  }, [currentUserRole, activeTab]);

  // Core Data States
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [dependents, setDependents] = useState<Dependent[]>(INITIAL_DEPENDENTS);
  const [insurances, setInsurances] = useState<InsuranceRecord[]>(INITIAL_INSURANCES);
  const [mealRegistrations, setMealRegistrations] = useState<MealRegistration[]>(INITIAL_MEAL_REGISTRATIONS);
  const [specialAllowances, setSpecialAllowances] = useState<SpecialAllowance[]>(INITIAL_SPECIAL_ALLOWANCES);
  const [timekeepings, setTimekeepings] = useState<TimekeepingRecord[]>(INITIAL_TIMEKEEPINGS);

  // Sync State with Google Sheets / Drive
  const [syncState, setSyncState] = useState<GoogleSyncState>({
    isConnected: false,
    userEmail: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    lastSyncTime: null,
    isSyncing: false,
    syncSuccess: false,
    syncMessage: null
  });

  // Modal states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPrintPayrollOpen, setIsPrintPayrollOpen] = useState(false);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);
  const [selectedSlipEmpId, setSelectedSlipEmpId] = useState<string | undefined>(undefined);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  // Check existing Google Auth session on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        userEmail: user.email
      }));
    }
  }, []);

  // Automatic Dynamic Payroll Calculation Engine
  const payrolls: PayrollRecord[] = useMemo(() => {
    return employees.map(emp => {
      const tk = timekeepings.find(t => t.employeeId === emp.id);
      const ins = insurances.find(i => i.employeeId === emp.id);
      const meal = mealRegistrations.find(m => m.employeeId === emp.id);
      const empAllowances = specialAllowances.filter(a => a.employeeId === emp.id);
      const empDependents = dependents.filter(d => d.employeeId === emp.id);

      return calculateEmployeePayroll(
        emp,
        tk,
        ins,
        meal,
        empAllowances,
        empDependents,
        settings
      );
    });
  }, [employees, timekeepings, insurances, mealRegistrations, specialAllowances, dependents, settings]);

  // Handler: Change Month / Year
  const handleMonthChange = (month: number, year: number) => {
    setSettings(prev => ({ ...prev, currentMonth: month, currentYear: year }));
  };

  // Full data package for Google Sheets sync
  const fullPayrollData: FullPayrollData = useMemo(() => ({
    settings,
    employees,
    dependents,
    insurances,
    mealRegistrations,
    specialAllowances,
    timekeepings,
    payrolls
  }), [settings, employees, dependents, insurances, mealRegistrations, specialAllowances, timekeepings, payrolls]);

  // Handler: Import Data from Google Sheets
  const handleDataImported = (imported: Partial<FullPayrollData>) => {
    if (imported.settings) setSettings(imported.settings);
    if (imported.employees && imported.employees.length > 0) setEmployees(imported.employees);
    if (imported.dependents) setDependents(imported.dependents);
    if (imported.insurances) setInsurances(imported.insurances);
    if (imported.mealRegistrations) setMealRegistrations(imported.mealRegistrations);
    if (imported.specialAllowances) setSpecialAllowances(imported.specialAllowances);
  };

  // Handler: Apply new company clean blank database
  const handleApplyNewCompanyData = (
    newData: FullPayrollData,
    spreadsheetInfo?: { id: string; url: string; title: string }
  ) => {
    setSettings(newData.settings);
    setEmployees(newData.employees);
    setDependents(newData.dependents);
    setInsurances(newData.insurances);
    setMealRegistrations(newData.mealRegistrations);
    setSpecialAllowances(newData.specialAllowances);
    setTimekeepings(newData.timekeepings);

    if (spreadsheetInfo) {
      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        spreadsheetId: spreadsheetInfo.id,
        spreadsheetName: spreadsheetInfo.title,
        spreadsheetUrl: spreadsheetInfo.url,
        syncMessage: `Đang kết nối: ${spreadsheetInfo.title}`
      }));
    }
  };

  // Handler: Load data from Google Spreadsheet
  const handleLoadDataFromSpreadsheet = async (
    spreadsheetId: string,
    spreadsheetName?: string
  ): Promise<boolean> => {
    try {
      const fullData = await importFullDataFromGoogleSheets(spreadsheetId);
      if (fullData) {
        if (fullData.settings) {
          setSettings(prev => ({ ...prev, ...fullData.settings }));
        }
        if (fullData.employees) {
          setEmployees(fullData.employees);
        }
        setSyncState(prev => ({
          ...prev,
          isConnected: true,
          spreadsheetId,
          spreadsheetName: spreadsheetName || fullData.settings?.companyName || prev.spreadsheetName,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          syncMessage: `Đã kết nối dữ liệu Google Sheets: ${spreadsheetName || spreadsheetId}`
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Lỗi khi nạp dữ liệu từ Google Sheets:', err);
      throw err;
    }
  };

  // Handler: Reset to local demo data
  const handleResetToDemoData = () => {
    setSettings(INITIAL_SETTINGS);
    setEmployees(INITIAL_EMPLOYEES);
    setDependents(INITIAL_DEPENDENTS);
    setInsurances(INITIAL_INSURANCES);
    setMealRegistrations(INITIAL_MEAL_REGISTRATIONS);
    setSpecialAllowances(INITIAL_SPECIAL_ALLOWANCES);
    setTimekeepings(INITIAL_TIMEKEEPINGS);
    setSyncState(prev => ({
      ...prev,
      spreadsheetId: null,
      spreadsheetName: null,
      spreadsheetUrl: null,
      syncMessage: 'Đang dùng dữ liệu mẫu nội bộ.'
    }));
  };

  // Employee CRUD
  const handleAddEmployeeClick = () => {
    setEmployeeToEdit(null);
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployeeClick = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (emp: Employee) => {
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.id === emp.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = emp;
        return copy;
      }
      return [...prev, emp];
    });
  };

  const handleDeleteEmployee = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?')) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
    setTimekeepings(prev => prev.filter(t => t.employeeId !== id));
    setInsurances(prev => prev.filter(i => i.employeeId !== id));
    setMealRegistrations(prev => prev.filter(m => m.employeeId !== id));
    setDependents(prev => prev.filter(d => d.employeeId !== id));
    setSpecialAllowances(prev => prev.filter(a => a.employeeId !== id));
  };

  const handleImportEmployees = (imported: Partial<Employee>[]) => {
    const newItems: Employee[] = imported.map((imp, idx) => ({
      id: `emp-${Date.now()}-${idx}`,
      employeeCode: imp.employeeCode || `NV-${1000 + idx}`,
      fullName: imp.fullName || 'Chưa đặt tên',
      idCardNumber: imp.idCardNumber || '',
      birthDate: imp.birthDate || '1995-01-01',
      issueDate: imp.issueDate || '2021-01-01',
      issuePlace: imp.issuePlace || 'Cục Cảnh sát QLHC về TTXH',
      address: imp.address || '',
      phoneNumber: imp.phoneNumber || '',
      email: imp.email || '',
      departmentId: settings.departments[0]?.id || '',
      positionId: settings.positions[0]?.id || '',
      workStatus: imp.workStatus || 'active',
      startDate: imp.startDate || '2024-01-01',
      salaryBasis: imp.salaryBasis || 'monthly',
      baseSalary: imp.baseSalary || 10000000,
      salaryPercent: 100,
      bankAccount: imp.bankAccount || '',
      bankName: imp.bankName || 'Vietcombank',
      taxId: imp.taxId || ''
    }));

    setEmployees(prev => [...prev, ...newItems]);
  };

  // Dependents CRUD
  const handleAddDependent = (dep: Dependent) => setDependents(prev => [...prev, dep]);
  const handleBatchAddDependents = (newDeps: Dependent[]) => setDependents(prev => [...prev, ...newDeps]);
  const handleUpdateDependent = (dep: Dependent) => setDependents(prev => prev.map(d => d.id === dep.id ? dep : d));
  const handleDeleteDependent = (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người phụ thuộc này?')) return;
    setDependents(prev => prev.filter(d => d.id !== id));
  };

  // Insurance update
  const handleUpdateInsurance = (ins: InsuranceRecord) => {
    setInsurances(prev => {
      const idx = prev.findIndex(i => i.id === ins.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ins;
        return copy;
      }
      return [...prev, ins];
    });
  };

  // Meal update
  const handleUpdateMeal = (meal: MealRegistration) => {
    setMealRegistrations(prev => {
      const idx = prev.findIndex(m => m.id === meal.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = meal;
        return copy;
      }
      return [...prev, meal];
    });
  };

  // Allowances CRUD
  const handleAddAllowance = (a: SpecialAllowance) => setSpecialAllowances(prev => [...prev, a]);
  const handleBatchAddAllowances = (newAllowances: SpecialAllowance[]) => setSpecialAllowances(prev => [...prev, ...newAllowances]);
  const handleUpdateAllowance = (a: SpecialAllowance) => setSpecialAllowances(prev => prev.map(item => item.id === a.id ? a : item));
  const handleDeleteAllowance = (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa khoản phụ cấp này?')) return;
    setSpecialAllowances(prev => prev.filter(item => item.id !== id));
  };

  // Timekeeping updates
  const handleUpdateTimekeeping = (tk: TimekeepingRecord) => {
    setTimekeepings(prev => {
      const idx = prev.findIndex(t => t.id === tk.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = tk;
        return copy;
      }
      return [...prev, tk];
    });
  };

  const handleBatchUpdateTimekeeping = (all: TimekeepingRecord[]) => {
    setTimekeepings(all);
  };

  // Payroll updates (status, advance)
  const handleUpdatePayrollStatus = (payrollId: string, status: PaymentStatus) => {
    // Lưu ý: trạng thái paymentStatus được gán trực tiếp
    // We can track paymentStatus overrides in state
    setEmployees(prev => [...prev]); // trigger recalculation
  };

  const handleUpdateAdvancePayment = (payrollId: string, amount: number) => {
    const p = payrolls.find(item => item.id === payrollId);
    if (!p) return;
    // Update allowance with negative or advance
    const empId = p.employeeId;
    const existingAdvance = specialAllowances.find(a => a.employeeId === empId && a.name.includes('Tạm ứng'));
    if (existingAdvance) {
      setSpecialAllowances(prev => prev.map(a => a.id === existingAdvance.id ? { ...a, amount } : a));
    } else {
      setSpecialAllowances(prev => [
        ...prev,
        {
          id: `adv-${Date.now()}`,
          employeeId: empId,
          name: 'Tạm ứng lương trong tháng',
          amount: amount,
          isTaxable: false,
          month: `${settings.currentYear}-${String(settings.currentMonth).padStart(2, '0')}`,
          note: 'Khấu trừ vào kỳ chi trả'
        }
      ]);
    }
  };

  const handleOpenPrintSlip = (empId?: string) => {
    setSelectedSlipEmpId(empId);
    setIsPrintSlipOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          settings={settings}
          syncState={syncState}
          onOpenSync={() => setIsSyncModalOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          employees={employees}
          onMonthChange={handleMonthChange}
          onOpenUserManagement={() => setActiveTab('users')}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              employees={employees}
              payrolls={payrolls}
              timekeepings={timekeepings}
              dependents={dependents}
              settings={settings}
              syncState={syncState}
              onOpenSync={() => setIsSyncModalOpen(true)}
              onNavigate={setActiveTab}
              onPrintPayroll={() => setIsPrintPayrollOpen(true)}
              onPrintAllSlips={() => handleOpenPrintSlip()}
            />
          )}

          {activeTab === 'my_payslip' && (
            <MyPayslipView
              employees={employees}
              payrolls={payrolls}
              timekeepings={timekeepings}
              settings={settings}
              onPrintSlip={handleOpenPrintSlip}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView employees={employees} />
          )}

          {activeTab === 'payroll' && (
            <PayrollView
              payrolls={payrolls}
              employees={employees}
              settings={settings}
              syncState={syncState}
              onOpenSync={() => setIsSyncModalOpen(true)}
              onPrintPayroll={() => setIsPrintPayrollOpen(true)}
              onPrintSlip={handleOpenPrintSlip}
              onUpdatePayrollStatus={handleUpdatePayrollStatus}
              onUpdateAdvancePayment={handleUpdateAdvancePayment}
            />
          )}

          {activeTab === 'timekeeping' && (
            <TimekeepingView
              timekeepings={timekeepings}
              employees={employees}
              settings={settings}
              onUpdateTimekeeping={handleUpdateTimekeeping}
              onBatchUpdateTimekeeping={handleBatchUpdateTimekeeping}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeesView
              employees={employees}
              departments={settings.departments}
              positions={settings.positions}
              onAddEmployee={handleAddEmployeeClick}
              onEditEmployee={handleEditEmployeeClick}
              onDeleteEmployee={handleDeleteEmployee}
              onImportEmployees={handleImportEmployees}
            />
          )}

          {activeTab === 'insurance' && (
            <InsuranceView
              insurances={insurances}
              employees={employees}
              settings={settings}
              onUpdateInsurance={handleUpdateInsurance}
              onUpdateSettings={setSettings}
            />
          )}

          {activeTab === 'dependents' && (
            <DependentsView
              dependents={dependents}
              employees={employees}
              onAddDependent={handleAddDependent}
              onUpdateDependent={handleUpdateDependent}
              onDeleteDependent={handleDeleteDependent}
              onBatchAddDependents={handleBatchAddDependents}
            />
          )}

          {activeTab === 'meal' && (
            <MealView
              mealRegistrations={mealRegistrations}
              employees={employees}
              timekeepings={timekeepings}
              settings={settings}
              onUpdateMeal={handleUpdateMeal}
            />
          )}

          {activeTab === 'allowances' && (
            <AllowancesView
              specialAllowances={specialAllowances}
              employees={employees}
              onAddAllowance={handleAddAllowance}
              onUpdateAllowance={handleUpdateAllowance}
              onDeleteAllowance={handleDeleteAllowance}
              onBatchAddAllowances={handleBatchAddAllowances}
            />
          )}

          {activeTab === 'tax' && (
            <TaxReportView
              payrolls={payrolls}
              employees={employees}
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncState={syncState}
        setSyncState={setSyncState}
        payrollData={fullPayrollData}
        onDataImported={handleDataImported}
      />

      <PrintSlipModal
        isOpen={isPrintSlipOpen}
        onClose={() => setIsPrintSlipOpen(false)}
        employees={employees}
        payrolls={payrolls}
        settings={settings}
        selectedEmployeeId={selectedSlipEmpId}
        month={`${settings.currentMonth}/${settings.currentYear}`}
      />

      <PrintPayrollModal
        isOpen={isPrintPayrollOpen}
        onClose={() => setIsPrintPayrollOpen(false)}
        employees={employees}
        payrolls={payrolls}
        settings={settings}
        month={`${settings.currentMonth}/${settings.currentYear}`}
      />

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        departments={settings.departments}
        positions={settings.positions}
        employeeToEdit={employeeToEdit}
      />

      {/* Login & Security Modals */}
      <LoginModal
        isOpen={!isAuthenticated || isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        settings={settings}
        syncState={syncState}
        setSyncState={setSyncState}
        onApplyNewCompanyData={handleApplyNewCompanyData}
        onLoadDataFromSpreadsheet={handleLoadDataFromSpreadsheet}
        onResetToDemoData={handleResetToDemoData}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthRoleProvider>
      <PayrollAppContent />
    </AuthRoleProvider>
  );
}
