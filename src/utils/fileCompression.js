// frontend/src/utils/fileCompression.js
// استيراد المكتبة بشكل عادي - Vite سيتعامل معها تلقائياً
import imageCompression from 'browser-image-compression';

/**
 * ضغط الصور قبل الرفع لتقليل الوقت والحجم
 * @param {File} file - الملف المراد ضغطه
 * @param {Object} options - خيارات الضغط
 * @returns {Promise<File>} - الملف المضغوط
 */
export async function compressImage(file, options = {}) {
  // التحقق من نوع الملف
  if (!file.type.startsWith('image/')) {
    // إذا لم يكن صورة، نعيده كما هو
    return file;
  }

  const defaultOptions = {
    maxSizeMB: 1, // الحد الأقصى للحجم بالميجابايت
    maxWidthOrHeight: 1920, // الحد الأقصى للعرض أو الارتفاع
    useWebWorker: true, // استخدام Web Worker لتسريع العملية
    fileType: file.type, // الحفاظ على نوع الملف الأصلي
    initialQuality: 0.8, // جودة الصورة (0-1)
    ...options
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    console.log(`✅ تم ضغط الصورة: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    return compressedFile;
  } catch (error) {
    console.warn('⚠️ فشل ضغط الصورة، سيتم استخدام الملف الأصلي:', error);
    return file; // في حالة الفشل، نعيد الملف الأصلي
  }
}

/**
 * معالجة الملفات قبل الرفع (ضغط الصور فقط)
 * @param {File} file - الملف المراد معالجته
 * @param {Object} compressionOptions - خيارات الضغط
 * @returns {Promise<File>} - الملف المعالج
 */
export async function processFileForUpload(file, compressionOptions = {}) {
  if (!file) return null;
  
  // ضغط الصور فقط
  if (file.type.startsWith('image/')) {
    return await compressImage(file, compressionOptions);
  }
  
  // الملفات الأخرى (PDF, DOC, etc.) نعيدها كما هي
  return file;
}

/**
 * التحقق من حجم الملف
 * @param {File} file - الملف المراد التحقق منه
 * @param {number} maxSizeMB - الحد الأقصى للحجم بالميجابايت
 * @returns {boolean} - true إذا كان الحجم مقبول
 */
export function validateFileSize(file, maxSizeMB = 10) {
  if (!file) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * تنسيق حجم الملف للعرض
 * @param {number} bytes - الحجم بالبايت
 * @returns {string} - الحجم المنسق
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

