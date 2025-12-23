import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import UnifiedSelect from "../../../components/common/Select";
import DateInput from "../../../components/fields/DateInput";
import { formatMoney, formatDate } from "../../../utils/formatters";
import "./CreateInvoicePage.css";

export default function CreateActualInvoicePage() {
  const { invoiceId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEditMode = !!invoiceId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [formData, setFormData] = useState({
    project: "",
    payment: "",
    amount: "0.00",
    invoice_date: new Date().toISOString().split("T")[0],
    invoice_number: "",
    description: "",
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
  });

  useEffect(() => {
    loadData();
    if (isEditMode) {
      loadInvoice();
    }
  }, [invoiceId, isEditMode]);

  const loadData = async () => {
    try {
      // Load projects
      const { data: projectsData } = await api.get("projects/");
      const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || []);
      setProjects(projectsList || []);

      // Load all payments
      const { data: paymentsData } = await api.get("payments/");
      const paymentsList = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.results || paymentsData?.items || paymentsData?.data || []);
      setPayments(paymentsList || []);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const { data: projectsData } = await api.get("projects/");
      const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || []);
      
      let invoice = null;
      let projectId = null;
      
      for (const project of projectsList) {
        try {
          const { data: invoices } = await api.get(`projects/${project.id}/actual-invoices/`);
          const items = Array.isArray(invoices) ? invoices : (invoices?.results || []);
          const found = items.find(inv => inv.id === parseInt(invoiceId));
          if (found) {
            invoice = found;
            projectId = project.id;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!invoice || !projectId) {
        alert(t("invoice_not_found"));
        navigate("/invoices");
        return;
      }

      const invoiceItems = Array.isArray(invoice.items) && invoice.items.length > 0 
        ? invoice.items 
        : [{ description: "", quantity: 1, unit_price: 0, total: 0 }];

      // Load payments for the project
      const { data: paymentsData } = await api.get("payments/");
      const paymentsList = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.results || paymentsData?.items || paymentsData?.data || []);
      const projectPayments = paymentsList.filter(p => p.project?.toString() === projectId.toString());
      setPayments(projectPayments);

      setFormData({
        project: projectId.toString(),
        payment: invoice.payment_id?.toString() || "",
        amount: invoice.amount || "0.00",
        invoice_date: invoice.invoice_date ? invoice.invoice_date.split("T")[0] : "",
        invoice_number: invoice.invoice_number || "",
        description: invoice.description || "",
        items: invoiceItems,
      });
    } catch (e) {
      console.error("Error loading invoice:", e);
      alert(t("error_loading_invoice"));
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalFromItems = (items) => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity || 0);
      const price = parseFloat(item.unit_price || 0);
      return sum + (qty * price);
    }, 0);
  };

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity || 0);
      const price = parseFloat(field === 'unit_price' ? value : newItems[index].unit_price || 0);
      newItems[index].total = qty * price;
    }
    
    const totalAmount = calculateTotalFromItems(newItems);
    setFormData({ ...formData, items: newItems, amount: totalAmount.toFixed(2) });
  };

  const addInvoiceItem = () => {
    const newItem = { description: "", quantity: 1, unit_price: 0, total: 0 };
    setFormData({ ...formData, items: [...(formData.items || []), newItem] });
  };

  const removeInvoiceItem = (index) => {
    const newItems = (formData.items || []).filter((_, i) => i !== index);
    if (newItems.length === 0) newItems.push({ description: "", quantity: 1, unit_price: 0, total: 0 });
    const totalAmount = calculateTotalFromItems(newItems);
    setFormData({ ...formData, items: newItems, amount: totalAmount.toFixed(2) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project || !formData.invoice_date) {
      alert(t("fill_required_fields"));
      return;
    }

    const validItems = (formData.items || []).filter(item => 
      item.description && item.description.trim() && 
      parseFloat(item.quantity || 0) > 0 && 
      parseFloat(item.unit_price || 0) > 0
    );

    if (validItems.length === 0) {
      alert(t("add_at_least_one_item"));
      return;
    }

    setSaving(true);
    try {
      const totalAmount = calculateTotalFromItems(validItems);
      const payload = {
        project: parseInt(formData.project),
        payment: formData.payment ? parseInt(formData.payment) : null,
        amount: totalAmount,
        invoice_date: formData.invoice_date,
        invoice_number: formData.invoice_number || "",
        description: formData.description || "",
        items: validItems,
      };

      if (isEditMode) {
        await api.patch(`projects/${formData.project}/actual-invoices/${invoiceId}/`, payload);
      } else {
        await api.post(`projects/${formData.project}/actual-invoices/`, payload);
      }

      navigate("/invoices");
    } catch (e) {
      console.error("Error saving invoice:", e);
      alert(e?.response?.data?.detail || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="create-invoice-page">
        <div className="create-invoice-header">
          <Button
            variant="ghost"
            onClick={() => navigate("/invoices")}
            style={{ marginBottom: "16px" }}
          >
            ← {t("back")} {t("to_invoices")}
          </Button>
          <h1 className="create-invoice-title">
            {isEditMode ? t("edit_invoice") : t("add_invoice")}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="create-invoice-form">
          {/* Invoice Details */}
          <div className="invoice-form-card">
            <div className="invoice-form-card-header">
              {t("invoice_details")}
            </div>
            <div className="invoice-form-card-body">
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">
                    {t("project_name")} *
                  </label>
                  <UnifiedSelect
                    options={projects}
                    value={formData.project}
                    onChange={(projectId) => {
                      setFormData({ ...formData, project: projectId });
                      // تحديث قائمة الدفعات عند اختيار مشروع
                      if (projectId) {
                        const projectPayments = payments.filter(p => p.project?.toString() === projectId.toString());
                        setPayments(projectPayments);
                      }
                    }}
                    placeholder={t("select_project")}
                    isDisabled={isEditMode}
                    getOptionLabel={(opt) => opt.display_name || opt.name || `${t("project")} #${opt.id}`}
                    getOptionValue={(opt) => opt.id?.toString()}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    {t("linked_payment")}
                  </label>
                  <UnifiedSelect
                    options={payments.filter(p => !formData.project || p.project?.toString() === formData.project.toString())}
                    value={formData.payment}
                    onChange={(paymentId) => setFormData({ ...formData, payment: paymentId })}
                    placeholder={t("select_payment")}
                    isClearable
                    getOptionLabel={(opt) => {
                      const date = opt.date ? formatDate(opt.date, 'ar') : '';
                      return `${formatMoney(opt.amount)} - ${date}`;
                    }}
                    getOptionValue={(opt) => opt.id?.toString()}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">
                    {t("invoice_date")} *
                  </label>
                  <DateInput
                    className="prj-input"
                    value={formData.invoice_date}
                    onChange={(value) => setFormData({ ...formData, invoice_date: value })}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    {t("invoice_number")}
                  </label>
                  <input
                    type="text"
                    className="prj-input"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder={t("invoice_number_placeholder")}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">
                  {t("description")}
                </label>
                <textarea
                  className="prj-input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("description_placeholder")}
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="invoice-form-card">
            <div className="invoice-form-card-header">
              <span>{t("invoice_items")} *</span>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={addInvoiceItem}
                type="button"
              >
                + {t("add_item")}
              </Button>
            </div>
            <div className="invoice-form-card-body">
              {(formData.items || []).length === 0 ? (
                <div className="empty-items-state">
                  <p>{t("no_items_added")}</p>
                  <Button 
                    variant="secondary" 
                    size="small" 
                    onClick={addInvoiceItem}
                    type="button"
                  >
                    {t("add_first_item")}
                  </Button>
                </div>
              ) : (
                <div className="invoice-items-table-wrapper">
                  <table className="invoice-items-table">
                    <thead>
                      <tr>
                        <th>{t("item_description")}</th>
                        <th style={{ width: "120px" }}>{t("quantity")}</th>
                        <th style={{ width: "150px" }}>{t("unit_price")}</th>
                        <th style={{ width: "150px" }}>{t("total")}</th>
                        <th style={{ width: "60px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.items || []).map((item, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="prj-input"
                              value={item.description || ""}
                              onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                              placeholder={t("item_description_placeholder")}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="prj-input"
                              value={item.quantity || 0}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              style={{ textAlign: "center" }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="prj-input"
                              value={item.unit_price || 0}
                              onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              style={{ textAlign: "right" }}
                            />
                          </td>
                          <td className="item-total">
                            {formatMoney(item.total || 0)}
                          </td>
                          <td>
                            {(formData.items || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInvoiceItem(index)}
                                className="remove-item-btn"
                                title={t("remove_item")}
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="total-label">
                          {t("total_amount")}:
                        </td>
                        <td className="total-amount">
                          {formatMoney(formData.amount || 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/invoices")}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

