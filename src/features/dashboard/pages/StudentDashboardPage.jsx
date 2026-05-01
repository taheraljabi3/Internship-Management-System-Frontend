import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../shared/ui/PageHeader';
import DashboardStatCard from '../../../shared/components/DashboardStatCard';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import ROUTES from '../../../app/router/routePaths';
import {
  getMyAttendanceSummaryRequest,
  getMyAttendanceTodayRequest,
  getMyInternshipContextRequest,
  getTrainingPlansByInternshipRequest,
  getTrainingTasksByInternshipRequest,
  getWeeklyReportsByInternshipRequest,
  checkInRequest,
  checkOutRequest,
} from '../../../app/api/client';

function formatTime(value) {
  if (!value) return '-';

  try {
    return String(value).slice(0, 5);
  } catch {
    return String(value);
  }
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isApprovedStatus(value) {
  return ['approved', 'active', 'completed'].includes(normalizeStatus(value));
}

function isPendingStatus(value) {
  return ['pending', 'draft', 'submitted', 'under review', 'under_review'].includes(
    normalizeStatus(value)
  );
}

function getRoute(routeValue) {
  return routeValue || ROUTES.PUBLIC?.ROOT || '/';
}

function getStepBadgeClass(visualStatus) {
  if (visualStatus === 'approved' || visualStatus === 'completed') return 'text-bg-success';
  if (visualStatus === 'available') return 'text-bg-primary';
  if (visualStatus === 'pending') return 'text-bg-warning';
  return 'text-bg-secondary';
}

function WorkflowStepCard({ step, index, isArabic }) {
  return (
    <div className="col-md-6 col-xl">
      <div className={`card ims-table-card h-100 ${step.isLocked ? 'opacity-75' : ''}`}>
        <div className="card-body d-flex flex-column">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div
              className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
              style={{ width: 48, height: 48, fontSize: 22 }}
            >
              {step.icon}
            </div>

            <span className={`badge ${getStepBadgeClass(step.visualStatus)}`}>
              {step.statusLabel}
            </span>
          </div>

          <div className="text-muted small mb-1">
            {isArabic ? `الخطوة ${index + 1}` : `Step ${index + 1}`}
          </div>

          <h5 className="mb-2">{step.title}</h5>

          <p className="text-muted small mb-3">{step.description}</p>

          <div className="alert alert-light border small py-2 mb-3">
            {step.reason}
          </div>

          <div className="mt-auto">
            {step.isLocked ? (
              <button type="button" className="btn btn-outline-secondary w-100" disabled>
                {isArabic ? 'مقفلة' : 'Locked'}
              </button>
            ) : (
              <Link className="btn btn-primary w-100" to={step.to}>
                {step.actionLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingWorkflow({ steps, isArabic }) {
  return (
    <section className="ims-section">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <div className="ims-section-title mb-1">
            {isArabic ? 'التهيئة وسير العمل' : 'Onboarding Workflow'}
          </div>
          <div className="text-muted small">
            {isArabic
              ? 'اتبع الخطوات بالترتيب. لا تفتح الخطوة التالية إلا بعد اعتماد السابقة.'
              : 'Follow the steps in order. Each step is unlocked after the previous approval.'}
          </div>
        </div>
      </div>

      <div className="row g-3">
        {steps.map((step, index) => (
          <WorkflowStepCard key={step.key} step={step} index={index} isArabic={isArabic} />
        ))}
      </div>
    </section>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [internshipContext, setInternshipContext] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [trainingTasks, setTrainingTasks] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      const context = await getMyInternshipContextRequest().catch(() => null);
      setInternshipContext(context || null);

      const [summary, today, plans, tasks, reports] = await Promise.all([
        getMyAttendanceSummaryRequest().catch(() => null),
        getMyAttendanceTodayRequest().catch(() => null),
        context?.internship_id
          ? getTrainingPlansByInternshipRequest(context.internship_id).catch(() => [])
          : Promise.resolve([]),
        context?.internship_id
          ? getTrainingTasksByInternshipRequest(context.internship_id).catch(() => [])
          : Promise.resolve([]),
        context?.internship_id
          ? getWeeklyReportsByInternshipRequest(context.internship_id).catch(() => [])
          : Promise.resolve([]),
      ]);

      setAttendanceSummary(summary || null);
      setAttendanceToday(today || null);
      setTrainingPlans(Array.isArray(plans) ? plans : []);
      setTrainingTasks(Array.isArray(tasks) ? tasks : []);
      setWeeklyReports(Array.isArray(reports) ? reports : []);
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'Failed to load dashboard data.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const canCheckIn = Boolean(attendanceToday?.can_check_in);
  const canCheckOut = Boolean(attendanceToday?.can_check_out);
  const todayEntry = attendanceToday?.today_entry || null;
  const latestWeeklyReport = weeklyReports[0] || null;
  const latestTrainingPlan = trainingPlans[0] || null;

  const handleCheckIn = async () => {
    setSubmittingAttendance(true);
    setFeedback({ type: '', message: '' });

    try {
      await checkInRequest({ notes: 'Student checked in from dashboard.' });
      setFeedback({
        type: 'success',
        message: isArabic ? 'تم تسجيل الدخول بنجاح.' : 'Check in completed successfully.',
      });
      await loadDashboardData();
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'Check in failed.',
      });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmittingAttendance(true);
    setFeedback({ type: '', message: '' });

    try {
      await checkOutRequest({ notes: 'Student checked out from dashboard.' });
      setFeedback({
        type: 'success',
        message: isArabic ? 'تم تسجيل الخروج بنجاح.' : 'Check out completed successfully.',
      });
      await loadDashboardData();
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'Check out failed.',
      });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const studentDashboardStats = useMemo(() => {
    return [
      {
        title: isArabic ? 'إجمالي الساعات' : 'Total Hours',
        value: formatNumber(attendanceSummary?.total_hours),
        subtitle: isArabic ? 'كل أيام التدريب' : 'All attendance days',
      },
      {
        title: isArabic ? 'ساعات اليوم' : 'Today Hours',
        value: formatNumber(todayEntry?.daily_hours),
        subtitle: isArabic ? 'إجمالي جلسات اليوم' : 'Today accumulated time',
      },
      {
        title: isArabic ? 'أيام الحضور' : 'Present Days',
        value: attendanceSummary?.present_days ?? 0,
        subtitle: isArabic ? 'محسوبة تلقائيًا' : 'Calculated automatically',
      },
      {
        title: isArabic ? 'التقارير' : 'Weekly Reports',
        value: weeklyReports.length,
        subtitle: latestWeeklyReport?.week_no || latestWeeklyReport?.weekNo
          ? isArabic
            ? `آخر أسبوع: ${latestWeeklyReport.week_no || latestWeeklyReport.weekNo}`
            : `Latest week: ${latestWeeklyReport.week_no || latestWeeklyReport.weekNo}`
          : isArabic
          ? 'لا يوجد تقرير بعد'
          : 'No report yet',
      },
    ];
  }, [attendanceSummary, todayEntry, weeklyReports.length, latestWeeklyReport, isArabic]);

  const onboardingSteps = useMemo(() => {
    const profileCompleted = Boolean(user?.fullName || user?.email);

    const companyStatus =
      internshipContext?.training_company_request_status ||
      internshipContext?.provider_request_status ||
      internshipContext?.company_request_status ||
      internshipContext?.internship_status ||
      (internshipContext?.internship_id ? 'Approved' : '');

    const trainingCompanyApproved = isApprovedStatus(companyStatus) || Boolean(internshipContext?.internship_id);
    const trainingCompanyPending = !trainingCompanyApproved && isPendingStatus(companyStatus);

    const planStatus =
      internshipContext?.latest_training_plan_status ||
      latestTrainingPlan?.status ||
      latestTrainingPlan?.approval_status ||
      (internshipContext?.latest_training_plan_id ? 'Approved' : '');

    const trainingPlanApproved = isApprovedStatus(planStatus) || Boolean(internshipContext?.latest_training_plan_id);
    const trainingPlanPending = !trainingPlanApproved && isPendingStatus(planStatus);

    const hasDailyTasks =
      trainingTasks.length > 0 ||
      Number(internshipContext?.daily_tasks_count || 0) > 0 ||
      Number(internshipContext?.training_tasks_count || 0) > 0;

    const hasWeeklyReport = weeklyReports.length > 0;

    return [
      {
        key: 'profile',
        icon: '👤',
        title: 'Profile',
        description: 'Profile, skills, and attachments',
        to: getRoute(ROUTES.STUDENT_MODULES.PROFILE),
        actionLabel: isArabic ? 'فتح الملف الشخصي' : 'Open Profile',
        visualStatus: profileCompleted ? 'completed' : 'available',
        statusLabel: profileCompleted
          ? isArabic
            ? 'مكتملة'
            : 'Completed'
          : isArabic
          ? 'ابدأ الآن'
          : 'Start',
        isLocked: false,
        reason: profileCompleted
          ? isArabic
            ? 'تم تجهيز الملف الأساسي. تأكد من إضافة المهارات والمرفقات.'
            : 'Basic profile is ready. Make sure skills and attachments are added.'
          : isArabic
          ? 'أكمل بياناتك، المهارات، والمرفقات أولًا.'
          : 'Complete your profile, skills, and attachments first.',
      },
      {
        key: 'trainingCompanyApproval',
        icon: '🏢',
        title: 'Training Company Approval',
        description: 'Submit Training Company',
        to: getRoute(ROUTES.STUDENT_MODULES.OPPORTUNITIES),
        actionLabel: isArabic ? 'إرسال جهة التدريب' : 'Submit Training Company',
        visualStatus: trainingCompanyApproved
          ? 'approved'
          : trainingCompanyPending
          ? 'pending'
          : profileCompleted
          ? 'available'
          : 'locked',
        statusLabel: trainingCompanyApproved
          ? 'Approved'
          : trainingCompanyPending
          ? isArabic
            ? 'بانتظار الاعتماد'
            : 'Pending Approval'
          : profileCompleted
          ? isArabic
            ? 'متاحة'
            : 'Available'
          : isArabic
          ? 'مقفلة'
          : 'Locked',
        isLocked: !profileCompleted,
        reason: trainingCompanyApproved
          ? isArabic
            ? 'تم اعتماد جهة التدريب.'
            : 'Training company has been approved.'
          : trainingCompanyPending
          ? isArabic
            ? 'تم إرسال جهة التدريب، وبانتظار الاعتماد.'
            : 'Training company was submitted and is waiting for approval.'
          : profileCompleted
          ? isArabic
            ? 'أرسل جهة التدريب، ولا تنتقل للخطوة التالية إلا بعد Approved.'
            : 'Submit the training company. The next step opens only after Approved status.'
          : isArabic
          ? 'يجب إكمال الملف الشخصي أولًا.'
          : 'Complete the profile first.',
      },
      {
        key: 'trainingPlan',
        icon: '📝',
        title: 'Submit Training Plan',
        description: 'Submit Training Plan',
        to: getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP),
        actionLabel: isArabic ? 'إرسال خطة التدريب' : 'Submit Training Plan',
        visualStatus: trainingPlanApproved
          ? 'approved'
          : trainingPlanPending
          ? 'pending'
          : trainingCompanyApproved
          ? 'available'
          : 'locked',
        statusLabel: trainingPlanApproved
          ? 'Approved'
          : trainingPlanPending
          ? isArabic
            ? 'بانتظار الاعتماد'
            : 'Pending Approval'
          : trainingCompanyApproved
          ? isArabic
            ? 'متاحة'
            : 'Available'
          : isArabic
          ? 'مقفلة'
          : 'Locked',
        isLocked: !trainingCompanyApproved,
        reason: trainingPlanApproved
          ? isArabic
            ? 'تم اعتماد خطة التدريب.'
            : 'Training plan has been approved.'
          : trainingPlanPending
          ? isArabic
            ? 'تم إرسال خطة التدريب، وبانتظار الاعتماد.'
            : 'Training plan was submitted and is waiting for approval.'
          : trainingCompanyApproved
          ? isArabic
            ? 'أرسل خطة التدريب، ولا تضف المهام إلا بعد Approved.'
            : 'Submit the training plan. Daily tasks open only after Approved status.'
          : isArabic
          ? 'لا يمكن إرسال الخطة قبل اعتماد جهة التدريب.'
          : 'Company approval is required before submitting the plan.',
      },
      {
        key: 'dailyTaskEvidence',
        icon: '📌',
        title: 'Add Daily Task & Evidence',
        description: 'Add Daily Task & Evidence',
        to: getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP),
        actionLabel: isArabic ? 'إضافة مهمة ودليل' : 'Add Task & Evidence',
        visualStatus: hasDailyTasks ? 'completed' : trainingPlanApproved ? 'available' : 'locked',
        statusLabel: hasDailyTasks
          ? isArabic
            ? 'منجزة'
            : 'Completed'
          : trainingPlanApproved
          ? isArabic
            ? 'متاحة'
            : 'Available'
          : isArabic
          ? 'مقفلة'
          : 'Locked',
        isLocked: !trainingPlanApproved,
        reason: hasDailyTasks
          ? isArabic
            ? 'تمت إضافة مهام يومية وأدلة لهذا التدريب.'
            : 'Daily tasks and evidence have been added for this internship.'
          : trainingPlanApproved
          ? isArabic
            ? 'أضف المهمة اليومية وارفع الدليل المرتبط بها.'
            : 'Add the daily task and upload its evidence.'
          : isArabic
          ? 'يجب اعتماد خطة التدريب أولًا.'
          : 'Training plan approval is required first.',
      },
      {
        key: 'weeklyReport',
        icon: '📊',
        title: isArabic ? 'التقرير الأسبوعي' : 'Weekly Report',
        description: 'Generated from daily report',
        to: getRoute(ROUTES.STUDENT_MODULES.REPORTS),
        actionLabel: isArabic ? 'عرض التقرير الأسبوعي' : 'View Weekly Report',
        visualStatus: hasWeeklyReport ? 'completed' : hasDailyTasks ? 'available' : 'locked',
        statusLabel: hasWeeklyReport
          ? isArabic
            ? 'تم التوليد'
            : 'Generated'
          : hasDailyTasks
          ? isArabic
            ? 'جاهز بعد أسبوع'
            : 'Ready after one week'
          : isArabic
          ? 'مقفلة'
          : 'Locked',
        isLocked: !hasDailyTasks,
        reason: hasWeeklyReport
          ? isArabic
            ? 'تم توليد التقرير الأسبوعي من التقارير اليومية.'
            : 'Weekly report has been generated from daily reports.'
          : hasDailyTasks
          ? isArabic
            ? 'بعد مرور أسبوع، يتم توليد التقرير الأسبوعي من التقرير اليومي.'
            : 'After one week, the weekly report is generated from the daily report.'
          : isArabic
          ? 'أضف المهام اليومية والأدلة أولًا.'
          : 'Add daily tasks and evidence first.',
      },
    ];
  }, [
    user,
    isArabic,
    internshipContext,
    latestTrainingPlan,
    trainingTasks.length,
    weeklyReports.length,
  ]);

  return (
    <div>
      <PageHeader
        title={isArabic ? 'لوحة الطالب' : 'Student Dashboard'}
        description={isArabic ? 'مؤشرات مختصرة وتسجيل الحضور.' : 'Key indicators and attendance actions.'}
      />

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <div className="ims-empty-panel">
          {isArabic ? 'جارٍ تحميل لوحة الطالب...' : 'Loading dashboard...'}
        </div>
      ) : null}

      <section className="ims-section">
        <div className="row g-3">
          {studentDashboardStats.map((stat) => (
            <div key={stat.title} className="col-md-6 col-xl-3">
              <DashboardStatCard title={stat.title} value={stat.value} subtitle={stat.subtitle} />
            </div>
          ))}
        </div>
      </section>

      <section className="ims-section">
        <div className="card ims-table-card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
              <div>
                <h5 className="ims-section-title mb-1">
                  {isArabic ? 'تسجيل الدخول والخروج' : 'Check In / Check Out'}
                </h5>
                <div className="text-muted small">
                  {attendanceToday?.today_status || (isArabic ? 'لا توجد حالة لليوم' : 'No status for today')}
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-success px-4"
                  disabled={!canCheckIn || submittingAttendance}
                  onClick={handleCheckIn}
                >
                  {submittingAttendance
                    ? isArabic
                      ? 'جارٍ التنفيذ...'
                      : 'Processing...'
                    : isArabic
                    ? 'تسجيل دخول'
                    : 'Check In'}
                </button>

                <button
                  type="button"
                  className="btn btn-danger px-4"
                  disabled={!canCheckOut || submittingAttendance}
                  onClick={handleCheckOut}
                >
                  {submittingAttendance
                    ? isArabic
                      ? 'جارٍ التنفيذ...'
                      : 'Processing...'
                    : isArabic
                    ? 'تسجيل خروج'
                    : 'Check Out'}
                </button>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-3">
                <div className="ims-detail-box h-100">
                  <div className="ims-detail-label">{isArabic ? 'جهة التدريب' : 'Training Company'}</div>
                  <div className="ims-detail-value">
                    {attendanceSummary?.provider_name || internshipContext?.provider_name || '-'}
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="ims-detail-box h-100">
                  <div className="ims-detail-label">{isArabic ? 'آخر دخول' : 'Last Check In'}</div>
                  <div className="ims-detail-value">{formatTime(todayEntry?.check_in_time)}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="ims-detail-box h-100">
                  <div className="ims-detail-label">{isArabic ? 'آخر خروج' : 'Last Check Out'}</div>
                  <div className="ims-detail-value">{formatTime(todayEntry?.check_out_time)}</div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="ims-detail-box h-100">
                  <div className="ims-detail-label">{isArabic ? 'إجمالي اليوم' : 'Today Total'}</div>
                  <div className="ims-detail-value">{formatNumber(todayEntry?.daily_hours)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OnboardingWorkflow steps={onboardingSteps} isArabic={isArabic} />
    </div>
  );
}

export default StudentDashboardPage;