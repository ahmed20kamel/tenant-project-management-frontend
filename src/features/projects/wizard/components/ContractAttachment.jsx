// مكون لإدارة مرفق واحد من مرفقات العقد
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import DateInput from "../../../../components/fields/DateInput";
import Button from "../../../../components/common/Button";
import NumberField from "../../../../components/forms/NumberField";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { formatDate, formatMoney } from "../../../../utils/formatters";

const ATTACHMENT_TYPES = [
  { value: "appendix", label: "ملحق عقد" },
  { value: "explanation", label: "توضيح تعاقدي" },
  { value: "bank_contract", label: "عقد بنك" },
];

export default function ContractAttachment({
  attachment,
  index, // ✅ للعرض فقط (appendixNumber)
  attachmentIndex, // ✅ الفهرس الفعلي في المصفوفة
  isView,
  onUpdate,
  onRemove,
  canRemove,
  projectId,
  isPrivateFunding = false, // ✅ نوع التمويل: إذا كان true، نخفي "عقد بنك"
}) {
  const { t, i18n } = useTranslation();

  // ✅ تصفية أنواع المرفقات بناءً على نوع التمويل
  const availableAttachmentTypes = ATTACHMENT_TYPES.filter((type) => {
    // ✅ حذف "عقد بنك" إذا كان التمويل من المالك فقط
    if (isPrivateFunding && type.value === "bank_contract") {
      return false;
    }
    return true;
  });

  // ✅ استخدام attachmentIndex الفعلي، إذا لم يكن موجوداً نستخدم index (للتوافق مع الكود القديم)
  const actualIndex = attachmentIndex !== undefined ? attachmentIndex : index;

  // ✅ حساب التسمية بناءً على النوع وعدد الملاحق
  const getAttachmentTypeLabel = (type, appendixNum) => {
    if (type === "appendix") {
      return `ملحق عقد ${appendixNum + 1}`;
    }
    const typeOption = availableAttachmentTypes.find((opt) => opt.value === type);
    return typeOption ? typeOption.label : type;
  };

  const attachmentTypeLabel = getAttachmentTypeLabel(attachment.type, index);
  const hasPrice = attachment.price !== undefined && attachment.price !== null && attachment.price !== "";
  const priceDisplay = hasPrice
    ? (Number.isFinite(Number(attachment.price)) ? formatMoney(Number(attachment.price)) : attachment.price)
    : "";

  // ✅ تسجيل البيانات للتحقق في وضع العرض
  if (isView && process.env.NODE_ENV === "development") {
    console.log("🔍 ContractAttachment (View Mode):", {
      type: attachment.type,
      file_url: attachment.file_url,
      file_name: attachment.file_name,
      has_file_url: !!attachment.file_url,
      full_attachment: attachment,
    });
  }

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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          {/* نوع المرفق - صف كامل */}
          <ViewRow label="نوع المرفق" value={attachmentTypeLabel} />
          
          {/* التاريخ والسعر في نفس الصف */}
          <div className="form-grid cols-2" style={{ gap: "16px" }}>
            <ViewRow label="تاريخ المرفق" value={attachment.date ? formatDate(attachment.date, i18n.language) : ""} />
            {hasPrice && (
              <ViewRow
                label="سعر الملحق"
                value={priceDisplay}
              />
            )}
          </div>

          {/* رفع الملف أسفل التاريخ والسعر */}
          <Field label="الملف">
            {(() => {
              // ✅ التحقق من وجود file_url مع تسجيل للتحقق
              const hasFileUrl = !!(attachment.file_url);
              if (process.env.NODE_ENV === "development") {
                console.log("🔍 ContractAttachment render (View Mode):", {
                  hasFileUrl,
                  file_url: attachment.file_url,
                  file_name: attachment.file_name,
                  attachment_keys: Object.keys(attachment),
                });
              }
              
              if (hasFileUrl) {
                return (
                  <FileAttachmentView
                    fileUrl={attachment.file_url}
                    fileName={attachment.file_name || extractFileNameFromUrl(attachment.file_url)}
                    projectId={projectId}
                    endpoint={`projects/${projectId}/contract/`}
                  />
                );
              } else {
                return (
                  <div className="card text-center prj-muted p-20">لا يوجد ملف</div>
                );
              }
            })()}
          </Field>
          
          {/* الملاحظات - صف كامل */}
          {attachment.notes && (
            <ViewRow label="ملاحظات" value={attachment.notes} />
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
        <h5 style={{ margin: 0, color: "var(--text)", fontSize: "18px" }}>
          {attachment.type ? attachmentTypeLabel : "مرفق جديد"}
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
        {/* نوع المرفق - صف كامل */}
        <Field label="نوع المرفق">
          <RtlSelect
            className="rtl-select"
            options={availableAttachmentTypes}
            value={attachment.type || ""}
            onChange={(v) => {
              onUpdate(actualIndex, "type", v);
            }}
            placeholder="اختر نوع المرفق"
          />
        </Field>

        {/* التاريخ والسعر في نفس الصف */}
        <div className="form-grid cols-2" style={{ gap: "16px" }}>
          <Field label="تاريخ المرفق">
            <DateInput
              className="input"
              value={attachment.date || ""}
              onChange={(value) => onUpdate(actualIndex, "date", value)}
            />
          </Field>
          <Field label="سعر الملحق">
            <NumberField
              value={attachment.price ?? ""}
              onChange={(v) => onUpdate(actualIndex, "price", v)}
              min={0}
            />
          </Field>
        </div>

        {/* رفع الملف - صف كامل أسفل التاريخ والسعر */}
        <Field label="رفع الملف">
          <FileUpload
            value={attachment.file}
            onChange={(file) => onUpdate(actualIndex, "file", file)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={10}
            showPreview={true}
            existingFileUrl={attachment.file_url}
            existingFileName={attachment.file_name || (attachment.file_url ? extractFileNameFromUrl(attachment.file_url) : "")}
            onRemoveExisting={() => {
              // ✅ إزالة الملف الموجود (file_url و file_name) عند الحذف
              onUpdate(actualIndex, "file_url", null);
              onUpdate(actualIndex, "file_name", null);
              onUpdate(actualIndex, "file", null);
            }}
            compressionOptions={{
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
            }}
          />
        </Field>

        {/* الملاحظات - صف كامل */}
        <Field label="ملاحظات (اختياري)">
          <textarea
            className="input"
            rows={3}
            value={attachment.notes || ""}
            onChange={(e) => onUpdate(actualIndex, "notes", e.target.value)}
            placeholder="أدخل الملاحظات (اختياري)..."
            style={{ resize: "vertical" }}
          />
        </Field>
      </div>
    </div>
  );
}

