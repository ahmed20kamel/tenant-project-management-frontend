// Helpers shared بين ملخص العقد المالي وصفحة الهوم

// تحويل أي قيمة رقمية لصيغة Number آمنة
export const n = (v) => {
  if (v === undefined || v === null || v === "" || Number.isNaN(v)) return 0;
  const x = parseFloat(String(v).replace(/[^\d.+-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export const round = (v) => Math.round(n(v));

// تفكيك أتعاب الاستشاري من مبلغ إجمالي شامِل أتعاب الاستشاري
// يرجع: { fee, net }  => fee = أتعاب الاستشاري، net = حصة المقاول بعد خصم الأتعاب
export const feeInclusive = (gross, pct) => {
  const g = n(gross);
  const r = n(pct);
  if (g <= 0 || r <= 0) return { fee: 0, net: g };
  const fee = round(g * (r / (100 + r)));
  return { fee, net: g - fee };
};

// تجميع كل أرقام ملخص العقد المالي لعقد واحد
// نفس منطق ContractFinancialSummary لكن بدون أي UI
export function computeContractSummary(contract) {
  if (!contract || typeof contract !== "object") return null;

  const c = contract;

  const grossTotal = n(c.total_project_value);
  if (grossTotal <= 0) {
    return null;
  }

  const grossBank =
    c.contract_classification === "housing_loan_program"
      ? n(c.total_bank_value)
      : 0;

  // ✅ حساب حصة المالك: للقرض السكني = الفرق، للتمويل الخاص = الإجمالي
  const calculatedOwner = c.contract_classification === "housing_loan_program" 
    ? Math.max(0, grossTotal - grossBank)  // ✅ للقرض السكني: الفرق
    : grossTotal;  // ✅ للتمويل الخاص: الإجمالي كامل
  
  // ✅ استخدام القيمة المحفوظة إذا كانت صحيحة (تساوي القيمة المحسوبة)، وإلا استخدام القيمة المحسوبة
  const savedOwner = n(c.total_owner_value);
  const grossOwner = (Math.abs(savedOwner - calculatedOwner) < 0.01) ? savedOwner : calculatedOwner;

  const ownerIncludes =
    c.owner_includes_consultant === true ||
    c.owner_includes_consultant === "yes";

  const bankIncludes =
    c.bank_includes_consultant === true ||
    c.bank_includes_consultant === "yes";

  const ownerPct = ownerIncludes
    ? n(c.owner_fee_design_percent) +
      n(c.owner_fee_supervision_percent) +
      (c.owner_fee_extra_mode === "percent" ? n(c.owner_fee_extra_value) : 0)
    : 0;

  const bankPct = bankIncludes
    ? n(c.bank_fee_design_percent) +
      n(c.bank_fee_supervision_percent) +
      (c.bank_fee_extra_mode === "percent" ? n(c.bank_fee_extra_value) : 0)
    : 0;

  // ✅ حساب totalPct للإجمالي فقط (للعرض في الجدول الكلي)
  // إذا كانت النسب متساوية، نستخدمها، وإلا نستخدم المتوسط المرجح
  let totalPct = 0;
  if (ownerPct > 0 && bankPct > 0 && Math.abs(ownerPct - bankPct) < 1e-6) {
    // النسب متساوية
    totalPct = ownerPct;
  } else if (ownerPct > 0 && bankPct > 0) {
    // النسب مختلفة - نحسب المتوسط المرجح بناءً على المبالغ
    const totalFees = (grossOwner * ownerPct / (100 + ownerPct)) + (grossBank * bankPct / (100 + bankPct));
    const totalNet = grossTotal - totalFees;
    if (totalNet > 0) {
      totalPct = (totalFees / totalNet) * 100;
    }
  } else {
    // واحد فقط له نسبة
    totalPct = ownerPct || bankPct || 0;
  }

  // ✅ تفكيك الأتعاب من الإجماليات - كل جزء يستخدم نسبته الخاصة فقط
  const total = feeInclusive(grossTotal, totalPct);
  const bank = feeInclusive(grossBank, bankPct); // ✅ استخدام bankPct مباشرة فقط
  const owner = feeInclusive(grossOwner, ownerPct); // ✅ استخدام ownerPct مباشرة فقط

  return {
    contract: c,
    grossTotal,
    grossBank,
    grossOwner,
    ownerPct,
    bankPct,
    totalPct,
    total,
    bank,
    owner,
  };
}

// حساب المبلغ شامل ضريبة ٥٪ (يمكن تعديل النسبة من البرامز لو احتجت)
export const withVatTotal = (amount, rate = 0.05) => {
  const base = n(amount);
  const vat = round(base * rate);
  return base + vat;
};


