import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatMoney, formatDate } from "../../utils/formatters";
import Button from "../common/Button";
import "./InvoiceTable.css";

/**
 * Professional Invoice Table Component
 * Displays Initial and Actual invoices in a clean, organized table
 */
export default function InvoiceTable({
  invoices = [],
  type = "initial", // "initial" or "actual"
  onSelect,
  onEdit,
  onDelete,
  onView,
  selectedId = null,
  showActions = true,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getStatusBadge = (invoice) => {
    if (type === "initial") {
      const remaining = invoice.remaining_balance || 0;
      if (remaining <= 0) {
        return { label: t("invoice_status_closed") || "Closed", color: "#10b981", bg: "#d1fae5" };
      }
      return { label: t("invoice_status_open") || "Open", color: "#f59e0b", bg: "#fef3c7" };
    }
    return null;
  };

  if (invoices.length === 0) {
    return (
      <div className="invoice-table-empty">
        <p>{type === "initial" ? t("no_initial_invoices") : t("no_actual_invoices")}</p>
      </div>
    );
  }

  return (
    <div className="invoice-table-wrapper">
      <table className="invoice-table">
        <thead>
          <tr>
            <th>{t("invoice_number") || "Invoice #"}</th>
            <th>{t("invoice_type") || "Type"}</th>
            <th className="text-right">{t("amount") || "Amount"}</th>
            {type === "initial" && (
              <>
                <th className="text-right">{t("paid_amount") || "Paid"}</th>
                <th className="text-right">{t("remaining_balance") || "Remaining"}</th>
              </>
            )}
            <th>{t("invoice_date") || "Date"}</th>
            {type === "actual" && <th>{t("linked_payment") || "Payment"}</th>}
            {type === "initial" && <th>{t("status") || "Status"}</th>}
            {showActions && <th className="text-center">{t("actions") || "Actions"}</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const status = getStatusBadge(invoice);
            const isSelected = selectedId === invoice.id;
            const paidAmount = type === "initial" 
              ? (parseFloat(invoice.amount) - parseFloat(invoice.remaining_balance || invoice.amount))
              : null;

            return (
              <tr
                key={invoice.id}
                className={isSelected ? "invoice-table-row--selected" : ""}
                onClick={() => onSelect && onSelect(invoice.id)}
              >
                <td className="invoice-table-cell--invoice-number">
                  <strong>{invoice.invoice_number || `#${invoice.id}`}</strong>
                </td>
                <td>
                  <span className="invoice-type-badge invoice-type-badge--initial">
                    {type === "initial" ? t("initial_invoice") : t("actual_invoice")}
                  </span>
                </td>
                <td className="text-right invoice-table-cell--amount">
                  <strong>{formatMoney(invoice.amount)}</strong>
                </td>
                {type === "initial" && (
                  <>
                    <td className="text-right invoice-table-cell--paid">
                      {formatMoney(paidAmount)}
                    </td>
                    <td className="text-right invoice-table-cell--remaining">
                      <strong style={{ color: status?.color }}>{formatMoney(invoice.remaining_balance || 0)}</strong>
                    </td>
                  </>
                )}
                <td>{formatDate(invoice.invoice_date)}</td>
                {type === "actual" && (
                  <td>
                    {invoice.payment_id ? (
                      <span className="invoice-payment-link">
                        {t("payment")} #{invoice.payment_id}
                      </span>
                    ) : (
                      <span className="invoice-payment-link--none">—</span>
                    )}
                  </td>
                )}
                {type === "initial" && (
                  <td>
                    {status && (
                      <span
                        className="invoice-status-badge"
                        style={{
                          backgroundColor: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.label}
                      </span>
                    )}
                  </td>
                )}
                {showActions && (
                  <td className="text-center">
                    <div className="invoice-table-actions" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => navigate(`/invoices/${type}/${invoice.id}/view`)}
                        title={t("view") || "View"}
                      >
                        👁️
                      </Button>
                      {onEdit && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => onEdit(invoice)}
                          title={t("edit") || "Edit"}
                        >
                          {t("edit")}
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => onDelete(invoice)}
                          title={t("delete") || "Delete"}
                        >
                          {t("delete")}
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

