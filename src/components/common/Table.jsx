// مكون Table موحد مع Responsive - Design System
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import Skeleton from "./Skeleton";

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage,
  className = "",
  responsive = true,
  mobileCardView = true, // تحويل الجدول لـ cards على الموبايل
  ...props
}) {
  const { t, i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || "");

  const defaultEmptyMessage = emptyMessage || t("no_data_available", "لا توجد بيانات متاحة");

  // على الموبايل: عرض البيانات كـ cards
  if (mobileCardView && responsive && window.innerWidth < 768) {
    return (
      <div className={`table-mobile-cards ${className}`}>
        {loading ? (
          <div className="table-loading">
            <Skeleton count={3} height="120px" variant="rounded" />
          </div>
        ) : data.length === 0 ? (
          <div className="table-empty">
            <p>{defaultEmptyMessage}</p>
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <div key={rowIndex} className="table-mobile-card">
              {columns.map((col) => {
                const value = typeof col.accessor === "function" 
                  ? col.accessor(row) 
                  : row[col.accessor || col.key];
                const cellValue = col.render ? col.render(value, row) : value;
                
                return (
                  <div key={col.key || col.accessor} className="table-mobile-card-row">
                    <div className="table-mobile-card-label">{col.header || col.label}</div>
                    <div className="table-mobile-card-value">{cellValue || "—"}</div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={`table-wrapper ${responsive ? "table-wrapper--responsive" : ""} ${className}`}>
      {loading ? (
        <div className="table-loading">
          <Skeleton count={5} height="48px" variant="rectangular" />
        </div>
      ) : (
        <table className="table" dir={isRTL ? "rtl" : "ltr"} {...props}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key || col.accessor} style={{ textAlign: col.align || (isRTL ? "right" : "left") }}>
                  {col.header || col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty-cell">
                  {defaultEmptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((col) => {
                    const value = typeof col.accessor === "function" 
                      ? col.accessor(row) 
                      : row[col.accessor || col.key];
                    const cellValue = col.render ? col.render(value, row) : value;
                    
                    return (
                      <td key={col.key || col.accessor} style={{ textAlign: col.align || (isRTL ? "right" : "left") }}>
                        {cellValue || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

