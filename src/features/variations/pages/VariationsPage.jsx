import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import { formatMoney } from "../../../utils/formatters";

export default function VariationsPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // حذف فردي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetVariation, setTargetVariation] = useState(null);
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
  });

  useEffect(() => {
    loadVariations();
    return () => clearTimeout(toastTimer.current);
  }, []);


  const loadVariations = async () => {
    setLoading(true);
    try {
      // Load variations from all projects
      const { data: projectsData } = await api.get("projects/");
      const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || projectsData?.items || projectsData?.data || []);
      
      const allVariations = [];
      for (const project of projectsList) {
        try {
          const { data: variationsData } = await api.get(`projects/${project.id}/variations/`);
          const variationsList = Array.isArray(variationsData) ? variationsData : (variationsData?.results || variationsData?.items || variationsData?.data || []);
          variationsList.forEach(v => {
            allVariations.push({ ...v, project_name: project.display_name || project.name || `Project #${project.id}` });
          });
        } catch (e) {
          // Project might not have variations
        }
      }
      
      setVariations(allVariations);
    } catch (e) {
      console.error("Error loading variations:", e);
      setVariations([]);
      showToast("error", t("load_error") || "Error loading variations");
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

  const filteredVariations = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return variations.filter((variation) => {
      if (!q) return true;
      return (
        (variation.project_name || "").toLowerCase().includes(q) ||
        (variation.description || "").toLowerCase().includes(q) ||
        (variation.approved_by || "").toLowerCase().includes(q) ||
        (variation.amount || "").toString().includes(q)
      );
    });
  }, [variations, filters]);

  const isAllSelected =
    filteredVariations.length > 0 && filteredVariations.every((v) => selectedIds.has(v.id));

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
      return new Set(filteredVariations.map((v) => v.id));
    });
  };

  const askDelete = (variation) => {
    const title = variation.description || `Variation #${variation.id}`;
    setTargetVariation({ id: variation.id, name: title, project: variation.project });
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!targetVariation?.id) return;
    const { id, project } = targetVariation;
    try {
      setDeletingId(id);
      await api.delete(`projects/${project}/variations/${id}/`);
      setVariations((prev) => prev.filter((v) => v.id !== id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      showToast("success", t("delete_success") || "Variation deleted successfully");
      setConfirmOpen(false);
      setTargetVariation(null);
    } catch (e) {
      console.error("Delete failed:", e);
      showToast("error", t("delete_error") || "Error deleting variation");
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
        const variation = variations.find(v => v.id === id);
        if (!variation || !variation.project) {
          fail += 1;
          continue;
        }
        await api.delete(`projects/${variation.project}/variations/${id}/`);
        ok += 1;
      } catch (e) {
        console.error("Bulk delete failed for id", id, e);
        fail += 1;
      }
    }
    setVariations(prev => prev.filter(v => !selectedIds.has(v.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkConfirmOpen(false);
    if (fail === 0) showToast("success", t("bulk_delete_success")?.replace("{{count}}", ok) || `Deleted ${ok} variations successfully`);
    else if (ok === 0) showToast("error", t("bulk_delete_error") || "Failed to delete variations");
    else showToast("error", t("bulk_delete_partial")?.replace("{{ok}}", ok).replace("{{fail}}", fail) || `Deleted ${ok}, failed ${fail}`);
  };

  const selectedCount = selectedIds.size;

  const clearFilters = () => setFilters({ q: "" });

  const openAddDialog = () => {
    navigate("/variations/create");
  };

  const openEditDialog = (variation) => {
    navigate(`/variations/${variation.id}/edit`);
  };

  const totalAmount = filteredVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <div className="list-header">
          <div>
            <h1 className="list-title">{t("variations_title") || "Variations / Change Orders"}</h1>
            <p className="prj-subtitle">{t("variations_subtitle") || "Manage project variations and change orders"}</p>
          </div>
          <div className="list-header__actions">
            <Button onClick={openAddDialog} variant="primary">
              {t("add_variation") || "Add Variation"}
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

        {filteredVariations.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">{t("no_variations") || "No variations found"}</div>
          </div>
        ) : (
          <>
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
                    <th>{t("amount")}</th>
                    <th>{t("approval_date") || "Approval Date"}</th>
                    <th>{t("approved_by") || "Approved By"}</th>
                    <th>{t("description")}</th>
                    <th style={{ minWidth: "200px" }}>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariations.map((variation, i) => {
                    const checked = selectedIds.has(variation.id);
                    return (
                      <tr key={variation.id}>
                        <td className="text-center">
                          <input 
                            type="checkbox" 
                            aria-label={`${t("select")} Variation #${variation.id}`} 
                            checked={checked} 
                            onChange={() => toggleSelect(variation.id)} 
                          />
                        </td>
                        <td className="prj-muted">{i + 1}</td>
                        <td>
                          {variation.project ? (
                            <Link to={`/projects/${variation.project}`} className="prj-link">
                              {variation.project_name || t("empty_value")}
                            </Link>
                          ) : (
                            <span className="prj-muted">{t("no_project")}</span>
                          )}
                        </td>
                        <td className="prj-nowrap prj-info-value--money">
                          {formatMoney(variation.amount)}
                        </td>
                        <td className="prj-nowrap">{formatDate(variation.approval_date)}</td>
                        <td>{variation.approved_by || t("empty_value")}</td>
                        <td>{variation.description || t("empty_value")}</td>
                        <td className="prj-actions">
                          <Button
                            variant="primary"
                            onClick={() => navigate(`/variations/${variation.id}`)}
                            className="prj-btn prj-btn--primary"
                          >
                            {t("view")}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => openEditDialog(variation)}
                            className="prj-btn prj-btn--secondary"
                          >
                            {t("edit")}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => askDelete(variation)}
                            className="prj-btn prj-btn--danger"
                            disabled={deletingId === variation.id}
                          >
                            {deletingId === variation.id ? t("deleting") : t("delete")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} className="prj-foot prj-muted">
                      {t("total")}: {formatMoney(totalAmount)} ({filteredVariations.length} {t("variations_count") || "variations"})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
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
          desc={t("confirm_delete_variation") || `Are you sure you want to delete ${targetVariation?.name}?`}
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
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("variations_count") || "variations"}. {t("bulk_delete_continue")}
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

