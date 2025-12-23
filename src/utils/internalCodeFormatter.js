// دوال تنسيق الكود الداخلي للمشروع

/**
 * استخراج الأرقام فقط من النص
 */
export const toDigits = (s) => (s || "").replace(/[^0-9]/g, "");

/**
 * تنسيق الكود الداخلي: M + أرقام فقط (حد أقصى 40 حرف)
 */
export const formatInternalCode = (raw) => {
  const digits = toDigits(raw);
  return ("M" + digits).slice(0, 40);
};

/**
 * التحقق من أن آخر رقم فردي (1,3,5,7,9)
 */
export const isLastDigitOdd = (code) => {
  const last = code.replace(/\D/g, "").slice(-1);
  return ["1", "3", "5", "7", "9"].includes(last);
};

