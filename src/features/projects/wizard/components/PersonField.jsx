// مكون موحد لحقل الاستشاري أو المقاول مع البحث
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import CreatableSelect from "react-select/creatable";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import Button from "../../../../components/common/Button";
import { loadSavedList, saveToList } from "../../../../utils/localStorage";
import { formatUAEPhone } from "../../../../utils/inputFormatters";
import { api } from "../../../../services/api";
import { FaPlus } from "react-icons/fa";

// ✅ Cache للاستشاريين من قاعدة البيانات (shared across all PersonField instances)
const consultantsCache = {
  data: [],
  timestamp: null,
  loading: false,
  CACHE_DURATION: 5 * 60 * 1000, // 5 دقائق
};

export default function PersonField({
  type = "consultant", // "consultant" or "contractor"
  label,
  licenseLabel,
  nameValue,
  nameEnValue,
  licenseValue,
  phoneValue,
  emailValue,
  onNameChange,
  onNameEnChange,
  onLicenseChange,
  onPhoneChange,
  onEmailChange,
  isView,
  onSelect,
}) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const storageKey = type === "consultant" ? "consultants" : "contractors";
  const [savedList, setSavedList] = useState(() => loadSavedList(storageKey));
  const [dbConsultants, setDbConsultants] = useState([]); // الاستشاريين من قاعدة البيانات
  const [loadingConsultants, setLoadingConsultants] = useState(false);

  // ✅ جلب الاستشاريين من قاعدة البيانات (للاستشاري فقط) مع caching
  useEffect(() => {
    if (type !== "consultant" || isView) {
      return;
    }

    // ✅ التحقق من الـ cache أولاً
    const now = Date.now();
    const isCacheValid = 
      consultantsCache.data.length > 0 && 
      consultantsCache.timestamp && 
      (now - consultantsCache.timestamp) < consultantsCache.CACHE_DURATION;

    if (isCacheValid) {
      // ✅ استخدام البيانات من الـ cache مباشرة
      setDbConsultants(consultantsCache.data);
      return;
    }

    // ✅ إذا كان هناك تحميل جاري، ننتظر
    if (consultantsCache.loading) {
      return;
    }

    const loadConsultantsFromDB = async () => {
      consultantsCache.loading = true;
      setLoadingConsultants(true);
      
      try {
        const { data: projects } = await api.get("projects/");
        const items = Array.isArray(projects) ? projects : (projects?.results || projects?.items || projects?.data || []);
        
        const consultantsMap = new Map();

        // ✅ تحسين: استخدام Promise.allSettled بدلاً من Promise.all لتجنب فشل كل الطلبات إذا فشل واحد
        const results = await Promise.allSettled(
          items.map(async (p) => {
            const projectId = p.id;
            if (!projectId) return null;
            
            try {
              const { data: lic } = await api.get(`projects/${projectId}/license/`);
              const firstL = Array.isArray(lic) ? lic[0] : null;
              
              if (firstL) {
                // استشاري التصميم - نفس المنطق في ConsultantsPage
                if (firstL.design_consultant_name) {
                  const key = firstL.design_consultant_name.toLowerCase().trim();
                  if (!consultantsMap.has(key)) {
                    consultantsMap.set(key, {
                      name: firstL.design_consultant_name,
                      name_en: firstL.design_consultant_name_en || "",
                      license: firstL.design_consultant_license_no || "",
                    });
                  }
                }

                // استشاري الإشراف (إذا كان مختلف) - نفس المنطق في ConsultantsPage
                if (firstL.supervision_consultant_name && 
                    firstL.supervision_consultant_name !== firstL.design_consultant_name) {
                  const key = firstL.supervision_consultant_name.toLowerCase().trim();
                  if (!consultantsMap.has(key)) {
                    consultantsMap.set(key, {
                      name: firstL.supervision_consultant_name,
                      name_en: firstL.supervision_consultant_name_en || "",
                      license: firstL.supervision_consultant_license_no || "",
                    });
                  }
                }
              }
            } catch (e) {
              // Silent error - بعض المشاريع قد لا تحتوي على رخص
            }
            return null;
          })
        );

        const consultantsList = Array.from(consultantsMap.values()).sort((a, b) => 
          a.name.localeCompare(b.name, isAR ? "ar" : "en")
        );

        // ✅ حفظ في الـ cache
        consultantsCache.data = consultantsList;
        consultantsCache.timestamp = Date.now();
        setDbConsultants(consultantsList);
      } catch (e) {
        console.error("Error loading consultants from DB:", e);
        setDbConsultants([]);
      } finally {
        consultantsCache.loading = false;
        setLoadingConsultants(false);
      }
    };
    
    loadConsultantsFromDB();
  }, [type, isView, isAR]);

  // ✅ استخدام فقط الاستشاريين من قاعدة البيانات (نفس منطق ConsultantsPage)
  const allConsultants = useMemo(() => {
    if (type !== "consultant") return savedList;
    
    // ✅ نستخدم فقط الاستشاريين من قاعدة البيانات، بدون دمج مع القائمة المحفوظة محلياً
    return dbConsultants;
  }, [dbConsultants, savedList, type]);

  // ✅ تحويل الاستشاريين إلى options للقائمة المنسدلة
  const consultantOptions = useMemo(() => {
    if (type !== "consultant") return [];
    return allConsultants.map((c) => ({
      value: c.name,
      label: c.name,
      license: c.license,
      name_en: c.name_en || "",
    }));
  }, [allConsultants, type]);

  // ✅ التحقق من وجود الاستشاري في القائمة
  const isConsultantInList = useMemo(() => {
    if (type !== "consultant" || !nameValue) return true;
    return allConsultants.some(
      (c) => c.name.toLowerCase().trim() === nameValue.toLowerCase().trim()
    );
  }, [allConsultants, nameValue, type]);

  // ✅ تحسين البحث - البحث في أي جزء من الاسم
  const filteredList = useMemo(() => {
    if (!nameValue) return savedList;
    const searchTerm = nameValue.toLowerCase();
    return savedList.filter((c) =>
      c.name.toLowerCase().includes(searchTerm) ||
      (c.license && c.license.toLowerCase().includes(searchTerm))
    );
  }, [savedList, nameValue]);

  const namePlaceholder = type === "consultant" 
    ? t("consultant_name_placeholder") || "اكتب أو ابحث عن اسم الاستشاري"
    : t("contractor_name_placeholder");
  const licensePlaceholder = type === "consultant"
    ? t("consultant_license_placeholder")
    : t("contractor_license_placeholder");
  const notFoundText = type === "consultant"
    ? t("consultant_not_found", { defaultValue: "" })
    : t("contractor_not_found");

  if (isView) {
    // ✅ للمقاول: استخدام grid 2 columns في viewMode أيضاً
    if (type === "contractor") {
      return (
        <div className="form-grid cols-2" style={{ gap: "var(--space-4)", width: "100%" }}>
          <ViewRow label={t("owner_name_ar") || "الاسم (عربي)"} value={nameValue} />
          <ViewRow label={t("owner_name_en") || "الاسم بالإنجليزية"} value={nameEnValue} />
          <ViewRow label={licenseLabel} value={licenseValue} />
          <ViewRow label={t("phone") || "الهاتف"} value={phoneValue || ""} />
          <ViewRow label={t("email") || "البريد الإلكتروني"} value={emailValue || ""} />
          <div></div>
        </div>
      );
    }
    // ✅ للاستشاري: استخدام grid 2 columns في viewMode أيضاً
    return (
      <div className="form-grid cols-2" style={{ gap: "var(--space-4)", width: "100%" }}>
        <ViewRow label={t("owner_name_ar") || "الاسم (عربي)"} value={nameValue} />
        <ViewRow label={t("owner_name_en") || "الاسم بالإنجليزية"} value={nameEnValue} />
        <ViewRow label={licenseLabel} value={licenseValue} />
        <div></div>
      </div>
    );
  }

  // ✅ إضافة استشاري جديد إذا لم يكن موجوداً
  const handleAddNew = () => {
    if (!nameValue || !licenseValue) return;
    
    // ✅ حفظ الاستشاري مع name_en
    const newItem = { 
      name: nameValue, 
      license: licenseValue,
      name_en: nameEnValue || "",
      ...(type === "contractor" && {
        phone: phoneValue || "",
        email: emailValue || ""
      })
    };
    saveToList(storageKey, newItem);
    setSavedList(loadSavedList(storageKey)); // ✅ إعادة تحميل القائمة المحدثة
    
    // ✅ إضافة الاستشاري الجديد إلى قائمة قاعدة البيانات المحلية والـ cache
    if (type === "consultant") {
      setDbConsultants((prev) => {
        const exists = prev.some(
          (c) => c.name.toLowerCase().trim() === nameValue.toLowerCase().trim() &&
                 c.license === licenseValue
        );
        if (!exists) {
          const updated = [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name, isAR ? "ar" : "en"));
          // ✅ تحديث الـ cache أيضاً
          consultantsCache.data = updated;
          consultantsCache.timestamp = Date.now();
          return updated;
        }
        return prev;
      });
    }
  };

  // ✅ حفظ name_en تلقائياً عند تغييره
  const handleNameEnChange = (value) => {
    if (onNameEnChange) {
      onNameEnChange(value);
    }
    
    // ✅ إذا كان هناك name و license، نحفظ name_en تلقائياً
    if (nameValue && licenseValue && value) {
      const existingItem = savedList.find(
        c => c.name === nameValue && c.license === licenseValue
      );
      
      if (existingItem) {
        // ✅ تحديث name_en للاستشاري/المقاول الموجود
        saveToList(storageKey, {
          ...existingItem,
          name_en: value
        });
        setSavedList(loadSavedList(storageKey));
      }
    }
  };

  // ✅ حفظ phone تلقائياً عند تغييره (للمقاول فقط)
  const handlePhoneChange = (value) => {
    if (onPhoneChange) {
      onPhoneChange(value);
    }
    
    // ✅ إذا كان هناك name و license، نحفظ phone تلقائياً
    if (type === "contractor" && nameValue && licenseValue && value) {
      const existingItem = savedList.find(
        c => c.name === nameValue && c.license === licenseValue
      );
      
      if (existingItem) {
        // ✅ تحديث phone للمقاول الموجود
        saveToList(storageKey, {
          ...existingItem,
          phone: value
        });
        setSavedList(loadSavedList(storageKey));
      }
    }
  };

  // ✅ حفظ email تلقائياً عند تغييره (للمقاول فقط)
  const handleEmailChange = (value) => {
    if (onEmailChange) {
      onEmailChange(value);
    }
    
    // ✅ إذا كان هناك name و license، نحفظ email تلقائياً
    if (type === "contractor" && nameValue && licenseValue && value) {
      const existingItem = savedList.find(
        c => c.name === nameValue && c.license === licenseValue
      );
      
      if (existingItem) {
        // ✅ تحديث email للمقاول الموجود
        saveToList(storageKey, {
          ...existingItem,
          email: value
        });
        setSavedList(loadSavedList(storageKey));
      }
    }
  };

  // ✅ تحميل بيانات المقاول تلقائياً عند تغيير الرخصة أو الاسم
  const handleLicenseChange = (value) => {
    if (onLicenseChange) {
      onLicenseChange(value);
    }
    
    // ✅ إذا كان مقاول وتم إدخال name و license، نحاول تحميل البيانات المحفوظة
    if (type === "contractor" && nameValue && value) {
      const existingItem = savedList.find(
        c => c.name === nameValue && c.license === value
      );
      
      if (existingItem) {
        // ✅ تحميل البيانات المحفوظة تلقائياً
        if (existingItem.name_en && onNameEnChange) {
          onNameEnChange(existingItem.name_en);
        }
        if (existingItem.phone && onPhoneChange) {
          onPhoneChange(existingItem.phone);
        }
        if (existingItem.email && onEmailChange) {
          onEmailChange(existingItem.email);
        }
      }
    }
  };

  // ✅ تحميل بيانات المقاول تلقائياً عند تغيير الاسم
  const handleNameChange = (value) => {
    if (onNameChange) {
      onNameChange(value);
    }
    setShowSuggestions(true);
    
    // ✅ إذا كان مقاول وتم إدخال name و license، نحاول تحميل البيانات المحفوظة
    if (type === "contractor" && value && licenseValue) {
      const existingItem = savedList.find(
        c => c.name === value && c.license === licenseValue
      );
      
      if (existingItem) {
        // ✅ تحميل البيانات المحفوظة تلقائياً
        if (existingItem.name_en && onNameEnChange) {
          onNameEnChange(existingItem.name_en);
        }
        if (existingItem.phone && onPhoneChange) {
          onPhoneChange(existingItem.phone);
        }
        if (existingItem.email && onEmailChange) {
          onEmailChange(existingItem.email);
        }
      }
    }
  };

  // ✅ للمقاول: استخدام grid 2 columns
  if (type === "contractor") {
  return (
      <div className="form-grid cols-2" style={{ gap: "var(--space-4)", width: "100%" }}>
        <Field label="الاسم (عربي)">
        <div className="pos-relative">
          <input
            className="input"
            placeholder={namePlaceholder}
            value={nameValue || ""}
            onChange={(e) => {
              handleNameChange(e.target.value);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && nameValue && (
            <div className="dropdown-list">
              {filteredList.length > 0 ? (
                filteredList.map((c, i) => (
                  <div
                    key={i}
                    className="dropdown-item"
                    onMouseDown={() => {
                        handleNameChange(c.name || "");
                        onNameEnChange && onNameEnChange(c.name_en || "");
                        handleLicenseChange(c.license || "");
                        onPhoneChange && onPhoneChange(c.phone || "");
                        onEmailChange && onEmailChange(c.email || "");
                      if (onSelect) onSelect(c);
                    }}
                  >
                    {c.name}
                  </div>
                ))
              ) : (
                notFoundText && (
                  <div className="dropdown-item opacity-70">
                    {notFoundText}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </Field>
        <Field label={t("owner_name_en") || "الاسم بالإنجليزية"}>
          <input
            className="input"
            placeholder={t("owner_name_en_placeholder") || "اكتب الاسم بالإنجليزية"}
            value={nameEnValue || ""}
            onChange={(e) => {
              handleNameEnChange(e.target.value);
            }}
          />
        </Field>
      <Field label={licenseLabel}>
        <input
          className="input"
          placeholder={licensePlaceholder}
          value={licenseValue || ""}
            onChange={(e) => {
              handleLicenseChange(e.target.value);
            }}
          />
        </Field>
        <Field label={t("phone") || "الهاتف"}>
          <div style={{ display: "flex", alignItems: "center", flexDirection: "row-reverse" }}>
            <span
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                minWidth: "70px",
                textAlign: "center",
                color: "var(--muted)",
                marginRight: "8px",
              }}
            >
              +971
            </span>
            <input
              className="input"
              type="tel"
              placeholder={t("phone_placeholder") || "أدخل رقم الهاتف"}
              value={phoneValue ? phoneValue.replace("+971", "") : ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const trimmed = digits.replace(/^0+/, "").slice(0, 9);
                const formatted = trimmed ? `+971${trimmed}` : "";
                handlePhoneChange(formatted);
              }}
              inputMode="numeric"
            />
          </div>
        </Field>
        <Field label={t("email") || "البريد الإلكتروني"}>
          <input
            className="input"
            type="email"
            placeholder={t("email_placeholder") || "أدخل البريد الإلكتروني"}
            value={emailValue || ""}
            onChange={(e) => {
              handleEmailChange(e.target.value);
            }}
          />
        </Field>
        <div></div>
      </div>
    );
  }

  // ✅ للاستشاري: استخدام grid 2 columns - الاسم العربي والإنجليزي في نفس السطر
  return (
    <>
      {/* ✅ السطر الأول: الاسم العربي والإنجليزي جنب بعض */}
      <div className="form-grid cols-2" style={{ gap: "var(--space-4)", width: "100%", marginBottom: "var(--space-4)" }}>
        <Field label={t("owner_name_ar") || "الاسم (عربي)"}>
          <CreatableSelect
            options={consultantOptions}
            value={nameValue ? { value: nameValue, label: nameValue } : null}
            onChange={(option, actionMeta) => {
              if (actionMeta.action === 'create-option') {
                // ✅ تم إنشاء استشاري جديد
                const newName = option.value;
                onNameChange(newName);
                // ✅ إضافة الاستشاري الجديد إلى القائمة
                const newItem = {
                  name: newName,
                  license: licenseValue || "",
                  name_en: nameEnValue || "",
                };
                saveToList(storageKey, newItem);
                setSavedList(loadSavedList(storageKey));
                setDbConsultants((prev) => {
                  const exists = prev.some(
                    (c) => c.name.toLowerCase().trim() === newName.toLowerCase().trim()
                  );
                  if (!exists) {
                    const updated = [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name, isAR ? "ar" : "en"));
                    // ✅ تحديث الـ cache أيضاً
                    consultantsCache.data = updated;
                    consultantsCache.timestamp = Date.now();
                    return updated;
                  }
                  return prev;
                });
              } else if (option) {
                // ✅ تم اختيار استشاري موجود
                const selectedConsultant = allConsultants.find(
                  (c) => c.name === option.value
                );
                if (selectedConsultant) {
                  onNameChange(selectedConsultant.name);
                  onNameEnChange && onNameEnChange(selectedConsultant.name_en || "");
                  onLicenseChange(selectedConsultant.license || "");
                  if (onSelect) onSelect(selectedConsultant);
                } else {
                  onNameChange(option.value);
                }
              } else {
                // ✅ تم مسح الاختيار
                onNameChange("");
              }
            }}
            onCreateOption={(inputValue) => {
              // ✅ هذا يتم استدعاؤه تلقائياً عند الضغط على "Create ..."
              onNameChange(inputValue);
            }}
            placeholder={namePlaceholder}
            isSearchable={true}
            isLoading={loadingConsultants}
            isClearable={true}
            formatCreateLabel={(inputValue) => `إضافة "${inputValue}"`}
            noOptionsMessage={({ inputValue }) => {
              if (inputValue) {
                return `اضغط Enter لإضافة "${inputValue}"`;
              }
              return "لا توجد نتائج";
            }}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "40px",
                borderColor: state.isFocused ? "var(--primary)" : "var(--border)",
                boxShadow: state.isFocused ? "0 0 0 3px rgba(249,115,22,.12)" : "none",
                "&:hover": {
                  borderColor: "var(--primary)",
                },
                direction: isAR ? "rtl" : "ltr",
                textAlign: isAR ? "right" : "left",
              }),
              menu: (base) => ({
                ...base,
                direction: isAR ? "rtl" : "ltr",
                textAlign: isAR ? "right" : "left",
                zIndex: 9999,
              }),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected
                  ? "var(--primary)"
                  : state.isFocused
                  ? "var(--primary-50)"
                  : "transparent",
                color: state.isSelected ? "white" : "var(--text)",
                cursor: "pointer",
                "&:active": {
                  backgroundColor: "var(--primary)",
                },
              }),
              placeholder: (base) => ({
                ...base,
                color: "var(--muted)",
              }),
              singleValue: (base) => ({
                ...base,
                color: "var(--text)",
              }),
            }}
            menuPortalTarget={document.body}
          />
        </Field>
        <Field label={t("owner_name_en") || "الاسم بالإنجليزية"}>
          <input
            className="input"
            placeholder={t("owner_name_en_placeholder") || "اكتب الاسم بالإنجليزية"}
            value={nameEnValue || ""}
            onChange={(e) => {
              handleNameEnChange(e.target.value);
            }}
          />
        </Field>
      </div>
      
      {/* ✅ السطر الثاني: الرخصة مع زر الإضافة */}
      <div style={{ width: "100%" }}>
        <Field label={licenseLabel}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <input
              className="input"
              placeholder={licensePlaceholder}
              value={licenseValue || ""}
              onChange={(e) => {
                let value = e.target.value;
                // ✅ إذا كان استشاري، نضيف CN- تلقائياً
                if (type === "consultant" && value && !value.startsWith("CN-")) {
                  // إزالة CN- إذا كان موجوداً مسبقاً
                  value = value.replace(/^CN-/, "");
                  value = "CN-" + value;
                }
                onLicenseChange(value);
              }}
              style={{ 
                flex: 1,
                ...(type === "consultant" ? { textTransform: "uppercase" } : {})
              }}
            />
            {/* ✅ زر الإضافة - يظهر فقط إذا كان الاستشاري غير موجود في القائمة */}
            {type === "consultant" && nameValue && licenseValue && !isConsultantInList && (
              <button
                type="button"
                onClick={handleAddNew}
                style={{
                  minWidth: "120px",
                  padding: "12px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "white",
                  backgroundColor: "#22c55e",
                  border: "2px solid #22c55e",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#16a34a";
                  e.currentTarget.style.borderColor = "#16a34a";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#22c55e";
                  e.currentTarget.style.borderColor = "#22c55e";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(34, 197, 94, 0.3)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(34, 197, 94, 0.3)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 197, 94, 0.4)";
                }}
                title={t("add_consultant") || "إضافة استشاري جديد"}
              >
                <FaPlus style={{ fontSize: "16px", fontWeight: "bold" }} />
                <span>{t("add") || "إضافة"}</span>
              </button>
            )}
          </div>
        </Field>
      </div>
    </>
  );
}

