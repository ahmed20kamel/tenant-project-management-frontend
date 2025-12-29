import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import { formatInternalCode } from "../../../utils/internalCodeFormatter";
import { formatDate } from "../../../utils/formatters";

export default function SelectProjectForExcavationNotice() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAR = i18n.language === "ar";
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // ✅ جلب المشاريع المعتمدة نهائياً فقط
      const { data } = await api.get("projects/?approval_status=final_approved&include=contract");
      let items = Array.isArray(data) ? data : (data?.results || data?.items || []);
      setProjects(items);
    } catch (e) {
      console.error("Error loading projects:", e);
      setErrorMsg(t("load_error") || "خطأ في تحميل المشاريع");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (!selectedProjectId) {
      setErrorMsg(t("please_select_project") || "يرجى اختيار مشروع");
      return;
    }
    // ✅ الانتقال إلى صفحة المشروع مع فتح تبويب إشعار بدء الحفر
    navigate(`/projects/${selectedProjectId}?tab=excavation_notice`);
  };

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container" style={{ padding: "var(--space-6)" }}>
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "8px" }}>
            {t("select_project_for_excavation_notice") || "اختر مشروع لإضافة إشعار بدء الحفر"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            {t("select_project_for_excavation_notice_desc") || "اختر مشروعاً معتمداً نهائياً لإضافة إشعار بدء الحفر"}
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: "16px" }}>
              {t("no_final_approved_projects") || "لا توجد مشاريع معتمدة نهائياً"}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="prj-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>
                    <input
                      type="radio"
                      checked={false}
                      onChange={() => {}}
                      style={{ cursor: "default" }}
                      disabled
                    />
                  </th>
                  <th>{t("project_view_internal_code")?.replace(":", "") || "الكود الداخلي"}</th>
                  <th>{t("project_name") || "اسم المشروع"}</th>
                  <th>{t("project_end_date") || "تاريخ انتهاء المشروع"}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      cursor: "pointer",
                      backgroundColor: selectedProjectId === p.id ? "var(--primary-50)" : "transparent",
                    }}
                    onClick={() => setSelectedProjectId(p.id)}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="radio"
                        checked={selectedProjectId === p.id}
                        onChange={() => setSelectedProjectId(p.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <code className="prj-code">
                        {p?.internal_code ? formatInternalCode(p.internal_code) : `PRJ-${p?.id}`}
                      </code>
                    </td>
                    <td>{p?.display_name || p?.name || t("empty_value")}</td>
                    <td>
                      {p?.contract_data?.project_end_date
                        ? formatDate(p.contract_data.project_end_date, i18n.language)
                        : t("empty_value")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-3)", justifyContent: isAR ? "flex-start" : "flex-end" }}>
          <Button variant="secondary" onClick={() => navigate("/projects")}>
            {t("cancel") || "إلغاء"}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedProjectId || projects.length === 0}>
            {t("continue") || "متابعة"}
          </Button>
        </div>
      </div>

      <Dialog
        open={!!errorMsg}
        title={t("error") || "خطأ"}
        desc={errorMsg}
        confirmLabel={t("ok") || "موافق"}
        onClose={() => setErrorMsg("")}
        onConfirm={() => setErrorMsg("")}
      />
    </PageLayout>
  );
}

