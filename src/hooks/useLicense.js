// Hook موحد لإدارة بيانات الرخصة
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { toInputDate } from "../utils/formatters";
import { toLocalizedUse, isRO } from "../utils/licenseHelpers";

const INITIAL_FORM = {
  license_type: "",
  project_no: "",
  project_name: "",
  license_project_no: "",
  license_project_name: "",
  license_no: "",
  issue_date: "",
  license_file_ref: "",
  license_stage_or_worktype: "",
  city: "",
  license_status: "",
  zone: "",
  sector: "",
  plot_no: "",
  plot_area_sqm: "",
  land_use: "",
  land_use_sub: "",
  land_plan_no: "",
  plot_address: "",
  consultant_name: "",
  consultant_license_no: "",
  contractor_name: "",
  contractor_license_no: "",
  expiry_date: "",
  technical_decision_ref: "",
  technical_decision_date: "",
  license_notes: "",
  building_license_file: null,
  consultant_same: true,
  design_consultant_name: "",
  design_consultant_name_en: "",
  design_consultant_license_no: "",
  supervision_consultant_name: "",
  supervision_consultant_name_en: "",
  supervision_consultant_license_no: "",
  contractor_name_en: "",
  contractor_phone: "",
  contractor_email: "",
};

export function normalizeOwner(o) {
  return {
    owner_name_ar: o.owner_name_ar || o.owner_name || "",
    owner_name_en: o.owner_name_en || "",
    nationality: o.nationality || "",
    id_number: o.id_number || "", // ✅ التأكد من الحفاظ على id_number
    id_issue_date: o.id_issue_date || "",
    id_expiry_date: o.id_expiry_date || "",
    right_hold_type: o.right_hold_type || "Ownership",
    share_possession: o.share_possession || "",
    share_percent: (o.share_percent ?? "").toString(),
    phone: o.phone || "",
    email: o.email || "",
  };
}

export default function useLicense(projectId, i18n) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [owners, setOwners] = useState([]);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // تحميل الرخصة الموجودة
  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/license/`);
        if (!mounted) return;
        if (Array.isArray(data) && data.length) {
          const s = data[0];
          setExistingId(s.id);
          setForm((prev) => ({
            ...INITIAL_FORM,
            ...s,
            consultant_same: s.consultant_same ?? true,
            design_consultant_name: s.design_consultant_name || "",
            design_consultant_name_en: s.design_consultant_name_en || "",
            design_consultant_license_no: s.design_consultant_license_no || "",
            supervision_consultant_name: s.supervision_consultant_name || "",
            supervision_consultant_name_en: s.supervision_consultant_name_en || "",
            supervision_consultant_license_no: s.supervision_consultant_license_no || "",
            contractor_name: s.contractor_name || "",
            contractor_name_en: s.contractor_name_en || "",
            contractor_license_no: s.contractor_license_no || "",
            contractor_phone: s.contractor_phone || "",  // ✅ التأكد من التحميل
            contractor_email: s.contractor_email || "",  // ✅ التأكد من التحميل
            issue_date: toInputDate(s.issue_date),
            last_issue_date: toInputDate(s.last_issue_date),
            expiry_date: toInputDate(s.expiry_date),
            technical_decision_date: toInputDate(s.technical_decision_date),
            land_use: toLocalizedUse(s.land_use ?? prev.land_use, i18n.language),
            land_use_sub: toLocalizedUse(s.land_use_sub ?? prev.land_use_sub, i18n.language),
            building_license_file: null,
          }));

          // ✅ لا نأخذ الملاك من الرخصة - سنأخذها من السايت بلان دائماً
          // هذا يضمن أن الملاك موحدة في كل النظام
        } else {
          // إذا لم يكن هناك بيانات، نعيد تعيين النموذج
          if (mounted) {
            setForm(INITIAL_FORM);
            setOwners([]);
            setExistingId(null);
          }
        }
      } catch (err) {
        // Error handled by caller
        if (mounted) {
          setForm(INITIAL_FORM);
          setOwners([]);
          setExistingId(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [projectId, i18n.language]);

  // قراءة SitePlan لملء الحقول - ✅ دائماً نأخذ الملاك والبيانات من السايت بلان
  // ✅ هذا الـ useEffect يعمل دائماً لضمان أن البيانات محدثة من السايت بلان
  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    
    const loadSitePlanData = async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;
        if (!Array.isArray(data) || !data.length) return;
        const s = data[0];

        setForm((prev) => {
          const next = { ...prev };
          const landUseRaw = s.allocation_name_ar || s.allocation_name || s.allocation_type || "";
          const landUseSubRaw = s.land_use_ar || s.land_use || "";

          // ✅ تحديث البيانات من السايت بلان دائماً (حتى لو كانت موجودة)
          // هذا يضمن أن البيانات محدثة من المصدر الأساسي
          if (s.municipality) next.city = s.municipality;
          if (s.zone) next.zone = s.zone;
          if (s.land_no) next.plot_no = s.land_no;
          if (s.sector) next.sector = s.sector;
          if (s.plot_address) next.plot_address = s.plot_address;
          if (s.plot_area_sqm) next.plot_area_sqm = s.plot_area_sqm;

          if (landUseRaw) next.land_use = toLocalizedUse(landUseRaw, i18n.language);
          if (landUseSubRaw) next.land_use_sub = toLocalizedUse(landUseSubRaw, i18n.language);

          return next;
        });

        // ✅ دائماً نأخذ الملاك من السايت بلان (حتى لو كانت موجودة في الرخصة)
        // هذا يضمن أن الملاك موحدة في كل النظام
        if (Array.isArray(s.owners) && s.owners.length > 0) {
          setOwners(s.owners.map(normalizeOwner));
        } else {
          setOwners([]);
        }
      } catch (e) {
        // Silent error handling
      }
    };
    
    // تحميل فوري
    loadSitePlanData();
    
    // ✅ الاستماع لتحديثات الملاك من السايت بلان
    const handleOwnersUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadSitePlanData();
      }
    };
    
    const handleOwnersLoaded = (event) => {
      if (event.detail?.projectId === projectId && event.detail?.owners) {
        // ✅ تحديث الملاك مباشرة من الحدث
        setOwners(event.detail.owners.map(normalizeOwner));
        // ✅ لا نستدعي loadSitePlanData هنا - handleOwnersUpdate سيعمله لتجنب duplicate calls
      }
    };
    
    window.addEventListener('siteplan-owners-updated', handleOwnersUpdate);
    window.addEventListener('siteplan-owners-loaded', handleOwnersLoaded);
    
    return () => { 
      mounted = false;
      window.removeEventListener('siteplan-owners-updated', handleOwnersUpdate);
      window.removeEventListener('siteplan-owners-loaded', handleOwnersLoaded);
    };
  }, [projectId, i18n.language]);

  // تبديل اللغة
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      land_use: toLocalizedUse(prev.land_use, i18n.language),
      land_use_sub: toLocalizedUse(prev.land_use_sub, i18n.language),
    }));
  }, [i18n.language, setForm]);

  return { form, setForm, setF, owners, setOwners, existingId, setExistingId, isView, setIsView, isRO };
}

