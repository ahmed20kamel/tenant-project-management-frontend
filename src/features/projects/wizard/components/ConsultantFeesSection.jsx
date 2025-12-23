// مكون موحد لقسم أتعاب الاستشاري
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import NumberField from "../../../../components/forms/NumberField";
import YesNoChips from "../../../../components/ui/YesNoChips";

// ✅ دالة لإزالة الأصفار الزائدة من القيم المعروضة فقط (مثل 2.00 → 2)
// لا تغير القيمة الأصلية، فقط للتنسيق في العرض
const formatPercentValue = (value) => {
  if (!value || value === "" || value === "0") return "0";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // إزالة الأصفار الزائدة: إذا كان عدد صحيح (2.00) → 2، وإلا (2.5) → 2.5
  return num % 1 === 0 ? String(Math.floor(num)) : String(num);
};

export default function ConsultantFeesSection({
  prefix, // "owner" أو "bank"
  form,
  setF,
  isView,
  isAR,
}) {
  const { t } = useTranslation();
  
  const EXTRA_FEE_MODE = useMemo(
    () => [
      { value: "percent", label: t("contract.fees.mode.percent") },
      { value: "fixed", label: t("contract.fees.mode.fixed") },
      { value: "other", label: t("contract.fees.mode.other") },
    ],
    [t]
  );

  const includesConsultant = form[`${prefix}_includes_consultant`];
  const showFees = includesConsultant === "yes";

  const handlePercentChange = (field) => (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setF(field, "");
      return;
    }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) return;
    const normalized = num % 1 === 0 ? String(Math.floor(num)) : String(num);
    setF(field, normalized);
  };

  if (isView) {
    return (
      <div className="form-grid cols-1" style={{ gap: "var(--space-4)" }}>
        <ViewRow
          label={t("contract.fees.include_consultant")}
          value={includesConsultant === "yes" ? t("yes") : t("no")}
        />
        {showFees && (
          <>
            <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
              <ViewRow
                label={t("contract.fees.design_percent")}
                value={form[`${prefix}_fee_design_percent`] ? `${formatPercentValue(form[`${prefix}_fee_design_percent`])}%` : "0%"}
              />
              <ViewRow
                label={t("contract.fees.supervision_percent")}
                value={form[`${prefix}_fee_supervision_percent`] ? `${formatPercentValue(form[`${prefix}_fee_supervision_percent`])}%` : "0%"}
              />
            </div>
            <ViewRow
              label={t("contract.fees.extra_type")}
              value={EXTRA_FEE_MODE.find(m => m.value === form[`${prefix}_fee_extra_mode`])?.label || form[`${prefix}_fee_extra_mode`]}
            />
            <ViewRow
              label={t("contract.fees.extra_value")}
              value={form[`${prefix}_fee_extra_value`] || "0.00"}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="form-grid cols-1" style={{ gap: "var(--space-4)" }}>
      <Field label={t("contract.fees.include_consultant")}>
        <YesNoChips
          value={includesConsultant}
          onChange={(v) => setF(`${prefix}_includes_consultant`, v)}
        />
      </Field>

      {showFees && (
        <>
          <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
            <Field label={t("contract.fees.design_percent")}>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form[`${prefix}_fee_design_percent`] || ""}
                  onChange={handlePercentChange(`${prefix}_fee_design_percent`)}
                  placeholder="0"
                  dir={isAR ? "rtl" : "ltr"}
                  style={{ paddingRight: isAR ? "8px" : "32px", paddingLeft: isAR ? "32px" : "8px" }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--text)",
                    [isAR ? "left" : "right"]: "10px",
                  }}
                >
                  %
                </span>
              </div>
            </Field>
            <Field label={t("contract.fees.supervision_percent")}>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form[`${prefix}_fee_supervision_percent`] || ""}
                  onChange={handlePercentChange(`${prefix}_fee_supervision_percent`)}
                  placeholder="0"
                  dir={isAR ? "rtl" : "ltr"}
                  style={{ paddingRight: isAR ? "8px" : "32px", paddingLeft: isAR ? "32px" : "8px" }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--text)",
                    [isAR ? "left" : "right"]: "10px",
                  }}
                >
                  %
                </span>
              </div>
            </Field>
          </div>
          <Field label={t("contract.fees.extra_type")}>
            <RtlSelect
              className="rtl-select"
              dir={isAR ? "rtl" : "ltr"}
              options={EXTRA_FEE_MODE}
              value={form[`${prefix}_fee_extra_mode`]}
              onChange={(v) => setF(`${prefix}_fee_extra_mode`, v)}
            />
          </Field>
          <Field label={t("contract.fees.extra_value")}>
            <NumberField
              value={form[`${prefix}_fee_extra_value`]}
              onChange={(v) => setF(`${prefix}_fee_extra_value`, v)}
            />
          </Field>
        </>
      )}
    </div>
  );
}

