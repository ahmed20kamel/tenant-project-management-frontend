import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

// استخدام نفس api instance من services/api.js
// ✅ لا نحتاج لإضافة interceptors هنا لأن api.js يضيفها بالفعل (request + response)
const apiClient = api;

// دالة لتعديل سطوع اللون
const adjustColorBrightness = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

// تطبيق Theme ديناميكياً - لوحة ألوان كاملة للشركة
const applyTheme = (theme) => {
  if (!theme) return;
  
  const root = document.documentElement;
  if (theme.primary_color) {
    root.style.setProperty('--color-primary', theme.primary_color);
    root.style.setProperty('--primary', theme.primary_color);
    // حساب primary-600 و primary-700 و primary-50 من primary_color
    const primary600 = adjustColorBrightness(theme.primary_color, -20);
    const primary700 = adjustColorBrightness(theme.primary_color, -30);
    const primary50 = adjustColorBrightness(theme.primary_color, 90);
    root.style.setProperty('--color-primary-hover', primary600);
    root.style.setProperty('--color-primary-active', primary700);
    root.style.setProperty('--color-primary-light', primary50);
    root.style.setProperty('--primary-600', primary600);
    root.style.setProperty('--primary-700', primary700);
    root.style.setProperty('--primary-50', primary50);
    root.style.setProperty('--primary-dark', primary700);
  }
  if (theme.secondary_color) {
    root.style.setProperty('--color-secondary', theme.secondary_color);
    // حساب secondary-600 من secondary_color
    const secondary600 = adjustColorBrightness(theme.secondary_color, -20);
    root.style.setProperty('--secondary-600', secondary600);
  }
};

// تطبيق Admin Theme (أزرق - تكنولوجي)
const applyAdminThemeColors = () => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', '#2563eb');
  root.style.setProperty('--primary', '#2563eb');
  root.style.setProperty('--color-primary-hover', '#1d4ed8');
  root.style.setProperty('--color-primary-active', '#1e40af');
  root.style.setProperty('--color-primary-light', '#eff6ff');
  root.style.setProperty('--primary-600', '#1d4ed8');
  root.style.setProperty('--primary-700', '#1e40af');
  root.style.setProperty('--primary-50', '#eff6ff');
  root.style.setProperty('--color-secondary', '#1d4ed8');
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantTheme, setTenantTheme] = useState(null);
  
  // ✅ استخدام useRef لتخزين أحدث user value بدون إعادة render
  const userRef = useRef(null);
  
  // ✅ تحديث userRef عند تغيير user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Theme افتراضي للـ Super Admin (أزرق - تكنولوجي)
  const adminTheme = {
    company_name: 'SaaS Admin Panel',
    logo_url: '/logo.png',
    primary_color: '#2563eb', // أزرق
    secondary_color: '#1d4ed8', // أزرق داكن
  };

  // ✅ تحميل Theme الشركة (فقط للمستخدمين التابعين لشركة) - باستخدام useCallback
  const loadTenantTheme = useCallback(async (useStoredAsFallback = false) => {
    try {
      // التحقق من وجود token قبل محاولة تحميل Theme
      const token = localStorage.getItem('access_token');
      if (!token) {
        // إذا كان مطلوب استخدام stored theme كـ fallback
        if (useStoredAsFallback) {
          const storedTheme = localStorage.getItem('tenant_theme');
          if (storedTheme) {
            try {
              const themeData = JSON.parse(storedTheme);
              setTenantTheme(themeData);
              applyTheme(themeData);
              return themeData;
            } catch (e) {
              // Silent fail
            }
          }
        }
        return null;
      }
      
      // ✅ دائماً تحميل من API أولاً - لا نعتمد على localStorage
      const response = await apiClient.get('auth/tenant-settings/theme/');
      const themeData = response.data;
      
      // ✅ التأكد من وجود البيانات المطلوبة
      if (!themeData) {
        throw new Error('No theme data returned');
      }
      
      // التأكد من وجود tenant_id في البيانات
      // ✅ استخدام userRef.current للحصول على أحدث user value
      const currentUser = userRef.current || JSON.parse(localStorage.getItem('user') || '{}');
      if (!themeData.tenant_id && currentUser?.tenant?.id) {
        themeData.tenant_id = String(currentUser.tenant.id);
      }
      
      // ✅ تطبيق Theme مباشرة
      setTenantTheme(themeData);
      applyTheme(themeData);
      
      // ✅ حفظ في localStorage كـ cache فقط (ليس primary source)
      localStorage.setItem('tenant_theme', JSON.stringify(themeData));
      
      return themeData;
    } catch (error) {
      // ✅ تقليل التحذيرات - فقط تسجيل الأخطاء المهمة
      const status = error.response?.status;
      
      // إذا كان الخطأ 401 (Unauthorized)، لا نعرض تحذير - هذا طبيعي قبل تسجيل الدخول
      if (status === 401) {
        // استخدام stored theme كـ fallback فقط إذا كان مطلوب
        if (useStoredAsFallback) {
          const storedTheme = localStorage.getItem('tenant_theme');
          if (storedTheme) {
            try {
              const themeData = JSON.parse(storedTheme);
              setTenantTheme(themeData);
              applyTheme(themeData);
              return themeData;
            } catch (e) {
              // Silent fail
            }
          }
        }
        return null;
      }
      
      // Silent error handling
      
      // إذا كان الخطأ 404 أو 403، لا نستخدم Theme افتراضي
      if (status === 404 || status === 403) {
        // إذا كان مطلوب استخدام stored theme كـ fallback
        if (useStoredAsFallback) {
          const storedTheme = localStorage.getItem('tenant_theme');
          if (storedTheme) {
            try {
              const themeData = JSON.parse(storedTheme);
              setTenantTheme(themeData);
              applyTheme(themeData);
              return themeData;
            } catch (e) {
              // Silent fail
            }
          }
        }
        return null;
      }
      
      // استخدام Theme افتراضي للشركات فقط في حالة أخطاء أخرى
      // ✅ استخدام userRef.current للحصول على أحدث user value
      const currentUser = userRef.current || JSON.parse(localStorage.getItem('user') || '{}');
      const defaultTheme = {
        tenant_id: currentUser?.tenant?.id ? String(currentUser.tenant.id) : null,
        company_name: 'Project Management System',
        logo_url: null,
        primary_color: '#f97316',
        secondary_color: '#ea580c',
      };
      
      // ✅ فقط إذا كان مطلوب استخدام fallback
      if (useStoredAsFallback) {
        setTenantTheme(defaultTheme);
        applyTheme(defaultTheme);
      }
      return defaultTheme;
    }
  }, []); // ✅ Empty dependency array - function لا تعتمد على state

  // تطبيق Admin Theme
  const applyAdminTheme = () => {
    setTenantTheme(adminTheme);
    applyAdminThemeColors(); // تطبيق الألوان الأزرق
    localStorage.setItem('tenant_theme', JSON.stringify(adminTheme));
  };

  // تحميل بيانات المستخدم من localStorage عند التحميل
  useEffect(() => {
    const loadInitialData = async () => {
      const storedUser = localStorage.getItem('user');
      const storedPermissions = localStorage.getItem('permissions');
      const token = localStorage.getItem('access_token');

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          if (storedPermissions) {
            setPermissions(JSON.parse(storedPermissions));
          } else if (userData.permissions) {
            setPermissions(userData.permissions);
          }

          // ✅ تحديث userRef قبل أي شيء
          userRef.current = userData;

          // ✅ تحميل Theme مباشرة بعد تحميل user إذا كان هناك token
          if (token) {
            if (userData.is_superuser) {
              // Super Admin → مسح أي Theme محفوظ واستخدام Admin Theme فقط
              localStorage.removeItem('tenant_theme');
              localStorage.removeItem('tenant_id');
              setTenantTheme(null);
              applyAdminTheme();
            } else if (userData.tenant) {
              // Tenant User → تحميل Theme الشركة مباشرة
              // ✅ دائماً تحميل Theme من API مباشرة
              try {
                await loadTenantTheme(true);
              } catch (err) {
                // Silent fail
              }
            }
          }
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
          localStorage.removeItem('tenant_theme');
        }
      }
      
      setLoading(false);
    };

    loadInitialData();
  }, []); // ✅ يعمل مرة واحدة فقط عند mount

  // ✅ تحميل Theme منفصل عند تغيير user state (للحالات التي يتم فيها تحديث user لاحقاً)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !user) {
      return;
    }

    // ✅ تجنب تحميل Theme مرة أخرى إذا كان موجوداً بالفعل (لتجنب infinite loop)
    if (tenantTheme && tenantTheme.tenant_id === String(user?.tenant?.id)) {
      console.log('⏭️ Theme already loaded for this tenant, skipping');
      return;
    }

    console.log('🔄 useEffect triggered for theme load - User:', user?.email, 'Tenant:', user?.tenant?.id);

    if (user.is_superuser) {
      // Super Admin → مسح أي Theme محفوظ واستخدام Admin Theme فقط
      console.log('👤 Super Admin detected, applying admin theme');
      localStorage.removeItem('tenant_theme');
      localStorage.removeItem('tenant_id');
      setTenantTheme(null);
      applyAdminTheme();
    } else if (user.tenant) {
      // Tenant User → تحميل Theme الشركة لجميع المستخدمين داخل الشركة
      console.log('🏢 Tenant User detected, loading theme from API for tenant:', user.tenant.id);
      
      // ✅ دائماً تحميل Theme من API مباشرة - لا نستخدم localStorage كـ primary source
      // نستخدم stored theme فقط كـ fallback إذا فشل التحميل من API
      loadTenantTheme(true)
        .then((theme) => {
          if (theme) {
            console.log('✅ Theme loaded successfully in useEffect:', {
              company_name: theme.company_name,
              logo_url: theme.logo_url ? 'Present' : 'Missing',
              primary_color: theme.primary_color,
              secondary_color: theme.secondary_color,
            });
          } else {
            console.warn('⚠️ Theme load returned null/undefined');
          }
        })
        .catch(err => {
          console.error('❌ Failed to load tenant theme from API in useEffect:', err);
          // Fallback سيتم التعامل معه داخل loadTenantTheme
        });
    } else {
      console.warn('⚠️ User has no tenant, skipping theme load');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant?.id]); // ✅ يعتمد على tenant ID فقط لتجنب infinite loops

  // تحديث بيانات المستخدم من API
  const refreshUser = async () => {
    try {
      const response = await apiClient.get('auth/users/profile/');
      const userData = response.data;
      setUser(userData);
      setPermissions(userData.permissions || []);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('permissions', JSON.stringify(userData.permissions || []));
      
      // تحميل Theme بناءً على نوع المستخدم
      if (userData.is_superuser) {
        applyAdminTheme();
      } else if (userData.tenant) {
        // تحميل Theme الشركة لجميع المستخدمين داخل الشركة
        // Theme الشركة يجب أن يظهر لجميع المستخدمين (Manager, Staff User, Company Super Admin)
        // ✅ تحميل من API مباشرة بدون fallback لأننا نعلم أن البيانات محدثة
        await loadTenantTheme(false);
      }
      
      return userData;
    } catch (error) {
      // Silent error handling
      throw error;
    }
  };

  // تسجيل الدخول
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('auth/login/', {
        email,
        password,
      });

      const { access, refresh, user: userData, role, tenant_id, tenant_slug, is_super_admin } = response.data;
      
      // حفظ بيانات الجلسة
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('permissions', JSON.stringify(userData.permissions || []));
      localStorage.setItem('user_role', role);
      localStorage.setItem('is_super_admin', is_super_admin ? 'true' : 'false');
      
      // تحميل Theme بناءً على نوع المستخدم
      if (is_super_admin || userData.is_superuser) {
        // Super Admin → مسح أي Theme محفوظ واستخدام Admin Theme فقط
        localStorage.removeItem('tenant_theme');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('tenant_slug');
        setTenantTheme(null);
        applyAdminTheme();
      } else if (userData.tenant) {
        // Tenant User → حفظ بيانات الشركة وتحميل Theme
        if (tenant_id) {
          localStorage.setItem('tenant_id', tenant_id);
        }
        
        // حفظ tenant_slug من response أو من userData.tenant
        const slug = tenant_slug || userData.tenant?.slug;
        if (slug) {
          localStorage.setItem('tenant_slug', slug);
        } else if (userData.tenant?.name) {
          // إنشاء slug من الاسم إذا لم يكن موجوداً (fallback)
          const generatedSlug = userData.tenant.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          localStorage.setItem('tenant_slug', generatedSlug);
        }
        
        // تحميل Theme الشركة لجميع المستخدمين داخل الشركة
        // Theme الشركة يجب أن يظهر لجميع المستخدمين (Manager, Staff User, Company Super Admin)
        // ✅ تحميل من API مباشرة بدون fallback لأننا نعلم أن البيانات محدثة
        await loadTenantTheme(false);
      }

      setUser(userData);
      setPermissions(userData.permissions || []);

      return { 
        success: true, 
        user: userData,
        role,
        tenant_id,
        tenant_slug: tenant_slug || userData.tenant?.slug,
        is_super_admin
      };
    } catch (error) {
      // Error handled by caller
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.detail || 'Login failed',
      };
    }
  };

  // تسجيل الخروج
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await apiClient.post('auth/users/logout/', {
            refresh_token: refreshToken,
          }, {
            // ✅ تجاهل الأخطاء في logout - نكمل حتى لو فشل
            validateStatus: (status) => status < 500,  // قبول 204, 400, 401, etc.
          });
        } catch (error) {
          // ✅ تجاهل الأخطاء في logout - نكمل عملية logout
          // Silent fail - نكمل في finally
        }
      }
    } catch (error) {
      // ✅ تجاهل الأخطاء - نكمل في finally
    } finally {
      // حفظ نوع المستخدم قبل مسح البيانات
      const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
      const tenantSlug = localStorage.getItem('tenant_slug');
      
      // مسح كامل للـ localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      localStorage.removeItem('tenant_theme');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('tenant_slug');
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_super_admin');
      
      setUser(null);
      setPermissions([]);
      setTenantTheme(null);
      
      // إعادة تعيين Theme إلى الافتراضي
      const root = document.documentElement;
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--color-primary-hover');
      root.style.removeProperty('--primary-600');
      root.style.removeProperty('--color-secondary');
      
      // التوجيه بناءً على نوع المستخدم
      if (isSuperAdmin) {
        window.location.href = '/admin/login';
      } else if (tenantSlug) {
        window.location.href = `/login/${tenantSlug}`;
      } else {
        window.location.href = '/';
      }
    }
  };

  // التحقق من الصلاحية
  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    return permissions.includes(permissionCode);
  };

  // التحقق من وجود أي صلاحية من قائمة الصلاحيات
  const hasAnyPermission = (permissionCodes) => {
    return permissionCodes.some(code => hasPermission(code));
  };

  // التحقق من وجود جميع الصلاحيات
  const hasAllPermissions = (permissionCodes) => {
    return permissionCodes.every(code => hasPermission(code));
  };

  const value = {
    user,
    permissions,
    loading,
    tenantTheme,
    login,
    logout,
    refreshUser,
    loadTenantTheme,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    apiClient, // تصدير apiClient للاستخدام في المكونات
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// تصدير apiClient للاستخدام المباشر
export { apiClient };
