import React, { useState } from 'react';
import { 
  Cloud, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Table, 
  FileSpreadsheet, 
  X,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { GoogleSyncState, SystemSettings } from '../types';
import { googleSignIn, logout, getCurrentUser } from '../services/authService';
import { 
  getOrCreateSpreadsheet, 
  exportDataToGoogleSheets, 
  importDataFromGoogleSheets,
  FullPayrollData
} from '../services/googleSheetsService';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: GoogleSyncState;
  setSyncState: React.Dispatch<React.SetStateAction<GoogleSyncState>>;
  payrollData: FullPayrollData;
  onDataImported: (importedData: Partial<FullPayrollData>) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  setSyncState,
  payrollData,
  onDataImported
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsProcessing(true);
    setActionMessage('Đang kết nối tài khoản Google...');
    try {
      const result = await googleSignIn();
      if (result) {
        setSyncState(prev => ({
          ...prev,
          isConnected: true,
          userEmail: result.user.email,
          syncMessage: 'Đăng nhập Google thành công!'
        }));
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setActionMessage(`Lỗi đăng nhập: ${err.message || 'Không thể xác thực'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSyncState(prev => ({
      ...prev,
      isConnected: false,
      userEmail: null,
      syncMessage: 'Đã ngắt kết nối tài khoản Google.'
    }));
  };

  const handleCreateOrLinkSheet = async () => {
    setIsProcessing(true);
    setActionMessage('Đang kiểm tra và khởi tạo file Bảng lương trên Google Drive...');
    try {
      const title = `Bảng Lương & Nhân Sự - ${payrollData.settings.companyName || 'Công Ty'}`;
      const sheet = await getOrCreateSpreadsheet(title);
      setSyncState(prev => ({
        ...prev,
        spreadsheetId: sheet.id,
        spreadsheetName: title,
        spreadsheetUrl: sheet.url,
        syncMessage: `Đã kết nối Spreadsheet: ${title}`
      }));
      setActionMessage('Khởi tạo Google Sheets thành công!');
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setActionMessage(`Lỗi tạo bảng tính: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Requirement: Explicit user confirmation dialog before updating/overwriting end user data in Google Drive/Sheets
  const requestSyncToGoogleSheets = () => {
    if (!syncState.spreadsheetId) {
      setActionMessage('Vui lòng tạo hoặc liên kết Google Spreadsheet trước khi đồng bộ.');
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Xác nhận cập nhật Google Sheets',
      message: `Bạn có chắc chắn muốn ghi đè toàn bộ dữ liệu bảng lương, nhân sự, chấm công, BHXH tháng ${payrollData.settings.currentMonth}/${payrollData.settings.currentYear} vào Google Spreadsheet trên Drive của bạn? Thao tác này sẽ cập nhật các tab trong bảng tính.`,
      action: async () => {
        setIsProcessing(true);
        setActionMessage('Đang đồng bộ 8 phân hệ dữ liệu lên Google Sheets...');
        try {
          await exportDataToGoogleSheets(syncState.spreadsheetId!, payrollData);
          const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
          setSyncState(prev => ({
            ...prev,
            lastSyncTime: nowStr,
            syncSuccess: true,
            syncMessage: `Đã đồng bộ thành công vào ${nowStr}`
          }));
          setActionMessage('Đồng bộ lên Google Sheets thành công!');
        } catch (err: any) {
          console.error('Export error:', err);
          setActionMessage(`Lỗi đồng bộ: ${err.message}`);
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  const requestImportFromGoogleSheets = () => {
    if (!syncState.spreadsheetId) {
      setActionMessage('Vui lòng chọn hoặc liên kết Google Spreadsheet trước.');
      return;
    }

    setConfirmDialog({
      show: true,
      title: 'Xác nhận nạp dữ liệu từ Google Sheets',
      message: 'Bạn có chắc chắn muốn đọc lại dữ liệu nhân viên từ Google Spreadsheet về hệ thống? Dữ liệu hiện tại trên trình duyệt sẽ được cập nhật đồng bộ.',
      action: async () => {
        setIsProcessing(true);
        setActionMessage('Đang nạp dữ liệu từ Google Sheets...');
        try {
          const imported = await importDataFromGoogleSheets(syncState.spreadsheetId!);
          onDataImported(imported);
          const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
          setSyncState(prev => ({
            ...prev,
            lastSyncTime: nowStr,
            syncSuccess: true,
            syncMessage: `Đã nạp dữ liệu từ Google Sheets lúc ${nowStr}`
          }));
          setActionMessage('Nạp dữ liệu từ Google Sheets thành công!');
        } catch (err: any) {
          console.error('Import error:', err);
          setActionMessage(`Lỗi nạp dữ liệu: ${err.message}`);
        } finally {
          setIsProcessing(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Cloud className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Đồng Bộ Google Sheets & Google Drive</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Lưu trữ và quản lý cơ sở dữ liệu bảng lương trên đám mây cá nhân</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái kết nối Google</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${syncState.isConnected ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-400'}`}></span>
                <span className="font-medium text-slate-900">
                  {syncState.isConnected ? `Đã kết nối: ${syncState.userEmail}` : 'Chưa đăng nhập Google'}
                </span>
              </div>
            </div>

            {syncState.isConnected ? (
              <button
                onClick={handleLogout}
                disabled={isProcessing}
                className="px-3.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                Đăng xuất
              </button>
            ) : (
              /* Official Google Sign-in Button format */
              <button 
                onClick={handleSignIn}
                disabled={isProcessing}
                className="flex items-center gap-2.5 px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Đăng nhập với Google</span>
              </button>
            )}
          </div>

          {/* Spreadsheet Target */}
          <div className="space-y-3 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Bảng tính Google Sheets trên Drive</span>
              </div>
              {syncState.spreadsheetUrl && (
                <a
                  href={syncState.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs hover:bg-emerald-50 transition-colors"
                >
                  <span>Mở Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {syncState.spreadsheetId ? (
              <div className="text-xs text-emerald-800 space-y-1 bg-white/70 p-3 rounded-lg border border-emerald-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên bảng tính:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-xs">
                    {`Bảng Lương & Nhân Sự - ${payrollData.settings.companyName}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã Spreadsheet:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[200px]">{syncState.spreadsheetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lần đồng bộ gần nhất:</span>
                  <span className="font-medium text-emerald-700">{syncState.lastSyncTime || 'Chưa đồng bộ'}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 flex items-center justify-between">
                <span>Chưa liên kết bảng tính trên Google Drive của bạn.</span>
                <button
                  onClick={handleCreateOrLinkSheet}
                  disabled={!syncState.isConnected || isProcessing}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Tạo / Tìm Bảng Tính
                </button>
              </div>
            )}
          </div>

          {/* Sync Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={requestSyncToGoogleSheets}
              disabled={!syncState.isConnected || !syncState.spreadsheetId || isProcessing}
              className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Đẩy Dữ Liệu Lên Google Sheets</span>
            </button>

            <button
              onClick={requestImportFromGoogleSheets}
              disabled={!syncState.isConnected || !syncState.spreadsheetId || isProcessing}
              className="flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium text-sm shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadCloud className="w-4 h-4 text-slate-500" />
              <span>Nạp Dữ Liệu Từ Google Sheets</span>
            </button>
          </div>

          {/* Action notification or feedback */}
          {actionMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Feature details note */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo mật & Cấu trúc lưu trữ</span>
            </div>
            <p>
              Hệ thống tự động khởi tạo và đồng bộ đầy đủ 8 trang tính chuẩn: 
              <span className="font-medium text-slate-800"> Cài đặt chung, Danh sách nhân viên, Người phụ thuộc, Bảo hiểm xã hội, Đăng ký ăn ca, Phụ cấp đặc thù, Bảng chấm công, Bảng thanh toán lương</span>.
            </p>
            <p className="text-slate-500">
              Dữ liệu được lưu trữ trực tiếp trên tài khoản Google Drive cá nhân của bạn, tuân thủ quyền riêng tư và kiểm soát dữ liệu hoàn toàn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive / Mutating operations (Workspace API compliance) */}
      {confirmDialog && confirmDialog.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDialog.action}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận thực hiện</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
