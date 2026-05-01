import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import ModuleTabs from '../../../shared/components/ModuleTabs';
import AppTable from '../../../shared/components/AppTable';
import AppModal from '../../../shared/components/AppModal';
import TableToolbar from '../../../shared/components/TableToolbar';
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
  getFinalEvaluationRequestsByInternshipRequest,
  getFinalEvaluationSummaryRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getMyInternshipContextRequest,
  getTrainingCompanyRequestsByOwnerRequest,
  getTrainingCompanyRequestsByStudentRequest,
  getTrainingPlansByInternshipRequest,
  getTrainingPlansByOwnerRequest,
  getTrainingTasksByInternshipRequest,
  getWeeklyReportsByInternshipRequest,
  getWeeklyReportsByOwnerRequest,
  rejectEligibilityRequest,
  rejectTrainingCompanyRequestRequest,
  rejectTrainingPlanRequestRequest,
  rejectWeeklyReportRequest,
  getPendingEligibilityQueueRequest,
  getMyPendingEligibilityQueueRequest,  
  getEligibilityByStudentRequest,
  getWeeklyReportDetailsRequest,
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
  return <span className="badge text-bg-light border">{value || '-'}</span>;
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
    batchId: item.batch_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: batch?.advisorName || '',
    assignedAdvisorEmail: '',
    source: batch?.invitationMode === 'Link' ? 'Shared Invitation Link' : 'Excel Import',
    invitationLink: batch?.sharedLinkUrl || '',
    invitedBy: '',
    invitationMessage: '',
    invitationChannel: 'Bulk Email Notification',
    invitedAt: item.sent_at || batch?.sentAt || batch?.createdAt || '',
    loginStatus:
      item.invitation_status === 'Accepted'
        ? 'Logged In'
        : item.invitation_status || 'Pending Login',
    profileReviewStatus: 'Not Created',
    approvalOwner: 'AcademicAdvisor',
    approvalOwnerName: batch?.advisorName || '',
    approvalOwnerEmail: '',
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
    assignedAdvisorEmail: '',
    source: 'Eligibility Review',
    invitationLink: '',
    invitedBy: '',
    invitationMessage: '',
    invitationChannel: '',
    invitedAt: item.created_at || '',
    loginStatus: '',
    profileReviewStatus: item.status || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.advisor_name || '',
    approvalOwnerEmail: '',
    reviewComment: item.comment || '',
    emailNotificationStatus: item.status || '',
    trainingLicenseLetter:
      item.status === 'Approved'
        ? `TrainingLetter_${(item.student_name || 'student').replaceAll(' ', '_')}.pdf`
        : '',
    letterDeliveryStatus:
      item.status === 'Approved'
        ? 'Auto generated after eligibility approval'
        : 'Pending',
    studentUserId: item.student_user_id,
  };
}

function normalizeCompanyRequest(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    assignedAdvisorEmail: '',
    providerName: item.provider_name || '',
    providerEmail: item.provider_email || '',
    contactName: item.contact_name || '',
    contactPhone: item.contact_phone || '',
    city: item.city || '',
    sector: item.sector || '',
    opportunityTitle: item.opportunity_title || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    approvalOwnerEmail: '',
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
    studentEmail: '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    assignedAdvisorEmail: '',
    providerName: item.provider_name || '',
    startDate: item.start_date || '',
    directStartConfirmation: item.start_date ? 'Submitted' : '',
    planTitle: item.plan_title || '',
    planSummary: item.plan_summary || '',
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    approvalOwnerEmail: '',
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
    studentName: '',
    studentEmail: '',
    assignedAdvisorName: '',
    assignedAdvisorEmail: '',
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
    studentEmail: '',
    weekNo: item.week_no || '',
    title: item.report_title || '',
    generatedAt: item.generated_at || '',
    source: item.generated_from_tasks
      ? 'Generated from daily tasks and evidence'
      : 'Manual',
    tasksCount: item.total_tasks || 0,
    evidenceCount: item.evidence_count || 0,
    approvalOwner: item.approval_owner_role || '',
    approvalOwnerName: item.approval_owner_name || '',
    approvalOwnerEmail: '',
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
  const [search, setSearch] = useState('');

  const [advisors, setAdvisors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [invitationBatches, setInvitationBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);
  const [providerApprovals, setProviderApprovals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [finalEvaluations, setFinalEvaluations] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [delegationTarget, setDelegationTarget] = useState(null);

  const [pendingEligibilityQueue, setPendingEligibilityQueue] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  ;
  const [feedback, setFeedback] = useState({ type: '', message: '' });


  const [contextInternshipId, setContextInternshipId] = useState('');
  const [autoContext, setAutoContext] = useState(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [weeklyReportDetails, setWeeklyReportDetails] = useState(null);
  const [isWeeklyReportDetailsOpen, setIsWeeklyReportDetailsOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);
  const [weeklyReportForm, setWeeklyReportForm] = useState({
    weekNo: '1',
  });
  const [inviteForm, setInviteForm] = useState({
    invitationMode: 'Excel',
    advisorUserId: '',
    recipientsText: '',
    excelFileName: '',
    sharedLink: '',
    invitationMessage:
      'You have been invited to access the internship training platform. Please log in and complete your profile.',
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
    evidenceUrl: '',
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

  const effectiveInternshipId = isStudent
  ? autoContext?.internship_id || ''
  : contextInternshipId;

const effectiveTrainingPlanId = isStudent
  ? autoContext?.latest_training_plan_id || ''
  : taskForm.trainingPlanId;

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const handleSessionError = async (error) => {
    showFeedback('danger', error.message || 'Request failed.');

    if (String(error.message || '').toLowerCase().includes('session')) {
      await logout();
    }
  };

  const filterRows = (rows) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((item) =>
      Object.values(item || {})
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  };

  const scopeByRole = (rows) => {
    if (isStudent) {
      return rows.filter(
        (item) =>
          item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
          item.studentName === studentName ||
          !item.studentEmail
      );
    }

    return rows;
  };

  const advisorOptions = useMemo(
    () =>
      advisors.map((advisor) => ({
        id: advisor.id,
        fullName: advisor.fullName,
        email: advisor.email,
      })),
    [advisors]
  );

  const visibleAssignments = useMemo(
    () =>
      filterRows(
        isAdvisor
          ? assignments.filter(
              (item) => item.advisorEmail?.toLowerCase() === user?.email?.toLowerCase()
            )
          : assignments
      ),
    [assignments, isAdvisor, search, user?.email]
  );

  const visibleInvitations = useMemo(
    () => filterRows(scopeByRole(invitations)),
    [invitations, search, role, studentEmail, studentName]
  );

  const visibleProviderApprovals = useMemo(
    () => filterRows(scopeByRole(providerApprovals)),
    [providerApprovals, search, role, studentEmail, studentName]
  );

  const visiblePlans = useMemo(
    () => filterRows(scopeByRole(plans)),
    [plans, search, role, studentEmail, studentName]
  );

  const visibleTasks = useMemo(
    () => filterRows(scopeByRole(tasks)),
    [tasks, search, role, studentEmail, studentName]
  );

  const visibleReports = useMemo(
    () => filterRows(scopeByRole(weeklyReports)),
    [weeklyReports, search, role, studentEmail, studentName]
  );

  const visibleEvaluations = useMemo(
    () => filterRows(scopeByRole(finalEvaluations)),
    [finalEvaluations, search, role, studentEmail, studentName]
  );

  const eligibility = useMemo(() => {
    return eligibilityRows.find(
      (item) =>
        item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
        item.studentName === studentName
    );
  }, [eligibilityRows, studentEmail, studentName]);

  const hasEligibilityApproval = isApproved(eligibility?.profileReviewStatus);

  const approvedProvider = useMemo(() => {
    return providerApprovals.find(
      (item) =>
        (item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
          item.studentName === studentName) &&
        isApproved(item.approvalStatus)
    );
  }, [providerApprovals, studentEmail, studentName]);

  const approvedPlan = useMemo(() => {
    return plans.find(
      (item) =>
        (item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
          item.studentName === studentName) &&
        isApproved(item.approvalStatus)
    );
  }, [plans, studentEmail, studentName]);

  const approvedProviderOptions = useMemo(() => {
    const rows = providerApprovals.filter((item) => isApproved(item.approvalStatus));

    if (isStudent) {
      return rows.filter(
        (item) =>
          item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
          item.studentName === studentName
      );
    }

    return rows;
  }, [providerApprovals, isStudent, studentEmail, studentName]);
  

  const selectedApprovedProvider = useMemo(() => {
    return approvedProviderOptions.find(
      (item) => String(item.id) === String(planForm.companyRequestId)
    ) || null;
  }, [approvedProviderOptions, planForm.companyRequestId]);

  const approvedTaskPlanOptions = useMemo(() => {
    const rows = plans.filter((item) => isApproved(item.approvalStatus));

    if (isStudent) {
      return rows.filter(
        (item) =>
          item.studentEmail?.toLowerCase() === studentEmail.toLowerCase() ||
          item.studentName === studentName ||
          !item.studentEmail
      );
    }

    return rows;
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

    return approvedTaskPlanOptions.filter(
      (item) => String(item.internshipId) === targetInternshipId
    );
  }, [approvedTaskPlanOptions, taskForm.internshipId, effectiveInternshipId]);

  const selectedTaskPlan = useMemo(() => {
    return trainingTaskPlanOptions.find(
      (item) => String(item.id) === String(taskForm.trainingPlanId)
    ) || null;
  }, [trainingTaskPlanOptions, taskForm.trainingPlanId]);

  const calculateTaskWeekNo = (approvedAtOrReviewedAt, taskDate) => {
    if (!approvedAtOrReviewedAt || !taskDate) return '1';

    const approvedDate = new Date(approvedAtOrReviewedAt);
    const currentTaskDate = new Date(taskDate);

    if (Number.isNaN(approvedDate.getTime()) || Number.isNaN(currentTaskDate.getTime())) {
      return '1';
    }

    const diffDays = Math.max(
      0,
      Math.floor((currentTaskDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24))
    );

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
    const data = isAdmin
      ? await getPendingEligibilityQueueRequest()
      : await getMyPendingEligibilityQueueRequest();

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

    if (!reviewId) {
      throw new Error('Eligibility review could not be created.');
    }

    if (status === 'Approved') {
      await approveEligibilityRequest(reviewId, {
        actor_user_id: user?.id,
        comment: 'Approved directly from Pending Eligibility Queue',
      });
    } else {
      await rejectEligibilityRequest(reviewId, {
        actor_user_id: user?.id,
        comment: 'Rejected directly from Pending Eligibility Queue',
      });
    }

    setFeedback({
      type: 'success',
      message: `Eligibility ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`,
    });

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

      if (data?.internship_id) {
        setContextInternshipId(String(data.internship_id));
      }
    } catch (error) {
      const message = String(error.message || '').toLowerCase();

      if (message.includes('no internship context')) {
        setAutoContext(null);
      } else {
        await handleSessionError(error);
      }
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

      const targetAdvisors = isAdvisor
        ? normalizedAdvisors.filter(
            (item) => item.email?.toLowerCase() === user?.email?.toLowerCase()
          )
        : normalizedAdvisors;

      const results = await Promise.all(
        targetAdvisors.map(async (advisor) => {
          const students = await getAdvisorStudentsRequest(advisor.id);
          return (Array.isArray(students) ? students : []).map((student) =>
            normalizeAdvisorStudent(student, advisor)
          );
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

      const batch = selectedBatch || normalizedBatches[0] || null;
      setSelectedBatch(batch);

      if (batch?.id) {
        const recipients = await getInvitationRecipientsRequest(batch.id);
        setInvitations(
          (Array.isArray(recipients) ? recipients : []).map((item) =>
            normalizeInvitationRecipient(item, batch)
          )
        );
      } else {
        setInvitations([]);
      }

      if (canReview && user?.id) {
        const eligibilityData = await getEligibilityByOwnerRequest(user.id);
        setEligibilityRows(
          (Array.isArray(eligibilityData) ? eligibilityData : []).map(normalizeEligibility)
        );
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
      const data = isStudent
        ? await getTrainingCompanyRequestsByStudentRequest(user.id)
        : await getTrainingCompanyRequestsByOwnerRequest(user.id);

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

      const requests =
        requestsResult.status === 'fulfilled' && Array.isArray(requestsResult.value)
          ? requestsResult.value
          : [];

      const summary =
        summaryResult.status === 'fulfilled' && summaryResult.value
          ? summaryResult.value
          : null;

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
          finalStatus:
            summary.has_company_evaluation || summary.has_academic_evaluation
              ? 'Visible in Student File'
              : 'Pending',
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
    if (isStudent) {
      loadMyInternshipContext();
    }
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
  if (!isPlanModalOpen) return;
  if (!approvedProviderOptions.length) return;
  if (planForm.companyRequestId) return;

  const first = approvedProviderOptions[0];

  setPlanForm((current) => ({
    ...current,
    companyRequestId: String(first.id),
    acceptedPlatform: first.providerName || '',
  }));
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
}, [
  isTaskModalOpen,
  internshipTaskOptions,
  trainingTaskPlanOptions,
  effectiveInternshipId,
  effectiveTrainingPlanId,
]);

useEffect(() => {
  if (!selectedTaskPlan) return;

  setTaskForm((current) => ({
    ...current,
    weekNo: calculateTaskWeekNo(
      selectedTaskPlan.approvedAt || selectedTaskPlan.reviewedAt || selectedTaskPlan.startDate,
      current.dayDate
    ),
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
    }    if (activeTab === 'reports') loadReports();
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
    const resolvedAdvisorUserId = isAdvisor
      ? Number(user?.id)
      : Number(inviteForm.advisorUserId);

    if (!resolvedAdvisorUserId) {
      showFeedback('warning', 'Academic advisor is required.');
      return;
    }

    const recipients =
      inviteForm.invitationMode === 'Link'
        ? [{ student_name: 'Bulk Invitation Link', student_email: '' }]
        : parseRecipientsText(inviteForm.recipientsText);

    const result = await createInvitationBatchRequest({
      invitation_mode: inviteForm.invitationMode,
      advisor_user_id: resolvedAdvisorUserId,
      created_by_user_id: user?.id,
      excel_file_name:
        inviteForm.invitationMode === 'Excel' ? inviteForm.excelFileName || null : null,
      shared_link_url: null,
      invitation_message: inviteForm.invitationMessage,
      recipients,
    });

    if (inviteForm.invitationMode === 'Link') {
      setGeneratedInviteLink(
        result?.shared_link_url ||
          `${window.location.origin}/register/invitation?batchId=${result?.id}`
      );
    } else {
      setGeneratedInviteLink('');
    }

    setFeedback({ type: 'success', message: 'Invitation batch created successfully.' });
    setIsInviteModalOpen(false);
    setInviteForm({
      invitationMode: 'Excel',
      advisorUserId: isAdvisor ? String(user?.id || '') : '',
      recipientsText: '',
      excelFileName: '',
      sharedLink: '',
      invitationMessage:
        'You have been invited to access the internship training platform. Please log in and complete your profile.',
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
        approvalOwnerUserId: selectedBatch?.advisorUserId
          ? String(selectedBatch.advisorUserId)
          : '',
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
        approval_owner_user_id: eligibilityForm.approvalOwnerUserId
          ? Number(eligibilityForm.approvalOwnerUserId)
          : null,
        approval_owner_role: eligibilityForm.approvalOwnerRole,
      });

      setFeedback({ type: 'success', message: 'Eligibility review created successfully.' });
      setIsEligibilityModalOpen(false);
      await loadInvitationsAndEligibility();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };
  const reviewEligibility = async (record, status) => {
    try {
      if (status === 'Approved') {
        await approveEligibilityRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Approved from Internship Training Management',
        });
      } else {
        await rejectEligibilityRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Rejected from Internship Training Management',
        });
      }

      setFeedback({
        type: 'success',
        message: `Eligibility ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`,
      });

      if (isStudent) {
        await loadMyInternshipContext();
      }

      await loadInvitationsAndEligibility();
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const handleProviderSubmit = async (event) => {
    event.preventDefault();

    if (!hasEligibilityApproval) {
      showFeedback(
        'warning',
        'The student must be approved as eligible before submitting a training company.'
      );
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

      setFeedback({ type: 'success', message: 'Training company request submitted successfully.' });
      setIsProviderModalOpen(false);
      setProviderForm({
        providerName: '',
        providerEmail: '',
        contactName: '',
        contactPhone: '',
        city: '',
        sector: '',
        opportunityTitle: '',
      });
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
        await approveTrainingCompanyRequestRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Approved from Internship Training Management',
        });
      } else {
        await rejectTrainingCompanyRequestRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Rejected from Internship Training Management',
        });
      }

      setFeedback({
        type: 'success',
        message: `Training company request ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`,
      });

      if (isStudent) {
        await loadMyInternshipContext();
      }

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

      setFeedback({ type: 'success', message: 'Training plan submitted successfully.' });
      await loadMyInternshipContext();
      setIsPlanModalOpen(false);

      setPlanForm({
        internshipId: '',
        companyRequestId: '',
        acceptedPlatform: '',
        startDate: '',
        planTitle: '',
        planSummary: '',
        planFileName: '',
        planFileUrl: '',
      });

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
        await approveTrainingPlanRequestRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Approved from Internship Training Management',
        });
      } else {
        await rejectTrainingPlanRequestRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Rejected / needs modification from Internship Training Management',
        });
      }

      setFeedback({
        type: 'success',
        message: `Training plan ${status === 'Approved' ? 'approved' : 'updated'} successfully.`,
      });

      if (isStudent) {
        await loadMyInternshipContext();
      }

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
        await addTrainingTaskEvidenceRequest(taskResponse.id, {
          file_name: taskForm.evidenceFile.name,
          file_url: null,
        });
      }

      setFeedback({ type: 'success', message: 'Daily task and evidence saved successfully.' });
      await loadMyInternshipContext();
      setIsTaskModalOpen(false);

      setTaskForm({
        internshipId: '',
        trainingPlanId: '',
        taskTitle: '',
        dayDate: new Date().toISOString().slice(0, 10),
        weekNo: '1',
        evidenceFile: null,
        evidenceUrl: '',
      });

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
      await loadMyInternshipContext();
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
        await approveWeeklyReportRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Approved from Internship Training Management',
        });
      } else {
        await rejectWeeklyReportRequest(record.id, {
          actor_user_id: user?.id,
          comment: 'Rejected from Internship Training Management',
        });
      }

      setFeedback({
        type: 'success',
        message: `Weekly report ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`,
      });
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

      setFeedback({ type: 'success', message: 'Final evaluation request created successfully.' });
      await loadMyInternshipContext();
      setIsEvaluationModalOpen(false);
      setEvaluationForm({
        internshipId: '',
        studentUserId: '',
        providerName: '',
        providerEmail: '',
        sendingTemplateName: 'Company Evaluation Request Email',
        evaluationTemplateName: 'Standard Company Internship Evaluation',
      });
      await loadEvaluations();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const openDelegation = (requestType, record) => {
    setDelegationTarget({ requestType, record });
    setDelegationForm({
      toApproverType: 'Administrator',
      toOwnerUserId: '',
      reason: '',
    });
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

      if (delegationTarget.requestType === 'TrainingCompanyRequest') {
        await delegateTrainingCompanyRequestRequest(delegationTarget.record.id, payload);
      }

      if (delegationTarget.requestType === 'TrainingPlan') {
        await delegateTrainingPlanRequestRequest(delegationTarget.record.id, payload);
      }

      setFeedback({ type: 'success', message: 'Delegation updated successfully.' });
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

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setLoading(true);

    try {
      const recipients = await getInvitationRecipientsRequest(batch.id);
      setInvitations(
        (Array.isArray(recipients) ? recipients : []).map((item) =>
          normalizeInvitationRecipient(item, batch)
        )
      );
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = {
    assignments: [
      { key: 'studentName', label: 'Student' },
      { key: 'studentEmail', label: 'Student Email' },
      { key: 'advisorName', label: 'Academic Advisor / System Responsible' },
      { key: 'advisorEmail', label: 'Advisor Email' },
      { key: 'studentCode', label: 'Student Code' },
      { key: 'assignedAt', label: 'Assigned At', render: (v) => toLocalDate(v) },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
    ],
    delegations: [
      {
        key: 'message',
        label: 'Delegation Logs',
        render: () => (
          <span className="text-muted">
            Backend read endpoint for approval delegation logs is not available yet.
          </span>
        ),
      },
    ],
    invitations: [
      { key: 'studentName', label: 'Student / Batch' },
      { key: 'studentEmail', label: 'Email / Registration' },
      { key: 'assignedAdvisorName', label: 'Assigned Advisor' },
      { key: 'source', label: 'Source' },
      { key: 'loginStatus', label: 'Login', render: (v) => <StatusBadge value={v} /> },
      { key: 'profileReviewStatus', label: 'Eligibility', render: (v) => <StatusBadge value={v} /> },
      { key: 'trainingLicenseLetter', label: 'Auto Training Letter' },
      { key: 'emailNotificationStatus', label: 'Email Notification' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedRecord(row)}
            >
              View
            </button>

            <span className="text-muted small">
              Use Pending Eligibility Queue for approval
            </span>
          </div>
        ),
      },
      
    ],
    pendingEligibility: [
      { key: 'student_name', label: 'Student Name' },
      { key: 'student_email', label: 'Email' },
      { key: 'advisor_name', label: 'Academic Advisor' },
      {
        key: 'account_created',
        label: 'Account Created',
        render: (value) => <StatusBadge value={value ? 'Yes' : 'No'} />,
      },
      {
        key: 'invitation_status',
        label: 'Invitation Status',
        render: (value) => <StatusBadge value={value} />,
      },
      {
        key: 'eligibility_status',
        label: 'Eligibility Status',
        render: (value) => <StatusBadge value={value} />,
      },
      {
        key: 'user_status',
        label: 'User Status',
        render: (value) => <StatusBadge value={value || '-'} />,
      },
      {
        key: 'queue_created_at',
        label: 'Queue Date',
        render: (value) => toLocalDate(value),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedRecord(row)}
            >
              View
            </button>

            {row.account_created && row.student_user_id ? (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => reviewPendingEligibilityQueueItem(row, 'Approved')}
                >
                  Approve
                </button>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => reviewPendingEligibilityQueueItem(row, 'Rejected')}
                >
                  Reject
                </button>
              </>
            ) : (
              <span className="text-muted small">Waiting for account creation</span>
            )}
          </div>
        ),
      },
    ],
    providers: [
      { key: 'studentName', label: 'Student' },
      { key: 'assignedAdvisorName', label: 'Assigned Advisor' },
      { key: 'providerName', label: 'Training Company' },
      { key: 'opportunityTitle', label: 'Training Opportunity' },
      { key: 'approvalOwnerName', label: 'Approval Owner' },
      { key: 'approvalStatus', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'emailNotificationStatus', label: 'Email Notification' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedRecord(row)}
            >
              View
            </button>

            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => reviewProvider(row, 'Approved')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => reviewProvider(row, 'Rejected')}
                >
                  Reject
                </button>
              </>
            ) : null}

            {isAdmin ? (
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => openDelegation('TrainingCompanyRequest', row)}
              >
                Delegate
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    plans: [
      { key: 'studentName', label: 'Student' },
      { key: 'assignedAdvisorName', label: 'Assigned Advisor' },
      { key: 'providerName', label: 'Approved Company' },
      { key: 'startDate', label: 'Training Start' },
      { key: 'planTitle', label: 'Plan Title' },
      { key: 'approvalOwnerName', label: 'Approval Owner' },
      { key: 'approvalStatus', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      { key: 'emailNotificationStatus', label: 'Email Notification' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedRecord(row)}
            >
              View
            </button>

            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => reviewPlan(row, 'Approved')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => reviewPlan(row, 'Rejected')}
                >
                  Reject / Modify
                </button>
              </>
            ) : null}

            {isAdmin ? (
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={() => openDelegation('TrainingPlan', row)}
              >
                Delegate
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    tasks: [
      { key: 'internshipId', label: 'Internship ID' },
      { key: 'planId', label: 'Plan ID' },
      { key: 'dayDate', label: 'Date' },
      { key: 'weekNo', label: 'Week' },
      { key: 'taskTitle', label: 'Task' },
      { key: 'evidenceFile', label: 'Evidence File' },
      { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v} /> },
    ],
    reports: [
      { key: 'studentName', label: 'Student' },
      { key: 'weekNo', label: 'Week' },
      { key: 'title', label: 'Auto Report' },
      { key: 'tasksCount', label: 'Tasks' },
      { key: 'evidenceCount', label: 'Evidence' },
      { key: 'source', label: 'Source' },
      { key: 'approvalOwnerName', label: 'Approval Owner' },
      { key: 'approvalStatus', label: 'Status', render: (v) => <StatusBadge value={v} /> },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => openWeeklyReportDetails(row)}
            >
              View
            </button>

            {canReview && row.approvalStatus === 'Pending' ? (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => reviewReport(row, 'Approved')}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => reviewReport(row, 'Rejected')}
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    evaluation: [
      { key: 'studentName', label: 'Student' },
      { key: 'providerName', label: 'Provider' },
      { key: 'notificationStatus', label: 'Advisor Notification' },
      { key: 'companyRequestStatus', label: 'Company Request' },
      { key: 'sendingTemplateName', label: 'Sending Template' },
      { key: 'evaluationTemplateName', label: 'Evaluation Template' },
      { key: 'finalStatus', label: 'Student File Status', render: (v) => <StatusBadge value={v} /> },
    ],
  };

  const rowsByTab = {
    assignments: visibleAssignments,
    delegations: [{ id: 'logs-info' }],
    invitations: visibleInvitations,
    providers: visibleProviderApprovals,
    plans: visiblePlans,
    tasks: visibleTasks,
    reports: visibleReports,
    evaluation: visibleEvaluations,
    pendingEligibility: filterRows(pendingEligibilityQueue),
  };

    const addConfig = {
      invitations: canReview ? ['Bulk Invite Students', () => setIsInviteModalOpen(true)] : null,
      providers: isStudent ? ['Submit Training Company', () => setIsProviderModalOpen(true)] : null,
      plans: isStudent ? ['Submit Training Plan', () => setIsPlanModalOpen(true)] : null,
      tasks: isStudent ? ['Add Daily Task & Evidence', () => setIsTaskModalOpen(true)] : null,
      reports: isStudent ? ['Generate Weekly Report', openWeeklyReportModal] : null,
      evaluation: null,
    }[activeTab];

  return (
    <div>
      <ModulePageHeader
        title={isArabic ? 'إدارة التدريب الداخلي' : 'Internship Training Management'}
        description="Live backend version of the internship workflow: eligibility → company approval → training plan → tasks/evidence → weekly reports → final evaluation."
        addLabel={addConfig?.[0]}
        onAddClick={addConfig?.[1]}
      />

      {feedback.message ? (
        <div
          className={`alert alert-${
            feedback.type === 'danger'
              ? 'danger'
              : feedback.type === 'warning'
                ? 'warning'
                : 'success'
          } alert-dismissible fade show`}
          role="alert"
        >
          {feedback.message}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setFeedback({ type: '', message: '' })}
          />
        </div>
      ) : null}

      <ModuleTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
        {generatedInviteLink ? (
          <div className="card ims-table-card mt-3 mb-3">
            <div className="card-body">
              <h6 className="mb-3">Student Registration Link</h6>
              <div className="input-group">
                <input className="form-control" value={generatedInviteLink} readOnly />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedInviteLink);
                    setFeedback({ type: 'success', message: 'Invitation link copied successfully.' });
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        ) : null}
      {isStudent ? (
        <div className="card ims-table-card mt-3 mb-3">
          <div className="card-body">
            {loadingContext ? (
              <div className="text-muted">Loading internship context...</div>
            ) : !autoContext ? (
              <div className="alert alert-warning mb-0">
                No internship context was found yet for this student.
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Internship ID</div>
                    <div className="fw-semibold">{autoContext.internship_id}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Provider</div>
                    <div className="fw-semibold">{autoContext.provider_name || '-'}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Internship Title</div>
                    <div className="fw-semibold">{autoContext.internship_title || '-'}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Advisor</div>
                    <div className="fw-semibold">{autoContext.advisor_name || '-'}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Latest Plan ID</div>
                    <div className="fw-semibold">{autoContext.latest_training_plan_id || '-'}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Latest Plan Status</div>
                    <div className="fw-semibold">{autoContext.latest_training_plan_status || '-'}</div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Latest Weekly Report</div>
                    <div className="fw-semibold">
                      {autoContext.latest_weekly_report_week_no
                        ? `Week ${autoContext.latest_weekly_report_week_no}`
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Final Evaluation</div>
                    <div className="fw-semibold">
                      {autoContext.latest_final_evaluation_request_id ? 'Requested' : 'Not Requested'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        (activeTab === 'plans' ||
          activeTab === 'tasks' ||
          activeTab === 'reports' ||
          activeTab === 'evaluation') && (
          <div className="card ims-table-card mt-3 mb-3">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label">Internship ID Context</label>
                  <input
                    className="form-control"
                    value={contextInternshipId}
                    onChange={(e) => setContextInternshipId(e.target.value)}
                    placeholder="Enter internship ID"
                  />
                </div>

                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      if (activeTab === 'plans') loadPlans();
                      if (activeTab === 'tasks') loadTasks();
                      if (activeTab === 'reports') loadReports();
                      if (activeTab === 'evaluation') loadEvaluations();
                    }}
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {activeTab === 'invitations' && invitationBatches.length > 0 ? (
        <div className="card ims-table-card mt-3 mb-3">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Invitation Batch</label>
                <select
                  className="form-select"
                  value={selectedBatch?.id || ''}
                  onChange={(e) => {
                    const batch = invitationBatches.find((item) => String(item.id) === e.target.value);
                    if (batch) handleViewBatch(batch);
                  }}
                >
                  {invitationBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      #{batch.id} - {batch.invitationMode} - {batch.advisorName || 'Advisor'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => selectedBatch && handleViewBatch(selectedBatch)}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card ims-table-card mt-3">
        <div className="card-body">
          <TableToolbar
            title={isStudent ? 'My Internship Training' : 'Internship Training Control'}
            subtitle="This page preserves the old file structure but now reads and writes live backend data."
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search workflow records..."
          />

          {activeTab === 'providers' && isStudent && !hasEligibilityApproval ? (
            <div className="alert alert-warning py-2">
              You can submit a training company only after eligibility approval and automatic
              training letter generation.
            </div>
          ) : null}

          {activeTab === 'plans' && isStudent && !approvedProvider ? (
            <div className="alert alert-warning py-2">
              Training plan entry is locked until the training company is approved.
            </div>
          ) : null}

          {activeTab === 'tasks' && isStudent && !approvedPlan ? (
            <div className="alert alert-warning py-2">
              Daily tasks and evidence are locked until the training plan is approved.
            </div>
          ) : null}

          {loading ? (
            <div className="py-5 text-center">
              <div className="spinner-border" role="status" />
              <div className="mt-3">Loading...</div>
            </div>
          ) : (
            <AppTable
              columns={columns[activeTab]}
              rows={rowsByTab[activeTab]}
              rowKey="id"
              emptyMessage="No records found."
            />
          )}
        </div>
      </div>

      <AppModal
        isOpen={isInviteModalOpen}
        title="Bulk Invite Students & Send Email"
        onClose={() => setIsInviteModalOpen(false)}
      >
        <form onSubmit={handleInvite}>
          <div className="alert alert-light border">
            Student invitation is linked to one academic advisor. This uses live invitation batch APIs.
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Invitation Method</label>
              <select
                className="form-select"
                value={inviteForm.invitationMode}
                onChange={(e) => setInviteForm((c) => ({ ...c, invitationMode: e.target.value }))}
              >
                <option value="Excel">Excel</option>
                <option value="Link">Link</option>
              </select>
            </div>

 <div className="col-md-6">
  <label className="form-label">Academic Advisor</label>

  {isAdvisor ? (
    <input
      className="form-control"
      value={`${user?.fullName || ''} - ${user?.email || ''}`}
      readOnly
    />
  ) : (
    <select
      className="form-select"
      value={inviteForm.advisorUserId}
      onChange={(e) => setInviteForm((c) => ({ ...c, advisorUserId: e.target.value }))}
      required
    >
      <option value="">Select advisor</option>
      {advisorOptions.map((advisor) => (
        <option key={advisor.id} value={advisor.id}>
          {advisor.fullName} - {advisor.email}
        </option>
      ))}
    </select>
  )}
</div>

            {inviteForm.invitationMode === 'Excel' ? (
              <>
                <div className="col-md-6">
                  <label className="form-label">Excel File Name</label>
                  <input
                    className="form-control"
                    value={inviteForm.excelFileName}
                    onChange={(e) =>
                      setInviteForm((c) => ({ ...c, excelFileName: e.target.value }))
                    }
                    placeholder="students_batch.xlsx"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Recipients</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={inviteForm.recipientsText}
                    onChange={(e) =>
                      setInviteForm((c) => ({ ...c, recipientsText: e.target.value }))
                    }
                    placeholder="One per line: Student Name,student@email.com"
                    required
                  />
                </div>
              </>
            ) : (
              
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  The registration link will be generated automatically after saving this batch.
                </div>
              </div>
            )}

            <div className="col-12">
              <label className="form-label">General Invitation Message</label>
              <textarea
                className="form-control"
                rows="4"
                value={inviteForm.invitationMessage}
                onChange={(e) =>
                  setInviteForm((c) => ({ ...c, invitationMessage: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Send Bulk Email Invitations
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={isWeeklyReportModalOpen}
        title="Generate Weekly Report"
        onClose={() => setIsWeeklyReportModalOpen(false)}
      >
        <form onSubmit={generateWeeklyReport} className="d-grid gap-3">
          <div className="alert alert-light border mb-0">
            Weekly reports are generated automatically from daily tasks and uploaded evidence for the selected week.
          </div>

          <div>
            <label className="form-label">Week Number</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={weeklyReportForm.weekNo}
              onChange={(event) =>
                setWeeklyReportForm((current) => ({ ...current, weekNo: event.target.value }))
              }
              required
            />
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsWeeklyReportModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
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
        {weeklyReportDetails ? (
          <>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Student</div>
                  <div className="fw-semibold">{weeklyReportDetails.report.student_name}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Week</div>
                  <div className="fw-semibold">{weeklyReportDetails.report.week_no}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Status</div>
                  <div className="fw-semibold">{weeklyReportDetails.report.status}</div>
                </div>
              </div>

              <div className="col-12">
                <div className="border rounded p-3">
                  <div className="text-muted small">Report Title</div>
                  <div className="fw-semibold">{weeklyReportDetails.report.report_title}</div>
                </div>
              </div>
            </div>

            <div className="border rounded p-3 mb-3">
              <div className="fw-semibold mb-2">Daily Tasks & Attachments</div>

              {weeklyReportDetails.items?.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Week</th>
                        <th>Task</th>
                        <th>Attachment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyReportDetails.items.map((item, index) => (
                        <tr key={`${item.task_id}-${index}`}>
                          <td>{String(item.task_date || '-')}</td>
                          <td>{item.week_no}</td>
                          <td>{item.task_title}</td>
                          <td>
                            {item.file_name ? (
                              item.file_url ? (
                                <a href={item.file_url} target="_blank" rel="noreferrer">
                                  {item.file_name}
                                </a>
                              ) : (
                                item.file_name
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">No tasks found for this weekly report.</div>
              )}
            </div>
          </>
        ) : null}
      </AppModal>

      <AppModal
        isOpen={isEligibilityModalOpen}
        title="Create Eligibility Review"
        onClose={() => setIsEligibilityModalOpen(false)}
      >
        <form onSubmit={createEligibility}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Recipient ID</label>
              <input className="form-control" value={eligibilityForm.recipientId} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Approval Owner User ID</label>
              <input
                className="form-control"
                value={eligibilityForm.approvalOwnerUserId}
                onChange={(e) =>
                  setEligibilityForm((c) => ({ ...c, approvalOwnerUserId: e.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Approval Owner Role</label>
              <select
                className="form-select"
                value={eligibilityForm.approvalOwnerRole}
                onChange={(e) =>
                  setEligibilityForm((c) => ({ ...c, approvalOwnerRole: e.target.value }))
                }
              >
                <option value="AcademicAdvisor">AcademicAdvisor</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>

            <div className="col-12">
              <div className="alert alert-light border mb-0">
                Student account will be resolved automatically from the invitation recipient email.
              </div>
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Create Eligibility Review
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={isProviderModalOpen}
        title="Submit Training Company"
        onClose={() => setIsProviderModalOpen(false)}
      >
        <form onSubmit={handleProviderSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Provider Name</label>
              <input
                className="form-control"
                value={providerForm.providerName}
                onChange={(e) => setProviderForm((c) => ({ ...c, providerName: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Provider Email</label>
              <input
                type="email"
                className="form-control"
                value={providerForm.providerEmail}
                onChange={(e) => setProviderForm((c) => ({ ...c, providerEmail: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Contact Name</label>
              <input
                className="form-control"
                value={providerForm.contactName}
                onChange={(e) => setProviderForm((c) => ({ ...c, contactName: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Contact Phone</label>
              <input
                className="form-control"
                value={providerForm.contactPhone}
                onChange={(e) => setProviderForm((c) => ({ ...c, contactPhone: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">City</label>
              <input
                className="form-control"
                value={providerForm.city}
                onChange={(e) => setProviderForm((c) => ({ ...c, city: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Sector</label>
              <input
                className="form-control"
                value={providerForm.sector}
                onChange={(e) => setProviderForm((c) => ({ ...c, sector: e.target.value }))}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Opportunity Title</label>
              <input
                className="form-control"
                value={providerForm.opportunityTitle}
                onChange={(e) =>
                  setProviderForm((c) => ({ ...c, opportunityTitle: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Submit Company Approval Request
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={isPlanModalOpen}
        title="Submit Training Plan"
        onClose={() => setIsPlanModalOpen(false)}
      >
        <form onSubmit={handlePlanSubmit}>
          {!approvedProviderOptions.length ? (
            <div className="alert alert-warning">
              You cannot create a training plan until at least one Training Company Approval is approved.
            </div>
          ) : null}

          <div className="row g-3">
            {!isStudent ? (
              <div className="col-md-6">
                <label className="form-label">Internship ID</label>
                <input
                  className="form-control"
                  value={planForm.internshipId}
                  onChange={(e) => setPlanForm((c) => ({ ...c, internshipId: e.target.value }))}
                  required
                />
              </div>
            ) : (

              <div className="col-md-6">
                <label className="form-label">Internship ID</label>
                <input
                  className="form-control"
                  value={effectiveInternshipId || planForm.internshipId}
                  onChange={(e) => setPlanForm((c) => ({ ...c, internshipId: e.target.value }))}
                  readOnly={Boolean(effectiveInternshipId)}
                  placeholder={effectiveInternshipId ? '' : 'Enter internship ID'}
                  required
                />
              </div>
)}

            <div className="col-md-6">
              <label className="form-label">Training Company Approval</label>
              <select
                className="form-select"
                value={planForm.companyRequestId}
                onChange={(e) => {
                  const selected = approvedProviderOptions.find(
                    (item) => String(item.id) === e.target.value
                  );

                  setPlanForm((c) => ({
                    ...c,
                    companyRequestId: e.target.value,
                    acceptedPlatform: selected?.providerName || '',
                  }));
                }}
                required
              >
                <option value="">Select approved training company</option>
                {approvedProviderOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.providerName} - {item.opportunityTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Accepted Platform</label>
              <input
                className="form-control"
                value={planForm.acceptedPlatform}
                onChange={(e) =>
                  setPlanForm((c) => ({ ...c, acceptedPlatform: e.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={planForm.startDate}
                onChange={(e) => setPlanForm((c) => ({ ...c, startDate: e.target.value }))}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Plan Title</label>
              <input
                className="form-control"
                value={planForm.planTitle}
                onChange={(e) => setPlanForm((c) => ({ ...c, planTitle: e.target.value }))}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Plan Summary</label>
              <textarea
                className="form-control"
                rows="5"
                value={planForm.planSummary}
                onChange={(e) => setPlanForm((c) => ({ ...c, planSummary: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Plan File Name</label>
              <input
                className="form-control"
                value={planForm.planFileName}
                onChange={(e) => setPlanForm((c) => ({ ...c, planFileName: e.target.value }))}
                placeholder="training-plan.xlsx / plan.pdf"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Plan File URL</label>
              <input
                className="form-control"
                value={planForm.planFileUrl}
                onChange={(e) => setPlanForm((c) => ({ ...c, planFileUrl: e.target.value }))}
                placeholder="Optional file link"
              />
            </div>
          </div>

          <button
            className="btn btn-primary mt-3"
            type="submit"
            disabled={!approvedProviderOptions.length}
          >
            Submit Training Plan
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={isTaskModalOpen}
        title="Add Daily Task & Evidence"
        onClose={() => setIsTaskModalOpen(false)}
      >
        <form onSubmit={handleTaskSubmit}>
          {!approvedPlan ? (
            <div className="alert alert-warning">
              Daily tasks and evidence can be added only after the training plan is approved.
            </div>
          ) : null}

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Internship</label>
              <select
                className="form-select"
                value={taskForm.internshipId || effectiveInternshipId || ''}
                onChange={(e) =>
                  setTaskForm((c) => ({
                    ...c,
                    internshipId: e.target.value,
                    trainingPlanId: '',
                  }))
                }
                required
              >
                <option value="">Select internship</option>
                {internshipTaskOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Training Plan</label>
              <select
                className="form-select"
                value={taskForm.trainingPlanId}
                onChange={(e) =>
                  setTaskForm((c) => ({
                    ...c,
                    trainingPlanId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select approved training plan</option>
                {trainingTaskPlanOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.planTitle} - {item.providerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Task Date</label>
              <input
                type="date"
                className="form-control"
                value={taskForm.dayDate}
                onChange={(e) => setTaskForm((c) => ({ ...c, dayDate: e.target.value }))}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Week No</label>
              <input className="form-control" value={taskForm.weekNo} readOnly />
            </div>

            <div className="col-12">
              <label className="form-label">Task Title</label>
              <input
                className="form-control"
                value={taskForm.taskTitle}
                onChange={(e) => setTaskForm((c) => ({ ...c, taskTitle: e.target.value }))}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Attach Evidence File</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) =>
                  setTaskForm((c) => ({
                    ...c,
                    evidenceFile: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Save Daily Task
          </button>
        </form>
      </AppModal>


      <AppModal
        isOpen={isEvaluationModalOpen}
        title="Send Final Evaluation Request"
        onClose={() => setIsEvaluationModalOpen(false)}
      >
        <form onSubmit={handleEvaluationRequest}>
          <div className="row g-3">
            {!isStudent ? (
              <>
                <div className="col-md-6">
                  <label className="form-label">Internship ID</label>
                  <input
                    className="form-control"
                    value={evaluationForm.internshipId}
                    onChange={(e) =>
                      setEvaluationForm((c) => ({ ...c, internshipId: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Student User ID</label>
                  <input
                    className="form-control"
                    value={evaluationForm.studentUserId}
                    onChange={(e) =>
                      setEvaluationForm((c) => ({ ...c, studentUserId: e.target.value }))
                    }
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-md-6">
                  <label className="form-label">Internship ID</label>
                  <input className="form-control" value={effectiveInternshipId || ''} readOnly />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Student User ID</label>
                  <input className="form-control" value={user?.id || ''} readOnly />
                </div>
              </>
            )}

            <div className="col-md-6">
              <label className="form-label">Provider Name</label>
              <input
                className="form-control"
                value={evaluationForm.providerName}
                onChange={(e) =>
                  setEvaluationForm((c) => ({ ...c, providerName: e.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Provider Email</label>
              <input
                className="form-control"
                value={evaluationForm.providerEmail}
                onChange={(e) =>
                  setEvaluationForm((c) => ({ ...c, providerEmail: e.target.value }))
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Sending Template Name</label>
              <input
                className="form-control"
                value={evaluationForm.sendingTemplateName}
                onChange={(e) =>
                  setEvaluationForm((c) => ({ ...c, sendingTemplateName: e.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Evaluation Template Name</label>
              <input
                className="form-control"
                value={evaluationForm.evaluationTemplateName}
                onChange={(e) =>
                  setEvaluationForm((c) => ({
                    ...c,
                    evaluationTemplateName: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Send Evaluation Request
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={isDelegationModalOpen}
        title="Delegate Approval Owner"
        onClose={() => {
          setIsDelegationModalOpen(false);
          setDelegationTarget(null);
        }}
      >
        <form onSubmit={applyDelegation}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Target Owner Type</label>
              <select
                className="form-select"
                value={delegationForm.toApproverType}
                onChange={(e) =>
                  setDelegationForm((c) => ({ ...c, toApproverType: e.target.value }))
                }
              >
                <option value="Administrator">Administrator</option>
                <option value="AcademicAdvisor">AcademicAdvisor</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Target Owner User ID</label>
              <input
                className="form-control"
                value={delegationForm.toOwnerUserId}
                onChange={(e) =>
                  setDelegationForm((c) => ({ ...c, toOwnerUserId: e.target.value }))
                }
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Reason</label>
              <textarea
                className="form-control"
                rows="4"
                value={delegationForm.reason}
                onChange={(e) => setDelegationForm((c) => ({ ...c, reason: e.target.value }))}
                required
              />
            </div>
          </div>

          <button className="btn btn-primary mt-3" type="submit">
            Apply Delegation
          </button>
        </form>
      </AppModal>

      <AppModal
        isOpen={Boolean(selectedRecord) && !isEligibilityModalOpen}
        title="Record Details"
        onClose={() => setSelectedRecord(null)}
      >
        {selectedRecord ? (
          <div className="row g-3">
            {Object.entries(selectedRecord).map(([key, value]) => (
              <div className="col-md-6" key={key}>
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">{key}</div>
                  <div className="fw-medium">{String(value || '-')}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </AppModal>

      {activeTab === 'invitations' && canReview && eligibilityRows.length > 0 ? (
        <div className="card ims-table-card mt-3">
          <div className="card-body">
            <h6 className="mb-3">Eligibility Reviews Requiring Action</h6>
            <AppTable
              rowKey="id"
              rows={eligibilityRows}
              columns={[
                { key: 'studentName', label: 'Student' },
                { key: 'studentEmail', label: 'Email' },
                { key: 'assignedAdvisorName', label: 'Advisor' },
                {
                  key: 'profileReviewStatus',
                  label: 'Status',
                  render: (v) => <StatusBadge value={v} />,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div className="d-flex gap-2 flex-wrap">
                      {row.profileReviewStatus === 'Pending' ? (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => reviewEligibility(row, 'Approved')}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => reviewEligibility(row, 'Rejected')}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small">Reviewed</span>
                      )}
                    </div>
                  ),
                },
              ]}
              emptyMessage="No eligibility reviews found."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default InternshipModulePage;