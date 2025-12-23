import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";

export default function ConsultantsPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // حذف فردي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetConsultant, setTargetConsultant] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);

  // تحديد متعدد + حذف جماعي
  const [selectedKeys, setSelectedKeys] = useState(new Set());
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
    loadConsultants();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const loadConsultants = async () => {
    setLoading(true);
    try {
      // ✅ استخدام API الجديد للاستشاريين
      const { data } = await api.get("consultants/");
      const consultantsList = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      
      // ✅ تحويل البيانات إلى الشكل المطلوب مع دمج الأدوار لنفس المشروع
      const consultantsWithKey = consultantsList.map((consultant) => {
        // تجميع المشاريع حسب project_id لعدم تكرار نفس المشروع بين تصميم/إشراف
        const projectMap = new Map();
        if (consultant.projects && Array.isArray(consultant.projects)) {
          consultant.projects.forEach((pc) => {
            const pid = pc.project_id;
            if (!pid) return;
            if (!projectMap.has(pid)) {
              projectMap.set(pid, {
                id: pid,
                name: pc.project_name,
                roles: new Set(),
              });
            }
            projectMap.get(pid).roles.add(pc.role);
          });
        }

        const allProjects = Array.from(projectMap.values()).map((p) => ({
          id: p.id,
          name: p.name,
          roles: Array.from(p.roles),
        }));

        return {
          id: consultant.id,
          name: consultant.name,
          name_en: consultant.name_en || "",
          licenseNo: consultant.license_no || "",
          image: consultant.image_url || null,
          phone: consultant.phone || "",
          email: consultant.email || "",
          address: consultant.address || "",
          notes: consultant.notes || "",
          projects: allProjects,
          projects_count: allProjects.length,
          __key: `consultant_${consultant.id}`,
        };
      }).sort((a, b) =>
        a.name.localeCompare(b.name, isAR ? "ar" : "en")
      );

      setConsultants(consultantsWithKey);
    } catch (e) {
      console.error("Error loading consultants:", e);
      setConsultants([]);
      showToast("error", t("load_error") || "Error loading consultants");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const filteredConsultants = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return consultants.filter((consultant) => {
      if (!q) return true;
      return (
        consultant.name.toLowerCase().includes(q) ||
        consultant.name_en?.toLowerCase().includes(q) ||
        consultant.licenseNo?.toLowerCase().includes(q)
      );
    });
  }, [consultants, filters]);

  const isAllSelected =
    filteredConsultants.length > 0 && filteredConsultants.every((c) => selectedKeys.has(c.__key));

  const toggleSelect = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      if (isAllSelected) return new Set();
      return new Set(filteredConsultants.map((c) => c.__key));
    });
  };

  const askDelete = (consultant) => {
    setTargetConsultant({ key: consultant.__key, name: consultant.name });
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!targetConsultant?.key) return;
    const consultant = consultants.find((c) => c.__key === targetConsultant.key);
    if (!consultant?.id) return;
    
    try {
      setDeletingKey(targetConsultant.key);
      // ✅ حذف من API
      await api.delete(`consultants/${consultant.id}/`);
      
      // ✅ حذف من القائمة المحلية
      setConsultants((prev) => prev.filter((c) => c.__key !== targetConsultant.key));
      setSelectedKeys((prev) => {
        const n = new Set(prev);
        n.delete(targetConsultant.key);
        return n;
      });
      showToast("success", t("delete_success") || "Consultant deleted successfully");
      setConfirmOpen(false);
      setTargetConsultant(null);
    } catch (e) {
      console.error("Delete failed:", e);
      showToast("error", t("delete_error") || "Error deleting consultant");
    } finally {
      setDeletingKey(null);
    }
  };

  const askBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    setBulkDeleting(true);
    const keys = Array.from(selectedKeys);
    const consultantsToDelete = consultants.filter((c) => selectedKeys.has(c.__key));
    
    try {
      // ✅ حذف من API
      await Promise.all(
        consultantsToDelete
          .filter((c) => c.id)
          .map((c) => api.delete(`consultants/${c.id}/`))
      );
      
      // ✅ حذف من القائمة المحلية
      setConsultants((prev) => prev.filter((c) => !selectedKeys.has(c.__key)));
      setSelectedKeys(new Set());
      setBulkConfirmOpen(false);
      showToast("success", t("bulk_delete_success")?.replace("{{count}}", keys.length) || `Deleted ${keys.length} consultants`);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      showToast("error", t("bulk_delete_error") || "Error deleting consultants");
    } finally {
      setBulkDeleting(false);
    }
  };

  const selectedCount = selectedKeys.size;

  const clearFilters = () => setFilters({ q: "" });

  const handleConsultantClick = (consultant) => {
    navigate(`/consultants/${consultant.id}`, { 
      state: { consultantData: consultant } 
    });
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <div className="list-header">
          <div>
            <h1 className="list-title">{t("consultants")}</h1>
            <p className="prj-subtitle">{t("consultants_page_subtitle")}</p>
          </div>
          <div>
            <Button
              variant="primary"
              onClick={() => navigate("/consultants/new")}
            >
              {t("add_consultant") || "إضافة استشاري جديد"}
            </Button>
          </div>
        </div>

        {/* شريط الفلاتر */}
        <div className="prj-filters">
          <div className="prj-filters__grid">
            <input 
              className="prj-input" 
              placeholder={t("search_consultants")} 
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
              <Button variant="ghost" onClick={() => setSelectedKeys(new Set())}>
                {t("clear_selection")}
              </Button>
            </div>
          </div>
        )}

        {filteredConsultants.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">
              {filters.q ? t("no_consultants_match_search") : t("no_consultants_found")}
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
                  <th>{t("consultant_name")}</th>
                  <th>{t("license_number")}</th>
                  <th>{t("projects_count")}</th>
                  <th style={{ minWidth: "200px" }}>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultants.map((consultant, idx) => {
                  const checked = selectedKeys.has(consultant.__key);
                  return (
                    <tr key={consultant.__key}>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          aria-label={`${t("select")} ${consultant.name}`} 
                          checked={checked} 
                          onChange={() => toggleSelect(consultant.__key)} 
                        />
                      </td>
                      <td className="prj-muted">{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{consultant.name}</div>
                        {consultant.name_en && (
                          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                            {consultant.name_en}
                          </div>
                        )}
                      </td>
                      <td>
                        <code className="prj-code">{consultant.licenseNo || t("empty_value")}</code>
                      </td>
                      <td>
                        <span className="prj-badge is-on">
                          {consultant.projects.length} {t("projects")}
                        </span>
                      </td>
                      <td className="prj-actions">
                        <Button
                          variant="primary"
                          onClick={() => handleConsultantClick(consultant)}
                          className="prj-btn prj-btn--primary"
                        >
                          {t("view")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/consultants/${consultant.id}/edit`, { state: { consultantData: consultant } })}
                          className="prj-btn prj-btn--secondary"
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => askDelete(consultant)}
                          className="prj-btn prj-btn--danger"
                          disabled={deletingKey === consultant.__key}
                        >
                          {deletingKey === consultant.__key ? t("deleting") : t("delete")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="prj-foot prj-muted">
                    {t("total")}: {filteredConsultants.length} / {consultants.length} {t("consultants")}
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
          desc={t("confirm_delete_consultant") || `Are you sure you want to remove ${targetConsultant?.name} from the list?`}
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
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("consultants")}. {t("bulk_delete_continue")}
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

