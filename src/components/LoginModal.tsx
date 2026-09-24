import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  Building2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Cloud,
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  Database,
  Search,
  Check,
  X
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { SystemSettings, GoogleSyncState } from '../types';
import { googleSignIn, logout, getCurrentUser } from '../services/authService';
import { 
  listDriveSpreadsheets, 
  DriveSpreadsheetItem,
  fetchSpreadsheetDetails,
  extractSpreadsheetId,
  createNewCompanySpreadsheet,
  FullPayrollData
} from '../services/googleSheetsService';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  settings: SystemSettings;
  syncState: GoogleSyncState;
  setSyncState: React.Dispatch<React.SetStateAction<GoogleSyncState>>;
  onApplyNewCompanyData?: (newData: FullPayrollData, spreadsheetInfo?: { id: string; url: string; title: string }) => void;
  onLoadDataFromSpreadsheet?: (spreadsheetId: string, spreadsheetName?: string) => Promise<boolean>;
  onResetToDemoData?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  settings,
  syncState,
  setSyncState,
  onApplyNewCompanyData,
  onLoadDataFromSpreadsheet,
  onResetToDemoData
}) => {
  const { login } = useAuthRole();
  const [activeTab, setActiveTab] = useState<'login' | 'google'>('login');
  
  // Credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google Drive state
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(syncState.spreadsheetId);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(syncState.spreadsheetName || null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(syncState.spreadsheetUrl || null);

  // Mode for new company creation
  const [showCreateCompanyForm, setShowCreateCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyTaxCode, setNewCompanyTaxCode] = useState('');
  const [newCompanyDirector, setNewCompanyDirector] = useState('');
  const [newCompanyAccountant, setNewCompanyAccountant] = useState('');
  const [isPendingNewCompany, setIsPendingNewCompany] = useState<FullPayrollData | null>(null);
  const [newCompanySuccessNotice, setNewCompanySuccessNotice] = useState<string | null>(null);

  // Search filter for Drive files
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  if (!isOpen) return null;

  // Load drive files when switching to google tab or when connected
  const handleLoadDriveFiles = async () => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const files = await listDriveSpreadsheets();
      setDriveFiles(files);
      if (files.length === 0) {
        setErrorMessage('Không tìm thấy bảng tính nào trên Google Drive hoặc chưa có file. Bạn có thể tạo mới ở nút bên dưới.');
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải file Google Drive:', err);
      setErrorMessage(`Lỗi khi đọc Google Drive: ${err.message || 'Chưa được cấp quyền'}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleProcessing(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setSyncState(prev => ({
          ...prev,
          isConnected: true,
          userEmail: res.user.email,
          syncMessage: 'Đã kết nối tài khoản Google!'
        }));
        setSuccessMessage(`Đã kết nối tài khoản Google: ${res.user.email}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Load spreadsheets
        await handleLoadDriveFiles();
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setErrorMessage(`Đăng nhập Google không thành công: ${err.message || 'Lỗi kết nối'}`);
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setSyncState(prev => ({
        ...prev,
        isConnected: false,
        userEmail: null,
        syncMessage: 'Đã ngắt kết nối tài khoản Google.'
      }));
      setDriveFiles([]);
      setSelectedFileId(null);
      setSelectedFileName(null);
      setSelectedFileUrl(null);
      setSuccessMessage('Đã ngắt kết nối tài khoản Google.');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(`Lỗi khi đăng xuất Google: ${err.message}`);
    }
  };

  // Select an existing spreadsheet from list
  const handleSelectSpreadsheet = (file: DriveSpreadsheetItem) => {
    setSelectedFileId(file.id);
    setSelectedFileName(file.name);
    setSelectedFileUrl(file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`);
    setIsPendingNewCompany(null);
    setSuccessMessage(`Đã chọn bảng tính: ${file.name}`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Connect via direct link or ID
  const handleConnectCustomSheet = async () => {
    if (!customSheetInput.trim()) return;
    setIsGoogleProcessing(true);
    setErrorMessage(null);
    try {
      const cleanId = extractSpreadsheetId(customSheetInput);
      const details = await fetchSpreadsheetDetails(cleanId);
      setSelectedFileId(details.id);
      setSelectedFileName(details.title);
      setSelectedFileUrl(details.url);
      setIsPendingNewCompany(null);
      setSuccessMessage(`Kết nối thành công bảng tính: ${details.title}`);
      setCustomSheetInput('');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Không tìm thấy bảng tính: ${err.message}`);
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  // Create clean database for new company
  const handleCreateNewCompanyDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setErrorMessage('Vui lòng nhập tên công ty / doanh nghiệp mới!');
      return;
    }

    setIsGoogleProcessing(true);
    setErrorMessage(null);
    try {
      const res = await createNewCompanySpreadsheet({
        companyName: newCompanyName.trim(),
        taxCode: newCompanyTaxCode.trim(),
        directorName: newCompanyDirector.trim(),
        chiefAccountantName: newCompanyAccountant.trim(),
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1
      });

      setSelectedFileId(res.id);
      setSelectedFileName(res.title);
      setSelectedFileUrl(res.url);
      setIsPendingNewCompany(res.cleanData);

      // Also apply right away to app if callback provided
      if (onApplyNewCompanyData) {
        onApplyNewCompanyData(res.cleanData, {
          id: res.id,
          url: res.url,
          title: res.title
        });
      }

      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        spreadsheetId: res.id,
        spreadsheetName: res.title,
        spreadsheetUrl: res.url,
        syncMessage: `Đang kết nối cơ sở dữ liệu mới: ${res.title}`
      }));

      const msg = `Đã tạo mới thành công bảng tính "${res.title}" trên Google Drive! Cơ sở dữ liệu được để trống hoàn toàn để bạn nhập liệu khi đăng nhập.`;
      setNewCompanySuccessNotice(msg);
      setSuccessMessage(msg);
      setShowCreateCompanyForm(false);
      setNewCompanyName('');
      setNewCompanyTaxCode('');
      setNewCompanyDirector('');
      setNewCompanyAccountant('');

      // Auto switch to login tab
      setTimeout(() => {
        setActiveTab('login');
      }, 1200);
    } catch (err: any) {
      console.error('Lỗi khi tạo mới bảng tính công ty:', err);
      setErrorMessage(`Tạo mới cơ sở dữ liệu thất bại: ${err.message}`);
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  // Apply selected database and proceed to login
  const handleApplyAndSwitchToLogin = async () => {
    if (selectedFileId && !isPendingNewCompany && onLoadDataFromSpreadsheet) {
      setIsGoogleProcessing(true);
      try {
        await onLoadDataFromSpreadsheet(selectedFileId, selectedFileName || undefined);
        setSuccessMessage(`Đã nạp cơ sở dữ liệu từ "${selectedFileName || selectedFileId}".`);
      } catch (err: any) {
        setErrorMessage(`Lỗi nạp dữ liệu từ bảng tính: ${err.message}`);
      } finally {
        setIsGoogleProcessing(false);
      }
    }
    setActiveTab('login');
  };

  // Reset to local demo data
  const handleUseLocalDemoData = () => {
    if (onResetToDemoData) {
      onResetToDemoData();
    }
    setSelectedFileId(null);
    setSelectedFileName(null);
    setSelectedFileUrl(null);
    setIsPendingNewCompany(null);
    setNewCompanySuccessNotice(null);
    setSuccessMessage('Đã chuyển sang chế độ dữ liệu mẫu nội bộ (Offline).');
    setTimeout(() => setSuccessMessage(null), 2500);
    setActiveTab('login');
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If an existing sheet was selected and hasn't been loaded yet
    if (selectedFileId && !isPendingNewCompany && onLoadDataFromSpreadsheet && selectedFileId !== syncState.spreadsheetId) {
      try {
        await onLoadDataFromSpreadsheet(selectedFileId, selectedFileName || undefined);
      } catch (err) {
        console.warn('Lỗi nạp Google Sheet trước khi đăng nhập:', err);
      }
    }

    const result = login(username, password);
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công!');
      return;
    }

    setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');
    setTimeout(() => {
      setSuccessMessage(null);
      if (onClose) onClose();
    }, 600);
  };

  // 1-Click Quick Login
  const handleQuickLogin = async (uname: string, pwd?: string) => {
    setUsername(uname);
    setPassword(pwd || '123');
    setErrorMessage(null);

    if (selectedFileId && !isPendingNewCompany && onLoadDataFromSpreadsheet && selectedFileId !== syncState.spreadsheetId) {
      try {
        await onLoadDataFromSpreadsheet(selectedFileId, selectedFileName || undefined);
      } catch (err) {
        console.warn('Lỗi nạp Google Sheet trước khi đăng nhập:', err);
      }
    }

    const result = login(uname, pwd || '123');
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công!');
      return;
    }

    setSuccessMessage(`Đăng nhập thành công với tài khoản "${uname}"!`);
    setTimeout(() => {
      setSuccessMessage(null);
      if (onClose) onClose();
    }, 500);
  };

  // Filter drive files by search
  const filteredFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Decorative Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

        {/* Company Header */}
        <div className="text-center mb-4 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Đăng Nhập Phần Mềm Tính Lương
          </h2>
          
          {/* Active Company & Database Badge */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              {isPendingNewCompany ? isPendingNewCompany.settings.companyName : settings.companyName}
            </span>
            {selectedFileName || syncState.spreadsheetName ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span className="max-w-[160px] truncate">{selectedFileName || syncState.spreadsheetName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-600">
                <Database className="w-3 h-3 text-slate-400" />
                <span>Dữ liệu mẫu nội bộ</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đăng Nhập Tài Khoản</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              if (syncState.isConnected && driveFiles.length === 0) {
                handleLoadDriveFiles();
              }
            }}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'google'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Cơ Sở Dữ Liệu Google Drive / Sheet</span>
            {(selectedFileName || syncState.spreadsheetId) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
            <button 
              type="button" 
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {newCompanySuccessNotice && (
          <div className="mb-3 p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-medium space-y-1">
            <div className="font-bold flex items-center gap-1 text-teal-800">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Cơ sở dữ liệu công ty mới đã sẵn sàng!</span>
            </div>
            <p className="text-[11px] text-teal-700">
              Bảng tính Google Sheets đã được khởi tạo với cấu trúc 8 phân hệ rỗng (0 nhân viên). Hãy đăng nhập để bắt đầu thiết lập thông tin nhân sự và bảng lương mới.
            </p>
          </div>
        )}

        {/* TAB 1: USER LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Active Data Source Summary Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className={`p-2 rounded-xl ${selectedFileName || syncState.spreadsheetId ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {selectedFileName || syncState.spreadsheetId ? <Cloud className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Nguồn dữ liệu làm việc</div>
                  <div className="font-bold text-slate-800 truncate">
                    {selectedFileName || syncState.spreadsheetName || 'Dữ liệu mẫu nội bộ'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('google');
                  if (syncState.isConnected && driveFiles.length === 0) {
                    handleLoadDriveFiles();
                  }
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
              >
                Đổi / Tạo mới ➔
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tên đăng nhập hoặc Email</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin, ketoantruong, nhanvien..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mật khẩu truy cập</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu (Mặc định: 123)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGoogleProcessing}
                className="w-full mt-1 py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGoogleProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Đăng Nhập Hệ Thống</span>
              </button>
            </form>

            {/* Quick Demo One-Click Accounts */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Đăng Nhập Nhanh Mẫu (1-Click)</span>
                </span>
                <span className="text-[10px] text-slate-400">Pass: 123</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', '123')}
                  className="p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 group-hover:text-emerald-700">👑 Quản Trị Viên</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500">admin / Toàn quyền</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('ketoantruong', '123')}
                  className="p-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 group-hover:text-blue-700">💼 Kế Toán Trưởng</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500">ketoantruong / Duyệt lương</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('ketoanluong', '123')}
                  className="p-2 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 group-hover:text-purple-700">📝 Kế Toán Lương</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500">ketoanluong / Chấm công, BH</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('nhanvien', '123')}
                  className="p-2 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 group-hover:text-teal-700">👤 Người Lao Động</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500">nhanvien / Xem phiếu lương</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE DRIVE / SHEETS & NEW COMPANY DATABASE */}
        {activeTab === 'google' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Google Authentication Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Trạng thái kết nối Google</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${syncState.isConnected ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'}`} />
                  <span className="text-xs font-bold text-slate-900">
                    {syncState.isConnected ? syncState.userEmail : 'Chưa đăng nhập Google'}
                  </span>
                </div>
              </div>

              {syncState.isConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDriveFiles}
                    disabled={isLoadingFiles}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Tải lại danh sách bảng tính từ Drive"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleProcessing}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs cursor-pointer transition-all shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>Kết Nối Google Drive / Sheets</span>
                </button>
              )}
            </div>

            {/* Currently Active / Selected Spreadsheet Display */}
            {selectedFileId && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Bảng tính đang được chọn:</div>
                    <div className="font-bold text-slate-900 truncate">{selectedFileName || selectedFileId}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedFileUrl && (
                    <a
                      href={selectedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 rounded-lg shadow-2xs transition-colors"
                      title="Mở Google Sheets trên tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyAndSwitchToLogin}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Dùng Bảng Này</span>
                  </button>
                </div>
              </div>
            )}

            {/* ACTION 1: CREATE NEW COMPANY DATABASE */}
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/60 to-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <span>Tạo Mới Cơ Sở Dữ Liệu Cho Công Ty Mới</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCompanyForm(prev => !prev)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-white px-2.5 py-1 rounded-lg border border-teal-300 shadow-2xs transition-colors cursor-pointer"
                >
                  {showCreateCompanyForm ? 'Thu gọn' : '+ Mở form tạo mới'}
                </button>
              </div>

              <p className="text-[11px] text-teal-800 leading-relaxed">
                Tạo một Google Spreadsheet hoàn toàn mới trên Drive cho một doanh nghiệp mới. 
                <span className="font-bold"> Dữ liệu nhân sự và chấm công sẽ để trống hoàn toàn</span> để bạn bắt đầu nhập mới khi đăng nhập vào phần mềm.
              </p>

              {showCreateCompanyForm && (
                <form onSubmit={handleCreateNewCompanyDatabase} className="mt-3 pt-3 border-t border-teal-200/80 space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên công ty / doanh nghiệp mới <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Công ty Cổ phần Công nghệ Ánh Dương"
                      value={newCompanyName}
                      onChange={e => setNewCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mã số thuế</label>
                      <input
                        type="text"
                        placeholder="0109988776"
                        value={newCompanyTaxCode}
                        onChange={e => setNewCompanyTaxCode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Giám đốc đại diện</label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={newCompanyDirector}
                        onChange={e => setNewCompanyDirector(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kế toán trưởng</label>
                    <input
                      type="text"
                      placeholder="Trần Thị B"
                      value={newCompanyAccountant}
                      onChange={e => setNewCompanyAccountant(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-teal-200 text-[11px] text-teal-800 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-teal-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Quy trình tự động hóa:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                      <li>Khởi tạo Google Sheets: 8 tab chuẩn (Cài đặt, Nhân viên, BHXH, Chấm công...).</li>
                      <li>Dữ liệu ban đầu để trống (0 nhân viên) — sẵn sàng nhập liệu ngay.</li>
                      <li>Tự động liên kết và chuyển về màn hình đăng nhập.</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={isGoogleProcessing || !syncState.isConnected}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGoogleProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Tạo Mới Cơ Sở Dữ Liệu Rỗng Trên Google Drive</span>
                  </button>
                  {!syncState.isConnected && (
                    <p className="text-[11px] text-amber-700 text-center">
                      * Cần kết nối tài khoản Google trước khi tạo file trên Drive.
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* ACTION 2: SELECT EXISTING SPREADSHEET FROM DRIVE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <span>Lựa Chọn Google Sheet Có Sẵn Trên Drive</span>
                </div>
                {syncState.isConnected && (
                  <button
                    type="button"
                    onClick={handleLoadDriveFiles}
                    disabled={isLoadingFiles}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    <span>Lấy lại danh sách</span>
                  </button>
                )}
              </div>

              {/* Direct Link or ID input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Dán link hoặc mã Spreadsheet ID..."
                    value={customSheetInput}
                    onChange={e => setCustomSheetInput(e.target.value)}
                    className="w-full pl-3 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConnectCustomSheet}
                  disabled={!customSheetInput.trim() || isGoogleProcessing || !syncState.isConnected}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  Kết nối
                </button>
              </div>

              {/* List of files on drive */}
              {syncState.isConnected ? (
                <div className="space-y-2">
                  {driveFiles.length > 0 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm bảng tính..."
                        value={fileSearchQuery}
                        onChange={e => setFileSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  )}

                  {isLoadingFiles ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>Đang quét danh sách bảng tính trên Google Drive của bạn...</span>
                    </div>
                  ) : filteredFiles.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                      {filteredFiles.map(file => {
                        const isSelected = selectedFileId === file.id;
                        return (
                          <div
                            key={file.id}
                            onClick={() => handleSelectSpreadsheet(file)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileSpreadsheet className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isSelected ? (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-bold">
                                  Đang chọn
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="px-2 py-0.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-md text-[10px]"
                                >
                                  Chọn
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Chưa có bảng tính nào được tải. Nhấn nút &quot;Làm mới&quot; hoặc &quot;Tạo mới cơ sở dữ liệu&quot; ở trên.
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Vui lòng nhấn nút &quot;Kết Nối Google Drive / Sheets&quot; ở trên để xem danh sách bảng tính.
                </div>
              )}
            </div>

            {/* Offline / Local Demo fallback option */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleUseLocalDemoData}
                className="text-slate-500 hover:text-slate-700 underline text-[11px] cursor-pointer"
              >
                Hoặc làm việc với dữ liệu mẫu nội bộ (Không dùng Google Sheets)
              </button>

              <button
                type="button"
                onClick={handleApplyAndSwitchToLogin}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Quay lại đăng nhập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Security Footnote */}
        <div className="mt-3 pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Dữ liệu bảng lương được đồng bộ bảo mật trực tiếp trên Google Drive cá nhân của bạn.</span>
        </div>
      </div>
    </div>
  );
};
