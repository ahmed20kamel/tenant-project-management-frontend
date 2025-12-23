import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // تنظيف كامل للـ localStorage عند تحميل صفحة Login
  useEffect(() => {
    // مسح جميع بيانات الشركة والجلسة
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
    
    // إعادة تعيين Theme إلى الافتراضي
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-secondary');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // التحقق من أن المستخدم Super Admin
        if (result.is_super_admin) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          setError(isRTL ? 'هذا الحساب ليس حساب سوبر أدمن' : 'This account is not a super admin account');
          setLoading(false);
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
      }}
    >
      {/* Logo Section */}
      <div style={{ 
        marginBottom: 'var(--space-8)',
        textAlign: 'center'
      }}>
        <img 
          src="/logo.png" 
          alt="System Logo" 
          style={{ 
            height: '100px', 
            width: '100px',
            objectFit: 'contain',
            marginBottom: 'var(--space-4)',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <h1 style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#ffffff',
          marginTop: 'var(--space-2)',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          {isRTL ? 'لوحة تحكم النظام' : 'System Admin Panel'}
        </h1>
        <p style={{
          color: '#e0e7ff',
          fontSize: 'var(--font-size-base)',
          marginTop: 'var(--space-2)'
        }}>
          {isRTL ? 'تسجيل دخول السوبر أدمن' : 'Super Admin Login'}
        </p>
      </div>

      <Card style={{ 
        width: '100%', 
        maxWidth: '450px',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="card-header" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h1
            className="card-title"
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e40af',
              marginBottom: 'var(--space-2)',
            }}
          >
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: 'var(--font-size-sm)'
          }}>
            {isRTL ? 'سجل دخولك للوصول إلى لوحة التحكم' : 'Sign in to access the admin panel'}
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
              backgroundColor: '#1e40af',
              borderColor: '#1e40af'
            }}
          >
            {isRTL ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

