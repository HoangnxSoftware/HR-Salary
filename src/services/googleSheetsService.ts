import { getAccessToken } from './authService';
import { initialSettings } from '../data/initialData';
import {
  SystemSettings,
  Employee,
  Dependent,
  InsuranceRecord,
  MealRegistration,
  SpecialAllowance,
  TimekeepingRecord,
  PayrollRecord,
  Department,
  Position,
  Holiday,
  TaxBracket,
  TaxExemptionRules,
  FixedDaysOffPolicy,
  SalaryCalculationBasis
} from '../types';
import { DEFAULT_TAX_BRACKETS, DEFAULT_TAX_EXEMPTION_RULES } from '../utils/payrollCalculator';

export interface FullPayrollData {
  settings: SystemSettings;
  employees: Employee[];
  dependents: Dependent[];
  insurances: InsuranceRecord[];
  mealRegistrations: MealRegistration[];
  specialAllowances: SpecialAllowance[];
  timekeepings: TimekeepingRecord[];
  payrolls: PayrollRecord[];
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export interface NewCompanyInput {
  companyName: string;
  taxCode?: string;
  directorName?: string;
  chiefAccountantName?: string;
  address?: string;
  phoneNumber?: string;
  currentYear?: number;
  currentMonth?: number;
}

export const SHEET_NAMES = [
  'HeThong_CaiDat',
  'DanhMuc_PhongBan',
  'DanhMuc_ChucVu',
  'NgayNghi_LeTet',
  'BieuThue_TNCN',
  'DanhSach_NhanVien',
  'NguoiPhuThuoc',
  'BaoHiemXaHoi',
  'DangKy_AnCa',
  'PhuCap_DacThu',
  'Bang_ChamCong',
  'Bang_ThanhToanLuong'
];

/** Tên thư mục quản lý tập trung cơ sở dữ liệu trên Google Drive */
export const GOOGLE_DRIVE_FOLDER_NAME = 'HR-Salary';

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Tìm hoặc tự động tạo mới thư mục HR-Salary trên Google Drive nếu chưa tồn tại.
 * Đảm bảo mọi cơ sở dữ liệu đều được quản lý tập trung tại thư mục này.
 */
export const getOrCreateHRSalaryFolder = async (authToken?: string): Promise<DriveFolderInfo> => {
  const token = authToken || await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  // 1. Tìm thư mục HR-Salary đã có trên Google Drive
  try {
    const query = encodeURIComponent(
      `name = '${GOOGLE_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folder = searchData.files[0];
        return {
          id: folder.id,
          name: folder.name,
          webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`
        };
      }
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra thư mục HR-Salary trên Drive, sẽ tiến hành tạo mới:', err);
  }

  // 2. Chưa có thư mục HR-Salary -> Tự động khởi tạo thư mục này trên Drive
  const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Thư mục quản lý tập trung cơ sở dữ liệu Bảng Lương & Nhân Sự HR-Salary'
    })
  });

  if (!createFolderRes.ok) {
    const errText = await createFolderRes.text();
    throw new Error(`Không thể khởi tạo thư mục '${GOOGLE_DRIVE_FOLDER_NAME}' trên Google Drive: ${errText}`);
  }

  const createdFolder = await createFolderRes.json();
  return {
    id: createdFolder.id,
    name: createdFolder.name || GOOGLE_DRIVE_FOLDER_NAME,
    webViewLink: createdFolder.webViewLink || `https://drive.google.com/drive/folders/${createdFolder.id}`
  };
};

/**
 * Di chuyển hoặc gắn bảng tính vào thư mục HR-Salary để đảm bảo tập trung dữ liệu
 */
export const moveSpreadsheetToFolder = async (
  fileId: string,
  targetFolderId: string,
  token: string
): Promise<boolean> => {
  try {
    const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,parents`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!getRes.ok) {
      console.warn('Không thể đọc thông tin thư mục cha của file:', await getRes.text());
      return false;
    }

    const data = await getRes.json();
    const currentParents: string[] = data.parents || [];

    // Nếu file đã nằm trong thư mục đích thì giữ nguyên
    if (currentParents.includes(targetFolderId)) {
      return true;
    }

    const removeParents = currentParents.join(',');
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${targetFolderId}${
      removeParents ? `&removeParents=${encodeURIComponent(removeParents)}` : ''
    }&fields=id,parents`;

    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    return patchRes.ok;
  } catch (error) {
    console.warn('Lỗi khi chuyển file vào thư mục HR-Salary:', error);
    return false;
  }
};

/**
 * Đảm bảo bảng tính được liên kết nằm trong thư mục HR-Salary
 */
export const ensureSpreadsheetInHRSalaryFolder = async (
  spreadsheetId: string
): Promise<{ folder: DriveFolderInfo; moved: boolean }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const folder = await getOrCreateHRSalaryFolder(token);

  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cleanId}?fields=id,parents`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (fileRes.ok) {
    const data = await fileRes.json();
    const parents = data.parents || [];
    if (!parents.includes(folder.id)) {
      const moved = await moveSpreadsheetToFolder(cleanId, folder.id, token);
      return { folder, moved };
    }
  }

  return { folder, moved: false };
};

/**
 * Tìm hoặc tạo mới Spreadsheet trong thư mục HR-Salary trên Google Drive
 */
export const getOrCreateSpreadsheet = async (title: string): Promise<{ id: string; url: string; folderId: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  // 1. Tự động kiểm tra hoặc khởi tạo thư mục HR-Salary nếu chưa có
  const folder = await getOrCreateHRSalaryFolder(token);

  // 2. Tìm file đã có trong chính thư mục HR-Salary
  try {
    const queryInFolder = encodeURIComponent(
      `'${folder.id}' in parents and name = '${title.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryInFolder}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
          folderId: folder.id
        };
      }
    }

    // 3. Nếu chưa có trong HR-Salary, kiểm tra file ở ngoài; nếu có thì chuyển vào HR-Salary để tập trung quản lý
    const queryGeneral = encodeURIComponent(
      `name = '${title.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const generalRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryGeneral}&fields=files(id,name,webViewLink,parents)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (generalRes.ok) {
      const generalData = await generalRes.json();
      if (generalData.files && generalData.files.length > 0) {
        const existingFile = generalData.files[0];
        await moveSpreadsheetToFolder(existingFile.id, folder.id, token);
        return {
          id: existingFile.id,
          url: existingFile.webViewLink || `https://docs.google.com/spreadsheets/d/${existingFile.id}/edit`,
          folderId: folder.id
        };
      }
    }
  } catch (err) {
    console.warn('Lỗi tìm kiếm file cũ, sẽ khởi tạo mới trong HR-Salary:', err);
  }

  // 4. Tạo mới Spreadsheet với đầy đủ tất cả các sheet tabs
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: SHEET_NAMES.map(name => ({
        properties: { title: name }
      }))
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Tạo Google Spreadsheet thất bại: ${errorText}`);
  }

  const createdData = await createRes.json();
  const id = createdData.spreadsheetId;
  const url = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;

  // 5. Chuyển bảng tính mới vào thư mục HR-Salary
  await moveSpreadsheetToFolder(id, folder.id, token);

  return { id, url, folderId: folder.id };
};

/**
 * Đảm bảo 100% dữ liệu đồng bộ lên Google Drive / Sheets được định dạng theo dạng TEXT thuần túy.
 * Mọi giá trị số, ngày tháng, mã số định danh, CCCD, MST, tỷ lệ % đều được ép kiểu string.
 */
export const sanitizeValues = (rows: any[][]): string[][] => {
  return rows.map(row =>
    row.map(val => {
      if (val === undefined || val === null) return '';
      return String(val);
    })
  );
};

/**
 * Đồng bộ toàn bộ dữ liệu ứng dụng lên Google Sheets
 * Toàn bộ dữ liệu được định dạng dạng TEXT (Plain Text) trên Google Sheets
 */
export const exportDataToGoogleSheets = async (
  spreadsheetId: string,
  data: FullPayrollData
): Promise<{ totalUpdatedCells: number }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Chưa có phiên truy cập Google hoặc phiên làm việc đã hết hạn. Vui lòng bấm "Đăng nhập Google" để cấp quyền đồng bộ.');
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('ID hoặc đường dẫn Google Spreadsheet không hợp lệ.');
  }

  // 1. Kiểm tra quyền truy cập và danh sách sheet tabs hiện có cùng Sheet IDs
  let existingSheetsMap = new Map<string, number>();
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties(sheetId,title)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!metaRes.ok) {
      let errMsg = metaRes.statusText;
      try {
        const errJson = await metaRes.json();
        errMsg = errJson?.error?.message || errMsg;
      } catch (_) {}

      if (metaRes.status === 401) {
        throw new Error('Phiên đăng nhập Google đã hết hạn. Vui lòng nhấn Đăng nhập Google để làm mới quyền.');
      }
      if (metaRes.status === 403) {
        throw new Error(`Google Sheets từ chối quyền truy cập (403): ${errMsg}. Vui lòng kiểm tra quyền chỉnh sửa của tài khoản.`);
      }
      if (metaRes.status === 404) {
        throw new Error(`Không tìm thấy file Google Spreadsheet trên Drive với ID "${cleanId}". Hãy kiểm tra lại liên kết hoặc tạo file mới.`);
      }
      throw new Error(`Không thể truy cập Google Sheets (${metaRes.status}): ${errMsg}`);
    }

    const meta = await metaRes.json();
    if (meta.sheets && Array.isArray(meta.sheets)) {
      for (const s of meta.sheets) {
        if (s.properties?.title) {
          existingSheetsMap.set(s.properties.title, s.properties.sheetId);
        }
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Google Sheets')) {
      throw err;
    }
    throw new Error(`Lỗi kết nối tới Google Sheets: ${err.message || 'Mất kết nối mạng'}`);
  }

  // 2. Tự động bổ sung các sheet tab còn thiếu (đặc biệt các tab danh mục mới)
  const missingSheets = SHEET_NAMES.filter(name => !existingSheetsMap.has(name));
  if (missingSheets.length > 0) {
    try {
      const addSheetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: missingSheets.map(title => ({
              addSheet: { properties: { title } }
            }))
          })
        }
      );
      if (addSheetRes.ok) {
        const addSheetData = await addSheetRes.json();
        if (addSheetData.replies) {
          for (let i = 0; i < missingSheets.length; i++) {
            const addedId = addSheetData.replies[i]?.addSheet?.properties?.sheetId;
            if (addedId !== undefined) {
              existingSheetsMap.set(missingSheets[i], addedId);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Không thể tự động thêm sheet tab mới:', e);
    }
  }

  // 3. Chuẩn bị dữ liệu tất cả các phân hệ dưới dạng TEXT

  // 3.1 Sheet HeThong_CaiDat (Cài đặt hệ thống, cơ sở tính lương, BHXH và Thuế)
  const exRules = data.settings.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES;
  const settingsRows = [
    ['CẤU HÌNH HỆ THỐNG & CƠ SỞ TÍNH LƯƠNG, BẢO HIỂM XÃ HỘI, THUẾ TNCN'],
    ['Nhóm Thiết Lập', 'Chỉ Số / Nội Dung Cài Đặt', 'Giá Trị Áp Dụng', 'Căn Cứ / Ghi Chú'],
    
    // I. Thông tin pháp nhân & Cán bộ ký biểu
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Tên đơn vị / Doanh nghiệp', data.settings.companyName, 'Đơn vị chi trả thu nhập'],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Mã số thuế (MST)', data.settings.taxCode, 'Mã định danh thuế'],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Địa chỉ trụ sở', data.settings.address, ''],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Số điện thoại liên hệ', data.settings.phoneNumber, ''],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Năm làm việc', String(data.settings.currentYear), ''],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Tháng làm việc', String(data.settings.currentMonth), ''],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Giám đốc', data.settings.directorName, 'Ký duyệt bảng lương & chi trả'],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Kế toán trưởng', data.settings.chiefAccountantName, 'Kiểm soát tài chính'],
    ['I. THÔNG TIN ĐƠN VỊ & CÁN BỘ PHỤ TRÁCH', 'Người lập biểu', data.settings.reportPreparerName, 'Chuyên viên tiền lương'],

    // II. Cơ sở tính lương & Thời gian làm việc
    ['II. CƠ SỞ TÍNH LƯƠNG & CHẾ ĐỘ THỜI GIAN', 'Chính sách ngày nghỉ cố định', data.settings.fixedDaysOffPolicy || 'sundays_and_half_saturdays', 'Chính sách nghỉ hàng tuần'],
    ['II. CƠ SỞ TÍNH LƯƠNG & CHẾ ĐỘ THỜI GIAN', 'Số ngày công chuẩn trong tháng', String(data.settings.standardWorkDays), 'Số ngày làm việc hưởng đủ lương'],
    ['II. CƠ SỞ TÍNH LƯƠNG & CHẾ ĐỘ THỜI GIAN', 'Giờ làm việc tiêu chuẩn / ngày', String(data.settings.standardWorkHoursPerDay), 'Giờ'],
    ['II. CƠ SỞ TÍNH LƯƠNG & CHẾ ĐỘ THỜI GIAN', 'Hình thức tính lương mặc định', data.settings.defaultSalaryBasis, 'monthly: Lương tháng | daily: Ngày | hourly: Giờ | percent: KPI'],

    // III. Tỷ lệ làm thêm giờ (Overtime)
    ['III. TỶ LỆ LÀM THÊM GIỜ (OVERTIME)', 'Tỷ lệ làm thêm ngày thường', `${(data.settings.otWeekdayRate * 100).toFixed(0)}%`, 'Tối thiểu 150% lương giờ ngày bình thường'],
    ['III. TỶ LỆ LÀM THÊM GIỜ (OVERTIME)', 'Tỷ lệ làm thêm ngày nghỉ tuần (CN)', `${(data.settings.otWeekendRate * 100).toFixed(0)}%`, 'Tối thiểu 200% lương giờ ngày bình thường'],
    ['III. TỶ LỆ LÀM THÊM GIỜ (OVERTIME)', 'Tỷ lệ làm thêm ngày lễ, tết, nghỉ có lương', `${(data.settings.otHolidayRate * 100).toFixed(0)}%`, 'Tối thiểu 300% chưa kể tiền lương ngày lễ'],
    ['III. TỶ LỆ LÀM THÊM GIỜ (OVERTIME)', 'Phụ cấp làm thêm ban đêm', `${(data.settings.otNightBonusRate * 100).toFixed(0)}%`, 'Cộng thêm ít nhất 30% lương'],

    // IV. Cơ sở tính BHXH, BHYT, BHTN & Kinh phí Công đoàn
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHXH NLĐ', `${data.settings.socialInsRateEmployee}%`, '8.0% khấu trừ thu nhập NLĐ'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHYT NLĐ', `${data.settings.healthInsRateEmployee}%`, '1.5% khấu trừ thu nhập NLĐ'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHTN NLĐ', `${data.settings.unemploymentInsRateEmployee}%`, '1.0% khấu trừ thu nhập NLĐ'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'TỔNG TỶ LỆ TRÍCH ĐÓNG NLĐ', `${((data.settings.socialInsRateEmployee || 0) + (data.settings.healthInsRateEmployee || 0) + (data.settings.unemploymentInsRateEmployee || 0)).toFixed(1)}%`, '10.5% khấu trừ thu nhập NLĐ'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHXH Doanh nghiệp (NSDLĐ)', `${data.settings.socialInsRateEmployer}%`, '17.5% chi phí của DN'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHYT Doanh nghiệp (NSDLĐ)', `${data.settings.healthInsRateEmployer}%`, '3.0% chi phí của DN'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Tỷ lệ BHTN Doanh nghiệp (NSDLĐ)', `${data.settings.unemploymentInsRateEmployer}%`, '1.0% chi phí của DN'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'Kinh phí Công đoàn Doanh nghiệp (KPCĐ)', `${data.settings.tradeUnionRateEmployer}%`, '2.0% chi phí DN trích nộp công đoàn'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'TỔNG TỶ LỆ TRÍCH ĐÓNG DOANH NGHIỆP', `${((data.settings.socialInsRateEmployer || 0) + (data.settings.healthInsRateEmployer || 0) + (data.settings.unemploymentInsRateEmployer || 0) + (data.settings.tradeUnionRateEmployer || 0)).toFixed(1)}%`, '23.5% chi phí tiền lương DN'],
    ['IV. CƠ SỞ TÍNH BHXH & KINH PHÍ CÔNG ĐOÀN', 'TỔNG TỶ LỆ NỘP CẢ ĐƠN VỊ (NLĐ + DN)', `${((data.settings.socialInsRateEmployee || 0) + (data.settings.healthInsRateEmployee || 0) + (data.settings.unemploymentInsRateEmployee || 0) + (data.settings.socialInsRateEmployer || 0) + (data.settings.healthInsRateEmployer || 0) + (data.settings.unemploymentInsRateEmployer || 0) + (data.settings.tradeUnionRateEmployer || 0)).toFixed(1)}%`, '34.0% quỹ lương đóng bảo hiểm'],

    // V. Thuế TNCN & Giảm trừ gia cảnh
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Giảm trừ gia cảnh bản thân (VNĐ/tháng)', String(data.settings.personalDeduction), '15,500,000 đ/tháng theo luật Thuế TNCN'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Giảm trừ 1 người phụ thuộc (VNĐ/tháng)', String(data.settings.dependentDeduction), '6,200,000 đ/tháng/người theo luật Thuế TNCN'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Định mức ăn ca / ngày (VNĐ/bữa)', String(data.settings.standardMealPerDay), 'Đơn vị tính suất ăn thực tế'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Mức tiền ăn trưa khoán tối đa miễn thuế (VNĐ/tháng)', String(data.settings.monthlyMealFlatRate), '1,200,000 đ/tháng'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Quy định miễn thuế làm thêm giờ (OT)', exRules.otExemptMode, 'differential_only: Miễn phần vượt mức | fully_exempt: Miễn 100% | fully_taxable: Tính thuế'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Trần giờ làm thêm / tháng miễn thuế (Giờ)', String(exRules.otMonthlyHoursCap ?? 40), '40 giờ/tháng theo Bộ luật Lao động'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Trần giờ làm thêm / năm miễn thuế (Giờ)', String(exRules.otYearlyHoursCap ?? 200), '200 giờ/năm theo Bộ luật Lao động'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Vượt trần giờ làm thêm tính thuế 100%', String(exRules.otCapExceededTaxable ?? true), 'Tự động tính thuế toàn bộ phần vượt trần'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Quy định miễn thuế ăn ca tiền mặt', exRules.mealExemptMode, 'capped: Khống chế trần | fully_exempt: Miễn toàn bộ | fully_taxable: Tính thuế'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Trần miễn thuế ăn ca tiền mặt (VNĐ/tháng)', String(exRules.mealExemptMonthlyCap ?? 1200000), '1,200,000 đ/tháng'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Quy định miễn thuế trang phục', exRules.uniformExemptMode, 'capped: Tối đa 5tr/năm (~416,667 đ/tháng)'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Trần miễn thuế trang phục (VNĐ/tháng)', String(exRules.uniformExemptMonthlyCap ?? 416667), '416,667 đ/tháng'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Quy định miễn thuế điện thoại & liên lạc', exRules.phoneExemptMode, 'Theo quy chế khoán chi nội bộ'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Quy định miễn thuế xăng xe & công tác', exRules.travelExemptMode, 'Theo quy chế khoán chi nội bộ'],
    ['V. THUẾ TNCN & GIẢM TRỪ GIA CẢNH', 'Căn cứ pháp lý / Ghi chú quy định', exRules.legalNote || 'Luật Thuế TNCN & Nghị định hướng dẫn thi hành', ''],

    // VI. Thống kê danh mục hệ thống
    ['VI. TỔNG QUAN DANH MỤC HỆ THỐNG', 'Số lượng phòng ban trong danh mục', String(data.settings.departments.length), 'Xem chi tiết tab DanhMuc_PhongBan'],
    ['VI. TỔNG QUAN DANH MỤC HỆ THỐNG', 'Số lượng chức vụ trong danh mục', String(data.settings.positions.length), 'Xem chi tiết tab DanhMuc_ChucVu'],
    ['VI. TỔNG QUAN DANH MỤC HỆ THỐNG', 'Số lượng ngày nghỉ lễ tết trong năm', String(data.settings.holidays.length), 'Xem chi tiết tab NgayNghi_LeTet'],
    ['VI. TỔNG QUAN DANH MỤC HỆ THỐNG', 'Số bậc thuế lũy tiến từng phần', String((data.settings.taxBrackets || DEFAULT_TAX_BRACKETS).length), 'Xem chi tiết tab BieuThue_TNCN']
  ];

  // 3.2 Sheet DanhMuc_PhongBan (Đồng bộ toàn bộ danh mục phòng ban có thể chỉnh sửa)
  const departmentHeader = [
    'Mã Phòng Ban',
    'Tên Phòng Ban',
    'Trưởng Phòng',
    'Mô Tả Chức Năng',
    'ID Hệ Thống'
  ];
  const departmentRows = [
    departmentHeader,
    ...data.settings.departments.map(d => [
      d.code,
      d.name,
      d.managerName || '',
      d.description || '',
      d.id
    ])
  ];

  // 3.3 Sheet DanhMuc_ChucVu (Đồng bộ danh mục chức vụ có thể chỉnh sửa)
  const positionHeader = [
    'Mã Chức Vụ',
    'Tên Chức Vụ',
    'Phụ Cấp Trách Nhiệm Định Mức (VNĐ)',
    'ID Hệ Thống'
  ];
  const positionRows = [
    positionHeader,
    ...data.settings.positions.map(p => [
      p.code,
      p.name,
      String(p.responsibilityAllowance || 0),
      p.id
    ])
  ];

  // 3.4 Sheet NgayNghi_LeTet (Đồng bộ danh mục ngày nghỉ lễ tết trong năm)
  const holidayHeader = [
    'Ngày Nghỉ (YYYY-MM-DD)',
    'Tên Ngày Nghỉ Lễ / Tết',
    'Hưởng Nguyên Lương',
    'ID Hệ Thống'
  ];
  const holidayRows = [
    holidayHeader,
    ...data.settings.holidays.map(h => [
      h.date,
      h.name,
      h.isPaid ? 'Có (100% lương)' : 'Không',
      h.id
    ])
  ];

  // 3.5 Sheet BieuThue_TNCN (Đồng bộ biểu thuế lũy tiến từng phần)
  const taxBrackets = data.settings.taxBrackets && data.settings.taxBrackets.length > 0
    ? data.settings.taxBrackets
    : DEFAULT_TAX_BRACKETS;
  const taxBracketHeader = [
    'Bậc Thuế',
    'Tên Bậc',
    'Thu Nhập Tính Thuế Từ (VNĐ)',
    'Đến (VNĐ)',
    'Thuế Suất (%)',
    'Diễn Giải',
    'ID Bậc'
  ];
  const taxBracketRows = [
    taxBracketHeader,
    ...taxBrackets.map(b => [
      String(b.bracket),
      b.name,
      String(b.min),
      b.max !== null && b.max !== undefined ? String(b.max) : 'Không giới hạn',
      `${b.rate > 1 ? b.rate : Math.round(b.rate * 100)}%`,
      b.description || '',
      String(b.bracket)
    ])
  ];

  // 3.6 Sheet DanhSach_NhanVien
  const employeeHeader = [
    'Mã Nhân Viên',
    'Họ và Tên',
    'Số Căn Cước (CCCD)',
    'Ngày Sinh',
    'Ngày Cấp',
    'Nơi Cấp',
    'Địa Chỉ',
    'Số Điện Thoại',
    'Email',
    'Phòng Ban',
    'Chức Vụ',
    'Trạng Thái Công Việc',
    'Ngày Vào Làm',
    'Hình Thức Lương',
    'Mức Lương Cơ Bản / Thỏa Thuận (VNĐ)',
    '% Lương (nếu có)',
    'Số Tài Khoản',
    'Ngân Hàng',
    'Mã Số Thuế Cá Nhân',
    'ID Hệ Thống'
  ];

  const depMap = new Map(data.settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(data.settings.positions.map(p => [p.id, p.name]));

  const employeeRows = [
    employeeHeader,
    ...data.employees.map(emp => [
      emp.employeeCode,
      emp.fullName,
      emp.idCardNumber,
      emp.birthDate,
      emp.issueDate,
      emp.issuePlace || '',
      emp.address,
      emp.phoneNumber || '',
      emp.email || '',
      depMap.get(emp.departmentId) || emp.departmentId,
      posMap.get(emp.positionId) || emp.positionId,
      emp.workStatus === 'active' ? 'Đang làm việc' :
        emp.workStatus === 'probation' ? 'Thử việc' :
        emp.workStatus === 'resigned' ? 'Đã nghỉ việc' :
        emp.workStatus === 'transferred' ? 'Điều chuyển' : 'Nghỉ thai sản',
      emp.startDate,
      emp.salaryBasis === 'monthly' ? 'Lương tháng' :
        emp.salaryBasis === 'daily' ? 'Theo ngày công' :
        emp.salaryBasis === 'hourly' ? 'Theo giờ' :
        emp.salaryBasis === 'percent' ? `Theo KPI (${emp.salaryPercent || 100}%)` : 'Theo bộ phận',
      String(emp.baseSalary),
      String(emp.salaryPercent || 100),
      emp.bankAccount || '',
      emp.bankName || '',
      emp.taxId || '',
      emp.id
    ])
  ];

  // 3.7 Sheet NguoiPhuThuoc
  const empMap = new Map(data.employees.map(e => [e.id, `${e.employeeCode} - ${e.fullName}`]));
  const dependentHeader = [
    'Mã Nhân Viên & Họ Tên',
    'Họ Tên Người Phụ Thuộc',
    'CCCD / Mã Định Danh / MST',
    'Mối Quan Hệ',
    'Ngày Sinh',
    'Bắt Đầu Giảm Trừ',
    'Kết Thúc Giảm Trừ',
    'Mức Giảm Trừ (VNĐ)',
    'Ghi Chú',
    'ID Hệ Thống'
  ];
  const dependentRows = [
    dependentHeader,
    ...data.dependents.map(dep => [
      empMap.get(dep.employeeId) || dep.employeeId,
      dep.fullName,
      dep.taxCodeOrId,
      dep.relationship,
      dep.birthDate,
      dep.startDate,
      dep.endDate || 'Hiện tại',
      String(dep.deductionAmount),
      dep.note || '',
      dep.id
    ])
  ];

  // 3.8 Sheet BaoHiemXaHoi
  const insMap = new Map(data.insurances.map(i => [i.employeeId, i]));
  const insuranceHeader = [
    'Mã NV',
    'Họ và Tên',
    'Phòng Ban',
    'Chức Vụ',
    'Tham Gia BHXH',
    'Mức Lương Đóng BHXH (VNĐ)',
    'BHXH NLĐ (8%)',
    'BHYT NLĐ (1.5%)',
    'BHTN NLĐ (1%)',
    'Tổng Trích NLĐ (10.5%)',
    'BHXH NSDLĐ (17.5%)',
    'BHYT NSDLĐ (3%)',
    'BHTN NSDLĐ (1%)',
    'KPCĐ NSDLĐ (2%)',
    'Tổng Trích NSDLĐ (23.5%)',
    'Tổng Trích Nộp Quỹ BHXH (34%)',
    'Ghi Chú'
  ];
  const insuranceRows = [
    insuranceHeader,
    ...data.employees.map(emp => {
      const ins = insMap.get(emp.id);
      const isPart = ins?.isParticipating ?? true;
      const insSalary = isPart ? (ins?.insuranceSalary || emp.baseSalary) : 0;
      const socEmp = Math.round(insSalary * ((data.settings.socialInsRateEmployee || 8) / 100));
      const heaEmp = Math.round(insSalary * ((data.settings.healthInsRateEmployee || 1.5) / 100));
      const uneEmp = Math.round(insSalary * ((data.settings.unemploymentInsRateEmployee || 1) / 100));
      const totEmp = socEmp + heaEmp + uneEmp;

      const socEr = Math.round(insSalary * ((data.settings.socialInsRateEmployer || 17.5) / 100));
      const heaEr = Math.round(insSalary * ((data.settings.healthInsRateEmployer || 3) / 100));
      const uneEr = Math.round(insSalary * ((data.settings.unemploymentInsRateEmployer || 1) / 100));
      const unionEr = Math.round(insSalary * ((data.settings.tradeUnionRateEmployer || 2) / 100));
      const totEr = socEr + heaEr + uneEr + unionEr;

      return [
        emp.employeeCode,
        emp.fullName,
        depMap.get(emp.departmentId) || '',
        posMap.get(emp.positionId) || '',
        isPart ? 'Có tham gia' : 'Không',
        String(insSalary),
        String(socEmp),
        String(heaEmp),
        String(uneEmp),
        String(totEmp),
        String(socEr),
        String(heaEr),
        String(uneEr),
        String(unionEr),
        String(totEr),
        String(totEmp + totEr),
        ins?.note || ''
      ];
    })
  ];

  // 3.9 Sheet DangKy_AnCa
  const mealHeader = [
    'Mã NV',
    'Họ và Tên',
    'Tháng Áp Dụng',
    'Hình Thức Ăn Ca',
    'ĐK Ăn Trưa',
    'ĐK Ăn Chiều',
    'ĐK Ăn Tối',
    'Số Bữa Ăn Thực Tế (Bếp)',
    'Thực Tế Trưa',
    'Thực Tế Chiều',
    'Thực Tế Tối',
    'Đơn Giá / Bữa (VNĐ)',
    'Mức Tiền Khoán (VNĐ/Tháng)',
    'Ghi Chú',
    'ID Hệ Thống'
  ];

  const currentMonthKey = `${data.settings.currentYear}-${String(data.settings.currentMonth).padStart(2, '0')}`;
  const empCodeMap = new Map(data.employees.map(e => [e.id, e]));
  const mealRowsData: string[][] = [];
  const processedKeys = new Set<string>();

  data.mealRegistrations.forEach(reg => {
    const emp = empCodeMap.get(reg.employeeId);
    if (!emp) return;
    const mMonth = reg.month || currentMonthKey;
    const key = `${reg.employeeId}_${mMonth}`;
    processedKeys.add(key);

    const tk = data.timekeepings.find(t => t.employeeId === reg.employeeId && (String(t.month) === mMonth || String(t.month) === String(data.settings.currentMonth)));
    const plan = reg.mealType === 'canteen' ? 'registered' : reg.mealType === 'cash' ? 'cash' : (reg.planType || 'registered');
    const planLabel = plan === 'registered' ? 'Ăn ca tại bếp' : plan === 'cash' ? 'Nhận tiền mặt' : 'Không đăng ký';

    mealRowsData.push([
      emp.employeeCode,
      emp.fullName,
      mMonth,
      planLabel,
      reg.registerLunch !== false ? 'Có' : 'Không',
      reg.registerAfternoon ? 'Có' : 'Không',
      reg.registerDinner ? 'Có' : 'Không',
      String(plan === 'registered' ? (tk?.totalMeals || 0) : 0),
      String(tk?.totalMealsLunch || 0),
      String(tk?.totalMealsAfternoon || 0),
      String(tk?.totalMealsDinner || 0),
      String(reg.ratePerMeal || reg.customRatePerMeal || data.settings.standardMealPerDay || 35000),
      String(plan === 'cash' ? (reg.monthlyAllowance || reg.monthlyFlatAmount || data.settings.monthlyMealFlatRate || 1200000) : 0),
      reg.note || '',
      reg.id
    ]);
  });

  data.employees.forEach(emp => {
    const key = `${emp.id}_${currentMonthKey}`;
    if (!processedKeys.has(key)) {
      const tk = data.timekeepings.find(t => t.employeeId === emp.id);
      mealRowsData.push([
        emp.employeeCode,
        emp.fullName,
        currentMonthKey,
        'Ăn ca tại bếp',
        'Có',
        'Không',
        'Không',
        String(tk?.totalMeals || 0),
        String(tk?.totalMealsLunch || 0),
        String(tk?.totalMealsAfternoon || 0),
        String(tk?.totalMealsDinner || 0),
        String(data.settings.standardMealPerDay || 35000),
        '0',
        '',
        `meal-${emp.id}-${currentMonthKey}`
      ]);
    }
  });

  const mealRows = [
    mealHeader,
    ...mealRowsData
  ];

  // 3.10 Sheet PhuCap_DacThu
  const allowanceHeader = [
    'Mã NV',
    'Họ và Tên',
    'Tháng',
    'Loại Phụ Cấp',
    'Tên Phụ Cấp',
    'Số Tiền (VNĐ)',
    'Tính Thuế TNCN?',
    'Ghi Chú',
    'ID Hệ Thống'
  ];
  const allowanceRows = [
    allowanceHeader,
    ...data.specialAllowances.map(sa => {
      const emp = data.employees.find(e => e.id === sa.employeeId);
      return [
        emp?.employeeCode || sa.employeeId,
        emp?.fullName || '',
        sa.month,
        sa.allowanceType,
        sa.name,
        String(sa.amount),
        sa.isTaxable ? 'Có chịu thuế TNCN' : 'MIỄN THUẾ TNCN',
        sa.note || '',
        sa.id
      ];
    })
  ];

  // 3.11 Sheet Bang_ChamCong
  const daysHeader: string[] = [];
  for (let d = 1; d <= 31; d++) {
    daysHeader.push(`N${d}`);
  }
  const timekeepingHeader = [
    'Mã NV',
    'Họ và Tên',
    'Phòng Ban',
    'Chức Vụ',
    'Tháng',
    ...daysHeader,
    'Công Thực Tế',
    'Nghỉ Phép (P)',
    'Nghỉ Lễ (L)',
    'Nghỉ Ốm/BHXH (O/TS)',
    'Nghỉ Không Lương (Ro)',
    'Tăng Ca Thường (h)',
    'Tăng Ca CN (h)',
    'Tăng Ca Lễ (h)',
    'Số Bữa Ăn Ca'
  ];

  // Xuất toàn bộ bản ghi chấm công của các tháng đã lưu
  const tkRecordsToExport = data.timekeepings.length > 0 
    ? data.timekeepings 
    : data.employees.map(emp => ({
        employeeId: emp.id,
        month: `${data.settings.currentYear}-${String(data.settings.currentMonth).padStart(2, '0')}`,
        days: {} as any,
        actualWorkDays: 0,
        paidLeaveDays: 0,
        holidayDays: 0,
        insuranceLeaveDays: 0,
        unpaidLeaveDays: 0,
        totalOtNormalHours: 0,
        totalOtWeekendHours: 0,
        totalOtHolidayHours: 0,
        totalMeals: 0
      }));

  const timekeepingRows = [
    timekeepingHeader,
    ...tkRecordsToExport.map(tk => {
      const emp = empCodeMap.get(tk.employeeId);
      if (!emp) return null;
      const dayValues = [];
      for (let d = 1; d <= 31; d++) {
        const item = tk?.days?.[d];
        dayValues.push(item?.symbol || '');
      }
      return [
        emp.employeeCode,
        emp.fullName,
        depMap.get(emp.departmentId) || '',
        posMap.get(emp.positionId) || '',
        tk?.month || `${data.settings.currentYear}-${String(data.settings.currentMonth).padStart(2, '0')}`,
        ...dayValues,
        String(tk?.actualWorkDays ?? 0),
        String(tk?.paidLeaveDays ?? 0),
        String(tk?.holidayDays ?? 0),
        String(tk?.insuranceLeaveDays ?? 0),
        String(tk?.unpaidLeaveDays ?? 0),
        String(tk?.totalOtNormalHours ?? 0),
        String(tk?.totalOtWeekendHours ?? 0),
        String(tk?.totalOtHolidayHours ?? 0),
        String(tk?.totalMeals ?? 0)
      ];
    }).filter(Boolean) as (string | number)[][]
  ];

  // 3.12 Sheet Bang_ThanhToanLuong
  const prMap = new Map(data.payrolls.map(p => [p.employeeId, p]));
  const payrollHeader = [
    'Mã NV',
    'Họ và Tên',
    'Phòng Ban',
    'Chức Vụ',
    'Hình Thức Lương',
    'Lương Cơ Bản (HĐ)',
    'Ngày Chuẩn',
    'Ngày Hưởng Lương / Giờ / KPI',
    'Lương Chính',
    'OT Chịu Thuế',
    'OT Miễn Thuế',
    'Phụ Cấp Chịu Thuế',
    'Phụ Cấp Miễn Thuế',
    'Tiền Ăn Ca',
    'TỔNG THU NHẬP (GROSS)',
    'Lương Đóng BHXH',
    'BHXH NLĐ',
    'BHYT NLĐ',
    'BHTN NLĐ',
    'Tổng Trích BHXH (NLĐ)',
    'Giảm Trừ Bản Thân',
    'Số NPT',
    'Giảm Trừ NPT',
    'Tổng Giảm Trừ Thuế',
    'Thu Nhập Chịu Thuế',
    'Thu Nhập Tính Thuế',
    'THUẾ TNCN PHẢI NỘP',
    'Tạm Ứng',
    'Khấu Trừ Khác',
    'THỰC LĨNH (NET)',
    'Trạng Thái',
    'BHXH NSDLĐ',
    'TỔNG CHI PHÍ LƯƠNG DN'
  ];

  const payrollRows = [
    payrollHeader,
    ...data.employees.map(emp => {
      const p = prMap.get(emp.id);
      if (!p) {
        return [emp.employeeCode, emp.fullName, '', '', emp.salaryBasis || 'monthly', String(emp.baseSalary)];
      }
      const salaryBasisLabel = emp.salaryBasis === 'monthly' ? 'Lương tháng' :
        emp.salaryBasis === 'daily' ? 'Theo ngày công' :
        emp.salaryBasis === 'hourly' ? 'Theo giờ' :
        emp.salaryBasis === 'percent' ? `Theo KPI (${emp.salaryPercent || 100}%)` : 'Theo bộ phận';

      const workUnitDisplay = emp.salaryBasis === 'hourly'
        ? `${p.actualWorkHours ?? (p.actualPaidDays * 8)} giờ`
        : emp.salaryBasis === 'daily'
        ? `${p.actualPaidDays} ngày công`
        : emp.salaryBasis === 'percent'
        ? `${p.actualPaidDays} công (${emp.salaryPercent || 100}% KPI)`
        : `${p.actualPaidDays} ngày công`;

      return [
        emp.employeeCode,
        emp.fullName,
        depMap.get(emp.departmentId) || '',
        posMap.get(emp.positionId) || '',
        salaryBasisLabel,
        String(p.baseSalary),
        String(p.standardDays),
        workUnitDisplay,
        String(p.mainSalary),
        String(p.otPayTaxable),
        String(p.otPayTaxExempt),
        String(p.taxableAllowances),
        String(p.taxExemptAllowances),
        String(p.mealAllowance),
        String(p.grossIncome),
        String(p.insuranceSalary),
        String(p.socialInsuranceEmp),
        String(p.healthInsuranceEmp),
        String(p.unempInsuranceEmp),
        String(p.totalInsuranceEmp),
        String(p.personalDeduction),
        String(p.dependentCount),
        String(p.dependentDeduction),
        String(p.totalDeductionsForTax),
        String(p.taxableIncome),
        String(p.assessableIncome),
        String(p.personalIncomeTax),
        String(p.advancePayment),
        String((p.otherDeductions || 0) + (p.mealDeduction || 0)),
        String(p.netSalary),
        p.paymentStatus === 'paid' ? 'Đã thanh toán' : p.paymentStatus === 'approved' ? 'Đã duyệt' : 'Dự thảo',
        String(p.totalInsuranceEmployer),
        String(p.grossIncome + p.totalInsuranceEmployer)
      ];
    })
  ];

  // 4. Xóa sạch dữ liệu cũ các tab để tránh ghi đè sót cột dòng
  const clearRanges = SHEET_NAMES.map(name => `${name}!A1:ZZ5000`);
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ranges: clearRanges
        })
      }
    );
  } catch (err) {
    console.warn('Lưu ý khi xóa dữ liệu cũ:', err);
  }

  // 5. Thiết lập định dạng TEXT thuần túy cho toàn bộ các sheet trên Google Sheets bằng batchUpdate repeatCell
  try {
    const formatRequests: any[] = [];
    for (const sheetName of SHEET_NAMES) {
      const sheetId = existingSheetsMap.get(sheetName);
      if (sheetId !== undefined) {
        formatRequests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              startColumnIndex: 0
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'TEXT'
                }
              }
            },
            fields: 'userEnteredFormat.numberFormat'
          }
        });
      }
    }

    if (formatRequests.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests: formatRequests })
        }
      );
    }
  } catch (fmtErr) {
    console.warn('Lưu ý thiết lập định dạng TEXT cho sheet:', fmtErr);
  }

  // 6. Gửi toàn bộ 12 bảng dữ liệu bằng API values:batchUpdate duy nhất với valueInputOption: 'RAW'
  // RAW đảm bảo Google Sheets lưu trữ nguyên bản toàn bộ dưới dạng TEXT, không tự động parse số hay ngày tháng!
  const updates = [
    { range: 'HeThong_CaiDat!A1', values: settingsRows },
    { range: 'DanhMuc_PhongBan!A1', values: departmentRows },
    { range: 'DanhMuc_ChucVu!A1', values: positionRows },
    { range: 'NgayNghi_LeTet!A1', values: holidayRows },
    { range: 'BieuThue_TNCN!A1', values: taxBracketRows },
    { range: 'DanhSach_NhanVien!A1', values: employeeRows },
    { range: 'NguoiPhuThuoc!A1', values: dependentRows },
    { range: 'BaoHiemXaHoi!A1', values: insuranceRows },
    { range: 'DangKy_AnCa!A1', values: mealRows },
    { range: 'PhuCap_DacThu!A1', values: allowanceRows },
    { range: 'Bang_ChamCong!A1', values: timekeepingRows },
    { range: 'Bang_ThanhToanLuong!A1', values: payrollRows },
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'RAW', // Lưu dưới dạng TEXT thô, giữ nguyên 100% định dạng chuỗi
        data: updates.map(u => ({
          range: u.range,
          majorDimension: 'ROWS',
          values: sanitizeValues(u.values)
        }))
      })
    }
  );

  if (!batchRes.ok) {
    let errMsg = batchRes.statusText;
    try {
      const errJson = await batchRes.json();
      errMsg = errJson?.error?.message || errMsg;
    } catch (_) {}
    throw new Error(`Đẩy dữ liệu lên Google Sheets thất bại (${batchRes.status}): ${errMsg}`);
  }

  const batchResult = await batchRes.json();
  return {
    totalUpdatedCells: batchResult.totalUpdatedCells || 0
  };
};

/**
 * Khởi tạo cấu trúc dữ liệu rỗng cho một công ty mới
 */
export const createEmptyCompanyData = (newCompany: NewCompanyInput): FullPayrollData => {
  const currentYear = newCompany.currentYear || new Date().getFullYear();
  const currentMonth = newCompany.currentMonth || (new Date().getMonth() + 1);

  const cleanSettings: SystemSettings = {
    ...initialSettings,
    companyName: newCompany.companyName,
    taxCode: newCompany.taxCode || '',
    directorName: newCompany.directorName || '',
    chiefAccountantName: newCompany.chiefAccountantName || '',
    reportPreparerName: '',
    address: newCompany.address || '',
    phoneNumber: newCompany.phoneNumber || '',
    currentYear,
    currentMonth,
    standardWorkDays: 24,
    departments: [
      { id: 'dep-bgd', code: 'BGD', name: 'Ban Giám Đốc', managerName: newCompany.directorName || '', description: 'Quản trị điều hành chung' },
      { id: 'dep-kt', code: 'PKT', name: 'Phòng Kế Toán - Tài Chính', managerName: newCompany.chiefAccountantName || '', description: 'Kế toán tài chính, bảng lương' },
      { id: 'dep-ns', code: 'PNS', name: 'Phòng Nhân Sự', managerName: '', description: 'Tuyển dụng, đào tạo và chấm công' },
      { id: 'dep-kd', code: 'PKD', name: 'Phòng Kinh Doanh', managerName: '', description: 'Phát triển khách hàng & thị trường' },
      { id: 'dep-sx', code: 'PSX', name: 'Bộ Phận Vận Hành / Sản Xuất', managerName: '', description: 'Sản xuất và vận hành trực tiếp' }
    ],
    positions: [
      { id: 'pos-gd', code: 'GD', name: 'Giám Đốc', responsibilityAllowance: 0 },
      { id: 'pos-ktt', code: 'KTT', name: 'Kế Toán Trưởng', responsibilityAllowance: 0 },
      { id: 'pos-tp', code: 'TP', name: 'Trưởng Phòng', responsibilityAllowance: 0 },
      { id: 'pos-nv', code: 'NV', name: 'Nhân Viên', responsibilityAllowance: 0 },
      { id: 'pos-cn', code: 'CN', name: 'Công Nhân', responsibilityAllowance: 0 }
    ],
    holidays: initialSettings.holidays || [],
    taxBrackets: DEFAULT_TAX_BRACKETS,
    taxExemptionRules: DEFAULT_TAX_EXEMPTION_RULES
  };

  return {
    settings: cleanSettings,
    employees: [],
    dependents: [],
    insurances: [],
    mealRegistrations: [],
    specialAllowances: [],
    timekeepings: [],
    payrolls: []
  };
};

/**
 * Lấy danh sách các bảng tính Google Sheets tập trung trong thư mục HR-Salary trên Google Drive.
 */
export const listDriveSpreadsheets = async (): Promise<{
  folder: DriveFolderInfo;
  files: DriveSpreadsheetItem[];
}> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const folder = await getOrCreateHRSalaryFolder(token);

  try {
    const query = encodeURIComponent(
      `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)&pageSize=100`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn('Lỗi gọi Drive files.list trong thư mục HR-Salary:', err);
      return { folder, files: [] };
    }

    const data = await res.json();
    const files: DriveSpreadsheetItem[] = data.files || [];
    return { folder, files };
  } catch (error) {
    console.error('Lỗi khi tải danh sách spreadsheet từ thư mục HR-Salary:', error);
    return { folder, files: [] };
  }
};

/**
 * Trích xuất Spreadsheet ID từ URL hoặc chuỗi ID
 */
export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

/**
 * Lấy thông tin chi tiết một Spreadsheet từ ID
 */
export const fetchSpreadsheetDetails = async (
  spreadsheetId: string
): Promise<{ id: string; title: string; url: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,spreadsheetUrl`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    throw new Error('Không thể tìm thấy hoặc không có quyền truy cập bảng tính này.');
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Bảng tính Google Sheets',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
  };
};

/**
 * Tạo mới cơ sở dữ liệu trên Google Sheets cho một công ty mới hoàn toàn
 */
export const createNewCompanySpreadsheet = async (
  companyInfo: NewCompanyInput
): Promise<{
  id: string;
  url: string;
  title: string;
  cleanData: FullPayrollData;
  folder: DriveFolderInfo;
}> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const folder = await getOrCreateHRSalaryFolder(token);
  const cleanData = createEmptyCompanyData(companyInfo);
  const title = `Bảng Lương & Nhân Sự - ${companyInfo.companyName.trim()}`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: SHEET_NAMES.map(name => ({
        properties: { title: name }
      }))
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Tạo Google Spreadsheet thất bại: ${errorText}`);
  }

  const createdData = await createRes.json();
  const id = createdData.spreadsheetId;
  const url = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`;

  await moveSpreadsheetToFolder(id, folder.id, token);
  await exportDataToGoogleSheets(id, cleanData);

  return {
    id,
    url,
    title,
    cleanData,
    folder
  };
};

/**
 * Đọc toàn bộ dữ liệu cấu hình công ty, danh mục phòng ban, chức vụ, ngày nghỉ lễ tết,
 * cơ sở tính lương, BHXH, thuế và toàn bộ nhân sự từ Google Sheets về ứng dụng.
 */
export const importFullDataFromGoogleSheets = async (
  spreadsheetId: string
): Promise<Partial<FullPayrollData>> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const result: Partial<FullPayrollData> = {};

  // Helper fetch values
  const fetchValues = async (range: string): Promise<string[][]> => {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const json = await res.json();
        return json.values || [];
      }
    } catch (e) {
      console.warn(`Lỗi khi đọc phạm vi ${range}:`, e);
    }
    return [];
  };

  // 1. Đọc sheet cài đặt hệ thống (HeThong_CaiDat)
  try {
    const sRows = await fetchValues('HeThong_CaiDat!A1:D80');
    if (sRows.length > 2) {
      const settingsMap = new Map<string, string>();
      for (const row of sRows) {
        // Hỗ trợ cả định dạng cũ 3 cột [Chỉ số, Giá trị, Ghi chú] và định dạng mới 4 cột [Nhóm, Chỉ số, Giá trị, Ghi chú]
        if (row.length >= 4 && row[1] && row[2] !== undefined) {
          settingsMap.set(String(row[1]).trim().toLowerCase(), String(row[2]).trim());
        } else if (row.length >= 2 && row[0] && row[1] !== undefined) {
          settingsMap.set(String(row[0]).trim().toLowerCase(), String(row[1]).trim());
        }
      }

      const parseNumber = (key: string, defaultVal: number): number => {
        const raw = settingsMap.get(key.toLowerCase());
        if (!raw) return defaultVal;
        const cleaned = raw.replace(/[^\d.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? defaultVal : num;
      };

      const parsePercent = (key: string, defaultVal: number): number => {
        const raw = settingsMap.get(key.toLowerCase());
        if (!raw) return defaultVal;
        const cleaned = raw.replace(/[^\d.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? defaultVal : num;
      };

      const importedSettings: SystemSettings = {
        ...initialSettings,
        companyName: settingsMap.get('tên đơn vị / doanh nghiệp') || settingsMap.get('tên đơn vị') || initialSettings.companyName,
        taxCode: settingsMap.get('mã số thuế (mst)') || settingsMap.get('mã số thuế') || initialSettings.taxCode,
        address: settingsMap.get('địa chỉ trụ sở') || settingsMap.get('địa chỉ') || initialSettings.address,
        phoneNumber: settingsMap.get('số điện thoại liên hệ') || settingsMap.get('số điện thoại') || initialSettings.phoneNumber,
        directorName: settingsMap.get('giám đốc') || initialSettings.directorName,
        chiefAccountantName: settingsMap.get('kế toán trưởng') || initialSettings.chiefAccountantName,
        reportPreparerName: settingsMap.get('người lập biểu') || initialSettings.reportPreparerName,
        currentYear: parseNumber('năm làm việc', initialSettings.currentYear),
        currentMonth: parseNumber('tháng làm việc', initialSettings.currentMonth),
        
        // Cơ sở tính lương
        standardWorkDays: parseNumber('số ngày công chuẩn trong tháng', initialSettings.standardWorkDays),
        standardWorkHoursPerDay: parseNumber('giờ làm việc tiêu chuẩn / ngày', initialSettings.standardWorkHoursPerDay),
        fixedDaysOffPolicy: (settingsMap.get('chính sách ngày nghỉ cố định') as FixedDaysOffPolicy) || initialSettings.fixedDaysOffPolicy,
        defaultSalaryBasis: (settingsMap.get('hình thức tính lương mặc định') as SalaryCalculationBasis) || initialSettings.defaultSalaryBasis,

        // Tỷ lệ OT
        otWeekdayRate: parsePercent('tỷ lệ làm thêm ngày thường', initialSettings.otWeekdayRate * 100) / 100,
        otWeekendRate: parsePercent('tỷ lệ làm thêm ngày nghỉ tuần (cn)', initialSettings.otWeekendRate * 100) / 100,
        otHolidayRate: parsePercent('tỷ lệ làm thêm ngày lễ, tết, nghỉ có lương', initialSettings.otHolidayRate * 100) / 100,
        otNightBonusRate: parsePercent('phụ cấp làm thêm ban đêm', initialSettings.otNightBonusRate * 100) / 100,

        // Tỷ lệ BHXH NLĐ
        socialInsRateEmployee: parsePercent('tỷ lệ bhxh nlđ', initialSettings.socialInsRateEmployee),
        healthInsRateEmployee: parsePercent('tỷ lệ bhyt nlđ', initialSettings.healthInsRateEmployee),
        unemploymentInsRateEmployee: parsePercent('tỷ lệ bhtn nlđ', initialSettings.unemploymentInsRateEmployee),

        // Tỷ lệ BHXH DN
        socialInsRateEmployer: parsePercent('tỷ lệ bhxh doanh nghiệp (nsdlđ)', initialSettings.socialInsRateEmployer),
        healthInsRateEmployer: parsePercent('tỷ lệ bhyt doanh nghiệp (nsdlđ)', initialSettings.healthInsRateEmployer),
        unemploymentInsRateEmployer: parsePercent('tỷ lệ bhtn doanh nghiệp (nsdlđ)', initialSettings.unemploymentInsRateEmployer),
        tradeUnionRateEmployer: parsePercent('kinh phí công đoàn doanh nghiệp (kpcđ)', initialSettings.tradeUnionRateEmployer),

        // Thuế & Giảm trừ
        personalDeduction: parseNumber('giảm trừ gia cảnh bản thân (vnđ/tháng)', parseNumber('giảm trừ gia cảnh bản thân (vnđ)', initialSettings.personalDeduction)),
        dependentDeduction: parseNumber('giảm trừ 1 người phụ thuộc (vnđ/tháng)', parseNumber('giảm trừ người phụ thuộc (vnđ/người)', initialSettings.dependentDeduction)),
        standardMealPerDay: parseNumber('định mức ăn ca / ngày (vnđ/bữa)', parseNumber('định mức ăn ca / ngày (vnđ)', initialSettings.standardMealPerDay)),
        monthlyMealFlatRate: parseNumber('mức tiền ăn trưa khoán tối đa miễn thuế (vnđ/tháng)', parseNumber('mức tiền ăn trưa khoán tối đa miễn thuế (vnđ)', initialSettings.monthlyMealFlatRate)),

        // Tax exemption rules
        taxExemptionRules: {
          ...(initialSettings.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES),
          otExemptMode: (settingsMap.get('quy định miễn thuế làm thêm giờ (ot)') as any) || 'differential_only',
          otMonthlyHoursCap: parseNumber('trần giờ làm thêm / tháng miễn thuế (giờ)', 40),
          otYearlyHoursCap: parseNumber('trần giờ làm thêm / năm miễn thuế (giờ)', 200),
          mealExemptMode: (settingsMap.get('quy định miễn thuế ăn ca tiền mặt') as any) || 'capped',
          mealExemptMonthlyCap: parseNumber('trần miễn thuế ăn ca tiền mặt (vnđ/tháng)', 1200000),
          uniformExemptMode: (settingsMap.get('quy định miễn thuế trang phục') as any) || 'capped',
          uniformExemptMonthlyCap: parseNumber('trần miễn thuế trang phục (vnđ/tháng)', 416667),
          legalNote: settingsMap.get('căn cứ pháp lý / ghi chú quy định') || initialSettings.taxExemptionRules?.legalNote
        }
      };

      result.settings = importedSettings;
    }
  } catch (err) {
    console.warn('Lỗi đọc HeThong_CaiDat:', err);
  }

  // Khởi tạo settings fallback nếu chưa có
  if (!result.settings) {
    result.settings = { ...initialSettings };
  }

  // 2. Đọc Danh Mục Phòng Ban (DanhMuc_PhongBan)
  try {
    const depRows = await fetchValues('DanhMuc_PhongBan!A2:E200');
    if (depRows.length > 0) {
      const departments: Department[] = depRows
        .filter(r => r && (r[0] || r[1]))
        .map((r, idx) => ({
          id: r[4] ? String(r[4]).trim() : `dep-imported-${idx + 1}`,
          code: String(r[0] || `PB-${idx + 1}`).trim().toUpperCase(),
          name: String(r[1] || `Phòng Ban ${idx + 1}`).trim(),
          managerName: r[2] ? String(r[2]).trim() : '',
          description: r[3] ? String(r[3]).trim() : ''
        }));
      if (departments.length > 0) {
        result.settings.departments = departments;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc DanhMuc_PhongBan:', err);
  }

  // 3. Đọc Danh Mục Chức Vụ (DanhMuc_ChucVu)
  try {
    const posRows = await fetchValues('DanhMuc_ChucVu!A2:D200');
    if (posRows.length > 0) {
      const positions: Position[] = posRows
        .filter(r => r && (r[0] || r[1]))
        .map((r, idx) => ({
          id: r[3] ? String(r[3]).trim() : `pos-imported-${idx + 1}`,
          code: String(r[0] || `CV-${idx + 1}`).trim().toUpperCase(),
          name: String(r[1] || `Chức Vụ ${idx + 1}`).trim(),
          responsibilityAllowance: Number(String(r[2] || '0').replace(/[^\d.-]/g, '')) || 0
        }));
      if (positions.length > 0) {
        result.settings.positions = positions;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc DanhMuc_ChucVu:', err);
  }

  // 4. Đọc Ngày Nghỉ Lễ Tết Trong Năm (NgayNghi_LeTet)
  try {
    const holRows = await fetchValues('NgayNghi_LeTet!A2:D100');
    if (holRows.length > 0) {
      const holidays: Holiday[] = holRows
        .filter(r => r && r[0] && r[1])
        .map((r, idx) => ({
          id: r[3] ? String(r[3]).trim() : `hol-imported-${idx + 1}`,
          date: String(r[0]).trim(),
          name: String(r[1]).trim(),
          isPaid: !String(r[2] || '').toLowerCase().includes('không')
        }));
      if (holidays.length > 0) {
        result.settings.holidays = holidays;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc NgayNghi_LeTet:', err);
  }

  // 5. Đọc Biểu Thuế TNCN (BieuThue_TNCN)
  try {
    const taxRows = await fetchValues('BieuThue_TNCN!A2:G20');
    if (taxRows.length > 0) {
      const taxBrackets: TaxBracket[] = taxRows
        .filter(r => r && r[0] && r[1])
        .map((r, idx) => {
          const bracketNum = Number(r[0]) || (idx + 1);
          const minVal = Number(String(r[2] || '0').replace(/[^\d.-]/g, '')) || 0;
          const maxStr = String(r[3] || '');
          const maxVal = maxStr.includes('Không giới hạn') || !maxStr ? null : (Number(maxStr.replace(/[^\d.-]/g, '')) || null);
          const rateRaw = String(r[4] || '5').replace('%', '').trim();
          const rateNum = Number(rateRaw) > 1 ? Number(rateRaw) / 100 : (Number(rateRaw) || 0.05);

          return {
            bracket: bracketNum,
            name: String(r[1]).trim(),
            min: minVal,
            max: maxVal,
            rate: rateNum,
            description: r[5] ? String(r[5]).trim() : ''
          };
        });
      if (taxBrackets.length > 0) {
        result.settings.taxBrackets = taxBrackets;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc BieuThue_TNCN:', err);
  }

  // Tạo map tra cứu phòng ban & chức vụ cho danh sách nhân viên
  const depNameToId = new Map(result.settings.departments.map(d => [d.name.toLowerCase(), d.id]));
  const depCodeToId = new Map(result.settings.departments.map(d => [d.code.toLowerCase(), d.id]));
  const posNameToId = new Map(result.settings.positions.map(p => [p.name.toLowerCase(), p.id]));
  const posCodeToId = new Map(result.settings.positions.map(p => [p.code.toLowerCase(), p.id]));
  const defaultDepId = result.settings.departments[0]?.id || 'dep-kt';
  const defaultPosId = result.settings.positions[0]?.id || 'pos-nv';

  // 6. Đọc danh sách nhân viên (DanhSach_NhanVien)
  try {
    const empRows = await fetchValues('DanhSach_NhanVien!A2:T500');
    if (empRows.length > 0) {
      result.employees = empRows
        .filter(row => row && row[0] && row[1])
        .map((row, idx) => {
          const depInput = String(row[9] || '').trim().toLowerCase();
          const posInput = String(row[10] || '').trim().toLowerCase();
          const depId = depNameToId.get(depInput) || depCodeToId.get(depInput) || defaultDepId;
          const posId = posNameToId.get(posInput) || posCodeToId.get(posInput) || defaultPosId;

          const workStatusStr = String(row[11] || '').toLowerCase();
          const workStatus = workStatusStr.includes('thử') ? 'probation'
            : workStatusStr.includes('nghỉ việc') || workStatusStr.includes('đã nghỉ') ? 'resigned'
            : workStatusStr.includes('chuyển') ? 'transferred'
            : workStatusStr.includes('thai sản') ? 'maternity' : 'active';

          const basisStr = String(row[13] || '').toLowerCase();
          const salaryBasis = basisStr.includes('ngày') ? 'daily'
            : basisStr.includes('giờ') ? 'hourly'
            : basisStr.includes('kpi') || basisStr.includes('phần trăm') ? 'percent' : 'monthly';

          return {
            id: row[19] ? String(row[19]).trim() : `emp-g-${idx + 1}`,
            employeeCode: String(row[0] || `NV-${idx + 1}`).trim(),
            fullName: String(row[1] || 'Chưa đặt tên').trim(),
            idCardNumber: String(row[2] || '').trim(),
            birthDate: String(row[3] || '1990-01-01').trim(),
            issueDate: String(row[4] || '').trim(),
            issuePlace: String(row[5] || '').trim(),
            address: String(row[6] || '').trim(),
            phoneNumber: String(row[7] || '').trim(),
            email: String(row[8] || '').trim(),
            departmentId: depId,
            positionId: posId,
            workStatus,
            startDate: String(row[12] || '2024-01-01').trim(),
            salaryBasis,
            baseSalary: Number(String(row[14] || '0').replace(/[^\d.-]/g, '')) || 10000000,
            salaryPercent: Number(row[15]) || 100,
            bankAccount: String(row[16] || '').trim(),
            bankName: String(row[17] || '').trim(),
            taxId: String(row[18] || '').trim()
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi khi đọc danh sách nhân viên:', err);
  }

  // Tra cứu mã nhân viên sang ID nhân viên
  const codeToEmpId = new Map(result.employees?.map(e => [e.employeeCode.toLowerCase(), e.id]) || []);

  // 7. Đọc Người Phụ Thuộc (NguoiPhuThuoc)
  try {
    const depRows = await fetchValues('NguoiPhuThuoc!A2:J500');
    if (depRows.length > 0) {
      result.dependents = depRows
        .filter(r => r && r[0] && r[1])
        .map((r, idx) => {
          const empCodePart = String(r[0]).split('-')[0].trim().toLowerCase();
          const empId = codeToEmpId.get(empCodePart) || result.employees?.[0]?.id || '';
          return {
            id: r[9] ? String(r[9]).trim() : `dep-imp-${idx + 1}`,
            employeeId: empId,
            fullName: String(r[1] || '').trim(),
            taxCodeOrId: String(r[2] || '').trim(),
            relationship: (r[3] || 'Con') as any,
            birthDate: String(r[4] || '2015-01-01').trim(),
            startDate: String(r[5] || '2024-01-01').trim(),
            endDate: String(r[6] || '').includes('Hiện tại') ? undefined : String(r[6] || '').trim(),
            deductionAmount: Number(String(r[7] || '6200000').replace(/[^\d.-]/g, '')) || 6200000,
            note: String(r[8] || '').trim()
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc NguoiPhuThuoc:', err);
  }

  // 8. Đọc Bảo Hiểm Xã Hội (BaoHiemXaHoi)
  try {
    const insRows = await fetchValues('BaoHiemXaHoi!A2:Q500');
    if (insRows.length > 0) {
      result.insurances = insRows
        .filter(r => r && r[0])
        .map((r, idx) => {
          const empCode = String(r[0]).trim().toLowerCase();
          const empId = codeToEmpId.get(empCode) || result.employees?.[idx]?.id || '';
          const isPart = !String(r[4] || '').toLowerCase().includes('không');
          const insSalary = Number(String(r[5] || '0').replace(/[^\d.-]/g, '')) || 0;
          return {
            id: `ins-imp-${idx + 1}`,
            employeeId: empId,
            isParticipating: isPart,
            insuranceSalary: insSalary,
            note: String(r[16] || '').trim()
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc BaoHiemXaHoi:', err);
  }

  // 9. Đọc Đăng Ký Ăn Ca (DangKy_AnCa)
  try {
    const mealRows = await fetchValues('DangKy_AnCa!A2:O500');
    if (mealRows.length > 0) {
      result.mealRegistrations = mealRows
        .filter(r => r && r[0])
        .map((r, idx) => {
          const empCode = String(r[0]).trim().toLowerCase();
          const empId = codeToEmpId.get(empCode) || result.employees?.[idx]?.id || '';
          const planLabel = String(r[3] || '').toLowerCase();
          const planType = planLabel.includes('bếp') ? 'registered' : planLabel.includes('tiền') ? 'cash' : 'none';
          const mealType = planType === 'registered' ? 'canteen' : planType === 'cash' ? 'cash' : 'none';

          // r[4]: ĐK Ăn Trưa, r[5]: ĐK Ăn Chiều, r[6]: ĐK Ăn Tối
          const isLunch = r[4] !== undefined ? !String(r[4]).toLowerCase().includes('không') : true;
          const isAfternoon = r[5] !== undefined ? String(r[5]).toLowerCase().includes('có') : false;
          const isDinner = r[6] !== undefined ? String(r[6]).toLowerCase().includes('có') : false;

          const rateVal = Number(String(r[11] || r[5] || '0').replace(/[^\d.-]/g, '')) || result.settings?.standardMealPerDay || 35000;
          const flatVal = Number(String(r[12] || r[6] || '0').replace(/[^\d.-]/g, '')) || result.settings?.monthlyMealFlatRate || 1200000;
          const noteVal = String(r[13] || r[7] || '').trim();
          const idVal = r[14] ? String(r[14]).trim() : `meal-imp-${idx + 1}`;

          return {
            id: idVal,
            employeeId: empId,
            month: String(r[2] || `${result.settings?.currentYear}-${String(result.settings?.currentMonth).padStart(2, '0')}`).trim(),
            planType,
            mealType,
            registerLunch: isLunch,
            registerAfternoon: isAfternoon,
            registerDinner: isDinner,
            ratePerMeal: rateVal,
            customRatePerMeal: rateVal,
            monthlyAllowance: flatVal,
            monthlyFlatAmount: flatVal,
            note: noteVal
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc DangKy_AnCa:', err);
  }

  // 10. Đọc Phụ Cấp Đặc Thù (PhuCap_DacThu)
  try {
    const allowRows = await fetchValues('PhuCap_DacThu!A2:I500');
    if (allowRows.length > 0) {
      result.specialAllowances = allowRows
        .filter(r => r && r[0] && r[4])
        .map((r, idx) => {
          const empCode = String(r[0]).trim().toLowerCase();
          const empId = codeToEmpId.get(empCode) || result.employees?.[0]?.id || '';
          return {
            id: r[8] ? String(r[8]).trim() : `allow-imp-${idx + 1}`,
            employeeId: empId,
            month: String(r[2] || `${result.settings?.currentYear}-${String(result.settings?.currentMonth).padStart(2, '0')}`).trim(),
            allowanceType: (r[3] || 'other') as any,
            name: String(r[4] || '').trim(),
            amount: Number(String(r[5] || '0').replace(/[^\d.-]/g, '')) || 0,
            isTaxable: !String(r[6] || '').toUpperCase().includes('MIỄN THUẾ'),
            note: String(r[7] || '').trim()
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc PhuCap_DacThu:', err);
  }

  // 11. Đọc Bảng Chấm Công (Bang_ChamCong)
  try {
    const tkRows = await fetchValues('Bang_ChamCong!A2:AT500');
    if (tkRows.length > 0) {
      result.timekeepings = tkRows
        .filter(r => r && r[0])
        .map((r, idx) => {
          const empCode = String(r[0]).trim().toLowerCase();
          const empId = codeToEmpId.get(empCode) || result.employees?.[idx]?.id || '';
          const month = String(r[4] || `${result.settings?.currentYear}-${String(result.settings?.currentMonth).padStart(2, '0')}`).trim();

          const days: Record<number, any> = {};
          for (let d = 1; d <= 31; d++) {
            const sym = String(r[4 + d] || '').trim();
            if (sym) {
              days[d] = {
                day: d,
                symbol: sym as any,
                workHours: sym === '+' ? 8 : sym === '1/2' ? 4 : 0,
                otNormalHours: 0,
                otWeekendHours: 0,
                otHolidayHours: 0,
                isHadMeal: sym === '+'
              };
            }
          }

          return {
            id: `tk-imp-${idx + 1}`,
            employeeId: empId,
            month,
            days,
            actualWorkDays: Number(r[36]) || 0,
            paidLeaveDays: Number(r[37]) || 0,
            holidayDays: Number(r[38]) || 0,
            insuranceLeaveDays: Number(r[39]) || 0,
            unpaidLeaveDays: Number(r[40]) || 0,
            totalPaidDays: (Number(r[36]) || 0) + (Number(r[37]) || 0) + (Number(r[38]) || 0),
            totalOtNormalHours: Number(r[41]) || 0,
            totalOtWeekendHours: Number(r[42]) || 0,
            totalOtHolidayHours: Number(r[43]) || 0,
            totalMeals: Number(r[44]) || 0
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc Bang_ChamCong:', err);
  }

  // 12. Đọc Bảng Thanh Toán Lương (Bang_ThanhToanLuong)
  try {
    const prRows = await fetchValues('Bang_ThanhToanLuong!A2:AG500');
    if (prRows.length > 0) {
      result.payrolls = prRows
        .filter(r => r && r[0])
        .map((r, idx) => {
          const empCode = String(r[0]).trim().toLowerCase();
          const empId = codeToEmpId.get(empCode) || result.employees?.[idx]?.id || '';
          const insSalary = Number(String(r[15] || '0').replace(/[^\d.-]/g, '')) || 0;
          const socErRate = (result.settings?.socialInsRateEmployer || 17.5) / 100;
          const heaErRate = (result.settings?.healthInsRateEmployer || 3) / 100;
          const uneErRate = (result.settings?.unemploymentInsRateEmployer || 1) / 100;
          const unionErRate = (result.settings?.tradeUnionRateEmployer || 2) / 100;
          return {
            id: `pr-imp-${idx + 1}`,
            employeeId: empId,
            month: `${result.settings?.currentYear}-${String(result.settings?.currentMonth).padStart(2, '0')}`,
            baseSalary: Number(String(r[5] || '0').replace(/[^\d.-]/g, '')) || 0,
            standardDays: Number(r[6]) || 24,
            actualPaidDays: Number(String(r[7] || '24').replace(/[^\d.-]/g, '')) || 24,
            mainSalary: Number(String(r[8] || '0').replace(/[^\d.-]/g, '')) || 0,
            otPayTaxable: Number(String(r[9] || '0').replace(/[^\d.-]/g, '')) || 0,
            otPayTaxExempt: Number(String(r[10] || '0').replace(/[^\d.-]/g, '')) || 0,
            taxableAllowances: Number(String(r[11] || '0').replace(/[^\d.-]/g, '')) || 0,
            taxExemptAllowances: Number(String(r[12] || '0').replace(/[^\d.-]/g, '')) || 0,
            mealAllowance: Number(String(r[13] || '0').replace(/[^\d.-]/g, '')) || 0,
            grossIncome: Number(String(r[14] || '0').replace(/[^\d.-]/g, '')) || 0,
            insuranceSalary: insSalary,
            socialInsuranceEmp: Number(String(r[16] || '0').replace(/[^\d.-]/g, '')) || 0,
            healthInsuranceEmp: Number(String(r[17] || '0').replace(/[^\d.-]/g, '')) || 0,
            unempInsuranceEmp: Number(String(r[18] || '0').replace(/[^\d.-]/g, '')) || 0,
            totalInsuranceEmp: Number(String(r[19] || '0').replace(/[^\d.-]/g, '')) || 0,
            socialInsuranceEmployer: Math.round(insSalary * socErRate),
            healthInsuranceEmployer: Math.round(insSalary * heaErRate),
            unempInsuranceEmployer: Math.round(insSalary * uneErRate),
            tradeUnionEmployer: Math.round(insSalary * unionErRate),
            tradeUnionEmp: 0,
            personalDeduction: Number(String(r[20] || '0').replace(/[^\d.-]/g, '')) || 15500000,
            dependentCount: Number(r[21]) || 0,
            dependentDeduction: Number(String(r[22] || '0').replace(/[^\d.-]/g, '')) || 0,
            totalDeductionsForTax: Number(String(r[23] || '0').replace(/[^\d.-]/g, '')) || 0,
            taxableIncome: Number(String(r[24] || '0').replace(/[^\d.-]/g, '')) || 0,
            assessableIncome: Number(String(r[25] || '0').replace(/[^\d.-]/g, '')) || 0,
            personalIncomeTax: Number(String(r[26] || '0').replace(/[^\d.-]/g, '')) || 0,
            advancePayment: Number(String(r[27] || '0').replace(/[^\d.-]/g, '')) || 0,
            mealDeduction: 0,
            otherDeductions: Number(String(r[28] || '0').replace(/[^\d.-]/g, '')) || 0,
            netSalary: Number(String(r[29] || '0').replace(/[^\d.-]/g, '')) || 0,
            paymentStatus: String(r[30] || '').includes('thanh toán') ? 'paid' : String(r[30] || '').includes('duyệt') ? 'approved' : 'draft',
            totalInsuranceEmployer: Number(String(r[31] || '0').replace(/[^\d.-]/g, '')) || 0
          };
        });
    }
  } catch (err) {
    console.warn('Lỗi đọc Bang_ThanhToanLuong:', err);
  }

  return result;
};

/**
 * Đọc dữ liệu từ Google Sheets về ứng dụng (tương thích ngược)
 */
export const importDataFromGoogleSheets = async (
  spreadsheetId: string
): Promise<Partial<FullPayrollData>> => {
  return importFullDataFromGoogleSheets(spreadsheetId);
};
