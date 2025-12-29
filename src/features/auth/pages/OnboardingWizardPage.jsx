import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import { FaUser, FaBuilding, FaCheck, FaArrowRight, FaArrowLeft, FaUpload } from 'react-icons/fa';

export default function OnboardingWizardPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  // التحقق من الصلاحيات: Onboarding فقط لـ Company Super Admin في أول تسجيل دخول
  useEffect(() => {
    if (user) {
      // Super Admin لا يحتاج Onboarding
      if (user.is_superuser) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      
      // التحقق من أن المستخدم هو Company Super Admin
      const isCompanySuperAdmin = user.role?.name === 'company_super_admin';
      
      // إذا لم يكن Company Super Admin → توجيه للـ Dashboard
      if (!isCompanySuperAdmin) {
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // إذا كان Company Super Admin لكن أكمل Onboarding → توجيه للـ Dashboard
      if (user.onboarding_completed) {
        navigate('/dashboard', { replace: true });
        return;
      }
      
      // فقط Company Super Admin الذي لم يكمل Onboarding يمكنه البقاء هنا
    }
  }, [user, navigate]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Step 1: Profile
    username: '',
    phone: '',
    avatar: null,
    
    // Step 2: Company Basic Information
    company_name_ar: '',
    company_name_en: '',
    license_number: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    company_country: '',
    company_city: '',
    company_activity_type: 'construction',
    
    // Contractor Info (المقاول = الشركة نفسها)
    contractor_name: '',
    contractor_name_en: '',
    contractor_license_no: '',
    contractor_phone: '',
    contractor_email: '',
    contractor_address: '',
    
    // Step 3: Company Theme & Logo
    company_logo: null,
    primary_color: '#f97316',
    secondary_color: '#ea580c',
    company_description: '',
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // ✅ Step 1: Update Profile (username, phone, avatar) + Mark onboarding as completed
      // دمج جميع بيانات البروفايل في طلب واحد لتجنب إرسال FormData فارغ
      const profileData = new FormData();
      
      // إضافة بيانات البروفايل فقط إذا كانت موجودة
      if (formData.username && formData.username.trim()) {
        profileData.append('username', formData.username.trim());
      }
      if (formData.phone && formData.phone.trim()) {
        // ✅ تنظيف رقم الهاتف من المسافات (Backend يتطلب تنسيق بدون مسافات)
        const cleanedPhone = formData.phone.trim().replace(/\s+/g, '');
        profileData.append('phone', cleanedPhone);
      }
      if (formData.avatar) {
        profileData.append('avatar', formData.avatar);
      }
      
      // ✅ إضافة onboarding_completed في نفس الطلب
      profileData.append('onboarding_completed', 'true');
      
      // ✅ إرسال الطلب دائماً (حتى لو كان فارغاً) لأن onboarding_completed موجود دائماً
      await api.patch('auth/users/update_profile/', profileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // ✅ Step 2: Update Company Settings (basic info + logo + colors + contractor info)
      const settingsData = new FormData();
      
      // ✅ Basic Company Information - الحقول المطلوبة
      // company_name مطلوب في Backend
      if (formData.company_name_ar && formData.company_name_ar.trim()) {
        settingsData.append('company_name', formData.company_name_ar.trim());
      } else {
        // إذا لم يتم إدخال اسم الشركة، نستخدم email كاسم افتراضي
        throw new Error(isRTL ? 'اسم الشركة (عربي) مطلوب' : 'Company name (Arabic) is required');
      }
      
      // ⚠️ company_email محمي من التعديل في Backend (يتم إنشاؤه عند إنشاء الشركة)
      // لا نرسله في Onboarding لأنه محمي
      // if (formData.company_email && formData.company_email.trim()) {
      //   settingsData.append('company_email', formData.company_email.trim());
      // }
      
      // company_phone مطلوب في Backend
      if (formData.company_phone && formData.company_phone.trim()) {
        // ✅ تنظيف رقم الهاتف من المسافات (Backend يتطلب تنسيق بدون مسافات)
        const cleanedPhone = formData.company_phone.trim().replace(/\s+/g, '');
        settingsData.append('company_phone', cleanedPhone);
      } else {
        throw new Error(isRTL ? 'رقم هاتف الشركة مطلوب' : 'Company phone is required');
      }
      
      // الحقول الاختيارية
      if (formData.license_number && formData.license_number.trim()) {
        settingsData.append('company_license_number', formData.license_number.trim());
      }
      if (formData.company_address && formData.company_address.trim()) {
        settingsData.append('company_address', formData.company_address.trim());
      }
      if (formData.company_country && formData.company_country.trim()) {
        settingsData.append('company_country', formData.company_country.trim());
      }
      if (formData.company_city && formData.company_city.trim()) {
        settingsData.append('company_city', formData.company_city.trim());
      }
      if (formData.company_activity_type) {
        settingsData.append('company_activity_type', formData.company_activity_type);
      }
      if (formData.company_description && formData.company_description.trim()) {
        settingsData.append('company_description', formData.company_description.trim());
      }
      
      // Contractor Information (المقاول = الشركة)
      if (formData.contractor_name && formData.contractor_name.trim()) {
        settingsData.append('contractor_name', formData.contractor_name.trim());
      }
      if (formData.contractor_name_en && formData.contractor_name_en.trim()) {
        settingsData.append('contractor_name_en', formData.contractor_name_en.trim());
      }
      if (formData.contractor_license_no && formData.contractor_license_no.trim()) {
        settingsData.append('contractor_license_no', formData.contractor_license_no.trim());
      }
      if (formData.contractor_phone && formData.contractor_phone.trim()) {
        // ✅ تنظيف رقم الهاتف من المسافات (Backend يتطلب تنسيق بدون مسافات)
        const cleanedPhone = formData.contractor_phone.trim().replace(/\s+/g, '');
        settingsData.append('contractor_phone', cleanedPhone);
      }
      if (formData.contractor_email && formData.contractor_email.trim()) {
        settingsData.append('contractor_email', formData.contractor_email.trim());
      }
      if (formData.contractor_address && formData.contractor_address.trim()) {
        settingsData.append('contractor_address', formData.contractor_address.trim());
      }
      
      // Logo and Theme
      if (formData.company_logo) {
        settingsData.append('company_logo', formData.company_logo);
      }
      // ✅ primary_color و secondary_color موجودان دائماً (قيم افتراضية)
      settingsData.append('primary_color', formData.primary_color || '#f97316');
      settingsData.append('secondary_color', formData.secondary_color || '#ea580c');
      
      // ✅ Logging للتحقق من البيانات المرسلة
      console.log('Sending tenant settings:', {
        company_name: formData.company_name_ar,
        company_phone: formData.company_phone,
        primary_color: formData.primary_color || '#f97316',
        secondary_color: formData.secondary_color || '#ea580c'
      });
      
      // ✅ إرسال إعدادات الشركة
      await api.patch('auth/tenant-settings/current/', settingsData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Refresh user data and load theme
      await refreshUser();
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Onboarding error:', err);
      console.error('Error response:', err.response?.data);
      // ✅ عرض رسالة الخطأ بشكل أفضل
      let errorMsg = isRTL ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        console.error('Error data:', errorData);
        
        if (typeof errorData === 'string') {
          errorMsg = errorData;
        } else if (errorData.error) {
          errorMsg = errorData.error;
        } else if (errorData.message) {
          errorMsg = errorData.message;
        } else if (errorData.detail) {
          errorMsg = errorData.detail;
        } else {
          // ✅ عرض جميع الأخطاء من القائمة
          const errors = [];
          for (const [key, value] of Object.entries(errorData)) {
            if (Array.isArray(value)) {
              errors.push(`${key}: ${value[0]}`);
            } else if (typeof value === 'string') {
              errors.push(`${key}: ${value}`);
            } else if (typeof value === 'object') {
              errors.push(`${key}: ${JSON.stringify(value)}`);
            }
          }
          if (errors.length > 0) {
            errorMsg = errors.join(', ');
          } else {
            // عرض أول خطأ من القائمة
            const firstError = Object.values(errorData)[0];
            if (Array.isArray(firstError)) {
              errorMsg = firstError[0];
            } else if (typeof firstError === 'string') {
              errorMsg = firstError;
            }
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: isRTL ? 'إعداد البروفايل' : 'Profile Setup', icon: FaUser },
    { number: 2, title: isRTL ? 'بيانات الشركة الأساسية' : 'Company Basic Info', icon: FaBuilding },
    { number: 3, title: isRTL ? 'إعداد الشركة' : 'Company Theme', icon: FaBuilding },
    { number: 4, title: isRTL ? 'تأكيد الإعداد' : 'Confirm Setup', icon: FaCheck },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      backgroundColor: '#f9fafb',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <Card style={{ 
        width: '100%', 
        maxWidth: '800px',
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Progress Steps */}
        <div style={{ 
          marginBottom: 'var(--space-8)',
          paddingBottom: 'var(--space-6)',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-4)'
          }}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} style={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: isActive || isCompleted ? '#2563eb' : '#e5e7eb',
                    color: isActive || isCompleted ? '#ffffff' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    transition: 'all 0.3s'
                  }}>
                    {isCompleted ? <FaCheck /> : <Icon />}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isActive ? 'var(--font-weight-bold)' : 'var(--font-weight-normal)',
                    color: isActive || isCompleted ? '#2563eb' : '#6b7280',
                    textAlign: 'center'
                  }}>
                    {step.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{ 
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-4)',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626'
          }}>
            <strong>{isRTL ? 'خطأ:' : 'Error:'}</strong> {error}
          </div>
        )}

        {/* Step 1: Profile Setup */}
        {currentStep === 1 && (
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-6)'
            }}>
              {isRTL ? 'إعداد البروفايل الشخصي' : 'Profile Setup'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'اسم المستخدم' : 'Username'}>
                <input
                  type="text"
                  name="username"
                  className="input"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={isRTL ? 'أدخل اسم المستخدم' : 'Enter username'}
                />
              </Field>

              <Field label={isRTL ? 'رقم الهاتف' : 'Phone'}>
                <input
                  type="tel"
                  name="phone"
                  className="input"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={isRTL ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                />
              </Field>

              <Field label={isRTL ? 'الصورة الشخصية' : 'Profile Picture'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleChange}
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
                  {formData.avatar && (
                    <span style={{ color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
                      {formData.avatar.name}
                    </span>
                  )}
                </div>
              </Field>
            </div>
          </div>
        )}

        {/* Step 2: Company Basic Information */}
        {currentStep === 2 && (
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-6)'
            }}>
              {isRTL ? 'بيانات الشركة الأساسية' : 'Company Basic Information'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'} required>
                <input
                  type="text"
                  name="company_name_ar"
                  className="input"
                  value={formData.company_name_ar}
                  onChange={handleChange}
                  required
                  placeholder={isRTL ? 'أدخل اسم الشركة بالعربية' : 'Enter company name in Arabic'}
                />
              </Field>

              <Field label={isRTL ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}>
                <input
                  type="text"
                  name="company_name_en"
                  className="input"
                  value={formData.company_name_en}
                  onChange={handleChange}
                  placeholder={isRTL ? 'أدخل اسم الشركة بالإنجليزية' : 'Enter company name in English'}
                />
              </Field>

              <Field label={isRTL ? 'رقم الترخيص' : 'License Number'} required>
                <input
                  type="text"
                  name="license_number"
                  className="input"
                  value={formData.license_number}
                  onChange={handleChange}
                  required
                  placeholder={isRTL ? 'أدخل رقم الترخيص' : 'Enter license number'}
                />
              </Field>

              <Field label={isRTL ? 'رقم الهاتف' : 'Phone'} required>
                <input
                  type="tel"
                  name="company_phone"
                  className="input"
                  value={formData.company_phone}
                  onChange={handleChange}
                  required
                  placeholder={isRTL ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                />
              </Field>

              <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'} required>
                <input
                  type="email"
                  name="company_email"
                  className="input"
                  value={formData.company_email}
                  onChange={handleChange}
                  required
                  placeholder={isRTL ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                />
              </Field>

              <Field label={isRTL ? 'الدولة' : 'Country'}>
                <input
                  type="text"
                  name="company_country"
                  className="input"
                  value={formData.company_country}
                  onChange={handleChange}
                  placeholder={isRTL ? 'أدخل الدولة' : 'Enter country'}
                />
              </Field>

              <Field label={isRTL ? 'المدينة' : 'City'}>
                <input
                  type="text"
                  name="company_city"
                  className="input"
                  value={formData.company_city}
                  onChange={handleChange}
                  placeholder={isRTL ? 'أدخل المدينة' : 'Enter city'}
                />
              </Field>

              <Field label={isRTL ? 'العنوان' : 'Address'}>
                <textarea
                  name="company_address"
                  className="input"
                  value={formData.company_address}
                  onChange={handleChange}
                  rows="3"
                  placeholder={isRTL ? 'أدخل العنوان' : 'Enter address'}
                />
              </Field>

              <Field label={isRTL ? 'نوع النشاط' : 'Activity Type'}>
                <select
                  name="company_activity_type"
                  className="input"
                  value={formData.company_activity_type}
                  onChange={handleChange}
                >
                  <option value="construction">{isRTL ? 'مقاولات' : 'Construction'}</option>
                  <option value="project_management">{isRTL ? 'إدارة مشاريع' : 'Project Management'}</option>
                  <option value="engineering">{isRTL ? 'مكتب هندسي' : 'Engineering Office'}</option>
                  <option value="consulting">{isRTL ? 'استشارات' : 'Consulting'}</option>
                </select>
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
                marginBottom: 'var(--space-4)'
              }}>
                {isRTL ? 'بيانات المقاول (الشركة نفسها)' : 'Contractor Information (Same as Company)'}
              </h3>
              <p style={{
                color: '#64748b',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--space-4)'
              }}>
                {isRTL 
                  ? 'بيانات المقاول هي نفس بيانات الشركة. سيتم استخدام هذه البيانات تلقائياً في جميع المشاريع والعقود.'
                  : 'Contractor information is the same as company information. This data will be automatically used in all projects and contracts.'
                }
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                <Field label={isRTL ? 'اسم المقاول (عربي)' : 'Contractor Name (Arabic)'}>
                  <input
                    type="text"
                    name="contractor_name"
                    className="input"
                    value={formData.contractor_name}
                    onChange={handleChange}
                    placeholder={isRTL ? 'أدخل اسم المقاول بالعربية (نفس اسم الشركة عادة)' : 'Enter contractor name in Arabic (usually same as company name)'}
                  />
                </Field>

                <Field label={isRTL ? 'اسم المقاول (إنجليزي)' : 'Contractor Name (English)'}>
                  <input
                    type="text"
                    name="contractor_name_en"
                    className="input"
                    value={formData.contractor_name_en}
                    onChange={handleChange}
                    placeholder={isRTL ? 'أدخل اسم المقاول بالإنجليزية' : 'Enter contractor name in English'}
                  />
                </Field>

                <Field label={isRTL ? 'رقم رخصة المقاول' : 'Contractor License Number'}>
                  <input
                    type="text"
                    name="contractor_license_no"
                    className="input"
                    value={formData.contractor_license_no}
                    onChange={handleChange}
                    placeholder={isRTL ? 'أدخل رقم رخصة المقاول' : 'Enter contractor license number'}
                  />
                </Field>

                <Field label={isRTL ? 'هاتف المقاول' : 'Contractor Phone'}>
                  <input
                    type="tel"
                    name="contractor_phone"
                    className="input"
                    value={formData.contractor_phone}
                    onChange={handleChange}
                    placeholder={isRTL ? 'أدخل رقم هاتف المقاول' : 'Enter contractor phone number'}
                  />
                </Field>

                <Field label={isRTL ? 'بريد المقاول الإلكتروني' : 'Contractor Email'}>
                  <input
                    type="email"
                    name="contractor_email"
                    className="input"
                    value={formData.contractor_email}
                    onChange={handleChange}
                    placeholder={isRTL ? 'أدخل البريد الإلكتروني للمقاول' : 'Enter contractor email'}
                  />
                </Field>

                <Field label={isRTL ? 'عنوان المقاول' : 'Contractor Address'}>
                  <textarea
                    name="contractor_address"
                    className="input"
                    value={formData.contractor_address}
                    onChange={handleChange}
                    rows="3"
                    placeholder={isRTL ? 'أدخل عنوان المقاول' : 'Enter contractor address'}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Company Theme & Logo */}
        {currentStep === 3 && (
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-6)'
            }}>
              {isRTL ? 'إعداد الشركة' : 'Company Theme & Logo'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'شعار الشركة' : 'Company Logo'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <input
                    type="file"
                    name="company_logo"
                    accept="image/*"
                    onChange={handleChange}
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
                  {formData.company_logo && (
                    <span style={{ color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
                      {formData.company_logo.name}
                    </span>
                  )}
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <Field label={isRTL ? 'اللون الأساسي' : 'Primary Color'}>
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }}
                  />
                </Field>

                <Field label={isRTL ? 'اللون الثانوي' : 'Secondary Color'}>
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)' }}
                  />
                </Field>
              </div>

              <Field label={isRTL ? 'وصف الشركة' : 'Company Description'}>
                <textarea
                  name="company_description"
                  className="input"
                  value={formData.company_description}
                  onChange={handleChange}
                  rows="4"
                  placeholder={isRTL ? 'اكتب وصف مختصر للشركة' : 'Write a brief description of the company'}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 4 && (
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: '#1e293b',
              marginBottom: 'var(--space-6)'
            }}>
              {isRTL ? 'تأكيد الإعداد' : 'Confirm Setup'}
            </h2>
            
            <div style={{ 
              padding: 'var(--space-6)',
              backgroundColor: '#f9fafb',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-6)'
            }}>
              <p style={{ 
                color: '#64748b',
                fontSize: 'var(--font-size-base)',
                lineHeight: '1.6'
              }}>
                {isRTL 
                  ? 'يرجى مراجعة الإعدادات التي قمت بإدخالها. بعد الحفظ، سيتم تحميل Theme الشركة والانتقال إلى Dashboard.'
                  : 'Please review the settings you have entered. After saving, the company theme will be loaded and you will be redirected to the Dashboard.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-4)', 
          justifyContent: 'space-between',
          marginTop: 'var(--space-8)',
          paddingTop: 'var(--space-6)',
          borderTop: '2px solid #e5e7eb'
        }}>
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={loading}
            >
              <FaArrowLeft style={{ [isRTL ? 'marginRight' : 'marginLeft']: 'var(--space-2)' }} />
              {isRTL ? 'السابق' : 'Back'}
            </Button>
          ) : (
            <div></div>
          )}
          
          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={loading}
            >
              {isRTL ? 'التالي' : 'Next'}
              <FaArrowRight style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              loading={loading}
            >
              <FaCheck style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
              {isRTL ? 'حفظ والإكمال' : 'Save & Complete'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

