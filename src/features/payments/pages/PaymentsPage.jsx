import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import UnifiedSelect from "../../../components/common/Select";
import { formatMoney } from "../../../utils/formatters";

export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // حذف فردي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // تحديد متعدد + حذف جماعي
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toast بسيط
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // ===== فلاتر منظّمة =====
  const [filters, setFilters] = useState({
    q: "",
    payer: "",
    payment_method: "",
    project: "",
  });

  useEffect(() => {
    loadPayments();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("payments/");
      const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      setPayments(items || []);
    } catch (e) {
      console.error("Error loading payments:", e);
      setPayments([]);
      showToast("error", t("load_error") || "Error loading payments");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("empty_value");
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("empty_value");
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return isAR ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
    } catch {
      return t("empty_value");
    }
  };

  const filteredPayments = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const payer = filters.payer;
    const paymentMethod = filters.payment_method;
    const project = filters.project;

    return payments.filter((p) => {
      const hay = [
        p?.project_name || "",
        p?.description || "",
        p?.amount?.toString() || "",
        p?.payer || "",
        p?.payment_method || "",
      ]
        .join(" ")
        .toLowerCase();

      if (q && !hay.includes(q)) return false;
      if (payer && payer !== (p?.payer || "")) return false;
      if (paymentMethod && paymentMethod !== (p?.payment_method || "")) return false;
      if (project && project !== (p?.project?.toString() || "")) return false;

      return true;
    });
  }, [payments, filters, isAR]);

  const uniqueValues = (getter) => {
    const s = new Set();
    payments.forEach((p) => {
      const v = getter(p);
      if (v) s.add(v);
    });
    return Array.from(s);
  };

  const payers = useMemo(() => uniqueValues((p) => p?.payer), [payments]);
  const paymentMethods = useMemo(() => uniqueValues((p) => p?.payment_method), [payments]);
  const projects = useMemo(() => {
    const s = new Map();
    payments.forEach((p) => {
      if (p?.project && p?.project_name) {
        s.set(p.project.toString(), p.project_name);
      }
    });
    return Array.from(s.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const isAllSelected =
    filteredPayments.length > 0 && filteredPayments.every((p) => selectedIds.has(p.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (isAllSelected) return new Set();
      return new Set(filteredPayments.map((p) => p.id));
    });
  };

  const askDelete = (p) => {
    const title = `Payment #${p.id} - ${formatMoney(p.amount)}`;
    setTargetPayment({ id: p.id, name: title });
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!targetPayment?.id) return;
    const id = targetPayment.id;
    try {
      setDeletingId(id);
      await api.delete(`payments/${id}/`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      showToast("success", t("delete_success") || "Payment deleted successfully");
      setConfirmOpen(false);
      setTargetPayment(null);
    } catch (e) {
      console.error("Delete failed:", e);
      showToast("error", t("delete_error") || "Error deleting payment");
    } finally {
      setDeletingId(null);
    }
  };

  const askBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try { 
        await api.delete(`payments/${id}/`); 
        ok += 1; 
      } catch (e) { 
        console.error("Bulk delete failed for id", id, e); 
        fail += 1; 
      }
    }
    setPayments(prev => prev.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkConfirmOpen(false);
    if (fail === 0) showToast("success", t("bulk_delete_success")?.replace("{{count}}", ok) || `Deleted ${ok} payments successfully`);
    else if (ok === 0) showToast("error", t("bulk_delete_error") || "Failed to delete payments");
    else showToast("error", t("bulk_delete_partial")?.replace("{{ok}}", ok).replace("{{fail}}", fail) || `Deleted ${ok}, failed ${fail}`);
  };

  const selectedCount = selectedIds.size;

  const clearFilters = () =>
    setFilters({
      q: "",
      payer: "",
      payment_method: "",
      project: "",
    });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <div className="list-header">
          <div>
            <h1 className="list-title">{t("payments_title")}</h1>
            <p className="prj-subtitle">{t("payments_subtitle")}</p>
          </div>
          <div className="list-header__actions">
            <Button 
              onClick={() => navigate("/payments/create")} 
              variant="primary"
              className="prj-btn prj-btn--primary"
            >
              {t("add_payment")}
            </Button>
          </div>
        </div>

        {/* شريط الفلاتر */}
        <div className="prj-filters">
          <div className="prj-filters__grid">
            <input 
              className="prj-input" 
              placeholder={t("general_search")} 
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} 
            />
            <UnifiedSelect
              options={[
                { value: "", label: `${t("payer")} (${t("all")})` },
                ...payers.map((p) => ({
                  value: p,
                  label: p === "bank" ? (t("payer_bank") || "Bank") : (t("payer_owner") || "Owner")
                }))
              ]}
              value={filters.payer}
              onChange={(value) => setFilters((f) => ({ ...f, payer: value }))}
              placeholder={`${t("payer")} (${t("all")})`}
            />
            <UnifiedSelect
              options={[
                { value: "", label: `${t("payment_method")} (${t("all")})` },
                ...paymentMethods.map((m) => ({
                  value: m,
                  label: t(`payment_method_${m}`) || m
                }))
              ]}
              value={filters.payment_method}
              onChange={(value) => setFilters((f) => ({ ...f, payment_method: value }))}
              placeholder={`${t("payment_method")} (${t("all")})`}
            />
            <UnifiedSelect
              options={[
                { value: "", label: `${t("project_name")} (${t("all")})` },
                ...projects.map((proj) => ({
                  value: proj.id.toString(),
                  label: proj.name
                }))
              ]}
              value={filters.project}
              onChange={(value) => setFilters((f) => ({ ...f, project: value }))}
              placeholder={`${t("project_name")} (${t("all")})`}
            />
          </div>

          <div className="prj-filters__actions">
            <Button variant="ghost" onClick={clearFilters}>
              {t("clear_filters")}
            </Button>
          </div>
        </div>

        {/* شريط إجراءات عند وجود تحديد */}
        {selectedCount > 0 && (
          <div className="prj-bulkbar">
            <div className="prj-bulkbar__info">
              {t("selected")} <strong>{selectedCount}</strong>
            </div>
            <div className="prj-bulkbar__actions">
              <Button variant="danger" onClick={askBulkDelete}>
                {t("delete_selected")}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                {t("clear_selection")}
              </Button>
            </div>
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">
              {t("no_payments")}
            </div>
          </div>
        ) : (
          <div className="prj-table__wrapper">
            <table className="prj-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }} className="text-center">
                    <input 
                      type="checkbox" 
                      aria-label={t("select_all")} 
                      checked={isAllSelected} 
                      onChange={toggleSelectAll} 
                    />
                  </th>
                  <th>#</th>
                  <th>{t("project_name")}</th>
                  <th>{t("payer")}</th>
                  <th>{t("payment_method")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("payment_date")}</th>
                  <th>{t("description")}</th>
                  <th style={{ minWidth: "200px" }}>{t("action")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment, i) => {
                  const checked = selectedIds.has(payment.id);
                  return (
                    <tr key={payment.id}>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          aria-label={`${t("select")} Payment #${payment.id}`} 
                          checked={checked} 
                          onChange={() => toggleSelect(payment.id)} 
                        />
                      </td>
                      <td className="prj-muted">{i + 1}</td>
                      <td>
                        {payment.project ? (
                          <Link to={`/projects/${payment.project}`} className="prj-link">
                            {payment.project_name || t("empty_value")}
                          </Link>
                        ) : (
                          <span className="prj-muted">{t("no_project")}</span>
                        )}
                      </td>
                      <td>
                        {payment.payer === "bank" 
                          ? (t("payer_bank") || "Bank")
                          : (t("payer_owner") || "Owner")
                        }
                      </td>
                      <td>
                        {payment.payment_method 
                          ? (t(`payment_method_${payment.payment_method}`) || payment.payment_method)
                          : t("empty_value")
                        }
                      </td>
                      <td className="prj-nowrap prj-info-value--money">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="prj-nowrap">{formatDate(payment.date)}</td>
                      <td>{payment.description || t("empty_value")}</td>
                      <td className="prj-actions">
                        <Button
                          variant="primary"
                          onClick={() => navigate(`/payments/${payment.id}/view`)}
                          className="prj-btn prj-btn--primary"
                        >
                          {t("view")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/payments/${payment.id}/edit`)}
                          className="prj-btn prj-btn--secondary"
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => askDelete(payment)}
                          className="prj-btn prj-btn--danger"
                          disabled={deletingId === payment.id}
                        >
                          {deletingId === payment.id ? t("deleting") : t("delete")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9} className="prj-foot prj-muted">
                    {t("total")}: {formatMoney(totalAmount)} ({filteredPayments.length} {t("payments_count")})
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "fixed",
              bottom: "24px",
              [isAR ? "left" : "right"]: "24px",
              padding: "12px 24px",
              backgroundColor: toast.type === "success" ? "#10b981" : "#ef4444",
              color: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              zIndex: 10000,
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <Dialog
          open={confirmOpen}
          title={t("confirm_delete")}
          desc={t("confirm_delete_payment") || `Are you sure you want to delete ${targetPayment?.name}?`}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
          danger
        />

        {/* Bulk Delete Confirm Dialog */}
        <Dialog
          open={bulkConfirmOpen}
          title={t("bulk_delete")}
          desc={
            <>
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("payments_count")}. {t("bulk_delete_continue")}
            </>
          }
          confirmLabel={t("delete_confirm")}
          cancelLabel={t("cancel")}
          onClose={() => setBulkConfirmOpen(false)}
          onConfirm={handleBulkDelete}
          danger
          busy={bulkDeleting}
        />
      </div>
    </PageLayout>
  );
}
