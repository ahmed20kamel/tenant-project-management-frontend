// دوال موحدة للتعامل مع الملفات

/**
 * استخراج اسم الملف من URL مع فك الترميز
 * @param {string} fileUrl - URL الملف
 * @returns {string} اسم الملف
 */
export function extractFileNameFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return "";
  
  const parts = fileUrl.split("/");
  const fileName = parts[parts.length - 1] || "";
  
  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

/**
 * استخراج مسار الملف النسبي من URL
 * @param {string} fileUrl - URL الملف (مثل: /media/contracts/main/file.pdf)
 * @returns {string} مسار الملف النسبي (مثل: contracts/main/file.pdf)
 */
function extractMediaPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  
  // إزالة /media/ من البداية
  if (fileUrl.startsWith("/media/")) {
    return fileUrl.substring(7); // إزالة "/media/"
  }
  
  // إذا كان URL كامل يحتوي على /media/
  const mediaIndex = fileUrl.indexOf("/media/");
  if (mediaIndex !== -1) {
    return fileUrl.substring(mediaIndex + 7);
  }
  
  // إذا كان URL نسبي بدون /media/
  if (fileUrl.startsWith("/")) {
    return fileUrl.substring(1);
  }
  
  return fileUrl;
}

/**
 * بناء URL كامل للملف من URL نسبي أو مطلق
 * يستخدم API endpoint محمي بدلاً من الوصول المباشر
 * @param {string} fileUrl - URL الملف (نسبي أو مطلق)
 * @returns {string} URL كامل للملف عبر API
 */
export function buildFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") {
    console.warn("buildFileUrl: fileUrl is invalid", fileUrl);
    return null;
  }
  
  // إذا كان URL مطلق (يبدأ بـ http) ولا يحتوي على /media/، نرجعه كما هو
  if (fileUrl.startsWith("http") && !fileUrl.includes("/media/")) {
    return fileUrl;
  }
  
  // ✅ استخراج مسار الملف النسبي
  const mediaPath = extractMediaPath(fileUrl);
  if (!mediaPath) {
    console.warn("buildFileUrl: Could not extract media path from", fileUrl);
    return null;
  }
  
  // ✅ استخدام API endpoint محمي لتحميل الملف
  // ✅ تشفير كل جزء من المسار بشكل منفصل (خاصة للأحرف العربية)
  const encodedPath = mediaPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  const isDev = import.meta.env.DEV;
  let apiBase;
  
  if (isDev) {
    // في التطوير: استخدام /api
    apiBase = "/api";
  } else {
    // في الإنتاج: استخدام VITE_API_URL أو window.location.origin
    const envApiUrl = import.meta.env.VITE_API_URL || "";
    if (envApiUrl) {
      // إذا كان VITE_API_URL موجود، نستخدمه (يجب أن يحتوي على /api)
      apiBase = envApiUrl.replace(/\/+$/, "");
      // التأكد من أن apiBase ينتهي بـ /api
      if (!apiBase.endsWith("/api")) {
        apiBase = apiBase.endsWith("/") ? `${apiBase}api` : `${apiBase}/api`;
      }
    } else {
      // إذا لم يكن موجود، نستخدم window.location.origin + /api
      apiBase = `${window.location.origin}/api`;
    }
  }
  
  const apiUrl = `${apiBase}/files/${encodedPath}`;
  
  if (process.env.NODE_ENV === "development") {
    console.log("buildFileUrl:", { fileUrl, mediaPath, encodedPath, apiBase, apiUrl });
  }
  
  return apiUrl;
}

/**
 * تحميل الملف مع authentication credentials
 * يستخدم API endpoint محمي
 * @param {string} fileUrl - URL الملف
 * @returns {Promise<Blob>} Blob object للملف
 */
async function fetchFileWithAuth(fileUrl) {
  const apiUrl = buildFileUrl(fileUrl);
  if (!apiUrl) {
    throw new Error("Could not build file URL");
  }

  // ✅ الحصول على JWT token من localStorage
  const token = localStorage.getItem('access_token');
  
  // ✅ استخدام fetch مع api base URL لضمان إرسال cookies و JWT token
  const isDev = import.meta.env.DEV;
  const apiBase = isDev ? "/api" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const fullApiUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;
  
  const headers = {
    'Accept': '*/*',
  };
  
  // ✅ إضافة JWT token إذا كان موجوداً
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(fullApiUrl, {
    method: 'GET',
    credentials: 'include', // ✅ إرسال cookies مع الطلب
    headers: headers
  });

  if (!response.ok) {
    // ✅ إذا كان 401، محاولة refresh token
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { api } = await import("../services/api");
          const refreshResponse = await api.post('auth/token/refresh/', {
            refresh: refreshToken,
          });
          const { access } = refreshResponse.data;
          localStorage.setItem('access_token', access);
          
          // ✅ إعادة المحاولة مع token جديد
          headers['Authorization'] = `Bearer ${access}`;
          const retryResponse = await fetch(fullApiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: headers
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch file: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          return await retryResponse.blob();
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          throw new Error("Authentication failed. Please login again.");
        }
      }
    }
    
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * إنشاء صفحة HTML بسيطة لعرض الملف مع عنوان واضح
 * @param {Blob} blob - Blob object للملف
 * @param {string} fileName - اسم الملف
 * @param {string} mimeType - نوع الملف (MIME type)
 * @returns {string} HTML content
 */
function createFileViewerHTML(blob, fileName, mimeType) {
  const blobUrl = URL.createObjectURL(blob);
  
  // ✅ تحديد نوع المحتوى
  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml';
  
  let contentHTML = '';
  
  if (isImage) {
    contentHTML = `<img src="${blobUrl}" alt="${fileName}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;
  } else if (isPDF) {
    contentHTML = `<iframe src="${blobUrl}" style="width: 100%; height: 100vh; border: none;" title="${fileName}"></iframe>`;
  } else if (isVideo) {
    contentHTML = `<video controls style="width: 100%; max-height: 100vh;" src="${blobUrl}">Your browser does not support the video tag.</video>`;
  } else if (isAudio) {
    contentHTML = `<audio controls style="width: 100%;" src="${blobUrl}">Your browser does not support the audio tag.</audio>`;
  } else if (isText) {
    contentHTML = `<pre style="padding: 20px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; background: #f5f5f5; margin: 0; height: 100vh; overflow: auto;">Loading...</pre>`;
    // سيتم تحميل المحتوى عبر JavaScript
  } else {
    contentHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
        <p style="font-size: 18px; margin-bottom: 20px;">${fileName}</p>
        <a href="${blobUrl}" download="${fileName}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Download File</a>
      </div>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${fileName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      </style>
    </head>
    <body>
      ${contentHTML}
      ${isText ? `
        <script>
          fetch('${blobUrl}')
            .then(response => response.text())
            .then(text => {
              document.querySelector('pre').textContent = text;
            })
            .catch(error => {
              document.querySelector('pre').textContent = 'Error loading file: ' + error.message;
            });
        </script>
      ` : ''}
      <script>
        // ✅ تنظيف blob URL عند إغلاق الصفحة
        window.addEventListener('beforeunload', function() {
          URL.revokeObjectURL('${blobUrl}');
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * فتح الملف في نافذة جديدة بشكل آمن مع تحسين UX
 * يستخدم fetch مع credentials لضمان authentication
 * @param {string} fileUrl - URL الملف
 * @param {string} fileName - اسم الملف (اختياري)
 * @param {Object} options - خيارات إضافية
 * @param {string} options.target - الهدف (افتراضي: "_blank")
 * @param {string} options.features - ميزات النافذة
 */
export async function openFileInNewWindow(fileUrl, fileName = null, options = {}) {
  if (!fileUrl) {
    console.warn("openFileInNewWindow: fileUrl is required");
    return;
  }
  
  try {
    // ✅ تحميل الملف مع authentication
    const blob = await fetchFileWithAuth(fileUrl);
    
    // ✅ استخراج اسم الملف إذا لم يتم توفيره
    if (!fileName) {
      fileName = extractFileNameFromUrl(fileUrl) || 'File';
    }
    
    // ✅ تحديد نوع الملف
    const mimeType = blob.type || 'application/octet-stream';
    
    // ✅ إنشاء صفحة HTML لعرض الملف
    const htmlContent = createFileViewerHTML(blob, fileName, mimeType);
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlBlobUrl = URL.createObjectURL(htmlBlob);
    
    // ✅ فتح صفحة HTML في نافذة جديدة
    const {
      target = "_blank",
      features = "noopener,noreferrer"
    } = options;
    
    const newWindow = window.open(htmlBlobUrl, target, features);
    
    if (!newWindow) {
      console.warn("Popup blocked. Trying fallback method.");
      // Fallback: استخدام <a> tag
      const link = document.createElement('a');
      link.href = htmlBlobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // ✅ تنظيف blob URLs بعد فتح النافذة
    setTimeout(() => {
      URL.revokeObjectURL(htmlBlobUrl);
      // Note: blob URL داخل HTML سيتم تنظيفه عند إغلاق الصفحة
    }, 1000);
  } catch (error) {
    console.error("Error opening file with auth:", error);
    // ✅ Fallback: محاولة فتح الملف مباشرة (للملفات العامة)
    const fullUrl = buildFileUrl(fileUrl);
    if (fullUrl) {
      window.open(fullUrl, options.target || "_blank", options.features || "noopener,noreferrer");
    }
  }
}

/**
 * معالج onClick آمن لفتح الملفات (للاستخدام في JSX)
 * @param {string} fileUrl - URL الملف
 * @returns {Function} معالج onClick
 */
export function handleFileClick(fileUrl, fileName = null) {
  return async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await openFileInNewWindow(fileUrl, fileName);
  };
}

