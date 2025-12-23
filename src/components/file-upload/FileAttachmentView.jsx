import { useTranslation } from "react-i18next";
import { FaEye, FaDownload } from "react-icons/fa";
import Button from "../common/Button";
import { buildFileUrl } from "../../utils/fileHelpers";

export default function FileAttachmentView({ fileUrl, fileName, projectId, endpoint }) {
  const { t } = useTranslation();

  if (!fileUrl && !fileName) {
    return <div style={{ color: "#999", fontStyle: "italic" }}>{t("no_file_attached")}</div>;
  }

  // استخراج اسم الملف وفك ترميز URL
  const getDisplayName = () => {
    if (fileName) {
      try {
        // محاولة فك ترميز URL إذا كان الاسم مرمز
        return decodeURIComponent(fileName);
      } catch {
        return fileName;
      }
    }
    if (fileUrl) {
      try {
        const urlParts = fileUrl.split("/");
        const lastPart = urlParts[urlParts.length - 1] || "";
        // فك ترميز URL
        return decodeURIComponent(lastPart);
      } catch {
        const urlParts = fileUrl.split("/");
        return urlParts[urlParts.length - 1] || t("file");
      }
    }
    return t("file");
  };

  const displayName = getDisplayName();

  const handleView = async (e) => {
    // ✅ منع أي سلوك افتراضي أو propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!fileUrl) return;
    
    try {
      // ✅ استخدام buildFileUrl للحصول على API endpoint محمي
      const apiUrl = buildFileUrl(fileUrl);
      if (!apiUrl) {
        console.error('لا يمكن بناء URL للملف:', fileUrl);
        return;
      }

      // ✅ تحميل الملف من API endpoint محمي مع JWT token
      const isDev = import.meta.env.DEV;
      const apiBase = isDev ? "/api" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const fullApiUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;
      
      // ✅ الحصول على JWT token من localStorage
      const token = localStorage.getItem('access_token');
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
              const { api } = await import("../../services/api");
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
              
              // ✅ استخدام دالة محسّنة لفتح الملف مع عنوان واضح
              const { openFileInNewWindow } = await import("../../utils/fileHelpers");
              await openFileInNewWindow(fileUrl, displayName, {});
              return;
            } catch (refreshError) {
              console.error("Token refresh failed:", refreshError);
              throw new Error("Authentication failed. Please login again.");
            }
          }
        }
        
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // ✅ استخدام دالة محسّنة لفتح الملف مع عنوان واضح
      const { openFileInNewWindow } = await import("../../utils/fileHelpers");
      await openFileInNewWindow(fileUrl, displayName, {});
    } catch (error) {
      console.error('خطأ في فتح الملف:', error);
      // ✅ Fallback: محاولة فتح الملف مباشرة (للملفات العامة)
      try {
        const fullUrl = buildFileUrl(fileUrl);
        if (fullUrl) {
          const link = document.createElement('a');
          link.href = fullUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (fallbackError) {
        console.error('خطأ في fallback:', fallbackError);
      }
    }
  };

  const handleDownload = async (e) => {
    // ✅ منع أي سلوك افتراضي أو propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!fileUrl) return;

    try {
      // ✅ استخدام buildFileUrl للحصول على API endpoint محمي
      const apiUrl = buildFileUrl(fileUrl);
      if (!apiUrl) {
        console.warn("Could not build download URL");
        return;
      }

      // ✅ تحميل الملف من API endpoint محمي مع JWT token
      const isDev = import.meta.env.DEV;
      const apiBase = isDev ? "/api" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const fullApiUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;
      
      const token = localStorage.getItem('access_token');
      const headers = {
        'Accept': '*/*',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(fullApiUrl, {
        method: 'GET',
        credentials: 'include', // ✅ إرسال cookies مع الطلب
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // ✅ إنشاء رابط تحميل
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = displayName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ✅ تنظيف blob URL بعد التحميل
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: فتح في نافذة جديدة
      handleView(e);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "12px",
      padding: "12px",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: "8px"
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: 500, 
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "14px"
        }} title={displayName}>
          {displayName}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <Button
          variant="secondary"
          onClick={(e) => handleView(e)}
          disabled={!fileUrl}
          style={{ minWidth: "auto", padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          title={t("view_file")}
        >
          <FaEye />
          <span>{t("view")}</span>
        </Button>
        <Button
          variant="primary"
          onClick={(e) => handleDownload(e)}
          disabled={!fileUrl}
          style={{ minWidth: "auto", padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          title={t("download_file")}
        >
          <FaDownload />
          <span>{t("download")}</span>
        </Button>
      </div>
    </div>
  );
}

