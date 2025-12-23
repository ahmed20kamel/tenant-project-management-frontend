import { useParams, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { useState, useEffect } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import { FaUser, FaEdit } from "react-icons/fa";
import { calculateAgeFromEmiratesId } from "../../../utils/inputFormatters";

export default function OwnerDetailPage() {
  const { ownerName } = useParams();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [ownerData, setOwnerData] = useState(location.state?.ownerData || null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    if (ownerData) {
      loadProjects();
      // تحميل صورة البروفايل من localStorage
      const savedImage = localStorage.getItem(`owner_${ownerData.name}_image`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } else {
      setError(t("owner_data_not_found") || "Owner data not found");
      setLoading(false);
    }
  }, [ownerData]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result;
        setProfileImage(url);
        localStorage.setItem(`owner_${ownerData.name}_image`, url);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadProjects = async () => {
    if (!ownerData) return;
    setLoading(true);
    try {
      const projectDetails = await Promise.all(
        ownerData.projects.map(async (p) => {
          try {
            const { data } = await api.get(`projects/${p.id}/`);
            return { ...p, ...data };
          } catch (e) {
            return p;
          }
        })
      );
      setProjects(projectDetails);
    } catch (e) {
      console.error("Error loading projects:", e);
      setError(t("error_loading_projects") || "Error loading projects");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLayout loading={true} loadingText={t("loading")} />;
  }

  if (error || !ownerData) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card">
            <h2>{t("error")}</h2>
            <p>{error || t("owner_data_not_found") || "Owner data not found"}</p>
            <Button as={Link} to="/owners" variant="primary">
              {t("back_to_owners") || "Back to Owners"}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const fullOwnerData = ownerData.fullData || {};
  // ✅ استخدام العمر من الـ backend إن وجد، وإلا نحسبه من رقم الهوية
  const age = fullOwnerData.age ?? calculateAgeFromEmiratesId(fullOwnerData.id_number);

  return (
    <PageLayout>
      <div className="container">
        {/* بروفايل المالك */}
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
              {profileImage ? (
                <div style={{ position: "relative" }}>
                  <img 
                    src={profileImage} 
                    alt={ownerData.name}
                    style={{
                      width: "160px",
                      height: "160px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      border: "3px solid var(--border)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
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
                    width: "160px",
                    height: "160px",
                    borderRadius: "12px",
                    border: "3px dashed var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    transition: "all 0.2s ease",
                    gap: "12px"
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
                  <FaUser style={{ fontSize: "48px", color: "var(--muted)" }} />
                  <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
                    {t("upload_image") || "Upload Image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* معلومات المالك */}
            <div style={{ flex: 1, minWidth: "300px" }}>
              <Button as={Link} to="/owners" variant="ghost" style={{ marginBottom: "16px" }}>
                ← {t("back_to_owners") || "Back to Owners"}
              </Button>
              <h1 style={{ 
                fontSize: "32px", 
                fontWeight: 700, 
                color: "var(--ink)",
                margin: "0 0 8px 0"
              }}>
                {ownerData.name}
              </h1>
              {ownerData.nameAr && (
                <p style={{ 
                  fontSize: "16px", 
                  color: "var(--muted)",
                  margin: "0 0 8px 0"
                }}>
                  {ownerData.nameAr}
                </p>
              )}
              {ownerData.nameEn && (
                <p style={{ 
                  fontSize: "16px", 
                  color: "var(--muted)",
                  margin: 0,
                  direction: "ltr",
                  textAlign: "left"
                }}>
                  {ownerData.nameEn}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* بيانات المالك */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ marginBottom: "24px" }}>{t("owner_details") || "Owner Details"}</h2>
            
            <div className="form-grid cols-2">
              <ViewRow 
                label={t("owner_name") || "Owner Name"} 
                value={ownerData.name}
              />
              {ownerData.nameAr && (
                <ViewRow 
                  label={t("owner_name_ar") || "Owner Name (Arabic)"} 
                  value={ownerData.nameAr}
                />
              )}
              {ownerData.nameEn && (
                <ViewRow 
                  label={t("owner_name_en") || "Owner Name (English)"} 
                  value={ownerData.nameEn}
                />
              )}
              {fullOwnerData.nationality && (
                <ViewRow 
                  label={t("nationality") || "Nationality"} 
                  value={fullOwnerData.nationality}
                />
              )}
              {fullOwnerData.id_number && (
                <ViewRow 
                  label={t("id_number") || "ID Number"} 
                  value={fullOwnerData.id_number}
                />
              )}
              {age !== null && (
                <ViewRow 
                  label={t("age")} 
                  value={`${age} ${isAR ? t("year") : t("years")}`}
                />
              )}
              {fullOwnerData.phone && (
                <ViewRow 
                  label={t("phone") || "Phone"} 
                  value={fullOwnerData.phone}
                />
              )}
              {fullOwnerData.email && (
                <ViewRow 
                  label={t("email") || "Email"} 
                  value={fullOwnerData.email}
                />
              )}
              {fullOwnerData.share_percent && (
                <ViewRow 
                  label={t("share_percent") || "Share Percentage"} 
                  value={`${fullOwnerData.share_percent}%`}
                />
              )}
              {fullOwnerData.right_hold_type && (
                <ViewRow 
                  label={t("right_hold_type") || "Right Hold Type"} 
                  value={fullOwnerData.right_hold_type}
                />
              )}
            </div>
          </div>

          {/* المشاريع */}
          <div className="mt-16">
            <h2>{t("projects") || "Projects"} ({projects.length})</h2>
            {projects.length === 0 ? (
              <p className="prj-muted mt-16">{t("no_projects_found") || "No projects found"}</p>
            ) : (
              <div className="prj-table__wrapper mt-16">
                <table className="prj-table">
                  <thead>
                    <tr>
                      <th>{t("project_name") || "Project Name"}</th>
                      <th>{t("internal_code") || "Internal Code"}</th>
                      <th>{t("type") || "Type"}</th>
                      <th>{t("action") || "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name || p.display_name || `Project #${p.id}`}</td>
                        <td>
                          <code>{p.internal_code || `PRJ-${p.id}`}</code>
                        </td>
                        <td>{p.project_type || t("empty_value") || "—"}</td>
                        <td>
                          <Button as={Link} to={`/projects/${p.id}`} variant="primary" style={{ marginRight: "8px" }}>
                            {t("view") || "View"}
                          </Button>
                          <Button as={Link} to={`/projects/${p.id}/wizard`} variant="ghost">
                            {t("edit") || "Edit"}
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
