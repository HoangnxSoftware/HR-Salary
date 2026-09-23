import { WorkShift, ShiftInfo } from '../types';

export const WORK_SHIFTS: ShiftInfo[] = [
  {
    id: 'ca_hanh_chinh',
    name: 'Ca Hành Chính',
    shortName: 'HC',
    timeRange: '08:00 - 17:00',
    startTime: '08:00',
    endTime: '17:00',
    standardHours: 8,
    isNightShift: false,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'ca_sang',
    name: 'Ca Sáng',
    shortName: 'Sáng',
    timeRange: '08:00 - 12:00',
    startTime: '08:00',
    endTime: '12:00',
    standardHours: 4,
    isNightShift: false,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'ca_chieu',
    name: 'Ca Chiều',
    shortName: 'Chiều',
    timeRange: '13:00 - 17:00',
    startTime: '13:00',
    endTime: '17:00',
    standardHours: 4,
    isNightShift: false,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'ca_1',
    name: 'Ca 1 (Sáng sớm)',
    shortName: 'Ca 1',
    timeRange: '06:00 - 14:00',
    startTime: '06:00',
    endTime: '14:00',
    standardHours: 8,
    isNightShift: false,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'ca_2',
    name: 'Ca 2 (Chiều tối)',
    shortName: 'Ca 2',
    timeRange: '14:00 - 22:00',
    startTime: '14:00',
    endTime: '22:00',
    standardHours: 8,
    isNightShift: false,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'ca_3',
    name: 'Ca 3 (Đêm)',
    shortName: 'Ca 3',
    timeRange: '22:00 - 06:00',
    startTime: '22:00',
    endTime: '06:00',
    standardHours: 8,
    isNightShift: true,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
  }
];

export const SHIFT_MAP = new Map<WorkShift, ShiftInfo>(
  WORK_SHIFTS.map(s => [s.id, s])
);

export const getShiftInfo = (shift?: WorkShift): ShiftInfo => {
  if (!shift || !SHIFT_MAP.has(shift)) {
    return SHIFT_MAP.get('ca_hanh_chinh')!;
  }
  return SHIFT_MAP.get(shift)!;
};

/**
 * Tính số giờ làm thêm từ thời gian bắt đầu và kết thúc
 * Hỗ trợ làm thêm qua đêm (ví dụ: 22:00 đến 02:00 hôm sau)
 */
export const calculateOtHours = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Trường hợp làm thêm xuyên đêm qua 0h (ví dụ: từ 22:00 đến 02:00 sáng hôm sau)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const diffMinutes = endMinutes - startMinutes;
  if (diffMinutes <= 0) return 0;
  
  // Quy đổi ra giờ (làm tròn 1 chữ số thập phân)
  return Math.round((diffMinutes / 60) * 10) / 10;
};

/**
 * Định dạng hiển thị chuỗi khoảng thời gian làm thêm
 * Ví dụ: "17:30 - 20:30 (3h)"
 */
export const formatOtTimeRange = (startTime?: string, endTime?: string, hours?: number): string => {
  if (!startTime || !endTime) {
    return hours ? `+${hours}h` : '';
  }
  const calcHours = hours ?? calculateOtHours(startTime, endTime);
  return `${startTime} - ${endTime} (${calcHours}h)`;
};

/**
 * Kiểm tra xem khoảng thời gian OT có rơi vào ca đêm (22:00 - 06:00) theo Luật lao động Việt Nam hay không
 */
export const isNightTimeOt = (startTime?: string, endTime?: string): boolean => {
  if (!startTime || !endTime) return false;
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  // Từ 22h trở đi hoặc trước 6h sáng
  if (startH >= 22 || startH < 6 || endH >= 22 || endH <= 6) return true;
  return false;
};

/**
 * Gợi ý giờ bắt đầu và kết thúc OT theo ca làm việc
 */
export const getSuggestedOtRange = (shift?: WorkShift, targetHours: number = 2): { start: string; end: string } => {
  switch (shift) {
    case 'ca_sang':
      return { start: '12:30', end: targetHours === 2 ? '14:30' : '15:30' };
    case 'ca_chieu':
      return { start: '17:30', end: targetHours === 2 ? '19:30' : '20:30' };
    case 'ca_1':
      return { start: '14:30', end: targetHours === 2 ? '16:30' : '17:30' };
    case 'ca_2':
      return { start: '22:30', end: targetHours === 2 ? '00:30' : '01:30' };
    case 'ca_3':
      return { start: '06:30', end: targetHours === 2 ? '08:30' : '09:30' };
    case 'ca_hanh_chinh':
    default:
      return { start: '17:30', end: targetHours === 2 ? '19:30' : '20:30' };
  }
};
