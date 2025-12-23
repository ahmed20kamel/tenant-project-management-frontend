import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import DateInput from '../../../components/fields/DateInput';
import { FaBuilding, FaUser, FaSave, FaTimes } from 'react-icons/fa';

export default function AdminCreateCompanyPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Company Data
    company_name: '',
    company_name_en: '',
    company_slug: '', // Company Code (optional - auto-generated if empty)
    company_email: '',
    company_phone: '',
    company_license_number: '',
    company_country: '',
    company_city: '',
    company_address: '',
    
    // Subscription
    subscription_status: 'trial',
    subscription_start_date: '',
    subscription_end_date: '',
    is_trial: true,
    trial_ends_at: '',
    
    // Limits
    max_users: 10,
    max_projects: 50,
    
    // Admin User
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_password: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // تنظيف البيانات - إزالة الحقول الفارغة
      const cleanedData = { ...formData };
      
      // إزالة الحقول الفارغة (empty strings) وتحويلها إلى null للتواريخ
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '' && (key.includes('date') || key.includes('trial_ends_at'))) {
          cleanedData[key] = null;
        } else if (cleanedData[key] === '') {
          // إزالة الحقول الفارغة الأخرى (عدا الحقول المطلوبة)
          const requiredFields = ['company_name', 'company_email', 'company_phone', 'admin_first_name', 'admin_last_name', 'admin_email', 'admin_password'];
          if (!requiredFields.includes(key)) {
            delete cleanedData[key];
          }
        }
      });
      
      console.log('Sending data:', cleanedData);
      
      const response = await api.post('auth/admin/create-company/', cleanedData);
      
      if (response.data) {
        alert('تم إنشاء الشركة بنجاح!');
        navigate('/admin/tenants');
      }
    } catch (err) {
      console.error('Error creating company:', err.response?.data || err);
      
      // عرض تفاصيل الخطأ من الـ API
      let errorMsg = '';
      if (err.response?.data) {
        if (err.response.data.error) {
          errorMsg = err.response.data.error;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (typeof err.response.data === 'object') {
          // عرض جميع أخطاء Validation
          const errors = Object.entries(err.response.data)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          errorMsg = errors || JSON.stringify(err.response.data);
        } else {
          errorMsg = String(err.response.data);
        }
      } else {
        errorMsg = err.message || 'حدث خطأ أثناء إنشاء الشركة';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ 
      padding: 'var(--space-8)', 
      maxWidth: '1200px', 
      margin: '0 auto',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#1e40af',
          marginBottom: 'var(--space-2)',
        }}>
          إنشاء شركة جديدة
        </h1>
        <p style={{ color: '#6b7280', fontSize: 'var(--font-size-base)' }}>
          إضافة شركة جديدة إلى النظام مع المستخدم الرئيسي
        </p>
      </div>

      {error && (
        <Card style={{ 
          marginBottom: 'var(--space-6)',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#dc2626'
        }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <strong>خطأ:</strong> {error}
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <FaBuilding style={{ color: '#2563eb', fontSize: '1.5rem' }} />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b'
            }}>
              بيانات الشركة الأساسية
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            <Field label="اسم الشركة (عربي)" required>
              <input
                type="text"
                name="company_name"
                className="input"
                value={formData.company_name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="اسم الشركة (إنجليزي)">
              <input
                type="text"
                name="company_name_en"
                className="input"
                value={formData.company_name_en}
                onChange={handleChange}
              />
            </Field>

            <Field label="كود الشركة" helpText="اختياري - سيتم توليده تلقائياً من اسم الشركة إذا لم يتم إدخاله. يجب أن يحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطة">
              <input
                type="text"
                name="company_slug"
                className="input"
                value={formData.company_slug}
                onChange={handleChange}
                placeholder="مثال: yafoor"
                pattern="[a-z0-9-]+"
                style={{ fontFamily: 'monospace', textTransform: 'lowercase' }}
                onInput={(e) => {
                  // تحويل إلى أحرف صغيرة تلقائياً
                  e.target.value = e.target.value.toLowerCase();
                }}
              />
            </Field>

            <Field label="البريد الإلكتروني" required>
              <input
                type="email"
                name="company_email"
                className="input"
                value={formData.company_email}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="رقم الهاتف" required>
              <input
                type="tel"
                name="company_phone"
                className="input"
                value={formData.company_phone}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="رقم الترخيص">
              <input
                type="text"
                name="company_license_number"
                className="input"
                value={formData.company_license_number}
                onChange={handleChange}
              />
            </Field>

            <Field label="الدولة">
              <input
                type="text"
                name="company_country"
                className="input"
                value={formData.company_country}
                onChange={handleChange}
              />
            </Field>

            <Field label="المدينة">
              <input
                type="text"
                name="company_city"
                className="input"
                value={formData.company_city}
                onChange={handleChange}
              />
            </Field>

            <Field label="العنوان">
              <textarea
                name="company_address"
                className="input"
                value={formData.company_address}
                onChange={handleChange}
                rows="3"
              />
            </Field>
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <FaBuilding style={{ color: '#2563eb', fontSize: '1.5rem' }} />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b'
            }}>
              إعدادات الاشتراك والحدود
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            <Field label="حالة الاشتراك">
              <select
                name="subscription_status"
                className="input"
                value={formData.subscription_status}
                onChange={handleChange}
              >
                <option value="trial">تجريبي</option>
                <option value="active">نشط</option>
                <option value="suspended">متوقف</option>
                <option value="expired">منتهي</option>
              </select>
            </Field>

            <Field label="تاريخ بداية الاشتراك">
              <DateInput
                className="input"
                value={formData.subscription_start_date}
                onChange={(value) => setFormData({ ...formData, subscription_start_date: value })}
              />
            </Field>

            <Field label="تاريخ نهاية الاشتراك">
              <DateInput
                className="input"
                value={formData.subscription_end_date}
                onChange={(value) => setFormData({ ...formData, subscription_end_date: value })}
              />
            </Field>

            <Field label="الحد الأقصى للمستخدمين">
              <input
                type="number"
                name="max_users"
                className="input"
                value={formData.max_users}
                onChange={handleChange}
                min="1"
                required
              />
            </Field>

            <Field label="الحد الأقصى للمشاريع">
              <input
                type="number"
                name="max_projects"
                className="input"
                value={formData.max_projects}
                onChange={handleChange}
                min="1"
                required
              />
            </Field>
          </div>
        </Card>

        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            marginBottom: 'var(--space-6)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)'
          }}>
            <FaUser style={{ color: '#2563eb', fontSize: '1.5rem' }} />
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b'
            }}>
              بيانات المستخدم الرئيسي
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            <Field label="الاسم الأول" required>
              <input
                type="text"
                name="admin_first_name"
                className="input"
                value={formData.admin_first_name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="الاسم الأخير" required>
              <input
                type="text"
                name="admin_last_name"
                className="input"
                value={formData.admin_last_name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="البريد الإلكتروني" required>
              <input
                type="email"
                name="admin_email"
                className="input"
                value={formData.admin_email}
                onChange={handleChange}
                required
              />
            </Field>

            <Field label="كلمة المرور" required>
              <input
                type="password"
                name="admin_password"
                className="input"
                value={formData.admin_password}
                onChange={handleChange}
                required
                minLength="8"
              />
            </Field>
          </div>
        </Card>

        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-4)', 
          justifyContent: 'flex-end',
          [isRTL ? 'flexDirection' : '']: 'row-reverse'
        }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/tenants')}
            disabled={loading}
          >
            <FaTimes style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            loading={loading}
          >
            <FaSave style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إنشاء الشركة
          </Button>
        </div>
      </form>
    </div>
  );
}

