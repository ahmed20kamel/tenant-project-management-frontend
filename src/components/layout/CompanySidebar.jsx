import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "./SidebarContext";
import { 
  FaHome, 
  FaFolderOpen, 
  FaUsers, 
  FaUserTie, 
  FaMoneyBillWave, 
  FaUserCog, 
  FaCog, 
  FaEdit, 
  FaFileInvoice, 
  FaCheckCircle, 
  FaClock, 
  FaPlus, 
  FaList, 
  FaReceipt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaChevronRight
} from "react-icons/fa";

export default function CompanySidebar() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { collapsed, setCollapsed } = useSidebar();
  const isRTL = i18n.language === 'ar';

  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
  const isManager = user?.role?.name === 'Manager';

  // Get active key based on pathname
  const getActiveKey = () => {
    if (pathname === "/dashboard" || pathname === "/" || pathname === "/home") return "home";
    
    // Check for specific project sub-routes first
    if (pathname === "/projects" || pathname === "/projects/") return "projects-list";
    if (pathname === "/wizard/new") return "add-project";
    if (pathname === "/projects/select-start-order") return "add-start-order";
    if (pathname === "/projects/select-variation") return "add-variation";
    if (pathname === "/projects/select-awarding") return "add-awarding";
    if (pathname === "/projects/select-extensions") return "add-extensions";
    if (pathname === "/projects/select-payment") return "add-payment";
    if (pathname === "/projects/select-invoice") return "add-invoice";
    if (pathname === "/projects/pending-approvals") return "pending-approvals";
    if (pathname === "/projects/final-approvals") return "final-approvals";
    
    // General project routes
    if (pathname.startsWith("/projects") || pathname.startsWith("/wizard")) {
      // Return parent key to keep projects menu open
      return pathname.includes("/projects") && !pathname.includes("/select-") ? "projects-list" : "projects";
    }
    
    if (pathname === "/payments") return "payments";
    if (pathname === "/variations") return "variations";
    if (pathname === "/invoices") return "invoices";
    if (pathname === "/owners") return "owners";
    if (pathname === "/consultants") return "consultants";
    if (pathname === "/company/users") return "company-users";
    if (pathname === "/company/settings") return "company-settings";
    return "home";
  };

  // Build menu items
  const buildMenuItems = () => {
    const items = [];

    // Home
    items.push({
      key: 'home',
      icon: <FaHome />,
      label: t("sidebar_home"),
    });

    // Projects with dropdown - Organized in logical groups
    const projectChildren = [
      // Main Projects Section
      {
        key: 'projects-list',
        icon: <FaList />,
        label: t("projects_list") || "قائمة المشاريع",
        type: 'main',
      },
      {
        key: 'add-project',
        icon: <FaPlus />,
        label: t("add_project") || "إضافة مشروع",
        type: 'main',
      },
      // Divider for visual separation
      {
        key: 'divider-1',
        type: 'divider',
      },
      // Project Operations Section
      {
        key: 'add-start-order',
        icon: <FaFileInvoice />,
        label: t("add_start_order") || "إضافة أمر مباشرة",
        type: 'operation',
      },
      {
        key: 'add-variation',
        icon: <FaEdit />,
        label: t("add_variation") || "إضافة تغيير سعري",
        type: 'operation',
      },
      {
        key: 'add-awarding',
        icon: <FaCheckCircle />,
        label: t("add_awarding") || "إضافة ترسية",
        type: 'operation',
      },
      {
        key: 'add-extensions',
        icon: <FaClock />,
        label: t("add_extensions") || "إضافة التمديدات",
        type: 'operation',
      },
      // Divider
      {
        key: 'divider-2',
        type: 'divider',
      },
      // Financial Operations Section
      {
        key: 'add-payment',
        icon: <FaMoneyBillWave />,
        label: t("add_payment") || "إضافة دفعة",
        type: 'financial',
      },
      {
        key: 'add-invoice',
        icon: <FaReceipt />,
        label: t("add_invoice") || "إضافة فاتورة",
        type: 'financial',
      },
    ];

    items.push({
      key: 'projects',
      icon: <FaFolderOpen />,
      label: t("sidebar_projects"),
      children: projectChildren,
    });

    // Other menu items
    items.push({
      key: 'payments',
      icon: <FaMoneyBillWave />,
      label: t("sidebar_payments"),
    });

    items.push({
      key: 'variations',
      icon: <FaEdit />,
      label: t("sidebar_variations"),
    });

    items.push({
      key: 'invoices',
      icon: <FaFileInvoice />,
      label: t("sidebar_invoices"),
    });

    items.push({
      key: 'owners',
      icon: <FaUsers />,
      label: t("sidebar_owners"),
    });

    items.push({
      key: 'consultants',
      icon: <FaUserTie />,
      label: t("sidebar_consultants"),
    });

    // Manager items
    if (isManager) {
      items.push({
        key: 'pending-approvals',
        icon: <FaClock />,
        label: isRTL ? "الموافقات المعلقة" : "Pending Approvals",
      });
    }

    // Company Super Admin items
    if (isCompanySuperAdmin) {
      items.push({
        key: 'final-approvals',
        icon: <FaCheckCircle />,
        label: isRTL ? "الاعتماد النهائي" : "Final Approvals",
      });

      items.push({
        key: 'company-users',
        icon: <FaUserCog />,
        label: isRTL ? "إدارة المستخدمين" : "Manage Users",
      });

      items.push({
        key: 'company-settings',
        icon: <FaCog />,
        label: isRTL ? "إدارة الشركة" : "Company Settings",
      });
    }

    return items;
  };

  const handleMenuClick = ({ key }) => {
    // Skip dividers
    if (key?.includes('divider')) {
      return;
    }

    switch (key) {
      case 'home':
        navigate('/dashboard');
        break;
      case 'projects-list':
        navigate('/projects');
        break;
      case 'add-project':
        navigate('/wizard/new');
        break;
      case 'add-start-order':
        navigate('/projects/select-start-order');
        break;
      case 'add-variation':
        navigate('/projects/select-variation');
        break;
      case 'add-awarding':
        navigate('/projects/select-awarding');
        break;
      case 'add-extensions':
        navigate('/projects/select-extensions');
        break;
      case 'add-payment':
        navigate('/projects/select-payment');
        break;
      case 'add-invoice':
        navigate('/projects/select-invoice');
        break;
      case 'payments':
        navigate('/payments');
        break;
      case 'variations':
        navigate('/variations');
        break;
      case 'invoices':
        navigate('/invoices');
        break;
      case 'owners':
        navigate('/owners');
        break;
      case 'consultants':
        navigate('/consultants');
        break;
      case 'pending-approvals':
        navigate('/projects/pending-approvals');
        break;
      case 'final-approvals':
        navigate('/projects/final-approvals');
        break;
      case 'company-users':
        navigate('/company/users');
        break;
      case 'company-settings':
        navigate('/company/settings');
        break;
      default:
        break;
    }
  };

  const getOpenKeys = () => {
    const keys = [];
    // Always open projects menu if we're on any project-related page
    if (pathname.startsWith("/projects") || 
        pathname.startsWith("/wizard") ||
        pathname.includes("/projects/") ||
        pathname.includes("/wizard/")) {
      keys.push('projects');
    }
    return keys;
  };

  // Always open projects menu by default to show all options
  const [openKeys, setOpenKeys] = useState(['projects']);
  
  const activeKey = getActiveKey();

  useEffect(() => {
    // Always keep projects menu open
    setOpenKeys(prevKeys => {
      if (!prevKeys.includes('projects')) {
        return [...prevKeys, 'projects'];
    }
      return prevKeys;
    });
  }, [pathname]);

  const toggleOpenKey = (key) => {
    if (openKeys.includes(key)) {
      setOpenKeys(openKeys.filter(k => k !== key));
    } else {
      setOpenKeys([...openKeys, key]);
    }
  };

  const renderMenuItem = (item, isSubItem = false) => {
    // Handle divider
    if (item.type === 'divider') {
      return <div key={item.key} className="simple-menu-divider" />;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isChildSelected = hasChildren && item.children.some(child => activeKey === child.key);
    const isSelected = activeKey === item.key || isChildSelected;
    // Always open if child is selected, or if key is in openKeys
    const isOpen = openKeys.includes(item.key) || isChildSelected;

    if (hasChildren && !collapsed) {
      return (
        <div key={item.key} className={`simple-menu-item ${isSubItem ? 'sub-item' : ''}`}>
          <div 
            className={`simple-menu-submenu-title ${isSelected ? 'selected' : ''}`}
            onClick={() => toggleOpenKey(item.key)}
          >
            <span className="simple-menu-icon">{item.icon}</span>
            <span className="simple-menu-label">{item.label}</span>
            <span className="simple-menu-arrow">
              {isOpen ? <FaChevronDown /> : <FaChevronRight />}
            </span>
          </div>
          {isOpen && item.children && item.children.length > 0 && (
            <div className="simple-menu-submenu" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
              {item.children.map((child) => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    if (hasChildren && collapsed) {
      return (
        <div key={item.key} className={`simple-menu-item ${isSubItem ? 'sub-item' : ''}`}>
          <div 
            className={`simple-menu-submenu-title ${isSelected ? 'selected' : ''}`}
            onClick={() => toggleOpenKey(item.key)}
            title={item.label}
          >
            <span className="simple-menu-icon">{item.icon}</span>
          </div>
        </div>
      );
    }

    // Skip rendering if it's a divider (already handled above)
    if (item.type === 'divider') {
      return null;
    }

    return (
      <div
        key={item.key}
        className={`simple-menu-item ${isSelected ? 'selected' : ''} ${isSubItem ? 'sub-item' : ''}`}
        onClick={() => handleMenuClick({ key: item.key })}
        title={collapsed ? item.label : undefined}
      >
        <div className="simple-menu-item-content">
          <span className="simple-menu-icon">{item.icon}</span>
          {!collapsed && <span className="simple-menu-label">{item.label}</span>}
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar-antd" dir={isRTL ? "rtl" : "ltr"}>
      <div className="sidebar-header">
      <div className="sidebar-collapse-btn">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-toggle-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
        >
          {collapsed ? <FaBars /> : <FaTimes />}
        </button>
      </div>
      </div>
      <div className="simple-menu sidebar-menu">
        {buildMenuItems().map((item) => renderMenuItem(item))}
      </div>
    </aside>
  );
}
