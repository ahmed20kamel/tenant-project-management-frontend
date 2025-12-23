import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../services/api";
import Dialog from "../../../../components/common/Dialog";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import OwnerForm, { EMPTY_OWNER } from "../components/OwnerForm";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import RtlSelect from "../../../../components/forms/RtlSelect";
import Button from "../../../../components/common/Button";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileUploadWithProgressBar from "../../../../components/file-upload/FileUploadWithProgressBar";
import useSitePlan from "../../../../hooks/useSitePlan";
import { MUNICIPALITIES, ZONES } from "../../../../utils/constants";
import { formatSitePlanServerErrors } from "../../../../utils/errors/sitePlanErrorFormatter";
import { getErrorMessage } from "../../../../utils/errorHandler";
import { toApiDateUnified, toInputDateUnified } from "../../../../utils/dateHelpers";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { toLocalizedUse } from "../../../../utils/licenseHelpers";
import { formatDate } from "../../../../utils/formatters";
import InfoTip from "../components/InfoTip";
import DateInput from "../../../../components/fields/DateInput";
import { renameFileForUpload, getStandardFileName } from "../../../../utils/fileNaming";

export default function SitePlanStep({ 
  projectId, 
  setup, 
  onPrev, 
  onNext, 
  isView: isViewProp,
  isNewProject = false, // ✅ مشروع جديد بدون projectId
  onCreateProject, // ✅ callback لإنشاء المشروع بعد الحفظ
}) {

  console.log("===== SitePlanStep MOUNTED =====");
  console.log("projectId:", projectId);

  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");

  const {
    form,
    setF,
    owners,
    setOwners,
    existingId,
    setExistingId,
    isView: isViewState,
    setIsView,
    onSqmChange,
    onSqftChange,
    addOwner,
    removeOwner,
    updateOwner,
  } = useSitePlan(projectId, setup);

  console.log("Initial owners from useSitePlan:", owners);

  // ----- View Mode Sync -----
  const [viewMode, setViewMode] = useState(() => {
    if (isViewProp !== undefined) return isViewProp === true;
    return isViewState === true;
  });

  useEffect(() => {
    console.log("View mode changed:", { isViewProp, isViewState });
    if (isViewProp !== undefined) setViewMode(isViewProp === true);
    else setViewMode(isViewState === true);
  }, [isViewProp, isViewState]);

  const updateViewMode = (next) => {
    console.log("updateViewMode:", next);
    setViewMode(next);
    if (isViewProp === undefined) setIsView(next);
  };

  const [errorMsg, setErrorMsg] = useState("");
  const [applicationFileUrl, setApplicationFileUrl] = useState("");
  const [applicationFileName, setApplicationFileName] = useState("");
  const [ownerFileUrls, setOwnerFileUrls] = useState({});
  const [ownerFileNames, setOwnerFileNames] = useState({});
  const [uploadedApplicationFileUrl, setUploadedApplicationFileUrl] = useState(null); // URL للملف المرفوع في الخلفية
  const [uploadProgress, setUploadProgress] = useState(0); // تتبع التقدم أثناء الرفع
  const [isUploading, setIsUploading] = useState(false); // حالة الرفع
  const [contractOwners, setContractOwners] = useState([]); // ✅ بيانات الملاك من العقد

  console.log("OwnerFileUrls:", ownerFileUrls);
  console.log("OwnerFileNames:", ownerFileNames);

  // توليد رقم المعاملة تلقائياً عند تغيير تاريخ المعاملة
  // السنة تذهب تلقائياً بعد "/" في رقم المعاملة
  useEffect(() => {
    if (form.application_date && !viewMode) {
      const date = new Date(form.application_date);
      const year = date.getFullYear();
      const currentNumber = form.application_number || "";
      
      // استخراج الرقم بعد "/" إذا كان موجوداً
      const parts = currentNumber.split('/');
      const numberAfterSlash = parts.length > 1 ? parts[1] : "";
      
      // إذا كان رقم المعاملة فارغاً أو لا يحتوي على "/"، نولد تلقائياً: {year}/
      if (!currentNumber.trim() || !currentNumber.includes('/')) {
        setF("application_number", `${year}/`);
      } 
      // إذا كان رقم المعاملة موجوداً لكن السنة مختلفة، نستبدل السنة فقط ونحتفظ بالرقم بعد "/"
      else {
        const currentYear = parts[0];
        if (currentYear !== year.toString()) {
          // تحديث السنة فقط مع الحفاظ على الرقم بعد "/"
          setF("application_number", `${year}/${numberAfterSlash}`);
        } else if (!numberAfterSlash && currentNumber.endsWith('/')) {
          // إذا كانت السنة صحيحة لكن لا يوجد رقم بعد "/"، نتركها كما هي
          // (المستخدم سيدخل الرقم يدوياً)
        }
      }
    }
  }, [form.application_date, viewMode, setF]);

  // Options (Municipality & Zones)
  const municipalityOptions = useMemo(
    () =>
      MUNICIPALITIES.map((m) => ({
        value: m.value,
        label: isAR ? m.label.ar : m.label.en,
      })),
    [isAR]
  );

  const zonesOptions = useMemo(
    () =>
      (ZONES[form.municipality] || []).map((z) => ({
        value: z.value,
        label: isAR ? z.label.ar : z.label.en,
      })),
    [form.municipality, isAR]
  );

  // Reset zone if invalid
  useEffect(() => {
    const zoneValues = (ZONES[form.municipality] || []).map((z) => z.value);
    if (form.zone && !zoneValues.includes(form.zone)) {
      console.warn("Zone reset because it's not valid for this municipality.");
      setF("zone", "");
    }
  }, [form.municipality]);

  // ---------------------------
  // تحميل الملفات المحفوظة من الباك
  // ---------------------------
  useEffect(() => {
    if (!projectId) return;

    console.log("Loading remote files for project:", projectId);

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);
        if (!mounted) return;

        if (Array.isArray(data) && data.length > 0) {
          const siteplanData = data[0];
          console.log("Loaded siteplan:", siteplanData);

          // Application file
          if (siteplanData.application_file) {
            setApplicationFileUrl(siteplanData.application_file);
            setApplicationFileName(extractFileNameFromUrl(siteplanData.application_file));
          }

          // Owners' files
          if (siteplanData.owners && Array.isArray(siteplanData.owners)) {
            const urls = {};
            const names = {};

            siteplanData.owners.forEach((owner, idx) => {
              if (
                owner.id_attachment &&
                typeof owner.id_attachment === "string" &&
                owner.id_attachment.trim() !== ""
              ) {
                urls[idx] = owner.id_attachment;
                names[idx] = extractFileNameFromUrl(owner.id_attachment);
              }
            });

            console.log("Loaded owner file URLs:", urls);

            setOwnerFileUrls(urls);
            setOwnerFileNames(names);
          }
        }
      } catch (e) {
        console.error("Error loading siteplan files:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  // ✅ تحميل بيانات الملاك من العقد
  useEffect(() => {
    if (!projectId || !viewMode) return; // ✅ فقط في وضع العرض
    
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (Array.isArray(data) && data.length > 0) {
          const contractData = data[0];
          if (contractData.owners && Array.isArray(contractData.owners) && contractData.owners.length > 0) {
            setContractOwners(contractData.owners);
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Loaded contract owners:", contractData.owners);
            }
          }
        }
      } catch (e) {
        console.error("Error loading contract owners:", e);
      }
    })();
  }, [projectId, viewMode]);

  // ✅ دالة لتحديد المالك المفوض
  const handleAuthorizedChange = (index) => {
    setOwners((prev) => {
      return prev.map((owner, idx) => ({
        ...owner,
        is_authorized: idx === index, // ✅ فقط المالك المحدد يكون مفوض
      }));
    });
  };

  // ✅ دالة لمطابقة الملاك من المخطط مع الملاك من العقد
  const getContractOwnerData = (sitePlanOwner) => {
    if (!contractOwners || contractOwners.length === 0) return null;
    
    // ✅ محاولة المطابقة بناءً على id_number أولاً
    if (sitePlanOwner.id_number) {
      const matched = contractOwners.find(
        co => co.id_number && co.id_number.trim() === sitePlanOwner.id_number.trim()
      );
      if (matched) return matched;
    }
    
    // ✅ إذا لم تكن هناك مطابقة، نبحث بناءً على owner_name_ar
    if (sitePlanOwner.owner_name_ar) {
      const matched = contractOwners.find(
        co => co.owner_name_ar && co.owner_name_ar.trim() === sitePlanOwner.owner_name_ar.trim()
      );
      if (matched) return matched;
    }
    
    return null;
  };

  // ----- Sync owner file URLs when owners change -----
  useEffect(() => {
    if (!owners || owners.length === 0) {
      setOwnerFileUrls({});
      setOwnerFileNames({});
      return;
    }

    const currentUrls = {};
    const currentNames = {};

    owners.forEach((owner, idx) => {
      // ✅ إذا كان الملف File object جديد، لا نحدث URL (سيتم رفعه)
      if (owner.id_attachment instanceof File) {
        // لا نفعل شيء - الملف جديد وسيتم رفعه
        return;
      }
      
      // ✅ إذا كان URL string، نحافظ عليه
      if (
        owner.id_attachment &&
        typeof owner.id_attachment === "string" &&
        owner.id_attachment.trim() !== ""
      ) {
        currentUrls[idx] = owner.id_attachment;
        currentNames[idx] = extractFileNameFromUrl(owner.id_attachment);
      }
      // ✅ إذا كان null أو undefined، لا نضيف URL (سيتم حذف الملف)
    });

    console.log("Updating ownerFileUrls after owners changed:", currentUrls);

    setOwnerFileUrls(currentUrls);
    setOwnerFileNames(currentNames);
  }, [owners]);
  // -----------------------------------------------------
  // 🔥 buildPayload — أهم جزء في الخطوة كلها
  // -----------------------------------------------------
  const buildPayload = () => {
    console.log("===== Building Payload =====");

    const application_date_api = toApiDateUnified(form.application_date);
    const allocation_date_api = toApiDateUnified(form.allocation_date);

    const normalized = {
      ...form,
      application_date: application_date_api || undefined,
      allocation_date: allocation_date_api || undefined,
    };

    console.log("Normalized Form:", normalized);

    // ------------------------------
    // 🔴 Check: allocation date < application date
    // ------------------------------
    if (application_date_api && allocation_date_api) {
      const alloc = new Date(allocation_date_api);
      const app = new Date(application_date_api);

      if (alloc >= app) {
        const msg = t("errors.allocation_before_application");
        console.error("Date Validation Error:", msg);
        throw new Error(msg);
      }
    }

    // ------------------------------
    // 🔴 Check: Sum shares == 100
    // ------------------------------
    const sum = owners.reduce((s, o) => s + (parseFloat(o.share_percent) || 0), 0);

    console.log("Owners Shares Sum:", sum);

    if (Math.round(sum) !== 100) {
      console.error("Share percent validation failed:", sum);
      throw new Error(t("errors.owners_share_sum_100"));
    }

    // ------------------------------
    // 🔴 Check: Authorized owner selected
    // ------------------------------
    const authorizedOwner = owners.find((o) => o.is_authorized === true);
    if (!authorizedOwner) {
      console.error("No authorized owner selected");
      throw new Error(t("errors.authorized_owner_required") || "يجب تحديد المالك المفوض");
    }

    // ------------------------------
    // 🔴 Check: owner bilingual name
    // ------------------------------
    owners.forEach((o, idx) => {
      if (!o.owner_name_ar?.trim() && !o.owner_name_en?.trim()) {
        console.error("Owner missing both AR/EN names:", o);
        throw new Error(t("errors.owner_name_bilingual_required", { idx: idx + 1 }));
      }
    });

    // ------------------------------
    // Always use FormData
    // ------------------------------
    const fd = new FormData();

    // ------------------------------
    // Basic Fields
    // ------------------------------
    Object.entries(normalized).forEach(([k, v]) => {
      if (k === "application_file") return;
      if (k === "application_date" || k === "allocation_date") {
        if (v) fd.append(k, v);
      } else {
        fd.append(k, v ?? "");
      }
    });

    // -----------------------------------------------------
    // 🔥 Owners
    // -----------------------------------------------------
    let validOwnerIndex = 0;

    owners.forEach((o, originalIdx) => {
      const nameAr = (o.owner_name_ar || "").trim();
      const nameEn = (o.owner_name_en || "").trim();

      if (!nameAr && !nameEn) return;

      const idx = validOwnerIndex++;

      console.log(`Building owner ${idx}:`, o);

      // id مهم جدا جدا - تحويل إلى string للتأكد من الإرسال الصحيح
      if (o.id) {
        console.log(`Appending owner[${idx}][id]:`, o.id);
        fd.append(`owners[${idx}][id]`, String(o.id));
      }

      fd.append(`owners[${idx}][owner_name_ar]`, nameAr);
      fd.append(`owners[${idx}][owner_name_en]`, nameEn);
      fd.append(`owners[${idx}][owner_name]`, nameAr);
      fd.append(`owners[${idx}][is_authorized]`, o.is_authorized ? "true" : "false"); // ✅ المالك المفوض

      fd.append(`owners[${idx}][id_number]`, o.id_number || "");
      fd.append(`owners[${idx}][nationality]`, o.nationality || "");
      fd.append(`owners[${idx}][phone]`, o.phone || "");
      fd.append(`owners[${idx}][email]`, o.email || "");
      fd.append(`owners[${idx}][right_hold_type]`, o.right_hold_type || "Ownership");
      fd.append(`owners[${idx}][share_percent]`, o.share_percent || "100");
      fd.append(`owners[${idx}][share_possession]`, o.share_possession || "");

      const issue = toApiDateUnified(o.id_issue_date);
      const expiry = toApiDateUnified(o.id_expiry_date);

      if (issue) fd.append(`owners[${idx}][id_issue_date]`, issue);
      if (expiry) fd.append(`owners[${idx}][id_expiry_date]`, expiry);

      // -----------------------------------------------------
      // 🔥 File Upload
      // -----------------------------------------------------
      if (o.id_attachment instanceof File) {
        // تسمية الملف باسم موحد حسب نص الحقل
        const labelText = t("id_attachment") || "إرفاق الهوية";
        const renamedFile = renameFileForUpload(o.id_attachment, 'id_attachment', idx, labelText);
        console.log(`Uploading NEW file for owner ${idx}: ${o.id_attachment.name} -> ${renamedFile.name}`);
        fd.append(`owners[${idx}][id_attachment]`, renamedFile, renamedFile.name);
      } else if (o.id_attachment && typeof o.id_attachment === "string") {
        // ✅ إذا كان ملف موجود (URL string)، لا نرسل شيء - الباك إند سيحافظ عليه
        console.log(`Keeping existing file for owner ${idx}:`, o.id_attachment);
      } else if (o.id_attachment === null) {
        // ✅ إذا كان null صريحاً، نرسل إشارة لحذف الملف
        console.log(`Removing file for owner ${idx}`);
        fd.append(`owners[${idx}][id_attachment_delete]`, "true");
      } else {
        // ✅ إذا كان undefined، نحافظ على الملف الموجود (لا نرسل شيء)
        console.log(`No file change for owner ${idx}`);
      }
    });

    // -----------------------------------------------------
    // Application File
    // -----------------------------------------------------
    // إذا كان الملف مرفوعاً مسبقاً (URL)، لا نرسله مرة أخرى
    // إذا كان File جديد، نرسله
    if (form.application_file instanceof File) {
      // تسمية الملف باسم موحد حسب نص الحقل
      const labelText = t("attach_land_site_plan") || "إرفاق مخطط الأرض";
      const renamedFile = renameFileForUpload(form.application_file, 'application_file', 0, labelText);
      console.log("Uploading NEW application file:", form.application_file.name, "->", renamedFile.name);
      fd.append("application_file", renamedFile, renamedFile.name);
    } else if (form.application_file && typeof form.application_file === 'string') {
      // إذا كان URL (ملف مرفوع مسبقاً في الخلفية)، لا نرسل شيء - الباك إند سيحافظ عليه
      // أو يمكن إرسال URL كحقل نصي إذا كان الباك إند يدعم ذلك
      console.log("File already uploaded in background, skipping:", form.application_file);
      // لا نرسل شيء - الملف مرفوع بالفعل
    }

    console.log("===== Payload Build DONE =====");
    return fd;
  };

  // -----------------------------------------------------
  // 🔥 saveAndNext
  // -----------------------------------------------------
  const saveAndNext = async () => {
    console.log("========== SAVE START ==========");
    console.log("isNewProject:", isNewProject);

    // ✅ إذا كان مشروع جديد، نحفظ البيانات مؤقتاً وننشئ المشروع
    if (isNewProject) {
      if (!onCreateProject) {
        setErrorMsg(t("unknown_error"));
        return;
      }

      try {
        const payload = buildPayload();
        setIsUploading(true);
        setUploadProgress(50);
        
        // استدعاء callback لإنشاء المشروع وحفظ البيانات
        await onCreateProject(payload);
        
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 1000);
      } catch (err) {
        console.error("Error in onCreateProject:", err);
        setErrorMsg(err?.message || t("unknown_error"));
        setIsUploading(false);
        setUploadProgress(0);
      }
      return;
    }

    // ✅ إذا كان مشروع موجود، نحفظ في DB
    if (!projectId) {
      const msg = t("open_specific_project_to_save");
      console.error(msg);
      setErrorMsg(msg);
      return;
    }

    try {
      const payload = buildPayload();
      setIsUploading(true);
      setUploadProgress(0);

      console.log("Saving SitePlan:", {
        projectId,
        existingId,
        ownersCount: owners.length,
        payloadType: payload instanceof FormData ? "FormData" : typeof payload,
      });

      let response;

      if (existingId) {
        console.log("PATCH → Updating SitePlan ID:", existingId);
        response = await api.patch(`projects/${projectId}/siteplan/${existingId}/`, payload, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        });
      } else {
        console.log("POST → Creating new SitePlan");
        response = await api.post(`projects/${projectId}/siteplan/`, payload, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        });
        if (response?.data?.id) {
          console.log("Created SitePlan with ID:", response.data.id);
          setExistingId(response.data.id);
        }
      }

      console.log("SAVE SUCCESS:", response?.data);

      // Clear error and reset upload state
      setErrorMsg("");
      setIsUploading(false);
      setUploadProgress(100);
      // إعادة تعيين التقدم بعد ثانية
      setTimeout(() => setUploadProgress(0), 1000);

      // -----------------------------------------------------
      // 🔥 Reload latest siteplan from backend
      // -----------------------------------------------------
      console.log("Reloading remote SitePlan to sync UI…");

      try {
        const { data } = await api.get(`projects/${projectId}/siteplan/`);

        if (Array.isArray(data) && data.length > 0) {
          const siteplanData = data[0];
          console.log("Reloaded siteplan:", siteplanData);

          // Application file
          if (siteplanData.application_file) {
            setApplicationFileUrl(siteplanData.application_file);
            setApplicationFileName(extractFileNameFromUrl(siteplanData.application_file));
          }

          // Owners
          if (siteplanData.owners && Array.isArray(siteplanData.owners)) {
            const updatedOwners = siteplanData.owners.map((o, idx, arr) => ({
              ...EMPTY_OWNER,
              ...o,
              // ✅ الحفاظ على id من الـ backend (مهم جداً للتحديث)
              id: o.id,
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
              share_percent: arr.length === 1 ? "100" : String(o.share_percent ?? 0),
              is_authorized: o.is_authorized || (idx === 0 && !o.hasOwnProperty('is_authorized')), // ✅ الحفاظ على is_authorized أو استخدام الأول كافتراضي
              // ✅ الحفاظ على id_attachment كـ URL string (ليس File object)
              // هذا مهم جداً - بعد الحفظ، الملف موجود في السيرفر كـ URL
              id_attachment:
                typeof o.id_attachment === "string" && o.id_attachment.trim() !== ""
                  ? o.id_attachment
                  : null,
            }));

            console.log("Updated owners (from server):", updatedOwners);

            setOwners(updatedOwners);

            // Files
            const urls = {};
            const names = {};

            updatedOwners.forEach((owner, idx) => {
              if (
                owner.id_attachment &&
                typeof owner.id_attachment === "string" &&
                owner.id_attachment.trim() !== ""
              ) {
                urls[idx] = owner.id_attachment;
                names[idx] = extractFileNameFromUrl(owner.id_attachment);
              }
            });

            setOwnerFileUrls(urls);
            setOwnerFileNames(names);

            console.log("Updated owner file URLs:", urls);
          }
        }
      } catch (e) {
        console.error("Error reloading siteplan:", e);
      }

      // Switch to view mode
      updateViewMode(true);

      console.log("Dispatching: siteplan-owners-updated");
      window.dispatchEvent(
        new CustomEvent("siteplan-owners-updated", { detail: { projectId } })
      );

      // If wizard has next step
      if (typeof onNext === "function") {
        console.log("Calling onNext()");
        onNext();
      }

      console.log("========== SAVE END ==========");

    } catch (err) {
      console.error("SAVE ERROR RAW:", err);
      // إعادة تعيين حالة الرفع عند الخطأ
      setIsUploading(false);
      setUploadProgress(0);
      
      const serverData = err?.response?.data;

      // محاولة استخدام formatSitePlanServerErrors أولاً
      const formatted = formatSitePlanServerErrors(serverData);

      // إذا لم يكن هناك تنسيق محدد، استخدم معالج الأخطاء الموحد
      if (formatted) {
        setErrorMsg(formatted);
      } else {
        const errorMessage = getErrorMessage(err, "حفظ مخطط الأرض");
        setErrorMsg(errorMessage || t("save_failed"));
      }
    }
  };

  const hasNextStep = typeof onNext === "function";
  const devParen = ` (${t("developer", "المطور")})`;
  const projectNoLabel = `${t("project_no")}${devParen}`;
  const projectNameLabel = `${t("project_name_f")}${devParen}`;

  return (
    <WizardShell title={t("step_siteplan")}>
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

      {/* 1) تفاصيل العقار */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">{t("property_details")}</h4>
        {viewMode ? (
        <div className="form-grid cols-4">
          <ViewRow label={t("municipality")} value={form.municipality} />
          <ViewRow label={t("zone")} value={form.zone} />
          <ViewRow label={t("sector")} value={form.sector} />
          <ViewRow label={t("plot_area_sqm")} value={form.plot_area_sqm} />
          <ViewRow label={t("plot_area_sqft")} value={form.plot_area_sqft} />
          <ViewRow label={t("land_no")} value={form.land_no} />
          <ViewRow label={t("allocation_type")} value={toLocalizedUse(form.allocation_type, i18n.language)} />
          <ViewRow label={t("land_use")} value={toLocalizedUse(form.land_use, i18n.language)} />
          {form.allocation_date && (
            <ViewRow 
              label={t("allocation_date")} 
              value={formatDate(form.allocation_date, i18n.language)}
              tip={t("allocation_date_note") || "تاريخ تخصيص الأرض من البلدية"}
            />
          )}
        </div>
      ) : (
        <div className="form-grid cols-4">
          <Field label={t("municipality")}>
            <RtlSelect
              className="rtl-select"
              options={municipalityOptions}
              value={form.municipality}
              onChange={(v) => {
                setF("municipality", v);
                setF("zone", "");
              }}
              placeholder={t("select_municipality")}
            />
          </Field>
          <Field label={t("zone")}>
            <RtlSelect
              className="rtl-select"
              options={zonesOptions}
              value={form.zone}
              onChange={(v) => setF("zone", v)}
              placeholder={form.municipality ? t("select_zone") : t("select_municipality_first")}
              isDisabled={!form.municipality}
            />
          </Field>
          <Field label={t("sector")}>
            <input
              className="input"
              value={form.sector}
              onChange={(e) => setF("sector", e.target.value.toUpperCase())}
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label={t("plot_area_sqm")}>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={form.plot_area_sqm ? form.plot_area_sqm.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              onChange={(e) => {
                // إزالة الفواصل أولاً
                const withoutCommas = e.target.value.replace(/,/g, "");
                // السماح بالأرقام والنقطة فقط
                const cleaned = withoutCommas.replace(/[^\d.]/g, "");
                // السماح بنقطة واحدة فقط
                const parts = cleaned.split(".");
                let final = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
                
                // ✅ التحقق أثناء الإدخال: لا يزيد عن 10 أرقام قبل الفاصلة
                const [integerPart] = final.split(".");
                if (integerPart && integerPart.length > 10) {
                  final = integerPart.slice(0, 10) + (parts.length > 1 ? "." + parts.slice(1).join("") : "");
                }
                
                onSqmChange(final);
              }}
            />
          </Field>
          <Field label={t("plot_area_sqft")}>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={form.plot_area_sqft ? form.plot_area_sqft.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              onChange={(e) => {
                // إزالة الفواصل أولاً
                const withoutCommas = e.target.value.replace(/,/g, "");
                // السماح بالأرقام والنقطة فقط
                const cleaned = withoutCommas.replace(/[^\d.]/g, "");
                // السماح بنقطة واحدة فقط
                const parts = cleaned.split(".");
                let final = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
                
                // ✅ التحقق أثناء الإدخال: لا يزيد عن 12 رقم إجمالي
                const totalDigits = final.replace(/\./g, "").length;
                if (totalDigits > 12) {
                  // إزالة الأرقام الزائدة من النهاية
                  const [integerPart, decimalPart] = final.split(".");
                  if (decimalPart) {
                    const maxDecimal = 12 - integerPart.length;
                    final = integerPart + "." + decimalPart.slice(0, maxDecimal);
                  } else {
                    final = final.slice(0, 12);
                  }
                }
                
                onSqftChange(final);
              }}
            />
          </Field>
          <Field label={t("land_no")}>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={form.land_no}
              onChange={(e) => {
                // أرقام فقط
                const cleaned = e.target.value.replace(/\D/g, "");
                setF("land_no", cleaned);
              }}
            />
          </Field>
          <Field label={t("allocation_type")}>
            <select
              className="input"
              value={form.allocation_type}
              onChange={(e) => setF("allocation_type", e.target.value)}
            >
              <option value="Residential">{t("residential")}</option>
              <option value="Commercial">{t("commercial")}</option>
              <option value="Government">{t("government")}</option>
            </select>
          </Field>
          <Field label={t("land_use")}>
            <select
              className="input"
              value={form.land_use}
              onChange={(e) => setF("land_use", e.target.value)}
            >
              <option value="Residential">{t("residential")}</option>
              <option value="Investment">{t("investment")}</option>
            </select>
          </Field>
          <Field label={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t("allocation_date")}</span>
              <InfoTip align="start" text={t("allocation_date_note")} />
            </div>
          }>
            <DateInput
              className="input"
              value={form.allocation_date}
              onChange={(value) => setF("allocation_date", value)}
              placeholder="dd / mm / yyyy"
            />
          </Field>
        </div>
        )}
      </div>

      {/* 2) بيانات المطور */}
      {(form.land_use === "Investment" || (viewMode && (form.developer_name || form.project_no || form.project_name))) && (
        <>
          <div className="wizard-section">
            <h4 className="wizard-section-title">{t("developer_details")}</h4>
            {viewMode ? (
            <div className="form-grid cols-3">
              {(form.developer_name || form.project_no || form.project_name) ? (
                <>
                  {form.developer_name && <ViewRow label={t("developer_name")} value={form.developer_name} />}
                  {form.project_no && <ViewRow label={projectNoLabel} value={form.project_no} />}
                  {form.project_name && <ViewRow label={projectNameLabel} value={form.project_name} />}
                </>
              ) : (
                <div className="card text-center prj-muted p-20">
                  {t("no_developer_data") || "لا توجد بيانات المطور"}
                </div>
              )}
            </div>
          ) : (
            <div className="form-grid cols-3">
              <Field label={t("developer_name")}>
                <input
                  className="input"
                  value={form.developer_name}
                  onChange={(e) => setF("developer_name", e.target.value)}
                />
              </Field>
              <Field label={projectNoLabel}>
                <input
                  className="input"
                  type="number"
                  value={form.project_no}
                  onChange={(e) => setF("project_no", e.target.value)}
                />
              </Field>
              <Field label={projectNameLabel}>
                <input
                  className="input"
                  value={form.project_name}
                  onChange={(e) => setF("project_name", e.target.value)}
                />
              </Field>
            </div>
            )}
          </div>
        </>
      )}

      {/* 3) معلومات المالك */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">{t("owner_details_by_id_card")}</h4>
        {viewMode ? (
        <div className="stack">
          {owners.length === 0 ? (
            <div className="card text-center prj-muted p-20">
              {t("no_owners_added")}
            </div>
          ) : (
            owners.map((o, i) => {
              const fileUrl = ownerFileUrls[i] || (typeof o.id_attachment === "string" && o.id_attachment.trim() !== "" ? o.id_attachment : "");
              const fileName = ownerFileNames[i] || (o.id_attachment instanceof File ? o.id_attachment.name : "") || (fileUrl ? extractFileNameFromUrl(fileUrl) : "");
              // ✅ الحصول على بيانات المالك من العقد
              const contractOwner = getContractOwnerData(o);
              // ✅ استخدام phone و email من العقد إذا كانت موجودة، وإلا من المخطط
              const ownerWithContractData = {
                ...o,
                phone: contractOwner?.phone || o.phone || "",
                email: contractOwner?.email || o.email || "",
              };
              return (
                <OwnerForm
                  key={i}
                  owner={ownerWithContractData}
                  index={i}
                  isView={true}
                  isAR={isAR}
                  idAttachmentUrl={fileUrl}
                  projectId={projectId}
                  idAttachmentFileName={fileName}
                  isAuthorized={ownerWithContractData.is_authorized || false}
                />
              );
            })
          )}
        </div>
      ) : (
        <>
          {owners.length === 0 ? (
            <div className="card text-center prj-muted p-20">
              {t("no_owners_added")}
            </div>
          ) : (
            owners.map((o, i) => {
              const fileUrl = ownerFileUrls[i] || (typeof o.id_attachment === "string" && o.id_attachment.trim() !== "" ? o.id_attachment : "");
              const fileName = ownerFileNames[i] || (o.id_attachment instanceof File ? o.id_attachment.name : "") || (fileUrl ? extractFileNameFromUrl(fileUrl) : "");
              return (
                <OwnerForm
                  key={i}
                  owner={o}
                  index={i}
                  isView={false}
                  onUpdate={updateOwner}
                  onRemove={removeOwner}
                  canRemove={owners.length > 1}
                  isAR={isAR}
                  idAttachmentUrl={fileUrl}
                  projectId={projectId}
                  idAttachmentFileName={fileName}
                  hideContactInfo={true}
                  isAuthorized={o.is_authorized || false}
                  onAuthorizedChange={handleAuthorizedChange}
                />
              );
            })
          )}
          <div className="mt-12">
            <Button onClick={addOwner}>{t("add_owner")}</Button>
          </div>
        </>
        )}
      </div>

      {/* 5) بيانات المعاملة */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">{t("application_details")}</h4>
        {viewMode ? (
        <div className="form-grid cols-3">
          <ViewRow label={t("application_number")} value={form.application_number} />
          <ViewRow label={t("application_date")} value={formatDate(form.application_date, i18n.language)} />
          <Field label={t("attach_land_site_plan")}>
            <FileAttachmentView
              fileUrl={applicationFileUrl}
              fileName={applicationFileName || (applicationFileUrl ? extractFileNameFromUrl(applicationFileUrl) : "") || (form.application_file?.name || "")}
              projectId={projectId}
              endpoint={`projects/${projectId}/siteplan/`}
            />
          </Field>
        </div>
      ) : (
        <div className="form-grid cols-3">
          <Field label={t("application_date")}>
            <DateInput
              className="input"
              value={form.application_date}
              onChange={(value) => {
                setF("application_date", value);
                // عند تغيير التاريخ، نحدث رقم المعاملة تلقائياً
                if (value) {
                  const date = new Date(value);
                  const year = date.getFullYear();
                  const currentNumber = form.application_number || "";
                  
                  // إذا كان رقم المعاملة فارغاً أو لا يحتوي على "/"، نضيف السنة + "/"
                  if (!currentNumber.trim() || !currentNumber.includes('/')) {
                    setF("application_number", `${year}/`);
                  } else {
                    // إذا كان موجوداً، نستبدل السنة فقط
                    const parts = currentNumber.split('/');
                    const numberAfterSlash = parts.length > 1 ? parts[1] : "";
                    setF("application_number", `${year}/${numberAfterSlash}`);
                  }
                }
              }}
              placeholder="dd / mm / yyyy"
            />
          </Field>
          <Field label={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>{t("application_number")}</span>
              {!form.application_date && (
                <InfoTip align="start" text="برجاء إدخال التاريخ أولاً" />
              )}
            </div>
          }>
            <input
              className="input"
              value={form.application_number}
              onChange={(e) => {
                let value = e.target.value;
                // إذا كان المستخدم يحاول حذف "/" بعد السنة، نمنعه
                const year = form.application_date ? new Date(form.application_date).getFullYear().toString() : "";
                if (year && value.startsWith(year) && !value.includes('/')) {
                  // إذا كانت السنة موجودة لكن "/" محذوف، نضيفه تلقائياً
                  value = `${year}/`;
                }
                setF("application_number", value);
              }}
              placeholder={form.application_date ? `${new Date(form.application_date).getFullYear()}/` : "YYYY/رقم"}
              disabled={!form.application_date}
              dir="rtl"
              style={{
                cursor: !form.application_date ? "not-allowed" : "text",
                opacity: !form.application_date ? 0.6 : 1
              }}
            />
          </Field>
          <Field label={t("attach_land_site_plan")}>
            <FileUploadWithProgressBar
              value={form.application_file}
              onChange={(file) => {
                setF("application_file", file);
                if (file) {
                  // استخدام الاسم الموحد بدلاً من الاسم الأصلي
                  const originalExtension = file.name.substring(file.name.lastIndexOf('.'));
                  const standardFileName = getStandardFileName('application_file', 0, originalExtension);
                  setApplicationFileName(standardFileName);
                } else {
                  setUploadedApplicationFileUrl(null);
                }
              }}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxSizeMB={10}
              showPreview={true}
              existingFileUrl={uploadedApplicationFileUrl || applicationFileUrl}
              existingFileName={applicationFileName || (applicationFileUrl ? extractFileNameFromUrl(applicationFileUrl) : "")}
              onRemoveExisting={() => {
                setF("application_file", null);
                setApplicationFileName("");
                setUploadedApplicationFileUrl(null);
              }}
              fileType="application_file"
              compressionOptions={{
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
              }}
            />
          </Field>
        </div>
        )}
      </div>

      {/* مصدر المشروع */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">مصدر المشروع</h4>
        {viewMode ? (
          <Field label="مصدر المشروع">
            <div className="pre-wrap">{form.source_of_project || t("empty_value")}</div>
          </Field>
        ) : (
          <Field label="مصدر المشروع">
            <textarea
              className="input"
              rows={3}
              value={form.source_of_project || ""}
              onChange={(e) => setF("source_of_project", e.target.value)}
              placeholder="أدخل مصدر المشروع..."
            />
          </Field>
        )}
      </div>

      {!viewMode && (
        <StepActions
          onPrev={onPrev}
          onNext={saveAndNext}
          nextLabel={hasNextStep ? undefined : t("save")}
        />
      )}
    </WizardShell>
  );
}
