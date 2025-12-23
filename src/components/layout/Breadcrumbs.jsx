import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { projectId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";
  const [projectName, setProjectName] = useState(null);

  // ✅ جلب اسم المشروع (اسم المالك) إذا كان هناك projectId
  useEffect(() => {
    if (projectId) {
      let mounted = true;
      api.get(`projects/${projectId}/`)
        .then(({ data }) => {
          if (mounted && data) {
            // استخدام display_name الذي يحتوي على اسم المالك
            setProjectName(data.display_name || data.name || `Project #${projectId}`);
          }
        })
        .catch(() => {
          if (mounted) {
            setProjectName(`Project #${projectId}`);
          }
        });
      return () => { mounted = false; };
    }
  }, [projectId]);

  // ✅ فك ترميز pathname للعرض فقط، لكن نستخدم pathname الأصلي للروابط
  const parts = pathname.split("/").filter(Boolean);

  const dict = {
    projects: t("bc_projects"),
    wizard: t("bc_wizard"),
    siteplan: t("bc_siteplan"),
    license: t("bc_license"),
    view: t("bc_view"),
    setup: t("bc_setup") || "Setup",
    contract: t("bc_contract") || "Contract",
    summary: t("bc_summary") || "Summary",
    owners: t("bc_owners") || "Owners",
    consultants: t("bc_consultants") || "Consultants",
    contractors: t("bc_contractors") || "Contractors",
    awarding: t("bc_awarding") || "Awarding",
  };

  // ✅ فك ترميز كل جزء للعرض فقط
  const paths = parts.map((p, i) => {
    let decodedPart = p;
    try {
      decodedPart = decodeURIComponent(p);
    } catch (e) {
      decodedPart = p;
    }
    
    // ✅ إذا كان هذا الجزء هو projectId، نستخدم اسم المشروع (اسم المالك)
    let displayName = dict[decodedPart] || dict[p] || decodedPart;
    if (p === projectId && projectName) {
      displayName = projectName;
    } else if (p === projectId && !projectName) {
      // أثناء التحميل، نعرض رقم المشروع مؤقتاً
      displayName = `Project #${p}`;
    }
    
    // ✅ استخدام pathname الأصلي (المُرمز) للروابط
    const originalPath = "/" + parts.slice(0, i + 1).join("/");
    
    return {
      name: displayName,
      to: originalPath,
      last: i === parts.length - 1,
    };
  });

  if (!parts.length) return null;

  return (
    <div className="breadcrumbs" dir={isRTL ? "rtl" : "ltr"} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div className="breadcrumbs-in" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Link className="breadcrumbs-link" to="/" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          {t("bc_home")}
        </Link>
        {paths.map((p, i) => (
          <span key={i} className="breadcrumbs-item" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <span className="breadcrumbs-sep" style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }}>
              {isRTL ? '‹' : '›'}
            </span>
            {p.last ? (
              <span className="breadcrumbs-current" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{p.name}</span>
            ) : (
              <Link className="breadcrumbs-link" to={p.to} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                {p.name}
              </Link>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
