import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import CompanyNavbar from "./CompanyNavbar";
import CompanySidebar from "./CompanySidebar";
import Breadcrumbs from "./Breadcrumbs";

// دالة لتطبيق Theme ديناميكياً - لوحة ألوان كاملة للشركة
const adjustColorBrightness = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

const applyTheme = (theme) => {
  if (!theme) return;
  
  const root = document.documentElement;
  if (theme.primary_color) {
    root.style.setProperty('--color-primary', theme.primary_color);
    root.style.setProperty('--primary', theme.primary_color);
    // حساب primary-600 و primary-700 و primary-50 من primary_color
    const primary600 = adjustColorBrightness(theme.primary_color, -20);
    const primary700 = adjustColorBrightness(theme.primary_color, -30);
    const primary50 = adjustColorBrightness(theme.primary_color, 90);
    root.style.setProperty('--color-primary-hover', primary600);
    root.style.setProperty('--color-primary-active', primary700);
    root.style.setProperty('--color-primary-light', primary50);
    root.style.setProperty('--primary-600', primary600);
    root.style.setProperty('--primary-700', primary700);
    root.style.setProperty('--primary-50', primary50);
    root.style.setProperty('--primary-dark', primary700);
  }
  if (theme.secondary_color) {
    root.style.setProperty('--color-secondary', theme.secondary_color);
    // حساب secondary-600 من secondary_color
    const secondary600 = adjustColorBrightness(theme.secondary_color, -20);
    root.style.setProperty('--secondary-600', secondary600);
  }
};

export default function Layout({ children }) {
  const { i18n } = useTranslation();
  const { user, tenantTheme } = useAuth();
  const location = useLocation();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  // تطبيق Theme الشركة تلقائياً عند تغييره
  useEffect(() => {
    if (tenantTheme && !user?.is_superuser) {
      // ✅ تطبيق Theme الشركة لجميع المستخدمين داخل الشركة
      console.log('🎨 Applying theme in Layout:', {
        company_name: tenantTheme.company_name,
        logo_url: tenantTheme.logo_url ? 'Present' : 'Missing',
        primary_color: tenantTheme.primary_color,
        secondary_color: tenantTheme.secondary_color,
      });
      applyTheme(tenantTheme);
      
      // ✅ التأكد من تطبيق الألوان
      const root = document.documentElement;
      const appliedPrimary = root.style.getPropertyValue('--color-primary');
      const appliedSecondary = root.style.getPropertyValue('--color-secondary');
      console.log('✅ Theme applied - CSS Variables:', {
        '--color-primary': appliedPrimary,
        '--color-secondary': appliedSecondary,
      });
    } else if (!tenantTheme && user && !user.is_superuser) {
      // ✅ تقليل التحذيرات - فقط عند الحاجة
      // لا نعرض تحذير إذا كان المستخدم superuser أو لم يتم تسجيل الدخول بعد
    }
  }, [tenantTheme, user]);

  // تحديد نوع المستخدم - التحقق من المسار والمستخدم
  const isAdminPath = location.pathname.startsWith('/admin');
  const isOnboardingPath = location.pathname === '/onboarding';
  const isSuperAdmin = user?.is_superuser && isAdminPath;
  
  // الشركات (Tenant Users) يجب أن يستخدموا Company Layout دائماً
  // Super Admin فقط يستخدم Admin Layout عند الدخول لـ /admin/*
  // Onboarding Wizard لا يحتاج Layout (صفحة مستقلة)
  const useAdminLayout = isSuperAdmin;
  const showLayout = !isOnboardingPath;

  // استخدام Navbar و Sidebar المناسب
  const Navbar = useAdminLayout ? AdminNavbar : CompanyNavbar;
  const Sidebar = useAdminLayout ? AdminSidebar : CompanySidebar;
  
  // إذا كانت صفحة Onboarding، لا نعرض Layout
  if (!showLayout) {
    return <>{children}</>;
  }

  return (
    <div className="layout" lang={lang} dir={isRTL ? "rtl" : "ltr"} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Sidebar placeholder for grid */}
      <div className="sidebar-placeholder"></div>
      <Sidebar />
      <div className="main" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <Navbar />
        {/* Breadcrumbs تظهر فقط في واجهة Admin */}
        {useAdminLayout && <Breadcrumbs />}
        <main className="main-content" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>{children}</main>
      </div>
    </div>
  );
}
