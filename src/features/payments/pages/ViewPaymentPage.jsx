import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { handleFileClick } from "../../../utils/fileHelpers";

export default function ViewPaymentPage() {
  const { paymentId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [project, setProject] = useState(null);

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const loadPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`payments/${paymentId}/`);
      setPayment(data);

      // Load project if available
      if (data.project) {
        try {
          const { data: projectData } = await api.get(`projects/${data.project}/`);
          setProject(Array.isArray(projectData) ? projectData[0] : projectData);
        } catch (e) {
          console.warn("Could not load project:", e);
        }
      }
    } catch (e) {
      console.error("Error loading payment:", e);
      alert(t("error_loading_payment") || "Error loading payment");
      navigate("/payments");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !payment) {
    return (
      <PageLayout loading={loading} loadingText={t("loading")}>
        <div></div>
      </PageLayout>
    );
  }

  const getPayerLabel = (payer) => {
    return payer === "bank" ? t("payer_bank") : t("payer_owner");
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash_deposit: t("payment_method_cash_deposit"),
      cash_office: t("payment_method_cash_office"),
      bank_transfer: t("payment_method_bank_transfer"),
      bank_cheque: t("payment_method_bank_cheque"),
    };
    return methods[method] || method;
  };

  return (
    <PageLayout>
      <div className="container" style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "2px solid var(--border)"
        }}>
          <h1 style={{ margin: 0, fontSize: "var(--fs-24)", fontWeight: 700 }}>
            {t("view_payment")}
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => navigate("/payments")}>
              {t("back")} ← {t("payments_title")}
            </Button>
            <Button variant="primary" onClick={() => navigate(`/payments/${paymentId}/edit`)}>
              {t("edit")}
            </Button>
          </div>
        </div>

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
            {t("payment_information")}
          </div>
          
          <div style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <ViewRow label={t("amount")} value={formatMoney(payment.amount)} />
              <ViewRow label={t("payment_date")} value={formatDate(payment.date)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <ViewRow label={t("payer")} value={getPayerLabel(payment.payer)} />
              <ViewRow label={t("payment_method")} value={getPaymentMethodLabel(payment.payment_method)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <ViewRow 
                label={t("project_name")} 
                value={project ? (project.display_name || project.name || `${t("project")} #${project.id}`) : t("no_project")} 
              />
              {payment.actual_invoice_id && (
                <ViewRow 
                  label={t("invoice")} 
                  value={
                    <Link to={`/invoices/${payment.actual_invoice_id}/view`} className="prj-link">
                      {t("view_invoice")}
                    </Link>
                  } 
                />
              )}
            </div>

            {payment.description && (
              <ViewRow label={t("description")} value={payment.description} />
            )}
          </div>
        </div>

        {/* Bank Payment Details */}
        {payment.payer === "bank" && (
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {t("bank_payment_details")}
            </div>
            
            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <ViewRow label={t("project_financial_account")} value={payment.project_financial_account || t("empty_value")} />
                <ViewRow label={t("completion_percentage")} value={payment.completion_percentage ? `${payment.completion_percentage}%` : t("empty_value")} />
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer / Cash Deposit / Cheque Details */}
        {(payment.payment_method === "bank_transfer" || payment.payment_method === "cash_deposit" || payment.payment_method === "bank_cheque") && (
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {payment.payment_method === "bank_transfer" ? t("bank_transfer_details") :
               payment.payment_method === "cash_deposit" ? t("cash_deposit_details") :
               t("bank_cheque_details")}
            </div>
            
            <div style={{ padding: "24px" }}>
              {payment.payment_method === "bank_transfer" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <ViewRow label={t("recipient_account_number")} value={payment.recipient_account_number || t("empty_value")} />
                  <ViewRow label={t("sender_account_number")} value={payment.sender_account_number || t("empty_value")} />
                </div>
              )}

              {payment.payment_method === "cash_deposit" && payment.payer === "owner" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <ViewRow label={t("recipient_account_number")} value={payment.recipient_account_number || t("empty_value")} />
                  <ViewRow label={t("sender_account_number")} value={payment.sender_account_number || t("empty_value")} />
                </div>
              )}

              {payment.payment_method === "bank_cheque" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <ViewRow label={t("cheque_holder_name")} value={payment.cheque_holder_name || t("empty_value")} />
                  <ViewRow label={t("cheque_account_number")} value={payment.cheque_account_number || t("empty_value")} />
                  <ViewRow label={t("cheque_date")} value={payment.cheque_date ? formatDate(payment.cheque_date) : t("empty_value")} />
                </div>
              )}

              {payment.transferor_name && (
                <ViewRow label={t("transferor_name")} value={payment.transferor_name} />
              )}
            </div>
          </div>
        )}

        {/* Attachments */}
        {(payment.deposit_slip || payment.invoice_file || payment.receipt_voucher || payment.bank_payment_attachments) && (
          <div className="card">
            <div style={{ 
              background: "var(--primary)", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "8px 8px 0 0",
              fontWeight: 600,
              fontSize: "18px"
            }}>
              {t("attachments")}
            </div>
            
            <div style={{ padding: "24px" }}>
              {payment.deposit_slip && (
                <ViewRow 
                  label={t("deposit_slip")} 
                  value={
                    <a href={payment.deposit_slip} target="_blank" rel="noopener noreferrer" className="prj-link">
                      {t("view_file")}
                    </a>
                  } 
                />
              )}
              {payment.invoice_file && (
                <ViewRow 
                  label={t("invoice_file")} 
                  value={
                    <a href="#" onClick={handleFileClick(payment.invoice_file)} className="prj-link" style={{ cursor: "pointer" }}>
                      {t("view_file")}
                    </a>
                  } 
                />
              )}
              {payment.receipt_voucher && (
                <ViewRow 
                  label={t("receipt_voucher")} 
                  value={
                    <a href="#" onClick={handleFileClick(payment.receipt_voucher)} className="prj-link" style={{ cursor: "pointer" }}>
                      {t("view_file")}
                    </a>
                  } 
                />
              )}
              {payment.bank_payment_attachments && (
                <ViewRow 
                  label={t("bank_payment_attachments")} 
                  value={
                    <a href="#" onClick={handleFileClick(payment.bank_payment_attachments)} className="prj-link" style={{ cursor: "pointer" }}>
                      {t("view_file")}
                    </a>
                  } 
                />
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

