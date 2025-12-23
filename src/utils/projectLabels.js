// دوال مساعدة للحصول على تسميات المشروع
import { PROJECT_TYPES, VILLA_CATEGORIES, CONTRACT_TYPES } from "./constants";

/**
 * الحصول على تسمية نوع المشروع
 */
export const getProjectTypeLabel = (type, lang = "ar") => {
  const types = PROJECT_TYPES[lang === "ar" ? "ar" : "en"];
  const found = types.find(([v]) => v === type);
  return found ? found[1] : type || "—";
};

/**
 * الحصول على تسمية فئة الفيلا
 */
export const getVillaCategoryLabel = (category, lang = "ar") => {
  const categories = VILLA_CATEGORIES[lang === "ar" ? "ar" : "en"];
  const found = categories.find(([v]) => v === category);
  return found ? found[1] : category || "—";
};

/**
 * الحصول على تسمية نوع العقد
 * يدعم كلا من CONTRACT_TYPES (new, continue) و contract.types (lump_sum, percentage, etc.)
 */
export const getContractTypeLabel = (type, lang = "ar") => {
  if (!type) return "—";
  
  // أولاً: البحث في CONTRACT_TYPES (new, continue)
  const setupTypes = CONTRACT_TYPES[lang === "ar" ? "ar" : "en"];
  const foundSetup = setupTypes.find(([v]) => v === type);
  if (foundSetup) return foundSetup[1];
  
  // ثانياً: البحث في contract.types (lump_sum, percentage, design_build, re_measurement)
  const contractTypesMap = {
    ar: {
      lump_sum: "مقطوع",
      percentage: "نسبة",
      design_build: "تصميم وتنفيذ",
      re_measurement: "إعادة قياس",
    },
    en: {
      lump_sum: "Lump Sum",
      percentage: "Percentage",
      design_build: "Design & Build",
      re_measurement: "Re-measurement",
    },
  };
  
  const contractTypes = contractTypesMap[lang === "ar" ? "ar" : "en"];
  return contractTypes[type] || type || "—";
};

