// Utility functions for approval status display

export const APPROVAL_STATUS_CONFIG = {
  draft: {
    label: {
      ar: "مسودة",
      en: "Draft",
    },
    color: "#6b7280", // gray
    bgColor: "#f3f4f6",
    badge: "مسودة",
  },
  pending: {
    label: {
      ar: "في انتظار الموافقة",
      en: "Pending Approval",
    },
    color: "#f59e0b", // amber
    bgColor: "#fef3c7",
    badge: "⏳ في انتظار الموافقة",
  },
  approved: {
    label: {
      ar: "معتمدة (تحتاج اعتماد نهائي)",
      en: "Approved (Needs Final)",
    },
    color: "#3b82f6", // blue
    bgColor: "#dbeafe",
    badge: "✅ معتمدة",
  },
  rejected: {
    label: {
      ar: "مرفوضة",
      en: "Rejected",
    },
    color: "#ef4444", // red
    bgColor: "#fee2e2",
    badge: "❌ مرفوضة",
  },
  final_approved: {
    label: {
      ar: "معتمدة نهائياً",
      en: "Final Approved",
    },
    color: "#10b981", // green
    bgColor: "#d1fae5",
    badge: "✅ معتمدة نهائياً",
  },
  delete_requested: {
    label: {
      ar: "طلب حذف",
      en: "Delete Requested",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "🗑️ طلب حذف",
  },
  delete_approved: {
    label: {
      ar: "تم الموافقة على الحذف",
      en: "Delete Approved",
    },
    color: "#ef4444",
    bgColor: "#fee2e2",
    badge: "🗑️ حذف معتمد",
  },
};

export function getApprovalStatusConfig(status) {
  return APPROVAL_STATUS_CONFIG[status] || APPROVAL_STATUS_CONFIG.draft;
}

export function getApprovalStatusLabel(status, language = "ar") {
  const config = getApprovalStatusConfig(status);
  return config.label[language] || config.label.ar;
}

export function getApprovalStatusColor(status) {
  const config = getApprovalStatusConfig(status);
  return config.color;
}

export function getApprovalStatusBadge(status) {
  const config = getApprovalStatusConfig(status);
  return config.badge;
}

