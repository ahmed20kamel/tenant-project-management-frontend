import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import FileUpload from "../../../components/file-upload/FileUpload";
import DateInput from "../../../components/fields/DateInput";
import { formatMoney } from "../../../utils/formatters";

export default function CreatePaymentPage() {
  const { paymentId } = useParams();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const isEditMode = !!paymentId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [actualInvoices, setActualInvoices] = useState([]);
  const [formData, setFormData] = useState({
    amount: "",
    date: "",
    description: "",
    project: "",
    payer: "owner",
    payment_method: "",
    actual_invoice: "",
    recipient_account_number: "",
    sender_account_number: "",
    transferor_name: "",
    cheque_holder_name: "",
    cheque_account_number: "",
    cheque_date: "",
    project_financial_account: "",
    completion_percentage: "",
    bank_payment_attachments: null,
  });

  // File attachments
  const [depositSlip, setDepositSlip] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptVoucher, setReceiptVoucher] = useState(null);
  const [bankPaymentAttachments, setBankPaymentAttachments] = useState(null);
  
  // Existing file URLs (for edit mode)
  const [existingDepositSlip, setExistingDepositSlip] = useState(null);
  const [existingInvoiceFile, setExistingInvoiceFile] = useState(null);
  const [existingReceiptVoucher, setExistingReceiptVoucher] = useState(null);
  const [existingBankPaymentAttachments, setExistingBankPaymentAttachments] = useState(null);

  useEffect(() => {
    loadProjects();
    if (isEditMode) {
      loadPayment();
    }
  }, [paymentId, isEditMode]);

  useEffect(() => {
    if (formData.project) {
      loadActualInvoices(formData.project);
    } else {
      setActualInvoices([]);
      setFormData(prev => ({ ...prev, actual_invoice: "" }));
    }
  }, [formData.project]);

  const loadProjects = async () => {
    try {
      const { data } = await api.get("projects/");
      const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      setProjects(items || []);
    } catch (e) {
      console.error("Error loading projects:", e);
    }
  };

  const loadActualInvoices = async (projectId) => {
    try {
      const { data } = await api.get(`projects/${projectId}/actual-invoices/`);
      const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      // ✅ عرض فقط الفواتير الفعلية التي لم يتم ربطها بدفعة (payment_id === null)
      const availableInvoices = items.filter(inv => !inv.payment_id && inv.payment === null);
      setActualInvoices(availableInvoices || []);
    } catch (e) {
      console.error("Error loading actual invoices:", e);
      setActualInvoices([]);
    }
  };

  const loadPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`payments/${paymentId}/`);
      
      setFormData({
        amount: data.amount || "",
        date: data.date ? new Date(data.date).toISOString().split("T")[0] : "",
        description: data.description || "",
        project: data.project || "",
        payer: data.payer || "owner",
        payment_method: data.payment_method || "",
        actual_invoice: data.actual_invoice_id || "",
        recipient_account_number: data.recipient_account_number || "",
        sender_account_number: data.sender_account_number || "",
        transferor_name: data.transferor_name || "",
        cheque_holder_name: data.cheque_holder_name || "",
        cheque_account_number: data.cheque_account_number || "",
        cheque_date: data.cheque_date ? new Date(data.cheque_date).toISOString().split("T")[0] : "",
        project_financial_account: data.project_financial_account || "",
        completion_percentage: data.completion_percentage || "",
      });

      // Load existing file URLs if available
      if (data.deposit_slip) setExistingDepositSlip(data.deposit_slip);
      if (data.invoice_file) setExistingInvoiceFile(data.invoice_file);
      if (data.receipt_voucher) setExistingReceiptVoucher(data.receipt_voucher);
      if (data.bank_payment_attachments) setExistingBankPaymentAttachments(data.bank_payment_attachments);
      
      // Load actual invoices for the project
      if (data.project) {
        loadActualInvoices(data.project);
      }
    } catch (e) {
      console.error("Error loading payment:", e);
      alert(t("load_error"));
      navigate("/payments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.amount || !formData.date) {
      alert(t("fill_required_fields"));
      return;
    }

    if (formData.payer === "bank" && formData.payment_method !== "bank_transfer") {
      alert(t("payment_bank_transfer_only") || "Bank payments must use Bank Transfer only.");
      return;
    }

    if (formData.payer === "owner" && !formData.payment_method) {
      alert(t("payment_method_required") || "Payment method is required for owner payments.");
      return;
    }

    // ✅ التحقق من أن الفاتورة الفعلية المختارة متاحة (لم يتم ربطها بدفعة أخرى)
    if (formData.actual_invoice) {
      const selectedInvoice = actualInvoices.find(inv => inv.id === parseInt(formData.actual_invoice));
      if (!selectedInvoice) {
        alert(t("actual_invoice_already_linked") || "هذه الفاتورة الفعلية مرتبطة بدفعة أخرى بالفعل");
        return;
      }
    }

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("amount", parseFloat(formData.amount));
      formDataToSend.append("date", formData.date);
      formDataToSend.append("description", formData.description || "");
      formDataToSend.append("payer", formData.payer);
      formDataToSend.append("payment_method", formData.payer === "bank" ? "bank_transfer" : formData.payment_method);

      if (formData.project) {
        formDataToSend.append("project", parseInt(formData.project));
      }

      if (formData.actual_invoice) {
        formDataToSend.append("actual_invoice", parseInt(formData.actual_invoice));
      }

      // Add bank transfer / cash deposit / cheque details
      if (formData.recipient_account_number) {
        formDataToSend.append("recipient_account_number", formData.recipient_account_number);
      }
      if (formData.sender_account_number) {
        formDataToSend.append("sender_account_number", formData.sender_account_number);
      }
      if (formData.transferor_name) {
        formDataToSend.append("transferor_name", formData.transferor_name);
      }
      if (formData.cheque_holder_name) {
        formDataToSend.append("cheque_holder_name", formData.cheque_holder_name);
      }
      if (formData.cheque_account_number) {
        formDataToSend.append("cheque_account_number", formData.cheque_account_number);
      }
      if (formData.cheque_date) {
        formDataToSend.append("cheque_date", formData.cheque_date);
      }
      if (formData.project_financial_account) {
        formDataToSend.append("project_financial_account", formData.project_financial_account);
      }
      if (formData.completion_percentage) {
        formDataToSend.append("completion_percentage", parseFloat(formData.completion_percentage));
      }

      // Add file attachments
      if (depositSlip instanceof File) {
        formDataToSend.append("deposit_slip", depositSlip);
      }
      if (invoiceFile instanceof File) {
        formDataToSend.append("invoice_file", invoiceFile);
      }
      if (receiptVoucher instanceof File) {
        formDataToSend.append("receipt_voucher", receiptVoucher);
      }
      if (bankPaymentAttachments instanceof File) {
        formDataToSend.append("bank_payment_attachments", bankPaymentAttachments);
      }

      if (isEditMode) {
        await api.patch(`payments/${paymentId}/`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("payments/", formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/payments");
    } catch (e) {
      console.error("Error saving payment:", e);
      alert(e?.response?.data?.detail || e?.response?.data?.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const shouldShowDepositSlip = formData.payer === "owner" && 
    (formData.payment_method === "cash_deposit" || formData.payment_method === "bank_transfer");

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container" style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <Button variant="secondary" onClick={() => navigate("/payments")}>
            {t("back")} ← {t("payments_title")}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Payment Information Card */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {isEditMode ? (t("edit_payment") || "Edit Payment") : (t("create_payment") || "Create Payment")}
            </div>
            
            <div style={{ padding: "24px" }}>
              {/* Amount and Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("amount")} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="prj-input"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={t("amount_placeholder")}
                    required
                  />
                  {formData.actual_invoice && (
                    <small style={{ 
                      display: "block", 
                      marginTop: "4px",
                      color: "#059669",
                      fontWeight: 500
                    }}>
                      ✓ {t("linked_to_invoice")}
                    </small>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("payment_date")} *
                  </label>
                  <DateInput
                    className="prj-input"
                    value={formData.date}
                    onChange={(value) => setFormData({ ...formData, date: value })}
                  />
                </div>
              </div>

              {/* Payer and Payment Method Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("payer")} *
                  </label>
                  <select
                    className="prj-select"
                    value={formData.payer}
                    onChange={(e) => {
                      const newPayer = e.target.value;
                      setFormData({ 
                        ...formData, 
                        payer: newPayer,
                        payment_method: newPayer === "bank" ? "bank_transfer" : formData.payment_method
                      });
                    }}
                    required
                  >
                    <option value="owner">{t("payer_owner")}</option>
                    <option value="bank">{t("payer_bank")}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("payment_method")} {formData.payer === "owner" ? "*" : ""}
                  </label>
                  <select
                    className="prj-select"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    disabled={formData.payer === "bank"}
                    required={formData.payer === "owner"}
                  >
                    {formData.payer === "bank" ? (
                      <option value="bank_transfer">{t("payment_method_bank_transfer")}</option>
                    ) : (
                      <>
                        <option value="">{t("select_payment_method")}</option>
                        <option value="cash_deposit">{t("payment_method_cash_deposit")}</option>
                        <option value="cash_office">{t("payment_method_cash_office")}</option>
                        <option value="bank_transfer">{t("payment_method_bank_transfer")}</option>
                        <option value="bank_cheque">{t("payment_method_bank_cheque")}</option>
                      </>
                    )}
                  </select>
                  {formData.payer === "bank" && (
                    <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                      {t("payment_bank_transfer_only")}
                    </small>
                  )}
                </div>
              </div>

              {/* Project and Invoice Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("project_name")} ({t("optional")})
                  </label>
                  <select
                    className="prj-select"
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  >
                    <option value="">{t("no_project")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.name || `${t("project")} #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("invoice")}
                  </label>
                  <select
                    className="prj-select"
                    value={formData.actual_invoice}
                    onChange={(e) => {
                      const invoiceId = e.target.value;
                      setFormData({ ...formData, actual_invoice: invoiceId });
                      // تحديث المبلغ تلقائياً من الفاتورة المختارة
                      if (invoiceId) {
                        const selectedInvoice = actualInvoices.find(inv => inv.id === parseInt(invoiceId));
                        if (selectedInvoice) {
                          setFormData(prev => ({ 
                            ...prev, 
                            actual_invoice: invoiceId,
                            amount: selectedInvoice.amount || prev.amount
                          }));
                        }
                      }
                    }}
                    disabled={!formData.project}
                  >
                    <option value="">{t("select_invoice")}</option>
                    {actualInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number || `${t("invoice")} #${invoice.id}`} - {formatMoney(invoice.amount)}
                      </option>
                    ))}
                  </select>
                  {actualInvoices.length === 0 && formData.project && (
                    <small style={{ color: "#dc2626", marginTop: "4px", display: "block" }}>
                      {t("no_available_invoices")}
                    </small>
                  )}
                  <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                    {t("invoice_note")}
                  </small>
                </div>
              </div>

              {/* Bank Payment Specific Fields - Show only when payer is bank */}
              {formData.payer === "bank" && (
                <div style={{ marginBottom: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    {t("bank_payment_details")}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("project_financial_account")} *
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.project_financial_account}
                        onChange={(e) => {
                          let value = e.target.value.toUpperCase();
                          // Ensure it starts with PRJ
                          if (value && !value.startsWith("PRJ")) {
                            value = "PRJ" + value.replace(/^PRJ/i, "");
                          }
                          setFormData({ ...formData, project_financial_account: value });
                        }}
                        placeholder={t("project_financial_account_placeholder")}
                        required
                      />
                      <small style={{ color: "var(--muted)", marginTop: "4px", display: "block" }}>
                        {t("project_financial_account_note")}
                      </small>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("completion_percentage")} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="prj-input"
                        value={formData.completion_percentage}
                        onChange={(e) => setFormData({ ...formData, completion_percentage: e.target.value })}
                        placeholder={t("completion_percentage_placeholder")}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Transfer Details - Show only for bank_transfer */}
              {formData.payment_method === "bank_transfer" && (
                <div style={{ marginBottom: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    {t("bank_transfer_details") || "تفاصيل التحويل البنكي"}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("recipient_account_number") || "رقم الحساب المستلم"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.recipient_account_number}
                        onChange={(e) => setFormData({ ...formData, recipient_account_number: e.target.value })}
                        placeholder={t("recipient_account_number_placeholder") || "أدخل رقم الحساب المستلم"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("sender_account_number") || "رقم الحساب الراسل"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.sender_account_number}
                        onChange={(e) => setFormData({ ...formData, sender_account_number: e.target.value })}
                        placeholder={t("sender_account_number_placeholder") || "أدخل رقم الحساب الراسل"}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("transferor_name") || "اسم المحول"}
                    </label>
                    <input
                      type="text"
                      className="prj-input"
                      value={formData.transferor_name}
                      onChange={(e) => setFormData({ ...formData, transferor_name: e.target.value })}
                      placeholder={t("transferor_name_placeholder") || "أدخل اسم المحول"}
                    />
                  </div>
                </div>
              )}

              {/* Cash Deposit Details - Show only for cash_deposit */}
              {formData.payment_method === "cash_deposit" && (
                <div style={{ marginBottom: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    {t("cash_deposit_details") || "تفاصيل الإيداع النقدي"}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("recipient_account_number") || "رقم الحساب المستلم"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.recipient_account_number}
                        onChange={(e) => setFormData({ ...formData, recipient_account_number: e.target.value })}
                        placeholder={t("recipient_account_number_placeholder") || "أدخل رقم الحساب المستلم"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("sender_name") || "اسم الراسل"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.transferor_name}
                        onChange={(e) => setFormData({ ...formData, transferor_name: e.target.value })}
                        placeholder={t("sender_name_placeholder") || "أدخل اسم الراسل"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Cheque Details - Show only for bank_cheque */}
              {formData.payment_method === "bank_cheque" && (
                <div style={{ marginBottom: "16px", padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                  <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                    {t("bank_cheque_details") || "تفاصيل الشيك البنكي"}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("cheque_holder_name") || "اسم صاحب الشيك"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.cheque_holder_name}
                        onChange={(e) => setFormData({ ...formData, cheque_holder_name: e.target.value })}
                        placeholder={t("cheque_holder_name_placeholder") || "أدخل اسم صاحب الشيك"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                        {t("cheque_account_number") || "رقم الحساب الذي سيخضع فيه الشيك"}
                      </label>
                      <input
                        type="text"
                        className="prj-input"
                        value={formData.cheque_account_number}
                        onChange={(e) => setFormData({ ...formData, cheque_account_number: e.target.value })}
                        placeholder={t("cheque_account_number_placeholder") || "أدخل رقم الحساب"}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("cheque_date") || "تاريخ الشيك"}
                    </label>
                    <DateInput
                      className="prj-input"
                      value={formData.cheque_date}
                      onChange={(value) => setFormData({ ...formData, cheque_date: value })}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
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

          {/* Attachments Card */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {t("attachments") || "Attachments"}
            </div>
            
            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: shouldShowDepositSlip ? "1fr 1fr 1fr" : formData.payer === "bank" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "24px" }}>
                {/* Deposit Slip / Bank Deposit Proof */}
                {shouldShowDepositSlip && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("deposit_slip") || "Deposit Slip / Bank Deposit Proof"} *
                    </label>
                    <FileUpload
                      value={depositSlip}
                      onChange={setDepositSlip}
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSizeMB={10}
                      showPreview={true}
                      existingFileUrl={existingDepositSlip}
                      existingFileName={existingDepositSlip ? existingDepositSlip.split("/").pop() : ""}
                      onRemoveExisting={() => {
                        setExistingDepositSlip(null);
                        setDepositSlip(null);
                      }}
                    />
                  </div>
                )}

                {/* Invoice File */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("invoice_file") || "Invoice Used for Payment (فاتورة الدفع)"} *
                  </label>
                  <FileUpload
                    value={invoiceFile}
                    onChange={setInvoiceFile}
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={10}
                    showPreview={true}
                    existingFileUrl={existingInvoiceFile}
                    existingFileName={existingInvoiceFile ? existingInvoiceFile.split("/").pop() : ""}
                    onRemoveExisting={() => {
                      setExistingInvoiceFile(null);
                      setInvoiceFile(null);
                    }}
                  />
                </div>

                {/* Receipt Voucher */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                    {t("receipt_voucher") || "Receipt Voucher (سند قبض)"} *
                  </label>
                  <FileUpload
                    value={receiptVoucher}
                    onChange={setReceiptVoucher}
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={10}
                    showPreview={true}
                    existingFileUrl={existingReceiptVoucher}
                    existingFileName={existingReceiptVoucher ? existingReceiptVoucher.split("/").pop() : ""}
                    onRemoveExisting={() => {
                      setExistingReceiptVoucher(null);
                      setReceiptVoucher(null);
                    }}
                  />
                </div>

                {/* Bank Payment Attachments - Show only for bank payments */}
                {formData.payer === "bank" && (
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                      {t("bank_payment_attachments") || "مرفقات دفعة البنك"} *
                    </label>
                    <FileUpload
                      value={bankPaymentAttachments}
                      onChange={setBankPaymentAttachments}
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSizeMB={10}
                      showPreview={true}
                      existingFileUrl={existingBankPaymentAttachments}
                      existingFileName={existingBankPaymentAttachments ? existingBankPaymentAttachments.split("/").pop() : ""}
                      onRemoveExisting={() => {
                        setExistingBankPaymentAttachments(null);
                        setBankPaymentAttachments(null);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/payments")}
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

