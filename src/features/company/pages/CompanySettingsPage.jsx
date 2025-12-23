import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import { FaBuilding, FaUser, FaInfoCircle, FaSave, FaUpload } from 'react-icons/fa';

export default function CompanySettingsPage() {
  const { user, tenantTheme, refreshUser, loadTenantTheme } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsData, setSettingsData] = useState(null);
  
  const [companyData, setCompanyData] = useState({
    company_name: '',
    company_license_number: '',
    company_phone: '',
    company_address: '',
    company_country: '',
    company_city: '',
    company_description: '',
    company_activity_type: 'construction',
    company_logo: null,
    background_image: null,
    primary_color: '#f97316',
    secondary_color: '#ea580c',
    // Contractor Information (المقاول = الشركة نفسها)
    contractor_name: '',
    contractor_name_en: '',
    contractor_license_no: '',
    contractor_phone: '',
    contractor_email: '',
    contractor_address: '',
  });
  
  const [ownerData, setOwnerData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    avatar: null,
  });
  
  const [subscriptionData, setSubscriptionData] = useState({
    max_users: 0,
    max_projects: 0,
    subscription_status: '',
    subscription_start_date: '',
    subscription_end_date: '',
  });

  // التحقق من الصلاحيات - فقط Company Super Admin يمكنه الوصول لإعدادات الشركة
  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';

  useEffect(() => {
    if (!isCompanySuperAdmin) {
      setError(isRTL ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // تحميل بيانات الشركة
      const settingsResponse = await api.get('auth/tenant-settings/current/');
      const settings = settingsResponse.data;
      
      // حفظ بيانات الإعدادات لعرض الصور
      setSettingsData(settings);
      
      setCompanyData({
        company_name: settings.company_name || '',
        company_license_number: settings.company_license_number || '',
        company_phone: settings.company_phone || '',
        company_address: settings.company_address || '',
        company_country: settings.company_country || '',
        company_city: settings.company_city || '',
        company_description: settings.company_description || '',
        company_activity_type: settings.company_activity_type || 'construction',
        company_logo: null, // لا نحمل الملف، فقط URL
        background_image: null, // لا نحمل الملف، فقط URL
        primary_color: settings.primary_color || '#f97316',
        secondary_color: settings.secondary_color || '#ea580c',
        // Contractor Information
        contractor_name: settings.contractor_name || '',
        contractor_name_en: settings.contractor_name_en || '',
        contractor_license_no: settings.contractor_license_no || '',
        contractor_phone: settings.contractor_phone || '',
        contractor_email: settings.contractor_email || '',
        contractor_address: settings.contractor_address || '',
      });
      
      setSubscriptionData({
        max_users: settings.max_users || 0,
        max_projects: settings.max_projects || 0,
        subscription_status: settings.subscription_status || '',
        subscription_start_date: settings.subscription_start_date || '',
        subscription_end_date: settings.subscription_end_date || '',
      });
      
      // تحميل بيانات المالك
      const profileResponse = await api.get('auth/users/profile/');
      const profile = profileResponse.data;
      
      setOwnerData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        avatar: null, // لا نحمل الملف، فقط URL
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleCompanyChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setCompanyData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setCompanyData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOwnerChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setOwnerData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setOwnerData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCompany = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      
      // بيانات الشركة
      if (companyData.company_name) formData.append('company_name', companyData.company_name);
      if (companyData.company_license_number) formData.append('company_license_number', companyData.company_license_number);
      if (companyData.company_phone) formData.append('company_phone', companyData.company_phone);
      if (companyData.company_address) formData.append('company_address', companyData.company_address);
      if (companyData.company_country) formData.append('company_country', companyData.company_country);
      if (companyData.company_city) formData.append('company_city', companyData.company_city);
      if (companyData.company_description) formData.append('company_description', companyData.company_description);
      if (companyData.company_activity_type) formData.append('company_activity_type', companyData.company_activity_type);
      if (companyData.company_logo) formData.append('company_logo', companyData.company_logo);
      if (companyData.background_image) formData.append('background_image', companyData.background_image);
      if (companyData.primary_color) formData.append('primary_color', companyData.primary_color);
      if (companyData.secondary_color) formData.append('secondary_color', companyData.secondary_color);
      
      // بيانات المقاول (Contractor Info)
      if (companyData.contractor_name) formData.append('contractor_name', companyData.contractor_name);
      if (companyData.contractor_name_en) formData.append('contractor_name_en', companyData.contractor_name_en);
      if (companyData.contractor_license_no) formData.append('contractor_license_no', companyData.contractor_license_no);
      if (companyData.contractor_phone) formData.append('contractor_phone', companyData.contractor_phone);
      if (companyData.contractor_email) formData.append('contractor_email', companyData.contractor_email);
      if (companyData.contractor_address) formData.append('contractor_address', companyData.contractor_address);
      
      await api.patch('auth/tenant-settings/current/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // ✅ إعادة تحميل Theme من API مباشرة بعد الحفظ
      // لا نستخدم fallback لأننا نعلم أن البيانات محدثة الآن
      await loadTenantTheme(false);
      
      setSuccess(isRTL ? 'تم حفظ بيانات الشركة بنجاح' : 'Company data saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving company data:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOwner = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      
      // بيانات المالك (لا يمكن تعديل البريد الإلكتروني)
      if (ownerData.first_name) formData.append('first_name', ownerData.first_name);
      if (ownerData.last_name) formData.append('last_name', ownerData.last_name);
      if (ownerData.phone) formData.append('phone', ownerData.phone);
      if (ownerData.avatar) formData.append('avatar', ownerData.avatar);
      
      await api.patch('auth/users/update_profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await refreshUser();
      
      setSuccess(isRTL ? 'تم حفظ بيانات المالك بنجاح' : 'Owner data saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving owner data:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data'));
    } finally {
      setLoading(false);
    }
  };

  if (!isCompanySuperAdmin) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} style={{ 
        padding: 'var(--space-8)', 
        textAlign: 'center',
        direction: isRTL ? 'rtl' : 'ltr'
      }}>
        <Card style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#dc2626' }}>
          <div style={{ padding: 'var(--space-6)' }}>
            <h2>{isRTL ? 'غير مصرح' : 'Unauthorized'}</h2>
            <p>{isRTL ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page'}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} style={{ 
        padding: 'var(--space-8)', 
        textAlign: 'center',
        direction: isRTL ? 'rtl' : 'ltr'
      }}>
        <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

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
          color: 'var(--color-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          {isRTL ? 'إدارة الشركة' : 'Company Settings'}
        </h1>
        <p style={{ color: '#6b7280', fontSize: 'var(--font-size-base)' }}>
          {isRTL ? 'إدارة بيانات الشركة والإعدادات' : 'Manage company data and settings'}
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
            <strong>{isRTL ? 'خطأ:' : 'Error:'}</strong> {error}
          </div>
        </Card>
      )}

      {success && (
        <Card style={{ 
          marginBottom: 'var(--space-6)',
          backgroundColor: '#d1fae5',
          border: '1px solid #10b981',
          color: '#059669'
        }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <strong>{isRTL ? 'نجح:' : 'Success:'}</strong> {success}
          </div>
        </Card>
      )}

      {/* 1. Company Information */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <FaBuilding style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }} />
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e293b'
          }}>
            {isRTL ? 'بيانات الشركة' : 'Company Information'}
          </h2>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 'var(--space-4)' 
        }}>
          <Field label={isRTL ? 'شعار الشركة' : 'Company Logo'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              {tenantTheme?.logo_url && !companyData.company_logo && (
                <img 
                  src={tenantTheme.logo_url} 
                  alt="Company Logo" 
                  style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                />
              )}
              <input
                type="file"
                name="company_logo"
                accept="image/*"
                onChange={handleCompanyChange}
                style={{ display: 'none' }}
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                <Button
                  type="button"
                  variant="secondary"
                  as="span"
                  style={{ cursor: 'pointer' }}
                >
                  <FaUpload style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
                  {isRTL ? 'اختر الشعار' : 'Choose Logo'}
                </Button>
              </label>
              {companyData.company_logo && (
                <span style={{ color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
                  {companyData.company_logo.name}
                </span>
              )}
            </div>
          </Field>

          <Field label={isRTL ? 'صورة خلفية صفحة تسجيل الدخول' : 'Login Page Background Image'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {settingsData?.background_image_url && !companyData.background_image && (
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                  <img 
                    src={settingsData.background_image_url} 
                    alt="Background Preview" 
                    style={{ 
                      width: '100%', 
                      height: '200px', 
                      objectFit: 'cover', 
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                </div>
              )}
              <input
                type="file"
                name="background_image"
                accept="image/*"
                onChange={handleCompanyChange}
                style={{ display: 'none' }}
                id="background-upload"
              />
              <label htmlFor="background-upload">
                <Button
                  type="button"
                  variant="secondary"
                  as="span"
                  style={{ cursor: 'pointer' }}
                >
                  <FaUpload style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
                  {isRTL ? 'اختر صورة الخلفية' : 'Choose Background Image'}
                </Button>
              </label>
              {companyData.background_image && (
                <span style={{ color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
                  {companyData.background_image.name}
                </span>
              )}
              <small style={{ color: '#6b7280', fontSize: 'var(--font-size-xs)' }}>
                {isRTL 
                  ? 'سيتم عرض هذه الصورة كخلفية لصفحة تسجيل الدخول الخاصة بالشركة'
                  : 'This image will be displayed as the background of the company login page'
                }
              </small>
            </div>
          </Field>

          <Field label={isRTL ? 'اسم الشركة' : 'Company Name'} required>
            <input
              type="text"
              name="company_name"
              className="input"
              value={companyData.company_name}
              onChange={handleCompanyChange}
              required
            />
          </Field>

          <Field label={isRTL ? 'رقم الترخيص' : 'License Number'}>
            <input
              type="text"
              name="company_license_number"
              className="input"
              value={companyData.company_license_number}
              onChange={handleCompanyChange}
            />
          </Field>

          <Field label={isRTL ? 'رقم الهاتف' : 'Phone'} required>
            <input
              type="tel"
              name="company_phone"
              className="input"
              value={companyData.company_phone}
              onChange={handleCompanyChange}
              required
            />
          </Field>

          <Field label={isRTL ? 'الدولة' : 'Country'}>
            <input
              type="text"
              name="company_country"
              className="input"
              value={companyData.company_country}
              onChange={handleCompanyChange}
            />
          </Field>

          <Field label={isRTL ? 'المدينة' : 'City'}>
            <input
              type="text"
              name="company_city"
              className="input"
              value={companyData.company_city}
              onChange={handleCompanyChange}
            />
          </Field>

          <Field label={isRTL ? 'العنوان' : 'Address'}>
            <textarea
              name="company_address"
              className="input"
              value={companyData.company_address}
              onChange={handleCompanyChange}
              rows="3"
            />
          </Field>

          <Field label={isRTL ? 'الوصف' : 'Description'}>
            <textarea
              name="company_description"
              className="input"
              value={companyData.company_description}
              onChange={handleCompanyChange}
              rows="4"
            />
          </Field>

          <Field label={isRTL ? 'نوع النشاط' : 'Activity Type'}>
            <select
              name="company_activity_type"
              className="input"
              value={companyData.company_activity_type}
              onChange={handleCompanyChange}
            >
              <option value="construction">{isRTL ? 'مقاولات' : 'Construction'}</option>
              <option value="project_management">{isRTL ? 'إدارة مشاريع' : 'Project Management'}</option>
              <option value="engineering">{isRTL ? 'مكتب هندسي' : 'Engineering Office'}</option>
              <option value="consulting">{isRTL ? 'استشارات' : 'Consulting'}</option>
            </select>
          </Field>

          <Field label={isRTL ? 'اللون الأساسي' : 'Primary Color'}>
            <input
              type="color"
              name="primary_color"
              value={companyData.primary_color}
              onChange={handleCompanyChange}
              style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }}
            />
          </Field>

          <Field label={isRTL ? 'اللون الثانوي' : 'Secondary Color'}>
            <input
              type="color"
              name="secondary_color"
              value={companyData.secondary_color}
              onChange={handleCompanyChange}
              style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }}
            />
          </Field>
        </div>
        
        {/* Contractor Information Section */}
        <div style={{ 
          marginTop: 'var(--space-8)',
          paddingTop: 'var(--space-6)',
          borderTop: '2px solid #e5e7eb'
        }}>
          <h3 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e293b',
            marginBottom: 'var(--space-2)'
          }}>
            {isRTL ? 'بيانات المقاول (الشركة نفسها)' : 'Contractor Information (Same as Company)'}
          </h3>
          <p style={{
            color: '#64748b',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--space-4)'
          }}>
            {isRTL 
              ? 'بيانات المقاول هي نفس بيانات الشركة. سيتم استخدام هذه البيانات تلقائياً في جميع المشاريع والعقود والتراخيص.'
              : 'Contractor information is the same as company information. This data will be automatically used in all projects, contracts, and licenses.'
            }
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            <Field label={isRTL ? 'اسم المقاول (عربي)' : 'Contractor Name (Arabic)'}>
              <input
                type="text"
                name="contractor_name"
                className="input"
                value={companyData.contractor_name}
                onChange={handleCompanyChange}
                placeholder={isRTL ? 'أدخل اسم المقاول بالعربية (نفس اسم الشركة عادة)' : 'Enter contractor name in Arabic (usually same as company name)'}
              />
            </Field>

            <Field label={isRTL ? 'اسم المقاول (إنجليزي)' : 'Contractor Name (English)'}>
              <input
                type="text"
                name="contractor_name_en"
                className="input"
                value={companyData.contractor_name_en}
                onChange={handleCompanyChange}
                placeholder={isRTL ? 'أدخل اسم المقاول بالإنجليزية' : 'Enter contractor name in English'}
              />
            </Field>

            <Field label={isRTL ? 'رقم رخصة المقاول' : 'Contractor License Number'}>
              <input
                type="text"
                name="contractor_license_no"
                className="input"
                value={companyData.contractor_license_no}
                onChange={handleCompanyChange}
                placeholder={isRTL ? 'أدخل رقم رخصة المقاول' : 'Enter contractor license number'}
              />
            </Field>

            <Field label={isRTL ? 'هاتف المقاول' : 'Contractor Phone'}>
              <input
                type="tel"
                name="contractor_phone"
                className="input"
                value={companyData.contractor_phone}
                onChange={handleCompanyChange}
                placeholder={isRTL ? 'أدخل رقم هاتف المقاول' : 'Enter contractor phone number'}
              />
            </Field>

            <Field label={isRTL ? 'بريد المقاول الإلكتروني' : 'Contractor Email'}>
              <input
                type="email"
                name="contractor_email"
                className="input"
                value={companyData.contractor_email}
                onChange={handleCompanyChange}
                placeholder={isRTL ? 'أدخل البريد الإلكتروني للمقاول' : 'Enter contractor email'}
              />
            </Field>

            <Field label={isRTL ? 'عنوان المقاول' : 'Contractor Address'}>
              <textarea
                name="contractor_address"
                className="input"
                value={companyData.contractor_address}
                onChange={handleCompanyChange}
                rows="3"
                placeholder={isRTL ? 'أدخل عنوان المقاول' : 'Enter contractor address'}
              />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={handleSaveCompany}
            disabled={loading}
            loading={loading}
          >
            <FaSave style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            {isRTL ? 'حفظ بيانات الشركة' : 'Save Company Data'}
          </Button>
        </div>
      </Card>

      {/* 2. Owner Account */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <FaUser style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }} />
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e293b'
          }}>
            {isRTL ? 'بيانات الحساب الرئيسي' : 'Owner Account'}
          </h2>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 'var(--space-4)' 
        }}>
          <Field label={isRTL ? 'الاسم الأول' : 'First Name'}>
            <input
              type="text"
              name="first_name"
              className="input"
              value={ownerData.first_name}
              onChange={handleOwnerChange}
            />
          </Field>

          <Field label={isRTL ? 'الاسم الأخير' : 'Last Name'}>
            <input
              type="text"
              name="last_name"
              className="input"
              value={ownerData.last_name}
              onChange={handleOwnerChange}
            />
          </Field>

          <Field label={isRTL ? 'رقم الهاتف' : 'Phone'}>
            <input
              type="tel"
              name="phone"
              className="input"
              value={ownerData.phone}
              onChange={handleOwnerChange}
            />
          </Field>

          <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'}>
            <input
              type="email"
              className="input"
              value={ownerData.email}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#6b7280', fontSize: 'var(--font-size-sm)' }}>
              {isRTL ? 'البريد الإلكتروني لا يمكن تعديله' : 'Email cannot be modified'}
            </small>
          </Field>

          <Field label={isRTL ? 'الصورة الشخصية' : 'Profile Picture'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              {user?.avatar && !ownerData.avatar && (
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <input
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleOwnerChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload">
                <Button
                  type="button"
                  variant="secondary"
                  as="span"
                  style={{ cursor: 'pointer' }}
                >
                  <FaUpload style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
                  {isRTL ? 'اختر صورة' : 'Choose Image'}
                </Button>
              </label>
              {ownerData.avatar && (
                <span style={{ color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
                  {ownerData.avatar.name}
                </span>
              )}
            </div>
          </Field>
        </div>

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={handleSaveOwner}
            disabled={loading}
            loading={loading}
          >
            <FaSave style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            {isRTL ? 'حفظ بيانات المالك' : 'Save Owner Data'}
          </Button>
        </div>
      </Card>

      {/* 3. Subscription Details (Read Only) */}
      <Card>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <FaInfoCircle style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }} />
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e293b'
          }}>
            {isRTL ? 'تفاصيل الاشتراك' : 'Subscription Details'}
          </h2>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 'var(--space-4)' 
        }}>
          <Field label={isRTL ? 'عدد المستخدمين المسموح' : 'Max Users'}>
            <input
              type="text"
              className="input"
              value={subscriptionData.max_users}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </Field>

          <Field label={isRTL ? 'عدد المشاريع المسموح' : 'Max Projects'}>
            <input
              type="text"
              className="input"
              value={subscriptionData.max_projects}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </Field>

          <Field label={isRTL ? 'حالة الاشتراك' : 'Subscription Status'}>
            <input
              type="text"
              className="input"
              value={subscriptionData.subscription_status || '-'}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </Field>

          <Field label={isRTL ? 'تاريخ البداية' : 'Start Date'}>
            <input
              type="text"
              className="input"
              value={subscriptionData.subscription_start_date || '-'}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </Field>

          <Field label={isRTL ? 'تاريخ النهاية' : 'End Date'}>
            <input
              type="text"
              className="input"
              value={subscriptionData.subscription_end_date || '-'}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </Field>
        </div>

        <div style={{ 
          marginTop: 'var(--space-4)',
          padding: 'var(--space-4)',
          backgroundColor: '#f9fafb',
          borderRadius: 'var(--radius-md)',
          color: '#6b7280',
          fontSize: 'var(--font-size-sm)'
        }}>
          <FaInfoCircle style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
          {isRTL 
            ? 'هذه البيانات لا يمكن تعديلها من الشركة. يتم تعديلها من السوبر أدمن العام فقط.'
            : 'This data cannot be modified by the company. It can only be modified by the global super admin.'
          }
        </div>
      </Card>
    </div>
  );
}

