import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { 
  FaArrowRight,
  FaSun,
  FaMoon,
  FaGlobe,
  FaLock
} from 'react-icons/fa';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';
  
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // مسح أي Theme محفوظ عند تحميل الصفحة
  useEffect(() => {
    localStorage.removeItem('tenant_theme');
    localStorage.removeItem('tenant_id');
    
    // إعادة تعيين CSS Variables إلى القيم الافتراضية
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-secondary');
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar');
  };

  const handleCompanyLogin = async (e) => {
    e?.preventDefault();
    setError('');
    
    if (!companyCode.trim()) {
      setError(isRTL ? 'يرجى إدخال رمز الشركة' : 'Please enter company code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`public/company-info/${companyCode.trim().toLowerCase()}/`);
      if (response.data) {
        navigate(`/login/${companyCode.trim().toLowerCase()}`);
      }
    } catch (err) {
      console.error('Error checking company:', err);
      setError(
        err.response?.data?.error || 
        (isRTL ? 'الشركة غير موجودة. يرجى التحقق من رمز الشركة' : 'Company not found. Please check the company code')
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={`landing-page ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Navigation Bar */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-nav-logo">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="landing-logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          
          <div className="landing-nav-actions">
            <button 
              className="landing-nav-btn"
              onClick={toggleTheme}
              title={isDark ? (isRTL ? 'الوضع الفاتح' : 'Light Mode') : (isRTL ? 'الوضع الغامق' : 'Dark Mode')}
            >
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
            
            <button 
              className="landing-nav-btn"
              onClick={toggleLanguage}
              title={isRTL ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <FaGlobe />
              <span>{isRTL ? 'العربية' : 'English'}</span>
            </button>

            <button 
              className="landing-admin-link"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              title={isRTL ? 'تسجيل دخول الإدارة' : 'Admin Login'}
            >
              <FaLock />
            </button>
          </div>
        </div>
      </nav>

      {/* Admin Login Modal (Hidden by default) */}
      {showAdminLogin && (
        <div className="landing-modal-overlay" onClick={() => setShowAdminLogin(false)}>
          <Card className="landing-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{isRTL ? 'تسجيل دخول الإدارة' : 'Admin Login'}</h2>
            <p style={{ marginBottom: '24px', color: isDark ? '#9ca3af' : '#6b7280' }}>
              {isRTL ? 'للموظفين المصرح لهم فقط' : 'For authorized personnel only'}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setShowAdminLogin(false);
                navigate('/admin/login');
              }}
              style={{ width: '100%' }}
            >
              {isRTL ? 'متابعة' : 'Continue'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowAdminLogin(false)}
              style={{ width: '100%', marginTop: '12px' }}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </Card>
        </div>
      )}

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-container">
          <div className="landing-hero-content">
            <h1 className="landing-hero-title">
              {isRTL 
                ? 'منصة إدارة مشاريع المقاولات'
                : 'Construction Project Management Platform'
              }
            </h1>
            <p className="landing-hero-description">
              {isRTL
                ? 'إدارة شاملة ومتكاملة لجميع مشاريعك'
                : 'Comprehensive and integrated management for all your projects'
              }
            </p>
            
            <div className="landing-hero-cta">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowCompanyModal(true)}
                className="landing-cta-primary"
              >
                {isRTL ? 'تسجيل دخول الشركة' : 'Company Login'}
                <FaArrowRight style={{ marginLeft: isRTL ? 0 : '8px', marginRight: isRTL ? '8px' : 0 }} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-bottom">
            <p>
              © {new Date().getFullYear()} {isRTL ? 'نظام إدارة المشاريع' : 'Project Management System'}
            </p>
          </div>
        </div>
      </footer>

      {/* Company Login Modal */}
      {showCompanyModal && (
        <div className="landing-modal-overlay" onClick={() => {
          setShowCompanyModal(false);
          setCompanyCode('');
          setError('');
        }}>
          <Card className="landing-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="landing-modal-header">
              <h2>{isRTL ? 'تسجيل دخول الشركة' : 'Company Login'}</h2>
              <p>
                {isRTL 
                  ? 'أدخل رمز الشركة للانتقال إلى صفحة تسجيل الدخول'
                  : 'Enter your company code to proceed to login'
                }
              </p>
            </div>

            {error && (
              <div className="landing-error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleCompanyLogin}>
              <div className="landing-form-group">
                <label>
                  {isRTL ? 'رمز الشركة' : 'Company Code'}
                </label>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => {
                    setCompanyCode(e.target.value);
                    setError('');
                  }}
                  placeholder={isRTL ? 'أدخل رمز الشركة' : 'Enter company code'}
                  autoFocus
                  className="landing-input"
                />
              </div>

              <div className="landing-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCompanyModal(false);
                    setCompanyCode('');
                    setError('');
                  }}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !companyCode.trim()}
                  loading={loading}
                >
                  {isRTL ? 'متابعة' : 'Continue'}
                  <FaArrowRight style={{ marginLeft: isRTL ? 0 : '8px', marginRight: isRTL ? '8px' : 0 }} />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
