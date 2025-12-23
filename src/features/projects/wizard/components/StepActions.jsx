// src/pages/wizard/components/StepActions.jsx
import { useTranslation } from "react-i18next";

export default function StepActions({
  onPrev,
  onNext,
  disableNext = false,
  nextLabel,          // نص مخصص لزر التالي/الإنهاء
  nextClassName = "primary", // الافتراضي Primary
  prevLabel,          // نص مخصص لزر الرجوع
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // تسميات افتراضية مترجمة
  const backText = prevLabel ?? t("back");
  const arrow = isRTL ? "←" : "→";
  const nextText = nextLabel ?? `${t("save_next")} ${arrow}`;

  const handleNext = () => {
    if (disableNext) return;
    if (typeof onNext === "function") onNext();
  };

  return (
    <div
      className="wizard-footer"
      dir={isRTL ? "rtl" : "ltr"}
      role="group"
      aria-label={t("actions") || "Actions"}
      style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16 }}
    >
      {onPrev ? (
        <button
          type="button"
          className="btn secondary"
          onClick={onPrev}
          aria-label={backText}
        >
          {backText}
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        className={`btn ${nextClassName}`}
        onClick={handleNext}
        disabled={disableNext}
        aria-disabled={disableNext ? "true" : "false"}
        aria-label={nextText}
      >
        {nextText}
      </button>
    </div>
  );
}
