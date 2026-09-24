import React, { useState } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  LogOut, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { GoogleSyncState } from '../types';
import { FullPayrollData, exportDataToGoogleSheets, getOrCreateSpreadsheet } from '../services/googleSheetsService';
import { ensureGoogleAccessToken } from '../services/authService';

interface LogoutSyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: GoogleSyncState;
  setSyncState: React.Dispatch<React.SetStateAction<GoogleSyncState>>;
  payrollData: FullPayrollData;
  onDirectLogout: () => void;
  onOpenSyncModal: () => void;
}

export const LogoutSyncConfirmModal: React.FC<LogoutSyncConfirmModalProps> = ({
  isOpen,
  onClose,
  syncState,
  setSyncState,
  payrollData,
  onDirectLogout,
  onOpenSyncModal
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSyncAndLogout = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setIsSuccess(false);

    try {
      setSyncStatusText('Đang kiểm tra quyền truy cập Google...');
      // Đảm bảo có token
      await ensureGoogleAccessToken();

      let sheetId = syncState.spreadsheetId;
      let sheetUrl = syncState.spreadsheetUrl;
      let sheetName = syncState.spreadsheetName;

      // Nếu chưa có file spreadsheet, tự động tìm hoặc tạo mới
      if (!sheetId) {
        setSyncStatusText('Đang khởi tạo file Bảng lương trên Google Drive...');
        const title = `Bảng Lương & Nhân Sự - ${payrollData.settings.companyName || 'Công Ty'}`;
        const created = await getOrCreateSpreadsheet(title);
        sheetId = created.id;
        sheetUrl = created.url;
        sheetName = title;

        setSyncState(prev => ({
          ...prev,
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
          spreadsheetName: sheetName,
          isConnected: true
        }));
      }

      setSyncStatusText('Đang đẩy 8 phân hệ dữ liệu lên Google Sheets...');
      const res = await exportDataToGoogleSheets(sheetId, payrollData);

      const nowStr = new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN');
      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        lastSyncTime: nowStr,
        syncSuccess: true,
        syncMessage: `Đã đồng bộ ${res.totalUpdatedCells} ô dữ liệu vào ${nowStr}`
      }));

      setIsSuccess(true);
      setSyncStatusText(`Đồng bộ thành công (${res.totalUpdatedCells} ô dữ liệu)! Đang đăng xuất...`);

      // Chờ 1.2s để người dùng nhìn thấy thông báo thành công rồi đăng xuất
      setTimeout(() => {
        setIsSyncing(false);
        onClose();
        onDirectLogout();
      }, 1200);

    } catch (err: any) {
      console.error('Lỗi khi đồng bộ trước khi đăng xuất:', err);
      setIsSyncing(false);
      setErrorMessage(err.message || 'Không thể đồng bộ lên Google Sheets. Vui lòng kiểm tra lại kết nối mạng hoặc quyền truy cập.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white relative">
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
              <UploadCloud className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">ĐỒNG BỘ GOOGLE SHEETS & ĐĂNG XUẤT</h3>
              <p className="text-xs text-emerald-100/90 font-medium">Bảo vệ dữ liệu công ty an toàn trên đám mây</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="text-slate-700 text-xs sm:text-sm leading-relaxed">
            Bạn đang chuẩn bị đăng xuất khỏi phần mềm. Bạn có muốn 
            <strong className="text-slate-900 font-bold"> đồng bộ toàn bộ dữ liệu mới nhất</strong> (nhân sự, chấm công, bảng lương tháng {payrollData.settings.currentMonth}/{payrollData.settings.currentYear}) lên <strong className="text-emerald-700 font-bold">Google Spreadsheet</strong> trước khi thoát không?
          </div>

          {/* Spreadsheet Target Information Card */}
          {syncState.spreadsheetId ? (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Bảng tính Google Sheets liên kết:
                </span>
                {syncState.spreadsheetUrl && (
                  <a 
                    href={syncState.spreadsheetUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Mở file</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                {syncState.spreadsheetName || `ID: ${syncState.spreadsheetId}`}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Tài khoản: <strong className="text-slate-700">{syncState.userEmail || 'Google Drive'}</strong></span>
                <span>Lần đồng bộ gần nhất: <strong className="text-emerald-800">{syncState.lastSyncTime || 'Chưa đồng bộ'}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <div className="font-bold">Chưa liên kết Google Spreadsheet</div>
                <div>Phần mềm sẽ tự động tạo một file Google Spreadsheet mới mang tên công ty trên Drive của bạn để lưu toàn bộ dữ liệu.</div>
              </div>
            </div>
          )}

          {/* Sync Progress / Success State */}
          {isSyncing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div className="text-xs font-bold text-blue-900">{syncStatusText}</div>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="text-xs font-bold text-emerald-900">{syncStatusText}</div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Không thể đồng bộ:</span>
              </div>
              <div className="text-xs text-red-700 leading-relaxed break-words">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-2.5">
          <button
            onClick={handleSyncAndLogout}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xử lý đồng bộ...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Đồng bộ lên Google Sheets rồi Đăng Xuất</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                onClose();
                onDirectLogout();
              }}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-200/80 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất luôn</span>
            </button>

            <button
              onClick={onClose}
              disabled={isSyncing}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Hủy bỏ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
