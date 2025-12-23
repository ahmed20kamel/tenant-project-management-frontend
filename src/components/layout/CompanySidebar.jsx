import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { FaHome, FaFolderOpen, FaUsers, FaUserTie, FaMoneyBillWave, FaUserCog, FaCog, FaEdit, FaFileInvoice } from "react-icons/fa";

function SideItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}>
      <Icon className="sidebar-link__icon" aria-hidden />
      <span className="sidebar-link__text">{label}</span>
    </Link>
  );
}

export default function CompanySidebar() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const { tenantTheme, user } = useAuth();
  const isRTL = i18n.language === 'ar';

  // استخدام شعار الشركة من Theme فقط (بدون fallback لشعار النظام)
  const logoUrl = tenantTheme?.logo_url || null;
  
  // ✅ Logging للتأكد من تحميل اللوجو
  useEffect(() => {
    if (tenantTheme) {
      console.log('🖼️ CompanySidebar - Theme loaded:', {
        company_name: tenantTheme.company_name,
        logo_url: logoUrl ? 'Present' : 'Missing',
        has_tenantTheme: !!tenantTheme,
      });
    }
  }, [tenantTheme, logoUrl]);

  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
  
  const items = [
    { to: "/dashboard", label: t("sidebar_home"), icon: FaHome },
    { to: "/projects", label: t("sidebar_projects"), icon: FaFolderOpen },
    { to: "/payments", label: t("sidebar_payments"), icon: FaMoneyBillWave },
    { to: "/variations", label: t("sidebar_variations"), icon: FaEdit },
    { to: "/invoices", label: t("sidebar_invoices"), icon: FaFileInvoice },
    { to: "/owners", label: t("sidebar_owners"), icon: FaUsers },
    { to: "/consultants", label: t("sidebar_consultants"), icon: FaUserTie },
  ];
  
  // إضافة صفحات الإدارة فقط لـ Company Super Admin
  // Manager لا يمكنه الوصول لإعدادات الشركة أو إدارة المستخدمين
  if (isCompanySuperAdmin) {
    items.push(
      { to: "/company/users", label: isRTL ? "إدارة المستخدمين" : "Manage Users", icon: FaUserCog },
      { to: "/company/settings", label: isRTL ? "إدارة الشركة" : "Company Settings", icon: FaCog }
    );
  }

  return (
    <aside className="sidebar" dir={isRTL ? "rtl" : "ltr"} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Logo Section */}
      <div className="sidebar-logo-section">
        <div className="sidebar-logo-container">
          <div className="sidebar-logo-wrapper">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={tenantTheme?.company_name || "Company Logo"} 
                className="sidebar-logo"
                loading="eager"
                crossOrigin="anonymous"
                onError={(e) => {
                  // إذا فشل التحميل، نخفي الصورة
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-2)',
                color: 'var(--color-muted)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                textAlign: 'center',
                padding: 'var(--space-2)'
              }}>
                {tenantTheme?.company_name || (isRTL ? 'شعار الشركة' : 'Company Logo')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="sidebar-nav">
        {items.map(({ to, label, icon }) => (
          <SideItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            active={pathname === to || pathname.startsWith(to + "/")}
          />
        ))}
      </nav>
    </aside>
  );
}

