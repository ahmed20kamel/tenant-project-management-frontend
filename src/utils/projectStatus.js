// Utility functions for project status display with colors

export const PROJECT_STATUS_CONFIG = {
  // الحالات الجديدة بناءً على الدفعات
  not_started: {
    label: {
      ar: "لم يبدأ بعد",
      en: "Not Yet Started",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
  },
  execution_started: {
    label: {
      ar: "بدأ التنفيذ",
      en: "Execution Started",
    },
    color: "#10b981", // green
    bgColor: "#d1fae5",
  },
  under_execution: {
    label: {
      ar: "قيد التنفيذ",
      en: "Under Execution",
    },
    color: "#eab308", // yellow
    bgColor: "#fef9c3",
  },
  temporarily_suspended: {
    label: {
      ar: "متوقف مؤقتا",
      en: "Temporarily Suspended",
    },
    color: "#ef4444", // red
    bgColor: "#fee2e2",
  },
  handover_stage: {
    label: {
      ar: "في مرحلة التسليم",
      en: "In Handover Stage",
    },
    color: "#a855f7", // purple
    bgColor: "#f3e8ff",
  },
  pending_financial_closure: {
    label: {
      ar: "قيد الإغلاق المالي",
      en: "Pending Financial Closure",
    },
    color: "#92400e", // brown
    bgColor: "#fef3c7",
  },
  completed: {
    label: {
      ar: "تم الانتهاء من التنفيذ",
      en: "Completed",
    },
    color: "#059669", // darker green
    bgColor: "#d1fae5",
  },
  // الحالات القديمة (للتوافق)
  draft: {
    label: {
      ar: "مسودة",
      en: "Draft",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
  },
  in_progress: {
    label: {
      ar: "قيد التنفيذ",
      en: "In Progress",
    },
    color: "#3b82f6", // blue
    bgColor: "#dbeafe",
  },
};

export function getProjectStatusConfig(status) {
  return PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.draft;
}

export function getProjectStatusLabel(status, language = "ar") {
  const config = getProjectStatusConfig(status);
  return config.label[language] || config.label.ar;
}

export function getProjectStatusColor(status) {
  const config = getProjectStatusConfig(status);
  return config.color;
}

export function getProjectStatusBgColor(status) {
  const config = getProjectStatusConfig(status);
  return config.bgColor;
}
