// مكون Card محترف موحد - Design System
export default function Card({
  children,
  title,
  subtitle,
  actions,
  className = "",
  page = false,
  variant = "default", // default | elevated | outlined
  ...props
}) {
  const baseClass = "card";
  const pageClass = page ? "card--page" : "";
  const variantClass = variant !== "default" ? `card--${variant}` : "";
  const classes = [baseClass, pageClass, variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {(title || subtitle || actions) && (
        <div className="card-header">
          <div className="card-header__content">
            {title && (
              <h3 
                className="card-header__title"
                style={{
                  fontSize: "var(--font-size-xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-primary)",
                  margin: 0,
                  marginBottom: subtitle ? "var(--space-1)" : 0
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <div 
                className="card-header__subtitle"
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  margin: 0
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {actions && (
            <div className="card-header__actions">
              {actions}
            </div>
          )}
        </div>
      )}
      {children && (
        <div 
          className="card-body"
          style={{
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)"
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
