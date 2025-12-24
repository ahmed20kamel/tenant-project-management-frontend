import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import UnifiedSelect from "../../../components/common/Select";
import FileUpload from "../../../components/file-upload/FileUpload";
import { formatMoney } from "../../../utils/formatters";
import "./CreateVariationPage.css";

export default function CreateVariationPage() {
  const { variationId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEditMode = !!variationId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [variationInvoiceFile, setVariationInvoiceFile] = useState(null);
  const [existingVariationInvoiceFile, setExistingVariationInvoiceFile] = useState(null);
  
  const [formData, setFormData] = useState({
    project: "",
    variation_number: "",
    description: "",
    final_amount: "0.00",
    consultant_fees_percentage: "0.00", // نسبة مئوية
    consultant_fees: "0.00", // محسوبة تلقائياً من النسبة
    contractor_engineer_fees: "0.00", // مبلغ ثابت (Head and Profit)
    total_amount: "0.00",
    discount: "0.00",
    net_amount: "0.00",
    vat: "0.00",
    net_amount_with_vat: "0.00",
  });

  useEffect(() => {
    loadProjects();
    if (isEditMode) {
      loadVariation();
    }
  }, [variationId, isEditMode]);

  const loadProjects = async () => {
    try {
      const { data } = await api.get("projects/");
      const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      setProjects(items || []);
    } catch (e) {
      // Error handled by error state
    }
  };

  const loadVariation = async () => {
    setLoading(true);
    try {
      // Find variation from all projects
      const { data: projectsData } = await api.get("projects/");
      const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || []);
      
      let variation = null;
      let projectId = null;
      
      for (const project of projectsList) {
        try {
          const { data: variations } = await api.get(`projects/${project.id}/variations/`);
          const items = Array.isArray(variations) ? variations : (variations?.results || []);
          const found = items.find(v => v.id === parseInt(variationId));
          if (found) {
            variation = found;
            projectId = project.id;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!variation || !projectId) {
        alert(t("variation_not_found") || "Variation not found");
        navigate("/variations");
        return;
      }

      // Calculate consultant_fees_percentage from consultant_fees and final_amount
      const final = parseFloat(variation.final_amount || 0);
      const consultant = parseFloat(variation.consultant_fees || 0);
      const consultantPercentage = final > 0 ? (consultant / final) * 100 : 0;

      setFormData({
        project: projectId.toString(),
        variation_number: variation.variation_number || "",
        description: variation.description || "",
        final_amount: variation.final_amount || "0.00",
        consultant_fees_percentage: consultantPercentage.toFixed(2),
        consultant_fees: variation.consultant_fees || "0.00",
        total_amount: variation.total_amount || "0.00",
        discount: variation.discount || "0.00",
        net_amount: variation.net_amount || "0.00",
        vat: variation.vat || "0.00",
        net_amount_with_vat: variation.net_amount_with_vat || "0.00",
      });

      if (variation.variation_invoice_file) {
        setExistingVariationInvoiceFile(variation.variation_invoice_file);
      }
    } catch (e) {
      // Error handled by error state
      alert(t("load_error") || "Error loading variation");
      navigate("/variations");
    } finally {
      setLoading(false);
    }
  };

  // Calculate derived fields
  useEffect(() => {
    const final = parseFloat(formData.final_amount) || 0;
    const consultantPercentage = parseFloat(formData.consultant_fees_percentage) || 0;
    const contractorEngineer = parseFloat(formData.contractor_engineer_fees) || 0; // مبلغ ثابت (Head and Profit)
    const discount = parseFloat(formData.discount) || 0;
    
    // Consultant Fees = Final Amount × (Consultant Percentage / 100)
    const consultant = final * (consultantPercentage / 100);
    
    // Total = Final + Consultant (المحسوبة من النسبة) + Contractor Engineer (مبلغ ثابت)
    const total = final + consultant + contractorEngineer;
    
    // Net = Total - Discount (الخصم يُخصم أولاً)
    const net = total - discount;
    
    // VAT = Net * 0.05 (الضريبة على المبلغ الصافي بعد الخصم)
    const vat = net * 0.05;
    
    // Net with VAT = Net + VAT (المبلغ النهائي بالضريبة - هذا الذي يُضاف للمشروع)
    const netWithVat = net + vat;
    
    setFormData(prev => ({
      ...prev,
      consultant_fees: consultant.toFixed(2),
      total_amount: total.toFixed(2),
      net_amount: net.toFixed(2),
      vat: vat.toFixed(2),
      net_amount_with_vat: netWithVat.toFixed(2),
    }));
  }, [formData.final_amount, formData.consultant_fees_percentage, formData.contractor_engineer_fees, formData.discount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.project) {
      alert(t("project_required") || "Project is required");
      return;
    }

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("project", parseInt(formData.project));
      
      if (formData.variation_number) {
        formDataToSend.append("variation_number", formData.variation_number);
      }
      if (formData.description) {
        formDataToSend.append("description", formData.description);
      }
      
      formDataToSend.append("final_amount", parseFloat(formData.final_amount));
      formDataToSend.append("consultant_fees", parseFloat(formData.consultant_fees));
      formDataToSend.append("contractor_engineer_fees", parseFloat(formData.contractor_engineer_fees));
      formDataToSend.append("total_amount", parseFloat(formData.total_amount));
      formDataToSend.append("discount", parseFloat(formData.discount));
      formDataToSend.append("net_amount", parseFloat(formData.net_amount));
      formDataToSend.append("vat", parseFloat(formData.vat));
      formDataToSend.append("net_amount_with_vat", parseFloat(formData.net_amount_with_vat));
      
      // Legacy field for backward compatibility
      formDataToSend.append("amount", parseFloat(formData.final_amount));

      if (variationInvoiceFile instanceof File) {
        formDataToSend.append("variation_invoice_file", variationInvoiceFile);
      }

      if (isEditMode) {
        await api.patch(`projects/${formData.project}/variations/${variationId}/`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post(`projects/${formData.project}/variations/`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/variations");
    } catch (e) {
      // Error handled by error handler
      alert(e?.response?.data?.detail || e?.response?.data?.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Button variant="secondary" onClick={() => navigate("/variations")}>
            {t("back")} ← {t("variations_title")}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Variation Information Card */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {isEditMode ? (t("edit_variation") || "Edit Price Change Order") : (t("add_variation") || "Add Price Change Order")}
            </div>
            
            <div style={{ padding: "24px" }}>
              {/* Project and Variation Number Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("project_name")} *
                  </label>
                  <UnifiedSelect
                    value={formData.project}
                    onChange={(selectedId) => setFormData({ ...formData, project: selectedId || "" })}
                    options={projects}
                    getOptionLabel={(option) => option.display_name || option.name || `Project #${option.id}`}
                    getOptionValue={(option) => option.id?.toString()}
                    placeholder={t("select_project") || "Select Project"}
                    isSearchable
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("variation_number") || "رقم التعديل"}
                  </label>
                  <input
                    type="text"
                    className="prj-input"
                    value={formData.variation_number}
                    onChange={(e) => setFormData({ ...formData, variation_number: e.target.value })}
                    placeholder={t("variation_number_placeholder") || "سيتم توليده تلقائياً"}
                  />
                  <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                    {t("variation_number_note") || "سيتم توليد رقم فريد تلقائياً إذا لم يتم إدخاله"}
                  </small>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("description")}
                </label>
                <textarea
                  className="prj-input"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("description_placeholder")}
                />
              </div>

              {/* Financial Details Section */}
              <div style={{ marginBottom: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                  {t("financial_details") || "التفاصيل المالية"}
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("final_amount") || "المبلغ الفعلي"} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="prj-input"
                      value={formData.final_amount}
                      onChange={(e) => setFormData({ ...formData, final_amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
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
                      value={formData.consultant_fees_percentage}
                      onChange={(e) => setFormData({ ...formData, consultant_fees_percentage: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      {t("consultant_fees_calculated") || "أتعاب الاستشاري المحسوبة:"} {formatMoney(parseFloat(formData.consultant_fees) || 0)}
                    </small>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("contractor_engineer_fees") || "مهندس المقاول (Head and Profit)"} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="prj-input"
                      value={formData.contractor_engineer_fees}
                      onChange={(e) => setFormData({ ...formData, contractor_engineer_fees: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("total_amount") || "المبلغ الإجمالي"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="prj-input"
                      value={formData.total_amount}
                      readOnly
                      style={{ background: "#e9ecef", cursor: "not-allowed" }}
                    />
                    <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      {t("total_amount_note") || "= المبلغ الفعلي + أتعاب الاستشاري + مهندس المقاول"}
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
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("net_amount") || "المبلغ الصافي"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="prj-input"
                      value={formData.net_amount}
                      readOnly
                      style={{ background: "#e9ecef", cursor: "not-allowed" }}
                    />
                    <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      {t("net_amount_note") || "= المبلغ الإجمالي - الخصم"}
                    </small>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("vat") || "الضريبة (5%)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="prj-input"
                      value={formData.vat}
                      readOnly
                      style={{ background: "#e9ecef", cursor: "not-allowed" }}
                    />
                    <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      {t("vat_note") || "= المبلغ الصافي × 5%"}
                    </small>
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
                    value={formData.net_amount_with_vat}
                    readOnly
                    style={{ background: "#e9ecef", cursor: "not-allowed", fontSize: "18px", fontWeight: 600 }}
                  />
                  <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                    {t("net_amount_with_vat_note") || "= المبلغ الصافي + الضريبة"}
                  </small>
                </div>
              </div>

              {/* Variation Invoice File */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                  {t("variation_invoice_file") || "فاتورة التعديل"}
                </label>
                <FileUpload
                  value={variationInvoiceFile}
                  onChange={setVariationInvoiceFile}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={10}
                  showPreview={true}
                  existingFileUrl={existingVariationInvoiceFile}
                  existingFileName={existingVariationInvoiceFile ? existingVariationInvoiceFile.split("/").pop() : ""}
                  onRemoveExisting={() => {
                    setExistingVariationInvoiceFile(null);
                    setVariationInvoiceFile(null);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/variations")}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? t("saving") : (isEditMode ? t("update") : t("save"))}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

