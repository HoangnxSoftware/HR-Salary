import { Employee, SystemSettings } from '../types';

/**
 * Danh sách các biến placeholder hỗ trợ trong mẫu hợp đồng và cam kết
 */
export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Thông tin công ty
  { key: '{{ten_cong_ty}}', label: 'Tên Công Ty', description: 'Tên đầy đủ của doanh nghiệp', example: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ & THƯƠNG MẠI VIỆT THÀNH' },
  { key: '{{dia_chi_cong_ty}}', label: 'Địa Chỉ Công Ty', description: 'Trụ sở chính công ty', example: 'Tầng 8, Tòa nhà V-Tower, Ba Đình, Hà Nội' },
  { key: '{{mst_cong_ty}}', label: 'Mã Số Thuế Cty', description: 'Mã số thuế của công ty', example: '0108967899' },
  { key: '{{sdt_cong_ty}}', label: 'SĐT Công Ty', description: 'Số hotline liên hệ', example: '024.3789.9999' },
  { key: '{{dai_dien_cong_ty}}', label: 'Đại Diện Công Ty', description: 'Người ký đại diện (Giám đốc)', example: 'Nguyễn Văn Thành' },
  
  // Thông tin người lao động
  { key: '{{ho_ten}}', label: 'Họ và Tên NLĐ', description: 'Họ tên viết hoa có dấu', example: 'NGUYỄN VĂN A' },
  { key: '{{ma_nv}}', label: 'Mã Nhân Viên', description: 'Mã số nhân viên', example: 'DEV-8821' },
  { key: '{{so_cccd}}', label: 'Số Căn Cước (CCCD)', description: 'Số CCCD/CMND', example: '001085008821' },
  { key: '{{ngay_cap_cccd}}', label: 'Ngày Cấp CCCD', description: 'Ngày được cấp CCCD', example: '10/04/2021' },
  { key: '{{noi_cap_cccd}}', label: 'Nơi Cấp CCCD', description: 'Cơ quan cấp CCCD', example: 'Cục Cảnh sát QLHC về TTXH' },
  { key: '{{ngay_sinh}}', label: 'Ngày Sinh', description: 'Ngày tháng năm sinh', example: '12/05/1985' },
  { key: '{{dia_chi}}', label: 'Địa Chỉ Cư Trú', description: 'Hộ khẩu hoặc nơi ở', example: 'Số 15 Phố Huế, Hoàn Kiếm, Hà Nội' },
  { key: '{{so_dien_thoai}}', label: 'Số Điện Thoại', description: 'Số điện thoại cá nhân', example: '0912345678' },
  { key: '{{email}}', label: 'Email', description: 'Địa chỉ hòm thư điện tử', example: 'nhanvien@congty.vn' },
  { key: '{{ma_so_thue}}', label: 'Mã Số Thuế Cá Nhân', description: 'MST cá nhân của NLĐ', example: '8021155990' },
  { key: '{{so_tai_khoan}}', label: 'Số Tài Khoản NH', description: 'Số tài khoản nhận lương', example: '1902888999888' },
  { key: '{{ngan_hang}}', label: 'Tên Ngân Hàng', description: 'Ngân hàng và chi nhánh', example: 'Techcombank - Chi nhánh Thăng Long' },
  
  // Công việc & Chức vụ
  { key: '{{phong_ban}}', label: 'Phòng Ban', description: 'Bộ phận trực thuộc', example: 'Phòng Kỹ thuật & Công nghệ' },
  { key: '{{chuc_vu}}', label: 'Chức Danh / Vị Trí', description: 'Chức danh chuyên môn', example: 'Kỹ sư Phần mềm' },
  { key: '{{ngay_vao_lam}}', label: 'Ngày Bắt Đầu Làm', description: 'Ngày tiếp nhận công việc', example: '01/01/2024' },
  { key: '{{loai_hop_dong}}', label: 'Loại Hợp Đồng', description: 'Xác định thời hạn / Vô thời hạn', example: 'Hợp đồng lao động xác định thời hạn (12 tháng)' },
  { key: '{{muc_luong}}', label: 'Mức Lương Bằng Số', description: 'Mức lương cơ bản (VNĐ)', example: '15,000,000' },
  { key: '{{luong_bang_chu}}', label: 'Lương Bằng Chữ', description: 'Số tiền diễn giải bằng chữ', example: 'Mười lăm triệu đồng chẵn' },
  { key: '{{hinh_thuc_luong}}', label: 'Hình Thức Trả Lương', description: 'Lương tháng / Ngày / Giờ', example: 'Lương theo tháng qua chuyển khoản ngân hàng' },
  
  // Thời gian ký kết
  { key: '{{ngay_ky}}', label: 'Ngày Ký', description: 'Ngày ký kết văn bản (DD/MM/YYYY)', example: '24/09/2026' },
  { key: '{{ngay_hien_tai}}', label: 'Ngày', description: 'Chỉ số ngày (01 - 31)', example: '24' },
  { key: '{{thang_hien_tai}}', label: 'Tháng', description: 'Chỉ số tháng (01 - 12)', example: '09' },
  { key: '{{nam_hien_tai}}', label: 'Năm', description: 'Năm hiện tại (YYYY)', example: '2026' },
];

/**
 * Hàm chuyển đổi số tiền thành chữ tiếng Việt chuẩn hóa
 */
export function numberToWordsVietnamese(n: number): string {
  if (isNaN(n) || n === 0) return 'Không đồng';
  
  const absN = Math.abs(Math.round(n));
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(three: number, isHighest: boolean): string {
    const h = Math.floor(three / 100);
    const t = Math.floor((three % 100) / 10);
    const u = three % 10;
    let res = '';

    if (h > 0 || !isHighest) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 0 && u > 0) {
      if (h > 0 || !isHighest) res += 'lẻ ';
      res += digits[u] + ' ';
    }

    return res.trim();
  }

  const chunks: number[] = [];
  let temp = absN;
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let result = '';
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const isHighest = (i === chunks.length - 1);
      const chunkStr = readThreeDigits(chunk, isHighest);
      result += chunkStr + ' ' + units[i] + ' ';
    }
  }

  result = result.trim();
  if (!result) return 'Không đồng';

  // Viết hoa chữ cái đầu tiên
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' đồng chẵn';
}

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
 */
export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '...';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * MẪU HỢP ĐỒNG LAO ĐỘNG CHUẨN (Mặc định)
 * Theo Bộ luật Lao động 2019 (Luật số 45/2019/QH14)
 */
export const DEFAULT_CONTRACT_TEMPLATE = `
<div class="contract-document text-slate-900 font-serif leading-relaxed text-[13.5px]">
  <!-- Quốc hiệu Tiêu ngữ -->
  <div class="text-center mb-5">
    <p class="font-bold text-base tracking-wider uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="font-bold text-sm underline decoration-1 underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
    <div class="mt-4">
      <h1 class="text-xl font-black uppercase tracking-tight">HỢP ĐỒNG LAO ĐỘNG</h1>
      <p class="text-xs italic text-slate-600 mt-1">Số: HĐLĐ/{{nam_hien_tai}}/{{ma_nv}}</p>
    </div>
  </div>

  <p class="mb-3 text-justify">
    Hôm nay, ngày {{ngay_hien_tai}} tháng {{thang_hien_tai}} năm {{nam_hien_tai}}, tại trụ sở <strong>{{ten_cong_ty}}</strong>, chúng tôi gồm có:
  </p>

  <!-- Bên A -->
  <div class="mb-3.5 space-y-1">
    <p class="font-bold uppercase text-slate-950">BÊN A - NGƯỜI SỬ DỤNG LAO ĐỘNG:</p>
    <div class="grid grid-cols-1 gap-1 pl-4 border-l-2 border-slate-300">
      <p>• Tên doanh nghiệp: <strong>{{ten_cong_ty}}</strong></p>
      <p>• Địa chỉ: {{dia_chi_cong_ty}}</p>
      <p>• Mã số thuế: <strong>{{mst_cong_ty}}</strong> - Điện thoại: {{sdt_cong_ty}}</p>
      <p>• Đại diện bởi: <strong>{{dai_dien_cong_ty}}</strong> - Chức vụ: <strong>Giám đốc</strong></p>
    </div>
  </div>

  <!-- Bên B -->
  <div class="mb-4 space-y-1">
    <p class="font-bold uppercase text-slate-950">BÊN B - NGƯỜI LAO ĐỘNG:</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-4 border-l-2 border-slate-300">
      <p>• Họ và tên: <strong class="uppercase text-slate-950">{{ho_ten}}</strong></p>
      <p>• Giới tính / Quốc tịch: Nam/Nữ - Việt Nam</p>
      <p>• Ngày sinh: <strong>{{ngay_sinh}}</strong></p>
      <p>• Mã nhân viên: <strong>{{ma_nv}}</strong></p>
      <p>• Số CCCD/CMND: <strong class="font-mono">{{so_cccd}}</strong></p>
      <p>• Ngày cấp: {{ngay_cap_cccd}} - Nơi cấp: {{noi_cap_cccd}}</p>
      <p class="sm:col-span-2">• Địa chỉ thường trú: {{dia_chi}}</p>
      <p>• Điện thoại: <strong>{{so_dien_thoai}}</strong></p>
      <p>• Email: {{email}}</p>
      <p>• Mã số thuế TNCN: {{ma_so_thue}}</p>
      <p>• Số tài khoản: {{so_tai_khoan}} - {{ngan_hang}}</p>
    </div>
  </div>

  <p class="mb-3 text-justify italic">
    Hai bên cùng thỏa thuận ký kết Hợp đồng lao động và cam kết thực hiện đúng những điều khoản sau đây:
  </p>

  <!-- Các điều khoản -->
  <div class="space-y-3 text-justify">
    <div>
      <p class="font-bold">Điều 1: Thời hạn và công việc hợp đồng</p>
      <p>1.1. Loại hợp đồng: <strong>{{loai_hop_dong}}</strong>.</p>
      <p>1.2. Thời gian bắt đầu làm việc từ ngày: <strong>{{ngay_vao_lam}}</strong>.</p>
      <p>1.3. Địa điểm làm việc: Trụ sở chính Công ty hoặc theo sự phân công điều động của Ban Giám đốc.</p>
      <p>1.4. Bộ phận công tác: <strong>{{phong_ban}}</strong>.</p>
      <p>1.5. Chức danh / Vị trí: <strong>{{chuc_vu}}</strong>.</p>
      <p>1.6. Nhiệm vụ: Chấp hành sự chỉ đạo chuyên môn, bảo đảm hoàn thành công việc được giao theo đúng quy định và quy chế của Công ty.</p>
    </div>

    <div>
      <p class="font-bold">Điều 2: Chế độ làm việc</p>
      <p>2.1. Thời gian làm việc: 08 giờ/ngày, từ thứ Hai đến thứ Bảy (theo lịch làm việc ban hành của Công ty).</p>
      <p>2.2. Do yêu cầu công việc hoặc thời hạn dự án, Người lao động có thể làm thêm giờ theo thỏa thuận và được chi trả tiền lương làm thêm giờ theo quy định của pháp luật lao động hiện hành.</p>
      <p>2.3. Được cấp phát trang thiết bị, dụng cụ làm việc cần thiết theo tiêu chuẩn chức danh.</p>
    </div>

    <div>
      <p class="font-bold">Điều 3: Tiền lương, phụ cấp và các quyền lợi của Người lao động</p>
      <p>3.1. <strong>Mức lương cơ bản: {{muc_luong}} VNĐ/tháng</strong> (Bằng chữ: <em>{{luong_bang_chu}}</em>).</p>
      <p>3.2. Hình thức trả lương: {{hinh_thuc_luong}} vào ngày thỏa thuận định kỳ hàng tháng.</p>
      <p>3.3. Phụ cấp và tiền thưởng: Được hưởng các chế độ phụ cấp ăn trưa, công tác phí, tiền làm thêm giờ và thưởng hiệu quả công việc theo quy chế tài chính và kết quả sản xuất kinh doanh của Công ty.</p>
      <p>3.4. Chế độ bảo hiểm: Được tham gia Bảo hiểm xã hội (BHXH), Bảo hiểm y tế (BHYT) và Bảo hiểm thất nghiệp (BHTN) theo quy định của pháp luật hiện hành.</p>
      <p>3.5. Chế độ nghỉ ngơi: Được nghỉ các ngày lễ, tết, nghỉ phép năm hưởng nguyên lương theo quy định của Bộ luật Lao động.</p>
    </div>

    <div>
      <p class="font-bold">Điều 4: Nghĩa vụ và quyền hạn của hai bên</p>
      <p>4.1. Người lao động cam kết chấp hành nghiêm túc nội quy lao động, kỷ luật, bảo vệ bí mật kinh doanh, tài sản của Công ty.</p>
      <p>4.2. Người sử dụng lao động có trách nhiệm đảm bảo quyền lợi chính đáng, chi trả lương đầy đủ, đúng hạn và tạo môi trường làm việc an toàn, thuận lợi cho Người lao động.</p>
    </div>

    <div>
      <p class="font-bold">Điều 5: Điều khoản thi hành</p>
      <p>Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện. Hợp đồng có hiệu lực kể từ ngày ký.</p>
    </div>
  </div>

  <!-- Phần ký tên -->
  <div class="mt-8 pt-4 grid grid-cols-2 text-center break-inside-avoid">
    <div>
      <p class="font-bold uppercase">NGƯỜI LAO ĐỘNG (BÊN B)</p>
      <p class="text-xs italic text-slate-500">(Ký và ghi rõ họ tên)</p>
      <div class="h-24"></div>
      <p class="font-bold text-slate-900 uppercase">{{ho_ten}}</p>
    </div>

    <div>
      <p class="font-bold uppercase">ĐẠI DIỆN NGƯỜI SỬ DỤNG LAO ĐỘNG (BÊN A)</p>
      <p class="text-xs italic text-slate-500">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
      <div class="h-24"></div>
      <p class="font-bold text-slate-900 uppercase">{{dai_dien_cong_ty}}</p>
    </div>
  </div>
</div>
`.trim();

/**
 * MẪU BẢN CAM KẾT THU NHẬP (Mẫu 08/CK-TNCN theo TT 111/2013/TT-BTC & TT 80/2021/TT-BTC)
 * Áp dụng cho cá nhân cam kết thu nhập chưa đến mức khấu trừ thuế TNCN
 */
export const DEFAULT_COMMITMENT_TEMPLATE = `
<div class="commitment-document text-slate-900 font-serif leading-relaxed text-[13.5px]">
  <!-- Quốc hiệu Tiêu ngữ -->
  <div class="text-center mb-5">
    <p class="font-bold text-base tracking-wider uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="font-bold text-sm underline decoration-1 underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
    <div class="mt-4">
      <h1 class="text-xl font-black uppercase tracking-tight">BẢN CAM KẾT</h1>
      <p class="text-xs font-semibold text-slate-700 mt-0.5">(Mẫu số: 08/CK-TNCN ban hành kèm theo Thông tư của Bộ Tài chính)</p>
      <p class="text-xs italic text-slate-600">Áp dụng cho cá nhân cư trú nhận thu nhập và ước tính tổng mức thu nhập trong năm chưa đến mức phải nộp thuế TNCN</p>
    </div>
  </div>

  <div class="mb-4 text-center">
    <p class="font-bold text-slate-900">Kính gửi: <span class="uppercase underline">{{ten_cong_ty}}</span></p>
    <p class="text-xs text-slate-600">Mã số thuế đơn vị chi trả: <strong class="font-mono text-slate-900">{{mst_cong_ty}}</strong></p>
  </div>

  <div class="space-y-2 mb-4">
    <p>1. Tên tôi là: <strong class="uppercase text-slate-950 text-sm">{{ho_ten}}</strong></p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      <p>2. Ngày tháng năm sinh: <strong>{{ngay_sinh}}</strong></p>
      <p>3. Mã số nhân viên: <strong>{{ma_nv}}</strong></p>
      <p>4. Mã số thuế cá nhân: <strong>{{ma_so_thue}}</strong></p>
      <p>5. Số điện thoại: <strong>{{so_dien_thoai}}</strong></p>
      <p>6. Số Căn cước công dân (CCCD): <strong class="font-mono">{{so_cccd}}</strong></p>
      <p>• Ngày cấp: {{ngay_cap_cccd}} - Nơi cấp: {{noi_cap_cccd}}</p>
      <p class="sm:col-span-2">7. Địa chỉ nơi ở hiện nay: {{dia_chi}}</p>
      <p>8. Bộ phận công tác: <strong>{{phong_ban}}</strong></p>
      <p>9. Chức vụ / Vị trí: <strong>{{chuc_vu}}</strong></p>
    </div>
  </div>

  <!-- Nội dung cam kết -->
  <div class="space-y-3 text-justify border-t border-b border-slate-200 py-3 mb-4">
    <p class="font-bold uppercase text-slate-950">NỘI DUNG CAM KẾT:</p>
    <p>
      Tôi xin cam kết trong năm tính thuế <strong>{{nam_hien_tai}}</strong>, tôi chỉ có duy nhất nguồn thu nhập do <strong>{{ten_cong_ty}}</strong> (Mã số thuế: <strong>{{mst_cong_ty}}</strong>) chi trả.
    </p>
    <p>
      Căn cứ vào mức giảm trừ gia cảnh của bản thân và người phụ thuộc theo quy định của Luật Thuế thu nhập cá nhân hiện hành, tôi ước tính tổng mức thu nhập chịu thuế trong cả năm <strong>{{nam_hien_tai}}</strong> của tôi chưa đến mức phải nộp thuế thu nhập cá nhân.
    </p>
    <p>
      Vì vậy, tôi làm bản cam kết này đề nghị <strong>{{ten_cong_ty}}</strong> tạm thời <strong>không thực hiện khấu trừ 10% thuế TNCN</strong> đối với các khoản thu nhập tiền lương, tiền công chi trả cho tôi trong năm <strong>{{nam_hien_tai}}</strong>.
    </p>
    <p>
      Cuối năm tính thuế, nếu phát sinh thu nhập ở các nơi khác hoặc tổng thu nhập trong năm đến mức phải nộp thuế, tôi sẽ tự chịu trách nhiệm thực hiện quyết toán thuế với cơ quan Thuế quản lý trực tiếp theo đúng quy định.
    </p>
    <p>
      Tôi cam kết những thông tin kê khai trên đây là hoàn toàn đúng sự thật. Nếu có bất kỳ điều gì sai sót dẫn đến việc truy thu tiền thuế, tiền phạt hoặc tiền chậm nộp của cơ quan Thuế, tôi xin hoàn toàn chịu trách nhiệm trước pháp luật.
    </p>
  </div>

  <!-- Phần ngày tháng và chữ ký -->
  <div class="mt-6 pt-2">
    <div class="text-right italic mb-4">
      Ngày {{ngay_hien_tai}} tháng {{thang_hien_tai}} năm {{nam_hien_tai}}
    </div>

    <div class="grid grid-cols-2 text-center break-inside-avoid">
      <div>
        <p class="font-bold uppercase">ĐẠI DIỆN ĐƠN VỊ CHI TRẢ THU NHẬP</p>
        <p class="text-xs italic text-slate-500">(Xác nhận thông tin & lưu hồ sơ quyết toán)</p>
        <div class="h-24"></div>
        <p class="font-bold text-slate-900 uppercase">{{dai_dien_cong_ty}}</p>
      </div>

      <div>
        <p class="font-bold uppercase">NGƯỜI LÀM CAM KẾT</p>
        <p class="text-xs italic text-slate-500">(Ký và ghi rõ họ tên)</p>
        <div class="h-24"></div>
        <p class="font-bold text-slate-900 uppercase">{{ho_ten}}</p>
      </div>
    </div>
  </div>
</div>
`.trim();

export interface FillTemplateOptions {
  contractType?: string;
  signDate?: string; // YYYY-MM-DD
  departmentName?: string;
  positionName?: string;
  representativeName?: string;
}

/**
 * Hàm thay thế các biến placeholder trong mẫu với thông tin cụ thể của nhân viên và công ty
 */
export function fillDocumentTemplate(
  template: string,
  employee: Employee,
  settings: SystemSettings,
  options: FillTemplateOptions = {}
): string {
  const now = new Date();
  let signDay = String(now.getDate()).padStart(2, '0');
  let signMonth = String(now.getMonth() + 1).padStart(2, '0');
  let signYear = String(now.getFullYear());

  if (options.signDate) {
    const parts = options.signDate.split('-');
    if (parts.length === 3) {
      signYear = parts[0];
      signMonth = parts[1];
      signDay = parts[2];
    }
  }

  const baseSalary = employee.baseSalary || 0;
  const formattedSalary = new Intl.NumberFormat('vi-VN').format(baseSalary);
  const salaryInWords = numberToWordsVietnamese(baseSalary);

  const depName = options.departmentName || 
    settings.departments?.find(d => d.id === employee.departmentId)?.name || 'Bộ phận nghiệp vụ';
  const posName = options.positionName || 
    settings.positions?.find(p => p.id === employee.positionId)?.name || 'Nhân viên';

  let salaryBasisLabel = 'Lương tháng định kỳ';
  if (employee.salaryBasis === 'daily') salaryBasisLabel = 'Lương theo ngày công thực tế';
  else if (employee.salaryBasis === 'hourly') salaryBasisLabel = 'Lương theo số giờ làm việc';
  else if (employee.salaryBasis === 'percent') salaryBasisLabel = `Lương thỏa thuận theo tỷ lệ (${employee.salaryPercent || 100}%)`;

  const contractType = options.contractType || 
    (employee.workStatus === 'probation' 
      ? 'Hợp đồng lao động thử việc (02 tháng)' 
      : 'Hợp đồng lao động xác định thời hạn (12 tháng)');

  const replacements: Record<string, string> = {
    '{{ten_cong_ty}}': settings.companyName || 'CÔNG TY',
    '{{dia_chi_cong_ty}}': settings.address || '',
    '{{mst_cong_ty}}': settings.taxCode || '',
    '{{sdt_cong_ty}}': settings.phoneNumber || '',
    '{{dai_dien_cong_ty}}': options.representativeName || settings.directorName || 'Giám đốc',

    '{{ho_ten}}': (employee.fullName || '').toUpperCase(),
    '{{ma_nv}}': employee.employeeCode || '',
    '{{so_cccd}}': employee.idCardNumber || 'Chưa cập nhật',
    '{{ngay_cap_cccd}}': formatDateVN(employee.issueDate),
    '{{noi_cap_cccd}}': employee.issuePlace || 'Cục Cảnh sát QLHC về TTXH',
    '{{ngay_sinh}}': formatDateVN(employee.birthDate),
    '{{dia_chi}}': employee.address || 'Chưa cập nhật',
    '{{so_dien_thoai}}': employee.phoneNumber || 'Chưa cập nhật',
    '{{email}}': employee.email || 'Chưa cập nhật',
    '{{ma_so_thue}}': employee.taxId || employee.idCardNumber || 'Chưa cập nhật',
    '{{so_tai_khoan}}': employee.bankAccount || 'Tiền mặt',
    '{{ngan_hang}}': employee.bankName || '',

    '{{phong_ban}}': depName,
    '{{chuc_vu}}': posName,
    '{{ngay_vao_lam}}': formatDateVN(employee.startDate),
    '{{loai_hop_dong}}': contractType,
    '{{muc_luong}}': formattedSalary,
    '{{luong_bang_chu}}': salaryInWords,
    '{{hinh_thuc_luong}}': salaryBasisLabel,

    '{{ngay_ky}}': `${signDay}/${signMonth}/${signYear}`,
    '{{ngay_hien_tai}}': signDay,
    '{{thang_hien_tai}}': signMonth,
    '{{nam_hien_tai}}': signYear,
  };

  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    // Thay thế toàn bộ occurrences
    output = output.split(key).join(value);
  }

  return output;
}

const STORAGE_KEY_CONTRACT = 'hr_salary_custom_contract_template';
const STORAGE_KEY_COMMITMENT = 'hr_salary_custom_commitment_template';

/**
 * Lấy mẫu văn bản đã lưu hoặc mặc định
 */
export function getSavedContractTemplate(settings?: SystemSettings): string {
  try {
    if (settings?.documentTemplates?.contractTemplate) {
      return settings.documentTemplates.contractTemplate;
    }
    const saved = localStorage.getItem(STORAGE_KEY_CONTRACT);
    if (saved && saved.trim()) return saved;
  } catch (e) {
    console.warn('Lỗi đọc mẫu hợp đồng:', e);
  }
  return DEFAULT_CONTRACT_TEMPLATE;
}

export function getSavedCommitmentTemplate(settings?: SystemSettings): string {
  try {
    if (settings?.documentTemplates?.commitmentTemplate) {
      return settings.documentTemplates.commitmentTemplate;
    }
    const saved = localStorage.getItem(STORAGE_KEY_COMMITMENT);
    if (saved && saved.trim()) return saved;
  } catch (e) {
    console.warn('Lỗi đọc mẫu cam kết:', e);
  }
  return DEFAULT_COMMITMENT_TEMPLATE;
}

/**
 * Lưu mẫu văn bản tùy chỉnh
 */
export function saveContractTemplate(template: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONTRACT, template);
  } catch (e) {
    console.warn('Lỗi lưu mẫu hợp đồng:', e);
  }
}

export function saveCommitmentTemplate(template: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMMITMENT, template);
  } catch (e) {
    console.warn('Lỗi lưu mẫu cam kết:', e);
  }
}

export function resetContractTemplate(): string {
  try {
    localStorage.removeItem(STORAGE_KEY_CONTRACT);
  } catch (e) {}
  return DEFAULT_CONTRACT_TEMPLATE;
}

export function resetCommitmentTemplate(): string {
  try {
    localStorage.removeItem(STORAGE_KEY_COMMITMENT);
  } catch (e) {}
  return DEFAULT_COMMITMENT_TEMPLATE;
}
