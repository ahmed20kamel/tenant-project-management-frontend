// مكون Alert موحد - Design System
import { useTranslation } from "react-i18next";

export default function Alert({
  variant = "info", // info | success | warning | error
  title,
  message,
  children,
  onClose,
  className = "",
  icon,
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || "");

  const baseClass = "alert";
  const variantClass = `alert--${variant}`;
  const classes = [baseClass, variantClass, className].filter(Boolean).join(" ");

  const defaultIcons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌"
  };

  const displayIcon = icon || defaultIcons[variant] || "";

  return (
    <div className={classes} dir={isRTL ? "rtl" : "ltr"} {...props}>
      {displayIcon && <span className="alert-icon">{displayIcon}</span>}
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        {message && <div className="alert-message">{message}</div>}
        {children}
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      )}
    </div>
  );
}

