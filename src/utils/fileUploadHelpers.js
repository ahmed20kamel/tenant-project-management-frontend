// frontend/src/utils/fileUploadHelpers.js

/**
 * إنشاء FormData محسّن مع معالجة الملفات
 * @param {Object} data - البيانات المراد إرسالها
 * @param {Array<string>} fileFields - أسماء الحقول التي تحتوي على ملفات
 * @returns {FormData} - FormData جاهز للإرسال
 */
export function createOptimizedFormData(data, fileFields = []) {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    // تخطي الحقول الفارغة
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    // معالجة الملفات
    if (fileFields.includes(key) && value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }
    
    // معالجة المصفوفات
    if (Array.isArray(value)) {
      if (value.length === 0) {
        formData.append(key, '[]');
      } else {
        // التحقق إذا كانت المصفوفة تحتوي على ملفات
        const hasFiles = value.some(item => 
          item instanceof File || 
          (typeof item === 'object' && item !== null && Object.values(item).some(v => v instanceof File))
        );
        
        if (hasFiles) {
          // معالجة خاصة للمصفوفات التي تحتوي على ملفات (مثل owners)
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              Object.entries(item).forEach(([subKey, subValue]) => {
                if (subValue instanceof File) {
                  formData.append(`${key}[${index}][${subKey}]`, subValue, subValue.name);
                } else if (subValue !== null && subValue !== undefined && subValue !== '') {
                  formData.append(`${key}[${index}][${subKey}]`, subValue);
                }
              });
            }
          });
        } else {
          formData.append(key, JSON.stringify(value));
        }
      }
      return;
    }
    
    // معالجة الكائنات
    if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    
    // القيم العادية
    formData.append(key, value);
  });
  
  return formData;
}

/**
 * التحقق من نوع الملف المسموح
 * @param {File} file - الملف المراد التحقق منه
 * @param {Array<string>} allowedTypes - الأنواع المسموحة (مثل ['image/jpeg', 'application/pdf'])
 * @returns {boolean} - true إذا كان النوع مسموح
 */
export function validateFileType(file, allowedTypes = []) {
  if (!file || allowedTypes.length === 0) return true;
  return allowedTypes.includes(file.type);
}

