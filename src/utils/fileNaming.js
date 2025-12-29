// دوال لتسمية الملفات بشكل موحد حسب نوع المرفق

/**
 * تحويل نص الحقل إلى اسم ملف (إزالة "إرفاق" و "يرجى" وغيرها)
 * @param {string} labelText - نص الحقل
 * @returns {string} اسم الملف
 */
function labelToFileName(labelText) {
  if (!labelText) return 'ملف';
  
  // إزالة كلمات شائعة
  let cleaned = labelText
    .replace(/^يرجى\s+/i, '') // إزالة "يرجى"
    .replace(/^إرفاق\s+/i, '') // إزالة "إرفاق"
    .replace(/^attach\s+/i, '') // إزالة "attach"
    .trim();
  
  // استبدال المسافات بشرطة سفلية
  cleaned = cleaned.replace(/\s+/g, '_');
  
  return cleaned || 'ملف';
}

/**
 * الحصول على اسم موحد للملف حسب نوع المرفق أو نص الحقل
 * @param {string} fileType - نوع المرفق (application_file, id_attachment, building_license_file, etc.)
 * @param {number} index - الفهرس (للملفات المتعددة مثل بطاقات الهوية)
 * @param {string} originalExtension - امتداد الملف الأصلي
 * @param {string} labelText - نص الحقل (اختياري، إذا وُجد يُستخدم بدلاً من fileType)
 * @returns {string} اسم الملف الموحد
 */
export function getStandardFileName(fileType, index = 0, originalExtension = '', labelText = '') {
  // استخراج الامتداد من الملف الأصلي
  const extension = originalExtension || '.pdf';
  
  // إذا وُجد نص الحقل، نستخدمه مباشرة
  if (labelText) {
    const fileName = labelToFileName(labelText);
    // استخراج النص الإنجليزي من labelText إذا كان موجوداً
    const englishMatch = labelText.match(/[A-Z][a-zA-Z\s]+/);
    const englishPart = englishMatch ? englishMatch[0].trim().replace(/\s+/g, '_') : '';
    const baseName = englishPart ? `${fileName}_${englishPart}` : fileName;
    return index > 0 ? `${baseName}_${index + 1}${extension}` : `${baseName}${extension}`;
  }
  
  // أسماء الملفات الموحدة حسب النوع (مع النص الإنجليزي)
  const fileNames = {
    // مخطط الأرض
    'application_file': { ar: 'مخطط_الأرض', en: 'Site_Plan' },
    'siteplan_application': { ar: 'مخطط_الأرض', en: 'Site_Plan' },
    
    // بطاقة الهوية
    'id_attachment': { ar: 'بطاقة_الهوية', en: 'ID_Card' },
    'owner_id': { ar: 'بطاقة_الهوية', en: 'ID_Card' },
    
    // رخصة البناء
    'building_license_file': { ar: 'رخصة_البناء', en: 'Building_Permit' },
    'license_file': { ar: 'رخصة_البناء', en: 'Building_Permit' },
    
    // مرفقات الدفعات
    'deposit_slip': { ar: 'إيصال_إيداع', en: 'Deposit_Slip' },
    'invoice_file': { ar: 'فاتورة_الدفع', en: 'Payment_Invoice' },
    'receipt_voucher': { ar: 'سند_قبض', en: 'Receipt_Voucher' },
    'bank_payment_attachments': { ar: 'مرفقات_دفعة_البنك', en: 'Bank_Payment_Attachments' },
    
    // مرفقات العقد
    'contract_attachment': { ar: 'مرفق_العقد', en: 'Contract_Attachment' },
    
    // مرفقات أخرى
    'attachment': { ar: 'مرفق', en: 'Attachment' },
  };
  
  const fileInfo = fileNames[fileType] || { ar: 'ملف', en: 'File' };
  const baseName = `${fileInfo.ar}_${fileInfo.en}`;
  return index > 0 ? `${baseName}_${index + 1}${extension}` : `${baseName}${extension}`;
}

/**
 * تغيير اسم الملف قبل الرفع
 * @param {File} file - الملف الأصلي
 * @param {string} fileType - نوع المرفق
 * @param {number} index - الفهرس (للملفات المتعددة)
 * @param {string} labelText - نص الحقل (اختياري)
 * @returns {File} ملف جديد بالاسم الموحد
 */
export function renameFileForUpload(file, fileType, index = 0, labelText = '') {
  if (!(file instanceof File)) {
    return file;
  }
  
  // استخراج الامتداد من الملف الأصلي
  const originalName = file.name;
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  
  // الحصول على الاسم الموحد
  const newName = getStandardFileName(fileType, index, extension, labelText);
  
  // إنشاء ملف جديد بالاسم الموحد
  // Note: لا يمكن تغيير اسم File مباشرة، لذلك ننشئ File جديد
  const renamedFile = new File([file], newName, {
    type: file.type,
    lastModified: file.lastModified,
  });
  
  return renamedFile;
}

/**
 * استخراج نوع المرفق من اسم الحقل
 * @param {string} fieldName - اسم الحقل
 * @returns {string} نوع المرفق
 */
export function getFileTypeFromFieldName(fieldName) {
  const fieldTypeMap = {
    'application_file': 'application_file',
    'id_attachment': 'id_attachment',
    'building_license_file': 'building_license_file',
    'deposit_slip': 'deposit_slip',
    'invoice_file': 'invoice_file',
    'receipt_voucher': 'receipt_voucher',
    'bank_payment_attachments': 'bank_payment_attachments',
  };
  
  return fieldTypeMap[fieldName] || 'attachment';
}
