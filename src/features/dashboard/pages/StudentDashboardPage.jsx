import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

function formatInteger(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isApprovedStatus(value) {
  return ['approved', 'active', 'completed', 'accepted'].includes(normalizeStatus(value));
}

function isPendingStatus(value) {
  return ['pending', 'draft', 'submitted', 'under review', 'under_review'].includes(
    normalizeStatus(value)
  );
}

function isRejectedStatus(value) {
  return ['rejected', 'failed', 'declined'].includes(normalizeStatus(value));
}

function getPercentage(part, total) {
  if (!Number(total)) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(part || 0) / Number(total || 0)) * 100)));
}

function getRoute(routeValue) {
  return routeValue || ROUTES.PUBLIC?.ROOT || '/';
}

function getStatusTone(value) {
  if (isApprovedStatus(value)) return 'success';
  if (isPendingStatus(value)) return 'warning';
  if (isRejectedStatus(value)) return 'danger';
  return 'neutral';
}

function getStatusLabel(value, isArabic) {
  const status = normalizeStatus(value);

  const labels = {
    approved: isArabic ? 'مقبول' : 'Approved',
    active: isArabic ? 'نشط' : 'Active',
    completed: isArabic ? 'مكتمل' : 'Completed',
    accepted: isArabic ? 'مقبول' : 'Accepted',
    pending: isArabic ? 'قيد الانتظار' : 'Pending',
    draft: isArabic ? 'مسودة' : 'Draft',
    submitted: isArabic ? 'مرسل' : 'Submitted',
    'under review': isArabic ? 'قيد المراجعة' : 'Under Review',
    under_review: isArabic ? 'قيد المراجعة' : 'Under Review',
    rejected: isArabic ? 'مرفوض' : 'Rejected',
    failed: isArabic ? 'فشل' : 'Failed',
  };

  return labels[status] || value || '-';
}

function getLatestByDate(rows, dateKeys = ['created_at', 'createdAt', 'submitted_at', 'submittedAt', 'generated_at', 'generatedAt']) {
  if (!Array.isArray(rows) || !rows.length) return null;

  return [...rows].sort((a, b) => {
    const aDate = dateKeys.map((key) => a?.[key]).find(Boolean);
    const bDate = dateKeys.map((key) => b?.[key]).find(Boolean);
    return new Date(bDate || 0) - new Date(aDate || 0);
  })[0];
}

function getTaskStatus(task) {
  return task?.status || task?.task_status || task?.approval_status || task?.approvalStatus || '';
}

function getReportStatus(report) {
  return report?.status || report?.approval_status || report?.approvalStatus || '';
}

function getPlanStatus(plan) {
  return plan?.status || plan?.approval_status || plan?.approvalStatus || '';
}

function SvgIcon({ name, size = 22 }) {
  const icons = {
    dashboard: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
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
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
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
    building: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
        <path d="M16 9h2a2 2 0 0 1 2 2v10" />
        <path d="M8 7h4" />
        <path d="M8 11h4" />
        <path d="M8 15h4" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11" />
        <path d="M9 12h11" />
        <path d="M9 18h11" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
      </>
    ),
    lightning: (
      <>
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    briefcase: (
      <>
        <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M4 11h16" />
        <path d="M10 12h4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 3v12" />
        <path d="m8 7 4-4 4 4" />
        <path d="M5 21h14" />
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
      {icons[name] || icons.dashboard}
    </svg>
  );
}

function ProgressRing({ value, size = 96, stroke = 12, label, subLabel }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="ims-student-progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.70)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#studentRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="studentRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0796a6" />
            <stop offset="100%" stopColor="#2ee6d3" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ims-student-progress-ring-label">
        <strong>{label || `${safeValue}%`}</strong>
        {subLabel ? <span>{subLabel}</span> : null}
      </div>
    </div>
  );
}

function StatusPill({ value, isArabic }) {
  const tone = getStatusTone(value);
  return <span className={`ims-student-status ims-student-status-${tone}`}>{getStatusLabel(value, isArabic)}</span>;
}

function MetricCard({ title, value, subtitle, icon, tone = 'teal', progress }) {
  return (
    <div className={`ims-student-metric-card ims-student-metric-${tone}`}>
      <div className="ims-student-metric-icon">
        <SvgIcon name={icon} size={25} />
      </div>
      <div className="ims-student-metric-body">
        <span>{title}</span>
        <strong>{value}</strong>
        <em>{subtitle}</em>
      </div>
      <div className="ims-student-metric-line">
        <i style={{ width: `${Math.max(0, Math.min(100, Number(progress || 0)))}%` }} />
      </div>
    </div>
  );
}

function WorkflowTimeline({ steps, isArabic }) {
  return (
    <section className="ims-student-card ims-student-workflow-card">
      <div className="ims-student-section-header">
        <div>
          <h2>{isArabic ? 'مسار التدريب' : 'Training Journey'}</h2>
          <p>
            {isArabic
              ? 'تابع مراحل التدريب خطوة بخطوة، وكل مرحلة تُفتح حسب حالة الاعتماد.'
              : 'Track your internship stages step by step. Each stage unlocks based on approval status.'}
          </p>
        </div>
      </div>

      <div className="ims-student-timeline">
        {steps.map((step, index) => (
          <div key={step.key} className={`ims-student-timeline-item ${step.visualStatus}`}>
            <div className="ims-student-timeline-node">
              {step.visualStatus === 'completed' || step.visualStatus === 'approved' ? (
                <SvgIcon name="check" size={18} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="ims-student-timeline-content">
              <strong>{step.title}</strong>
              <span>{step.statusLabel}</span>
              <em>{step.reason}</em>
            </div>
            <div className="ims-student-timeline-action">
              {step.isLocked ? (
                <button type="button" disabled>
                  {isArabic ? 'مقفلة' : 'Locked'}
                </button>
              ) : (
                <Link to={step.to}>{step.actionLabel}</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskListCard({ tasks, isArabic, locale }) {
  const visibleTasks = tasks.slice(0, 4);

  return (
    <section className="ims-student-card">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'المهام اليومية' : 'Daily Tasks'}</h2>
          <p>{isArabic ? 'آخر المهام المسجلة في التدريب.' : 'Latest tasks recorded in your internship.'}</p>
        </div>
        <Link to={getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP)}>
          {isArabic ? 'عرض الكل' : 'View all'}
        </Link>
      </div>

      <div className="ims-student-list">
        {visibleTasks.length ? (
          visibleTasks.map((task) => {
            const title = task.title || task.task_title || task.description || task.task_description || '-';
            const date = task.task_date || task.date || task.created_at || task.createdAt;
            const status = getTaskStatus(task) || 'Submitted';

            return (
              <div key={task.id || `${title}-${date}`} className="ims-student-list-item">
                <div>
                  <strong>{title}</strong>
                  <span>{formatDate(date, locale)}</span>
                </div>
                <StatusPill value={status} isArabic={isArabic} />
              </div>
            );
          })
        ) : (
          <div className="ims-student-empty">
            {isArabic ? 'لا توجد مهام يومية بعد.' : 'No daily tasks yet.'}
          </div>
        )}
      </div>
    </section>
  );
}

function WeeklyReportsCard({ reports, isArabic, locale }) {
  const visibleReports = reports.slice(0, 4);

  return (
    <section className="ims-student-card">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'التقارير الأسبوعية' : 'Weekly Reports'}</h2>
          <p>{isArabic ? 'آخر تقارير الأداء الأسبوعية.' : 'Latest weekly performance reports.'}</p>
        </div>
        <Link to={getRoute(ROUTES.STUDENT_MODULES.REPORTS)}>
          {isArabic ? 'كل التقارير' : 'All reports'}
        </Link>
      </div>

      <div className="ims-student-list">
        {visibleReports.length ? (
          visibleReports.map((report) => {
            const weekNo = report.week_no || report.weekNo || '-';
            const title = report.title || report.report_title || (isArabic ? `الأسبوع ${weekNo}` : `Week ${weekNo}`);
            const date = report.generated_at || report.generatedAt || report.created_at || report.createdAt;
            const status = getReportStatus(report) || 'Generated';

            return (
              <div key={report.id || `${title}-${weekNo}`} className="ims-student-list-item">
                <div>
                  <strong>{title}</strong>
                  <span>{formatDate(date, locale)}</span>
                </div>
                <StatusPill value={status} isArabic={isArabic} />
              </div>
            );
          })
        ) : (
          <div className="ims-student-empty">
            {isArabic ? 'لا توجد تقارير أسبوعية بعد.' : 'No weekly reports yet.'}
          </div>
        )}
      </div>
    </section>
  );
}

function EvaluationCard({ internshipContext, isArabic }) {
  const companyEvaluationStatus =
    internshipContext?.company_evaluation_status ||
    internshipContext?.latest_company_evaluation_status ||
    internshipContext?.final_evaluation_status ||
    '';

  const academicEvaluationStatus =
    internshipContext?.academic_evaluation_status ||
    internshipContext?.latest_academic_evaluation_status ||
    '';

  return (
    <section className="ims-student-card">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'التقييمات' : 'Evaluations'}</h2>
          <p>{isArabic ? 'حالة تقييم الشركة والمشرف الأكاديمي.' : 'Company and academic evaluation status.'}</p>
        </div>
        <SvgIcon name="star" size={22} />
      </div>

      <div className="ims-student-evaluation-list">
        <div className="ims-student-evaluation-item">
          <div className="ims-student-soft-icon">
            <SvgIcon name="building" size={20} />
          </div>
          <div>
            <strong>{isArabic ? 'تقييم شركة التدريب' : 'Company Evaluation'}</strong>
            <span>{isArabic ? 'يعتمد على رابط التقييم النهائي.' : 'Based on the final evaluation request.'}</span>
          </div>
          <StatusPill value={companyEvaluationStatus || 'Pending'} isArabic={isArabic} />
        </div>

        <div className="ims-student-evaluation-item">
          <div className="ims-student-soft-icon purple">
            <SvgIcon name="user" size={20} />
          </div>
          <div>
            <strong>{isArabic ? 'تقييم المشرف الأكاديمي' : 'Academic Evaluation'}</strong>
            <span>{isArabic ? 'يتم من خلال المشرف الأكاديمي.' : 'Submitted by the academic advisor.'}</span>
          </div>
          <StatusPill value={academicEvaluationStatus || 'Pending'} isArabic={isArabic} />
        </div>
      </div>
    </section>
  );
}

function AttendanceCard({
  attendanceSummary,
  attendanceToday,
  todayEntry,
  canCheckIn,
  canCheckOut,
  submittingAttendance,
  onCheckIn,
  onCheckOut,
  internshipContext,
  isArabic,
}) {
  return (
    <section className="ims-student-card ims-student-attendance-card">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'الحضور' : 'Attendance'}</h2>
          <p>{attendanceToday?.today_status || (isArabic ? 'لا توجد حالة لليوم' : 'No status for today')}</p>
        </div>
        <SvgIcon name="calendar" size={22} />
      </div>

      <div className="ims-student-attendance-layout">
        <ProgressRing
          value={getPercentage(attendanceSummary?.present_days, Number(attendanceSummary?.present_days || 0) + Number(attendanceSummary?.absent_days || 0))}
          size={132}
          stroke={14}
          label={formatInteger(attendanceSummary?.present_days, isArabic ? 'ar-SA' : 'en-GB')}
          subLabel={isArabic ? 'أيام حضور' : 'Present days'}
        />

        <div className="ims-student-attendance-details">
          <div>
            <span>{isArabic ? 'جهة التدريب' : 'Training Company'}</span>
            <strong>{attendanceSummary?.provider_name || internshipContext?.provider_name || internshipContext?.providerName || '-'}</strong>
          </div>
          <div>
            <span>{isArabic ? 'آخر دخول' : 'Last Check In'}</span>
            <strong>{formatTime(todayEntry?.check_in_time || todayEntry?.checkInTime)}</strong>
          </div>
          <div>
            <span>{isArabic ? 'آخر خروج' : 'Last Check Out'}</span>
            <strong>{formatTime(todayEntry?.check_out_time || todayEntry?.checkOutTime)}</strong>
          </div>
          <div>
            <span>{isArabic ? 'إجمالي اليوم' : 'Today Total'}</span>
            <strong>{formatNumber(todayEntry?.daily_hours || todayEntry?.dailyHours)}</strong>
          </div>
        </div>
      </div>

      <div className="ims-student-attendance-actions">
        <button type="button" disabled={!canCheckIn || submittingAttendance} onClick={onCheckIn}>
          <SvgIcon name="check" size={18} />
          {submittingAttendance
            ? isArabic
              ? 'جارٍ التنفيذ...'
              : 'Processing...'
            : isArabic
            ? 'تسجيل الحضور'
            : 'Check In'}
        </button>

        <button type="button" className="danger" disabled={!canCheckOut || submittingAttendance} onClick={onCheckOut}>
          <SvgIcon name="clock" size={18} />
          {submittingAttendance
            ? isArabic
              ? 'جارٍ التنفيذ...'
              : 'Processing...'
            : isArabic
            ? 'تسجيل الخروج'
            : 'Check Out'}
        </button>
      </div>
    </section>
  );
}

function TrainingPlanCard({ latestTrainingPlan, isArabic, locale }) {
  const planStatus = getPlanStatus(latestTrainingPlan);
  const title = latestTrainingPlan?.title || latestTrainingPlan?.plan_title || latestTrainingPlan?.planTitle || '-';
  const date = latestTrainingPlan?.updated_at || latestTrainingPlan?.updatedAt || latestTrainingPlan?.submitted_at || latestTrainingPlan?.submittedAt;

  return (
    <section className="ims-student-card ims-student-plan-card">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'خطة التدريب' : 'Training Plan'}</h2>
          <p>{isArabic ? 'آخر خطة تدريب مرفوعة.' : 'Latest submitted training plan.'}</p>
        </div>
        <SvgIcon name="calendar" size={22} />
      </div>

      <div className="ims-student-plan-body">
        <strong>{title}</strong>
        <span>{formatDate(date, locale)}</span>
        <StatusPill value={planStatus || 'Draft'} isArabic={isArabic} />
      </div>

      <Link className="ims-student-card-link" to={getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP)}>
        {isArabic ? 'إدارة الخطة' : 'Manage plan'}
        <SvgIcon name="arrow" size={16} />
      </Link>
    </section>
  );
}

function QuickActions({ isArabic, canCheckIn, canCheckOut, submittingAttendance, onCheckIn, onCheckOut }) {
  return (
    <section className="ims-student-card ims-student-quick-actions">
      <div className="ims-student-section-header compact">
        <div>
          <h2>{isArabic ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
          <p>{isArabic ? 'أكثر العمليات استخدامًا.' : 'Most used actions.'}</p>
        </div>
        <SvgIcon name="lightning" size={22} />
      </div>

      <div className="ims-student-action-grid">
        <button type="button" disabled={!canCheckIn || submittingAttendance} onClick={onCheckIn}>
          <SvgIcon name="calendar" size={26} />
          <span>{isArabic ? 'تسجيل الحضور' : 'Check In'}</span>
        </button>

        <Link to={getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP)}>
          <SvgIcon name="plus" size={26} />
          <span>{isArabic ? 'إضافة مهمة' : 'Add Task'}</span>
        </Link>

        <Link to={getRoute(ROUTES.STUDENT_MODULES.REPORTS)}>
          <SvgIcon name="upload" size={26} />
          <span>{isArabic ? 'رفع تقرير أسبوعي' : 'Upload Report'}</span>
        </Link>

        <Link to={getRoute(ROUTES.STUDENT_MODULES.PROFILE)}>
          <SvgIcon name="user" size={26} />
          <span>{isArabic ? 'عرض ملفي' : 'View Profile'}</span>
        </Link>
      </div>
    </section>
  );
}

function StudentDashboardPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const locale = isArabic ? 'ar-SA' : 'en-GB';

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

      const internshipId = context?.internship_id || context?.internshipId;

      const [summary, today, plans, tasks, reports] = await Promise.all([
        getMyAttendanceSummaryRequest().catch(() => null),
        getMyAttendanceTodayRequest().catch(() => null),
        internshipId
          ? getTrainingPlansByInternshipRequest(internshipId).catch(() => [])
          : Promise.resolve([]),
        internshipId
          ? getTrainingTasksByInternshipRequest(internshipId).catch(() => [])
          : Promise.resolve([]),
        internshipId
          ? getWeeklyReportsByInternshipRequest(internshipId).catch(() => [])
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

  const canCheckIn = Boolean(attendanceToday?.can_check_in || attendanceToday?.canCheckIn);
  const canCheckOut = Boolean(attendanceToday?.can_check_out || attendanceToday?.canCheckOut);
  const todayEntry = attendanceToday?.today_entry || attendanceToday?.todayEntry || null;
  const latestWeeklyReport = getLatestByDate(weeklyReports, ['generated_at', 'generatedAt', 'created_at', 'createdAt']);
  const latestTrainingPlan = getLatestByDate(trainingPlans, ['submitted_at', 'submittedAt', 'updated_at', 'updatedAt', 'created_at', 'createdAt']);

  const completedTasks = useMemo(
    () =>
      trainingTasks.filter((task) => {
        const status = getTaskStatus(task);
        return isApprovedStatus(status) || normalizeStatus(status) === 'done' || normalizeStatus(status) === 'completed';
      }).length,
    [trainingTasks]
  );

  const planProgress = useMemo(() => {
    const totalSteps = 5;
    let completed = 0;

    if (user?.fullName || user?.email) completed += 1;

    const companyStatus =
      internshipContext?.training_company_request_status ||
      internshipContext?.provider_request_status ||
      internshipContext?.company_request_status ||
      internshipContext?.internship_status ||
      (internshipContext?.internship_id || internshipContext?.internshipId ? 'Approved' : '');

    if (isApprovedStatus(companyStatus) || internshipContext?.internship_id || internshipContext?.internshipId) completed += 1;

    const planStatus =
      internshipContext?.latest_training_plan_status ||
      getPlanStatus(latestTrainingPlan) ||
      (internshipContext?.latest_training_plan_id || internshipContext?.latestTrainingPlanId ? 'Approved' : '');

    if (isApprovedStatus(planStatus) || internshipContext?.latest_training_plan_id || internshipContext?.latestTrainingPlanId) completed += 1;

    if (trainingTasks.length > 0 || Number(internshipContext?.daily_tasks_count || internshipContext?.training_tasks_count || 0) > 0) completed += 1;
    if (weeklyReports.length > 0) completed += 1;

    return getPercentage(completed, totalSteps);
  }, [user, internshipContext, latestTrainingPlan, trainingTasks.length, weeklyReports.length]);

  const handleCheckIn = async () => {
    setSubmittingAttendance(true);
    setFeedback({ type: '', message: '' });

    try {
      await checkInRequest({ notes: 'Student checked in from dashboard.' });
      setFeedback({
        type: 'success',
        message: isArabic ? 'تم تسجيل الحضور بنجاح.' : 'Check in completed successfully.',
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
    const totalRequiredDays =
      Number(attendanceSummary?.required_days || attendanceSummary?.requiredDays || 0) ||
      Number(attendanceSummary?.present_days || attendanceSummary?.presentDays || 0) +
        Number(attendanceSummary?.absent_days || attendanceSummary?.absentDays || 0);

    const presentDays = Number(attendanceSummary?.present_days || attendanceSummary?.presentDays || 0);
    const taskTotal = trainingTasks.length;
    const reportTotal = weeklyReports.length;

    return [
      {
        title: isArabic ? 'التقارير الأسبوعية' : 'Weekly Reports',
        value: formatInteger(reportTotal, locale),
        subtitle: latestWeeklyReport?.week_no || latestWeeklyReport?.weekNo
          ? isArabic
            ? `آخر أسبوع: ${latestWeeklyReport.week_no || latestWeeklyReport.weekNo}`
            : `Latest week: ${latestWeeklyReport.week_no || latestWeeklyReport.weekNo}`
          : isArabic
          ? 'لا يوجد تقرير بعد'
          : 'No report yet',
        icon: 'document',
        tone: 'blue',
        progress: reportTotal ? Math.min(100, reportTotal * 10) : 0,
      },
      {
        title: isArabic ? 'أيام الحضور' : 'Present Days',
        value: formatInteger(presentDays, locale),
        subtitle: totalRequiredDays
          ? isArabic
            ? `من ${formatInteger(totalRequiredDays, locale)} يوم`
            : `of ${formatInteger(totalRequiredDays, locale)} days`
          : isArabic
          ? 'محسوبة تلقائيًا'
          : 'Calculated automatically',
        icon: 'calendar',
        tone: 'green',
        progress: getPercentage(presentDays, totalRequiredDays),
      },
      {
        title: isArabic ? 'المهام المكتملة' : 'Completed Tasks',
        value: formatInteger(completedTasks, locale),
        subtitle: taskTotal
          ? isArabic
            ? `من ${formatInteger(taskTotal, locale)} مهمة`
            : `of ${formatInteger(taskTotal, locale)} tasks`
          : isArabic
          ? 'لا توجد مهام بعد'
          : 'No tasks yet',
        icon: 'check',
        tone: 'teal',
        progress: getPercentage(completedTasks, taskTotal),
      },
      {
        title: isArabic ? 'نسبة الإنجاز' : 'Completion Rate',
        value: `${planProgress}%`,
        subtitle: isArabic ? 'من إجمالي مسار التدريب' : 'Overall training journey',
        icon: 'chart',
        tone: 'purple',
        progress: planProgress,
      },
    ];
  }, [
    attendanceSummary,
    trainingTasks.length,
    weeklyReports.length,
    latestWeeklyReport,
    completedTasks,
    planProgress,
    isArabic,
    locale,
  ]);

  const onboardingSteps = useMemo(() => {
    const profileCompleted = Boolean(user?.fullName || user?.email);

    const companyStatus =
      internshipContext?.training_company_request_status ||
      internshipContext?.provider_request_status ||
      internshipContext?.company_request_status ||
      internshipContext?.internship_status ||
      (internshipContext?.internship_id || internshipContext?.internshipId ? 'Approved' : '');

    const trainingCompanyApproved = isApprovedStatus(companyStatus) || Boolean(internshipContext?.internship_id || internshipContext?.internshipId);
    const trainingCompanyPending = !trainingCompanyApproved && isPendingStatus(companyStatus);

    const planStatus =
      internshipContext?.latest_training_plan_status ||
      getPlanStatus(latestTrainingPlan) ||
      (internshipContext?.latest_training_plan_id || internshipContext?.latestTrainingPlanId ? 'Approved' : '');

    const trainingPlanApproved =
      isApprovedStatus(planStatus) ||
      Boolean(internshipContext?.latest_training_plan_id || internshipContext?.latestTrainingPlanId);
    const trainingPlanPending = !trainingPlanApproved && isPendingStatus(planStatus);

    const hasDailyTasks =
      trainingTasks.length > 0 ||
      Number(internshipContext?.daily_tasks_count || 0) > 0 ||
      Number(internshipContext?.training_tasks_count || 0) > 0;

    const hasWeeklyReport = weeklyReports.length > 0;

    return [
      {
        key: 'profile',
        title: isArabic ? 'الملف الشخصي' : 'Profile',
        to: getRoute(ROUTES.STUDENT_MODULES.PROFILE),
        actionLabel: isArabic ? 'فتح الملف' : 'Open Profile',
        visualStatus: profileCompleted ? 'completed' : 'available',
        statusLabel: profileCompleted ? (isArabic ? 'مكتمل' : 'Completed') : isArabic ? 'ابدأ الآن' : 'Start',
        isLocked: false,
        reason: profileCompleted
          ? isArabic
            ? 'تم تجهيز الملف الأساسي.'
            : 'Basic profile is ready.'
          : isArabic
          ? 'أكمل بياناتك والمهارات والمرفقات.'
          : 'Complete your details, skills, and attachments.',
      },
      {
        key: 'trainingCompanyApproval',
        title: isArabic ? 'اعتماد شركة التدريب' : 'Training Company Approval',
        to: getRoute(ROUTES.STUDENT_MODULES.OPPORTUNITIES),
        actionLabel: isArabic ? 'إرسال جهة التدريب' : 'Submit Company',
        visualStatus: trainingCompanyApproved ? 'approved' : trainingCompanyPending ? 'pending' : profileCompleted ? 'available' : 'locked',
        statusLabel: trainingCompanyApproved
          ? isArabic
            ? 'مكتمل'
            : 'Approved'
          : trainingCompanyPending
          ? isArabic
            ? 'قيد المراجعة'
            : 'Pending'
          : profileCompleted
          ? isArabic
            ? 'متاح'
            : 'Available'
          : isArabic
          ? 'مقفل'
          : 'Locked',
        isLocked: !profileCompleted,
        reason: trainingCompanyApproved
          ? isArabic
            ? 'تم اعتماد جهة التدريب.'
            : 'Training company approved.'
          : trainingCompanyPending
          ? isArabic
            ? 'بانتظار اعتماد المشرف.'
            : 'Waiting for advisor approval.'
          : profileCompleted
          ? isArabic
            ? 'أرسل جهة التدريب للاعتماد.'
            : 'Submit your training company for approval.'
          : isArabic
          ? 'أكمل الملف الشخصي أولًا.'
          : 'Complete your profile first.',
      },
      {
        key: 'trainingPlan',
        title: isArabic ? 'خطة التدريب' : 'Training Plan',
        to: getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP),
        actionLabel: isArabic ? 'إدارة الخطة' : 'Manage Plan',
        visualStatus: trainingPlanApproved ? 'approved' : trainingPlanPending ? 'pending' : trainingCompanyApproved ? 'available' : 'locked',
        statusLabel: trainingPlanApproved
          ? isArabic
            ? 'مكتمل'
            : 'Approved'
          : trainingPlanPending
          ? isArabic
            ? 'قيد التنفيذ'
            : 'In Progress'
          : trainingCompanyApproved
          ? isArabic
            ? 'متاح'
            : 'Available'
          : isArabic
          ? 'مقفل'
          : 'Locked',
        isLocked: !trainingCompanyApproved,
        reason: trainingPlanApproved
          ? isArabic
            ? 'تم اعتماد خطة التدريب.'
            : 'Training plan approved.'
          : trainingPlanPending
          ? isArabic
            ? 'الخطة قيد الاعتماد.'
            : 'Plan is under approval.'
          : trainingCompanyApproved
          ? isArabic
            ? 'أرسل خطة التدريب.'
            : 'Submit your training plan.'
          : isArabic
          ? 'يتطلب اعتماد الشركة.'
          : 'Requires company approval.',
      },
      {
        key: 'dailyTaskEvidence',
        title: isArabic ? 'المهام اليومية' : 'Daily Tasks',
        to: getRoute(ROUTES.STUDENT_MODULES.INTERNSHIP),
        actionLabel: isArabic ? 'إضافة مهمة' : 'Add Task',
        visualStatus: hasDailyTasks ? 'completed' : trainingPlanApproved ? 'available' : 'locked',
        statusLabel: hasDailyTasks
          ? isArabic
            ? 'مكتمل'
            : 'Completed'
          : trainingPlanApproved
          ? isArabic
            ? 'قيد التنفيذ'
            : 'Available'
          : isArabic
          ? 'مقفل'
          : 'Locked',
        isLocked: !trainingPlanApproved,
        reason: hasDailyTasks
          ? isArabic
            ? 'تم تسجيل مهام يومية.'
            : 'Daily tasks have been recorded.'
          : trainingPlanApproved
          ? isArabic
            ? 'أضف المهام اليومية والأدلة.'
            : 'Add daily tasks and evidence.'
          : isArabic
          ? 'يتطلب اعتماد الخطة.'
          : 'Requires plan approval.',
      },
      {
        key: 'weeklyReport',
        title: isArabic ? 'التقرير الأسبوعي' : 'Weekly Report',
        to: getRoute(ROUTES.STUDENT_MODULES.REPORTS),
        actionLabel: isArabic ? 'عرض التقارير' : 'View Reports',
        visualStatus: hasWeeklyReport ? 'completed' : hasDailyTasks ? 'available' : 'locked',
        statusLabel: hasWeeklyReport
          ? isArabic
            ? 'مكتمل'
            : 'Generated'
          : hasDailyTasks
          ? isArabic
            ? 'قادم'
            : 'Upcoming'
          : isArabic
          ? 'مقفل'
          : 'Locked',
        isLocked: !hasDailyTasks,
        reason: hasWeeklyReport
          ? isArabic
            ? 'تم توليد تقرير أسبوعي.'
            : 'Weekly report generated.'
          : hasDailyTasks
          ? isArabic
            ? 'سيظهر التقرير بعد اكتمال الأسبوع.'
            : 'Report appears after the week is completed.'
          : isArabic
          ? 'يتطلب مهام يومية أولًا.'
          : 'Requires daily tasks first.',
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

  const providerName =
    attendanceSummary?.provider_name ||
    attendanceSummary?.providerName ||
    internshipContext?.provider_name ||
    internshipContext?.providerName ||
    '-';

  const advisorName =
    internshipContext?.academic_advisor_name ||
    internshipContext?.academicAdvisorName ||
    internshipContext?.advisor_name ||
    internshipContext?.advisorName ||
    '-';

  return (
    <div className="ims-student-dashboard">
      <style>{`
        .ims-student-dashboard {
          position: relative;
          min-height: 100%;
          color: #10243f;
          padding-bottom: 1.5rem;
        }

        .ims-student-dashboard::before {
          content: "";
          position: absolute;
          inset: -1.5rem -1.5rem auto -1.5rem;
          height: 300px;
          pointer-events: none;
          background:
            radial-gradient(circle at 22% 12%, rgba(20, 200, 195, 0.17), transparent 34%),
            radial-gradient(circle at 80% 10%, rgba(59, 130, 246, 0.13), transparent 36%),
            repeating-radial-gradient(ellipse at 46% 22%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
          opacity: 0.9;
          border-radius: 0 0 42px 42px;
          z-index: 0;
        }

        .ims-student-dashboard > * {
          position: relative;
          z-index: 1;
        }

        .ims-student-hero-header {
          min-height: 94px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-student-hero-title h1 {
          margin: 0 0 0.35rem;
          color: #10243f;
          font-size: clamp(2rem, 3vw, 2.7rem);
          font-weight: 900;
          letter-spacing: -0.055em;
        }

        .ims-student-hero-title p {
          margin: 0;
          color: #637894;
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.8;
        }

        .ims-student-hero-profile {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 0.85rem;
          border: 1px solid rgba(230, 238, 246, 0.96);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 12px 30px rgba(16, 36, 63, 0.07);
          backdrop-filter: blur(12px);
        }

        .ims-student-avatar {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 900;
          background: linear-gradient(135deg, #0796a6, #2ee6d3);
          box-shadow: 0 10px 24px rgba(7, 150, 166, 0.20);
        }

        .ims-student-hero-profile strong {
          display: block;
          color: #10243f;
          font-size: 0.95rem;
          font-weight: 900;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ims-student-hero-profile span {
          display: block;
          color: #7a8aa5;
          font-size: 0.82rem;
          font-weight: 750;
        }

        .ims-student-hero-banner {
          position: relative;
          overflow: hidden;
          min-height: 148px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1.4rem;
          padding: 1.4rem 1.55rem;
          border: 1px solid rgba(209, 232, 243, 0.92);
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(227, 251, 251, 0.86), rgba(235, 244, 255, 0.88)),
            radial-gradient(circle at 18% 30%, rgba(20, 200, 195, 0.22), transparent 30%);
          box-shadow: 0 18px 44px rgba(16, 36, 63, 0.08);
          margin-bottom: 1rem;
        }

        .ims-student-hero-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.55)),
            repeating-radial-gradient(ellipse at 30% 40%, rgba(7, 150, 166, 0.08) 0 1px, transparent 1px 24px);
          pointer-events: none;
        }

        .ims-student-hero-banner-content,
        .ims-student-hero-banner-progress {
          position: relative;
          z-index: 1;
        }

        .ims-student-hero-banner-content {
          display: grid;
          grid-template-columns: 150px 1fr;
          align-items: center;
          gap: 1.2rem;
        }

        .ims-student-hero-illustration {
          min-height: 96px;
          border-radius: 24px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.72), rgba(255,255,255,0.24)),
            radial-gradient(circle at 50% 45%, rgba(7, 150, 166, 0.18), transparent 42%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0796a6;
        }

        .ims-student-hero-banner h2 {
          margin: 0 0 0.4rem;
          color: #10243f;
          font-size: clamp(1.5rem, 2.3vw, 2.1rem);
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .ims-student-hero-banner p {
          margin: 0;
          color: #50657f;
          font-size: 0.98rem;
          font-weight: 700;
          line-height: 1.8;
        }

        .ims-student-progress-ring {
          position: relative;
          flex-shrink: 0;
        }

        .ims-student-progress-ring svg {
          display: block;
        }

        .ims-student-progress-ring-label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .ims-student-progress-ring-label strong {
          color: #10243f;
          font-size: 1.35rem;
          font-weight: 900;
          line-height: 1;
        }

        .ims-student-progress-ring-label span {
          margin-top: 0.28rem;
          color: #637894;
          font-size: 0.75rem;
          font-weight: 850;
        }

        .ims-student-feedback {
          margin-bottom: 1rem;
          border: 1px solid transparent;
          border-radius: 18px;
          padding: 0.9rem 1rem;
          font-weight: 800;
        }

        .ims-student-feedback.success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24, 197, 143, 0.24);
        }

        .ims-student-feedback.danger {
          color: #b42335;
          background: #ffedf0;
          border-color: rgba(255, 90, 107, 0.24);
        }

        .ims-student-loading {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          color: #7a8aa5;
          font-weight: 850;
          border: 1px dashed #cfe0ee;
          border-radius: 24px;
          background: rgba(255,255,255,0.76);
          margin-bottom: 1rem;
        }

        .ims-student-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-student-metric-card,
        .ims-student-card {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 26px;
          box-shadow: 0 14px 36px rgba(16, 36, 63, 0.07);
          backdrop-filter: blur(10px);
        }

        .ims-student-metric-card {
          position: relative;
          min-height: 132px;
          overflow: hidden;
          padding: 1.1rem 1.15rem 1rem;
        }

        .ims-student-metric-icon {
          width: 46px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          margin-bottom: 0.75rem;
        }

        .ims-student-metric-blue .ims-student-metric-icon {
          color: #3b82f6;
          background: #e8f1ff;
        }

        .ims-student-metric-green .ims-student-metric-icon {
          color: #18bd87;
          background: #e7fbf3;
        }

        .ims-student-metric-teal .ims-student-metric-icon {
          color: #0796a6;
          background: #e2fafa;
        }

        .ims-student-metric-purple .ims-student-metric-icon {
          color: #5b65f1;
          background: #eef0ff;
        }

        .ims-student-metric-body span {
          display: block;
          margin-bottom: 0.28rem;
          color: #5e718d;
          font-size: 0.88rem;
          font-weight: 850;
        }

        .ims-student-metric-body strong {
          display: block;
          color: #10243f;
          font-size: 1.85rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .ims-student-metric-body em {
          display: block;
          margin-top: 0.35rem;
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 750;
          font-style: normal;
        }

        .ims-student-metric-line {
          position: absolute;
          inset-inline: 1.15rem;
          bottom: 0.9rem;
          height: 4px;
          border-radius: 999px;
          background: #edf4f8;
          overflow: hidden;
        }

        .ims-student-metric-line i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0796a6, #2ee6d3);
        }

        .ims-student-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(330px, 0.85fr);
          gap: 1rem;
          align-items: start;
        }

        .ims-student-card {
          padding: 1.15rem;
          margin-bottom: 1rem;
        }

        .ims-student-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-student-section-header.compact {
          align-items: center;
        }

        .ims-student-section-header h2 {
          margin: 0 0 0.25rem;
          color: #10243f;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .ims-student-section-header p {
          margin: 0;
          color: #7a8aa5;
          font-size: 0.84rem;
          font-weight: 700;
          line-height: 1.55;
        }

        .ims-student-section-header a,
        .ims-student-card-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: #0796a6;
          font-size: 0.84rem;
          font-weight: 900;
        }

        .ims-student-workflow-card {
          padding-bottom: 0.8rem;
        }

        .ims-student-timeline {
          display: grid;
          gap: 0.75rem;
        }

        .ims-student-timeline-item {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 0.85rem;
          padding: 0.8rem;
          border: 1px solid #edf3f8;
          border-radius: 20px;
          background: linear-gradient(180deg, #fff, #fbfdff);
        }

        .ims-student-timeline-node {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #7a8aa5;
          font-weight: 900;
          background: #eef4f7;
          border: 1px solid #e1ebf4;
        }

        .ims-student-timeline-item.completed .ims-student-timeline-node,
        .ims-student-timeline-item.approved .ims-student-timeline-node {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #2ee6d3);
          border-color: transparent;
        }

        .ims-student-timeline-item.available .ims-student-timeline-node {
          color: #fff;
          background: linear-gradient(135deg, #3b82f6, #64a4ff);
          border-color: transparent;
        }

        .ims-student-timeline-item.pending .ims-student-timeline-node {
          color: #a4660b;
          background: #fff4dc;
          border-color: rgba(244,166,42,0.24);
        }

        .ims-student-timeline-content strong {
          display: block;
          color: #10243f;
          font-size: 0.93rem;
          font-weight: 900;
        }

        .ims-student-timeline-content span {
          display: inline-flex;
          margin-top: 0.25rem;
          color: #0796a6;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .ims-student-timeline-content em {
          display: block;
          margin-top: 0.28rem;
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 650;
          font-style: normal;
          line-height: 1.45;
        }

        .ims-student-timeline-action a,
        .ims-student-timeline-action button {
          min-width: 120px;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 14px;
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          font-size: 0.82rem;
          font-weight: 900;
          box-shadow: 0 10px 22px rgba(7,150,166,0.18);
        }

        .ims-student-timeline-action button:disabled {
          color: #7a8aa5;
          background: #eef4f7;
          box-shadow: none;
        }

        .ims-student-attendance-layout {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1.1rem;
          align-items: center;
        }

        .ims-student-attendance-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .ims-student-attendance-details div {
          min-height: 74px;
          padding: 0.85rem 0.9rem;
          border: 1px solid #edf3f8;
          border-radius: 18px;
          background: #fbfdff;
        }

        .ims-student-attendance-details span {
          display: block;
          margin-bottom: 0.35rem;
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .ims-student-attendance-details strong {
          display: block;
          color: #243b5a;
          font-size: 0.92rem;
          font-weight: 900;
        }

        .ims-student-attendance-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
          margin-top: 1rem;
        }

        .ims-student-attendance-actions button,
        .ims-student-action-grid button,
        .ims-student-action-grid a {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border: none;
          border-radius: 17px;
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          font-weight: 900;
        }

        .ims-student-attendance-actions button.danger {
          background: linear-gradient(135deg, #ef4457, #ff6878);
        }

        .ims-student-attendance-actions button:disabled,
        .ims-student-action-grid button:disabled {
          color: #7a8aa5;
          background: #eef4f7;
          cursor: not-allowed;
        }

        .ims-student-list {
          display: grid;
          gap: 0.7rem;
        }

        .ims-student-list-item {
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.9rem;
          padding: 0.78rem 0.85rem;
          border: 1px solid #edf3f8;
          border-radius: 18px;
          background: #fbfdff;
        }

        .ims-student-list-item strong {
          display: block;
          color: #243b5a;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .ims-student-list-item span {
          display: block;
          margin-top: 0.2rem;
          color: #7a8aa5;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .ims-student-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.36rem;
          min-height: 28px;
          padding: 0.35rem 0.68rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 900;
          white-space: nowrap;
          border: 1px solid transparent;
        }

        .ims-student-status::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
        }

        .ims-student-status-success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24,197,143,0.22);
        }

        .ims-student-status-warning {
          color: #a4660b;
          background: #fff4dc;
          border-color: rgba(244,166,42,0.24);
        }

        .ims-student-status-danger {
          color: #c02c3f;
          background: #ffedf0;
          border-color: rgba(255,90,107,0.24);
        }

        .ims-student-status-neutral {
          color: #1f65c8;
          background: #e8f1ff;
          border-color: rgba(59,130,246,0.2);
        }

        .ims-student-empty {
          min-height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a8aa5;
          font-size: 0.88rem;
          font-weight: 800;
          text-align: center;
          border: 1px dashed #cfe0ee;
          border-radius: 18px;
          background: #fbfdff;
        }

        .ims-student-plan-body {
          display: grid;
          gap: 0.5rem;
          padding: 0.9rem;
          border: 1px solid #edf3f8;
          border-radius: 20px;
          background: #fbfdff;
          margin-bottom: 0.9rem;
        }

        .ims-student-plan-body strong {
          color: #10243f;
          font-size: 1rem;
          font-weight: 900;
        }

        .ims-student-plan-body span {
          color: #7a8aa5;
          font-size: 0.82rem;
          font-weight: 750;
        }

        .ims-student-evaluation-list {
          display: grid;
          gap: 0.75rem;
        }

        .ims-student-evaluation-item {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.78rem 0.85rem;
          border: 1px solid #edf3f8;
          border-radius: 18px;
          background: #fbfdff;
        }

        .ims-student-soft-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: #0796a6;
          background: #e2fafa;
        }

        .ims-student-soft-icon.purple {
          color: #5b65f1;
          background: #eef0ff;
        }

        .ims-student-evaluation-item strong {
          display: block;
          color: #243b5a;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .ims-student-evaluation-item span {
          display: block;
          margin-top: 0.2rem;
          color: #7a8aa5;
          font-size: 0.76rem;
          font-weight: 700;
        }

        .ims-student-action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .ims-student-action-grid a,
        .ims-student-action-grid button {
          min-height: 90px;
          flex-direction: column;
          color: #0796a6;
          background: linear-gradient(135deg, #effdff, #f3f9ff);
          border: 1px solid #e2f0f5;
          box-shadow: none;
        }

        .ims-student-action-grid a:nth-child(2),
        .ims-student-action-grid button:nth-child(2) {
          color: #3b82f6;
          background: linear-gradient(135deg, #eef6ff, #f5f9ff);
        }

        .ims-student-action-grid a:nth-child(3),
        .ims-student-action-grid button:nth-child(3) {
          color: #5b65f1;
          background: linear-gradient(135deg, #f1f0ff, #f9f8ff);
        }

        .ims-student-action-grid a:nth-child(4),
        .ims-student-action-grid button:nth-child(4) {
          color: #18bd87;
          background: linear-gradient(135deg, #eafbf4, #f7fffb);
        }

        .ims-student-action-grid span {
          font-size: 0.88rem;
          font-weight: 900;
        }

        @media (max-width: 1199.98px) {
          .ims-student-main-grid {
            grid-template-columns: 1fr;
          }

          .ims-student-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 767.98px) {
          .ims-student-hero-header,
          .ims-student-hero-banner,
          .ims-student-section-header,
          .ims-student-list-item {
            align-items: stretch;
            flex-direction: column;
          }

          .ims-student-hero-banner {
            display: block;
          }

          .ims-student-hero-banner-content {
            grid-template-columns: 1fr;
          }

          .ims-student-hero-banner-progress {
            margin-top: 1rem;
          }

          .ims-student-metric-grid,
          .ims-student-attendance-details,
          .ims-student-attendance-actions,
          .ims-student-action-grid {
            grid-template-columns: 1fr;
          }

          .ims-student-timeline-item {
            grid-template-columns: 42px 1fr;
          }

          .ims-student-timeline-action {
            grid-column: 1 / -1;
          }

          .ims-student-timeline-action a,
          .ims-student-timeline-action button {
            width: 100%;
          }

          .ims-student-attendance-layout {
            grid-template-columns: 1fr;
          }

          .ims-student-hero-profile {
            width: 100%;
          }
        }
      `}</style>

      <div className="ims-student-hero-header">
        <div className="ims-student-hero-title">
          <h1>{isArabic ? `مرحبًا ${user?.fullName || user?.email || ''}!` : `Welcome ${user?.fullName || user?.email || ''}!`}</h1>
          <p>
            {isArabic
              ? 'تابع تقدمك في التدريب، خطتك، مهامك وتقاريرك من مكان واحد.'
              : 'Track your internship progress, plan, tasks, and reports in one place.'}
          </p>
        </div>

        <div className="ims-student-hero-profile">
          <div className="ims-student-avatar">{(user?.fullName || user?.email || 'S').slice(0, 1)}</div>
          <div>
            <strong>{user?.fullName || user?.email || (isArabic ? 'طالب' : 'Student')}</strong>
            <span>{isArabic ? 'طالب' : 'Student'}</span>
          </div>
        </div>
      </div>

      <section className="ims-student-hero-banner">
        <div className="ims-student-hero-banner-content">
          <div className="ims-student-hero-illustration">
            <SvgIcon name="briefcase" size={54} />
          </div>
          <div>
            <h2>{isArabic ? 'حالتك في التدريب' : 'Your Internship Status'}</h2>
            <p>
              {isArabic
                ? `استمر على هذا المسار. جهة التدريب الحالية: ${providerName}.`
                : `Keep moving forward. Current training company: ${providerName}.`}
            </p>
            <p>
              {isArabic ? `المشرف الأكاديمي: ${advisorName}` : `Academic advisor: ${advisorName}`}
            </p>
          </div>
        </div>

        <div className="ims-student-hero-banner-progress">
          <ProgressRing
            value={planProgress}
            size={112}
            stroke={13}
            label={`${planProgress}%`}
            subLabel={isArabic ? 'نسبة الإنجاز' : 'Progress'}
          />
        </div>
      </section>

      {feedback.message ? (
        <div className={`ims-student-feedback ${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <div className="ims-student-loading">
          <div className="spinner-border spinner-border-sm" role="status" />
          <span>{isArabic ? 'جارٍ تحميل لوحة الطالب...' : 'Loading dashboard...'}</span>
        </div>
      ) : null}

      <section className="ims-student-metric-grid">
        {studentDashboardStats.map((stat) => (
          <MetricCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            tone={stat.tone}
            progress={stat.progress}
          />
        ))}
      </section>

      <div className="ims-student-main-grid">
        <div>
          <WorkflowTimeline steps={onboardingSteps} isArabic={isArabic} />

          <div className="ims-student-main-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <AttendanceCard
              attendanceSummary={attendanceSummary}
              attendanceToday={attendanceToday}
              todayEntry={todayEntry}
              canCheckIn={canCheckIn}
              canCheckOut={canCheckOut}
              submittingAttendance={submittingAttendance}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              internshipContext={internshipContext}
              isArabic={isArabic}
            />

            <WeeklyReportsCard reports={weeklyReports} isArabic={isArabic} locale={locale} />
          </div>
        </div>

        <div>
          <TrainingPlanCard latestTrainingPlan={latestTrainingPlan} isArabic={isArabic} locale={locale} />
          <TaskListCard tasks={trainingTasks} isArabic={isArabic} locale={locale} />
          <EvaluationCard internshipContext={internshipContext} isArabic={isArabic} />
          <QuickActions
            isArabic={isArabic}
            canCheckIn={canCheckIn}
            canCheckOut={canCheckOut}
            submittingAttendance={submittingAttendance}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentDashboardPage;