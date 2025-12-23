// src/utils/contractMath.js

// تحويل النصوص لأرقام آمنة (يتجاهل الرموز)
export const toNum = (v) => {
  const x = parseFloat(String(v ?? "").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

// حساب أتعاب الاستشاري عندما تكون النسبة شاملة داخل المبلغ
// الصيغة: fee = gross * r / (100 + r)
export function inclusiveFee(gross, percent) {
  const g = toNum(gross);
  const r = toNum(percent);
  if (g <= 0 || r <= 0) return { fee: 0, net: g };
  const fee = Math.round(g * (r / (100 + r)));
  return { fee, net: g - fee };
}
