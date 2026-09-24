import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  Clock, 
  Utensils, 
  Shirt, 
  Phone, 
  Car, 
  FileText, 
  Info,
  AlertCircle
} from 'lucide-react';
import { TaxExemptionRules, SystemSettings } from '../types';
import { DEFAULT_TAX_EXEMPTION_RULES, formatVND } from '../utils/payrollCalculator';

interface EditTaxExemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  onSave: (rules: TaxExemptionRules) => void;
}

export const EditTaxExemptionModal: React.FC<EditTaxExemptionModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  if (!isOpen) return null;

  const [rules, setRules] = useState<TaxExemptionRules>(() => {
    return settings.taxExemptionRules 
      ? JSON.parse(JSON.stringify(settings.taxExemptionRules))
      : JSON.parse(JSON.stringify(DEFAULT_TAX_EXEMPTION_RULES));
  });

  const handleReset = () => {
    setRules(JSON.parse(JSON.stringify(DEFAULT_TAX_EXEMPTION_RULES)));
  };

  const handleSave = () => {
    onSave(rules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Thiết Lập Thu Nhập Miễn Thuế TNCN</h3>
              <p className="text-xs text-emerald-200/80">
                Linh hoạt tùy chỉnh quy chế miễn thuế/chịu thuế: Tăng ca, ăn ca tiền mặt, phụ cấp trang phục, điện thoại, xăng xe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Do các quy định pháp luật về thuế thu nhập cá nhân có thể thay đổi hoặc doanh nghiệp có quy chế tài chính nội bộ riêng, bạn có thể điều chỉnh các tiêu chí xác định khoản thu nhập được miễn thuế hoặc chịu thuế dưới đây. Toàn bộ bảng tính lương và báo cáo thuế sẽ tự động cập nhật theo cấu hình mới.
            </p>
          </div>

          {/* 1. LÀM THÊM GIỜ (TĂNG CA / OT) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">1. Tiền Làm Thêm Giờ (Tăng Ca / Overtime)</h4>
              </div>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Bộ luật Lao động 2019 & Luật Thuế TNCN
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="otExemptMode"
                  value="differential_only"
                  checked={rules.otExemptMode === 'differential_only'}
                  onChange={() => setRules({ ...rules, otExemptMode: 'differential_only' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Chỉ miễn thuế phần thu nhập chênh lệch cao hơn lương ngày thường (Chuẩn hiện hành)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    • Phần trả tương ứng 100% đơn giá chuẩn là chịu thuế.<br/>
                    • Phần dôi thêm vượt mức (50% ngày thường, 100% ngày nghỉ tuần, 200% ngày lễ) trong định mức được miễn thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="otExemptMode"
                  value="fully_exempt"
                  checked={rules.otExemptMode === 'fully_exempt'}
                  onChange={() => setRules({ ...rules, otExemptMode: 'fully_exempt' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-emerald-800 block">
                    Miễn thuế 100% tiền làm thêm giờ trong hạn mức (Ưu đãi đặc thù)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Toàn bộ tiền lương làm thêm giờ trong hạn mức đều được miễn thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="otExemptMode"
                  value="fully_taxable"
                  checked={rules.otExemptMode === 'fully_taxable'}
                  onChange={() => setRules({ ...rules, otExemptMode: 'fully_taxable' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Tính thuế 100% toàn bộ tiền làm thêm giờ (Không áp dụng miễn thuế)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Toàn bộ tiền làm thêm giờ được tính vào thu nhập chịu thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="otExemptMode"
                  value="custom_rate"
                  checked={rules.otExemptMode === 'custom_rate'}
                  onChange={() => setRules({ ...rules, otExemptMode: 'custom_rate' })}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Miễn thuế theo tỷ lệ phần trăm tùy biến (%):
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={rules.otExemptMode !== 'custom_rate'}
                      value={rules.otCustomExemptRate ?? 50}
                      onChange={e => setRules({ ...rules, otCustomExemptRate: Number(e.target.value) })}
                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Áp dụng tỷ lệ miễn thuế cố định trên tổng tiền làm thêm giờ thực nhận.
                  </span>
                </div>
              </label>
            </div>

            {/* Trần giờ làm thêm & quy định tính thuế phần vượt trần */}
            <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Quy định khống chế trần làm thêm giờ (40h/tháng & 200h/năm)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Căn cứ Điều 107 Bộ luật Lao động 2019 và chính sách thuế TNCN: Thu nhập tăng ca bị tính thuế TNCN đối với phần vượt <strong>40 giờ/tháng</strong> và <strong>200 giờ/năm</strong>.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Mức trần giờ/tháng:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={rules.otMonthlyHoursCap ?? 40}
                      onChange={e => setRules({ ...rules, otMonthlyHoursCap: Math.max(0, Number(e.target.value)) })}
                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                    <span className="font-bold text-slate-600 text-xs">giờ/tháng</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700">Mức trần giờ/năm:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={rules.otYearlyHoursCap ?? 200}
                      onChange={e => setRules({ ...rules, otYearlyHoursCap: Math.max(0, Number(e.target.value)) })}
                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                    <span className="font-bold text-slate-600 text-xs">giờ/năm</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.otCapExceededTaxable !== false}
                  onChange={e => setRules({ ...rules, otCapExceededTaxable: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-800 text-xs">
                  Phần tiền làm thêm vượt 40 giờ/tháng hoặc 200 giờ/năm bị tính thuế TNCN 100% (không được miễn thuế)
                </span>
              </label>
            </div>
          </div>

          {/* 2. MỨC ĂN CA CHI TRẢ BẰNG TIỀN MẶT */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-900 text-sm">2. Mức Ăn Ca / Ăn Trưa Chi Trả Bằng Tiền Mặt</h4>
              </div>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Thông tư 26/2016/TT-BLĐTBXH
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="mealExemptMode"
                  value="capped"
                  checked={rules.mealExemptMode === 'capped'}
                  onChange={() => setRules({ ...rules, mealExemptMode: 'capped' })}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Khống chế mức trần miễn thuế tối đa:
                    </span>
                    <input
                      type="number"
                      step={50000}
                      min={0}
                      disabled={rules.mealExemptMode !== 'capped'}
                      value={rules.mealExemptMonthlyCap}
                      onChange={e => setRules({ ...rules, mealExemptMonthlyCap: Math.max(0, Number(e.target.value)) })}
                      className="w-36 px-2.5 py-1 border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-100"
                    />
                    <span className="font-semibold text-slate-700">VNĐ/người/tháng</span>
                    <span className="font-mono text-emerald-700 text-[11px] font-bold">
                      ({formatVND(rules.mealExemptMonthlyCap)})
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] block mt-1">
                    • Mức quy định chuyển đổi từ 720.000 đ/tháng thành <strong>1.200.000 đ/tháng</strong>.<br/>
                    • Phần chi trả thực tế vượt mức trần này sẽ tự động chuyển thành thu nhập chịu thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="mealExemptMode"
                  value="fully_exempt"
                  checked={rules.mealExemptMode === 'fully_exempt'}
                  onChange={() => setRules({ ...rules, mealExemptMode: 'fully_exempt' })}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-emerald-800 block">
                    Miễn thuế toàn bộ tiền ăn ca chi bằng tiền (Không giới hạn trần)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Toàn bộ tiền ăn ca chi trả cho người lao động được miễn thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="mealExemptMode"
                  value="fully_taxable"
                  checked={rules.mealExemptMode === 'fully_taxable'}
                  onChange={() => setRules({ ...rules, mealExemptMode: 'fully_taxable' })}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Tính thuế 100% tiền ăn ca bằng tiền (Không miễn thuế)
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Toàn bộ số tiền ăn ca chi bằng tiền mặt được cộng vào thu nhập chịu thuế.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 3. PHỤ CẤP TRANG PHỤC */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-teal-600" />
                <h4 className="font-bold text-slate-900 text-sm">3. Phụ Cấp Trang Phục Chi Trả Bằng Tiền</h4>
              </div>
              <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Khoản 2 Điều 2 TT 111/2013/TT-BTC
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="uniformExemptMode"
                  value="capped"
                  checked={rules.uniformExemptMode === 'capped'}
                  onChange={() => setRules({ ...rules, uniformExemptMode: 'capped' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Khống chế mức trần miễn thuế:
                    </span>
                    <input
                      type="number"
                      step={50000}
                      min={0}
                      disabled={rules.uniformExemptMode !== 'capped'}
                      value={rules.uniformExemptMonthlyCap}
                      onChange={e => setRules({ ...rules, uniformExemptMonthlyCap: Math.max(0, Number(e.target.value)) })}
                      className="w-36 px-2.5 py-1 border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100"
                    />
                    <span className="font-semibold text-slate-700">VNĐ/người/tháng</span>
                    <span className="font-mono text-emerald-700 text-[11px] font-bold">
                      ({formatVND(rules.uniformExemptMonthlyCap)})
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] block mt-1">
                    • Mức quy định hiện hành: tối đa không quá <strong>5,000,000 đ/người/năm</strong> (tương đương khoảng <strong>416,667 đ/tháng</strong>).<br/>
                    • Phần chi vượt quá mức trần này phải tính vào thu nhập chịu thuế TNCN.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="uniformExemptMode"
                  value="fully_exempt"
                  checked={rules.uniformExemptMode === 'fully_exempt'}
                  onChange={() => setRules({ ...rules, uniformExemptMode: 'fully_exempt' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="font-bold text-emerald-800 block">
                    Miễn thuế toàn bộ phụ cấp trang phục bằng tiền
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input
                  type="radio"
                  name="uniformExemptMode"
                  value="fully_taxable"
                  checked={rules.uniformExemptMode === 'fully_taxable'}
                  onChange={() => setRules({ ...rules, uniformExemptMode: 'fully_taxable' })}
                  className="mt-0.5 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Tính thuế toàn bộ phụ cấp trang phục chi bằng tiền
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 4 & 5. ĐIỆN THOẠI & XĂNG XE / CÔNG TÁC PHÍ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Điện thoại */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Phone className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">4. Phụ Cấp Điện Thoại / Liên Lạc</h4>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="phoneExemptMode"
                    value="company_policy"
                    checked={rules.phoneExemptMode === 'company_policy'}
                    onChange={() => setRules({ ...rules, phoneExemptMode: 'company_policy' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Theo quy chế khoán chi công ty</span>
                    <span className="text-[10px] text-slate-500">Miễn thuế nếu có quy định rõ trong quy chế</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="phoneExemptMode"
                    value="capped"
                    checked={rules.phoneExemptMode === 'capped'}
                    onChange={() => setRules({ ...rules, phoneExemptMode: 'capped' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Mức trần:</span>
                      <input
                        type="number"
                        step={50000}
                        disabled={rules.phoneExemptMode !== 'capped'}
                        value={rules.phoneExemptMonthlyCap ?? 500000}
                        onChange={e => setRules({ ...rules, phoneExemptMonthlyCap: Math.max(0, Number(e.target.value)) })}
                        className="w-28 px-2 py-0.5 border border-slate-300 rounded font-mono text-right text-xs"
                      />
                      <span className="text-[11px] text-slate-600">đ/tháng</span>
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="phoneExemptMode"
                    value="fully_taxable"
                    checked={rules.phoneExemptMode === 'fully_taxable'}
                    onChange={() => setRules({ ...rules, phoneExemptMode: 'fully_taxable' })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-900">Tính thuế toàn bộ</span>
                </label>
              </div>
            </div>

            {/* Xăng xe / Công tác */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Car className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-sm">5. Phụ Cấp Xăng Xe / Đi Lại / Công Tác</h4>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="travelExemptMode"
                    value="company_policy"
                    checked={rules.travelExemptMode === 'company_policy'}
                    onChange={() => setRules({ ...rules, travelExemptMode: 'company_policy' })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Theo quy chế công tác phí</span>
                    <span className="text-[10px] text-slate-500">Miễn thuế theo định mức quy chế khoán chi</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="travelExemptMode"
                    value="capped"
                    checked={rules.travelExemptMode === 'capped'}
                    onChange={() => setRules({ ...rules, travelExemptMode: 'capped' })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Mức trần:</span>
                      <input
                        type="number"
                        step={100000}
                        disabled={rules.travelExemptMode !== 'capped'}
                        value={rules.travelExemptMonthlyCap ?? 1000000}
                        onChange={e => setRules({ ...rules, travelExemptMonthlyCap: Math.max(0, Number(e.target.value)) })}
                        className="w-28 px-2 py-0.5 border border-slate-300 rounded font-mono text-right text-xs"
                      />
                      <span className="text-[11px] text-slate-600">đ/tháng</span>
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="travelExemptMode"
                    value="fully_taxable"
                    checked={rules.travelExemptMode === 'fully_taxable'}
                    onChange={() => setRules({ ...rules, travelExemptMode: 'fully_taxable' })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-900">Tính thuế toàn bộ</span>
                </label>
              </div>
            </div>
          </div>

          {/* 6. CĂN CỨ PHÁP LÝ & GHI CHÚ QUY CHẾ */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Căn Cứ Pháp Lý & Quy Chế Nội Bộ Áp Dụng:</span>
            </label>
            <input
              type="text"
              value={rules.legalNote || ''}
              onChange={e => setRules({ ...rules, legalNote: e.target.value })}
              placeholder="Ví dụ: Theo Luật Thuế TNCN, TT 111/2013/TT-BTC, TT 26/2016/TT-BLĐTBXH và Quy chế số 01/2026/QCTC"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục chuẩn pháp luật hiện hành</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Thiết Lập Miễn Thuế</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
