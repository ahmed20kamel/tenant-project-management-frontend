// مكون لإدارة مرفق ثابت من مرفقات العقد (مثل جدول الكميات، جدول المواد المعتمدة، إلخ)
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";

export default function StaticContractAttachmentFile({
  label,
  value, // File أو null
  fileUrl, // URL الملف الموجود
  fileName, // اسم الملف الموجود
  onChange, // (file: File | null) => void
  onRemoveExisting, // () => void
  accept = ".pdf,.xlsx,.xls",
  maxSizeMB = 10,
  isView = false,
  projectId,
  endpoint,
}) {
  if (isView) {
    return (
      <Field label={label}>
        {fileUrl ? (
          <FileAttachmentView
            fileUrl={fileUrl}
            fileName={fileName || extractFileNameFromUrl(fileUrl)}
            projectId={projectId}
            endpoint={endpoint}
          />
        ) : (
          <div className="card text-center prj-muted p-20">لا يوجد ملف</div>
        )}
      </Field>
    );
  }

  return (
    <Field label={label}>
      <FileUpload
        value={value}
        onChange={onChange}
        accept={accept}
        maxSizeMB={maxSizeMB}
        showPreview={true}
        existingFileUrl={fileUrl}
        existingFileName={fileName || (fileUrl ? extractFileNameFromUrl(fileUrl) : "")}
        onRemoveExisting={onRemoveExisting}
      />
    </Field>
  );
}

