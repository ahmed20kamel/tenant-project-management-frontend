import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDate } from "../../utils/formatters";
import { api } from "../../services/api";
import Button from "../common/Button";
import "./InvoicePrintTemplate.css";

/**
 * Professional A4 Invoice Print Template
 * Supports Arabic and English printing
 */
export default function InvoicePrintTemplate({
  invoice,
  project,
  company,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const [printLanguage, setPrintLanguage] = useState(i18n.language || "ar");

  const isRTL = printLanguage === "ar";

  // Calculate amounts
  const subtotal = parseFloat(invoice.amount || 0);
  const vatRate = 0.05; // 5%
  const vatAmount = subtotal * vatRate;
  const grandTotal = subtotal + vatAmount;

  // Format amount in words (basic implementation)
  const amountInWords = (amount) => {
    // This is a simplified version - you might want to use a library for full conversion
    const num = Math.floor(amount);
    if (num === 0) return "Zero";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} Million`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} Thousand`;
    return num.toString();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-print-container">
      {/* Print Controls */}
      <div className="invoice-print-controls no-print">
        <div className="print-controls-left">
          <Button variant="secondary" onClick={onClose}>
            ← {t("back")}
          </Button>
        </div>
        <div className="print-controls-center">
          <label style={{ marginRight: "12px", fontWeight: 500 }}>
            {t("print_language")}:
          </label>
          <select
            value={printLanguage}
            onChange={(e) => setPrintLanguage(e.target.value)}
            className="prj-select"
            style={{ minWidth: "120px" }}
          >
            <option value="ar">{t("arabic")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </div>
        <div className="print-controls-right">
          <Button variant="primary" onClick={handlePrint}>
            🖨️ {t("print")}
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className={`invoice-print-document ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="invoice-print-header">
          <div className="invoice-print-logo-section">
            {(() => {
              let logoUrl = company?.logo;
              if (logoUrl && !logoUrl.startsWith('http')) {
                // Build full URL for relative paths
                const isDev = import.meta.env.DEV;
                const ROOT = isDev ? "" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
                
                // If logo path starts with /media/, use ROOT directly
                if (logoUrl.startsWith("/media/")) {
                  logoUrl = `${ROOT}${logoUrl}`;
                } else if (logoUrl.startsWith("/")) {
                  // Other absolute paths
                  const baseURL = api.defaults?.baseURL || window.location.origin;
                  const apiBase = baseURL.replace('/api', '');
                  logoUrl = `${apiBase}${logoUrl}`;
                } else {
                  // Relative path
                  const baseURL = api.defaults?.baseURL || window.location.origin;
                  const apiBase = baseURL.replace('/api', '');
                  logoUrl = `${apiBase}/${logoUrl}`;
                }
              }
              return logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className="invoice-print-logo"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.target.style.display = 'none';
                  }}
                />
              ) : null;
            })()}
            <div className="invoice-print-company-info">
              <h1 className="invoice-print-company-name">
                {company?.name || "Company Name"}
              </h1>
              {company?.address && (
                <p className="invoice-print-company-details">{company.address}</p>
              )}
              {company?.phone && (
                <p className="invoice-print-company-details">{company.phone}</p>
              )}
              {company?.email && (
                <p className="invoice-print-company-details">{company.email}</p>
              )}
              {company?.vat_number && (
                <p className="invoice-print-company-details">
                  {t("vat_registration") || "VAT Registration"}: {company.vat_number}
                </p>
              )}
            </div>
          </div>
          <div className="invoice-print-title-section">
            <h2 className="invoice-print-title">
              {isRTL ? "الفاتورة" : "Invoice"}
            </h2>
            <div className="invoice-print-meta">
              <div className="invoice-print-meta-item">
                <span className="invoice-print-meta-label">
                  {isRTL ? "رقم الفاتورة" : "Invoice Number"}:
                </span>
                <span className="invoice-print-meta-value">
                  {invoice.invoice_number || `#${invoice.id}`}
                </span>
              </div>
              <div className="invoice-print-meta-item">
                <span className="invoice-print-meta-label">
                  {isRTL ? "التاريخ" : "Date"}:
                </span>
                <span className="invoice-print-meta-value">
                  {formatDate(invoice.invoice_date, printLanguage)}
                </span>
              </div>
              {invoice.stage && (
                <div className="invoice-print-meta-item">
                  <span className="invoice-print-meta-label">
                    {isRTL ? "المرحلة" : "Stage"}:
                  </span>
                  <span className="invoice-print-meta-value">{invoice.stage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="invoice-print-section">
          <h3 className="invoice-print-section-title">
            {isRTL ? "معلومات العميل" : "Client Information"}
          </h3>
          <div className="invoice-print-info-grid">
            <div className="invoice-print-info-item">
              <span className="invoice-print-info-label">
                {isRTL ? "اسم المشروع" : "Project Name"}:
              </span>
              <span className="invoice-print-info-value">
                {project?.display_name || project?.name || `${isRTL ? "مشروع" : "Project"} #${project?.id}`}
              </span>
            </div>
            {project?.plot_number && (
              <div className="invoice-print-info-item">
                <span className="invoice-print-info-label">
                  {isRTL ? "رقم القطعة" : "Plot Number"}:
                </span>
                <span className="invoice-print-info-value">{project.plot_number}</span>
              </div>
            )}
            {project?.owners && project.owners.length > 0 && (
              <div className="invoice-print-info-item">
                <span className="invoice-print-info-label">
                  {isRTL ? "اسم المالك" : "Owner Name"}:
                </span>
                <span className="invoice-print-info-value">
                  {project.owners.map(o => o.name).join(", ")}
                </span>
              </div>
            )}
            {project?.consultant && (
              <div className="invoice-print-info-item">
                <span className="invoice-print-info-label">
                  {isRTL ? "الاستشاري" : "Consultant"}:
                </span>
                <span className="invoice-print-info-value">{project.consultant}</span>
              </div>
            )}
            {project?.contract?.gross_total && (
              <div className="invoice-print-info-item">
                <span className="invoice-print-info-label">
                  {isRTL ? "قيمة العقد" : "Contract Value"}:
                </span>
                <span className="invoice-print-info-value">
                  {formatMoney(project.contract.gross_total)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="invoice-print-section">
          <h3 className="invoice-print-section-title">
            {isRTL ? "تفاصيل الفاتورة" : "Invoice Details"}
          </h3>
          <table className="invoice-print-items-table">
            <thead>
              <tr>
                <th className="col-number">{isRTL ? "م" : "#"}</th>
                <th className="col-description">{isRTL ? "الوصف" : "Description"}</th>
                <th className="col-quantity">{isRTL ? "الكمية" : "Qty"}</th>
                <th className="col-unit">{isRTL ? "سعر الوحدة" : "Unit Price"}</th>
                <th className="col-total">{isRTL ? "الإجمالي" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-number">1</td>
                <td className="col-description">
                  {invoice.description || (isRTL ? "مبلغ الفاتورة" : "Invoice Amount")}
                  {invoice.stage && (
                    <div className="invoice-print-stage-note">
                      {isRTL ? "المرحلة" : "Stage"}: {invoice.stage}
                    </div>
                  )}
                </td>
                <td className="col-quantity">1</td>
                <td className="col-unit">{formatMoney(subtotal)}</td>
                <td className="col-total">{formatMoney(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount Summary */}
        <div className="invoice-print-summary">
          <div className="invoice-print-summary-left">
            {invoice.payment_id && (
              <div className="invoice-print-summary-note">
                <strong>{isRTL ? "رقم الدفعة" : "Payment Reference"}:</strong> #{invoice.payment_id}
              </div>
            )}
            {invoice.description && (
              <div className="invoice-print-summary-note">
                <strong>{isRTL ? "ملاحظات" : "Notes"}:</strong> {invoice.description}
              </div>
            )}
          </div>
          <div className="invoice-print-summary-right">
            <table className="invoice-print-totals-table">
              <tbody>
                <tr>
                  <td className="invoice-print-total-label">
                    {isRTL ? "المبلغ الإجمالي" : "Subtotal"}:
                  </td>
                  <td className="invoice-print-total-value">{formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td className="invoice-print-total-label">
                    {isRTL ? "ضريبة القيمة المضافة (5%)" : "VAT (5%)"}:
                  </td>
                  <td className="invoice-print-total-value">{formatMoney(vatAmount)}</td>
                </tr>
                <tr className="invoice-print-grand-total">
                  <td className="invoice-print-total-label">
                    <strong>{isRTL ? "المبلغ الإجمالي شامل الضريبة" : "Grand Total (Incl. VAT)"}:</strong>
                  </td>
                  <td className="invoice-print-total-value">
                    <strong>{formatMoney(grandTotal)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="invoice-print-amount-words">
              <strong>{isRTL ? "المبلغ كتابة" : "Amount in Words"}:</strong>
              <p>
                {isRTL 
                  ? `${amountInWords(grandTotal)} درهم إماراتي فقط لا غير`
                  : `${amountInWords(grandTotal)} UAE Dirhams Only`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-print-footer">
          <div className="invoice-print-footer-section">
            <div className="invoice-print-signature-box">
              <div className="invoice-print-signature-line"></div>
              <p className="invoice-print-signature-label">
                {isRTL ? "التوقيع المعتمد" : "Authorized Signature"}
              </p>
            </div>
          </div>
          <div className="invoice-print-footer-section">
            <div className="invoice-print-signature-box">
              <div className="invoice-print-signature-line"></div>
              <p className="invoice-print-signature-label">
                {isRTL ? "استلمت" : "Received By"}
              </p>
            </div>
          </div>
          <div className="invoice-print-footer-section">
            <div className="invoice-print-stamp-area">
              <p className="invoice-print-stamp-label">
                {isRTL ? "ختم الشركة" : "Company Stamp"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="invoice-print-footer-notes">
          <p>
            {isRTL 
              ? "هذه الفاتورة صادرة إلكترونياً وتعتبر صحيحة بدون توقيع"
              : "This invoice is issued electronically and is considered valid without signature"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

