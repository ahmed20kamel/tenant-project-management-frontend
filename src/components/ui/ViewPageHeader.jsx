// مكون موحد لرأس صفحات العرض
import { Link } from "react-router-dom";
import Button from "../common/Button";

export default function ViewPageHeader({ title, projectId, showWizard = true, backLabel = "لوحة المشروع ←", backTo = null }) {
  const backPath = backTo || `/projects/${projectId}`;
  
  return (
    <div className="row row--space-between row--align-center" style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid var(--border)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--fs-24)", fontWeight: 700, color: "var(--ink)" }}>{title}</h1>
      <div className="row row--gap-8">
        <Button as={Link} variant="secondary" to={backPath}>
          {backLabel}
        </Button>
        {showWizard && (
          <Button as={Link} to={`/projects/${projectId}/wizard`}>
            فتح المعالج
          </Button>
        )}
      </div>
    </div>
  );
}

