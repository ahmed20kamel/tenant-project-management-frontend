// دوال تنسيق الهوية الإماراتية

/**
 * تنسيق رقم الهوية الإماراتية (784-XXXX-XXXXXXX-X)
 * @param {string} digits - الأرقام الخام
 * @returns {string} - الرقم المنسق
 */
export const formatEmiratesId = (digits) => {
  if (!digits) return "";
  const raw = digits.replace(/\D/g, "").slice(0, 15);
  let part1 = raw.slice(0, 3);
  let part2 = raw.slice(3, 7);
  let part3 = raw.slice(7, 14);
  let part4 = raw.slice(14, 15);
  return [part1, part2, part3, part4].filter(Boolean).join("-");
};

/**
 * معالج إدخال الهوية الإماراتية مع الحفاظ على موضع المؤشر
 * @param {Event} e - حدث الإدخال
 * @param {Function} onUpdate - دالة التحديث
 */
export const handleEmiratesIdInput = (e, onUpdate) => {
  const input = e.target;
  const raw = input.value.replace(/\D/g, "").slice(0, 15);
  
  let formatted = "";
  if (raw.length > 0) formatted += raw.slice(0, 3);
  if (raw.length > 3) formatted += "-" + raw.slice(3, 7);
  if (raw.length > 7) formatted += "-" + raw.slice(7, 14);
  if (raw.length > 14) formatted += "-" + raw.slice(14, 15);
  
  const cursor = input.selectionStart;
  const diff = formatted.length - input.value.length;
  const newCursor = Math.max(0, cursor + diff);
  
  onUpdate(formatted);
  
  setTimeout(() => {
    input.setSelectionRange(newCursor, newCursor);
  }, 0);
};

