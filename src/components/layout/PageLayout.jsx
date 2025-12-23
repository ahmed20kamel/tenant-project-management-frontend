import { useTranslation } from "react-i18next";

// مكون موحد لبنية الصفحات - بسيط بدون container إضافي
export default function PageLayout({ children, loading, error, loadingText, errorText }) {
  const { t } = useTranslation();
  const defaultLoadingText = loadingText ?? t("loading_default");
  const defaultErrorText = errorText ?? t("error_default");
  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__content">
          <div className="page-loading__spinner"></div>
          <p>{defaultLoadingText}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <div className="page-error__content">
          <p className="page-error__text">{defaultErrorText}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
