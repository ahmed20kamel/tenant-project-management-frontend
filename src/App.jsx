// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ui/ProtectedRoute";

// ====== Public Pages (صفحات عامة) ======
import LandingPage from "./pages/public/LandingPage";
import PricingPage from "./pages/public/PricingPage";
import CompanyRegistrationPage from "./features/auth/pages/CompanyRegistrationPage";

// ====== Auth Pages (صفحات المصادقة) ======
import AdminLoginPage from "./features/admin/pages/AdminLoginPage";
import CompanyLoginPage from "./features/auth/pages/CompanyLoginPage";
import OnboardingWizardPage from "./features/auth/pages/OnboardingWizardPage";

// ====== Dashboard Pages (صفحات لوحة التحكم) ======
import HomePage from "./pages/HomePage";
import AdminDashboardPage from "./features/admin/pages/AdminDashboardPage";

// ====== Admin Pages (صفحات الإدارة) ======
import AdminTenantsPage from "./features/admin/pages/AdminTenantsPage";
import AdminCreateCompanyPage from "./features/admin/pages/AdminCreateCompanyPage";

// ====== Company Pages (صفحات الشركة) ======
import CompanySettingsPage from "./features/company/pages/CompanySettingsPage";
import CompanyUsersPage from "./features/company/pages/CompanyUsersPage";

// ====== Projects Pages (صفحات المشاريع) ======
import ProjectsPage from "./features/projects/pages/ProjectsPage";
import ProjectView from "./features/projects/pages/ProjectView";
import WizardPage from "./features/projects/wizard/WizardPage";
import ViewSetup from "./features/projects/view/ViewSetup";
import ViewSitePlan from "./features/projects/view/ViewSitePlan";
import ViewLicense from "./features/projects/view/ViewLicense";
import ViewContract from "./features/projects/view/ViewContract";
import ViewAwarding from "./features/projects/view/ViewAwarding";
import ViewSummary from "./features/projects/view/ViewSummary";

// ====== Payments Pages (صفحات المدفوعات) ======
import PaymentsPage from "./features/payments/pages/PaymentsPage";
import CreatePaymentPage from "./features/payments/pages/CreatePaymentPage";
import ViewPaymentPage from "./features/payments/pages/ViewPaymentPage";

// ====== Variations Pages ======
import VariationsPage from "./features/variations/pages/VariationsPage";
import CreateVariationPage from "./features/variations/pages/CreateVariationPage";

// ====== Invoices Pages ======
import InvoicesPage from "./features/invoices/pages/InvoicesPage";
import InvoiceViewPage from "./features/invoices/pages/InvoiceViewPage";
import CreateActualInvoicePage from "./features/invoices/pages/CreateActualInvoicePage";

// ====== Owners Pages (صفحات الملاك) ======
import OwnersPage from "./features/owners/pages/OwnersPage";
import OwnerDetailPage from "./features/owners/pages/OwnerDetailPage";
import EditOwnerPage from "./features/owners/pages/EditOwnerPage";

// ====== Consultants Pages (صفحات الاستشاريين) ======
import ConsultantsPage from "./features/consultants/pages/ConsultantsPage";
import ConsultantDetailPage from "./features/consultants/pages/ConsultantDetailPage";
import EditConsultantPage from "./features/consultants/pages/EditConsultantPage";

// ====== Profile Pages (صفحات الملف الشخصي) ======
import ProfilePage from "./features/profile/pages/ProfilePage";

export default function App() {
  return (
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
  );
}
