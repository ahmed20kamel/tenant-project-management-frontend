import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import { calculateAgeFromEmiratesId } from "../../../utils/inputFormatters";

export default function OwnersPage() {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // حذف فردي
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetOwner, setTargetOwner] = useState(null);
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

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const loadOwners = useCallback(async () => {
    setLoading(true);
    try {
      const { data: projects } = await api.get("projects/");
      const items = Array.isArray(projects) ? projects : (projects?.results || projects?.items || projects?.data || []);
      
      const ownersMap = new Map();

      await Promise.all(
        items.map(async (p) => {
          const projectId = p.id;
          try {
            const { data: sp } = await api.get(`projects/${projectId}/siteplan/`);
            const first = Array.isArray(sp) ? sp[0] : null;
            // ✅ عرض المالك المفوض (Single Source of Truth) وإلا أول مالك
            if (first?.owners?.length) {
              const owner = first.owners.find((o) => o.is_authorized) || first.owners[0];
              // التأكد من وجود owner_name_ar و owner_name_en
              const ownerNameAr = owner?.owner_name_ar || owner?.owner_name || "";
              const ownerNameEn = owner?.owner_name_en || "";
              const ownerName = ownerNameAr || ownerNameEn;
              
              if (ownerName) {
                // ✅ استخدام id_number كـ key إضافي لتمييز الملاك المختلفين بنفس الاسم
                const idNumber = owner?.id_number || "";
                const key = `${ownerName.toLowerCase().trim()}_${idNumber}`;
                
                if (!ownersMap.has(key)) {
                  ownersMap.set(key, {
                    name: ownerName,
                    nameAr: ownerNameAr,
                    nameEn: ownerNameEn,
                    projects: [],
                    fullData: {
                      ...owner,
                      // ✅ التأكد من وجود جميع البيانات
                      id_number: owner?.id_number || "",
                      nationality: owner?.nationality || "",
                      phone: owner?.phone || "",
                      email: owner?.email || "",
                      id_issue_date: owner?.id_issue_date || "",
                      id_expiry_date: owner?.id_expiry_date || "",
                      id_attachment: owner?.id_attachment || "",
                      right_hold_type: owner?.right_hold_type || "",
                      share_possession: owner?.share_possession || "",
                      share_percent: owner?.share_percent || "",
                      age: owner?.age || null,  // ✅ العمر من الـ backend (إن وجد)
                    },
                  });
                }
                const ownerData = ownersMap.get(key);
                if (!ownerData.projects.find((pr) => pr.id === projectId)) {
                  ownerData.projects.push({
                    id: projectId,
                    name: p?.display_name || p?.name || `Project #${projectId}`,
                    internalCode: p?.internal_code,
                  });
                }
              }
            }
          } catch (e) {}
        })
      );

      const ownersList = Array.from(ownersMap.values()).sort((a, b) => 
        (a.nameAr || a.name).localeCompare(b.nameAr || b.name, isAR ? "ar" : "en")
      );

      // إضافة key فريد لكل مالك
      const ownersWithKey = ownersList.map((o) => ({
        ...o,
        __key: `${(o.nameAr || o.name || "").toLowerCase().trim()}_${o.fullData?.id_number || ""}`,
      }));

      setOwners(ownersWithKey);
    } catch (e) {
      console.error("Error loading owners:", e);
      setOwners([]);
      showToast("error", t("load_error") || "Error loading owners");
    } finally {
      setLoading(false);
    }
  }, [isAR, t]);

  useEffect(() => {
    loadOwners();
    return () => clearTimeout(toastTimer.current);
  }, [loadOwners]);

  useEffect(() => {
    const handler = () => loadOwners();
    window.addEventListener("siteplan-owners-updated", handler);
    window.addEventListener("contract-updated", handler);
    return () => {
      window.removeEventListener("siteplan-owners-updated", handler);
      window.removeEventListener("contract-updated", handler);
    };
  }, [loadOwners]);

  const filteredOwners = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return owners.filter((owner) => {
      if (!q) return true;
      return (
        owner.name.toLowerCase().includes(q) ||
        owner.nameAr?.toLowerCase().includes(q) ||
        owner.nameEn?.toLowerCase().includes(q) ||
        owner.fullData?.nationality?.toLowerCase().includes(q) ||
        owner.fullData?.id_number?.toLowerCase().includes(q)
      );
    });
  }, [owners, filters]);

  const isAllSelected =
    filteredOwners.length > 0 && filteredOwners.every((o) => selectedKeys.has(o.__key));

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
      return new Set(filteredOwners.map((o) => o.__key));
    });
  };

  const askDelete = (owner) => {
    setTargetOwner({ key: owner.__key, name: owner.name });
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!targetOwner?.key) return;
    const key = targetOwner.key;
    try {
      setDeletingKey(key);
      // حذف من القائمة المحلية (owners مشتقة من projects)
      setOwners((prev) => prev.filter((o) => o.__key !== key));
      setSelectedKeys((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      showToast("success", t("delete_success") || "Owner removed from list");
      setConfirmOpen(false);
      setTargetOwner(null);
    } catch (e) {
      console.error("Delete failed:", e);
      showToast("error", t("delete_error") || "Error deleting owner");
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
    setOwners((prev) => prev.filter((o) => !selectedKeys.has(o.__key)));
    setSelectedKeys(new Set());
    setBulkDeleting(false);
    setBulkConfirmOpen(false);
    showToast("success", t("bulk_delete_success")?.replace("{{count}}", keys.length) || `Removed ${keys.length} owners from list`);
  };

  const selectedCount = selectedKeys.size;

  const clearFilters = () => setFilters({ q: "" });

  const handleOwnerClick = (owner) => {
    navigate(`/owners/${encodeURIComponent(owner.name)}`, { 
      state: { ownerData: owner } 
    });
  };


  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="list-page">
        <div className="list-header">
          <div>
            <h1 className="list-title">{t("owners")}</h1>
            <p className="prj-subtitle">{t("owners_page_subtitle")}</p>
          </div>
        </div>

        {/* شريط الفلاتر */}
        <div className="prj-filters">
          <div className="prj-filters__grid">
            <input 
              className="prj-input" 
              placeholder={t("search_owners")} 
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

        {filteredOwners.length === 0 ? (
          <div className="prj-alert">
            <div className="prj-alert__title">
              {filters.q ? t("no_owners_match_search") : t("no_owners_found")}
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
                  <th>{t("owner_name")}</th>
                  <th>{t("owner_name_en") || "Owner Name (EN)"}</th>
                  <th>{t("nationality")}</th>
                  <th>{t("age")}</th>
                  <th>{t("id_number")}</th>
                  <th>{t("projects_count")}</th>
                  <th style={{ minWidth: "200px" }}>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwners.map((owner, idx) => {
                  const checked = selectedKeys.has(owner.__key);
                  // ✅ استخدام العمر من الـ backend إن وجد، وإلا نحسبه من رقم الهوية
                  const age = owner.fullData?.age ?? calculateAgeFromEmiratesId(owner.fullData?.id_number);
                  return (
                    <tr key={owner.__key}>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          aria-label={`${t("select")} ${owner.name}`} 
                          checked={checked} 
                          onChange={() => toggleSelect(owner.__key)} 
                        />
                      </td>
                      <td className="prj-muted">{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{owner.name}</div>
                        {owner.nameAr && owner.nameEn && (
                          <div className="prj-cell__sub prj-muted" style={{ fontSize: "12px" }}>
                            {owner.nameAr !== owner.name && owner.nameAr}
                          </div>
                        )}
                      </td>
                      <td>
                        {owner.nameEn ? (
                          <span style={{ direction: "ltr", textAlign: "left", display: "inline-block" }}>
                            {owner.nameEn}
                          </span>
                        ) : (
                          <span className="prj-muted">—</span>
                        )}
                      </td>
                      <td>{owner.fullData?.nationality || <span className="prj-muted">—</span>}</td>
                      <td>
                        {age !== null ? (
                          <span className="prj-badge">
                            {age} {isAR ? t("year") : t("years")}
                          </span>
                        ) : (
                          <span className="prj-muted">—</span>
                        )}
                      </td>
                      <td>
                        <code className="prj-code">{owner.fullData?.id_number || t("empty_value")}</code>
                      </td>
                      <td>
                        <span className="prj-badge is-on">
                          {owner.projects.length} {t("projects")}
                        </span>
                      </td>
                      <td className="prj-actions">
                        <Button
                          variant="primary"
                          onClick={() => handleOwnerClick(owner)}
                          className="prj-btn prj-btn--primary"
                        >
                          {t("view")}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/owners/${encodeURIComponent(owner.name)}/edit`, { state: { ownerData: owner } })}
                          className="prj-btn prj-btn--secondary"
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => askDelete(owner)}
                          className="prj-btn prj-btn--danger"
                          disabled={deletingKey === owner.__key}
                        >
                          {deletingKey === owner.__key ? t("deleting") : t("delete")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={9} className="prj-foot prj-muted">
                    {t("total")}: {filteredOwners.length} / {owners.length} {t("owners")}
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
          desc={t("confirm_delete_owner") || `Are you sure you want to remove ${targetOwner?.name} from the list?`}
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
              {t("bulk_delete_desc")} <strong>{selectedCount}</strong> {t("owners")}. {t("bulk_delete_continue")}
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

