import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../services/api";
import { useAuth } from "../../../../contexts/AuthContext";
import Dialog from "../../../../components/common/Dialog";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import ConsultantFeesSection from "../components/ConsultantFeesSection";
import YesNoChips from "../../../../components/ui/YesNoChips";
import RtlSelect from "../../../../components/forms/RtlSelect";
import InfoTip from "../components/InfoTip";
import NumberField from "../../../../components/forms/NumberField";
import Button from "../../../../components/common/Button";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import DateInput from "../../../../components/fields/DateInput";
import ContractAttachment from "../components/ContractAttachment";
import StaticContractAttachmentFile from "../components/StaticContractAttachmentFile";
import PersonField from "../components/PersonField";
import useContract from "../../../../hooks/useContract";
import { formatMoney, formatMoneyArabic, toIsoDate, getDayName, formatDate } from "../../../../utils/formatters";
import { numberToArabicWords } from "../../../../utils/numberFormatting";
import { num, toBool, formatServerErrors, flattenEntries, labelForKey, PRIMARY_ORDER } from "../../../../utils/helpers";
import { getErrorMessage } from "../../../../utils/errorHandler";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { formatUAEPhone } from "../../../../utils/inputFormatters";

export default function ContractStep({ projectId, onPrev, onNext, isView: isViewProp }) {
  const { t, i18n: i18next } = useTranslation();
  const isAR = i18next.language === "ar";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { form, setForm, setF, existingId, setExistingId, isView: isViewState, setIsView } = useContract(projectId);
  const authorizedOwnerLoadingRef = useRef(false);
  const authorizedOwnerLoadedOnceRef = useRef(false);
  
  // ✅ تحميل بيانات المقاول من TenantSettings تلقائياً (مرة واحدة فقط)
  useEffect(() => {
    if (!projectId || !user?.tenant) return;
    
    (async () => {
      try {
        const { data } = await api.get('auth/tenant-settings/current/');
        if (data) {
          // ✅ ملء بيانات المقاول من TenantSettings دائماً (Single Source of Truth)
          // نستخدم البيانات من TenantSettings حتى لو كانت موجودة في الـ API
          const updates = {};
          if (data.contractor_name) {
            updates.contractor_name = data.contractor_name;
          }
          if (data.contractor_name_en) {
            updates.contractor_name_en = data.contractor_name_en;
          }
          if (data.contractor_license_no) {
            updates.contractor_trade_license = data.contractor_license_no;
          }
          if (data.contractor_phone) {
            updates.contractor_phone = data.contractor_phone;
          }
          if (data.contractor_email) {
            updates.contractor_email = data.contractor_email;
          }
          
          if (Object.keys(updates).length > 0) {
            Object.entries(updates).forEach(([key, value]) => {
              setF(key, value);
            });
          }
        }
      } catch (e) {
        console.error('❌ Error loading contractor data from tenant settings:', e);
      }
    })();
    // ✅ إزالة setF من dependencies - دالة مستقرة من hook ولا تحتاج أن تكون في deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.tenant]);
  // ✅ توحيد السلوك: إذا كان isViewProp محدد من الخارج (من WizardPage)، نستخدمه مباشرة
  // الوضع الافتراضي هو التعديل (false) وليس الفيو
  const [viewMode, setViewMode] = useState(() => {
    // إذا كان isViewProp محدد صراحة (true أو false)، نستخدمه
    if (isViewProp !== undefined) return isViewProp === true;
    // إذا لم يكن محدد، نستخدم isViewState من الـ hook
    return isViewState === true;
  });
  const hasNextStep = typeof onNext === "function";
  
  // ✅ مزامنة مع isViewProp من الخارج
  useEffect(() => {
    if (isViewProp !== undefined) {
      setViewMode(isViewProp === true);
    } else {
      // إذا لم يكن محدد من الخارج، نستخدم isViewState من الـ hook
      setViewMode(isViewState === true);
    }
  }, [isViewProp, isViewState]);

  const updateViewMode = (next) => {
    setViewMode(next);
    // ✅ تحديث isViewState في الـ hook فقط إذا لم يكن isViewProp محدد من الخارج
    if (isViewProp === undefined) {
      setIsView(next);
    }
  };
  const [errorMsg, setErrorMsg] = useState("");

  // قوائم ثابتة
  const CONTRACT_CLASSIFICATION = useMemo(
    () => [
      {
        value: "housing_loan_program",
        label: t("contract.classification.housing_loan_program.label"),
        desc: t("contract.classification.housing_loan_program.desc"),
      },
      {
        value: "private_funding",
        label: t("contract.classification.private_funding.label"),
        desc: t("contract.classification.private_funding.desc"),
      },
    ],
    [t]
  );

  const CONTRACT_TYPES = useMemo(
    () => [
      { value: "lump_sum", label: t("contract.types.lump_sum") },
      { value: "percentage", label: t("contract.types.percentage") },
      { value: "design_build", label: t("contract.types.design_build") },
      { value: "re_measurement", label: t("contract.types.re_measurement") },
    ],
    [t]
  );

  // ملاحظة: حساب project_end_date يجب أن يتم بناءً على start_order_date من StartOrder model
  // هذا الحساب يتم في backend أو في صفحة عرض المشروع
  // تم إزالة الحساب هنا لأن start_order_date لم يعد موجود في Contract model

  // حساب تمويل المالك تلقائيًا
  useEffect(() => {
    const total = num(form.total_project_value, 0);
    const bank = num(form.total_bank_value, 0);
    const owner = Math.max(0, total - bank);
    const currentOwner = num(form.total_owner_value, 0);
    // تحديث فقط إذا كان هناك فرق كبير (أكثر من 0.01 لتجنب مشاكل الفاصلة العشرية)
    if (Math.abs(owner - currentOwner) > 0.01) {
      setF("total_owner_value", String(owner));
    }
  }, [form.total_project_value, form.total_bank_value, setF]);

  // تحميل URLs الملفات والمرفقات
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length > 0) {
          const contractData = data[0];

          // ✅ تحديث المرفقات الديناميكية بعد الحفظ لضمان حفظ السعر وروابط الملفات
          if (contractData.attachments && Array.isArray(contractData.attachments)) {
            const loadedAttachments = contractData.attachments
              .filter(att => att && att.type !== "main_contract")
              .map(att => ({
                type: att.type || "appendix",
                date: att.date || "",
                notes: att.notes || "",
                price: att.price ?? "",
                file: null,
                file_url: att.file_url || null,
                file_name: att.file_name || (att.file_url ? extractFileNameFromUrl(att.file_url) : null),
              }));
            setF("attachments", loadedAttachments);
          }
          
          // ✅ تحميل المرفقات الديناميكية فقط (بدون الملفات القديمة)
          // ✅ العقد الأصيل (contract_file, contract_appendix_file, contract_explanation_file) 
          //    يتم عرضه في قسمه المستقل ولا يجب أن يظهر في الملاحق التعاقدية
          if (contractData.attachments && Array.isArray(contractData.attachments) && contractData.attachments.length > 0) {
            // ✅ تصفية attachments لإزالة أي مرفقات من نوع "main_contract" 
            //    لأن العقد الأصيل له قسم مستقل
            const loadedAttachments = contractData.attachments
              .filter(att => {
                // ✅ إزالة مرفقات من نوع "main_contract" لأنها تظهر في قسم العقد الأصيل
                if (att && att.type === "main_contract") {
                  if (process.env.NODE_ENV === "development") {
                    console.log("⚠️ Filtering out main_contract attachment:", att);
                  }
                  return false;
                }
                return true;
              })
              .map(att => ({
                type: att.type || "appendix",
                date: att.date || "",
                notes: att.notes || "",
                price: att.price ?? "",
                file: null, // لا نحمل File object
                file_url: att.file_url || null,
                file_name: att.file_name || (att.file_url ? extractFileNameFromUrl(att.file_url) : null),
              }));
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Loaded attachments after filtering:", loadedAttachments);
              console.log("✅ Attachments with file_url:", loadedAttachments.map(att => ({ 
                type: att.type, 
                has_file_url: !!att.file_url, 
                file_url: att.file_url,
                file_name: att.file_name 
              })));
            }
            // ✅ تحديث المرفقات فقط إذا كانت مختلفة عن المرفقات الحالية
            //    هذا يمنع استبدال المرفقات المحملة من useContract إذا كانت متطابقة
            setF("attachments", loadedAttachments);
          } else {
            // ✅ إذا لم تكن هناك مرفقات في API، نتحقق من المرفقات الموجودة في form
            //    (قد تكون محملة من useContract)
            if (!form.attachments || form.attachments.length === 0) {
              setF("attachments", []);
            }
            // ✅ إذا كانت هناك مرفقات في form، نحتفظ بها (لا نستبدلها بقائمة فارغة)
          }
          
          // ✅ تحميل ملفات العقد في form state
          if (contractData.contract_file) {
            const url = contractData.contract_file;
            const fileName = contractData.contract_file_name || extractFileNameFromUrl(url);
            setF("contract_file_url", url);
            setF("contract_file_name", fileName);
          }
          if (contractData.contract_appendix_file) {
            const url = contractData.contract_appendix_file;
            const fileName = contractData.contract_appendix_file_name || extractFileNameFromUrl(url);
            setF("contract_appendix_file_url", url);
            setF("contract_appendix_file_name", fileName);
          }
          if (contractData.contract_explanation_file) {
            const url = contractData.contract_explanation_file;
            const fileName = contractData.contract_explanation_file_name || extractFileNameFromUrl(url);
            setF("contract_explanation_file_url", url);
            setF("contract_explanation_file_name", fileName);
          }
          
          // ✅ تم إزالة تحميل التمديدات - التمديدات الآن في StartOrder
          
          // ✅ تحميل المرفقات الثابتة في form state
          if (contractData.quantities_table_file) {
            const url = contractData.quantities_table_file;
            const fileName = contractData.quantities_table_file_name || extractFileNameFromUrl(url);
            setF("quantities_table_file_url", url);
            setF("quantities_table_file_name", fileName);
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Loaded quantities_table_file:", { url, fileName });
            }
          }
          if (contractData.approved_materials_table_file) {
            const url = contractData.approved_materials_table_file;
            const fileName = contractData.approved_materials_table_file_name || extractFileNameFromUrl(url);
            setF("approved_materials_table_file_url", url);
            setF("approved_materials_table_file_name", fileName);
          }
          if (contractData.price_offer_file) {
            const url = contractData.price_offer_file;
            const fileName = contractData.price_offer_file_name || extractFileNameFromUrl(url);
            setF("price_offer_file_url", url);
            setF("price_offer_file_name", fileName);
          }
          // ✅ تحميل المخططات التعاقدية (المقسمة)
          if (contractData.mep_drawings_file) {
            const url = contractData.mep_drawings_file;
            const fileName = contractData.mep_drawings_file_name || extractFileNameFromUrl(url);
            setF("mep_drawings_file_url", url);
            setF("mep_drawings_file_name", fileName);
          }
          if (contractData.architectural_drawings_file) {
            const url = contractData.architectural_drawings_file;
            const fileName = contractData.architectural_drawings_file_name || extractFileNameFromUrl(url);
            setF("architectural_drawings_file_url", url);
            setF("architectural_drawings_file_name", fileName);
          }
          if (contractData.structural_drawings_file) {
            const url = contractData.structural_drawings_file;
            const fileName = contractData.structural_drawings_file_name || extractFileNameFromUrl(url);
            setF("structural_drawings_file_url", url);
            setF("structural_drawings_file_name", fileName);
          }
          if (contractData.decoration_drawings_file) {
            const url = contractData.decoration_drawings_file;
            const fileName = contractData.decoration_drawings_file_name || extractFileNameFromUrl(url);
            setF("decoration_drawings_file_url", url);
            setF("decoration_drawings_file_name", fileName);
          }
          // ⚠️ الحقل القديم - للتوافق فقط
          if (contractData.contractual_drawings_file) {
            const url = contractData.contractual_drawings_file;
            const fileName = contractData.contractual_drawings_file_name || extractFileNameFromUrl(url);
            setF("contractual_drawings_file_url", url);
            setF("contractual_drawings_file_name", fileName);
          }
          if (contractData.general_specifications_file) {
            const url = contractData.general_specifications_file;
            const fileName = contractData.general_specifications_file_name || extractFileNameFromUrl(url);
            setF("general_specifications_file_url", url);
            setF("general_specifications_file_name", fileName);
          }
        }
      } catch (e) {}
    })();
    // ✅ إزالة setF من dependencies لأنه دالة مستقرة من useContract
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ✅ مزامنة المالك المفوض من الـ SitePlan ليكون مصدر الحقيقة (مرة واحدة عند الدخول، أو عند حدث التحديث)
  useEffect(() => {
    if (!projectId) return;

    const loadAuthorizedOwner = async (force = false) => {
      if (authorizedOwnerLoadingRef.current) return;
      if (!force && authorizedOwnerLoadedOnceRef.current) return;
      authorizedOwnerLoadingRef.current = true;
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (Array.isArray(data) && data.length > 0) {
          const spOwners = Array.isArray(data[0]?.owners) ? data[0].owners : [];
          if (spOwners.length) {
            // ✅ دمج البيانات: نأخذ phone و email من Contract الحالي إذا كانت موجودة
            // ✅ استخدام setForm مباشرة لضمان قراءة أحدث قيمة
            setForm((prev) => {
              const currentOwners = Array.isArray(prev.owners) ? prev.owners : [];
              const mergedOwners = spOwners.map((spOwner) => {
                // ✅ البحث عن المالك المقابل في Contract (بناءً على id_number أو owner_name_ar)
                const matchingOwner = currentOwners.find(
                  (co) =>
                    (spOwner.id_number && co.id_number && spOwner.id_number.trim() === co.id_number.trim()) ||
                    (spOwner.owner_name_ar && co.owner_name_ar && spOwner.owner_name_ar.trim() === co.owner_name_ar.trim())
                );
                
                // ✅ دمج البيانات: نستخدم phone و email من Contract إذا كانت موجودة، وإلا من SitePlan
                return {
                  ...spOwner,
                  phone: matchingOwner?.phone || spOwner.phone || "",
                  email: matchingOwner?.email || spOwner.email || "",
                };
              });
              return {
                ...prev,
                owners: mergedOwners,
              };
            });
          } else {
            // ✅ إذا لم يكن هناك owners في SitePlan، نتأكد من أن owners array فارغ
            setForm((prev) => ({
              ...prev,
              owners: Array.isArray(prev.owners) ? prev.owners : [],
            }));
          }
        }
        authorizedOwnerLoadedOnceRef.current = true;
      } catch (e) {
        console.error("Failed to load siteplan owners:", e);
      }
      authorizedOwnerLoadingRef.current = false;
    };

    // تحميل مرة واحدة عند الدخول
    loadAuthorizedOwner(false);

    // تحديث عند حدث siteplan-owners-updated فقط
    const handler = (ev) => {
      if (ev?.detail?.projectId && ev.detail.projectId !== projectId) return;
      loadAuthorizedOwner(true);
    };
    window.addEventListener("siteplan-owners-updated", handler);
    return () => window.removeEventListener("siteplan-owners-updated", handler);
    // عمداً بدون setF لضمان استقرار الـ deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ✅ تم إزالة useEffect الذي كان يسبب infinite loop
  // ✅ التصفية تتم بالفعل في:
  //    1. useContract.js عند التحميل الأولي
  //    2. ContractStep.jsx عند التحميل من API (السطر 254-276)
  //    3. عند العرض (filter في map - السطر 1352 و 1389)
  //    4. عند الحفظ (filter في buildPayload - السطر 441-446)

  // بناء الحمولة والحفظ
  const buildPayload = () => {
    // ✅ التحقق من نوع العقد بشكل أفضل (تجاهل القيم الفارغة أو null)
    const contractType = (form.contract_type || "").trim();
    if (!contractType || contractType === "") {
      throw new Error(t("contract.errors.select_type"));
    }
    
    if (!form.contract_date) throw new Error(t("contract.errors.select_date"));

    // ✅ التحقق من قيمة المشروع بشكل أفضل
    const totalValue = form.total_project_value;
    if (!totalValue || totalValue === "" || totalValue === null || totalValue === undefined) {
      throw new Error(t("contract.errors.total_project_value_positive"));
    }
    
    const total = num(totalValue, NaN);
    if (!Number.isFinite(total) || total <= 0) {
      throw new Error(t("contract.errors.total_project_value_positive"));
    }

    const isHousing = form.contract_classification === "housing_loan_program";
    const bank = num(form.total_bank_value, isHousing ? NaN : 0);
    const owner = Math.max(0, total - bank);

    if (isHousing) {
      if (!Number.isFinite(bank) || bank < 0) {
        throw new Error(t("contract.errors.bank_value_nonnegative"));
      }
      // التحقق من أن قيمة المالك محسوبة بشكل صحيح (مع هامش خطأ صغير)
      const currentOwner = num(form.total_owner_value, NaN);
      if (Math.abs(currentOwner - owner) > 0.01) {
        throw new Error(t("contract.errors.owner_value_autocalc"));
      }
    }

    // ✅ تصفية الملاك لإرسال المالك المفوض فقط
    const authorizedOwners = (form.owners || []).filter(o => o.is_authorized === true);
    
    const jsonPayload = {
      contract_classification: form.contract_classification || "",
      contract_type: contractType, // ✅ استخدام المتغير المحلي
      tender_no: form.tender_no || "",
      contract_date: toIsoDate(form.contract_date),
      owners: authorizedOwners, // ✅ إرسال المالك المفوض فقط
      contractor_name: form.contractor_name || "",
      contractor_name_en: form.contractor_name_en || "",
      contractor_trade_license: form.contractor_trade_license || "",
      contractor_phone: form.contractor_phone || "",
      contractor_email: form.contractor_email || "",
      total_project_value: total,
      total_bank_value: isHousing ? bank : 0,
      total_owner_value: isHousing ? owner : total,
      project_duration_months: num(form.project_duration_months, 0),
      owner_includes_consultant: toBool(form.owner_includes_consultant),
      owner_fee_design_percent: num(form.owner_fee_design_percent, 0),
      owner_fee_supervision_percent: num(form.owner_fee_supervision_percent, 0),
      owner_fee_extra_mode: form.owner_fee_extra_mode || "percent",
      owner_fee_extra_value: num(form.owner_fee_extra_value, 0),
      owner_fee_extra_description: form.owner_fee_extra_description || "",
      bank_includes_consultant: toBool(form.bank_includes_consultant),
      bank_fee_design_percent: num(form.bank_fee_design_percent, 0),
      bank_fee_supervision_percent: num(form.bank_fee_supervision_percent, 0),
      bank_fee_extra_mode: form.bank_fee_extra_mode || "percent",
      bank_fee_extra_value: num(form.bank_fee_extra_value, 0),
      bank_fee_extra_description: form.bank_fee_extra_description || "",
      project_end_date: form.project_end_date || null,
      general_notes: form.general_notes || "",
    };

    // ✅ تم إزالة معالجة التمديدات - التمديدات الآن في StartOrder

    // ✅ دائماً نستخدم FormData (حتى لو لم يكن هناك ملفات) لضمان إرسال owners بشكل صحيح
    const fd = new FormData();
    
    // إضافة الحقول النصية
    Object.entries(jsonPayload).forEach(([k, v]) => {
      // تخطي الملفات - سنضيفها لاحقاً
      if (k === "contract_file" || 
          k === "contract_appendix_file" || k === "contract_explanation_file") {
        return;
      }
      // ✅ معالجة owners بشكل خاص - إرسالها كـ JSON string
      if (k === "owners") {
        if (Array.isArray(v) && v.length > 0) {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, "[]"); // قائمة فارغة
        }
        return;
      }
      // ✅ إرسال contract_classification حتى لو كان فارغاً (مهم للاتساق)
      if (k === "contract_classification") {
        fd.append(k, v || "");
        return;
      }
      if (v === null || v === undefined || v === "") return;
      if (typeof v === "object" && !(v instanceof File) && !(v instanceof Blob) && !Array.isArray(v)) {
        fd.append(k, JSON.stringify(v));
      } else if (Array.isArray(v)) {
        fd.append(k, JSON.stringify(v));
      } else {
        fd.append(k, v);
      }
    });
    
    // ✅ تم إزالة إرسال التمديدات - التمديدات الآن في StartOrder
    
    // ✅ إضافة المرفقات الديناميكية (مع التنظيف)
    // ✅ العقد الأصيل (contract_file) له قسم مستقل ولا يجب أن يكون في attachments
    if (form.attachments && Array.isArray(form.attachments) && form.attachments.length > 0) {
      // ✅ تنظيف المرفقات - إزالة المرفقات الفارغة وإزالة مرفقات من نوع "main_contract"
      const validAttachments = form.attachments.filter((att, idx) => {
        if (!att || typeof att !== "object") return false;
        // ✅ إزالة مرفقات من نوع "main_contract" لأن العقد الأصيل له قسم مستقل
        if (att.type === "main_contract") {
          return false;
        }
        // ✅ مرفق صالح إذا كان له نوع أو ملف أو ملاحظات
        const hasType = att.type && String(att.type).trim() !== "";
        const hasFile = att.file instanceof File || (att.file_url && String(att.file_url).trim() !== "");
        const hasNotes = att.notes && String(att.notes).trim() !== "";
          const hasPrice = att.price !== undefined && att.price !== null && String(att.price).trim() !== "";
          return hasType || hasFile || hasNotes || hasPrice;
      });
      
      const attachmentsData = validAttachments.map((att, idx) => {
        const rawPrice = att.price;
        const parsedPrice = rawPrice === "" || rawPrice === null || rawPrice === undefined ? null : Number(rawPrice);
        const attData = {
          type: String(att.type || "appendix").trim(), // ✅ القيمة الافتراضية هي "appendix" وليس "main_contract"
          date: toIsoDate(att.date) || null,
          notes: String(att.notes || "").trim(),
          price: Number.isFinite(parsedPrice) ? parsedPrice : null,
          file_url: att.file_url || null,
          file_name: att.file_name || null,
        };
        return attData;
      });
      fd.append("attachments", JSON.stringify(attachmentsData));
      
      // ✅ إضافة الملفات الجديدة (باستخدام الفهرس الصحيح من validAttachments)
      validAttachments.forEach((att, idx) => {
        if (att.file instanceof File) {
          fd.append(`attachments[${idx}][file]`, att.file, att.file.name);
        }
      });
    } else {
      fd.append("attachments", "[]");
    }
    
    // إضافة الملفات القديمة (للتوافق)
    if (form.contract_file && form.contract_file instanceof File) {
      fd.append("contract_file", form.contract_file);
    }
    if (form.contract_appendix_file && form.contract_appendix_file instanceof File) {
      fd.append("contract_appendix_file", form.contract_appendix_file);
    }
    if (form.contract_explanation_file && form.contract_explanation_file instanceof File) {
      fd.append("contract_explanation_file", form.contract_explanation_file);
    }
    
    // ✅ إضافة المرفقات الثابتة
    if (form.quantities_table_file && form.quantities_table_file instanceof File) {
      fd.append("quantities_table_file", form.quantities_table_file);
    }
    if (form.approved_materials_table_file && form.approved_materials_table_file instanceof File) {
      fd.append("approved_materials_table_file", form.approved_materials_table_file);
    }
    if (form.price_offer_file && form.price_offer_file instanceof File) {
      fd.append("price_offer_file", form.price_offer_file);
    }
    // ✅ إضافة المخططات التعاقدية (المقسمة)
    if (form.mep_drawings_file && form.mep_drawings_file instanceof File) {
      fd.append("mep_drawings_file", form.mep_drawings_file);
    }
    if (form.architectural_drawings_file && form.architectural_drawings_file instanceof File) {
      fd.append("architectural_drawings_file", form.architectural_drawings_file);
    }
    if (form.structural_drawings_file && form.structural_drawings_file instanceof File) {
      fd.append("structural_drawings_file", form.structural_drawings_file);
    }
    if (form.decoration_drawings_file && form.decoration_drawings_file instanceof File) {
      fd.append("decoration_drawings_file", form.decoration_drawings_file);
    }
    // ⚠️ الحقل القديم - للتوافق فقط
    if (form.contractual_drawings_file && form.contractual_drawings_file instanceof File) {
      fd.append("contractual_drawings_file", form.contractual_drawings_file);
    }
    if (form.general_specifications_file && form.general_specifications_file instanceof File) {
      fd.append("general_specifications_file", form.general_specifications_file);
    }
    
    return fd;
  };

  const save = async () => {
    if (!projectId) {
      setErrorMsg(t("open_specific_project_to_save"));
      return;
    }
    try {
      const payload = buildPayload();
      
      // ✅ طباعة payload للتحقق (في وضع التطوير فقط)
      if (process.env.NODE_ENV === "development") {
        console.log("=== Contract Payload Debug ===");
        // ✅ تم إزالة طباعة التمديدات - التمديدات الآن في StartOrder
        console.log("Attachments:", payload.get("attachments"));
        console.log("Owners:", payload.get("owners"));
        // طباعة جميع المفاتيح
        console.log("All FormData keys:", Array.from(payload.keys()));
      }
      
      const isHousing = form.contract_classification === "housing_loan_program";
      const hasFiles = 
        (form.contract_file && form.contract_file instanceof File) ||
        (form.contract_appendix_file && form.contract_appendix_file instanceof File) ||
        (form.contract_explanation_file && form.contract_explanation_file instanceof File) ||
        (form.quantities_table_file && form.quantities_table_file instanceof File) ||
        (form.approved_materials_table_file && form.approved_materials_table_file instanceof File) ||
        (form.price_offer_file && form.price_offer_file instanceof File) ||
        (form.mep_drawings_file && form.mep_drawings_file instanceof File) ||
        (form.architectural_drawings_file && form.architectural_drawings_file instanceof File) ||
        (form.structural_drawings_file && form.structural_drawings_file instanceof File) ||
        (form.decoration_drawings_file && form.decoration_drawings_file instanceof File) ||
        (form.general_specifications_file && form.general_specifications_file instanceof File);
      
      if (existingId) {
        await api.patch(`projects/${projectId}/contract/${existingId}/`, payload);
      } else {
        const { data: created } = await api.post(`projects/${projectId}/contract/`, payload);
        if (created?.id) setExistingId(created.id);
      }
      setErrorMsg("");
      
      // بعد الحفظ الناجح، نحدث URLs للملفات دائماً
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length > 0) {
          const contractData = data[0];
          // ✅ تحديث ملفات العقد في form state بعد الحفظ
          if (contractData.contract_file) {
            const url = contractData.contract_file;
            const fileName = contractData.contract_file_name || extractFileNameFromUrl(url);
            setF("contract_file_url", url);
            setF("contract_file_name", fileName);
          }
          if (contractData.contract_appendix_file) {
            const url = contractData.contract_appendix_file;
            const fileName = contractData.contract_appendix_file_name || extractFileNameFromUrl(url);
            setF("contract_appendix_file_url", url);
            setF("contract_appendix_file_name", fileName);
          }
          if (contractData.contract_explanation_file) {
            const url = contractData.contract_explanation_file;
            const fileName = contractData.contract_explanation_file_name || extractFileNameFromUrl(url);
            setF("contract_explanation_file_url", url);
            setF("contract_explanation_file_name", fileName);
          }
          
          // ✅ تحديث URLs للمرفقات الثابتة في form state
          if (contractData.quantities_table_file) {
            const url = contractData.quantities_table_file;
            const fileName = contractData.quantities_table_file_name || extractFileNameFromUrl(url);
            setF("quantities_table_file_url", url);
            setF("quantities_table_file_name", fileName);
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Updated quantities_table_file after save:", { url, fileName });
            }
          }
          if (contractData.approved_materials_table_file) {
            const url = contractData.approved_materials_table_file;
            const fileName = contractData.approved_materials_table_file_name || extractFileNameFromUrl(url);
            setF("approved_materials_table_file_url", url);
            setF("approved_materials_table_file_name", fileName);
          }
          if (contractData.price_offer_file) {
            const url = contractData.price_offer_file;
            const fileName = contractData.price_offer_file_name || extractFileNameFromUrl(url);
            setF("price_offer_file_url", url);
            setF("price_offer_file_name", fileName);
          }
          // ✅ تحديث المخططات التعاقدية (المقسمة) بعد الحفظ
          if (contractData.mep_drawings_file) {
            const url = contractData.mep_drawings_file;
            const fileName = contractData.mep_drawings_file_name || extractFileNameFromUrl(url);
            setF("mep_drawings_file_url", url);
            setF("mep_drawings_file_name", fileName);
          }
          if (contractData.architectural_drawings_file) {
            const url = contractData.architectural_drawings_file;
            const fileName = contractData.architectural_drawings_file_name || extractFileNameFromUrl(url);
            setF("architectural_drawings_file_url", url);
            setF("architectural_drawings_file_name", fileName);
          }
          if (contractData.structural_drawings_file) {
            const url = contractData.structural_drawings_file;
            const fileName = contractData.structural_drawings_file_name || extractFileNameFromUrl(url);
            setF("structural_drawings_file_url", url);
            setF("structural_drawings_file_name", fileName);
          }
          if (contractData.decoration_drawings_file) {
            const url = contractData.decoration_drawings_file;
            const fileName = contractData.decoration_drawings_file_name || extractFileNameFromUrl(url);
            setF("decoration_drawings_file_url", url);
            setF("decoration_drawings_file_name", fileName);
          }
          // ⚠️ الحقل القديم - للتوافق فقط
          if (contractData.contractual_drawings_file) {
            const url = contractData.contractual_drawings_file;
            const fileName = contractData.contractual_drawings_file_name || extractFileNameFromUrl(url);
            setF("contractual_drawings_file_url", url);
            setF("contractual_drawings_file_name", fileName);
          }
          if (contractData.general_specifications_file) {
            const url = contractData.general_specifications_file;
            const fileName = contractData.general_specifications_file_name || extractFileNameFromUrl(url);
            setF("general_specifications_file_url", url);
            setF("general_specifications_file_name", fileName);
          }
          
          // ✅ تم إزالة تحديث التمديدات - التمديدات الآن في StartOrder
        }
      } catch (e) {
        console.error("Error loading contract file URLs:", e);
      }
      
      // إزالة File objects من form بعد الحفظ الناجح
      if (form.contract_file instanceof File) setF("contract_file", null);
      if (form.contract_appendix_file instanceof File) setF("contract_appendix_file", null);
      if (form.contract_explanation_file instanceof File) setF("contract_explanation_file", null);
      // ✅ إزالة File objects للمرفقات الثابتة
      if (form.quantities_table_file instanceof File) setF("quantities_table_file", null);
      if (form.approved_materials_table_file instanceof File) setF("approved_materials_table_file", null);
      if (form.price_offer_file instanceof File) setF("price_offer_file", null);
      // ✅ إزالة File objects للمخططات التعاقدية (المقسمة)
      if (form.mep_drawings_file instanceof File) setF("mep_drawings_file", null);
      if (form.architectural_drawings_file instanceof File) setF("architectural_drawings_file", null);
      if (form.structural_drawings_file instanceof File) setF("structural_drawings_file", null);
      if (form.decoration_drawings_file instanceof File) setF("decoration_drawings_file", null);
      if (form.general_specifications_file instanceof File) setF("general_specifications_file", null);
      
      // ✅ إرسال حدث لتحديث بيانات المشروع في WizardPage
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("contract-updated", { detail: { projectId } }));
      }
      
      // عند الحفظ وانتقال للخطوة التالية، نضع في وضع view
      updateViewMode(true);
      
      if (!isHousing) {
        // التمويل الخاص - انتهاء، ننتقل للصفحة الرئيسية
        navigate("/projects");
        return;
      }
      
      // القرض السكني - الانتقال للخطوة التالية (أمر الترسية)
      // ✅ دائماً ننتقل للخطوة التالية إذا كان onNext متاحاً
      if (onNext && typeof onNext === "function") {
        onNext();
        return;
      }
      
      // ✅ إذا لم يكن onNext متاحاً، نبقى في وضع العرض بعد الحفظ
      // (updateViewMode(true) تم استدعاؤه بالفعل أعلاه)
    } catch (err) {
      // محاولة استخدام formatServerErrors أولاً
      const serverData = err?.response?.data;
      const formatted = formatServerErrors(serverData);
      
      // إذا لم يكن هناك تنسيق محدد، استخدم معالج الأخطاء الموحد
      if (formatted) {
        setErrorMsg(formatted);
      } else {
        const errorMessage = getErrorMessage(err, "حفظ العقد");
        setErrorMsg(errorMessage || t("save_failed"));
      }
    }
  };

  const isHousing = form.contract_classification === "housing_loan_program";
  const isPrivateFunding = form.contract_classification === "private_funding";
  // ✅ كل المشاريع تعرض "إنهاء" عند العقد بغض النظر عن نوع التصنيف
  const finishLabel = t("finish");

  return (
    <WizardShell title={t("contract.title")}>
      <Dialog
        open={!!errorMsg}
        title={t("warning")}
        desc={<pre className="pre-wrap m-0">{errorMsg}</pre>}
        confirmLabel={t("ok")}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />

      {viewMode && (
        <div className={`row ${isAR ? "justify-start" : "justify-end"} mb-12`}>
          <Button variant="secondary" onClick={() => updateViewMode(false)}>
            {t("edit")}
          </Button>
        </div>
      )}

      {/* الأقسام الثلاثة الأولى جنب بعض */}
      <div className="form-grid cols-3" style={{ gap: "var(--space-6)", alignItems: "flex-start" }}>
        {/* 1) نوع العقد */}
        <div style={{
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
        }}>
          <h4 className="wizard-section-title" style={{ marginBottom: "20px" }}>2) {t("contract.sections.type")}</h4>
          <Field label={t("contract.fields.contract_type")}>
            {viewMode ? (
              <div>{CONTRACT_TYPES.find((x) => x.value === form.contract_type)?.label || form.contract_type}</div>
            ) : (
              <RtlSelect
                className="rtl-select"
                dir={isAR ? "rtl" : "ltr"}
                options={CONTRACT_TYPES}
                value={form.contract_type}
                onChange={(v) => setF("contract_type", v)}
                placeholder={t("contract.placeholders.select_contract_type")}
              />
            )}
          </Field>
        </div>

        {/* 3) معلومات العقد الأصيل */}
        <div style={{
          background: "var(--surface)",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
        }}>
          <h4 className="wizard-section-title" style={{ marginBottom: "20px" }}>3) معلومات العقد الأصيل</h4>
          {viewMode ? (
            <div className="form-grid cols-1" style={{ gap: "var(--space-4)" }}>
              <ViewRow
                label={
                  form.contract_classification === "housing_loan_program"
                    ? (isAR ? "رقم القرض" : "Loan Number")
                    : (isAR ? "رقم العقد" : "Contract Number")
                }
                value={form.tender_no}
                tip={isHousing ? t("contract.notes.housing_tender_info") : undefined}
              />
              <ViewRow
                label={t("contract.fields.contract_date")}
                value={formatDate(form.contract_date, i18next.language)}
                tip={form.contract_date ? `${t("contract.labels.day")}: ${getDayName(form.contract_date, i18next.language)}` : undefined}
              />
              {form.contract_file_url && (
                <Field label="رفع العقد الأصيل">
                  <FileAttachmentView
                    fileUrl={form.contract_file_url}
                    fileName={form.contract_file_name || (form.contract_file_url ? extractFileNameFromUrl(form.contract_file_url) : "") || (form.contract_file?.name || "")}
                    projectId={projectId}
                    endpoint={`projects/${projectId}/contract/`}
                  />
                </Field>
              )}
            </div>
          ) : (
            <div className="form-grid cols-1" style={{ gap: "var(--space-4)" }}>
              <Field
                label={
                  form.contract_classification === "housing_loan_program"
                    ? (isAR ? "رقم القرض" : "Loan Number")
                    : (isAR ? "رقم العقد" : "Contract Number")
                }
              >
                <div className="row row--align-center row--gap-8">
                  <input
                    className="input"
                    value={form.tender_no}
                    onChange={(e) => setF("tender_no", e.target.value)}
                  />
                  {isHousing && <InfoTip align="start" text={t("contract.notes.housing_tender_info")} />}
                </div>
              </Field>
              <Field label={t("contract.fields.contract_date")}>
                <div className="row row--align-center row--gap-8">
                  <DateInput
                    className="input"
                    value={form.contract_date || ""}
                    onChange={(value) => setF("contract_date", value)}
                  />
                  {form.contract_date && (
                    <InfoTip
                      align="start"
                      text={`${t("contract.labels.day")}: ${getDayName(form.contract_date, i18next.language)}`}
                    />
                  )}
                </div>
              </Field>
              <Field label="رفع العقد الأصيل">
                <FileUpload
                  value={form.contract_file}
                  onChange={(file) => setF("contract_file", file)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxSizeMB={10}
                  showPreview={true}
                  existingFileUrl={form.contract_file_url}
                  existingFileName={form.contract_file_name || (form.contract_file_url ? extractFileNameFromUrl(form.contract_file_url) : "")}
                  onRemoveExisting={() => {
                    setF("contract_file_url", null);
                    setF("contract_file_name", null);
                    setF("contract_file", null);
                  }}
                  compressionOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* 2) قيمة العقد والمدة */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">2) {t("contract.sections.value_duration")} (القيم المالية الحقيقية)</h4>
        {viewMode ? (
          <div className={`form-grid ${isPrivateFunding ? "cols-2" : "cols-4"}`} style={{ gap: "var(--space-4)" }}>
            <Field label={t("contract_amount")}>
          <div>
                <div className="font-mono fw-600">
                  {formatMoney(form.total_project_value)}
              </div>
                <div className="mini mt-8">
                  {formatMoneyArabic(form.total_project_value)}
                </div>
                {form.total_project_value && (
                  <div className="mini mt-8 font-italic">
                    {numberToArabicWords(form.total_project_value)}
              </div>
            )}
          </div>
            </Field>
            {/* ✅ إخفاء تمويل البنك وتمويل المالك عند تمويل المالك فقط */}
            {isHousing && (
              <>
                <Field label={t("contract.fields.total_bank_value")}>
          <div>
                    <div className="font-mono fw-600">
                      {formatMoney(form.total_bank_value)}
                    </div>
                    <div className="mini mt-8">
                      {formatMoneyArabic(form.total_bank_value)}
                    </div>
                    {form.total_bank_value && (
                      <div className="mini mt-8 font-italic">
                        {numberToArabicWords(form.total_bank_value)}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label={t("contract.fields.total_owner_value_calc")}>
                  <div>
                    <div className="font-mono fw-600">
                      {formatMoney(form.total_owner_value)}
                    </div>
                    <div className="mini mt-8">
                      {formatMoneyArabic(form.total_owner_value)}
                    </div>
                    {form.total_owner_value && (
                      <div className="mini mt-8 font-italic">
                        {numberToArabicWords(form.total_owner_value)}
                      </div>
                    )}
                  </div>
                </Field>
              </>
            )}
            <ViewRow label={t("contract.fields.project_duration_months")} value={form.project_duration_months} />
          </div>
        ) : (
          <div className={`form-grid ${isPrivateFunding ? "cols-2" : "cols-4"}`} style={{ gap: "var(--space-4)" }}>
          <Field label={t("contract.fields.total_project_value")}>
            <NumberField
              value={form.total_project_value}
              onChange={(v) => setF("total_project_value", v)}
            />
          </Field>
          {/* ✅ إخفاء تمويل البنك وتمويل المالك عند تمويل المالك فقط */}
          {isHousing && (
            <>
              <Field label={t("contract.fields.total_bank_value")}>
                <NumberField
                  value={form.total_bank_value}
                  onChange={(v) => setF("total_bank_value", v)}
                />
              </Field>
              <Field label={t("contract.fields.total_owner_value_calc")}>
                <NumberField
                  value={form.total_owner_value}
                  onChange={() => {}}
                  readOnly
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    cursor: "default"
                  }}
                />
              </Field>
            </>
          )}
          <Field label={t("contract.fields.project_duration_months")}>
            <input
              className="input"
              type="number"
              min="0"
              value={form.project_duration_months}
              onChange={(e) => setF("project_duration_months", e.target.value)}
              placeholder={t("empty_value")}
            />
          </Field>
          </div>
        )}
      </div>

      {/* 4) أطراف العقد */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">4) {t("contract.sections.parties")}</h4>
        <div className="form-grid cols-2" style={{ gap: "24px", alignItems: "flex-start" }}>
        {/* الطرف الأول - المالك */}
        <div style={{ 
          background: "var(--surface)", 
          borderRadius: "12px", 
          padding: "24px",
          border: "1px solid var(--border)"
        }}>
          <h5 style={{ 
            margin: "0 0 20px 0", 
            fontSize: "18px", 
            fontWeight: "600",
            color: "var(--text)",
            paddingBottom: "12px",
            borderBottom: "2px solid var(--primary)"
          }}>
            {t("contract.fields.first_party_owner") || "الطرف الأول (المالك)"}
          </h5>
          {(() => {
            // ✅ تصفية الملاك لعرض المالك المفوض فقط
            const ownersArray = Array.isArray(form.owners) ? form.owners : [];
            const authorizedOwners = ownersArray.filter(o => o.is_authorized === true);
            
            if (authorizedOwners.length === 0) {
              return (
                <div className="row row--align-center row--gap-8">
                  <InfoTip align="start" text={t("contract.notes.no_authorized_owner") || "لا يوجد مالك مفوض محدد"} />
                </div>
              );
            }
            
            return (
              <div>
                {authorizedOwners.map((o, i) => {
                  // ✅ البحث عن index الأصلي للمالك في form.owners لتحديث البيانات بشكل صحيح
                  const originalIndex = ownersArray.findIndex(owner => 
                    owner.id_number === o.id_number && owner.owner_name_ar === o.owner_name_ar
                  );
                  
                  return (
                    <div key={i} style={{ marginBottom: i < authorizedOwners.length - 1 ? "24px" : "0" }}>
                      <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
                        {/* ✅ بيانات للعرض فقط - من SitePlan */}
                        <Field label={t("owner_name_ar") || "الاسم (عربي)"}>
                          {viewMode ? (
                            <div style={{ 
                              padding: "12px", 
                              background: "var(--surface-2)", 
                              borderRadius: "8px",
                              fontSize: "16px",
                              color: "var(--text)",
                              fontWeight: "500"
                            }}>
                              {o.owner_name_ar || t("empty_value")}
                            </div>
                          ) : (
                            <input
                              className="input"
                              readOnly
                              value={o.owner_name_ar || ""}
                              style={{
                                background: "var(--surface-2)",
                                color: "var(--text)",
                                cursor: "default"
                              }}
                            />
                          )}
                        </Field>
                        
                        <Field label={t("owner_name_en") || "الاسم بالإنجليزية"}>
                          {viewMode ? (
                            <div style={{ 
                              padding: "12px", 
                              background: "var(--surface-2)", 
                              borderRadius: "8px",
                              fontSize: "16px",
                              color: "var(--text)",
                              fontWeight: "500"
                            }}>
                              {o.owner_name_en || t("empty_value")}
                            </div>
                          ) : (
                            <input
                              className="input"
                              type="text"
                              value={o.owner_name_en || ""}
                              onChange={(e) => {
                                const ownersArray = Array.isArray(form.owners) ? form.owners : [];
                                const updated = [...ownersArray];
                                if (originalIndex !== -1) {
                                  updated[originalIndex] = { ...updated[originalIndex], owner_name_en: e.target.value };
                                  setF("owners", updated);
                                }
                              }}
                              placeholder={t("owner_name_en_placeholder") || "اكتب الاسم بالإنجليزية"}
                            />
                          )}
                        </Field>
                        
                        <Field label={t("id_number") || "رقم الهوية"}>
                          {viewMode ? (
                            <div style={{ 
                              padding: "12px", 
                              background: "var(--surface-2)", 
                              borderRadius: "8px",
                              fontSize: "16px",
                              color: "var(--text)",
                              fontWeight: "500"
                            }}>
                              {o.id_number || t("empty_value")}
                            </div>
                          ) : (
                            <input
                              className="input"
                              readOnly
                              value={o.id_number || ""}
                              style={{
                                background: "var(--surface-2)",
                                color: "var(--text)",
                                cursor: "default"
                              }}
                            />
                          )}
                        </Field>
                        
                        {/* ✅ حقل تاريخ الانتهاء مخفي */}
                        <div></div>
                        
                        {/* ✅ حقول قابلة للإدخال - الهاتف والبريد */}
                        <Field label={t("phone") || "الهاتف"}>
                          {viewMode ? (
                            <div style={{ 
                              padding: "12px", 
                              background: "var(--surface-2)", 
                              borderRadius: "8px",
                              fontSize: "16px",
                              color: "var(--text)",
                              fontWeight: "500"
                            }}>
                              {o.phone || t("empty_value")}
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", flexDirection: "row-reverse" }}>
                              <span
                                style={{
                                  padding: "10px 12px",
                                  background: "var(--surface-2)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "8px",
                                  minWidth: "70px",
                                  textAlign: "center",
                                  color: "var(--muted)",
                                  marginRight: "8px",
                                }}
                              >
                                +971
                              </span>
                          <input
                            className="input"
                            type="tel"
                              value={(o.phone || "").replace("+971", "")}
                            onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                const trimmed = digits.replace(/^0+/, "").slice(0, 9);
                                const formatted = trimmed ? `+971${trimmed}` : "";
                                const ownersArray = Array.isArray(form.owners) ? form.owners : [];
                                const updated = [...ownersArray];
                                if (originalIndex !== -1) {
                                  updated[originalIndex] = { ...updated[originalIndex], phone: formatted };
                                  setF("owners", updated);
                                }
                            }}
                              placeholder={t("phone_placeholder") || "أدخل رقم الهاتف"}
                              inputMode="numeric"
                          />
                          </div>
                          )}
                        </Field>
                        
                        <Field label={t("email") || "البريد الإلكتروني"}>
                          {viewMode ? (
                            <div style={{ 
                              padding: "12px", 
                              background: "var(--surface-2)", 
                              borderRadius: "8px",
                              fontSize: "16px",
                              color: "var(--text)",
                              fontWeight: "500"
                            }}>
                              {o.email || t("empty_value")}
                            </div>
                          ) : (
                            <input
                              className="input"
                              type="email"
                              value={o.email || ""}
                              onChange={(e) => {
                                const ownersArray = Array.isArray(form.owners) ? form.owners : [];
                                const updated = [...ownersArray];
                                if (originalIndex !== -1) {
                                  updated[originalIndex] = { ...updated[originalIndex], email: e.target.value };
                                  setF("owners", updated);
                                }
                              }}
                              placeholder={t("email_placeholder") || "أدخل البريد الإلكتروني"}
                            />
                          )}
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>

          {/* الطرف الثاني - المقاول - بيانات ثابتة من إعدادات الشركة (Read Only) */}
        <div style={{ 
          background: "var(--surface)", 
          borderRadius: "12px", 
          padding: "24px",
          border: "1px solid var(--border)"
        }}>
          <h5 style={{ 
            margin: "0 0 20px 0", 
            fontSize: "18px", 
            fontWeight: "600",
            color: "var(--text)",
            paddingBottom: "12px",
            borderBottom: "2px solid var(--primary)"
          }}>
            {t("contract.fields.second_party_contractor") || "الطرف الثاني (المقاول)"}
          </h5>
          <div style={{
            padding: 'var(--space-3)',
            backgroundColor: '#f9fafb',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-sm)',
            color: '#6b7280'
          }}>
            {isAR 
              ? '⚠️ بيانات المقاول ثابتة ومستمدة من إعدادات الشركة. لا يمكن تعديلها من هنا. للتعديل، يرجى الذهاب إلى إعدادات الشركة.'
              : '⚠️ Contractor information is fixed and derived from company settings. Cannot be modified here. To modify, please go to Company Settings.'
            }
          </div>
          <PersonField
            type="contractor"
            label={t("contractor")}
            licenseLabel={t("contractor_lic")}
            nameValue={form.contractor_name || ""}
            nameEnValue={form.contractor_name_en || ""}
            licenseValue={form.contractor_trade_license || ""}
            phoneValue={form.contractor_phone || ""}
            emailValue={form.contractor_email || ""}
            onNameChange={() => {}} // ✅ Read Only - لا يمكن التعديل
            onNameEnChange={() => {}} // ✅ Read Only
            onLicenseChange={() => {}} // ✅ Read Only
            onPhoneChange={() => {}} // ✅ Read Only
            onEmailChange={() => {}} // ✅ Read Only
            isView={true} // ✅ دائماً Read Only
          />
        </div>
        </div>
      </div>

      {/* 6) أتعاب الاستشاري */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">6) {t("contract.sections.consultant_fees")}</h4>
        <div className={`form-grid ${isPrivateFunding ? "cols-1" : "cols-2"}`} style={{ gap: "var(--space-6)", alignItems: "flex-start" }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid var(--border)"
          }}>
            <h5 style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text)",
              paddingBottom: "12px",
              borderBottom: "2px solid var(--primary)"
            }}>
              {t("contract.fees.owner.title") || "الجزء الممول من المالك"}
            </h5>
            <ConsultantFeesSection prefix="owner" form={form} setF={setF} isView={viewMode} isAR={isAR} />
          </div>
          
          {/* ✅ إخفاء قسم البنك عند تمويل المالك فقط */}
          {!isPrivateFunding && (
          <div style={{
            background: "var(--surface)",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid var(--border)"
          }}>
            <h5 style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text)",
              paddingBottom: "12px",
              borderBottom: "2px solid var(--primary)"
            }}>
              {t("contract.fees.bank.title") || "الجزء الممول من البنك"}
            </h5>
            <ConsultantFeesSection prefix="bank" form={form} setF={setF} isView={viewMode} isAR={isAR} />
          </div>
          )}
        </div>
      </div>

      {/* 7) إضافة مرفقات العقد */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">7) إضافة مرفقات العقد</h4>
        
        {/* ✅ المرفقات الثابتة */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
            <StaticContractAttachmentFile
              label="1) جدول الكميات"
              value={form.quantities_table_file}
              fileUrl={form.quantities_table_file_url}
              fileName={form.quantities_table_file_name}
              onChange={(file) => setF("quantities_table_file", file)}
              onRemoveExisting={() => {
                setF("quantities_table_file_url", null);
                setF("quantities_table_file_name", null);
                setF("quantities_table_file", null);
              }}
              accept=".pdf,.xlsx,.xls"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="2) جدول المواد المعتمدة"
              value={form.approved_materials_table_file}
              fileUrl={form.approved_materials_table_file_url}
              fileName={form.approved_materials_table_file_name}
              onChange={(file) => setF("approved_materials_table_file", file)}
              onRemoveExisting={() => {
                setF("approved_materials_table_file_url", null);
                setF("approved_materials_table_file_name", null);
                setF("approved_materials_table_file", null);
              }}
              accept=".pdf,.xlsx,.xls"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="3) عرض السعر"
              value={form.price_offer_file}
              fileUrl={form.price_offer_file_url}
              fileName={form.price_offer_file_name}
              onChange={(file) => setF("price_offer_file", file)}
              onRemoveExisting={() => {
                setF("price_offer_file_url", null);
                setF("price_offer_file_name", null);
                setF("price_offer_file", null);
              }}
              accept=".pdf,.xlsx,.xls"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            {/* ✅ المخططات التعاقدية (مقسمة إلى 4 أنواع) */}
            <StaticContractAttachmentFile
              label="4-أ) مخططات MEP"
              value={form.mep_drawings_file}
              fileUrl={form.mep_drawings_file_url}
              fileName={form.mep_drawings_file_name}
              onChange={(file) => setF("mep_drawings_file", file)}
              onRemoveExisting={() => {
                setF("mep_drawings_file_url", null);
                setF("mep_drawings_file_name", null);
                setF("mep_drawings_file", null);
              }}
              accept=".pdf,.dwg,.dxf"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="4-ب) المخططات المعمارية"
              value={form.architectural_drawings_file}
              fileUrl={form.architectural_drawings_file_url}
              fileName={form.architectural_drawings_file_name}
              onChange={(file) => setF("architectural_drawings_file", file)}
              onRemoveExisting={() => {
                setF("architectural_drawings_file_url", null);
                setF("architectural_drawings_file_name", null);
                setF("architectural_drawings_file", null);
              }}
              accept=".pdf,.dwg,.dxf"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="4-ج) المخططات الإنشائية"
              value={form.structural_drawings_file}
              fileUrl={form.structural_drawings_file_url}
              fileName={form.structural_drawings_file_name}
              onChange={(file) => setF("structural_drawings_file", file)}
              onRemoveExisting={() => {
                setF("structural_drawings_file_url", null);
                setF("structural_drawings_file_name", null);
                setF("structural_drawings_file", null);
              }}
              accept=".pdf,.dwg,.dxf"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="4-د) مخططات الديكور"
              value={form.decoration_drawings_file}
              fileUrl={form.decoration_drawings_file_url}
              fileName={form.decoration_drawings_file_name}
              onChange={(file) => setF("decoration_drawings_file", file)}
              onRemoveExisting={() => {
                setF("decoration_drawings_file_url", null);
                setF("decoration_drawings_file_name", null);
                setF("decoration_drawings_file", null);
              }}
              accept=".pdf,.dwg,.dxf"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
            
            <StaticContractAttachmentFile
              label="5) المواصفات العامة والخاصة"
              value={form.general_specifications_file}
              fileUrl={form.general_specifications_file_url}
              fileName={form.general_specifications_file_name}
              onChange={(file) => setF("general_specifications_file", file)}
              onRemoveExisting={() => {
                setF("general_specifications_file_url", null);
                setF("general_specifications_file_name", null);
                setF("general_specifications_file", null);
              }}
              accept=".pdf,.doc,.docx"
              maxSizeMB={10}
              isView={viewMode}
              projectId={projectId}
              endpoint={`projects/${projectId}/contract/`}
            />
          </div>
        </div>
        
        {/* ✅ المرفقات الديناميكية (الملاحق) */}
        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "2px solid var(--border)" }}>
          <h5 style={{ marginBottom: "var(--space-4)", fontSize: "18px", fontWeight: "600" }}>الملاحق التعاقدية</h5>
        {viewMode ? (
          <div>
            {form.attachments && form.attachments.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--space-4)"
              }}>
                {form.attachments
                  .filter(att => {
                    // ✅ حماية إضافية: تصفية main_contract عند العرض
                    if (att && att.type === "main_contract") {
                      return false;
                    }
                    return true;
                  })
                  .map((att, idx, filteredArray) => {
                    // ✅ حساب عدد الملاحق السابقة (من نوع appendix فقط) - للعرض فقط
                    const previousAppendices = filteredArray
                      .slice(0, idx)
                      .filter(a => a.type === "appendix");
                    const appendixNumber = previousAppendices.length;
                    
                    return (
                      <ContractAttachment
                        key={idx}
                        attachment={att}
                        index={appendixNumber} // ✅ للعرض فقط (appendixNumber)
                        attachmentIndex={idx} // ✅ الفهرس الفعلي (للتوافق)
                        isView={true}
                        onUpdate={() => {}}
                        onRemove={() => {}}
                        canRemove={false}
                        projectId={projectId}
                        isPrivateFunding={isPrivateFunding}
                      />
                    );
                  })}
              </div>
            ) : (
              <div className="card text-center prj-muted p-20">
                لا توجد ملاحق
              </div>
            )}
          </div>
        ) : (
          <div>
            {form.attachments && form.attachments.length > 0 && (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: "var(--space-4)"
              }}>
                {form.attachments
                  .filter(att => {
                    // ✅ حماية إضافية: تصفية main_contract عند العرض
                    if (att && att.type === "main_contract") {
                      return false;
                    }
                    return true;
                  })
                  .map((att, idx, filteredArray) => {
                    // ✅ حساب عدد الملاحق السابقة (من نوع appendix فقط) - للعرض فقط
                    const previousAppendices = filteredArray
                      .slice(0, idx)
                      .filter(a => a.type === "appendix");
                    const appendixNumber = previousAppendices.length;
                    
                    // ✅ حساب الفهرس الفعلي في المصفوفة الأصلية
                    const originalIndex = form.attachments.findIndex(a => a === att);
                    
                    return (
                      <ContractAttachment
                        key={originalIndex !== -1 ? originalIndex : idx}
                        attachment={att}
                        index={appendixNumber} // ✅ للعرض فقط (appendixNumber)
                        attachmentIndex={originalIndex !== -1 ? originalIndex : idx} // ✅ الفهرس الفعلي في المصفوفة
                        isView={false}
                        onUpdate={(attIndex, field, value) => {
                          // ✅ استخدام attIndex مباشرة (هو idx الفعلي)
                          const updated = [...form.attachments];
                          updated[attIndex] = { ...updated[attIndex], [field]: value };
                          setF("attachments", updated);
                        }}
                        onRemove={(attIndex) => {
                          // ✅ استخدام attIndex مباشرة (هو idx الفعلي)
                          const updated = form.attachments.filter((_, i) => i !== attIndex);
                          setF("attachments", updated);
                        }}
                        canRemove={true}
                        projectId={projectId}
                        isPrivateFunding={isPrivateFunding}
                      />
                    );
                  })}
              </div>
            )}
          
            <div className="mt-12">
              <Button
                onClick={() => {
                  const newAttachment = {
                    type: "", // ✅ لا نوع افتراضي - المستخدم يختار
                    date: "",
                    file: null,
                    file_url: null,
                    file_name: null,
                price: "",
                    notes: "",
                  };
                  setF("attachments", [...(form.attachments || []), newAttachment]);
                }}
                style={{ background: "#f97316", color: "white" }}
              >
                + إضافة ملحق تعاقدي جديد
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* ✅ تم إزالة قسم التمديدات - التمديدات الآن في تبويب منفصل في ProjectView */}

      {/* 9) الملاحظات العامة */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">9) ملاحظات عامة</h4>
        {viewMode ? (
          <Field label="ملاحظات عامة">
            <div className="pre-wrap">{form.general_notes || t("empty_value")}</div>
          </Field>
        ) : (
          <Field label="ملاحظات عامة">
            <textarea
              className="input"
              rows={5}
              value={form.general_notes || ""}
              onChange={(e) => setF("general_notes", e.target.value)}
              placeholder="أدخل الملاحظات العامة..."
            />
          </Field>
        )}
      </div>

      {!viewMode && (
        <StepActions
          onPrev={onPrev}
          onNext={save}
          nextLabel={hasNextStep ? finishLabel : t("save")}
          nextClassName="primary"
        />
      )}
    </WizardShell>
  );
}
