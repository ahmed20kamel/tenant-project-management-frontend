// مكون Button محترف موحد - Design System
export default function Button({
  children,
  variant = "primary", // primary | secondary | ghost | danger | success
  size = "md", // sm | md | lg
  className = "",
  disabled = false,
  onClick,
  type = "button",
  block = false,
  fullWidth = false,
  loading = false,
  icon,
  startIcon,
  endIcon,
  iconPosition = "left", // left | right
  as: Component = "button",
  ...props
}) {
  const baseClass = "btn";
  const variantClass = variant !== "primary" ? `btn--${variant}` : "";
  const sizeClass = size !== "md" ? `btn--${size}` : "";
  const blockClass = (block || fullWidth) ? "btn--block" : "";
  const classes = [baseClass, variantClass, sizeClass, blockClass, className]
    .filter(Boolean)
    .join(" ");

  const buttonProps = Component === "button" ? { type, disabled: disabled || loading } : {};

  const sizeStyles = {
    sm: { padding: "var(--space-2) var(--space-4)", fontSize: "var(--font-size-sm)" },
    md: { padding: "var(--space-3) var(--space-6)", fontSize: "var(--font-size-base)" },
    lg: { padding: "var(--space-4) var(--space-8)", fontSize: "var(--font-size-lg)" }
  };

  const variantStyles = {
    primary: {
      backgroundColor: "var(--color-primary)",
      color: "white",
      borderColor: "var(--color-primary)"
    },
    secondary: {
      backgroundColor: "var(--color-surface)",
      color: "var(--color-text-primary)",
      borderColor: "var(--color-border)"
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--color-text-primary)",
      borderColor: "transparent"
    },
    danger: {
      backgroundColor: "var(--error-500)",
      color: "white",
      borderColor: "var(--error-500)"
    },
    success: {
      backgroundColor: "var(--success-500)",
      color: "white",
      borderColor: "var(--success-500)"
    }
  };

  const style = {
    ...sizeStyles[size],
    ...variantStyles[variant],
    width: (block || fullWidth) ? "100%" : "auto",
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    fontWeight: "var(--font-weight-medium)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "var(--radius-md)",
    transition: "all var(--transition-base)",
    textDecoration: "none"
  };

  return (
    <Component
      className={classes}
      style={style}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled && !loading && variant === "primary") {
          e.target.style.backgroundColor = "var(--color-primary-hover)";
          e.target.style.transform = "translateY(-1px)";
          e.target.style.boxShadow = "var(--shadow-md)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading && variant === "primary") {
          e.target.style.backgroundColor = variantStyles[variant].backgroundColor;
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "none";
        }
      }}
      {...buttonProps}
      {...props}
    >
      {loading && <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>}
      {(startIcon || (icon && iconPosition === "left")) && !loading && (startIcon || icon)}
      {children}
      {(endIcon || (icon && iconPosition === "right")) && !loading && (endIcon || icon)}
    </Component>
  );
}
