// Hook موحد لإدارة بيانات مخطط الأرض
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { toInputDateUnified } from "../utils/dateHelpers";
import { EMPTY_OWNER } from "../features/projects/wizard/components/OwnerForm";
import { sqm2ft, ft2sqm } from "../utils/areaConverters";

const INITIAL_FORM = {
  application_number: "",
  application_date: "",
  application_file: null,
  municipality: "",
  zone: "",
  sector: "",
  road_name: "",
  plot_area_sqm: "",
  plot_area_sqft: "",
  land_no: "",
  plot_address: "",
  construction_status: "",
  allocation_type: "Residential",
  land_use: "Residential",
  base_district: "",
  overlay_district: "",
  allocation_date: "",
  project_no: "",
  project_name: "",
  developer_name: "",
  source_of_project: "",
  notes: "",
};

export default function useSitePlan(projectId, setup) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    land_use: setup?.projectType === "commercial" ? "Investment" : "Residential",
  });

  const [owners, setOwners] = useState([{ ...EMPTY_OWNER }]);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);
  const [lock, setLock] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ✅ إعادة تعيين القيم عند فتح مشروع جديد (projectId = null)
  useEffect(() => {
    if (!projectId) {
      // مشروع جديد - إعادة تعيين كل القيم إلى الافتراضية تماماً
      setForm({
        ...INITIAL_FORM,
        land_use: setup?.projectType === "commercial" ? "Investment" : "Residential",
      });
      setOwners([{ ...EMPTY_OWNER }]);
      setExistingId(null);
      setIsView(false);
      setLock(false);
    }
  }, [projectId]); // ✅ فقط projectId

  // ✅ تحديث land_use عند تغيير projectType في مشروع جديد
  useEffect(() => {
    if (!projectId && setup?.projectType) {
      setForm((prev) => ({
        ...prev,
        land_use: setup.projectType === "commercial" ? "Investment" : "Residential",
      }));
    }
  }, [projectId, setup?.projectType]);

  // تحميل البيانات من الباك
  useEffect(() => {
    if (!projectId) return;

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;

        if (Array.isArray(data) && data.length > 0) {
          const s = data[0];

          setExistingId(s.id);

          setForm({
            ...INITIAL_FORM,
            ...s,
            application_file: null,
            application_date: toInputDateUnified(s.application_date),
            allocation_date: toInputDateUnified(s.allocation_date),
            land_use:
              s.land_use ||
              (setup?.projectType === "commercial"
                ? "Investment"
                : "Residential"),
          });

          // ========= تحميل الملاك =========
          if (s.owners && Array.isArray(s.owners) && s.owners.length > 0) {
            const loadedOwners = s.owners.map((o, idx, arr) => ({
              ...EMPTY_OWNER,
              ...o,

              id: o.id, // ✅ مهم جداً جداً - يجب الحفاظ عليه عند التحديث

              owner_name_ar: o.owner_name_ar || o.owner_name || "",
              owner_name_en: o.owner_name_en || "",
              id_number: o.id_number || "",
              nationality: o.nationality || "",
              phone: o.phone || "",
              email: o.email || "",
              right_hold_type: o.right_hold_type || "Ownership",
              share_possession: o.share_possession || "",

              id_issue_date: toInputDateUnified(o.id_issue_date),
              id_expiry_date: toInputDateUnified(o.id_expiry_date),

              share_percent:
                arr.length === 1 ? "100" : String(o.share_percent ?? 0),

              // ✅ الحفاظ على id_attachment كـ URL string (ليس File object)
              // هذا مهم جداً - عندما يكون URL string، يعني الملف موجود في السيرفر
              id_attachment:
                typeof o.id_attachment === "string" &&
                o.id_attachment.trim() !== ""
                  ? o.id_attachment
                  : null,
            }));


            setOwners(loadedOwners);

            // إعلام بقية الخطوات
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("siteplan-owners-loaded", {
                  detail: { projectId, owners: loadedOwners },
                })
              );
            }
          } else {
            setOwners([{ ...EMPTY_OWNER }]);
          }
        } else {
          setForm({
            ...INITIAL_FORM,
            land_use:
              setup?.projectType === "commercial"
                ? "Investment"
                : "Residential",
          });
          setOwners([{ ...EMPTY_OWNER }]);
          setExistingId(null);
        }
      } catch (err) {
        // Silent error handling
        if (mounted) {
          setForm({
            ...INITIAL_FORM,
            land_use:
              setup?.projectType === "commercial"
                ? "Investment"
                : "Residential",
          });
          setOwners([{ ...EMPTY_OWNER }]);
          setExistingId(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId, setup?.projectType]);

  // sqm → sqft
  const onSqmChange = (v) => {
    if (lock) return;
    setLock(true);
    setF("plot_area_sqm", v);
    setF("plot_area_sqft", v ? sqm2ft(v).toFixed(2) : "");
    setLock(false);
  };

  // sqft → sqm
  const onSqftChange = (v) => {
    if (lock) return;
    setLock(true);
    setF("plot_area_sqft", v);
    setF("plot_area_sqm", v ? ft2sqm(v).toFixed(2) : "");
    setLock(false);
  };

  // إدارة الملاك
  const addOwner = () =>
    setOwners((prev) => [...prev, { ...EMPTY_OWNER, share_percent: "0" }]);

  const removeOwner = (i) =>
    setOwners((prev) => prev.filter((_, idx) => idx !== i));

  const updateOwner = (i, key, value) =>
    setOwners((prev) => {
      const x = [...prev];
      // ✅ الحفاظ على جميع البيانات الموجودة بما فيها id
      // ✅ عند تحديث id_attachment، نحافظ على id إذا كان موجوداً
      const updatedOwner = { ...x[i], [key]: value };
      // ✅ إذا كان id موجوداً في المالك الأصلي، نحافظ عليه
      if (x[i].id !== undefined) {
        updatedOwner.id = x[i].id;
      }
      x[i] = updatedOwner;
      return x;
    });

  return {
    form,
    setForm,
    setF,
    owners,
    setOwners,
    existingId,
    setExistingId,
    isView,
    setIsView,
    onSqmChange,
    onSqftChange,
    addOwner,
    removeOwner,
    updateOwner,
  };
}
