// Hook للـ Caching - لتخزين البيانات مؤقتاً
import { useState, useEffect, useRef } from 'react';

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

export function useCache(key, fetcher, options = {}) {
  const { 
    duration = CACHE_DURATION,
    enabled = true,
    dependencies = []
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheKeyRef = useRef(key);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
    cacheKeyRef.current = cacheKey;

    // التحقق من الـ cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < duration) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    // جلب البيانات
    setLoading(true);
    setError(null);
    
    fetcher()
      .then((result) => {
        // التأكد من أن الـ key لم يتغير
        if (cacheKeyRef.current === cacheKey) {
          setData(result);
          // حفظ في الـ cache
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
      })
      .catch((err) => {
        if (cacheKeyRef.current === cacheKey) {
          setError(err);
        }
      })
      .finally(() => {
        if (cacheKeyRef.current === cacheKey) {
          setLoading(false);
        }
      });
  }, [key, enabled, duration, ...dependencies]);

  // دالة لمسح الـ cache
  const clearCache = () => {
    cache.delete(cacheKeyRef.current);
  };

  // دالة لمسح كل الـ cache
  const clearAllCache = () => {
    cache.clear();
  };

  return { data, loading, error, clearCache, clearAllCache };
}

