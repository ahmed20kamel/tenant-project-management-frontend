// نظام معالجة الأخطاء الموحد
import i18n from "../config/i18n";

/**
 * يحول كود حالة HTTP إلى رسالة خطأ واضحة
 */
function getHttpErrorMessage(status, context = "") {
  const contextPrefix = context ? `[${context}] ` : "";
  
  const errorMessages = {
    400: `${contextPrefix}طلب غير صحيح - يرجى التحقق من البيانات المدخلة`,
    401: `${contextPrefix}غير مصرح - يرجى تسجيل الدخول`,
    403: `${contextPrefix}غير مسموح - ليس لديك صلاحية للوصول`,
    404: `${contextPrefix}غير موجود - لم يتم العثور على المورد المطلوب`,
    405: `${contextPrefix}طريقة غير مسموحة`,
    408: `${contextPrefix}انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى`,
    409: `${contextPrefix}تعارض - البيانات موجودة بالفعل`,
    413: `${contextPrefix}الملف كبير جداً - يرجى اختيار ملف أصغر`,
    422: `${contextPrefix}بيانات غير صحيحة - يرجى التحقق من الحقول`,
    429: `${contextPrefix}عدد الطلبات كبير جداً - يرجى الانتظار قليلاً`,
    500: `${contextPrefix}خطأ في الخادم - يرجى المحاولة لاحقاً`,
    502: `${contextPrefix}خطأ في الاتصال بالخادم`,
    503: `${contextPrefix}الخدمة غير متاحة - يرجى المحاولة لاحقاً`,
    504: `${contextPrefix}انتهت مهلة الاتصال بالخادم`,
  };

  return errorMessages[status] || `${contextPrefix}خطأ غير معروف (${status})`;
}

/**
 * يحول نوع الخطأ إلى رسالة واضحة
 */
function getErrorTypeMessage(error, context = "") {
  const contextPrefix = context ? `[${context}] ` : "";
  
  if (!error) return `${contextPrefix}حدث خطأ غير معروف`;

  // Network errors
  if (error.message?.includes("Network Error") || error.code === "NETWORK_ERROR") {
    return `${contextPrefix}خطأ في الاتصال بالشبكة - يرجى التحقق من اتصال الإنترنت`;
  }

  // Timeout errors
  if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
    return `${contextPrefix}انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى`;
  }

  // Not found errors
  if (error.response?.status === 404) {
    const resource = context || "المورد";
    return `${contextPrefix}${resource} غير موجود - يرجى التحقق من المعرف`;
  }

  // Server errors
  if (error.response?.status >= 500) {
    return `${contextPrefix}خطأ في الخادم - يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني`;
  }

  // Validation errors
  if (error.response?.status === 422 || error.response?.status === 400) {
    return `${contextPrefix}بيانات غير صحيحة - يرجى التحقق من الحقول المميزة`;
  }

  // Default
  return error.message || `${contextPrefix}حدث خطأ غير متوقع`;
}

/**
 * تنسيق أخطاء الخادم مع معلومات السياق
 */
export function formatError(error, context = "") {
  if (!error) return "حدث خطأ غير معروف";

  // إذا كان الخطأ من الخادم (response موجود)
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // رسالة HTTP الأساسية
    const httpMessage = getHttpErrorMessage(status, context);
    
    // إذا كان هناك بيانات خطأ من الخادم
    if (data) {
      // محاولة تنسيق أخطاء الحقول
      const fieldErrors = formatFieldErrors(data, context);
      if (fieldErrors) {
        return `${httpMessage}\n\n${fieldErrors}`;
      }
      
      // رسالة عامة من الخادم
      if (data.detail) {
        const detail = Array.isArray(data.detail) ? data.detail[0] : data.detail;
        return `${httpMessage}\n\n${detail}`;
      }
      
      if (data.message) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        return `${httpMessage}\n\n${message}`;
      }
    }
    
    return httpMessage;
  }

  // أخطاء الشبكة أو الأخطاء الأخرى
  return getErrorTypeMessage(error, context);
}

/**
 * تنسيق أخطاء الحقول بشكل واضح
 */
function formatFieldErrors(data, context = "") {
  if (!data || typeof data !== "object") return null;

  const messages = [];
  const fieldLabels = getFieldLabels();

  // معالجة أخطاء الحقول
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "non_field_errors" || key === "message") continue;
    
    const label = fieldLabels[key] || key;
    const errorMsg = Array.isArray(value) ? value[0] : value;
    
    if (errorMsg) {
      messages.push(`• ${label}: ${errorMsg}`);
    }
  }

  // معالجة أخطاء المصفوفات (مثل owners)
  if (data.owners && Array.isArray(data.owners)) {
    data.owners.forEach((ownerErr, idx) => {
      if (ownerErr && typeof ownerErr === "object") {
        for (const [key, value] of Object.entries(ownerErr)) {
          const label = fieldLabels[key] || key;
          const errorMsg = Array.isArray(value) ? value[0] : value;
          if (errorMsg) {
            messages.push(`• المالك ${idx + 1} - ${label}: ${errorMsg}`);
          }
        }
      }
    });
  }

  // معالجة الأخطاء العامة
  if (data.non_field_errors) {
    const generalErrors = Array.isArray(data.non_field_errors) 
      ? data.non_field_errors 
      : [data.non_field_errors];
    generalErrors.forEach(err => messages.push(`• ${err}`));
  }

  return messages.length > 0 ? messages.join("\n") : null;
}

/**
 * الحصول على تسميات الحقول بالعربية
 */
function getFieldLabels() {
  try {
    return i18n.getResourceBundle(i18n.language, "translation")?.errors || {};
  } catch {
    return {};
  }
}

/**
 * معالج أخطاء شامل مع معلومات السياق
 */
export function handleError(error, context = "") {
  console.error(`[Error Handler] ${context}:`, error);
  
  // تنسيق الرسالة
  const message = formatError(error, context);
  
  // إرجاع كائن خطأ منظم
  return {
    message,
    originalError: error,
    context,
    status: error?.response?.status,
    data: error?.response?.data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * معالج أخطاء مبسط للاستخدام المباشر
 */
export function getErrorMessage(error, context = "") {
  const handled = handleError(error, context);
  return handled.message;
}

