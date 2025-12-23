import React, { useRef } from "react";
import { numberToArabicWords } from "../../utils/numberFormatting";

export default function NumberField({ value, onChange, placeholder = "0.00", readOnly = false, style = {}, dir, min, ...props }) {

  const inputRef = useRef(null);

  const formatWithCommas = (numStr) => {
    let clean = numStr.replace(/[^0-9]/g, "");
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleChange = (e) => {
    if (readOnly) return;
    
    const element = inputRef.current;

    // موقع المؤشر قبل التعديل
    const start = element.selectionStart;
    const end = element.selectionEnd;

    // قيمة المستخدم الأصلية (غير منسقة)
    let raw = e.target.value.replace(/,/g, "");

    if (!/^\d*$/.test(raw)) return;

    // أعد تنسيق القيمة (Live)
    const formatted = formatWithCommas(raw);

    // احفظ التغيير
    onChange(formatted);

    // احسب الفرق
    const diff = formatted.length - e.target.value.length;

    // رجع المؤشر لمكانه الصحيح
    setTimeout(() => {
      element.setSelectionRange(start + diff, end + diff);
    }, 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        readOnly={readOnly}
        style={style}
        dir={dir}
        min={min}
        {...props}
      />

      {/* 🔵 النص العربي (Preview) */}
      {value && (
        <div style={{ fontSize: "13px", fontWeight: "bold", opacity: 0.9 }}>
          {numberToArabicWords(value)}
        </div>
      )}
    </div>
  );
}

