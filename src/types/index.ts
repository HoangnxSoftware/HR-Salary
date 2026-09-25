export type WorkStatus = 'active' | 'probation' | 'resigned' | 'transferred' | 'maternity';

export type SalaryCalculationBasis = 'monthly' | 'daily' | 'hourly' | 'percent' | 'department';

export type FixedDaysOffPolicy = 
  | 'all_sundays' // Nghỉ tất cả các ngày Chủ nhật (CN)
  | 'half_sundays' // 1/2 CN (Được nghỉ 2 Chủ nhật trong tháng)
  | 'all_weekends' // Nghỉ cả Thứ 7 và Chủ nhật (T7 + CN)
  | 'sundays_and_half_saturdays' // Nghỉ tất cả CN + 2 Thứ 7 trong tháng (cách tuần)
  | 'custom'; // Tự nhập số ngày công chuẩn

export interface Department {

  id: string;
  code: string;
  name: string;
  managerName?: string;
  description?: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  responsibilityAllowance: number; // Phụ cấp trách nhiệm
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  isPaid: boolean; // Có hưởng lương hay không
}

export interface SystemSettings {
  companyName: string;
  directorName: string;
  chiefAccountantName: string;
  reportPreparerName: string;
  address: string;
  taxCode: string;
  phoneNumber: string;
  
  // Thời gian làm việc hiện tại
  currentYear: number;
  currentMonth: number; // 1-12
  
  // Cơ sở tính lương
  standardWorkDays: number; // Ngày công chuẩn trong tháng (ví dụ 24 ngày hoặc 26 ngày)
  standardWorkHoursPerDay: number; // 8 giờ
  defaultSalaryBasis: SalaryCalculationBasis;
  
  // Tỷ lệ làm thêm giờ (Overtime)
  otWeekdayRate: number; // 150% (1.5)
  otWeekendRate: number; // 200% (2.0)
  otHolidayRate: number; // 300% (3.0)
  otNightBonusRate: number; // 30% (0.3)
  
  // Thuế TNCN & Giảm trừ gia cảnh (VNĐ)
  personalDeduction: number; // 15,500,000 đ
  dependentDeduction: number; // 6,200,000 đ / người
  
  // Tỷ lệ trích BHXH Người lao động (%)
  socialInsRateEmployee: number; // 8%
  healthInsRateEmployee: number; // 1.5%
  unemploymentInsRateEmployee: number; // 1%
  // Tổng = 10.5%
  
  // Tỷ lệ trích BHXH Người sử dụng lao động (%)
  socialInsRateEmployer: number; // 17.5%
  healthInsRateEmployer: number; // 3%
  unemploymentInsRateEmployer: number; // 1%
  tradeUnionRateEmployer: number; // 2% (Kinh phí công đoàn)
  // Tổng = 23.5%
  
  // Định mức tiền ăn ca/ăn trưa
  standardMealPerDay: number; // ví dụ 35,000 VND / ngày hoặc bữa
  monthlyMealFlatRate: number; // ví dụ 1,200,000 VND / tháng (mức tối đa miễn thuế TNCN)
  
  // Danh mục phòng ban, chức vụ, ngày nghỉ
  departments: Department[];
  positions: Position[];
  holidays: Holiday[];

  // Lựa chọn ngày nghỉ cố định & Ngày công chuẩn theo từng tháng
  fixedDaysOffPolicy?: FixedDaysOffPolicy; // CN (nghỉ chủ nhật) | 1/2 CN (nghỉ 2 CN) | T7+CN | CN + 2 T7
  monthlyStandardConfigs?: Record<string, number>; // key YYYY-MM -> số ngày công chuẩn của tháng
  monthlyPolicyConfigs?: Record<string, FixedDaysOffPolicy>; // key YYYY-MM -> chính sách nghỉ của tháng

  // Biểu thuế lũy tiến từng phần (cho phép tùy chỉnh bậc, ngưỡng, thuế suất)
  taxBrackets?: TaxBracket[];

  // Thiết lập thu nhập miễn thuế / không được miễn thuế TNCN (Tăng ca, Ăn ca tiền mặt, Trang phục, Điện thoại...)
  taxExemptionRules?: TaxExemptionRules;

  // Mẫu văn bản in ấn (Hợp đồng lao động, Bản cam kết thu nhập)
  documentTemplates?: DocumentTemplatesConfig;
}

export interface DocumentTemplatesConfig {
  contractTemplate?: string;
  commitmentTemplate?: string;
  defaultContractType?: string;
  lastUpdated?: string;
}

export interface TaxExemptionRules {
  // 1. Tăng ca / Làm thêm giờ (OT)
  otExemptMode: 'differential_only' | 'fully_exempt' | 'fully_taxable' | 'custom_rate';
  otCustomExemptRate?: number; // Tỷ lệ % miễn thuế nếu chọn custom_rate (ví dụ 50%)

  // Quy định khống chế trần làm thêm giờ theo Bộ luật Lao động & Thuế TNCN
  otMonthlyHoursCap?: number; // Mức trần giờ làm thêm/tháng được miễn thuế (mặc định: 40 giờ/tháng)
  otYearlyHoursCap?: number; // Mức trần giờ làm thêm tích lũy/năm được miễn thuế (mặc định: 200 giờ/năm)
  otCapExceededTaxable?: boolean; // Tự động tính thuế 100% phần làm thêm vượt 40 giờ/tháng và 200 giờ/năm (mặc định: true)

  // 2. Mức ăn ca chi trả bằng tiền mặt
  mealExemptMode: 'capped' | 'fully_exempt' | 'fully_taxable';
  mealExemptMonthlyCap: number; // Mức trần miễn thuế (VNĐ/tháng, mặc định chuyển thành: 1,200,000 đ)

  // 3. Phụ cấp trang phục chi trả bằng tiền
  uniformExemptMode: 'capped' | 'fully_exempt' | 'fully_taxable';
  uniformExemptMonthlyCap: number; // Mức trần miễn thuế (VNĐ/tháng, mặc định: 416,667 đ ~ 5,000,000 đ/năm)

  // 4. Phụ cấp điện thoại / liên lạc
  phoneExemptMode: 'company_policy' | 'capped' | 'fully_taxable';
  phoneExemptMonthlyCap?: number; // Mức trần nếu chọn capped

  // 5. Phụ cấp xăng xe / đi lại / công tác phí
  travelExemptMode: 'company_policy' | 'capped' | 'fully_taxable';
  travelExemptMonthlyCap?: number; // Mức trần nếu chọn capped

  // 6. Ghi chú quy định / căn cứ pháp lý
  legalNote?: string;
}

export interface TaxBracket {
  bracket: number; // 1, 2, 3...
  name: string; // "Bậc 1"
  min: number; // Ngưỡng bắt đầu (VNĐ)
  max: number | null; // Ngưỡng kết thúc (VNĐ) hoặc null/Infinity cho bậc cao nhất
  rate: number; // Thuế suất (ví dụ: 0.05 hoặc 5%)
  description?: string; // Diễn giải mức thu nhập
}

export interface Employee {
  id: string;
  employeeCode: string; // Tự động hoặc nhập: [CV_CODE]-[CCCD_4_CUOI]
  fullName: string;
  idCardNumber: string; // Số Căn cước công dân
  birthDate: string; // YYYY-MM-DD
  issueDate: string; // Ngày cấp CCCD
  issuePlace?: string; // Nơi cấp
  address: string; // Địa chỉ
  phoneNumber?: string;
  email?: string;
  departmentId: string;
  positionId: string;
  workStatus: WorkStatus; // Đang làm, đã nghỉ, điều chuyển...
  startDate: string; // Ngày vào làm
  
  // Chi tiết thời gian theo trạng thái công việc
  probationStartDate?: string; // Thời gian bắt đầu thử việc (YYYY-MM-DD)
  probationEndDate?: string;   // Thời gian kết thúc thử việc (YYYY-MM-DD)
  resignationDate?: string;    // Ngày chính thức nghỉ việc (YYYY-MM-DD)
  maternityStartDate?: string; // Bắt đầu nghỉ thai sản (YYYY-MM-DD)
  maternityEndDate?: string;   // Kết thúc nghỉ thai sản (YYYY-MM-DD)
  transferStartDate?: string;  // Bắt đầu điều chuyển công tác (YYYY-MM-DD)
  transferEndDate?: string;    // Kết thúc điều chuyển công tác (YYYY-MM-DD)
  transferLocation?: string;   // Đơn vị / Phòng ban điều chuyển đến
  
  // Thông tin lương & thanh toán
  salaryBasis: SalaryCalculationBasis; // Lương tháng, ngày công, lương theo giờ, lương theo %, bộ phận
  baseSalary: number; // Lương cơ bản / thỏa thuận (VNĐ) hoặc Đơn giá lương/tháng
  hourlyRate?: number; // Đơn giá lương theo giờ (VNĐ/giờ) áp dụng cho salaryBasis === 'hourly'
  salaryPercent?: number; // Nếu theo % (ví dụ 100%, 85% thử việc)
  bankAccount?: string; // Số tài khoản ngân hàng
  bankName?: string; // Tên ngân hàng
  taxId?: string; // Mã số thuế cá nhân
}


export type RelationshipType = 'Con đẻ/Con nuôi' | 'Vợ/Chồng' | 'Cha mẹ ruột' | 'Cha mẹ vợ/chồng' | 'Người không nơi nương tựa' | 'Khác';

export interface Dependent {
  id: string;
  employeeId: string;
  fullName: string;
  taxCodeOrId: string; // Mã số thuế NPT hoặc CCCD/Giấy khai sinh
  relationship: RelationshipType;
  birthDate: string;
  startDate: string; // Tháng bắt đầu tính giảm trừ (YYYY-MM)
  endDate?: string; // Tháng kết thúc tính giảm trừ (YYYY-MM)
  deductionAmount: number; // 4,400,000 đ
  note?: string;
}

export interface InsuranceSalaryHistory {
  id: string;
  fromMonth: string; // YYYY-MM
  toMonth?: string; // YYYY-MM hoặc để trống là "Đến nay"
  salary: number; // Mức lương đóng BHXH trong giai đoạn này (VNĐ)
  note?: string; // Lý do điều chỉnh (Tăng lương cơ sở, nâng bậc, phụ cấp...)
}

export interface InsuranceRecord {
  id: string;
  employeeId: string;
  isParticipating: boolean; // Có tham gia hay không
  insuranceSalary: number; // Mức lương đóng BHXH thực tế
  startDate?: string; // Thời gian bắt đầu đóng BHXH (YYYY-MM hoặc YYYY-MM-DD)
  customSocialRate?: number; // Tùy chỉnh nếu có, mặc định lấy theo hệ thống
  customHealthRate?: number;
  customUnempRate?: number;
  history?: InsuranceSalaryHistory[]; // Quá trình đóng BHXH theo từng thời gian cụ thể
  note?: string;
}

export type MealPlanType = 'registered' | 'cash' | 'none' | 'canteen'; // Ăn tại bếp | Chi tiền mặt | Không ăn

export interface MealRegistration {
  id: string;
  employeeId: string;
  month?: string; // YYYY-MM
  planType?: MealPlanType;
  customRatePerMeal?: number; // Đơn giá bữa ăn nếu khác mặc định
  monthlyFlatAmount?: number; // Số tiền khoán nếu chi tiền mặt
  mealType?: MealType | MealPlanType;
  ratePerMeal?: number;
  monthlyAllowance?: number;
  note?: string;

  // Đăng ký ăn ca theo từng bữa trong tháng (Trưa / Chiều / Tối)
  registerLunch?: boolean; // Đăng ký ăn trưa
  registerAfternoon?: boolean; // Đăng ký ăn chiều
  registerDinner?: boolean; // Đăng ký ăn tối
}

export type MealType = 'canteen' | 'cash' | 'none' | 'registered';

export type AllowanceType = 
  | 'responsibility' // Phụ cấp trách nhiệm
  | 'hazardous' // Phụ cấp độc hại nguy hiểm
  | 'travel_gas' // Phụ cấp xăng xe, đi lại
  | 'phone' // Phụ cấp điện thoại
  | 'uniform' // Phụ cấp trang phục
  | 'concurrent' // Phụ cấp kiêm nhiệm
  | 'seniority' // Phụ cấp thâm niên
  | 'attendance' // Phụ cấp chuyên cần
  | 'housing' // Phụ cấp nhà ở
  | 'other'; // Khác

export interface SpecialAllowance {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  allowanceType?: AllowanceType;
  name: string;
  amount: number;
  isTaxable: boolean; // CHỊU THUẾ TNCN hay KHÔNG CHỊU THUẾ TNCN
  note?: string;
}

// Ký hiệu chấm công chuẩn
// X: Đi làm đủ ngày (1 công)
// X/2: Làm nửa ngày (0.5 công)
// P: Nghỉ phép hưởng nguyên lương (1 công phép)
// L: Nghỉ Lễ Tết hưởng lương
// O: Nghỉ ốm hưởng BHXH
// TS: Nghỉ thai sản hưởng BHXH
// Ro: Nghỉ không lương
// CT: Đi công tác
// K: Vắng không phép
export type AttendanceSymbol = 'X' | 'X/2' | 'P' | 'L' | 'O' | 'TS' | 'Ro' | 'CT' | 'K' | '';

// Ca làm việc: ca sáng, ca chiều, ca 1, ca 2, ca 3, ca hành chính
export type WorkShift = 'ca_sang' | 'ca_chieu' | 'ca_1' | 'ca_2' | 'ca_3' | 'ca_hanh_chinh';

export interface ShiftInfo {
  id: WorkShift;
  name: string; // Tên ca (Ca sáng, Ca chiều, Ca 1, Ca 2, Ca 3, Ca hành chính)
  shortName: string; // Mã viết tắt hiển thị ô công (Sáng, Chiều, C1, C2, C3, HC)
  timeRange: string; // Khung giờ quy định (ví dụ 06:00 - 14:00)
  startTime: string; // "06:00"
  endTime: string; // "14:00"
  standardHours: number; // 4 hoặc 8
  isNightShift?: boolean; // Ca đêm (22:00 - 06:00)
  badgeClass: string;
}

export interface DayAttendance {
  symbol: AttendanceSymbol;
  hours?: number;
  
  // Ca làm việc
  shift?: WorkShift;
  
  // Thời gian làm thêm giờ (OT) từ mấy giờ đến mấy giờ
  otStartTime?: string; // Giờ bắt đầu OT (ví dụ: "17:30")
  otEndTime?: string; // Giờ kết thúc OT (ví dụ: "20:30")
  otReason?: string; // Lý do làm thêm / Nội dung công việc
  otType?: 'normal' | 'weekend' | 'holiday'; // Loại ngày làm thêm (ngày thường, CN, lễ)

  otNormalHours: number;
  otWeekendHours: number;
  otHolidayHours: number;

  // Suất ăn ca trong ngày (Tích chọn Trưa / Chiều / Tối)
  hadMeal?: boolean;
  mealEaten?: boolean;
  mealLunch?: boolean; // Tích chọn ăn trưa
  mealAfternoon?: boolean; // Tích chọn ăn chiều
  mealDinner?: boolean; // Tích chọn ăn tối
}

export type DailyTimekeeping = DayAttendance;

export interface TimekeepingRecord {
  id: string;
  employeeId: string;
  year?: number;
  month: string | number; // YYYY-MM hoặc số tháng 1..12
  days: Record<number, DayAttendance>; // key là ngày 1..31
  
  // Tổng hợp tự động
  actualWorkDays: number; // Số ngày công thực tế (X = 1, X/2 = 0.5, CT = 1)
  paidLeaveDays: number; // Số ngày nghỉ phép hưởng lương (P)
  holidayDays: number; // Số ngày nghỉ lễ hưởng lương (L)
  unpaidLeaveDays: number; // Nghỉ không lương (Ro, K)
  insuranceLeaveDays: number; // Nghỉ ốm, thai sản (O, TS)
  totalPaidDays: number; // Tổng ngày hưởng lương = actual + leave + holiday
  
  totalOtNormalHours: number;
  totalOtWeekendHours: number;
  totalOtHolidayHours: number;
  totalMeals: number; // Tổng số bữa ăn trong tháng (Trưa + Chiều + Tối)
  totalMealsLunch?: number; // Tổng bữa trưa
  totalMealsAfternoon?: number; // Tổng bữa chiều
  totalMealsDinner?: number; // Tổng bữa tối
  totalActualWorkHours?: number; // Tổng số giờ làm việc thực tế (chưa gồm OT)
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  
  // 1. Thông tin cơ sở
  standardDays: number; // Ngày công chuẩn tháng
  actualPaidDays: number; // Ngày công tính lương thực tế
  actualWorkDays?: number; // Ngày công đi làm thực tế
  actualWorkHours?: number; // Số giờ làm việc thực tế (cho lương theo giờ)
  hourlyRateApplied?: number; // Đơn giá lương/giờ áp dụng
  salaryBasis?: SalaryCalculationBasis; // Hình thức tính lương (tháng, ngày công, giờ, KPI...)
  baseSalary: number; // Lương cơ bản / hợp đồng

  
  // 2. Thu nhập theo công và làm thêm
  mainSalary: number; // Lương chính = (Lương cơ bản / ngày chuẩn) * ngày công thực tế (hoặc theo %)
  otPayTaxable: number; // Tiền OT phần tính thuế (100% lương theo giờ + phần vượt trần 40h/tháng, 200h/năm)
  otPayTaxExempt: number; // Tiền OT phần MIỄN THUẾ (phần dôi thêm trong hạn mức 40h/tháng, 200h/năm)
  otHoursTotal?: number; // Tổng số giờ làm thêm trong tháng
  otHoursEligible?: number; // Số giờ làm thêm trong hạn mức được xét miễn thuế (tối đa 40h/tháng & 200h/năm)
  otHoursExcess?: number; // Số giờ làm thêm vượt hạn mức bị tính thuế TNCN 100%
  priorYearOtHours?: number; // Số giờ làm thêm lũy kế trước tháng hiện tại trong năm
  
  // 3. Phụ cấp
  taxableAllowances: number; // Tổng phụ cấp CHỊU thuế TNCN (trách nhiệm, chuyên cần, kiêm nhiệm...)
  taxExemptAllowances: number; // Tổng phụ cấp MIỄN thuế TNCN (ăn trưa trong định mức, xăng xe, điện thoại theo quy chế, độc hại...)
  mealAllowance: number; // Tiền ăn trưa/ăn ca (nếu chi tiền mặt)
  
  // 4. Tổng thu nhập (Gross)
  grossIncome: number; // = Lương chính + Tổng OT + Tổng phụ cấp
  
  // 5. Các khoản trích theo lương của NLĐ (10.5%)
  insuranceSalary: number;
  socialInsuranceEmp: number; // 8%
  healthInsuranceEmp: number; // 1.5%
  unempInsuranceEmp: number; // 1%
  totalInsuranceEmp: number; // 10.5%
  
  // 6. Chi phí BHXH người sử dụng lao động chịu (23.5%)
  socialInsuranceEmployer: number; // 17.5%
  healthInsuranceEmployer: number; // 3%
  unempInsuranceEmployer: number; // 1%
  tradeUnionEmployer: number; // 2%
  totalInsuranceEmployer: number; // 23.5%
  
  // 7. Giảm trừ gia cảnh & Thuế TNCN
  personalDeduction: number; // 11,000,000 đ
  dependentCount: number; // Số người phụ thuộc
  dependentDeduction: number; // 4,400,000 * số người
  totalDeductionsForTax: number; // Bản thân + NPT + BHXH NLĐ
  
  taxableIncome: number; // Thu nhập chịu thuế = Gross - Thu nhập miễn thuế (OT miễn thuế, ăn ca miễn thuế, phụ cấp miễn thuế)
  assessableIncome: number; // Thu nhập tính thuế = max(0, Thu nhập chịu thuế - Các khoản giảm trừ)
  personalIncomeTax: number; // Thuế TNCN phải nộp (Lũy tiến 7 bậc)
  
  // 8. Các khoản khấu trừ khác & Tạm ứng
  advancePayment: number; // Tạm ứng
  mealDeduction: number; // Khấu trừ tiền ăn (nếu công ty chi hộ/ăn tại bếp)
  tradeUnionEmp: number; // Đoàn phí công đoàn cá nhân (nếu có)
  otherDeductions: number;
  
  // 9. THỰC LĨNH (NET)
  // Thực lĩnh = Gross - BHXH cá nhân - Thuế TNCN - Khấu trừ ăn ca - Tạm ứng - Khác
  netSalary: number;
  
  paymentStatus: PaymentStatus;
  note?: string;
}

export type PaymentStatus = 'draft' | 'approved' | 'paid';


export type UserRole = 'admin' | 'accountant' | 'payroll' | 'employee';

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewEmployees: boolean;
  canEditEmployees: boolean;
  canViewTimekeeping: boolean;
  canEditTimekeeping: boolean;
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
  canApprovePayroll: boolean;
  canViewTaxReport: boolean;
  canExportData: boolean;
  canSyncGoogleSheets: boolean;
  canEditSettings: boolean;
  canManageUsers: boolean;
}

export interface AppUser {
  id: string;
  username: string; // Tên đăng nhập
  password?: string; // Mật khẩu
  name: string; // Tên hiển thị
  email: string;
  role: UserRole;
  employeeId?: string; // Nếu là employee thì gán với 1 NV cụ thể
  status?: 'active' | 'locked';
  avatar?: string;
  lastLogin?: string;
  customPermissions?: Partial<RolePermissions>; // Tùy biến quyền riêng nếu có
}

export interface GoogleSyncState {
  isConnected: boolean;
  userEmail: string | null;
  spreadsheetId: string | null;
  spreadsheetName?: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncMessage: string | null;
  syncSuccess: boolean;
}
