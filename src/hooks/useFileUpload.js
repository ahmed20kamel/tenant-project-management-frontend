// frontend/src/hooks/useFileUpload.js
import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

/**
 * Hook لرفع الملفات في الخلفية تلقائياً
 * يسمح للمستخدم بالاستمرار في إدخال البيانات أثناء رفع الملف
 */
export function useFileUpload(endpoint, options = {}) {
  const [uploadingFiles, setUploadingFiles] = useState(new Map()); // Map<fileName, { progress, status, url }>
  const [uploadedFiles, setUploadedFiles] = useState(new Map()); // Map<fileName, url>
  const uploadAbortControllers = useRef(new Map()); // Map<fileName, AbortController>

  const uploadFile = useCallback(async (file, fieldName, onProgress) => {
    if (!file || !(file instanceof File)) {
      return null;
    }

    const fileKey = `${fieldName}_${file.name}_${file.size}`;

    // إذا كان الملف مرفوعاً بالفعل، نعيد URL
    if (uploadedFiles.has(fileKey)) {
      return uploadedFiles.get(fileKey);
    }

    // إذا كان الملف قيد الرفع، ننتظر
    if (uploadingFiles.has(fileKey)) {
      const uploadInfo = uploadingFiles.get(fileKey);
      if (uploadInfo.status === 'uploading') {
        // نعيد promise للانتظار
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            const currentInfo = uploadingFiles.get(fileKey);
            if (currentInfo?.status === 'completed') {
              clearInterval(checkInterval);
              resolve(currentInfo.url);
            } else if (currentInfo?.status === 'error') {
              clearInterval(checkInterval);
              reject(new Error(currentInfo.error));
            }
          }, 100);
        });
      }
    }

    // إنشاء AbortController لإمكانية الإلغاء
    const abortController = new AbortController();
    uploadAbortControllers.current.set(fileKey, abortController);

    // تحديث حالة الرفع
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.set(fileKey, {
        progress: 0,
        status: 'uploading',
        fileName: file.name,
        fieldName,
      });
      return newMap;
    });

    try {
      const formData = new FormData();
      formData.append(fieldName, file, file.name);

      // رفع الملف مع تتبع التقدم
      const response = await api.post(endpoint, formData, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadingFiles(prev => {
              const newMap = new Map(prev);
              const current = newMap.get(fileKey);
              if (current) {
                newMap.set(fileKey, { ...current, progress });
              }
              return newMap;
            });
            if (onProgress) {
              onProgress(progress);
            }
          }
        },
      });

      // استخراج URL من الاستجابة
      let fileUrl = null;
      if (response?.data) {
        // محاولة استخراج URL من الاستجابة
        fileUrl = response.data[fieldName] || 
                  response.data.file_url || 
                  response.data.url ||
                  (typeof response.data === 'string' ? response.data : null);
      }

      // تحديث حالة الرفع إلى مكتمل
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(fileKey, {
          progress: 100,
          status: 'completed',
          fileName: file.name,
          fieldName,
          url: fileUrl,
        });
        return newMap;
      });

      // حفظ في الملفات المرفوعة
      if (fileUrl) {
        setUploadedFiles(prev => {
          const newMap = new Map(prev);
          newMap.set(fileKey, fileUrl);
          return newMap;
        });
      }

      // تنظيف AbortController
      uploadAbortControllers.current.delete(fileKey);

      return fileUrl;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        // تم إلغاء الرفع
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileKey);
          return newMap;
        });
        return null;
      }

      // خطأ في الرفع
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(fileKey, {
          progress: 0,
          status: 'error',
          fileName: file.name,
          fieldName,
          error: error.message || 'Upload failed',
        });
        return newMap;
      });

      uploadAbortControllers.current.delete(fileKey);
      throw error;
    }
  }, [endpoint, uploadingFiles, uploadedFiles]);

  const cancelUpload = useCallback((fileKey) => {
    const abortController = uploadAbortControllers.current.get(fileKey);
    if (abortController) {
      abortController.abort();
      uploadAbortControllers.current.delete(fileKey);
    }
    setUploadingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileKey);
      return newMap;
    });
  }, []);

  const getUploadStatus = useCallback((file, fieldName) => {
    if (!file || !(file instanceof File)) return null;
    const fileKey = `${fieldName}_${file.name}_${file.size}`;
    return uploadingFiles.get(fileKey) || null;
  }, [uploadingFiles]);

  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles(new Map());
    setUploadingFiles(new Map());
  }, []);

  return {
    uploadFile,
    cancelUpload,
    getUploadStatus,
    uploadingFiles: Array.from(uploadingFiles.values()),
    uploadedFiles: Array.from(uploadedFiles.values()),
    clearUploadedFiles,
  };
}

