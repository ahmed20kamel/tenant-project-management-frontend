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
    startOrder: null,
    payments: [],
    variations: [],
    invoices: [],
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
      // ✅ استخدام include parameter لتقليل عدد API calls من 6 إلى 2 فقط (project + payments)
      const [pRes, paymentsRes, variationsRes, invoicesRes] = await Promise.allSettled([
        api.get(`projects/${projectId}/?include=siteplan,license,contract,awarding,start_order`),
        api.get(`projects/${projectId}/payments/`),
        api.get(`projects/${projectId}/variations/`),
        api.get(`projects/${projectId}/actual-invoices/`),
      ]);

      if (!mountedRef.current) return;

      const project = extractData(pRes);
      
      // ✅ استخراج البيانات المرتبطة من project object
      const siteplan = project?.siteplan_data || null;
      const license = project?.license_data || null;
      const contract = project?.contract_data || null;
      const awarding = project?.awarding_data || null;
      const startOrder = project?.start_order_data || null;
      
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
        // Silent warning
      }
      
      // ✅ معالجة Variations بشكل آمن
      let variationsData = [];
      if (variationsRes.status === "fulfilled") {
        const response = variationsRes.value;
        if (response && response.status >= 200 && response.status < 300) {
          const responseData = response.data;
          if (Array.isArray(responseData)) {
            variationsData = responseData;
          } else if (responseData && Array.isArray(responseData.results)) {
            variationsData = responseData.results;
          }
        }
      }

      // ✅ معالجة Invoices بشكل آمن - تصفية الفواتير المرتبطة بدفعات
      let invoicesData = [];
      if (invoicesRes.status === "fulfilled") {
        const response = invoicesRes.value;
        if (response && response.status >= 200 && response.status < 300) {
          const responseData = response.data;
          let rawInvoices = [];
          if (Array.isArray(responseData)) {
            rawInvoices = responseData;
          } else if (responseData && Array.isArray(responseData.results)) {
            rawInvoices = responseData.results;
          }
          // تصفية الفواتير: استبعاد الفواتير المرتبطة بدفعات
          invoicesData = rawInvoices.filter(inv => {
            // يجب أن يكون فاتورة (وليس دفعة)
            if (!inv.invoice_number && !inv.invoice_date) return false;
            // استبعاد الفواتير المرتبطة بدفعات
            if (inv.payment_id || inv.payment) return false;
            return true;
          });
        }
      }

      setData({ project, siteplan, license, contract, awarding, startOrder, payments: paymentsData, variations: variationsData, invoices: invoicesData });
      setLoading(false);
    } catch (error) {
      if (!mountedRef.current) return;
      // Error handled by caller
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

