import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import ModuleTabs from '../../../shared/components/ModuleTabs';
import AppModal from '../../../shared/components/AppModal';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  addTrainingTaskEvidenceRequest,
  approveEligibilityRequest,
  approveTrainingCompanyRequestRequest,
  approveTrainingPlanRequestRequest,
  approveWeeklyReportRequest,
  createEligibilityRequest,
  createFinalEvaluationRequestRequest,
  createInvitationBatchRequest,
  createTrainingCompanyRequestRequest,
  createTrainingPlanRequestRequest,
  createTrainingTaskRequest,
  delegateTrainingCompanyRequestRequest,
  delegateTrainingPlanRequestRequest,
  generateWeeklyReportRequest,
  getAdvisorStudentsRequest,
  getAdvisorsRequest,
  getEligibilityByOwnerRequest,
  getEligibilityByStudentRequest,
  getFinalEvaluationRequestsByInternshipRequest,
  getFinalEvaluationSummaryRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getMyInternshipContextRequest,
  getMyPendingEligibilityQueueRequest,
  getPendingEligibilityQueueRequest,
  getTrainingCompanyRequestsByOwnerRequest,
  getTrainingCompanyRequestsByStudentRequest,
  getTrainingPlansByInternshipRequest,
  getTrainingPlansByOwnerRequest,
  getTrainingTasksByInternshipRequest,
  getWeeklyReportDetailsRequest,
  getWeeklyReportsByInternshipRequest,
  getWeeklyReportsByOwnerRequest,
  rejectEligibilityRequest,
  rejectTrainingCompanyRequestRequest,
  rejectTrainingPlanRequestRequest,
  rejectWeeklyReportRequest,
} from '../../../app/api/client';

const defaultStudentEmail = '';
const defaultStudentName = '';

const baseStudentTabs = [
  { key: 'providers', label: 'Training Company Approval' },
  { key: 'plans', label: 'Training Plan' },
  { key: 'tasks', label: 'Daily Tasks & Evidence' },
  { key: 'reports', label: 'Auto Weekly Reports' },
  { key: 'evaluation', label: 'Final Evaluation' },
];

const advisorTabs = [
  { key: 'assignments', label: 'My Students' },
  { key: 'pendingEligibility', label: 'Pending Eligibility Queue' },
  { key: 'invitations', label: 'Bulk Invite / Eligibility' },
  { key: 'providers', label: 'Company Approvals' },
  { key: 'plans', label: 'Plan Approvals' },
  { key: 'reports', label: 'Auto Weekly Reports' },
  { key: 'evaluation', label: 'Final Evaluation' },
];

const adminTabs = [
  { key: 'assignments', label: 'Advisor / Student Mapping' },
  { key: 'delegations', label: 'Approval Delegation Logs' },
  { key: 'pendingEligibility', label: 'Pending Eligibility Queue' },
  { key: 'invitations', label: 'Bulk Invite / Eligibility' },
  { key: 'providers', label: 'Company Approvals' },
  { key: 'plans', label: 'Plan Approvals' },
  { key: 'reports', label: 'Auto Weekly Reports' },
  { key: 'evaluation', label: 'Final Evaluation' },
];

function StatusBadge({ value }) {
  const label = value || '-';
  const normalized = String(label).toLowerCase();
  const tone =
    normalized.includes('approved') ||
    normalized.includes('accepted') ||
    normalized.includes('active') ||
    normalized.includes('logged') ||
    normalized === 'yes'
      ? 'text-bg-success'
      : normalized.includes('pending') || normalized.includes('waiting') || normalized.includes('submitted')
        ? 'text-bg-warning'
        : normalized.includes('reject') || normalized.includes('expired') || normalized === 'no'
          ? 'text-bg-danger'
          : 'text-bg-light border text-dark';

  return <span className={`badge ${tone}`}>{label}</span>;
}

function isApproved(value) {
  return value === 'Approved' || value === 'Accepted';
}

function toLocalDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getCellText(row, column) {
  if (!row || !column) return '';
  const value = row[column.key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function FilterableDataTable({ title, subtitle, columns, rows, rowKey = 'id', loading, emptyMessage }) {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: '', direction: 'asc' });

  const getOptions = (column) => {
    if (Array.isArray(column.options)) return column.options;

    return Array.from(
      new Set(
        rows
          .map((row) => getCellText(row, column).trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  };

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, value]) => String(value || '').trim());

    let output = rows.filter((row) =>
      activeFilters.every(([key, value]) => {
        const column = columns.find((item) => item.key === key);
        if (!column) return true;

        const cellValue = getCellText(row, column).toLowerCase();
        const filterValue = String(value || '').toLowerCase().trim();

        if (column.filterType === 'select') return cellValue === filterValue;
        return cellValue.includes(filterValue);
      })
    );

    if (sort.key) {
      const column = columns.find((item) => item.key === sort.key) || { key: sort.key };
      output = [...output].sort((leftRow, rightRow) => {
        const left = getCellText(leftRow, column);
        const right = getCellText(rightRow, column);
        const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
        return sort.direction === 'asc' ? result : -result;
      });
    }

    return output;
  }, [rows, filters, columns, sort]);

  const handleSort = (column) => {
    if (column.sortable === false) return;

    setSort((current) => {
      if (current.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return { key: '', direction: 'asc' };
    });
  };

  const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim());

  return (
    <div className="card ims-table-card mt-3 ims-clean-table-card">
      <div className="card-body p-0">
        <div className="ims-clean-table-topbar">
          <div>
            <h5 className="mb-1">{title}</h5>
            <div className="text-muted small">{subtitle}</div>
          </div>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <span className="badge text-bg-light border text-dark">
              {filteredRows.length} / {rows.length}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!hasActiveFilters}
              onClick={() => setFilters({})}
            >
              Clear filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-5 text-center">
            <div className="spinner-border" role="status" />
            <div className="mt-3">Loading...</div>
          </div>
        ) : (
          <div className="table-responsive ims-filter-table-wrap">
            <table className="table table-hover align-middle mb-0 ims-filter-table">
              <thead>
                <tr className="ims-filter-row">
                  {columns.map((column) => (
                    <th key={`${column.key}-filter`} style={{ minWidth: column.minWidth || 160 }}>
                      {column.filterType === 'text' ? (
                        <input
                          className="form-control form-control-sm ims-column-filter-control"
                          value={filters[column.key] || ''}
                          onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                          placeholder={column.label}
                          aria-label={column.label}
                        />
                      ) : column.filterType === 'select' ? (
                        <select
                          className="form-select form-select-sm ims-column-filter-control"
                          value={filters[column.key] || ''}
                          onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                          aria-label={column.label}
                        >
                          <option value="">{column.label}</option>
                          {getOptions(column).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="ims-column-filter-placeholder">{column.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row, rowIndex) => (
                    <tr key={row?.[rowKey] || rowIndex}>
                      {columns.map((column) => (
                        <td key={`${row?.[rowKey] || rowIndex}-${column.key}`}>
                          {column.render ? column.render(row?.[column.key], row) : getCellText(row, column) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length || 1}>
                      <div className="ims-empty-panel py-5">{emptyMessage || 'No records found.'}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsGrid({ record }) {
  if (!record) return null;

  return (
    <div className="row g-3">
      {Object.entries(record).map(([key, value]) => (
        <div key={key} className="col-md-6">
          <div className="border rounded-3 p-3 bg-light-subtle h-100">
            <div className="text-muted small mb-1">{key}</div>
            <div className="fw-semibold text-break">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || '-'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeAdvisor(item) {
  return {
    id: item.user_id,
    fullName: item.full_name || '',
    email: item.email || '',
    employeeNo: item.employee_no || '',
    department: item.department || '',
    isSystemResponsible: Boolean(item.is_system_responsible),
    studentsCount: item.students_count || 0,
  };
}

function normalizeAdvisorStudent(item, advisor) {
  return {
    id: `${advisor?.email || 'advisor'}-${item.student_user_id}`,
    studentName: item.full_name || '',
    studentEmail: item.email || '',
    advisorName: advisor?.fullName || '',
    advisorEmail: advisor?.email || '',
    studentCode: item.student_code || '',
    assignedAt: item.assignment_start_at || '',
    status: 'Active',
  };
}

function normalizeInvitationBatch(item) {
  return {
    id: item.id,
    invitationMode: item.invitation_mode || '',
    advisorUserId: item.advisor_user_id,
    advisorName: item.advisor_name || '',
    excelFileName: item.excel_file_name || '',
    sharedLinkUrl: item.shared_link_url || '',
    totalRecipients: item.total_recipients || 0,
    sentAt: item.sent_at || '',
    createdAt: item.created_at || '',
  };
}

function normalizeInvitationRecipient(item, batch) {
  return {
    id: item.id,
    batchId: item.batch_id || batch?.id || '',
    batchLabel: batch?.id ? `Batch #${batch.id}` : '-',
    invitationMode: batch?.invitationMode || '',
    advisorUserId: batch?.advisorUserId || '',
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: batch?.advisorName || '',
    assignedAdvisorEmail: '',
    source: batch?.invitationMode === 'Link' ? 'Shared Invitation Link' : 'Excel Import',
    invitationLink: batch?.sharedLinkUrl || '',
    invitedAt: item.sent_at || batch?.sentAt || batch?.createdAt || '',
    loginStatus: item.invitation_status === 'Accepted' ? 'Logged In' : item.invitation_status || 'Pending Login',
    profileReviewStatus: 'Not Created',
    approvalOwner: 'AcademicAdvisor',
    approvalOwnerName: batch?.advisorName || '',
    reviewComment: '',
    emailNotificationStatus: item.invitation_status || '',
    trainingLicenseLetter: '',
    letterDeliveryStatus: '',
    studentUserId: item.student_user_id || null,
  };
}

function normalizeEligibility(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: item.advisor_name || '',
    source: 'Eligibility Review',
    invitedAt: item.created_at || '',
    profileReviewStatus: item.status || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.advisor_name || '',
    reviewComment: item.comment || '',
    emailNotificationStatus: item.status || '',
    trainingLicenseLetter: item.status === 'Approved' ? `TrainingLetter_${(item.student_name || 'student').replaceAll(' ', '_')}.pdf` : '',
    letterDeliveryStatus: item.status === 'Approved' ? 'Auto generated after eligibility approval' : 'Pending',
    studentUserId: item.student_user_id,
  };
}

function normalizeCompanyRequest(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    providerName: item.provider_name || '',
    providerEmail: item.provider_email || '',
    contactName: item.contact_name || '',
    contactPhone: item.contact_phone || '',
    city: item.city || '',
    sector: item.sector || '',
    opportunityTitle: item.opportunity_title || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    submittedAt: item.submitted_at || '',
    approvalStatus: item.status || '',
    reviewComment: item.approval_comment || '',
    emailNotificationStatus: item.status || '',
  };
}

function normalizeTrainingPlan(item) {
  return {
    id: item.id,
    internshipId: item.internship_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    providerName: item.provider_name || '',
    startDate: item.start_date || '',
    directStartConfirmation: item.start_date ? 'Submitted' : '',
    planTitle: item.plan_title || '',
    planSummary: item.plan_summary || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    approvalStatus: item.status || '',
    reviewNotes: item.approval_comment || '',
    emailNotificationStatus: item.status || '',
    submittedAt: item.submitted_at || '',
    reviewedAt: item.reviewed_at || '',
    approvedAt: item.approved_at || '',
  };
}

function normalizeTask(item) {
  return {
    id: item.id,
    planId: item.training_plan_id,
    internshipId: item.internship_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    dayDate: item.task_date || '',
    weekNo: item.week_no || '',
    taskTitle: item.task_title || '',
    evidenceFile: item.evidence_count ? `${item.evidence_count} evidence file(s)` : '',
    evidenceUrl: '',
    status: 'Submitted',
  };
}

function normalizeWeeklyReport(item) {
  return {
    id: item.id,
    internshipId: item.internship_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    weekNo: item.week_no || '',
    title: item.report_title || '',
    generatedAt: item.generated_at || '',
    source: item.generated_from_tasks ? 'Generated from daily tasks and evidence' : 'Manual',
    tasksCount: item.total_tasks || 0,
    evidenceCount: item.evidence_count || 0,
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    approvalStatus: item.status || '',
    notes: item.approval_comment || '',
    emailNotificationStatus: item.status || '',
  };
}

function normalizeFinalRequest(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    providerName: item.provider_name || '',
    notificationStatus: 'Sent to Academic Advisor',
    companyRequestStatus: item.status || '',
    sendingTemplateName: item.sending_template_name || '',
    evaluationTemplateName: item.evaluation_template_name || '',
    academicEvaluationStatus: item.status || '',
    companyEvaluationStatus: item.status || '',
    finalStatus: item.completed_at ? 'Visible in Student File' : 'Pending',
  };
}

function InternshipModulePage() {
  const { user, logout } = useAuth();
  const { isArabic } = useLanguage();

  const role = user?.role || 'Student';
  const isStudent = role === 'Student';
  const isAdvisor = role === 'AcademicAdvisor';
  const isAdmin = role === 'Administrator';
  const canReview = isAdvisor || isAdmin;

  const studentEmail = user?.email || defaultStudentEmail;
  const studentName = user?.fullName || defaultStudentName;
  const tabs = isStudent ? baseStudentTabs : isAdmin ? adminTabs : advisorTabs;

  const [activeTab, setActiveTab] = useState(isStudent ? 'providers' : 'assignments');
  const [advisors, setAdvisors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [invitationBatches, setInvitationBatches] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);
  const [providerApprovals, setProviderApprovals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [finalEvaluations, setFinalEvaluations] = useState([]);
  const [pendingEligibilityQueue, setPendingEligibilityQueue] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [delegationTarget, setDelegationTarget] = useState(null);
  const [weeklyReportDetails, setWeeklyReportDetails] = useState(null);
  const [contextInternshipId, setContextInternshipId] = useState('');
  const [autoContext, setAutoContext] = useState(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [isWeeklyReportDetailsOpen, setIsWeeklyReportDetailsOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);

  const [weeklyReportForm, setWeeklyReportForm] = useState({ weekNo: '1' });
  const [inviteForm, setInviteForm] = useState({
    invitationMode: 'Excel',
    advisorUserId: '',
    recipientsText: '',
    excelFileName: '',
    invitationMessage: 'You have been invited to access the internship training platform. Please log in and complete your profile.',
  });
  const [providerForm, setProviderForm] = useState({
    providerName: '',
    providerEmail: '',
    contactName: '',
    contactPhone: '',
    city: '',
    sector: '',
    opportunityTitle: '',
  });
  const [planForm, setPlanForm] = useState({
    internshipId: '',
    companyRequestId: '',
    acceptedPlatform: '',
    startDate: '',
    planTitle: '',
    planSummary: '',
    planFileName: '',
    planFileUrl: '',
  });
  const [taskForm, setTaskForm] = useState({
    internshipId: '',
    trainingPlanId: '',
    taskTitle: '',
    dayDate: new Date().toISOString().slice(0, 10),
    weekNo: '1',
    evidenceFile: null,
  });
  const [evaluationForm, setEvaluationForm] = useState({
    internshipId: '',
    studentUserId: '',
    providerName: '',
    providerEmail: '',
    sendingTemplateName: 'Company Evaluation Request Email',
    evaluationTemplateName: 'Standard Company Internship Evaluation',
  });
  const [delegationForm, setDelegationForm] = useState({
    toApproverType: 'Administrator',
    toOwnerUserId: '',
    reason: '',
  });
  const [eligibilityForm, setEligibilityForm] = useState({
    recipientId: '',
    approvalOwnerUserId: '',
    approvalOwnerRole: 'AcademicAdvisor',
  });

  const effectiveInternshipId = isStudent ? autoContext?.internship_id || '' : contextInternshipId;
  const effectiveTrainingPlanId = isStudent ? autoContext?.latest_training_plan_id || '' : taskForm.trainingPlanId;

  const showFeedback = (type, message) => setFeedback({ type, message });

  const handleSessionError = async (error) => {
    showFeedback('danger', error.message || 'Request failed.');
    if (String(error.message || '').toLowerCase().includes('session')) await logout();
  };

  const scopeByRole = (rows) => {
    if (!isStudent) return rows;
    return rows.filter(
      (item) =>
        item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
        item.studentName === studentName ||
        !item.studentEmail
    );
  };

  const advisorOptions = useMemo(
    () => advisors.map((advisor) => ({ id: advisor.id, fullName: advisor.fullName, email: advisor.email })),
    [advisors]
  );

  const visibleAssignments = useMemo(
    () => isAdvisor ? assignments.filter((item) => item.advisorEmail?.toLowerCase() === user?.email?.toLowerCase()) : assignments,
    [assignments, isAdvisor, user?.email]
  );
  const visibleInvitations = useMemo(() => scopeByRole(invitations), [invitations, isStudent, studentEmail, studentName]);
  const visibleProviderApprovals = useMemo(() => scopeByRole(providerApprovals), [providerApprovals, isStudent, studentEmail, studentName]);
  const visiblePlans = useMemo(() => scopeByRole(plans), [plans, isStudent, studentEmail, studentName]);
  const visibleTasks = useMemo(() => scopeByRole(tasks), [tasks, isStudent, studentEmail, studentName]);
  const visibleReports = useMemo(() => scopeByRole(weeklyReports), [weeklyReports, isStudent, studentEmail, studentName]);
  const visibleEvaluations = useMemo(() => scopeByRole(finalEvaluations), [finalEvaluations, isStudent, studentEmail, studentName]);

  const eligibility = useMemo(
    () => eligibilityRows.find((item) => item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() || item.studentName === studentName),
    [eligibilityRows, studentEmail, studentName]
  );
  const hasEligibilityApproval = isApproved(eligibility?.profileReviewStatus);

  const approvedProvider = useMemo(
    () => providerApprovals.find((item) => (item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() || item.studentName === studentName) && isApproved(item.approvalStatus)),
    [providerApprovals, studentEmail, studentName]
  );

  const approvedPlan = useMemo(
    () => plans.find((item) => (item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() || item.studentName === studentName || !item.studentEmail) && isApproved(item.approvalStatus)),
    [plans, studentEmail, studentName]
  );

  const approvedProviderOptions = useMemo(() => {
    const rows = providerApprovals.filter((item) => isApproved(item.approvalStatus));
    if (!isStudent) return rows;
    return rows.filter((item) => item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() || item.studentName === studentName);
  }, [providerApprovals, isStudent, studentEmail, studentName]);

  const approvedTaskPlanOptions = useMemo(() => {
    const rows = plans.filter((item) => isApproved(item.approvalStatus));
    if (!isStudent) return rows;
    return rows.filter((item) => item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() || item.studentName === studentName || !item.studentEmail);
  }, [plans, isStudent, studentEmail, studentName]);

  const internshipTaskOptions = useMemo(() => {
    const map = new Map();
    approvedTaskPlanOptions.forEach((item) => {
      map.set(String(item.internshipId), {
        id: item.internshipId,
        label: `${item.providerName || 'Internship'} - ${item.planTitle || `#${item.internshipId}`}`,
      });
    });
    if (autoContext?.internship_id && !map.has(String(autoContext.internship_id))) {
      map.set(String(autoContext.internship_id), {
        id: autoContext.internship_id,
        label: `${autoContext.provider_name || 'Internship'} - ${autoContext.internship_title || `#${autoContext.internship_id}`}`,
      });
    }
    return Array.from(map.values());
  }, [approvedTaskPlanOptions, autoContext]);

  const trainingTaskPlanOptions = useMemo(() => {
    const targetInternshipId = String(taskForm.internshipId || effectiveInternshipId || '');
    return approvedTaskPlanOptions.filter((item) => String(item.internshipId) === targetInternshipId);
  }, [approvedTaskPlanOptions, taskForm.internshipId, effectiveInternshipId]);

  const selectedTaskPlan = useMemo(
    () => trainingTaskPlanOptions.find((item) => String(item.id) === String(taskForm.trainingPlanId)) || null,
    [trainingTaskPlanOptions, taskForm.trainingPlanId]
  );

  const calculateTaskWeekNo = (approvedAtOrReviewedAt, taskDate) => {
    if (!approvedAtOrReviewedAt || !taskDate) return '1';
    const approvedDate = new Date(approvedAtOrReviewedAt);
    const currentTaskDate = new Date(taskDate);
    if (Number.isNaN(approvedDate.getTime()) || Number.isNaN(currentTaskDate.getTime())) return '1';
    const diffDays = Math.max(0, Math.floor((currentTaskDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)));
    return String(Math.floor(diffDays / 7) + 1);
  };

  const loadAdvisors = async () => {
    try {
      const data = await getAdvisorsRequest();
      setAdvisors((Array.isArray(data) ? data : []).map(normalizeAdvisor));
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const loadPendingEligibilityQueue = async () => {
    setLoading(true);
    try {
      const data = isAdmin ? await getPendingEligibilityQueueRequest() : await getMyPendingEligibilityQueueRequest();
      setPendingEligibilityQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const reviewPendingEligibilityQueueItem = async (row, status) => {
    if (!row.account_created || !row.student_user_id) {
      showFeedback('warning', 'Student has not created the account yet from the invitation link.');
      return;
    }
    setLoading(true);
    try {
      let reviewId = row.eligibility_review_id;
      if (!reviewId) {
        const created = await createEligibilityRequest({
          invitation_recipient_id: Number(row.invitation_recipient_id),
          advisor_assignment_id: null,
          approval_owner_user_id: Number(row.advisor_user_id),
          approval_owner_role: 'AcademicAdvisor',
        });
        reviewId = created?.id;
      }
      if (!reviewId) throw new Error('Eligibility review could not be created.');
      if (status === 'Approved') {
        await approveEligibilityRequest(reviewId, { actor_user_id: user?.id, comment: 'Approved directly from Pending Eligibility Queue' });
      } else {
        await rejectEligibilityRequest(reviewId, { actor_user_id: user?.id, comment: 'Rejected directly from Pending Eligibility Queue' });
      }
      showFeedback('success', `Eligibility ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`);
      await loadPendingEligibilityQueue();
      await loadInvitationsAndEligibility();
      await loadAssignments();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyInternshipContext = async () => {
    if (!isStudent) {
      setAutoContext(null);
      return;
    }
    setLoadingContext(true);
    try {
      const data = await getMyInternshipContextRequest();
      setAutoContext(data || null);
      if (data?.internship_id) setContextInternshipId(String(data.internship_id));
    } catch (error) {
      const message = String(error.message || '').toLowerCase();
      if (message.includes('no internship context')) setAutoContext(null);
      else await handleSessionError(error);
    } finally {
      setLoadingContext(false);
    }
  };

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const advisorsData = await getAdvisorsRequest();
      const normalizedAdvisors = (Array.isArray(advisorsData) ? advisorsData : []).map(normalizeAdvisor);
      setAdvisors(normalizedAdvisors);
      const targetAdvisors = isAdvisor ? normalizedAdvisors.filter((item) => item.email?.toLowerCase() === user?.email?.toLowerCase()) : normalizedAdvisors;
      const results = await Promise.all(
        targetAdvisors.map(async (advisor) => {
          const students = await getAdvisorStudentsRequest(advisor.id);
          return (Array.isArray(students) ? students : []).map((student) => normalizeAdvisorStudent(student, advisor));
        })
      );
      setAssignments(results.flat());
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitationsAndEligibility = async () => {
    setLoading(true);
    try {
      const batches = await getInvitationBatchesRequest();
      const normalizedBatches = (Array.isArray(batches) ? batches : []).map(normalizeInvitationBatch);
      setInvitationBatches(normalizedBatches);
      const recipientResults = await Promise.all(
        normalizedBatches.map(async (batch) => {
          const recipients = await getInvitationRecipientsRequest(batch.id).catch(() => []);
          return (Array.isArray(recipients) ? recipients : []).map((item) => normalizeInvitationRecipient(item, batch));
        })
      );
      setInvitations(recipientResults.flat());
      if (canReview && user?.id) {
        const eligibilityData = await getEligibilityByOwnerRequest(user.id);
        setEligibilityRows((Array.isArray(eligibilityData) ? eligibilityData : []).map(normalizeEligibility));
      } else if (isStudent && user?.id) {
        try {
          const eligibilityData = await getEligibilityByStudentRequest(user.id);
          setEligibilityRows(eligibilityData ? [normalizeEligibility(eligibilityData)] : []);
        } catch {
          setEligibilityRows([]);
        }
      } else {
        setEligibilityRows([]);
      }
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = isStudent ? await getTrainingCompanyRequestsByStudentRequest(user.id) : await getTrainingCompanyRequestsByOwnerRequest(user.id);
      setProviderApprovals((Array.isArray(data) ? data : []).map(normalizeCompanyRequest));
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      let data = [];
      if (isStudent) {
        if (!effectiveInternshipId) {
          setPlans([]);
          return;
        }
        data = await getTrainingPlansByInternshipRequest(Number(effectiveInternshipId));
      } else {
        data = await getTrainingPlansByOwnerRequest(user.id);
      }
      setPlans((Array.isArray(data) ? data : []).map(normalizeTrainingPlan));
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!effectiveInternshipId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getTrainingTasksByInternshipRequest(Number(effectiveInternshipId));
      setTasks((Array.isArray(data) ? data : []).map(normalizeTask));
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      let data = [];
      if (isStudent) {
        if (!effectiveInternshipId) {
          setWeeklyReports([]);
          return;
        }
        data = await getWeeklyReportsByInternshipRequest(Number(effectiveInternshipId));
      } else {
        data = await getWeeklyReportsByOwnerRequest(user.id);
      }
      setWeeklyReports((Array.isArray(data) ? data : []).map(normalizeWeeklyReport));
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluations = async () => {
    if (!effectiveInternshipId) {
      setFinalEvaluations([]);
      return;
    }
    setLoading(true);
    try {
      const [requestsResult, summaryResult] = await Promise.allSettled([
        getFinalEvaluationRequestsByInternshipRequest(Number(effectiveInternshipId)),
        getFinalEvaluationSummaryRequest(Number(effectiveInternshipId)),
      ]);
      const requests = requestsResult.status === 'fulfilled' && Array.isArray(requestsResult.value) ? requestsResult.value : [];
      const summary = summaryResult.status === 'fulfilled' && summaryResult.value ? summaryResult.value : null;
      const rows = requests.map(normalizeFinalRequest);
      if (summary) {
        rows.unshift({
          id: `summary-${summary.internship_id}`,
          studentName: summary.student_name || '',
          providerName: summary.provider_name || '',
          notificationStatus: summary.has_company_request ? 'Request Exists' : 'No Request Yet',
          companyRequestStatus: summary.company_status || '-',
          sendingTemplateName: '-',
          evaluationTemplateName: '-',
          academicEvaluationStatus: summary.academic_status || '-',
          companyEvaluationStatus: summary.company_status || '-',
          finalStatus: summary.has_company_evaluation || summary.has_academic_evaluation ? 'Visible in Student File' : 'Pending',
        });
      }
      setFinalEvaluations(rows);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisors();
    if (isStudent) loadMyInternshipContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isStudent || !user?.id) return;
    const loadStudentEligibility = async () => {
      try {
        const eligibilityData = await getEligibilityByStudentRequest(user.id);
        setEligibilityRows(eligibilityData ? [normalizeEligibility(eligibilityData)] : []);
      } catch {
        setEligibilityRows([]);
      }
    };
    loadStudentEligibility();
  }, [isStudent, user?.id]);

  useEffect(() => {
    if (!isPlanModalOpen || !approvedProviderOptions.length || planForm.companyRequestId) return;
    const first = approvedProviderOptions[0];
    setPlanForm((current) => ({ ...current, companyRequestId: String(first.id), acceptedPlatform: first.providerName || '' }));
  }, [isPlanModalOpen, approvedProviderOptions, planForm.companyRequestId]);

  useEffect(() => {
    if (!isTaskModalOpen) return;
    const firstInternship = internshipTaskOptions[0];
    const firstPlan = trainingTaskPlanOptions[0];
    setTaskForm((current) => ({
      ...current,
      dayDate: current.dayDate || new Date().toISOString().slice(0, 10),
      internshipId: current.internshipId || String(effectiveInternshipId || firstInternship?.id || ''),
      trainingPlanId: current.trainingPlanId || String(firstPlan?.id || effectiveTrainingPlanId || ''),
    }));
  }, [isTaskModalOpen, internshipTaskOptions, trainingTaskPlanOptions, effectiveInternshipId, effectiveTrainingPlanId]);

  useEffect(() => {
    if (!selectedTaskPlan) return;
    setTaskForm((current) => ({
      ...current,
      weekNo: calculateTaskWeekNo(selectedTaskPlan.approvedAt || selectedTaskPlan.reviewedAt || selectedTaskPlan.startDate, current.dayDate),
    }));
  }, [selectedTaskPlan, taskForm.dayDate]);

  useEffect(() => {
    if (activeTab === 'assignments') loadAssignments();
    if (activeTab === 'invitations') loadInvitationsAndEligibility();
    if (activeTab === 'providers') loadProviders();
    if (activeTab === 'plans') {
      loadProviders();
      loadPlans();
    }
    if (activeTab === 'tasks') {
      loadPlans();
      loadTasks();
    }
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'evaluation') loadEvaluations();
    if (activeTab === 'pendingEligibility') loadPendingEligibilityQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, contextInternshipId, autoContext?.internship_id]);

  const parseRecipientsText = (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [student_name, student_email] = line.split(',').map((x) => (x || '').trim());
        return { student_name, student_email };
      })
      .filter((x) => x.student_name);

  const handleInvite = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const resolvedAdvisorUserId = isAdvisor ? Number(user?.id) : Number(inviteForm.advisorUserId);
      if (!resolvedAdvisorUserId) {
        showFeedback('warning', 'Academic advisor is required.');
        return;
      }
      const recipients = inviteForm.invitationMode === 'Link'
        ? [{ student_name: 'Bulk Invitation Link', student_email: '' }]
        : parseRecipientsText(inviteForm.recipientsText);
      const result = await createInvitationBatchRequest({
        invitation_mode: inviteForm.invitationMode,
        advisor_user_id: resolvedAdvisorUserId,
        created_by_user_id: user?.id,
        excel_file_name: inviteForm.invitationMode === 'Excel' ? inviteForm.excelFileName || null : null,
        shared_link_url: null,
        invitation_message: inviteForm.invitationMessage,
        recipients,
      });
      if (inviteForm.invitationMode === 'Link') {
        setGeneratedInviteLink(result?.shared_link_url || `${window.location.origin}/register/invitation?batchId=${result?.id}`);
      } else {
        setGeneratedInviteLink('');
      }
      showFeedback('success', 'Invitation batch created successfully.');
      setIsInviteModalOpen(false);
      setInviteForm({
        invitationMode: 'Excel',
        advisorUserId: isAdvisor ? String(user?.id || '') : '',
        recipientsText: '',
        excelFileName: '',
        invitationMessage: 'You have been invited to access the internship training platform. Please log in and complete your profile.',
      });
      await loadInvitationsAndEligibility();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const openEligibilityModal = (record) => {
    setSelectedRecord(record);
    setEligibilityForm({
      recipientId: String(record.id),
      approvalOwnerUserId: record.advisorUserId ? String(record.advisorUserId) : '',
      approvalOwnerRole: 'AcademicAdvisor',
    });
    setIsEligibilityModalOpen(true);
  };

  const createEligibility = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createEligibilityRequest({
        invitation_recipient_id: Number(eligibilityForm.recipientId),
        advisor_assignment_id: null,
        approval_owner_user_id: eligibilityForm.approvalOwnerUserId ? Number(eligibilityForm.approvalOwnerUserId) : null,
        approval_owner_role: eligibilityForm.approvalOwnerRole,
      });
      showFeedback('success', 'Eligibility review created successfully.');
      setIsEligibilityModalOpen(false);
      await loadInvitationsAndEligibility();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSubmit = async (event) => {
    event.preventDefault();
    if (!hasEligibilityApproval) {
      showFeedback('warning', 'The student must be approved as eligible before submitting a training company.');
      return;
    }
    setLoading(true);
    try {
      await createTrainingCompanyRequestRequest({
        student_user_id: user?.id,
        provider_name: providerForm.providerName,
        provider_email: providerForm.providerEmail,
        contact_name: providerForm.contactName,
        contact_phone: providerForm.contactPhone,
        city: providerForm.city,
        sector: providerForm.sector,
        opportunity_title: providerForm.opportunityTitle,
      });
      showFeedback('success', 'Training company request submitted successfully.');
      setIsProviderModalOpen(false);
      setProviderForm({ providerName: '', providerEmail: '', contactName: '', contactPhone: '', city: '', sector: '', opportunityTitle: '' });
      await loadProviders();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const reviewProvider = async (record, status) => {
    try {
      if (status === 'Approved') {
        await approveTrainingCompanyRequestRequest(record.id, { actor_user_id: user?.id, comment: 'Approved from Internship Training Management' });
      } else {
        await rejectTrainingCompanyRequestRequest(record.id, { actor_user_id: user?.id, comment: 'Rejected from Internship Training Management' });
      }
      showFeedback('success', `Training company request ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`);
      if (isStudent) await loadMyInternshipContext();
      await loadProviders();
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    const resolvedInternshipId = Number(effectiveInternshipId || planForm.internshipId);
    if (!resolvedInternshipId) {
      showFeedback('warning', 'Internship ID is required.');
      return;
    }
    if (!planForm.companyRequestId) {
      showFeedback('warning', 'Please select the approved training company first.');
      return;
    }
    if (!planForm.acceptedPlatform) {
      showFeedback('warning', 'Accepted platform is required.');
      return;
    }
    setLoading(true);
    try {
      await createTrainingPlanRequestRequest({
        internship_id: resolvedInternshipId,
        student_user_id: user?.id,
        company_request_id: Number(planForm.companyRequestId),
        accepted_platform: planForm.acceptedPlatform,
        start_date: planForm.startDate,
        plan_title: planForm.planTitle,
        plan_summary: planForm.planSummary,
        attachment_file_name: planForm.planFileName || null,
        attachment_file_url: planForm.planFileUrl || null,
      });
      showFeedback('success', 'Training plan submitted successfully.');
      if (isStudent) await loadMyInternshipContext();
      setIsPlanModalOpen(false);
      setPlanForm({ internshipId: '', companyRequestId: '', acceptedPlatform: '', startDate: '', planTitle: '', planSummary: '', planFileName: '', planFileUrl: '' });
      await loadPlans();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const reviewPlan = async (record, status) => {
    try {
      if (status === 'Approved') {
        await approveTrainingPlanRequestRequest(record.id, { actor_user_id: user?.id, comment: 'Approved from Internship Training Management' });
      } else {
        await rejectTrainingPlanRequestRequest(record.id, { actor_user_id: user?.id, comment: 'Rejected / needs modification from Internship Training Management' });
      }
      showFeedback('success', `Training plan ${status === 'Approved' ? 'approved' : 'updated'} successfully.`);
      if (isStudent) await loadMyInternshipContext();
      await loadPlans();
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTaskPlan) {
      showFeedback('warning', 'Please select an approved training plan first.');
      return;
    }
    const resolvedInternshipId = Number(taskForm.internshipId || effectiveInternshipId);
    const resolvedTrainingPlanId = Number(taskForm.trainingPlanId || effectiveTrainingPlanId);
    if (!resolvedInternshipId) {
      showFeedback('warning', 'Internship is required.');
      return;
    }
    if (!resolvedTrainingPlanId) {
      showFeedback('warning', 'Approved training plan is required.');
      return;
    }
    setLoading(true);
    try {
      const taskResponse = await createTrainingTaskRequest({
        internship_id: resolvedInternshipId,
        training_plan_id: resolvedTrainingPlanId,
        student_user_id: user?.id,
        task_date: taskForm.dayDate,
        week_no: Number(taskForm.weekNo),
        task_title: taskForm.taskTitle,
      });
      if (taskForm.evidenceFile) {
        await addTrainingTaskEvidenceRequest(taskResponse.id, { file_name: taskForm.evidenceFile.name, file_url: null });
      }
      showFeedback('success', 'Daily task and evidence saved successfully.');
      if (isStudent) await loadMyInternshipContext();
      setIsTaskModalOpen(false);
      setTaskForm({ internshipId: '', trainingPlanId: '', taskTitle: '', dayDate: new Date().toISOString().slice(0, 10), weekNo: '1', evidenceFile: null });
      await loadTasks();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const openWeeklyReportModal = () => {
    if (!effectiveInternshipId) {
      showFeedback('warning', 'Internship context is required to generate weekly reports.');
      return;
    }
    setWeeklyReportForm((current) => ({
      ...current,
      weekNo: current.weekNo || String(autoContext?.latest_weekly_report_week_no ? Number(autoContext.latest_weekly_report_week_no) + 1 : 1),
    }));
    setIsWeeklyReportModalOpen(true);
  };

  const generateWeeklyReport = async (event) => {
    event.preventDefault();
    if (!effectiveInternshipId) {
      showFeedback('warning', 'Internship context is required to generate weekly reports.');
      return;
    }
    const weekNo = Number(weeklyReportForm.weekNo);
    if (!weekNo || weekNo <= 0) {
      showFeedback('warning', 'Week number must be greater than zero.');
      return;
    }
    setLoading(true);
    try {
      await generateWeeklyReportRequest({
        internship_id: Number(effectiveInternshipId),
        week_no: weekNo,
        requested_by_user_id: user?.id,
        report_title: `Auto Weekly Report - Week ${weekNo}`,
        report_summary: 'Generated automatically from daily tasks and uploaded evidence.',
      });
      showFeedback('success', 'Weekly report generated successfully.');
      setIsWeeklyReportModalOpen(false);
      setWeeklyReportForm({ weekNo: '1' });
      if (isStudent) await loadMyInternshipContext();
      await loadReports();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const reviewReport = async (record, status) => {
    try {
      if (status === 'Approved') {
        await approveWeeklyReportRequest(record.id, { actor_user_id: user?.id, comment: 'Approved from Internship Training Management' });
      } else {
        await rejectWeeklyReportRequest(record.id, { actor_user_id: user?.id, comment: 'Rejected from Internship Training Management' });
      }
      showFeedback('success', `Weekly report ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`);
      await loadReports();
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const openWeeklyReportDetails = async (row) => {
    setLoading(true);
    try {
      const data = await getWeeklyReportDetailsRequest(row.id);
      setWeeklyReportDetails(data);
      setIsWeeklyReportDetailsOpen(true);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluationRequest = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createFinalEvaluationRequestRequest({
        internship_id: Number(isStudent ? effectiveInternshipId : evaluationForm.internshipId),
        student_user_id: Number(isStudent ? user?.id : evaluationForm.studentUserId),
        provider_name: evaluationForm.providerName,
        provider_email: evaluationForm.providerEmail,
        sending_template_name: evaluationForm.sendingTemplateName,
        evaluation_template_name: evaluationForm.evaluationTemplateName,
        requested_by_user_id: user?.id,
      });
      showFeedback('success', 'Final evaluation request created successfully.');
      if (isStudent) await loadMyInternshipContext();
      setIsEvaluationModalOpen(false);
      setEvaluationForm({ internshipId: '', studentUserId: '', providerName: '', providerEmail: '', sendingTemplateName: 'Company Evaluation Request Email', evaluationTemplateName: 'Standard Company Internship Evaluation' });
      await loadEvaluations();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const openDelegation = (requestType, record) => {
    setDelegationTarget({ requestType, record });
    setDelegationForm({ toApproverType: 'Administrator', toOwnerUserId: '', reason: '' });
    setIsDelegationModalOpen(true);
  };

  const applyDelegation = async (event) => {
    event.preventDefault();
    if (!delegationTarget?.record) return;
    setLoading(true);
    try {
      const payload = {
        changed_by_user_id: user?.id,
        to_owner_user_id: Number(delegationForm.toOwnerUserId),
        to_owner_role: delegationForm.toApproverType,
        reason: delegationForm.reason,
      };
      if (delegationTarget.requestType === 'TrainingCompanyRequest') await delegateTrainingCompanyRequestRequest(delegationTarget.record.id, payload);
      if (delegationTarget.requestType === 'TrainingPlan') await delegateTrainingPlanRequestRequest(delegationTarget.record.id, payload);
      showFeedback('success', 'Delegation updated successfully.');
      setIsDelegationModalOpen(false);
      setDelegationTarget(null);
      await loadProviders();
      await loadPlans();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = {
    assignments: [
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'studentEmail', label: 'Student Email', filterType: 'text' },
      { key: 'advisorName', label: 'Academic Advisor', filterType: 'text' },
      { key: 'advisorEmail', label: 'Advisor Email', filterType: 'text' },
      { key: 'studentCode', label: 'Student Code', filterType: 'text' },
      { key: 'assignedAt', label: 'Assigned At', filterType: 'text', render: (value) => toLocalDate(value) },
      { key: 'status', label: 'Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
    ],
    delegations: [
      { key: 'message', label: 'Delegation Logs', filterType: 'text', render: () => <span className="text-muted">Backend read endpoint for approval delegation logs is not available yet.</span> },
    ],
    invitations: [
      { key: 'batchLabel', label: 'Batch', filterType: 'select', minWidth: 130 },
      { key: 'invitationMode', label: 'Mode', filterType: 'select', minWidth: 120 },
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'studentEmail', label: 'Email', filterType: 'text' },
      { key: 'assignedAdvisorName', label: 'Advisor', filterType: 'text' },
      { key: 'source', label: 'Source', filterType: 'select' },
      { key: 'loginStatus', label: 'Login', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      { key: 'emailNotificationStatus', label: 'Email Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      { key: 'invitedAt', label: 'Invited At', filterType: 'text', render: (value) => toLocalDate(value) },
      {
        key: 'actions',
        label: 'Actions',
        filterType: 'none',
        sortable: false,
        minWidth: 220,
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRecord(row)}>View</button>
            {canReview ? <button className="btn btn-sm btn-outline-secondary" onClick={() => openEligibilityModal(row)}>Create Review</button> : null}
          </div>
        ),
      },
    ],
    pendingEligibility: [
      { key: 'student_name', label: 'Student Name', filterType: 'text' },
      { key: 'student_email', label: 'Email', filterType: 'text' },
      { key: 'advisor_name', label: 'Academic Advisor', filterType: 'text' },
      { key: 'account_created', label: 'Account Created', filterType: 'select', render: (value) => <StatusBadge value={value ? 'Yes' : 'No'} /> },
      { key: 'invitation_status', label: 'Invitation Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      { key: 'eligibility_status', label: 'Eligibility Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      { key: 'user_status', label: 'User Status', filterType: 'select', render: (value) => <StatusBadge value={value || '-'} /> },
      { key: 'queue_created_at', label: 'Queue Date', filterType: 'text', render: (value) => toLocalDate(value) },
      {
        key: 'actions',
        label: 'Actions',
        filterType: 'none',
        sortable: false,
        minWidth: 230,
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRecord(row)}>View</button>
            {row.account_created && row.student_user_id ? (
              <>
                <button className="btn btn-sm btn-success" onClick={() => reviewPendingEligibilityQueueItem(row, 'Approved')}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => reviewPendingEligibilityQueueItem(row, 'Rejected')}>Reject</button>
              </>
            ) : <span className="text-muted small">Waiting for account creation</span>}
          </div>
        ),
      },
    ],
    providers: [
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'assignedAdvisorName', label: 'Advisor', filterType: 'text' },
      { key: 'providerName', label: 'Training Company', filterType: 'text' },
      { key: 'city', label: 'City', filterType: 'text' },
      { key: 'sector', label: 'Sector', filterType: 'select' },
      { key: 'opportunityTitle', label: 'Opportunity', filterType: 'text' },
      { key: 'approvalOwnerName', label: 'Approval Owner', filterType: 'text' },
      { key: 'approvalStatus', label: 'Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      {
        key: 'actions',
        label: 'Actions',
        filterType: 'none',
        sortable: false,
        minWidth: 260,
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRecord(row)}>View</button>
            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button className="btn btn-sm btn-success" onClick={() => reviewProvider(row, 'Approved')}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => reviewProvider(row, 'Rejected')}>Reject</button>
              </>
            ) : null}
            {isAdmin ? <button className="btn btn-sm btn-outline-warning" onClick={() => openDelegation('TrainingCompanyRequest', row)}>Delegate</button> : null}
          </div>
        ),
      },
    ],
    plans: [
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'assignedAdvisorName', label: 'Advisor', filterType: 'text' },
      { key: 'providerName', label: 'Approved Company', filterType: 'text' },
      { key: 'startDate', label: 'Training Start', filterType: 'text' },
      { key: 'planTitle', label: 'Plan Title', filterType: 'text' },
      { key: 'approvalOwnerName', label: 'Approval Owner', filterType: 'text' },
      { key: 'approvalStatus', label: 'Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      {
        key: 'actions',
        label: 'Actions',
        filterType: 'none',
        sortable: false,
        minWidth: 260,
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedRecord(row)}>View</button>
            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button className="btn btn-sm btn-success" onClick={() => reviewPlan(row, 'Approved')}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => reviewPlan(row, 'Rejected')}>Reject / Modify</button>
              </>
            ) : null}
            {isAdmin ? <button className="btn btn-sm btn-outline-warning" onClick={() => openDelegation('TrainingPlan', row)}>Delegate</button> : null}
          </div>
        ),
      },
    ],
    tasks: [
      { key: 'internshipId', label: 'Internship ID', filterType: 'text' },
      { key: 'planId', label: 'Plan ID', filterType: 'text' },
      { key: 'dayDate', label: 'Date', filterType: 'text' },
      { key: 'weekNo', label: 'Week', filterType: 'select' },
      { key: 'taskTitle', label: 'Task', filterType: 'text', minWidth: 260 },
      { key: 'evidenceFile', label: 'Evidence', filterType: 'text' },
      { key: 'status', label: 'Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
    ],
    reports: [
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'weekNo', label: 'Week', filterType: 'select' },
      { key: 'title', label: 'Auto Report', filterType: 'text', minWidth: 260 },
      { key: 'tasksCount', label: 'Tasks', filterType: 'text' },
      { key: 'evidenceCount', label: 'Evidence', filterType: 'text' },
      { key: 'source', label: 'Source', filterType: 'select' },
      { key: 'approvalOwnerName', label: 'Approval Owner', filterType: 'text' },
      { key: 'approvalStatus', label: 'Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
      {
        key: 'actions',
        label: 'Actions',
        filterType: 'none',
        sortable: false,
        minWidth: 230,
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" onClick={() => openWeeklyReportDetails(row)}>View</button>
            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button className="btn btn-sm btn-success" onClick={() => reviewReport(row, 'Approved')}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => reviewReport(row, 'Rejected')}>Reject</button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    evaluation: [
      { key: 'studentName', label: 'Student', filterType: 'text' },
      { key: 'providerName', label: 'Provider', filterType: 'text' },
      { key: 'notificationStatus', label: 'Advisor Notification', filterType: 'select' },
      { key: 'companyRequestStatus', label: 'Company Request', filterType: 'select' },
      { key: 'sendingTemplateName', label: 'Sending Template', filterType: 'text' },
      { key: 'evaluationTemplateName', label: 'Evaluation Template', filterType: 'text' },
      { key: 'finalStatus', label: 'Student File Status', filterType: 'select', render: (value) => <StatusBadge value={value} /> },
    ],
  };

  const rowsByTab = {
    assignments: visibleAssignments,
    delegations: [{ id: 'logs-info', message: 'Backend read endpoint for approval delegation logs is not available yet.' }],
    invitations: visibleInvitations,
    providers: visibleProviderApprovals,
    plans: visiblePlans,
    tasks: visibleTasks,
    reports: visibleReports,
    evaluation: visibleEvaluations,
    pendingEligibility: pendingEligibilityQueue,
  };

  const addConfig = {
    invitations: canReview ? ['Bulk Invite Students', () => setIsInviteModalOpen(true)] : null,
    providers: isStudent ? ['Submit Training Company', () => setIsProviderModalOpen(true)] : null,
    plans: isStudent ? ['Submit Training Plan', () => setIsPlanModalOpen(true)] : null,
    tasks: isStudent ? ['Add Daily Task & Evidence', () => setIsTaskModalOpen(true)] : null,
    reports: isStudent ? ['Generate Weekly Report', openWeeklyReportModal] : null,
    evaluation: isStudent || canReview ? ['Request Final Evaluation', () => setIsEvaluationModalOpen(true)] : null,
  }[activeTab];

  return (
    <div className="ims-training-redesign">
      <style>{`
        .ims-training-redesign .ims-clean-table-card {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 14px 38px rgba(15, 23, 42, 0.06);
        }
        .ims-clean-table-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.1rem 1.25rem;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 0.95));
        }
        .ims-filter-table-wrap { max-height: 68vh; }
        .ims-filter-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          background: #f8fafc;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          vertical-align: top;
        }
        .ims-filter-table thead tr.ims-filter-row th {
          top: 0;
          background: #f8fafc;
          z-index: 3;
          padding: .65rem .55rem;
        }
        .ims-column-filter-control {
          min-width: 130px;
          border-radius: 999px;
          background-color: #fff;
          font-size: .82rem;
        }
        .ims-column-filter-control::placeholder {
          color: #64748b;
          opacity: 1;
        }
        .ims-column-filter-placeholder {
          display: inline-flex;
          align-items: center;
          min-height: 31px;
          padding: .25rem .75rem;
          border: 1px dashed rgba(100, 116, 139, .35);
          border-radius: 999px;
          color: #64748b;
          background: #fff;
          font-size: .82rem;
          font-weight: 500;
          white-space: nowrap;
        }
        .ims-filter-table tbody tr:hover { background: rgba(13, 110, 253, 0.035); }
        .ims-context-strip {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          background: #fff;
          padding: 1rem;
        }
        .ims-compact-stat {
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 14px;
          padding: .8rem;
          background: #f8fafc;
          height: 100%;
        }
      `}</style>

      <ModulePageHeader
        title={isArabic ? 'إدارة التدريب الداخلي' : 'Internship Training Management'}
        description={
          isArabic
            ? 'تصميم جدولي موحّد: جدول واحد لكل تبويب، وفلاتر مباشرة داخل رؤوس الأعمدة.'
            : 'Unified table-first design: one main table per tab, with filters directly inside column headers.'
        }
        addLabel={addConfig?.[0]}
        onAddClick={addConfig?.[1]}
      />

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : feedback.type === 'warning' ? 'warning' : 'success'} alert-dismissible fade show`} role="alert">
          {feedback.message}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setFeedback({ type: '', message: '' })} />
        </div>
      ) : null}

      <ModuleTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {generatedInviteLink ? (
        <div className="alert alert-info d-flex justify-content-between align-items-center gap-3 mt-3 flex-wrap">
          <div>
            <div className="fw-semibold">Student Registration Link</div>
            <div className="small text-break">{generatedInviteLink}</div>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(generatedInviteLink);
              showFeedback('success', 'Invitation link copied successfully.');
            }}
          >
            Copy
          </button>
        </div>
      ) : null}

      {isStudent ? (
        <div className="ims-context-strip mt-3">
          {loadingContext ? (
            <div className="text-muted">Loading internship context...</div>
          ) : !autoContext ? (
            <div className="alert alert-warning mb-0">No internship context was found yet for this student.</div>
          ) : (
            <div className="row g-3">
              {[
                ['Internship ID', autoContext.internship_id],
                ['Provider', autoContext.provider_name || '-'],
                ['Internship Title', autoContext.internship_title || '-'],
                ['Advisor', autoContext.advisor_name || '-'],
                ['Latest Plan ID', autoContext.latest_training_plan_id || '-'],
                ['Latest Plan Status', autoContext.latest_training_plan_status || '-'],
                ['Latest Weekly Report', autoContext.latest_weekly_report_week_no ? `Week ${autoContext.latest_weekly_report_week_no}` : '-'],
                ['Final Evaluation', autoContext.latest_final_evaluation_request_id ? 'Requested' : 'Not Requested'],
              ].map(([label, value]) => (
                <div key={label} className="col-md-3">
                  <div className="ims-compact-stat">
                    <div className="text-muted small">{label}</div>
                    <div className="fw-semibold text-break">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {!isStudent && ['tasks', 'evaluation'].includes(activeTab) ? (
        <div className="ims-context-strip mt-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Internship ID Context</label>
              <input className="form-control" value={contextInternshipId} onChange={(event) => setContextInternshipId(event.target.value)} placeholder="Enter internship ID" />
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={() => activeTab === 'tasks' ? loadTasks() : loadEvaluations()}>
                Load
              </button>
            </div>
            <div className="col-md-6 text-muted small">This field identifies the internship context required by the API. It is not a table filter.</div>
          </div>
        </div>
      ) : null}

      {activeTab === 'providers' && isStudent && !hasEligibilityApproval ? (
        <div className="alert alert-warning mt-3 py-2">You can submit a training company only after eligibility approval and automatic training letter generation.</div>
      ) : null}
      {activeTab === 'plans' && isStudent && !approvedProvider ? (
        <div className="alert alert-warning mt-3 py-2">Training plan entry is locked until the training company is approved.</div>
      ) : null}
      {activeTab === 'tasks' && isStudent && !approvedPlan ? (
        <div className="alert alert-warning mt-3 py-2">Daily tasks and evidence are locked until the training plan is approved.</div>
      ) : null}

      <FilterableDataTable
        title={isStudent ? 'My Internship Training' : 'Internship Training Control'}
        subtitle="Use the filters inside each column header. No external filters or duplicated tables are used."
        columns={columns[activeTab] || []}
        rows={rowsByTab[activeTab] || []}
        rowKey="id"
        loading={loading}
        emptyMessage="No records found."
      />

      <AppModal isOpen={Boolean(selectedRecord)} title="Record Details" onClose={() => setSelectedRecord(null)}>
        <DetailsGrid record={selectedRecord} />
      </AppModal>

      <AppModal isOpen={isInviteModalOpen} title="Bulk Invite Students" onClose={() => setIsInviteModalOpen(false)}>
        <form onSubmit={handleInvite} className="d-grid gap-3">
          <div className="alert alert-light border mb-0">
            The invitation page now uses one unified table. Batch, mode, advisor, login, and email status are filterable from the table header.
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Invitation Method</label>
              <select className="form-select" value={inviteForm.invitationMode} onChange={(event) => setInviteForm((current) => ({ ...current, invitationMode: event.target.value }))}>
                <option value="Excel">Excel</option>
                <option value="Link">Link</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Academic Advisor</label>
              {isAdvisor ? (
                <input className="form-control" value={`${user?.fullName || ''} - ${user?.email || ''}`} readOnly />
              ) : (
                <select className="form-select" value={inviteForm.advisorUserId} onChange={(event) => setInviteForm((current) => ({ ...current, advisorUserId: event.target.value }))} required>
                  <option value="">Select advisor</option>
                  {advisorOptions.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.fullName} - {advisor.email}</option>)}
                </select>
              )}
            </div>
            {inviteForm.invitationMode === 'Excel' ? (
              <>
                <div className="col-md-6">
                  <label className="form-label">Excel File Name</label>
                  <input className="form-control" value={inviteForm.excelFileName} onChange={(event) => setInviteForm((current) => ({ ...current, excelFileName: event.target.value }))} placeholder="students_batch.xlsx" />
                </div>
                <div className="col-12">
                  <label className="form-label">Recipients</label>
                  <textarea className="form-control" rows="6" value={inviteForm.recipientsText} onChange={(event) => setInviteForm((current) => ({ ...current, recipientsText: event.target.value }))} placeholder="One per line: Student Name,student@email.com" required />
                </div>
              </>
            ) : (
              <div className="col-12"><div className="alert alert-info mb-0">The registration link will be generated automatically after saving this batch.</div></div>
            )}
            <div className="col-12">
              <label className="form-label">General Invitation Message</label>
              <textarea className="form-control" rows="4" value={inviteForm.invitationMessage} onChange={(event) => setInviteForm((current) => ({ ...current, invitationMessage: event.target.value }))} required />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsInviteModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Send Invitations'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isProviderModalOpen} title="Submit Training Company" onClose={() => setIsProviderModalOpen(false)}>
        <form onSubmit={handleProviderSubmit} className="d-grid gap-3">
          <div className="row g-3">
            {[
              ['providerName', 'Training Company', 'text', true],
              ['providerEmail', 'Provider Email', 'email', true],
              ['contactName', 'Contact Name', 'text', false],
              ['contactPhone', 'Contact Phone', 'text', false],
              ['city', 'City', 'text', false],
              ['sector', 'Sector', 'text', false],
              ['opportunityTitle', 'Training Opportunity', 'text', false],
            ].map(([name, label, type, required]) => (
              <div key={name} className="col-md-6">
                <label className="form-label">{label}</label>
                <input type={type} className="form-control" value={providerForm[name]} onChange={(event) => setProviderForm((current) => ({ ...current, [name]: event.target.value }))} required={required} />
              </div>
            ))}
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsProviderModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Submit Company'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isPlanModalOpen} title="Submit Training Plan" onClose={() => setIsPlanModalOpen(false)}>
        <form onSubmit={handlePlanSubmit} className="d-grid gap-3">
          <div className="row g-3">
            {!isStudent ? (
              <div className="col-md-6">
                <label className="form-label">Internship ID</label>
                <input className="form-control" value={planForm.internshipId} onChange={(event) => setPlanForm((current) => ({ ...current, internshipId: event.target.value }))} />
              </div>
            ) : null}
            <div className="col-md-6">
              <label className="form-label">Approved Training Company</label>
              <select className="form-select" value={planForm.companyRequestId} onChange={(event) => {
                const selected = approvedProviderOptions.find((item) => String(item.id) === event.target.value);
                setPlanForm((current) => ({ ...current, companyRequestId: event.target.value, acceptedPlatform: selected?.providerName || current.acceptedPlatform }));
              }} required>
                <option value="">Select company</option>
                {approvedProviderOptions.map((item) => <option key={item.id} value={item.id}>{item.providerName} - {item.studentName || 'Student'}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Accepted Platform</label>
              <input className="form-control" value={planForm.acceptedPlatform} onChange={(event) => setPlanForm((current) => ({ ...current, acceptedPlatform: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-control" value={planForm.startDate} onChange={(event) => setPlanForm((current) => ({ ...current, startDate: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Plan Title</label>
              <input className="form-control" value={planForm.planTitle} onChange={(event) => setPlanForm((current) => ({ ...current, planTitle: event.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="form-label">Plan Summary</label>
              <textarea className="form-control" rows="4" value={planForm.planSummary} onChange={(event) => setPlanForm((current) => ({ ...current, planSummary: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Attachment File Name</label>
              <input className="form-control" value={planForm.planFileName} onChange={(event) => setPlanForm((current) => ({ ...current, planFileName: event.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Attachment URL</label>
              <input className="form-control" value={planForm.planFileUrl} onChange={(event) => setPlanForm((current) => ({ ...current, planFileUrl: event.target.value }))} />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsPlanModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Submit Plan'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isTaskModalOpen} title="Add Daily Task & Evidence" onClose={() => setIsTaskModalOpen(false)}>
        <form onSubmit={handleTaskSubmit} className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Internship</label>
              <select className="form-select" value={taskForm.internshipId || String(effectiveInternshipId || '')} onChange={(event) => setTaskForm((current) => ({ ...current, internshipId: event.target.value, trainingPlanId: '' }))} required>
                <option value="">Select internship</option>
                {internshipTaskOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Approved Plan</label>
              <select className="form-select" value={taskForm.trainingPlanId || String(effectiveTrainingPlanId || '')} onChange={(event) => setTaskForm((current) => ({ ...current, trainingPlanId: event.target.value }))} required>
                <option value="">Select approved plan</option>
                {trainingTaskPlanOptions.map((item) => <option key={item.id} value={item.id}>{item.planTitle || `Plan #${item.id}`}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={taskForm.dayDate} onChange={(event) => setTaskForm((current) => ({ ...current, dayDate: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Week</label>
              <input className="form-control" value={taskForm.weekNo} onChange={(event) => setTaskForm((current) => ({ ...current, weekNo: event.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="form-label">Task Title</label>
              <textarea className="form-control" rows="3" value={taskForm.taskTitle} onChange={(event) => setTaskForm((current) => ({ ...current, taskTitle: event.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="form-label">Evidence File</label>
              <input type="file" className="form-control" onChange={(event) => setTaskForm((current) => ({ ...current, evidenceFile: event.target.files?.[0] || null }))} />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isWeeklyReportModalOpen} title="Generate Weekly Report" onClose={() => setIsWeeklyReportModalOpen(false)}>
        <form onSubmit={generateWeeklyReport} className="d-grid gap-3">
          <div className="alert alert-light border mb-0">Weekly reports are generated automatically from daily tasks and uploaded evidence.</div>
          <div>
            <label className="form-label">Week Number</label>
            <input type="number" min="1" className="form-control" value={weeklyReportForm.weekNo} onChange={(event) => setWeeklyReportForm((current) => ({ ...current, weekNo: event.target.value }))} required />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsWeeklyReportModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isEvaluationModalOpen} title="Request Final Evaluation" onClose={() => setIsEvaluationModalOpen(false)}>
        <form onSubmit={handleEvaluationRequest} className="d-grid gap-3">
          <div className="row g-3">
            {!isStudent ? (
              <>
                <div className="col-md-6">
                  <label className="form-label">Internship ID</label>
                  <input className="form-control" value={evaluationForm.internshipId} onChange={(event) => setEvaluationForm((current) => ({ ...current, internshipId: event.target.value }))} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Student User ID</label>
                  <input className="form-control" value={evaluationForm.studentUserId} onChange={(event) => setEvaluationForm((current) => ({ ...current, studentUserId: event.target.value }))} required />
                </div>
              </>
            ) : null}
            <div className="col-md-6">
              <label className="form-label">Provider Name</label>
              <input className="form-control" value={evaluationForm.providerName} onChange={(event) => setEvaluationForm((current) => ({ ...current, providerName: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Provider Email</label>
              <input type="email" className="form-control" value={evaluationForm.providerEmail} onChange={(event) => setEvaluationForm((current) => ({ ...current, providerEmail: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Sending Template</label>
              <input className="form-control" value={evaluationForm.sendingTemplateName} onChange={(event) => setEvaluationForm((current) => ({ ...current, sendingTemplateName: event.target.value }))} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Evaluation Template</label>
              <input className="form-control" value={evaluationForm.evaluationTemplateName} onChange={(event) => setEvaluationForm((current) => ({ ...current, evaluationTemplateName: event.target.value }))} required />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsEvaluationModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Create Request'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isDelegationModalOpen} title="Delegate Approval" onClose={() => setIsDelegationModalOpen(false)}>
        <form onSubmit={applyDelegation} className="d-grid gap-3">
          <div>
            <label className="form-label">To Approver Type</label>
            <select className="form-select" value={delegationForm.toApproverType} onChange={(event) => setDelegationForm((current) => ({ ...current, toApproverType: event.target.value }))}>
              <option value="Administrator">Administrator</option>
              <option value="AcademicAdvisor">Academic Advisor</option>
            </select>
          </div>
          <div>
            <label className="form-label">To Owner User</label>
            <select className="form-select" value={delegationForm.toOwnerUserId} onChange={(event) => setDelegationForm((current) => ({ ...current, toOwnerUserId: event.target.value }))} required>
              <option value="">Select user</option>
              {advisorOptions.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.fullName} - {advisor.email}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Reason</label>
            <textarea className="form-control" rows="3" value={delegationForm.reason} onChange={(event) => setDelegationForm((current) => ({ ...current, reason: event.target.value }))} required />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsDelegationModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Apply Delegation'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal isOpen={isEligibilityModalOpen} title="Create Eligibility Review" onClose={() => setIsEligibilityModalOpen(false)}>
        <form onSubmit={createEligibility} className="d-grid gap-3">
          <div className="alert alert-light border mb-0">This creates an eligibility review for the selected invitation recipient.</div>
          <div>
            <label className="form-label">Invitation Recipient ID</label>
            <input className="form-control" value={eligibilityForm.recipientId} readOnly />
          </div>
          <div>
            <label className="form-label">Approval Owner User</label>
            <select className="form-select" value={eligibilityForm.approvalOwnerUserId} onChange={(event) => setEligibilityForm((current) => ({ ...current, approvalOwnerUserId: event.target.value }))}>
              <option value="">Auto / Not selected</option>
              {advisorOptions.map((advisor) => <option key={advisor.id} value={advisor.id}>{advisor.fullName} - {advisor.email}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Approval Owner Role</label>
            <select className="form-select" value={eligibilityForm.approvalOwnerRole} onChange={(event) => setEligibilityForm((current) => ({ ...current, approvalOwnerRole: event.target.value }))}>
              <option value="AcademicAdvisor">Academic Advisor</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsEligibilityModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Create Review'}</button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={isWeeklyReportDetailsOpen}
        title="Weekly Report Details"
        onClose={() => {
          setIsWeeklyReportDetailsOpen(false);
          setWeeklyReportDetails(null);
        }}
      >
        {weeklyReportDetails ? <DetailsGrid record={weeklyReportDetails} /> : <div className="text-muted">No details loaded.</div>}
      </AppModal>
    </div>
  );
}

export default InternshipModulePage;