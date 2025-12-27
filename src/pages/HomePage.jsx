import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "var(--space-8)" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "var(--space-4)", color: "var(--text-primary)" }}>
            {t("welcome") || "مرحباً"}
          </h1>
          <p style={{ fontSize: "18px", color: "var(--muted)", lineHeight: "1.6" }}>
            {t("dashboard_coming_soon") || "لوحة التحكم قيد التطوير..."}
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
