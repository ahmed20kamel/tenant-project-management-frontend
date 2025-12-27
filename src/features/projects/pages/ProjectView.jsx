import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import PageLayout from "../../../components/layout/PageLayout";
import DateInput from "../../../components/fields/DateInput";
import useProjectData from "../../../hooks/useProjectData";
import useProjectPermissions from "../../../hooks/useProjectPermissions";
import { useAuth } from "../../../contexts/AuthContext";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { getProjectTypeLabel, getVillaCategoryLabel, getContractTypeLabel } from "../../../utils/projectLabels";
import { formatInternalCode } from "../../../utils/internalCodeFormatter";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/projectStatus";
import { handleFileClick } from "../../../utils/fileHelpers";
import ContractExtension from "../wizard/components/ContractExtension";

export default function ProjectView() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { user } = useAuth();
  const { project, siteplan, license, contract, awarding, startOrder, payments, variations, invoices, loading, reload } = useProjectData(projectId);
  const { permissions: projectPermissions, loading: permissionsLoading } = useProjectPermissions(projectId);
  
  // تحديد نوع المستخدم
  const isManager = user?.role?.name === 'Manager';
  const isSuperAdmin = user?.is_superuser || user?.role?.name === 'company_super_admin';
  

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [finalApproveDialogOpen, setFinalApproveDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    date: "",
    description: "",
    payer: "owner",
    payment_method: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletePaymentConfirmOpen, setDeletePaymentConfirmOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  
  // ✅ قراءة tab من query parameter
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");
  
  // ✅ تحديث activeTab عند تغيير query parameter
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      // إزالة tab من URL بعد قراءته
      setSearchParams({}, { replace: true });
    }
  }, [tabFromUrl, setSearchParams]);
  const [startOrderDialogOpen, setStartOrderDialogOpen] = useState(false);
  const [savingStartOrder, setSavingStartOrder] = useState(false);
  const [startOrderFormData, setStartOrderFormData] = useState({
    start_order_date: "",
    start_order_notes: "",
    start_order_file: null,
  });
  const [extensionsFormData, setExtensionsFormData] = useState([]);
  const [savingExtensions, setSavingExtensions] = useState(false);
  const [editingExtensions, setEditingExtensions] = useState(false); // ✅ هل نحن في وضعية التعديل
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState(null); // null = add mode, variation object = edit mode
  const [savingVariation, setSavingVariation] = useState(false);
  const [variationFormData, setVariationFormData] = useState({
    variation_number: "",
    description: "",
    final_amount: "0.00",
    consultant_fees_percentage: "0.00",
    consultant_fees: "0.00",
    contractor_engineer_fees: "0.00",
    total_amount: "0.00",
    discount: "0.00",
    net_amount: "0.00",
    vat: "0.00",
    net_amount_with_vat: "0.00",
    variation_invoice_file: null,
  });
  const [existingVariationInvoiceFile, setExistingVariationInvoiceFile] = useState(null);

  // ✅ حساب الحقول التلقائية للـ Variation (فقط عندما يكون Dialog مفتوح)
  useEffect(() => {
    if (!variationDialogOpen) return; // ✅ لا نحسب إلا عندما يكون Dialog مفتوح
    
    const final = parseFloat(variationFormData.final_amount) || 0;
    const consultantPercentage = parseFloat(variationFormData.consultant_fees_percentage) || 0;
    const contractorEngineer = parseFloat(variationFormData.contractor_engineer_fees) || 0;
    const discount = parseFloat(variationFormData.discount) || 0;
    const vat = parseFloat(variationFormData.vat) || 0;
    
    const consultant = final * (consultantPercentage / 100);
    const total = final + consultant + contractorEngineer;
    const net = total - discount;
    const netWithVat = net + vat;
    
    const newConsultantFees = consultant.toFixed(2);
    const newTotalAmount = total.toFixed(2);
    const newNetAmount = net.toFixed(2);
    const newNetWithVat = netWithVat.toFixed(2);
    
    // ✅ فقط نحدث إذا كانت القيم مختلفة لتجنب infinite loop
    if (
      variationFormData.consultant_fees !== newConsultantFees ||
      variationFormData.total_amount !== newTotalAmount ||
      variationFormData.net_amount !== newNetAmount ||
      variationFormData.net_amount_with_vat !== newNetWithVat
    ) {
      setVariationFormData(prev => ({
        ...prev,
        consultant_fees: newConsultantFees,
        total_amount: newTotalAmount,
        net_amount: newNetAmount,
        net_amount_with_vat: newNetWithVat,
      }));
    }
  }, [variationDialogOpen, variationFormData.final_amount, variationFormData.consultant_fees_percentage, variationFormData.contractor_engineer_fees, variationFormData.discount, variationFormData.vat]);

  const hasSiteplan = !!siteplan;
  const hasLicense = !!license;
  const hasContract = !!contract;
  const hasAwarding = !!awarding;
  const hasStartOrder = !!startOrder;
  const isHousingLoan = contract?.contract_classification === "housing_loan_program";
  const contractClassificationLabel =
    contract?.contract_classification === "housing_loan_program"
      ? t("contract.classification.housing_loan_program.label")
      : contract?.contract_classification === "private_funding"
      ? t("contract.classification.private_funding.label")
      : t("empty_value");

  const titleText = project?.display_name || project?.name || t("wizard_project_prefix") + ` #${projectId}`;
  const projectTypeLabel = getProjectTypeLabel(project?.project_type, i18n.language);
  const villaCategoryLabel = project?.villa_category
    ? getVillaCategoryLabel(project.villa_category, i18n.language)
    : null;
  const contractTypeLabel = getContractTypeLabel(project?.contract_type, i18n.language);

  const onDelete = async () => {
    if (!projectId) return;
    try {
      setDeleting(true);
      await api.delete(`projects/${projectId}/`);
      setConfirmOpen(false);
      nav("/projects");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || t("delete_error");
      setErrorMsg(msg);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // دالة إرسال المشروع للموافقة (للمستخدم العادي)
  const handleSubmit = async () => {
    if (!projectId) return;
    try {
      setProcessingAction(true);
      await api.post(`projects/${projectId}/submit/`);
      setSubmitDialogOpen(false);
      setActionNotes("");
      reload(); // إعادة تحميل بيانات المشروع
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || t("error");
      setErrorMsg(msg);
      setSubmitDialogOpen(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // دالة الموافقة على المرحلة (للمدير)
  const handleApprove = async () => {
    if (!projectId) return;
    try {
      setProcessingAction(true);
      await api.post(`projects/${projectId}/approve/`, { notes: actionNotes || "" });
      setApproveDialogOpen(false);
      setActionNotes("");
      reload();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || t("error");
      setErrorMsg(msg);
      setApproveDialogOpen(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // دالة رفض المشروع (للمدير)
  const handleReject = async () => {
    if (!projectId || !actionNotes.trim()) {
      setErrorMsg(t("rejection_notes_required") || "Rejection notes are required");
      return;
    }
    try {
      setProcessingAction(true);
      await api.post(`projects/${projectId}/reject/`, { notes: actionNotes });
      setRejectDialogOpen(false);
      setActionNotes("");
      reload();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || t("error");
      setErrorMsg(msg);
      setRejectDialogOpen(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // دالة الاعتماد النهائي (لـ Super Admin)
  const handleFinalApprove = async () => {
    if (!projectId) return;
    try {
      setProcessingAction(true);
      await api.post(`projects/${projectId}/final_approve/`, { notes: actionNotes || "" });
      setFinalApproveDialogOpen(false);
      setActionNotes("");
      reload();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.detail || e?.message || t("error");
      setErrorMsg(msg);
      setFinalApproveDialogOpen(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // ✅ دالة حفظ التمديدات
  const handleSaveExtensions = async () => {
    setSavingExtensions(true);
    try {
      if (!hasStartOrder || !startOrder?.id) {
        setErrorMsg(t("start_order_required_for_extensions") || "يجب إضافة أمر مباشرة أولاً قبل إضافة التمديدات");
        return;
      }

      const formData = new FormData();
      
      // ✅ تنظيف التمديدات قبل الإرسال (إزالة الفارغة)
      // extensionsFormData يحتوي على جميع التمديدات (الموجودة المعدلة + الجديدة)
      const cleanExtensions = extensionsFormData
        .filter(ext => {
          // ✅ إزالة التمديدات الفارغة تماماً
          if (!ext || (typeof ext !== "object")) return false;
          const hasReason = ext.reason && String(ext.reason).trim() !== "";
          const hasDays = ext.days !== undefined && ext.days !== null && Number(ext.days) > 0;
          const hasMonths = ext.months !== undefined && ext.months !== null && Number(ext.months) > 0;
          const hasDate = ext.extension_date && String(ext.extension_date).trim() !== "";
          const hasApproval = ext.approval_number && String(ext.approval_number).trim() !== "";
          const hasFile = ext.file instanceof File || (ext.file_url && String(ext.file_url).trim() !== "");
          return hasReason || hasDays || hasMonths || hasDate || hasApproval || hasFile;
        })
        .map((ext, idx) => ({
          reason: String(ext.reason || "").trim(),
          days: Number(ext.days) || 0,
          months: Number(ext.months) || 0,
          extension_date: ext.extension_date ? String(ext.extension_date).trim() : null,
          approval_number: ext.approval_number ? String(ext.approval_number).trim() : null,
          file_url: ext.file_url || null,
          file_name: ext.file_name || null,
          _file: ext.file instanceof File ? ext.file : null,
        }));
      
      // ✅ تحويل التمديدات إلى الشكل النهائي (بدون _file في JSON)
      const extensionsForJson = cleanExtensions.map(ext => ({
        reason: ext.reason,
        days: ext.days,
        months: ext.months,
        extension_date: ext.extension_date,
        approval_number: ext.approval_number,
        file_url: ext.file_url,
        file_name: ext.file_name,
      }));
      
      formData.append("extensions", JSON.stringify(extensionsForJson));
      
      // ✅ إضافة ملفات التمديدات (التي لديها _file جديد)
      cleanExtensions.forEach((ext, idx) => {
        if (ext._file instanceof File) {
          formData.append(`extensions[${idx}][file]`, ext._file);
        }
      });

      await api.patch(`projects/${projectId}/start-order/${startOrder.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setEditingExtensions(false);
      setExtensionsFormData([]);
      reload();
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || t("save_error");
      setErrorMsg(errorMsg);
      console.error("Error saving extensions:", e);
    } finally {
      setSavingExtensions(false);
    }
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container">
        {/* Header Section - محسّن */}
        <div className="prj-view-header">
          <div className="prj-view-header__content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
            <h1 className="prj-view-title">{titleText}</h1>
            {project?.internal_code && (
                  <div className="prj-view-code" style={{ marginTop: "8px" }}>
                    {t("project_view_internal_code") || "الكود الداخلي"}:{" "}
                <span className="mono">
                  {formatInternalCode(project.internal_code)}
                </span>
              </div>
            )}
          </div>
              <Button as={Link} variant="secondary" to="/projects" style={{ marginRight: "12px" }}>
                {t("back_projects") || "العودة للمشاريع"}
            </Button>
            </div>
            
            {/* Status Banner - محسّن */}
            {project?.approval_status && project.approval_status !== 'final_approved' && (
              <div className="prj-status-banner" style={{
                padding: "16px 20px",
                borderRadius: "12px",
                backgroundColor: 
                  project.approval_status === 'pending' ? "rgba(245, 158, 11, 0.1)" :
                  project.approval_status === 'approved' ? "rgba(59, 130, 246, 0.1)" :
                  project.approval_status === 'draft' ? "rgba(107, 114, 128, 0.1)" :
                  "rgba(239, 68, 68, 0.1)",
                border: `2px solid ${
                  project.approval_status === 'pending' ? "#f59e0b" :
                  project.approval_status === 'approved' ? "#3b82f6" :
                  project.approval_status === 'draft' ? "#6b7280" :
                  "#ef4444"
                }`,
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginTop: "16px"
              }}>
                <span style={{ fontSize: "24px", lineHeight: 1 }}>
                  {project.approval_status === 'pending' ? "⏳" :
                   project.approval_status === 'approved' ? "✅" :
                   project.approval_status === 'draft' ? "📝" : "❌"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px", color: "var(--ink)" }}>
                    {project.approval_status === 'pending' ? (t("pending_approval_banner") || "في انتظار موافقة المدير") :
                     project.approval_status === 'approved' ? (t("pending_final_approval_banner") || "في انتظار الاعتماد النهائي") :
                     project.approval_status === 'draft' ? (t("draft_banner") || "مسودة - جاهز للإرسال للموافقة") :
                     (t("rejected_banner") || "تم الرفض")}
                  </div>
                  {project.approval_status === 'pending' && project.last_approved_by && (
                    <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                      {t("submitted_by") || "أرسله"}: {project.last_approved_by.full_name || project.last_approved_by.email}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons - منظم بشكل أفضل */}
          <div className="prj-view-header__actions" style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "12px", 
            alignItems: "flex-end",
            minWidth: "200px"
          }}>
            {/* Primary Actions */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
              {/* ✅ زر التعديل - يظهر بناءً على التبويب النشط */}
              {projectPermissions?.can_edit && (
                <>
                  {activeTab === "overview" && (
                    <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`} variant="primary" style={{ fontWeight: 600, padding: "12px 24px" }}>
                      {t("edit") || "تعديل"} - {t("project_information") || "معلومات المشروع"}
                    </Button>
                  )}
                  {activeTab === "siteplan" && (
                    <Button as={Link} to={`/projects/${projectId}/wizard?step=siteplan&mode=edit`} variant="primary" style={{ fontWeight: 600, padding: "12px 24px" }}>
                      {t("edit") || "تعديل"} - {t("site_plan") || "مخطط الأرض"}
                    </Button>
                  )}
                  {activeTab === "license" && (
                    <Button as={Link} to={`/projects/${projectId}/wizard?step=license&mode=edit`} variant="primary" style={{ fontWeight: 600, padding: "12px 24px" }}>
                      {t("edit") || "تعديل"} - {t("building_license") || "ترخيص البناء"}
                    </Button>
                  )}
                  {activeTab === "contract" && (
                    <Button as={Link} to={`/projects/${projectId}/wizard?step=contract&mode=edit`} variant="primary" style={{ fontWeight: 600, padding: "12px 24px" }}>
                      {t("edit") || "تعديل"} - {t("contract_information") || "معلومات العقد"}
                    </Button>
                  )}
                </>
              )}
              
              {/* زر الإرسال للموافقة - للمستخدم العادي فقط */}
              {!permissionsLoading && projectPermissions?.can_submit && project?.approval_status === "draft" && !isSuperAdmin && (
                <Button variant="primary" onClick={() => setSubmitDialogOpen(true)}>
                  {t("submit_for_approval") || "إرسال للموافقة"}
            </Button>
              )}
              
              {/* ✅ زر الاعتماد المباشر - لـ Super Admin (من draft أو pending إلى final_approved مباشرة) */}
              {(project?.approval_status === "draft" || project?.approval_status === "pending") && isSuperAdmin && (
                <Button variant="primary" onClick={() => setFinalApproveDialogOpen(true)}>
                  {t("final_approve") || "اعتماد نهائي"}
                </Button>
              )}
              
              {/* ✅ زر الاعتماد المباشر - للمستخدمين الآخرين الذين لديهم صلاحية (من draft إلى final_approved مباشرة) */}
              {project?.approval_status === "draft" && !isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve && (
                <Button variant="primary" onClick={() => setFinalApproveDialogOpen(true)}>
                  {t("final_approve") || "اعتماد نهائي"}
                </Button>
              )}
              
              {/* أزرار الموافقة والرفض - للمدير (فقط إذا لم يكن سوبر يوزر) */}
              {project?.approval_status === "pending" && !isSuperAdmin && (isManager || (!isManager && !permissionsLoading && projectPermissions?.can_approve)) && (
                <>
                  <Button variant="primary" onClick={() => setApproveDialogOpen(true)}>
                    {t("approve_stage") || "موافقة"}
                  </Button>
                  {(isManager || projectPermissions?.can_reject) && (
                    <Button variant="danger" onClick={() => setRejectDialogOpen(true)}>
                      {t("reject") || "رفض"}
                    </Button>
                  )}
                </>
              )}
              
              {/* زر الاعتماد النهائي - لـ Super Admin (من approved إلى final_approved) */}
              {project?.approval_status === "approved" && (isSuperAdmin || (!isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve)) && (
                <Button variant="primary" onClick={() => setFinalApproveDialogOpen(true)}>
                  {t("final_approve") || "الاعتماد النهائي"}
                </Button>
              )}
            </div>
            
            {/* Secondary Actions */}
            {projectPermissions?.can_delete && (
              <Button variant="danger" onClick={() => setConfirmOpen(true)} style={{ width: "100%" }}>
                {t("delete_project") || "حذف المشروع"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Card with Tabs */}
        <Card className="prj-main-card">
          {/* Decorative Header Image */}
          <div className="prj-main-card-header">
            <div className="prj-main-card-header-overlay"></div>
            <div className="prj-main-card-header-icon">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* بناء/فيلا بسيط */}
                <rect x="50" y="100" width="100" height="80" fill="currentColor" opacity="0.9"/>
                <polygon points="50,100 100,60 150,100" fill="currentColor" opacity="0.7"/>
                <rect x="70" y="120" width="20" height="30" fill="white" opacity="0.3"/>
                <rect x="110" y="120" width="20" height="30" fill="white" opacity="0.3"/>
                <rect x="85" y="140" width="30" height="40" fill="white" opacity="0.4"/>
                <circle cx="100" cy="80" r="5" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="prj-tabs">
            <button
              className={`prj-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              {t("overview")}
            </button>
            <button
              className={`prj-tab ${activeTab === "siteplan" ? "active" : ""}`}
              onClick={() => setActiveTab("siteplan")}
            >
              {t("site_plan")}
            </button>
            <button
              className={`prj-tab ${activeTab === "license" ? "active" : ""}`}
              onClick={() => setActiveTab("license")}
            >
              {t("building_license")}
            </button>
            <button
              className={`prj-tab ${activeTab === "contract" ? "active" : ""}`}
              onClick={() => setActiveTab("contract")}
            >
              {t("contract_information")}
            </button>
            <button
              className={`prj-tab ${activeTab === "start_order" ? "active" : ""}`}
              onClick={() => setActiveTab("start_order")}
            >
              {t("start_order") || "أمر المباشرة"}
            </button>
            {hasStartOrder && (
              <button
                className={`prj-tab ${activeTab === "extensions" ? "active" : ""}`}
                onClick={() => setActiveTab("extensions")}
              >
                {t("extensions") || "التمديدات"}
              </button>
            )}
            {isHousingLoan && (
              <button
                className={`prj-tab ${activeTab === "awarding" ? "active" : ""}`}
                onClick={() => setActiveTab("awarding")}
              >
                {t("awarding_gulf_bank_contract_info") || "أمر الترسية"}
              </button>
            )}
            <button
              className={`prj-tab ${activeTab === "financial" ? "active" : ""}`}
              onClick={() => setActiveTab("financial")}
            >
              {t("financial_summary")}
            </button>
            <button
              className={`prj-tab ${activeTab === "variations" ? "active" : ""}`}
              onClick={() => setActiveTab("variations")}
            >
              {t("variations_title") || "أوامر التغيير السعري"}
            </button>
            <button
              className={`prj-tab ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              {t("payments_title")}
            </button>
            <button
              className={`prj-tab ${activeTab === "invoices" ? "active" : ""}`}
              onClick={() => setActiveTab("invoices")}
            >
              {t("invoices_title") || "الفواتير"}
            </button>
          </div>

          {/* Tab Content */}
          <div className="prj-tab-content">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("project_information")}</h2>
                  <div className="prj-tab-actions">
                <Button as={Link} to={`/projects/${projectId}/setup/view`} variant="secondary">
                  {t("view_details")}
                </Button>
                    {projectPermissions?.can_delete && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                        {t("delete")}
            </Button>
                    )}
              </div>
        </div>
            <div className="prj-info-grid">
              {project?.internal_code && (
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("project_view_internal_code")}</div>
                  <div className="prj-info-value">
                    <span className="mono">
                      {formatInternalCode(project.internal_code)}
                    </span>
                  </div>
                </div>
              )}
              <div className="prj-info-item">
                <div className="prj-info-label">{t("project_type_label")}</div>
                <div className="prj-info-value">{projectTypeLabel || t("empty_value")}</div>
              </div>
              {project?.status && (
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("project_status")}</div>
                  <div className="prj-info-value">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: getProjectStatusColor(project.status),
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span>{getProjectStatusLabel(project.status, i18n.language)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="prj-info-item">
                <div className="prj-info-label">{t("contract.sections.classification")}</div>
                <div className="prj-info-value">{contractClassificationLabel}</div>
              </div>
            </div>
              </div>
            )}

            {/* Site Plan Tab */}
            {activeTab === "siteplan" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("site_plan")}</h2>
                  <div className="prj-tab-actions">
                <Button
                  as={Link}
                  disabled={!hasSiteplan}
                  to={hasSiteplan ? `/projects/${projectId}/siteplan/view` : "#"}
                  variant="secondary"
                  onClick={(e) => {
                    if (!hasSiteplan) e.preventDefault();
                  }}
                >
                  {t("view_details")}
                </Button>
              </div>
                </div>
            {hasSiteplan ? (
              <div className="prj-info-grid">
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("municipality_label")}</div>
                  <div className="prj-info-value">{siteplan?.municipality || t("empty_value")}</div>
                </div>
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("zone_label")}</div>
                  <div className="prj-info-value">{siteplan?.zone || t("empty_value")}</div>
                </div>
              </div>
            ) : (
              <div className="prj-empty-state">
                {t("site_plan_not_added")}
              </div>
            )}
              </div>
            )}

            {/* License Tab */}
            {activeTab === "license" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("building_license")}</h2>
                  <div className="prj-tab-actions">
                <Button
                  as={Link}
                  disabled={!hasLicense}
                  to={hasLicense ? `/projects/${projectId}/license/view` : "#"}
                  variant="secondary"
                  onClick={(e) => {
                    if (!hasLicense) e.preventDefault();
                  }}
                >
                  {t("view_details")}
                </Button>
              </div>
                </div>
            {hasLicense ? (
              <div className="prj-info-grid">
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("license_no_label")}</div>
                  <div className="prj-info-value">{license?.license_no || t("empty_value")}</div>
                </div>
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("contractor_label")}</div>
                  <div className="prj-info-value">{license?.contractor_name || t("empty_value")}</div>
                </div>
              </div>
            ) : (
              <div className="prj-empty-state">
                {t("license_not_added")}
              </div>
            )}
          </div>
            )}

            {/* Contract Tab */}
            {activeTab === "contract" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("contract_information")}</h2>
                  <div className="prj-tab-actions">
                <Button
                  as={Link}
                  disabled={!hasContract}
                  to={hasContract ? `/projects/${projectId}/contract/view` : "#"}
                  variant="secondary"
                  onClick={(e) => {
                    if (!hasContract) e.preventDefault();
                  }}
                >
                  {t("view_details")}
                </Button>
              </div>
                </div>
            {hasContract ? (
              <div className="prj-info-grid">
                <div className="prj-info-item">
                  <div className="prj-info-label">{t("contract_type_label")}</div>
                  <div className="prj-info-value">{getContractTypeLabel(contract?.contract_type, i18n.language) || t("empty_value")}</div>
                </div>
                <div className="prj-info-item prj-info-item--highlight">
                  <div className="prj-info-label">{t("total_project_value")}</div>
                  <div className="prj-info-value prj-info-value--money">
                    {formatMoney(contract?.total_project_value)}
                  </div>
                </div>
                {contract?.project_end_date && (
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t("project_end_date_calculated")}</div>
                    <div className="prj-info-value">{contract?.project_end_date}</div>
                  </div>
                )}
                  </div>
                ) : (
                  <div className="prj-empty-state">
                    {t("contract_not_added")}
                  </div>
                )}
              </div>
            )}

            {/* Start Order Tab */}
            {activeTab === "start_order" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("start_order") || "أمر المباشرة"}</h2>
                  <div className="prj-tab-actions">
                    <Button
                      onClick={() => {
                        if (hasStartOrder) {
                          setStartOrderFormData({
                            start_order_date: startOrder.start_order_date || "",
                            start_order_notes: startOrder.start_order_notes || "",
                            start_order_file: null,
                          });
                        } else {
                          setStartOrderFormData({
                            start_order_date: "",
                            start_order_notes: "",
                            start_order_file: null,
                          });
                        }
                        setStartOrderDialogOpen(true);
                      }}
                    >
                      {hasStartOrder ? t("edit") : (t("add") || "إضافة")}
                    </Button>
                  </div>
                </div>
                {hasStartOrder ? (
                  <>
                    <div className="prj-info-grid">
                      {startOrder?.start_order_date && (
                    <div className="prj-info-item">
                          <div className="prj-info-label">{t("start_order_date") || "تاريخ أمر المباشرة"}</div>
                          <div className="prj-info-value">{formatDate(startOrder.start_order_date)}</div>
                        </div>
                      )}
                        {startOrder?.start_order_file && (
                        <div className="prj-info-item">
                          <div className="prj-info-label">{t("start_order_file") || "ملف أمر المباشرة"}</div>
                    <div className="prj-info-value">
                      <a 
                        href="#" 
                              onClick={handleFileClick(startOrder.start_order_file)}
                        style={{ color: "var(--primary)", textDecoration: "underline", cursor: "pointer" }}
                      >
                              {t("view_file") || "عرض الملف"}
                      </a>
                    </div>
                  </div>
                )}
                      {startOrder?.start_order_notes && (
                        <div className="prj-info-item prj-info-item--wide">
                          <div className="prj-info-label">{t("start_order_notes") || "ملاحظات أمر المباشرة"}</div>
                          <div className="prj-info-value">{startOrder.start_order_notes}</div>
              </div>
                      )}
                      {startOrder?.project_end_date && (
                        <div className="prj-info-item">
                          <div className="prj-info-label">{t("project_end_date_calculated") || "تاريخ نهاية المشروع (شامل التمديدات)"}</div>
                          <div className="prj-info-value">{formatDate(startOrder.project_end_date)}</div>
                        </div>
                      )}
                    </div>
                  </>
            ) : (
              <div className="prj-empty-state">
                    {t("start_order_not_added") || "لم يتم إضافة أمر المباشرة بعد. اضغط على «إضافة» لإضافة البيانات."}
              </div>
            )}
              </div>
            )}

            {/* Extensions Tab */}
            {hasStartOrder && activeTab === "extensions" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("extensions") || "التمديدات"}</h2>
                  <div className="prj-tab-actions" style={{ display: "flex", gap: "12px" }}>
                    {!editingExtensions && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // ✅ إضافة تمديد جديد - نأخذ التمديدات الموجودة ونضيف تمديد جديد
                            const currentExtensions = startOrder?.extensions ? startOrder.extensions.map(ext => ({
                              reason: ext.reason || "",
                              days: ext.days || 0,
                              months: ext.months || 0,
                              extension_date: ext.extension_date || "",
                              approval_number: ext.approval_number || "",
                              file: null,
                              file_url: ext.file_url || null,
                              file_name: ext.file_name || null,
                            })) : [];
                            const newExtension = {
                              reason: "",
                              days: 0,
                              months: 0,
                              extension_date: "",
                              approval_number: "",
                              file: null,
                              file_url: null,
                              file_name: null,
                            };
                            // ✅ إضافة التمديد الجديد فقط (بدون التمديدات الموجودة)
                            setExtensionsFormData([newExtension]);
                            // ✅ فتح وضعية التعديل لعرض التمديد الجديد فقط
                            setEditingExtensions(true);
                          }}
                        >
                          + {t("add_extension") || "إضافة تمديد"}
                        </Button>
                        <Button
                          onClick={() => {
                            // ✅ فتح وضعية التعديل مع كل التمديدات الموجودة (قابلة للتعديل)
                            const currentExtensions = startOrder?.extensions ? startOrder.extensions.map(ext => ({
                              reason: ext.reason || "",
                              days: ext.days || 0,
                              months: ext.months || 0,
                              extension_date: ext.extension_date || "",
                              approval_number: ext.approval_number || "",
                              file: null,
                              file_url: ext.file_url || null,
                              file_name: ext.file_name || null,
                              _isExisting: true, // ✅ علامة للتمييز بين التمديدات الموجودة والجديدة
                            })) : [];
                            setExtensionsFormData(currentExtensions);
                            setEditingExtensions(true);
                          }}
                          disabled={!startOrder?.extensions || !Array.isArray(startOrder.extensions) || startOrder.extensions.length === 0}
                        >
                          {t("edit") || "تعديل"}
                        </Button>
                      </>
                    )}
                    {editingExtensions && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // ✅ إضافة تمديد جديد آخر
                            const newExtension = {
                              reason: "",
                              days: 0,
                              months: 0,
                              extension_date: "",
                              approval_number: "",
                              file: null,
                              file_url: null,
                              file_name: null,
                            };
                            setExtensionsFormData([...extensionsFormData, newExtension]);
                          }}
                        >
                          + {t("add_extension") || "إضافة تمديد"}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            // ✅ إلغاء التعديل والعودة للوضع الافتراضي
                            setExtensionsFormData([]);
                            setEditingExtensions(false);
                            reload(); // ✅ إعادة تحميل البيانات من السيرفر
                          }}
                          disabled={savingExtensions}
                        >
                          {t("cancel") || "إلغاء"}
                        </Button>
                        <Button
                          onClick={handleSaveExtensions}
                          disabled={savingExtensions}
                        >
                          {savingExtensions ? (t("saving") || "جاري الحفظ...") : (t("save") || "حفظ")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* ✅ عرض التمديدات */}
                {editingExtensions ? (
                  // ✅ وضعية التعديل: جميع التمديدات قابلة للتعديل
                  extensionsFormData.length > 0 ? (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: extensionsFormData.length === 1 
                          ? "1fr" 
                          : "repeat(2, 1fr)",
                        gap: "var(--space-4)",
                        maxWidth: "100%"
                      }}>
                        {extensionsFormData.map((ext, idx) => (
                          <ContractExtension
                          key={`edit-${idx}`}
                            extension={ext}
                            index={idx}
                            extensionIndex={idx}
                            isView={false}
                            onUpdate={(extIndex, field, value) => {
                              const updated = [...extensionsFormData];
                              updated[extIndex] = { ...updated[extIndex], [field]: value };
                              setExtensionsFormData(updated);
                            }}
                            onRemove={(extIndex) => {
                              const updated = extensionsFormData.filter((_, i) => i !== extIndex);
                              setExtensionsFormData(updated);
                            }}
                            canRemove={true}
                            projectId={projectId}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="prj-empty-state">
                        {t("no_extensions") || "لا توجد تمديدات. اضغط على «إضافة تمديد» لإضافة تمديد جديد."}
                      </div>
                  )
                ) : (
                  // ✅ وضعية العرض: عرض ContractExtension في وضعية view
                  startOrder?.extensions && Array.isArray(startOrder.extensions) && startOrder.extensions.length > 0 ? (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: startOrder.extensions.length === 1 
                        ? "1fr" 
                        : "repeat(2, 1fr)",
                      gap: "var(--space-4)",
                      maxWidth: "100%"
                    }}>
                      {startOrder.extensions.map((ext, idx) => (
                        <ContractExtension
                          key={idx}
                          extension={ext}
                          index={idx}
                          extensionIndex={idx}
                          isView={true}
                          onUpdate={() => {}}
                          onRemove={() => {}}
                          canRemove={false}
                          projectId={projectId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="prj-empty-state">
                      {t("no_extensions") || "لا توجد تمديدات. اضغط على «إضافة تمديد» لإضافة تمديد جديد."}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Awarding Tab */}
            {isHousingLoan && activeTab === "awarding" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("awarding_gulf_bank_contract_info") || "أمر الترسية وعقد بنك الخليج"}</h2>
                  <div className="prj-tab-actions">
                    <Button
                      as={Link}
                      disabled={!hasAwarding}
                      to={hasAwarding ? `/projects/${projectId}/awarding/view` : "#"}
                      variant="secondary"
                      onClick={(e) => {
                        if (!hasAwarding) e.preventDefault();
                      }}
                    >
                      {t("view_details")}
                    </Button>
                    <>
                      {hasAwarding ? (
                        <Button as={Link} to={`/projects/${projectId}/awarding/view`}>
                      {t("edit")}
                    </Button>
                      ) : (
                        <Button as={Link} to={`/projects/${projectId}/awarding/view`}>
                          {t("add") || "إضافة"}
                        </Button>
                      )}
                    </>
                  </div>
                </div>
                {hasAwarding ? (
                  <div className="prj-info-grid">
                    <div className="prj-info-item">
                      <div className="prj-info-label">{t("award_date") || "تاريخ أمر الترسية"}</div>
                      <div className="prj-info-value">{awarding?.award_date || t("empty_value")}</div>
                    </div>
                    <div className="prj-info-item">
                      <div className="prj-info-label">{t("project_number") || "رقم المشروع"}</div>
                      <div className="prj-info-value">{awarding?.project_number || t("empty_value")}</div>
                    </div>
                    <div className="prj-info-item">
                      <div className="prj-info-label">{t("consultant_registration_number") || "رقم تسجيل الاستشاري"}</div>
                      <div className="prj-info-value">{awarding?.consultant_registration_number || t("empty_value")}</div>
                    </div>
                    <div className="prj-info-item">
                      <div className="prj-info-label">{t("contractor_registration_number") || "رقم تسجيل المقاول"}</div>
                      <div className="prj-info-value">{awarding?.contractor_registration_number || t("empty_value")}</div>
                    </div>
                    {awarding?.awarding_file && (
                      <div className="prj-info-item">
                        <div className="prj-info-label">{t("awarding_file") || "ملف أمر الترسية"}</div>
                        <div className="prj-info-value">
                          <a 
                            href="#" 
                            onClick={handleFileClick(awarding.awarding_file)}
                            style={{ color: "var(--primary)", textDecoration: "underline", cursor: "pointer" }}
                          >
                            {t("view_file") || "عرض الملف"}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="prj-empty-state">
                    {t("awarding_not_added") || "لم يتم إضافة أمر الترسية"}
                  </div>
                )}
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === "financial" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("financial_summary")}</h2>
                  <div className="prj-tab-actions">
              <Button as={Link} variant="secondary" to={`/projects/${projectId}/summary`}>
                {t("view_summary")}
              </Button>
                  </div>
                </div>
            <div className="prj-summary-info">
              {t("financial_summary_desc")}
            </div>
              </div>
            )}

            {/* Variations Tab */}
            {activeTab === "variations" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("variations_title") || "أوامر التغيير السعري"}</h2>
                  <div className="prj-tab-actions">
                    <Button
                      onClick={() => {
                        setEditingVariation(null);
                        setVariationFormData({
                          variation_number: "",
                          description: "",
                          final_amount: "0.00",
                          consultant_fees_percentage: "0.00",
                          consultant_fees: "0.00",
                          contractor_engineer_fees: "0.00",
                          total_amount: "0.00",
                          discount: "0.00",
                          net_amount: "0.00",
                          vat: "0.00",
                          net_amount_with_vat: "0.00",
                          variation_invoice_file: null,
                        });
                        setExistingVariationInvoiceFile(null);
                        setVariationDialogOpen(true);
                      }}
                    >
                      {t("add_variation") || "إضافة أمر تغيير سعري"}
                    </Button>
                  </div>
                </div>
                {variations && variations.length > 0 ? (
                  <>
                    <div className="prj-info-grid" style={{ marginBottom: "24px" }}>
                      <div className="prj-info-item prj-info-item--highlight">
                        <div className="prj-info-label">{t("variations_count") || "عدد الأوامر"}</div>
                        <div className="prj-info-value">{variations.length}</div>
                      </div>
                      <div className="prj-info-item prj-info-item--highlight">
                        <div className="prj-info-label">{t("total") || "الإجمالي"}</div>
                        <div className="prj-info-value prj-info-value--money">
                          {formatMoney(variations.reduce((sum, v) => sum + (parseFloat(v.net_amount_with_vat) || 0), 0))}
                        </div>
                      </div>
                    </div>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <table style={{ width: "100%", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--border)" }}>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("variation_number") || "رقم التعديل"}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("description") || "الوصف"}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("net_amount_with_vat") || "المبلغ الصافي بالضريبة"}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("action") || "إجراء"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variations.map((variation, i) => (
                            <tr key={variation.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px" }}>{i + 1}</td>
                              <td style={{ padding: "12px" }}>{variation.variation_number || `#${variation.id}`}</td>
                              <td style={{ padding: "12px" }}>{variation.description || "-"}</td>
                              <td style={{ padding: "12px" }}>{formatMoney(variation.net_amount_with_vat || 0)}</td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => {
                                      setEditingVariation(variation);
                                      const final = parseFloat(variation.final_amount) || 0;
                                      const consultant = parseFloat(variation.consultant_fees) || 0;
                                      const consultantPercentage = final > 0 ? (consultant / final) * 100 : 0;
                                      setVariationFormData({
                                        variation_number: variation.variation_number || "",
                                        description: variation.description || "",
                                        final_amount: variation.final_amount || "0.00",
                                        consultant_fees_percentage: consultantPercentage.toFixed(2),
                                        consultant_fees: variation.consultant_fees || "0.00",
                                        contractor_engineer_fees: variation.contractor_engineer_fees || "0.00",
                                        total_amount: variation.total_amount || "0.00",
                                        discount: variation.discount || "0.00",
                                        net_amount: variation.net_amount || "0.00",
                                        vat: variation.vat || "0.00",
                                        net_amount_with_vat: variation.net_amount_with_vat || "0.00",
                                        variation_invoice_file: null,
                                      });
                                      setExistingVariationInvoiceFile(variation.variation_invoice_file || null);
                                      setVariationDialogOpen(true);
                                    }}
                                  >
                                    {t("edit") || "تعديل"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="prj-empty-state">
                    {t("no_variations") || "لا توجد أوامر تغيير سعري"}
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("payments_title")}</h2>
                  <div className="prj-tab-actions">
                <Button onClick={() => {
                  setEditingPayment(null);
                  setPaymentFormData({ amount: "", date: "", description: "", payer: "owner", payment_method: "" });
                  setPaymentDialogOpen(true);
                }}>
                  {t("add_payment")}
                </Button>
                  </div>
                </div>
              {payments && payments.length > 0 ? (
                <>
                    <div className="prj-info-grid" style={{ marginBottom: "24px" }}>
                    <div className="prj-info-item prj-info-item--highlight">
                      <div className="prj-info-label">{t("payments_count")}</div>
                      <div className="prj-info-value">{payments.length}</div>
                    </div>
                    <div className="prj-info-item prj-info-item--highlight">
                      <div className="prj-info-label">{t("total")}</div>
                      <div className="prj-info-value prj-info-value--money">
                        {formatMoney(payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0))}
                      </div>
                    </div>
                  </div>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table style={{ width: "100%", fontSize: "14px" }}>
                      <thead>
                          <tr style={{ borderBottom: "2px solid var(--border)" }}>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("payment_date")}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("amount")}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                          {payments.map((payment, i) => (
                          <tr key={payment.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px" }}>{i + 1}</td>
                              <td style={{ padding: "12px" }}>
                              {formatDate(payment.date, i18n.language)}
                            </td>
                              <td style={{ padding: "12px" }}>{formatMoney(payment.amount)}</td>
                              <td style={{ padding: "12px" }}>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <Button
                                  variant="ghost"
                                  size="small"
                                  onClick={() => {
                                    setEditingPayment(payment);
                                    setPaymentFormData({
                                      amount: payment.amount || "",
                                      date: payment.date ? new Date(payment.date).toISOString().split("T")[0] : "",
                                      description: payment.description || "",
                                      payer: payment.payer || "owner",
                                      payment_method: payment.payment_method || "",
                                    });
                                    setPaymentDialogOpen(true);
                                  }}
                                >
                                  {t("edit")}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="small"
                                  onClick={() => {
                                    setDeletingPaymentId(payment.id);
                                    setDeletePaymentConfirmOpen(true);
                                  }}
                                >
                                  {t("delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="prj-empty-state">
                  {t("no_payments")}
                </div>
              )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
              <div className="prj-tab-panel">
                <div className="prj-tab-header">
                  <h2>{t("invoices_title") || "الفواتير"}</h2>
                  <div className="prj-tab-actions">
                    <Button onClick={() => nav(`/invoices/create?project=${projectId}`)}>
                      {t("add_invoice") || "إضافة فاتورة"}
                    </Button>
                  </div>
                </div>
                {invoices && invoices.length > 0 ? (
                  <>
                    <div className="prj-info-grid" style={{ marginBottom: "24px" }}>
                      <div className="prj-info-item prj-info-item--highlight">
                        <div className="prj-info-label">{t("invoices_count") || "عدد الفواتير"}</div>
                        <div className="prj-info-value">{invoices.length}</div>
                      </div>
                      <div className="prj-info-item prj-info-item--highlight">
                        <div className="prj-info-label">{t("total")}</div>
                        <div className="prj-info-value prj-info-value--money">
                          {formatMoney(invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0))}
                        </div>
                      </div>
                    </div>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                      <table style={{ width: "100%", fontSize: "14px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--border)" }}>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("invoice_number") || "رقم الفاتورة"}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("invoice_date") || "تاريخ الفاتورة"}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("amount")}</th>
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: 600 }}>{t("action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((invoice, i) => (
                            <tr key={invoice.id} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px" }}>{i + 1}</td>
                              <td style={{ padding: "12px" }}>
                                {invoice.invoice_number || `#${invoice.id}`}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {formatDate(invoice.invoice_date, i18n.language)}
                              </td>
                              <td style={{ padding: "12px" }}>{formatMoney(invoice.amount)}</td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    variant="ghost"
                                    size="small"
                                    onClick={() => nav(`/invoices/${invoice.id}/view`)}
                                  >
                                    {t("view") || "عرض"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="prj-empty-state">
                    {t("no_invoices") || "لا توجد فواتير"}
                  </div>
                )}
              </div>
            )}
        </div>
        </Card>

      </div>

      {/* Dialogs */}

      <Dialog
        open={confirmOpen}
        title={t("confirm_delete")}
        desc={
          <>
            {t("confirm_delete_desc")}{" "}
            <b>{titleText}</b>?<br />
            {t("delete_cannot_undo")}
          </>
        }
        confirmLabel={deleting ? t("deleting") : t("delete_permanent")}
        cancelLabel={t("cancel")}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={onDelete}
        danger
        busy={deleting}
      />

      <Dialog
        open={!!errorMsg}
        title={t("error")}
        desc={errorMsg}
        confirmLabel={t("ok")}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />

      {/* Payment Add/Edit Dialog */}
      <Dialog
        open={paymentDialogOpen}
        title={editingPayment ? t("edit_payment") : t("add_payment")}
        desc={
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "400px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("payer")} *
              </label>
              <select
                className="prj-select"
                value={paymentFormData.payer}
                onChange={(e) => {
                  const newPayer = e.target.value;
                  setPaymentFormData({ 
                    ...paymentFormData, 
                    payer: newPayer,
                    payment_method: newPayer === "bank" ? "bank_transfer" : paymentFormData.payment_method
                  });
                }}
              >
                <option value="owner">{t("payer_owner") || "Owner"}</option>
                <option value="bank">{t("payer_bank") || "Bank"}</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("payment_method")} {paymentFormData.payer === "owner" ? "*" : ""}
              </label>
              <select
                className="prj-select"
                value={paymentFormData.payment_method}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                disabled={paymentFormData.payer === "bank"}
              >
                {paymentFormData.payer === "bank" ? (
                  <option value="bank_transfer">{t("payment_method_bank_transfer") || "Bank Transfer"}</option>
                ) : (
                  <>
                    <option value="">{t("select_payment_method") || "Select Payment Method"}</option>
                    <option value="cash_deposit">{t("payment_method_cash_deposit") || "Cash Deposit in Company Bank Account"}</option>
                    <option value="cash_office">{t("payment_method_cash_office") || "Cash Payment in Office"}</option>
                    <option value="bank_transfer">{t("payment_method_bank_transfer") || "Bank Transfer"}</option>
                    <option value="bank_cheque">{t("payment_method_bank_cheque") || "Bank Cheque"}</option>
                  </>
                )}
              </select>
              {paymentFormData.payer === "bank" && (
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("payment_bank_transfer_only") || "Bank payments must use Bank Transfer only."}
                </small>
              )}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("amount")} *
              </label>
              <input
                type="number"
                step="0.01"
                className="prj-input"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder={t("amount_placeholder")}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("payment_date")} *
              </label>
              <DateInput
                className="prj-input"
                value={paymentFormData.date}
                onChange={(value) => setPaymentFormData({ ...paymentFormData, date: value })}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("description")}
              </label>
              <textarea
                className="prj-input"
                rows={3}
                value={paymentFormData.description}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                placeholder={t("description_placeholder")}
              />
            </div>
          </div>
        }
        confirmLabel={savingPayment ? t("saving") : t("save")}
        cancelLabel={t("cancel")}
        onClose={() => !savingPayment && setPaymentDialogOpen(false)}
        onConfirm={async () => {
          if (!paymentFormData.amount || !paymentFormData.date) {
            setErrorMsg(t("fill_required_fields"));
            return;
          }

          // Validate payment method based on payer
          if (paymentFormData.payer === "bank" && paymentFormData.payment_method !== "bank_transfer") {
            setErrorMsg(t("payment_bank_transfer_only") || "Bank payments must use Bank Transfer only.");
            return;
          }

          if (paymentFormData.payer === "owner" && !paymentFormData.payment_method) {
            setErrorMsg(t("payment_method_required") || "Payment method is required for owner payments.");
            return;
          }

          setSavingPayment(true);
          try {
            const payload = {
              amount: parseFloat(paymentFormData.amount),
              date: paymentFormData.date,
              description: paymentFormData.description,
              payer: paymentFormData.payer,
              payment_method: paymentFormData.payer === "bank" ? "bank_transfer" : paymentFormData.payment_method,
            };
            if (editingPayment) {
              await api.patch(`projects/${projectId}/payments/${editingPayment.id}/`, payload);
            } else {
              await api.post(`projects/${projectId}/payments/`, payload);
            }
            setPaymentDialogOpen(false);
            reload();
          } catch (e) {
            const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || t("save_error");
            setErrorMsg(errorMsg);
            console.error("Error saving payment:", e);
          } finally {
            setSavingPayment(false);
          }
        }}
        busy={savingPayment}
      />

      {/* Delete Payment Confirm Dialog */}
      <Dialog
        open={deletePaymentConfirmOpen}
        title={t("confirm_delete")}
        desc={t("confirm_delete_payment")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onClose={() => setDeletePaymentConfirmOpen(false)}
        onConfirm={async () => {
          if (!deletingPaymentId) return;
          try {
            await api.delete(`projects/${projectId}/payments/${deletingPaymentId}/`);
            setDeletePaymentConfirmOpen(false);
            setDeletingPaymentId(null);
            reload();
          } catch (e) {
            const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || t("delete_error");
            setErrorMsg(errorMsg);
            console.error("Error deleting payment:", e);
          }
        }}
        danger
      />

      {/* Dialog إرسال المشروع للموافقة */}
      <Dialog
        open={submitDialogOpen}
        title={t("submit_for_approval") || "إرسال المشروع للموافقة"}
        desc={
          <div>
            <p>{t("submit_project_confirmation") || "هل أنت متأكد من إرسال المشروع للموافقة؟"}</p>
            <p style={{ marginTop: "8px", fontSize: "0.9em", color: "var(--muted)" }}>
              {t("submit_project_warning") || "بعد الإرسال، سيتم مراجعة المشروع من قبل المدير."}
            </p>
          </div>
        }
        confirmLabel={t("submit") || "إرسال"}
        cancelLabel={t("cancel")}
        onClose={() => setSubmitDialogOpen(false)}
        onConfirm={handleSubmit}
        busy={processingAction}
      />

      {/* Dialog الموافقة على المرحلة */}
      <Dialog
        open={approveDialogOpen}
        title={t("approve_stage") || "موافقة على المرحلة"}
        desc={
          <div>
            <p>{t("approve_stage_confirmation") || "هل أنت متأكد من الموافقة على هذه المرحلة؟"}</p>
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("notes") || "ملاحظات"} (اختياري)
              </label>
              <textarea
                className="prj-input"
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("approval_notes_placeholder") || "ملاحظات الموافقة..."}
              />
            </div>
          </div>
        }
        confirmLabel={t("approve") || "موافقة"}
        cancelLabel={t("cancel")}
        onClose={() => {
          setApproveDialogOpen(false);
          setActionNotes("");
        }}
        onConfirm={handleApprove}
        busy={processingAction}
      />

      {/* Dialog رفض المشروع */}
      <Dialog
        open={rejectDialogOpen}
        title={t("reject_project") || "رفض المشروع"}
        desc={
          <div>
            <p>{t("reject_project_confirmation") || "هل أنت متأكد من رفض المشروع؟"}</p>
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("rejection_reason") || "سبب الرفض"} *
              </label>
              <textarea
                className="prj-input"
                rows={4}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("rejection_reason_placeholder") || "يرجى كتابة سبب الرفض..."}
                required
              />
            </div>
          </div>
        }
        confirmLabel={t("reject") || "رفض"}
        cancelLabel={t("cancel")}
        onClose={() => {
          setRejectDialogOpen(false);
          setActionNotes("");
        }}
        onConfirm={handleReject}
        busy={processingAction}
        danger
      />

      {/* Dialog الاعتماد النهائي */}
      <Dialog
        open={finalApproveDialogOpen}
        title={t("final_approve") || "الاعتماد النهائي للمشروع"}
        desc={
          <div>
            <p style={{ fontWeight: 500, color: "var(--primary)" }}>
              {t("final_approve_confirmation") || "هل أنت متأكد من الاعتماد النهائي للمشروع؟"}
            </p>
            <p style={{ marginTop: "8px", fontSize: "0.9em", color: "var(--muted)" }}>
              {t("final_approve_warning") || "بعد الاعتماد النهائي، سيصبح المشروع فعالاً ويظهر في قائمة المشاريع المعتمدة."}
            </p>
            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("notes") || "ملاحظات"} (اختياري)
              </label>
              <textarea
                className="prj-input"
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t("final_approval_notes_placeholder") || "ملاحظات الاعتماد النهائي..."}
              />
            </div>
          </div>
        }
        confirmLabel={t("final_approve") || "اعتماد نهائي"}
        cancelLabel={t("cancel")}
        onClose={() => {
          setFinalApproveDialogOpen(false);
          setActionNotes("");
        }}
        onConfirm={handleFinalApprove}
        busy={processingAction}
      />

      {/* Dialog أمر المباشرة */}
      <Dialog
        open={startOrderDialogOpen}
        title={hasStartOrder ? (t("edit_start_order") || "تعديل أمر المباشرة") : (t("add_start_order") || "إضافة أمر المباشرة")}
        desc={
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "400px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("start_order_date") || "تاريخ أمر المباشرة"}
              </label>
              <DateInput
                className="prj-input"
                value={startOrderFormData.start_order_date}
                onChange={(value) => setStartOrderFormData({ ...startOrderFormData, start_order_date: value })}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("start_order_file") || "ملف أمر المباشرة"}
              </label>
              <input
                type="file"
                className="prj-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setStartOrderFormData({ ...startOrderFormData, start_order_file: file || null });
                }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {hasStartOrder && startOrder?.start_order_file && (
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("current_file") || "الملف الحالي:"}{" "}
                  <a 
                    href="#" 
                    onClick={handleFileClick(startOrder.start_order_file)}
                    style={{ color: "var(--primary)", textDecoration: "underline" }}
                  >
                    {t("view_file") || "عرض الملف"}
                  </a>
                </small>
              )}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("start_order_notes") || "ملاحظات أمر المباشرة"}
              </label>
              <textarea
                className="prj-input"
                rows={4}
                value={startOrderFormData.start_order_notes}
                onChange={(e) => setStartOrderFormData({ ...startOrderFormData, start_order_notes: e.target.value })}
                placeholder={t("start_order_notes_placeholder") || "ملاحظات إضافية..."}
              />
            </div>
          </div>
        }
        confirmLabel={savingStartOrder ? t("saving") : t("save")}
        cancelLabel={t("cancel")}
        onClose={() => !savingStartOrder && setStartOrderDialogOpen(false)}
        onConfirm={async () => {
          setSavingStartOrder(true);
          try {
            const formData = new FormData();
            if (startOrderFormData.start_order_date) {
              formData.append("start_order_date", startOrderFormData.start_order_date);
            }
            if (startOrderFormData.start_order_notes) {
              formData.append("start_order_notes", startOrderFormData.start_order_notes);
            }
            if (startOrderFormData.start_order_file) {
              formData.append("start_order_file", startOrderFormData.start_order_file);
            }
            
            if (hasStartOrder) {
              await api.patch(`projects/${projectId}/start-order/${startOrder.id}/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            } else {
              await api.post(`projects/${projectId}/start-order/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            setStartOrderDialogOpen(false);
            reload();
          } catch (e) {
            const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || t("save_error");
            setErrorMsg(errorMsg);
            console.error("Error saving start order:", e);
          } finally {
            setSavingStartOrder(false);
          }
        }}
        busy={savingStartOrder}
      />

      {/* ✅ تم إزالة Dialog التمديدات - الآن التعديل مباشرة في الصفحة */}

      {/* Dialog التغييرات السعرية */}
      <Dialog
        open={variationDialogOpen}
        title={editingVariation ? (t("edit_variation") || "تعديل أمر تغيير سعري") : (t("add_variation") || "إضافة أمر تغيير سعري")}
        desc={
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "600px", maxWidth: "800px", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("variation_number") || "رقم التعديل"}
                </label>
                <input
                  type="text"
                  className="prj-input"
                  value={variationFormData.variation_number}
                  onChange={(e) => setVariationFormData({ ...variationFormData, variation_number: e.target.value })}
                  placeholder={t("variation_number_placeholder") || "سيتم توليده تلقائياً"}
                />
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("variation_number_note") || "سيتم توليد رقم فريد تلقائياً إذا لم يتم إدخاله"}
                </small>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("final_amount") || "المبلغ الفعلي"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.final_amount}
                  onChange={(e) => setVariationFormData({ ...variationFormData, final_amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("description") || "وصف الدفعة"}
              </label>
              <textarea
                className="prj-input"
                rows={3}
                value={variationFormData.description}
                onChange={(e) => setVariationFormData({ ...variationFormData, description: e.target.value })}
                placeholder={t("description_placeholder") || "أدخل الوصف..."}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("consultant_fees_percentage") || "نسبة أتعاب الاستشاري (%)"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="prj-input"
                  value={variationFormData.consultant_fees_percentage}
                  onChange={(e) => setVariationFormData({ ...variationFormData, consultant_fees_percentage: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("consultant_fees_calculated") || "أتعاب الاستشاري المحسوبة:"} {formatMoney(parseFloat(variationFormData.consultant_fees) || 0)}
                </small>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("contractor_engineer_fees") || "مهندس المقاول (Head and Profit)"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.contractor_engineer_fees}
                  onChange={(e) => setVariationFormData({ ...variationFormData, contractor_engineer_fees: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("total_amount") || "المبلغ الإجمالي"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.total_amount}
                  readOnly
                  style={{ background: "#e9ecef", cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("total_amount_note") || "= المبلغ الفعلي + أتعاب الاستشاري"}
                </small>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("discount") || "الخصم"} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.discount}
                  onChange={(e) => setVariationFormData({ ...variationFormData, discount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("net_amount") || "المبلغ الصافي"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.net_amount}
                  readOnly
                  style={{ background: "#e9ecef", cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("net_amount_note") || "= المبلغ الإجمالي - الخصم"}
                </small>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("vat") || "الضريبة"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="prj-input"
                  value={variationFormData.vat}
                  onChange={(e) => setVariationFormData({ ...variationFormData, vat: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("net_amount_with_vat") || "المبلغ الصافي بالضريبة"}
              </label>
              <input
                type="number"
                step="0.01"
                className="prj-input"
                value={variationFormData.net_amount_with_vat}
                readOnly
                style={{ background: "#e9ecef", cursor: "not-allowed", fontSize: "18px", fontWeight: 600 }}
              />
              <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                {t("net_amount_with_vat_note") || "= المبلغ الصافي + الضريبة"}
              </small>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                {t("variation_invoice_file") || "فاتورة التعديل"}
              </label>
              <input
                type="file"
                className="prj-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setVariationFormData({ ...variationFormData, variation_invoice_file: file || null });
                }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {existingVariationInvoiceFile && (
                <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("current_file") || "الملف الحالي:"}{" "}
                  <a 
                    href="#" 
                    onClick={handleFileClick(existingVariationInvoiceFile)}
                    style={{ color: "var(--primary)", textDecoration: "underline" }}
                  >
                    {t("view_file") || "عرض الملف"}
                  </a>
                </small>
              )}
            </div>
          </div>
        }
        confirmLabel={savingVariation ? t("saving") : t("save")}
        cancelLabel={t("cancel")}
        onClose={() => !savingVariation && setVariationDialogOpen(false)}
        onConfirm={async () => {
          setSavingVariation(true);
          try {
            const formDataToSend = new FormData();
            
            if (variationFormData.variation_number) {
              formDataToSend.append("variation_number", variationFormData.variation_number);
            }
            if (variationFormData.description) {
              formDataToSend.append("description", variationFormData.description);
            }
            
            formDataToSend.append("final_amount", parseFloat(variationFormData.final_amount));
            formDataToSend.append("consultant_fees", parseFloat(variationFormData.consultant_fees));
            formDataToSend.append("contractor_engineer_fees", parseFloat(variationFormData.contractor_engineer_fees));
            formDataToSend.append("total_amount", parseFloat(variationFormData.total_amount));
            formDataToSend.append("discount", parseFloat(variationFormData.discount));
            formDataToSend.append("net_amount", parseFloat(variationFormData.net_amount));
            formDataToSend.append("vat", parseFloat(variationFormData.vat));
            formDataToSend.append("net_amount_with_vat", parseFloat(variationFormData.net_amount_with_vat));
            formDataToSend.append("amount", parseFloat(variationFormData.final_amount)); // Legacy field

            if (variationFormData.variation_invoice_file instanceof File) {
              formDataToSend.append("variation_invoice_file", variationFormData.variation_invoice_file);
            }
            
            if (editingVariation) {
              await api.patch(`projects/${projectId}/variations/${editingVariation.id}/`, formDataToSend, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            } else {
              await api.post(`projects/${projectId}/variations/`, formDataToSend, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            setVariationDialogOpen(false);
            setEditingVariation(null);
            reload();
          } catch (e) {
            const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || t("save_error");
            setErrorMsg(errorMsg);
            console.error("Error saving variation:", e);
          } finally {
            setSavingVariation(false);
          }
        }}
        busy={savingVariation}
      />

      {/* Dialog الأخطاء */}
      <Dialog
        open={!!errorMsg}
        title={t("error")}
        desc={errorMsg}
        confirmLabel={t("ok")}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />
    </PageLayout>
  );
}
