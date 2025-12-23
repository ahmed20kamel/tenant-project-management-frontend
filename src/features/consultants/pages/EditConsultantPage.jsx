import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Field from "../../../components/forms/Field";

export default function EditConsultantPage() {
  const { consultantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  
  const [consultantData, setConsultantData] = useState(location.state?.consultantData || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    name_en: "",
    license_no: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    loadConsultant();
  }, [consultantId]);

  const loadConsultant = async () => {
    if (!consultantId || consultantId === "new") {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.get(`consultants/${consultantId}/`);
      setConsultantData(data);
      setForm({
        name: data.name || "",
        name_en: data.name_en || "",
        license_no: data.license_no || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        notes: data.notes || "",
      });
    } catch (e) {
      console.error("Error loading consultant:", e);
      setError(t("consultant_data_not_found") || "Consultant not found");
      setTimeout(() => navigate("/consultants"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t("consultant_name_required") || "Consultant name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        name_en: form.name_en.trim() || "",
        license_no: form.license_no.trim() || "",
        phone: form.phone.trim() || "",
        email: form.email.trim() || "",
        address: form.address.trim() || "",
        notes: form.notes.trim() || "",
      };

      if (consultantId === "new" || !consultantId) {
        // ✅ إنشاء استشاري جديد
        const { data } = await api.post("consultants/", payload);
        setSuccess(t("consultant_created_success") || "Consultant created successfully");
        setTimeout(() => {
          navigate(`/consultants/${data.id}`);
        }, 1500);
      } else {
        // ✅ تحديث استشاري موجود
        const { data } = await api.patch(`consultants/${consultantId}/`, payload);
        setConsultantData(data);
        setSuccess(t("consultant_updated_success") || "Consultant updated successfully");
        setTimeout(() => {
          navigate(`/consultants/${consultantId}`);
        }, 1500);
      }
    } catch (e) {
      console.error("Error saving consultant:", e);
      const errorMessage = e.response?.data?.detail || 
                           e.response?.data?.error ||
                           Object.values(e.response?.data || {}).flat().join(", ") ||
                           t("save_error") || "Error saving consultant";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLayout loading={true} loadingText={t("loading")} />;
  }

  if (error && consultantId !== "new") {
    return (
      <PageLayout>
        <div className="container">
          <div className="card">
            <p>{error}</p>
            <Button onClick={() => navigate("/consultants")} variant="primary">
              {t("back_to_consultants")}
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
            <h1 className="prj-title">
              {consultantId === "new" ? (t("add_consultant") || "Add Consultant") : (t("edit_consultant") || "Edit Consultant")}
            </h1>
            <p className="prj-subtitle">
              {consultantId === "new" 
                ? (t("add_consultant_subtitle") || "Create a new consultant")
                : (t("edit_consultant_subtitle") || "Update consultant information")}
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
              label={t("consultant_name")}
              required
            >
              <input
                className="input"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={saving}
                placeholder={t("consultant_name_placeholder") || "اسم الاستشاري"}
              />
            </Field>

            <Field
              label={t("consultant_name_en") || "Consultant Name (English)"}
            >
              <input
                className="input"
                value={form.name_en}
                onChange={(e) => handleChange("name_en", e.target.value)}
                disabled={saving}
                placeholder="Consultant Name (English)"
              />
            </Field>

            <Field
              label={t("license_number")}
            >
              <input
                className="input"
                value={form.license_no}
                onChange={(e) => handleChange("license_no", e.target.value)}
                disabled={saving}
                placeholder={t("license_number_placeholder") || "رقم الرخصة"}
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
                placeholder={t("phone_placeholder") || "رقم الهاتف"}
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
                placeholder={t("email_placeholder") || "البريد الإلكتروني"}
              />
            </Field>

            <Field
              label={t("address")}
            >
              <input
                className="input"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={saving}
                placeholder={t("address_placeholder") || "العنوان"}
              />
            </Field>

            <Field
              label={t("notes")}
              span={2}
            >
              <textarea
                className="input"
                rows={4}
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                disabled={saving}
                placeholder={t("notes_placeholder") || "ملاحظات"}
              />
            </Field>
          </div>

          {consultantData && consultantData.projects_count > 0 && (
            <div style={{ marginTop: "24px", padding: "16px", background: "var(--surface-2)", borderRadius: "8px" }}>
              <p className="prj-muted">
                {t("consultant_projects_count")?.replace("{{count}}", consultantData.projects_count) ||
                 `This consultant is associated with ${consultantData.projects_count} project(s)`}
              </p>
            </div>
          )}

          <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? t("saving") : t("save")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (consultantId === "new") {
                  navigate("/consultants");
                } else {
                  navigate(`/consultants/${consultantId}`);
                }
              }}
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

