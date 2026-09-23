import * as XLSX from 'xlsx';
import { 
  Employee, 
  Department, 
  Position, 
  TimekeepingRecord, 
  PayrollRecord, 
  SystemSettings,
  InsuranceRecord,
  MealRegistration,
  SpecialAllowance,
  Dependent,
  RelationshipType
} from '../types';

/**
 * Xuất danh sách nhân viên ra Excel
 */
export const exportEmployeesToExcel = (
  employees: Employee[],
  departments: Department[],
  positions: Position[]
) => {
  const depMap = new Map(departments.map(d => [d.id, d.name]));
  const posMap = new Map(positions.map(p => [p.id, p.name]));

  const data = employees.map(emp => ({
    'Mã Nhân Viên': emp.employeeCode,
    'Họ và Tên': emp.fullName,
    'Số CCCD': emp.idCardNumber,
    'Ngày Sinh': emp.birthDate,
    'Ngày Cấp': emp.issueDate,
    'Nơi Cấp': emp.issuePlace || '',
    'Địa Chỉ': emp.address,
    'Số Điện Thoại': emp.phoneNumber || '',
    'Email': emp.email || '',
    'Phòng Ban': depMap.get(emp.departmentId) || emp.departmentId,
    'Chức Vụ': posMap.get(emp.positionId) || emp.positionId,
    'Trạng Thái': emp.workStatus === 'active' ? 'Đang làm việc' :
                  emp.workStatus === 'probation' ? 'Thử việc' :
                  emp.workStatus === 'resigned' ? 'Đã nghỉ việc' :
                  emp.workStatus === 'transferred' ? 'Điều chuyển' : 'Nghỉ thai sản',
    'Ngày Vào Làm': emp.startDate,
    'Hình Thức Lương': emp.salaryBasis === 'monthly' ? 'Lương tháng' :
                       emp.salaryBasis === 'daily' ? 'Theo ngày công' :
                       emp.salaryBasis === 'percent' ? 'Theo %' : 'Theo bộ phận',
    'Lương Cơ Bản (VNĐ)': emp.baseSalary,
    '% Lương': emp.salaryPercent || 100,
    'Số Tài Khoản': emp.bankAccount || '',
    'Ngân Hàng': emp.bankName || '',
    'Mã Số Thuế': emp.taxId || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_Sach_Nhan_Vien');
  XLSX.writeFile(workbook, `Danh_Sach_Nhan_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Tải file Excel mẫu danh sách nhân viên
 */
export const downloadEmployeeTemplate = () => {
  const sample = [
    {
      'Mã Nhân Viên': 'NV-0001',
      'Họ và Tên': 'Nguyễn Văn A',
      'Số CCCD': '001090001234',
      'Ngày Sinh': '1990-05-20',
      'Ngày Cấp': '2021-05-15',
      'Nơi Cấp': 'Cục Cảnh sát QLHC về TTXH',
      'Địa Chỉ': 'Hà Nội',
      'Số Điện Thoại': '0912345678',
      'Email': 'nguyenvana@gmail.com',
      'Phòng Ban': 'Phòng Kỹ thuật & Công nghệ',
      'Chức Vụ': 'Kỹ sư Phần mềm',
      'Trạng Thái': 'Đang làm việc',
      'Ngày Vào Làm': '2022-01-01',
      'Hình Thức Lương': 'Lương tháng',
      'Lương Cơ Bản': 15000000,
      'Số Tài Khoản': '190288889999',
      'Ngân Hàng': 'Vietcombank',
      'Mã Số Thuế': '8012345678'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Nhan_Vien');
  XLSX.writeFile(wb, 'Mau_Nhap_Nhan_Vien.xlsx');
};

/**
 * Đọc file Excel import nhân viên
 */
export const readEmployeeExcel = async (file: File): Promise<Partial<Employee>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const employees: Partial<Employee>[] = json.map((row, index) => ({
          employeeCode: row['Mã Nhân Viên'] || `NV-${1000 + index}`,
          fullName: row['Họ và Tên'] || 'Chưa đặt tên',
          idCardNumber: String(row['Số CCCD'] || ''),
          birthDate: row['Ngày Sinh'] || '1995-01-01',
          issueDate: row['Ngày Cấp'] || '2021-01-01',
          issuePlace: row['Nơi Cấp'] || 'Cục Cảnh sát QLHC về TTXH',
          address: row['Địa Chỉ'] || '',
          phoneNumber: String(row['Số Điện Thoại'] || ''),
          email: row['Email'] || '',
          workStatus: 'active',
          startDate: row['Ngày Vào Làm'] || '2024-01-01',
          salaryBasis: 'monthly',
          baseSalary: Number(String(row['Lương Cơ Bản'] || row['Lương Cơ Bản (VNĐ)'] || 10000000).replace(/\D/g, '')),
          bankAccount: String(row['Số Tài Khoản'] || ''),
          bankName: row['Ngân Hàng'] || '',
          taxId: String(row['Mã Số Thuế'] || '')
        }));

        resolve(employees);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Xuất bảng chấm công ra Excel (kèm ca làm việc & khung giờ tăng ca từ... đến...)
 */
export const exportTimekeepingToExcel = (
  timekeepings: TimekeepingRecord[],
  employees: Employee[],
  year: number,
  month: number
) => {
  const empMap = new Map(employees.map(e => [e.id, e]));

  const shiftLabelMap: Record<string, string> = {
    ca_hanh_chinh: 'Hành chính (08:00-17:00)',
    ca_sang: 'Ca sáng (08:00-12:00)',
    ca_chieu: 'Ca chiều (13:00-17:00)',
    ca_1: 'Ca 1 (06:00-14:00)',
    ca_2: 'Ca 2 (14:00-22:00)',
    ca_3: 'Ca 3 (22:00-06:00)',
  };

  const daysCount = new Date(year, month, 0).getDate();
  
  // Sheet 1: Bảng tổng quan tháng
  const rows = timekeepings.map(tk => {
    const emp = empMap.get(tk.employeeId);
    const rowObj: any = {
      'Mã Nhân Viên': emp?.employeeCode || '',
      'Họ và Tên': emp?.fullName || '',
    };

    for (let d = 1; d <= daysCount; d++) {
      const dayData = tk.days[d];
      let cellText = dayData?.symbol || '';
      if (cellText && dayData?.shift) {
        const sCode = dayData.shift === 'ca_hanh_chinh' ? 'HC' : 
                      dayData.shift === 'ca_sang' ? 'S' : 
                      dayData.shift === 'ca_chieu' ? 'C' : 
                      dayData.shift === 'ca_1' ? 'C1' : 
                      dayData.shift === 'ca_2' ? 'C2' : 'C3';
        cellText += ` [${sCode}]`;
      }
      const totalOt = (dayData?.otNormalHours || 0) + (dayData?.otWeekendHours || 0) + (dayData?.otHolidayHours || 0);
      if (totalOt > 0) {
        const timeStr = dayData?.otStartTime && dayData?.otEndTime ? ` ${dayData.otStartTime}-${dayData.otEndTime}` : '';
        cellText += ` (+${totalOt}h${timeStr})`;
      }
      rowObj[`N${d}`] = cellText;
    }

    rowObj['Công Đi Làm (X)'] = tk.actualWorkDays;
    rowObj['Nghỉ Phép (P)'] = tk.paidLeaveDays;
    rowObj['Nghỉ Lễ (L)'] = tk.holidayDays;
    rowObj['Nghỉ Ốm (O)'] = tk.insuranceLeaveDays;
    rowObj['Nghỉ Ko Lương (Ro)'] = tk.unpaidLeaveDays;
    rowObj['Tổng Ngày Hưởng Lương'] = tk.totalPaidDays;
    rowObj['Tăng Ca Thường (h)'] = tk.totalOtNormalHours;
    rowObj['Tăng Ca CN (h)'] = tk.totalOtWeekendHours;
    rowObj['Tăng Ca Lễ (h)'] = tk.totalOtHolidayHours;
    rowObj['Tổng Giờ Tăng Ca (h)'] = tk.totalOtNormalHours + tk.totalOtWeekendHours + tk.totalOtHolidayHours;
    rowObj['Số Suất Ăn Ca'] = tk.totalMeals;

    return rowObj;
  });

  // Sheet 2: Chi tiết ca làm việc & lịch làm thêm giờ (OT) từ mấy giờ đến mấy giờ
  const detailRows: any[] = [];
  timekeepings.forEach(tk => {
    const emp = empMap.get(tk.employeeId);
    for (let d = 1; d <= daysCount; d++) {
      const dayData = tk.days[d];
      const hasWork = dayData && (dayData.symbol || dayData.shift);
      const totalOt = (dayData?.otNormalHours || 0) + (dayData?.otWeekendHours || 0) + (dayData?.otHolidayHours || 0);
      
      if (hasWork) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const dowStr = dayOfWeek === 0 ? 'Chủ nhật' : `Thứ ${dayOfWeek + 1}`;
        
        detailRows.push({
          'Ngày': `${d}/${month}/${year}`,
          'Thứ': dowStr,
          'Mã NV': emp?.employeeCode || '',
          'Họ và Tên': emp?.fullName || '',
          'Ký Hiệu Công': dayData.symbol || '-',
          'Ca Làm Việc': dayData.shift ? (shiftLabelMap[dayData.shift] || dayData.shift) : 'Chưa xếp ca',
          'Thời Gian Làm Thêm (Từ - Đến)': (dayData.otStartTime && dayData.otEndTime) 
            ? `${dayData.otStartTime} - ${dayData.otEndTime}` 
            : (totalOt > 0 ? `${totalOt}h` : '-'),
          'Giờ Bắt Đầu OT': dayData.otStartTime || '',
          'Giờ Kết Thúc OT': dayData.otEndTime || '',
          'Số Giờ OT Thường': dayData.otNormalHours || 0,
          'Số Giờ OT Cuối Tuần': dayData.otWeekendHours || 0,
          'Số Giờ OT Ngày Lễ': dayData.otHolidayHours || 0,
          'Tổng Giờ OT (h)': totalOt,
          'Lý Do / Nội Dung Tăng Ca': dayData.otReason || '',
          'Suất Ăn Ca': dayData.hadMeal || dayData.mealEaten ? 'Có' : 'Không'
        });
      }
    }
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws1, `Bang_Tong_Hop_Cong_T${month}`);

  if (detailRows.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_Ca_Va_Tang_Ca');
  }

  XLSX.writeFile(wb, `Bang_Cham_Cong_Va_Tang_Ca_T${month}_${year}.xlsx`);
};

/**
 * Xuất Bảng Thanh Toán Lương ra Excel
 */
export const exportPayrollToExcel = (
  payrolls: PayrollRecord[],
  employees: Employee[],
  settings: SystemSettings,
  month: string
) => {
  const empMap = new Map(employees.map(e => [e.id, e]));
  const depMap = new Map(settings.departments.map(d => [d.id, d.name]));
  const posMap = new Map(settings.positions.map(p => [p.id, p.name]));

  const rows = payrolls.map((p, idx) => {
    const emp = empMap.get(p.employeeId);
    return {
      'STT': idx + 1,
      'Mã Nhân Viên': emp?.employeeCode || '',
      'Họ và Tên': emp?.fullName || '',
      'Phòng Ban': depMap.get(emp?.departmentId || '') || '',
      'Chức Vụ': posMap.get(emp?.positionId || '') || '',
      'Lương Cơ Bản': p.baseSalary,
      'Ngày Công Chuẩn': p.standardDays,
      'Ngày Công Hưởng Lương': p.actualPaidDays,
      'Lương Chính': p.mainSalary,
      'Làm Thêm Giờ (Tính thuế)': p.otPayTaxable,
      'Làm Thêm Giờ (Miễn thuế)': p.otPayTaxExempt,
      'Phụ Cấp Tính Thuế': p.taxableAllowances,
      'Phụ Cấp Miễn Thuế': p.taxExemptAllowances,
      'Tiền Ăn Trưa/Ca': p.mealAllowance,
      'TỔNG THU NHẬP (GROSS)': p.grossIncome,
      'Mức Lương Đóng BHXH': p.insuranceSalary,
      'BHXH NLĐ (8%)': p.socialInsuranceEmp,
      'BHYT NLĐ (1.5%)': p.healthInsuranceEmp,
      'BHTN NLĐ (1%)': p.unempInsuranceEmp,
      'TỔNG TRÍCH BHXH NLĐ (10.5%)': p.totalInsuranceEmp,
      'Giảm Trừ Bản Thân': p.personalDeduction,
      'Số Người Phụ Thuộc': p.dependentCount,
      'Giảm Trừ Người Phụ Thuộc': p.dependentDeduction,
      'Tổng Giảm Trừ Thuế TNCN': p.totalDeductionsForTax,
      'Thu Nhập Chịu Thuế': p.taxableIncome,
      'Thu Nhập Tính Thuế': p.assessableIncome,
      'THUẾ TNCN PHẢI NỘP': p.personalIncomeTax,
      'Tạm Ứng': p.advancePayment,
      'Khấu Trừ Khác': p.mealDeduction + p.otherDeductions,
      'THỰC LĨNH (NET)': p.netSalary,
      'Tài Khoản Ngân Hàng': `${emp?.bankAccount || ''} - ${emp?.bankName || ''}`,
      'Trạng Thái Thanh Toán': p.paymentStatus === 'paid' ? 'Đã thanh toán' : p.paymentStatus === 'approved' ? 'Đã duyệt' : 'Dự thảo'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Bang_Luong_${month}`);
  XLSX.writeFile(wb, `Bang_Thanh_Toan_Luong_${month}.xlsx`);
};

/**
 * Xuất Báo cáo Thuế TNCN ra Excel
 */
export const exportTaxReportToExcel = (
  payrolls: PayrollRecord[],
  employees: Employee[],
  settings: SystemSettings,
  month: string
) => {
  const empMap = new Map(employees.map(e => [e.id, e]));

  const rows = payrolls.map((p, idx) => {
    const emp = empMap.get(p.employeeId);
    const totalExempt = p.otPayTaxExempt + p.taxExemptAllowances + (p.mealAllowance || 0);

    return {
      'STT': idx + 1,
      'Mã Nhân Viên': emp?.employeeCode || '',
      'Họ và Tên': emp?.fullName || '',
      'Mã Số Thuế': emp?.taxId || '',
      // Nhóm Chịu thuế
      'Lương Chính (Chịu Thuế)': p.mainSalary,
      'OT Tính Thuế (100%)': p.otPayTaxable,
      'Phụ Cấp Tính Thuế': p.taxableAllowances,
      'TỔNG THU NHẬP CHỊU THUẾ': p.taxableIncome,
      // Nhóm Miễn thuế / Không chịu thuế
      'OT Vượt Mức Miễn Thuế': p.otPayTaxExempt,
      'Tiền Ăn Ca Định Mức Miễn Thuế': p.mealAllowance || 0,
      'Phụ Cấp Miễn Thuế': p.taxExemptAllowances,
      'TỔNG THU NHẬP MIỄN THUẾ': totalExempt,
      // Tổng thu nhập
      'TỔNG THU NHẬP (GROSS)': p.grossIncome,
      // Các khoản giảm trừ
      'Giảm Trừ Bản Thân': p.personalDeduction,
      'Số Người Phụ Thuộc': p.dependentCount,
      'Giảm Trừ NPT': p.dependentDeduction,
      'Bảo Hiểm Được Trừ (10.5%)': p.totalInsuranceEmp,
      'TỔNG CÁC KHOẢN GIẢM TRỪ': p.totalDeductionsForTax,
      // Tính thuế
      'Thu Nhập Tính Thuế (TNTT)': p.assessableIncome,
      'THUẾ TNCN PHẢI KHẤU TRỪ': p.personalIncomeTax
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Thue_TNCN_${month}`);
  XLSX.writeFile(wb, `Bao_Cao_Thue_TNCN_${month}.xlsx`);
};

/**
 * Tải file Excel mẫu danh sách người phụ thuộc
 */
export const downloadDependentTemplate = () => {
  const sample = [
    {
      'Mã Nhân Viên': 'NV-0001',
      'Họ và Tên Nhân Viên': 'Nguyễn Văn A',
      'Họ và Tên Người Phụ Thuộc': 'Nguyễn Minh Khang',
      'Số Định Danh / CCCD / MST NPT': '001216009823',
      'Mối Quan Hệ': 'Con đẻ/Con nuôi',
      'Ngày Sinh': '2016-06-18',
      'Tháng Bắt Đầu Giảm Trừ': '2024-01',
      'Tháng Kết Thúc Giảm Trừ': '',
      'Mức Giảm Trừ': 4400000,
      'Ghi Chú': 'Con trai đầu'
    },
    {
      'Mã Nhân Viên': 'NV-0001',
      'Họ và Tên Nhân Viên': 'Nguyễn Văn A',
      'Họ và Tên Người Phụ Thuộc': 'Nguyễn Bảo Anh',
      'Số Định Danh / CCCD / MST NPT': '001220005412',
      'Mối Quan Hệ': 'Con đẻ/Con nuôi',
      'Ngày Sinh': '2020-09-02',
      'Tháng Bắt Đầu Giảm Trừ': '2024-01',
      'Tháng Kết Thúc Giảm Trừ': '',
      'Mức Giảm Trừ': 4400000,
      'Ghi Chú': 'Con gái thứ hai'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nguoi_Phu_Thuoc');
  XLSX.writeFile(wb, 'Mau_Nhap_Nguoi_Phu_Thuoc.xlsx');
};

/**
 * Đọc file Excel import người phụ thuộc
 */
export const readDependentExcel = async (
  file: File, 
  employees: Employee[]
): Promise<Dependent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const codeMap = new Map(employees.map(emp => [emp.employeeCode.trim().toLowerCase(), emp]));
        const nameMap = new Map(employees.map(emp => [emp.fullName.trim().toLowerCase(), emp]));
        const idCardMap = new Map(employees.map(emp => [emp.idCardNumber.trim(), emp]));

        const results: Dependent[] = [];

        json.forEach((row, idx) => {
          const empCode = String(row['Mã Nhân Viên'] || '').trim().toLowerCase();
          const empName = String(row['Họ và Tên Nhân Viên'] || row['Họ Tên Nhân Viên'] || '').trim().toLowerCase();
          const empCard = String(row['Số CCCD'] || row['CCCD'] || '').trim();

          const matchedEmp = codeMap.get(empCode) || idCardMap.get(empCard) || nameMap.get(empName);
          const empId = matchedEmp ? matchedEmp.id : (employees[0]?.id || `emp-${idx}`);

          const depFullName = String(row['Họ và Tên Người Phụ Thuộc'] || row['Họ Tên Người Phụ Thuộc'] || row['Họ và Tên'] || '').trim();
          if (!depFullName) return; // Bỏ qua dòng trống

          const taxCodeOrId = String(row['Số Định Danh / CCCD / MST NPT'] || row['CCCD / Mã Định Danh / MST'] || row['Mã Số Thuế NPT'] || row['Số Định Danh'] || '').trim();
          const relStr = String(row['Mối Quan Hệ'] || 'Con đẻ/Con nuôi').trim();
          const validRels: RelationshipType[] = [
            'Con đẻ/Con nuôi', 'Vợ/Chồng', 'Cha mẹ ruột', 'Cha mẹ vợ/chồng', 'Người không nơi nương tựa', 'Khác'
          ];
          const relationship = validRels.find(r => r.toLowerCase() === relStr.toLowerCase()) || 'Con đẻ/Con nuôi';

          const birthDate = String(row['Ngày Sinh'] || '2018-01-01').trim();
          const startDate = String(row['Tháng Bắt Đầu Giảm Trừ'] || row['Bắt Đầu Giảm Trừ'] || '2024-01').trim();
          const endDate = row['Tháng Kết Thúc Giảm Trừ'] || row['Kết Thúc Giảm Trừ'] ? String(row['Tháng Kết Thúc Giảm Trừ'] || row['Kết Thúc Giảm Trừ']).trim() : '';
          const deductionRaw = row['Mức Giảm Trừ'] || row['Mức Giảm Trừ (VNĐ/tháng)'] || 4400000;
          const deductionAmount = Number(String(deductionRaw).replace(/\D/g, '')) || 4400000;
          const note = String(row['Ghi Chú'] || '').trim();

          results.push({
            id: `dep-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            employeeId: empId,
            fullName: depFullName,
            taxCodeOrId,
            relationship,
            birthDate,
            startDate,
            endDate: endDate === 'Hiện tại' ? '' : endDate,
            deductionAmount,
            note
          });
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Tải file Excel mẫu phụ cấp đặc thù
 */
export const downloadAllowanceTemplate = () => {
  const sample = [
    {
      'Mã Nhân Viên': 'NV-0001',
      'Họ và Tên Nhân Viên': 'Nguyễn Văn A',
      'Tên Khoản Phụ Cấp': 'Phụ cấp trách nhiệm quản lý',
      'Số Tiền (VNĐ)': 2000000,
      'Tính Thuế TNCN': 'Có tính thuế', // Có tính thuế hoặc Miễn thuế
      'Tháng Áp Dụng': '2026-09',
      'Ghi Chú': 'Phụ cấp trách nhiệm ban điều hành'
    },
    {
      'Mã Nhân Viên': 'NV-0001',
      'Họ và Tên Nhân Viên': 'Nguyễn Văn A',
      'Tên Khoản Phụ Cấp': 'Phụ cấp cước điện thoại công tác',
      'Số Tiền (VNĐ)': 500000,
      'Tính Thuế TNCN': 'Miễn thuế',
      'Tháng Áp Dụng': '2026-09',
      'Ghi Chú': 'Khoán chi điện thoại theo định mức'
    }
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Phu_Cap_Dac_Thu');
  XLSX.writeFile(wb, 'Mau_Nhap_Phu_Cap_Dac_Thu.xlsx');
};

/**
 * Đọc file Excel import phụ cấp đặc thù
 */
export const readAllowanceExcel = async (
  file: File,
  employees: Employee[]
): Promise<SpecialAllowance[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const codeMap = new Map(employees.map(emp => [emp.employeeCode.trim().toLowerCase(), emp]));
        const nameMap = new Map(employees.map(emp => [emp.fullName.trim().toLowerCase(), emp]));
        const idCardMap = new Map(employees.map(emp => [emp.idCardNumber.trim(), emp]));

        const results: SpecialAllowance[] = [];

        json.forEach((row, idx) => {
          const empCode = String(row['Mã Nhân Viên'] || '').trim().toLowerCase();
          const empName = String(row['Họ và Tên Nhân Viên'] || row['Họ Tên Nhân Viên'] || '').trim().toLowerCase();
          const empCard = String(row['Số CCCD'] || row['CCCD'] || '').trim();

          const matchedEmp = codeMap.get(empCode) || idCardMap.get(empCard) || nameMap.get(empName);
          const empId = matchedEmp ? matchedEmp.id : (employees[0]?.id || `emp-${idx}`);

          const allowanceName = String(row['Tên Khoản Phụ Cấp'] || row['Tên Phụ Cấp'] || '').trim();
          if (!allowanceName) return;

          const amountRaw = row['Số Tiền (VNĐ)'] || row['Số Tiền'] || row['Mức Phụ Cấp'] || 0;
          const amount = Number(String(amountRaw).replace(/\D/g, '')) || 0;

          const taxStr = String(row['Tính Thuế TNCN'] || row['Tính Thuế'] || row['Chịu Thuế'] || '').trim().toLowerCase();
          const isTaxable = taxStr.includes('có') || taxStr.includes('true') || taxStr.includes('1') || taxStr.includes('tính thuế');

          const month = String(row['Tháng Áp Dụng'] || row['Tháng'] || '2026-09').trim();
          const note = String(row['Ghi Chú'] || '').trim();

          results.push({
            id: `allow-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            employeeId: empId,
            name: allowanceName,
            amount,
            isTaxable,
            month,
            note
          });
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
