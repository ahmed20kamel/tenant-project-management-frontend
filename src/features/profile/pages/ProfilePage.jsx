import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Field from '../../../components/forms/Field';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import DateInput from '../../../components/fields/DateInput';
import { FaCamera, FaTrash, FaSave, FaUser } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, apiClient, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    username: '',
    date_of_birth: '',
    blood_type: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        username: user.username || '',
        date_of_birth: user.date_of_birth || '',
        blood_type: user.blood_type || '',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        medical_notes: user.medical_notes || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: isRTL ? 'الملف يجب أن يكون صورة' : 'File must be an image' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: isRTL ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await apiClient.post('auth/users/upload_avatar/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ type: 'success', text: isRTL ? 'تم رفع الصورة بنجاح' : 'Avatar uploaded successfully' });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || (isRTL ? 'فشل رفع الصورة' : 'Failed to upload avatar')
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف الصورة؟' : 'Are you sure you want to delete the avatar?')) {
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      await apiClient.delete('auth/users/delete_avatar/');
      setMessage({ type: 'success', text: isRTL ? 'تم حذف الصورة بنجاح' : 'Avatar deleted successfully' });
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.detail || (isRTL ? 'فشل حذف الصورة' : 'Failed to delete avatar')
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // تنظيف البيانات - تحويل empty strings إلى null للحقول الاختيارية
      const cleanedData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        // للحقول التاريخية، نحول empty string إلى null
        if (key === 'date_of_birth' && value === '') {
          cleanedData[key] = null;
        } else {
          // للحقول النصية، نتركها empty string (Django يتعامل معها كـ blank)
          cleanedData[key] = value === '' ? '' : value;
        }
      });

      await apiClient.patch('auth/users/update_profile/', cleanedData);
      setMessage({ type: 'success', text: isRTL ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully' });
      await refreshUser();
    } catch (error) {
      console.error('Update error:', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = isRTL ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile';
      
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
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
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // استخدام avatar_url من API أو بناء URL يدوياً
  const avatarUrl = user?.avatar_url || (user?.avatar ? `${window.location.protocol}//${window.location.hostname}:8000${user.avatar}` : null);

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--space-6)' }}>
      <Card>
        <div className="card-header">
          <h1 className="card-title" style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-2)' }}>
            {isRTL ? 'الملف الشخصي' : 'Profile'}
          </h1>
        </div>

        {message.text && (
          <div
            style={{
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: message.type === 'error' ? 'var(--error-50)' : 'var(--success-50)',
              color: message.type === 'error' ? 'var(--error-600)' : 'var(--success-600)',
              border: `1px solid ${message.type === 'error' ? 'var(--error-500)' : 'var(--success-500)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-size-lg)',
                color: 'inherit',
                padding: '0',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-surface-2)',
                position: 'relative',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={isRTL ? 'صورة المستخدم' : 'User avatar'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <FaUser style={{ fontSize: '48px', color: 'var(--color-text-tertiary)' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="avatar-upload"
                type="file"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <label htmlFor="avatar-upload">
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<FaCamera />}
                  disabled={uploading}
                  as="span"
                  style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
                >
                  {isRTL ? 'رفع صورة' : 'Upload Photo'}
                </Button>
              </label>
              {avatarUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<FaTrash />}
                  onClick={handleDeleteAvatar}
                  disabled={uploading}
                >
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
              )}
            </div>
            {uploading && (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {isRTL ? 'جاري المعالجة...' : 'Processing...'}
              </div>
            )}
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', width: '100%' }} />

          {/* Basic Information */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-6)',
                color: 'var(--color-text-primary)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid var(--color-primary)',
              }}
            >
              {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'}>
                <input
                  type="email"
                  className="input"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: 'var(--gray-100)', cursor: 'not-allowed' }}
                />
              </Field>
              <Field label={isRTL ? 'اسم المستخدم' : 'Username'}>
                <input
                  type="text"
                  name="username"
                  className="input"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'الاسم الأول' : 'First Name'}>
                <input
                  type="text"
                  name="first_name"
                  className="input"
                  value={formData.first_name}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'اسم العائلة' : 'Last Name'}>
                <input
                  type="text"
                  name="last_name"
                  className="input"
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'رقم الهاتف' : 'Phone'}>
                <input
                  type="tel"
                  name="phone"
                  className="input"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}>
                <DateInput
                  className="input"
                  value={formData.date_of_birth}
                  onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
                />
              </Field>
              <Field label={isRTL ? 'فصيلة الدم' : 'Blood Type'}>
                <select
                  name="blood_type"
                  className="input"
                  value={formData.blood_type}
                  onChange={handleInputChange}
                >
                  <option value="">{isRTL ? 'اختر فصيلة الدم' : 'Select Blood Type'}</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </Field>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', width: '100%' }} />

          {/* Emergency Contact */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-6)',
                color: 'var(--color-text-primary)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid var(--color-primary)',
              }}
            >
              {isRTL ? 'جهة الاتصال في حالات الطوارئ' : 'Emergency Contact'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
              <Field label={isRTL ? 'اسم جهة الاتصال' : 'Contact Name'}>
                <input
                  type="text"
                  name="emergency_contact_name"
                  className="input"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label={isRTL ? 'رقم جهة الاتصال' : 'Contact Phone'}>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  className="input"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                />
              </Field>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', width: '100%' }} />

          {/* Medical Notes */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-6)',
                color: 'var(--color-text-primary)',
                paddingBottom: 'var(--space-2)',
                borderBottom: '2px solid var(--color-primary)',
              }}
            >
              {isRTL ? 'ملاحظات طبية' : 'Medical Notes'}
            </h2>
            <Field label={isRTL ? 'ملاحظات طبية (حساسية، أدوية، إلخ)' : 'Medical Notes (allergies, medications, etc.)'}>
              <textarea
                name="medical_notes"
                className="input"
                rows={4}
                value={formData.medical_notes}
                onChange={handleInputChange}
                style={{ resize: 'vertical', minHeight: '100px' }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              startIcon={loading ? null : <FaSave />}
              disabled={loading}
              loading={loading}
            >
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
