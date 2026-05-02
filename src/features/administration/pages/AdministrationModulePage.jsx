import { useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../../app/providers/AuthProvider';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  assignStudentAdvisorRequest,
  createAdminArchivedRecordRequest,
  createAdminBackupJobRequest,
  createAdminNotificationRequest,
  createAdminSystemSettingRequest,
  createInvitationBatchRequest,
  createUserRequest,
  deleteAdminArchivedRecordRequest,
  deleteAdminBackupJobRequest,
  deleteAdminNotificationRequest,
  deleteAdminSystemSettingRequest,
  deleteUserRequest,
  getAdminArchivedRecordsRequest,
  getAdminAuditLogsRequest,
  getAdminBackupJobsRequest,
  getAdminNotificationsRequest,
  getAdminSystemSettingsRequest,
  getAdvisorStudentsRequest,
  getAdvisorsRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getUsersRequest,
  runAdminBackupJobRequest,
  updateAdminBackupJobRequest,
  updateAdminNotificationRequest,
  updateAdminSystemSettingRequest,
  updateUserRequest,
} from '../../../app/api/client';

const administrationTabs = [
  { key: 'users', label: 'Users Management', icon: 'users' },
  { key: 'invitations', label: 'Invitations', icon: 'mail' },
  { key: 'advisorAssignments', label: 'Advisor Assignments', icon: 'mapping' },
  { key: 'notifications', label: 'Notifications', icon: 'bell' },
  { key: 'auditLogs', label: 'Audit Log', icon: 'audit' },
  { key: 'systemConfigurations', label: 'System Configuration', icon: 'settings' },
  { key: 'backupJobs', label: 'Backup Jobs', icon: 'database' },
  { key: 'archivedRecords', label: 'Archived Records', icon: 'archive' },
];

const roleOptions = ['Student', 'AcademicAdvisor', 'CompanyAdvisor', 'Administrator'];
const statusOptions = ['Active', 'Inactive', 'Pending', 'Suspended'];
const notificationTypes = ['System', 'Email', 'Reminder', 'Alert'];
const notificationStatuses = ['Pending', 'Sent', 'Read'];
const backupJobTypes = ['Database', 'Files', 'FullSystem'];
const backupJobStatuses = ['Pending', 'Running', 'Completed', 'Failed'];

function normalizeUser(row) {
  return {
    id: row.id ?? row.user_id,
    full_name: row.full_name || row.fullName || row.name || '-',
    email: row.email || '-',
    role: row.role || row.role_name || row.user_role || '-',
    status: row.status || row.account_status || 'Active',
    created_at: row.created_at || row.createdAt || '-',
  };
}

function normalizeAdvisor(row) {
  return {
    id: row.user_id ?? row.id,
    full_name: row.full_name || row.fullName || '-',
    email: row.email || '-',
  };
}

function normalizeStudent(row) {
  return {
    id: row.id ?? row.user_id,
    full_name: row.full_name || row.fullName || row.name || '-',
    email: row.email || '-',
    role: row.role || row.role_name || 'Student',
    status: row.status || row.account_status || 'Active',
    student_code: row.student_code || row.studentCode || '',
    major: row.major || '',
    university: row.university || '',
  };
}

function normalizeInvitationBatch(row) {
  return {
    id: row.id,
    title: row.title || row.batch_name || row.name || `Batch #${row.id}`,
    status: row.status || 'Pending',
    created_by: row.created_by_name || row.created_by || row.createdBy || '-',
    created_at: row.created_at || row.createdAt || row.sent_at || '-',
    total_recipients: row.total_recipients ?? row.recipients_count ?? row.count ?? '-',
  };
}

function formatDateTime(value, locale = 'en-GB') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function stringifyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatNumber(value, locale = 'en-GB') {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase();

  if (['active', 'sent', 'read', 'completed', 'success', 'approved', 'running'].includes(value)) {
    return 'success';
  }

  if (['pending', 'inactive', 'draft', 'scheduled'].includes(value)) {
    return 'warning';
  }

  if (['suspended', 'failed', 'error', 'rejected', 'deleted'].includes(value)) {
    return 'danger';
  }

  return 'info';
}

function getStatusLabel(status, isArabic) {
  const value = String(status || '').toLowerCase();
  const labels = {
    active: isArabic ? 'نشط' : 'Active',
    inactive: isArabic ? 'غير نشط' : 'Inactive',
    pending: isArabic ? 'معلق' : 'Pending',
    suspended: isArabic ? 'موقوف' : 'Suspended',
    sent: isArabic ? 'مرسل' : 'Sent',
    read: isArabic ? 'مقروء' : 'Read',
    running: isArabic ? 'قيد التشغيل' : 'Running',
    completed: isArabic ? 'مكتمل' : 'Completed',
    failed: isArabic ? 'فشل' : 'Failed',
  };

  return labels[value] || status || '-';
}

function getCsvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function exportCsv(filename, rows, columns) {
  const exportableColumns = columns.filter((column) => !column.isAction);
  const lines = [
    exportableColumns.map((column) => getCsvCell(column.label)).join(','),
    ...rows.map((row) =>
      exportableColumns
        .map((column) => {
          const value = column.exportValue
            ? column.exportValue(row)
            : column.render
              ? column.render(row[column.key], row, true)
              : row[column.key];

          return getCsvCell(typeof value === 'object' ? stringifyValue(value) : value);
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
    admin: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
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
    bell: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    audit: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 10.6 15a1.7 1.7 0 0 0-1.6-1H9a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1-.6l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.18.6.75 1 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
    archive: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
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
    run: (
      <>
        <path d="m8 5 11 7-11 7Z" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
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
      {icons[name] || icons.admin}
    </svg>
  );
}

function OverlayModal({ isOpen, title, subtitle, children, onClose, size = 'lg' }) {
  if (!isOpen) return null;

  const modal = (
    <>
      <div className="ims-admin-modal-backdrop" onClick={onClose} />
      <div className="ims-admin-modal-shell" role="dialog" aria-modal="true">
        <div className={`ims-admin-modal-card ims-admin-modal-${size}`}>
          <div className="ims-admin-modal-header">
            <div>
              <h3>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <SvgIcon name="close" size={18} />
            </button>
          </div>
          <div className="ims-admin-modal-body">{children}</div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}

function FeedbackAlert({ feedback, onClose, isArabic }) {
  if (!feedback?.message) return null;

  const type = feedback.type || 'info';
  const title =
    type === 'success'
      ? isArabic
        ? 'تم بنجاح'
        : 'Success'
      : type === 'danger'
        ? isArabic
          ? 'حدث خطأ'
          : 'Error'
        : isArabic
          ? 'تنبيه'
          : 'Notice';

  return (
    <div className={`ims-admin-feedback ims-admin-feedback-${type}`}>
      <div>
        <strong>{title}</strong>
        <span>{feedback.message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'}>
        <SvgIcon name="close" size={16} />
      </button>
    </div>
  );
}

function ConfirmActionModal({ confirmState, onCancel, onConfirm, isArabic }) {
  return (
    <OverlayModal
      isOpen={Boolean(confirmState.isOpen)}
      title={confirmState.title || (isArabic ? 'تأكيد الإجراء' : 'Confirm Action')}
      subtitle={isArabic ? 'هذا الإجراء قد يؤثر على البيانات.' : 'This action may affect existing data.'}
      onClose={onCancel}
      size="sm"
    >
      <div className="d-grid gap-3">
        <div className="ims-admin-confirm-box">
          {confirmState.message || (isArabic ? 'هل أنت متأكد من تنفيذ هذا الإجراء؟' : 'Are you sure you want to continue?')}
        </div>

        <div className="ims-admin-modal-actions">
          <button type="button" className="ims-admin-secondary-btn" onClick={onCancel}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            className={confirmState.variant === 'primary' ? 'ims-admin-primary-btn' : 'ims-admin-danger-btn'}
            onClick={onConfirm}
          >
            {confirmState.confirmLabel || (isArabic ? 'تأكيد' : 'Confirm')}
          </button>
        </div>
      </div>
    </OverlayModal>
  );
}

function StatusPill({ status, isArabic }) {
  return (
    <span className={`ims-admin-status ims-admin-status-${getStatusTone(status)}`}>
      {getStatusLabel(status, isArabic)}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon, tone = 'teal', onClick }) {
  return (
    <button type="button" className={`ims-admin-stat-card ims-admin-stat-${tone}`} onClick={onClick}>
      <div className="ims-admin-stat-icon">
        <SvgIcon name={icon} size={25} />
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
    <div className="ims-admin-table-filter">
      <SvgIcon name="search" size={15} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
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
    <div className="ims-admin-table-card">
      <div className="ims-admin-table-top">
        <div>
          <strong>
            {isArabic
              ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length}`
              : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length}`}
          </strong>
          <span>{isArabic ? 'الفلاتر داخل رؤوس الأعمدة.' : 'Filters are available in the column headers.'}</span>
        </div>

        <button
          type="button"
          className="ims-admin-secondary-btn"
          disabled={!filteredRows.length}
          onClick={() => exportCsv(exportName || 'administration-data.csv', filteredRows, columns)}
        >
          <SvgIcon name="export" size={17} />
          {isArabic ? 'تصدير' : 'Export'}
        </button>
      </div>

      <div className="ims-admin-table-wrap">
        <table className="ims-admin-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.isAction ? null : (
                    <FilterField
                      value={filters[column.key] || ''}
                      placeholder={column.label}
                      onChange={(value) => updateFilter(column.key, value)}
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
                      {column.render ? column.render(row[column.key], row, false) : row[column.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="ims-admin-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-admin-pagination">
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

function DetailModal({ detailsModal, onClose, isArabic }) {
  return (
    <OverlayModal
      isOpen={detailsModal.isOpen}
      title={detailsModal.title}
      subtitle={isArabic ? 'عرض كامل لقيم السجل المحدد.' : 'Full values for the selected record.'}
      onClose={onClose}
      size="lg"
    >
      {detailsModal.record ? (
        <div className="ims-admin-details-grid">
          {Object.entries(detailsModal.record).map(([key, value]) => (
            <div className="ims-admin-detail-box" key={key}>
              <span>{key}</span>
              <strong>{stringifyValue(value) || '-'}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </OverlayModal>
  );
}

function AdministrationModulePage() {
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'danger',
    onConfirm: null,
  });

  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [invitationBatches, setInvitationBatches] = useState([]);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState([]);
  const [backupJobs, setBackupJobs] = useState([]);
  const [archivedRecords, setArchivedRecords] = useState([]);

  const [userModal, setUserModal] = useState({ isOpen: false, record: null });
  const [invitationModal, setInvitationModal] = useState({ isOpen: false });
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false });
  const [recipientsModal, setRecipientsModal] = useState({ isOpen: false, batch: null, recipients: [] });
  const [adminModal, setAdminModal] = useState({ isOpen: false, type: '', record: null });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, title: '', record: null });

  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'Student',
    status: 'Active',
    password: '',
  });

  const [invitationForm, setInvitationForm] = useState({
    title: '',
    notes: '',
    recipientsText: '',
  });

  const [assignmentForm, setAssignmentForm] = useState({
    advisor_user_id: '',
    student_user_id: '',
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    recipient_user_id: '',
    recipient_email: '',
    type: 'System',
    status: 'Pending',
  });

  const [systemSettingForm, setSystemSettingForm] = useState({
    setting_key: '',
    setting_value: '',
    category: '',
    description: '',
    is_sensitive: false,
  });

  const [backupJobForm, setBackupJobForm] = useState({
    job_name: '',
    job_type: 'Database',
    schedule: '',
    status: 'Pending',
    last_result: '',
  });

  const [archivedRecordForm, setArchivedRecordForm] = useState({
    entity_name: '',
    entity_id: '',
    record_reference: '',
    reason: '',
    snapshot_json: '',
  });

  const loadAdministrationData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const [
        usersResponse,
        studentsResponse,
        advisorsResponse,
        batchesResponse,
        notificationsResponse,
        auditLogsResponse,
        systemSettingsResponse,
        backupJobsResponse,
        archivedRecordsResponse,
      ] = await Promise.all([
        getUsersRequest().catch(() => []),
        getUsersRequest({ role: 'Student' }).catch(() => []),
        getAdvisorsRequest().catch(() => []),
        getInvitationBatchesRequest().catch(() => []),
        getAdminNotificationsRequest().catch(() => []),
        getAdminAuditLogsRequest().catch(() => []),
        getAdminSystemSettingsRequest().catch(() => []),
        getAdminBackupJobsRequest().catch(() => []),
        getAdminArchivedRecordsRequest().catch(() => []),
      ]);

      const normalizedUsers = Array.isArray(usersResponse) ? usersResponse.map(normalizeUser) : [];
      const normalizedStudents = Array.isArray(studentsResponse)
        ? studentsResponse.map(normalizeStudent)
        : normalizedUsers.filter((item) => String(item.role).toLowerCase() === 'student');
      const normalizedAdvisors = Array.isArray(advisorsResponse) ? advisorsResponse.map(normalizeAdvisor) : [];
      const normalizedBatches = Array.isArray(batchesResponse) ? batchesResponse.map(normalizeInvitationBatch) : [];

      setUsers(normalizedUsers);
      setStudents(normalizedStudents);
      setAdvisors(normalizedAdvisors);
      setInvitationBatches(normalizedBatches);
      setNotifications(Array.isArray(notificationsResponse) ? notificationsResponse : []);
      setAuditLogs(Array.isArray(auditLogsResponse) ? auditLogsResponse : []);
      setSystemSettings(Array.isArray(systemSettingsResponse) ? systemSettingsResponse : []);
      setBackupJobs(Array.isArray(backupJobsResponse) ? backupJobsResponse : []);
      setArchivedRecords(Array.isArray(archivedRecordsResponse) ? archivedRecordsResponse : []);

      const firstAdvisorId = normalizedAdvisors[0]?.id ? String(normalizedAdvisors[0].id) : '';
      setSelectedAdvisorId((current) => current || firstAdvisorId);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load administration data.');
      setUsers([]);
      setStudents([]);
      setAdvisors([]);
      setInvitationBatches([]);
      setAdvisorStudents([]);
      setNotifications([]);
      setAuditLogs([]);
      setSystemSettings([]);
      setBackupJobs([]);
      setArchivedRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdministrationData();
  }, []);

  useEffect(() => {
    const loadAdvisorStudents = async () => {
      if (!selectedAdvisorId) {
        setAdvisorStudents([]);
        return;
      }

      const rows = await getAdvisorStudentsRequest(selectedAdvisorId).catch(() => []);
      setAdvisorStudents(Array.isArray(rows) ? rows : []);
    };

    loadAdvisorStudents();
  }, [selectedAdvisorId]);

  const currentRows = useMemo(() => {
    switch (activeTab) {
      case 'users':
        return users;
      case 'invitations':
        return invitationBatches;
      case 'advisorAssignments':
        return advisorStudents;
      case 'notifications':
        return notifications;
      case 'auditLogs':
        return auditLogs;
      case 'systemConfigurations':
        return systemSettings;
      case 'backupJobs':
        return backupJobs;
      case 'archivedRecords':
        return archivedRecords;
      default:
        return [];
    }
  }, [activeTab, advisorStudents, archivedRecords, auditLogs, backupJobs, invitationBatches, notifications, systemSettings, users]);

  const stats = useMemo(
    () => ({
      users: users.length,
      students: students.length,
      advisors: advisors.length,
      invitations: invitationBatches.length,
      notifications: notifications.length,
      auditLogs: auditLogs.length,
      systemSettings: systemSettings.length,
      backupJobs: backupJobs.length,
      archivedRecords: archivedRecords.length,
      runningBackups: backupJobs.filter((item) => String(item.status || '').toLowerCase() === 'running').length,
      failedBackups: backupJobs.filter((item) => String(item.status || '').toLowerCase() === 'failed').length,
    }),
    [
      advisors.length,
      archivedRecords.length,
      auditLogs.length,
      backupJobs,
      invitationBatches.length,
      notifications.length,
      students.length,
      systemSettings.length,
      users.length,
    ]
  );

  const clearFeedback = () => setFeedback({ type: '', message: '' });
  const showSuccess = (message) => setFeedback({ type: 'success', message });
  const showError = (message) => setFeedback({ type: 'danger', message });

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
    if (typeof action === 'function') await action();
  };

  const openCreateUserModal = () => {
    setUserForm({ full_name: '', email: '', role: 'Student', status: 'Active', password: '' });
    setUserModal({ isOpen: true, record: null });
  };

  const openEditUserModal = (record) => {
    setUserForm({
      full_name: record.full_name || '',
      email: record.email || '',
      role: record.role || 'Student',
      status: record.status || 'Active',
      password: '',
    });
    setUserModal({ isOpen: true, record });
  };

  const handleSaveUser = async (event) => {
    event.preventDefault();

    const payload = {
      full_name: userForm.full_name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      status: userForm.status,
    };

    if (!payload.full_name || !payload.email) {
      showError(isArabic ? 'الاسم والبريد الإلكتروني مطلوبان.' : 'Full name and email are required.');
      return;
    }

    if (!userModal.record && !userForm.password) {
      showError(isArabic ? 'كلمة المرور مطلوبة عند إنشاء مستخدم جديد.' : 'Password is required when creating a new user.');
      return;
    }

    if (userForm.password) payload.password = userForm.password;

    try {
      if (userModal.record?.id) {
        await updateUserRequest(userModal.record.id, payload);
      } else {
        await createUserRequest(payload);
      }

      setUserModal({ isOpen: false, record: null });
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم حفظ المستخدم بنجاح.' : 'User saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save user.');
    }
  };

  const handleDeleteUser = (record) => {
    openConfirm({
      title: isArabic ? 'حذف مستخدم' : 'Delete User',
      message: isArabic ? `هل تريد حذف المستخدم ${record.full_name}؟` : `Do you want to delete ${record.full_name}?`,
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteUserRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم حذف المستخدم بنجاح.' : 'User deleted successfully.');
        } catch (error) {
          showError(error.message || 'Failed to delete user.');
        }
      },
    });
  };

  const handleCreateInvitationBatch = async (event) => {
    event.preventDefault();

    const recipients = invitationForm.recipientsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!invitationForm.title.trim()) {
      showError(isArabic ? 'اسم دفعة الدعوات مطلوب.' : 'Invitation batch title is required.');
      return;
    }

    if (!recipients.length) {
      showError(isArabic ? 'أدخل بريدًا واحدًا على الأقل.' : 'Please enter at least one recipient email.');
      return;
    }

    try {
      await createInvitationBatchRequest({
        title: invitationForm.title.trim(),
        batch_name: invitationForm.title.trim(),
        notes: invitationForm.notes,
        created_by_user_id: user?.id,
        recipients,
        emails: recipients,
      });

      setInvitationModal({ isOpen: false });
      setInvitationForm({ title: '', notes: '', recipientsText: '' });
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم إنشاء دفعة الدعوات بنجاح.' : 'Invitation batch created successfully.');
    } catch (error) {
      showError(error.message || 'Failed to create invitation batch.');
    }
  };

  const handleViewRecipients = async (batch) => {
    const rows = await getInvitationRecipientsRequest(batch.id).catch(() => []);
    setRecipientsModal({ isOpen: true, batch, recipients: Array.isArray(rows) ? rows : [] });
  };

  const handleAssignStudent = async (event) => {
    event.preventDefault();

    if (!assignmentForm.advisor_user_id || !assignmentForm.student_user_id) {
      showError(isArabic ? 'اختر المشرف والطالب أولًا.' : 'Please select both advisor and student.');
      return;
    }

    try {
      await assignStudentAdvisorRequest({
        advisor_user_id: Number(assignmentForm.advisor_user_id),
        student_user_id: Number(assignmentForm.student_user_id),
        assigned_by_user_id: user?.id ? Number(user.id) : null,
        status: 'Active',
      });

      setAssignmentModal({ isOpen: false });
      setSelectedAdvisorId(String(assignmentForm.advisor_user_id));
      setAssignmentForm({ advisor_user_id: '', student_user_id: '' });
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم ربط الطالب بالمشرف بنجاح.' : 'Student assigned to advisor successfully.');
    } catch (error) {
      showError(error.message || 'Failed to assign student to advisor.');
    }
  };

  const openAdminModal = (type, record = null) => {
    setAdminModal({ isOpen: true, type, record });

    if (type === 'notification') {
      setNotificationForm({
        title: record?.title || '',
        message: record?.message || '',
        recipient_user_id: record?.recipient_user_id ? String(record.recipient_user_id) : '',
        recipient_email: record?.recipient_email || '',
        type: record?.type || 'System',
        status: record?.status || 'Pending',
      });
    }

    if (type === 'systemSetting') {
      setSystemSettingForm({
        setting_key: record?.setting_key || '',
        setting_value: record?.setting_value === '********' ? '' : record?.setting_value || '',
        category: record?.category || '',
        description: record?.description || '',
        is_sensitive: Boolean(record?.is_sensitive),
      });
    }

    if (type === 'backupJob') {
      setBackupJobForm({
        job_name: record?.job_name || '',
        job_type: record?.job_type || 'Database',
        schedule: record?.schedule || '',
        status: record?.status || 'Pending',
        last_result: record?.last_result || '',
      });
    }

    if (type === 'archivedRecord') {
      setArchivedRecordForm({
        entity_name: record?.entity_name || '',
        entity_id: record?.entity_id || '',
        record_reference: record?.record_reference || '',
        reason: record?.reason || '',
        snapshot_json: record?.snapshot_json || '',
      });
    }
  };

  const closeAdminModal = () => setAdminModal({ isOpen: false, type: '', record: null });

  const handleSaveNotification = async (event) => {
    event.preventDefault();

    if (!notificationForm.title.trim()) {
      showError(isArabic ? 'عنوان الإشعار مطلوب.' : 'Notification title is required.');
      return;
    }

    const payload = {
      title: notificationForm.title.trim(),
      message: notificationForm.message,
      recipient_user_id: notificationForm.recipient_user_id ? Number(notificationForm.recipient_user_id) : null,
      recipient_email: notificationForm.recipient_email || null,
      type: notificationForm.type,
      status: notificationForm.status,
    };

    try {
      if (adminModal.record?.id) {
        await updateAdminNotificationRequest(adminModal.record.id, payload);
      } else {
        await createAdminNotificationRequest(payload);
      }
      closeAdminModal();
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم حفظ الإشعار بنجاح.' : 'Notification saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save notification.');
    }
  };

  const handleDeleteNotification = (record) => {
    openConfirm({
      title: isArabic ? 'حذف إشعار' : 'Delete Notification',
      message: isArabic ? 'هل تريد حذف هذا الإشعار؟' : 'Delete this notification?',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdminNotificationRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم حذف الإشعار بنجاح.' : 'Notification deleted successfully.');
        } catch (error) {
          showError(error.message || 'Failed to delete notification.');
        }
      },
    });
  };

  const handleSaveSystemSetting = async (event) => {
    event.preventDefault();

    if (!systemSettingForm.setting_key.trim()) {
      showError(isArabic ? 'مفتاح الإعداد مطلوب.' : 'Setting key is required.');
      return;
    }

    const payload = {
      setting_key: systemSettingForm.setting_key.trim(),
      setting_value: systemSettingForm.setting_value,
      category: systemSettingForm.category,
      description: systemSettingForm.description,
      is_sensitive: Boolean(systemSettingForm.is_sensitive),
    };

    try {
      if (adminModal.record?.id) {
        await updateAdminSystemSettingRequest(adminModal.record.id, payload);
      } else {
        await createAdminSystemSettingRequest(payload);
      }
      closeAdminModal();
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم حفظ إعداد النظام بنجاح.' : 'System setting saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save system setting.');
    }
  };

  const handleDeleteSystemSetting = (record) => {
    openConfirm({
      title: isArabic ? 'حذف إعداد النظام' : 'Delete System Setting',
      message: isArabic ? 'هل تريد حذف إعداد النظام؟' : 'Delete this system setting?',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdminSystemSettingRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم حذف إعداد النظام بنجاح.' : 'System setting deleted successfully.');
        } catch (error) {
          showError(error.message || 'Failed to delete system setting.');
        }
      },
    });
  };

  const handleSaveBackupJob = async (event) => {
    event.preventDefault();

    if (!backupJobForm.job_name.trim()) {
      showError(isArabic ? 'اسم مهمة النسخ الاحتياطي مطلوب.' : 'Backup job name is required.');
      return;
    }

    const payload = {
      job_name: backupJobForm.job_name.trim(),
      job_type: backupJobForm.job_type,
      schedule: backupJobForm.schedule,
      status: backupJobForm.status,
      last_result: backupJobForm.last_result,
    };

    try {
      if (adminModal.record?.id) {
        await updateAdminBackupJobRequest(adminModal.record.id, payload);
      } else {
        await createAdminBackupJobRequest(payload);
      }
      closeAdminModal();
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم حفظ مهمة النسخ بنجاح.' : 'Backup job saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save backup job.');
    }
  };

  const handleRunBackupJob = (record) => {
    openConfirm({
      title: isArabic ? 'تشغيل مهمة النسخ' : 'Run Backup Job',
      message: isArabic ? 'هل تريد تسجيل تشغيل يدوي لهذه المهمة؟' : 'Run this backup job now?',
      confirmLabel: isArabic ? 'تشغيل' : 'Run',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await runAdminBackupJobRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم تسجيل تشغيل مهمة النسخ بنجاح.' : 'Backup job run was recorded successfully.');
        } catch (error) {
          showError(error.message || 'Failed to run backup job.');
        }
      },
    });
  };

  const handleDeleteBackupJob = (record) => {
    openConfirm({
      title: isArabic ? 'حذف مهمة النسخ الاحتياطي' : 'Delete Backup Job',
      message: isArabic ? 'هل تريد حذف مهمة النسخ الاحتياطي؟' : 'Delete this backup job?',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdminBackupJobRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم حذف مهمة النسخ بنجاح.' : 'Backup job deleted successfully.');
        } catch (error) {
          showError(error.message || 'Failed to delete backup job.');
        }
      },
    });
  };

  const handleSaveArchivedRecord = async (event) => {
    event.preventDefault();

    if (!archivedRecordForm.entity_name.trim()) {
      showError(isArabic ? 'اسم الكيان مطلوب.' : 'Entity name is required.');
      return;
    }

    if (archivedRecordForm.snapshot_json.trim()) {
      try {
        JSON.parse(archivedRecordForm.snapshot_json);
      } catch {
        showError(isArabic ? 'صيغة JSON غير صحيحة.' : 'Invalid JSON snapshot.');
        return;
      }
    }

    const payload = {
      entity_name: archivedRecordForm.entity_name.trim(),
      entity_id: archivedRecordForm.entity_id,
      record_reference: archivedRecordForm.record_reference,
      reason: archivedRecordForm.reason,
      snapshot_json: archivedRecordForm.snapshot_json || null,
    };

    try {
      await createAdminArchivedRecordRequest(payload);
      closeAdminModal();
      await loadAdministrationData();
      showSuccess(isArabic ? 'تم حفظ السجل المؤرشف بنجاح.' : 'Archived record saved successfully.');
    } catch (error) {
      showError(error.message || 'Failed to save archived record.');
    }
  };

  const handleDeleteArchivedRecord = (record) => {
    openConfirm({
      title: isArabic ? 'حذف سجل مؤرشف' : 'Delete Archived Record',
      message: isArabic ? 'هل تريد حذف السجل المؤرشف؟' : 'Delete this archived record?',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAdminArchivedRecordRequest(record.id);
          await loadAdministrationData();
          showSuccess(isArabic ? 'تم حذف السجل المؤرشف بنجاح.' : 'Archived record deleted successfully.');
        } catch (error) {
          showError(error.message || 'Failed to delete archived record.');
        }
      },
    });
  };

  const userRoleTone = (role) => {
    const value = String(role || '').toLowerCase();
    if (value === 'administrator') return 'purple';
    if (value === 'academicadvisor') return 'blue';
    if (value === 'companyadvisor') return 'green';
    return 'teal';
  };

  const usersColumns = [
    {
      key: 'full_name',
      label: isArabic ? 'الاسم' : 'Name',
      render: (value, row) => (
        <div className="ims-admin-person">
          <div className={`ims-admin-avatar ims-admin-avatar-${userRoleTone(row.role)}`}>{String(value || '-').slice(0, 1)}</div>
          <div>
            <strong>{value || '-'}</strong>
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
      exportValue: (row) => row.full_name,
      filterValue: (row) => `${row.full_name} ${row.email}`,
    },
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    {
      key: 'role',
      label: isArabic ? 'الدور' : 'Role',
      render: (value) => <span className="ims-admin-badge">{value || '-'}</span>,
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill status={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'created_at',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.created_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-admin-row-actions">
          <button type="button" className="ims-admin-row-btn" onClick={() => openEditUserModal(row)}>
            <SvgIcon name="edit" size={15} />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="ims-admin-row-btn danger" onClick={() => handleDeleteUser(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const invitationColumns = [
    {
      key: 'title',
      label: isArabic ? 'دفعة الدعوات' : 'Batch',
      render: (value) => <strong className="ims-admin-primary-text">{value || '-'}</strong>,
    },
    { key: 'total_recipients', label: isArabic ? 'عدد المستلمين' : 'Recipients' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill status={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    { key: 'created_by', label: isArabic ? 'أنشئت بواسطة' : 'Created By' },
    {
      key: 'created_at',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.created_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button type="button" className="ims-admin-row-btn" onClick={() => handleViewRecipients(row)}>
          <SvgIcon name="eye" size={15} />
          {isArabic ? 'المستلمون' : 'Recipients'}
        </button>
      ),
    },
  ];

  const advisorStudentColumns = [
    {
      key: 'full_name',
      label: isArabic ? 'الطالب' : 'Student',
      render: (value, row) => (
        <div className="ims-admin-person">
          <div className="ims-admin-avatar ims-admin-avatar-teal">{String(value || '-').slice(0, 1)}</div>
          <div>
            <strong>{value || '-'}</strong>
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
      filterValue: (row) => `${row.full_name || ''} ${row.email || ''}`,
      exportValue: (row) => row.full_name,
    },
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    { key: 'student_code', label: isArabic ? 'الرقم الجامعي' : 'Student Code' },
    { key: 'major', label: isArabic ? 'التخصص' : 'Major' },
    { key: 'university', label: isArabic ? 'الجامعة' : 'University' },
    {
      key: 'assignment_start_at',
      label: isArabic ? 'تاريخ الربط' : 'Assigned At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.assignment_start_at, locale),
    },
  ];

  const notificationColumns = [
    {
      key: 'title',
      label: isArabic ? 'العنوان' : 'Title',
      render: (value) => <strong className="ims-admin-primary-text">{value || '-'}</strong>,
    },
    {
      key: 'recipient_name',
      label: isArabic ? 'المستلم' : 'Recipient',
      render: (_, row) => row.recipient_name || row.recipient_email || '-',
      filterValue: (row) => `${row.recipient_name || ''} ${row.recipient_email || ''}`,
      exportValue: (row) => row.recipient_name || row.recipient_email || '-',
    },
    { key: 'type', label: isArabic ? 'النوع' : 'Type' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill status={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'created_at',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.created_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-admin-row-actions">
          <button type="button" className="ims-admin-row-btn" onClick={() => openAdminModal('notification', row)}>
            <SvgIcon name="edit" size={15} />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="ims-admin-row-btn" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل الإشعار' : 'Notification Details', record: row })}>
            <SvgIcon name="eye" size={15} />
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="ims-admin-row-btn danger" onClick={() => handleDeleteNotification(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const auditLogColumns = [
    { key: 'actor_name', label: isArabic ? 'المنفذ' : 'Actor' },
    {
      key: 'action',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (value) => <span className="ims-admin-badge">{value || '-'}</span>,
    },
    { key: 'entity_name', label: isArabic ? 'الكيان' : 'Entity' },
    { key: 'entity_id', label: isArabic ? 'معرف السجل' : 'Record ID' },
    { key: 'ip_address', label: 'IP' },
    {
      key: 'created_at',
      label: isArabic ? 'التاريخ' : 'Created At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.created_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button type="button" className="ims-admin-row-btn" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل سجل التدقيق' : 'Audit Log Details', record: row })}>
          <SvgIcon name="eye" size={15} />
          {isArabic ? 'عرض' : 'View'}
        </button>
      ),
    },
  ];

  const systemSettingColumns = [
    {
      key: 'setting_key',
      label: isArabic ? 'المفتاح' : 'Key',
      render: (value) => <strong className="ims-admin-primary-text">{value || '-'}</strong>,
    },
    { key: 'setting_value', label: isArabic ? 'القيمة' : 'Value' },
    { key: 'category', label: isArabic ? 'التصنيف' : 'Category' },
    {
      key: 'is_sensitive',
      label: isArabic ? 'حساس' : 'Sensitive',
      render: (value) => (value ? <span className="ims-admin-badge danger">{isArabic ? 'نعم' : 'Yes'}</span> : <span className="ims-admin-badge">{isArabic ? 'لا' : 'No'}</span>),
      exportValue: (row) => (row.is_sensitive ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')),
      filterValue: (row) => (row.is_sensitive ? 'yes نعم' : 'no لا'),
    },
    {
      key: 'updated_at',
      label: isArabic ? 'آخر تحديث' : 'Updated At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.updated_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-admin-row-actions">
          <button type="button" className="ims-admin-row-btn" onClick={() => openAdminModal('systemSetting', row)}>
            <SvgIcon name="edit" size={15} />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="ims-admin-row-btn danger" onClick={() => handleDeleteSystemSetting(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const backupJobColumns = [
    {
      key: 'job_name',
      label: isArabic ? 'اسم المهمة' : 'Job Name',
      render: (value) => <strong className="ims-admin-primary-text">{value || '-'}</strong>,
    },
    { key: 'job_type', label: isArabic ? 'النوع' : 'Type' },
    { key: 'schedule', label: isArabic ? 'الجدولة' : 'Schedule' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill status={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'last_run_at',
      label: isArabic ? 'آخر تشغيل' : 'Last Run',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.last_run_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-admin-row-actions">
          <button type="button" className="ims-admin-row-btn primary" onClick={() => handleRunBackupJob(row)}>
            <SvgIcon name="run" size={15} />
            {isArabic ? 'تشغيل' : 'Run'}
          </button>
          <button type="button" className="ims-admin-row-btn" onClick={() => openAdminModal('backupJob', row)}>
            <SvgIcon name="edit" size={15} />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="ims-admin-row-btn" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل مهمة النسخ' : 'Backup Job Details', record: row })}>
            <SvgIcon name="eye" size={15} />
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="ims-admin-row-btn danger" onClick={() => handleDeleteBackupJob(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const archivedRecordColumns = [
    {
      key: 'entity_name',
      label: isArabic ? 'الكيان' : 'Entity',
      render: (value) => <strong className="ims-admin-primary-text">{value || '-'}</strong>,
    },
    { key: 'entity_id', label: isArabic ? 'معرف السجل' : 'Entity ID' },
    { key: 'record_reference', label: isArabic ? 'المرجع' : 'Reference' },
    { key: 'archived_by_name', label: isArabic ? 'أرشف بواسطة' : 'Archived By' },
    {
      key: 'archived_at',
      label: isArabic ? 'تاريخ الأرشفة' : 'Archived At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.archived_at, locale),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-admin-row-actions">
          <button type="button" className="ims-admin-row-btn" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل السجل المؤرشف' : 'Archived Record Details', record: row })}>
            <SvgIcon name="eye" size={15} />
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="ims-admin-row-btn danger" onClick={() => handleDeleteArchivedRecord(row)}>
            <SvgIcon name="trash" size={15} />
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const recipientsColumns = [
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    { key: 'full_name', label: isArabic ? 'الاسم' : 'Name' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill status={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'sent_at',
      label: isArabic ? 'تاريخ الإرسال' : 'Sent At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.sent_at, locale),
    },
    {
      key: 'registered_at',
      label: isArabic ? 'تاريخ التسجيل' : 'Registered At',
      render: (value) => formatDateTime(value, locale),
      exportValue: (row) => formatDateTime(row.registered_at, locale),
    },
  ];

  const activeColumns =
    activeTab === 'users'
      ? usersColumns
      : activeTab === 'invitations'
        ? invitationColumns
        : activeTab === 'advisorAssignments'
          ? advisorStudentColumns
          : activeTab === 'notifications'
            ? notificationColumns
            : activeTab === 'auditLogs'
              ? auditLogColumns
              : activeTab === 'systemConfigurations'
                ? systemSettingColumns
                : activeTab === 'backupJobs'
                  ? backupJobColumns
                  : archivedRecordColumns;

  const activeTabConfig = administrationTabs.find((item) => item.key === activeTab) || administrationTabs[0];

  const activeTitle =
    activeTab === 'users'
      ? isArabic ? 'إدارة المستخدمين' : 'Users Management'
      : activeTab === 'invitations'
        ? isArabic ? 'الدعوات' : 'Invitations'
        : activeTab === 'advisorAssignments'
          ? isArabic ? 'ربط الطلاب بالمشرفين' : 'Advisor Assignments'
          : activeTab === 'notifications'
            ? isArabic ? 'الإشعارات' : 'Notifications'
            : activeTab === 'auditLogs'
              ? isArabic ? 'سجل التدقيق' : 'Audit Log'
              : activeTab === 'systemConfigurations'
                ? isArabic ? 'إعدادات النظام' : 'System Configuration'
                : activeTab === 'backupJobs'
                  ? isArabic ? 'مهام النسخ الاحتياطي' : 'Backup Jobs'
                  : isArabic ? 'السجلات المؤرشفة' : 'Archived Records';

  const activeSubtitle =
    activeTab === 'auditLogs'
      ? isArabic ? 'سجلات التدقيق تُنشأ تلقائيًا من النظام ولا تحتاج تعديلًا يدويًا.' : 'Audit logs are generated automatically by system actions.'
      : activeTab === 'advisorAssignments'
        ? isArabic ? 'اختر مشرفًا لعرض الطلاب المرتبطين به، أو اربط طالبًا جديدًا.' : 'Select an advisor to view assigned students, or assign a new student.'
        : isArabic ? 'كل البيانات مرتبطة بواجهات API الحقيقية بدون أرقام وهمية.' : 'All data is connected to live API endpoints without dummy values.';

  const addLabel =
    activeTab === 'users'
      ? isArabic ? 'إضافة مستخدم' : 'Add User'
      : activeTab === 'invitations'
        ? isArabic ? 'إضافة دعوة' : 'Add Invitation Batch'
        : activeTab === 'advisorAssignments'
          ? isArabic ? 'ربط طالب بمشرف' : 'Assign Student'
          : activeTab === 'notifications'
            ? isArabic ? 'إضافة إشعار' : 'Add Notification'
            : activeTab === 'systemConfigurations'
              ? isArabic ? 'إضافة إعداد' : 'Add Setting'
              : activeTab === 'backupJobs'
                ? isArabic ? 'إضافة مهمة نسخ' : 'Add Backup Job'
                : activeTab === 'archivedRecords'
                  ? isArabic ? 'إضافة سجل مؤرشف' : 'Add Archived Record'
                  : '';

  const onAddClick =
    activeTab === 'users'
      ? openCreateUserModal
      : activeTab === 'invitations'
        ? () => setInvitationModal({ isOpen: true })
        : activeTab === 'advisorAssignments'
          ? () => setAssignmentModal({ isOpen: true })
          : activeTab === 'notifications'
            ? () => openAdminModal('notification')
            : activeTab === 'systemConfigurations'
              ? () => openAdminModal('systemSetting')
              : activeTab === 'backupJobs'
                ? () => openAdminModal('backupJob')
                : activeTab === 'archivedRecords'
                  ? () => openAdminModal('archivedRecord')
                  : null;

  const statCards = [
    {
      title: isArabic ? 'المستخدمون' : 'Users',
      value: formatNumber(stats.users, locale),
      subtitle: isArabic ? `الطلاب: ${formatNumber(stats.students, locale)}` : `Students: ${formatNumber(stats.students, locale)}`,
      icon: 'users',
      tone: 'teal',
      tab: 'users',
    },
    {
      title: isArabic ? 'الدعوات' : 'Invitations',
      value: formatNumber(stats.invitations, locale),
      subtitle: isArabic ? 'دفعات دعوات مسجلة' : 'Invitation batches',
      icon: 'mail',
      tone: 'blue',
      tab: 'invitations',
    },
    {
      title: isArabic ? 'الإشعارات' : 'Notifications',
      value: formatNumber(stats.notifications, locale),
      subtitle: isArabic ? 'تنبيهات النظام' : 'System messages',
      icon: 'bell',
      tone: 'purple',
      tab: 'notifications',
    },
    {
      title: isArabic ? 'مهام النسخ' : 'Backup Jobs',
      value: formatNumber(stats.backupJobs, locale),
      subtitle: isArabic ? `فاشلة: ${formatNumber(stats.failedBackups, locale)}` : `Failed: ${formatNumber(stats.failedBackups, locale)}`,
      icon: 'database',
      tone: 'green',
      tab: 'backupJobs',
    },
  ];

  if (loading) {
    return (
      <div className="ims-admin-page">
        <style>{styles}</style>
        <div className="ims-admin-loading-panel">
          <div className="spinner-border spinner-border-sm" role="status" />
          <span>{isArabic ? 'جارٍ تحميل بيانات الإدارة...' : 'Loading administration data...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ims-admin-page">
      <style>{styles}</style>

      <section className="ims-admin-hero">
        <div className="ims-admin-hero-main">
          <div className="ims-admin-hero-icon">
            <SvgIcon name="admin" size={42} />
          </div>
          <div>
            <h1>{isArabic ? 'الإدارة العامة' : 'Administration'}</h1>
            <p>
              {isArabic
                ? 'إدارة المستخدمين، الدعوات، ربط الطلاب بالمشرفين، الإشعارات، سجلات التدقيق، الإعدادات، النسخ الاحتياطي، والأرشفة من واجهة واحدة.'
                : 'Manage users, invitations, advisor assignments, notifications, audit logs, settings, backup jobs, and archived records from one unified interface.'}
            </p>
          </div>
        </div>

        <div className="ims-admin-hero-actions">
          <button type="button" className="ims-admin-secondary-btn" onClick={loadAdministrationData}>
            <SvgIcon name="refresh" size={18} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </button>

          {onAddClick ? (
            <button type="button" className="ims-admin-primary-btn" onClick={onAddClick}>
              <SvgIcon name="plus" size={18} />
              {addLabel}
            </button>
          ) : null}
        </div>
      </section>

      {errorMessage ? (
        <div className="ims-admin-feedback ims-admin-feedback-danger">
          <div>
            <strong>{isArabic ? 'حدث خطأ' : 'Error'}</strong>
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage('')}>
            <SvgIcon name="close" size={16} />
          </button>
        </div>
      ) : null}

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} isArabic={isArabic} />

      <section className="ims-admin-stat-grid">
        {statCards.map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            icon={item.icon}
            tone={item.tone}
            onClick={() => setActiveTab(item.tab)}
          />
        ))}
      </section>

      <section className="ims-admin-tabs">
        {administrationTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            <SvgIcon name={tab.icon} size={18} />
            {t(tab.label)}
            <span>
              {tab.key === 'users'
                ? formatNumber(stats.users, locale)
                : tab.key === 'invitations'
                  ? formatNumber(stats.invitations, locale)
                  : tab.key === 'advisorAssignments'
                    ? formatNumber(advisorStudents.length, locale)
                    : tab.key === 'notifications'
                      ? formatNumber(stats.notifications, locale)
                      : tab.key === 'auditLogs'
                        ? formatNumber(stats.auditLogs, locale)
                        : tab.key === 'systemConfigurations'
                          ? formatNumber(stats.systemSettings, locale)
                          : tab.key === 'backupJobs'
                            ? formatNumber(stats.backupJobs, locale)
                            : formatNumber(stats.archivedRecords, locale)}
            </span>
          </button>
        ))}
      </section>

      <section className="ims-admin-content-card">
        <div className="ims-admin-section-head">
          <div>
            <div className="ims-admin-section-title">
              <div className="ims-admin-section-icon">
                <SvgIcon name={activeTabConfig.icon} size={21} />
              </div>
              <div>
                <h2>{activeTitle}</h2>
                <p>{activeSubtitle}</p>
              </div>
            </div>
          </div>

          {onAddClick && activeTab !== 'auditLogs' ? (
            <button type="button" className="ims-admin-primary-btn" onClick={onAddClick}>
              <SvgIcon name="plus" size={18} />
              {addLabel}
            </button>
          ) : null}
        </div>

        {activeTab === 'advisorAssignments' ? (
          <div className="ims-admin-advisor-filter">
            <label>{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</label>
            <select value={selectedAdvisorId} onChange={(event) => setSelectedAdvisorId(event.target.value)}>
              <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.full_name} — {advisor.email}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <DataTable
          columns={activeColumns}
          rows={currentRows}
          rowKey="id"
          emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No records found.'}
          exportName={`administration-${activeTab}.csv`}
          isArabic={isArabic}
        />
      </section>

      <OverlayModal
        isOpen={userModal.isOpen}
        title={userModal.record ? (isArabic ? 'تعديل مستخدم' : 'Edit User') : (isArabic ? 'إضافة مستخدم' : 'Add User')}
        subtitle={isArabic ? 'أدخل بيانات المستخدم وحدد الدور والحالة.' : 'Enter user data and assign role/status.'}
        onClose={() => setUserModal({ isOpen: false, record: null })}
        size="md"
      >
        <form onSubmit={handleSaveUser} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'الاسم الكامل' : 'Full Name'}</span>
            <input value={userForm.full_name} onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'البريد الإلكتروني' : 'Email'}</span>
            <input type="email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'الدور' : 'Role'}</span>
            <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'الحالة' : 'Status'}</span>
            <select value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{userModal.record ? (isArabic ? 'كلمة مرور جديدة، اختياري' : 'New password, optional') : (isArabic ? 'كلمة المرور' : 'Password')}</span>
            <input type="password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={() => setUserModal({ isOpen: false, record: null })}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-admin-primary-btn">
              {isArabic ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={invitationModal.isOpen}
        title={isArabic ? 'إضافة دفعة دعوات' : 'Add Invitation Batch'}
        subtitle={isArabic ? 'أدخل عنوان الدفعة وأضف البريد الإلكتروني لكل طالب في سطر مستقل.' : 'Enter the batch title and one student email per line.'}
        onClose={() => setInvitationModal({ isOpen: false })}
        size="md"
      >
        <form onSubmit={handleCreateInvitationBatch} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'اسم دفعة الدعوات' : 'Invitation Batch Title'}</span>
            <input value={invitationForm.title} onChange={(event) => setInvitationForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'ملاحظات' : 'Notes'}</span>
            <textarea rows="3" value={invitationForm.notes} onChange={(event) => setInvitationForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'المستلمون' : 'Recipients'}</span>
            <textarea rows="7" value={invitationForm.recipientsText} onChange={(event) => setInvitationForm((current) => ({ ...current, recipientsText: event.target.value }))} placeholder={isArabic ? 'ضع كل بريد في سطر مستقل' : 'Enter one email per line'} required />
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={() => setInvitationModal({ isOpen: false })}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-admin-primary-btn">
              {isArabic ? 'إنشاء' : 'Create'}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={assignmentModal.isOpen}
        title={isArabic ? 'ربط طالب بمشرف' : 'Assign Student to Advisor'}
        subtitle={isArabic ? 'اختر المشرف الأكاديمي ثم الطالب المراد ربطه.' : 'Select the academic advisor and the student to assign.'}
        onClose={() => setAssignmentModal({ isOpen: false })}
        size="md"
      >
        <form onSubmit={handleAssignStudent} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</span>
            <select value={assignmentForm.advisor_user_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, advisor_user_id: event.target.value }))} required>
              <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
              {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.full_name} — {advisor.email}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'الطالب' : 'Student'}</span>
            <select value={assignmentForm.student_user_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, student_user_id: event.target.value }))} required>
              <option value="">{isArabic ? 'اختر الطالب' : 'Select student'}</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name} — {student.email}</option>)}
            </select>
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={() => setAssignmentModal({ isOpen: false })}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-admin-primary-btn">
              {isArabic ? 'ربط' : 'Assign'}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={recipientsModal.isOpen}
        title={isArabic ? 'مستلمو الدعوة' : 'Invitation Recipients'}
        subtitle={recipientsModal.batch?.title || ''}
        onClose={() => setRecipientsModal({ isOpen: false, batch: null, recipients: [] })}
        size="xl"
      >
        <DataTable
          columns={recipientsColumns}
          rows={recipientsModal.recipients}
          rowKey="id"
          emptyMessage={isArabic ? 'لا يوجد مستلمون.' : 'No recipients found.'}
          exportName="invitation-recipients.csv"
          isArabic={isArabic}
        />
      </OverlayModal>

      <OverlayModal
        isOpen={adminModal.isOpen && adminModal.type === 'notification'}
        title={adminModal.record ? (isArabic ? 'تعديل إشعار' : 'Edit Notification') : (isArabic ? 'إضافة إشعار' : 'Add Notification')}
        subtitle={isArabic ? 'أدخل محتوى الإشعار والمستلم والحالة.' : 'Enter notification content, recipient, and status.'}
        onClose={closeAdminModal}
        size="md"
      >
        <form onSubmit={handleSaveNotification} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'العنوان' : 'Title'}</span>
            <input value={notificationForm.title} onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'نص الإشعار' : 'Message'}</span>
            <textarea rows="4" value={notificationForm.message} onChange={(event) => setNotificationForm((current) => ({ ...current, message: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'المستخدم المستلم' : 'Recipient User'}</span>
            <select value={notificationForm.recipient_user_id} onChange={(event) => setNotificationForm((current) => ({ ...current, recipient_user_id: event.target.value }))}>
              <option value="">{isArabic ? 'بدون مستخدم محدد' : 'No specific user'}</option>
              {users.map((item) => <option key={item.id} value={item.id}>{item.full_name} — {item.email}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'بريد المستلم' : 'Recipient Email'}</span>
            <input type="email" value={notificationForm.recipient_email} onChange={(event) => setNotificationForm((current) => ({ ...current, recipient_email: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'النوع' : 'Type'}</span>
            <select value={notificationForm.type} onChange={(event) => setNotificationForm((current) => ({ ...current, type: event.target.value }))}>
              {notificationTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'الحالة' : 'Status'}</span>
            <select value={notificationForm.status} onChange={(event) => setNotificationForm((current) => ({ ...current, status: event.target.value }))}>
              {notificationStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="ims-admin-primary-btn">{isArabic ? 'حفظ' : 'Save'}</button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={adminModal.isOpen && adminModal.type === 'systemSetting'}
        title={adminModal.record ? (isArabic ? 'تعديل إعداد' : 'Edit System Setting') : (isArabic ? 'إضافة إعداد' : 'Add System Setting')}
        subtitle={isArabic ? 'أدخل مفتاح الإعداد وقيمته وتصنيفه.' : 'Enter the setting key, value, and category.'}
        onClose={closeAdminModal}
        size="md"
      >
        <form onSubmit={handleSaveSystemSetting} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'مفتاح الإعداد' : 'Setting Key'}</span>
            <input value={systemSettingForm.setting_key} onChange={(event) => setSystemSettingForm((current) => ({ ...current, setting_key: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'قيمة الإعداد' : 'Setting Value'}</span>
            <input value={systemSettingForm.setting_value} onChange={(event) => setSystemSettingForm((current) => ({ ...current, setting_value: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'التصنيف' : 'Category'}</span>
            <input value={systemSettingForm.category} onChange={(event) => setSystemSettingForm((current) => ({ ...current, category: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'الوصف' : 'Description'}</span>
            <textarea rows="3" value={systemSettingForm.description} onChange={(event) => setSystemSettingForm((current) => ({ ...current, description: event.target.value }))} />
          </label>

          <label className="ims-admin-check ims-admin-col-12">
            <input type="checkbox" checked={systemSettingForm.is_sensitive} onChange={(event) => setSystemSettingForm((current) => ({ ...current, is_sensitive: event.target.checked }))} />
            <span>{isArabic ? 'إعداد حساس' : 'Sensitive setting'}</span>
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="ims-admin-primary-btn">{isArabic ? 'حفظ' : 'Save'}</button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={adminModal.isOpen && adminModal.type === 'backupJob'}
        title={adminModal.record ? (isArabic ? 'تعديل مهمة نسخ' : 'Edit Backup Job') : (isArabic ? 'إضافة مهمة نسخ' : 'Add Backup Job')}
        subtitle={isArabic ? 'أدخل بيانات مهمة النسخ وجدولتها.' : 'Enter backup job details and schedule.'}
        onClose={closeAdminModal}
        size="md"
      >
        <form onSubmit={handleSaveBackupJob} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'اسم المهمة' : 'Job Name'}</span>
            <input value={backupJobForm.job_name} onChange={(event) => setBackupJobForm((current) => ({ ...current, job_name: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'النوع' : 'Type'}</span>
            <select value={backupJobForm.job_type} onChange={(event) => setBackupJobForm((current) => ({ ...current, job_type: event.target.value }))}>
              {backupJobTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'الحالة' : 'Status'}</span>
            <select value={backupJobForm.status} onChange={(event) => setBackupJobForm((current) => ({ ...current, status: event.target.value }))}>
              {backupJobStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'الجدولة' : 'Schedule'}</span>
            <input value={backupJobForm.schedule} onChange={(event) => setBackupJobForm((current) => ({ ...current, schedule: event.target.value }))} placeholder={isArabic ? 'مثال: Daily 02:00' : 'e.g. Daily 02:00'} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'آخر نتيجة' : 'Last Result'}</span>
            <textarea rows="3" value={backupJobForm.last_result} onChange={(event) => setBackupJobForm((current) => ({ ...current, last_result: event.target.value }))} />
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="ims-admin-primary-btn">{isArabic ? 'حفظ' : 'Save'}</button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={adminModal.isOpen && adminModal.type === 'archivedRecord'}
        title={isArabic ? 'إضافة سجل مؤرشف' : 'Add Archived Record'}
        subtitle={isArabic ? 'أضف مرجع السجل وسبب الأرشفة ولقطة JSON اختيارية.' : 'Add record reference, archive reason, and optional JSON snapshot.'}
        onClose={closeAdminModal}
        size="md"
      >
        <form onSubmit={handleSaveArchivedRecord} className="ims-admin-form-grid">
          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'اسم الكيان' : 'Entity Name'}</span>
            <input value={archivedRecordForm.entity_name} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, entity_name: event.target.value }))} required />
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'معرف السجل' : 'Entity ID'}</span>
            <input value={archivedRecordForm.entity_id} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, entity_id: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-6">
            <span>{isArabic ? 'مرجع السجل' : 'Record Reference'}</span>
            <input value={archivedRecordForm.record_reference} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, record_reference: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'سبب الأرشفة' : 'Archive Reason'}</span>
            <textarea rows="3" value={archivedRecordForm.reason} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, reason: event.target.value }))} />
          </label>

          <label className="ims-admin-field ims-admin-col-12">
            <span>{isArabic ? 'JSON اختياري للسجل' : 'Optional Record Snapshot JSON'}</span>
            <textarea rows="6" value={archivedRecordForm.snapshot_json} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, snapshot_json: event.target.value }))} />
          </label>

          <div className="ims-admin-modal-actions ims-admin-col-12">
            <button type="button" className="ims-admin-secondary-btn" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="ims-admin-primary-btn">{isArabic ? 'حفظ' : 'Save'}</button>
          </div>
        </form>
      </OverlayModal>

      <ConfirmActionModal
        confirmState={confirmState}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
        isArabic={isArabic}
      />

      <DetailModal
        detailsModal={detailsModal}
        onClose={() => setDetailsModal({ isOpen: false, title: '', record: null })}
        isArabic={isArabic}
      />
    </div>
  );
}

const styles = `
  .ims-admin-page {
    position: relative;
    min-height: 100%;
    color: #10243f;
    padding-bottom: 1.5rem;
  }

  .ims-admin-page::before {
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

  .ims-admin-page > * {
    position: relative;
    z-index: 1;
  }

  .ims-admin-hero,
  .ims-admin-stat-card,
  .ims-admin-content-card,
  .ims-admin-table-card,
  .ims-admin-loading-panel {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(230, 238, 246, 0.98);
    box-shadow: 0 14px 36px rgba(16, 36, 63, 0.07);
    backdrop-filter: blur(10px);
  }

  .ims-admin-hero {
    overflow: hidden;
    border-radius: 30px;
    padding: 1.4rem 1.55rem;
    margin-bottom: 1rem;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1.2rem;
  }

  .ims-admin-hero-main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .ims-admin-hero-icon {
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

  .ims-admin-hero h1 {
    margin: 0 0 .35rem;
    font-size: clamp(2rem, 3vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.055em;
    color: #10243f;
  }

  .ims-admin-hero p {
    margin: 0;
    max-width: 920px;
    color: #637894;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.8;
  }

  .ims-admin-hero-actions {
    display: flex;
    align-items: center;
    gap: .65rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ims-admin-primary-btn,
  .ims-admin-secondary-btn,
  .ims-admin-danger-btn,
  .ims-admin-row-btn {
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

  .ims-admin-primary-btn {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    box-shadow: 0 14px 30px rgba(7,150,166,.18);
  }

  .ims-admin-secondary-btn,
  .ims-admin-row-btn {
    color: #243b5a;
    background: #fff;
    border-color: #dfeaf3;
  }

  .ims-admin-danger-btn {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255, 90, 107, .22);
  }

  .ims-admin-primary-btn:disabled,
  .ims-admin-secondary-btn:disabled,
  .ims-admin-danger-btn:disabled,
  .ims-admin-row-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ims-admin-feedback {
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

  .ims-admin-feedback strong,
  .ims-admin-feedback span {
    display: block;
  }

  .ims-admin-feedback strong {
    margin-bottom: .15rem;
  }

  .ims-admin-feedback button {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 12px;
    background: rgba(255,255,255,.65);
    color: currentColor;
  }

  .ims-admin-feedback-success {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,.24);
  }

  .ims-admin-feedback-danger {
    color: #b42335;
    background: #ffedf0;
    border-color: rgba(255,90,107,.24);
  }

  .ims-admin-feedback-info {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,.2);
  }

  .ims-admin-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .ims-admin-stat-card {
    min-height: 126px;
    border-radius: 25px;
    padding: 1.15rem;
    display: flex;
    align-items: center;
    gap: .9rem;
    text-align: start;
    width: 100%;
  }

  .ims-admin-stat-card:hover {
    transform: translateY(-1px);
    border-color: rgba(20, 200, 195, .32);
    box-shadow: 0 18px 44px rgba(16,36,63,.10);
  }

  .ims-admin-stat-icon {
    width: 60px;
    height: 60px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    flex-shrink: 0;
  }

  .ims-admin-stat-teal .ims-admin-stat-icon { color: #0796a6; background: #e2fafa; }
  .ims-admin-stat-blue .ims-admin-stat-icon { color: #3b82f6; background: #e8f1ff; }
  .ims-admin-stat-purple .ims-admin-stat-icon { color: #5b65f1; background: #eef0ff; }
  .ims-admin-stat-green .ims-admin-stat-icon { color: #18bd87; background: #e7fbf3; }

  .ims-admin-stat-card span {
    display: block;
    color: #5e718d;
    font-size: .86rem;
    font-weight: 850;
    margin-bottom: .35rem;
  }

  .ims-admin-stat-card strong {
    display: block;
    color: #10243f;
    font-size: 1.9rem;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -.04em;
  }

  .ims-admin-stat-card em {
    display: block;
    margin-top: .35rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-style: normal;
    font-weight: 750;
  }

  .ims-admin-tabs {
    display: flex;
    align-items: center;
    gap: .65rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .ims-admin-tabs button {
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

  .ims-admin-tabs button span {
    min-width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 .4rem;
    border-radius: 999px;
    background: #eef4f7;
    color: #6f819b;
    font-size: .74rem;
    font-weight: 900;
  }

  .ims-admin-tabs button.active {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-color: transparent;
    box-shadow: 0 10px 24px rgba(7,150,166,.16);
  }

  .ims-admin-tabs button.active span {
    color: #0796a6;
    background: #fff;
  }

  .ims-admin-content-card {
    border-radius: 28px;
    padding: 1.1rem;
  }

  .ims-admin-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .ims-admin-section-title {
    display: flex;
    gap: .75rem;
    align-items: center;
  }

  .ims-admin-section-icon {
    width: 50px;
    height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    color: #0796a6;
    background: #e2fafa;
  }

  .ims-admin-section-head h2 {
    margin: 0 0 .25rem;
    color: #10243f;
    font-size: 1.15rem;
    font-weight: 900;
    letter-spacing: -.02em;
  }

  .ims-admin-section-head p {
    margin: 0;
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 700;
    line-height: 1.55;
  }

  .ims-admin-advisor-filter {
    display: grid;
    gap: .4rem;
    max-width: 560px;
    margin-bottom: 1rem;
  }

  .ims-admin-advisor-filter label {
    color: #5e718d;
    font-size: .82rem;
    font-weight: 850;
  }

  .ims-admin-advisor-filter select,
  .ims-admin-field input,
  .ims-admin-field select,
  .ims-admin-field textarea {
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

  .ims-admin-field textarea {
    resize: vertical;
  }

  .ims-admin-advisor-filter select:focus,
  .ims-admin-field input:focus,
  .ims-admin-field select:focus,
  .ims-admin-field textarea:focus {
    border-color: rgba(20,200,195,.72);
    box-shadow: 0 0 0 .18rem rgba(20,200,195,.11);
    background: #fff;
  }

  .ims-admin-table-card {
    border-radius: 26px;
    overflow: hidden;
  }

  .ims-admin-table-top {
    min-height: 68px;
    padding: .9rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #edf3f8;
    background: #fff;
  }

  .ims-admin-table-top strong {
    display: block;
    color: #243b5a;
    font-size: .9rem;
    font-weight: 900;
  }

  .ims-admin-table-top span {
    display: block;
    margin-top: .15rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-weight: 750;
  }

  .ims-admin-table-wrap {
    overflow: auto;
  }

  .ims-admin-table {
    width: 100%;
    min-width: 1060px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .ims-admin-table th {
    padding: .8rem .7rem;
    border-bottom: 1px solid #edf3f8;
    background: #fff;
  }

  .ims-admin-table td {
    padding: .86rem .9rem;
    border-bottom: 1px solid #edf3f8;
    color: #243b5a;
    font-size: .86rem;
    font-weight: 750;
    vertical-align: middle;
  }

  .ims-admin-table tr:hover td {
    background: #fbfdff;
  }

  .ims-admin-primary-text {
    color: #10243f;
    font-weight: 900;
  }

  .ims-admin-table-filter {
    position: relative;
  }

  .ims-admin-table-filter svg {
    position: absolute;
    inset-inline-start: .65rem;
    top: 50%;
    transform: translateY(-50%);
    color: #8fa0b6;
  }

  .ims-admin-table-filter input {
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

  .ims-admin-table-filter input:focus {
    border-color: rgba(20,200,195,.72);
    box-shadow: 0 0 0 .16rem rgba(20,200,195,.10);
    background: #fff;
  }

  .ims-admin-person {
    display: flex;
    align-items: center;
    gap: .65rem;
    min-width: 220px;
  }

  .ims-admin-person strong,
  .ims-admin-person span {
    display: block;
  }

  .ims-admin-person strong {
    color: #10243f;
    font-weight: 900;
    font-size: .9rem;
  }

  .ims-admin-person span {
    color: #7a8aa5;
    font-size: .76rem;
    font-weight: 750;
  }

  .ims-admin-avatar {
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

  .ims-admin-avatar-teal { background: linear-gradient(135deg, #0796a6, #14c8c3); }
  .ims-admin-avatar-purple { background: linear-gradient(135deg, #5b65f1, #8a91ff); }
  .ims-admin-avatar-blue { background: linear-gradient(135deg, #3b82f6, #64a4ff); }
  .ims-admin-avatar-green { background: linear-gradient(135deg, #18bd87, #2ee6d3); }

  .ims-admin-status,
  .ims-admin-badge {
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

  .ims-admin-status::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: currentColor;
  }

  .ims-admin-status-success {
    color: #0d8a64;
    background: #e7fbf3;
    border-color: rgba(24,197,143,.22);
  }

  .ims-admin-status-warning {
    color: #a4660b;
    background: #fff4dc;
    border-color: rgba(244,166,42,.24);
  }

  .ims-admin-status-danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255,90,107,.24);
  }

  .ims-admin-status-info,
  .ims-admin-badge {
    color: #1f65c8;
    background: #e8f1ff;
    border-color: rgba(59,130,246,.2);
  }

  .ims-admin-badge.danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255,90,107,.24);
  }

  .ims-admin-row-actions {
    display: flex;
    gap: .45rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ims-admin-row-btn {
    min-height: 34px;
    border-radius: 12px;
    font-size: .78rem;
    padding: 0 .7rem;
  }

  .ims-admin-row-btn.primary {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-color: transparent;
  }

  .ims-admin-row-btn.danger {
    color: #c02c3f;
    background: #ffedf0;
    border-color: rgba(255,90,107,.22);
  }

  .ims-admin-pagination {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: .55rem;
    padding: .75rem 1rem;
    background: #fff;
  }

  .ims-admin-pagination button {
    width: 34px;
    height: 34px;
    border: 1px solid #dfeaf3;
    border-radius: 12px;
    color: #243b5a;
    background: #fff;
    font-weight: 900;
  }

  .ims-admin-pagination button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .ims-admin-pagination span {
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 850;
  }

  .ims-admin-empty,
  .ims-admin-loading-panel {
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

  .ims-admin-loading-panel {
    min-height: 280px;
    border-radius: 28px;
    background: rgba(255,255,255,.95);
  }

  .ims-admin-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2050;
    background: rgba(7, 31, 53, .55);
    backdrop-filter: blur(6px);
  }

  .ims-admin-modal-shell {
    position: fixed;
    inset: 0;
    z-index: 2060;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
  }

  .ims-admin-modal-card {
    width: min(820px, 100%);
    max-height: min(92vh, 920px);
    display: flex;
    flex-direction: column;
    border-radius: 28px;
    border: 1px solid #dfeaf3;
    background: #fff;
    box-shadow: 0 30px 90px rgba(7,31,53,.24);
    overflow: hidden;
  }

  .ims-admin-modal-xl { width: min(1120px, 100%); }
  .ims-admin-modal-lg { width: min(920px, 100%); }
  .ims-admin-modal-md { width: min(720px, 100%); }
  .ims-admin-modal-sm { width: min(560px, 100%); }

  .ims-admin-modal-header {
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

  .ims-admin-modal-header h3 {
    margin: 0 0 .25rem;
    color: #10243f;
    font-size: 1.12rem;
    font-weight: 900;
  }

  .ims-admin-modal-header p {
    margin: 0;
    color: #7a8aa5;
    font-size: .84rem;
    font-weight: 700;
    line-height: 1.55;
  }

  .ims-admin-modal-header button {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 14px;
    color: #243b5a;
    background: #f4f7fb;
    flex-shrink: 0;
  }

  .ims-admin-modal-body {
    overflow: auto;
    padding: 1.15rem;
  }

  .ims-admin-form-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: .85rem;
  }

  .ims-admin-col-6 { grid-column: span 6; }
  .ims-admin-col-12 { grid-column: span 12; }

  .ims-admin-field {
    display: grid;
    gap: .35rem;
  }

  .ims-admin-field span,
  .ims-admin-check span {
    color: #5e718d;
    font-size: .82rem;
    font-weight: 850;
  }

  .ims-admin-check {
    display: flex;
    align-items: center;
    gap: .55rem;
  }

  .ims-admin-check input {
    width: 18px;
    height: 18px;
    accent-color: #0796a6;
  }

  .ims-admin-modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: .65rem;
    flex-wrap: wrap;
    margin-top: .3rem;
    padding-top: 1rem;
    border-top: 1px solid #edf3f8;
  }

  .ims-admin-confirm-box {
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

  .ims-admin-details-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .8rem;
  }

  .ims-admin-detail-box {
    min-height: 80px;
    border: 1px solid #edf3f8;
    border-radius: 18px;
    background: #fbfdff;
    padding: .85rem .9rem;
  }

  .ims-admin-detail-box span {
    display: block;
    margin-bottom: .35rem;
    color: #7a8aa5;
    font-size: .78rem;
    font-weight: 850;
  }

  .ims-admin-detail-box strong {
    display: block;
    white-space: pre-wrap;
    word-break: break-word;
    color: #243b5a;
    font-size: .86rem;
    line-height: 1.65;
    font-weight: 800;
  }

  @media (max-width: 1199.98px) {
    .ims-admin-stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 991.98px) {
    .ims-admin-hero {
      grid-template-columns: 1fr;
    }

    .ims-admin-hero-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 767.98px) {
    .ims-admin-hero-main,
    .ims-admin-section-head,
    .ims-admin-table-top {
      flex-direction: column;
      align-items: stretch;
      display: flex;
    }

    .ims-admin-stat-grid,
    .ims-admin-details-grid {
      grid-template-columns: 1fr;
    }

    .ims-admin-col-6 {
      grid-column: span 12;
    }

    .ims-admin-primary-btn,
    .ims-admin-secondary-btn,
    .ims-admin-danger-btn {
      width: 100%;
    }

    .ims-admin-modal-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
`;

export default AdministrationModulePage;