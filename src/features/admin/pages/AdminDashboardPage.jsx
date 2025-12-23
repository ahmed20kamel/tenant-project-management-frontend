import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { FaBuilding, FaUsers, FaChartLine, FaCog, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { formatDate } from '../../../utils/formatters';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_tenants: 0,
    active_tenants: 0,
    trial_tenants: 0,
    total_users: 0,
  });

  useEffect(() => {
    // التحقق من أن المستخدم Super Admin
    if (!user?.is_superuser) {
      window.location.href = '/dashboard';
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // جلب قائمة جميع الشركات
      const tenantsResponse = await api.get('auth/tenants/');
      const tenantsData = tenantsResponse.data.results || tenantsResponse.data;
      setTenants(tenantsData);

      // حساب الإحصائيات
      setStats({
        total_tenants: tenantsData.length,
        active_tenants: tenantsData.filter(t => t.is_active).length,
        trial_tenants: tenantsData.filter(t => t.is_trial).length,
        total_users: 0, // يمكن إضافة API لجلب عدد المستخدمين
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantStatus = async (tenantId, currentStatus) => {
    try {
      // يمكن إضافة API لتحديث حالة الشركة
      // await api.patch(`auth/tenants/${tenantId}/`, { is_active: !currentStatus });
      await loadData();
    } catch (error) {
      console.error('Error toggling tenant status:', error);
    }
  };

  if (!user?.is_superuser) {
    return null;
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ 
      padding: 'var(--space-8)', 
      maxWidth: '1600px', 
      margin: '0 auto',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--space-10)',
        paddingBottom: 'var(--space-6)',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h1
          style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e40af',
            marginBottom: 'var(--space-2)',
          }}
        >
          لوحة تحكم السوبر أدمن
        </h1>
        <p style={{ 
          color: '#6b7280', 
          fontSize: 'var(--font-size-base)',
          marginTop: 'var(--space-2)'
        }}>
          إدارة جميع الشركات والمستخدمين والنظام بالكامل
        </p>
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-10)',
        }}
      >
        <Card style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--font-size-2xl)',
                flexShrink: 0
              }}
            >
              <FaBuilding />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: '#1e293b',
                lineHeight: '1.2',
                marginBottom: 'var(--space-1)'
              }}>
                {stats.total_tenants}
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: '#64748b',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                إجمالي الشركات
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--font-size-2xl)',
                flexShrink: 0
              }}
            >
              <FaToggleOn />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: '#1e293b',
                lineHeight: '1.2',
                marginBottom: 'var(--space-1)'
              }}>
                {stats.active_tenants}
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: '#64748b',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                شركات نشطة
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--font-size-2xl)',
                flexShrink: 0
              }}
            >
              <FaChartLine />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: '#1e293b',
                lineHeight: '1.2',
                marginBottom: 'var(--space-1)'
              }}>
                {stats.trial_tenants}
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: '#64748b',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                شركات تجريبية
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 'var(--font-size-2xl)',
                flexShrink: 0
              }}
            >
              <FaUsers />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 'var(--font-size-3xl)', 
                fontWeight: 'var(--font-weight-bold)', 
                color: '#1e293b',
                lineHeight: '1.2',
                marginBottom: 'var(--space-1)'
              }}>
                {stats.total_users}
              </div>
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: '#64748b',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                إجمالي المستخدمين
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tenants List */}
      <Card style={{ 
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: 'var(--space-8)'
      }}>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-2)',
            }}
          >
            قائمة الشركات
          </h2>
          <p style={{ 
            color: '#64748b', 
            fontSize: 'var(--font-size-sm)',
            marginTop: 'var(--space-1)'
          }}>
            إدارة جميع الشركات المسجلة في النظام
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', direction: isRTL ? 'rtl' : 'ltr' }}>
            جاري التحميل...
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: '#64748b', direction: isRTL ? 'rtl' : 'ltr' }}>
            لا توجد شركات مسجلة
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                style={{
                  padding: 'var(--space-5)',
                  border: '1px solid #e5e7eb',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  transition: 'all 0.2s',
                  marginBottom: 'var(--space-3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'var(--font-weight-bold)', 
                    color: '#1e293b', 
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--font-size-lg)'
                  }}>
                    {tenant.name}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap'
                  }}>
                    <span>
                      تاريخ الإنشاء: {formatDate(tenant.created_at, i18n.language)}
                    </span>
                    {tenant.is_trial && (
                      <span style={{ 
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: '#fef3c7',
                        color: '#d97706',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}>
                        تجريبي
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <Button
                    variant={tenant.is_active ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                    style={{
                      minWidth: '100px'
                    }}
                  >
                    {tenant.is_active ? (
                      <>
                        <FaToggleOn style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-1)' }} />
                        نشط
                      </>
                    ) : (
                      <>
                        <FaToggleOff style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-1)' }} />
                        معطل
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/admin/tenants`;
                    }}
                    style={{
                      minWidth: '80px'
                    }}
                  >
                    إدارة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={{ 
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-2)',
            }}
          >
            إجراءات سريعة
          </h2>
          <p style={{ 
            color: '#64748b', 
            fontSize: 'var(--font-size-sm)',
            marginTop: 'var(--space-1)'
          }}>
            الوصول السريع إلى أقسام الإدارة الرئيسية
          </p>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 'var(--space-4)' 
        }}>
          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => window.location.href = '/admin/create-company'}
            style={{
              padding: 'var(--space-4)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            <FaBuilding style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إنشاء شركة جديدة
          </Button>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => window.location.href = '/admin/tenants'}
            style={{
              padding: 'var(--space-4)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            <FaBuilding style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إدارة الشركات والحدود
          </Button>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => window.location.href = '/admin/users'}
            style={{
              padding: 'var(--space-4)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            <FaUsers style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إدارة المستخدمين
          </Button>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => window.location.href = '/pricing'}
            style={{
              padding: 'var(--space-4)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            <FaCog style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            إدارة الباقات
          </Button>
        </div>
      </Card>
    </div>
  );
}

