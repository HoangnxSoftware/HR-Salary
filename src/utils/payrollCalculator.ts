import {
  SystemSettings,
  Employee,
  Dependent,
  InsuranceRecord,
  MealRegistration,
  SpecialAllowance,
  TimekeepingRecord,
  PayrollRecord,
  FixedDaysOffPolicy,
  Holiday,
  TaxBracket,
  TaxExemptionRules
} from '../types';

/**
 * Tính số ngày công chuẩn trong tháng dựa vào lịch thực tế và chính sách ngày nghỉ cố định
 * - all_sundays: Nghỉ tất cả các ngày Chủ nhật (CN)
 * - half_sundays: Nghỉ 2 Chủ nhật trong tháng (1/2 CN, 2 CN còn lại đi làm bình thường)
 * - all_weekends: Nghỉ cả Thứ 7 và Chủ nhật (T7 + CN)
 * - sundays_and_half_saturdays: Nghỉ tất cả CN + 2 Thứ 7 trong tháng (cách tuần)
 * - custom: Trả về số ngày người dùng tự thiết lập
 */
export const calculateStandardDaysFromPolicy = (
  year: number,
  month: number,
  policy: FixedDaysOffPolicy = 'all_sundays',
  holidays: Holiday[] = []
): number => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let sundaysCount = 0;
  let saturdaysCount = 0;
  const holidayDateSet = new Set(holidays.map(h => h.date));
  let holidayOffCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay(); // 0: CN, 6: T7
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isHoliday = holidayDateSet.has(dateStr);

    if (dayOfWeek === 0) {
      sundaysCount++;
    } else if (dayOfWeek === 6) {
      saturdaysCount++;
    }

    // Ngày Lễ hưởng lương rơi vào ngày làm việc trong tuần
    if (isHoliday) {
      if (policy === 'all_weekends' && dayOfWeek !== 0 && dayOfWeek !== 6) {
        holidayOffCount++;
      } else if (policy === 'all_sundays' && dayOfWeek !== 0) {
        holidayOffCount++;
      } else if (policy === 'sundays_and_half_saturdays' || policy === 'half_sundays') {
        holidayOffCount++;
      }
    }
  }

  let offDays = 0;
  switch (policy) {
    case 'all_sundays':
      offDays = sundaysCount + holidayOffCount;
      break;
    case 'half_sundays':
      // 1/2 CN: Được nghỉ 2 ngày Chủ nhật trong tháng
      offDays = 2 + holidayOffCount;
      break;
    case 'all_weekends':
      offDays = sundaysCount + saturdaysCount + holidayOffCount;
      break;
    case 'sundays_and_half_saturdays':
      // Nghỉ tất cả CN + 2 ngày Thứ 7
      offDays = sundaysCount + 2 + holidayOffCount;
      break;
    case 'custom':
      return 24;
    default:
      offDays = sundaysCount + holidayOffCount;
  }

  return Math.max(1, daysInMonth - offDays);
};

/**
 * Lấy số ngày công chuẩn áp dụng cho một tháng cụ thể từ SystemSettings
 */
export const getStandardWorkDaysForMonth = (
  settings: SystemSettings,
  year?: number,
  month?: number
): number => {
  const y = year ?? settings.currentYear;
  const m = month ?? settings.currentMonth;
  const key = `${y}-${String(m).padStart(2, '0')}`;

  // 1. Kiểm tra cấu hình số ngày cụ thể đã được setup thủ công cho tháng
  if (settings.monthlyStandardConfigs && settings.monthlyStandardConfigs[key] !== undefined && settings.monthlyStandardConfigs[key] > 0) {
    return settings.monthlyStandardConfigs[key];
  }

  // 2. Kiểm tra chính sách nghỉ cố định được chọn riêng cho tháng đó
  const monthPolicy = settings.monthlyPolicyConfigs?.[key] || settings.fixedDaysOffPolicy || 'sundays_and_half_saturdays';
  
  if (monthPolicy !== 'custom') {
    return calculateStandardDaysFromPolicy(y, m, monthPolicy, settings.holidays);
  }

  return settings.standardWorkDays || 24;
};

/**
 * Biểu thuế TNCN lũy tiến từng phần 5 bậc theo quy định cải cách hiện hành
 */
export const DEFAULT_TAX_BRACKETS: TaxBracket[] = [
  { bracket: 1, name: 'Bậc 1', min: 0, max: 10000000, rate: 0.05, description: 'Đến 10 triệu đ (5%)' },
  { bracket: 2, name: 'Bậc 2', min: 10000000, max: 30000000, rate: 0.10, description: 'Trên 10 đến 30 triệu đ (10%)' },
  { bracket: 3, name: 'Bậc 3', min: 30000000, max: 60000000, rate: 0.20, description: 'Trên 30 đến 60 triệu đ (20%)' },
  { bracket: 4, name: 'Bậc 4', min: 60000000, max: 100000000, rate: 0.30, description: 'Trên 60 đến 100 triệu đ (30%)' },
  { bracket: 5, name: 'Bậc 5', min: 100000000, max: null, rate: 0.35, description: 'Trên 100 triệu đ (35%)' },
];

export const PROPOSED_5_TAX_BRACKETS: TaxBracket[] = DEFAULT_TAX_BRACKETS;

/**
 * Biểu thuế TNCN 7 bậc cũ (theo Thông tư 111/2013/TT-BTC) để người dùng có thể đối chiếu hoặc tùy chọn
 */
export const TRADITIONAL_7_TAX_BRACKETS: TaxBracket[] = [
  { bracket: 1, name: 'Bậc 1', min: 0, max: 5000000, rate: 0.05, description: 'Đến 5 triệu đ (5%)' },
  { bracket: 2, name: 'Bậc 2', min: 5000000, max: 10000000, rate: 0.10, description: 'Trên 5 đến 10 triệu đ (10%)' },
  { bracket: 3, name: 'Bậc 3', min: 10000000, max: 18000000, rate: 0.15, description: 'Trên 10 đến 18 triệu đ (15%)' },
  { bracket: 4, name: 'Bậc 4', min: 18000000, max: 32000000, rate: 0.20, description: 'Trên 18 đến 32 triệu đ (20%)' },
  { bracket: 5, name: 'Bậc 5', min: 32000000, max: 52000000, rate: 0.25, description: 'Trên 32 đến 52 triệu đ (25%)' },
  { bracket: 6, name: 'Bậc 6', min: 52000000, max: 80000000, rate: 0.30, description: 'Trên 52 đến 80 triệu đ (30%)' },
  { bracket: 7, name: 'Bậc 7', min: 80000000, max: null, rate: 0.35, description: 'Trên 80 triệu đ (35%)' },
];

export const TAX_BRACKETS = DEFAULT_TAX_BRACKETS;

/**
 * Thiết lập mặc định về các chế độ lương & thu nhập miễn thuế TNCN theo quy định hiện hành
 * - Biểu thuế 5 bậc, Giảm trừ bản thân 15.500.000 đ, Người phụ thuộc 6.200.000 đ
 * - Mức ăn ca chuyển từ 720.000/730.000 đ thành 1.200.000 đ/tháng
 * - Thu nhập tăng ca bị tính thuế TNCN: phần vượt 40 giờ/tháng và 200 giờ/năm
 */
export const DEFAULT_TAX_EXEMPTION_RULES: TaxExemptionRules = {
  otExemptMode: 'differential_only', // Chỉ miễn phần chênh lệch cao hơn đơn giá ngày thường cho số giờ trong trần
  otCustomExemptRate: 50,
  otMonthlyHoursCap: 40, // Trần làm thêm 40 giờ/tháng theo Bộ luật Lao động 2019
  otYearlyHoursCap: 200, // Trần làm thêm 200 giờ/năm theo Bộ luật Lao động 2019
  otCapExceededTaxable: true, // Thu nhập tăng ca bị tính thuế TNCN: phần vượt 40 giờ/tháng và 200 giờ/năm
  mealExemptMode: 'capped', // Có mức trần tiền mặt
  mealExemptMonthlyCap: 1200000, // Chuyển từ 720.000/730.000 thành 1.200.000 đ/tháng
  uniformExemptMode: 'capped', // Tối đa 5,000,000 đ/năm (~ 416,667 đ/tháng)
  uniformExemptMonthlyCap: 416667,
  phoneExemptMode: 'company_policy', // Miễn thuế theo quy chế khoán chi công ty
  phoneExemptMonthlyCap: 500000,
  travelExemptMode: 'company_policy', // Miễn thuế theo quy chế công tác phí
  travelExemptMonthlyCap: 1000000,
  legalNote: 'Căn cứ Luật Thuế TNCN (Biểu thuế 5 bậc, giảm trừ 15.5tr/6.2tr), TT 111/2013/TT-BTC, BLLĐ 2019 (Trần OT 40h/tháng, 200h/năm) và mức ăn ca tối đa 1.200.000 đ/tháng'
};

/**
 * Lấy tổng số giờ làm thêm lũy kế của nhân viên từ các tháng trước trong cùng năm
 */
export const getPriorYearOtHours = (
  employeeId: string,
  year: number,
  month: number,
  allTimekeepings?: TimekeepingRecord[]
): number => {
  if (!allTimekeepings || allTimekeepings.length === 0) return 0;
  let totalPriorHours = 0;

  allTimekeepings.forEach(tk => {
    if (tk.employeeId !== employeeId) return;

    let tkYear = tk.year;
    let tkMonth: number | undefined;
    if (tk.month) {
      const parts = String(tk.month).split('-');
      if (parts.length >= 2) {
        tkYear = parseInt(parts[0], 10);
        tkMonth = parseInt(parts[1], 10);
      }
    }

    if (tkYear === year && tkMonth !== undefined && tkMonth < month) {
      const hNormal = tk.totalOtNormalHours || 0;
      const hWeekend = tk.totalOtWeekendHours || 0;
      const hHoliday = tk.totalOtHolidayHours || 0;
      totalPriorHours += (hNormal + hWeekend + hHoliday);
    }
  });

  return totalPriorHours;
};

/**
 * Tính lại tổng hợp ngày công và OT cho một bản ghi chấm công
 */
export const recalculateTimekeepingSummary = (tk: TimekeepingRecord): TimekeepingRecord => {
  let actualWorkDays = 0;
  let paidLeaveDays = 0;
  let holidayDays = 0;
  let unpaidLeaveDays = 0;
  let insuranceLeaveDays = 0;
  let totalOtNormalHours = 0;
  let totalOtWeekendHours = 0;
  let totalOtHolidayHours = 0;
  let totalMeals = 0;
  let totalMealsLunch = 0;
  let totalMealsAfternoon = 0;
  let totalMealsDinner = 0;
  let totalActualWorkHours = 0;

  Object.values(tk.days || {}).forEach(day => {
    const sym = day.symbol;
    if (sym === 'X') {
      actualWorkDays += 1;
    } else if (sym === 'X/2') {
      actualWorkDays += 0.5;
    } else if (sym === 'P') {
      paidLeaveDays += 1;
    } else if (sym === 'L') {
      holidayDays += 1;
    } else if (sym === 'CT') {
      actualWorkDays += 1;
    } else if (sym === 'O' || sym === 'TS') {
      insuranceLeaveDays += 1;
    } else if (sym === 'Ro' || sym === 'K') {
      unpaidLeaveDays += 1;
    }

    const regHours = day.hours !== undefined ? day.hours : (sym === 'X' ? 8 : sym === 'X/2' ? 4 : (sym === 'CT' ? 8 : 0));
    totalActualWorkHours += regHours;

    totalOtNormalHours += day.otNormalHours || 0;
    totalOtWeekendHours += day.otWeekendHours || 0;
    totalOtHolidayHours += day.otHolidayHours || 0;

    // Tính số bữa ăn trong ngày theo Trưa / Chiều / Tối
    let dayMeals = 0;
    if (day.mealLunch !== undefined || day.mealAfternoon !== undefined || day.mealDinner !== undefined) {
      if (day.mealLunch) {
        dayMeals += 1;
        totalMealsLunch += 1;
      }
      if (day.mealAfternoon) {
        dayMeals += 1;
        totalMealsAfternoon += 1;
      }
      if (day.mealDinner) {
        dayMeals += 1;
        totalMealsDinner += 1;
      }
    } else if (day.mealEaten || day.hadMeal) {
      dayMeals += 1;
      totalMealsLunch += 1;
    }
    totalMeals += dayMeals;
  });

  return {
    ...tk,
    actualWorkDays,
    paidLeaveDays,
    holidayDays,
    unpaidLeaveDays,
    insuranceLeaveDays,
    totalPaidDays: actualWorkDays + paidLeaveDays + holidayDays,
    totalOtNormalHours,
    totalOtWeekendHours,
    totalOtHolidayHours,
    totalMeals,
    totalMealsLunch,
    totalMealsAfternoon,
    totalMealsDinner,
    totalActualWorkHours
  };
};

export interface BracketTaxResult {
  bracket: number;
  name: string;
  min: number;
  max: number | null;
  rate: number;
  taxableInBracket: number;
  taxAmount: number;
}

/**
 * Tính chi tiết số thuế rơi vào từng bậc của biểu lũy tiến từng phần
 */
export const calculateTaxBreakdown = (
  assessableIncome: number,
  brackets?: TaxBracket[]
): { totalTax: number; brackets: BracketTaxResult[]; highestBracket: number } => {
  if (assessableIncome <= 0) {
    return { totalTax: 0, brackets: [], highestBracket: 0 };
  }

  const activeBrackets = (brackets && brackets.length > 0) ? brackets : DEFAULT_TAX_BRACKETS;
  const sorted = [...activeBrackets].sort((a, b) => a.min - b.min);
  let totalTax = 0;
  let highestBracket = 0;
  const breakdown: BracketTaxResult[] = [];

  for (const b of sorted) {
    const rateDecimal = b.rate > 1 ? b.rate / 100 : b.rate;
    const upper = (b.max === null || b.max === undefined || b.max === Infinity || b.max <= 0) ? Infinity : b.max;
    let taxableInBracket = 0;
    let taxAmount = 0;

    if (assessableIncome > b.min) {
      taxableInBracket = Math.min(assessableIncome, upper) - b.min;
      if (taxableInBracket > 0) {
        taxAmount = Math.round(taxableInBracket * rateDecimal);
        totalTax += taxAmount;
        highestBracket = Math.max(highestBracket, b.bracket);
      }
    }

    breakdown.push({
      bracket: b.bracket,
      name: b.name,
      min: b.min,
      max: b.max,
      rate: rateDecimal,
      taxableInBracket,
      taxAmount
    });
  }

  return { totalTax: Math.round(totalTax), brackets: breakdown, highestBracket };
};

/**
 * Tính thuế TNCN theo biểu thuế lũy tiến từng phần (tự động theo cấu hình hệ thống hoặc mặc định 7 bậc)
 */
export const calculatePersonalIncomeTax = (
  assessableIncome: number,
  brackets?: TaxBracket[]
): number => {
  if (assessableIncome <= 0) return 0;
  return calculateTaxBreakdown(assessableIncome, brackets).totalTax;
};

/**
 * Tính chi tiết bảng thanh toán lương cho một nhân viên trong tháng
 */
export const calculateEmployeePayroll = (
  employee: Employee,
  arg2: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any,
  arg7?: any,
  arg8?: any,
  arg9?: any,
  arg10?: any
): PayrollRecord => {
  // Support both (employee, settings, timekeeping, ...) and (employee, timekeeping, insurance, meal, allowances, dependents, settings, advanceAmount, otherDeductionAmount, allTimekeepings)
  let settings: SystemSettings;
  let timekeeping: TimekeepingRecord | undefined;
  let dependents: Dependent[] = [];
  let insurance: InsuranceRecord | undefined;
  let mealReg: MealRegistration | undefined;
  let allowances: SpecialAllowance[] = [];
  let advanceAmount = 0;
  let otherDeductionAmount = 0;
  let allTimekeepings: TimekeepingRecord[] | undefined;

  if (arg2 && arg2.companyName) {
    // Call style: (employee, settings, timekeeping, dependents, insurance, mealReg, allowances, advanceAmount, otherDeductionAmount, allTimekeepings)
    settings = arg2;
    timekeeping = arg3;
    dependents = arg4 || [];
    insurance = arg5;
    mealReg = arg6;
    allowances = arg7 || [];
    advanceAmount = arg8 || 0;
    otherDeductionAmount = arg9 || 0;
    allTimekeepings = arg10;
  } else {
    // Call style: (employee, timekeeping, insurance, mealReg, allowances, dependents, settings, advanceAmount, otherDeductionAmount, allTimekeepings)
    timekeeping = arg2;
    insurance = arg3;
    mealReg = arg4;
    allowances = arg5 || [];
    dependents = arg6 || [];
    settings = arg7;
    advanceAmount = arg8 || 0;
    otherDeductionAmount = arg9 || 0;
    allTimekeepings = arg10;
  }

  const parsedMonth = typeof timekeeping?.month === 'number' 
    ? timekeeping.month 
    : (timekeeping?.month ? parseInt(String(timekeeping.month).split('-')[1] || '9', 10) : settings?.currentMonth || 9);
  const parsedYear = timekeeping?.year || (timekeeping?.month ? parseInt(String(timekeeping.month).split('-')[0] || '2026', 10) : settings?.currentYear || 2026);

  const standardDays = getStandardWorkDaysForMonth(settings, parsedYear, parsedMonth);
  const standardHours = settings?.standardWorkHoursPerDay || 8;
  const actualPaidDays = timekeeping?.totalPaidDays ?? (timekeeping ? (timekeeping.actualWorkDays + timekeeping.paidLeaveDays + timekeeping.holidayDays) : standardDays);

  // Tính tổng số giờ làm việc thực tế (giờ làm việc chính)
  let actualWorkHours = timekeeping?.totalActualWorkHours;
  if (actualWorkHours === undefined) {
    if (timekeeping?.days) {
      actualWorkHours = 0;
      Object.values(timekeeping.days).forEach(day => {
        const sym = day.symbol;
        const h = day.hours !== undefined ? day.hours : (sym === 'X' ? standardHours : (sym === 'X/2' ? standardHours / 2 : (sym === 'CT' ? standardHours : 0)));
        actualWorkHours! += h;
      });
    } else {
      actualWorkHours = actualPaidDays * standardHours;
    }
  }

  // 1. Tính mức lương theo ngày và giờ
  const dailyRate = employee.salaryBasis === 'daily'
    ? employee.baseSalary
    : (standardDays > 0 ? (employee.baseSalary / standardDays) : 0);
  const standardHourlyRate = dailyRate / (standardHours || 8);
  const appliedHourlyRate = (employee.salaryBasis === 'hourly' && employee.hourlyRate && employee.hourlyRate > 0)
    ? employee.hourlyRate
    : (employee.salaryBasis === 'hourly' ? (employee.baseSalary > 0 ? employee.baseSalary : standardHourlyRate) : standardHourlyRate);

  // 2. Tính lương chính theo công thức chuẩn:
  let mainSalary = 0;
  if (employee.salaryBasis === 'hourly') {
    mainSalary = Math.round(appliedHourlyRate * actualWorkHours);
  } else if (employee.salaryBasis === 'daily') {
    mainSalary = Math.round(employee.baseSalary * actualPaidDays);
  } else if (employee.salaryBasis === 'monthly') {
    mainSalary = Math.round((employee.baseSalary / (standardDays || 1)) * actualPaidDays);
  } else if (employee.salaryBasis === 'percent') {
    const percent = (employee.salaryPercent ?? 100) / 100;
    mainSalary = Math.round(((employee.baseSalary * percent) / (standardDays || 1)) * actualPaidDays);
  } else {
    mainSalary = Math.round((employee.baseSalary / (standardDays || 1)) * actualPaidDays);
  }
  
  // 3. Tiền làm thêm giờ (OT) & Quy định miễn thuế:
  // "Thu nhập tăng ca bị tính thuế TNCN: phần vượt 40 giờ/tháng và 200 giờ/năm"
  const otNormalHours = timekeeping?.totalOtNormalHours || 0;
  const otWeekendHours = timekeeping?.totalOtWeekendHours || 0;
  const otHolidayHours = timekeeping?.totalOtHolidayHours || 0;
  const otHoursTotal = otNormalHours + otWeekendHours + otHolidayHours;

  const otRules: TaxExemptionRules = settings?.taxExemptionRules || DEFAULT_TAX_EXEMPTION_RULES;

  const otBaseHourlyRate = appliedHourlyRate;
  const otWeekdayRate = settings?.otWeekdayRate ?? 1.5;
  const otWeekendRate = settings?.otWeekendRate ?? 2.0;
  const otHolidayRate = settings?.otHolidayRate ?? 3.0;

  const otPayWeekdayTotal = otNormalHours * otBaseHourlyRate * otWeekdayRate;
  const otPayWeekendTotal = otWeekendHours * otBaseHourlyRate * otWeekendRate;
  const otPayHolidayTotal = otHolidayHours * otBaseHourlyRate * otHolidayRate;
  const totalOtPay = Math.round(otPayWeekdayTotal + otPayWeekendTotal + otPayHolidayTotal);

  // Khống chế trần làm thêm giờ: 40 giờ/tháng & 200 giờ/năm
  const monthlyHoursCap = otRules.otMonthlyHoursCap ?? 40;
  const yearlyHoursCap = otRules.otYearlyHoursCap ?? 200;
  const priorYearOtHours = getPriorYearOtHours(employee.id, parsedYear, parsedMonth, allTimekeepings);
  const remainingYearlyQuota = Math.max(0, yearlyHoursCap - priorYearOtHours);

  // Số giờ làm thêm trong hạn mức (eligible) được xét ưu đãi thuế
  const enforceCaps = otRules.otCapExceededTaxable !== false;
  const otHoursEligible = enforceCaps
    ? Math.max(0, Math.min(otHoursTotal, monthlyHoursCap, remainingYearlyQuota))
    : otHoursTotal;
  const otHoursExcess = Math.max(0, otHoursTotal - otHoursEligible);

  let otPayTaxable = 0;
  let otPayTaxExempt = 0;

  if (otHoursTotal === 0) {
    otPayTaxable = 0;
    otPayTaxExempt = 0;
  } else if (otRules.otExemptMode === 'fully_taxable') {
    otPayTaxable = totalOtPay;
    otPayTaxExempt = 0;
  } else {
    // Tỷ lệ giờ trong hạn mức được miễn thuế
    const eligibleRatio = otHoursTotal > 0 ? (otHoursEligible / otHoursTotal) : 1;
    const eligibleNormal = otNormalHours * eligibleRatio;
    const eligibleWeekend = otWeekendHours * eligibleRatio;
    const eligibleHoliday = otHolidayHours * eligibleRatio;

    if (otRules.otExemptMode === 'differential_only') {
      // Chỉ miễn phần chênh lệch cao hơn đơn giá ngày thường cho SỐ GIỜ TRONG HẠN MỨC (<=40h/tháng và <=200h/năm).
      // Phần làm thêm vượt trần (otHoursExcess) bị tính thuế TNCN 100% (cả lương giờ gốc và tiền vượt mức).
      const exemptDifferential = 
        eligibleNormal * otBaseHourlyRate * (otWeekdayRate - 1.0) +
        eligibleWeekend * otBaseHourlyRate * (otWeekendRate - 1.0) +
        eligibleHoliday * otBaseHourlyRate * (otHolidayRate - 1.0);

      otPayTaxExempt = Math.round(exemptDifferential);
      otPayTaxable = Math.max(0, totalOtPay - otPayTaxExempt);
    } else if (otRules.otExemptMode === 'fully_exempt') {
      // Miễn thuế 100% cho số giờ trong hạn mức, phần vượt trần bị tính thuế toàn bộ
      const eligiblePay = 
        eligibleNormal * otBaseHourlyRate * otWeekdayRate +
        eligibleWeekend * otBaseHourlyRate * otWeekendRate +
        eligibleHoliday * otBaseHourlyRate * otHolidayRate;

      otPayTaxExempt = Math.round(eligiblePay);
      otPayTaxable = Math.max(0, totalOtPay - otPayTaxExempt);
    } else if (otRules.otExemptMode === 'custom_rate') {
      const customRate = (otRules.otCustomExemptRate ?? 50) / 100;
      const eligiblePay = 
        eligibleNormal * otBaseHourlyRate * otWeekdayRate +
        eligibleWeekend * otBaseHourlyRate * otWeekendRate +
        eligibleHoliday * otBaseHourlyRate * otHolidayRate;

      otPayTaxExempt = Math.round(eligiblePay * customRate);
      otPayTaxable = Math.max(0, totalOtPay - otPayTaxExempt);
    } else {
      const exemptDifferential = 
        eligibleNormal * otBaseHourlyRate * (otWeekdayRate - 1.0) +
        eligibleWeekend * otBaseHourlyRate * (otWeekendRate - 1.0) +
        eligibleHoliday * otBaseHourlyRate * (otHolidayRate - 1.0);

      otPayTaxExempt = Math.round(exemptDifferential);
      otPayTaxable = Math.max(0, totalOtPay - otPayTaxExempt);
    }
  }

  // 4. Phụ cấp đặc thù & Tách biệt Chịu thuế / Miễn thuế theo quy định
  let taxableAllowances = 0;
  let taxExemptAllowances = 0;
  
  allowances.forEach(alw => {
    const nameLower = (alw.name || '').toLowerCase();
    const isUniform = alw.allowanceType === 'uniform' || nameLower.includes('trang phục');
    const isPhone = alw.allowanceType === 'phone' || nameLower.includes('điện thoại') || nameLower.includes('liên lạc');
    const isTravel = alw.allowanceType === 'travel_gas' || nameLower.includes('xăng') || nameLower.includes('đi lại') || nameLower.includes('công tác');

    if (isUniform) {
      if (otRules.uniformExemptMode === 'fully_exempt') {
        taxExemptAllowances += alw.amount;
      } else if (otRules.uniformExemptMode === 'fully_taxable') {
        taxableAllowances += alw.amount;
      } else {
        const cap = otRules.uniformExemptMonthlyCap ?? 416667;
        const exemptPart = Math.min(alw.amount, cap);
        const taxablePart = Math.max(0, alw.amount - cap);
        taxExemptAllowances += exemptPart;
        taxableAllowances += taxablePart;
      }
    } else if (isPhone) {
      if (otRules.phoneExemptMode === 'fully_taxable') {
        taxableAllowances += alw.amount;
      } else if (otRules.phoneExemptMode === 'capped') {
        const cap = otRules.phoneExemptMonthlyCap ?? 500000;
        const exemptPart = Math.min(alw.amount, cap);
        const taxablePart = Math.max(0, alw.amount - cap);
        taxExemptAllowances += exemptPart;
        taxableAllowances += taxablePart;
      } else {
        if (alw.isTaxable) {
          taxableAllowances += alw.amount;
        } else {
          taxExemptAllowances += alw.amount;
        }
      }
    } else if (isTravel) {
      if (otRules.travelExemptMode === 'fully_taxable') {
        taxableAllowances += alw.amount;
      } else if (otRules.travelExemptMode === 'capped') {
        const cap = otRules.travelExemptMonthlyCap ?? 1000000;
        const exemptPart = Math.min(alw.amount, cap);
        const taxablePart = Math.max(0, alw.amount - cap);
        taxExemptAllowances += exemptPart;
        taxableAllowances += taxablePart;
      } else {
        if (alw.isTaxable) {
          taxableAllowances += alw.amount;
        } else {
          taxExemptAllowances += alw.amount;
        }
      }
    } else {
      if (alw.isTaxable) {
        taxableAllowances += alw.amount;
      } else {
        taxExemptAllowances += alw.amount;
      }
    }
  });
  
  // 5. Tiền ăn ca / ăn trưa: Mức trần chuyển từ 720.000/730.000 thành 1.200.000 đ/tháng
  let mealAllowance = 0;
  let mealDeduction = 0;
  const mealPlan = mealReg?.planType || 'none';
  
  if (mealPlan === 'cash') {
    const flatAmount = mealReg?.monthlyFlatAmount ?? (settings?.monthlyMealFlatRate || 1200000);
    mealAllowance = flatAmount;
    
    if (otRules.mealExemptMode === 'fully_exempt') {
      taxExemptAllowances += mealAllowance;
    } else if (otRules.mealExemptMode === 'fully_taxable') {
      taxableAllowances += mealAllowance;
    } else {
      // Capped: Mức tối đa miễn thuế theo quy định chuyển thành 1,200,000 đ/tháng
      const maxExempt = otRules.mealExemptMonthlyCap ?? (settings?.monthlyMealFlatRate || 1200000);
      if (mealAllowance <= maxExempt) {
        taxExemptAllowances += mealAllowance;
      } else {
        taxExemptAllowances += maxExempt;
        taxableAllowances += (mealAllowance - maxExempt);
      }
    }
  } else if (mealPlan === 'registered') {
    // Ăn tại bếp: miễn thuế toàn bộ bữa ăn cung cấp trực tiếp
    const mealPrice = mealReg?.customRatePerMeal ?? settings.standardMealPerDay;
    const mealsCount = timekeeping?.totalMeals || 0;
    const mealCost = mealsCount * mealPrice;
  }
  
  // 6. Tổng thu nhập (Gross Income)
  const grossIncome = mainSalary + totalOtPay + taxableAllowances + taxExemptAllowances;
  
  // 7. Bảo hiểm xã hội
  let insuranceSalary = 0;
  let socialInsuranceEmp = 0;
  let healthInsuranceEmp = 0;
  let unempInsuranceEmp = 0;
  let totalInsuranceEmp = 0;
  
  let socialInsuranceEmployer = 0;
  let healthInsuranceEmployer = 0;
  let unempInsuranceEmployer = 0;
  let tradeUnionEmployer = 0;
  let totalInsuranceEmployer = 0;
  
  if (insurance && insurance.isParticipating) {
    insuranceSalary = insurance.insuranceSalary || employee.baseSalary;
    
    const socRateEmp = (insurance.customSocialRate ?? settings.socialInsRateEmployee) / 100;
    const heaRateEmp = (insurance.customHealthRate ?? settings.healthInsRateEmployee) / 100;
    const uneRateEmp = (insurance.customUnempRate ?? settings.unemploymentInsRateEmployee) / 100;
    
    socialInsuranceEmp = Math.round(insuranceSalary * socRateEmp);
    healthInsuranceEmp = Math.round(insuranceSalary * heaRateEmp);
    unempInsuranceEmp = Math.round(insuranceSalary * uneRateEmp);
    totalInsuranceEmp = socialInsuranceEmp + healthInsuranceEmp + unempInsuranceEmp;
    
    // Phía người sử dụng lao động
    const socRateEr = settings.socialInsRateEmployer / 100;
    const heaRateEr = settings.healthInsRateEmployer / 100;
    const uneRateEr = settings.unemploymentInsRateEmployer / 100;
    const unionRateEr = settings.tradeUnionRateEmployer / 100;
    
    socialInsuranceEmployer = Math.round(insuranceSalary * socRateEr);
    healthInsuranceEmployer = Math.round(insuranceSalary * heaRateEr);
    unempInsuranceEmployer = Math.round(insuranceSalary * uneRateEr);
    tradeUnionEmployer = Math.round(insuranceSalary * unionRateEr);
    totalInsuranceEmployer = socialInsuranceEmployer + healthInsuranceEmployer + unempInsuranceEmployer + tradeUnionEmployer;
  }
  
  // 8. Giảm trừ gia cảnh & Thuế TNCN (Bản thân 15.500.000, NPT 6.200.000)
  const currentMonthStr = timekeeping ? String(timekeeping.month) : `${settings?.currentYear || 2026}-${String(settings?.currentMonth || 9).padStart(2, '0')}`;
  const validDependents = dependents.filter(dep => {
    if (!dep.startDate) return true;
    if (dep.startDate > currentMonthStr) return false;
    if (dep.endDate && dep.endDate < currentMonthStr) return false;
    return true;
  });
  
  const dependentCount = validDependents.length;
  const personalDeduction = settings?.personalDeduction || 15500000;
  const dependentDeduction = dependentCount * (settings?.dependentDeduction || 6200000);
  
  // Thu nhập chịu thuế = Gross - Thu nhập miễn thuế
  // Thu nhập miễn thuế bao gồm: OT phần được miễn (otPayTaxExempt), phụ cấp miễn thuế (taxExemptAllowances)
  const taxableIncome = Math.max(0, grossIncome - otPayTaxExempt - taxExemptAllowances);
  
  // Các khoản giảm trừ tính thuế = Bản thân + Người phụ thuộc + BHXH cá nhân đóng
  const totalDeductionsForTax = personalDeduction + dependentDeduction + totalInsuranceEmp;
  
  // Thu nhập tính thuế
  const assessableIncome = Math.max(0, taxableIncome - totalDeductionsForTax);
  
  // Thuế TNCN (áp dụng theo biểu lũy tiến từng phần đã cấu hình - mặc định 5 bậc)
  const personalIncomeTax = calculatePersonalIncomeTax(assessableIncome, settings?.taxBrackets);
  
  // 9. Thực lĩnh (Net Salary)
  // Thực lĩnh = Gross - BHXH người lao động - Thuế TNCN - Tạm ứng - Khấu trừ khác
  const netSalary = Math.max(0, grossIncome - totalInsuranceEmp - personalIncomeTax - advanceAmount - mealDeduction - otherDeductionAmount);
  
  return {
    id: `pr-${employee.id}-${currentMonthStr}`,
    employeeId: employee.id,
    month: currentMonthStr,
    standardDays,
    actualPaidDays,
    actualWorkDays: timekeeping?.actualWorkDays ?? actualPaidDays,
    actualWorkHours,
    hourlyRateApplied: appliedHourlyRate,
    salaryBasis: employee.salaryBasis,

    baseSalary: employee.baseSalary,

    mainSalary,
    otPayTaxable,
    otPayTaxExempt,
    otHoursTotal,
    otHoursEligible,
    otHoursExcess,
    priorYearOtHours,
    taxableAllowances,
    taxExemptAllowances,
    mealAllowance,
    grossIncome,
    insuranceSalary,
    socialInsuranceEmp,
    healthInsuranceEmp,
    unempInsuranceEmp,
    totalInsuranceEmp,
    socialInsuranceEmployer,
    healthInsuranceEmployer,
    unempInsuranceEmployer,
    tradeUnionEmployer,
    totalInsuranceEmployer,
    personalDeduction,
    dependentCount,
    dependentDeduction,
    totalDeductionsForTax,
    taxableIncome,
    assessableIncome,
    personalIncomeTax,
    advancePayment: advanceAmount,
    mealDeduction,
    tradeUnionEmp: 0,
    otherDeductions: otherDeductionAmount,
    netSalary,
    paymentStatus: 'draft'
  };
};

/**
 * Định dạng tiền tệ Việt Nam (VNĐ)
 */
export const formatVND = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Định dạng số thông thường
 */
export const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
};

/**
 * Kiểm tra xem người lao động có làm việc và phát sinh công/lương trong tháng cụ thể hay không.
 * Nếu đã nghỉ việc, điều chuyển công tác, nghỉ thai sản sẽ không hiện thông tin các tháng không liên quan.
 * @param employee Hồ sơ nhân viên
 * @param month Tháng (1 - 12)
 * @param year Năm (vd: 2026)
 */
export const isEmployeeActiveInMonth = (
  employee: Employee,
  month: number,
  year: number
): boolean => {
  const targetMonthStr = `${year}-${String(month).padStart(2, '0')}`;

  // 1. Ngày vào làm: nếu chưa vào làm trong tháng này thì không hiển thị
  if (employee.startDate) {
    const startMonthStr = employee.startDate.slice(0, 7);
    if (targetMonthStr < startMonthStr) {
      return false;
    }
  }

  // 2. Trạng thái Thử việc
  if (employee.workStatus === 'probation') {
    if (employee.probationStartDate) {
      const probStartMonth = employee.probationStartDate.slice(0, 7);
      if (targetMonthStr < probStartMonth) {
        return false;
      }
    }
  }

  // 3. Trạng thái Đã nghỉ việc
  // Tháng nghỉ việc vẫn tính công/lương đến ngày nghỉ; các tháng sau khi nghỉ việc KHÔNG hiển thị
  if (employee.workStatus === 'resigned') {
    if (employee.resignationDate) {
      const resMonth = employee.resignationDate.slice(0, 7);
      if (targetMonthStr > resMonth) {
        return false;
      }
    } else {
      // Nếu trạng thái đã là resigned nhưng chưa nhập ngày, mặc định không hiển thị
      return false;
    }
  }

  // 4. Trạng thái Nghỉ thai sản
  // Không hiện thông tin người lao động trong các tháng nằm trong thời gian nghỉ thai sản (hưởng BHXH, không hưởng lương cty)
  if (employee.workStatus === 'maternity') {
    if (employee.maternityStartDate) {
      const matStartMonth = employee.maternityStartDate.slice(0, 7);
      const matEndMonth = employee.maternityEndDate ? employee.maternityEndDate.slice(0, 7) : '9999-12';
      if (targetMonthStr >= matStartMonth && targetMonthStr <= matEndMonth) {
        return false;
      }
    }
  }

  // 5. Trạng thái Điều chuyển công tác
  // Không hiện thông tin người lao động trong các tháng nằm trong thời gian điều chuyển công tác đi đơn vị khác
  if (employee.workStatus === 'transferred') {
    if (employee.transferStartDate) {
      const transStartMonth = employee.transferStartDate.slice(0, 7);
      const transEndMonth = employee.transferEndDate ? employee.transferEndDate.slice(0, 7) : '9999-12';
      if (targetMonthStr >= transStartMonth && targetMonthStr <= transEndMonth) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Trả về nhãn trạng thái và thông tin chi tiết thời gian đi kèm
 */
export const getEmployeeWorkStatusDetails = (employee: Employee): {
  label: string;
  details: string;
  colorClass: string;
} => {
  switch (employee.workStatus) {
    case 'probation': {
      let details = '';
      if (employee.probationStartDate && employee.probationEndDate) {
        details = `${employee.probationStartDate} đến ${employee.probationEndDate}`;
      } else if (employee.probationStartDate) {
        details = `Từ ${employee.probationStartDate}`;
      }
      return {
        label: 'Thử việc',
        details: details ? `(${details})` : '',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }
    case 'resigned': {
      let details = '';
      if (employee.resignationDate) {
        details = `Nghỉ ngày: ${employee.resignationDate}`;
      }
      return {
        label: 'Đã nghỉ việc',
        details: details ? `(${details})` : '',
        colorClass: 'bg-rose-100 text-rose-800 border-rose-300'
      };
    }
    case 'maternity': {
      let details = '';
      if (employee.maternityStartDate && employee.maternityEndDate) {
        details = `${employee.maternityStartDate} đến ${employee.maternityEndDate}`;
      } else if (employee.maternityStartDate) {
        details = `Từ ${employee.maternityStartDate}`;
      }
      return {
        label: 'Nghỉ thai sản',
        details: details ? `(${details})` : '',
        colorClass: 'bg-purple-100 text-purple-800 border-purple-300'
      };
    }
    case 'transferred': {
      let details = '';
      if (employee.transferStartDate && employee.transferEndDate) {
        details = `${employee.transferStartDate} đến ${employee.transferEndDate}`;
      } else if (employee.transferStartDate) {
        details = `Từ ${employee.transferStartDate}`;
      }
      if (employee.transferLocation) {
        details = details ? `${details} - Đến: ${employee.transferLocation}` : `Đến: ${employee.transferLocation}`;
      }
      return {
        label: 'Điều chuyển',
        details: details ? `(${details})` : '',
        colorClass: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    }
    case 'active':
    default:
      return {
        label: 'Chính thức',
        details: '',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
  }
};

