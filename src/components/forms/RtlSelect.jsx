import Select from "react-select";
import { useTranslation } from "react-i18next";

export default function RtlSelect({
  options = [],          // [{ value, label }]
  value,                 // string | number
  onChange,              // (value) => void
  placeholder,           // placeholder اختياري
  isDisabled = false,
  isClearable = true,
  className = "",
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  const findOption = (v) => options.find((o) => o.value === v) || null;

  return (
    <div className={`rtl-select ${className}`} dir={isRTL ? "rtl" : "ltr"}>
      <Select
        classNamePrefix="rs" // نستخدمه في index.css لتصميم select
        options={options}
        value={findOption(value)}
        onChange={(opt) => onChange(opt ? opt.value : "")}
        placeholder={placeholder || t("select_placeholder")}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable
        menuPortalTarget={document.body} // القايمة فوق أي overflow
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          control: (base) => ({
            ...base,
            direction: isRTL ? "rtl" : "ltr",
            textAlign: isRTL ? "right" : "left",
          }),
          menu: (base) => ({
            ...base,
            direction: isRTL ? "rtl" : "ltr",
            textAlign: isRTL ? "right" : "left",
          }),
        }}
      />
    </div>
  );
}

