import { useContext, useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import ModuleTabs from '../../../shared/components/ModuleTabs';
import AppTable from '../../../shared/components/AppTable';
import AppModal from '../../../shared/components/AppModal';
import TableToolbar from '../../../shared/components/TableToolbar';
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
  { key: 'users', label: 'Users Management' },
  { key: 'invitations', label: 'Invitations' },
  { key: 'advisorAssignments', label: 'Advisor Assignments' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'auditLogs', label: 'Audit Log' },
  { key: 'systemConfigurations', label: 'System Configuration' },
  { key: 'backupJobs', label: 'Backup Jobs' },
  { key: 'archivedRecords', label: 'Archived Records' },
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

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function stringifyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function matchesSearch(row, keyword) {
  if (!keyword) return true;
  return Object.values(row).join(' ').toLowerCase().includes(keyword);
}

function FeedbackAlert({ feedback, onClose }) {
  if (!feedback?.message) return null;

  const type = feedback.type || 'info';

  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      <div className="fw-semibold mb-1">
        {type === 'success' ? 'Success' : type === 'danger' ? 'Error' : 'Notice'}
      </div>
      <div>{feedback.message}</div>
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
    </div>
  );
}

function ConfirmActionModal({ confirmState, onCancel, onConfirm, isArabic }) {
  return (
    <AppModal
      isOpen={Boolean(confirmState.isOpen)}
      title={confirmState.title || (isArabic ? 'تأكيد الإجراء' : 'Confirm Action')}
      onClose={onCancel}
    >
      <div className="d-grid gap-3">
        <div className="text-muted">
          {confirmState.message || (isArabic ? 'هل أنت متأكد من تنفيذ هذا الإجراء؟' : 'Are you sure you want to continue?')}
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            className={`btn btn-${confirmState.variant || 'danger'}`}
            onClick={onConfirm}
          >
            {confirmState.confirmLabel || (isArabic ? 'تأكيد' : 'Confirm')}
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function AdministrationModulePage() {
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
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

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return currentRows.filter((row) => matchesSearch(row, keyword));
  }, [currentRows, search]);

  const stats = useMemo(() => ({
    users: users.length,
    students: students.length,
    advisors: advisors.length,
    invitations: invitationBatches.length,
    notifications: notifications.length,
    auditLogs: auditLogs.length,
    systemSettings: systemSettings.length,
    backupJobs: backupJobs.length,
    archivedRecords: archivedRecords.length,
  }), [advisors.length, archivedRecords.length, auditLogs.length, backupJobs.length, invitationBatches.length, notifications.length, students.length, systemSettings.length, users.length]);

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

  const usersColumns = [
    { key: 'full_name', label: isArabic ? 'الاسم' : 'Name' },
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    { key: 'role', label: isArabic ? 'الدور' : 'Role' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'created_at', label: isArabic ? 'تاريخ الإنشاء' : 'Created At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditUserModal(row)}>
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(row)}>
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const invitationColumns = [
    { key: 'title', label: isArabic ? 'دفعة الدعوات' : 'Batch' },
    { key: 'total_recipients', label: isArabic ? 'عدد المستلمين' : 'Recipients' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'created_by', label: isArabic ? 'أنشئت بواسطة' : 'Created By' },
    { key: 'created_at', label: isArabic ? 'تاريخ الإنشاء' : 'Created At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleViewRecipients(row)}>
          {isArabic ? 'عرض المستلمين' : 'View Recipients'}
        </button>
      ),
    },
  ];

  const advisorStudentColumns = [
    { key: 'full_name', label: isArabic ? 'الطالب' : 'Student' },
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    { key: 'student_code', label: isArabic ? 'الرقم الجامعي' : 'Student Code' },
    { key: 'major', label: isArabic ? 'التخصص' : 'Major' },
    { key: 'university', label: isArabic ? 'الجامعة' : 'University' },
    { key: 'assignment_start_at', label: isArabic ? 'تاريخ الربط' : 'Assigned At', render: (value) => formatDateTime(value) },
  ];

  const notificationColumns = [
    { key: 'title', label: isArabic ? 'العنوان' : 'Title' },
    { key: 'recipient_name', label: isArabic ? 'المستلم' : 'Recipient', render: (_, row) => row.recipient_name || row.recipient_email || '-' },
    { key: 'type', label: isArabic ? 'النوع' : 'Type' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'created_at', label: isArabic ? 'تاريخ الإنشاء' : 'Created At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openAdminModal('notification', row)}>
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل الإشعار' : 'Notification Details', record: row })}>
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteNotification(row)}>
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const auditLogColumns = [
    { key: 'actor_name', label: isArabic ? 'المنفذ' : 'Actor' },
    { key: 'action', label: isArabic ? 'الإجراء' : 'Action' },
    { key: 'entity_name', label: isArabic ? 'الكيان' : 'Entity' },
    { key: 'entity_id', label: isArabic ? 'معرف السجل' : 'Record ID' },
    { key: 'ip_address', label: 'IP' },
    { key: 'created_at', label: isArabic ? 'التاريخ' : 'Created At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل سجل التدقيق' : 'Audit Log Details', record: row })}>
          {isArabic ? 'عرض' : 'View'}
        </button>
      ),
    },
  ];

  const systemSettingColumns = [
    { key: 'setting_key', label: isArabic ? 'المفتاح' : 'Key' },
    { key: 'setting_value', label: isArabic ? 'القيمة' : 'Value' },
    { key: 'category', label: isArabic ? 'التصنيف' : 'Category' },
    { key: 'is_sensitive', label: isArabic ? 'حساس' : 'Sensitive', render: (value) => (value ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')) },
    { key: 'updated_at', label: isArabic ? 'آخر تحديث' : 'Updated At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openAdminModal('systemSetting', row)}>
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteSystemSetting(row)}>
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const backupJobColumns = [
    { key: 'job_name', label: isArabic ? 'اسم المهمة' : 'Job Name' },
    { key: 'job_type', label: isArabic ? 'النوع' : 'Type' },
    { key: 'schedule', label: isArabic ? 'الجدولة' : 'Schedule' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'last_run_at', label: isArabic ? 'آخر تشغيل' : 'Last Run', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => handleRunBackupJob(row)}>
            {isArabic ? 'تشغيل' : 'Run'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openAdminModal('backupJob', row)}>
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل مهمة النسخ' : 'Backup Job Details', record: row })}>
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteBackupJob(row)}>
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const archivedRecordColumns = [
    { key: 'entity_name', label: isArabic ? 'الكيان' : 'Entity' },
    { key: 'entity_id', label: isArabic ? 'معرف السجل' : 'Entity ID' },
    { key: 'record_reference', label: isArabic ? 'المرجع' : 'Reference' },
    { key: 'archived_by_name', label: isArabic ? 'أرشف بواسطة' : 'Archived By' },
    { key: 'archived_at', label: isArabic ? 'تاريخ الأرشفة' : 'Archived At', render: (value) => formatDateTime(value) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setDetailsModal({ isOpen: true, title: isArabic ? 'تفاصيل السجل المؤرشف' : 'Archived Record Details', record: row })}>
            {isArabic ? 'عرض' : 'View'}
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteArchivedRecord(row)}>
            {isArabic ? 'حذف' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  const recipientsColumns = [
    { key: 'email', label: isArabic ? 'البريد الإلكتروني' : 'Email' },
    { key: 'full_name', label: isArabic ? 'الاسم' : 'Name' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'sent_at', label: isArabic ? 'تاريخ الإرسال' : 'Sent At', render: (value) => formatDateTime(value) },
    { key: 'registered_at', label: isArabic ? 'تاريخ التسجيل' : 'Registered At', render: (value) => formatDateTime(value) },
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
      ? isArabic ? 'سجلات التدقيق تُنشأ تلقائيًا من النظام.' : 'Audit logs are generated automatically by system actions.'
      : activeTab === 'advisorAssignments'
        ? isArabic ? 'اختر مشرفًا لعرض الطلاب المرتبطين به.' : 'Select an advisor to view assigned students.'
        : isArabic ? 'بيانات حقيقية مرتبطة بواجهات API.' : 'Live data connected to API endpoints.';

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
                  : undefined;

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

  if (loading) {
    return <div className="ims-empty-panel">{isArabic ? 'جارٍ تحميل بيانات الإدارة...' : 'Loading administration data...'}</div>;
  }

  return (
    <div>
      <ModulePageHeader
        title="Administration"
        description={isArabic ? 'إدارة المستخدمين، الدعوات، الإشعارات، سجلات التدقيق، الإعدادات، النسخ الاحتياطي، والأرشفة من بيانات حقيقية.' : 'Manage users, invitations, notifications, audit logs, settings, backup jobs, and archived records using live API data.'}
        addLabel={addLabel}
        onAddClick={onAddClick}
      />

      {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
      <FeedbackAlert feedback={feedback} onClose={clearFeedback} />

      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6"><div className="card ims-stat-card h-100"><div className="card-body"><div className="ims-stat-label">{isArabic ? 'المستخدمون' : 'Users'}</div><div className="ims-stat-value">{stats.users}</div></div></div></div>
        <div className="col-md-3 col-6"><div className="card ims-stat-card h-100"><div className="card-body"><div className="ims-stat-label">{isArabic ? 'الإشعارات' : 'Notifications'}</div><div className="ims-stat-value">{stats.notifications}</div></div></div></div>
        <div className="col-md-3 col-6"><div className="card ims-stat-card h-100"><div className="card-body"><div className="ims-stat-label">{isArabic ? 'سجل التدقيق' : 'Audit Logs'}</div><div className="ims-stat-value">{stats.auditLogs}</div></div></div></div>
        <div className="col-md-3 col-6"><div className="card ims-stat-card h-100"><div className="card-body"><div className="ims-stat-label">{isArabic ? 'مهام النسخ' : 'Backup Jobs'}</div><div className="ims-stat-value">{stats.backupJobs}</div></div></div></div>
      </div>

      <ModuleTabs tabs={administrationTabs} activeKey={activeTab} onChange={(key) => { setActiveTab(key); setSearch(''); }} />

      <div className="card ims-table-card mt-3">
        <div className="card-body">
          {activeTab === 'advisorAssignments' ? (
            <div className="row g-3 mb-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'}</label>
                <select className="form-select" value={selectedAdvisorId} onChange={(event) => setSelectedAdvisorId(event.target.value)}>
                  <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
                  {advisors.map((advisor) => (
                    <option key={advisor.id} value={advisor.id}>{advisor.full_name} — {advisor.email}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <TableToolbar
            title={activeTitle}
            subtitle={activeSubtitle}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={isArabic ? 'بحث...' : `Search ${activeTitle}...`}
          />

          <AppTable
            columns={activeColumns}
            rows={filteredRows}
            rowKey="id"
            emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No records found.'}
          />
        </div>
      </div>

      <AppModal isOpen={userModal.isOpen} title={userModal.record ? (isArabic ? 'تعديل مستخدم' : 'Edit User') : (isArabic ? 'إضافة مستخدم' : 'Add User')} onClose={() => setUserModal({ isOpen: false, record: null })}>
        <form onSubmit={handleSaveUser} className="d-grid gap-3">
          <input className="form-control" value={userForm.full_name} onChange={(event) => setUserForm((current) => ({ ...current, full_name: event.target.value }))} placeholder={isArabic ? 'الاسم الكامل' : 'Full Name'} required />
          <input type="email" className="form-control" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} required />
          <select className="form-select" value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select>
          <select className="form-select" value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <input type="password" className="form-control" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} placeholder={userModal.record ? (isArabic ? 'كلمة مرور جديدة، اختياري' : 'New password, optional') : (isArabic ? 'كلمة المرور' : 'Password')} />
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={() => setUserModal({ isOpen: false, record: null })}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'حفظ' : 'Save'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={invitationModal.isOpen} title={isArabic ? 'إضافة دفعة دعوات' : 'Add Invitation Batch'} onClose={() => setInvitationModal({ isOpen: false })}>
        <form onSubmit={handleCreateInvitationBatch} className="d-grid gap-3">
          <input className="form-control" value={invitationForm.title} onChange={(event) => setInvitationForm((current) => ({ ...current, title: event.target.value }))} placeholder={isArabic ? 'اسم دفعة الدعوات' : 'Invitation batch title'} required />
          <textarea className="form-control" rows="3" value={invitationForm.notes} onChange={(event) => setInvitationForm((current) => ({ ...current, notes: event.target.value }))} placeholder={isArabic ? 'ملاحظات' : 'Notes'} />
          <textarea className="form-control" rows="6" value={invitationForm.recipientsText} onChange={(event) => setInvitationForm((current) => ({ ...current, recipientsText: event.target.value }))} placeholder={isArabic ? 'ضع كل بريد في سطر مستقل' : 'Enter one email per line'} required />
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={() => setInvitationModal({ isOpen: false })}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'إنشاء' : 'Create'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={assignmentModal.isOpen} title={isArabic ? 'ربط طالب بمشرف' : 'Assign Student to Advisor'} onClose={() => setAssignmentModal({ isOpen: false })}>
        <form onSubmit={handleAssignStudent} className="d-grid gap-3">
          <select className="form-select" value={assignmentForm.advisor_user_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, advisor_user_id: event.target.value }))} required>
            <option value="">{isArabic ? 'اختر المشرف' : 'Select advisor'}</option>
            {advisors.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.full_name} — {advisor.email}</option>)}
          </select>
          <select className="form-select" value={assignmentForm.student_user_id} onChange={(event) => setAssignmentForm((current) => ({ ...current, student_user_id: event.target.value }))} required>
            <option value="">{isArabic ? 'اختر الطالب' : 'Select student'}</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.full_name} — {student.email}</option>)}
          </select>
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={() => setAssignmentModal({ isOpen: false })}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'ربط' : 'Assign'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={recipientsModal.isOpen} title={isArabic ? 'مستلمو الدعوة' : 'Invitation Recipients'} onClose={() => setRecipientsModal({ isOpen: false, batch: null, recipients: [] })}>
        <AppTable columns={recipientsColumns} rows={recipientsModal.recipients} rowKey="id" emptyMessage={isArabic ? 'لا يوجد مستلمون.' : 'No recipients found.'} />
      </AppModal>

      <AppModal isOpen={adminModal.isOpen && adminModal.type === 'notification'} title={adminModal.record ? (isArabic ? 'تعديل إشعار' : 'Edit Notification') : (isArabic ? 'إضافة إشعار' : 'Add Notification')} onClose={closeAdminModal}>
        <form onSubmit={handleSaveNotification} className="d-grid gap-3">
          <input className="form-control" value={notificationForm.title} onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} placeholder={isArabic ? 'العنوان' : 'Title'} required />
          <textarea className="form-control" rows="4" value={notificationForm.message} onChange={(event) => setNotificationForm((current) => ({ ...current, message: event.target.value }))} placeholder={isArabic ? 'نص الإشعار' : 'Message'} />
          <select className="form-select" value={notificationForm.recipient_user_id} onChange={(event) => setNotificationForm((current) => ({ ...current, recipient_user_id: event.target.value }))}>
            <option value="">{isArabic ? 'بدون مستخدم محدد' : 'No specific user'}</option>
            {users.map((item) => <option key={item.id} value={item.id}>{item.full_name} — {item.email}</option>)}
          </select>
          <input type="email" className="form-control" value={notificationForm.recipient_email} onChange={(event) => setNotificationForm((current) => ({ ...current, recipient_email: event.target.value }))} placeholder={isArabic ? 'بريد المستلم' : 'Recipient email'} />
          <div className="row g-2"><div className="col-md-6"><select className="form-select" value={notificationForm.type} onChange={(event) => setNotificationForm((current) => ({ ...current, type: event.target.value }))}>{notificationTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="col-md-6"><select className="form-select" value={notificationForm.status} onChange={(event) => setNotificationForm((current) => ({ ...current, status: event.target.value }))}>{notificationStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'حفظ' : 'Save'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={adminModal.isOpen && adminModal.type === 'systemSetting'} title={adminModal.record ? (isArabic ? 'تعديل إعداد' : 'Edit System Setting') : (isArabic ? 'إضافة إعداد' : 'Add System Setting')} onClose={closeAdminModal}>
        <form onSubmit={handleSaveSystemSetting} className="d-grid gap-3">
          <input className="form-control" value={systemSettingForm.setting_key} onChange={(event) => setSystemSettingForm((current) => ({ ...current, setting_key: event.target.value }))} placeholder={isArabic ? 'مفتاح الإعداد' : 'Setting key'} required />
          <input className="form-control" value={systemSettingForm.setting_value} onChange={(event) => setSystemSettingForm((current) => ({ ...current, setting_value: event.target.value }))} placeholder={isArabic ? 'قيمة الإعداد' : 'Setting value'} />
          <input className="form-control" value={systemSettingForm.category} onChange={(event) => setSystemSettingForm((current) => ({ ...current, category: event.target.value }))} placeholder={isArabic ? 'التصنيف' : 'Category'} />
          <textarea className="form-control" rows="3" value={systemSettingForm.description} onChange={(event) => setSystemSettingForm((current) => ({ ...current, description: event.target.value }))} placeholder={isArabic ? 'الوصف' : 'Description'} />
          <label className="form-check"><input className="form-check-input" type="checkbox" checked={systemSettingForm.is_sensitive} onChange={(event) => setSystemSettingForm((current) => ({ ...current, is_sensitive: event.target.checked }))} /><span className="form-check-label ms-2">{isArabic ? 'إعداد حساس' : 'Sensitive setting'}</span></label>
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'حفظ' : 'Save'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={adminModal.isOpen && adminModal.type === 'backupJob'} title={adminModal.record ? (isArabic ? 'تعديل مهمة نسخ' : 'Edit Backup Job') : (isArabic ? 'إضافة مهمة نسخ' : 'Add Backup Job')} onClose={closeAdminModal}>
        <form onSubmit={handleSaveBackupJob} className="d-grid gap-3">
          <input className="form-control" value={backupJobForm.job_name} onChange={(event) => setBackupJobForm((current) => ({ ...current, job_name: event.target.value }))} placeholder={isArabic ? 'اسم المهمة' : 'Job name'} required />
          <select className="form-select" value={backupJobForm.job_type} onChange={(event) => setBackupJobForm((current) => ({ ...current, job_type: event.target.value }))}>{backupJobTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <input className="form-control" value={backupJobForm.schedule} onChange={(event) => setBackupJobForm((current) => ({ ...current, schedule: event.target.value }))} placeholder={isArabic ? 'الجدولة، مثل Daily 02:00' : 'Schedule, e.g. Daily 02:00'} />
          <select className="form-select" value={backupJobForm.status} onChange={(event) => setBackupJobForm((current) => ({ ...current, status: event.target.value }))}>{backupJobStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <textarea className="form-control" rows="3" value={backupJobForm.last_result} onChange={(event) => setBackupJobForm((current) => ({ ...current, last_result: event.target.value }))} placeholder={isArabic ? 'آخر نتيجة' : 'Last result'} />
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'حفظ' : 'Save'}</button></div>
        </form>
      </AppModal>

      <AppModal isOpen={adminModal.isOpen && adminModal.type === 'archivedRecord'} title={isArabic ? 'إضافة سجل مؤرشف' : 'Add Archived Record'} onClose={closeAdminModal}>
        <form onSubmit={handleSaveArchivedRecord} className="d-grid gap-3">
          <input className="form-control" value={archivedRecordForm.entity_name} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, entity_name: event.target.value }))} placeholder={isArabic ? 'اسم الكيان' : 'Entity name'} required />
          <input className="form-control" value={archivedRecordForm.entity_id} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, entity_id: event.target.value }))} placeholder={isArabic ? 'معرف السجل' : 'Entity ID'} />
          <input className="form-control" value={archivedRecordForm.record_reference} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, record_reference: event.target.value }))} placeholder={isArabic ? 'مرجع السجل' : 'Record reference'} />
          <textarea className="form-control" rows="3" value={archivedRecordForm.reason} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, reason: event.target.value }))} placeholder={isArabic ? 'سبب الأرشفة' : 'Archive reason'} />
          <textarea className="form-control" rows="5" value={archivedRecordForm.snapshot_json} onChange={(event) => setArchivedRecordForm((current) => ({ ...current, snapshot_json: event.target.value }))} placeholder={isArabic ? 'JSON اختياري للسجل' : 'Optional record snapshot JSON'} />
          <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={closeAdminModal}>{isArabic ? 'إلغاء' : 'Cancel'}</button><button type="submit" className="btn btn-primary">{isArabic ? 'حفظ' : 'Save'}</button></div>
        </form>
      </AppModal>

      <ConfirmActionModal
        confirmState={confirmState}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
        isArabic={isArabic}
      />

      <AppModal isOpen={detailsModal.isOpen} title={detailsModal.title} onClose={() => setDetailsModal({ isOpen: false, title: '', record: null })}>
        {detailsModal.record ? (
          <div className="d-grid gap-2">
            {Object.entries(detailsModal.record).map(([key, value]) => (
              <div className="ims-detail-box" key={key}>
                <div className="ims-detail-label">{key}</div>
                <div className="ims-detail-value" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{stringifyValue(value) || '-'}</div>
              </div>
            ))}
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}

export default AdministrationModulePage;