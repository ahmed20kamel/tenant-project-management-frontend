// دوال مساعدة عامة
import i18n from "../config/i18n";

// تحويل قيمة إلى رقم
export const num = (v, d = 0) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : d;
};

// تحويل boolean إلى yes/no
export const toYesNo = (b) => (b ? "yes" : "no");

// تحويل yes/no إلى boolean
export const toBool = (v) => v === true || v === "yes";

// تنسيق أخطاء الخادم مع i18n
export function formatServerErrors(data) {
  if (!data) return "";
  const tErr = (k) => i18n.t(`errors.${k}`, k);

  const lines = [];
  const walk = (value, path = []) => {
    if (Array.isArray(value)) {
      if (value.every(v => typeof v !== "object")) {
        const key = path.length ? tErr(path.at(-1)) : "";
        lines.push(`• ${key ? key + ": " : ""}${value.map(String).join(" • ")}`);
        return;
      }
      value.forEach((item, i) => {
        const last = path.at(-1);
        const label = last ? `${tErr(last)} [${i}]` : `[${i}]`;
        if (typeof item !== "object") lines.push(`• ${label}: ${String(item)}`);
        else Object.entries(item || {}).forEach(([k, v]) =>
          walk(v, [...path.slice(0, -1), `${label} → ${tErr(k)}`])
        );
      });
      return;
    }
    if (typeof value === "object" && value) {
      for (const [k, v] of Object.entries(value)) walk(v, [...path, k]);
      return;
    }
    const key = path.length ? tErr(path.at(-1)) : "";
    const prefix = path.slice(0, -1)
      .map((p) => (String(p).includes("→") ? p : tErr(p)))
      .filter(Boolean)
      .join(" → ");
    const fullKey = [prefix, key].filter(Boolean).join(" → ");
    lines.push(`• ${fullKey ? fullKey + ": " : ""}${String(value)}`);
  };
  walk(data);
  return lines.join("\n");
}

// تحويل نص إلى تسمية بشرية
export const humanize = (s) =>
  String(s || "")
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// الحصول على تسمية للحقل
export const labelForKey = (k) => {
  const last = String(k).split(".").pop();
  const tr = i18n.t(`errors.${last}`, last);
  return tr === last ? humanize(k) : tr;
};

// دمج مصفوفة
export const joinArr = (a) =>
  Array.isArray(a) ? a.filter((v) => v != null && v !== "").join("، ") : a;

// تسطيح كائن متداخل
export const flattenEntries = (obj, prefix = "") => {
  const out = [];
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    const key = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "object" && v && !Array.isArray(v)) {
      out.push(...flattenEntries(v, key));
    } else {
      out.push([key, joinArr(v)]);
    }
  });
  return out;
};

// ترتيب تفضيلي لبعض الحقول الشائعة
export const PRIMARY_ORDER = [
  "owner_name_ar",
  "owner_name_en",
  "owner_name",
  "nationality",
  "id_number",
  "id_issue_date",
  "id_expiry_date",
  "phone",
  "email",
  "address",
  "share_possession",
  "right_hold_type",
  "share_percent",
];

