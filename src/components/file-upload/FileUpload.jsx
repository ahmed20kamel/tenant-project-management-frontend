// frontend/src/components/FileUpload.jsx
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFile, FaCheckCircle, FaTimes, FaEye } from 'react-icons/fa';
import { formatFileSize, validateFileSize } from '../../utils/fileCompression';
import Button from '../common/Button';
import { buildFileUrl, extractFileNameFromUrl } from '../../utils/fileHelpers';
import './FileUpload.css';

/**
 * مكون موحد لرفع الملفات في النظام بالكامل
 * 
 * هذا هو المكون الموحد الوحيد لرفع الملفات في النظام.
 * يجب استخدامه في جميع الشاشات لضمان الاتساق في:
 * - العرض والمعاينة
 * - الاستبدال والحذف
 * - التحقق من الحجم والنوع
 * - ضغط الصور تلقائياً
 * 
 * الميزات:
 * - ضغط تلقائي للصور
 * - معاينة الملف
 * - التحقق من الحجم والنوع
 * - دعم الملفات الموجودة مسبقاً
 * - تصميم موحد ومتناسق
 */
export default function FileUpload({
  value, // File أو null
  onChange, // (file: File | null) => void
  onProgress, // (progress: number) => void (اختياري)
  // يتم تجاهل accept الخارجي لضمان توحيد PDF فقط
  accept = "application/pdf",
  maxSizeMB = 10,
  label,
  disabled = false,
  showPreview = true,
  compressionOptions = {},
  existingFileUrl,
  existingFileName,
  onRemoveExisting,
  className = "",
  fileType = "attachment", // نوع الملف لتحديد الاسم الموحد
  fileIndex = 0, // الفهرس للملفات المتعددة
}) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const processAndSetFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setIsProcessing(true);

    try {
      // التحقق من الحجم
      if (!validateFileSize(file, maxSizeMB)) {
        setError(t('file_too_large') || `الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`);
        setIsProcessing(false);
        return;
      }

      // السماح فقط بملفات PDF
      const isPdf =
        file.type === 'application/pdf' ||
        (file.name && file.name.toLowerCase().endsWith('.pdf'));
      if (!isPdf) {
        setError('يُسمح برفع ملفات PDF فقط');
        setIsProcessing(false);
        return;
      }

      // لا يوجد ضغط أو معالجة للصور لأننا نسمح بـ PDF فقط
      onChange(file);
      setError('');
    } catch (err) {
      console.error('خطأ في معالجة الملف:', err);
      setError('حدث خطأ أثناء رفع الملف');
    } finally {
      setIsProcessing(false);
    }
  }, [compressionOptions, maxSizeMB, onChange, t]);

  const effectiveAccept = "application/pdf";

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndSetFile(file);
    // إعادة تعيين input للسماح باختيار نفس الملف مرة أخرى
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExisting = () => {
    if (onRemoveExisting) {
      onRemoveExisting();
    }
  };

  const handleInputClick = () => {
    if (!disabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled || isProcessing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (disabled || isProcessing) {
      setIsDragOver(false);
      return;
    }
    const file = e.dataTransfer?.files?.[0];
    setIsDragOver(false);
    if (file) {
      await processAndSetFile(file);
      // إعادة تعيين input للسماح باختيار نفس الملف مرة أخرى
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ✅ دالة فتح الملف في نافذة جديدة
  const handlePreview = async (e) => {
    // ✅ منع أي سلوك افتراضي أو propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      // للملفات الجديدة (File object)
      if (value instanceof File) {
        const fileUrl = URL.createObjectURL(value);
        // ✅ استخدام <a> tag لتجنب popup blocker
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // تنظيف URL بعد فتح النافذة
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        return;
      }

      // للملفات الموجودة (existingFileUrl) - استخدام fetch مع credentials
      if (existingFileUrl) {
        const fullUrl = buildFileUrl(existingFileUrl);
        if (!fullUrl) {
          console.error('لا يمكن بناء URL للملف:', existingFileUrl);
          return;
        }

        // ✅ استخدام buildFileUrl للحصول على API endpoint محمي
        const apiUrl = buildFileUrl(existingFileUrl);
        if (!apiUrl) {
          throw new Error('لا يمكن بناء URL للملف');
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
        
        // ✅ استخدام دالة محسّنة لفتح الملف مع عنوان واضح
        const fileName = existingFileName || extractFileNameFromUrl(existingFileUrl) || 'File';
        const { openFileInNewWindow } = await import("../../utils/fileHelpers");
        await openFileInNewWindow(existingFileUrl, fileName, {});
      }
    } catch (error) {
      console.error('خطأ في فتح الملف:', error);
      // ✅ Fallback: محاولة فتح الملف مباشرة (للملفات العامة)
      try {
        if (existingFileUrl) {
          const fullUrl = buildFileUrl(existingFileUrl);
          if (fullUrl) {
            const link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch (fallbackError) {
        console.error('خطأ في fallback:', fallbackError);
      }
    }
  };

  return (
    <div
      className={`file-upload-wrapper ${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {label && <label className="field-label">{label}</label>}
      
      {/* الملف الموجود سابقاً */}
      {existingFileUrl && !value && (
        <div className="existing-file-info">
          <div className="file-info-row">
            <div className="file-icon-text">
              <FaFile className="file-icon" />
              <span className="file-status-text">{t('current_file') || 'الملف الحالي'}</span>
            </div>
            <div className="file-actions">
              <Button
                variant="primary"
                type="button"
                onClick={(e) => handlePreview(e)}
                className="preview-file-btn"
                size="small"
                disabled={disabled || isProcessing}
                title={t('preview_file') || 'معاينة الملف'}
              >
                <FaEye />
                <span>{t('preview') || 'معاينة'}</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleInputClick}
                className="replace-file-btn"
                size="small"
                disabled={disabled || isProcessing}
              >
                {t('replace_file') || 'استبدال'}
              </Button>
              {onRemoveExisting && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleRemoveExisting}
                  className="remove-file-btn"
                  size="small"
                >
                  <FaTimes />
                </Button>
              )}
            </div>
          </div>
          {/* Input مخفي للاستبدال */}
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
        </div>
      )}

      {/* الملف الجديد المختار */}
      {value instanceof File && (
        <div className="selected-file-info">
          <div className="file-info-row">
            <div className="file-icon-text">
              <FaCheckCircle className="file-icon file-icon-success" />
              <div className="file-status-group">
                <span className="file-status-text">{t('file_selected') || 'تم اختيار الملف'}</span>
                <span className="file-size">{formatFileSize(value.size)}</span>
              </div>
            </div>
            <div className="file-actions">
              <Button
                variant="primary"
                type="button"
                onClick={(e) => handlePreview(e)}
                className="preview-file-btn"
                size="small"
                disabled={disabled || isProcessing}
                title={t('preview_file') || 'معاينة الملف'}
              >
                <FaEye />
                <span>{t('preview') || 'معاينة'}</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleInputClick}
                className="replace-file-btn"
                size="small"
                disabled={disabled || isProcessing}
              >
                {t('replace_file') || 'استبدال'}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={handleRemove}
                className="remove-file-btn"
                disabled={isProcessing}
                size="small"
              >
                <FaTimes />
              </Button>
            </div>
          </div>
          {showPreview && value.type.startsWith('image/') && (
            <div className="file-preview">
              <img 
                src={URL.createObjectURL(value)} 
                alt="Preview" 
                className="preview-image"
              />
            </div>
          )}
          {/* Input مخفي للاستبدال */}
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
        </div>
      )}

      {/* Input رفع الملف - يظهر فقط إذا لم يكن هناك ملف موجود أو جديد */}
      {!value && !existingFileUrl && (
        <div className="file-input-wrapper" onClick={handleInputClick}>
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
          <div className="file-input-display">
            <FaFile className="file-input-icon" />
            <span className="file-input-text">
              {isProcessing 
                ? (t('processing_file') || 'جاري معالجة الملف...')
                : (t('select_file') || 'اختر ملف PDF')
              }
            </span>
            <span className="file-input-browse">{t('browse') || 'تصفح'}</span>
          </div>
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="file-error">
          {error}
        </div>
      )}

      {/* معلومات إضافية */}
      <div className="file-upload-hint">
        {`يُسمح بملفات PDF فقط - الحد الأقصى للحجم: ${maxSizeMB}MB`}
      </div>
    </div>
  );
}
