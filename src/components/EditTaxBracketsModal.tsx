import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sliders, 
  Calculator, 
  Layers, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { TaxBracket, SystemSettings, PayrollRecord } from '../types';
import { 
  DEFAULT_TAX_BRACKETS, 
  PROPOSED_5_TAX_BRACKETS, 
  formatVND, 
  calculateTaxBreakdown, 
  calculatePersonalIncomeTax 
} from '../utils/payrollCalculator';

interface EditTaxBracketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
  payrolls: PayrollRecord[];
  onSave: (updatedBrackets: TaxBracket[]) => void;
}

export const EditTaxBracketsModal: React.FC<EditTaxBracketsModalProps> = ({
  isOpen,
  onClose,
  settings,
  payrolls,
  onSave
}) => {
  if (!isOpen) return null;

  // Clone existing brackets or use default
  const [brackets, setBrackets] = useState<TaxBracket[]>(() => {
    const existing = settings.taxBrackets;
    if (existing && existing.length > 0) {
      return JSON.parse(JSON.stringify(existing));
    }
    return JSON.parse(JSON.stringify(DEFAULT_TAX_BRACKETS));
  });

  const [testIncome, setTestIncome] = useState<number>(25000000); // 25 million VND for test calculator
  const [activePreset, setActivePreset] = useState<'current_7' | 'reform_5' | 'custom'>('custom');

  // Handle row changes
  const handleUpdateBracket = (index: number, field: keyof TaxBracket, value: any) => {
    setBrackets(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setActivePreset('custom');
  };

  // Add new bracket
  const handleAddBracket = () => {
    setBrackets(prev => {
      const last = prev[prev.length - 1];
      const newMin = last ? (last.max !== null && last.max !== undefined && last.max > 0 ? last.max : (last.min + 20000000)) : 0;
      const newBracketNum = prev.length + 1;
      
      // Update the previous last bracket to have a finite max if it was null
      let updatedPrev = [...prev];
      if (last && (last.max === null || last.max === undefined)) {
        updatedPrev[updatedPrev.length - 1] = {
          ...last,
          max: newMin
        };
      }

      return [
        ...updatedPrev,
        {
          bracket: newBracketNum,
          name: `Bậc ${newBracketNum}`,
          min: newMin,
          max: null,
          rate: Math.min(0.4, (last ? (last.rate > 1 ? last.rate / 100 : last.rate) + 0.05 : 0.05)),
          description: `Trên ${formatVND(newMin)}`
        }
      ];
    });
    setActivePreset('custom');
  };

  // Delete bracket
  const handleDeleteBracket = (index: number) => {
    if (brackets.length <= 1) {
      alert('Biểu thuế phải có ít nhất 1 bậc!');
      return;
    }
    setBrackets(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index bracket numbers
      return filtered.map((b, i) => ({
        ...b,
        bracket: i + 1,
        name: `Bậc ${i + 1}`,
        max: i === filtered.length - 1 ? null : b.max
      }));
    });
    setActivePreset('custom');
  };

  // Apply presets
  const handleApplyPreset = (type: 'current_7' | 'reform_5') => {
    if (type === 'current_7') {
      setBrackets(JSON.parse(JSON.stringify(DEFAULT_TAX_BRACKETS)));
      setActivePreset('current_7');
    } else {
      setBrackets(JSON.parse(JSON.stringify(PROPOSED_5_TAX_BRACKETS)));
      setActivePreset('reform_5');
    }
  };

  // Auto-align continuous intervals
  const handleAutoAlign = () => {
    setBrackets(prev => {
      let currentMin = 0;
      return prev.map((b, i) => {
        const minVal = currentMin;
        const maxVal = i === prev.length - 1 ? null : (b.max && b.max > minVal ? b.max : minVal + 10000000);
        currentMin = maxVal || minVal + 10000000;
        return {
          ...b,
          bracket: i + 1,
          name: `Bậc ${i + 1}`,
          min: minVal,
          max: maxVal,
          description: maxVal ? `Từ ${formatVND(minVal)} đến ${formatVND(maxVal)}` : `Trên ${formatVND(minVal)}`
        };
      });
    });
  };

  // Impact on current payrolls
  const currentTotalTax = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + p.personalIncomeTax, 0);
  }, [payrolls]);

  const simulatedTotalTax = useMemo(() => {
    return payrolls.reduce((sum, p) => {
      return sum + calculatePersonalIncomeTax(p.assessableIncome, brackets);
    }, 0);
  }, [payrolls, brackets]);

  const simulatedTaxPayers = useMemo(() => {
    return payrolls.filter(p => calculatePersonalIncomeTax(p.assessableIncome, brackets) > 0).length;
  }, [payrolls, brackets]);

  // Test calculator breakdown
  const testBreakdown = useMemo(() => {
    return calculateTaxBreakdown(testIncome, brackets);
  }, [testIncome, brackets]);

  // Validate brackets
  const validationError = useMemo(() => {
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      if (b.min < 0) return `Bậc ${b.bracket}: Ngưỡng bắt đầu không được âm`;
      if (b.max !== null && b.max !== undefined && b.max <= b.min) {
        return `Bậc ${b.bracket}: Ngưỡng kết thúc phải lớn hơn ngưỡng bắt đầu`;
      }
      const rateVal = b.rate > 1 ? b.rate / 100 : b.rate;
      if (rateVal < 0 || rateVal > 1) {
        return `Bậc ${b.bracket}: Thuế suất phải từ 0% đến 100%`;
      }
    }
    return null;
  }, [brackets]);

  const handleSave = () => {
    if (validationError) {
      alert(`Không thể lưu cấu hình:\n${validationError}`);
      return;
    }
    onSave(brackets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Chỉnh Sửa Biểu Thuế Lũy Tiến Từng Phần (TNCN)</h3>
              <p className="text-xs text-slate-300">
                Tùy chỉnh số bậc, ngưỡng thu nhập tính thuế và thuế suất áp dụng cho thu nhập từ tiền lương, tiền công
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Preset Buttons & Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 mr-1">
                <Layers className="w-4 h-4 text-indigo-600" />
                Mẫu thiết lập nhanh:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('current_7')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border ${
                  activePreset === 'current_7'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Chuẩn Luật Hiện Hành (7 Bậc - TT 111/2013)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('reform_5')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer border ${
                  activePreset === 'reform_5'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Dự Thảo Cải Cách (5 Bậc Rút Gọn)
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleAutoAlign}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-semibold transition-colors cursor-pointer"
                title="Tự động đồng bộ ngưỡng bắt đầu của bậc sau khớp với kết thúc của bậc trước"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Chuẩn hóa liên tục</span>
              </button>
              <button
                type="button"
                onClick={handleAddBracket}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm bậc mới</span>
              </button>
            </div>
          </div>

          {/* Validation Warning Alert */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Editable Tax Brackets Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Bảng thông số Biểu thuế lũy tiến ({brackets.length} bậc)
              </span>
              <span className="text-xs text-slate-500">
                *Đơn vị tiền tính: Đồng Việt Nam (VNĐ)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3 w-14 text-center">Bậc</th>
                    <th className="p-3 w-28">Tên Bậc</th>
                    <th className="p-3 min-w-[160px]">Thu Nhập Tính Thuế Từ (VNĐ)</th>
                    <th className="p-3 min-w-[200px]">Đến (VNĐ)</th>
                    <th className="p-3 w-32">Thuế Suất (%)</th>
                    <th className="p-3 min-w-[150px]">Diễn giải</th>
                    <th className="p-3 w-16 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brackets.map((b, idx) => {
                    const isLast = idx === brackets.length - 1;
                    const isInfinity = b.max === null || b.max === undefined;
                    const ratePercent = b.rate > 1 ? b.rate : Math.round(b.rate * 100);

                    return (
                      <tr key={b.bracket} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-700 bg-slate-50/50">
                          {b.bracket}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={b.name}
                            onChange={e => handleUpdateBracket(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-3 font-mono">
                          <input
                            type="number"
                            step="1000000"
                            min="0"
                            value={b.min}
                            onChange={e => handleUpdateBracket(idx, 'min', Math.max(0, Number(e.target.value)))}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                          />
                          <div className="text-[10px] text-slate-400 mt-0.5 text-right font-sans">
                            {formatVND(b.min)}
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="1000000"
                              min={b.min + 1}
                              disabled={isInfinity}
                              value={isInfinity ? '' : b.max || ''}
                              onChange={e => handleUpdateBracket(idx, 'max', e.target.value === '' ? null : Number(e.target.value))}
                              placeholder="Vô cùng (Không giới hạn)"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-right disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <label className="flex items-center gap-1 text-[11px] font-sans text-slate-600 whitespace-nowrap cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isInfinity}
                                onChange={e => {
                                  if (e.target.checked) {
                                    handleUpdateBracket(idx, 'max', null);
                                  } else {
                                    handleUpdateBracket(idx, 'max', b.min + 10000000);
                                  }
                                }}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Vô cùng</span>
                            </label>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 text-right font-sans">
                            {isInfinity ? 'Không giới hạn trên' : formatVND(b.max || 0)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={ratePercent}
                              onChange={e => {
                                const val = Number(e.target.value);
                                handleUpdateBracket(idx, 'rate', val / 100);
                              }}
                              className="w-full pr-7 pl-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 text-right focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400 pointer-events-none">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={b.description || ''}
                            onChange={e => handleUpdateBracket(idx, 'description', e.target.value)}
                            placeholder="Mô tả tóm tắt"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBracket(idx)}
                            disabled={brackets.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Xóa bậc này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Impact Comparison on Current Company Payroll */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Số người nộp thuế trong tháng:</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-base font-bold text-slate-900">{simulatedTaxPayers} người</span>
                <span className="text-slate-500 font-normal">/ {payrolls.length} nhân viên</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block">Tổng thuế TNCN theo biểu hiện hành:</span>
              <div className="mt-1 font-mono font-bold text-slate-700 text-sm">
                {formatVND(currentTotalTax)}
              </div>
            </div>
            <div>
              <span className="text-indigo-900 block font-semibold">Tổng thuế TNCN sau khi áp dụng biểu mới:</span>
              <div className="mt-1 flex items-baseline gap-2 font-mono">
                <span className="text-base font-black text-indigo-700">{formatVND(simulatedTotalTax)}</span>
                <span className={`text-[11px] font-bold ${simulatedTotalTax <= currentTotalTax ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ({simulatedTotalTax >= currentTotalTax ? '+' : ''}{formatVND(simulatedTotalTax - currentTotalTax)})
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Test Calculator for Users to Verify Any Income */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Công Cụ Thử Nghiệm Thuế: Nhập Thu Nhập Tính Thuế (TNTT) Bất Kỳ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 font-medium">Thử nghiệm mức TNTT:</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000000"
                    min="0"
                    value={testIncome}
                    onChange={e => setTestIncome(Math.max(0, Number(e.target.value)))}
                    className="w-36 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  Thuế phải nộp: {formatVND(testBreakdown.totalTax)}
                </span>
              </div>
            </div>

            {/* Test Breakdown Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {testBreakdown.brackets.map(b => (
                <div 
                  key={b.bracket}
                  className={`p-2 rounded-lg border text-center ${
                    b.taxableInBracket > 0 
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs' 
                      : 'bg-white border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="text-[10px] font-bold">{b.name} ({Math.round(b.rate * 100)}%)</div>
                  <div className="text-[11px] font-mono font-semibold mt-0.5">
                    {formatVND(b.taxAmount)}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    TNTT: {formatVND(b.taxableInBracket)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleApplyPreset('current_7')}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục chuẩn 7 bậc</span>
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
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Áp Dụng Biểu Thuế Này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
