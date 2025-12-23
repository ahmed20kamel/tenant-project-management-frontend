import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import DateInput from '../../../components/fields/DateInput';
import { FaBuilding, FaUsers, FaFolderOpen, FaEdit, FaToggleOn, FaToggleOff, FaCalendarAlt } from 'react-icons/fa';
import { formatDate } from '../../../utils/formatters';

export default function AdminTenantsPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState('');
  const [formData, setFormData] = useState({
    max_users: 10,
    max_projects: 50,
    subscription_start_date: '',
    subscription_end_date: '',
    subscription_status: 'trial',
  });

  useEffect(() => {
    if (!user?.is_superuser) {
      window.location.href = '/dashboard';
      return;
    }

    loadTenants();
  }, [user]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get('auth/tenant-settings/');
      const tenantsData = response.data.results || response.data;
      setTenants(tenantsData);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setSlugValue(tenant.tenant?.slug || '');
    setEditingSlug(false);
    setFormData({
      max_users: tenant.max_users || 10,
      max_projects: tenant.max_projects || 50,
      subscription_start_date: tenant.subscription_start_date || '',
      subscription_end_date: tenant.subscription_end_date || '',
      subscription_status: tenant.subscription_status || 'trial',
    });
  };
  
  const handleSaveSlug = async (tenantId) => {
    try {
      if (!slugValue || !slugValue.trim()) {
        alert('يرجى إدخال كود الشركة');
        return;
      }
      
      const cleanedSlug = slugValue.trim().toLowerCase();
      
      // التحقق من أن slug يحتوي فقط على أحرف صالحة
      if (!/^[a-z0-9-]+$/.test(cleanedSlug)) {
        alert('كود الشركة يجب أن يحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطة');
        return;
      }
      
      // استخدام tenant.id (UUID) لتحديث slug
      await api.patch(`auth/tenants/${tenantId}/`, { slug: cleanedSlug });
      await loadTenants();
      setEditingSlug(false);
      setSlugValue('');
      alert('تم تحديث كود الشركة بنجاح');
    } catch (error) {
      console.error('Error updating company slug:', error);
      let errorMsg = 'حدث خطأ أثناء تحديث كود الشركة';
      if (error.response?.data) {
        if (error.response.data.slug && Array.isArray(error.response.data.slug)) {
          errorMsg = error.response.data.slug[0];
        } else if (error.response.data.error) {
          errorMsg = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        }
      }
      alert(errorMsg);
    }
  };

  const handleSave = async () => {
    try {
      await api.patch(`auth/tenant-settings/${editingTenant.tenant.id}/`, formData);
      await loadTenants();
      setEditingTenant(null);
    } catch (error) {
      console.error('Error updating tenant limits:', error);
      alert('حدث خطأ أثناء تحديث الحدود');
    }
  };

  const handleCancel = () => {
    setEditingTenant(null);
    setFormData({
      max_users: 10,
      max_projects: 50,
      subscription_start_date: '',
      subscription_end_date: '',
      subscription_status: 'trial',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'suspended': return '#f59e0b';
      case 'expired': return '#ef4444';
      case 'trial': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'نشط',
      suspended: 'متوقف',
      expired: 'منتهي',
      trial: 'تجريبي',
    };
    return labels[status] || status;
  };

  if (!user?.is_superuser) {
    return null;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ 
      padding: 'var(--space-6)', 
      maxWidth: '1400px', 
      margin: '0 auto',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          إدارة الشركات والحدود
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
          تعيين الحدود والاشتراكات لكل شركة
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', direction: isRTL ? 'rtl' : 'ltr' }}>
          جاري التحميل...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {tenants.map((tenant) => (
            <Card key={tenant.tenant.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <FaBuilding style={{ color: '#2563eb', fontSize: '1.5rem' }} />
                    <h2
                      style={{
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {tenant.company_name}
                    </h2>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                        backgroundColor: `${getStatusColor(tenant.subscription_status)}20`,
                        color: getStatusColor(tenant.subscription_status),
                      }}
                    >
                      {getStatusLabel(tenant.subscription_status)}
                    </span>
                  </div>
                  
                  {/* Company Code (tenant_slug) */}
                  <div style={{ 
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: tenant.tenant?.slug ? '#f3f4f6' : '#fee2e2',
                    borderRadius: 'var(--radius-md)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--font-size-sm)',
                    border: tenant.tenant?.slug ? 'none' : '1px solid #ef4444',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: '#6b7280', fontWeight: 'var(--font-weight-medium)' }}>
                      كود الشركة:
                    </span>
                    {editingSlug && editingTenant?.tenant.id === tenant.tenant.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={slugValue}
                          onChange={(e) => setSlugValue(e.target.value.toLowerCase())}
                          placeholder="مثال: yafoor"
                          pattern="[a-z0-9-]+"
                          style={{
                            fontFamily: 'monospace',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #d1d5db',
                            fontSize: 'var(--font-size-sm)',
                            textTransform: 'lowercase',
                            minWidth: '150px'
                          }}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveSlug(tenant.tenant.id)}
                        >
                          حفظ
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingSlug(false);
                            setSlugValue(tenant.tenant?.slug || '');
                          }}
                        >
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <>
                        {tenant.tenant?.slug ? (
                          <>
                            <code style={{ 
                              color: '#1e40af',
                              fontWeight: 'var(--font-weight-bold)',
                              fontFamily: 'monospace',
                              padding: '2px 8px',
                              backgroundColor: '#ffffff',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #d1d5db'
                            }}>
                              {tenant.tenant.slug}
                            </code>
                            <span style={{ color: '#9ca3af', fontSize: 'var(--font-size-xs)' }}>
                              (استخدمه في تسجيل الدخول)
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingSlug(true);
                                setSlugValue(tenant.tenant.slug);
                              }}
                              style={{ marginRight: isRTL ? '0' : 'auto', marginLeft: isRTL ? 'auto' : '0' }}
                            >
                              <FaEdit style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-1)' }} />
                              تعديل الكود
                            </Button>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#dc2626', fontSize: 'var(--font-size-xs)', fontStyle: 'italic' }}>
                              ⚠️ كود الشركة غير موجود
                            </span>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setEditingSlug(true);
                                setSlugValue('');
                              }}
                            >
                              إضافة كود
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {editingTenant?.tenant.id === tenant.tenant.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                      <Field label="الحد الأقصى للمستخدمين">
                        <input
                          type="number"
                          className="input"
                          value={formData.max_users}
                          onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
                          min="1"
                        />
                      </Field>
                      <Field label="الحد الأقصى للمشاريع">
                        <input
                          type="number"
                          className="input"
                          value={formData.max_projects}
                          onChange={(e) => setFormData({ ...formData, max_projects: parseInt(e.target.value) || 0 })}
                          min="1"
                        />
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
                      <Field label="حالة الاشتراك">
                        <select
                          className="input"
                          value={formData.subscription_status}
                          onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                        >
                          <option value="trial">تجريبي</option>
                          <option value="active">نشط</option>
                          <option value="suspended">متوقف</option>
                          <option value="expired">منتهي</option>
                        </select>
                      </Field>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                          المستخدمين
                        </div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                          {tenant.current_users_count || 0} / {tenant.max_users || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                          المشاريع
                        </div>
                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                          {tenant.current_projects_count || 0} / {tenant.max_projects || 0}
                        </div>
                      </div>
                      {tenant.subscription_start_date && (
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                            تاريخ البداية
                          </div>
                          <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                            {formatDate(tenant.subscription_start_date, i18n.language)}
                          </div>
                        </div>
                      )}
                      {tenant.subscription_end_date && (
                        <div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                            تاريخ النهاية
                          </div>
                          <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                            {formatDate(tenant.subscription_end_date, i18n.language)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {editingTenant?.tenant.id === tenant.tenant.id ? (
                    <>
                      <Button variant="primary" size="sm" onClick={handleSave}>
                        حفظ
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleCancel}>
                        إلغاء
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(tenant)}>
                      <FaEdit style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-1)' }} />
                      تعديل الحدود
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

