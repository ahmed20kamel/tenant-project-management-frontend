import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDateInput, formatDateInputValue, toIsoDate } from "../../utils/formatters";
import "./DateInput.css";

/**
 * مكون موحد احترافي لإدخال التاريخ في النظام بالكامل
 * 
 * التنسيق الموحد: DD/MM/YYYY (اليوم ثم الشهر ثم السنة)
 * 
 * الميزات:
 * - التنسيق الموحد: DD/MM/YYYY
 * - منع إدخال قيم غير منطقية تلقائياً
 * - تعديل جزئي: يمكن تعديل اليوم/الشهر/السنة بشكل منفصل
 * - لا يمسح التاريخ بالكامل عند خطأ جزئي
 * - نفس المكون في النظام بالكامل
 */
export default function DateInput({ 
  value, // القيمة بصيغة ISO (yyyy-mm-dd) أو null
  onChange, // (isoDate: string | null) => void
  className = "input",
  placeholder = "dd / mm / yyyy",
  disabled = false,
  max, // تاريخ أقصى بصيغة ISO
  min, // تاريخ أدنى بصيغة ISO
  ...props 
}) {
  const { i18n } = useTranslation();
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const isRTL = i18n.language === "ar";
  
  // تحويل القيمة من ISO إلى تنسيق العرض DD/MM/YYYY
  useEffect(() => {
    if (value) {
      const formatted = formatDateInput(value);
      setDisplayValue(formatted);
    } else {
      setDisplayValue("");
    }
  }, [value]);
  
  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // تطبيق الـ mask أثناء الكتابة
    const masked = formatDateInputValue(inputValue);
    setDisplayValue(masked);
    
    // إذا كان التاريخ مكتملاً (10 أحرف: DD/MM/YYYY)
    if (masked.length === 10) {
      const isoDate = toIsoDate(masked);
      if (isoDate) {
        // التحقق من min/max
        if (min && isoDate < min) {
          const minFormatted = formatDateInput(min);
          setDisplayValue(minFormatted);
          onChange(min);
          return;
        }
        if (max && isoDate > max) {
          const maxFormatted = formatDateInput(max);
          setDisplayValue(maxFormatted);
          onChange(max);
          return;
        }
        onChange(isoDate);
      } else {
        onChange(null);
      }
    } else if (masked.length < 10) {
      onChange(null);
    }
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    
    // التحقق من صحة التاريخ عند فقدان التركيز
    if (displayValue && displayValue.length === 10) {
      const isoDate = toIsoDate(displayValue);
      if (isoDate) {
        // التحقق من أن التاريخ صحيح فعلياً
        const date = new Date(isoDate);
        const [day, month, year] = displayValue.split("/");
        const isValidDate = 
          date.getFullYear() === parseInt(year, 10) &&
          date.getMonth() + 1 === parseInt(month, 10) &&
          date.getDate() === parseInt(day, 10);
        
        if (isValidDate) {
          // تحديث القيمة المعروضة لتكون صحيحة
          const formatted = formatDateInput(isoDate);
          setDisplayValue(formatted);
          onChange(isoDate);
        } else {
          // إذا كان التاريخ غير صحيح، نمسحه
          setDisplayValue("");
          onChange(null);
        }
      } else {
        // إذا كان التاريخ غير صحيح، نمسحه
        setDisplayValue("");
        onChange(null);
      }
    } else if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
      // إذا كان الإدخال غير مكتمل، نمسحه
      setDisplayValue("");
      onChange(null);
    }
  };
  
  const handleKeyDown = (e) => {
    // السماح بالحذف والتنقل
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "Tab" || 
        e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      return;
    }
    
    // السماح فقط بالأرقام
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="date-input-wrapper" dir={isRTL ? "rtl" : "ltr"}>
      <input
        ref={inputRef}
        type="text"
        className={`${className} date-input-text`}
        value={displayValue || ""}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        inputMode="numeric"
        {...props}
        style={{
          ...props.style,
          textAlign: isRTL ? "right" : "left",
        }}
      />
    </div>
  );
}
