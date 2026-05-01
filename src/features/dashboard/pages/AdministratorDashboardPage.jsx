import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../../shared/ui/PageHeader';
import DashboardStatCard from '../../../shared/components/DashboardStatCard';
import DashboardModuleCard from '../../../shared/components/DashboardModuleCard';
import QuickActionsCard from '../../../shared/components/QuickActionsCard';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import {
  administratorDashboardSections,
  administratorDashboardQuickActions,
} from '../config/dashboardContent';
import {
  getAdvisorsRequest,
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
    id: user.id,
    fullName: user.full_name || '',
    email: user.email || '',
    role: user.role || '',
    status: user.status || '',
  };
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

function normalizeInvitationBatch(item) {
  return {
    id: item.id,
    invitationMode: item.invitation_mode || '',
    advisorUserId: item.advisor_user_id,
    advisorName: item.advisor_name || '',
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
    invitationStatus: item.invitation_status || '',
    sentAt: item.sent_at || batch?.sentAt || batch?.createdAt || '',
    acceptedAt: item.accepted_at || '',
  };
}

function normalizeEligibility(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    advisorName: item.advisor_name || '',
    status: item.status || '',
    createdAt: item.created_at || '',
  };
}

function normalizeCompanyRequest(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    providerName: item.provider_name || '',
    approvalStatus: item.status || '',
    submittedAt: item.submitted_at || '',
    assignedAdvisorName: item.assigned_advisor_name || '',
    approvalOwnerName: item.approval_owner_name || '',
  };
}

function normalizeTrainingPlan(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    planTitle: item.plan_title || '',
    approvalStatus: item.status || '',
    submittedAt: item.submitted_at || '',
    providerName: item.provider_name || '',
    approvalOwnerName: item.approval_owner_name || '',
  };
}

function normalizeWeeklyReport(item) {
  return {
    id: item.id,
    studentName: item.student_name || '',
    title: item.report_title || '',
    weekNo: item.week_no || '',
    approvalStatus: item.status || '',
    generatedAt: item.generated_at || '',
    approvalOwnerName: item.approval_owner_name || '',
    totalTasks: item.total_tasks || 0,
  };
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function ProgressMetricCard({ title, percentage, subtitle }) {
  const safeValue = Math.max(0, Math.min(100, Number(percentage || 0)));

  return (
    <div className="card ims-table-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">{title}</h6>
          <span className="fw-semibold">{safeValue}%</span>
        </div>
        <div className="progress mb-2" style={{ height: '10px' }}>
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${safeValue}%` }}
            aria-valuenow={safeValue}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
        <div className="text-muted small">{subtitle}</div>
      </div>
    </div>
  );
}

function LiveActivityCard({ title, items, emptyText }) {
  return (
    <div className="card ims-table-card h-100">
      <div className="card-body">
        <h5 className="ims-section-title mb-3">{title}</h5>

        {items.length ? (
          <div className="d-flex flex-column gap-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded p-3">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <div className="fw-semibold">{item.title}</div>
                    <div className="text-muted small">{item.description}</div>
                  </div>
                  <span className="badge text-bg-light border">{item.type}</span>
                </div>
                <div className="text-muted small mt-2">{item.dateLabel}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ims-empty-panel">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function AdministratorDashboardPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [users, setUsers] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [invitationBatches, setInvitationBatches] = useState([]);
  const [invitationRecipients, setInvitationRecipients] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);
  const [pendingEligibilityQueue, setPendingEligibilityQueue] = useState([]);
  const [providerApprovals, setProviderApprovals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);

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

        setUsers(normalizedUsers);
        setAdvisors(normalizedAdvisors);
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

  const totalUsers = users.length;
  const totalStudents = users.filter((item) => item.role === 'Student').length;
  const totalAdministrators = users.filter((item) => item.role === 'Administrator').length;
  const totalAdvisors = advisors.length;

  const activeUsers = users.filter((item) => item.status === 'Active').length;
  const activeStudents = users.filter((item) => item.role === 'Student' && item.status === 'Active').length;
  const invitedStudents = invitationRecipients.length;
  const acceptedInvitations = invitationRecipients.filter((item) => item.invitationStatus === 'Accepted').length;

  const pendingEligibilityCount =
    pendingEligibilityQueue.length > 0
      ? pendingEligibilityQueue.length
      : eligibilityRows.filter((item) => item.status === 'Pending').length;

  const pendingProviderApprovals = providerApprovals.filter((item) => item.approvalStatus === 'Pending').length;
  const approvedProviderApprovals = providerApprovals.filter((item) => item.approvalStatus === 'Approved').length;

  const pendingPlans = plans.filter((item) => item.approvalStatus === 'Pending').length;
  const approvedPlans = plans.filter((item) => item.approvalStatus === 'Approved').length;

  const pendingReports = weeklyReports.filter((item) => item.approvalStatus === 'Pending').length;
  const approvedReports = weeklyReports.filter((item) => item.approvalStatus === 'Approved').length;

  const studentsPerAdvisor = totalAdvisors
    ? Math.round((advisors.reduce((sum, item) => sum + Number(item.studentsCount || 0), 0) / totalAdvisors) * 10) / 10
    : 0;

  const completionMetrics = useMemo(() => {
    const invitationAcceptanceRate = invitedStudents > 0 ? Math.round((acceptedInvitations / invitedStudents) * 100) : 0;
    const providerApprovalRate = providerApprovals.length > 0 ? Math.round((approvedProviderApprovals / providerApprovals.length) * 100) : 0;
    const planApprovalRate = plans.length > 0 ? Math.round((approvedPlans / plans.length) * 100) : 0;
    const reportApprovalRate = weeklyReports.length > 0 ? Math.round((approvedReports / weeklyReports.length) * 100) : 0;

    return [
      {
        title: isArabic ? 'قبول الدعوات' : 'Invitation Acceptance',
        percentage: invitationAcceptanceRate,
        subtitle: isArabic ? 'نسبة الطلاب الذين قبلوا الدعوات من إجمالي المستقبلين' : 'Accepted invitations out of all invitation recipients',
      },
      {
        title: isArabic ? 'اعتماد الشركات' : 'Company Approvals',
        percentage: providerApprovalRate,
        subtitle: isArabic ? 'الطلبات المعتمدة من إجمالي طلبات الشركات' : 'Approved company requests out of all company requests',
      },
      {
        title: isArabic ? 'اعتماد الخطط' : 'Training Plans',
        percentage: planApprovalRate,
        subtitle: isArabic ? 'الخطط المعتمدة من إجمالي خطط التدريب' : 'Approved plans out of all training plans',
      },
      {
        title: isArabic ? 'اعتماد التقارير' : 'Weekly Reports',
        percentage: reportApprovalRate,
        subtitle: isArabic ? 'التقارير المعتمدة من إجمالي التقارير الأسبوعية' : 'Approved weekly reports out of all weekly reports',
      },
    ];
  }, [
    invitedStudents,
    acceptedInvitations,
    providerApprovals.length,
    approvedProviderApprovals,
    plans.length,
    approvedPlans,
    weeklyReports.length,
    approvedReports,
    isArabic,
  ]);

  const recentActivities = useMemo(() => {
    const invitationActivities = invitationBatches.map((item) => ({
      id: `batch-${item.id}`,
      title: isArabic ? `دفعة دعوات #${item.id}` : `Invitation Batch #${item.id}`,
      description:
        (isArabic ? 'المشرف: ' : 'Advisor: ') +
        `${item.advisorName || '-'} — ` +
        (isArabic ? 'المستلمون: ' : 'Recipients: ') +
        `${item.totalRecipients || 0}`,
      type: isArabic ? 'دعوات' : 'Invitations',
      dateLabel: formatDateTime(item.sentAt || item.createdAt),
      sortValue: item.sentAt || item.createdAt || '',
    }));

    const providerActivities = providerApprovals.map((item) => ({
      id: `provider-${item.id}`,
      title: item.providerName || (isArabic ? 'طلب شركة تدريب' : 'Training Company Request'),
      description: `${item.studentName || '-'} — ${item.approvalStatus || '-'}`,
      type: isArabic ? 'شركة تدريب' : 'Company Approval',
      dateLabel: formatDateTime(item.submittedAt),
      sortValue: item.submittedAt || '',
    }));

    const planActivities = plans.map((item) => ({
      id: `plan-${item.id}`,
      title: item.planTitle || (isArabic ? 'خطة تدريب' : 'Training Plan'),
      description: `${item.studentName || '-'} — ${item.approvalStatus || '-'}`,
      type: isArabic ? 'خطة' : 'Plan',
      dateLabel: formatDateTime(item.submittedAt),
      sortValue: item.submittedAt || '',
    }));

    const reportActivities = weeklyReports.map((item) => ({
      id: `report-${item.id}`,
      title: item.title || (isArabic ? 'تقرير أسبوعي' : 'Weekly Report'),
      description:
        `${item.studentName || '-'} — ` +
        (isArabic ? 'الأسبوع ' : 'Week ') +
        `${item.weekNo || '-'} — ${item.approvalStatus || '-'}`,
      type: isArabic ? 'تقرير' : 'Report',
      dateLabel: formatDateTime(item.generatedAt),
      sortValue: item.generatedAt || '',
    }));

    return [...invitationActivities, ...providerActivities, ...planActivities, ...reportActivities]
      .sort((a, b) => new Date(b.sortValue || 0) - new Date(a.sortValue || 0))
      .slice(0, 8);
  }, [invitationBatches, providerApprovals, plans, weeklyReports, isArabic]);

  const statCards = [
    {
      title: isArabic ? 'إجمالي المستخدمين' : 'Total Users',
      value: totalUsers,
      subtitle: isArabic ? `النشطون: ${activeUsers}` : `Active: ${activeUsers}`,
    },
    {
      title: isArabic ? 'الطلاب' : 'Students',
      value: totalStudents,
      subtitle: isArabic ? `النشطون: ${activeStudents}` : `Active: ${activeStudents}`,
    },
    {
      title: isArabic ? 'المشرفون الأكاديميون' : 'Academic Advisors',
      value: totalAdvisors,
      subtitle: isArabic ? `متوسط الطلاب لكل مشرف: ${studentsPerAdvisor}` : `Avg. students per advisor: ${studentsPerAdvisor}`,
    },
    {
      title: isArabic ? 'الإداريون' : 'Administrators',
      value: totalAdministrators,
      subtitle: isArabic ? 'من مستخدمي النظام' : 'System administrators',
    },
    {
      title: isArabic ? 'دفعات الدعوات' : 'Invitation Batches',
      value: invitationBatches.length,
      subtitle: isArabic ? `المستلمون: ${invitedStudents}` : `Recipients: ${invitedStudents}`,
    },
    {
      title: isArabic ? 'الأهلية المعلقة' : 'Pending Eligibility',
      value: pendingEligibilityCount,
      subtitle: isArabic ? 'بانتظار المراجعة' : 'Awaiting review',
    },
    {
      title: isArabic ? 'طلبات الشركات المعلقة' : 'Pending Company Approvals',
      value: pendingProviderApprovals,
      subtitle: isArabic ? `المعتمد: ${approvedProviderApprovals}` : `Approved: ${approvedProviderApprovals}`,
    },
    {
      title: isArabic ? 'الخطط/التقارير المعلقة' : 'Pending Plans / Reports',
      value: pendingPlans + pendingReports,
      subtitle: isArabic ? `خطط: ${pendingPlans} | تقارير: ${pendingReports}` : `Plans: ${pendingPlans} | Reports: ${pendingReports}`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Administrator Dashboard"
        description={
          isArabic
            ? `مرحبًا، ${user?.fullName || 'الإداري'}. تعرض هذه اللوحة مؤشرات حية من المستخدمين، الدعوات، الأهلية، الشركات، الخطط، والتقارير.`
            : `Welcome, ${user?.fullName || 'Administrator'}. This dashboard shows live indicators from users, invitations, eligibility, companies, plans, and reports.`
        }
      />

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      <section className="ims-section">
        <div className="ims-section-title">{isArabic ? 'نظرة عامة حية' : 'Live Overview'}</div>
        <div className="row g-3">
          {statCards.map((stat) => (
            <div key={stat.title} className="col-md-6 col-xl-3">
              <DashboardStatCard title={stat.title} value={loading ? '...' : stat.value} subtitle={stat.subtitle} />
            </div>
          ))}
        </div>
      </section>

      <section className="ims-section">
        <div className="row g-3">
          <div className="col-xl-6">
            <QuickActionsCard actions={administratorDashboardQuickActions} />
          </div>
          <div className="col-xl-6">
            <LiveActivityCard
              title={isArabic ? 'آخر الأنشطة الحية' : 'Recent Live Activity'}
              items={recentActivities}
              emptyText={isArabic ? 'لا توجد أنشطة حديثة.' : 'No recent activity found.'}
            />
          </div>
        </div>
      </section>

      <section className="ims-section">
        <div className="ims-section-title">{isArabic ? 'مؤشرات الإنجاز' : 'Completion Metrics'}</div>
        <div className="row g-3">
          {completionMetrics.map((item) => (
            <div key={item.title} className="col-md-6 col-xl-3">
              <ProgressMetricCard
                title={item.title}
                percentage={loading ? 0 : item.percentage}
                subtitle={item.subtitle}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="ims-section">
        <div className="ims-section-title">{isArabic ? 'المجالات الوظيفية' : 'Functional Areas'}</div>
        <div className="row g-3">
          {administratorDashboardSections.map((section) => (
            <div key={section.title} className="col-lg-6">
              <DashboardModuleCard
                title={section.title}
                description={section.description}
                items={section.items}
                actions={section.actions}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdministratorDashboardPage;