// ====== تنسيقات موحدة للأرقام والتاريخ ======

/**
 * تنسيق رقم مع فواصل الآلاف
 * @param {string|number} value - القيمة المراد تنسيقها
 * @param {object} options - خيارات التنسيق
 * @returns {string} - الرقم المنسق
 */
export const formatNumber = (value, options = {}) => {
  const {
    decimals = 2,
    locale = "en-US",
    useCommas = true,
  } = options;

  if (value === null || value === undefined || value === "") return "—";
  
  const num = Number(String(value).replace(/,/g, ""));
  if (isNaN(num)) return "—";

  if (useCommas) {
    return num.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  
  return num.toFixed(decimals);
};

/**
 * تنسيق مبلغ مالي (AED) - Unified format: AED 1,200.50
 * @param {string|number} value - القيمة المراد تنسيقها
 * @param {object} options - خيارات التنسيق
 * @param {boolean} options.showDecimals - عرض الكسور العشرية (default: true)
 * @returns {string} - المبلغ المنسق
 */
export const formatMoney = (value, options = {}) => {
  const { showDecimals = true } = options;
  const num = Number(String(value || 0).replace(/,/g, ""));
  if (!Number.isFinite(num)) return "—";
  
  if (showDecimals) {
    return `AED ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `AED ${Math.round(num).toLocaleString("en-US")}`;
};

/**
 * تنسيق مبلغ مالي مع الكسور العشرية
 * @param {string|number} value - القيمة المراد تنسيقها
 * @returns {string} - المبلغ المنسق
 */
export const formatMoneyDecimal = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(String(value).replace(/,/g, ""));
  if (isNaN(num)) return "—";
  return `AED ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * تحويل الأرقام الإنجليزية إلى عربية
 * @param {string} str - النص المراد تحويله
 * @returns {string} - النص مع الأرقام العربية
 */
export const toArabicDigits = (str) => {
  if (!str) return "";
  return String(str).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

/**
 * تنسيق مبلغ بالعربية
 * @param {string|number} value - القيمة المراد تنسيقها
 * @returns {string} - المبلغ المنسق بالعربية
 */
export const formatMoneyArabic = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const formatted = formatNumber(value, { decimals: 2 });
  return toArabicDigits(formatted);
};

/**
 * تحويل التاريخ من ISO (yyyy-mm-dd) إلى تنسيق العرض (dd/mm/yyyy)
 * @param {string} dateStr - التاريخ بصيغة ISO
 * @param {string} locale - اللغة (ar | en)
 * @returns {string} - التاريخ المنسق
 */
export const formatDate = (dateStr, locale = "ar") => {
  if (!dateStr) return "—";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "—";
  }
};

/**
 * تحويل التاريخ من تنسيق العرض (dd/mm/yyyy أو dd-mm-yyyy) إلى ISO (yyyy-mm-dd)
 * @param {string} dateStr - التاريخ بصيغة العرض
 * @returns {string|null} - التاريخ بصيغة ISO أو null
 */
export const toIsoDate = (dateStr) => {
  if (!dateStr) return null;
  
  // إذا كان بالفعل بصيغة ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // تحويل من dd/mm/yyyy إلى yyyy-mm-dd (التنسيق الأساسي)
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  
  // تحويل من dd-mm-yyyy إلى yyyy-mm-dd (للتوافق مع البيانات القديمة)
  match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  
  return null;
};

/**
 * تحويل التاريخ من ISO إلى تنسيق input (yyyy-mm-dd)
 * @param {string} dateStr - التاريخ بصيغة ISO أو dd/mm/yyyy أو dd-mm-yyyy
 * @returns {string} - التاريخ بصيغة input
 */
export const toInputDate = (dateStr) => {
  if (!dateStr) return "";
  
  // إذا كان بالفعل بصيغة ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // تحويل من dd/mm/yyyy إلى yyyy-mm-dd (التنسيق الأساسي)
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  
  // تحويل من dd-mm-yyyy إلى yyyy-mm-dd (للتوافق مع البيانات القديمة)
  match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  
  return dateStr;
};

/**
 * تحويل التاريخ من ISO إلى تنسيق العرض DD/MM/YYYY
 * @param {string} dateStr - التاريخ بصيغة ISO (yyyy-mm-dd)
 * @returns {string} - التاريخ بصيغة DD/MM/YYYY أو "" إذا كان فارغاً
 */
export const formatDateInput = (dateStr) => {
  if (!dateStr) return "";
  
  try {
    // إذا كان بالفعل بصيغة ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    
    // إذا كان بصيغة dd/mm/yyyy، نعيده كما هو
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    
    // محاولة تحويل من أي تنسيق آخر
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
};

/**
 * تنسيق إدخال التاريخ أثناء الكتابة (DD/MM/YYYY)
 * @param {string} value - القيمة المدخلة
 * @returns {string} - القيمة المنسقة
 */
export const formatDateInputValue = (value) => {
  if (!value) return "";
  
  // إزالة أي شيء غير رقم
  const digits = value.replace(/\D/g, "");
  
  // تطبيق الـ mask مع حد أقصى 8 أرقام (DDMMYYYY)
  const limitedDigits = digits.slice(0, 8);
  
  if (limitedDigits.length <= 2) {
    return limitedDigits;
  } else if (limitedDigits.length <= 4) {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
  } else {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4, 8)}`;
  }
};

/**
 * الحصول على تاريخ اليوم بصيغة ISO
 * @returns {string} - تاريخ اليوم بصيغة yyyy-mm-dd
 */
export const todayIso = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
};

/**
 * الحصول على اسم اليوم بالعربية
 * @param {string} dateStr - التاريخ بصيغة ISO
 * @param {string} locale - اللغة
 * @returns {string} - اسم اليوم
 */
export const getDayName = (dateStr, locale = "ar") => {
  if (!dateStr) return "";
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(locale, { weekday: "long" });
  } catch {
    return "";
  }
};

/**
 * تنسيق رقم المشروع (B1N-2024-014159)
 * @param {string} raw - الرقم الخام
 * @returns {string} - الرقم المنسق
 */
export const formatProjectNumber = (raw) => {
  if (!raw) return "";
  let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let part1 = v.slice(0, 3);
  let part2 = v.slice(3, 7);
  let part3 = v.slice(7, 13);
  let formatted = part1;
  if (part2) formatted += "-" + part2;
  if (part3) formatted += "-" + part3;
  return formatted;
};

/**
 * بناء رقم الرخصة من رقم المشروع
 * @param {string} projectNo - رقم المشروع
 * @returns {string} - رقم الرخصة
 */
export const buildPermitNumber = (projectNo) => {
  if (!projectNo) return "";
  return projectNo + "-P01";
};

