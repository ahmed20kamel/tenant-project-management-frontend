import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Avatar } from "@mui/material";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../common/Button";
import { FaUser, FaChevronDown, FaSignOutAlt, FaCog } from "react-icons/fa";

export default function CompanyNavbar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, logout, tenantTheme } = useAuth();

  // Get current user from AuthContext or use default
  const currentUser = user?.email || user?.get_full_name || (isRTL ? "مستخدم" : "User");

  // استخدام اسم الشركة من Theme فقط (بدون اسم النظام)
  const companyName = tenantTheme?.company_name || (isRTL 
    ? "الشركة"
    : "Company");

  return (
    <header className="navbar" dir={isRTL ? "rtl" : "ltr"}>
      <div className="navbar-in">
        <Link to="/dashboard" className="navbar-brand">
          <div className="navbar-brand-content">
            <div className="navbar-brand-main">{companyName}</div>
            <div className="navbar-brand-sub">
              {tenantTheme?.company_name ? (isRTL ? "لوحة التحكم" : "Control Panel") : (isRTL ? "شركة مقاولات" : "Construction Company")}
            </div>
          </div>
        </Link>

        <div className="navbar-right">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="navbar-btn"
            title={theme === "dark" ? (isRTL ? "الوضع الفاتح" : "Light Mode") : (isRTL ? "الوضع الغامق" : "Dark Mode")}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </Button>
          <LanguageSwitcher />
          
          {/* User Menu */}
          <div className="navbar-user-menu">
            <button
              className="navbar-user-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
            >
              <div className="navbar-user-avatar">
                {user?.avatar_url ? (
                  <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }}>
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </Avatar>
                ) : (
                  <FaUser />
                )}
              </div>
              <span className="navbar-user-name">{currentUser}</span>
              <FaChevronDown className={`navbar-user-chevron ${userMenuOpen ? "open" : ""}`} />
            </button>
            
            {userMenuOpen && (
              <div className="navbar-user-dropdown">
                <div className="navbar-user-dropdown-header">
                  <div className="navbar-user-dropdown-name">{currentUser}</div>
                  <div className="navbar-user-dropdown-role">
                    {user?.role?.name || (isRTL ? "مستخدم" : "User")}
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
      </div>
    </header>
  );
}

