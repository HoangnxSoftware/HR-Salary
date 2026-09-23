import { getAccessToken } from './authService';
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

/**
 * Đồng bộ toàn bộ dữ liệu ứng dụng lên Google Sheets
 */
export const exportDataToGoogleSheets = async (
  spreadsheetId: string,
  data: FullPayrollData
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa có quyền truy cập Google. Vui lòng đăng nhập lại.');

  // Đảm bảo các sheet tab đã tồn tại
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const existingSheetNames = new Set(meta.sheets?.map((s: any) => s.properties.title) || []);
      const missingSheets = SHEET_NAMES.filter(name => !existingSheetNames.has(name));

      if (missingSheets.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
        });
      }
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra danh sách sheet:', err);
  }

  // 1. Sheet HeThong_CaiDat
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

  // 2. Sheet DanhSach_NhanVien
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
        emp.salaryBasis === 'percent' ? 'Theo %' : 'Theo bộ phận',
      emp.baseSalary,
      emp.salaryPercent || 100,
      emp.bankAccount || '',
      emp.bankName || '',
      emp.taxId || ''
    ])
  ];

  // 3. Sheet NguoiPhuThuoc
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

  // 4. Sheet BaoHiemXaHoi
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

  // 5. Sheet DangKy_AnCa
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

  // 6. Sheet PhuCap_DacThu
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

  // 7. Sheet Bang_ChamCong
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

  // 8. Sheet Bang_ThanhToanLuong
  const prMap = new Map(data.payrolls.map(p => [p.employeeId, p]));
  const payrollHeader = [
    'Mã NV',
    'Họ và Tên',
    'Phòng Ban',
    'Chức Vụ',
    'Lương Cơ Bản',
    'Ngày Chuẩn',
    'Ngày Hưởng Lương',
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
        return [emp.employeeCode, emp.fullName, '', '', emp.baseSalary];
      }
      return [
        emp.employeeCode,
        emp.fullName,
        depMap.get(emp.departmentId) || '',
        posMap.get(emp.positionId) || '',
        p.baseSalary,
        p.standardDays,
        p.actualPaidDays,
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
        p.otherDeductions + p.mealDeduction,
        p.netSalary,
        p.paymentStatus === 'paid' ? 'Đã thanh toán' : p.paymentStatus === 'approved' ? 'Đã duyệt' : 'Dự thảo',
        p.totalInsuranceEmployer,
        p.grossIncome + p.totalInsuranceEmployer
      ];
    })
  ];

  // Batch update tất cả các sheet vào Google Spreadsheet
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

  // Ghi lần lượt các sheet
  for (const item of updates) {
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(item.range.split('!')[0] + '!A1:Z500')}:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).catch(console.warn);

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(item.range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: item.range,
        majorDimension: 'ROWS',
        values: item.values
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`Lỗi ghi ${item.range}:`, err);
    }
  }
};

/**
 * Đọc dữ liệu từ Google Sheets về ứng dụng
 */
export const importDataFromGoogleSheets = async (
  spreadsheetId: string
): Promise<Partial<FullPayrollData>> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Chưa đăng nhập Google hoặc phiên làm việc đã hết hạn.');

  const result: Partial<FullPayrollData> = {};

  try {
    // Đọc danh sách nhân viên
    const empRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/DanhSach_NhanVien!A2:S100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (empRes.ok) {
      const empData = await empRes.json();
      if (empData.values && empData.values.length > 0) {
        result.employees = empData.values.map((row: any[], idx: number) => ({
          id: `emp-imp-${idx + 1}`,
          employeeCode: row[0] || `NV-${idx + 1}`,
          fullName: row[1] || 'Chưa đặt tên',
          idCardNumber: row[2] || '',
          birthDate: row[3] || '1990-01-01',
          issueDate: row[4] || '',
          issuePlace: row[5] || '',
          address: row[6] || '',
          phoneNumber: row[7] || '',
          email: row[8] || '',
          departmentId: 'dep-kt',
          positionId: 'pos-nv',
          workStatus: row[11]?.includes('nghỉ') ? 'resigned' : 'active',
          startDate: row[12] || '2024-01-01',
          salaryBasis: 'monthly',
          baseSalary: Number(String(row[14] || '0').replace(/\D/g, '')) || 10000000,
          salaryPercent: Number(row[15]) || 100,
          bankAccount: row[16] || '',
          bankName: row[17] || '',
          taxId: row[18] || ''
        }));
      }
    }
  } catch (err) {
    console.error('Lỗi khi đọc danh sách nhân viên từ Google Sheets:', err);
  }

  return result;
};
