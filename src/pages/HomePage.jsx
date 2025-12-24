import { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { api } from "../services/api";
import Button from "../components/common/Button";
import Dialog from "../components/common/Dialog";
import PageLayout from "../components/layout/PageLayout";
import { computeContractSummary, withVatTotal } from "../utils/contractFinancial";
import "./homepage.css";
// مكونات مساعدة للتصميم
const StatCard = ({ title, value, subtitle, color, icon, onClick }) => (
  <div 
    className={`stat-card ${color} ${onClick ? 'clickable' : ''}`}
    onClick={onClick}
  >
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h3>{value}</h3>
      <p className="stat-title">{title}</p>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  </div>
);

const DataTable = ({ title, columns, data, onRowClick, emptyMessage, compact, isAR }) => (
  <div className={`data-table-container ${compact ? 'compact' : ''}`}>
      <div className="table-header">
        <h3>{title}</h3>
        <span className="record-count">
          {data.length} {isAR ? "سجل" : "record(s)"}
        </span>
    </div>
    {data.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <p>{emptyMessage}</p>
      </div>
    ) : (
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={onRowClick ? 'clickable' : ''}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={col.className || ''}>
                    {col.render ? col.render(row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const DonutChart = ({ data, labels, colors, title, size = 120 }) => {
  const total = data.reduce((sum, value) => sum + value, 0);
  let accumulated = 0;
  
  return (
    <div className="donut-chart">
      <h3>{title}</h3>
      <div className="chart-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((value, index) => {
            if (value === 0) return null;
            
            const percentage = (value / total) * 100;
            const startAngle = (accumulated / total) * 360;
            const endAngle = ((accumulated + value) / total) * 360;
            
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            
            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
            
            const startX = size/2 + (size/2 - 10) * Math.cos(startRad);
            const startY = size/2 + (size/2 - 10) * Math.sin(startRad);
            const endX = size/2 + (size/2 - 10) * Math.cos(endRad);
            const endY = size/2 + (size/2 - 10) * Math.sin(endRad);
            
            const pathData = [
              `M ${startX} ${startY}`,
              `A ${size/2 - 10} ${size/2 - 10} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            ].join(" ");
            
            accumulated += value;
            
            return (
              <path
                key={index}
                d={pathData}
                fill="none"
                stroke={colors[index]}
                strokeWidth="12"
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={size/2} cy={size/2} r={size/2 - 20} fill="var(--surface-2)" />
          <text 
            x={size/2} 
            y={size/2 - 8} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize="16" 
            fontWeight="700"
            fill="var(--primary)"
          >
            {total.toLocaleString()}
          </text>
          <text 
            x={size/2} 
            y={size/2 + 12} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize="12" 
            fill="var(--muted)"
          >
            مشروع
          </text>
        </svg>
        
        <div className="legend">
          {data.map((value, index) => (
            value > 0 && (
              <div key={index} className="legend-item">
                <div 
                  className="color-dot" 
                  style={{ backgroundColor: colors[index] }}
                ></div>
                <span className="label">{labels[index]}</span>
                <span className="value">
                  {((value / total) * 100).toFixed(0)}%
                </span>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

const LineChart = ({ data, labels, title, color = "var(--primary)" }) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;
  
  return (
    <div className="line-chart">
      <h3>{title}</h3>
      <div className="chart-area">
        <svg width="100%" height="120" viewBox="0 0 300 120">
          {/* المحور Y */}
          <line x1="30" y1="10" x2="30" y2="110" stroke="var(--border)" strokeWidth="1" />
          
          {/* المحور X */}
          <line x1="30" y1="110" x2="290" y2="110" stroke="var(--border)" strokeWidth="1" />
          
          {/* الخط البياني */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={data.map((value, index) => {
              const x = 30 + (index * (260 / (data.length - 1)));
              const y = 110 - ((value - minValue) / range) * 100;
              return `${x},${y}`;
            }).join(" ")}
          />
          
          {/* النقاط */}
          {data.map((value, index) => {
            const x = 30 + (index * (260 / (data.length - 1)));
            const y = 110 - ((value - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
          
          {/* التسميات */}
          {labels.map((label, index) => {
            const x = 30 + (index * (260 / (labels.length - 1)));
            return (
              <text
                key={index}
                x={x}
                y="120"
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const BarChart = ({ data, labels, title, color = "var(--primary)" }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data);
  
  return (
    <div className="bar-chart">
      <h3>{title}</h3>
      <div className="chart-area">
        <div className="bars-container">
          {data.map((value, index) => (
            <div key={index} className="bar-item">
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    height: `${(value / maxValue) * 100}%`,
                    backgroundColor: color
                  }}
                ></div>
              </div>
              <div className="bar-value">{value.toLocaleString()}</div>
              <div className="bar-label">{labels[index]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HomePage = memo(function HomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(false);
  
  // إعادة توجيه بناءً على نوع المستخدم
  useEffect(() => {
    if (user) {
      if (user.is_superuser) {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      
      // التحقق من أن المستخدم هو Company Super Admin
      const isCompanySuperAdmin = user.role?.name === 'company_super_admin';
      
      // فقط Company Super Admin الذي لم يكمل Onboarding يتم توجيهه لصفحة Onboarding
      if (isCompanySuperAdmin && !user.onboarding_completed) {
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // جميع المستخدمين الآخرين (بما فيهم Company Super Admin الذي أكمل Onboarding) يبقون في Dashboard
    }
  }, [user, navigate]);
  const [errorMsg, setErrorMsg] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectRows, setProjectRows] = useState([]);
  const [ownerRows, setOwnerRows] = useState([]);
  const [consultantRows, setConsultantRows] = useState([]);
  // ✅ تم إزالة contractorRows - المقاول = الشركة نفسها
  const [projectFinancialRows, setProjectFinancialRows] = useState([]);
  const [showVat, setShowVat] = useState(true); // حالة للتبديل بين مع وبدون ضريبة
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    totalOwners: 0,
    totalConsultants: 0,
    withSiteplan: 0,
    withLicense: 0,
    withContract: 0,
    withAwarding: 0,
    contractTotalNoVat: 0,
    contractTotalWithVat: 0,
    consultantTotalNoVat: 0,
    consultantTotalWithVat: 0,
    actualTotalNoVat: 0,
    actualTotalWithVat: 0,
    actualBankNoVat: 0,
    actualBankWithVat: 0,
    actualOwnerNoVat: 0,
    actualOwnerWithVat: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setStatsLoading(true);
    setStatsError("");
    try {
      console.log("🔄 Loading projects from API with included relations...");
      // ✅ استخدام include parameter لتقليل عدد API calls من N+1 إلى 1 فقط
      const { data } = await api.get("projects/?include=siteplan,license,contract,awarding");
      console.log("✅ API Response:", data);
      
      const items = Array.isArray(data)
        ? data
        : data?.results || data?.items || data?.data || [];

      const safeProjects = items || [];
      console.log(`📊 Found ${safeProjects.length} projects`);
      setProjects(safeProjects);

      const ownersMap = new Map();
      const consultantsMap = new Map();
      // ✅ تم إزالة contractorsMap - المقاول = الشركة نفسها

      let withSiteplan = 0;
      let withLicense = 0;
      let withContract = 0;
      let withAwarding = 0;
      
      let contractTotalNoVat = 0;
      let contractTotalWithVat = 0;
      let consultantTotalNoVat = 0;
      let consultantTotalWithVat = 0;
      let actualTotalNoVat = 0;
      let actualTotalWithVat = 0;
      let actualBankNoVat = 0;
      let actualBankWithVat = 0;
      let actualOwnerNoVat = 0;
      let actualOwnerWithVat = 0;

      const projectRowsLocal = [];
      const financialRows = [];

      // ✅ البيانات موجودة بالفعل في response - لا حاجة لـ Promise.all
      safeProjects.forEach((p) => {
        const projectId = p.id;
        if (!projectId) return;

        // ✅ استخدام البيانات من include بدلاً من API calls منفصلة
        const siteplanData = p.siteplan_data || null;
        const licenseData = p.license_data || null;
        const contractData = p.contract_data || null;
        const awardingData = p.awarding_data || null;

          if (siteplanData) withSiteplan += 1;
          if (licenseData) withLicense += 1;
          if (contractData || p?.contract_type) withContract += 1;
          if (awardingData) withAwarding += 1;

          // ===== أصحاب المشاريع (Owners) =====
          if (siteplanData?.owners?.length) {
            const owner = siteplanData.owners[0];
            const ownerNameAr =
              owner?.owner_name_ar || owner?.owner_name || "";
            const ownerNameEn = owner?.owner_name_en || "";
            const ownerName = ownerNameAr || ownerNameEn;
            if (ownerName) {
              const idNumber = owner?.id_number || "";
              const key = `${ownerName.toLowerCase().trim()}_${idNumber}`;
              if (!ownersMap.has(key)) {
                ownersMap.set(key, {
                  name: ownerName,
                  nameAr: ownerNameAr,
                  nameEn: ownerNameEn,
                  fullData: { ...owner },
                  projects: [],
                });
              }
              const entry = ownersMap.get(key);
              if (
                entry &&
                !entry.projects.some((pr) => pr.id === projectId)
              ) {
                entry.projects.push({
                  id: projectId,
                  name:
                    p?.display_name ||
                    p?.name ||
                    `Project #${projectId}`,
                  internalCode: p?.internal_code || null,
                });
              }
            }
          }

          // ===== الاستشاريون (Consultants) =====
          if (licenseData) {
            // استشاري التصميم
            if (licenseData.design_consultant_name) {
              const key = licenseData.design_consultant_name
                .toLowerCase()
                .trim();
              if (!consultantsMap.has(key)) {
                consultantsMap.set(key, {
                  name: licenseData.design_consultant_name,
                  licenseNo: licenseData.design_consultant_license_no || "",
                  type: "design",
                  projects: [],
                });
              }
              const entry = consultantsMap.get(key);
              if (
                entry &&
                !entry.projects.some((pr) => pr.id === projectId)
              ) {
                entry.projects.push({
                  id: projectId,
                  name:
                    p?.display_name ||
                    p?.name ||
                    `Project #${projectId}`,
                  internalCode: p?.internal_code || null,
                });
              }
            }
            // استشاري الإشراف (لو مختلف عن استشاري التصميم)
            if (
              licenseData.supervision_consultant_name &&
              licenseData.supervision_consultant_name !==
                licenseData.design_consultant_name
            ) {
              const key = licenseData.supervision_consultant_name
                .toLowerCase()
                .trim();
              if (!consultantsMap.has(key)) {
                consultantsMap.set(key, {
                  name: licenseData.supervision_consultant_name,
                  licenseNo:
                    licenseData.supervision_consultant_license_no || "",
                  type: "supervision",
                  projects: [],
                });
              }
              const entry = consultantsMap.get(key);
              if (
                entry &&
                !entry.projects.some((pr) => pr.id === projectId)
              ) {
                entry.projects.push({
                  id: projectId,
                  name:
                    p?.display_name ||
                    p?.name ||
                    `Project #${projectId}`,
                  internalCode: p?.internal_code || null,
                });
              }
            }
          }

          // ✅ تم إزالة منطق المقاولين - المقاول = الشركة نفسها (بيانات ثابتة من TenantSettings)

          // ===== ملخص العقد المالي =====
          if (contractData) {
            const summary = computeContractSummary(contractData);
            if (summary) {
              const { grossTotal, total, bank, owner } = summary;

              const contractNoVat = grossTotal || 0;
              const contractWithVat = withVatTotal(grossTotal) || 0;
              const consultantNoVat = total?.fee || 0;
              const consultantWithVat = withVatTotal(total?.fee) || 0;
              const actualNoVat = total?.net || 0;
              const actualWithVat = withVatTotal(total?.net) || 0;
              const bankNoVat = bank?.net || 0;
              const bankWithVat = withVatTotal(bank?.net) || 0;
              const ownerNoVat = owner?.net || 0;
              const ownerWithVat = withVatTotal(owner?.net) || 0;

              // تجميع الإجماليات
              contractTotalNoVat += contractNoVat;
              contractTotalWithVat += contractWithVat;
              consultantTotalNoVat += consultantNoVat;
              consultantTotalWithVat += consultantWithVat;
              actualTotalNoVat += actualNoVat;
              actualTotalWithVat += actualWithVat;
              actualBankNoVat += bankNoVat;
              actualBankWithVat += bankWithVat;
              actualOwnerNoVat += ownerNoVat;
              actualOwnerWithVat += ownerWithVat;

              financialRows.push({
                id: projectId,
                name: p?.display_name || p?.name || `Project #${projectId}`,
                contractTotalNoVat: contractNoVat,
                contractTotalWithVat: contractWithVat,
                consultantTotalNoVat: consultantNoVat,
                consultantTotalWithVat: consultantWithVat,
                actualTotalNoVat: actualNoVat,
                actualTotalWithVat: actualWithVat,
                actualBankNoVat: bankNoVat,
                actualBankWithVat: bankWithVat,
                actualOwnerNoVat: ownerNoVat,
                actualOwnerWithVat: ownerWithVat,
              });
            }
          }

          // ===== صف المشروع للجدول العام =====
          {
            const rowName =
              p?.display_name || p?.name || `Project #${projectId}`;
            const internalCode = p?.internal_code || `PRJ-${projectId}`;
            const zoneLabel =
              siteplanData?.zone ||
              siteplanData?.municipality ||
              p?.zone ||
              p?.city ||
              "";

            projectRowsLocal.push({
              id: projectId,
              name: rowName,
              internalCode,
              zone: zoneLabel,
            });
          }
      });

      const ownersArray = Array.from(ownersMap.values());
      const consultantsArray = Array.from(consultantsMap.values());
      // ✅ تم إزالة contractorsArray - المقاول = الشركة نفسها

      setMetrics({
        totalProjects: safeProjects.length,
        totalOwners: ownersArray.length,
        totalConsultants: consultantsArray.length,
        withSiteplan,
        withLicense,
        withContract,
        withAwarding,
        contractTotalNoVat,
        contractTotalWithVat,
        consultantTotalNoVat,
        consultantTotalWithVat,
        actualTotalNoVat,
        actualTotalWithVat,
        actualBankNoVat,
        actualBankWithVat,
        actualOwnerNoVat,
        actualOwnerWithVat,
      });
      setProjectRows(projectRowsLocal);
      setOwnerRows(ownersArray);
      setConsultantRows(consultantsArray);
      // ✅ تم إزالة setContractorRows - المقاول = الشركة نفسها
      setProjectFinancialRows(financialRows);
    } catch (err) {
      console.error("❌ Error loading projects:", err);
      console.error("❌ Error response:", err?.response);
      const msg =
        err?.response?.data
          ? JSON.stringify(err.response.data, null, 2)
          : err?.message || t("unknown_error");
      setStatsError(msg);
      // ✅ إرجاع قائمة فارغة في حالة الخطأ
      setProjects([]);
      setProjectRows([]);
      setOwnerRows([]);
      setConsultantRows([]);
      setProjectFinancialRows([]);
      setMetrics({
        totalProjects: 0,
        totalOwners: 0,
        totalConsultants: 0,
        withSiteplan: 0,
        withLicense: 0,
        withContract: 0,
        withAwarding: 0,
        contractTotalNoVat: 0,
        contractTotalWithVat: 0,
        consultantTotalNoVat: 0,
        consultantTotalWithVat: 0,
        actualTotalNoVat: 0,
        actualTotalWithVat: 0,
        actualBankNoVat: 0,
        actualBankWithVat: 0,
        actualOwnerNoVat: 0,
        actualOwnerWithVat: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }

  function createProject() {
    // ✅ الانتقال مباشرة إلى الويزارد بدون إنشاء مشروع
    navigate("/wizard/new");
  }

  // إجماليات مبالغ المقاولات (تجميع سريع من صفوف المشاريع)
  const financialTotals = {
    contractNoVat: metrics.contractTotalNoVat,
    contractWithVat: metrics.contractTotalWithVat,
    consultantNoVat: metrics.consultantTotalNoVat,
    consultantWithVat: metrics.consultantTotalWithVat,
    actualNoVat: metrics.actualTotalNoVat,
    actualWithVat: metrics.actualTotalWithVat,
  };

  // تعريف أعمدة الجداول
  const projectColumns = [
    { 
      key: "index", 
      header: "#", 
      width: "60px",
      render: (_, index) => (
        <div className="index-cell">{index + 1}</div>
      )
    },
    { 
      key: "name", 
      header: "اسم المشروع",
      render: (row) => (
        <div className="project-name" onClick={() => navigate(`/projects/${row.id || ""}`)}>
          <div className="name-text">{row.name}</div>
          <div className="view-link">عرض التفاصيل</div>
        </div>
      )
    },
    { 
      key: "internalCode", 
      header: "الكود",
      className: "code-cell",
      render: (row) => <code>{row.internalCode}</code>
    }
  ];

  const ownerColumns = [
    { 
      key: "index", 
      header: "#", 
      width: "60px",
      render: (_, index) => <div className="index-cell">{index + 1}</div>
    },
    { 
      key: "name", 
      header: "اسم المالك",
      render: (row) => (
        <div 
          className="clickable-name" 
          onClick={() => navigate(`/owners/${encodeURIComponent(row.name)}`, { state: { ownerData: row } })}
        >
          {row.name}
        </div>
      )
    },
    { 
      key: "projects", 
      header: "المشاريع",
      render: (row) => (
        <div className="project-count">
          <span className="count-badge">{Array.isArray(row.projects) ? row.projects.length : 0}</span>
        </div>
      )
    }
  ];

  const consultantColumns = [
    { 
      key: "index", 
      header: "#", 
      width: "60px",
      render: (_, index) => <div className="index-cell">{index + 1}</div>
    },
    { 
      key: "name", 
      header: "الاستشاري",
      render: (row) => (
        <div 
          className="clickable-name" 
          onClick={() => navigate(`/consultants/${encodeURIComponent(row.name)}`, { state: { consultantData: row } })}
        >
          {row.name}
        </div>
      )
    },
    { 
      key: "projects", 
      header: "المشاريع",
      render: (row) => (
        <div className="project-count">
          <span className="count-badge">{Array.isArray(row.projects) ? row.projects.length : 0}</span>
        </div>
      )
    }
  ];

  // ✅ تم إزالة contractorColumns - المقاول = الشركة نفسها (بيانات ثابتة من إعدادات الشركة)

  const financialColumns = [
    { 
      key: "name", 
      header: "المشروع",
      render: (row) => (
        <div className="project-name" onClick={() => navigate(`/projects/${row.id || ""}`)}>
          <div className="name-text">{row.name}</div>
        </div>
      )
    },
    { 
      key: "contractTotalWithVat", 
      header: "القيمة التعاقدية",
      render: (row) => (
        <div className="amount-cell primary">
          {showVat 
            ? (row.contractTotalWithVat?.toLocaleString(i18n.language) || '0') 
            : (row.contractTotalNoVat?.toLocaleString(i18n.language) || '0')
          } <span className="currency">درهم</span>
        </div>
      )
    },
    { 
      key: "actualTotalWithVat", 
      header: "المقاولة الفعلية",
      render: (row) => (
        <div className="amount-cell secondary">
          {showVat 
            ? (row.actualTotalWithVat?.toLocaleString(i18n.language) || '0') 
            : (row.actualTotalNoVat?.toLocaleString(i18n.language) || '0')
          } <span className="currency">درهم</span>
        </div>
      )
    }
  ];

  // بيانات للرسوم البيانية
  const projectStatusData = [
    metrics.withSiteplan,
    metrics.withLicense, 
    metrics.withContract,
    metrics.withAwarding
  ];
  
  const projectStatusLabels = isAR
    ? ["بالمخططات", "بتراخيص", "بعقود", "بتسليم"]
    : ["With Siteplan", "With License", "With Contract", "Delivered"];
  const projectStatusColors = [
    "var(--primary)",
    "var(--primary-600)",
    "var(--primary-dark)",
    "var(--muted)"
  ];

  // بيانات تجريبية للرسم البياني الخطي
  const monthlyData = [12000000, 12500000, 13024789, 13200000, 13500000];
  const monthlyLabels = isAR
    ? ["يناير", "فبراير", "مارس", "أبريل", "مايو"]
    : ["Jan", "Feb", "Mar", "Apr", "May"];

  // أعلى المشاريع قيمة (من بيانات التفاصيل المالية) - نعرض أعلى 3 فقط
  const topProjectsByValue = [...projectFinancialRows]
    .filter((p) => typeof (p.actualTotalWithVat || p.contractTotalWithVat) === "number")
    .sort(
      (a, b) =>
        (b.actualTotalWithVat || b.contractTotalWithVat || 0) -
        (a.actualTotalWithVat || a.contractTotalWithVat || 0)
    )
    .slice(0, 3);

  const projectValueData = topProjectsByValue.map(
    (p) => p.actualTotalWithVat || p.contractTotalWithVat || 0
  );
  const projectValueLabels = topProjectsByValue.map((p) => p.name || "مشروع");

  return (
    <PageLayout loading={statsLoading} loadingText={t("loading_projects")}>
      <div className={`modern-dashboard ${isAR ? "rtl" : "ltr"} ${isDark ? "dark" : "light"}`}>
        <Dialog
          open={!!errorMsg}
          title={t("error")}
          desc={
            <pre className="pre-wrap" style={{ margin: 0 }}>
              {errorMsg}
            </pre>
          }
          confirmLabel={t("ok")}
          onClose={() => setErrorMsg("")}
          onConfirm={() => setErrorMsg("")}
        />

        {/* رأس الداشبورد */}
        <header className="dashboard-header">
          <div className="header-content">
            <h1>{isAR ? "لوحة التحكم" : "Dashboard"}</h1>
            <p>
              {isAR
                ? "نظرة شاملة على المشاريع والأداء"
                : "High-level overview of projects and performance"}
            </p>
          </div>
          <div className="header-actions">
            <Button 
              onClick={createProject} 
              className="primary-btn"
            >
              {isAR ? "مشروع جديد" : "New Project"}
            </Button>
          </div>
        </header>

        {statsError && (
          <div className="error-alert">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <strong>
                {isAR ? "خطأ في تحميل البيانات:" : "Error loading data:"}
              </strong>
              <pre className="pre-wrap">{statsError}</pre>
            </div>
          </div>
        )}

        {/* إحصائيات سريعة */}
        <section className="stats-section">
          <div className="stats-grid">
            <StatCard
              title={isAR ? "إجمالي المشاريع" : "Total Projects"}
              value={metrics.totalProjects.toLocaleString()}
              subtitle={isAR ? "مشروع" : "Project"}
              icon="📁"
              color="primary"
            />
            <StatCard
              title={isAR ? "الملاك" : "Owners"}
              value={metrics.totalOwners.toLocaleString()}
              subtitle={isAR ? "مالك" : "Owner"}
              icon="👤"
              color="secondary"
            />
            <StatCard
              title={isAR ? "الاستشاريون" : "Consultants"}
              value={metrics.totalConsultants.toLocaleString()}
              subtitle={isAR ? "استشاري" : "Consultant"}
              icon="🏢"
              color="accent"
            />
          </div>
        </section>

        {/* شبكة الجداول الرئيسية: مشاريع / ملاك / استشاريين */}
        <section className="tables-grid">
          <div className="table-column">
            <DataTable
              title={isAR ? "المشاريع" : "Projects"}
              columns={projectColumns}
              data={projectRows}
              emptyMessage="لا توجد مشاريع مسجلة"
              isAR={isAR}
            />
          </div>
          <div className="table-column">
            <DataTable
              title={isAR ? "الملاك" : "Owners"}
              columns={ownerColumns}
              data={ownerRows}
              emptyMessage="لا توجد بيانات ملاك"
              isAR={isAR}
            />
          </div>
          <div className="table-column">
            <DataTable
              title={isAR ? "الاستشاريين" : "Consultants"}
              columns={consultantColumns}
              data={consultantRows}
              emptyMessage="لا توجد بيانات استشاريين"
              isAR={isAR}
            />
          </div>
        </section>

        {/* شبكة الرسوم البيانية: حالة المشاريع / تطور العقود / أعلى المشاريع قيمة (جنب بعض) */}
        <section className="charts-grid">
          <div className="chart-card">
            <DonutChart
              data={projectStatusData}
              labels={projectStatusLabels}
              colors={projectStatusColors}
              title={isAR ? "حالة المشاريع" : "Project Status"}
              size={140}
            />
          </div>
          <div className="chart-card">
            <LineChart
              data={monthlyData}
              labels={monthlyLabels}
              title={isAR ? "تطور إجمالي العقود" : "Total Contract Evolution"}
              color="var(--primary)"
            />
          </div>
          <div className="chart-card">
            <BarChart
              data={projectValueData}
              labels={projectValueLabels}
              title={isAR ? "أعلى المشاريع قيمة" : "Top Projects by Value"}
              color="var(--primary)"
            />
          </div>
        </section>

        {/* فقرة واحدة: الملخص المالي + تفاصيل المشاريع */}
        <section className="financial-section">
          <div className="financial-section-header">
            <h2>{isAR ? "الملخص المالي" : "Financial Summary"}</h2>
            <div className="vat-toggle">
              <button 
                className={`toggle-btn ${!showVat ? 'active' : ''}`}
                onClick={() => setShowVat(false)}
              >
                {isAR ? "بدون ضريبة" : "Excl. VAT"}
              </button>
              <button 
                className={`toggle-btn ${showVat ? 'active' : ''}`}
                onClick={() => setShowVat(true)}
              >
                {isAR ? "شامل ضريبة 5%" : "Incl. 5% VAT"}
              </button>
            </div>
          </div>

          <div className="financial-grid">
            <div className="financial-cards">
              <div className="financial-card primary">
                <div className="financial-content">
                  <div className="financial-title">
                    {isAR ? "إجمالي العقود" : "Total Contracts"}
                  </div>
                  <div className="financial-amount">
                    {showVat 
                      ? financialTotals.contractWithVat.toLocaleString(i18n.language)
                      : financialTotals.contractNoVat.toLocaleString(i18n.language)
                    }
                  </div>
                  <div className="financial-subtitle">
                    {isAR ? "درهم" : "AED"}
                  </div>
                </div>
                <div className="financial-icon">📄</div>
              </div>
              
              <div className="financial-card secondary">
                <div className="financial-content">
                  <div className="financial-title">
                    {isAR ? "أتعاب الاستشاريين" : "Consultant Fees"}
                  </div>
                  <div className="financial-amount">
                    {showVat 
                      ? financialTotals.consultantWithVat.toLocaleString(i18n.language)
                      : financialTotals.consultantNoVat.toLocaleString(i18n.language)
                    }
                  </div>
                  <div className="financial-subtitle">
                    {isAR ? "درهم" : "AED"}
                  </div>
                </div>
                <div className="financial-icon">👨‍💼</div>
              </div>
              
              <div className="financial-card accent">
                <div className="financial-content">
                  <div className="financial-title">
                    {isAR ? "المقاولة الفعلية" : "Actual Contract"}
                  </div>
                  <div className="financial-amount">
                    {showVat 
                      ? financialTotals.actualWithVat.toLocaleString(i18n.language)
                      : financialTotals.actualNoVat.toLocaleString(i18n.language)
                    }
                  </div>
                  <div className="financial-subtitle">
                    {isAR ? "درهم" : "AED"}
                  </div>
                </div>
                <div className="financial-icon">🏗️</div>
              </div>
            </div>
          </div>

          <div className="financial-details-table">
            <DataTable
              columns={financialColumns}
              data={projectFinancialRows}
              emptyMessage="لا توجد عقود مالية"
              isAR={isAR}
            />
          </div>
        </section>

        {/* ✅ تم إزالة قسم المقاولين - المقاول = الشركة نفسها (بيانات ثابتة من إعدادات الشركة) */}

      </div>

    </PageLayout>
  );
});

export default HomePage;