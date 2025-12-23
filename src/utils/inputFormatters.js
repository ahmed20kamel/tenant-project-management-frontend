// دوال تنسيق الإدخال

/**
 * تحويل النص إلى UPPERCASE
 * @param {string} value - القيمة المراد تحويلها
 * @returns {string} - القيمة بالأحرف الكبيرة
 */
export const toUppercase = (value) => {
  if (!value) return "";
  return String(value).toUpperCase();
};

/**
 * تنسيق اسم المالك - Capitalize كل كلمة، إنجليزية فقط
 * @param {string} value - القيمة المراد تنسيقها
 * @returns {string} - الاسم المنسق
 */
export const formatOwnerName = (value) => {
  if (!value) return "";
  // إزالة أي حروف غير إنجليزية
  const englishOnly = String(value).replace(/[^a-zA-Z\s]/g, "");
  // Capitalize كل كلمة
  return englishOnly
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * تنسيق رقم الهاتف الإماراتي - +971 + 9 أرقام
 * @param {string} value - القيمة المراد تنسيقها
 * @returns {string} - رقم الهاتف المنسق
 */
export const formatUAEPhone = (value) => {
  if (!value) return "";
  
  // إزالة أي شيء غير رقم
  let digits = String(value).replace(/\D/g, "");
  
  // ✅ منع الرقم 0 كأول رقم
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  
  // إذا بدأ بـ 971، نزيله ونضيفه لاحقاً
  let phoneDigits = digits;
  if (digits.startsWith("971")) {
    phoneDigits = digits.slice(3);
  }
  
  // ✅ منع الرقم 0 كأول رقم بعد إزالة 971
  if (phoneDigits.startsWith("0")) {
    phoneDigits = phoneDigits.slice(1);
  }
  
  // يجب أن يكون 9 أرقام
  if (phoneDigits.length > 9) {
    phoneDigits = phoneDigits.slice(0, 9);
  }
  
  return phoneDigits ? `+971${phoneDigits}` : "";
};

/**
 * التحقق من صحة رقم الهاتف الإماراتي
 * @param {string} value - رقم الهاتف
 * @returns {boolean} - true إذا كان صحيحاً
 */
export const isValidUAEPhone = (value) => {
  if (!value) return false;
  // يجب أن يبدأ بـ +971 ويتبعه 9 أرقام
  return /^\+971\d{9}$/.test(value);
};

/**
 * تنسيق مساحة الأرض - دعم أرقام عشرية وفواصل رقمية
 * @param {string} value - القيمة المراد تنسيقها
 * @returns {string} - القيمة المنسقة
 */
export const formatLandArea = (value) => {
  if (!value) return "";
  
  // السماح بالأرقام والنقطة العشرية والفاصلة
  const cleaned = String(value)
    .replace(/[^\d.,]/g, "") // إزالة أي شيء غير رقم أو نقطة أو فاصلة
    .replace(/,/g, ""); // إزالة الفواصل (سنضيفها لاحقاً للتنسيق)
  
  // السماح بنقطة عشرية واحدة فقط
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  
  return cleaned;
};

/**
 * تنسيق رقم مع فواصل الآلاف أثناء الإدخال
 * @param {string} value - القيمة المراد تنسيقها
 * @returns {string} - الرقم المنسق مع فواصل
 */
export const formatNumberWithCommas = (value) => {
  if (!value) return "";
  
  // إزالة أي شيء غير رقم أو نقطة
  const cleaned = String(value).replace(/[^\d.]/g, "");
  
  // السماح بنقطة عشرية واحدة فقط
  const parts = cleaned.split(".");
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? "." + parts.slice(1).join("") : "";
  
  // إضافة فواصل للجزء الصحيح
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  
  return integerPart + decimalPart;
};

/**
 * إزالة فواصل من رقم للحفظ
 * @param {string} value - القيمة مع فواصل
 * @returns {string} - القيمة بدون فواصل
 */
export const removeCommas = (value) => {
  if (!value) return "";
  return String(value).replace(/,/g, "");
};

/**
 * حساب تاريخ الميلاد من رقم الهوية الإماراتية
 * رقم الهوية: 784-YYYY-MMDD-XXXXXXX-X
 * @param {string} idNumber - رقم الهوية
 * @returns {string|null} - تاريخ الميلاد بصيغة YYYY-MM-DD أو null
 */
export const calculateBirthDateFromEmiratesId = (idNumber) => {
  if (!idNumber) return null;
  
  // إزالة الفواصل والمسافات
  const cleaned = String(idNumber).replace(/[-\s]/g, "");
  
  // يجب أن يكون 15 رقم
  if (cleaned.length !== 15) return null;
  
  try {
    // الأرقام من 4 إلى 7 تمثل السنة
    const year = cleaned.slice(3, 7);
    // الأرقام من 8 إلى 9 تمثل الشهر
    const month = cleaned.slice(7, 9);
    // الأرقام من 10 إلى 11 تمثل اليوم
    const day = cleaned.slice(9, 11);
    
    // التحقق من صحة التاريخ
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;
    
    // التحقق من صحة التاريخ باستخدام Date
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return null;
    }
    
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } catch {
    return null;
  }
};

/**
 * حساب العمر من رقم الهوية الإماراتية
 * رقم الهوية: 784-YYYY-XXXXXXX-X
 * الجزء الثاني (YYYY) يمثل سنة الميلاد
 * @param {string} idNumber - رقم الهوية
 * @returns {number|null} - العمر بالسنوات أو null إذا كان الرقم غير صالح
 */
export const calculateAgeFromEmiratesId = (idNumber) => {
  if (!idNumber || typeof idNumber !== "string") return null;
  
  // إزالة الفواصل والمسافات
  const cleaned = String(idNumber).replace(/[-\s]/g, "");
  
  // محاولة استخراج سنة الميلاد من التنسيق: 784-YYYY-XXXXXXX-X
  // أو من التنسيق بدون فواصل: 784YYYYXXXXXXX
  let birthYear = null;
  
  // طريقة 1: إذا كان الرقم يحتوي على فواصل (مثل: 784-1991-9691717-5)
  if (idNumber.includes("-")) {
    const parts = idNumber.split("-");
    if (parts.length >= 2 && parts[1]) {
      const yearStr = parts[1].trim();
      const yearNum = parseInt(yearStr, 10);
      if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
        birthYear = yearNum;
      }
    }
  }
  
  // طريقة 2: إذا لم نجد سنة من الفواصل، نحاول من المواضع 4-7
  if (birthYear === null && cleaned.length >= 8) {
    const yearStr = cleaned.substring(3, 7);
    const yearNum = parseInt(yearStr, 10);
    if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
      birthYear = yearNum;
    }
  }
  
  // حساب العمر
  if (birthYear !== null) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return age >= 0 ? age : null;
  }
  
  return null;
};

