import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import { formatInternalCode } from "../../../utils/internalCodeFormatter";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/projectStatus";

/**
 * صفحة الاعتماد النهائي لـ Super Admin - تعرض المشاريع في حالة approved (تم اعتمادها من المدير وتحتاج final_approve)
 */
export default function FinalApprovalsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // جلب المشاريع في حالة approved فقط (تم اعتمادها من المدير وتحتاج final_approve)
      const { data } = await api.get("projects/?approval_status=approved&include=siteplan,license,contract,awarding");
      const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      
      // معالجة البيانات
      const enriched = (items || []).map((p) => {
        const siteplanData = p.siteplan_data || null;
        const licenseData = p.license_data || null;

        // استخراج بيانات الملاك
        let ownerLabel = null;
        if (siteplanData?.owners?.length) {
          const owners = siteplanData.owners.map((o) => o?.owner_name_ar || o?.owner_name || o?.owner_name_en || "").filter(Boolean);
          if (owners.length) {
            ownerLabel = `${t("villa_mr_ms")} ${owners[0]}${owners.length > 1 ? t("villa_mr_ms_partners") : ""}`;
          }
        }

        // استخراج بيانات الاستشاري
        let consultantName = null;
        let cityFromLicense = null;
        if (licenseData) {
          consultantName = licenseData.design_consultant_name || licenseData.supervision_consultant_name || null;
          if (licenseData.city) {
            cityFromLicense = licenseData.city;
          }
        }

        return { 
          ...p, 
          city: p.city || cityFromLicense || null,
          __owner_label: ownerLabel, 
          __consultant_name: consultantName,
        };
      });

      setProjects(enriched);
    } catch (e) {
      console.error("Error loading final approvals:", e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getOwnerLabel = (p) =>
    p?.__owner_label ||
    (p?.display_name 
      ? `${t("villa_mr_ms")} ${p.display_name}`
      : t("villa_mr_ms_empty"));

  const getConsultantName = (p) =>
    p?.__consultant_name || p?.consultant?.name || p?.consultant_name || t("empty_value");

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="container" style={{ padding: "24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>
            {t("final_approvals") || "الاعتماد النهائي"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            {t("final_approvals_description") || "المشاريع التي تم اعتمادها من المدير وتحتاج الاعتماد النهائي"}
          </p>
        </div>

        {/* Projects Table */}
        {projects.length === 0 ? (
          <div style={{ 
            padding: "48px", 
            textAlign: "center", 
            backgroundColor: "var(--surface-1)", 
            borderRadius: "8px",
            border: "1px solid var(--border)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              {t("no_final_approvals") || "لا توجد مشاريع تحتاج اعتماد نهائي"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>
              {t("no_final_approvals_description") || "جميع المشاريع تم اعتمادها نهائياً أو لا توجد مشاريع معتمدة من المدير"}
            </p>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: "var(--surface-1)", 
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid var(--border)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>#</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("project_view_internal_code").replace(":", "")}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("project_name")}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("owner") || "المالك"}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("consultant")}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("project_status")}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("approved_by") || "وافق عليه"}
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: "14px" }}>
                    {t("action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, index) => {
                  const title = p?.display_name || p?.name || `${t("wizard_project_prefix")} #${p?.id ?? index + 1}`;
                  const statusDisplay = p?.status ? {
                    label: getProjectStatusLabel(p.status, i18n.language),
                    color: getProjectStatusColor(p.status),
                  } : { label: t("empty_value"), color: "#6b7280" };
                  const approvedBy = p?.last_approved_by ? 
                    (p.last_approved_by.full_name || p.last_approved_by.email || t("unknown")) : 
                    t("empty_value");

                  return (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: "1px solid var(--border)",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--surface-2)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>{index + 1}</td>
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        {p?.internal_code ? (
                          <code style={{ 
                            fontFamily: "monospace", 
                            backgroundColor: "var(--surface-2)", 
                            padding: "4px 8px", 
                            borderRadius: "4px",
                            fontSize: "13px"
                          }}>
                            {formatInternalCode(p.internal_code)}
                          </code>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>{t("empty_value")}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500 }}>
                        {title}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        {getOwnerLabel(p)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        {getConsultantName(p)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              backgroundColor: statusDisplay.color,
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <span>{statusDisplay.label}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--muted)" }}>
                        {approvedBy}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                        <Link
                          to={`/projects/${p.id}`}
                          style={{
                            color: "var(--primary)",
                            textDecoration: "none",
                            fontWeight: 500,
                            padding: "6px 12px",
                            borderRadius: "4px",
                            backgroundColor: "var(--surface-2)",
                            display: "inline-block",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--primary)";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--surface-2)";
                            e.currentTarget.style.color = "var(--primary)";
                          }}
                        >
                          {t("review") || "مراجعة"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

