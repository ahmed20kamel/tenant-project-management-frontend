// مكون موحد لنموذج المالك
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import Button from "../../../../components/common/Button";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import DateInput from "../../../../components/fields/DateInput";
import { NATIONALITIES } from "../../../../utils/constants";
import { handleEmiratesIdInput } from "../../../../utils/idFormatters";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { formatOwnerName, formatUAEPhone, calculateBirthDateFromEmiratesId } from "../../../../utils/inputFormatters";
import { formatDate } from "../../../../utils/formatters";

export const EMPTY_OWNER = {
  owner_name_ar: "",
  owner_name_en: "",
  nationality: "",
  id_number: "",
  id_issue_date: "",
  id_expiry_date: "",
  id_attachment: null,
  right_hold_type: "Ownership",
  share_possession: "",
  share_percent: "100",
  phone: "",
  email: "",
  is_authorized: false, // ✅ المالك المفوض
};

export default function OwnerForm({ owner, index, isView, onUpdate, onRemove, canRemove, isAR, idAttachmentUrl, projectId, idAttachmentFileName, hideContactInfo = false, isAuthorized = false, onAuthorizedChange }) {
  const { t, i18n } = useTranslation();
  const nationalityOptions = NATIONALITIES.map(n => ({
    value: n.value,
    label: isAR ? n.label.ar : n.label.en
  }));

  if (isView) {
    return (
      <div className="card">
        {/* ✅ عرض المالك المفوض في وضع العرض */}
        {owner.is_authorized && (
          <div style={{ marginBottom: "16px", padding: "12px", background: "var(--primary-50)", borderRadius: "8px", border: "2px solid var(--primary)" }}>
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>
              {t("authorized_owner") || "المالك المفوض"} ✓
            </span>
          </div>
        )}
        <div className="form-grid cols-4">
          <ViewRow label={t("owner_name_ar")} value={owner.owner_name_ar} />
          <ViewRow label={t("owner_name_en")} value={owner.owner_name_en} />
          <ViewRow label={t("nationality")} value={owner.nationality} />
          <ViewRow
            label={t("share_percent")}
            value={owner.share_percent ? `${parseFloat(owner.share_percent) % 1 === 0 ? parseInt(owner.share_percent, 10) : parseFloat(owner.share_percent)}%` : "0%"}
          />
          <ViewRow label={t("phone")} value={owner.phone} />
          <ViewRow label={t("email")} value={owner.email} />
          <ViewRow label={t("id_number")} value={owner.id_number} />
          {owner.birth_date && (
            <ViewRow label={t("birth_date") || "تاريخ الميلاد"} value={formatDate(owner.birth_date, i18n.language)} />
          )}
          {owner.nationality !== "Emirati" && (
            <ViewRow label={t("issue_date")} value={formatDate(owner.id_issue_date, i18n.language)} />
          )}
          <ViewRow label={t("expiry_date")} value={formatDate(owner.id_expiry_date, i18n.language)} />
          <Field label={t("id_attachment")}>
            <FileAttachmentView
              fileUrl={
                // ✅ إذا كان owner.id_attachment هو string (URL)، نستخدمه مباشرة
                // ✅ وإلا نستخدم idAttachmentUrl من props
                typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                  ? owner.id_attachment
                  : idAttachmentUrl
              }
              fileName={
                typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                  ? extractFileNameFromUrl(owner.id_attachment)
                  : (idAttachmentFileName || (idAttachmentUrl ? extractFileNameFromUrl(idAttachmentUrl) : "") || (owner.id_attachment?.name || ""))
              }
              projectId={projectId}
              endpoint={`projects/${projectId}/siteplan/`}
            />
          </Field>
          <ViewRow label={t("right_hold_type")} value={owner.right_hold_type} />
        </div>
      </div>
    );
  }

  return (
    <div className="owner-block">
      {/* ✅ Radio Button لاختيار المالك المفوض */}
      {onAuthorizedChange && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "var(--surface-2)", borderRadius: "8px", border: isAuthorized ? "2px solid var(--primary)" : "1px solid var(--border)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="radio"
              name="authorized_owner"
              checked={isAuthorized}
              onChange={() => onAuthorizedChange(index)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: isAuthorized ? 600 : 400, color: isAuthorized ? "var(--primary)" : "var(--text)" }}>
              {t("authorized_owner") || "المالك المفوض"}
            </span>
          </label>
        </div>
      )}
      <div className="form-grid cols-3">
        <Field label={t("owner_name_ar")}>
          <input
            className="input"
            value={owner.owner_name_ar}
            onChange={(e) => onUpdate(index, "owner_name_ar", e.target.value)}
          />
        </Field>
        <Field label={t("owner_name_en")}>
          <input
            className="input"
            value={owner.owner_name_en}
            onChange={(e) => {
              const formatted = formatOwnerName(e.target.value);
              onUpdate(index, "owner_name_en", formatted);
            }}
          />
        </Field>
        <Field label={t("nationality")}>
          <RtlSelect
            className="rtl-select"
            options={nationalityOptions}
            value={owner.nationality}
            onChange={(v) => onUpdate(index, "nationality", v)}
            placeholder={t("select_nationality")}
          />
        </Field>
      </div>

      {!hideContactInfo && (
        <div className="form-grid cols-3 mt-8">
        <Field label={t("phone")}>
          <div style={{ display: "flex", alignItems: "center", flexDirection: "row-reverse" }}>
            <span
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                minWidth: "70px",
                textAlign: "center",
                color: "var(--muted)",
                marginRight: "8px",
              }}
            >
              +971
            </span>
            <input
              className="input"
              type="tel"
              value={owner.phone ? owner.phone.replace("+971", "") : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const trimmed = digits.replace(/^0+/, "").slice(0, 9);
                const formatted = trimmed ? `+971${trimmed}` : "";
                onUpdate(index, "phone", formatted);
              }}
              placeholder="XXXXXXXXX"
              inputMode="numeric"
            />
          </div>
        </Field>
          <Field label={t("email")}>
            <input
              className="input"
              type="email"
              value={owner.email}
              onChange={(e) => onUpdate(index, "email", e.target.value)}
            />
          </Field>
          <div />
        </div>
      )}

      <div className="form-grid cols-4 mt-8">
        <Field label={t("id_number")}>
          <input
            className="input"
            value={owner.id_number || ""}
            onChange={(e) => {
              handleEmiratesIdInput(e, (v) => {
                onUpdate(index, "id_number", v);
                // ✅ حساب تاريخ الميلاد تلقائياً
                if (v && v.replace(/[-\s]/g, "").length === 15) {
                  const birthDate = calculateBirthDateFromEmiratesId(v);
                  if (birthDate) {
                    onUpdate(index, "birth_date", birthDate);
                  }
                }
              });
            }}
            maxLength={18}
            placeholder={t("id_placeholder")}
          />
        </Field>
        {owner.nationality !== "Emirati" && (
          <Field label={t("issue_date")}>
            <DateInput
              className="input"
              value={owner.id_issue_date || ""}
              onChange={(value) => onUpdate(index, "id_issue_date", value)}
            />
          </Field>
        )}
        <Field label={t("expiry_date")}>
          <DateInput
            className="input"
            value={owner.id_expiry_date || ""}
            onChange={(value) => onUpdate(index, "id_expiry_date", value)}
          />
        </Field>
        <Field label={t("id_attachment")}>
          <FileUpload
            value={owner.id_attachment instanceof File ? owner.id_attachment : null}
            onChange={(file) => onUpdate(index, "id_attachment", file)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={10}
            showPreview={true}
            existingFileUrl={
              // ✅ إذا كان owner.id_attachment هو string (URL)، نستخدمه مباشرة
              // ✅ وإلا نستخدم idAttachmentUrl من props
              typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                ? owner.id_attachment
                : idAttachmentUrl
            }
            existingFileName={
              typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                ? extractFileNameFromUrl(owner.id_attachment)
                : (idAttachmentFileName || (idAttachmentUrl ? extractFileNameFromUrl(idAttachmentUrl) : ""))
            }
            onRemoveExisting={() => onUpdate(index, "id_attachment", null)}
            compressionOptions={{
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
            }}
          />
        </Field>
      </div>

      <div className="form-grid cols-4 mt-8">
        <Field label={t("right_hold_type")}>
          <select
            className="input"
            value={owner.right_hold_type}
            onChange={(e) => onUpdate(index, "right_hold_type", e.target.value)}
          >
            <option value={t("right_hold_type_grant")}>{t("right_hold_type_grant")}</option>
            <option value={t("right_hold_type_purchase")}>{t("right_hold_type_purchase")}</option>
          </select>
        </Field>
        <Field label={t("share_percent")}>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={owner.share_percent}
              onChange={(e) => onUpdate(index, "share_percent", e.target.value)}
              style={{ paddingRight: "30px" }}
            />
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>%</span>
          </div>
        </Field>
        <Field label={t("action")}>
          <Button
            variant="secondary"
            type="button"
            onClick={() => onRemove(index)}
            disabled={!canRemove}
            title={t("remove")}
          >
            {t("remove")}
          </Button>
        </Field>
        <div />
      </div>
    </div>
  );
}

