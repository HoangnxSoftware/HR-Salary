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
  PayrollRecord
} from '../types';

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

const SHEET_NAMES = [
  'HeThong_CaiDat',
  'DanhSach_NhanVien',
  'NguoiPhuThuoc',
  'BaoHiemXaHoi',
  'DangKy_AnCa',
  'PhuCap_DacThu',
  'Bang_ChamCong',
  'Bang_ThanhToanLuong'
];

/**
 * Tìm hoặc tạo mới Spreadsheet trên Google Drive
 */
export const getOrCreateSpreadsheet = async (title: string): Promise<{ id: string; url: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  // 1. Tìm file đã có trên Drive
  try {
    const query = encodeURIComponent(`name = '${title.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`
        };
      }
    }
  } catch (err) {
    console.warn('Không thể tìm file cũ, sẽ tạo mới:', err);
  }

  // 2. Tạo mới Spreadsheet với đầy đủ các sheet tabs
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

  return { id, url };
};

// Helper sanitize cells to prevent undefined or NaN from breaking Google Sheets API payload
const sanitizeValues = (rows: any[][]): (string | number | boolean)[][] => {
  return rows.map(row =>
    row.map(val => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') {
        return isNaN(val) || !isFinite(val) ? 0 : val;
      }
      return String(val);
    })
  );
};

/**
 * Đồng bộ toàn bộ dữ liệu ứng dụng lên Google Sheets
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

  // 1. Kiểm tra quyền truy cập và danh sách sheet tabs hiện có
  let existingSheetNames = new Set<string>();
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties`,
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
    existingSheetNames = new Set(meta.sheets?.map((s: any) => s.properties?.title) || []);
  } catch (err: any) {
    if (err.message && err.message.includes('Google Sheets')) {
      throw err;
    }
    throw new Error(`Lỗi kết nối tới Google Sheets: ${err.message || 'Mất kết nối mạng'}`);
  }

  // 2. Tự động bổ sung các sheet tab còn thiếu
  const missingSheets = SHEET_NAMES.filter(name => !existingSheetNames.has(name));
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
      if (!addSheetRes.ok) {
        console.warn('Lưu ý khi tạo thêm sheet tab:', await addSheetRes.text());
      }
    } catch (e) {
      console.warn('Không thể tự động thêm sheet tab mới:', e);
    }
  }

  // 3. Chuẩn bị dữ liệu 8 phân hệ
  // 3.1 Sheet HeThong_CaiDat
  const settingsRows = [
    ['THÔNG TIN HỆ THỐNG & QUY ĐỊNH TÍNH LƯƠNG'],
    ['Chỉ số / Thiết lập', 'Giá trị', 'Ghi chú'],
    ['Tên đơn vị', data.settings.companyName, 'Đơn vị chi trả lương'],
    ['Giám đốc', data.settings.directorName, 'Ký duyệt bảng lương'],
    ['Kế toán trưởng', data.settings.chiefAccountantName, 'Kiểm soát tài chính'],
    ['Người lập biểu', data.settings.reportPreparerName, 'Chuyên viên tiền lương'],
    ['Địa chỉ', data.settings.address, ''],
    ['Mã số thuế', data.settings.taxCode, ''],
    ['Số điện thoại', data.settings.phoneNumber, ''],
    ['Năm làm việc', data.settings.currentYear, ''],
    ['Tháng làm việc', data.settings.currentMonth, ''],
    ['Số ngày công chuẩn trong tháng', data.settings.standardWorkDays, 'Số ngày hưởng đủ lương'],
    ['Giờ làm việc tiêu chuẩn / ngày', data.settings.standardWorkHoursPerDay, 'Giờ'],
    ['Giảm trừ gia cảnh bản thân (VNĐ)', data.settings.personalDeduction, 'Theo quy định Luật Thuế TNCN'],
    ['Giảm trừ người phụ thuộc (VNĐ/người)', data.settings.dependentDeduction, 'Theo quy định Luật Thuế TNCN'],
    ['Tỷ lệ BHXH NLĐ (%)', data.settings.socialInsRateEmployee, '8%'],
    ['Tỷ lệ BHYT NLĐ (%)', data.settings.healthInsRateEmployee, '1.5%'],
    ['Tỷ lệ BHTN NLĐ (%)', data.settings.unemploymentInsRateEmployee, '1%'],
    ['Tỷ lệ trích BHXH NSDLĐ (%)', data.settings.socialInsRateEmployer, '17.5%'],
    ['Tỷ lệ trích BHYT NSDLĐ (%)', data.settings.healthInsRateEmployer, '3%'],
    ['Tỷ lệ trích BHTN NSDLĐ (%)', data.settings.unemploymentInsRateEmployer, '1%'],
    ['Kinh phí Công đoàn DN (%)', data.settings.tradeUnionRateEmployer, '2%'],
    ['Định mức ăn ca / ngày (VNĐ)', data.settings.standardMealPerDay, ''],
    ['Mức tiền ăn trưa khoán tối đa miễn thuế (VNĐ)', data.settings.monthlyMealFlatRate, '730,000 đ/tháng']
  ];

  // 3.2 Sheet DanhSach_NhanVien
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
    'Mã Số Thuế Cá Nhân'
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
      emp.baseSalary,
      emp.salaryPercent || 100,
      emp.bankAccount || '',
      emp.bankName || '',
      emp.taxId || ''
    ])
  ];

  // 3.3 Sheet NguoiPhuThuoc
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
    'Ghi Chú'
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
      dep.deductionAmount,
      dep.note || ''
    ])
  ];

  // 3.4 Sheet BaoHiemXaHoi
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
      const socEmp = Math.round(insSalary * 0.08);
      const heaEmp = Math.round(insSalary * 0.015);
      const uneEmp = Math.round(insSalary * 0.01);
      const totEmp = socEmp + heaEmp + uneEmp;

      const socEr = Math.round(insSalary * 0.175);
      const heaEr = Math.round(insSalary * 0.03);
      const uneEr = Math.round(insSalary * 0.01);
      const unionEr = Math.round(insSalary * 0.02);
      const totEr = socEr + heaEr + uneEr + unionEr;

      return [
        emp.employeeCode,
        emp.fullName,
        depMap.get(emp.departmentId) || '',
        posMap.get(emp.positionId) || '',
        isPart ? 'Có tham gia' : 'Không',
        insSalary,
        socEmp,
        heaEmp,
        uneEmp,
        totEmp,
        socEr,
        heaEr,
        uneEr,
        unionEr,
        totEr,
        totEmp + totEr,
        ins?.note || ''
      ];
    })
  ];

  // 3.5 Sheet DangKy_AnCa
  const mealMap = new Map(data.mealRegistrations.map(m => [m.employeeId, m]));
  const tkMap = new Map(data.timekeepings.map(t => [t.employeeId, t]));
  const mealHeader = [
    'Mã NV',
    'Họ và Tên',
    'Tháng Áp Dụng',
    'Hình Thức Ăn Ca',
    'Số Bữa Ăn Thực Tế (Bếp)',
    'Đơn Giá / Bữa (VNĐ)',
    'Mức Tiền Khoán (VNĐ/Tháng)',
    'Ghi Chú'
  ];
  const mealRows = [
    mealHeader,
    ...data.employees.map(emp => {
      const reg = mealMap.get(emp.id);
      const tk = tkMap.get(emp.id);
      const plan = reg?.planType || 'none';
      const planLabel = plan === 'registered' ? 'Ăn ca tại bếp' : plan === 'cash' ? 'Nhận tiền mặt' : 'Không đăng ký';
      return [
        emp.employeeCode,
        emp.fullName,
        reg?.month || `${data.settings.currentYear}-${String(data.settings.currentMonth).padStart(2, '0')}`,
        planLabel,
        plan === 'registered' ? (tk?.totalMeals || 0) : 0,
        reg?.customRatePerMeal || data.settings.standardMealPerDay,
        plan === 'cash' ? (reg?.monthlyFlatAmount || data.settings.monthlyMealFlatRate) : 0,
        reg?.note || ''
      ];
    })
  ];

  // 3.6 Sheet PhuCap_DacThu
  const allowanceHeader = [
    'Mã NV',
    'Họ và Tên',
    'Tháng',
    'Loại Phụ Cấp',
    'Tên Phụ Cấp',
    'Số Tiền (VNĐ)',
    'Tính Thuế TNCN?',
    'Ghi Chú'
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
        sa.amount,
        sa.isTaxable ? 'Có chịu thuế TNCN' : 'MIỄN THUẾ TNCN',
        sa.note || ''
      ];
    })
  ];

  // 3.7 Sheet Bang_ChamCong
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
  const timekeepingRows = [
    timekeepingHeader,
    ...data.employees.map(emp => {
      const tk = tkMap.get(emp.id);
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
        tk?.actualWorkDays || 0,
        tk?.paidLeaveDays || 0,
        tk?.holidayDays || 0,
        tk?.insuranceLeaveDays || 0,
        tk?.unpaidLeaveDays || 0,
        tk?.totalOtNormalHours || 0,
        tk?.totalOtWeekendHours || 0,
        tk?.totalOtHolidayHours || 0,
        tk?.totalMeals || 0
      ];
    })
  ];

  // 3.8 Sheet Bang_ThanhToanLuong
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
    'BHXH NLĐ (8%)',
    'BHYT NLĐ (1.5%)',
    'BHTN NLĐ (1%)',
    'Tổng Trích BHXH (10.5%)',
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
    'BHXH NSDLĐ (23.5%)',
    'TỔNG CHI PHÍ LƯƠNG DN'
  ];

  const payrollRows = [
    payrollHeader,
    ...data.employees.map(emp => {
      const p = prMap.get(emp.id);
      if (!p) {
        return [emp.employeeCode, emp.fullName, '', '', emp.salaryBasis || 'monthly', emp.baseSalary];
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
        p.baseSalary,
        p.standardDays,
        workUnitDisplay,
        p.mainSalary,
        p.otPayTaxable,
        p.otPayTaxExempt,
        p.taxableAllowances,
        p.taxExemptAllowances,
        p.mealAllowance,
        p.grossIncome,
        p.insuranceSalary,
        p.socialInsuranceEmp,
        p.healthInsuranceEmp,
        p.unempInsuranceEmp,
        p.totalInsuranceEmp,
        p.personalDeduction,
        p.dependentCount,
        p.dependentDeduction,
        p.totalDeductionsForTax,
        p.taxableIncome,
        p.assessableIncome,
        p.personalIncomeTax,
        p.advancePayment,
        (p.otherDeductions || 0) + (p.mealDeduction || 0),
        p.netSalary,
        p.paymentStatus === 'paid' ? 'Đã thanh toán' : p.paymentStatus === 'approved' ? 'Đã duyệt' : 'Dự thảo',
        p.totalInsuranceEmployer,
        p.grossIncome + p.totalInsuranceEmployer
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

  // 5. Gửi toàn bộ 8 bảng dữ liệu bằng API values:batchUpdate duy nhất (nguyên khối, bảo đảm tính toàn vẹn)
  const updates = [
    { range: 'HeThong_CaiDat!A1', values: settingsRows },
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
        valueInputOption: 'USER_ENTERED',
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
 * Dữ liệu trống hoàn toàn (0 nhân viên, 0 chấm công, 0 bảng lương)
 * khi người dùng đăng nhập sẽ bắt đầu nhập dữ liệu mới trong phần mềm
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
      { id: 'dep-bgd', code: 'BGD', name: 'Ban Giám Đốc' },
      { id: 'dep-kt', code: 'PKT', name: 'Phòng Kế Toán - Tài Chính' },
      { id: 'dep-ns', code: 'PNS', name: 'Phòng Nhân Sự' },
      { id: 'dep-kd', code: 'PKD', name: 'Phòng Kinh Doanh' },
      { id: 'dep-sx', code: 'PSX', name: 'Bộ Phận Vận Hành / Sản Xuất' }
    ],
    positions: [
      { id: 'pos-gd', code: 'GD', name: 'Giám Đốc', responsibilityAllowance: 0 },
      { id: 'pos-ktt', code: 'KTT', name: 'Kế Toán Trưởng', responsibilityAllowance: 0 },
      { id: 'pos-tp', code: 'TP', name: 'Trưởng Phòng', responsibilityAllowance: 0 },
      { id: 'pos-nv', code: 'NV', name: 'Nhân Viên', responsibilityAllowance: 0 },
      { id: 'pos-cn', code: 'CN', name: 'Công Nhân', responsibilityAllowance: 0 }
    ]
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
 * Lấy danh sách các bảng tính Google Sheets trên Google Drive của người dùng
 */
export const listDriveSpreadsheets = async (): Promise<DriveSpreadsheetItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  try {
    const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)&pageSize=30`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn('Lỗi gọi Drive files.list:', err);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Lỗi khi tải danh sách spreadsheet từ Drive:', error);
    return [];
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
 * Dữ liệu tạo mới để trống (0 nhân viên, 0 chấm công)
 */
export const createNewCompanySpreadsheet = async (
  companyInfo: NewCompanyInput
): Promise<{
  id: string;
  url: string;
  title: string;
  cleanData: FullPayrollData;
}> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const cleanData = createEmptyCompanyData(companyInfo);
  const title = `Bảng Lương & Nhân Sự - ${companyInfo.companyName.trim()}`;

  // 1. Tạo mới Spreadsheet với đầy đủ 8 sheet tabs
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

  // 2. Xuất dữ liệu cấu hình ban đầu + tiêu đề các bảng (dữ liệu nhân sự để trống)
  await exportDataToGoogleSheets(id, cleanData);

  return {
    id,
    url,
    title,
    cleanData
  };
};

/**
 * Đọc toàn bộ dữ liệu cấu hình công ty và nhân sự từ Google Sheets về ứng dụng
 */
export const importFullDataFromGoogleSheets = async (
  spreadsheetId: string
): Promise<Partial<FullPayrollData>> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const result: Partial<FullPayrollData> = {};

  try {
    // 1. Đọc sheet cài đặt hệ thống (HeThong_CaiDat)
    const settingsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/HeThong_CaiDat!A1:C25`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (settingsRes.ok) {
      const sData = await settingsRes.json();
      if (sData.values && sData.values.length > 2) {
        const settingsMap = new Map<string, string>();
        for (const row of sData.values) {
          if (row[0] && row[1]) {
            settingsMap.set(String(row[0]).trim().toLowerCase(), String(row[1]).trim());
          }
        }
        
        result.settings = {
          ...initialSettings,
          companyName: settingsMap.get('tên đơn vị') || initialSettings.companyName,
          directorName: settingsMap.get('giám đốc') || initialSettings.directorName,
          chiefAccountantName: settingsMap.get('kế toán trưởng') || initialSettings.chiefAccountantName,
          reportPreparerName: settingsMap.get('người lập biểu') || initialSettings.reportPreparerName,
          address: settingsMap.get('địa chỉ') || initialSettings.address,
          taxCode: settingsMap.get('mã số thuế') || initialSettings.taxCode,
          phoneNumber: settingsMap.get('số điện thoại') || initialSettings.phoneNumber,
          standardWorkDays: Number(settingsMap.get('số ngày công chuẩn trong tháng')) || initialSettings.standardWorkDays
        };
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc HeThong_CaiDat:', err);
  }

  try {
    // 2. Đọc danh sách nhân viên (DanhSach_NhanVien)
    const empRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/DanhSach_NhanVien!A2:S200`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (empRes.ok) {
      const empData = await empRes.json();
      if (empData.values && empData.values.length > 0) {
        result.employees = empData.values
          .filter((row: any[]) => row && row[0] && row[1]) // Bỏ qua dòng trống
          .map((row: any[], idx: number) => ({
            id: `emp-g-${idx + 1}`,
            employeeCode: String(row[0] || `NV-${idx + 1}`).trim(),
            fullName: String(row[1] || 'Chưa đặt tên').trim(),
            idCardNumber: String(row[2] || '').trim(),
            birthDate: String(row[3] || '1990-01-01').trim(),
            issueDate: String(row[4] || '').trim(),
            issuePlace: String(row[5] || '').trim(),
            address: String(row[6] || '').trim(),
            phoneNumber: String(row[7] || '').trim(),
            email: String(row[8] || '').trim(),
            departmentId: 'dep-kt',
            positionId: 'pos-nv',
            workStatus: String(row[11] || '').includes('nghỉ') ? 'resigned' : 'active',
            startDate: String(row[12] || '2024-01-01').trim(),
            salaryBasis: 'monthly',
            baseSalary: Number(String(row[14] || '0').replace(/\D/g, '')) || 10000000,
            salaryPercent: Number(row[15]) || 100,
            bankAccount: String(row[16] || '').trim(),
            bankName: String(row[17] || '').trim(),
            taxId: String(row[18] || '').trim()
          }));
      } else {
        result.employees = [];
      }
    }
  } catch (err) {
    console.warn('Lỗi khi đọc danh sách nhân viên:', err);
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

