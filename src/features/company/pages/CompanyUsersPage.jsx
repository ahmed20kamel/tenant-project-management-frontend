import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Field from '../../../components/forms/Field';
import { FaUsers, FaUserPlus, FaEdit, FaTrash, FaBan, FaCheck, FaUserCog } from 'react-icons/fa';

export default function CompanyUsersPage() {
  const { user, refreshUser } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: '',
    is_active: true,
  });

  // التحقق من الصلاحيات - فقط Company Super Admin يمكنه إدارة المستخدمين
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
      // تحميل المستخدمين
      const usersResponse = await api.get('auth/users/');
      setUsers(usersResponse.data?.results || usersResponse.data || []);
      
      // تحميل الأدوار
      const rolesResponse = await api.get('auth/roles/');
      const allRoles = rolesResponse.data?.results || rolesResponse.data || [];
      // تصفية الأدوار الخاصة بالشركة فقط
      // نعرض فقط: company_super_admin و Manager و staff_user
      const companyRoles = allRoles.filter(role => 
        role.is_active && 
        (role.name === 'company_super_admin' || role.name === 'Manager' || role.name === 'staff_user')
      );
      setRoles(companyRoles);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء تحميل البيانات' : 'Error loading data'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleOpenModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email || '',
        password: '', // لا نملأ كلمة المرور
        first_name: userToEdit.first_name || '',
        last_name: userToEdit.last_name || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role?.id || '',
        is_active: userToEdit.is_active !== false,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: '',
        is_active: true,
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editingUser) {
        // تحديث مستخدم موجود
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // لا نرسل كلمة المرور إذا كانت فارغة
        }
        await api.patch(`auth/users/${editingUser.id}/`, updateData);
        setSuccess(isRTL ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully');
      } else {
        // إنشاء مستخدم جديد
        if (!formData.password) {
          setError(isRTL ? 'كلمة المرور مطلوبة' : 'Password is required');
          setLoading(false);
          return;
        }
        await api.post('auth/users/', formData);
        setSuccess(isRTL ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully');
      }
      
      await loadData();
      await refreshUser();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.email?.[0] ||
                       err.response?.data?.password?.[0] ||
                       (isRTL ? 'حدث خطأ أثناء حفظ البيانات' : 'Error saving data');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستخدم؟' : 'Are you sure you want to delete this user?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`auth/users/${userId}/`);
      setSuccess(isRTL ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء حذف المستخدم' : 'Error deleting user'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userToToggle) => {
    setLoading(true);
    try {
      await api.patch(`auth/users/${userToToggle.id}/`, {
        is_active: !userToToggle.is_active
      });
      setSuccess(isRTL ? 'تم تحديث حالة المستخدم بنجاح' : 'User status updated successfully');
      await loadData();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError(err.response?.data?.error || (isRTL ? 'حدث خطأ أثناء تحديث الحالة' : 'Error updating status'));
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
      maxWidth: '1400px', 
      margin: '0 auto',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--space-8)',
        flexDirection: isRTL ? 'row-reverse' : 'row'
      }}>
        <div>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            {isRTL ? 'إدارة المستخدمين' : 'Manage Users'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: 'var(--font-size-base)' }}>
            {isRTL ? 'إدارة المستخدمين وصلاحياتهم داخل الشركة' : 'Manage users and their permissions within the company'}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => handleOpenModal()}
        >
          <FaUserPlus style={{ [isRTL ? 'marginLeft' : 'marginRight']: 'var(--space-2)' }} />
          {isRTL ? 'إضافة مستخدم جديد' : 'Add New User'}
        </Button>
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

      {/* قائمة المستخدمين */}
      <Card>
        <div style={{ 
          marginBottom: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}>
          <FaUsers style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }} />
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#1e293b'
          }}>
            {isRTL ? 'قائمة المستخدمين' : 'Users List'}
          </h2>
        </div>

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: '#6b7280' }}>
              {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 'var(--space-3)', textAlign: isRTL ? 'right' : 'left' }}>
                    {isRTL ? 'الاسم' : 'Name'}
                  </th>
                  <th style={{ padding: 'var(--space-3)', textAlign: isRTL ? 'right' : 'left' }}>
                    {isRTL ? 'البريد الإلكتروني' : 'Email'}
                  </th>
                  <th style={{ padding: 'var(--space-3)', textAlign: isRTL ? 'right' : 'left' }}>
                    {isRTL ? 'الدور' : 'Role'}
                  </th>
                  <th style={{ padding: 'var(--space-3)', textAlign: isRTL ? 'right' : 'left' }}>
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 'var(--space-3)' }}>
                      {u.first_name} {u.last_name}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>{u.email}</td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      {(() => {
                        const roleName = u.role?.name || '-';
                        if (roleName === 'company_super_admin') {
                          return isRTL ? 'مدير الشركة' : 'Company Super Admin';
                        } else if (roleName === 'Manager') {
                          return isRTL ? 'مدير المشاريع' : 'Manager';
                        } else if (roleName === 'staff_user') {
                          return isRTL ? 'موظف' : 'Staff User';
                        }
                        return roleName;
                      })()}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      <span style={{
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-sm)',
                        backgroundColor: u.is_active ? '#d1fae5' : '#fee2e2',
                        color: u.is_active ? '#059669' : '#dc2626'
                      }}>
                        {u.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenModal(u)}
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant={u.is_active ? "secondary" : "primary"}
                          size="sm"
                          onClick={() => handleToggleActive(u)}
                          title={u.is_active ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
                        >
                          {u.is_active ? <FaBan /> : <FaCheck />}
                        </Button>
                        {u.id !== user?.id && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(u.id)}
                            title={isRTL ? 'حذف' : 'Delete'}
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal لإضافة/تعديل مستخدم */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-4)'
        }}>
          <Card style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-6)',
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }}>
              <h2 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: '#1e293b'
              }}>
                {editingUser 
                  ? (isRTL ? 'تعديل مستخدم' : 'Edit User')
                  : (isRTL ? 'إضافة مستخدم جديد' : 'Add New User')
                }
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseModal}
              >
                ×
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'} required>
                  <input
                    type="email"
                    name="email"
                    className="input"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingUser}
                  />
                </Field>

                {!editingUser && (
                  <Field label={isRTL ? 'كلمة المرور' : 'Password'} required>
                    <input
                      type="password"
                      name="password"
                      className="input"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                    />
                  </Field>
                )}

                {editingUser && (
                  <Field label={isRTL ? 'كلمة المرور الجديدة (اختياري)' : 'New Password (Optional)'}>
                    <input
                      type="password"
                      name="password"
                      className="input"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={isRTL ? 'اتركه فارغاً إذا لم ترد تغيير كلمة المرور' : 'Leave empty to keep current password'}
                    />
                  </Field>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field label={isRTL ? 'الاسم الأول' : 'First Name'}>
                    <input
                      type="text"
                      name="first_name"
                      className="input"
                      value={formData.first_name}
                      onChange={handleInputChange}
                    />
                  </Field>

                  <Field label={isRTL ? 'الاسم الأخير' : 'Last Name'}>
                    <input
                      type="text"
                      name="last_name"
                      className="input"
                      value={formData.last_name}
                      onChange={handleInputChange}
                    />
                  </Field>
                </div>

                <Field label={isRTL ? 'رقم الهاتف' : 'Phone'}>
                  <input
                    type="tel"
                    name="phone"
                    className="input"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </Field>

                <Field label={isRTL ? 'الدور' : 'Role'} required>
                  <select
                    name="role"
                    className="input"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">{isRTL ? 'اختر الدور' : 'Select Role'}</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {isRTL ? role.name_ar || role.name : role.name_en || role.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span>{isRTL ? 'المستخدم نشط' : 'User is active'}</span>
                  </label>
                </Field>
              </div>

              <div style={{
                marginTop: 'var(--space-6)',
                display: 'flex',
                gap: 'var(--space-3)',
                justifyContent: 'flex-end'
              }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  loading={loading}
                >
                  {editingUser 
                    ? (isRTL ? 'حفظ التعديلات' : 'Save Changes')
                    : (isRTL ? 'إضافة المستخدم' : 'Add User')
                  }
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

