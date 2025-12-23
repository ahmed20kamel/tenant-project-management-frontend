// دوال مساعدة للتواريخ
import { toInputDate, toIsoDate } from "./formatters";

/**
 * تحويل الأرقام العربية إلى إنجليزية
 */
export const normalizeDigits = (s) =>
  String(s ?? "")
    .replace(/[\u0660-\u0669]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .trim();

/**
 * التحقق من أن التاريخ هو placeholder
 */
export const isPlaceholderDate = (s) => {
  const str = String(s).trim();
  return /^dd\s*[\/-]\s*mm\s*[\/-]\s*yyyy$/i.test(str);
};

/**
 * تحويل التاريخ إلى تنسيق input مع معالجة الأرقام العربية
 */
export const toInputDateUnified = (d) => {
  if (!d) return "";
  const s = normalizeDigits(d);
  if (!s || isPlaceholderDate(s)) return "";
  return toInputDate(s);
};

/**
 * تحويل التاريخ إلى تنسيق API مع معالجة الأرقام العربية
 */
export const toApiDateUnified = (d) => {
  if (!d) return "";
  const s = normalizeDigits(d);
  if (!s || isPlaceholderDate(s)) return "";
  return toIsoDate(s);
};

