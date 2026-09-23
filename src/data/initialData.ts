import { 
  SystemSettings, 
  Employee, 
  Dependent, 
  InsuranceRecord, 
  MealRegistration, 
  SpecialAllowance, 
  TimekeepingRecord,
  WorkShift
} from '../types';
import { DEFAULT_TAX_BRACKETS, DEFAULT_TAX_EXEMPTION_RULES } from '../utils/payrollCalculator';

export const initialSettings: SystemSettings = {
  companyName: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ & THƯƠNG MẠI VIỆT THÀNH',
  directorName: 'Nguyễn Văn Thành',
  chiefAccountantName: 'Trần Thị Thu Hương',
  reportPreparerName: 'Phạm Hồng Phúc',
  address: 'Tầng 8, Tòa nhà V-Tower, 649 Kim Mã, Ba Đình, Hà Nội',
  taxCode: '0108967899',
  phoneNumber: '024.3789.9999',
  
  currentYear: 2026,
  currentMonth: 9,
  
  standardWorkDays: 24, // 24 ngày công chuẩn trong tháng (nghỉ chủ nhật & 2 thứ bảy)
  standardWorkHoursPerDay: 8,
  defaultSalaryBasis: 'monthly',
  fixedDaysOffPolicy: 'sundays_and_half_saturdays', // Lựa chọn ngày nghỉ cố định: CN + 2 Thứ 7 (24 công)
  monthlyStandardConfigs: {
    '2026-01': 24,
    '2026-02': 20, // Tháng 2 Tết Nguyên Đán
    '2026-03': 25,
    '2026-04': 24,
    '2026-05': 24,
    '2026-06': 25,
    '2026-07': 26,
    '2026-08': 25,
    '2026-09': 24,
    '2026-10': 26,
    '2026-11': 24,
    '2026-12': 26
  },
  monthlyPolicyConfigs: {
    '2026-09': 'sundays_and_half_saturdays'
  },
  
  otWeekdayRate: 1.5, // 150%

  otWeekendRate: 2.0, // 200%
  otHolidayRate: 3.0, // 300%
  otNightBonusRate: 0.3, // 30%
  
  personalDeduction: 11000000, // 11,000,000 VND
  dependentDeduction: 4400000, // 4,400,000 VND
  taxBrackets: DEFAULT_TAX_BRACKETS, // Biểu lũy tiến từng phần 7 bậc chuẩn Thông tư 111/2013/TT-BTC
  taxExemptionRules: DEFAULT_TAX_EXEMPTION_RULES, // Quy định thu nhập miễn thuế TNCN (Tăng ca, ăn ca, trang phục...)
  
  socialInsRateEmployee: 8.0,
  healthInsRateEmployee: 1.5,
  unemploymentInsRateEmployee: 1.0,
  
  socialInsRateEmployer: 17.5,
  healthInsRateEmployer: 3.0,
  unemploymentInsRateEmployer: 1.0,
  tradeUnionRateEmployer: 2.0,
  
  standardMealPerDay: 35000,
  monthlyMealFlatRate: 730000,
  
  departments: [
    { id: 'dep-bgd', code: 'BGD', name: 'Ban Giám đốc', managerName: 'Nguyễn Văn Thành', description: 'Điều hành chiến lược toàn công ty' },
    { id: 'dep-kt', code: 'PKT', name: 'Phòng Kế toán - Tài chính', managerName: 'Trần Thị Thu Hương', description: 'Quản lý tài chính, thuế, ngân sách và tiền lương' },
    { id: 'dep-tech', code: 'PCN', name: 'Phòng Kỹ thuật & Công nghệ', managerName: 'Lê Minh Tuấn', description: 'Nghiên cứu & phát triển phần mềm, vận hành hệ thống' },
    { id: 'dep-kd', code: 'PKD', name: 'Phòng Kinh doanh & Marketing', managerName: 'Vũ Quốc Bảo', description: 'Phát triển khách hàng, bán hàng và chăm sóc đối tác' },
    { id: 'dep-sx', code: 'XSX', name: 'Xưởng Sản xuất & Vận hành', managerName: 'Đặng Đình Khoa', description: 'Gia công đóng gói, lắp ráp và kiểm tra chất lượng' },
  ],
  
  positions: [
    { id: 'pos-gd', code: 'GD', name: 'Giám đốc Điều hành', responsibilityAllowance: 5000000 },
    { id: 'pos-ktt', code: 'KTT', name: 'Kế toán trưởng', responsibilityAllowance: 3000000 },
    { id: 'pos-tp', code: 'TP', name: 'Trưởng phòng / Quản đốc', responsibilityAllowance: 2000000 },
    { id: 'pos-dev', code: 'DEV', name: 'Kỹ sư Phần mềm', responsibilityAllowance: 0 },
    { id: 'pos-ktv', code: 'KTV', name: 'Chuyên viên Kế toán', responsibilityAllowance: 0 },
    { id: 'pos-nvkd', code: 'NVKD', name: 'Chuyên viên Kinh doanh', responsibilityAllowance: 0 },
    { id: 'pos-cn', code: 'CN', name: 'Công nhân Kỹ thuật', responsibilityAllowance: 0 },
    { id: 'pos-nv', code: 'NV', name: 'Nhân viên Văn phòng', responsibilityAllowance: 0 },
  ],
  
  holidays: [
    { id: 'hol-1', date: '2026-01-01', name: 'Tết Dương Lịch', isPaid: true },
    { id: 'hol-2', date: '2026-02-16', name: 'Tết Nguyên Đán (Mùng 1)', isPaid: true },
    { id: 'hol-3', date: '2026-02-17', name: 'Tết Nguyên Đán (Mùng 2)', isPaid: true },
    { id: 'hol-4', date: '2026-02-18', name: 'Tết Nguyên Đán (Mùng 3)', isPaid: true },
    { id: 'hol-5', date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương', isPaid: true },
    { id: 'hol-6', date: '2026-04-30', name: 'Giải phóng Miền Nam', isPaid: true },
    { id: 'hol-7', date: '2026-05-01', name: 'Quốc tế Lao động', isPaid: true },
    { id: 'hol-8', date: '2026-09-02', name: 'Quốc khánh 2/9', isPaid: true },
    { id: 'hol-9', date: '2026-09-03', name: 'Nghỉ liền kề Quốc khánh', isPaid: true },
  ]
};

// Hàm tự động tạo mã nhân viên: [CV_CODE]-[CCCD_4_CUOI]
export const generateEmployeeCode = (positionCode: string, idCardNumber: string): string => {
  const lastFour = (idCardNumber || '').replace(/\D/g, '').slice(-4) || '0001';
  const pos = (positionCode || 'NV').toUpperCase().trim();
  return `${pos}-${lastFour}`;
};

export const initialEmployees: Employee[] = [
  {
    id: 'emp-001',
    employeeCode: 'GD-8821',
    fullName: 'Nguyễn Văn Thành',
    idCardNumber: '001085008821',
    birthDate: '1985-05-12',
    issueDate: '2021-04-10',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Số 15 Phố Huế, P. Hàng Bài, Q. Hoàn Kiếm, Hà Nội',
    phoneNumber: '0912345678',
    email: 'thanh.nv@vietthanh.vn',
    departmentId: 'dep-bgd',
    positionId: 'pos-gd',
    workStatus: 'active',
    startDate: '2019-01-01',
    salaryBasis: 'monthly',
    baseSalary: 45000000,
    bankAccount: '1902888999888',
    bankName: 'Techcombank - Chi nhánh Thăng Long',
    taxId: '8021155990',
  },
  {
    id: 'emp-002',
    employeeCode: 'KTT-6742',
    fullName: 'Trần Thị Thu Hương',
    idCardNumber: '001188006742',
    birthDate: '1988-11-20',
    issueDate: '2021-06-15',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Khu đô thị Trung Hòa Nhân Chính, Cầu Giấy, Hà Nội',
    phoneNumber: '0988776655',
    email: 'huong.ttt@vietthanh.vn',
    departmentId: 'dep-kt',
    positionId: 'pos-ktt',
    workStatus: 'active',
    startDate: '2019-03-01',
    salaryBasis: 'monthly',
    baseSalary: 28000000,
    bankAccount: '0021000334455',
    bankName: 'Vietcombank - Chi nhánh Hà Nội',
    taxId: '8122334455',
  },
  {
    id: 'emp-003',
    employeeCode: 'TP-4190',
    fullName: 'Lê Minh Tuấn',
    idCardNumber: '036090004190',
    birthDate: '1990-08-14',
    issueDate: '2022-01-20',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Số 88 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    phoneNumber: '0977112233',
    email: 'tuan.lm@vietthanh.vn',
    departmentId: 'dep-tech',
    positionId: 'pos-tp',
    workStatus: 'active',
    startDate: '2020-05-15',
    salaryBasis: 'monthly',
    baseSalary: 32000000,
    bankAccount: '101566778899',
    bankName: 'MB Bank - Chi nhánh Mỹ Đình',
    taxId: '8344556677',
  },
  {
    id: 'emp-004',
    employeeCode: 'DEV-5561',
    fullName: 'Hoàng Quốc Việt',
    idCardNumber: '025095005561',
    birthDate: '1995-03-25',
    issueDate: '2022-07-10',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Chung cư Eco Green, 286 Nguyễn Xiển, Thanh Xuân, Hà Nội',
    phoneNumber: '0934567890',
    email: 'viet.hq@vietthanh.vn',
    departmentId: 'dep-tech',
    positionId: 'pos-dev',
    workStatus: 'active',
    startDate: '2021-08-01',
    salaryBasis: 'monthly',
    baseSalary: 22000000,
    bankAccount: '1241000889922',
    bankName: 'BIDV - Chi nhánh Quang Trung',
    taxId: '8455667788',
  },
  {
    id: 'emp-005',
    employeeCode: 'KTV-9310',
    fullName: 'Phạm Hồng Phúc',
    idCardNumber: '017196009310',
    birthDate: '1996-09-08',
    issueDate: '2023-02-18',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Số 42 Ngõ 165 Cầu Giấy, P. Quan Hoa, Cầu Giấy, Hà Nội',
    phoneNumber: '0966442211',
    email: 'phuc.ph@vietthanh.vn',
    departmentId: 'dep-kt',
    positionId: 'pos-ktv',
    workStatus: 'active',
    startDate: '2022-02-15',
    salaryBasis: 'monthly',
    baseSalary: 14000000,
    bankAccount: '190333221100',
    bankName: 'Techcombank - Chi nhánh Cầu Giấy',
    taxId: '8566778899',
  },
  {
    id: 'emp-006',
    employeeCode: 'NVKD-3874',
    fullName: 'Đỗ Thùy Linh',
    idCardNumber: '001198003874',
    birthDate: '1998-04-19',
    issueDate: '2022-10-12',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Tòa Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    phoneNumber: '0945112288',
    email: 'linh.dt@vietthanh.vn',
    departmentId: 'dep-kd',
    positionId: 'pos-nvkd',
    workStatus: 'active',
    startDate: '2023-03-01',
    salaryBasis: 'percent', // Lương theo % hiệu quả kinh doanh
    baseSalary: 10000000,
    salaryPercent: 120, // Đạt 120% KPI
    bankAccount: '0451000778899',
    bankName: 'Vietcombank - Chi nhánh Thành Công',
    taxId: '8677889900',
  },
  {
    id: 'emp-007',
    employeeCode: 'CN-1256',
    fullName: 'Đặng Đình Khoa',
    idCardNumber: '034091001256',
    birthDate: '1991-12-05',
    issueDate: '2021-08-25',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Khu công nghiệp Quang Minh, Mê Linh, Hà Nội',
    phoneNumber: '0979883344',
    email: 'khoa.dd@vietthanh.vn',
    departmentId: 'dep-sx',
    positionId: 'pos-tp',
    workStatus: 'active',
    startDate: '2020-01-10',
    salaryBasis: 'daily', // Lương theo ngày công thực tế
    baseSalary: 16000000,
    bankAccount: '1500205889911',
    bankName: 'Agribank - Chi nhánh Mê Linh',
    taxId: '8788990011',
  },
  {
    id: 'emp-008',
    employeeCode: 'CN-8923',
    fullName: 'Bùi Thị Mai',
    idCardNumber: '026199008923',
    birthDate: '1999-07-22',
    issueDate: '2023-05-14',
    issuePlace: 'Cục Cảnh sát QLHC về TTXH',
    address: 'Thị trấn Đông Anh, Huyện Đông Anh, Hà Nội',
    phoneNumber: '0981223399',
    email: 'mai.bt@vietthanh.vn',
    departmentId: 'dep-sx',
    positionId: 'pos-cn',
    workStatus: 'active',
    startDate: '2024-01-05',
    salaryBasis: 'hourly', // Phương án tính lương theo giờ
    baseSalary: 9600000,
    hourlyRate: 50000, // 50.000 đ/giờ làm việc thực tế
    bankAccount: '190344556677',

    bankName: 'Techcombank - Chi nhánh Đông Anh',
    taxId: '8899001122',
  }
];

export const initialDependents: Dependent[] = [
  {
    id: 'dep-rec-01',
    employeeId: 'emp-001',
    fullName: 'Nguyễn Minh Khang',
    taxCodeOrId: '001216009823',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2016-06-18',
    startDate: '2019-01',
    deductionAmount: 4400000,
    note: 'Con trai đầu'
  },
  {
    id: 'dep-rec-02',
    employeeId: 'emp-001',
    fullName: 'Nguyễn Bảo Anh',
    taxCodeOrId: '001220005412',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2020-09-02',
    startDate: '2020-10',
    deductionAmount: 4400000,
    note: 'Con gái thứ hai'
  },
  {
    id: 'dep-rec-03',
    employeeId: 'emp-002',
    fullName: 'Trần Gia Hưng',
    taxCodeOrId: '001218004567',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2018-04-12',
    startDate: '2019-03',
    deductionAmount: 4400000,
    note: 'Con trai'
  },
  {
    id: 'dep-rec-04',
    employeeId: 'emp-003',
    fullName: 'Lê Thùy Chi',
    taxCodeOrId: '036221008899',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2021-11-28',
    startDate: '2022-01',
    deductionAmount: 4400000,
    note: 'Con gái'
  },
  {
    id: 'dep-rec-05',
    employeeId: 'emp-007',
    fullName: 'Đặng Ngọc Diệp',
    taxCodeOrId: '034219001122',
    relationship: 'Con đẻ/Con nuôi',
    birthDate: '2019-08-10',
    startDate: '2020-02',
    deductionAmount: 4400000,
    note: 'Con gái'
  }
];

export const initialInsurances: InsuranceRecord[] = [
  {
    id: 'ins-01',
    employeeId: 'emp-001',
    isParticipating: true,
    insuranceSalary: 35000000,
    startDate: '2020-01',
    history: [
      { id: 'h-01-1', fromMonth: '2020-01', toMonth: '2022-12', salary: 28000000, note: 'Khởi đầu tham gia BHXH tại DN' },
      { id: 'h-01-2', fromMonth: '2023-01', toMonth: '', salary: 35000000, note: 'Điều chỉnh nâng mức trần đóng BHXH' }
    ],
    note: 'Đóng mức trần quy định công ty'
  },
  {
    id: 'ins-02',
    employeeId: 'emp-002',
    isParticipating: true,
    insuranceSalary: 20000000,
    startDate: '2021-03',
    history: [
      { id: 'h-02-1', fromMonth: '2021-03', toMonth: '2023-06', salary: 16000000, note: 'Giai đoạn bắt đầu thử việc & chính thức' },
      { id: 'h-02-2', fromMonth: '2023-07', toMonth: '', salary: 20000000, note: 'Nâng bậc lương định kỳ' }
    ],
    note: 'Mức theo thỏa thuận'
  },
  {
    id: 'ins-03',
    employeeId: 'emp-003',
    isParticipating: true,
    insuranceSalary: 22000000,
    startDate: '2021-08',
    history: [
      { id: 'h-03-1', fromMonth: '2021-08', toMonth: '2023-12', salary: 18000000, note: 'Ký HĐLĐ chính thức' },
      { id: 'h-03-2', fromMonth: '2024-01', toMonth: '', salary: 22000000, note: 'Bổ nhiệm Trưởng phòng & điều chỉnh' }
    ],
    note: 'Mức theo chức danh'
  },
  {
    id: 'ins-04',
    employeeId: 'emp-004',
    isParticipating: true,
    insuranceSalary: 15000000,
    startDate: '2022-04',
    history: [
      { id: 'h-04-1', fromMonth: '2022-04', toMonth: '', salary: 15000000, note: 'Mức đóng ban đầu' }
    ],
    note: 'Đóng theo quy chế'
  },
  {
    id: 'ins-05',
    employeeId: 'emp-005',
    isParticipating: true,
    insuranceSalary: 10000000,
    startDate: '2023-01',
    history: [
      { id: 'h-05-1', fromMonth: '2023-01', toMonth: '', salary: 10000000, note: 'Bắt đầu HĐLĐ' }
    ],
    note: 'Đóng theo hợp đồng'
  },
  {
    id: 'ins-06',
    employeeId: 'emp-006',
    isParticipating: true,
    insuranceSalary: 8000000,
    startDate: '2023-06',
    history: [
      { id: 'h-06-1', fromMonth: '2023-06', toMonth: '', salary: 8000000, note: 'Mức lương thỏa thuận thử việc và chính thức' }
    ],
    note: 'Mức lương cơ bản'
  },
  {
    id: 'ins-07',
    employeeId: 'emp-007',
    isParticipating: true,
    insuranceSalary: 11000000,
    startDate: '2020-05',
    history: [
      { id: 'h-07-1', fromMonth: '2020-05', toMonth: '2023-06', salary: 9000000, note: 'Giai đoạn công nhân kỹ thuật' },
      { id: 'h-07-2', fromMonth: '2023-07', toMonth: '', salary: 11000000, note: 'Phụ cấp chức danh Quản đốc' }
    ],
    note: 'Đóng theo chức danh xưởng'
  },
  {
    id: 'ins-08',
    employeeId: 'emp-008',
    isParticipating: true,
    insuranceSalary: 6500000,
    startDate: '2024-02',
    history: [
      { id: 'h-08-1', fromMonth: '2024-02', toMonth: '', salary: 6500000, note: 'Tham gia BHXH theo mức tối thiểu vùng' }
    ],
    note: 'Mức tối thiểu vùng + 7%'
  },
];

export const initialMealRegistrations: MealRegistration[] = [
  { id: 'meal-01', employeeId: 'emp-001', month: '2026-09', planType: 'none', note: 'Không ăn ca tại công ty' },
  { id: 'meal-02', employeeId: 'emp-002', month: '2026-09', planType: 'cash', monthlyFlatAmount: 730000, note: 'Nhận phụ cấp ăn trưa tiền mặt' },
  { id: 'meal-03', employeeId: 'emp-003', month: '2026-09', planType: 'cash', monthlyFlatAmount: 730000, note: 'Nhận tiền ăn vào tài khoản' },
  { id: 'meal-04', employeeId: 'emp-004', month: '2026-09', planType: 'registered', customRatePerMeal: 35000, note: 'Đăng ký ăn trưa tại căng tin công ty' },
  { id: 'meal-05', employeeId: 'emp-005', month: '2026-09', planType: 'registered', customRatePerMeal: 35000, note: 'Đăng ký ăn trưa căng tin' },
  { id: 'meal-06', employeeId: 'emp-006', month: '2026-09', planType: 'cash', monthlyFlatAmount: 730000, note: 'Nhận tiền mặt phụ cấp ăn ngoài' },
  { id: 'meal-07', employeeId: 'emp-007', month: '2026-09', planType: 'registered', customRatePerMeal: 35000, note: 'Ăn ca xưởng sản xuất' },
  { id: 'meal-08', employeeId: 'emp-008', month: '2026-09', planType: 'registered', customRatePerMeal: 35000, note: 'Ăn ca xưởng sản xuất' },
];

export const initialSpecialAllowances: SpecialAllowance[] = [
  // emp-001: Giám đốc
  { id: 'sa-01', employeeId: 'emp-001', month: '2026-09', allowanceType: 'responsibility', name: 'Phụ cấp trách nhiệm quản lý', amount: 5000000, isTaxable: true, note: 'Tính thuế TNCN' },
  { id: 'sa-02', employeeId: 'emp-001', month: '2026-09', allowanceType: 'phone', name: 'Phụ cấp cước điện thoại công tác', amount: 1500000, isTaxable: false, note: 'Theo định mức công tác, miễn thuế TNCN' },
  { id: 'sa-03', employeeId: 'emp-001', month: '2026-09', allowanceType: 'travel_gas', name: 'Phụ cấp xăng xe tiếp khách', amount: 2000000, isTaxable: false, note: 'Theo quy chế công tác phí, miễn thuế' },
  
  // emp-002: Kế toán trưởng
  { id: 'sa-04', employeeId: 'emp-002', month: '2026-09', allowanceType: 'responsibility', name: 'Phụ cấp trách nhiệm Kế toán trưởng', amount: 3000000, isTaxable: true, note: 'Tính thuế TNCN' },
  { id: 'sa-05', employeeId: 'emp-002', month: '2026-09', allowanceType: 'phone', name: 'Phụ cấp điện thoại giao dịch ngân hàng', amount: 800000, isTaxable: false, note: 'Miễn thuế theo hạn mức' },
  
  // emp-003: Trưởng phòng CN
  { id: 'sa-06', employeeId: 'emp-003', month: '2026-09', allowanceType: 'responsibility', name: 'Phụ cấp Trưởng phòng', amount: 2000000, isTaxable: true, note: 'Tính thuế TNCN' },
  { id: 'sa-07', employeeId: 'emp-003', month: '2026-09', allowanceType: 'phone', name: 'Phụ cấp điện thoại On-call', amount: 500000, isTaxable: false, note: 'Miễn thuế' },
  
  // emp-004: Dev
  { id: 'sa-08', employeeId: 'emp-004', month: '2026-09', allowanceType: 'attendance', name: 'Phụ cấp chuyên cần & dự án', amount: 1000000, isTaxable: true, note: 'Tính thuế TNCN' },
  
  // emp-005: KTV
  { id: 'sa-09', employeeId: 'emp-005', month: '2026-09', allowanceType: 'attendance', name: 'Phụ cấp chuyên cần', amount: 500000, isTaxable: true, note: 'Tính thuế TNCN' },
  
  // emp-006: Kinh doanh
  { id: 'sa-10', employeeId: 'emp-006', month: '2026-09', allowanceType: 'travel_gas', name: 'Hỗ trợ xăng xe thị trường', amount: 1200000, isTaxable: false, note: 'Đi lại thị trường, miễn thuế' },
  { id: 'sa-11', employeeId: 'emp-006', month: '2026-09', allowanceType: 'phone', name: 'Phụ cấp điện thoại khách hàng', amount: 600000, isTaxable: false, note: 'Miễn thuế' },
  
  // emp-007: Quản đốc xưởng
  { id: 'sa-12', employeeId: 'emp-007', month: '2026-09', allowanceType: 'hazardous', name: 'Phụ cấp nặng nhọc độc hại xưởng', amount: 1500000, isTaxable: false, note: 'Độc hại theo danh mục NN, miễn thuế' },
  { id: 'sa-13', employeeId: 'emp-007', month: '2026-09', allowanceType: 'responsibility', name: 'Phụ cấp Quản đốc', amount: 2000000, isTaxable: true, note: 'Tính thuế TNCN' },
  
  // emp-008: Công nhân
  { id: 'sa-14', employeeId: 'emp-008', month: '2026-09', allowanceType: 'hazardous', name: 'Phụ cấp độc hại', amount: 800000, isTaxable: false, note: 'Miễn thuế TNCN' },
  { id: 'sa-15', employeeId: 'emp-008', month: '2026-09', allowanceType: 'attendance', name: 'Phụ cấp chuyên cần xưởng', amount: 500000, isTaxable: true, note: 'Tính thuế' },
];

// Sinh dữ liệu chấm công mặc định cho tháng 9/2026 (30 ngày)
// Ngày 2/9 và 3/9 là Lễ Quốc khánh (Ký hiệu 'L')
// Chủ nhật: ngày 6, 13, 20, 27
// Thứ 7 nghỉ: ngày 12, 26 (chỉ làm thứ 7 ngày 5, 19)
export const generateDefaultTimekeeping = (employeeList: Employee[], month: string = '2026-09'): TimekeepingRecord[] => {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, m, 0).getDate(); // 30 ngày cho tháng 9
  
  return employeeList.map((emp, empIndex) => {
    const days: TimekeepingRecord['days'] = {};
    let actualWorkDays = 0;
    let paidLeaveDays = 0;
    let holidayDays = 0;
    let unpaidLeaveDays = 0;
    let insuranceLeaveDays = 0;
    let totalOtNormalHours = 0;
    let totalOtWeekendHours = 0;
    let totalOtHolidayHours = 0;
    let totalMeals = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, m - 1, day);
      const dayOfWeek = date.getDay(); // 0: Chủ nhật, 6: Thứ bảy
      
      let symbol: TimekeepingRecord['days'][number]['symbol'] = '';
      let otNormal = 0;
      let otWeekend = 0;
      let otHoliday = 0;
      let mealEaten = false;
      let shift: WorkShift | undefined = undefined;
      let otStartTime: string | undefined = undefined;
      let otEndTime: string | undefined = undefined;
      let otReason: string | undefined = undefined;
      
      // Ngày lễ: 2/9 và 3/9
      if (m === 9 && (day === 2 || day === 3)) {
        symbol = 'L';
        holidayDays++;
      } else if (dayOfWeek === 0) {
        // Chủ nhật: nghỉ
        symbol = '';
        // Một số người làm tăng ca chủ nhật
        if (emp.positionId === 'pos-dev' && day === 13) {
          otWeekend = 6;
          otStartTime = '08:30';
          otEndTime = '15:00';
          otReason = 'Tăng ca bảo trì hệ thống máy chủ định kỳ';
          totalOtWeekendHours += 6;
        } else if (emp.positionId === 'pos-cn' && day === 20) {
          otWeekend = 8;
          otStartTime = '08:00';
          otEndTime = '17:00';
          otReason = 'Tăng ca Chủ nhật chạy dây chuyền đơn hàng gấp';
          totalOtWeekendHours += 8;
        }
      } else if (dayOfWeek === 6 && (day === 12 || day === 26)) {
        // Nghỉ thứ bảy luân phiên
        symbol = '';
      } else {
        // Ngày làm việc bình thường
        // Thử nghiệm một số trường hợp nghỉ phép hoặc đi công tác
        if (emp.id === 'emp-002' && day === 15) {
          symbol = 'P'; // Nghỉ phép
          paidLeaveDays++;
        } else if (emp.id === 'emp-005' && day === 22) {
          symbol = 'O'; // Nghỉ ốm BHXH
          insuranceLeaveDays++;
        } else if (emp.id === 'emp-006' && (day === 8 || day === 9)) {
          symbol = 'CT'; // Đi công tác
          actualWorkDays += 1;
          mealEaten = false;
        } else if (emp.id === 'emp-008' && day === 18) {
          symbol = 'Ro'; // Nghỉ không lương
          unpaidLeaveDays++;
        } else {
          symbol = 'X';
          actualWorkDays += 1;
          mealEaten = true;
          
          // Gán ca làm việc mặc định theo vị trí
          shift = 'ca_hanh_chinh';
          if (emp.positionId === 'pos-cn') {
            shift = (day % 3 === 0) ? 'ca_3' : (day % 2 === 0) ? 'ca_2' : 'ca_1';
          } else if (emp.salaryBasis === 'hourly') {
            shift = (day % 2 === 0) ? 'ca_chieu' : 'ca_sang';
          }

          // Thêm tăng ca ngày thường cho Dev và Công nhân kèm giờ cụ thể
          if (emp.positionId === 'pos-dev' && (day === 10 || day === 24)) {
            otNormal = 2.5;
            otStartTime = '17:30';
            otEndTime = '20:00';
            otReason = 'Triển khai release phần mềm & test tải';
            totalOtNormalHours += 2.5;
          }
          if (emp.positionId === 'pos-cn' && (day === 7 || day === 14 || day === 21)) {
            otNormal = 2;
            otStartTime = shift === 'ca_1' ? '14:30' : (shift === 'ca_2' ? '22:30' : '06:30');
            otEndTime = shift === 'ca_1' ? '16:30' : (shift === 'ca_2' ? '00:30' : '08:30');
            otReason = 'Gia công đóng gói đơn hàng xuất khẩu';
            totalOtNormalHours += 2;
          }
        }
      }
      
      if (mealEaten) {
        totalMeals++;
      }
      
      days[day] = {
        symbol,
        shift: symbol === 'X' ? shift : undefined,
        otStartTime,
        otEndTime,
        otReason,
        otNormalHours: otNormal,
        otWeekendHours: otWeekend,
        otHolidayHours: otHoliday,
        mealEaten
      };
    }
    
    return {
      id: `tk-${emp.id}-${month}`,
      employeeId: emp.id,
      year: 2026,
      month: 9,
      days,
      actualWorkDays,
      paidLeaveDays,
      holidayDays,
      unpaidLeaveDays,
      insuranceLeaveDays,
      totalPaidDays: actualWorkDays + paidLeaveDays + holidayDays,
      totalOtNormalHours,
      totalOtWeekendHours,
      totalOtHolidayHours,
      totalMeals
    };
  });
};

export const INITIAL_SETTINGS = initialSettings;
export const INITIAL_EMPLOYEES = initialEmployees;
export const INITIAL_DEPENDENTS = initialDependents;
export const INITIAL_INSURANCES = initialInsurances;
export const INITIAL_MEAL_REGISTRATIONS = initialMealRegistrations;
export const INITIAL_SPECIAL_ALLOWANCES = initialSpecialAllowances;
export const INITIAL_TIMEKEEPINGS = generateDefaultTimekeeping(initialEmployees, '2026-09');

