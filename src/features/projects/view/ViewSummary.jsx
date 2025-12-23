import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../components/layout/PageLayout";
import ViewPageHeader from "../../../components/ui/ViewPageHeader";
import ContractFinancialSummary from "../wizard/components/ContractFinancialSummary";

export default function ViewSummary() {
  const { projectId } = useParams();
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader title={t("view_summary_title") || t("financial_summary")} projectId={projectId} />
        <div className="mt-12">
          <ContractFinancialSummary projectId={projectId} />
        </div>
      </div>
    </PageLayout>
  );
}

