// Hook موحد لإدارة بيانات العقد
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { toInputDate, toIsoDate } from "../utils/formatters";
import { toYesNo } from "../utils/helpers";
import { extractFileNameFromUrl } from "../utils/fileHelpers";

const INITIAL_FORM = {
  contract_classification: "",
  contract_type: "",
  tender_no: "",
  contract_date: "",
  owners: [],
  contractor_name: "",
  contractor_name_en: "",
  contractor_trade_license: "",
  contractor_phone: "",
  contractor_email: "",
  total_project_value: "",
  total_bank_value: "",
  total_owner_value: "",
  project_duration_months: "",
  owner_includes_consultant: "no",
  owner_fee_design_percent: "",
  owner_fee_supervision_percent: "",
  owner_fee_extra_mode: "percent",
  owner_fee_extra_value: "",
  bank_includes_consultant: "no",
  bank_fee_design_percent: "",
  bank_fee_supervision_percent: "",
  bank_fee_extra_mode: "percent",
  bank_fee_extra_value: "",
  has_start_order: "no",
  start_order_file: null,
  start_order_date: "",
  start_order_notes: "",
  project_end_date: "",
  contract_file: null,
  contract_file_url: null,
  contract_file_name: null,
  contract_appendix_file: null,
  contract_appendix_file_url: null,
  contract_appendix_file_name: null,
  contract_explanation_file: null,
  contract_explanation_file_url: null,
  contract_explanation_file_name: null,
  general_notes: "",
  attachments: [], // المرفقات الديناميكية
  extensions: [], // التمديدات: [{reason: string, days: number, months: number}, ...]
  // ✅ مرفقات العقد الثابتة
  quantities_table_file: null,
  quantities_table_file_url: null,
  quantities_table_file_name: null,
  approved_materials_table_file: null,
  approved_materials_table_file_url: null,
  approved_materials_table_file_name: null,
  price_offer_file: null,
  price_offer_file_url: null,
  price_offer_file_name: null,
  contractual_drawings_file: null,
  contractual_drawings_file_url: null,
  contractual_drawings_file_name: null,
  general_specifications_file: null,
  general_specifications_file_url: null,
  general_specifications_file_name: null,
};

export default function useContract(projectId) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [existingId, setExistingId] = useState(null);
  const [isView, setIsView] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // قراءة عقد موجود
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length) {
          const s = data[0];
          setExistingId(s.id);
          
          
          // ✅ تصفية attachments لإزالة أي مرفقات من نوع "main_contract"
          //    لأن العقد الأصيل له قسم مستقل ولا يجب أن يظهر في الملاحق التعاقدية
          const filteredAttachments = Array.isArray(s.attachments) 
            ? s.attachments
                .filter(att => {
                  // ✅ إزالة مرفقات من نوع "main_contract"
                  if (att && att.type === "main_contract") {
                    return false;
                  }
                  return true;
                })
                .map(att => {
                  
                  // ✅ محاولة قراءة file_url من عدة مصادر محتملة
                  const fileUrl = att.file_url || att.file || null;
                  // ✅ محاولة قراءة file_name من عدة مصادر محتملة
                  const fileName = att.file_name || (fileUrl ? extractFileNameFromUrl(fileUrl) : null);
                  
                  const mappedAtt = {
                    type: att.type || "appendix",
                    date: att.date || "",
                    notes: att.notes || "",
                    file: null, // لا نحمل File object
                    file_url: fileUrl,
                    file_name: fileName,
                  };
                  
                  
                  return mappedAtt;
                })
            : [];
          
          
          setForm((prev) => ({
            ...prev,
            ...s,
            // ✅ التأكد من تحميل contract_classification بشكل صريح
            contract_classification: s.contract_classification || prev.contract_classification || "",
            contract_date: toInputDate(s.contract_date) || prev.contract_date || "",
            owner_includes_consultant: toYesNo(s.owner_includes_consultant),
            bank_includes_consultant: toYesNo(s.bank_includes_consultant),
            // ✅ تحويل start_order_exists (boolean) إلى has_start_order (yes/no)
            has_start_order: toYesNo(s.start_order_exists),
            start_order_notes: s.start_order_notes || "",
            // الحفاظ على start_order_file كـ null (سيتم تحميله في ContractStep)
            start_order_file: null,
            // ✅ تحميل التمديدات مع الحقول الجديدة
            extensions: Array.isArray(s.extensions) 
              ? s.extensions.map(ext => ({
                  reason: ext.reason || "",
                  days: ext.days || 0,
                  months: ext.months || 0,
                  extension_date: ext.extension_date || "",
                  approval_number: ext.approval_number || "",
                  file: null, // لا نحمل File object
                  file_url: ext.file_url || null,
                  file_name: ext.file_name || null,
                }))
              : [],
            // ✅ تحميل owners من العقد (إذا كانت موجودة)
            owners: Array.isArray(s.owners) && s.owners.length > 0 ? s.owners : prev.owners || [],
            // ✅ استخدام attachments المصفاة (بدون main_contract) مع التأكد من وجود file_url و file_name
            attachments: filteredAttachments,
            // ✅ تحميل ملفات العقد مع file_url و file_name
            contract_file: null,
            contract_file_url: s.contract_file || null,
            contract_file_name: s.contract_file ? (s.contract_file_name || extractFileNameFromUrl(s.contract_file) || null) : null,
            contract_appendix_file: null,
            contract_appendix_file_url: s.contract_appendix_file || null,
            contract_appendix_file_name: s.contract_appendix_file ? (s.contract_appendix_file_name || extractFileNameFromUrl(s.contract_appendix_file) || null) : null,
            contract_explanation_file: null,
            contract_explanation_file_url: s.contract_explanation_file || null,
            contract_explanation_file_name: s.contract_explanation_file ? (s.contract_explanation_file_name || extractFileNameFromUrl(s.contract_explanation_file) || null) : null,
            // ✅ تحميل المرفقات الثابتة مع file_url و file_name
            quantities_table_file: null,
            quantities_table_file_url: s.quantities_table_file || null,
            quantities_table_file_name: s.quantities_table_file ? (s.quantities_table_file_name || extractFileNameFromUrl(s.quantities_table_file) || null) : null,
            approved_materials_table_file: null,
            approved_materials_table_file_url: s.approved_materials_table_file || null,
            approved_materials_table_file_name: s.approved_materials_table_file ? (s.approved_materials_table_file_name || extractFileNameFromUrl(s.approved_materials_table_file) || null) : null,
            price_offer_file: null,
            price_offer_file_url: s.price_offer_file || null,
            price_offer_file_name: s.price_offer_file ? (s.price_offer_file_name || extractFileNameFromUrl(s.price_offer_file) || null) : null,
            contractual_drawings_file: null,
            contractual_drawings_file_url: s.contractual_drawings_file || null,
            contractual_drawings_file_name: s.contractual_drawings_file ? (s.contractual_drawings_file_name || extractFileNameFromUrl(s.contractual_drawings_file) || null) : null,
            general_specifications_file: null,
            general_specifications_file_url: s.general_specifications_file || null,
            general_specifications_file_name: s.general_specifications_file ? (s.general_specifications_file_name || extractFileNameFromUrl(s.general_specifications_file) || null) : null,
          }));
          // لا نضع setIsView(true) تلقائياً - سيبقى في وضع edit حتى يختار المستخدم view
        }
      } catch {}
    })();
  }, [projectId]);

  // جلب بيانات الملاك والمقاول
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const [spRes, lcRes] = await Promise.allSettled([
          api.get(`projects/${projectId}/siteplan/`),
          api.get(`projects/${projectId}/license/`),
        ]);

        // ✅ تحميل owners من العقد أولاً (إذا كانت موجودة)، وإلا من SitePlan
        if (spRes.status === "fulfilled" && Array.isArray(spRes.value?.data) && spRes.value.data.length) {
          const sp = spRes.value.data[0];
          const ownersArr = Array.isArray(sp.owners) ? sp.owners : [];
          setForm((prev) => {
            // ✅ إذا كان owners موجود في العقد، نستخدمه، وإلا نستخدم owners من SitePlan
            if (Array.isArray(prev.owners) && prev.owners.length > 0) {
              return prev; // لا نغير owners إذا كانت موجودة من العقد
            }
            return {
              ...prev,
              owners: ownersArr.map((o) => ({ ...o })),
            };
          });
        }

        if (lcRes.status === "fulfilled" && Array.isArray(lcRes.value?.data) && lcRes.value.data.length) {
          const lc = lcRes.value.data[0];
          setForm((prev) => ({
            ...prev,
            // ✅ جلب بيانات المقاول من الرخصة (إذا لم تكن موجودة في العقد)
            contractor_name: prev.contractor_name || lc.contractor_name || "",
            contractor_name_en: prev.contractor_name_en || lc.contractor_name_en || "",
            contractor_trade_license: prev.contractor_trade_license || lc.contractor_license_no || "",
            contractor_phone: prev.contractor_phone || lc.contractor_phone || "",
            contractor_email: prev.contractor_email || lc.contractor_email || "",
          }));
        }
      } catch {}
    })();
  }, [projectId]);

  // ✅ تم إزالة التعيين التلقائي لتاريخ اليوم
  // المستخدم يجب أن يدخل تاريخ العقد يدوياً حسب المستند

  return { form, setForm, setF, existingId, setExistingId, isView, setIsView };
}

