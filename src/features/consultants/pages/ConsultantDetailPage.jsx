import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { useState, useEffect } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import { FaUpload, FaBuilding, FaEdit, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFileAlt } from "react-icons/fa";

export default function ConsultantDetailPage() {
  const { consultantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [consultantData, setConsultantData] = useState(location.state?.consultantData || null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadConsultant();
  }, [consultantId]);

  const loadConsultant = async () => {
    setLoading(true);
    setError("");
    try {
      // ✅ تحميل بيانات الاستشاري من API
      const { data } = await api.get(`consultants/${consultantId}/`);
      setConsultantData(data);
      
      // ✅ تحميل المشاريع المرتبطة
      if (data.projects && Array.isArray(data.projects)) {
        const projectDetails = await Promise.all(
          data.projects.map(async (pc) => {
            try {
              const { data: projectData } = await api.get(`projects/${pc.project_id}/`);
              return {
                ...pc,
                ...projectData,
              };
            } catch (e) {
              return pc;
            }
          })
        );

        // دمج الأدوار لنفس المشروع بحيث لا يتكرر الصف
        const projectMap = new Map();
        projectDetails.forEach((p) => {
          const pid = p.project_id || p.id;
          if (!pid) return;
          if (!projectMap.has(pid)) {
            projectMap.set(pid, {
              ...p,
              roles: new Set(),
            });
          }
          projectMap.get(pid).roles.add(p.role);
        });

        const grouped = Array.from(projectMap.values()).map((p) => ({
          ...p,
          roles: Array.from(p.roles),
        }));

        setProjects(grouped);
      }
    } catch (e) {
      console.error("Error loading consultant:", e);
      setError(t("consultant_data_not_found") || "Consultant not found");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !consultantData?.id) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const { data } = await api.patch(`consultants/${consultantData.id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setConsultantData(data);
      setUploadingImage(false);
    } catch (e) {
      console.error("Error uploading image:", e);
      setUploadingImage(false);
    }
  };

  if (loading) {
    return <PageLayout loading={true} loadingText={t("loading")} />;
  }

  if (error || !consultantData) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card">
            <h2>{t("error")}</h2>
            <p>{error || t("consultant_data_not_found")}</p>
            <Button as={Link} to="/consultants" variant="primary">
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
        {/* بروفايل الاستشاري */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ 
            display: "flex", 
            gap: "32px", 
            alignItems: "flex-start",
            padding: "32px",
            flexWrap: "wrap"
          }}>
            {/* صورة البروفايل */}
            <div style={{ 
              position: "relative",
              flexShrink: 0
            }}>
              {consultantData.image_url ? (
                <div style={{ position: "relative" }}>
                  <img 
                    src={consultantData.image_url} 
                    alt={consultantData.name}
                    style={{
                      width: "180px",
                      height: "180px",
                      borderRadius: "16px",
                      objectFit: "cover",
                      border: "4px solid var(--primary)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
                    }}
                  />
                  <label
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      background: "var(--primary)",
                      color: "white",
                      borderRadius: "50%",
                      width: "36px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.background = "var(--primary-600)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "var(--primary)";
                    }}
                  >
                    <FaEdit style={{ fontSize: "14px" }} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              ) : (
                <label
                  style={{
                    width: "180px",
                    height: "180px",
                    borderRadius: "16px",
                    border: "4px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    transition: "all 0.2s ease",
                    gap: "12px",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.background = "var(--primary-50)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                >
                  <FaBuilding style={{ fontSize: "56px", color: "var(--muted)" }} />
                  <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500, textAlign: "center" }}>
                    {uploadingImage ? t("uploading") : t("upload_image")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* معلومات الاستشاري */}
            <div style={{ flex: 1, minWidth: "300px" }}>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                <Button as={Link} to="/consultants" variant="ghost">
                  ← {t("back_to_consultants")}
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => navigate(`/consultants/${consultantData.id}/edit`)}
                >
                  <FaEdit style={{ marginRight: "8px" }} />
                  {t("edit")}
                </Button>
              </div>
              <h1 style={{ 
                fontSize: "36px", 
                fontWeight: 700, 
                color: "var(--ink)",
                margin: "0 0 8px 0",
                lineHeight: 1.2
              }}>
                {consultantData.name}
              </h1>
              {consultantData.name_en && (
                <p style={{ 
                  fontSize: "18px", 
                  color: "var(--muted)",
                  margin: "0 0 16px 0",
                  fontWeight: 500
                }}>
                  {consultantData.name_en}
                </p>
              )}
              {consultantData.license_no && (
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--surface-2)",
                  borderRadius: "8px",
                  marginBottom: "16px"
                }}>
                  <FaFileAlt style={{ color: "var(--primary)" }} />
                  <span style={{ fontWeight: 500 }}>{t("license_number")}:</span>
                  <code style={{ 
                    background: "var(--surface)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "14px"
                  }}>
                    {consultantData.license_no}
                  </code>
                </div>
              )}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
                {consultantData.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
                    <FaPhone />
                    <span>{consultantData.phone}</span>
                  </div>
                )}
                {consultantData.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
                    <FaEnvelope />
                    <span>{consultantData.email}</span>
                  </div>
                )}
                {consultantData.address && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted)" }}>
                    <FaMapMarkerAlt />
                    <span>{consultantData.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* بيانات الاستشاري */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>
              {t("consultant_details")}
            </h2>
            
            <div className="form-grid cols-2">
              <ViewRow 
                label={t("consultant_name")} 
                value={consultantData.name}
              />
              {consultantData.name_en && (
                <ViewRow 
                  label={t("consultant_name_en") || "Consultant Name (English)"} 
                  value={consultantData.name_en}
                />
              )}
              {consultantData.license_no && (
                <ViewRow 
                  label={t("license_number")} 
                  value={consultantData.license_no}
                />
              )}
              {consultantData.phone && (
                <ViewRow 
                  label={t("phone")} 
                  value={consultantData.phone}
                />
              )}
              {consultantData.email && (
                <ViewRow 
                  label={t("email")} 
                  value={consultantData.email}
                />
              )}
              {consultantData.address && (
                <ViewRow 
                  label={t("address")} 
                  value={consultantData.address}
                />
              )}
              {consultantData.notes && (
                <ViewRow 
                  label={t("notes")} 
                  value={consultantData.notes}
                  span={2}
                />
              )}
            </div>
          </div>

          {/* المشاريع */}
          <div className="mt-16">
            <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>
              {t("projects")} ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <div className="prj-alert">
                <div className="prj-alert__title">
                  {t("no_projects_found")}
                </div>
              </div>
            ) : (
              <div className="prj-table__wrapper">
                <table className="prj-table">
                  <thead>
                    <tr>
                      <th>{t("project_name")}</th>
                      <th>{t("internal_code")}</th>
                      <th>{t("role") || "Role"}</th>
                      <th>{t("project_type")}</th>
                      <th style={{ minWidth: "200px" }}>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.project_id || p.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {p.name || p.project_name || p.display_name || `Project #${p.project_id || p.id}`}
                          </div>
                        </td>
                        <td>
                          <code>{p.internal_code || `PRJ-${p.project_id || p.id}`}</code>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {(p.roles || [p.role]).map((r) => (
                              <span key={r} className="prj-badge is-on">
                                {r === "design" ? t("design_consultant") : t("supervision_consultant")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{p.project_type || t("empty_value")}</td>
                        <td>
                          <Button 
                            as={Link} 
                            to={`/projects/${p.project_id || p.id}`} 
                            variant="primary" 
                            style={{ marginRight: "8px" }}
                          >
                            {t("view")}
                          </Button>
                          <Button 
                            as={Link} 
                            to={`/projects/${p.project_id || p.id}/wizard`} 
                            variant="ghost"
                          >
                            {t("edit")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

