import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Avatar } from "@mui/material";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "./SidebarContext";
import { 
  FaUser, 
  FaChevronDown, 
  FaSignOutAlt, 
  FaCog, 
  FaSun, 
  FaMoon,
  FaBell,
  FaSearch,
  FaBars,
  FaTruck
} from "react-icons/fa";

export default function CompanyNavbar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();

  const { theme, toggleTheme } = useTheme();
  const { user, logout, tenantTheme } = useAuth();

  // Get current user from AuthContext or use default
  const currentUser = user?.email || user?.get_full_name || (isRTL ? "مستخدم" : "User");
  
  // Translate user role
  const getUserRoleDisplay = (roleName) => {
    if (!roleName) return isRTL ? "مستخدم" : "User";
    
    const roleTranslations = {
      'company_super_admin': isRTL ? 'مدير الشركة الرئيسي' : 'Company Super Admin',
      'Manager': isRTL ? 'مدير' : 'Manager',
      'Admin': isRTL ? 'مدير' : 'Admin',
      'User': isRTL ? 'مستخدم' : 'User',
      'user': isRTL ? 'مستخدم' : 'User',
    };
    
    return roleTranslations[roleName] || roleName;
  };
  
  const userRole = getUserRoleDisplay(user?.role?.name);

  // استخدام اسم الشركة من Theme فقط (بدون اسم النظام)
  const companyName = tenantTheme?.company_name || (isRTL 
    ? "الشركة"
    : "Company");

  // Get current time
  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Apply company colors dynamically
  useEffect(() => {
    if (tenantTheme?.primary_color || tenantTheme?.secondary_color) {
      const root = document.documentElement;
      if (tenantTheme.primary_color) {
        root.style.setProperty('--navbar-primary-color', tenantTheme.primary_color);
      }
      if (tenantTheme.secondary_color) {
        root.style.setProperty('--navbar-secondary-color', tenantTheme.secondary_color);
      }
    }
  }, [tenantTheme]);

  return (
    <div 
      className="company-navbar-wrapper" 
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        '--navbar-primary': tenantTheme?.primary_color || '#1890ff',
        '--navbar-secondary': tenantTheme?.secondary_color || '#096dd9',
      }}
    >
      {/* Main Navbar - Professional Design */}
      <nav className="navbar-main" role="navigation">
        {/* Left Side - Logo & Brand */}
        <div className="navbar-left">
          <button 
            className="navbar-hamburger"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            type="button"
          >
            <FaBars />
          </button>
          <Link to="/dashboard" className="navbar-brand-link">
            <div className="navbar-brand-icon">
              {tenantTheme?.logo_url ? (
                <img 
                  src={tenantTheme.logo_url} 
                  alt={companyName}
                  className="navbar-brand-logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="navbar-brand-logo-fallback" style={{ display: tenantTheme?.logo_url ? 'none' : 'flex' }}>
                <FaTruck />
              </div>
            </div>
            <div className="navbar-brand-text">
              <div className="navbar-brand-name">{companyName}</div>
              <div className="navbar-brand-tagline">
                {tenantTheme?.company_name ? (isRTL ? "لوحة التحكم" : "Control Panel") : (isRTL ? "شركة مقاولات" : "Construction Company")}
              </div>
            </div>
          </Link>
        </div>

        {/* Middle Section - Search Bar */}
        <div className="navbar-center">
          <div className={`navbar-search ${searchFocused ? 'focused' : ''}`}>
            <FaSearch className="navbar-search-icon" />
            <input
              type="text"
              placeholder={isRTL ? "ابحث عن المشاريع، العقود، الدفعات..." : "Search projects, contracts, payments..."}
              className="navbar-search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="navbar-search-shortcut">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right Side - Time, Theme, Notifications, User */}
        <div className="navbar-right">
          {/* Current Time */}
          <div className="navbar-time">
            {currentTime}
          </div>

          {/* Theme Toggle */}
          <div className="navbar-theme-toggle">
            <button
              className={`navbar-theme-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => {
                if (theme !== "light") toggleTheme();
              }}
              title={isRTL ? "الوضع الفاتح" : "Light Mode"}
              type="button"
            >
              <FaSun />
            </button>
            <button
              className={`navbar-theme-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => {
                if (theme !== "dark") toggleTheme();
              }}
              title={isRTL ? "الوضع الغامق" : "Dark Mode"}
              type="button"
            >
              <FaMoon />
            </button>
          </div>

          {/* Notifications */}
          <button className="navbar-notifications" type="button" aria-label="Notifications">
            <FaBell />
            <span className="navbar-notifications-badge">2</span>
          </button>

          {/* User Menu */}
          <div className="navbar-user-menu">
            <button
              className="navbar-user-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 200)}
              type="button"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <div className="navbar-user-avatar">
                {user?.avatar_url ? (
                  <Avatar src={user.avatar_url} sx={{ width: 40, height: 40 }}>
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </Avatar>
                ) : (
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#1890ff' }}>
                    {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                )}
              </div>
              <div className="navbar-user-info">
                <div className="navbar-user-name">{currentUser}</div>
                <div className="navbar-user-role">{userRole}</div>
              </div>
              <FaChevronDown className={`navbar-user-chevron ${userMenuOpen ? "open" : ""}`} />
            </button>
            
            {userMenuOpen && (
              <div className="navbar-user-dropdown" role="menu">
                <div className="navbar-user-dropdown-header">
                  <div className="navbar-user-dropdown-name">{currentUser}</div>
                  <div className="navbar-user-dropdown-role">{userRole}</div>
                </div>
                <div className="navbar-user-dropdown-divider"></div>
                <Link 
                  to="/profile" 
                  className="navbar-user-dropdown-item"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <FaUser className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "الملف الشخصي" : "Profile"}</span>
                </Link>
                <button 
                  className="navbar-user-dropdown-item"
                  type="button"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <FaCog className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "الإعدادات" : "Settings"}</span>
                </button>
                <button 
                  className="navbar-user-dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  type="button"
                  role="menuitem"
                >
                  <FaSignOutAlt className="navbar-user-dropdown-icon" />
                  <span>{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
