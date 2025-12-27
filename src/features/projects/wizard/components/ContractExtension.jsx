// مكون لإدارة تمديد واحد من تمديدات العقد
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import DateInput from "../../../../components/fields/DateInput";
import Button from "../../../../components/common/Button";
import NumberField from "../../../../components/forms/NumberField";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { formatDate } from "../../../../utils/formatters";

export default function ContractExtension({
  extension,
  index, // ✅ رقم التمديد (1, 2, 3, ...)
  extensionIndex, // ✅ الفهرس الفعلي في المصفوفة
  isView,
  onUpdate,
  onRemove,
  canRemove,
  projectId,
}) {
  const { t, i18n } = useTranslation();

  // ✅ استخدام extensionIndex الفعلي، إذا لم يكن موجوداً نستخدم index
  const actualIndex = extensionIndex !== undefined ? extensionIndex : index;

  if (isView) {
    return (
      <div style={{ 
        padding: "20px", 
        background: "var(--surface)", 
        borderRadius: "12px",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* ✅ إزالة العنوان المرقم من View mode */}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          {/* سبب التمديد */}
          <ViewRow label="سبب التمديد" value={extension.reason || ""} />
          
          {/* تاريخ التمديد ورقم الاعتماد */}
          <div className="form-grid cols-2" style={{ gap: "16px" }}>
            <ViewRow label="تاريخ التمديد" value={extension.extension_date ? formatDate(extension.extension_date, i18n.language) : ""} />
            <ViewRow label="رقم الاعتماد" value={extension.approval_number || ""} />
          </div>
          
          {/* مدة التمديد */}
          <div className="form-grid cols-2" style={{ gap: "16px" }}>
            <ViewRow label="مدة التمديد (أيام)" value={extension.days || 0} />
            <ViewRow label="مدة التمديد (شهور)" value={extension.months || 0} />
          </div>
          
          {/* ملف التمديد */}
          {extension.file_url && (
            <Field label="ملف التمديد">
              <FileAttachmentView
                fileUrl={extension.file_url}
                fileName={extension.file_name || extractFileNameFromUrl(extension.file_url)}
                projectId={projectId}
                endpoint={`projects/${projectId}/start-order/`}
              />
            </Field>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: "20px", 
      background: "var(--surface)", 
      borderRadius: "12px",
      border: "1px solid var(--border)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h5 style={{ margin: 0, color: "var(--text)", fontSize: "18px", fontWeight: "600" }}>
          تمديد {index + 1}
        </h5>
        {canRemove && (
          <Button
            variant="secondary"
            type="button"
            onClick={() => onRemove(actualIndex)}
            style={{ padding: "8px 16px", fontSize: "14px" }}
          >
            حذف
          </Button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
        {/* سبب التمديد */}
        <Field label="سبب التمديد">
          <input
            className="input"
            type="text"
            value={extension.reason || ""}
            onChange={(e) => onUpdate(actualIndex, "reason", e.target.value)}
            placeholder="أدخل سبب التمديد"
            dir="rtl"
          />
        </Field>

        {/* تاريخ التمديد ورقم الاعتماد */}
        <div className="form-grid cols-2" style={{ gap: "16px" }}>
          <Field label="تاريخ التمديد">
            <DateInput
              className="input"
              value={extension.extension_date || ""}
              onChange={(value) => onUpdate(actualIndex, "extension_date", value)}
            />
          </Field>
          <Field label="رقم الاعتماد">
            <input
              className="input"
              type="text"
              value={extension.approval_number || ""}
              onChange={(e) => onUpdate(actualIndex, "approval_number", e.target.value)}
              placeholder="أدخل رقم الاعتماد"
              dir="rtl"
            />
          </Field>
        </div>

        {/* مدة التمديد */}
        <div className="form-grid cols-2" style={{ gap: "16px" }}>
          <Field label="مدة التمديد (أيام)">
            <NumberField
              value={extension.days || ""}
              onChange={(v) => onUpdate(actualIndex, "days", v ? Number(v) : 0)}
              min={0}
              placeholder="0"
              dir="rtl"
            />
          </Field>
          <Field label="مدة التمديد (شهور)">
            <NumberField
              value={extension.months || ""}
              onChange={(v) => onUpdate(actualIndex, "months", v ? Number(v) : 0)}
              min={0}
              placeholder="0"
              dir="rtl"
            />
          </Field>
        </div>

        {/* ملف التمديد */}
        <Field label="رفع ملف التمديد">
          <FileUpload
            value={extension.file}
            onChange={(file) => onUpdate(actualIndex, "file", file)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={10}
            showPreview={true}
            existingFileUrl={extension.file_url}
            existingFileName={extension.file_name || (extension.file_url ? extractFileNameFromUrl(extension.file_url) : "")}
            onRemoveExisting={() => {
              onUpdate(actualIndex, "file", null);
              onUpdate(actualIndex, "file_url", null);
              onUpdate(actualIndex, "file_name", null);
            }}
            fileType="extension_file"
            fileIndex={actualIndex}
          />
        </Field>
      </div>
    </div>
  );
}
