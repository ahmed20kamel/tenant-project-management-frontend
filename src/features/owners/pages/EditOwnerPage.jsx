import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Field from "../../../components/forms/Field";

export default function EditOwnerPage() {
  const { ownerName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  
  const [ownerData, setOwnerData] = useState(location.state?.ownerData || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    nationality: "",
    id_number: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (ownerData) {
      const fullData = ownerData.fullData || {};
      setForm({
        name_ar: ownerData.nameAr || ownerData.name || "",
        name_en: ownerData.nameEn || "",
        nationality: fullData.nationality || "",
        id_number: fullData.id_number || "",
        phone: fullData.phone || "",
        email: fullData.email || "",
      });
    } else {
      navigate("/owners");
    }
  }, [ownerData, navigate]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!ownerData || !form.name_ar.trim()) {
      setError(t("owner_name_required") || "Owner name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const projectsToUpdate = ownerData.projects || [];
      let updatedCount = 0;
      let failedCount = 0;

      // تحديث جميع المشاريع المرتبطة
      for (const project of projectsToUpdate) {
        try {
          // جلب بيانات SitePlan الحالية
          const { data: siteplans } = await api.get(`projects/${project.id}/siteplan/`);
          const siteplan = Array.isArray(siteplans) ? siteplans[0] : siteplans;

          if (siteplan && siteplan.owners && Array.isArray(siteplan.owners)) {
            // البحث عن المالك في القائمة
            const ownerIndex = siteplan.owners.findIndex(
              (o) =>
                (o.owner_name_ar || o.owner_name || "").toLowerCase().trim() ===
                  (ownerData.nameAr || ownerData.name || "").toLowerCase().trim() &&
                (o.id_number || "") === (ownerData.fullData?.id_number || "")
            );

            if (ownerIndex !== -1) {
              // تحديث بيانات المالك
              const updatedOwners = [...siteplan.owners];
              const currentOwner = updatedOwners[ownerIndex];

              updatedOwners[ownerIndex] = {
                ...currentOwner,
                owner_name_ar: form.name_ar,
                owner_name_en: form.name_en || form.name_ar,
                nationality: form.nationality,
                id_number: form.id_number,
                phone: form.phone,
                email: form.email,
              };

              // تحديث SitePlan
              const updatePayload = {
                owners: updatedOwners.map((o, idx) => ({
                  id: o.id,
                  owner_name_ar: o.owner_name_ar,
                  owner_name_en: o.owner_name_en,
                  nationality: o.nationality,
                  id_number: o.id_number,
                  phone: o.phone,
                  email: o.email,
                  id_issue_date: o.id_issue_date,
                  id_expiry_date: o.id_expiry_date,
                  right_hold_type: o.right_hold_type || "Ownership",
                  share_possession: o.share_possession,
                  share_percent: o.share_percent,
                })),
              };

              await api.patch(`projects/${project.id}/siteplan/${siteplan.id}/`, updatePayload);
              updatedCount++;
            }
          }
        } catch (e) {
          console.error(`Error updating project ${project.id}:`, e);
          failedCount++;
        }
      }

      if (updatedCount > 0) {
        setSuccess(
          t("owner_updated_success")?.replace("{{count}}", updatedCount) ||
          `Owner updated in ${updatedCount} project(s)`
        );
        
        // إعادة تحميل القائمة بعد ثانية
        setTimeout(() => {
          navigate("/owners");
        }, 1500);
      } else if (failedCount > 0) {
        setError(t("update_failed") || "Failed to update owner");
      }
    } catch (e) {
      console.error("Error updating owner:", e);
      setError(t("update_error") || "Error updating owner");
    } finally {
      setSaving(false);
    }
  };

  if (!ownerData) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card">
            <p>{t("owner_data_not_found")}</p>
            <Button onClick={() => navigate("/owners")} variant="primary">
              {t("back_to_owners")}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container">
        <div className="card">
          <div className="prj-header">
            <h1 className="prj-title">{t("edit_owner") || "Edit Owner"}</h1>
            <p className="prj-subtitle">
              {t("edit_owner_subtitle") || "Update owner information across all projects"}
            </p>
          </div>

          {error && (
            <div className="alert alert--error" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success" style={{ marginBottom: "16px" }}>
              {success}
            </div>
          )}

          <div className="form-grid cols-2" style={{ marginTop: "24px" }}>
            <Field
              label={t("owner_name_ar") || "Owner Name (Arabic)"}
              required
            >
              <input
                className="input"
                value={form.name_ar}
                onChange={(e) => handleChange("name_ar", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field
              label={t("owner_name_en") || "Owner Name (English)"}
            >
              <input
                className="input"
                value={form.name_en}
                onChange={(e) => handleChange("name_en", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field
              label={t("nationality")}
            >
              <input
                className="input"
                value={form.nationality}
                onChange={(e) => handleChange("nationality", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field
              label={t("id_number")}
            >
              <input
                className="input"
                value={form.id_number}
                onChange={(e) => handleChange("id_number", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field
              label={t("phone")}
            >
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field
              label={t("email")}
            >
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>

          <div style={{ marginTop: "24px", padding: "16px", background: "var(--surface-2)", borderRadius: "8px" }}>
            <p className="prj-muted">
              {t("affects_projects_count")?.replace("{{count}}", ownerData.projects?.length || 0) ||
               `This will update ${ownerData.projects?.length || 0} project(s)`}
            </p>
          </div>

          <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !form.name_ar.trim()}
            >
              {saving ? t("saving") : t("save")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/owners")}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

