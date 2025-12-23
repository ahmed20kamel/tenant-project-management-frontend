import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { api } from '../../../services/api';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { FaGlobe, FaMoon, FaSun } from 'react-icons/fa';

export default function CompanyLoginPage() {
  const { tenantSlug } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isRTL = i18n.language === 'ar';

  // تنظيف كامل للـ localStorage عند تحميل صفحة Login
  useEffect(() => {
    // مسح جميع بيانات الجلسة السابقة
    localStorage.removeItem('tenant_theme');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('tenant_slug');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('permissions');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('is_super_admin');
    localStorage.removeItem('user_role');
  }, []);

  // تحميل معلومات الشركة
  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (!tenantSlug) {
        setError(isRTL ? 'معرف الشركة غير موجود' : 'Company identifier not found');
        setLoadingCompany(false);
        return;
      }

      try {
        const response = await api.get(`public/company-info/${tenantSlug}/`);
        const data = response.data;
        setCompanyInfo(data);

        // تطبيق Theme الشركة على الصفحة فقط (لا نحفظ في localStorage بعد)
        // تطبيق لوحة ألوان كاملة للشركة
        const root = document.documentElement;
        if (data.primary_color) {
          root.style.setProperty('--color-primary', data.primary_color);
          root.style.setProperty('--primary', data.primary_color);
          // حساب primary-600 من primary_color
          const adjustColorBrightness = (hex, percent) => {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, Math.max(0, (num >> 16) + amt));
            const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
            const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
          };
          const primary600 = adjustColorBrightness(data.primary_color, -20);
          const primary700 = adjustColorBrightness(data.primary_color, -30);
          const primary50 = adjustColorBrightness(data.primary_color, 90);
          root.style.setProperty('--color-primary-hover', primary600);
          root.style.setProperty('--primary-600', primary600);
          root.style.setProperty('--primary-700', primary700);
          root.style.setProperty('--primary-50', primary50);
          root.style.setProperty('--primary-dark', primary700);
        }
        if (data.secondary_color) {
          root.style.setProperty('--color-secondary', data.secondary_color);
          const adjustColorBrightness = (hex, percent) => {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = Math.min(255, Math.max(0, (num >> 16) + amt));
            const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
            const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
            return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
          };
          const secondary600 = adjustColorBrightness(data.secondary_color, -20);
          root.style.setProperty('--secondary-600', secondary600);
        }
      } catch (err) {
        console.error('Error loading company info:', err);
        setError(err.response?.data?.error || (isRTL ? 'الشركة غير موجودة' : 'Company not found'));
      } finally {
        setLoadingCompany(false);
      }
    };

    loadCompanyInfo();
  }, [tenantSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // التحقق من أن المستخدم ليس Super Admin
        if (result.is_super_admin) {
          setError(isRTL ? 'يجب تسجيل الدخول من صفحة السوبر أدمن' : 'Please login from the admin login page');
          setLoading(false);
          // مسح البيانات المحفوظة
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
          localStorage.removeItem('tenant_theme');
          localStorage.removeItem('tenant_id');
          localStorage.removeItem('tenant_slug');
          return;
        }

        // التحقق من أن المستخدم ينتمي للشركة الصحيحة
        if (tenantSlug && result.user?.tenant) {
          // الحصول على slug من response أو من userData.tenant
          const userTenantSlug = result.tenant_slug || result.user.tenant.slug;
          
          if (!userTenantSlug || userTenantSlug.toLowerCase() !== tenantSlug.toLowerCase()) {
            setError(isRTL ? 'هذا الحساب لا ينتمي لهذه الشركة' : 'This account does not belong to this company');
            setLoading(false);
            // مسح البيانات
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('permissions');
            localStorage.removeItem('tenant_id');
            localStorage.removeItem('tenant_slug');
            return;
          }
        }

        // التحقق من Onboarding - فقط لـ Company Super Admin
        const isCompanySuperAdmin = result.user?.role?.name === 'company_super_admin';
        if (isCompanySuperAdmin && !result.user?.onboarding_completed) {
          // فقط Company Super Admin الذي لم يكمل Onboarding يتم توجيهه لصفحة Onboarding
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.error || (isRTL ? 'فشل تسجيل الدخول' : 'Login failed'));
        setLoading(false);
      }
    } catch (err) {
      setError(isRTL ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login');
      setLoading(false);
    }
  };

  // حساب gradient من ألوان الشركة أو استخدام صورة الخلفية
  const getBackgroundStyle = () => {
    if (companyInfo?.background_image) {
      return {
        backgroundImage: `url(${companyInfo.background_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    // إذا لم تكن هناك صورة خلفية، استخدم gradient
    if (companyInfo?.primary_color && companyInfo?.secondary_color) {
      return {
        background: `linear-gradient(135deg, ${companyInfo.primary_color} 0%, ${companyInfo.secondary_color} 100%)`,
      };
    }
    return {
      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    };
  };
  
  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar');
  };

  if (loadingCompany) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
        }}
      >
        <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-4)',
        }}
      >
        <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626', marginBottom: 'var(--space-4)' }}>
            {isRTL ? 'الشركة غير موجودة' : 'Company Not Found'}
          </h2>
          <p style={{ color: '#6b7280' }}>
            {error || (isRTL ? 'الشركة المطلوبة غير موجودة أو غير نشطة' : 'The requested company does not exist or is inactive')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        position: 'relative',
        ...getBackgroundStyle(),
      }}
    >
      {/* Overlay for better text readability when using background image */}
      {companyInfo?.background_image && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 0,
          }}
        />
      )}
      
      {/* Language and Theme Switcher - Fixed Position */}
      <div
        style={{
          position: 'fixed',
          top: 'var(--space-4)',
          [isRTL ? 'left' : 'right']: 'var(--space-4)',
          zIndex: 1000,
          display: 'flex',
          gap: 'var(--space-2)',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        <Button
          variant="ghost"
          onClick={toggleLanguage}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: 'var(--space-2) var(--space-3)',
          }}
          title={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          <FaGlobe style={{ marginRight: isRTL ? 0 : 'var(--space-2)', marginLeft: isRTL ? 'var(--space-2)' : 0 }} />
          {isRTL ? 'EN' : 'عربي'}
        </Button>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: 'var(--space-2) var(--space-3)',
          }}
          title={theme === 'dark' ? (isRTL ? 'الوضع الفاتح' : 'Light Mode') : (isRTL ? 'الوضع الغامق' : 'Dark Mode')}
        >
          {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </Button>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <div style={{ 
          marginBottom: 'var(--space-8)',
          textAlign: 'center'
        }}>
        {companyInfo.logo ? (
          <img 
            src={companyInfo.logo} 
            alt={companyInfo.company_name} 
            style={{ 
              height: '100px', 
              width: 'auto',
              maxWidth: '300px',
              objectFit: 'contain',
              marginBottom: 'var(--space-4)',
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div style={{
            height: '100px',
            width: '100px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#ffffff'
          }}>
            {companyInfo.company_name?.charAt(0) || 'C'}
          </div>
        )}
        <h1 style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#ffffff',
          marginTop: 'var(--space-2)',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          {companyInfo.company_name}
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 'var(--font-size-base)',
          marginTop: 'var(--space-2)'
        }}>
          {isRTL ? 'تسجيل الدخول' : 'Login'}
        </p>
        </div>

        <Card style={{ 
        width: '100%', 
        maxWidth: '450px',
        backgroundColor: theme === 'dark' ? 'var(--surface)' : '#ffffff',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="card-header" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1
            className="card-title"
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: companyInfo.primary_color || '#f97316',
              marginBottom: 'var(--space-2)',
            }}
          >
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: 'var(--font-size-sm)'
          }}>
            {isRTL ? 'سجل دخولك للوصول إلى النظام' : 'Sign in to access the system'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #ef4444',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'} required>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
            />
          </Field>

          <Field label={isRTL ? 'كلمة المرور' : 'Password'} required>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
            loading={loading}
            style={{ 
              marginTop: 'var(--space-2)',
              backgroundColor: companyInfo.primary_color || '#f97316',
              borderColor: companyInfo.primary_color || '#f97316'
            }}
          >
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </form>
      </Card>
      </div>
    </div>
  );
}

