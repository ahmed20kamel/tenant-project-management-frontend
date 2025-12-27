import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Avatar } from "@mui/material";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../common/Button";
import { FaUser, FaChevronDown, FaSignOutAlt, FaCog, FaShieldAlt } from "react-icons/fa";

export default function AdminNavbar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  // Get current user from AuthContext
  const currentUser = user?.email || user?.get_full_name || t("super_admin");

  return (
    <header 
      className="navbar" 
      dir={isRTL ? "rtl" : "ltr"} 
      style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '0 var(--space-6)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flex: 1 }}>
        {/* Logo */}
        <Link 
          to="/admin/dashboard" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-3)',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <img 
            src="/logo.png" 
            alt="System Logo" 
            style={{ 
              height: '40px', 
              width: '40px',
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <div style={{ 
              fontSize: 'var(--font-size-lg)', 
              fontWeight: 'var(--font-weight-bold)', 
              color: '#1e40af',
              lineHeight: '1.2'
            }}>
              {t("super_admin_panel")}
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-xs)', 
              color: '#6b7280',
              lineHeight: '1.2'
            }}>
              {t("system_administration")}
            </div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          style={{ 
            minWidth: '40px', 
            height: '40px', 
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={theme === "dark" ? (isRTL ? "الوضع الفاتح" : "Light Mode") : (isRTL ? "الوضع الغامق" : "Dark Mode")}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </Button>
        <LanguageSwitcher />
        
        {/* User Menu */}
        <div className="navbar-user-menu" style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid #e5e7eb',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem'
              }}>
                {user?.avatar_url ? (
                  <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }}>
                    {user?.first_name?.[0] || user?.email?.[0] || 'A'}
                  </Avatar>
                ) : (
                  <FaShieldAlt />
                )}
              </div>
              <span style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-primary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {currentUser}
              </span>
              <FaChevronDown style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280',
                transition: 'transform 0.2s',
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }} />
            </button>
            
            {userMenuOpen && (
              <div className="navbar-user-dropdown">
                <div className="navbar-user-dropdown-header">
                  <div className="navbar-user-dropdown-name">{currentUser}</div>
                  <div className="navbar-user-dropdown-role" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaShieldAlt />
                    <span>{isRTL ? "سوبر أدمن" : "Super Admin"}</span>
                  </div>
                </div>
                <div className="navbar-user-dropdown-divider"></div>
                <Link to="/profile" className="navbar-user-dropdown-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', width: '100%', padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer' }}>
                  <FaUser className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "الملف الشخصي" : "Profile"}</span>
                </Link>
                <button className="navbar-user-dropdown-item">
                  <FaCog className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "الإعدادات" : "Settings"}</span>
                </button>
                <button 
                  className="navbar-user-dropdown-item"
                  onClick={logout}
                >
                  <FaSignOutAlt className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
                </button>
              </div>
            )}
      </div>
    </div>
  </header>
);
}
