import { useState, useMemo } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import "./Select.css";

/**
 * Unified Select Component with search functionality
 * Supports RTL/LTR, search, clear, and consistent styling
 */
export default function UnifiedSelect({
  options = [],          // [{ value, label }] or [{ id, name, display_name }]
  value,                 // string | number
  onChange,              // (value) => void
  placeholder,           // placeholder text
  isDisabled = false,
  isClearable = true,
  isSearchable = true,
  className = "",
  style = {},
  getOptionLabel,        // Custom label function
  getOptionValue,        // Custom value function
  isLoading = false,
  noOptionsMessage,      // Custom no options message
}) {
  const { t, i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || "");

  // Transform options if needed
  const transformedOptions = useMemo(() => {
    if (!options || options.length === 0) return [];
    
    // If options already have value/label, use them
    if (options[0] && ('value' in options[0] || 'label' in options[0])) {
      return options;
    }
    
    // Otherwise, transform from common formats
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      
      // Handle objects with id/name/display_name
      const val = getOptionValue ? getOptionValue(opt) : (opt.id || opt.value);
      const label = getOptionLabel ? getOptionLabel(opt) : (opt.display_name || opt.name || opt.label || String(val));
      
      return { value: val, label, original: opt };
    });
  }, [options, getOptionLabel, getOptionValue]);

  // Find selected option
  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    return transformedOptions.find((opt) => {
      const optValue = getOptionValue && opt.original ? getOptionValue(opt.original) : opt.value;
      return String(optValue) === String(value);
    }) || null;
  }, [value, transformedOptions, getOptionValue]);

  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "40px",
      borderColor: state.isFocused ? "var(--color-primary)" : "var(--color-border)",
      boxShadow: state.isFocused ? "0 0 0 3px var(--color-primary-light)" : "none",
      "&:hover": {
        borderColor: "var(--color-primary)",
      },
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
    }),
    menu: (base) => ({
      ...base,
      direction: isRTL ? "rtl" : "ltr",
      textAlign: isRTL ? "right" : "left",
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "var(--color-primary)"
        : state.isFocused
        ? "var(--color-primary-light)"
        : "transparent",
      color: state.isSelected ? "white" : "var(--color-text-primary)",
      cursor: "pointer",
      "&:active": {
        backgroundColor: "var(--color-primary)",
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--color-text-tertiary)",
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--color-text-primary)",
    }),
  };

  return (
    <div className={`unified-select ${className}`} style={style} dir={isRTL ? "rtl" : "ltr"}>
      <Select
        classNamePrefix="us"
        options={transformedOptions}
        value={selectedOption}
        onChange={(opt) => {
          if (!opt) {
            onChange("");
            return;
          }
          const optValue = getOptionValue && opt.original ? getOptionValue(opt.original) : opt.value;
          onChange(optValue);
        }}
        placeholder={placeholder || t("select_placeholder") || "Select..."}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isLoading={isLoading}
        menuPortalTarget={document.body}
        noOptionsMessage={({ inputValue }) => {
          if (typeof noOptionsMessage === 'function') {
            return noOptionsMessage({ inputValue });
          }
          return noOptionsMessage || (inputValue ? t("no_options_found") || "No options found" : t("no_options") || "No options");
        }}
        styles={customStyles}
      />
    </div>
  );
}

