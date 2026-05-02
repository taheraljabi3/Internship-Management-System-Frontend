import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ROUTES from '../../../app/router/routePaths';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getEligibilityByOwnerRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getPendingEligibilityQueueRequest,
  getTrainingCompanyRequestsByOwnerRequest,
  getTrainingPlansByOwnerRequest,
  getUsersRequest,
  getWeeklyReportsByOwnerRequest,
} from '../../../app/api/client';

function normalizeUser(user) {
  return {
    id: user.id ?? user.user_id ?? user.userId,
    fullName: user.full_name || user.fullName || '',
    email: user.email || '',
    role: user.role || '',
    status: user.status || '',
  };
}

function normalizeAdvisor(item) {
  return {
    id: item.user_id ?? item.id,
    fullName: item.full_name || item.fullName || '',
    email: item.email || '',
    employeeNo: item.employee_no || item.employeeNo || '',
    department: item.department || '',
    studentsCount: Number(item.students_count || item.studentsCount || 0),
  };
}

function normalizeAdvisorStudent(item, advisor) {
  return {
    id: `${advisor?.id || 'advisor'}-${item.student_user_id || item.id || item.email}`,
    type: 'assignments',
    typeLabel: 'Advisor / Student Mapping',
    primary: item.full_name || item.fullName || '',
    secondary: item.email || '',
    status: item.status || 'Active',
    owner: advisor?.fullName || advisor?.email || '',
    source: item.student_code || item.studentCode || '',
    date: item.assignment_start_at || item.assignmentStartAt || '',
  };
}

function normalizeInvitationBatch(item) {
  return {
    id: item.id,
    invitationMode: item.invitation_mode || item.invitationMode || '',
    advisorUserId: item.advisor_user_id || item.advisorUserId,
    advisorName: item.advisor_name || item.advisorName || '',
    totalRecipients: Number(item.total_recipients || item.totalRecipients || 0),
    sentAt: item.sent_at || item.sentAt || '',
    createdAt: item.created_at || item.createdAt || '',
    sharedLinkUrl: item.shared_link_url || item.sharedLinkUrl || '',
  };
}

function normalizeInvitationRecipient(item, batch) {
  return {
    id: item.id,
    batchId: item.batch_id || item.batchId || batch?.id,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    invitationStatus: item.invitation_status || item.invitationStatus || '',
    sentAt: item.sent_at || item.sentAt || batch?.sentAt || batch?.createdAt || '',
    acceptedAt: item.accepted_at || item.acceptedAt || '',
    advisorName: batch?.advisorName || '',
    invitationMode: batch?.invitationMode || '',
  };
}

function normalizeEligibility(item) {
  return {
    id: item.id,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    advisorName: item.advisor_name || item.advisorName || '',
    status: item.status || item.eligibility_status || item.eligibilityStatus || '',
    createdAt: item.created_at || item.createdAt || item.queue_created_at || '',
  };
}

function normalizeCompanyRequest(item) {
  return {
    id: item.id,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    providerName: item.provider_name || item.providerName || '',
    approvalStatus: item.status || item.approvalStatus || '',
    submittedAt: item.submitted_at || item.submittedAt || '',
    assignedAdvisorName: item.assigned_advisor_name || item.assignedAdvisorName || '',
    approvalOwnerName: item.approval_owner_name || item.approvalOwnerName || '',
  };
}

function normalizeTrainingPlan(item) {
  return {
    id: item.id,
    internshipId: item.internship_id || item.internshipId,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    planTitle: item.plan_title || item.planTitle || '',
    approvalStatus: item.status || item.approvalStatus || '',
    submittedAt: item.submitted_at || item.submittedAt || '',
    providerName: item.provider_name || item.providerName || '',
    approvalOwnerName: item.approval_owner_name || item.approvalOwnerName || '',
  };
}

function normalizeWeeklyReport(item) {
  return {
    id: item.id,
    internshipId: item.internship_id || item.internshipId,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    title: item.report_title || item.title || '',
    weekNo: item.week_no || item.weekNo || '',
    approvalStatus: item.status || item.approvalStatus || '',
    generatedAt: item.generated_at || item.generatedAt || '',
    approvalOwnerName: item.approval_owner_name || item.approvalOwnerName || '',
    totalTasks: Number(item.total_tasks || item.totalTasks || 0),
    evidenceCount: Number(item.evidence_count || item.evidenceCount || 0),
  };
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase().replace(/[\s_-]/g, '');

  if (value === 'administrator' || value === 'admin') return 'Administrator';
  if (value === 'academicadvisor' || value === 'advisor') return 'AcademicAdvisor';
  if (value === 'student') return 'Student';

  return role || '';
}

function isApprovedStatus(value) {
  const status = String(value || '').toLowerCase();
  return [
    'approved',
    'accepted',
    'active',
    'completed',
    'reviewed',
    'generated',
    'submitted',
    'logged in',
    'مقبولة',
    'معتمد',
    'مكتملة',
  ].includes(status);
}

function isPendingStatus(value) {
  const status = String(value || '').toLowerCase();
  return [
    'pending',
    'under review',
    'in review',
    'scheduled',
    'planned',
    'draft',
    'running',
    'ready',
    'pending login',
    'waiting',
    'submitted',
    'معلقة',
    'تحت المراجعة',
    'جارية',
  ].includes(status);
}

function isRejectedStatus(value) {
  const status = String(value || '').toLowerCase();
  return ['rejected', 'failed', 'suspended', 'needs review', 'expired', 'مرفوضة', 'مرفوض'].includes(status);
}

function statusEquals(value, expected) {
  return String(value || '').toLowerCase() === String(expected || '').toLowerCase();
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function getPercentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 100);
}

function getMonthKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey, locale) {
  if (!monthKey) return '-';

  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
}

function formatDate(value, locale) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function getStatusClass(status) {
  if (isApprovedStatus(status)) return 'ims-dash-status-success';
  if (isPendingStatus(status)) return 'ims-dash-status-warning';
  if (isRejectedStatus(status)) return 'ims-dash-status-danger';
  return 'ims-dash-status-info';
}

function getCsvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(filename, rows, locale, isArabic) {
  const headers = isArabic
    ? ['النوع', 'العنوان الرئيسي', 'التفاصيل', 'الحالة', 'المسؤول/المشرف', 'المصدر/الشركة', 'التاريخ']
    : ['Type', 'Primary', 'Details', 'Status', 'Owner / Advisor', 'Source / Company', 'Date'];

  const lines = [
    headers.map(getCsvCell).join(','),
    ...rows.map((row) =>
      [
        row.typeLabel,
        row.primary,
        row.secondary,
        row.status,
        row.owner,
        row.source,
        formatDate(row.date, locale),
      ]
        .map(getCsvCell)
        .join(',')
    ),
  ];

  const csv = `\ufeff${lines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getInternshipRoute(userRole) {
  const normalizedRole = normalizeRole(userRole);

  if (normalizedRole === 'Administrator') {
    return (
      ROUTES?.ADMIN_MODULES?.INTERNSHIP ||
      ROUTES?.ADMINISTRATOR?.INTERNSHIP ||
      ROUTES?.ADMIN?.INTERNSHIP ||
      ROUTES?.INTERNSHIP?.ADMIN ||
      ROUTES?.INTERNSHIP?.ROOT ||
      '/administrator/internship'
    );
  }

  if (normalizedRole === 'AcademicAdvisor') {
    return (
      ROUTES?.ADVISOR_MODULES?.INTERNSHIP ||
      ROUTES?.ACADEMIC_ADVISOR?.INTERNSHIP ||
      ROUTES?.ADVISOR?.INTERNSHIP ||
      ROUTES?.INTERNSHIP?.ADVISOR ||
      ROUTES?.INTERNSHIP?.ROOT ||
      '/advisor/internship'
    );
  }

  if (normalizedRole === 'Student') {
    return (
      ROUTES?.STUDENT_MODULES?.INTERNSHIP ||
      ROUTES?.STUDENT?.INTERNSHIP ||
      ROUTES?.INTERNSHIP?.STUDENT ||
      ROUTES?.INTERNSHIP?.ROOT ||
      '/student/internship'
    );
  }

  return (
    ROUTES?.ADMIN_MODULES?.INTERNSHIP ||
    ROUTES?.ADVISOR_MODULES?.INTERNSHIP ||
    ROUTES?.STUDENT_MODULES?.INTERNSHIP ||
    ROUTES?.INTERNSHIP?.ROOT ||
    ROUTES?.INTERNSHIP?.TRAINING ||
    ROUTES?.ADMINISTRATOR?.INTERNSHIP ||
    ROUTES?.ADMIN?.INTERNSHIP ||
    ROUTES?.MODULES?.INTERNSHIP ||
    '/administrator/internship'
  );
}

function SvgIcon({ name, size = 22 }) {
  const icons = {
    students: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    pending: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
        <path d="M17 6h2v2" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    document: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>
    ),
    dots: (
      <>
        <circle cx="12" cy="5" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="12" cy="19" r="1.2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </>
    ),
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    open: (
      <>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </>
    ),
    mapping: (
      <>
        <path d="M6 7h.01" />
        <path d="M6 17h.01" />
        <path d="M18 7h.01" />
        <path d="M18 17h.01" />
        <path d="M8 7h8" />
        <path d="M8 17h8" />
        <path d="M12 9v6" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.chart}
    </svg>
  );
}

function KpiCard({ title, value, subtitle, icon, tone = 'teal', loading, onClick }) {
  return (
    <button type="button" className={`ims-dash-kpi-card ims-dash-kpi-${tone}`} onClick={onClick}>
      <div>
        <div className="ims-dash-kpi-title">{title}</div>
        <div className="ims-dash-kpi-value">{loading ? '...' : value}</div>
        <div className="ims-dash-kpi-subtitle">{subtitle}</div>
      </div>

      <div className="ims-dash-kpi-icon">
        <SvgIcon name={icon} size={28} />
      </div>
    </button>
  );
}

function StatusPill({ value }) {
  return <span className={`ims-dash-status ${getStatusClass(value)}`}>{value || '-'}</span>;
}

function FilterField({ type = 'text', value, onChange, placeholder, options = [] }) {
  if (type === 'select') {
    return (
      <select
        className={`ims-dash-filter ${value ? 'ims-dash-filter-active' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={`ims-dash-filter ${value ? 'ims-dash-filter-active' : ''}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function RowDetailsModal({ row, isArabic, locale, onClose }) {
  if (!row) return null;

  const details = [
    [isArabic ? 'النوع' : 'Type', row.typeLabel],
    [isArabic ? 'العنوان الرئيسي' : 'Primary', row.primary],
    [isArabic ? 'التفاصيل' : 'Details', row.secondary],
    [isArabic ? 'الحالة' : 'Status', row.status],
    [isArabic ? 'المسؤول/المشرف' : 'Owner / Advisor', row.owner],
    [isArabic ? 'المصدر/الشركة' : 'Source / Company', row.source],
    [isArabic ? 'التاريخ' : 'Date', formatDate(row.date, locale)],
  ];

  return (
    <>
      <div className="ims-dash-modal-backdrop" onClick={onClose} />
      <div className="ims-dash-modal-shell" role="dialog" aria-modal="true">
        <div className="ims-dash-modal-card">
          <div className="ims-dash-modal-header">
            <h3>{isArabic ? 'تفاصيل السجل' : 'Record Details'}</h3>
            <button type="button" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="ims-dash-modal-body">
            <div className="ims-dash-modal-grid">
              {details.map(([label, value]) => (
                <div key={label} className="ims-dash-detail-item">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DashboardTable({
  tabData,
  activeTab,
  onTabChange,
  locale,
  isArabic,
  loading,
  onNewInvite,
  onOpenModule,
}) {
  const pageSize = 5;

  const tabs = useMemo(
    () => [
      {
        key: 'assignments',
        label: isArabic ? 'ربط الطلاب بالمشرفين' : 'Advisor Mapping',
        icon: 'mapping',
      },
      {
        key: 'pendingEligibility',
        label: isArabic ? 'الأهلية المعلقة' : 'Pending Eligibility',
        icon: 'shield',
      },
      {
        key: 'invitations',
        label: isArabic ? 'الدعوات الجماعية' : 'Bulk Invitations',
        icon: 'mail',
      },
      {
        key: 'providers',
        label: isArabic ? 'اعتمادات الشركات' : 'Company Approvals',
        icon: 'shield',
      },
      {
        key: 'plans',
        label: isArabic ? 'خطط التدريب' : 'Training Plans',
        icon: 'calendar',
      },
      {
        key: 'reports',
        label: isArabic ? 'التقارير' : 'Reports',
        icon: 'document',
      },
    ],
    [isArabic]
  );

  const tabOnboardingTargets = {
    pendingEligibility: 'eligibility-tab',
    invitations: 'admin-invitations-tab',
    providers: 'company-approval-tab',
    plans: 'training-plan-tab',
    reports: 'weekly-reports-tab',
  };

  const columnLabels = useMemo(
    () => ({
      assignments: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'البريد الإلكتروني' : 'Email',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المشرف' : 'Advisor',
        source: isArabic ? 'كود الطالب' : 'Student Code',
        date: isArabic ? 'تاريخ الربط' : 'Assigned Date',
      },
      pendingEligibility: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'البريد الإلكتروني' : 'Email',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المشرف' : 'Advisor',
        source: isArabic ? 'مصدر الأهلية' : 'Eligibility Source',
        date: isArabic ? 'تاريخ الطلب' : 'Request Date',
      },
      invitations: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'البريد الإلكتروني' : 'Email',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المشرف' : 'Advisor',
        source: isArabic ? 'الدفعة/النوع' : 'Batch / Type',
        date: isArabic ? 'التاريخ' : 'Date',
      },
      providers: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'الشركة' : 'Company',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المشرف/المسؤول' : 'Advisor / Owner',
        source: isArabic ? 'جهة الاعتماد' : 'Approval Owner',
        date: isArabic ? 'تاريخ الطلب' : 'Request Date',
      },
      plans: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'عنوان الخطة' : 'Plan Title',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المعتمد/المسؤول' : 'Approver / Owner',
        source: isArabic ? 'الشركة' : 'Company',
        date: isArabic ? 'تاريخ الإرسال' : 'Submission Date',
      },
      reports: {
        primary: isArabic ? 'اسم الطالب' : 'Student Name',
        secondary: isArabic ? 'التقرير/الأسبوع' : 'Report / Week',
        status: isArabic ? 'الحالة' : 'Status',
        owner: isArabic ? 'المعتمد/المسؤول' : 'Approver / Owner',
        source: isArabic ? 'عدد المهام' : 'Tasks Count',
        date: isArabic ? 'تاريخ الإنشاء' : 'Generated Date',
      },
    }),
    [isArabic]
  );

  const [page, setPage] = useState(1);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState({
    primary: '',
    secondary: '',
    status: '',
    owner: '',
    source: '',
    date: '',
  });

  useEffect(() => {
    setPage(1);
    setOpenRowMenuId(null);
    setToolbarMenuOpen(false);
    setFilters({
      primary: '',
      secondary: '',
      status: '',
      owner: '',
      source: '',
      date: '',
    });
  }, [activeTab]);

  const rows = tabData[activeTab] || [];
  const labels = columnLabels[activeTab] || columnLabels.invitations;

  const statusOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.status).filter(Boolean))),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const lower = (value) => String(value || '').toLowerCase();

    return rows.filter((row) => {
      const dateLabel = formatDate(row.date, locale);

      return (
        lower(row.primary).includes(lower(filters.primary)) &&
        lower(row.secondary).includes(lower(filters.secondary)) &&
        (!filters.status || row.status === filters.status) &&
        lower(row.owner).includes(lower(filters.owner)) &&
        lower(row.source).includes(lower(filters.source)) &&
        lower(dateLabel).includes(lower(filters.date))
      );
    });
  }, [rows, filters, locale]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const paginationStart = Math.min(Math.max(1, safePage - 2), Math.max(1, totalPages - 4));
  const paginationPages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => paginationStart + index
  );

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({
      primary: '',
      secondary: '',
      status: '',
      owner: '',
      source: '',
      date: '',
    });
  };

  const changeTab = (nextTab) => {
    onTabChange(nextTab);
  };

  const handleExportCurrent = () => {
    const filename = isArabic
      ? `لوحة-التحكم-${activeTab}.csv`
      : `administrator-dashboard-${activeTab}.csv`;

    downloadCsv(filename, filteredRows, locale, isArabic);
    setToolbarMenuOpen(false);
  };

  const handleExportAll = () => {
    const allRows = Object.values(tabData).flat();
    const filename = isArabic
      ? 'لوحة-التحكم-كل-بيانات-التدريب.csv'
      : 'administrator-dashboard-all-training-data.csv';

    downloadCsv(filename, allRows, locale, isArabic);
    setToolbarMenuOpen(false);
  };

  const goToPage = (targetPage) => {
    const nextPage = Math.max(1, Math.min(totalPages, targetPage));
    setPage(nextPage);
  };

  const showRowDetails = (row) => {
    setSelectedRow(row);
    setOpenRowMenuId(null);
  };

  const openRowModule = (row) => {
    onOpenModule(row.type);
    setOpenRowMenuId(null);
  };

  return (
    <div className="ims-dash-table-card">
      <div className="ims-dash-table-toolbar">
        <div className="ims-dash-action-group">
          <button
            type="button"
            className="ims-dash-primary-btn"
            data-onboarding="admin-create-invitation"
            onClick={onNewInvite}
          >
            <SvgIcon name="plus" size={18} />
            {isArabic ? 'دعوة جديدة' : 'New Invite'}
          </button>

          <button
            type="button"
            className="ims-dash-secondary-btn"
            onClick={handleExportCurrent}
            disabled={!filteredRows.length}
          >
            <SvgIcon name="export" size={18} />
            {isArabic ? 'تصدير' : 'Export'}
          </button>

          <div className="ims-dash-toolbar-menu">
            <button
              type="button"
              className="ims-dash-icon-btn"
              aria-label="More"
              onClick={() => setToolbarMenuOpen((current) => !current)}
            >
              <SvgIcon name="dots" size={18} />
            </button>

            {toolbarMenuOpen ? (
              <div className="ims-dash-menu-popover">
                <button type="button" onClick={resetFilters}>
                  <SvgIcon name="reset" size={16} />
                  {isArabic ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                </button>
                <button type="button" onClick={handleExportAll} disabled={!Object.values(tabData).flat().length}>
                  <SvgIcon name="export" size={16} />
                  {isArabic ? 'تصدير كل البيانات' : 'Export All Data'}
                </button>
                <button type="button" onClick={() => onOpenModule(activeTab)}>
                  <SvgIcon name="open" size={16} />
                  {isArabic ? 'فتح صفحة التدريب' : 'Open Training Page'}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ims-dash-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              data-onboarding={tabOnboardingTargets[tab.key] || undefined}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => changeTab(tab.key)}
            >
              <SvgIcon name={tab.icon} size={18} />
              {tab.label}
              <span>{formatNumber((tabData[tab.key] || []).length, locale)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ims-dash-table-wrap">
        <table className="ims-dash-table">
          <thead>
            <tr>
              <th>
                <FilterField
                  value={filters.primary}
                  onChange={(value) => updateFilter('primary', value)}
                  placeholder={labels.primary}
                />
              </th>
              <th>
                <FilterField
                  value={filters.secondary}
                  onChange={(value) => updateFilter('secondary', value)}
                  placeholder={labels.secondary}
                />
              </th>
              <th>
                <FilterField
                  type="select"
                  value={filters.status}
                  onChange={(value) => updateFilter('status', value)}
                  placeholder={labels.status}
                  options={statusOptions}
                />
              </th>
              <th>
                <FilterField
                  value={filters.owner}
                  onChange={(value) => updateFilter('owner', value)}
                  placeholder={labels.owner}
                />
              </th>
              <th>
                <FilterField
                  value={filters.source}
                  onChange={(value) => updateFilter('source', value)}
                  placeholder={labels.source}
                />
              </th>
              <th>
                <FilterField
                  value={filters.date}
                  onChange={(value) => updateFilter('date', value)}
                  placeholder={labels.date}
                />
              </th>
              <th className="ims-dash-table-actions-head" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="ims-dash-loading">
                    <div className="spinner-border spinner-border-sm" role="status" />
                    <span>{isArabic ? 'جاري تحميل البيانات...' : 'Loading data...'}</span>
                  </div>
                </td>
              </tr>
            ) : visibleRows.length ? (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="ims-dash-person">
                      <div className="ims-dash-avatar">{row.primary?.slice(0, 1) || '-'}</div>
                      <span>{row.primary || '-'}</span>
                    </div>
                  </td>
                  <td dir={row.type === 'invitations' ? 'ltr' : undefined}>{row.secondary || '-'}</td>
                  <td>
                    <StatusPill value={row.status} />
                  </td>
                  <td>
                    <div className="ims-dash-person ims-dash-person-sm">
                      <div className="ims-dash-avatar ims-dash-avatar-sm">
                        {row.owner?.slice(0, 1) || '-'}
                      </div>
                      <span>{row.owner || '-'}</span>
                    </div>
                  </td>
                  <td>{row.source || '-'}</td>
                  <td>{formatDate(row.date, locale)}</td>
                  <td>
                    <div className="ims-dash-row-actions">
                      <button
                        type="button"
                        className="ims-dash-row-menu"
                        aria-label="More"
                        onClick={() =>
                          setOpenRowMenuId((current) => (current === row.id ? null : row.id))
                        }
                      >
                        <SvgIcon name="dots" size={17} />
                      </button>

                      {openRowMenuId === row.id ? (
                        <div className="ims-dash-row-popover">
                          <button type="button" onClick={() => showRowDetails(row)}>
                            <SvgIcon name="eye" size={15} />
                            {isArabic ? 'عرض التفاصيل' : 'View Details'}
                          </button>
                          <button type="button" onClick={() => openRowModule(row)}>
                            <SvgIcon name="open" size={15} />
                            {isArabic ? 'فتح في صفحة التدريب' : 'Open in Training Page'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="ims-dash-empty">
                    {isArabic ? 'لا توجد بيانات مطابقة في هذا التبويب.' : 'No matching data in this tab.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-dash-table-footer">
        <div>
          {isArabic
            ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length} سجل`
            : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length} records`}
        </div>

        <div className="ims-dash-pagination">
          <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>
            ‹
          </button>
          {paginationPages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === safePage ? 'active' : ''}
              onClick={() => goToPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>
            ›
          </button>
        </div>
      </div>

      <RowDetailsModal
        row={selectedRow}
        isArabic={isArabic}
        locale={locale}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}

function DonutChart({ data, isArabic }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;

  if (!total) {
    return <div className="ims-dash-empty small">{isArabic ? 'لا توجد بيانات.' : 'No data.'}</div>;
  }

  return (
    <div className="ims-dash-chart-content">
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Donut chart">
        <circle cx="75" cy="75" r="54" fill="none" stroke="#eef4f7" strokeWidth="24" />
        {data.map((item) => {
          const percent = item.value / total;
          const circumference = 2 * Math.PI * 54;
          const dash = percent * circumference;
          const circle = (
            <circle
              key={item.label}
              cx="75"
              cy="75"
              r="54"
              fill="none"
              stroke={item.color}
              strokeWidth="24"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform="rotate(-90 75 75)"
            />
          );

          offset += dash;
          return circle;
        })}
        <text x="75" y="80" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">
          {getPercentage(data[0]?.value || 0, total)}%
        </text>
      </svg>

      <div className="ims-dash-legend">
        {data.map((item) => (
          <div key={item.label}>
            <span style={{ background: item.color }} />
            <strong>{item.label}</strong>
            <em>{getPercentage(item.value, total)}% ({item.value})</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, emptyText }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value || 0)), 0);

  if (!data.length || !maxValue) {
    return <div className="ims-dash-empty small">{emptyText}</div>;
  }

  const width = 520;
  const height = 210;
  const left = 40;
  const right = 494;
  const top = 24;
  const bottom = 166;
  const chartHeight = bottom - top;
  const step = data.length > 1 ? (right - left) / (data.length - 1) : 0;

  const points = data.map((item, index) => ({
    ...item,
    x: left + index * step,
    y: bottom - (Number(item.value || 0) / maxValue) * chartHeight,
  }));

  const areaPoints = `${points.map((point) => `${point.x},${point.y}`).join(' ')} ${right},${bottom} ${left},${bottom}`;

  return (
    <div className="ims-dash-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#dce8f2" />
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="#dce8f2" />
        <polygon points={areaPoints} fill="rgba(20, 200, 195, 0.16)" />
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#14c8c3"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="5" fill="#14c8c3" stroke="#fff" strokeWidth="2" />
        ))}
        {points.map((point) => (
          <text key={`${point.label}-label`} x={point.x} y="195" textAnchor="middle" fontSize="11" fill="#7a8aa5">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function TopCompaniesChart({ data, emptyText }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value || 0)), 0);

  if (!data.length || !maxValue) {
    return <div className="ims-dash-empty small">{emptyText}</div>;
  }

  return (
    <div className="ims-dash-top-list">
      {data.map((item) => (
        <div key={item.label} className="ims-dash-top-row">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          <div>
            <em style={{ width: `${getPercentage(item.value, maxValue)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="ims-dash-chart-card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function WorkflowSidebarCard({ value, isArabic }) {
  const safeValue = clampPercentage(value);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="ims-dash-workflow-card">
      <h3>{isArabic ? 'سير العمل العام' : 'Overall Workflow'}</h3>

      <div className="ims-dash-workflow-body">
        <svg width="126" height="126" viewBox="0 0 126 126" role="img" aria-label={`${safeValue}%`}>
          <circle cx="63" cy="63" r={radius} fill="none" stroke="#e8f1f4" strokeWidth="15" />
          <circle
            cx="63"
            cy="63"
            r={radius}
            fill="none"
            stroke="#2ee6d3"
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 63 63)"
          />
          <text x="63" y="70" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10243f">
            {safeValue}%
          </text>
        </svg>

        <div className="ims-dash-workflow-legend">
          <div>
            <span className="success" />
            {isArabic ? 'مكتملة' : 'Completed'}
          </div>
          <div>
            <span className="info" />
            {isArabic ? 'جارية' : 'In Progress'}
          </div>
          <div>
            <span className="warning" />
            {isArabic ? 'معلقة' : 'Pending'}
          </div>
        </div>
      </div>

      <button type="button">{isArabic ? 'مؤشر من البيانات الحقيقية' : 'Live data indicator'}</button>
    </div>
  );
}

function AdministratorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const [activeDashboardTab, setActiveDashboardTab] = useState('invitations');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [users, setUsers] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [invitationBatches, setInvitationBatches] = useState([]);
  const [invitationRecipients, setInvitationRecipients] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);
  const [pendingEligibilityQueue, setPendingEligibilityQueue] = useState([]);
  const [providerApprovals, setProviderApprovals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);

  const locale = isArabic ? 'ar-SA' : 'en-GB';

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [
          usersData,
          advisorsData,
          batchesData,
          eligibilityData,
          pendingEligibilityData,
          providersData,
          plansData,
          reportsData,
        ] = await Promise.all([
          getUsersRequest({ q: '', role: 'All', status: 'All' }).catch(() => []),
          getAdvisorsRequest().catch(() => []),
          getInvitationBatchesRequest().catch(() => []),
          user?.id ? getEligibilityByOwnerRequest(user.id).catch(() => []) : Promise.resolve([]),
          getPendingEligibilityQueueRequest().catch(() => []),
          user?.id ? getTrainingCompanyRequestsByOwnerRequest(user.id).catch(() => []) : Promise.resolve([]),
          user?.id ? getTrainingPlansByOwnerRequest(user.id).catch(() => []) : Promise.resolve([]),
          user?.id ? getWeeklyReportsByOwnerRequest(user.id).catch(() => []) : Promise.resolve([]),
        ]);

        const normalizedUsers = (Array.isArray(usersData) ? usersData : []).map(normalizeUser);
        const normalizedAdvisors = (Array.isArray(advisorsData) ? advisorsData : []).map(normalizeAdvisor);
        const normalizedBatches = (Array.isArray(batchesData) ? batchesData : []).map(normalizeInvitationBatch);
        const normalizedEligibility = (Array.isArray(eligibilityData) ? eligibilityData : []).map(normalizeEligibility);
        const normalizedPendingQueue = Array.isArray(pendingEligibilityData) ? pendingEligibilityData : [];
        const normalizedProviders = (Array.isArray(providersData) ? providersData : []).map(normalizeCompanyRequest);
        const normalizedPlans = (Array.isArray(plansData) ? plansData : []).map(normalizeTrainingPlan);
        const normalizedReports = (Array.isArray(reportsData) ? reportsData : []).map(normalizeWeeklyReport);

        const recipientsResults = await Promise.all(
          normalizedBatches.map(async (batch) => {
            const rows = await getInvitationRecipientsRequest(batch.id).catch(() => []);
            return (Array.isArray(rows) ? rows : []).map((item) => normalizeInvitationRecipient(item, batch));
          })
        );

        const assignmentResults = await Promise.all(
          normalizedAdvisors.map(async (advisor) => {
            const students = await getAdvisorStudentsRequest(advisor.id).catch(() => []);
            return (Array.isArray(students) ? students : []).map((student) =>
              normalizeAdvisorStudent(student, advisor)
            );
          })
        );

        setUsers(normalizedUsers);
        setAdvisors(normalizedAdvisors);
        setAssignments(assignmentResults.flat());
        setInvitationBatches(normalizedBatches);
        setInvitationRecipients(recipientsResults.flat());
        setEligibilityRows(normalizedEligibility);
        setPendingEligibilityQueue(normalizedPendingQueue);
        setProviderApprovals(normalizedProviders);
        setPlans(normalizedPlans);
        setWeeklyReports(normalizedReports);
        setFeedback({ type: '', message: '' });
      } catch (error) {
        setFeedback({
          type: 'danger',
          message: error.message || 'Failed to load administrator dashboard data.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.id]);

  const tabData = useMemo(
    () => ({
      assignments: assignments
        .map((item) => ({
          ...item,
          typeLabel: isArabic ? 'ربط طالب بمشرف' : 'Advisor Mapping',
        }))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),

      pendingEligibility: [
        ...pendingEligibilityQueue.map((item) => ({
          id: `pending-${item.invitation_recipient_id || item.id || item.student_email}`,
          type: 'pendingEligibility',
          typeLabel: isArabic ? 'أهلية معلقة' : 'Pending Eligibility',
          primary: item.student_name || '',
          secondary: item.student_email || '',
          status: item.eligibility_status || item.invitation_status || '',
          owner: item.advisor_name || '',
          source: item.account_created ? (isArabic ? 'تم إنشاء الحساب' : 'Account Created') : (isArabic ? 'بانتظار إنشاء الحساب' : 'Waiting Account'),
          date: item.queue_created_at || item.created_at || '',
        })),
        ...eligibilityRows.map((item) => ({
          id: `eligibility-${item.id}`,
          type: 'pendingEligibility',
          typeLabel: isArabic ? 'مراجعة أهلية' : 'Eligibility Review',
          primary: item.studentName,
          secondary: item.studentEmail,
          status: item.status,
          owner: item.advisorName,
          source: isArabic ? 'مراجعة الأهلية' : 'Eligibility Review',
          date: item.createdAt,
        })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),

      invitations: invitationRecipients
        .map((item) => ({
          id: `invite-${item.id}`,
          type: 'invitations',
          typeLabel: isArabic ? 'دعوة جماعية' : 'Bulk Invitation',
          primary: item.studentName,
          secondary: item.studentEmail,
          status: item.invitationStatus,
          owner: item.advisorName,
          source: item.invitationMode || `Batch #${item.batchId || '-'}`,
          date: item.acceptedAt || item.sentAt,
        }))
        .filter((item) => item.primary || item.secondary || item.source)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),

      providers: providerApprovals
        .map((item) => ({
          id: `company-${item.id}`,
          type: 'providers',
          typeLabel: isArabic ? 'اعتماد شركة' : 'Company Approval',
          primary: item.studentName,
          secondary: item.providerName,
          status: item.approvalStatus,
          owner: item.assignedAdvisorName || item.approvalOwnerName,
          source: item.approvalOwnerName || item.assignedAdvisorName,
          date: item.submittedAt,
        }))
        .filter((item) => item.primary || item.secondary || item.source)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),

      plans: plans
        .map((item) => ({
          id: `plan-${item.id}`,
          type: 'plans',
          typeLabel: isArabic ? 'خطة تدريب' : 'Training Plan',
          primary: item.studentName,
          secondary: item.planTitle,
          status: item.approvalStatus,
          owner: item.approvalOwnerName,
          source: item.providerName,
          date: item.submittedAt,
        }))
        .filter((item) => item.primary || item.secondary || item.source)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),

      reports: weeklyReports
        .map((item) => ({
          id: `report-${item.id}`,
          type: 'reports',
          typeLabel: isArabic ? 'تقرير أسبوعي' : 'Weekly Report',
          primary: item.studentName,
          secondary: item.title || `${isArabic ? 'الأسبوع' : 'Week'} ${item.weekNo || '-'}`,
          status: item.approvalStatus,
          owner: item.approvalOwnerName,
          source: String(item.totalTasks || 0),
          date: item.generatedAt,
        }))
        .filter((item) => item.primary || item.secondary || item.source)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    }),
    [assignments, pendingEligibilityQueue, eligibilityRows, invitationRecipients, providerApprovals, plans, weeklyReports, isArabic]
  );

  const allRows = useMemo(() => Object.values(tabData).flat(), [tabData]);

  const dashboardMetrics = useMemo(() => {
    const totalUsers = users.length;
    const totalStudents = users.filter((item) => item.role === 'Student').length;
    const activeStudents = users.filter(
      (item) => item.role === 'Student' && statusEquals(item.status, 'Active')
    ).length;

    const acceptedInvitations = invitationRecipients.filter((item) =>
      isApprovedStatus(item.invitationStatus)
    ).length;

    const pendingInvitations = invitationRecipients.filter((item) =>
      isPendingStatus(item.invitationStatus)
    ).length;

    const pendingEligibilityCount =
      pendingEligibilityQueue.length > 0
        ? pendingEligibilityQueue.length
        : eligibilityRows.filter((item) => isPendingStatus(item.status)).length;

    const approvedEligibilityCount = eligibilityRows.filter((item) => isApprovedStatus(item.status)).length;
    const rejectedEligibilityCount = eligibilityRows.filter((item) => isRejectedStatus(item.status)).length;

    const pendingProviderApprovals = providerApprovals.filter((item) => isPendingStatus(item.approvalStatus)).length;
    const approvedProviderApprovals = providerApprovals.filter((item) => isApprovedStatus(item.approvalStatus)).length;
    const rejectedProviderApprovals = providerApprovals.filter((item) => isRejectedStatus(item.approvalStatus)).length;

    const pendingPlans = plans.filter((item) => isPendingStatus(item.approvalStatus)).length;
    const approvedPlans = plans.filter((item) => isApprovedStatus(item.approvalStatus)).length;
    const rejectedPlans = plans.filter((item) => isRejectedStatus(item.approvalStatus)).length;

    const pendingReports = weeklyReports.filter((item) => isPendingStatus(item.approvalStatus)).length;
    const approvedReports = weeklyReports.filter((item) => isApprovedStatus(item.approvalStatus)).length;
    const rejectedReports = weeklyReports.filter((item) => isRejectedStatus(item.approvalStatus)).length;

    const workflowTotal =
      invitationRecipients.length +
      eligibilityRows.length +
      pendingEligibilityQueue.length +
      providerApprovals.length +
      plans.length +
      weeklyReports.length;

    const workflowCompleted =
      acceptedInvitations +
      approvedEligibilityCount +
      approvedProviderApprovals +
      approvedPlans +
      approvedReports;

    const workflowPending =
      pendingInvitations +
      pendingEligibilityCount +
      pendingProviderApprovals +
      pendingPlans +
      pendingReports;

    const workflowRejected =
      rejectedEligibilityCount +
      rejectedProviderApprovals +
      rejectedPlans +
      rejectedReports;

    return {
      totalUsers,
      totalStudents,
      activeStudents,
      assignmentsCount: assignments.length,
      acceptedInvitations,
      pendingInvitations,
      pendingEligibilityCount,
      approvedEligibilityCount,
      rejectedEligibilityCount,
      pendingProviderApprovals,
      approvedProviderApprovals,
      rejectedProviderApprovals,
      pendingPlans,
      approvedPlans,
      rejectedPlans,
      pendingReports,
      approvedReports,
      rejectedReports,
      workflowTotal,
      workflowCompleted,
      workflowPending,
      workflowRejected,
      workflowPercentage: getPercentage(workflowCompleted, workflowTotal),
    };
  }, [users, assignments, invitationRecipients, pendingEligibilityQueue, eligibilityRows, providerApprovals, plans, weeklyReports]);

  const monthlyTrendData = useMemo(() => {
    const counts = allRows.reduce((acc, item) => {
      const key = getMonthKey(item.date);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => ({
        label: getMonthLabel(key, locale),
        value,
      }));
  }, [allRows, locale]);

  const statusDistribution = useMemo(
    () => [
      {
        label: isArabic ? 'مكتملة' : 'Completed',
        value: dashboardMetrics.workflowCompleted,
        color: '#27d4a4',
      },
      {
        label: isArabic ? 'جارية/معلقة' : 'Pending / In Progress',
        value: dashboardMetrics.workflowPending,
        color: '#3b82f6',
      },
      {
        label: isArabic ? 'مرفوضة' : 'Rejected',
        value: dashboardMetrics.workflowRejected,
        color: '#f4a62a',
      },
    ],
    [dashboardMetrics, isArabic]
  );

  const topCompaniesData = useMemo(() => {
    const counts = [...providerApprovals, ...plans].reduce((acc, item) => {
      const providerName = item.providerName || '';
      if (!providerName) return acc;

      acc[providerName] = (acc[providerName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [providerApprovals, plans]);

  const handleOpenModule = (type) => {
    const tabMap = {
      assignments: 'assignments',
      pendingEligibility: 'pendingEligibility',
      invitations: 'invitations',
      providers: 'providers',
      companies: 'providers',
      plans: 'plans',
      reports: 'reports',
    };

    navigate(getInternshipRoute(user?.role), {
      state: {
        activeTab: tabMap[type] || type,
        dashboardSource: 'administratorDashboard',
      },
    });
  };

  const handleNewInvite = () => {
    navigate(getInternshipRoute(user?.role), {
      state: {
        activeTab: 'invitations',
        openInviteModal: true,
        dashboardSource: 'administratorDashboard',
      },
    });
  };

  const pendingTotal =
    dashboardMetrics.pendingInvitations +
    dashboardMetrics.pendingEligibilityCount +
    dashboardMetrics.pendingProviderApprovals +
    dashboardMetrics.pendingPlans +
    dashboardMetrics.pendingReports;

  const kpis = [
    {
      title: isArabic ? 'إجمالي الطلاب' : 'Total Students',
      value: formatNumber(dashboardMetrics.totalStudents, locale),
      subtitle: isArabic
        ? `النشطون: ${formatNumber(dashboardMetrics.activeStudents, locale)}`
        : `Active: ${formatNumber(dashboardMetrics.activeStudents, locale)}`,
      icon: 'students',
      tone: 'purple',
      tab: 'assignments',
    },
    {
      title: isArabic ? 'طلبات معلقة' : 'Pending Requests',
      value: formatNumber(pendingTotal, locale),
      subtitle: isArabic ? 'من كل مسارات التدريب' : 'Across all training flows',
      icon: 'pending',
      tone: 'orange',
      tab: 'pendingEligibility',
    },
    {
      title: isArabic ? 'خطط التدريب' : 'Training Plans',
      value: formatNumber(plans.length, locale),
      subtitle: isArabic
        ? `المعتمدة: ${formatNumber(dashboardMetrics.approvedPlans, locale)}`
        : `Approved: ${formatNumber(dashboardMetrics.approvedPlans, locale)}`,
      icon: 'calendar',
      tone: 'cyan',
      tab: 'plans',
    },
    {
      title: isArabic ? 'التقارير الأسبوعية' : 'Weekly Reports',
      value: formatNumber(weeklyReports.length, locale),
      subtitle: isArabic
        ? `المعتمدة: ${formatNumber(dashboardMetrics.approvedReports, locale)}`
        : `Approved: ${formatNumber(dashboardMetrics.approvedReports, locale)}`,
      icon: 'chart',
      tone: 'green',
      tab: 'reports',
    },
  ];

  return (
    <div className="ims-admin-visual-dashboard">
      <style>{dashboardStyles}</style>

      <div className="ims-dash-top">
        <div className="ims-dash-main-title">
          <h1>
            {isArabic ? 'إدارة التدريب' : 'Training Management'}
            <span className="ims-dash-dot" />
          </h1>
          <p>
            {isArabic
              ? 'لوحة مرتبطة بموديول التدريب: الدعوات، الأهلية، اعتمادات الشركات، خطط التدريب، والتقارير.'
              : 'Dashboard connected to the internship module: invitations, eligibility, company approvals, plans, and reports.'}
          </p>
        </div>

        <div className="ims-dash-side-slot">
          <WorkflowSidebarCard value={dashboardMetrics.workflowPercentage} isArabic={isArabic} />
        </div>
      </div>

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="ims-dash-kpi-grid" data-onboarding="admin-dashboard-kpis">
        {kpis.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            icon={item.icon}
            tone={item.tone}
            loading={loading}
            onClick={() => setActiveDashboardTab(item.tab)}
          />
        ))}
      </div>

      <DashboardTable
        tabData={tabData}
        activeTab={activeDashboardTab}
        onTabChange={setActiveDashboardTab}
        locale={locale}
        isArabic={isArabic}
        loading={loading}
        onNewInvite={handleNewInvite}
        onOpenModule={handleOpenModule}
      />

      <div className="ims-dash-bottom-grid">
        <ChartPanel title={isArabic ? 'توزيع حالات الطلبات' : 'Request Status Distribution'}>
          <DonutChart data={statusDistribution} isArabic={isArabic} />
        </ChartPanel>

        <ChartPanel title={isArabic ? 'حركة التدريب خلال آخر 6 أشهر' : 'Training Activity - Last 6 Months'}>
          <LineChart
            data={monthlyTrendData}
            emptyText={isArabic ? 'لا توجد بيانات شهرية كافية.' : 'No monthly data available.'}
          />
        </ChartPanel>

        <ChartPanel title={isArabic ? 'أعلى الشركات مشاركة' : 'Top Participating Companies'}>
          <TopCompaniesChart
            data={topCompaniesData}
            emptyText={isArabic ? 'لا توجد بيانات شركات كافية.' : 'No company data available.'}
          />
        </ChartPanel>
      </div>
    </div>
  );
}

const dashboardStyles = `
  .ims-admin-visual-dashboard {
    position: relative;
    min-height: 100%;
    padding: 0.25rem 0 1.5rem;
    color: #10243f;
  }

  .ims-admin-visual-dashboard::before {
    content: "";
    position: absolute;
    inset: -1.5rem -1.5rem auto -1.5rem;
    height: 255px;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 20%, rgba(20, 200, 195, 0.16), transparent 34%),
      repeating-radial-gradient(ellipse at 50% 20%, rgba(20, 200, 195, 0.10) 0 1px, transparent 1px 28px);
    opacity: 0.8;
    border-radius: 0 0 42px 42px;
    z-index: 0;
  }

  .ims-admin-visual-dashboard > * {
    position: relative;
    z-index: 1;
  }

  .ims-dash-top {
    display: grid;
    grid-template-columns: 1fr minmax(240px, 290px);
    gap: 1rem;
    align-items: stretch;
  }

  .ims-dash-main-title {
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: start;
  }

  .ims-dash-main-title h1 {
    margin: 0 0 0.45rem;
    font-size: clamp(2rem, 3vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.055em;
    color: #10243f;
  }

  .ims-dash-main-title p {
    margin: 0;
    color: #637894;
    font-size: 1.02rem;
    font-weight: 650;
    line-height: 1.8;
  }

  .ims-dash-main-title .ims-dash-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-inline-start: 0.45rem;
    border-radius: 999px;
    background: #14c8c3;
    box-shadow: 0 0 0 6px rgba(20, 200, 195, 0.12);
  }

  .ims-dash-side-slot {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ims-dash-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .ims-dash-kpi-card {
    width: 100%;
    min-height: 126px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    text-align: start;
    padding: 1.25rem 1.35rem;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(230, 238, 246, 0.96);
    border-radius: 25px;
    box-shadow: 0 12px 30px rgba(16, 36, 63, 0.07);
    backdrop-filter: blur(10px);
  }

  .ims-dash-kpi-card:hover {
    transform: translateY(-1px);
    border-color: rgba(20, 200, 195, 0.32);
    box-shadow: 0 18px 44px rgba(16, 36, 63, 0.10);
  }

  .ims-dash-kpi-title {
    margin-bottom: 0.38rem;
    color: #5e718d;
    font-size: 0.92rem;
    font-weight: 850;
  }

  .ims-dash-kpi-value {
    margin-bottom: 0.35rem;
    color: #10243f;
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .ims-dash-kpi-subtitle {
    color: #7a8aa5;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .ims-dash-kpi-icon {
    width: 64px;
    height: 64px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    flex-shrink: 0;
  }

  .ims-dash-kpi-purple .ims-dash-kpi-icon {
    color: #5b65f1;
    background: #eef0ff;
  }

  .ims-dash-kpi-orange .ims-dash-kpi-icon {
    color: #ed9f22;
    background: #fff4dc;
  }

  .ims-dash-kpi-cyan .ims-dash-kpi-icon {
    color: #0796a6;
    background: #e2fafa;
  }

  .ims-dash-kpi-green .ims-dash-kpi-icon {
    color: #18bd87;
    background: #e7fbf3;
  }

  .ims-dash-workflow-card {
    position: relative;
    overflow: hidden;
    width: 100%;
    min-height: 230px;
    padding: 1.2rem;
    border-radius: 26px;
    color: #10243f;
    background:
      radial-gradient(circle at 88% 12%, rgba(46, 230, 211, 0.20), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #f7fcff 100%);
    border: 1px solid rgba(214, 228, 238, 0.96);
    box-shadow: 0 18px 46px rgba(16, 36, 63, 0.12);
  }

  .ims-dash-workflow-card::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 6px;
    background: linear-gradient(90deg, #0796a6, #14c8c3, #2ee6d3);
  }

  .ims-dash-workflow-card h3 {
    margin: 0 0 1rem;
    color: #10243f;
    font-size: 1rem;
    font-weight: 900;
  }

  .ims-dash-workflow-body {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .ims-dash-workflow-body svg {
    flex-shrink: 0;
    filter: drop-shadow(0 10px 20px rgba(7, 150, 166, 0.12));
  }

  .ims-dash-workflow-legend {
    display: grid;
    gap: 0.55rem;
    color: #243b5a;
    font-size: 0.86rem;
    font-weight: 850;
  }

  .ims-dash-workflow-legend div {
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.55rem;
    border: 1px solid #edf3f8;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.86);
  }

  .ims-dash-workflow-legend span {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    box-shadow: 0 0 0 4px rgba(16, 36, 63, 0.04);
  }

  .ims-dash-workflow-legend .success { background: #2ee6d3; }
  .ims-dash-workflow-legend .info { background: #3b82f6; }
  .ims-dash-workflow-legend .warning { background: #f4a62a; }

  .ims-dash-workflow-card button {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 46px;
    margin-top: 1rem;
    border: 1px solid rgba(20, 200, 195, 0.28);
    border-radius: 17px;
    color: #0796a6;
    font-weight: 900;
    background: linear-gradient(135deg, #e2fafa, #f5ffff);
  }

  .ims-dash-workflow-card button:hover {
    color: #ffffff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    box-shadow: 0 12px 28px rgba(7, 150, 166, 0.18);
  }

  .ims-dash-table-card {
    overflow: visible;
    margin-top: 1rem;
    background: rgba(255,255,255,0.95);
    border: 1px solid rgba(230, 238, 246, 0.98);
    border-radius: 28px;
    box-shadow: 0 18px 45px rgba(16, 36, 63, 0.08);
    backdrop-filter: blur(10px);
  }

  .ims-dash-table-toolbar {
    min-height: 72px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem 0.65rem;
    border-bottom: 1px solid #edf3f8;
  }

  .ims-dash-action-group {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .ims-dash-primary-btn,
  .ims-dash-secondary-btn,
  .ims-dash-icon-btn {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border-radius: 15px;
    font-size: 0.88rem;
    font-weight: 850;
    border: 1px solid #dfeaf3;
    background: #fff;
    color: #243b5a;
  }

  .ims-dash-primary-btn {
    min-width: 132px;
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-color: transparent;
    box-shadow: 0 12px 26px rgba(7,150,166,0.22);
  }

  .ims-dash-secondary-btn {
    min-width: 112px;
  }

  .ims-dash-icon-btn {
    width: 46px;
  }

  .ims-dash-toolbar-menu,
  .ims-dash-row-actions {
    position: relative;
  }

  .ims-dash-menu-popover,
  .ims-dash-row-popover {
    position: absolute;
    top: calc(100% + 0.45rem);
    inset-inline-start: 0;
    min-width: 190px;
    padding: 0.4rem;
    border: 1px solid #dfeaf3;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 18px 44px rgba(16, 36, 63, 0.14);
    z-index: 80;
  }

  .ims-dash-row-popover {
    inset-inline-start: auto;
    inset-inline-end: 0;
  }

  .ims-dash-menu-popover button,
  .ims-dash-row-popover button {
    width: 100%;
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #243b5a;
    font-size: 0.82rem;
    font-weight: 800;
    text-align: start;
  }

  .ims-dash-menu-popover button:hover,
  .ims-dash-row-popover button:hover {
    background: #f4fbfc;
    color: #0796a6;
  }

  .ims-dash-menu-popover button:disabled,
  .ims-dash-row-popover button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ims-dash-tabs {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .ims-dash-tabs button {
    position: relative;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0 0.45rem;
    border: none;
    color: #7a8aa5;
    background: transparent;
    font-weight: 850;
  }

  .ims-dash-tabs button span {
    min-width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: #eef4f7;
    color: #6f819b;
    font-size: 0.74rem;
    font-weight: 900;
  }

  .ims-dash-tabs button.active {
    color: #0796a6;
  }

  .ims-dash-tabs button.active span {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
  }

  .ims-dash-tabs button.active::after {
    content: "";
    position: absolute;
    inset-inline: 0;
    bottom: -0.72rem;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, #0796a6, #14c8c3);
  }

  .ims-dash-table-wrap {
    overflow: auto;
  }

  .ims-dash-table {
    width: 100%;
    min-width: 1020px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .ims-dash-table thead th {
    padding: 0.85rem 0.75rem;
    background: #fff;
    border-bottom: 1px solid #edf3f8;
  }

  .ims-dash-table tbody td {
    padding: 0.82rem 0.9rem;
    border-bottom: 1px solid #edf3f8;
    color: #243b5a;
    font-size: 0.88rem;
    font-weight: 700;
    vertical-align: middle;
  }

  .ims-dash-table tbody tr:hover {
    background: #f9fcff;
  }

  .ims-dash-filter {
    width: 100%;
    min-height: 42px;
    border: 1px solid #dfeaf3;
    border-radius: 14px;
    padding: 0.55rem 0.72rem;
    color: #243b5a;
    background: #fbfdff;
    font-size: 0.82rem;
    font-weight: 750;
    outline: none;
  }

  .ims-dash-filter::placeholder {
    color: #8fa0b6;
    font-weight: 800;
  }

  .ims-dash-filter:focus,
  .ims-dash-filter-active {
    border-color: rgba(20, 200, 195, 0.72);
    box-shadow: 0 0 0 0.18rem rgba(20, 200, 195, 0.11);
    background: #fff;
  }

  .ims-dash-table-actions-head {
    width: 58px;
  }

  .ims-dash-person {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    white-space: nowrap;
  }

  .ims-dash-person-sm {
    gap: 0.45rem;
  }

  .ims-dash-avatar {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 900;
    background: linear-gradient(135deg, #0c96a9, #14c8c3);
    box-shadow: 0 8px 18px rgba(7, 150, 166, 0.18);
    flex-shrink: 0;
  }

  .ims-dash-avatar-sm {
    width: 28px;
    height: 28px;
    font-size: 0.72rem;
    background: linear-gradient(135deg, #4564f4, #14c8c3);
  }

  .ims-dash-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.38rem;
    min-height: 30px;
    padding: 0.35rem 0.72rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 900;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .ims-dash-status::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }

  .ims-dash-status-success {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,0.22);
  }

  .ims-dash-status-warning {
    color: #a4660b;
    background: #fff4dc;
    border-color: rgba(244,166,42,0.24);
  }

  .ims-dash-status-danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255,90,107,0.24);
  }

  .ims-dash-status-info {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,0.2);
  }

  .ims-dash-row-menu {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #dfeaf3;
    border-radius: 12px;
    color: #7a8aa5;
    background: #fff;
  }

  .ims-dash-table-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem;
    color: #6f819b;
    font-size: 0.88rem;
    font-weight: 750;
    background: #fff;
    border-radius: 0 0 28px 28px;
  }

  .ims-dash-pagination {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ims-dash-pagination button {
    width: 34px;
    height: 34px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: #243b5a;
    font-weight: 850;
  }

  .ims-dash-pagination button.active {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    box-shadow: 0 10px 20px rgba(7,150,166,0.18);
  }

  .ims-dash-primary-btn:disabled,
  .ims-dash-secondary-btn:disabled,
  .ims-dash-pagination button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .ims-dash-loading,
  .ims-dash-empty {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: #7a8aa5;
    font-weight: 750;
  }

  .ims-dash-empty.small {
    min-height: 140px;
    font-size: 0.9rem;
  }

  .ims-dash-bottom-grid {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .ims-dash-chart-card {
    min-height: 245px;
    padding: 1.15rem;
    border-radius: 26px;
    background: rgba(255,255,255,0.95);
    border: 1px solid rgba(230, 238, 246, 0.98);
    box-shadow: 0 14px 36px rgba(16,36,63,0.07);
    overflow: hidden;
  }

  .ims-dash-chart-card h3 {
    margin: 0 0 1rem;
    color: #243b5a;
    font-size: 1rem;
    font-weight: 900;
  }

  .ims-dash-chart-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .ims-dash-legend {
    display: grid;
    gap: 0.75rem;
    flex: 1;
  }

  .ims-dash-legend div {
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 0.55rem;
    color: #243b5a;
    font-size: 0.84rem;
  }

  .ims-dash-legend span {
    width: 10px;
    height: 10px;
    border-radius: 999px;
  }

  .ims-dash-legend strong {
    font-weight: 850;
  }

  .ims-dash-legend em {
    color: #7a8aa5;
    font-style: normal;
    font-weight: 750;
    white-space: nowrap;
  }

  .ims-dash-line-chart svg {
    width: 100%;
    min-width: 420px;
  }

  .ims-dash-top-list {
    display: grid;
    gap: 1.15rem;
    padding-top: 0.4rem;
  }

  .ims-dash-top-row {
    display: grid;
    grid-template-columns: 42px 1fr 1.6fr;
    gap: 0.8rem;
    align-items: center;
  }

  .ims-dash-top-row strong {
    color: #10243f;
    font-weight: 900;
  }

  .ims-dash-top-row span {
    color: #243b5a;
    font-size: 0.88rem;
    font-weight: 750;
  }

  .ims-dash-top-row div {
    height: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: #e8f1f4;
  }

  .ims-dash-top-row em {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #0796a6, #14c8c3);
  }

  .ims-dash-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1040;
    background: rgba(7, 31, 53, 0.52);
    backdrop-filter: blur(5px);
  }

  .ims-dash-modal-shell {
    position: fixed;
    inset: 0;
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .ims-dash-modal-card {
    width: min(720px, 100%);
    overflow: hidden;
    border: 1px solid #dfeaf3;
    border-radius: 26px;
    background: #fff;
    box-shadow: 0 30px 90px rgba(7, 31, 53, 0.24);
  }

  .ims-dash-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.2rem;
    border-bottom: 1px solid #edf3f8;
  }

  .ims-dash-modal-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 900;
    color: #10243f;
  }

  .ims-dash-modal-header button {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 12px;
    background: #f4f7fb;
    color: #243b5a;
    font-size: 1.35rem;
    line-height: 1;
  }

  .ims-dash-modal-body {
    padding: 1.2rem;
  }

  .ims-dash-modal-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .ims-dash-detail-item {
    padding: 0.9rem 1rem;
    border: 1px solid #edf3f8;
    border-radius: 18px;
    background: #fbfdff;
  }

  .ims-dash-detail-item span {
    display: block;
    margin-bottom: 0.35rem;
    color: #7a8aa5;
    font-size: 0.78rem;
    font-weight: 850;
  }

  .ims-dash-detail-item strong {
    display: block;
    color: #243b5a;
    font-size: 0.92rem;
    font-weight: 850;
    word-break: break-word;
  }

  @media (max-width: 1199.98px) {
    .ims-dash-top {
      grid-template-columns: 1fr;
    }

    .ims-dash-side-slot {
      display: flex;
      justify-content: flex-start;
    }

    .ims-dash-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ims-dash-bottom-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 767.98px) {
    .ims-dash-kpi-grid {
      grid-template-columns: 1fr;
    }

    .ims-dash-table-toolbar,
    .ims-dash-table-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .ims-dash-tabs {
      justify-content: flex-start;
    }

    .ims-dash-chart-content {
      align-items: flex-start;
      flex-direction: column;
    }

    .ims-dash-modal-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default AdministratorDashboardPage;