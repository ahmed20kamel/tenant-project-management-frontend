import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import InvoicePrintTemplate from "../../../components/invoices/InvoicePrintTemplate";
import { formatMoney, formatDate } from "../../../utils/formatters";
import "./InvoiceViewPage.css";

export default function InvoiceViewPage() {
  const { invoiceId } = useParams();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadFullProjectData = async (projectId) => {
    try {
      // Load project details, siteplan (owners), license (consultant), contract
      const [projectRes, siteplanRes, licenseRes, contractRes] = await Promise.allSettled([
        api.get(`projects/${projectId}/`),
        api.get(`projects/${projectId}/siteplan/`),
        api.get(`projects/${projectId}/license/`),
        api.get(`projects/${projectId}/contract/`),
      ]);

      const projectData = projectRes.status === "fulfilled" 
        ? (Array.isArray(projectRes.value?.data) ? projectRes.value.data[0] : projectRes.value?.data)
        : null;
      
      const siteplanData = siteplanRes.status === "fulfilled"
        ? (Array.isArray(siteplanRes.value?.data) ? siteplanRes.value.data[0] : siteplanRes.value?.data)
        : null;

      const licenseData = licenseRes.status === "fulfilled"
        ? (Array.isArray(licenseRes.value?.data) ? licenseRes.value.data[0] : licenseRes.value?.data)
        : null;

      const contractData = contractRes.status === "fulfilled"
        ? (Array.isArray(contractRes.value?.data) ? contractRes.value.data[0] : contractRes.value?.data)
        : null;

      setProject({
        ...projectData,
        owners: siteplanData?.owners || [],
        consultant: licenseData?.design_consultant_name || licenseData?.supervision_consultant_name || null,
        plot_number: siteplanData?.plot_number || projectData?.plot_number || null,
        contract: contractData,
      });
    } catch (e) {
      console.warn("Could not load full project data:", e);
    }
  };

  const loadInvoice = async () => {
    setLoading(true);
    try {
      // Load actual invoices only
      let invoiceData = null;
      let projectId = null;
      
      const { data } = await api.get(`projects/`);
      const projects = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
      
      // Search for invoice in all projects
      for (const proj of projects) {
        try {
          const { data: invoices } = await api.get(`projects/${proj.id}/actual-invoices/`);
          const invoicesList = Array.isArray(invoices) ? invoices : (invoices?.results || invoices?.items || invoices?.data || []);
          const found = invoicesList.find(inv => inv.id === parseInt(invoiceId));
          if (found) {
            invoiceData = found;
            projectId = proj.id;
            break;
          }
        } catch (e) {
          // Continue searching in other projects
          continue;
        }
      }

      if (!invoiceData || !projectId) {
        alert(t("invoice_not_found"));
        navigate("/invoices");
        return;
      }

      // Load full project data with owners, consultant, contract
      await loadFullProjectData(projectId);

      setInvoice(invoiceData);

      // Load company info (from tenant settings)
      try {
        const { data: settingsData } = await api.get("auth/tenant-settings/current/");
        // Build company object with logo URL
        let logoUrl = null;
        if (settingsData.company_logo) {
          if (settingsData.company_logo.startsWith('http')) {
            logoUrl = settingsData.company_logo;
          } else {
            // Build full URL for relative paths
            const isDev = import.meta.env.DEV;
            const ROOT = isDev ? "" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
            
            // If logo path starts with /media/, use ROOT directly
            if (settingsData.company_logo.startsWith("/media/")) {
              logoUrl = `${ROOT}${settingsData.company_logo}`;
            } else if (settingsData.company_logo.startsWith("/")) {
              // Other absolute paths
              const baseURL = api.defaults?.baseURL || window.location.origin;
              const apiBase = baseURL.replace('/api', '');
              logoUrl = `${apiBase}${settingsData.company_logo}`;
            } else {
              // Relative path
              const baseURL = api.defaults?.baseURL || window.location.origin;
              const apiBase = baseURL.replace('/api', '');
              logoUrl = `${apiBase}/${settingsData.company_logo}`;
            }
          }
        }
        
        setCompany({
          name: settingsData.company_name || settingsData.contractor_name || "Company Name",
          address: settingsData.company_address || settingsData.contractor_address || "",
          phone: settingsData.company_phone || settingsData.contractor_phone || "",
          email: settingsData.contractor_email || "",
          vat_number: settingsData.company_license_number || settingsData.contractor_license_no || "",
          logo: logoUrl,
        });
      } catch (e) {
        console.warn("Could not load company settings:", e);
        // Set default company info
        setCompany({
          name: "Company Name",
          address: "",
          phone: "",
          email: "",
          vat_number: "",
          logo: null,
        });
      }
    } catch (e) {
      console.error("Error loading invoice:", e);
      alert(t("error_loading_invoice"));
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !invoice) {
    return (
      <PageLayout loading={loading} loadingText={t("loading")}>
        <div></div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <InvoicePrintTemplate
        invoice={invoice}
        project={project}
        company={company}
        onClose={() => navigate("/invoices")}
      />
    </PageLayout>
  );
}

