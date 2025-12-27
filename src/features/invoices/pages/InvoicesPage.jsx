import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import UnifiedSelect from "../../../components/common/Select";
import DateInput from "../../../components/fields/DateInput";
import { formatMoney, formatDate } from "../../../utils/formatters";
import "./InvoicesPage.css";

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]); // Actual invoices only
  
  // حذف فردي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState(null);
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
    project: "",
    date_from: "",
    date_to: "",
  });

  useEffect(() => {
    loadAllData();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      // Load projects
      const { data: projectsData } = await api.get("projects/");
      const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || projectsData?.items || projectsData?.data || []);
      setProjects(projectsList || []);
      
      // Load actual invoices from all projects only - NO PAYMENTS
      const invoicesPromises = [];
      for (const project of projectsList) {
        invoicesPromises.push(
          api.get(`projects/${project.id}/actual-invoices/`).then(res => {
            const items = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.items || res.data?.data || []);
            // Filter to ensure only invoices are included (not payments)
            return items
              .filter(item => {
                // Ensure it's an invoice, not a payment
                // Check if it has invoice-specific fields
                return item.invoice_number || item.invoice_date || (item.__type === 'actual' || item.type === 'invoice');
              })
              .map(inv => ({ 
                ...inv, 
                __type: 'actual', 
                __project: project,
                items: Array.isArray(inv.items) ? inv.items : []
              }));
          }).catch(() => [])
        );
      }
      
      const invoicesArrays = await Promise.all(invoicesPromises);
      const allInvoicesFlat = invoicesArrays.flat();
      // Final filter to ensure no payments are included and exclude invoices with linked payments
      const filteredInvoices = allInvoicesFlat.filter(item => {
        // Exclude anything that looks like a payment
        if (item.payment_date && !item.invoice_date) return false;
        if (item.payer && !item.invoice_number) return false;
        // Must have invoice_number or invoice_date to be considered an invoice
        if (!item.invoice_number && !item.invoice_date) return false;
        // Exclude invoices that are already linked to payments
        if (item.payment_id || item.payment) return false;
        return true;
      });
      setAllInvoices(filteredInvoices);
    } catch (e) {
      // Error loading data
      setProjects([]);
      setAllInvoices([]);
      showToast("error", t("loading_error") || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // Filtered invoices - Ensure only invoices, no payments
  const filteredInvoices = useMemo(() => {
    // First, filter out any items that might be payments
    let filtered = allInvoices.filter(inv => {
      // Must have invoice_number or invoice_date to be considered an invoice
      if (!inv.invoice_number && !inv.invoice_date) return false;
      // Exclude items that look like payments
      if (inv.payment_date && !inv.invoice_date) return false;
      if (inv.payer && !inv.invoice_number && !inv.invoice_date) return false;
      // Exclude invoices that are already linked to payments
      if (inv.payment_id || inv.payment) return false;
      // Must be an actual invoice
      return true;
    });
    
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.description || '').toLowerCase().includes(q) ||
        (inv.__project?.display_name || inv.__project?.name || '').toLowerCase().includes(q)
      );
    }
    
    if (filters.project) {
      filtered = filtered.filter(inv => inv.project?.toString() === filters.project || inv.__project?.id?.toString() === filters.project);
    }
    
    if (filters.date_from) {
      filtered = filtered.filter(inv => {
        if (!inv.invoice_date) return false;
        return new Date(inv.invoice_date) >= new Date(filters.date_from);
      });
    }
    
    if (filters.date_to) {
      filtered = filtered.filter(inv => {
        if (!inv.invoice_date) return false;
        const invDate = new Date(inv.invoice_date);
        const toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59, 999);
        return invDate <= toDate;
      });
    }
    
    return filtered.sort((a, b) => {
      const dateA = new Date(a.invoice_date || a.created_at || 0);
      const dateB = new Date(b.invoice_date || b.created_at || 0);
      return dateB - dateA;
    });
  }, [allInvoices, filters]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ✅ Check if all filtered invoices are selected
  const isAllSelected = filteredInvoices.length > 0 && 
    filteredInvoices.every(inv => selectedIds.has(inv.id));
  
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      // If all are selected, deselect all
      if (isAllSelected) {
        const newSet = new Set(prev);
        filteredInvoices.forEach(inv => newSet.delete(inv.id));
        return newSet;
      }
      // Otherwise, select all filtered invoices
      const newSet = new Set(prev);
      filteredInvoices.forEach(inv => newSet.add(inv.id));
      return newSet;
    });
  };

  const askDelete = (inv) => {
    const title = inv.invoice_number || `#${inv.id}`;
    setTargetInvoice({ id: inv.id, name: title, project: inv.project || inv.__project?.id });
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!targetInvoice?.id) return;
    const { id, project } = targetInvoice;
    try {
      setDeletingId(id);
      await api.delete(`projects/${project}/actual-invoices/${id}/`);
      setAllInvoices(prev => prev.filter(inv => inv.id !== id));
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      showToast("success", t("delete_success"));
      setConfirmOpen(false);
      setTargetInvoice(null);
    } catch (e) {
      // Delete failed
      showToast("error", t("delete_error"));
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
        const invoice = allInvoices.find(inv => inv.id === id);
        if (!invoice) {
          fail += 1;
          continue;
        }
        const projectId = invoice.project || invoice.__project?.id;
        await api.delete(`projects/${projectId}/actual-invoices/${id}/`);
        ok += 1;
      } catch (e) {
        // Bulk delete failed
        fail += 1;
      }
    }
    
    setAllInvoices(prev => prev.filter(inv => !selectedIds.has(inv.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkConfirmOpen(false);
    
    if (fail === 0) showToast("success", t("bulk_delete_success")?.replace("{{count}}", ok) || t("bulk_delete_success", { count: ok }));
    else if (ok === 0) showToast("error", t("bulk_delete_error"));
    else showToast("error", t("bulk_delete_partial")?.replace("{{ok}}", ok).replace("{{fail}}", fail) || t("bulk_delete_partial", { ok, fail }));
  };

  const selectedCount = selectedIds.size;

  const clearFilters = () =>
    setFilters({
      q: "",
      project: "",
      date_from: "",
      date_to: "",
    });

  const openAddInvoiceDialog = () => {
    navigate("/invoices/create");
  };

  const handlePrint = (invoice) => {
    navigate(`/invoices/${invoice.id}/view`);
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <div className="list-header">
          <div>
            <h1 className="list-title">{t("invoices_title")}</h1>
            <p className="prj-subtitle">{t("invoices_subtitle")}</p>
          </div>
          <div className="list-header__actions">
            <Button onClick={openAddInvoiceDialog} variant="primary">
              {t("add_invoice")}
            </Button>
          </div>
        </div>

        {/* شريط الفلاتر */}
        <div className="prj-filters">
          <div className="prj-filters__grid">
            <input
              type="text"
              className="prj-input"
              placeholder={t("search_invoices")}
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
            
            <UnifiedSelect
              options={projects}
              value={filters.project}
              onChange={(val) => setFilters({ ...filters, project: val })}
              placeholder={t("all_projects")}
              getOptionLabel={(opt) => opt.display_name || opt.name || `${t("project")} #${opt.id}`}
              getOptionValue={(opt) => opt.id?.toString()}
              isClearable
            />
            
            <DateInput
              className="prj-input"
              placeholder={t("date_from")}
              value={filters.date_from}
              onChange={(value) => setFilters({ ...filters, date_from: value })}
            />
            
            <DateInput
              className="prj-input"
              placeholder={t("date_to")}
              value={filters.date_to}
              onChange={(value) => setFilters({ ...filters, date_to: value })}
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
              <Button variant="danger" onClick={askBulkDelete} disabled={bulkDeleting}>
                {t("delete_selected")}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                {t("clear_selection")}
              </Button>
            </div>
          </div>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">
              {t("no_invoices_match")}
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
                  <th>{t("invoice_number")}</th>
                  <th>{t("project_name")}</th>
                  <th className="text-right">{t("amount")}</th>
                  <th>{t("invoice_date")}</th>
                  <th>{t("linked_payment")}</th>
                  <th style={{ minWidth: "200px" }}>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice, i) => {
                  const checked = selectedIds.has(invoice.id);

                  return (
                    <tr key={invoice.id}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(invoice.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="prj-muted">{i + 1}</td>
                      <td>
                        <strong>{invoice.invoice_number || `#${invoice.id}`}</strong>
                      </td>
                      <td>
                        {invoice.__project?.display_name || invoice.__project?.name || `${t("project")} #${invoice.project || invoice.__project?.id}`}
                      </td>
                      <td className="text-right prj-nowrap prj-info-value--money">
                        <strong>{formatMoney(invoice.amount)}</strong>
                      </td>
                      <td className="prj-nowrap">{formatDate(invoice.invoice_date)}</td>
                      <td>
                        {invoice.payment_id || invoice.payment ? (
                          <Link to={`/payments/${invoice.payment_id || invoice.payment}/view`} className="prj-link">
                            {t("view_payment")}
                          </Link>
                        ) : (
                          <span className="prj-muted">{t("no_payment")}</span>
                        )}
                      </td>
                      <td className="prj-actions">
                        <Button
                          variant="primary"
                          onClick={() => handlePrint(invoice)}
                          className="prj-btn prj-btn--primary"
                        >
                          {t("view")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                          className="prj-btn prj-btn--secondary"
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => askDelete(invoice)}
                          disabled={deletingId === invoice.id}
                          className="prj-btn prj-btn--danger"
                        >
                          {deletingId === invoice.id ? t("deleting") : t("delete")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={8} className="prj-foot prj-muted">
                    {t("total")}: {filteredInvoices.length} / {allInvoices.length} {t("invoices_count")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type === "success" ? "toast--ok" : "toast--err"}`} role="status" aria-live="polite">
            {toast.msg}
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <Dialog
          open={confirmOpen}
          title={t("confirm_delete")}
          desc={
            <>
              {t("confirm_delete_invoice")} <strong style={{marginInline: 6}}>{targetInvoice?.name}</strong>?<br/>
              {t("delete_cannot_undo")}
            </>
          }
          confirmLabel={deletingId ? t("deleting") : t("delete")}
          cancelLabel={t("cancel")}
          onClose={() => !deletingId && setConfirmOpen(false)}
          onConfirm={handleDelete}
          danger
          busy={!!deletingId}
        />

        {/* Bulk Delete Confirm Dialog */}
        <Dialog
          open={bulkConfirmOpen}
          title={t("bulk_delete")}
          desc={
            <>
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("invoices_count")}. {t("bulk_delete_continue")}
            </>
          }
          confirmLabel={bulkDeleting ? t("deleting") : t("delete_selected")}
          cancelLabel={t("cancel")}
          onClose={() => !bulkDeleting && setBulkConfirmOpen(false)}
          onConfirm={handleBulkDelete}
          danger
          busy={bulkDeleting}
        />
      </div>
    </PageLayout>
  );
}
