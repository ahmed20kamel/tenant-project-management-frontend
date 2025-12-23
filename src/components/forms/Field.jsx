import { useId } from "react";
import { useTranslation } from "react-i18next";

export default function Field({
  label,
  textarea = false,
  children,
  required = false,
  error,
  hint,
  className = "",
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const inputId = useId();

  return (
    <div
      className={`stack ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ 
        textAlign: isRTL ? "right" : "left",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-text-secondary)"
          }}
        >
          {label}
          {required && (
            <span style={{ color: "var(--error-500)" }} aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {children ? (
        children
      ) : textarea ? (
        <textarea 
          id={inputId} 
          className={`input ${error ? "form-input-error" : ""}`}
          {...props} 
        />
      ) : (
        <input 
          id={inputId} 
          className={`input ${error ? "form-input-error" : ""}`}
          {...props} 
        />
      )}

      {hint && !error && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-tertiary)",
            marginTop: "-0.25rem"
          }}
        >
          {hint}
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--error-500)",
            marginTop: "-0.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem"
          }}
        >
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

