import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  approveEligibilityRequest,
  assignStudentAdvisorRequest,
  createEligibilityRequest,
  createInvitationBatchRequest,
  createUserRequest,
  deleteUserRequest,
  getAdvisorStudentsRequest,
  getAdvisorsRequest,
  getEligibilityByOwnerRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getUsersRequest,
  rejectEligibilityRequest,
  updateUserRequest,
  createFinalEvaluationRequestRequest,
  getStudentInternshipContextRequest,
} from '../../../app/api/client';

const roleOptions = [
  { label: 'Student', value: 'Student' },
  { label: 'AcademicAdvisor', value: 'AcademicAdvisor' },
  { label: 'Administrator', value: 'Administrator' },
];

const statusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

const mainTabs = [
  { key: 'identity', labelAr: 'المستخدمون والصلاحيات', labelEn: 'Users & Access', icon: 'users' },
  { key: 'advisorManagement', labelAr: 'إدارة المشرفين', labelEn: 'Advisor Management', icon: 'advisor' },
  { key: 'invitationsEligibility', labelAr: 'الدعوات والأهلية', labelEn: 'Invitations & Eligibility', icon: 'mail' },
];

const invitationTabs = [
  { key: 'batches', labelAr: 'دفعات الدعوات', labelEn: 'Invitation Batches' },
  { key: 'recipients', labelAr: 'المستلمون', labelEn: 'Recipients' },
  { key: 'eligibility', labelAr: 'مراجعات الأهلية', labelEn: 'Eligibility Reviews' },
];

function normalizeUser(user) {
  return {
    id: user.id ?? user.user_id ?? user.userId,
    fullName: user.full_name || user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    username: user.username || '',
    role: user.role || '',
    status: user.status || '',
  };
}

function normalizeAdvisor(advisor) {
  return {
    userId: advisor.user_id ?? advisor.userId ?? advisor.id,
    fullName: advisor.full_name || advisor.fullName || '',
    email: advisor.email || '',
    employeeNo: advisor.employee_no || advisor.employeeNo || '',
    department: advisor.department || '',
    isSystemResponsible: advisor.is_system_responsible ? 'Yes' : 'No',
    studentsCount: advisor.students_count || advisor.studentsCount || 0,
  };
}

function normalizeAdvisorStudent(student) {
  return {
    studentUserId: student.student_user_id || student.id || null,
    fullName: student.full_name || student.fullName || '',
    email: student.email || '',
    studentCode: student.student_code || student.studentCode || '',
    university: student.university || '',
    major: student.major || '',
    gpa: student.gpa ?? '',
    assignmentStartAt: student.assignment_start_at || student.assignmentStartAt || '',
    notes: student.notes || '',
  };
}

function normalizeInvitationBatch(item) {
  return {
    id: item.id,
    invitationMode: item.invitation_mode || item.invitationMode || '',
    advisorUserId: item.advisor_user_id || item.advisorUserId,
    advisorName: item.advisor_name || item.advisorName || '',
    excelFileName: item.excel_file_name || item.excelFileName || '',
    sharedLinkUrl: item.shared_link_url || item.sharedLinkUrl || '',
    totalRecipients: item.total_recipients || item.totalRecipients || 0,
    sentAt: item.sent_at || item.sentAt || '',
    createdAt: item.created_at || item.createdAt || '',
  };
}

function normalizeInvitationRecipient(item) {
  return {
    id: item.id,
    batchId: item.batch_id || item.batchId,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    studentUserId: item.student_user_id || item.studentUserId || null,
    invitationStatus: item.invitation_status || item.invitationStatus || '',
    sentAt: item.sent_at || item.sentAt || '',
    acceptedAt: item.accepted_at || item.acceptedAt || '',
  };
}

function normalizeEligibility(item) {
  return {
    id: item.id,
    studentUserId: item.student_user_id || item.studentUserId,
    studentName: item.student_name || item.studentName || '',
    studentEmail: item.student_email || item.studentEmail || '',
    approvalOwnerUserId: item.approval_owner_user_id || item.approvalOwnerUserId,
    approvalOwnerRole: item.approval_owner_role || item.approvalOwnerRole || '',
    status: item.status || '',
    comment: item.comment || '',
    createdAt: item.created_at || item.createdAt || '',
    advisorName: item.advisor_name || item.advisorName || '',
  };
}

function formatDateTime(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase();

  if (['active', 'approved', 'accepted', 'sent', 'completed', 'yes'].includes(value)) {
    return 'success';
  }

  if (['pending', 'inactive', 'waiting', 'under review', 'draft'].includes(value)) {
    return 'warning';
  }

  if (['rejected', 'suspended', 'failed', 'expired', 'no'].includes(value)) {
    return 'danger';
  }

  return 'info';
}

function getRoleTone(role) {
  const value = String(role || '').toLowerCase();

  if (value === 'administrator') return 'purple';
  if (value === 'academicadvisor') return 'blue';
  if (value === 'companyadvisor') return 'green';
  return 'teal';
}

function getStatusLabel(status, isArabic) {
  const value = String(status || '').toLowerCase();

  const labels = {
    active: isArabic ? 'نشط' : 'Active',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    pending: isArabic ? 'معلق' : 'Pending',
    approved: isArabic ? 'معتمد' : 'Approved',
    rejected: isArabic ? 'مرفوض' : 'Rejected',
    accepted: isArabic ? 'مقبول' : 'Accepted',
    sent: isArabic ? 'مرسل' : 'Sent',
    suspended: isArabic ? 'موقوف' : 'Suspended',
    completed: isArabic ? 'مكتمل' : 'Completed',
    expired: isArabic ? 'منتهي' : 'Expired',
  };

  return labels[value] || status || '-';
}

function getCsvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(filename, rows, columns) {
  const exportColumns = columns.filter((column) => !column.isAction);
  const lines = [
    exportColumns.map((column) => getCsvCell(column.label)).join(','),
    ...rows.map((row) =>
      exportColumns
        .map((column) => {
          const value = column.exportValue
            ? column.exportValue(row)
            : column.render
              ? column.render(row[column.key], row, true)
              : row[column.key];

          return getCsvCell(typeof value === 'object' ? '' : value);
        })
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

function SvgIcon({ name, size = 22 }) {
  const icons = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    advisor: (
      <>
        <path d="m2 8 10-5 10 5-10 5Z" />
        <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
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
    key: (
      <>
        <circle cx="7.5" cy="14.5" r="4" />
        <path d="m10.5 11.5 8-8" />
        <path d="m15 4 5 5" />
        <path d="m17 6-2 2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
      </>
    ),
    x: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9 9 15" />
        <path d="m9 9 6 6" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
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
      {icons[name] || icons.users}
    </svg>
  );
}

function OverlayModal({ isOpen, title, subtitle, children, onClose, size = 'lg' }) {
  if (!isOpen) return null;

  const modal = (
    <>
      <div className="ims-iam-modal-backdrop" onClick={onClose} />
      <div className="ims-iam-modal-shell" role="dialog" aria-modal="true">
        <div className={`ims-iam-modal-card ims-iam-modal-${size}`}>
          <div className="ims-iam-modal-header">
            <div>
              <h3>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <SvgIcon name="close" size={18} />
            </button>
          </div>
          <div className="ims-iam-modal-body">{children}</div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}

function ConfirmModal({ state, onCancel, onConfirm, isArabic }) {
  return (
    <OverlayModal
      isOpen={state.isOpen}
      title={state.title || (isArabic ? 'تأكيد الإجراء' : 'Confirm Action')}
      subtitle={isArabic ? 'يرجى تأكيد الإجراء قبل المتابعة.' : 'Please confirm before continuing.'}
      onClose={onCancel}
      size="sm"
    >
      <div className="ims-iam-confirm-box">
        {state.message || (isArabic ? 'هل تريد المتابعة؟' : 'Do you want to continue?')}
      </div>
      <div className="ims-iam-modal-actions">
        <button type="button" className="ims-iam-secondary-btn" onClick={onCancel}>
          {isArabic ? 'إلغاء' : 'Cancel'}
        </button>
        <button
          type="button"
          className={state.variant === 'primary' ? 'ims-iam-primary-btn' : 'ims-iam-danger-btn'}
          onClick={onConfirm}
        >
          {state.confirmLabel || (isArabic ? 'تأكيد' : 'Confirm')}
        </button>
      </div>
    </OverlayModal>
  );
}

function FeedbackAlert({ feedback, onClose, isArabic }) {
  if (!feedback.message) return null;

  return (
    <div className={`ims-iam-feedback ims-iam-feedback-${feedback.type || 'info'}`}>
      <div>
        <strong>
          {feedback.type === 'success'
            ? isArabic
              ? 'تم بنجاح'
              : 'Success'
            : feedback.type === 'danger'
              ? isArabic
                ? 'حدث خطأ'
                : 'Error'
              : isArabic
                ? 'تنبيه'
                : 'Notice'}
        </strong>
        <span>{feedback.message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'}>
        <SvgIcon name="close" size={16} />
      </button>
    </div>
  );
}

function StatusPill({ value, isArabic }) {
  return (
    <span className={`ims-iam-status ims-iam-status-${getStatusTone(value)}`}>
      {getStatusLabel(value, isArabic)}
    </span>
  );
}

function RolePill({ value }) {
  return <span className={`ims-iam-role ims-iam-role-${getRoleTone(value)}`}>{value || '-'}</span>;
}

function KpiCard({ title, value, subtitle, icon, tone = 'teal', onClick }) {
  return (
    <button type="button" className={`ims-iam-kpi-card ims-iam-kpi-${tone}`} onClick={onClick}>
      <div className="ims-iam-kpi-icon">
        <SvgIcon name={icon} size={26} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <em>{subtitle}</em>
      </div>
    </button>
  );
}

function FilterField({ value, placeholder, onChange }) {
  return (
    <div className="ims-iam-table-filter">
      <SvgIcon name="search" size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DataTable({ columns, rows, rowKey = 'id', emptyMessage, exportName, isArabic }) {
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const filteredRows = useMemo(() => {
    const searchableColumns = columns.filter((column) => !column.isAction);

    return rows.filter((row) =>
      searchableColumns.every((column) => {
        const filterValue = String(filters[column.key] || '').toLowerCase();
        if (!filterValue) return true;

        const raw = column.filterValue
          ? column.filterValue(row)
          : column.render
            ? column.render(row[column.key], row, true)
            : row[column.key];

        return String(raw || '').toLowerCase().includes(filterValue);
      })
    );
  }, [columns, rows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="ims-iam-table-card">
      <div className="ims-iam-table-top">
        <div>
          <strong>
            {isArabic
              ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length}`
              : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length}`}
          </strong>
          <span>{isArabic ? 'ابحث أو فلتر من رؤوس الأعمدة مباشرة.' : 'Search and filter directly from column headers.'}</span>
        </div>

        <button
          type="button"
          className="ims-iam-secondary-btn"
          disabled={!filteredRows.length}
          onClick={() => downloadCsv(exportName || 'identity-access.csv', filteredRows, columns)}
        >
          <SvgIcon name="export" size={17} />
          {isArabic ? 'تصدير' : 'Export'}
        </button>
      </div>

      <div className="ims-iam-table-wrap">
        <table className="ims-iam-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.isAction ? null : (
                    <FilterField
                      value={filters[column.key] || ''}
                      onChange={(value) => updateFilter(column.key, value)}
                      placeholder={column.label}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr key={row[rowKey] ?? `${rowKey}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row[column.key], row, false) : row[column.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="ims-iam-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-iam-pagination">
        <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          ‹
        </button>
        <span>{safePage} / {totalPages}</span>
        <button type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
          ›
        </button>
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="ims-iam-detail-box">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function IdentityAccessModulePage() {
  const { user: currentUser, logout } = useAuth();
  const { isArabic } = useLanguage();
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const [users, setUsers] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [advisorStudents, setAdvisorStudents] = useState([]);

  const [invitationBatches, setInvitationBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchRecipients, setBatchRecipients] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);

  const [mainTab, setMainTab] = useState(
    currentUser?.role === 'AcademicAdvisor' ? 'advisorManagement' : 'identity'
  );
  const [invitationTab, setInvitationTab] = useState('batches');

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);
  const [loadingAdvisorStudents, setLoadingAdvisorStudents] = useState(false);
  const [loadingInvitationBatches, setLoadingInvitationBatches] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [loadingStudentFile, setLoadingStudentFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: null,
  });

  const [userModalState, setUserModalState] = useState({ isOpen: false, record: null });
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [invitationBatchModalOpen, setInvitationBatchModalOpen] = useState(false);
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);

  const [isStudentFileOpen, setIsStudentFileOpen] = useState(false);
  const [selectedStudentRecord, setSelectedStudentRecord] = useState(null);
  const [studentInternshipContext, setStudentInternshipContext] = useState(null);

  const [isFinalEvaluationModalOpen, setIsFinalEvaluationModalOpen] = useState(false);
  const [finalEvaluationForm, setFinalEvaluationForm] = useState({
    internshipId: '',
    studentUserId: '',
    providerName: '',
    providerEmail: '',
    sendingTemplateName: 'Company Evaluation Request Email',
    evaluationTemplateName: 'Standard Company Internship Evaluation',
  });

  const [selectedRecipientForEligibility, setSelectedRecipientForEligibility] = useState(null);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    username: '',
    phone: '',
    role: 'Student',
    status: 'Active',
    studentCode: '',
    university: '',
    major: '',
    advisorUserId: '',
    employeeNo: '',
    department: '',
    isSystemResponsible: 'false',
  });

  const [invitationForm, setInvitationForm] = useState({
    invitationMode: 'Excel',
    advisorUserId: '',
    excelFileName: '',
    sharedLinkUrl: '',
    invitationMessage:
      'You have been invited to access the internship training platform. Please log in and complete your profile.',
    recipientsText: '',
  });

  const [eligibilityForm, setEligibilityForm] = useState({
    studentUserId: '',
    approvalOwnerUserId: '',
    approvalOwnerRole: 'AcademicAdvisor',
  });

  const resetCreateForm = () => {
    setCreateForm({
      fullName: '',
      email: '',
      password: '',
      username: '',
      phone: '',
      role: 'Student',
      status: 'Active',
      studentCode: '',
      university: '',
      major: '',
      advisorUserId: '',
      employeeNo: '',
      department: '',
      isSystemResponsible: 'false',
    });
  };

  const resetInvitationForm = () => {
    setInvitationForm({
      invitationMode: 'Excel',
      advisorUserId: '',
      excelFileName: '',
      sharedLinkUrl: '',
      invitationMessage:
        'You have been invited to access the internship training platform. Please log in and complete your profile.',
      recipientsText: '',
    });
  };

  const resetEligibilityForm = () => {
    setEligibilityForm({
      studentUserId: '',
      approvalOwnerUserId: '',
      approvalOwnerRole: 'AcademicAdvisor',
    });
  };

  const handleSessionError = async (error) => {
    const message = error?.message || 'Request failed.';
    setFeedback({ type: 'danger', message });

    if (String(message).toLowerCase().includes('session')) {
      await logout();
    }
  };

  const loadUsers = async ({ q = '', role = 'All', status = 'All' } = {}) => {
    setLoadingUsers(true);

    try {
      const data = await getUsersRequest({ q, role, status });
      const normalized = Array.isArray(data) ? data.map(normalizeUser) : [];
      setUsers(normalized);
      setFeedback({ type: '', message: '' });
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await getUsersRequest({ role: 'Student', status: 'Active' });
      const normalized = Array.isArray(data) ? data.map(normalizeUser) : [];
      setStudents(normalized);
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    }
  };

  const loadAdvisors = async () => {
    setLoadingAdvisors(true);

    try {
      const data = await getAdvisorsRequest();
      const normalized = Array.isArray(data) ? data.map(normalizeAdvisor) : [];

      const visibleAdvisors =
        currentUser?.role === 'AcademicAdvisor'
          ? normalized.filter(
              (item) =>
                Number(item.userId) === Number(currentUser?.id) ||
                String(item.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase()
            )
          : normalized;

      setAdvisors(visibleAdvisors);

      setSelectedAdvisor((current) => {
        if (current && visibleAdvisors.some((item) => item.userId === current.userId)) {
          return visibleAdvisors.find((item) => item.userId === current.userId) || current;
        }

        if (currentUser?.role === 'AcademicAdvisor') {
          return (
            visibleAdvisors.find(
              (item) =>
                Number(item.userId) === Number(currentUser?.id) ||
                String(item.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase()
            ) || null
          );
        }

        return visibleAdvisors[0] || null;
      });

      return visibleAdvisors;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingAdvisors(false);
    }
  };

  const loadAdvisorStudents = async (advisorUserId) => {
    if (!advisorUserId) {
      setAdvisorStudents([]);
      return [];
    }

    setLoadingAdvisorStudents(true);

    try {
      const data = await getAdvisorStudentsRequest(advisorUserId);
      const normalized = Array.isArray(data) ? data.map(normalizeAdvisorStudent) : [];
      setAdvisorStudents(normalized);
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingAdvisorStudents(false);
    }
  };

  const loadInvitationBatches = async () => {
    setLoadingInvitationBatches(true);

    try {
      const data = await getInvitationBatchesRequest();
      const normalized = Array.isArray(data) ? data.map(normalizeInvitationBatch) : [];
      setInvitationBatches(normalized);
      setSelectedBatch((current) => {
        if (current && normalized.some((item) => item.id === current.id)) {
          return normalized.find((item) => item.id === current.id) || current;
        }

        return normalized[0] || null;
      });
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingInvitationBatches(false);
    }
  };

  const loadRecipients = async (batchId) => {
    if (!batchId) {
      setBatchRecipients([]);
      return [];
    }

    setLoadingRecipients(true);

    try {
      const data = await getInvitationRecipientsRequest(batchId);
      const normalized = Array.isArray(data) ? data.map(normalizeInvitationRecipient) : [];
      setBatchRecipients(normalized);
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadEligibilityRows = async (ownerUserId) => {
    if (!ownerUserId) {
      setEligibilityRows([]);
      return [];
    }

    setLoadingEligibility(true);

    try {
      const data = await getEligibilityByOwnerRequest(ownerUserId);
      const normalized = Array.isArray(data) ? data.map(normalizeEligibility) : [];
      setEligibilityRows(normalized);
      return normalized;
    } catch (error) {
      await handleSessionError(error);
      return [];
    } finally {
      setLoadingEligibility(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadUsers({ q: '', role: 'All', status: 'All' }),
      loadStudents(),
      loadAdvisors(),
      loadInvitationBatches(),
      currentUser?.id ? loadEligibilityRows(currentUser.id) : Promise.resolve([]),
    ]);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBatch?.id && invitationTab === 'recipients') {
      loadRecipients(selectedBatch.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch?.id, invitationTab]);

  useEffect(() => {
    if (mainTab === 'advisorManagement' && selectedAdvisor?.userId) {
      loadAdvisorStudents(selectedAdvisor.userId);
    } else if (!selectedAdvisor?.userId) {
      setAdvisorStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, selectedAdvisor?.userId]);

  const showSuccess = (message) => setFeedback({ type: 'success', message });
  const showError = (message) => setFeedback({ type: 'danger', message });
  const clearFeedback = () => setFeedback({ type: '', message: '' });

  const openConfirm = ({ title, message, confirmLabel, variant = 'danger', onConfirm }) => {
    setConfirmState({ isOpen: true, title, message, confirmLabel, variant, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmState({
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: '',
      variant: 'danger',
      onConfirm: null,
    });
  };

  const handleConfirmAction = async () => {
    const action = confirmState.onConfirm;
    closeConfirm();

    if (typeof action === 'function') {
      await action();
    }
  };

  const openCreateUserModal = () => {
    resetCreateForm();
    setUserModalState({ isOpen: true, record: null });
  };

  const openEditUserModal = (record) => {
    setCreateForm({
      fullName: record.fullName || '',
      email: record.email || '',
      password: '',
      username: record.username || '',
      phone: record.phone || '',
      role: record.role || 'Student',
      status: record.status || 'Active',
      studentCode: '',
      university: '',
      major: '',
      advisorUserId: '',
      employeeNo: '',
      department: '',
      isSystemResponsible: 'false',
    });
    setUserModalState({ isOpen: true, record });
  };

  const closeUserModal = () => {
    setUserModalState({ isOpen: false, record: null });
    resetCreateForm();
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (userModalState.record) {
        await updateUserRequest(userModalState.record.id, {
          full_name: createForm.fullName,
          email: createForm.email,
          username: createForm.username || null,
          phone: createForm.phone || null,
          status: createForm.status,
        });

        showSuccess(isArabic ? 'تم تحديث المستخدم بنجاح.' : 'User updated successfully.');
      } else {
        await createUserRequest({
          full_name: createForm.fullName,
          email: createForm.email,
          password: createForm.password,
          username: createForm.username || null,
          phone: createForm.phone || null,
          role_code: createForm.role,
          status: createForm.status,
          created_by_user_id: currentUser?.id || null,
          student_code: createForm.role === 'Student' ? createForm.studentCode : null,
          university: createForm.role === 'Student' ? createForm.university : null,
          major: createForm.role === 'Student' ? createForm.major : null,
          advisor_user_id:
            createForm.role === 'Student' && createForm.advisorUserId
              ? Number(createForm.advisorUserId)
              : null,
          employee_no: createForm.role !== 'Student' ? createForm.employeeNo || null : null,
          department: createForm.role !== 'Student' ? createForm.department || null : null,
          is_system_responsible:
            createForm.role === 'AcademicAdvisor'
              ? String(createForm.isSystemResponsible) === 'true'
              : false,
        });

        showSuccess(isArabic ? 'تم إنشاء المستخدم بنجاح.' : 'User created successfully.');
      }

      closeUserModal();
      await Promise.all([loadUsers({ q: '', role: 'All', status: 'All' }), loadStudents(), loadAdvisors()]);
    } catch (error) {
      showError(error.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (record) => {
    openConfirm({
      title: isArabic ? 'حذف المستخدم' : 'Delete User',
      message: isArabic
        ? `هل تريد حذف المستخدم ${record.fullName}؟`
        : `Are you sure you want to delete ${record.fullName}?`,
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteUserRequest(record.id);
          showSuccess(isArabic ? 'تم حذف المستخدم بنجاح.' : 'User deleted successfully.');
          await Promise.all([loadUsers({ q: '', role: 'All', status: 'All' }), loadStudents(), loadAdvisors()]);
        } catch (error) {
          showError(error.message || 'Failed to delete user.');
        }
      },
    });
  };

  const handleAssignStudent = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const advisorId = Number(createForm.advisorUserId);

      await assignStudentAdvisorRequest({
        student_user_id: Number(createForm.studentCode),
        advisor_user_id: advisorId,
        assigned_by_user_id: currentUser?.id || null,
        notes: createForm.major || null,
      });

      showSuccess(isArabic ? 'تم ربط الطالب بالمشرف بنجاح.' : 'Student assigned successfully.');
      setAssignmentModalOpen(false);
      setMainTab('advisorManagement');

      const refreshedAdvisors = await loadAdvisors();
      const advisor = refreshedAdvisors.find((item) => Number(item.userId) === advisorId) || null;
      setSelectedAdvisor(advisor);
      await loadAdvisorStudents(advisorId);
    } catch (error) {
      showError(error.message || 'Failed to assign student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewAdvisorDetails = async (advisor) => {
    setSelectedAdvisor(advisor);
    setMainTab('advisorManagement');
    await loadAdvisorStudents(advisor.userId);
  };

  const parseRecipientsText = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [student_name, student_email] = line.split(',').map((item) => item?.trim() || '');
        return { student_name, student_email };
      })
      .filter((item) => item.student_name);
  };

  const handleCreateInvitationBatch = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const recipients = parseRecipientsText(invitationForm.recipientsText);

      await createInvitationBatchRequest({
        invitation_mode: invitationForm.invitationMode,
        advisor_user_id: Number(invitationForm.advisorUserId),
        created_by_user_id: currentUser?.id || null,
        excel_file_name:
          invitationForm.invitationMode === 'Excel' ? invitationForm.excelFileName || null : null,
        shared_link_url:
          invitationForm.invitationMode === 'Link' ? invitationForm.sharedLinkUrl || null : null,
        invitation_message: invitationForm.invitationMessage,
        recipients,
      });

      setInvitationBatchModalOpen(false);
      resetInvitationForm();
      showSuccess(isArabic ? 'تم إنشاء دفعة الدعوات بنجاح.' : 'Invitation batch created successfully.');
      await loadInvitationBatches();
    } catch (error) {
      showError(error.message || 'Failed to create invitation batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRecipients = async (batch) => {
    setSelectedBatch(batch);
    setInvitationTab('recipients');
    await loadRecipients(batch.id);
  };

  const openEligibilityModal = (recipient) => {
    setSelectedRecipientForEligibility(recipient);

    const matchedStudent = students.find((student) =>
      recipient.studentUserId
        ? Number(student.id) === Number(recipient.studentUserId)
        : student.email?.toLowerCase() === recipient.studentEmail?.toLowerCase()
    );

    setEligibilityForm({
      studentUserId: matchedStudent ? String(matchedStudent.id) : '',
      approvalOwnerUserId: selectedBatch?.advisorUserId ? String(selectedBatch.advisorUserId) : '',
      approvalOwnerRole: 'AcademicAdvisor',
    });

    setEligibilityModalOpen(true);
  };

  const handleCreateEligibility = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await createEligibilityRequest({
        student_user_id: Number(eligibilityForm.studentUserId),
        invitation_recipient_id: selectedRecipientForEligibility?.id || null,
        advisor_assignment_id: null,
        approval_owner_user_id: Number(eligibilityForm.approvalOwnerUserId),
        approval_owner_role: eligibilityForm.approvalOwnerRole,
      });

      setEligibilityModalOpen(false);
      resetEligibilityForm();
      setSelectedRecipientForEligibility(null);
      showSuccess(isArabic ? 'تم إنشاء مراجعة الأهلية بنجاح.' : 'Eligibility review created successfully.');

      if (eligibilityForm.approvalOwnerUserId) {
        await loadEligibilityRows(Number(eligibilityForm.approvalOwnerUserId));
      }

      setInvitationTab('eligibility');
    } catch (error) {
      showError(error.message || 'Failed to create eligibility review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveEligibility = (row) => {
    openConfirm({
      title: isArabic ? 'اعتماد الأهلية' : 'Approve Eligibility',
      message: isArabic ? `اعتماد أهلية ${row.studentName}؟` : `Approve eligibility for ${row.studentName}?`,
      confirmLabel: isArabic ? 'اعتماد' : 'Approve',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await approveEligibilityRequest(row.id, {
            actor_user_id: currentUser?.id || null,
            comment: row.comment || '',
          });

          showSuccess(isArabic ? 'تم اعتماد الأهلية بنجاح.' : 'Eligibility approved successfully.');
          await loadEligibilityRows(row.approvalOwnerUserId);
        } catch (error) {
          showError(error.message || 'Failed to approve eligibility.');
        }
      },
    });
  };

  const handleRejectEligibility = (row) => {
    openConfirm({
      title: isArabic ? 'رفض الأهلية' : 'Reject Eligibility',
      message: isArabic ? `رفض أهلية ${row.studentName}؟` : `Reject eligibility for ${row.studentName}?`,
      confirmLabel: isArabic ? 'رفض' : 'Reject',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await rejectEligibilityRequest(row.id, {
            actor_user_id: currentUser?.id || null,
            comment: row.comment || '',
          });

          showSuccess(isArabic ? 'تم رفض الأهلية بنجاح.' : 'Eligibility rejected successfully.');
          await loadEligibilityRows(row.approvalOwnerUserId);
        } catch (error) {
          showError(error.message || 'Failed to reject eligibility.');
        }
      },
    });
  };

  const openStudentFile = async (studentRecord) => {
    setSelectedStudentRecord(studentRecord);
    setStudentInternshipContext(null);
    setIsStudentFileOpen(true);
    setLoadingStudentFile(true);

    try {
      const context = await getStudentInternshipContextRequest(studentRecord.studentUserId);
      setStudentInternshipContext(context || null);
    } catch (error) {
      setStudentInternshipContext(null);
      showError(error.message || 'Failed to load student internship context.');
    } finally {
      setLoadingStudentFile(false);
    }
  };

  const closeStudentFile = () => {
    setIsStudentFileOpen(false);
    setSelectedStudentRecord(null);
    setStudentInternshipContext(null);
  };

  const openFinalEvaluationFromStudentFile = async (studentRecord) => {
    setSubmitting(true);

    try {
      const context =
        studentInternshipContext &&
        Number(studentInternshipContext.student_user_id) === Number(studentRecord.studentUserId)
          ? studentInternshipContext
          : await getStudentInternshipContextRequest(studentRecord.studentUserId);

      if (!context?.internship_id) {
        throw new Error('This student does not have an internship context yet.');
      }

      setStudentInternshipContext(context);

      setFinalEvaluationForm({
        internshipId: String(context?.internship_id || ''),
        studentUserId: String(studentRecord.studentUserId),
        providerName: context?.provider_name || '',
        providerEmail: context?.provider_email || '',
        sendingTemplateName: 'Company Evaluation Request Email',
        evaluationTemplateName: 'Standard Company Internship Evaluation',
      });

      setIsFinalEvaluationModalOpen(true);
    } catch (error) {
      showError(error.message || 'Failed to load student internship context.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinalEvaluationFromStudentFile = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await createFinalEvaluationRequestRequest({
        internship_id: Number(finalEvaluationForm.internshipId),
        student_user_id: Number(finalEvaluationForm.studentUserId),
        provider_name: finalEvaluationForm.providerName,
        provider_email: finalEvaluationForm.providerEmail,
        sending_template_name: finalEvaluationForm.sendingTemplateName,
        evaluation_template_name: finalEvaluationForm.evaluationTemplateName,
        requested_by_user_id: currentUser?.id,
      });

      setIsFinalEvaluationModalOpen(false);
      showSuccess(isArabic ? 'تم إرسال طلب التقييم النهائي بنجاح.' : 'Final evaluation request sent successfully.');
    } catch (error) {
      showError(error.message || 'Failed to send final evaluation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalStudents = users.filter((item) => item.role === 'Student').length;
    const totalAcademicAdvisors = users.filter((item) => item.role === 'AcademicAdvisor').length;
    const totalAdmins = users.filter((item) => item.role === 'Administrator').length;
    const activeUsers = users.filter((item) => item.status === 'Active').length;

    return {
      totalUsers,
      totalStudents,
      totalAcademicAdvisors,
      totalAdmins,
      activeUsers,
      advisorsCount: advisors.length,
      assignedStudentsCount: advisorStudents.length,
      invitationBatchesCount: invitationBatches.length,
      recipientsCount: batchRecipients.length,
      eligibilityCount: eligibilityRows.length,
    };
  }, [advisorStudents.length, advisors.length, batchRecipients.length, eligibilityRows.length, invitationBatches.length, users]);

  const assignmentStudentOptions = students
    .filter((item) => item.role === 'Student')
    .map((item) => ({ label: `${item.fullName} (${item.email})`, value: String(item.id) }));

  const advisorOptions = advisors.map((item) => ({
    label: `${item.fullName} (${item.email})`,
    value: String(item.userId),
  }));

  const userColumns = [
    {
      key: 'fullName',
      label: isArabic ? 'المستخدم' : 'User',
      render: (value, row) => (
        <div className="ims-iam-person">
          <div className={`ims-iam-avatar ims-iam-avatar-${getRoleTone(row.role)}`}>{String(value || '-').slice(0, 1)}</div>
          <div>
            <strong>{value || '-'}</strong>
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
      filterValue: (row) => `${row.fullName} ${row.email}`,
      exportValue: (row) => row.fullName,
    },
    { key: 'username', label: isArabic ? 'اسم المستخدم' : 'Username' },
    { key: 'phone', label: isArabic ? 'الجوال' : 'Phone' },
    {
      key: 'role',
      label: isArabic ? 'الدور' : 'Role',
      render: (value) => <RolePill value={value} />,
      filterValue: (row) => row.role,
      exportValue: (row) => row.role,
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      filterValue: (row) => getStatusLabel(row.status, isArabic),
      exportValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-iam-row-actions">
          <button type="button" className="ims-iam-row-btn" onClick={() => openEditUserModal(row)}>
            <SvgIcon name="edit" size={15} />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="ims-iam-row-btn danger" onClick={() => handleDeleteUser(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const advisorColumns = [
    {
      key: 'fullName',
      label: isArabic ? 'المشرف' : 'Advisor',
      render: (value, row) => (
        <div className="ims-iam-person">
          <div className="ims-iam-avatar ims-iam-avatar-blue">{String(value || '-').slice(0, 1)}</div>
          <div>
            <strong>{value || '-'}</strong>
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
      filterValue: (row) => `${row.fullName} ${row.email}`,
      exportValue: (row) => row.fullName,
    },
    { key: 'employeeNo', label: isArabic ? 'الرقم الوظيفي' : 'Employee No' },
    { key: 'department', label: isArabic ? 'القسم' : 'Department' },
    {
      key: 'isSystemResponsible',
      label: isArabic ? 'مسؤول النظام' : 'System Responsible',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      filterValue: (row) => row.isSystemResponsible,
      exportValue: (row) => row.isSystemResponsible,
    },
    { key: 'studentsCount', label: isArabic ? 'عدد الطلاب' : 'Students Count' },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button
          type="button"
          className={`ims-iam-row-btn ${selectedAdvisor?.userId === row.userId ? 'primary' : ''}`}
          onClick={() => handleViewAdvisorDetails(row)}
        >
          <SvgIcon name="eye" size={15} />
          {isArabic ? 'عرض الطلاب' : 'View'}
        </button>
      ),
    },
  ];

  const advisorStudentColumns = [
    {
      key: 'fullName',
      label: isArabic ? 'الطالب' : 'Student',
      render: (value, row) => (
        <div className="ims-iam-person">
          <div className="ims-iam-avatar ims-iam-avatar-teal">{String(value || '-').slice(0, 1)}</div>
          <div>
            <strong>{value || '-'}</strong>
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
      filterValue: (row) => `${row.fullName} ${row.email}`,
      exportValue: (row) => row.fullName,
    },
    { key: 'studentCode', label: isArabic ? 'الرقم الجامعي' : 'Student Code' },
    { key: 'university', label: isArabic ? 'الجامعة' : 'University' },
    { key: 'major', label: isArabic ? 'التخصص' : 'Major' },
    { key: 'gpa', label: 'GPA' },
    {
      key: 'assignmentStartAt',
      label: isArabic ? 'تاريخ الربط' : 'Assigned At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.assignmentStartAt, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button
          type="button"
          className="ims-iam-row-btn"
          data-onboarding="advisor-student-file"
          onClick={() => openStudentFile(row)}
        >
          <SvgIcon name="file" size={15} />
          {isArabic ? 'ملف الطالب' : 'Student File'}
        </button>
      ),
    },
  ];

  const invitationBatchColumns = [
    { key: 'id', label: isArabic ? 'رقم الدفعة' : 'Batch ID' },
    {
      key: 'invitationMode',
      label: isArabic ? 'النوع' : 'Mode',
      render: (value) => <RolePill value={value} />,
      exportValue: (row) => row.invitationMode,
    },
    { key: 'advisorName', label: isArabic ? 'المشرف' : 'Advisor' },
    { key: 'excelFileName', label: isArabic ? 'ملف Excel' : 'Excel File' },
    { key: 'sharedLinkUrl', label: isArabic ? 'الرابط' : 'Shared Link' },
    { key: 'totalRecipients', label: isArabic ? 'المستلمون' : 'Recipients' },
    {
      key: 'createdAt',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.createdAt, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button type="button" className="ims-iam-row-btn" onClick={() => handleViewRecipients(row)}>
          <SvgIcon name="eye" size={15} />
          {isArabic ? 'المستلمون' : 'Recipients'}
        </button>
      ),
    },
  ];

  const recipientColumns = [
    { key: 'studentName', label: isArabic ? 'اسم الطالب' : 'Student Name' },
    { key: 'studentEmail', label: isArabic ? 'البريد' : 'Email' },
    { key: 'studentUserId', label: isArabic ? 'معرف المستخدم' : 'Linked User ID' },
    {
      key: 'invitationStatus',
      label: isArabic ? 'حالة الدعوة' : 'Invitation Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      filterValue: (row) => getStatusLabel(row.invitationStatus, isArabic),
      exportValue: (row) => getStatusLabel(row.invitationStatus, isArabic),
    },
    {
      key: 'sentAt',
      label: isArabic ? 'تاريخ الإرسال' : 'Sent At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.sentAt, locale),
    },
    {
      key: 'acceptedAt',
      label: isArabic ? 'تاريخ القبول' : 'Accepted At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.acceptedAt, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button type="button" className="ims-iam-row-btn primary" onClick={() => openEligibilityModal(row)}>
          <SvgIcon name="check" size={15} />
          {isArabic ? 'إنشاء أهلية' : 'Create Eligibility'}
        </button>
      ),
    },
  ];

  const eligibilityColumns = [
    { key: 'studentName', label: isArabic ? 'الطالب' : 'Student Name' },
    { key: 'studentEmail', label: isArabic ? 'البريد' : 'Email' },
    { key: 'advisorName', label: isArabic ? 'المشرف' : 'Advisor' },
    { key: 'approvalOwnerRole', label: isArabic ? 'دور المالك' : 'Owner Role' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      filterValue: (row) => getStatusLabel(row.status, isArabic),
      exportValue: (row) => getStatusLabel(row.status, isArabic),
    },
    { key: 'comment', label: isArabic ? 'التعليق' : 'Comment' },
    {
      key: 'createdAt',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.createdAt, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-iam-row-actions">
          <button type="button" className="ims-iam-row-btn primary" onClick={() => handleApproveEligibility(row)}>
            <SvgIcon name="check" size={15} />
            {isArabic ? 'اعتماد' : 'Approve'}
          </button>
          <button type="button" className="ims-iam-row-btn danger" onClick={() => handleRejectEligibility(row)}>
            <SvgIcon name="x" size={15} />
            {isArabic ? 'رفض' : 'Reject'}
          </button>
        </div>
      ),
    },
  ];

  const isPageLoading =
    loadingUsers || loadingAdvisors || loadingInvitationBatches || loadingEligibility;

  return (
    <div className="ims-iam-page">
      <style>{styles}</style>

      <section className="ims-iam-hero">
        <div className="ims-iam-hero-main">
          <div className="ims-iam-hero-icon">
            <SvgIcon name="shield" size={42} />
          </div>
          <div>
            <h1>{isArabic ? 'المستخدمون والصلاحيات' : 'Identity & Access'}</h1>
            <p>
              {isArabic
                ? 'إدارة الحسابات، الأدوار، ربط الطلاب بالمشرفين، الدعوات، ومراجعات الأهلية من واجهة واحدة مرتبطة بالبيانات الفعلية.'
                : 'Manage accounts, roles, advisor assignments, invitations, and eligibility workflows from one live-data interface.'}
            </p>
          </div>
        </div>

        <div className="ims-iam-hero-actions">
          <button type="button" className="ims-iam-secondary-btn" onClick={loadAll} disabled={isPageLoading}>
            <SvgIcon name="refresh" size={18} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </button>
          <button type="button" className="ims-iam-primary-btn" onClick={openCreateUserModal}>
            <SvgIcon name="plus" size={18} />
            {isArabic ? 'إضافة مستخدم' : 'Add User'}
          </button>
        </div>
      </section>

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} isArabic={isArabic} />

      <section className="ims-iam-kpi-grid">
        <KpiCard
          title={isArabic ? 'إجمالي المستخدمين' : 'Total Users'}
          value={formatNumber(stats.totalUsers, locale)}
          subtitle={isArabic ? `النشطون: ${formatNumber(stats.activeUsers, locale)}` : `Active: ${formatNumber(stats.activeUsers, locale)}`}
          icon="users"
          tone="teal"
          onClick={() => setMainTab('identity')}
        />
        <KpiCard
          title={isArabic ? 'الطلاب' : 'Students'}
          value={formatNumber(stats.totalStudents, locale)}
          subtitle={isArabic ? 'حسابات طلاب نشطة أو مسجلة' : 'Registered student accounts'}
          icon="advisor"
          tone="blue"
          onClick={() => setMainTab('identity')}
        />
        <KpiCard
          title={isArabic ? 'المشرفون' : 'Academic Advisors'}
          value={formatNumber(stats.advisorsCount || stats.totalAcademicAdvisors, locale)}
          subtitle={isArabic ? `طلاب المشرف المحدد: ${formatNumber(stats.assignedStudentsCount, locale)}` : `Selected advisor students: ${formatNumber(stats.assignedStudentsCount, locale)}`}
          icon="key"
          tone="purple"
          onClick={() => setMainTab('advisorManagement')}
        />
        <KpiCard
          title={isArabic ? 'الدعوات والأهلية' : 'Invitations & Eligibility'}
          value={formatNumber(stats.invitationBatchesCount, locale)}
          subtitle={isArabic ? `مراجعات الأهلية: ${formatNumber(stats.eligibilityCount, locale)}` : `Eligibility reviews: ${formatNumber(stats.eligibilityCount, locale)}`}
          icon="mail"
          tone="green"
          onClick={() => setMainTab('invitationsEligibility')}
        />
      </section>

      <section className="ims-iam-tabs">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-onboarding={tab.key === 'advisorManagement' ? 'advisor-assignment-section' : undefined}
            className={mainTab === tab.key ? 'active' : ''}
            onClick={() => setMainTab(tab.key)}
          >
            <SvgIcon name={tab.icon} size={18} />
            {isArabic ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </section>

      {mainTab === 'identity' ? (
        <section className="ims-iam-content-card" data-onboarding="identity-users-table">
          <div className="ims-iam-section-head">
            <div>
              <div className="ims-iam-section-title">
                <div className="ims-iam-section-icon">
                  <SvgIcon name="users" size={22} />
                </div>
                <div>
                  <h2>{isArabic ? 'جدول المستخدمين' : 'Users Directory'}</h2>
                  <p>{isArabic ? 'رؤوس الأعمدة تعمل كبحث وفلترة مباشرة بدون فلاتر خارجية.' : 'Column headers work as direct search filters without external controls.'}</p>
                </div>
              </div>
            </div>

            <button type="button" className="ims-iam-primary-btn" onClick={openCreateUserModal}>
              <SvgIcon name="plus" size={18} />
              {isArabic ? 'إضافة مستخدم' : 'Add User'}
            </button>
          </div>

          {loadingUsers ? (
            <div className="ims-iam-loading">
              <div className="spinner-border spinner-border-sm" role="status" />
              {isArabic ? 'جارٍ تحميل المستخدمين...' : 'Loading users...'}
            </div>
          ) : (
            <DataTable
              columns={userColumns}
              rows={users}
              rowKey="id"
              emptyMessage={isArabic ? 'لا يوجد مستخدمون.' : 'No users found.'}
              exportName="identity-users.csv"
              isArabic={isArabic}
            />
          )}
        </section>
      ) : null}

      {mainTab === 'advisorManagement' ? (
        <section className="ims-iam-content-card">
          <div className="ims-iam-section-head">
            <div>
              <div className="ims-iam-section-title">
                <div className="ims-iam-section-icon">
                  <SvgIcon name="advisor" size={22} />
                </div>
                <div>
                  <h2>{isArabic ? 'إدارة المشرفين الأكاديميين' : 'Academic Advisor Management'}</h2>
                  <p>{isArabic ? 'اعرض المشرفين والطلاب المرتبطين بكل مشرف.' : 'View advisors and inspect the students assigned to each advisor.'}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="ims-iam-primary-btn"
              data-onboarding="advisor-assignment-button"
              onClick={() => {
                setCreateForm((current) => ({
                  ...current,
                  advisorUserId: selectedAdvisor?.userId ? String(selectedAdvisor.userId) : '',
                  studentCode: '',
                  major: '',
                }));
                setAssignmentModalOpen(true);
              }}
            >
              <SvgIcon name="plus" size={18} />
              {isArabic ? 'ربط طالب بمشرف' : 'Assign Student'}
            </button>
          </div>

          <div className="ims-iam-two-grid">
            <div>
              <div className="ims-iam-subhead">
                <h3>{isArabic ? 'المشرفون' : 'Academic Advisors'}</h3>
                <p>{isArabic ? 'اختر مشرفًا لعرض الطلاب المرتبطين به.' : 'Select an advisor to display assigned students.'}</p>
              </div>

              {loadingAdvisors ? (
                <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل المشرفين...' : 'Loading advisors...'}</div>
              ) : (
                <DataTable
                  columns={advisorColumns}
                  rows={advisors}
                  rowKey="userId"
                  emptyMessage={isArabic ? 'لا يوجد مشرفون أكاديميون.' : 'No academic advisors found.'}
                  exportName="academic-advisors.csv"
                  isArabic={isArabic}
                />
              )}
            </div>

            <div>
              <div className="ims-iam-subhead">
                <h3>
                  {selectedAdvisor
                    ? isArabic
                      ? `طلاب ${selectedAdvisor.fullName}`
                      : `Students assigned to ${selectedAdvisor.fullName}`
                    : isArabic
                      ? 'طلاب المشرف'
                      : 'Advisor Students'}
                </h3>
                <p>
                  {selectedAdvisor
                    ? isArabic
                      ? 'القائمة مرتبطة بنقطة API الخاصة بربط المشرفين.'
                      : 'This list is loaded from the advisor assignment endpoint.'
                    : isArabic
                      ? 'اختر مشرفًا أولًا.'
                      : 'Select an advisor first.'}
                </p>
              </div>

              {!selectedAdvisor ? (
                <div className="ims-iam-empty standalone">
                  {isArabic ? 'لا يوجد مشرف محدد بعد.' : 'No advisor is selected yet.'}
                </div>
              ) : loadingAdvisorStudents ? (
                <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل الطلاب...' : 'Loading assigned students...'}</div>
              ) : (
                <div data-onboarding="advisor-students-table">
                  <DataTable
                    columns={advisorStudentColumns}
                    rows={advisorStudents}
                    rowKey="studentUserId"
                    emptyMessage={isArabic ? 'لا يوجد طلاب مرتبطون بهذا المشرف.' : 'No students assigned to this advisor.'}
                    exportName="advisor-students.csv"
                    isArabic={isArabic}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {mainTab === 'invitationsEligibility' ? (
        <section className="ims-iam-content-card">
          <div className="ims-iam-section-head">
            <div>
              <div className="ims-iam-section-title">
                <div className="ims-iam-section-icon">
                  <SvgIcon name="mail" size={22} />
                </div>
                <div>
                  <h2>{isArabic ? 'الدعوات والأهلية' : 'Invitations & Eligibility'}</h2>
                  <p>{isArabic ? 'إدارة دفعات الدعوات، المستلمين، ومراجعات الأهلية.' : 'Manage invitation batches, recipients, and eligibility reviews.'}</p>
                </div>
              </div>
            </div>

            <button type="button" className="ims-iam-primary-btn" onClick={() => setInvitationBatchModalOpen(true)}>
              <SvgIcon name="plus" size={18} />
              {isArabic ? 'إنشاء دفعة دعوات' : 'Create Invitation Batch'}
            </button>
          </div>

          <div className="ims-iam-mini-tabs">
            {invitationTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={invitationTab === tab.key ? 'active' : ''}
                onClick={() => setInvitationTab(tab.key)}
              >
                {isArabic ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {invitationTab === 'batches' ? (
            loadingInvitationBatches ? (
              <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل دفعات الدعوات...' : 'Loading invitation batches...'}</div>
            ) : (
              <DataTable
                columns={invitationBatchColumns}
                rows={invitationBatches}
                rowKey="id"
                emptyMessage={isArabic ? 'لا توجد دفعات دعوات.' : 'No invitation batches found.'}
                exportName="invitation-batches.csv"
                isArabic={isArabic}
              />
            )
          ) : null}

          {invitationTab === 'recipients' ? (
            !selectedBatch ? (
              <div className="ims-iam-empty standalone">
                {isArabic ? 'اختر دفعة دعوات أولًا من تبويب الدفعات.' : 'Select a batch first from Invitation Batches.'}
              </div>
            ) : (
              <>
                <div className="ims-iam-batch-summary">
                  <DetailBox label={isArabic ? 'رقم الدفعة' : 'Batch ID'} value={selectedBatch.id} />
                  <DetailBox label={isArabic ? 'النوع' : 'Mode'} value={selectedBatch.invitationMode} />
                  <DetailBox label={isArabic ? 'المشرف' : 'Advisor'} value={selectedBatch.advisorName} />
                  <DetailBox label={isArabic ? 'عدد المستلمين' : 'Recipients'} value={selectedBatch.totalRecipients} />
                </div>

                {loadingRecipients ? (
                  <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل المستلمين...' : 'Loading recipients...'}</div>
                ) : (
                  <DataTable
                    columns={recipientColumns}
                    rows={batchRecipients}
                    rowKey="id"
                    emptyMessage={isArabic ? 'لا يوجد مستلمون لهذه الدفعة.' : 'No recipients found for this batch.'}
                    exportName="invitation-recipients.csv"
                    isArabic={isArabic}
                  />
                )}
              </>
            )
          ) : null}

          {invitationTab === 'eligibility' ? (
            <>
              <div className="ims-iam-inline-actions">
                <div>
                  <h3>{isArabic ? 'مراجعات الأهلية' : 'Eligibility Reviews'}</h3>
                  <p>{isArabic ? 'المراجعات المسندة لحسابك كمالك اعتماد.' : 'Reviews assigned to you as approval owner.'}</p>
                </div>
                <button
                  type="button"
                  className="ims-iam-secondary-btn"
                  onClick={() => currentUser?.id && loadEligibilityRows(currentUser.id)}
                >
                  <SvgIcon name="refresh" size={17} />
                  {isArabic ? 'تحديث المراجعات' : 'Refresh Reviews'}
                </button>
              </div>

              {loadingEligibility ? (
                <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل مراجعات الأهلية...' : 'Loading eligibility reviews...'}</div>
              ) : (
                <DataTable
                  columns={eligibilityColumns}
                  rows={eligibilityRows}
                  rowKey="id"
                  emptyMessage={isArabic ? 'لا توجد مراجعات أهلية.' : 'No eligibility reviews found.'}
                  exportName="eligibility-reviews.csv"
                  isArabic={isArabic}
                />
              )}
            </>
          ) : null}
        </section>
      ) : null}

      <OverlayModal
        isOpen={userModalState.isOpen}
        title={userModalState.record ? (isArabic ? 'تعديل مستخدم' : 'Edit User') : (isArabic ? 'إضافة مستخدم' : 'Add User')}
        subtitle={isArabic ? 'أدخل بيانات المستخدم والدور والصلاحية الأساسية.' : 'Enter user data, role, and access status.'}
        onClose={closeUserModal}
        size="lg"
      >
        <form onSubmit={handleSaveUser} className="ims-iam-form-grid">
          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'الاسم الكامل' : 'Full Name'}</span>
            <input
              value={createForm.fullName}
              onChange={(event) => setCreateForm((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'البريد الإلكتروني' : 'Email'}</span>
            <input
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>

          {!userModalState.record ? (
            <label className="ims-iam-field ims-iam-col-6">
              <span>{isArabic ? 'كلمة المرور' : 'Password'}</span>
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
          ) : null}

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'الدور' : 'Role'}</span>
            <select
              value={createForm.role}
              disabled={Boolean(userModalState.record)}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  role: event.target.value,
                  advisorUserId: event.target.value === 'Student' ? current.advisorUserId : '',
                  studentCode: event.target.value === 'Student' ? current.studentCode : '',
                  university: event.target.value === 'Student' ? current.university : '',
                  major: event.target.value === 'Student' ? current.major : '',
                  employeeNo: event.target.value !== 'Student' ? current.employeeNo : '',
                  department: event.target.value !== 'Student' ? current.department : '',
                  isSystemResponsible:
                    event.target.value === 'AcademicAdvisor' ? current.isSystemResponsible : 'false',
                }))
              }
              required
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'اسم المستخدم' : 'Username'}</span>
            <input
              value={createForm.username}
              onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'الجوال' : 'Phone'}</span>
            <input
              value={createForm.phone}
              onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'الحالة' : 'Status'}</span>
            <select
              value={createForm.status}
              onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))}
              required
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {!userModalState.record && createForm.role === 'Student' ? (
            <>
              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'الرقم الجامعي' : 'Student Code'}</span>
                <input
                  value={createForm.studentCode}
                  onChange={(event) => setCreateForm((current) => ({ ...current, studentCode: event.target.value }))}
                  required
                />
              </label>

              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</span>
                <select
                  value={createForm.advisorUserId}
                  onChange={(event) => setCreateForm((current) => ({ ...current, advisorUserId: event.target.value }))}
                  required
                >
                  <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
                  {advisorOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'الجامعة' : 'University'}</span>
                <input
                  value={createForm.university}
                  onChange={(event) => setCreateForm((current) => ({ ...current, university: event.target.value }))}
                />
              </label>

              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'التخصص' : 'Major'}</span>
                <input
                  value={createForm.major}
                  onChange={(event) => setCreateForm((current) => ({ ...current, major: event.target.value }))}
                />
              </label>
            </>
          ) : null}

          {!userModalState.record && createForm.role !== 'Student' ? (
            <>
              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'الرقم الوظيفي' : 'Employee No'}</span>
                <input
                  value={createForm.employeeNo}
                  onChange={(event) => setCreateForm((current) => ({ ...current, employeeNo: event.target.value }))}
                />
              </label>

              <label className="ims-iam-field ims-iam-col-6">
                <span>{isArabic ? 'القسم' : 'Department'}</span>
                <input
                  value={createForm.department}
                  onChange={(event) => setCreateForm((current) => ({ ...current, department: event.target.value }))}
                />
              </label>

              {createForm.role === 'AcademicAdvisor' ? (
                <label className="ims-iam-field ims-iam-col-6">
                  <span>{isArabic ? 'مسؤول النظام' : 'System Responsible'}</span>
                  <select
                    value={createForm.isSystemResponsible}
                    onChange={(event) => setCreateForm((current) => ({ ...current, isSystemResponsible: event.target.value }))}
                  >
                    <option value="false">{isArabic ? 'لا' : 'No'}</option>
                    <option value="true">{isArabic ? 'نعم' : 'Yes'}</option>
                  </select>
                </label>
              ) : null}
            </>
          ) : null}

          <div className="ims-iam-modal-actions ims-iam-col-12">
            <button type="button" className="ims-iam-secondary-btn" onClick={closeUserModal}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-iam-primary-btn" disabled={submitting}>
              {submitting ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'حفظ' : 'Save')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={assignmentModalOpen}
        title={isArabic ? 'ربط طالب بمشرف أكاديمي' : 'Assign Student to Academic Advisor'}
        subtitle={isArabic ? 'اختر الطالب والمشرف، ويمكنك إضافة ملاحظة للربط.' : 'Select the student and academic advisor, with optional notes.'}
        onClose={() => setAssignmentModalOpen(false)}
        size="md"
      >
        <form onSubmit={handleAssignStudent} className="ims-iam-form-grid">
          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'الطالب' : 'Student'}</span>
            <select
              value={createForm.studentCode}
              onChange={(event) => setCreateForm((current) => ({ ...current, studentCode: event.target.value }))}
              required
            >
              <option value="">{isArabic ? 'اختر الطالب' : 'Select student'}</option>
              {assignmentStudentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</span>
            <select
              value={createForm.advisorUserId}
              onChange={(event) => setCreateForm((current) => ({ ...current, advisorUserId: event.target.value }))}
              required
            >
              <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
              {advisorOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'ملاحظات' : 'Notes'}</span>
            <textarea
              rows="4"
              value={createForm.major}
              onChange={(event) => setCreateForm((current) => ({ ...current, major: event.target.value }))}
            />
          </label>

          <div className="ims-iam-modal-actions ims-iam-col-12">
            <button type="button" className="ims-iam-secondary-btn" onClick={() => setAssignmentModalOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-iam-primary-btn" disabled={submitting}>
              {submitting ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'ربط الطالب' : 'Assign Student')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={invitationBatchModalOpen}
        title={isArabic ? 'إنشاء دفعة دعوات' : 'Create Invitation Batch'}
        subtitle={isArabic ? 'أدخل بيانات الدعوة، والمستلمين بصيغة: الاسم،البريد.' : 'Enter invitation details and recipients as: Name,Email.'}
        onClose={() => {
          setInvitationBatchModalOpen(false);
          resetInvitationForm();
        }}
        size="lg"
      >
        <form onSubmit={handleCreateInvitationBatch} className="ims-iam-form-grid">
          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'نوع الدعوة' : 'Invitation Mode'}</span>
            <select
              value={invitationForm.invitationMode}
              onChange={(event) => setInvitationForm((current) => ({ ...current, invitationMode: event.target.value }))}
              required
            >
              <option value="Excel">Excel</option>
              <option value="Link">Link</option>
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</span>
            <select
              value={invitationForm.advisorUserId}
              onChange={(event) => setInvitationForm((current) => ({ ...current, advisorUserId: event.target.value }))}
              required
            >
              <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
              {advisorOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {invitationForm.invitationMode === 'Excel' ? (
            <label className="ims-iam-field ims-iam-col-6">
              <span>{isArabic ? 'اسم ملف Excel' : 'Excel File Name'}</span>
              <input
                value={invitationForm.excelFileName}
                onChange={(event) => setInvitationForm((current) => ({ ...current, excelFileName: event.target.value }))}
              />
            </label>
          ) : (
            <label className="ims-iam-field ims-iam-col-6">
              <span>{isArabic ? 'رابط المشاركة' : 'Shared Link URL'}</span>
              <input
                value={invitationForm.sharedLinkUrl}
                onChange={(event) => setInvitationForm((current) => ({ ...current, sharedLinkUrl: event.target.value }))}
              />
            </label>
          )}

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'رسالة الدعوة' : 'Invitation Message'}</span>
            <textarea
              rows="3"
              value={invitationForm.invitationMessage}
              onChange={(event) => setInvitationForm((current) => ({ ...current, invitationMessage: event.target.value }))}
            />
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'المستلمون' : 'Recipients'}</span>
            <textarea
              rows="7"
              placeholder={isArabic ? 'كل سطر: اسم الطالب,student@email.com' : 'One recipient per line: Student Name,student@email.com'}
              value={invitationForm.recipientsText}
              onChange={(event) => setInvitationForm((current) => ({ ...current, recipientsText: event.target.value }))}
            />
          </label>

          <div className="ims-iam-modal-actions ims-iam-col-12">
            <button
              type="button"
              className="ims-iam-secondary-btn"
              onClick={() => {
                setInvitationBatchModalOpen(false);
                resetInvitationForm();
              }}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-iam-primary-btn" disabled={submitting}>
              {submitting ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'إنشاء الدفعة' : 'Create Batch')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={eligibilityModalOpen}
        title={isArabic ? 'إنشاء مراجعة أهلية' : 'Create Eligibility Review'}
        subtitle={isArabic ? 'اختر الطالب ومالك الاعتماد.' : 'Select the linked student and approval owner.'}
        onClose={() => {
          setEligibilityModalOpen(false);
          resetEligibilityForm();
          setSelectedRecipientForEligibility(null);
        }}
        size="md"
      >
        <form onSubmit={handleCreateEligibility} className="ims-iam-form-grid">
          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'المستلم' : 'Recipient'}</span>
            <input
              value={
                selectedRecipientForEligibility
                  ? `${selectedRecipientForEligibility.studentName} (${selectedRecipientForEligibility.studentEmail || 'No Email'})`
                  : ''
              }
              readOnly
            />
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'المستخدم الطالب المرتبط' : 'Linked Student User'}</span>
            <select
              value={eligibilityForm.studentUserId}
              onChange={(event) => setEligibilityForm((current) => ({ ...current, studentUserId: event.target.value }))}
              required
            >
              <option value="">{isArabic ? 'اختر الطالب' : 'Select student'}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.fullName} ({student.email})</option>
              ))}
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'مالك الاعتماد' : 'Approval Owner'}</span>
            <select
              value={eligibilityForm.approvalOwnerUserId}
              onChange={(event) => setEligibilityForm((current) => ({ ...current, approvalOwnerUserId: event.target.value }))}
              required
            >
              <option value="">{isArabic ? 'اختر المالك' : 'Select owner'}</option>
              {advisors.map((advisor) => (
                <option key={advisor.userId} value={advisor.userId}>{advisor.fullName} ({advisor.email})</option>
              ))}
              {currentUser?.role === 'Administrator' ? (
                <option value={currentUser.id}>{currentUser.fullName} ({currentUser.email}) - Administrator</option>
              ) : null}
            </select>
          </label>

          <label className="ims-iam-field ims-iam-col-12">
            <span>{isArabic ? 'دور مالك الاعتماد' : 'Approval Owner Role'}</span>
            <select
              value={eligibilityForm.approvalOwnerRole}
              onChange={(event) => setEligibilityForm((current) => ({ ...current, approvalOwnerRole: event.target.value }))}
              required
            >
              <option value="AcademicAdvisor">AcademicAdvisor</option>
              <option value="Administrator">Administrator</option>
            </select>
          </label>

          <div className="ims-iam-modal-actions ims-iam-col-12">
            <button
              type="button"
              className="ims-iam-secondary-btn"
              onClick={() => {
                setEligibilityModalOpen(false);
                resetEligibilityForm();
                setSelectedRecipientForEligibility(null);
              }}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-iam-primary-btn" disabled={submitting}>
              {submitting ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'إنشاء المراجعة' : 'Create Eligibility')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={isStudentFileOpen}
        title={isArabic ? 'ملف الطالب' : 'Student File'}
        subtitle={selectedStudentRecord?.email || ''}
        onClose={closeStudentFile}
        size="lg"
      >
        {!selectedStudentRecord ? null : (
          <div className="d-grid gap-3">
            <div className="ims-iam-student-file-head">
              <div className="ims-iam-person">
                <div className="ims-iam-avatar ims-iam-avatar-teal">
                  {String(selectedStudentRecord.fullName || '-').slice(0, 1)}
                </div>
                <div>
                  <strong>{selectedStudentRecord.fullName}</strong>
                  <span>{selectedStudentRecord.email || '-'}</span>
                </div>
              </div>

              <button
                type="button"
                className="ims-iam-primary-btn"
                onClick={() => openFinalEvaluationFromStudentFile(selectedStudentRecord)}
                disabled={submitting || loadingStudentFile}
              >
                <SvgIcon name="send" size={17} />
                {isArabic ? 'إرسال التقييم النهائي' : 'Send Final Evaluation'}
              </button>
            </div>

            <div className="ims-iam-batch-summary">
              <DetailBox label={isArabic ? 'الرقم الجامعي' : 'Student Code'} value={selectedStudentRecord.studentCode} />
              <DetailBox label={isArabic ? 'الجامعة' : 'University'} value={selectedStudentRecord.university} />
              <DetailBox label={isArabic ? 'التخصص' : 'Major'} value={selectedStudentRecord.major} />
              <DetailBox label="GPA" value={selectedStudentRecord.gpa} />
            </div>

            {loadingStudentFile ? (
              <div className="ims-iam-loading">{isArabic ? 'جارٍ تحميل ملف الطالب...' : 'Loading student file...'}</div>
            ) : !studentInternshipContext ? (
              <div className="ims-iam-empty standalone">
                {isArabic ? 'لا يوجد سياق تدريب لهذا الطالب حتى الآن.' : 'No internship context was found yet for this student.'}
              </div>
            ) : (
              <div className="ims-iam-batch-summary">
                <DetailBox label={isArabic ? 'رقم التدريب' : 'Internship ID'} value={studentInternshipContext.internship_id} />
                <DetailBox label={isArabic ? 'جهة التدريب' : 'Provider'} value={studentInternshipContext.provider_name} />
                <DetailBox label={isArabic ? 'عنوان التدريب' : 'Internship Title'} value={studentInternshipContext.internship_title} />
                <DetailBox label={isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'} value={studentInternshipContext.advisor_name} />
                <DetailBox label={isArabic ? 'آخر خطة تدريب' : 'Latest Training Plan'} value={studentInternshipContext.latest_training_plan_id} />
                <DetailBox
                  label={isArabic ? 'آخر تقرير أسبوعي' : 'Latest Weekly Report'}
                  value={
                    studentInternshipContext.latest_weekly_report_week_no
                      ? `${isArabic ? 'الأسبوع' : 'Week'} ${studentInternshipContext.latest_weekly_report_week_no}`
                      : '-'
                  }
                />
              </div>
            )}
          </div>
        )}
      </OverlayModal>

      <OverlayModal
        isOpen={isFinalEvaluationModalOpen}
        title={isArabic ? 'إرسال طلب التقييم النهائي' : 'Send Final Evaluation Request'}
        subtitle={isArabic ? 'سيتم إرسال رابط التقييم إلى بريد جهة التدريب.' : 'The evaluation link will be sent to the provider email.'}
        onClose={() => setIsFinalEvaluationModalOpen(false)}
        size="md"
      >
        <form onSubmit={submitFinalEvaluationFromStudentFile} className="ims-iam-form-grid">
          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'رقم التدريب' : 'Internship ID'}</span>
            <input value={finalEvaluationForm.internshipId} readOnly />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'معرف الطالب' : 'Student User ID'}</span>
            <input value={finalEvaluationForm.studentUserId} readOnly />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'اسم الجهة' : 'Provider Name'}</span>
            <input value={finalEvaluationForm.providerName} readOnly />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'بريد الجهة' : 'Provider Email'}</span>
            <input value={finalEvaluationForm.providerEmail} readOnly />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'قالب الإرسال' : 'Sending Template'}</span>
            <input
              value={finalEvaluationForm.sendingTemplateName}
              onChange={(event) => setFinalEvaluationForm((current) => ({ ...current, sendingTemplateName: event.target.value }))}
            />
          </label>

          <label className="ims-iam-field ims-iam-col-6">
            <span>{isArabic ? 'قالب التقييم' : 'Evaluation Template'}</span>
            <input
              value={finalEvaluationForm.evaluationTemplateName}
              onChange={(event) => setFinalEvaluationForm((current) => ({ ...current, evaluationTemplateName: event.target.value }))}
            />
          </label>

          <div className="ims-iam-modal-actions ims-iam-col-12">
            <button type="button" className="ims-iam-secondary-btn" onClick={() => setIsFinalEvaluationModalOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-iam-primary-btn" disabled={submitting}>
              {submitting ? (isArabic ? 'جارٍ الإرسال...' : 'Sending...') : (isArabic ? 'إرسال التقييم' : 'Send Evaluation')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <ConfirmModal
        state={confirmState}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
        isArabic={isArabic}
      />
    </div>
  );
}

const styles = `
  .ims-iam-page {
    position: relative;
    min-height: 100%;
    color: #10243f;
    padding-bottom: 1.5rem;
  }

  .ims-iam-page::before {
    content: "";
    position: absolute;
    inset: -1.5rem -1.5rem auto -1.5rem;
    height: 320px;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 12%, rgba(20, 200, 195, 0.18), transparent 35%),
      radial-gradient(circle at 82% 12%, rgba(91, 101, 241, 0.12), transparent 32%),
      repeating-radial-gradient(ellipse at 45% 24%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
    opacity: 0.95;
    border-radius: 0 0 42px 42px;
    z-index: 0;
  }

  .ims-iam-page > * {
    position: relative;
    z-index: 1;
  }

  .ims-iam-hero,
  .ims-iam-kpi-card,
  .ims-iam-content-card,
  .ims-iam-table-card {
    background: rgba(255,255,255,0.95);
    border: 1px solid rgba(230,238,246,0.98);
    box-shadow: 0 14px 36px rgba(16,36,63,0.07);
    backdrop-filter: blur(10px);
  }

  .ims-iam-hero {
    overflow: hidden;
    border-radius: 30px;
    padding: 1.4rem 1.55rem;
    margin-bottom: 1rem;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1.2rem;
  }

  .ims-iam-hero-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ims-iam-hero-icon {
    width: 76px;
    height: 76px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 24px;
    color: #0796a6;
    background: linear-gradient(135deg, #e3fbfb, #eef3ff);
    flex-shrink: 0;
  }

  .ims-iam-hero h1 {
    margin: 0 0 .35rem;
    font-size: clamp(2rem, 3vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.055em;
    color: #10243f;
  }

  .ims-iam-hero p {
    margin: 0;
    max-width: 920px;
    color: #637894;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.8;
  }

  .ims-iam-hero-actions,
  .ims-iam-row-actions,
  .ims-iam-inline-actions {
    display: flex;
    align-items: center;
    gap: .65rem;
    flex-wrap: wrap;
  }

  .ims-iam-hero-actions {
    justify-content: flex-end;
  }

  .ims-iam-primary-btn,
  .ims-iam-secondary-btn,
  .ims-iam-danger-btn,
  .ims-iam-row-btn {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .45rem;
    border-radius: 15px;
    border: 1px solid transparent;
    padding: 0 .95rem;
    font-size: .86rem;
    font-weight: 900;
    text-decoration: none;
  }

  .ims-iam-primary-btn {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    box-shadow: 0 14px 30px rgba(7,150,166,.18);
  }

  .ims-iam-secondary-btn,
  .ims-iam-row-btn {
    color: #243b5a;
    background: #fff;
    border-color: #dfeaf3;
  }

  .ims-iam-danger-btn,
  .ims-iam-row-btn.danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255, 90, 107, .22);
  }

  .ims-iam-row-btn.primary {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-color: transparent;
  }

  .ims-iam-primary-btn:disabled,
  .ims-iam-secondary-btn:disabled,
  .ims-iam-danger-btn:disabled,
  .ims-iam-row-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ims-iam-feedback {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    border-radius: 18px;
    padding: .85rem 1rem;
    font-weight: 850;
    border: 1px solid transparent;
  }

  .ims-iam-feedback strong,
  .ims-iam-feedback span {
    display: block;
  }

  .ims-iam-feedback strong {
    margin-bottom: .15rem;
  }

  .ims-iam-feedback button {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 12px;
    background: rgba(255,255,255,.65);
    color: currentColor;
  }

  .ims-iam-feedback-success {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,.24);
  }

  .ims-iam-feedback-danger {
    color: #b42335;
    background: #ffedf0;
    border-color: rgba(255,90,107,.24);
  }

  .ims-iam-feedback-info {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,.2);
  }

  .ims-iam-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .ims-iam-kpi-card {
    width: 100%;
    min-height: 126px;
    border-radius: 25px;
    padding: 1.15rem;
    display: flex;
    align-items: center;
    gap: .9rem;
    text-align: start;
  }

  .ims-iam-kpi-card:hover {
    transform: translateY(-1px);
    border-color: rgba(20, 200, 195, .32);
    box-shadow: 0 18px 44px rgba(16,36,63,.10);
  }

  .ims-iam-kpi-icon {
    width: 60px;
    height: 60px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    flex-shrink: 0;
  }

  .ims-iam-kpi-teal .ims-iam-kpi-icon { color: #0796a6; background: #e2fafa; }
  .ims-iam-kpi-blue .ims-iam-kpi-icon { color: #3b82f6; background: #e8f1ff; }
  .ims-iam-kpi-purple .ims-iam-kpi-icon { color: #5b65f1; background: #eef0ff; }
  .ims-iam-kpi-green .ims-iam-kpi-icon { color: #18bd87; background: #e7fbf3; }

  .ims-iam-kpi-card span {
    display: block;
    color: #5e718d;
    font-size: .86rem;
    font-weight: 850;
    margin-bottom: .35rem;
  }

  .ims-iam-kpi-card strong {
    display: block;
    color: #10243f;
    font-size: 1.9rem;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -.04em;
  }

  .ims-iam-kpi-card em {
    display: block;
    margin-top: .35rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-style: normal;
    font-weight: 750;
  }

  .ims-iam-tabs,
  .ims-iam-mini-tabs {
    display: flex;
    align-items: center;
    gap: .65rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .ims-iam-tabs button,
  .ims-iam-mini-tabs button {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: 0 1rem;
    border: 1px solid #dfeaf3;
    border-radius: 16px;
    background: rgba(255,255,255,.94);
    color: #637894;
    font-weight: 900;
  }

  .ims-iam-mini-tabs button {
    min-height: 40px;
    border-radius: 14px;
    font-size: .83rem;
  }

  .ims-iam-tabs button.active,
  .ims-iam-mini-tabs button.active {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-color: transparent;
    box-shadow: 0 10px 24px rgba(7,150,166,.16);
  }

  .ims-iam-content-card {
    border-radius: 28px;
    padding: 1.1rem;
    margin-bottom: 1rem;
  }

  .ims-iam-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .ims-iam-section-title {
    display: flex;
    gap: .75rem;
    align-items: center;
  }

  .ims-iam-section-icon {
    width: 50px;
    height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    color: #0796a6;
    background: #e2fafa;
    flex-shrink: 0;
  }

  .ims-iam-section-head h2,
  .ims-iam-subhead h3,
  .ims-iam-inline-actions h3 {
    margin: 0 0 .25rem;
    color: #10243f;
    font-size: 1.08rem;
    font-weight: 900;
    letter-spacing: -.02em;
  }

  .ims-iam-section-head p,
  .ims-iam-subhead p,
  .ims-iam-inline-actions p {
    margin: 0;
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 700;
    line-height: 1.55;
  }

  .ims-iam-two-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 1rem;
    align-items: start;
  }

  .ims-iam-subhead {
    margin-bottom: .85rem;
  }

  .ims-iam-table-card {
    border-radius: 26px;
    overflow: hidden;
  }

  .ims-iam-table-top {
    min-height: 68px;
    padding: .9rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #edf3f8;
    background: #fff;
  }

  .ims-iam-table-top strong {
    display: block;
    color: #243b5a;
    font-size: .9rem;
    font-weight: 900;
  }

  .ims-iam-table-top span {
    display: block;
    margin-top: .15rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-weight: 750;
  }

  .ims-iam-table-wrap {
    overflow: auto;
  }

  .ims-iam-table {
    width: 100%;
    min-width: 1060px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .ims-iam-table th {
    padding: .8rem .7rem;
    border-bottom: 1px solid #edf3f8;
    background: #fff;
  }

  .ims-iam-table td {
    padding: .86rem .9rem;
    border-bottom: 1px solid #edf3f8;
    color: #243b5a;
    font-size: .86rem;
    font-weight: 750;
    vertical-align: middle;
  }

  .ims-iam-table tr:hover td {
    background: #fbfdff;
  }

  .ims-iam-table-filter {
    position: relative;
  }

  .ims-iam-table-filter svg {
    position: absolute;
    inset-inline-start: .65rem;
    top: 50%;
    transform: translateY(-50%);
    color: #8fa0b6;
  }

  .ims-iam-table-filter input {
    width: 100%;
    min-height: 40px;
    border: 1px solid #dfeaf3;
    border-radius: 13px;
    padding: .5rem .65rem;
    padding-inline-start: 2.05rem;
    color: #243b5a;
    background: #fbfdff;
    font-size: .78rem;
    font-weight: 780;
    outline: none;
  }

  .ims-iam-table-filter input:focus {
    border-color: rgba(20,200,195,.72);
    box-shadow: 0 0 0 .16rem rgba(20,200,195,.10);
    background: #fff;
  }

  .ims-iam-person {
    display: flex;
    align-items: center;
    gap: .65rem;
    min-width: 210px;
  }

  .ims-iam-person strong,
  .ims-iam-person span {
    display: block;
  }

  .ims-iam-person strong {
    color: #10243f;
    font-weight: 900;
    font-size: .9rem;
  }

  .ims-iam-person span {
    color: #7a8aa5;
    font-size: .76rem;
    font-weight: 750;
  }

  .ims-iam-avatar {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    color: #fff;
    font-weight: 900;
    flex-shrink: 0;
  }

  .ims-iam-avatar-teal { background: linear-gradient(135deg, #0796a6, #14c8c3); }
  .ims-iam-avatar-purple { background: linear-gradient(135deg, #5b65f1, #8a91ff); }
  .ims-iam-avatar-blue { background: linear-gradient(135deg, #3b82f6, #64a4ff); }
  .ims-iam-avatar-green { background: linear-gradient(135deg, #18bd87, #2ee6d3); }

  .ims-iam-status,
  .ims-iam-role {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .36rem;
    min-height: 30px;
    padding: .35rem .7rem;
    border-radius: 999px;
    font-size: .74rem;
    font-weight: 900;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .ims-iam-status::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }

  .ims-iam-status-success {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,.22);
  }

  .ims-iam-status-warning {
    color: #a4660b;
    background: #fff4dc;
    border-color: rgba(244,166,42,.24);
  }

  .ims-iam-status-danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255,90,107,.24);
  }

  .ims-iam-status-info {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,.2);
  }

  .ims-iam-role-teal {
    color: #0796a6;
    background: #e2fafa;
    border-color: rgba(20,200,195,.22);
  }

  .ims-iam-role-blue {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,.2);
  }

  .ims-iam-role-purple {
    color: #5b65f1;
    background: #eef0ff;
    border-color: rgba(91,101,241,.18);
  }

  .ims-iam-role-green {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,.22);
  }

  .ims-iam-row-btn {
    min-height: 34px;
    border-radius: 12px;
    font-size: .78rem;
    padding: 0 .7rem;
  }

  .ims-iam-pagination {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: .55rem;
    padding: .75rem 1rem;
    background: #fff;
  }

  .ims-iam-pagination button {
    width: 34px;
    height: 34px;
    border: 1px solid #dfeaf3;
    border-radius: 12px;
    color: #243b5a;
    background: #fff;
    font-weight: 900;
  }

  .ims-iam-pagination button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .ims-iam-pagination span {
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 850;
  }

  .ims-iam-empty,
  .ims-iam-loading {
    min-height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .65rem;
    color: #7a8aa5;
    font-size: .9rem;
    font-weight: 850;
    text-align: center;
    border-radius: 20px;
    background: #fbfdff;
  }

  .ims-iam-empty.standalone {
    border: 1px dashed #d6e4ee;
    min-height: 180px;
  }

  .ims-iam-batch-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: .8rem;
    margin-bottom: 1rem;
  }

  .ims-iam-detail-box {
    min-height: 82px;
    border: 1px solid #edf3f8;
    border-radius: 18px;
    background: #fbfdff;
    padding: .85rem .9rem;
  }

  .ims-iam-detail-box span {
    display: block;
    margin-bottom: .35rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-weight: 850;
  }

  .ims-iam-detail-box strong {
    display: block;
    color: #243b5a;
    font-size: .9rem;
    line-height: 1.55;
    font-weight: 900;
    word-break: break-word;
  }

  .ims-iam-inline-actions {
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .ims-iam-student-file-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: .85rem;
    flex-wrap: wrap;
  }

  .ims-iam-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2050;
    background: rgba(7,31,53,.55);
    backdrop-filter: blur(6px);
  }

  .ims-iam-modal-shell {
    position: fixed;
    inset: 0;
    z-index: 2060;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
  }

  .ims-iam-modal-card {
    width: min(880px, 100%);
    max-height: min(92vh, 920px);
    display: flex;
    flex-direction: column;
    border-radius: 28px;
    border: 1px solid #dfeaf3;
    background: #fff;
    box-shadow: 0 30px 90px rgba(7,31,53,.24);
    overflow: hidden;
  }

  .ims-iam-modal-sm { width: min(560px, 100%); }
  .ims-iam-modal-md { width: min(720px, 100%); }
  .ims-iam-modal-lg { width: min(960px, 100%); }

  .ims-iam-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.05rem 1.2rem;
    border-bottom: 1px solid #edf3f8;
    background:
      radial-gradient(circle at 10% 10%, rgba(20,200,195,.12), transparent 38%),
      #fff;
  }

  .ims-iam-modal-header h3 {
    margin: 0 0 .25rem;
    color: #10243f;
    font-size: 1.12rem;
    font-weight: 900;
  }

  .ims-iam-modal-header p {
    margin: 0;
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 700;
    line-height: 1.55;
  }

  .ims-iam-modal-header button {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 14px;
    color: #243b5a;
    background: #f4f7fb;
    flex-shrink: 0;
  }

  .ims-iam-modal-body {
    overflow: auto;
    padding: 1.15rem;
  }

  .ims-iam-form-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: .85rem;
  }

  .ims-iam-col-6 { grid-column: span 6; }
  .ims-iam-col-12 { grid-column: span 12; }

  .ims-iam-field {
    display: grid;
    gap: .35rem;
  }

  .ims-iam-field span {
    color: #5e718d;
    font-size: .82rem;
    font-weight: 850;
  }

  .ims-iam-field input,
  .ims-iam-field select,
  .ims-iam-field textarea {
    width: 100%;
    min-height: 44px;
    border: 1px solid #dfeaf3;
    border-radius: 15px;
    color: #243b5a;
    background: #fbfdff;
    padding: .55rem .75rem;
    font-weight: 750;
    outline: none;
  }

  .ims-iam-field textarea {
    resize: vertical;
  }

  .ims-iam-field input:focus,
  .ims-iam-field select:focus,
  .ims-iam-field textarea:focus {
    border-color: rgba(20,200,195,.72);
    box-shadow: 0 0 0 .18rem rgba(20,200,195,.11);
    background: #fff;
  }

  .ims-iam-field input:disabled,
  .ims-iam-field select:disabled {
    opacity: .7;
    cursor: not-allowed;
  }

  .ims-iam-modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: .65rem;
    flex-wrap: wrap;
    margin-top: .3rem;
    padding-top: 1rem;
    border-top: 1px solid #edf3f8;
  }

  .ims-iam-confirm-box {
    min-height: 92px;
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 1px solid #edf3f8;
    border-radius: 18px;
    background: #fbfdff;
    color: #243b5a;
    font-weight: 800;
    line-height: 1.7;
  }

  @media (max-width: 1199.98px) {
    .ims-iam-kpi-grid,
    .ims-iam-two-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ims-iam-batch-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 991.98px) {
    .ims-iam-hero,
    .ims-iam-two-grid {
      grid-template-columns: 1fr;
    }

    .ims-iam-hero-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 767.98px) {
    .ims-iam-hero-main,
    .ims-iam-section-head,
    .ims-iam-table-top,
    .ims-iam-inline-actions,
    .ims-iam-student-file-head {
      flex-direction: column;
      align-items: stretch;
      display: flex;
    }

    .ims-iam-kpi-grid,
    .ims-iam-batch-summary {
      grid-template-columns: 1fr;
    }

    .ims-iam-col-6 {
      grid-column: span 12;
    }

    .ims-iam-primary-btn,
    .ims-iam-secondary-btn,
    .ims-iam-danger-btn {
      width: 100%;
    }

    .ims-iam-modal-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
`;

export default IdentityAccessModulePage;