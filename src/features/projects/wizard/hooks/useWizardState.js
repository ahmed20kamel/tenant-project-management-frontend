// src/pages/wizard/hooks/useWizardState.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "wizard_setup_state_v1";

// قيم وأنسجة ثابتة لتوحيد الاستخدام عبر الخطوات
export const PROJECT_TYPES = {
  villa: "فيلا",
  commercial: "تجاري",
  maintenance: "صيانة",
  fitout: "فيت أوت",
  infra: "بنية تحتية",
  gov: "حكومي",
};

export function labelProjectType(v) {
  return PROJECT_TYPES[v] ?? v;
}

export default function useWizardState() {
  const [setup, setSetup] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : { projectType: "", villaCategory: "", contractType: "", contractClassification: "" };
    } catch {
      return { projectType: "", villaCategory: "", contractType: "", contractClassification: "" };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {}
  }, [setup]);

  return { setup, setSetup };
}
