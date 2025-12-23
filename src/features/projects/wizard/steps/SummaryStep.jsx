import { useTranslation } from "react-i18next";
import WizardShell from "../components/WizardShell";
import StepActions from "../components/StepActions";
import ContractFinancialSummary from "../components/ContractFinancialSummary";
import Button from "../../../components/common/Button";

export default function SummaryStep({ projectId, onPrev }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");

  return (
    <WizardShell title={t("summary_final_title")}>
      <div className={`row ${isAR ? "justify-start" : "justify-end"} mb-12`}>
        <Button variant="secondary" onClick={() => window.print()}>
          {t("print_pdf")}
        </Button>
      </div>

      <div className="mt-12">
        <ContractFinancialSummary projectId={projectId} />
      </div>

      <StepActions onPrev={onPrev} onNext={null} />
    </WizardShell>
  );
}
