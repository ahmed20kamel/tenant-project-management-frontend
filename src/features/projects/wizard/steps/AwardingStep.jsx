import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../services/api";
import Field from "../../../../components/forms/Field";
import Dialog from "../../../../components/common/Dialog";
import StepActions from "../components/StepActions";
import WizardShell from "../components/WizardShell";
import Button from "../../../../components/common/Button";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import DateInput from "../../../../components/fields/DateInput";
import { extractFileNameFromUrl } from "../../../../utils/fileHelpers";
import { formatDate } from "../../../../utils/formatters";

export default function AwardingStep({ projectId, onPrev, onNext, isView }) {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";
  const navigate = useNavigate();
  const [license, setLicense] = useState(null);
  const [siteplan, setSiteplan] = useState(null);
  const [existingId, setExistingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  // ✅ توحيد السلوك: إذا كان isView محدد من الخارج (من WizardPage)، نستخدمه مباشرة
  // الوضع الافتراضي هو التعديل (false) وليس الفيو
  const [localIsView, setLocalIsView] = useState(() => {
    // إذا كان isView محدد صراحة (true أو false)، نستخدمه
    if (isView !== undefined) return isView === true;
    // الوضع الافتراضي هو التعديل
    return false;
  });

  const [awardDate, setAwardDate] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("VR-");
  const [projectNumber, setProjectNumber] = useState("");

  const [contractorRegNo, setContractorRegNo] = useState("VR-");
  const [awardingFile, setAwardingFile] = useState(null); // ← ارفاق امر الترسية
  const [awardingFileName, setAwardingFileName] = useState(""); // ← اسم الملف المحفوظ
  const [awardingFileUrl, setAwardingFileUrl] = useState(""); // ← URL الملف المحفوظ
  
  // ✅ تتبع ما إذا كان تم البحث عن أرقام التسجيل
  const [hasSearchedConsultant, setHasSearchedConsultant] = useState(false);
  const [hasSearchedContractor, setHasSearchedContractor] = useState(false);

  const handleContractorRegChange = (e) => {
    let v = e.target.value;
    v = v.replace(/^VR-/i, "").replace(/[^0-9]/g, "");
    setContractorRegNo("VR-" + v);
  };

  // ✅ البحث عن رقم تسجيل الاستشاري من مشاريع أخرى
  const searchConsultantRegistrationNumber = async (consultantName) => {
    if (!consultantName) return;
    try {
      const { data: projects } = await api.get("projects/");
      const items = Array.isArray(projects) ? projects : (projects?.results || projects?.items || []);
      
      // البحث في جميع المشاريع
      for (const project of items) {
        if (project.id === projectId) continue; // تخطي المشروع الحالي
        
        try {
          const { data: licenseRes } = await api.get(`projects/${project.id}/license/`);
          const licenseData = Array.isArray(licenseRes) ? licenseRes[0] : licenseRes;
          
          if (licenseData) {
            const isMatch = 
              (licenseData.design_consultant_name && 
               licenseData.design_consultant_name.toLowerCase().trim() === consultantName.toLowerCase().trim()) ||
              (licenseData.supervision_consultant_name && 
               licenseData.supervision_consultant_name.toLowerCase().trim() === consultantName.toLowerCase().trim());
            
            if (isMatch) {
              // البحث عن رقم التسجيل في awarding
              try {
                const { data: awardingRes } = await api.get(`projects/${project.id}/awarding/`);
                const awardingData = Array.isArray(awardingRes) ? awardingRes[0] : awardingRes;
                
                if (awardingData?.consultant_registration_number) {
                  setRegistrationNumber(awardingData.consultant_registration_number);
                  return; // وجدنا الرقم، نتوقف
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Error searching for consultant registration number:", e);
    }
  };
  
  // ✅ البحث عن رقم تسجيل المقاول من مشاريع أخرى
  const searchContractorRegistrationNumber = async (contractorName) => {
    if (!contractorName) return;
    try {
      const { data: projects } = await api.get("projects/");
      const items = Array.isArray(projects) ? projects : (projects?.results || projects?.items || []);
      
      // البحث في جميع المشاريع
      for (const project of items) {
        if (project.id === projectId) continue; // تخطي المشروع الحالي
        
        try {
          const { data: licenseRes } = await api.get(`projects/${project.id}/license/`);
          const licenseData = Array.isArray(licenseRes) ? licenseRes[0] : licenseRes;
          
          if (licenseData?.contractor_name && 
              licenseData.contractor_name.toLowerCase().trim() === contractorName.toLowerCase().trim()) {
            // البحث عن رقم التسجيل في awarding
            try {
              const { data: awardingRes } = await api.get(`projects/${project.id}/awarding/`);
              const awardingData = Array.isArray(awardingRes) ? awardingRes[0] : awardingRes;
              
              if (awardingData?.contractor_registration_number) {
                setContractorRegNo(awardingData.contractor_registration_number);
                return; // وجدنا الرقم، نتوقف
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Error searching for contractor registration number:", e);
    }
  };

  /* تحميل الرخصة والبحث عن أرقام التسجيل */
  useEffect(() => {
    if (!projectId || !license) return;
    
    // ✅ البحث عن رقم تسجيل الاستشاري من مشاريع أخرى
    // (فقط إذا لم يكن موجود بالفعل ولم نبحث من قبل)
    if (!hasSearchedConsultant && (license.design_consultant_name || license.supervision_consultant_name)) {
      const consultantName = license.consultant_same 
        ? license.design_consultant_name 
        : license.supervision_consultant_name;
      
      if (consultantName && (registrationNumber === "VR-" || !registrationNumber)) {
        setHasSearchedConsultant(true);
        searchConsultantRegistrationNumber(consultantName);
      }
    }
    
    // ✅ البحث عن رقم تسجيل المقاول من مشاريع أخرى
    // (فقط إذا لم يكن موجود بالفعل ولم نبحث من قبل)
    if (!hasSearchedContractor && license.contractor_name && (contractorRegNo === "VR-" || !contractorRegNo)) {
      setHasSearchedContractor(true);
      searchContractorRegistrationNumber(license.contractor_name);
    }
  }, [license, registrationNumber, contractorRegNo, hasSearchedConsultant, hasSearchedContractor, projectId]);
  
  /* تحميل الرخصة */
  useEffect(() => {
    if (!projectId) return;
    api.get(`projects/${projectId}/license/`).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setLicense(res.data[0]);
      }
    }).catch(() => {});
  }, [projectId]);

  /* تحميل بيانات مخطط الأرض + إعادة التحميل عند تحديث الملاك */
  const fetchSiteplan = useCallback(async () => {
    try {
      const { data } = await api.get(`projects/${projectId}/siteplan/`);
      if (Array.isArray(data) && data.length > 0) {
        setSiteplan(data[0]);
      }
    } catch (e) {}
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchSiteplan();
  }, [projectId, fetchSiteplan]);

  useEffect(() => {
    const handler = (ev) => {
      if (ev?.detail?.projectId && ev.detail.projectId !== projectId) return;
      fetchSiteplan();
    };
    window.addEventListener("siteplan-owners-updated", handler);
    return () => window.removeEventListener("siteplan-owners-updated", handler);
  }, [projectId, fetchSiteplan]);

  /* تحميل بيانات أمر الترسية إن وجدت */
  useEffect(() => {
    if (!projectId) return;
    api.get(`projects/${projectId}/awarding/`).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        const data = res.data[0];
        setExistingId(data.id);
        setAwardDate(data.award_date || "");
        // ✅ إذا كان هناك رقم تسجيل محفوظ، نستخدمه
        if (data.consultant_registration_number) {
          setRegistrationNumber(data.consultant_registration_number);
          setHasSearchedConsultant(true); // لا نبحث مرة أخرى
        } else {
          setRegistrationNumber("VR-");
        }
        setProjectNumber(data.project_number || "");
        // ✅ إذا كان هناك رقم تسجيل محفوظ، نستخدمه
        if (data.contractor_registration_number) {
          setContractorRegNo(data.contractor_registration_number);
          setHasSearchedContractor(true); // لا نبحث مرة أخرى
        } else {
          setContractorRegNo("VR-");
        }
        if (data.awarding_file) {
          setAwardingFileUrl(data.awarding_file);
          setAwardingFileName(extractFileNameFromUrl(data.awarding_file));
        }
      } else {
        // ✅ إذا لم يكن هناك awarding، نضع القيم الافتراضية
        setRegistrationNumber("VR-");
        setContractorRegNo("VR-");
      }
    }).catch(() => {
      // ✅ في حالة الخطأ، نضع القيم الافتراضية
      setRegistrationNumber("VR-");
      setContractorRegNo("VR-");
    });
  }, [projectId]);

  // ✅ مزامنة مع isView من الخارج
  useEffect(() => {
    if (isView !== undefined) {
      setLocalIsView(isView === true);
    }
  }, [isView]);

  if (!license || !siteplan)
    return <div className="card mt-12">جاري تحميل البيانات...</div>;

  /* استخراج اسم المالك */
  const owners = siteplan.owners || [];
  let ownerFullName = "";

  if (owners.length > 0) {
    const authorized = owners.find((o) => o.is_authorized);
    const ownerToUse = authorized || owners[0];
    ownerFullName = ownerToUse.owner_name_ar || ownerToUse.owner_name_en || "";
    if (!authorized && owners.length > 1) ownerFullName += ` وشركاؤه`;
  }

  /* تحديد الاستشاري */
  const consultantToShow = license.consultant_same
    ? license.design_consultant_name
    : license.supervision_consultant_name;

  const save = async () => {
    if (!projectId) {
      setErrorMsg("يرجى فتح مشروع محدد للحفظ");
      return;
    }

    try {
      const payload = new FormData();
      if (awardDate) payload.append("award_date", awardDate);
      payload.append("consultant_registration_number", registrationNumber);
      payload.append("project_number", projectNumber);
      payload.append("contractor_registration_number", contractorRegNo);
      if (awardingFile) payload.append("awarding_file", awardingFile);

      let savedData;
      if (existingId) {
        const response = await api.patch(`projects/${projectId}/awarding/${existingId}/`, payload);
        savedData = response.data;
      } else {
        const { data: created } = await api.post(`projects/${projectId}/awarding/`, payload);
        if (created?.id) setExistingId(created.id);
        savedData = created;
      }
      
      // ✅ تحديث URLs للملف بعد الحفظ الناجح
      if (savedData?.awarding_file) {
        setAwardingFileUrl(savedData.awarding_file);
        setAwardingFileName(extractFileNameFromUrl(savedData.awarding_file));
      }
      
      setErrorMsg("");
      
      // ✅ إرسال حدث لتحديث بيانات المشروع في WizardPage
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("awarding-updated", { detail: { projectId } }));
      }
      
      // ✅ أمر الترسية هو الخطوة الأخيرة - دائماً ننتقل إلى قائمة المشاريع بعد الحفظ
      setLocalIsView(true);
      navigate("/projects");
    } catch (err) {
      const serverData = err?.response?.data;
      const fallback = err?.message || (serverData ? JSON.stringify(serverData, null, 2) : "فشل الحفظ");
      setErrorMsg(fallback);
    }
  };

  return (
    <WizardShell title="أمر الترسية وعقد بنك الخليج">
      <Dialog
        open={!!errorMsg}
        title="خطأ"
        desc={<pre className="pre-wrap m-0">{errorMsg}</pre>}
        confirmLabel="موافق"
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />

      {localIsView && (
        <div className={`row ${isAR ? "justify-start" : "justify-end"} mb-12`}>
          <Button variant="secondary" onClick={() => setLocalIsView(false)}>
            تعديل
          </Button>
        </div>
      )}

      {/* ===================================== */}
      {/* 🔵 القسم الأول — تاريخ أمر الترسية + الاستشاري + رقم تسجيل الاستشاري */}
      {/* ===================================== */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">1) المعلومات الأساسية</h4>
        <div className="form-grid cols-3" style={{ gap: "var(--space-4)" }}>
          {/* تاريخ أمر الترسية */}
          <Field label="تاريخ أمر الترسية">
            {localIsView ? (
              <input
                className="input"
                type="text"
                value={awardDate ? formatDate(awardDate, i18n.language) : ""}
                readOnly
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  cursor: "default"
                }}
                dir="rtl"
              />
            ) : (
              <DateInput
                className="input"
                value={awardDate}
                onChange={(value) => setAwardDate(value)}
              />
            )}
          </Field>

          {/* الاستشاري */}
          <Field label="الاستشاري (من الرخصة)">
            <input
              className="input"
              type="text"
              value={consultantToShow || ""}
              readOnly
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                cursor: "default"
              }}
              dir="rtl"
            />
          </Field>

          {/* رقم تسجيل الاستشاري */}
          <Field label="رقم تسجيل الاستشاري">
            {localIsView ? (
              <input
                className="input"
                type="text"
                value={registrationNumber || ""}
                readOnly
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  cursor: "default"
                }}
                dir="rtl"
              />
            ) : (
              <input
                className="input"
                value={registrationNumber}
                onChange={(e) => {
                  let v = e.target.value.replace(/^VR-/i, "").replace(/[^0-9]/g, "");
                  setRegistrationNumber("VR-" + v);
                }}
                dir="rtl"
              />
            )}
          </Field>
        </div>
      </div>

      {/* ===================================== */}
      {/* 🔵 القسم الثاني — اسم المالك + رقم المشروع */}
      {/* ===================================== */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">2) معلومات المشروع والمالك</h4>
        <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
          {/* اسم المالك */}
          <Field label="اسم المالك (من مخطط الأرض)">
            <input
              className="input"
              type="text"
              value={ownerFullName || ""}
              readOnly
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                cursor: "default"
              }}
              dir="rtl"
            />
          </Field>

          {/* رقم المشروع */}
          <Field label="رقم المشروع">
            {localIsView ? (
              <input
                className="input"
                type="text"
                value={projectNumber || ""}
                readOnly
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  cursor: "default"
                }}
                dir="rtl"
              />
            ) : (
              <input
                className="input"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                dir="rtl"
              />
            )}
          </Field>
        </div>
      </div>

      {/* ===================================== */}
      {/* 🔵 القسم الثالث — اسم المقاول + رقم تسجيله */}
      {/* ===================================== */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">3) معلومات المقاول</h4>
        <div className="form-grid cols-2" style={{ gap: "var(--space-4)" }}>
          {/* المقاول */}
          <Field label="اسم المقاول (من الرخصة)">
            <input
              className="input"
              type="text"
              value={license.contractor_name || ""}
              readOnly
              style={{
                background: "var(--surface-2)",
                color: "var(--text)",
                cursor: "default"
              }}
              dir="rtl"
            />
          </Field>

          {/* رقم تسجيل المقاول */}
          <Field label="رقم تسجيل المقاول">
            {localIsView ? (
              <input
                className="input"
                type="text"
                value={contractorRegNo || ""}
                readOnly
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  cursor: "default"
                }}
                dir="rtl"
              />
            ) : (
              <input
                className="input"
                value={contractorRegNo}
                onChange={handleContractorRegChange}
                dir="rtl"
              />
            )}
          </Field>
        </div>
      </div>

      {/* ===================================== */}
      {/* 🔵 القسم الرابع — إرفاق أمر الترسية */}
      {/* ===================================== */}
      <div className="wizard-section">
        <h4 className="wizard-section-title">4) إرفاق أمر الترسية</h4>
        <div className="form-grid cols-1" style={{ gap: "var(--space-4)" }}>
          <Field label="إرفاق أمر الترسية">
            {localIsView ? (
              awardingFileUrl ? (
                <FileAttachmentView
                  fileUrl={awardingFileUrl}
                  fileName={awardingFileName || extractFileNameFromUrl(awardingFileUrl)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/awarding/`}
                />
              ) : (
                <div className="card text-center prj-muted p-20">لا يوجد ملف</div>
              )
            ) : (
              <FileUpload
                value={awardingFile}
                onChange={(file) => setAwardingFile(file)}
                accept=".pdf"
                maxSizeMB={10}
                showPreview={true}
                existingFileUrl={awardingFileUrl}
                existingFileName={awardingFileName}
                onRemoveExisting={() => {
                  setAwardingFileUrl("");
                  setAwardingFileName("");
                  setAwardingFile(null);
                }}
                fileType="awarding_file"
                fileIndex={0}
              />
            )}
          </Field>
        </div>
      </div>

      {!localIsView && (
        <StepActions
          onPrev={onPrev}
          onNext={save}
          nextLabel="إنهاء"
          nextClassName="primary"
        />
      )}
    </WizardShell>
  );
}
