// src/pages/wizard/components/InfoTip.jsx
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * أيقونة معلومات خفيفة تفتح بوب-أوفر أنيق عند hover.
 * props:
 * - text: محتوى الفقاعة
 * - align: "start" | "center" | "end"
 * - wide: توسعة عرض الفقاعة
 * - title: عنوان اختياري
 * - inline: لو true تبقى أيقونة صغيرة شفافة تناسب وضعها داخل العنوان
 */
export default function InfoTip({ text, align = "center", wide = false, title, inline = true }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const isRTL = typeof document !== "undefined" && document?.dir === "rtl";
  const alignStyle =
    align === "start"
      ? { [isRTL ? "right" : "left"]: 0 }
      : align === "end"
      ? { [isRTL ? "left" : "right"]: 0 }
      : { left: "50%", transform: "translateX(-50%)" };

  return (
    <span
      ref={ref}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        aria-label={t("info_tooltip")}
        title={t("info_tooltip")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: inline ? 20 : 24,
          height: inline ? 20 : 24,
          borderRadius: "50%",
          background: inline ? "rgba(11, 116, 173, 0.08)" : "rgba(11, 116, 173, 0.12)",
          color: "#0b74ad",
          cursor: "help",
          lineHeight: 1,
          padding: 0,
          marginInlineStart: 6,
          transition: "all 0.2s ease",
          border: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = inline ? "rgba(11, 116, 173, 0.15)" : "rgba(11, 116, 173, 0.2)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = inline ? "rgba(11, 116, 173, 0.08)" : "rgba(11, 116, 173, 0.12)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {/* أيقونة i محسّنة */}
        <svg
          width={inline ? 12 : 14}
          height={inline ? 12 : 14}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ pointerEvents: "none" }}
        >
          <path
            d="M12 8V7M12 17V12"
            stroke="#0b74ad"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" stroke="#0b74ad" strokeWidth="1.5" fill="none" />
        </svg>
      </span>

      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            zIndex: 50,
            minWidth: wide ? 320 : 240,
            maxWidth: 460,
            background: "#ffffff",
            border: "1px solid #d1e7f5",
            boxShadow: "0 4px 16px rgba(11, 116, 173, 0.12), 0 2px 4px rgba(0, 0, 0, 0.04)",
            borderRadius: 8,
            padding: "14px 16px",
            direction: isRTL ? "rtl" : "ltr",
            opacity: open ? 1 : 0,
            transform: open ? "translateY(0)" : "translateY(-4px)",
            transition: "opacity 0.15s ease, transform 0.15s ease",
            pointerEvents: "none",
            ...alignStyle,
          }}
        >
          {/* سهم صغير */}
          <div
            style={{
              position: "absolute",
              top: -6,
              [isRTL ? "right" : "left"]: align === "start" ? 12 : align === "end" ? "auto" : "50%",
              [isRTL ? "left" : "right"]: align === "end" ? 12 : "auto",
              transform: align === "center" ? "translateX(-50%)" : "none",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "6px solid #ffffff",
              filter: "drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.05))",
            }}
          />
          {title ? (
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                color: "#0b74ad",
                fontSize: 13,
                letterSpacing: "0.01em",
              }}
            >
              {title}
            </div>
          ) : null}
          <div style={{ lineHeight: 1.6, fontSize: 13, color: "#2d3748" }}>{text}</div>
        </div>
      )}
    </span>
  );
}
