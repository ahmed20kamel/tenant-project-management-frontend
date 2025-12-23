import { useTranslation } from "react-i18next";
import { FaGlobe } from "react-icons/fa";
import Button from "../common/Button";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";

  const toggle = () => i18n.changeLanguage(isRTL ? "en" : "ar");

  return (
    <Button
      variant="secondary"
      onClick={toggle}
      title={t("language_switch_title")}
      className="navbar-btn"
    >
      <FaGlobe style={{ marginInlineEnd: isRTL ? 0 : 8, marginInlineStart: isRTL ? 8 : 0 }} />
      {t("language")}
    </Button>
  );
}
