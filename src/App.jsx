// src/App.jsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { CircularProgress, Box } from "@mui/material";

// ✅ Loading component للـ lazy loading
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
    }}
  >
    <CircularProgress />
  </Box>
);

// ====== Public Pages (صفحات عامة) - Lazy Loading ======
const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const PricingPage = lazy(() => import("./pages/public/PricingPage"));
const CompanyRegistrationPage = lazy(() => import("./features/auth/pages/CompanyRegistrationPage"));

// ====== Auth Pages (صفحات المصادقة) - Lazy Loading ======
const AdminLoginPage = lazy(() => import("./features/admin/pages/AdminLoginPage"));
const CompanyLoginPage = lazy(() => import("./features/auth/pages/CompanyLoginPage"));
const OnboardingWizardPage = lazy(() => import("./features/auth/pages/OnboardingWizardPage"));

// ====== Dashboard Pages (صفحات لوحة التحكم) - Lazy Loading ======
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminDashboardPage = lazy(() => import("./features/admin/pages/AdminDashboardPage"));

// ====== Admin Pages (صفحات الإدارة) - Lazy Loading ======
const AdminTenantsPage = lazy(() => import("./features/admin/pages/AdminTenantsPage"));
const AdminCreateCompanyPage = lazy(() => import("./features/admin/pages/AdminCreateCompanyPage"));

// ====== Company Pages (صفحات الشركة) - Lazy Loading ======
const CompanySettingsPage = lazy(() => import("./features/company/pages/CompanySettingsPage"));
const CompanyUsersPage = lazy(() => import("./features/company/pages/CompanyUsersPage"));

// ====== Projects Pages (صفحات المشاريع) - Lazy Loading ======
const ProjectsPage = lazy(() => import("./features/projects/pages/ProjectsPage"));
const ProjectView = lazy(() => import("./features/projects/pages/ProjectView"));
const WizardPage = lazy(() => import("./features/projects/wizard/WizardPage"));
const PendingApprovalsPage = lazy(() => import("./features/projects/pages/PendingApprovalsPage"));
const FinalApprovalsPage = lazy(() => import("./features/projects/pages/FinalApprovalsPage"));
const ViewSetup = lazy(() => import("./features/projects/view/ViewSetup"));
const ViewSitePlan = lazy(() => import("./features/projects/view/ViewSitePlan"));
const ViewLicense = lazy(() => import("./features/projects/view/ViewLicense"));
const ViewContract = lazy(() => import("./features/projects/view/ViewContract"));
const ViewAwarding = lazy(() => import("./features/projects/view/ViewAwarding"));
const ViewSummary = lazy(() => import("./features/projects/view/ViewSummary"));
const SelectProjectForStartOrder = lazy(() => import("./features/projects/pages/SelectProjectForStartOrder"));
const SelectProjectForVariation = lazy(() => import("./features/projects/pages/SelectProjectForVariation"));
const SelectProjectForAwarding = lazy(() => import("./features/projects/pages/SelectProjectForAwarding"));
const SelectProjectForExtensions = lazy(() => import("./features/projects/pages/SelectProjectForExtensions"));
const SelectProjectForPayment = lazy(() => import("./features/projects/pages/SelectProjectForPayment"));
const SelectProjectForInvoice = lazy(() => import("./features/projects/pages/SelectProjectForInvoice"));

// ====== Payments Pages (صفحات المدفوعات) - Lazy Loading ======
const PaymentsPage = lazy(() => import("./features/payments/pages/PaymentsPage"));
const CreatePaymentPage = lazy(() => import("./features/payments/pages/CreatePaymentPage"));
const ViewPaymentPage = lazy(() => import("./features/payments/pages/ViewPaymentPage"));

// ====== Variations Pages - Lazy Loading ======
const VariationsPage = lazy(() => import("./features/variations/pages/VariationsPage"));
const CreateVariationPage = lazy(() => import("./features/variations/pages/CreateVariationPage"));

// ====== Invoices Pages - Lazy Loading ======
const InvoicesPage = lazy(() => import("./features/invoices/pages/InvoicesPage"));
const InvoiceViewPage = lazy(() => import("./features/invoices/pages/InvoiceViewPage"));
const CreateActualInvoicePage = lazy(() => import("./features/invoices/pages/CreateActualInvoicePage"));

// ====== Owners Pages (صفحات الملاك) - Lazy Loading ======
const OwnersPage = lazy(() => import("./features/owners/pages/OwnersPage"));
const OwnerDetailPage = lazy(() => import("./features/owners/pages/OwnerDetailPage"));
const EditOwnerPage = lazy(() => import("./features/owners/pages/EditOwnerPage"));

// ====== Consultants Pages (صفحات الاستشاريين) - Lazy Loading ======
const ConsultantsPage = lazy(() => import("./features/consultants/pages/ConsultantsPage"));
const ConsultantDetailPage = lazy(() => import("./features/consultants/pages/ConsultantDetailPage"));
const EditConsultantPage = lazy(() => import("./features/consultants/pages/EditConsultantPage"));

// ====== Profile Pages (صفحات الملف الشخصي) - Lazy Loading ======
const ProfilePage = lazy(() => import("./features/profile/pages/ProfilePage"));

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* صفحات عامة (غير محمية) */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/register-company" element={<CompanyRegistrationPage />} />
        
        {/* صفحات تسجيل الدخول */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/login/:tenantSlug" element={<CompanyLoginPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} /> {/* Redirect إلى Landing Page */}
        
        {/* صفحة Onboarding (بدون Layout) */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizardPage /></ProtectedRoute>} />
      
      {/* جميع الصفحات الأخرى محمية */}
      <Route path="/*" element={
    <Layout>
      <Routes>
            {/* Dashboard Pages */}
            <Route path="/dashboard" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            
            {/* Admin Routes - فقط للـ Super Admin */}
            <Route path="/admin/create-company" element={<ProtectedRoute><AdminCreateCompanyPage /></ProtectedRoute>} />
            <Route path="/admin/tenants" element={<ProtectedRoute><AdminTenantsPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/pricing" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />

            {/* الرئيسية - يعيد التوجيه بناءً على نوع المستخدم */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

        {/* قائمة المشاريع */}
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/pending-approvals" element={<ProtectedRoute><PendingApprovalsPage /></ProtectedRoute>} />
            <Route path="/projects/final-approvals" element={<ProtectedRoute><FinalApprovalsPage /></ProtectedRoute>} />
            <Route path="/projects/select-start-order" element={<ProtectedRoute><SelectProjectForStartOrder /></ProtectedRoute>} />
            <Route path="/projects/select-variation" element={<ProtectedRoute><SelectProjectForVariation /></ProtectedRoute>} />
            <Route path="/projects/select-awarding" element={<ProtectedRoute><SelectProjectForAwarding /></ProtectedRoute>} />
            <Route path="/projects/select-extensions" element={<ProtectedRoute><SelectProjectForExtensions /></ProtectedRoute>} />
            <Route path="/projects/select-payment" element={<ProtectedRoute><SelectProjectForPayment /></ProtectedRoute>} />
            <Route path="/projects/select-invoice" element={<ProtectedRoute><SelectProjectForInvoice /></ProtectedRoute>} />

        {/* قائمة الدفعات */}
            <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
            <Route path="/payments/create" element={<ProtectedRoute><CreatePaymentPage /></ProtectedRoute>} />
            <Route path="/payments/:paymentId/view" element={<ProtectedRoute><ViewPaymentPage /></ProtectedRoute>} />
            <Route path="/payments/:paymentId/edit" element={<ProtectedRoute><CreatePaymentPage /></ProtectedRoute>} />

        {/* قائمة التعديلات */}
            <Route path="/variations" element={<ProtectedRoute><VariationsPage /></ProtectedRoute>} />
            <Route path="/variations/create" element={<ProtectedRoute><CreateVariationPage /></ProtectedRoute>} />
            <Route path="/variations/:variationId/edit" element={<ProtectedRoute><CreateVariationPage /></ProtectedRoute>} />

        {/* قائمة الفواتير */}
            <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
            <Route path="/invoices/create" element={<ProtectedRoute><CreateActualInvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/:invoiceId/edit" element={<ProtectedRoute><CreateActualInvoicePage /></ProtectedRoute>} />
            <Route path="/invoices/:invoiceId/view" element={<ProtectedRoute><InvoiceViewPage /></ProtectedRoute>} />

        {/* قائمة الملاك */}
            <Route path="/owners" element={<ProtectedRoute><OwnersPage /></ProtectedRoute>} />

        {/* قائمة الاستشاريين */}
            <Route path="/consultants" element={<ProtectedRoute><ConsultantsPage /></ProtectedRoute>} />

        {/* قائمة المقاولين - تم إزالتها */}
            {/* <Route path="/contractors" element={<ProtectedRoute><ContractorsPage /></ProtectedRoute>} /> */}

        {/* محاولة فتح المعالج بدون projectId → رجوع للقائمة */}
        <Route path="/projects/wizard" element={<Navigate to="/projects" replace />} />

        {/* المعالج لمشروع جديد (بدون إنشاء فوري) */}
            <Route path="/wizard/new" element={<ProtectedRoute><WizardPage /></ProtectedRoute>} />

        {/* المعالج بمشروع محدد */}
            <Route path="/projects/:projectId/wizard" element={<ProtectedRoute><WizardPage /></ProtectedRoute>} />

        {/* صفحة عرض المشروع (الكروت) */}
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />

        {/* صفحات العرض المنفصلة لكل مرحلة */}
            <Route path="/projects/:projectId/setup/view" element={<ProtectedRoute><ViewSetup /></ProtectedRoute>} />
            <Route path="/projects/:projectId/siteplan/view" element={<ProtectedRoute><ViewSitePlan /></ProtectedRoute>} />
            <Route path="/projects/:projectId/license/view" element={<ProtectedRoute><ViewLicense /></ProtectedRoute>} />
            <Route path="/projects/:projectId/contract/view" element={<ProtectedRoute><ViewContract /></ProtectedRoute>} />
            <Route path="/projects/:projectId/awarding/view" element={<ProtectedRoute><ViewAwarding /></ProtectedRoute>} />

        {/* الملخص المالي */}
            <Route path="/projects/:projectId/summary" element={<ProtectedRoute><ViewSummary /></ProtectedRoute>} />

        {/* صفحات الملاك والاستشاريين */}
            <Route path="/owners/:ownerName" element={<ProtectedRoute><OwnerDetailPage /></ProtectedRoute>} />
            <Route path="/owners/:ownerName/edit" element={<ProtectedRoute><EditOwnerPage /></ProtectedRoute>} />
            <Route path="/consultants/new" element={<ProtectedRoute><EditConsultantPage /></ProtectedRoute>} />
            <Route path="/consultants/:consultantId" element={<ProtectedRoute><ConsultantDetailPage /></ProtectedRoute>} />
            <Route path="/consultants/:consultantId/edit" element={<ProtectedRoute><EditConsultantPage /></ProtectedRoute>} />
            {/* <Route path="/contractors/:contractorName" element={<ProtectedRoute><ContractorDetailPage /></ProtectedRoute>} /> */}

            {/* صفحة الملف الشخصي */}
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* صفحات إدارة الشركة */}
            <Route path="/company/settings" element={<ProtectedRoute><CompanySettingsPage /></ProtectedRoute>} />
            <Route path="/company/users" element={<ProtectedRoute><CompanyUsersPage /></ProtectedRoute>} />

        {/* أي مسار غير معروف */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
      } />
    </Routes>
    </Suspense>
  );
}
