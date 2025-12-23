// frontend/src/services/api.js
import axios from "axios";

const isDev = import.meta.env.DEV;
// في الديف نستخدم proxy => /api/
// في البرود نستخدم VITE_API_URL
const ROOT = isDev
  ? ""
  : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: isDev ? "/api/" : `${ROOT}/api/`,
  withCredentials: true,
  timeout: 300000, // 5 دقائق للرفع (خاصة للملفات الكبيرة)
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

let csrfReady = false;
async function ensureCsrf() {
  if (csrfReady && getCookie("csrftoken")) return;
  try {
    const url = isDev ? "/api/csrf/" : `${ROOT}/api/csrf/`;
    await axios.get(url, {
      withCredentials: true,
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    csrfReady = true;
  } catch {}
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (
    ["post", "put", "patch", "delete"].includes(method) &&
    !getCookie("csrftoken")
  ) {
    await ensureCsrf();
  }
  const csrftoken = getCookie("csrftoken") || getCookie("CSRF-TOKEN");
  if (csrftoken) {
    config.headers["X-CSRFToken"] = csrftoken;
    config.headers["X-CSRF-Token"] = csrftoken;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    
    // ✅ معالجة HTML errors - تحويلها إلى رسالة خطأ مناسبة
    if (data && typeof data === "string" && (data.trim().startsWith("<!DOCTYPE") || data.trim().startsWith("<html"))) {
      // محاولة استخراج رسالة خطأ من HTML
      const titleMatch = data.match(/<title>(.*?)<\/title>/i);
      const h1Match = data.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const errorMatch = data.match(/OperationalError|DatabaseError|IntegrityError|(\w+Error)/i);
      
      let errorMessage = "Server Error";
      if (titleMatch) {
        errorMessage = titleMatch[1];
      } else if (h1Match) {
        errorMessage = h1Match[1];
      } else if (errorMatch) {
        errorMessage = errorMatch[0];
      }
      
      // استبدال HTML error بـ JSON error object
      err.response.data = {
        detail: errorMessage,
        html_error: true,
        status: status || 500
      };
    }
    
    console.groupCollapsed(
      `[API ERROR] ${status ?? "?"} ${err.config?.method?.toUpperCase()} ${
        err.config?.url
      }`
    );
    console.log("Request:", err.config);
    console.log("Response:", err.response?.data || data);
    console.groupEnd();
    return Promise.reject(err);
  }
);

/**
 * رفع ملف مع تتبع التقدم
 * @param {string} url - رابط الرفع
 * @param {FormData} formData - البيانات المراد رفعها
 * @param {Function} onUploadProgress - دالة لتتبع التقدم (progress: number) => void
 * @param {Object} config - إعدادات إضافية
 * @returns {Promise} - Promise مع الاستجابة
 */
export function uploadFile(url, formData, onUploadProgress, config = {}) {
  return api.post(url, formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...config.headers,
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      }
    },
  });
}

/**
 * تحديث ملف مع تتبع التقدم
 * @param {string} url - رابط التحديث
 * @param {FormData} formData - البيانات المراد رفعها
 * @param {Function} onUploadProgress - دالة لتتبع التقدم (progress: number) => void
 * @param {Object} config - إعدادات إضافية
 * @returns {Promise} - Promise مع الاستجابة
 */
export function updateFile(url, formData, onUploadProgress, config = {}) {
  return api.patch(url, formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...config.headers,
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      }
    },
  });
}

export { api };
export default api;

