// src/pages/wizard/components/SetupSummary.jsx
import { useTranslation } from "react-i18next";

export default function SetupSummary({ setup }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (!setup) return null;
  const { projectType, villaCategory, contractType, contractClassification } = setup;

  // ✅ استخدم i18n فقط لضمان أن اللغة دايمًا تطابق الواجهة
  const projectTypeText =
    ({
      villa:        t("project_type_villa"),
      commercial:   t("project_type_commercial"),
      maintenance:  t("project_type_maintenance"),
      governmental: t("project_type_governmental"),
      government:   t("project_type_governmental"),
      fitout:       t("project_type_fitout"),
      // لو عندك نوع للبنية التحتية أضف مفتاح ترجمة مخصص (مثلاً project_type_infra)
      infra:        t("project_type_fitout"),
    }[projectType]) || projectType || "";

  const villaCategoryText =
    villaCategory === "residential"
      ? t("villa_residential")
      : villaCategory === "commercial"
      ? t("villa_commercial")
      : "";

  const contractTypeText =
    contractType === "new"
      ? t("contract_new")
      : contractType === "continue"
      ? t("contract_continue")
      : "";

  const contractClassificationText =
    contractClassification === "housing_loan_program"
      ? t("contract.classification.housing_loan_program.label")
      : contractClassification === "private_funding"
      ? t("contract.classification.private_funding.label")
      : "";

  const items = [];

  if (projectType) {
    items.push(
      <span key="type" className="badge">
        <b>{t("setup_project_category_title")}:</b>&nbsp;{projectTypeText}
      </span>
    );
  }

  if (projectType === "villa" && villaCategory) {
    items.push(
      <span key="villa" className="badge">
        <b>{t("setup_subcategories_title")}:</b>&nbsp;{villaCategoryText}
      </span>
    );
  }

  if (contractType) {
    items.push(
      <span key="contract" className="badge">
        <b>{t("setup_contract_type_title")}:</b>&nbsp;{contractTypeText}
      </span>
    );
  }

  if (contractClassification) {
    items.push(
      <span key="classification" className="badge">
        <b>{t("contract.sections.classification")}:</b>&nbsp;{contractClassificationText}
      </span>
    );
  }

  if (!items.length) return null;

  return (
    <div className="summary" dir={isRTL ? "rtl" : "ltr"}>
      {items}
    </div>
  );
}
