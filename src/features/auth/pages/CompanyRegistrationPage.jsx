import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import FileUpload from '../../../components/file-upload/FileUpload';
import { api } from '../../../services/api';

export default function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { login } = useAuth();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Company Data
    company_name: '',
    company_logo: null,
    company_license_number: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    // Admin User Data
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirm: '',
  });

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // التحقق من كلمة المرور
    if (formData.admin_password !== formData.admin_password_confirm) {
      setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // إنشاء FormData لإرسال الملفات
      const data = new FormData();
      data.append('company_name', formData.company_name);
      if (formData.company_logo) {
        data.append('company_logo', formData.company_logo);
      }
      data.append('company_license_number', formData.company_license_number || '');
      data.append('company_email', formData.company_email);
      data.append('company_phone', formData.company_phone);
      data.append('company_address', formData.company_address || '');
      data.append('admin_first_name', formData.admin_first_name);
      data.append('admin_last_name', formData.admin_last_name);
      data.append('admin_email', formData.admin_email);
      data.append('admin_password', formData.admin_password);

      const response = await api.post('auth/register-company/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // تسجيل الدخول تلقائياً
      if (response.data.tokens) {
        await login(formData.admin_email, formData.admin_password);
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error('Registration error:', err.response?.data);
      const errorData = err.response?.data;
      let errorMessage = isRTL ? 'فشل تسجيل الشركة' : 'Failed to register company';

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          // عرض أول خطأ من القائمة
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <Card style={{ 
        width: '100%', 
        maxWidth: '800px',
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="card-header" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <img 
            src="/logo.png" 
            alt="System Logo" 
            style={{ 
              height: '60px', 
              width: '60px',
              objectFit: 'contain',
              marginBottom: 'var(--space-4)'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1
            className="card-title"
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e40af',
              marginBottom: 'var(--space-2)',
            }}
          >
            {isRTL ? 'تسجيل شركة جديدة' : 'Register New Company'}
          </h1>
          <p style={{ 
            color: '#6b7280', 
            fontSize: 'var(--font-size-sm)'
          }}>
            {isRTL ? 'سجل شركتك للبدء في استخدام النظام' : 'Register your company to start using the system'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--error-50)',
              color: 'var(--error-600)',
              border: '1px solid var(--error-500)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Company Information Section */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-4)',
                color: 'var(--color-text-primary)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid var(--color-primary)',
              }}
            >
              {isRTL ? 'معلومات الشركة' : 'Company Information'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'اسم الشركة' : 'Company Name'} required>
                <input
                  type="text"
                  name="company_name"
                  className="input"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'البريد الإلكتروني للشركة' : 'Company Email'} required>
                <input
                  type="email"
                  name="company_email"
                  className="input"
                  value={formData.company_email}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'رقم الهاتف' : 'Phone Number'} required>
                <input
                  type="tel"
                  name="company_phone"
                  className="input"
                  value={formData.company_phone}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'شعار الشركة' : 'Company Logo'}>
                <FileUpload
                  value={formData.company_logo instanceof File ? formData.company_logo : null}
                  onChange={(file) => setFormData({ ...formData, company_logo: file })}
                  accept="image/*"
                  maxSizeMB={5}
                  showPreview={true}
                  compressionOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 800,
                  }}
                />
              </Field>
              <Field label={isRTL ? 'رقم الرخصة' : 'License Number'}>
                <input
                  type="text"
                  name="company_license_number"
                  className="input"
                  value={formData.company_license_number}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'عنوان الشركة' : 'Company Address'}>
                <textarea
                  name="company_address"
                  className="input"
                  rows={3}
                  value={formData.company_address}
                  onChange={handleInputChange}
                />
              </Field>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', width: '100%' }} />

          {/* Admin User Information Section */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-4)',
                color: 'var(--color-text-primary)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid var(--color-primary)',
              }}
            >
              {isRTL ? 'معلومات المستخدم المسؤول' : 'Admin User Information'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'الاسم الأول' : 'First Name'} required>
                <input
                  type="text"
                  name="admin_first_name"
                  className="input"
                  value={formData.admin_first_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'اسم العائلة' : 'Last Name'} required>
                <input
                  type="text"
                  name="admin_last_name"
                  className="input"
                  value={formData.admin_last_name}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'} required>
                <input
                  type="email"
                  name="admin_email"
                  className="input"
                  value={formData.admin_email}
                  onChange={handleInputChange}
                  required
                />
              </Field>
              <Field label={isRTL ? 'كلمة المرور' : 'Password'} required>
                <input
                  type="password"
                  name="admin_password"
                  className="input"
                  value={formData.admin_password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                />
              </Field>
              <Field label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} required>
                <input
                  type="password"
                  name="admin_password_confirm"
                  className="input"
                  value={formData.admin_password_confirm}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={() => navigate('/')} disabled={loading}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="lg" disabled={loading} loading={loading}>
              {isRTL ? 'تسجيل الشركة' : 'Register Company'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

