import { useMemo, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import InfoTip from "../components/InfoTip";
import Dialog from "../../../../components/common/Dialog";
import Chips from "../../../../components/ui/Chips";
import Button from "../../../../components/common/Button";
import Field from "../../../../components/forms/Field";
import { api } from "../../../../services/api";
import { PROJECT_TYPES, VILLA_CATEGORIES, CONTRACT_TYPES } from "../../../../utils/constants";
import { formatInternalCode, isLastDigitOdd, toDigits } from "../../../../utils/internalCodeFormatter";
import { formatServerErrors } from "../../../../utils/helpers";

// قائمة تصنيفات العقد
const CONTRACT_CLASSIFICATION = [
  {
    value: "housing_loan_program",
    labelKey: "contract.classification.housing_loan_program.label",
    descKey: "contract.classification.housing_loan_program.desc",
  },
  {
    value: "private_funding",
    labelKey: "contract.classification.private_funding.label",
    descKey: "contract.classification.private_funding.desc",
  },
];

export default function ProjectSetupStep({
  value,
  onChange,
  onNext,
  onPrev,
  isView,
  onSaved, // اختياري: يُستدعى بعد الحفظ الناجح (مثلاً لإعادة تحميل المشروع في صفحة العرض)
  isNewProject = false, // ✅ مشروع جديد بدون projectId
  isSuperAdmin = false, // ✅ هل المستخدم سوبر يوزر
  autoFinalApprove = false, // ✅ خيار الاعتماد المباشر
  setAutoFinalApprove, // ✅ دالة تحديث خيار الاعتماد المباشر
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isAR = lang === "ar";
  const { projectId } = useParams();

  const { projectType, villaCategory, contractType, internalCode, contractClassification } = value || {};
  const set = (k, v) => onChange({ ...value, [k]: v });
  
  // ✅ تحميل contract_classification من Contract
  // ملاحظة: في وضع العرض (isView=true)، البيانات تُحمّل من ViewSetup، لذلك نتخطى التحميل هنا
  useEffect(() => {
    if (!projectId || isView) return; // ✅ لا نحمل في وضع العرض
    
    let mounted = true;
    
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/contract/`);
        if (!mounted) return;
        
        if (Array.isArray(data) && data.length > 0 && data[0].contract_classification) {
          const classification = data[0].contract_classification;
          // ✅ تحديث فقط إذا كانت القيمة مختلفة أو غير موجودة
          const currentClassification = value?.contractClassification || "";
          if (classification !== currentClassification) {
            onChange({ ...value, contractClassification: classification });
          }
        } else {
          // ✅ إذا لم يكن هناك contract أو classification، نزيل القيمة فقط إذا كانت موجودة
          if (value?.contractClassification) {
            onChange({ ...value, contractClassification: "" });
          }
        }
      } catch (e) {
        // إذا لم يكن هناك contract بعد، لا بأس
        // لكن نزيل contractClassification من state فقط إذا كان موجوداً ولم يكن هناك contract
        // لا نزيله إذا كان موجوداً في value (قد يكون تم تعيينه من مكان آخر)
        if (value?.contractClassification && e?.response?.status === 404) {
          // فقط إذا كان الخطأ 404 (لا يوجد contract)، نزيل القيمة
          onChange({ ...value, contractClassification: "" });
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isView]);

  const baseSelected =
    !!projectType && (projectType !== "villa" || !!villaCategory) && !!contractType;

  const allowSitePlanFlow =
    projectType === "villa" &&
    (villaCategory === "residential" || villaCategory === "commercial") &&
    contractType === "new";

  const canProceed = baseSelected && allowSitePlanFlow;
  const hasNextStep = typeof onNext === "function";

  const [errorMsg, setErrorMsg] = useState("");
  const [internalCodeError, setInternalCodeError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const internalCodeInputRef = useRef(null);

  const [viewMode, setViewMode] = useState(() => {
    if (isView !== undefined) return isView === true;
    return false;
  });

  useEffect(() => {
    if (isView !== undefined) {
      setViewMode(isView === true);
    }
  }, [isView]);

  const isReadOnly = viewMode === true;

  // ✅ تحميل البيانات من الـ backend عند فتح الصفحة
  useEffect(() => {
    if (!projectId) return;
    
    let mounted = true;
    
    (async () => {
      try {
        const { data } = await api.get(`projects/${projectId}/`);
        if (!mounted) return;
        
        // ✅ تحديث الحالة بالبيانات من الـ backend فقط إذا كانت مختلفة
        // ✅ الحفاظ على contractClassification الموجود في value
        const newData = {
          projectType: data?.project_type || "",
          villaCategory: data?.villa_category || "",
          contractType: data?.contract_type || "",
          internalCode: data?.internal_code || "",
          contractClassification: value?.contractClassification || "",
        };
        
        // ✅ تحديث فقط إذا كانت البيانات مختلفة
        if (
          newData.projectType !== (value?.projectType || "") ||
          newData.villaCategory !== (value?.villaCategory || "") ||
          newData.contractType !== (value?.contractType || "") ||
          newData.internalCode !== (value?.internalCode || "")
        ) {
          onChange(newData);
        }
      } catch (e) {
        console.error("Error loading project data:", e);
      }
    })();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  
  // ✅ معالج بسيط للكود الداخلي: يحفظ الأرقام فقط، و M تضاف في العرض فقط
  const handleInternalCodeChange = (e) => {
    const raw = e.target.value || "";
    const digits = toDigits(raw);
    // نحفظ في الـ state الأرقام فقط؛ التنسيق (M + الأرقام) يتم عند العرض
    set("internalCode", digits);
    // ✅ مسح رسالة الخطأ عند تغيير الكود
    setInternalCodeError("");
  };

  // ✅ التحقق من الكود الداخلي عند blur (خروج المستخدم من الحقل)
  const handleInternalCodeBlur = async () => {
    const formatted = formatInternalCode(internalCode);
    if (!formatted || formatted === "M") {
      setInternalCodeError("");
      return;
    }

    // التحقق من التنسيق
    if (!isLastDigitOdd(formatted)) {
      setInternalCodeError(t("internal_code_last_digit_error"));
      return;
    }

    // ✅ التحقق من التكرار فقط إذا كان مشروع جديد
    if (isNewProject && !projectId) {
      setValidatingCode(true);
      setInternalCodeError("");
      
      try {
        // ✅ البحث عن مشروع بنفس الكود
        const { data } = await api.get(`projects/?internal_code=${encodeURIComponent(formatted)}`);
        const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
        
        if (items && items.length > 0) {
          // ✅ الكود مستخدم بالفعل
          const errorMsg = t("internal_code_already_exists", { code: formatted }) || `الكود الداخلي '${formatted}' مستخدم بالفعل في مشروع آخر. يرجى استخدام كود مختلف.`;
          setInternalCodeError(errorMsg);
        } else {
          // ✅ الكود متاح
          setInternalCodeError("");
        }
      } catch (e) {
        // في حالة الخطأ، لا نعرض رسالة خطأ (قد يكون خطأ في الشبكة)
        console.error("Error validating internal code:", e);
      } finally {
        setValidatingCode(false);
      }
    }
  };

  const labels = {
    pageTitle: t("wizard_step_setup"),
    categoryTitle: t("setup_project_category_title"),
    subcatsTitle: t("setup_subcategories_title"),
    contractTypeTitle: t("setup_contract_type_title"),
    contractClassificationTitle: t("contract.sections.classification"),
    internalCodeTitle: t("internal_project_code"),
    internalCodeHelp: t("internal_code_help"),
    internalCodePlaceholder: t("internal_code_placeholder"),
    readyNote: t("setup_ready_note"),
    helpSelectAll: t("setup_help_select_all"),
    helpPathOnly: t("setup_help_path_only"),
    edit: t("edit"),
  };
  
  const contractClassificationOptions = useMemo(
    () =>
      CONTRACT_CLASSIFICATION.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        desc: t(item.descKey),
      })),
    [t]
  );

  const chipsProjectTypes = useMemo(() => PROJECT_TYPES[isAR ? "ar" : "en"], [isAR]);
  const villaSubcategories = useMemo(() => VILLA_CATEGORIES[isAR ? "ar" : "en"], [isAR]);
  const contractTypes = useMemo(() => CONTRACT_TYPES[isAR ? "ar" : "en"], [isAR]);

  const labelMap = useMemo(() => {
    const m = (pairs) =>
      pairs.reduce((acc, [v, label]) => {
        acc[v] = label;
        return acc;
      }, {});
    return {
      projectType: m(chipsProjectTypes),
      villaCategory: m(villaSubcategories),
      contractType: m(contractTypes),
    };
  }, [chipsProjectTypes, villaSubcategories, contractTypes]);

  const handleSaveAndNext = async () => {
    // ✅ التحقق من الكود الداخلي
    const formatted = formatInternalCode(internalCode);
    
    // التحقق من التنسيق
    if (formatted && formatted !== "M" && !isLastDigitOdd(formatted)) {
      setInternalCodeError(t("internal_code_last_digit_error"));
      return;
    }

    // ✅ إذا كان مشروع جديد، نتحقق من الكود قبل الانتقال
    if (isNewProject) {
      // ✅ التحقق من التكرار إذا كان الكود موجوداً
      if (formatted && formatted !== "M") {
        setValidatingCode(true);
        try {
          const { data } = await api.get(`projects/?internal_code=${encodeURIComponent(formatted)}`);
          const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
          
          if (items && items.length > 0) {
            // ✅ الكود مستخدم بالفعل - نعرض الخطأ ولا ننتقل
            const errorMsg = t("internal_code_already_exists", { code: formatted }) || `الكود الداخلي '${formatted}' مستخدم بالفعل في مشروع آخر. يرجى استخدام كود مختلف.`;
            setInternalCodeError(errorMsg);
            setValidatingCode(false);
            return;
          }
        } catch (e) {
          // في حالة الخطأ، نعرض رسالة خطأ عامة
          console.error("Error validating internal code:", e);
          setErrorMsg(t("error_validating_code") || "حدث خطأ أثناء التحقق من الكود الداخلي. يرجى المحاولة مرة أخرى.");
          setValidatingCode(false);
          return;
        } finally {
          setValidatingCode(false);
        }
      }

      // ✅ تحديث setup مع الكود الداخلي و contractClassification (إذا كان موجوداً)
      onChange({
        ...value,
        internalCode: formatted,
        contractClassification: contractClassification || value?.contractClassification || "",
      });
      
      // ✅ التأكد من عدم وجود أخطاء قبل الانتقال
      if (!internalCodeError && onNext && canProceed) {
        onNext();
      }
      return;
    }

    // ✅ إذا كان مشروع موجود، نحفظ في DB
    if (!projectId) {
      setErrorMsg(t("open_specific_project_to_save"));
      return;
    }

    try {
      setErrorMsg("");
      const payload = {
        project_type: projectType || null,
        villa_category: projectType === "villa" ? (villaCategory || null) : null,
        contract_type: contractType || null,
        internal_code: formatted,
      };

      await api.patch(`projects/${projectId}/`, payload);
      
          // ✅ حفظ contract_classification في Contract
      if (contractClassification) {
        try {
          // محاولة الحصول على contract موجود
          const contractRes = await api.get(`projects/${projectId}/contract/`);
          if (Array.isArray(contractRes.data) && contractRes.data.length > 0) {
            // تحديث contract موجود
            const contractId = contractRes.data[0].id;
            console.log("🔍 Attempting to update contract:", {
              projectId,
              contractId,
              contract_classification: contractClassification,
            });
            const updateRes = await api.patch(`projects/${projectId}/contract/${contractId}/`, {
              contract_classification: contractClassification,
            });
            console.log("✅ contract_classification updated in existing contract:", contractClassification, updateRes.data);
          } else {
            // إنشاء contract جديد
            console.log("🔍 Attempting to create new contract with classification:", contractClassification);
            const createRes = await api.post(`projects/${projectId}/contract/`, {
              contract_classification: contractClassification,
            });
            console.log("✅ contract_classification saved in new contract:", contractClassification, createRes.data);
          }
          // ✅ تحديث contractClassification في value (setup) مباشرة بعد الحفظ الناجح
          onChange({ ...value, contractClassification });
        } catch (e) {
          console.error("❌ Error saving contract classification:", e);
          console.error("❌ Error details:", {
            message: e?.message,
            status: e?.response?.status,
            data: e?.response?.data,
            config: e?.config,
          });
          // لا نوقف العملية إذا فشل حفظ contract_classification
        }
      } else {
        console.warn("⚠️ contractClassification is empty, skipping save");
      }

      // في حالة صفحة العرض: نسمح للأب بإعادة تحميل بيانات المشروع من الـ backend
      if (typeof onSaved === "function") {
        onSaved();
      }

      if (onNext && canProceed) {
        onNext();
      } else {
        // لا يوجد خطوة تالية أو لا يمكن المتابعة → العودة لوضع العرض
        setViewMode(true);
      }
    } catch (e) {
      // ✅ معالجة أفضل للأخطاء، خاصة خطأ تكرار الكود الداخلي
      const formatted = formatServerErrors(e?.response?.data);
      const msg = formatted || e?.message || t("save_project_error");
      setErrorMsg(msg);
    }
  };

  return (
    <WizardShell title={labels.pageTitle}>
      <Dialog
        open={!!errorMsg}
        title={t("error")}
        desc={<pre className="pre-wrap" style={{ margin: 0 }}>{errorMsg}</pre>}
        confirmLabel={t("ok")}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />

      {/* زر تعديل أعلى الصفحة مثل SitePlanStep */}
      {isReadOnly && (
        <div className={`row ${isAR ? "justify-start" : "justify-end"} mb-12`}>
          <Button variant="secondary" onClick={() => setViewMode(false)}>
            {labels.edit}
          </Button>
        </div>
      )}

      {/* Grid container لكل الأقسام - كل اثنين في سطر */}
      <div 
        className="project-setup-grid" 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--space-4)",
          alignItems: "start"
        }}
      >
        {/* الكود الداخلي */}
        <div className="wizard-section">
          <h4 className="wizard-section-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {labels.internalCodeTitle}
            <InfoTip inline align="start" text={labels.internalCodeHelp} />
          </h4>
          {isReadOnly ? (
          <div className="card" role="group" aria-label={labels.internalCodeTitle}>
            <div className="p-8 mono">
              {(internalCode && formatInternalCode(internalCode)) || t("empty_value")}
            </div>
          </div>
        ) : (
          <div className="card" role="group" aria-label={labels.internalCodeTitle}>
            <div className="p-8">
              <Field>
                <input
                  ref={internalCodeInputRef}
                  type="text"
                  inputMode="numeric"
                  className={`input w-100 mono ${internalCodeError ? "input-error" : ""}`}
                  placeholder={labels.internalCodePlaceholder}
                  value={formatInternalCode(internalCode || "")}
                  onChange={handleInternalCodeChange}
                  onBlur={handleInternalCodeBlur}
                  onKeyDown={(e) => {
                    // ✅ منع حذف "M" فقط في حالة واحدة: إذا كانت القيمة "M" فقط (لا توجد أرقام)
                    if (e.key === "Backspace" || e.key === "Delete") {
                      const input = e.target;
                      const cursorPos = input.selectionStart;
                      const value = input.value;
                      
                      // ✅ منع حذف "M" فقط إذا كانت القيمة "M" فقط (لا توجد أرقام بعدها)
                      if (value === "M" && cursorPos <= 1) {
                        e.preventDefault();
                        return;
                      }
                      
                      // ✅ السماح بجميع عمليات الحذف الأخرى (حذف الأرقام، إلخ)
                    }
                  }}
                  aria-describedby="internal-code-help internal-code-error"
                  maxLength={40}
                  disabled={validatingCode}
                />
              </Field>
              <div id="internal-code-help" className="muted mt-4">
                {labels.internalCodeHelp}
              </div>
              {validatingCode && (
                <div className="muted mt-4" style={{ fontSize: "12px" }}>
                  {t("validating_code") || "جارٍ التحقق من الكود..."}
                </div>
              )}
              {internalCodeError && (
                <div id="internal-code-error" className="error-message mt-4" style={{ color: "var(--error-500)", fontSize: "13px", fontWeight: 500 }}>
                  {internalCodeError}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* تصنيف المشروع */}
        <div className="wizard-section">
          <div className="card" role="group" aria-label={labels.categoryTitle}>
            <div className="p-8 row row--align-center row--justify-between row--gap-8">
              <h4 className="wizard-section-title" style={{ margin: 0 }}>{labels.categoryTitle}</h4>
              <InfoTip
                inline
                wide
                align="start"
                text={
                  canProceed
                    ? labels.readyNote
                    : baseSelected
                    ? labels.helpPathOnly
                    : labels.helpSelectAll
                }
                title={t("info")}
              />
            </div>

            {isReadOnly ? (
              <div className="p-12">{labelMap.projectType[projectType] || t("empty_value")}</div>
            ) : (
              <div className="p-12">
                <div className="chips" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {chipsProjectTypes.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`chip ${projectType === val ? "active" : ""}`}
                      onClick={() => set("projectType", val)}
                      title={label}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* تصنيف الفيلا - يظهر فقط إذا كان projectType === "villa" */}
        {projectType === "villa" && (
          <div className="wizard-section">
            <h4 className="wizard-section-title inline-flex ai-center gap-6">
              {labels.subcatsTitle}
              <InfoTip
                inline
                align="start"
                text={t("pick_villa_type")}
              />
            </h4>
            {isReadOnly ? (
              <div className="card" role="group" aria-label={labels.subcatsTitle}>
                <div className="p-8">{labelMap.villaCategory[villaCategory] || t("empty_value")}</div>
              </div>
            ) : (
              <Chips
                options={villaSubcategories}
                value={villaCategory}
                onChange={(v) => set("villaCategory", v)}
              />
            )}
          </div>
        )}

        {/* نوع العقد */}
        <div className="wizard-section">
          <h4 className="wizard-section-title inline-flex ai-center gap-6">
            {labels.contractTypeTitle}
            <InfoTip
              inline
              align="start"
              text={t("contract_type_info")}
            />
          </h4>
          {isReadOnly ? (
            <div className="card" role="group" aria-label={labels.contractTypeTitle}>
              <div className="p-8">{labelMap.contractType[contractType] || t("empty_value")}</div>
            </div>
          ) : (
            <Chips
              options={contractTypes}
              value={contractType}
              onChange={(v) => set("contractType", v)}
            />
          )}
        </div>

        {/* تصنيف العقد - مباشرة تحت نوع العقد */}
        {(viewMode || contractClassification || allowSitePlanFlow) && (
          <div className="wizard-section">
            <h4 className="wizard-section-title inline-flex ai-center gap-6">
              {labels.contractClassificationTitle}
              {contractClassification && (
                <InfoTip
                  inline
                  align="start"
                  text={
                    contractClassification === "housing_loan_program"
                      ? t("contract.classification.housing_loan_program.desc")
                      : t("contract.classification.private_funding.desc")
                  }
                />
              )}
            </h4>

            {isReadOnly ? (
              <div className="card" role="group" aria-label={labels.contractClassificationTitle}>
                <div className="p-8">
                  {contractClassificationOptions.find((m) => m.value === contractClassification)?.label ||
                    t("empty_value")}
                </div>
              </div>
            ) : (
              <div className="card" role="group" aria-label={labels.contractClassificationTitle}>
                <div className="p-12">
                  <div 
                    className="chips contract-classification-grid" 
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "12px"
                    }}
                  >
                    {contractClassificationOptions.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`chip ${contractClassification === m.value ? "active" : ""}`}
                        onClick={() => set("contractClassification", m.value)}
                        title={m.desc}
                        disabled={!allowSitePlanFlow}
                        style={{
                          width: "100%",
                          minWidth: 0,
                          textAlign: "center",
                          padding: "12px 16px",
                          fontSize: "14px",
                          fontWeight: 500,
                          whiteSpace: "normal",
                          wordBreak: "break-word"
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ خيار الاعتماد المباشر للسوبر يوزر (فقط للمشروع الجديد) */}
      {!isReadOnly && isNewProject && isSuperAdmin && (
        <div style={{ 
          marginTop: "var(--space-4)", 
          padding: "var(--space-4)", 
          background: "var(--surface-2)", 
          borderRadius: "8px",
          border: "1px solid var(--border)"
        }}>
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500
          }}>
            <input
              type="checkbox"
              checked={autoFinalApprove}
              onChange={(e) => setAutoFinalApprove?.(e.target.checked)}
              style={{ 
                width: "18px", 
                height: "18px", 
                cursor: "pointer" 
              }}
            />
            <span>{t("auto_final_approve_on_create") || "اعتماد المشروع نهائياً مباشرة عند الإنشاء (تخطي انتظار الموافقة)"}</span>
          </label>
          {autoFinalApprove && (
            <div style={{ 
              marginTop: "8px", 
              fontSize: "12px", 
              color: "var(--text-secondary)",
              paddingRight: "30px"
            }}>
              {t("auto_final_approve_note") || "سيتم اعتماد المشروع نهائياً مباشرة بعد الإنشاء دون الحاجة لإرساله للموافقة أو انتظار المدير."}
            </div>
          )}
        </div>
      )}

      {!isReadOnly && (
        <StepActions
          onPrev={onPrev}
          onNext={handleSaveAndNext}
          disableNext={!baseSelected || !!internalCodeError || validatingCode}
          nextClassName={baseSelected && !internalCodeError && !validatingCode ? "pulse" : ""}
          nextLabel={hasNextStep ? t("save_next_arrow") : t("save")}
        />
      )}
    </WizardShell>
  );
}
