// ====== أيقونات موحدة للمشروع ======
import {
  FaHome,
  FaFolderOpen,
  FaWrench,
  FaMap,
  FaIdCard,
  FaFileSignature,
  FaList,
  FaCalendarAlt,
  FaHashtag,
  FaUserTie,
  FaUser,
  FaMoneyBillWave,
  FaBalanceScale,
  FaPlusCircle,
  FaEdit,
  FaTrash,
  FaEye,
  FaCheck,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaPrint,
  FaDownload,
  FaUpload,
  FaSave,
  FaArrowLeft,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// أيقونات الصفحات الرئيسية
export const PageIcons = {
  home: FaHome,
  projects: FaFolderOpen,
  project: FaFolderOpen,
  setup: FaWrench,
  siteplan: FaMap,
  license: FaIdCard,
  contract: FaFileSignature,
  award: FaFileSignature,
  summary: FaMoneyBillWave,
};

// أيقونات الإجراءات
export const ActionIcons = {
  add: FaPlusCircle,
  edit: FaEdit,
  delete: FaTrash,
  view: FaEye,
  save: FaSave,
  print: FaPrint,
  download: FaDownload,
  upload: FaUpload,
  check: FaCheck,
  cancel: FaTimes,
  info: FaInfoCircle,
  warning: FaExclamationTriangle,
  back: FaArrowLeft,
  next: FaArrowRight,
  prev: FaChevronLeft,
  forward: FaChevronRight,
};

// أيقونات الحقول
export const FieldIcons = {
  list: FaList,
  date: FaCalendarAlt,
  number: FaHashtag,
  user: FaUser,
  userTie: FaUserTie,
  money: FaMoneyBillWave,
  balance: FaBalanceScale,
};

// دالة مساعدة للحصول على أيقونة
export const getIcon = (category, name) => {
  const icons = {
    page: PageIcons,
    action: ActionIcons,
    field: FieldIcons,
  };
  return icons[category]?.[name] || null;
};

