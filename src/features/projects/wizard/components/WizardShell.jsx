// src/pages/wizard/components/WizardShell.jsx
import { useId } from "react";
import { useTranslation } from "react-i18next";

export default function WizardShell({ title, children, footer, subtitle }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const headingId = useId();

  return (
    <section
      className="wizard-step"
      dir={isRTL ? "rtl" : "ltr"}
      role="region"
      aria-labelledby={headingId}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-8)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--color-border)",
        marginBottom: "var(--space-6)"
      }}
    >
      <div className="wizard-step-header">
        <h3
          id={headingId}
          className="wizard-step-title"
          style={{
            textAlign: isRTL ? "right" : "left",
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-primary)",
            margin: 0,
            marginBottom: subtitle ? "var(--space-2)" : 0
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="wizard-step-subtitle"
            style={{
              textAlign: isRTL ? "right" : "left",
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              margin: 0
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div 
        className="wizard-step-body"
        style={{
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)"
        }}
      >
        {children}
      </div>

      {footer && (
        <div 
          className="wizard-step-footer"
          style={{
            marginTop: "var(--space-8)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--color-border)"
          }}
        >
          {footer}
        </div>
      )}
    </section>
  );
}
