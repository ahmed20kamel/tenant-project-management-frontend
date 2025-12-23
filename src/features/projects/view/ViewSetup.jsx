import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import PageLayout from "../../../components/layout/PageLayout";
import ViewPageHeader from "../../../components/ui/ViewPageHeader";
import useProject from "../../../hooks/useProject";
import ProjectSetupStep from "../wizard/steps/ProjectSetupStep";
import { api } from "../../../services/api";

export default function ViewSetup() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const { project, loading, error, reload } = useProject(projectId);

  // ✅ حالة محلية لبيانات إعداد المشروع حتى نسمح بالتعديل داخل الصفحة
  const [setup, setSetup] = useState({
    projectType: "",
    villaCategory: "",
    contractType: "",
    internalCode: "",
    contractClassification: "",
  });

  // ✅ دالة تحميل contract_classification
  const loadContractClassification = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data } = await api.get(`projects/${projectId}/contract/`);
      if (Array.isArray(data) && data.length > 0 && data[0].contract_classification) {
        setSetup((prev) => ({
          ...prev,
          contractClassification: data[0].contract_classification,
        }));
      } else {
        // ✅ إذا لم يكن هناك contract أو classification، نزيل القيمة
        setSetup((prev) => ({
          ...prev,
          contractClassification: "",
        }));
      }
    } catch (e) {
      // إذا لم يكن هناك contract بعد، نزيل contractClassification
      setSetup((prev) => ({
        ...prev,
        contractClassification: "",
      }));
    }
  }, [projectId]);

  // ✅ مزامنة الحالة مع بيانات المشروع عند التحميل/التحديث
  useEffect(() => {
    if (!project) return;
    setSetup((prev) => ({
      ...prev,
      projectType: project.project_type || "",
      villaCategory: project.villa_category || "",
      contractType: project.contract_type || "",
      internalCode: project.internal_code || "",
    }));
    // ✅ إعادة تحميل contract_classification عند تغيير project (مثل بعد reload)
    if (projectId) {
      loadContractClassification();
    }
  }, [project, projectId, loadContractClassification]);

  // ✅ تحميل contract_classification من Contract عند التحميل الأولي وعند تغيير projectId
  // ننتظر حتى تنتهي loading من useProject
  useEffect(() => {
    if (!projectId) return;
    
    // ✅ إذا كان loading انتهى، نحمل البيانات
    if (!loading) {
      // ✅ تأخير بسيط للتأكد من أن كل شيء جاهز (خاصة بعد F5)
      const timer = setTimeout(() => {
        loadContractClassification();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [projectId, loading, loadContractClassification]);

  // ✅ الاستماع لحدث contract-updated لإعادة تحميل البيانات
  useEffect(() => {
    const handleContractUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadContractClassification();
      }
    };

    window.addEventListener("contract-updated", handleContractUpdate);

    return () => {
      window.removeEventListener("contract-updated", handleContractUpdate);
    };
  }, [projectId, loadContractClassification]);

  // ✅ إعادة تحميل contract_classification عند عودة الصفحة للظهور (بعد حفظ العقد)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadContractClassification();
      }
    };

    const handleFocus = () => {
      loadContractClassification();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadContractClassification]);

  const title = project?.display_name || project?.name || `${t("wizard_project_prefix")} #${projectId}`;

  return (
    <PageLayout
      loading={loading}
      error={error}
      loadingText={t("loading")}
      errorText={t("error_default")}
    >
      <div className="container">
        <ViewPageHeader
          title={`${t("project_information")} — ${title}`}
          projectId={projectId}
          showWizard={false}
          backLabel={t("back_projects")}
        />

        <div className="mt-12">
          <ProjectSetupStep
            value={setup}
            onChange={setSetup}
            onNext={null}
            onPrev={null}
            isView={true}
            onSaved={reload}
          />
        </div>

        {/* تم إزالة زر التعديل الإضافي هنا لتقليل اللخبطة
            التعديل يتم من داخل نفس الكارد (زر التعديل الأبيض في أعلى قسم الإعداد)
            أو من صفحة ProjectView عبر زر "تعديل المشروع" / "edit" */}
      </div>
    </PageLayout>
  );
}
