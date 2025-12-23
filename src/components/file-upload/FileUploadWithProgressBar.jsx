// frontend/src/components/FileUploadWithProgressBar.jsx
import { useState } from 'react';
import FileUpload from './FileUpload';
import './FileUploadWithProgressBar.css';

/**
 * مكون بسيط لرفع الملفات مع شريط تقدم
 * يعرض شريط التقدم أثناء الرفع (عند الحفظ)
 * يسمح للمستخدم بالاستمرار في إدخال البيانات
 */
export default function FileUploadWithProgressBar({
  value,
  onChange,
  uploadProgress = 0, // progress من 0-100
  isUploading = false, // حالة الرفع
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
  return (
    <div className={`file-upload-with-progress-bar ${className}`}>
      <FileUpload
        value={value}
        onChange={onChange}
        accept={accept}
        maxSizeMB={maxSizeMB}
        label={label}
        disabled={disabled || isUploading}
        showPreview={showPreview}
        compressionOptions={compressionOptions}
        existingFileUrl={existingFileUrl}
        existingFileName={existingFileName}
        onRemoveExisting={onRemoveExisting}
        fileType={fileType}
        fileIndex={fileIndex}
      />

      {/* شريط التقدم أثناء الرفع */}
      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar">
            <div 
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="upload-progress-text">
            {uploadProgress}%
          </span>
        </div>
      )}
    </div>
  );
}

