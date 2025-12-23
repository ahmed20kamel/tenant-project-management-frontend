import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../components/layout/PageLayout";
import ViewPageHeader from "../../../components/ui/ViewPageHeader";
import AwardingStep from "../wizard/steps/AwardingStep";

export default function ViewAwarding() {
  const { projectId } = useParams();
  const { t } = useTranslation();

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader
          title={t("view_awarding_title") || t("awarding_gulf_bank_contract_info")}
          projectId={projectId}
          showWizard={false}
          backLabel={t("back")}
        />
        <div className="mt-12">
          <AwardingStep projectId={projectId} onPrev={null} isView={true} />
        </div>
      </div>
    </PageLayout>
  );
}

