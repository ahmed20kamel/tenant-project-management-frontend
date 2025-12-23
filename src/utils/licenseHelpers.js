// دوال مساعدة خاصة بالرخصة
const EN_AR = { Residential: "سكني", Commercial: "تجاري", Government: "حكومي", Investment: "استثماري" };
const AR_EN = Object.fromEntries(Object.entries(EN_AR).map(([en, ar]) => [ar, en]));

export const toLocalizedUse = (v, lang) => (!v ? "" : /^ar\b/i.test(lang) ? (EN_AR[v] || v) : (AR_EN[v] || v));

// حقول read-only من SitePlan
export const RO_FIELDS = new Set([
  "city", "zone", "sector", "plot_no", "plot_area_sqm",
  "land_use", "land_use_sub", "land_plan_no", "plot_address",
  "project_no", "project_name"
]);

export const isRO = (k) => RO_FIELDS.has(k);

