import { useState, useEffect } from "react";
import { api } from "../services/api";

/**
 * Hook للتحقق من الصلاحيات المتاحة للمستخدم على مشروع معين
 * @param {string|number} projectId - معرف المشروع
 * @returns {Object} - الصلاحيات المتاحة
 */
export default function useProjectPermissions(projectId) {
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: false,
    can_create: false,
    can_submit: false,
    can_approve: false,
    can_reject: false,
    can_final_approve: false,
    can_delete: false,
    current_status: null,
    is_final_approved: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setPermissions({
        can_view: true,
        can_edit: false,
        can_create: false,
        can_submit: false,
        can_approve: false,
        can_reject: false,
        can_final_approve: false,
        can_delete: false,
        current_status: null,
        is_final_approved: false,
      });
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    console.log(`🔍 جلب الصلاحيات للمشروع ${projectId}...`);
    api
      .get(`projects/${projectId}/permissions/`)
      .then(({ data }) => {
        if (mounted) {
          console.log(`✅ تم جلب الصلاحيات من API للمشروع ${projectId}:`, data);
          setPermissions(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("Error fetching project permissions:", err);
          setError(err);
          // في حالة الخطأ، نستخدم الصلاحيات الافتراضية (يمكن المشاهدة فقط)
          setPermissions({
            can_view: true,
            can_edit: false,
            can_create: false,
            can_submit: false,
            can_approve: false,
            can_reject: false,
            can_final_approve: false,
            can_delete: false,
            current_status: null,
            is_final_approved: false,
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return { permissions, loading, error };
}

