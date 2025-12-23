import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaHome, FaBuilding, FaUsers, FaChartLine, FaCog, FaShieldAlt, FaBox } from "react-icons/fa";

function SideItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`sidebar-link ${active ? "sidebar-link--active" : ""}`}>
      <Icon className="sidebar-link__icon" aria-hidden />
      <span className="sidebar-link__text">{label}</span>
    </Link>
  );
}

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // استخدام شعار البرنامج العام (ليس شعار شركة)
  const logoUrl = "/logo.png";

  const items = [
    { to: "/admin/dashboard", label: isRTL ? "لوحة التحكم" : "Dashboard", icon: FaHome },
    { to: "/admin/tenants", label: isRTL ? "الشركات" : "Companies", icon: FaBuilding },
    { to: "/admin/users", label: isRTL ? "المستخدمين" : "Users", icon: FaUsers },
    { to: "/admin/analytics", label: isRTL ? "التحليلات" : "Analytics", icon: FaChartLine },
    { to: "/admin/pricing", label: isRTL ? "الباقات" : "Pricing Plans", icon: FaBox },
    { to: "/admin/settings", label: isRTL ? "إعدادات النظام" : "System Settings", icon: FaCog },
  ];

  return (
    <aside className="sidebar" dir={isRTL ? "rtl" : "ltr"} style={{ 
      backgroundColor: '#ffffff', 
      borderInlineEnd: '1px solid #e5e7eb',
      boxShadow: isRTL ? '-2px 0 4px rgba(0, 0, 0, 0.05)' : '2px 0 4px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Logo Section */}
      <div className="sidebar-logo-section" style={{ 
        padding: 'var(--space-6) var(--space-4)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: '#f8fafc'
        }}>
          <img 
            src="/logo.png" 
            alt="System Logo" 
            style={{ 
              height: '50px', 
              width: '50px',
              objectFit: 'contain'
            }}
            loading="eager"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.75rem', 
          color: '#1e40af',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        }}>
          <FaShieldAlt />
          <span>{isRTL ? "لوحة السوبر أدمن" : "Admin Panel"}</span>
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

