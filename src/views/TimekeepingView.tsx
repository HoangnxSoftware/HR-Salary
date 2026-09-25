import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Calendar,
  Download, 
  Sparkles, 
  Search, 
  Clock, 
  Utensils, 
  Edit3, 
  Check, 
  X, 
  FileSpreadsheet, 
  Moon, 
  Sun, 
  Sunrise, 
  Sunset, 
  Briefcase, 
  Layers, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Users, 
  Printer,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { 
  TimekeepingRecord, 
  Employee, 
  SystemSettings, 
  DayAttendance, 
  AttendanceSymbol, 
  WorkShift,
  MealRegistration
} from '../types';
import { exportTimekeepingToExcel } from '../utils/excelHelper';
import { recalculateTimekeepingSummary, isEmployeeActiveInMonth } from '../utils/payrollCalculator';
import { useAuthRole } from '../context/AuthRoleContext';
import { PrintTimekeepingModal } from '../components/PrintTimekeepingModal';
import { 
  WORK_SHIFTS, 
  SHIFT_MAP, 
  getShiftInfo, 
  calculateOtHours, 
  formatOtTimeRange, 
  isNightTimeOt, 
  getSuggestedOtRange 
} from '../utils/shiftHelper';

interface TimekeepingViewProps {
  timekeepings: TimekeepingRecord[];
  employees: Employee[];
  settings: SystemSettings;
  mealRegistrations?: MealRegistration[];
  onUpdateTimekeeping: (updated: TimekeepingRecord) => void;
  onBatchUpdateTimekeeping: (all: TimekeepingRecord[]) => void;
  onMonthChange?: (month: number, year: number) => void;
}

export const TimekeepingView: React.FC<TimekeepingViewProps> = ({
  timekeepings,
  employees,
  settings,
  mealRegistrations,
  onUpdateTimekeeping,
  onBatchUpdateTimekeeping,
  onMonthChange
}) => {
  const { canEditTimekeeping, canExportData } = useAuthRole();
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'ot_details' | 'meal_attendance'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterOnlyOt, setFilterOnlyOt] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Chọn tháng & năm để xem và cập nhật bảng chấm công
  const [selectedMonth, setSelectedMonth] = useState<number>(settings.currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(settings.currentYear);

  // Tự động đồng bộ nếu settings tháng/năm thay đổi từ ngoài
  useEffect(() => {
    setSelectedMonth(settings.currentMonth);
    setSelectedYear(settings.currentYear);
  }, [settings.currentMonth, settings.currentYear]);

  const year = selectedYear;
  const month = selectedMonth;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const isCurrentSystemMonth = selectedMonth === settings.currentMonth && selectedYear === settings.currentYear;
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleSelectMonth = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    if (onMonthChange) {
      onMonthChange(m, y);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      handleSelectMonth(12, selectedYear - 1);
    } else {
      handleSelectMonth(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      handleSelectMonth(1, selectedYear + 1);
    } else {
      handleSelectMonth(selectedMonth + 1, selectedYear);
    }
  };

  // Ngày được chọn để tích chọn ăn ca theo ngày (1..31)
  const [selectedMealDay, setSelectedMealDay] = useState<number>(() => {
    const today = new Date();
    if (today.getFullYear() === settings.currentYear && (today.getMonth() + 1) === settings.currentMonth) {
      return Math.min(today.getDate(), new Date(settings.currentYear, settings.currentMonth, 0).getDate());
    }
    return 1;
  });

  // Khi đổi tháng, kiểm tra ngày ăn ca được chọn không vượt quá số ngày của tháng
  useEffect(() => {
    if (selectedMealDay > daysInMonth) {
      setSelectedMealDay(daysInMonth);
    }
  }, [daysInMonth, selectedMealDay]);

  // Modal chỉnh sửa ô ngày công
  const [selectedDayModal, setSelectedDayModal] = useState<{
    employeeId: string;
    dayNumber: number;
    currentRecord: DayAttendance;
    hasOvertime: boolean;
  } | null>(null);

  // Modal phân ca hàng loạt cho nhiều nhân viên
  const [isBatchShiftModalOpen, setIsBatchShiftModalOpen] = useState(false);
  const [batchShiftConfig, setBatchShiftConfig] = useState<{
    shift: WorkShift;
    applyFor: 'all' | 'department';
    departmentId: string;
  }>({
    shift: 'ca_hanh_chinh',
    applyFor: 'all',
    departmentId: settings.departments[0]?.id || ''
  });

  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));

  // Helper: Tìm hoặc khởi tạo bảng chấm công chuẩn cho nhân viên theo tháng đang chọn
  const getEmployeeTimekeeping = (empId: string): TimekeepingRecord => {
    const found = timekeepings.find(t => 
      t.employeeId === empId && (
        String(t.month) === monthKey || 
        (String(t.month) === String(month) && (!t.year || t.year === year)) ||
        (!t.month && month === settings.currentMonth && year === settings.currentYear)
      )
    );
    if (found) return found;

    // Tự động khởi tạo cấu trúc chấm công chuẩn cho tháng được chọn nếu chưa có dữ liệu
    const emp = empMap.get(empId);
    const defaultShift: WorkShift = emp?.positionId === 'pos-cn' ? 'ca_1' : 'ca_hanh_chinh';
    const shiftHours = getShiftInfo(defaultShift).standardHours;
    const empMealReg = mealRegistrations?.find(m => m.employeeId === empId && (m.month === monthKey || !m.month));

    const days: Record<number, DayAttendance> = {};
    let actualWorkDays = 0;
    let holidayDays = 0;
    let totalMeals = 0;
    let totalMealsLunch = 0;
    let totalMealsAfternoon = 0;
    let totalMealsDinner = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isHol = settings.holidays.some(h => h.date === dateStr);
      const isSun = dayOfWeek === 0;
      const isSat = dayOfWeek === 6;

      let isOff = isSun;
      if (settings.fixedDaysOffPolicy === 'all_weekends' && isSat) {
        isOff = true;
      } else if (settings.fixedDaysOffPolicy === 'sundays_and_half_saturdays' && isSat && (d > 7 && d <= 14 || d > 21 && d <= 28)) {
        isOff = true;
      }

      let symbol: AttendanceSymbol = '';
      let hours = 0;
      let shiftVal: WorkShift | undefined = undefined;
      let hadMeal = false;
      let mLunch = false;
      let mAfternoon = false;
      let mDinner = false;

      if (isHol) {
        symbol = 'L';
        hours = 8;
        holidayDays++;
      } else if (isOff) {
        symbol = '';
        hours = 0;
      } else {
        symbol = 'X';
        hours = shiftHours;
        shiftVal = defaultShift;
        actualWorkDays += 1;
        mLunch = empMealReg?.registerLunch !== false;
        mAfternoon = !!empMealReg?.registerAfternoon;
        mDinner = !!empMealReg?.registerDinner;
        hadMeal = mLunch || mAfternoon || mDinner;
        if (mLunch) totalMealsLunch++;
        if (mAfternoon) totalMealsAfternoon++;
        if (mDinner) totalMealsDinner++;
        if (hadMeal) totalMeals++;
      }

      days[d] = {
        symbol,
        shift: shiftVal,
        hours,
        otNormalHours: 0,
        otWeekendHours: 0,
        otHolidayHours: 0,
        hadMeal,
        mealLunch: mLunch,
        mealAfternoon: mAfternoon,
        mealDinner: mDinner
      };
    }

    return {
      id: `tk-${empId}-${monthKey}`,
      employeeId: empId,
      year,
      month: monthKey,
      days,
      actualWorkDays,
      paidLeaveDays: 0,
      holidayDays,
      unpaidLeaveDays: 0,
      insuranceLeaveDays: 0,
      totalPaidDays: actualWorkDays + holidayDays,
      totalOtNormalHours: 0,
      totalOtWeekendHours: 0,
      totalOtHolidayHours: 0,
      totalMeals,
      totalMealsLunch,
      totalMealsAfternoon,
      totalMealsDinner
    };
  };

  // Helper check if day is Sunday / Saturday
  const isWeekendDay = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d.getDay() === 0; // Sunday
  };

  const isSaturday = (day: number) => {
    const d = new Date(year, month - 1, day);
    return d.getDay() === 6; // Saturday
  };

  const isHoliday = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return settings.holidays.some(h => h.date === dateStr);
  };

  // Filter employees
  const filteredEmployees = employees.filter(e => {
    // 0. Loại bỏ người lao động đã nghỉ việc, điều chuyển, thai sản ở các tháng không liên quan
    if (!isEmployeeActiveInMonth(e, month, year)) {
      return false;
    }

    const search = searchTerm.toLowerCase();
    const matchSearch = e.fullName.toLowerCase().includes(search) || e.employeeCode.toLowerCase().includes(search);
    const matchDep = filterDepartment === 'all' || e.departmentId === filterDepartment;
    
    // Filter by shift
    let matchShift = true;
    if (filterShift !== 'all') {
      const tk = getEmployeeTimekeeping(e.id);
      matchShift = Object.values(tk?.days || {}).some(d => d.shift === filterShift);
    }

    // Filter only OT
    let matchOt = true;
    if (filterOnlyOt) {
      const tk = getEmployeeTimekeeping(e.id);
      const otHours = (tk?.totalOtNormalHours || 0) + (tk?.totalOtWeekendHours || 0) + (tk?.totalOtHolidayHours || 0);
      matchOt = otHours > 0;
    }

    return matchSearch && matchDep && matchShift && matchOt;
  });

  // KPI summaries for selected month
  const activeMonthTimekeepings = employees
    .filter(e => isEmployeeActiveInMonth(e, month, year))
    .map(e => getEmployeeTimekeeping(e.id));

  const totalOtHoursMonth = activeMonthTimekeepings.reduce((sum, t) => sum + (t.totalOtNormalHours || 0) + (t.totalOtWeekendHours || 0) + (t.totalOtHolidayHours || 0), 0);
  const totalOtEmployees = activeMonthTimekeepings.filter(t => (t.totalOtNormalHours || 0) + (t.totalOtWeekendHours || 0) + (t.totalOtHolidayHours || 0) > 0).length;
  const totalMealsMonth = activeMonthTimekeepings.reduce((sum, t) => sum + (t.totalMeals || 0), 0);
  const totalNightShiftCount = activeMonthTimekeepings.reduce((sum, t) => {
    return sum + Object.values(t.days || {}).filter(d => d.shift === 'ca_3').length;
  }, 0);

  // Tự động chấm công nhanh cả tháng
  const handleAutoFillMonth = () => {
    const activeEmps = employees.filter(e => isEmployeeActiveInMonth(e, month, year));
    if (!confirm(`Bạn có chắc chắn muốn Tự động chấm công chuẩn cho toàn bộ ${activeEmps.length} nhân viên trong tháng ${month}/${year}? Các ngày trong tuần sẽ được gán ca và chấm 'X', Chủ nhật chấm nghỉ tuần, Ngày Lễ chấm 'L'.`)) return;

    const holidayDates = new Set(settings.holidays.map(h => h.date));

    const newRecords: TimekeepingRecord[] = activeEmps.map(emp => {
      const days: Record<number, DayAttendance> = {};
      const defaultShift: WorkShift = emp.positionId === 'pos-cn' ? 'ca_1' : 'ca_hanh_chinh';
      const shiftHours = getShiftInfo(defaultShift).standardHours;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const empMealReg = mealRegistrations?.find(m => m.employeeId === emp.id && (m.month === monthKey || !m.month));

        const regLunch = empMealReg?.registerLunch !== undefined ? empMealReg.registerLunch : true;
        const regAfternoon = empMealReg?.registerAfternoon ?? false;
        const regDinner = empMealReg?.registerDinner ?? false;

        if (holidayDates.has(dateStr)) {
          days[d] = { 
            symbol: 'L', 
            hours: 8, 
            shift: defaultShift, 
            otNormalHours: 0, 
            otWeekendHours: 0, 
            otHolidayHours: 0, 
            hadMeal: false,
            mealLunch: false,
            mealAfternoon: false,
            mealDinner: false
          };
        } else if (dayOfWeek === 0) {
          days[d] = { 
            symbol: '', 
            hours: 0, 
            otNormalHours: 0, 
            otWeekendHours: 0, 
            otHolidayHours: 0, 
            hadMeal: false,
            mealLunch: false,
            mealAfternoon: false,
            mealDinner: false
          };
        } else {
          days[d] = { 
            symbol: 'X', 
            hours: shiftHours, 
            shift: defaultShift,
            otNormalHours: 0, 
            otWeekendHours: 0, 
            otHolidayHours: 0, 
            hadMeal: regLunch || regAfternoon || regDinner,
            mealLunch: regLunch,
            mealAfternoon: regAfternoon,
            mealDinner: regDinner
          };
        }
      }

      const rawRecord: TimekeepingRecord = {
        id: `tk-${emp.id}-${monthKey}`,
        employeeId: emp.id,
        year,
        month: monthKey,
        days,
        actualWorkDays: 0,
        paidLeaveDays: 0,
        holidayDays: 0,
        unpaidLeaveDays: 0,
        insuranceLeaveDays: 0,
        totalPaidDays: 0,
        totalOtNormalHours: 0,
        totalOtWeekendHours: 0,
        totalOtHolidayHours: 0,
        totalMeals: 0
      };

      return recalculateTimekeepingSummary(rawRecord);
    });

    onBatchUpdateTimekeeping(newRecords);
  };

  // Mở modal chấm công cho một ô ngày
  const handleDayClick = (empId: string, day: number) => {
    if (!canEditTimekeeping) return;
    const tk = getEmployeeTimekeeping(empId);
    const dayData = tk.days[day] || {
      symbol: 'X',
      shift: 'ca_hanh_chinh',
      hours: 8,
      otNormalHours: 0,
      otWeekendHours: 0,
      otHolidayHours: 0,
      hadMeal: true,
      mealLunch: true,
      mealAfternoon: false,
      mealDinner: false
    };

    const empMealReg = mealRegistrations?.find(m => m.employeeId === empId && (m.month === monthKey || !m.month));
    const initLunch = dayData.mealLunch !== undefined ? dayData.mealLunch : (empMealReg?.registerLunch ?? dayData.hadMeal ?? true);
    const initAfternoon = dayData.mealAfternoon !== undefined ? dayData.mealAfternoon : (empMealReg?.registerAfternoon ?? false);
    const initDinner = dayData.mealDinner !== undefined ? dayData.mealDinner : (empMealReg?.registerDinner ?? false);

    const hasOt = (dayData.otNormalHours || 0) + (dayData.otWeekendHours || 0) + (dayData.otHolidayHours || 0) > 0 || !!dayData.otStartTime;

    setSelectedDayModal({
      employeeId: empId,
      dayNumber: day,
      currentRecord: { 
        ...dayData,
        shift: dayData.shift || 'ca_hanh_chinh',
        mealLunch: initLunch,
        mealAfternoon: initAfternoon,
        mealDinner: initDinner,
        hadMeal: initLunch || initAfternoon || initDinner
      },
      hasOvertime: hasOt
    });
  };

  // Cập nhật thời gian bắt đầu hoặc kết thúc làm thêm và tự động tính số giờ
  const handleOtTimeChange = (startTime?: string, endTime?: string) => {
    if (!selectedDayModal) return;
    const { dayNumber } = selectedDayModal;
    const isSun = isWeekendDay(dayNumber);
    const isHol = isHoliday(dayNumber);

    const calculatedHours = calculateOtHours(startTime, endTime);
    
    // Tự động phân loại số giờ OT vào nhóm ngày thường, CN hoặc ngày Lễ
    const otType = isHol ? 'holiday' : (isSun ? 'weekend' : 'normal');

    setSelectedDayModal({
      ...selectedDayModal,
      currentRecord: {
        ...selectedDayModal.currentRecord,
        otStartTime: startTime,
        otEndTime: endTime,
        otType,
        otNormalHours: otType === 'normal' ? calculatedHours : 0,
        otWeekendHours: otType === 'weekend' ? calculatedHours : 0,
        otHolidayHours: otType === 'holiday' ? calculatedHours : 0,
      }
    });
  };

  // Áp dụng gợi ý khung giờ làm thêm nhanh (+1.5h, +2h, +3h...)
  const handleApplySuggestedOt = (targetHours: number) => {
    if (!selectedDayModal) return;
    const shift = selectedDayModal.currentRecord.shift;
    const { start, end } = getSuggestedOtRange(shift, targetHours);
    handleOtTimeChange(start, end);
  };

  // Lưu ngày chấm công
  const handleSaveDay = () => {
    if (!selectedDayModal) return;
    const { employeeId, dayNumber, currentRecord, hasOvertime } = selectedDayModal;
    const existingTk = getEmployeeTimekeeping(employeeId);

    // Nếu không tích làm thêm giờ thì reset các trường OT
    const finalRecord: DayAttendance = {
      ...currentRecord,
      otStartTime: hasOvertime ? currentRecord.otStartTime : undefined,
      otEndTime: hasOvertime ? currentRecord.otEndTime : undefined,
      otReason: hasOvertime ? currentRecord.otReason : undefined,
      otNormalHours: hasOvertime ? (currentRecord.otNormalHours || 0) : 0,
      otWeekendHours: hasOvertime ? (currentRecord.otWeekendHours || 0) : 0,
      otHolidayHours: hasOvertime ? (currentRecord.otHolidayHours || 0) : 0,
    };

    const updatedDays = {
      ...existingTk.days,
      [dayNumber]: finalRecord
    };

    const updatedTk = recalculateTimekeepingSummary({
      ...existingTk,
      year,
      month: monthKey,
      days: updatedDays
    });

    onUpdateTimekeeping(updatedTk);
    setSelectedDayModal(null);
  };

  // Tích / bỏ chọn trực tiếp 1 bữa ăn (Trưa / Chiều / Tối) của nhân viên trong ngày
  const handleToggleDayMeal = (empId: string, day: number, mealKey: 'mealLunch' | 'mealAfternoon' | 'mealDinner') => {
    if (!canEditTimekeeping) return;
    const tk = getEmployeeTimekeeping(empId);

    const currentDay = tk.days[day] || {
      symbol: 'X',
      shift: 'ca_hanh_chinh',
      hours: 8,
      otNormalHours: 0,
      otWeekendHours: 0,
      otHolidayHours: 0,
      hadMeal: false
    };

    const newMealVal = !currentDay[mealKey];
    const nextLunch = mealKey === 'mealLunch' ? newMealVal : !!currentDay.mealLunch;
    const nextAfternoon = mealKey === 'mealAfternoon' ? newMealVal : !!currentDay.mealAfternoon;
    const nextDinner = mealKey === 'mealDinner' ? newMealVal : !!currentDay.mealDinner;

    const updatedDay: DayAttendance = {
      ...currentDay,
      [mealKey]: newMealVal,
      hadMeal: nextLunch || nextAfternoon || nextDinner
    };

    const updatedDays = {
      ...tk.days,
      [day]: updatedDay
    };

    const updatedTk = recalculateTimekeepingSummary({
      ...tk,
      year,
      month: monthKey,
      days: updatedDays
    });

    onUpdateTimekeeping(updatedTk);
  };

  // Đặt suất ăn nhanh cho 1 nhân viên trong ngày (Cả 3 bữa, chỉ trưa, theo ĐK NV, hoặc bỏ chọn)
  const handleQuickSetEmployeeDayMeal = (
    empId: string, 
    day: number, 
    action: 'all_3' | 'lunch_only' | 'by_reg' | 'clear'
  ) => {
    if (!canEditTimekeeping) return;
    const tk = getEmployeeTimekeeping(empId);

    const currentDay = tk.days[day] || {
      symbol: 'X',
      shift: 'ca_hanh_chinh',
      hours: 8,
      otNormalHours: 0,
      otWeekendHours: 0,
      otHolidayHours: 0,
      hadMeal: false
    };

    const empMealReg = mealRegistrations?.find(m => m.employeeId === empId && (m.month === monthKey || !m.month));

    let nextLunch = false;
    let nextAfternoon = false;
    let nextDinner = false;

    if (action === 'all_3') {
      nextLunch = true;
      nextAfternoon = true;
      nextDinner = true;
    } else if (action === 'lunch_only') {
      nextLunch = true;
      nextAfternoon = false;
      nextDinner = false;
    } else if (action === 'by_reg') {
      nextLunch = empMealReg?.registerLunch !== false;
      nextAfternoon = !!empMealReg?.registerAfternoon;
      nextDinner = !!empMealReg?.registerDinner;
    } else if (action === 'clear') {
      nextLunch = false;
      nextAfternoon = false;
      nextDinner = false;
    }

    const updatedDay: DayAttendance = {
      ...currentDay,
      mealLunch: nextLunch,
      mealAfternoon: nextAfternoon,
      mealDinner: nextDinner,
      hadMeal: nextLunch || nextAfternoon || nextDinner
    };

    const updatedDays = {
      ...tk.days,
      [day]: updatedDay
    };

    const updatedTk = recalculateTimekeepingSummary({
      ...tk,
      year,
      month: monthKey,
      days: updatedDays
    });

    onUpdateTimekeeping(updatedTk);
  };

  // Thao tác tích chọn hàng loạt cho toàn bộ nhân sự theo ngày được chọn
  const handleBatchSetMealsForSelectedDay = (
    action: 'by_registration' | 'lunch_all' | 'afternoon_all' | 'dinner_all' | 'all_three' | 'clear_all'
  ) => {
    if (!canEditTimekeeping) return;
    const activeEmps = employees.filter(e => isEmployeeActiveInMonth(e, month, year));

    const newTks = activeEmps.map(emp => {
      const tk = getEmployeeTimekeeping(emp.id);
      const currentDay = tk.days[selectedMealDay] || {
        symbol: 'X',
        shift: 'ca_hanh_chinh',
        hours: 8,
        otNormalHours: 0,
        otWeekendHours: 0,
        otHolidayHours: 0,
        hadMeal: false
      };

      const empMealReg = mealRegistrations?.find(m => m.employeeId === emp.id && (m.month === monthKey || !m.month));

      let nextLunch = !!currentDay.mealLunch;
      let nextAfternoon = !!currentDay.mealAfternoon;
      let nextDinner = !!currentDay.mealDinner;

      if (action === 'by_registration') {
        nextLunch = empMealReg?.registerLunch !== false;
        nextAfternoon = !!empMealReg?.registerAfternoon;
        nextDinner = !!empMealReg?.registerDinner;
      } else if (action === 'lunch_all') {
        nextLunch = true;
      } else if (action === 'afternoon_all') {
        nextAfternoon = true;
      } else if (action === 'dinner_all') {
        nextDinner = true;
      } else if (action === 'all_three') {
        nextLunch = true;
        nextAfternoon = true;
        nextDinner = true;
      } else if (action === 'clear_all') {
        nextLunch = false;
        nextAfternoon = false;
        nextDinner = false;
      }

      const updatedDay: DayAttendance = {
        ...currentDay,
        mealLunch: nextLunch,
        mealAfternoon: nextAfternoon,
        mealDinner: nextDinner,
        hadMeal: nextLunch || nextAfternoon || nextDinner
      };

      return recalculateTimekeepingSummary({
        ...tk,
        year,
        month: monthKey,
        days: {
          ...tk.days,
          [selectedMealDay]: updatedDay
        }
      });
    });

    onBatchUpdateTimekeeping(newTks);
  };

  // Áp dụng Đăng ký ăn ca tháng (Trưa / Chiều / Tối) cho TOÀN BỘ CẢ THÁNG
  const handleApplyMonthlyMealPlanToEntireMonth = () => {
    if (!canEditTimekeeping) return;
    const activeEmps = employees.filter(e => isEmployeeActiveInMonth(e, month, year));
    if (!confirm(`Bạn có chắc chắn muốn Tự động tích chọn suất ăn (Trưa/Chiều/Tối) theo Đăng ký tháng cho toàn bộ nhân viên vào các ngày đi làm (công X, X/2, CT) trong tháng ${month}/${year}?`)) return;

    const newTks = activeEmps.map(emp => {
      const tk = getEmployeeTimekeeping(emp.id);
      const empMealReg = mealRegistrations?.find(m => m.employeeId === emp.id && (m.month === monthKey || !m.month));
      const regLunch = empMealReg?.registerLunch !== false;
      const regAfternoon = !!empMealReg?.registerAfternoon;
      const regDinner = !!empMealReg?.registerDinner;
      const shouldHaveMeal = regLunch || regAfternoon || regDinner;

      const newDays: Record<number, DayAttendance> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const day = tk.days[d] || {
          symbol: '',
          shift: 'ca_hanh_chinh',
          hours: 0,
          otNormalHours: 0,
          otWeekendHours: 0,
          otHolidayHours: 0,
          hadMeal: false
        };

        const isWorkingDay = day.symbol === 'X' || day.symbol === 'X/2' || day.symbol === 'CT';

        if (isWorkingDay) {
          newDays[d] = {
            ...day,
            mealLunch: regLunch,
            mealAfternoon: regAfternoon,
            mealDinner: regDinner,
            hadMeal: shouldHaveMeal
          };
        } else {
          newDays[d] = {
            ...day,
            mealLunch: false,
            mealAfternoon: false,
            mealDinner: false,
            hadMeal: false
          };
        }
      }

      return recalculateTimekeepingSummary({
        ...tk,
        year,
        month: monthKey,
        days: newDays
      });
    });

    onBatchUpdateTimekeeping(newTks);
  };

  const handleApplyBatchShift = (e: React.FormEvent) => {
    e.preventDefault();
    const { shift, applyFor, departmentId } = batchShiftConfig;
    const targetEmps = employees
      .filter(e => isEmployeeActiveInMonth(e, month, year))
      .filter(emp => applyFor === 'all' || emp.departmentId === departmentId);

    const shiftHours = getShiftInfo(shift).standardHours;

    const updatedTimekeepings = targetEmps.map(emp => {
      const tk = getEmployeeTimekeeping(emp.id);
      const newDays: Record<number, DayAttendance> = { ...tk.days };
      for (let d = 1; d <= daysInMonth; d++) {
        if (newDays[d] && (newDays[d].symbol === 'X' || newDays[d].symbol === 'X/2')) {
          newDays[d] = {
            ...newDays[d],
            shift,
            hours: shiftHours
          };
        }
      }

      return recalculateTimekeepingSummary({
        ...tk,
        year,
        month: monthKey,
        days: newDays
      });
    });

    onBatchUpdateTimekeeping(updatedTimekeepings);
    setIsBatchShiftModalOpen(false);
  };

  const handleExportExcel = () => {
    const listToExport = filteredEmployees.map(e => getEmployeeTimekeeping(e.id));
    exportTimekeepingToExcel(listToExport, employees, year, month);
  };

  // Lấy danh sách các dòng chi tiết ca và OT cho Tab 2
  const overtimeLogs: Array<{
    id: string;
    employeeId: string;
    day: number;
    dateStr: string;
    dayOfWeekStr: string;
    symbol: AttendanceSymbol;
    shift: WorkShift;
    shiftInfo: any;
    otStartTime?: string;
    otEndTime?: string;
    otHours: number;
    otType: 'normal' | 'weekend' | 'holiday';
    isNightOt: boolean;
    otReason?: string;
    hadMeal?: boolean;
  }> = [];

  filteredEmployees.forEach(emp => {
    const tk = getEmployeeTimekeeping(emp.id);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = tk.days[d];
      if (!dayData) continue;

      const totalOt = (dayData.otNormalHours || 0) + (dayData.otWeekendHours || 0) + (dayData.otHolidayHours || 0);
      const isSun = isWeekendDay(d);
      const isHol = isHoliday(d);
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const dowStr = dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`;
      const shift = dayData.shift || 'ca_hanh_chinh';

      // Chỉ lấy nếu ngày đó có làm việc hoặc có làm thêm giờ
      if (dayData.symbol || totalOt > 0) {
        // Áp dụng bộ lọc
        if (searchTerm) {
          const matchSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
          if (!matchSearch) continue;
        }
        if (filterDepartment !== 'all' && emp.departmentId !== filterDepartment) continue;
        if (filterShift !== 'all' && shift !== filterShift) continue;
        if (filterOnlyOt && totalOt <= 0) continue;

        const otType = dayData.otHolidayHours > 0 || isHol ? 'holiday' : (dayData.otWeekendHours > 0 || isSun ? 'weekend' : 'normal');

        overtimeLogs.push({
          id: `${tk.employeeId}-${d}`,
          employeeId: tk.employeeId,
          day: d,
          dateStr: `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
          dayOfWeekStr: dowStr,
          symbol: dayData.symbol,
          shift,
          shiftInfo: getShiftInfo(shift),
          otStartTime: dayData.otStartTime,
          otEndTime: dayData.otEndTime,
          otHours: totalOt,
          otType,
          isNightOt: isNightTimeOt(dayData.otStartTime, dayData.otEndTime),
          otReason: dayData.otReason,
          hadMeal: dayData.hadMeal || dayData.mealEaten
        });
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* THANH ĐIỀU KHIỂN & CHỌN THÁNG CHẤM CÔNG */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                  Chọn Kỳ Chấm Công:
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Tháng {month}/{year}
                </span>
                {isCurrentSystemMonth ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Tháng hệ thống hiện tại</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMonthChange && onMonthChange(month, year)}
                    className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Đồng bộ kỳ công này làm tháng tính lương toàn hệ thống"
                  >
                    <span>⭐ Đặt làm tháng hệ thống</span>
                  </button>
                )}
                <span className="text-xs text-slate-400">
                  • Chuẩn: <strong>{settings.monthlyStandardConfigs?.[monthKey] || settings.standardWorkDays} ngày</strong>
                </span>
                <span className="text-xs text-slate-400">
                  • Nhân sự đi làm: <strong>{filteredEmployees.length} người</strong>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lựa chọn bất kỳ tháng nào trong năm để xem, chấm công, phân ca, tăng ca và cập nhật ăn ca độc lập cho từng kỳ.
              </p>
            </div>
          </div>

          {/* Bộ nút chuyển tháng nhanh & dropdown */}
          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center px-2 gap-1.5">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleSelectMonth(Number(e.target.value), selectedYear)}
                  className="bg-transparent text-xs font-black text-slate-900 border-none focus:outline-none cursor-pointer pr-1"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">/</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleSelectMonth(selectedMonth, Number(e.target.value))}
                  className="bg-transparent text-xs font-black text-slate-900 border-none focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {!isCurrentSystemMonth && (
              <button
                type="button"
                onClick={() => handleSelectMonth(settings.currentMonth, settings.currentYear)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Về Tháng {settings.currentMonth}/{settings.currentYear}
              </button>
            )}
          </div>
        </div>

        {/* Dải 12 nút tháng để chọn nhanh */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] shrink-0 mr-1">Các tháng {year}:</span>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const isSelected = m === selectedMonth;
              const isSystemCurrent = m === settings.currentMonth && year === settings.currentYear;
              const mKey = `${year}-${String(m).padStart(2, '0')}`;
              const hasRecordedData = timekeepings.some(t => 
                (String(t.month) === mKey || (Number(t.month) === m && (!t.year || t.year === year))) &&
                (t.actualWorkDays > 0 || (t.totalMeals || 0) > 0)
              );

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMonth(m, selectedYear)}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                      : isSystemCurrent
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>Tháng {m}</span>
                  {hasRecordedData && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} title="Đã có dữ liệu chấm công" />
                  )}
                  {isSystemCurrent && !isSelected && (
                    <span className="text-[9px] px-1 bg-emerald-200/80 text-emerald-900 rounded font-semibold">Hiện tại</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Bảng Chấm Công, Ca Làm Việc & Làm Thêm Giờ (OT)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Tháng {month}/{year} • Chuẩn: {settings.monthlyStandardConfigs?.[monthKey] || settings.standardWorkDays} ngày
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi chi tiết ca làm việc (Ca sáng, Ca chiều, Ca 1, Ca 2, Ca 3) và khoảng thời gian làm thêm giờ từ mấy giờ đến mấy giờ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditTimekeeping && (
            <>
              <button
                onClick={() => setIsBatchShiftModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="Phân ca làm việc hàng loạt theo phòng ban"
              >
                <Layers className="w-4 h-4 text-slate-600" />
                <span>Phân Ca Hàng Loạt</span>
              </button>

              <button
                onClick={handleAutoFillMonth}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Tự động điền ngày công cả tháng theo lịch"
              >
                <Sparkles className="w-4 h-4" />
                <span>Chấm Công Tự Động</span>
              </button>
            </>
          )}

          {canExportData && (
            <>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                title="In bảng chấm công và theo dõi tăng ca"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>In Bảng Chấm Công</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Bảng Công & OT (Excel)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Giờ Tăng Ca (OT)</span>
            <div className="text-2xl font-black font-mono text-orange-600 mt-1">
              {totalOtHoursMonth.toFixed(1)} <span className="text-sm font-normal text-slate-500">giờ</span>
            </div>
            <span className="text-slate-400 mt-0.5 block">{totalOtEmployees} người có làm thêm</span>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Lượt Đi Làm Ca Đêm (Ca 3)</span>
            <div className="text-2xl font-black font-mono text-purple-700 mt-1">
              {totalNightShiftCount} <span className="text-sm font-normal text-slate-500">lượt</span>
            </div>
            <span className="text-purple-600 mt-0.5 block font-medium">Khung giờ: 22:00 - 06:00</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Moon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Tổng Suất Ăn Ca & Cơm OT</span>
            <div className="text-2xl font-black font-mono text-teal-700 mt-1">
              {totalMealsMonth} <span className="text-sm font-normal text-slate-500">suất</span>
            </div>
            <span className="text-slate-400 mt-0.5 block">Phục vụ bếp ăn / tiền ăn ca</span>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">Các Ca Đang Vận Hành</span>
            <div className="text-base font-bold text-slate-800 mt-1">
              Sáng • Chiều • C1 • C2 • C3
            </div>
            <span className="text-emerald-600 mt-0.5 block font-medium">Hành chính (08:00 - 17:00)</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Switcher & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sub Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveSubTab('grid')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảng Chấm Công Tháng (Lưới 1 - 31)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('ot_details')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ot_details'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Nhật Ký Ca & Làm Thêm Giờ (Từ - Đến)</span>
              {totalOtHoursMonth > 0 && (
                <span className="px-1.5 py-0.2 bg-orange-100 text-orange-700 text-[10px] rounded-full font-bold">
                  {overtimeLogs.filter(l => l.otHours > 0).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('meal_attendance')}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'meal_attendance'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Utensils className="w-4 h-4 text-teal-600" />
              <span>Tích Chọn Ăn Ca (Trưa / Chiều / Tối)</span>
              {totalMealsMonth > 0 && (
                <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] rounded-full font-bold">
                  {totalMealsMonth} suất
                </span>
              )}
            </button>
          </div>

          {/* Quick info shift badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 text-[11px]">Ký hiệu ca:</span>
            {WORK_SHIFTS.map(s => (
              <span 
                key={s.id} 
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${s.badgeClass}`}
                title={`${s.name} (${s.timeRange})`}
              >
                {s.shortName}: {s.timeRange}
              </span>
            ))}
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên NV, mã NV..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">Tất cả phòng ban</option>
              {settings.departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">Tất cả ca làm việc</option>
              <option value="ca_hanh_chinh">Ca Hành Chính (08:00 - 17:00)</option>
              <option value="ca_sang">Ca Sáng (08:00 - 12:00)</option>
              <option value="ca_chieu">Ca Chiều (13:00 - 17:00)</option>
              <option value="ca_1">Ca 1 (06:00 - 14:00)</option>
              <option value="ca_2">Ca 2 (14:00 - 22:00)</option>
              <option value="ca_3">Ca 3 (22:00 - 06:00 - Ca Đêm)</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={filterOnlyOt}
                onChange={e => setFilterOnlyOt(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
              />
              <span>Chỉ hiển thị nhân viên có OT</span>
            </label>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY GRID VIEW */}
      {activeSubTab === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 sticky top-0">
                <tr>
                  <th className="p-2 border-r border-slate-200 text-left min-w-[70px] sticky left-0 bg-slate-100 z-10">Mã NV</th>
                  <th className="p-2 border-r border-slate-200 text-left min-w-[150px] sticky left-[70px] bg-slate-100 z-10">Họ và Tên</th>
                  
                  {/* Days 1..31 */}
                  {daysArray.map(d => {
                    const isSun = isWeekendDay(d);
                    const isSat = isSaturday(d);
                    const isHol = isHoliday(d);
                    return (
                      <th 
                        key={d} 
                        className={`p-1 min-w-[34px] max-w-[42px] border-r border-slate-200 ${
                          isHol ? 'bg-amber-100 text-amber-900 font-black' :
                          isSun ? 'bg-red-50 text-red-600 font-black' : 
                          isSat ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        <div className="text-[10px] leading-none">{d}</div>
                        <div className="text-[8px] font-normal opacity-80">
                          {isHol ? 'Lễ' : isSun ? 'CN' : isSat ? 'T7' : `T${new Date(year, month - 1, d).getDay() + 1}`}
                        </div>
                      </th>
                    );
                  })}

                  {/* Summary Totals */}
                  <th className="p-2 border-l-2 border-slate-300 bg-emerald-50 text-emerald-900 font-bold min-w-[45px]">Công (X)</th>
                  <th className="p-2 bg-blue-50 text-blue-900 font-bold min-w-[40px]">Phép</th>
                  <th className="p-2 bg-amber-50 text-amber-900 font-bold min-w-[40px]">Lễ</th>
                  <th className="p-2 bg-emerald-100 text-emerald-950 font-black min-w-[55px]">TỔNG HƯỞNG</th>
                  <th className="p-2 bg-orange-50 text-orange-900 font-bold min-w-[50px]">OT Thường</th>
                  <th className="p-2 bg-orange-50 text-orange-900 font-bold min-w-[45px]">OT CN</th>
                  <th className="p-2 bg-orange-50 text-orange-900 font-bold min-w-[45px]">OT Lễ</th>
                  <th className="p-2 bg-teal-50 text-teal-900 font-bold min-w-[45px]">Ăn Ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={daysArray.length + 10} className="p-8 text-center text-slate-400">
                      Không tìm thấy nhân viên nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const tk = timekeepings.find(t => t.employeeId === emp.id);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2 text-left font-mono font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-white z-10">
                          {emp.employeeCode}
                        </td>
                        <td className="p-2 text-left font-semibold text-slate-900 border-r border-slate-200 sticky left-[70px] bg-white z-10 whitespace-nowrap">
                          <div>{emp.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{depMap.get(emp.departmentId)}</div>
                        </td>

                        {/* Day Cells */}
                        {daysArray.map(d => {
                          const dayData = tk?.days[d];
                          const symbol = dayData?.symbol || '';
                          const shift = dayData?.shift;
                          const shiftInfo = shift ? getShiftInfo(shift) : null;
                          const totalOt = (dayData?.otNormalHours || 0) + (dayData?.otWeekendHours || 0) + (dayData?.otHolidayHours || 0);
                          const isSun = isWeekendDay(d);
                          const isHol = isHoliday(d);

                          const dayMealsCount = (dayData?.mealLunch ? 1 : 0) + (dayData?.mealAfternoon ? 1 : 0) + (dayData?.mealDinner ? 1 : 0) || (dayData?.hadMeal ? 1 : 0);
                          const dayMealsText = [];
                          if (dayData?.mealLunch) dayMealsText.push('Trưa');
                          if (dayData?.mealAfternoon) dayMealsText.push('Chiều');
                          if (dayData?.mealDinner) dayMealsText.push('Tối');
                          if (dayMealsText.length === 0 && dayData?.hadMeal) dayMealsText.push('Ăn ca');

                          return (
                            <td 
                              key={d} 
                              onClick={() => handleDayClick(emp.id, d)}
                              className={`p-0.5 border-r border-slate-100 cursor-pointer transition-all hover:ring-2 hover:ring-emerald-400 relative ${
                                isHol ? 'bg-amber-50/40' : isSun ? 'bg-red-50/30' : ''
                              }`}
                              title={`Ngày ${d}/${month}: ${symbol || 'Chưa chấm'}${shiftInfo ? ` • ${shiftInfo.name} (${shiftInfo.timeRange})` : ''}${totalOt > 0 ? ` • OT: +${totalOt}h (${dayData?.otStartTime || ''} - ${dayData?.otEndTime || ''})` : ''}${dayMealsCount > 0 ? ` • Ăn ca: ${dayMealsText.join(', ')}` : ''}`}
                            >
                              <div className={`w-full py-0.5 rounded text-[10px] flex flex-col items-center justify-center min-h-[36px] ${
                                symbol === 'X' ? 'bg-emerald-50 text-emerald-800' :
                                symbol === 'X/2' ? 'bg-emerald-50/60 text-emerald-700' :
                                symbol === 'P' ? 'bg-blue-100 text-blue-800' :
                                symbol === 'L' ? 'bg-amber-100 text-amber-800 font-black' :
                                symbol === 'O' ? 'bg-purple-100 text-purple-800' :
                                symbol === 'Ro' ? 'bg-red-100 text-red-800' :
                                symbol === 'CT' ? 'bg-teal-100 text-teal-800' : 'text-slate-300'
                              }`}>
                                <span className="font-extrabold text-[11px] leading-tight">
                                  {symbol || '-'}
                                </span>
                                
                                {/* Badge ca làm việc */}
                                {shiftInfo && (symbol === 'X' || symbol === 'X/2') && (
                                  <span className={`text-[8px] font-bold px-1 py-0.1 rounded border ${shiftInfo.badgeClass}`}>
                                    {shiftInfo.shortName}
                                  </span>
                                )}

                                {/* Badge làm thêm giờ */}
                                {totalOt > 0 && (
                                  <span className="text-[8px] font-black text-orange-700 bg-orange-100 px-1 rounded-full mt-0.5 leading-none" title={`OT: ${dayData?.otStartTime || ''} - ${dayData?.otEndTime || ''}`}>
                                    +{totalOt}h
                                  </span>
                                )}

                                {/* Badge suất ăn ca trong ngày */}
                                {dayMealsCount > 0 && (
                                  <span 
                                    className="text-[7.5px] font-bold text-teal-800 bg-teal-100/90 border border-teal-200/80 px-1 rounded-full mt-0.5 leading-none flex items-center gap-0.5"
                                    title={`Suất ăn ngày ${d}/${month} (${dayMealsCount} bữa): ${dayMealsText.join(', ')}`}
                                  >
                                    🍽️{dayMealsText.map(t => t === 'Trưa' ? 'T' : t === 'Chiều' ? 'C' : 'Đ').join('')}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Summary columns */}
                        <td className="p-2 font-bold text-slate-800 bg-emerald-50/50 border-l-2 border-slate-300">
                          {tk?.actualWorkDays || 0}
                        </td>
                        <td className="p-2 font-medium text-blue-700 bg-blue-50/40">
                          {tk?.paidLeaveDays || 0}
                        </td>
                        <td className="p-2 font-medium text-amber-700 bg-amber-50/40">
                          {tk?.holidayDays || 0}
                        </td>
                        <td className="p-2 font-black text-emerald-800 bg-emerald-100/70 text-xs font-mono">
                          {tk?.totalPaidDays || 0}
                        </td>
                        <td className="p-2 font-mono text-orange-700 font-semibold bg-orange-50/30">
                          {tk?.totalOtNormalHours ? `${tk.totalOtNormalHours}h` : '-'}
                        </td>
                        <td className="p-2 font-mono text-orange-700 font-semibold bg-orange-50/30">
                          {tk?.totalOtWeekendHours ? `${tk.totalOtWeekendHours}h` : '-'}
                        </td>
                        <td className="p-2 font-mono text-orange-700 font-semibold bg-orange-50/30">
                          {tk?.totalOtHolidayHours ? `${tk.totalOtHolidayHours}h` : '-'}
                        </td>
                        <td 
                          className="p-2 font-mono text-teal-800 bg-teal-50/40 text-center"
                          title={`Tổng cộng: ${tk?.totalMeals || 0} suất ăn (Trưa: ${tk?.totalMealsLunch || 0} | Chiều: ${tk?.totalMealsAfternoon || 0} | Tối: ${tk?.totalMealsDinner || 0})`}
                        >
                          <div className="font-black">{tk?.totalMeals || 0}</div>
                          {((tk?.totalMealsLunch || 0) + (tk?.totalMealsAfternoon || 0) + (tk?.totalMealsDinner || 0) > 0) && (
                            <div className="text-[9px] text-teal-700 font-normal leading-tight mt-0.5">
                              T:{tk?.totalMealsLunch || 0} C:{tk?.totalMealsAfternoon || 0} Đ:{tk?.totalMealsDinner || 0}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SHIFTS & OVERTIME TIME RANGE DETAILS */}
      {activeSubTab === 'ot_details' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Nhật Ký Chi Tiết Ca Làm Việc & Khung Giờ Làm Thêm Giờ (Từ - Đến)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem chi tiết ca làm việc, giờ bắt đầu và kết thúc làm thêm (OT) của từng nhân viên theo từng ngày
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              Tổng cộng: <strong>{overtimeLogs.length}</strong> lượt ca ghi nhận
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ngày & Thứ</th>
                  <th className="px-4 py-3">Mã NV</th>
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3">Phòng Ban</th>
                  <th className="px-4 py-3 text-center">Công</th>
                  <th className="px-4 py-3">Ca Làm Việc</th>
                  <th className="px-4 py-3">Khung Giờ Ca</th>
                  <th className="px-4 py-3 bg-orange-50/50 text-orange-900">Thời Gian Làm Thêm (Từ - Đến)</th>
                  <th className="px-4 py-3 text-center">Số Giờ OT</th>
                  <th className="px-4 py-3">Loại Làm Thêm</th>
                  <th className="px-4 py-3">Nội Dung / Lý Do</th>
                  <th className="px-4 py-3 text-center">Ăn Ca</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overtimeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400">
                      Không có bản ghi ca làm việc hoặc làm thêm giờ nào theo bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  overtimeLogs.map(log => {
                    const emp = empMap.get(log.employeeId);
                    const hasOt = log.otHours > 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{log.dateStr}</div>
                          <div className="text-[11px] text-slate-500">{log.dayOfWeekStr}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {emp?.employeeCode}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                          {emp?.fullName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {depMap.get(emp?.departmentId || '')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {log.symbol || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${log.shiftInfo.badgeClass}`}>
                            {log.shiftInfo.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {log.shiftInfo.timeRange}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap bg-orange-50/30">
                          {hasOt ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-900">
                                {log.otStartTime && log.otEndTime ? `${log.otStartTime} - ${log.otEndTime}` : 'Chưa định giờ'}
                              </span>
                              {log.isNightOt && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded" title="Làm thêm giờ trong khung giờ đêm (22h - 6h)">
                                  <Moon className="w-3 h-3" /> Đêm
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không tăng ca</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-black text-xs">
                          {hasOt ? (
                            <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                              +{log.otHours}h
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasOt ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.otType === 'holiday' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              log.otType === 'weekend' ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {log.otType === 'holiday' ? 'Ngày Lễ (300%)' :
                               log.otType === 'weekend' ? 'Ngày Nghỉ/CN (200%)' : 'Ngày Thường (150%)'}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={log.otReason}>
                          {log.otReason || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.hadMeal ? (
                            <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded text-[10px] font-bold">Có</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canEditTimekeeping && (
                            <button
                              onClick={() => handleDayClick(log.employeeId, log.day)}
                              className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TÍCH CHỌN ĂN CA THEO NGÀY (TRƯA / CHIỀU / TỐI) */}
      {activeSubTab === 'meal_attendance' && (() => {
        const isSun = isWeekendDay(selectedMealDay);
        const isSat = isSaturday(selectedMealDay);
        const isHol = isHoliday(selectedMealDay);
        const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;

        // Thống kê bữa ăn trong ngày đang chọn
        const dayMealStats = filteredEmployees.reduce((acc, emp) => {
          const tk = timekeepings.find(t => t.employeeId === emp.id);
          const dayData = tk?.days[selectedMealDay];
          const lunch = dayData?.mealLunch ? 1 : 0;
          const afternoon = dayData?.mealAfternoon ? 1 : 0;
          const dinner = dayData?.mealDinner ? 1 : 0;
          const total = lunch + afternoon + dinner || (dayData?.hadMeal ? 1 : 0);
          return {
            totalMeals: acc.totalMeals + total,
            lunch: acc.lunch + lunch,
            afternoon: acc.afternoon + afternoon,
            dinner: acc.dinner + dinner,
            employeesWithMeal: acc.employeesWithMeal + (total > 0 ? 1 : 0)
          };
        }, { totalMeals: 0, lunch: 0, afternoon: 0, dinner: 0, employeesWithMeal: 0 });

        return (
          <div className="space-y-4">
            {/* Thanh chọn ngày trong tháng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Tích Chọn Suất Ăn Ca Theo Từng Ngày (Trưa / Chiều / Tối)
                      </h3>
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold text-xs">
                        Ngày {selectedMealDay}/{month}/{year}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tích chọn trực tiếp từng bữa ăn cho nhân viên, tự động đồng bộ sang Bảng chấm công và Quản lý ăn ca
                    </p>
                  </div>
                </div>

                {/* KPI trong ngày */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 text-xs">
                    <span className="text-teal-700 font-medium">Tổng Suất Ăn:</span>{' '}
                    <strong className="font-mono text-teal-900 text-sm font-black">{dayMealStats.totalMeals}</strong>
                  </div>
                  <div className="bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-800">
                    ☀️ Trưa: <strong className="font-mono text-emerald-950 font-bold">{dayMealStats.lunch}</strong>
                  </div>
                  <div className="bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-200 text-xs font-medium text-blue-800">
                    🌤️ Chiều: <strong className="font-mono text-blue-950 font-bold">{dayMealStats.afternoon}</strong>
                  </div>
                  <div className="bg-purple-50 px-2.5 py-1.5 rounded-xl border border-purple-200 text-xs font-medium text-purple-800">
                    🌙 Tối: <strong className="font-mono text-purple-950 font-bold">{dayMealStats.dinner}</strong>
                  </div>
                  <div className="bg-slate-100 px-2.5 py-1.5 rounded-xl text-slate-700 text-xs">
                    👥 Người ăn: <strong className="font-bold">{dayMealStats.employeesWithMeal}/{filteredEmployees.length}</strong>
                  </div>
                </div>
              </div>

              {/* Dải nút chọn ngày 1..31 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 text-xs">
                  <span className="text-slate-400 font-semibold text-[11px] shrink-0 mr-1">Chọn ngày:</span>
                  {daysArray.map(d => {
                    const isSelected = d === selectedMealDay;
                    const isSunD = isWeekendDay(d);
                    const isSatD = isSaturday(d);
                    const isHolD = isHoliday(d);

                    // Đếm số suất ăn của ngày này
                    const dayMealsSum = timekeepings.reduce((sum, tk) => {
                      const dayRec = tk.days[d];
                      const cnt = (dayRec?.mealLunch ? 1 : 0) + (dayRec?.mealAfternoon ? 1 : 0) + (dayRec?.mealDinner ? 1 : 0) || (dayRec?.hadMeal ? 1 : 0);
                      return sum + cnt;
                    }, 0);

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedMealDay(d)}
                        className={`min-w-[42px] px-2 py-1.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500/30 shadow-xs'
                            : isHolD
                            ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                            : isSunD
                            ? 'bg-red-50/70 text-red-700 border-red-200 hover:bg-red-100'
                            : isSatD
                            ? 'bg-blue-50/60 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-black text-xs leading-none">{d}</span>
                        <span className={`text-[8.5px] leading-tight mt-0.5 opacity-80 ${isSelected ? 'text-teal-100' : ''}`}>
                          {isHolD ? 'Lễ' : isSunD ? 'CN' : isSatD ? 'T7' : `T${new Date(year, month - 1, d).getDay() + 1}`}
                        </span>
                        {dayMealsSum > 0 && (
                          <span className={`text-[8px] font-bold px-1 rounded-full mt-0.5 leading-none ${
                            isSelected ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {dayMealsSum}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toolbar tác vụ nhanh */}
              {canEditTimekeeping && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-bold text-slate-700 text-xs">Tác vụ ngày {selectedMealDay}:</span>
                    
                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('by_registration')}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Tự động tích chọn Trưa / Chiều / Tối theo Đăng ký tháng của từng nhân viên"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tích theo ĐK tháng tất cả NV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('lunch_all')}
                      className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      ☀️ Tích tất cả Trưa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('afternoon_all')}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      🌤️ Tích tất cả Chiều
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('dinner_all')}
                      className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      🌙 Tích tất cả Tối
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('all_three')}
                      className="px-2.5 py-1.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      ⚡ Cả 3 bữa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchSetMealsForSelectedDay('clear_all')}
                      className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      ❌ Bỏ chọn ngày này
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleApplyMonthlyMealPlanToEntireMonth}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Áp dụng suất ăn theo đăng ký tháng cho toàn bộ các ngày làm việc (công X) trong cả tháng"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Áp dụng ĐK tháng cho CẢ THÁNG</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bảng danh sách nhân viên và các cột tích chọn Trưa / Chiều / Tối */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 w-12 text-center">STT</th>
                      <th className="px-3 py-3 w-24">Mã NV</th>
                      <th className="px-4 py-3 min-w-[170px]">Họ và Tên</th>
                      <th className="px-3 py-3">Phòng Ban</th>
                      <th className="px-3 py-3 text-center">Ca / Công Ngày</th>
                      <th className="px-3 py-3 min-w-[150px]">Đăng Ký Tháng</th>
                      <th className="px-4 py-3 min-w-[130px] bg-emerald-50/70 text-emerald-950 font-bold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>☀️ Bữa Trưa</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-normal">Ca trưa (11:30 - 13:00)</span>
                      </th>
                      <th className="px-4 py-3 min-w-[130px] bg-blue-50/70 text-blue-950 font-bold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>🌤️ Bữa Chiều</span>
                        </div>
                        <span className="text-[10px] text-blue-700 font-normal">Giữa ca (16:30 - 17:30)</span>
                      </th>
                      <th className="px-4 py-3 min-w-[130px] bg-purple-50/70 text-purple-950 font-bold text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>🌙 Bữa Tối</span>
                        </div>
                        <span className="text-[10px] text-purple-700 font-normal">Ca tối (20:30 - 21:30)</span>
                      </th>
                      <th className="px-3 py-3 text-center font-bold bg-teal-50 text-teal-900 min-w-[90px]">
                        Tổng Bữa Ngày
                      </th>
                      {canEditTimekeeping && (
                        <th className="px-3 py-3 text-center min-w-[180px]">Thao Tác Nhanh</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                          Không tìm thấy nhân viên nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, idx) => {
                        const tk = timekeepings.find(t => t.employeeId === emp.id);
                        const dayData = tk?.days[selectedMealDay];
                        const symbol = dayData?.symbol || '';
                        const shift = dayData?.shift;
                        const shiftInfo = shift ? getShiftInfo(shift) : null;
                        const empMealReg = mealRegistrations?.find(m => m.employeeId === emp.id && (m.month === currentMonthStr || !m.month));

                        const isLunchChecked = !!dayData?.mealLunch;
                        const isAfternoonChecked = !!dayData?.mealAfternoon;
                        const isDinnerChecked = !!dayData?.mealDinner;
                        const dayMeals = (isLunchChecked ? 1 : 0) + (isAfternoonChecked ? 1 : 0) + (isDinnerChecked ? 1 : 0) || (dayData?.hadMeal ? 1 : 0);

                        const effectivePlanType = empMealReg?.mealType || (empMealReg?.planType === 'registered' ? 'canteen' : empMealReg?.planType) || 'canteen';

                        // Labels đăng ký tháng của nhân viên
                        const monthlyLabels = [];
                        if (effectivePlanType === 'canteen') {
                          if (empMealReg?.registerLunch !== false) monthlyLabels.push('Trưa ☀️');
                          if (empMealReg?.registerAfternoon) monthlyLabels.push('Chiều 🌤️');
                          if (empMealReg?.registerDinner) monthlyLabels.push('Tối 🌙');
                        } else if (effectivePlanType === 'cash') {
                          monthlyLabels.push('Nhận tiền mặt 💵');
                        } else {
                          monthlyLabels.push('Không ăn ⛔');
                        }

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-3 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-slate-700">
                              {emp.employeeCode}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="font-semibold text-slate-900">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-400">{emp.idCardNumber || ''}</div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {depMap.get(emp.departmentId) || '-'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono font-bold text-slate-800">
                                <span>{symbol || '-'}</span>
                                {shiftInfo && (
                                  <span className={`text-[8.5px] px-1 rounded font-normal border ${shiftInfo.badgeClass}`}>
                                    {shiftInfo.shortName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {monthlyLabels.map((lbl, i) => (
                                  <span 
                                    key={i} 
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      effectivePlanType === 'canteen' 
                                        ? 'bg-teal-50 text-teal-800 border-teal-200' 
                                        : effectivePlanType === 'cash'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Cột 1: TÍCH CHỌN ĂN TRƯA */}
                            <td className="px-4 py-3 text-center bg-emerald-50/30">
                              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all select-none cursor-pointer ${
                                isLunchChecked
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                                  : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isLunchChecked}
                                  disabled={!canEditTimekeeping}
                                  onChange={() => handleToggleDayMeal(emp.id, selectedMealDay, 'mealLunch')}
                                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                                />
                                <span className="font-bold text-xs">
                                  {isLunchChecked ? 'Đã ăn trưa ✓' : 'Ăn trưa'}
                                </span>
                              </label>
                            </td>

                            {/* Cột 2: TÍCH CHỌN ĂN CHIỀU */}
                            <td className="px-4 py-3 text-center bg-blue-50/30">
                              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all select-none cursor-pointer ${
                                isAfternoonChecked
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isAfternoonChecked}
                                  disabled={!canEditTimekeeping}
                                  onChange={() => handleToggleDayMeal(emp.id, selectedMealDay, 'mealAfternoon')}
                                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                />
                                <span className="font-bold text-xs">
                                  {isAfternoonChecked ? 'Đã ăn chiều ✓' : 'Ăn chiều'}
                                </span>
                              </label>
                            </td>

                            {/* Cột 3: TÍCH CHỌN ĂN TỐI */}
                            <td className="px-4 py-3 text-center bg-purple-50/30">
                              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all select-none cursor-pointer ${
                                isDinnerChecked
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-300'
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={isDinnerChecked}
                                  disabled={!canEditTimekeeping}
                                  onChange={() => handleToggleDayMeal(emp.id, selectedMealDay, 'mealDinner')}
                                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                />
                                <span className="font-bold text-xs">
                                  {isDinnerChecked ? 'Đã ăn tối ✓' : 'Ăn tối'}
                                </span>
                              </label>
                            </td>

                            {/* Tổng bữa */}
                            <td className="px-3 py-3 text-center font-bold font-mono bg-teal-50/40">
                              {dayMeals > 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300 text-xs font-black">
                                  {dayMeals} bữa
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Thao tác nhanh cho từng dòng nhân viên */}
                            {canEditTimekeeping && (
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetEmployeeDayMeal(emp.id, selectedMealDay, 'all_3')}
                                    className="px-2 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded font-semibold transition-colors cursor-pointer"
                                    title="Tích cả 3 bữa: Trưa + Chiều + Tối"
                                  >
                                    3 Bữa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetEmployeeDayMeal(emp.id, selectedMealDay, 'lunch_only')}
                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded font-semibold transition-colors cursor-pointer"
                                    title="Chỉ tích bữa trưa"
                                  >
                                    Trưa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetEmployeeDayMeal(emp.id, selectedMealDay, 'by_reg')}
                                    className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 rounded font-semibold transition-colors cursor-pointer"
                                    title="Tích theo đăng ký tháng của nhân viên"
                                  >
                                    Theo ĐK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetEmployeeDayMeal(emp.id, selectedMealDay, 'clear')}
                                    className="px-1.5 py-1 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-300 rounded transition-colors cursor-pointer"
                                    title="Xóa hết suất ăn ngày này"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT DAY MODAL: Chi Tiết Ca Làm Việc & Khung Giờ Làm Thêm Giờ */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  <span>Chấm Công & Phân Ca Ngày {selectedDayModal.dayNumber}/{month}/{year}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhân viên: <strong className="text-slate-800">{empMap.get(selectedDayModal.employeeId)?.fullName}</strong> ({empMap.get(selectedDayModal.employeeId)?.employeeCode})
                </p>
              </div>
              <button 
                onClick={() => setSelectedDayModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Chọn Ca Làm Việc (Work Shift) */}
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  1. Chọn Ca Làm Việc Trong Ngày:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WORK_SHIFTS.map(shift => {
                    const isSelected = selectedDayModal.currentRecord.shift === shift.id;
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => {
                          setSelectedDayModal({
                            ...selectedDayModal,
                            currentRecord: {
                              ...selectedDayModal.currentRecord,
                              shift: shift.id,
                              hours: shift.standardHours
                            }
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {shift.name}
                          </span>
                          {shift.isNightShift && (
                            <Moon className="w-3.5 h-3.5 text-purple-600" />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {shift.timeRange}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tiêu chuẩn: {shift.standardHours}h
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Ký Hiệu Chấm Công */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  2. Ký Hiệu Chấm Công *
                </label>
                <select
                  value={selectedDayModal.currentRecord.symbol}
                  onChange={e => setSelectedDayModal({
                    ...selectedDayModal,
                    currentRecord: {
                      ...selectedDayModal.currentRecord,
                      symbol: e.target.value as AttendanceSymbol,
                      hours: e.target.value === 'X' 
                        ? (getShiftInfo(selectedDayModal.currentRecord.shift).standardHours) 
                        : (e.target.value === 'X/2' ? 4 : 0)
                    }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="X">X - Đi làm đủ ca (Hưởng 100% lương ngày)</option>
                  <option value="X/2">X/2 - Đi làm nửa ngày (4h hưởng lương)</option>
                  <option value="P">P - Nghỉ phép năm (Có hưởng lương)</option>
                  <option value="L">L - Nghỉ Lễ, Tết (Hưởng 100% lương)</option>
                  <option value="O">O - Nghỉ ốm đau (Hưởng BHXH)</option>
                  <option value="TS">TS - Nghỉ thai sản (Hưởng BHXH)</option>
                  <option value="Ro">Ro - Nghỉ không hưởng lương</option>
                  <option value="CT">CT - Đi công tác</option>
                  <option value="K">K - Nghỉ tuần / Ngày nghỉ cố định</option>
                </select>
              </div>

              {/* 3. KHU VỰC LÀM THÊM GIỜ (OT) TỪ MẤY GIỜ ĐẾN MẤY GIỜ */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-orange-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900 select-none">
                    <input
                      type="checkbox"
                      checked={selectedDayModal.hasOvertime}
                      onChange={e => {
                        const checked = e.target.checked;
                        if (checked && !selectedDayModal.currentRecord.otStartTime) {
                          // Gợi ý giờ OT theo ca hiện tại
                          const { start, end } = getSuggestedOtRange(selectedDayModal.currentRecord.shift, 2);
                          handleOtTimeChange(start, end);
                        }
                        setSelectedDayModal({
                          ...selectedDayModal,
                          hasOvertime: checked
                        });
                      }}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                    />
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span>Làm Thêm Giờ (Tăng Ca / OT)</span>
                  </label>

                  {selectedDayModal.hasOvertime && (
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full font-mono font-black text-xs">
                      Tổng: {((selectedDayModal.currentRecord.otNormalHours || 0) + (selectedDayModal.currentRecord.otWeekendHours || 0) + (selectedDayModal.currentRecord.otHolidayHours || 0))} giờ
                    </span>
                  )}
                </div>

                {selectedDayModal.hasOvertime && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    {/* Chọn nhanh khung giờ */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-600">Gợi ý nhanh:</span>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedOt(1.5)}
                        className="px-2 py-0.5 bg-white hover:bg-orange-100 border border-orange-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        +1.5 Giờ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedOt(2.0)}
                        className="px-2 py-0.5 bg-white hover:bg-orange-100 border border-orange-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        +2.0 Giờ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedOt(3.0)}
                        className="px-2 py-0.5 bg-white hover:bg-orange-100 border border-orange-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        +3.0 Giờ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestedOt(4.0)}
                        className="px-2 py-0.5 bg-white hover:bg-orange-100 border border-orange-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        +4.0 Giờ
                      </button>
                    </div>

                    {/* Khung giờ: Từ mấy giờ đến mấy giờ */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Từ Mấy Giờ (Giờ bắt đầu):
                        </label>
                        <input
                          type="time"
                          value={selectedDayModal.currentRecord.otStartTime || ''}
                          onChange={e => handleOtTimeChange(e.target.value, selectedDayModal.currentRecord.otEndTime)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Đến Mấy Giờ (Giờ kết thúc):
                        </label>
                        <input
                          type="time"
                          value={selectedDayModal.currentRecord.otEndTime || ''}
                          onChange={e => handleOtTimeChange(selectedDayModal.currentRecord.otStartTime, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Phân loại loại ngày & Cảnh báo đêm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Loại Ngày Làm Thêm</label>
                        <select
                          value={
                            selectedDayModal.currentRecord.otHolidayHours > 0 ? 'holiday' :
                            selectedDayModal.currentRecord.otWeekendHours > 0 ? 'weekend' : 'normal'
                          }
                          onChange={e => {
                            const val = e.target.value as 'normal' | 'weekend' | 'holiday';
                            const total = calculateOtHours(selectedDayModal.currentRecord.otStartTime, selectedDayModal.currentRecord.otEndTime);
                            setSelectedDayModal({
                              ...selectedDayModal,
                              currentRecord: {
                                ...selectedDayModal.currentRecord,
                                otType: val,
                                otNormalHours: val === 'normal' ? total : 0,
                                otWeekendHours: val === 'weekend' ? total : 0,
                                otHolidayHours: val === 'holiday' ? total : 0,
                              }
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 text-xs"
                        >
                          <option value="normal">Ngày Thường (Hệ số 150%)</option>
                          <option value="weekend">Ngày Nghỉ Tuần/Chủ Nhật (Hệ số 200%)</option>
                          <option value="holiday">Ngày Nghỉ Lễ, Tết (Hệ số 300%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Số Giờ OT Tự Tính</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            max={24}
                            value={
                              (selectedDayModal.currentRecord.otNormalHours || 0) +
                              (selectedDayModal.currentRecord.otWeekendHours || 0) +
                              (selectedDayModal.currentRecord.otHolidayHours || 0)
                            }
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              const isHol = isHoliday(selectedDayModal.dayNumber);
                              const isSun = isWeekendDay(selectedDayModal.dayNumber);
                              setSelectedDayModal({
                                ...selectedDayModal,
                                currentRecord: {
                                  ...selectedDayModal.currentRecord,
                                  otNormalHours: (!isHol && !isSun) ? val : 0,
                                  otWeekendHours: isSun && !isHol ? val : 0,
                                  otHolidayHours: isHol ? val : 0,
                                }
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs text-center"
                          />
                          <span className="font-bold text-slate-600">giờ</span>
                        </div>
                      </div>
                    </div>

                    {/* Cảnh báo ca đêm nếu làm trong khung giờ đêm */}
                    {isNightTimeOt(selectedDayModal.currentRecord.otStartTime, selectedDayModal.currentRecord.otEndTime) && (
                      <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 flex items-center gap-2 text-[11px]">
                        <Moon className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>
                          Khung giờ có bao gồm khoảng thời gian làm đêm (22:00 - 06:00). Nhân viên được hưởng thêm phụ cấp làm đêm theo quy định.
                        </span>
                      </div>
                    )}

                    {/* Lý do OT */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nội Dung / Lý Do Tăng Ca:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Đóng hàng xuất khẩu gấp, Kiểm kê kho cuối tháng, Xử lý sự cố máy móc..."
                        value={selectedDayModal.currentRecord.otReason || ''}
                        onChange={e => setSelectedDayModal({
                          ...selectedDayModal,
                          currentRecord: {
                            ...selectedDayModal.currentRecord,
                            otReason: e.target.value
                          }
                        })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Suất ăn ca (Trưa / Chiều / Tối) */}
              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-teal-200">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-slate-900 text-xs">
                      Tích Chọn Suất Ăn Ca Trong Ngày (Trưa / Chiều / Tối)
                    </span>
                  </div>
                  {/* Hiển thị gợi ý đăng ký tháng của nhân viên */}
                  {(() => {
                    const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
                    const reg = mealRegistrations?.find(m => m.employeeId === selectedDayModal.employeeId && (m.month === currentMonthStr || !m.month));
                    const regLabels = [];
                    if (reg?.registerLunch !== false) regLabels.push('Trưa');
                    if (reg?.registerAfternoon) regLabels.push('Chiều');
                    if (reg?.registerDinner) regLabels.push('Tối');
                    return (
                      <span className="text-[11px] text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full font-semibold">
                        Đăng ký tháng: {regLabels.length > 0 ? regLabels.join(', ') : 'Chưa đăng ký'}
                      </span>
                    );
                  })()}
                </div>

                {/* Chọn nhanh các bữa */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-600">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayModal({
                        ...selectedDayModal,
                        currentRecord: {
                          ...selectedDayModal.currentRecord,
                          mealLunch: true,
                          mealAfternoon: true,
                          mealDinner: true,
                          hadMeal: true
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[11px] font-medium text-teal-900 transition-colors cursor-pointer"
                  >
                    Cả 3 bữa (Trưa + Chiều + Tối)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayModal({
                        ...selectedDayModal,
                        currentRecord: {
                          ...selectedDayModal.currentRecord,
                          mealLunch: true,
                          mealAfternoon: true,
                          mealDinner: false,
                          hadMeal: true
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[11px] font-medium text-teal-900 transition-colors cursor-pointer"
                  >
                    Trưa + Chiều
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
                      const reg = mealRegistrations?.find(m => m.employeeId === selectedDayModal.employeeId && (m.month === currentMonthStr || !m.month));
                      const l = reg?.registerLunch !== false;
                      const a = !!reg?.registerAfternoon;
                      const d = !!reg?.registerDinner;
                      setSelectedDayModal({
                        ...selectedDayModal,
                        currentRecord: {
                          ...selectedDayModal.currentRecord,
                          mealLunch: l,
                          mealAfternoon: a,
                          mealDinner: d,
                          hadMeal: l || a || d
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[11px] font-medium text-teal-900 transition-colors cursor-pointer"
                  >
                    Theo đăng ký NV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayModal({
                        ...selectedDayModal,
                        currentRecord: {
                          ...selectedDayModal.currentRecord,
                          mealLunch: true,
                          mealAfternoon: false,
                          mealDinner: false,
                          hadMeal: true
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-teal-100 border border-teal-300 rounded text-[11px] font-medium text-teal-900 transition-colors cursor-pointer"
                  >
                    Chỉ ăn trưa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDayModal({
                        ...selectedDayModal,
                        currentRecord: {
                          ...selectedDayModal.currentRecord,
                          mealLunch: false,
                          mealAfternoon: false,
                          mealDinner: false,
                          hadMeal: false
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-white hover:bg-red-50 border border-slate-300 text-slate-600 rounded text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Bỏ chọn hết
                  </button>
                </div>

                {/* 3 Checkbox: Trưa / Chiều / Tối */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Bữa Trưa */}
                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                    selectedDayModal.currentRecord.mealLunch 
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selectedDayModal.currentRecord.mealLunch}
                        onChange={e => {
                          const checked = e.target.checked;
                          const nextDinner = !!selectedDayModal.currentRecord.mealDinner;
                          const nextAfternoon = !!selectedDayModal.currentRecord.mealAfternoon;
                          setSelectedDayModal({
                            ...selectedDayModal,
                            currentRecord: {
                              ...selectedDayModal.currentRecord,
                              mealLunch: checked,
                              hadMeal: checked || nextDinner || nextAfternoon
                            }
                          });
                        }}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">☀️ Bữa Trưa</span>
                        <span className="text-[10px] text-slate-500">Ca trưa (11:30 - 13:00)</span>
                      </div>
                    </div>
                    {selectedDayModal.currentRecord.mealLunch && (
                      <span className="text-emerald-700 font-extrabold text-xs">✓</span>
                    )}
                  </label>

                  {/* Bữa Chiều */}
                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                    selectedDayModal.currentRecord.mealAfternoon 
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selectedDayModal.currentRecord.mealAfternoon}
                        onChange={e => {
                          const checked = e.target.checked;
                          const nextLunch = !!selectedDayModal.currentRecord.mealLunch;
                          const nextDinner = !!selectedDayModal.currentRecord.mealDinner;
                          setSelectedDayModal({
                            ...selectedDayModal,
                            currentRecord: {
                              ...selectedDayModal.currentRecord,
                              mealAfternoon: checked,
                              hadMeal: checked || nextLunch || nextDinner
                            }
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">🌤️ Bữa Chiều</span>
                        <span className="text-[10px] text-slate-500">Giữa ca (16:30 - 17:30)</span>
                      </div>
                    </div>
                    {selectedDayModal.currentRecord.mealAfternoon && (
                      <span className="text-blue-700 font-extrabold text-xs">✓</span>
                    )}
                  </label>

                  {/* Bữa Tối */}
                  <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                    selectedDayModal.currentRecord.mealDinner 
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selectedDayModal.currentRecord.mealDinner}
                        onChange={e => {
                          const checked = e.target.checked;
                          const nextLunch = !!selectedDayModal.currentRecord.mealLunch;
                          const nextAfternoon = !!selectedDayModal.currentRecord.mealAfternoon;
                          setSelectedDayModal({
                            ...selectedDayModal,
                            currentRecord: {
                              ...selectedDayModal.currentRecord,
                              mealDinner: checked,
                              hadMeal: checked || nextLunch || nextAfternoon
                            }
                          });
                        }}
                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">🌙 Bữa Tối</span>
                        <span className="text-[10px] text-slate-500">Tăng ca/Đêm (19:00 - 21:00)</span>
                      </div>
                    </div>
                    {selectedDayModal.currentRecord.mealDinner && (
                      <span className="text-purple-700 font-extrabold text-xs">✓</span>
                    )}
                  </label>
                </div>

                {/* Day Meal Total Badge */}
                <div className="flex items-center justify-between text-[11px] text-teal-900 bg-white/80 p-2 rounded-lg border border-teal-200">
                  <span>
                    Tổng số suất ăn ngày {selectedDayModal.dayNumber}:{' '}
                    <strong>
                      {(selectedDayModal.currentRecord.mealLunch ? 1 : 0) +
                       (selectedDayModal.currentRecord.mealAfternoon ? 1 : 0) +
                       (selectedDayModal.currentRecord.mealDinner ? 1 : 0)} suất
                    </strong>
                  </span>
                  <span className="text-slate-500 italic">
                    Tự động đồng bộ vào Bảng chấm công & Danh sách ăn ca
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDayModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveDay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Lưu & Cập Nhật Ngày Công
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÂN CA HÀNG LOẠT (BATCH ASSIGN SHIFTS) */}
      {isBatchShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Phân Ca Làm Việc Hàng Loạt</h3>
                  <p className="text-xs text-slate-500">Gán ca làm việc cho toàn công ty hoặc theo từng phòng ban</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBatchShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBatchShift} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">1. Chọn Ca Làm Việc Để Áp Dụng:</label>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_SHIFTS.map(shift => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setBatchShiftConfig({ ...batchShiftConfig, shift: shift.id })}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        batchShiftConfig.shift === shift.id 
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{shift.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{shift.timeRange}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">2. Áp Dụng Cho Đối Tượng:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="applyFor"
                      checked={batchShiftConfig.applyFor === 'all'}
                      onChange={() => setBatchShiftConfig({ ...batchShiftConfig, applyFor: 'all' })}
                      className="text-blue-600"
                    />
                    <span>Toàn bộ nhân viên trong công ty ({employees.length} người)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="applyFor"
                      checked={batchShiftConfig.applyFor === 'department'}
                      onChange={() => setBatchShiftConfig({ ...batchShiftConfig, applyFor: 'department' })}
                      className="text-blue-600"
                    />
                    <span>Chỉ áp dụng cho một phòng ban cụ thể</span>
                  </label>
                </div>
              </div>

              {batchShiftConfig.applyFor === 'department' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chọn phòng ban:</label>
                  <select
                    value={batchShiftConfig.departmentId}
                    onChange={e => setBatchShiftConfig({ ...batchShiftConfig, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {settings.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs">
                Ca làm việc mới sẽ được gán cho các ngày làm việc trong tháng {month}/{year}. Các ngày nghỉ phép (P), lễ (L), hoặc nghỉ tuần (K) vẫn được giữ nguyên.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchShiftModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Áp Dụng Phân Ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In Bảng Chấm Công */}
      <PrintTimekeepingModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        timekeepings={timekeepings}
        employees={employees}
        settings={settings}
        customMonth={month}
        customYear={year}
      />
    </div>
  );
};
