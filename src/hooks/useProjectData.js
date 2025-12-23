// Hook موحد لجلب بيانات المشروع الكاملة (project, siteplan, license, contract)
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api";

export default function useProjectData(projectId) {
  const [data, setData] = useState({
    project: null,
    siteplan: null,
    license: null,
    contract: null,
    awarding: null,
    payments: [],
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // ✅ مساعد لاستخراج البيانات مع التحقق من حالة HTTP
  const extractData = useCallback((result) => {
    if (result.status === "fulfilled") {
      // ✅ axios يعيد response object مباشرة في result.value
      const response = result.value;
      // ✅ التحقق من أن الاستجابة ناجحة (status 200-299)
      if (response && response.status >= 200 && response.status < 300) {
        const responseData = response.data;
        if (Array.isArray(responseData)) {
          return responseData.length > 0 ? responseData[0] : null;
        }
        return responseData || null;
      }
    }
    return null;
  }, []);

  // ✅ دالة تحميل البيانات
  const loadData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    mountedRef.current = true;
    setLoading(true);

    try {
      const [pRes, spRes, lcRes, ctRes, awRes, paymentsRes] = await Promise.allSettled([
        api.get(`projects/${projectId}/`),
        api.get(`projects/${projectId}/siteplan/`),
        api.get(`projects/${projectId}/license/`),
        api.get(`projects/${projectId}/contract/`),
        api.get(`projects/${projectId}/awarding/`),
        api.get(`projects/${projectId}/payments/`),
      ]);

      if (!mountedRef.current) return;

      const project = extractData(pRes);
      const siteplan = extractData(spRes);
      const license = extractData(lcRes);
      const contract = extractData(ctRes);
      const awarding = extractData(awRes);
      
      // ✅ معالجة الدفعات بشكل آمن - إذا فشل الطلب، نستخدم قائمة فارغة
      let paymentsData = [];
      if (paymentsRes.status === "fulfilled") {
        const response = paymentsRes.value;
        if (response && response.status >= 200 && response.status < 300) {
          const responseData = response.data;
          if (Array.isArray(responseData)) {
            paymentsData = responseData;
          } else if (responseData && Array.isArray(responseData.results)) {
            paymentsData = responseData.results;
          }
        }
      } else {
        // ✅ إذا فشل الطلب (مثل 500 error)، نستخدم قائمة فارغة بدلاً من إيقاف التحميل
        console.warn("Failed to load payments:", paymentsRes.reason);
      }

      setData({ project, siteplan, license, contract, awarding, payments: paymentsData });
      setLoading(false);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error loading project data:", error);
      setLoading(false);
    }
  }, [projectId, extractData]);

  useEffect(() => {
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  return { ...data, loading, reload: loadData };
}

