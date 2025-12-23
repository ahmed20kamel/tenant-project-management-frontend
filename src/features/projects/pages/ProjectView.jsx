import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import PageLayout from "../../../components/layout/PageLayout";
import DateInput from "../../../components/fields/DateInput";
import useProjectData from "../../../hooks/useProjectData";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { getProjectTypeLabel, getVillaCategoryLabel, getContractTypeLabel } from "../../../utils/projectLabels";
import { formatInternalCode } from "../../../utils/internalCodeFormatter";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/projectStatus";
import { handleFileClick } from "../../../utils/fileHelpers";

export default function ProjectView() {
  const { projectId } = useParams();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { project, siteplan, license, contract, awarding, payments, loading, reload } = useProjectData(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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

  const hasSiteplan = !!siteplan;
  const hasLicense = !!license;
  const hasContract = !!contract;
  const hasAwarding = !!awarding;
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

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container">
        {/* Header Section */}
        <div className="prj-view-header">
          <div className="prj-view-header__content">
            <h1 className="prj-view-title">{titleText}</h1>
            {project?.internal_code && (
              <div className="prj-view-code">
                {t("project_view_internal_code")}{" "}
                <span className="mono">
                  {formatInternalCode(project.internal_code)}
                </span>
              </div>
            )}
          </div>
          <div className="prj-view-header__actions">
            <Button as={Link} variant="secondary" to="/projects">
              {t("back_projects")}
            </Button>
            <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`}>
              {t("edit_project")}
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              {t("delete_project")}
            </Button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="prj-view-grid">
          {/* Row 1: Three Cards - معلومات المشروع، مخطط الأرض، ترخيص البناء */}
          <div className="prj-view-grid-row">
            {/* Project Information */}
            <Card
            title={t("project_information")}
            actions={
              <div className="prj-card-actions">
                <Button as={Link} to={`/projects/${projectId}/setup/view`} variant="secondary">
                  {t("view_details")}
                </Button>
                <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`}>
                  {t("edit")}
                </Button>
              </div>
            }
            className="prj-view-card"
          >
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
          </Card>

            {/* Site Plan */}
            <Card
            title={t("site_plan")}
            actions={
              <div className="prj-card-actions">
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
                <Button as={Link} to={`/projects/${projectId}/wizard?step=siteplan&mode=edit`}>
                  {t("edit")}
                </Button>
              </div>
            }
            className="prj-view-card"
          >
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
          </Card>

            {/* Building License */}
            <Card
            title={t("building_license")}
            actions={
              <div className="prj-card-actions">
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
                <Button as={Link} to={`/projects/${projectId}/wizard?step=license&mode=edit`}>
                  {t("edit")}
                </Button>
              </div>
            }
            className="prj-view-card"
          >
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
          </Card>
          </div>

          {/* Row 2: Three Cards - معلومات العقد، الملخص المالي، الدفعات */}
          <div className="prj-view-grid-row">
            {/* Contract Information */}
            <Card
            title={t("contract_information")}
            actions={
              <div className="prj-card-actions">
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
                <Button as={Link} to={`/projects/${projectId}/wizard?step=contract&mode=edit`}>
                  {t("edit")}
                </Button>
              </div>
            }
            className="prj-view-card"
          >
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
                {(contract?.start_order_date || contract?.start_order_file) && (
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t("start_order_date")}</div>
                    <div className="prj-info-value">{contract?.start_order_date || t("empty_value")}</div>
                  </div>
                )}
                {contract?.project_end_date && (
                  <div className="prj-info-item">
                    <div className="prj-info-label">{t("project_end_date_calculated")}</div>
                    <div className="prj-info-value">{contract?.project_end_date}</div>
                  </div>
                )}
                {contract?.start_order_notes ? (
                  <div className="prj-info-item prj-info-item--wide">
                    <div className="prj-info-label">{t("start_order_notes")}</div>
                    <div className="prj-info-value">{contract.start_order_notes}</div>
                  </div>
                ) : null}
                {contract?.start_order_file && (
                    <div className="prj-info-item">
                    <div className="prj-info-label">{t("start_order_file")}</div>
                    <div className="prj-info-value">
                      <a 
                        href="#" 
                        onClick={handleFileClick(contract.start_order_file)}
                        style={{ color: "var(--primary)", textDecoration: "underline", cursor: "pointer" }}
                      >
                        {t("view_details")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="prj-empty-state">
                {t("contract_not_added")}
              </div>
            )}
          </Card>

            {/* Awarding - فقط لمشاريع القرض السكني */}
            {isHousingLoan && (
              <Card
                title={t("awarding_gulf_bank_contract_info") || "أمر الترسية وعقد بنك الخليج"}
                actions={
                  <div className="prj-card-actions">
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
                    <Button as={Link} to={`/projects/${projectId}/wizard?step=award&mode=edit`}>
                      {t("edit")}
                    </Button>
                  </div>
                }
                className="prj-view-card"
              >
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
              </Card>
            )}

            {/* Financial Summary */}
            <Card
            title={t("financial_summary")}
            subtitle={t("financial_summary_subtitle")}
            actions={
              <Button as={Link} variant="secondary" to={`/projects/${projectId}/summary`}>
                {t("view_summary")}
              </Button>
            }
            className="prj-view-card"
          >
            <div className="prj-summary-info">
              {t("financial_summary_desc")}
            </div>
          </Card>

            {/* Payments */}
            <Card
              title={t("payments_title")}
              actions={
                <Button onClick={() => {
                  setEditingPayment(null);
                  setPaymentFormData({ amount: "", date: "", description: "", payer: "owner", payment_method: "" });
                  setPaymentDialogOpen(true);
                }}>
                  {t("add_payment")}
                </Button>
              }
              className="prj-view-card"
            >
              {payments && payments.length > 0 ? (
                <>
                  <div className="prj-info-grid" style={{ marginBottom: "16px" }}>
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
                  <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                    <table style={{ width: "100%", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th style={{ textAlign: "left", padding: "8px" }}>#</th>
                          <th style={{ textAlign: "left", padding: "8px" }}>{t("payment_date")}</th>
                          <th style={{ textAlign: "left", padding: "8px" }}>{t("amount")}</th>
                          <th style={{ textAlign: "left", padding: "8px" }}>{t("action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.slice(0, 5).map((payment, i) => (
                          <tr key={payment.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px" }}>{i + 1}</td>
                            <td style={{ padding: "8px" }}>
                              {formatDate(payment.date, i18n.language)}
                            </td>
                            <td style={{ padding: "8px" }}>{formatMoney(payment.amount)}</td>
                            <td style={{ padding: "8px" }}>
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
                    {payments.length > 5 && (
                      <div style={{ marginTop: "8px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                        {t("showing_first")} 5 {t("of")} {payments.length}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="prj-empty-state">
                  {t("no_payments")}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

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
    </PageLayout>
  );
}
