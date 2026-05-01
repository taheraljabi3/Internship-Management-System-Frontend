import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import ModuleTabs from '../../../shared/components/ModuleTabs';
import AppTable from '../../../shared/components/AppTable';
import TableToolbar from '../../../shared/components/TableToolbar';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  getAdminAdvisorWorkloadRequest,
  getAdminAttendanceTrendRequest,
  getAdminEvaluationDistributionRequest,
  getAdminProviderPerformanceRequest,
  getAdminReportOverviewRequest,
  getAdvisorAttendanceTrendRequest,
  getAdvisorEvaluationStatusRequest,
  getAdvisorReportOverviewRequest,
  getAdvisorRiskStudentsRequest,
  getAdvisorStudentsPerformanceRequest,
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getMyAttendanceHistoryRequest,
  getMyAttendanceSummaryRequest,
} from '../../../app/api/client';

const studentTabs = [
  { key: 'summary', label: 'My Attendance Summary' },
];

const adminTabs = [
  { key: 'overview', label: 'General Reports' },
  { key: 'attendanceTrend', label: 'Attendance Trend' },
  { key: 'evaluations', label: 'Evaluation Analytics' },
  { key: 'providers', label: 'Provider Performance' },
  { key: 'advisorWorkload', label: 'Advisor Workload' },
];

const advisorTabs = [
  { key: 'overview', label: 'My Students Reports' },
  { key: 'attendanceTrend', label: 'Attendance Trend' },
  { key: 'performance', label: 'Students Performance' },
  { key: 'evaluations', label: 'Evaluation Status' },
  { key: 'risk', label: 'Risk Students' },
];

function getRoleKey(role) {
  const value = String(role || '').toLowerCase().replace(/[\s_-]/g, '');
  if (value === 'administrator' || value === 'admin') return 'Administrator';
  if (value === 'academicadvisor' || value === 'advisor') return 'AcademicAdvisor';
  return 'Student';
}

function getUserId(user) {
  return user?.id ?? user?.user_id ?? user?.userId ?? 0;
}

function getUserEmail(user) {
  return String(user?.email || user?.email_address || user?.emailAddress || '').toLowerCase();
}

function getNumber(row, keys, fallback = 0) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      const value = Number(row[key]);
      return Number.isNaN(value) ? fallback : value;
    }
  }
  return fallback;
}

function getString(row, keys, fallback = '-') {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      return String(row[key]);
    }
  }
  return fallback;
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 5);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeTrendRows(rows) {
  return normalizeArray(rows).map((row, index) => ({
    id: row.id ?? `trend-${index}`,
    period: getString(row, ['period', 'report_date', 'entry_date', 'date', 'day'], '-'),
    present: getNumber(row, ['present', 'present_days', 'present_count', 'presentStudents']),
    absent: getNumber(row, ['absent', 'absent_days', 'absent_count', 'absentStudents']),
    total_hours: getNumber(row, ['total_hours', 'totalHours', 'hours', 'daily_hours']),
  }));
}

function normalizeDistributionRows(rows) {
  return normalizeArray(rows).map((row, index) => ({
    id: row.id ?? `distribution-${index}`,
    name: getString(row, ['name', 'label', 'status', 'bucket', 'score_range'], 'Unknown'),
    value: getNumber(row, ['value', 'count', 'total', 'evaluations_count']),
  }));
}

function normalizeEvaluationStatusRows(value, isArabic) {
  if (Array.isArray(value)) {
    return normalizeDistributionRows(value);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const rows = [
    {
      id: 'company-received',
      name: isArabic ? 'تقييمات الشركة المستلمة' : 'Company Received',
      value: getNumber(value, ['company_evaluations_received', 'companyEvaluationsReceived']),
    },
    {
      id: 'company-pending',
      name: isArabic ? 'تقييمات الشركة المعلقة' : 'Company Pending',
      value: getNumber(value, ['company_evaluations_pending', 'companyEvaluationsPending']),
    },
    {
      id: 'academic-submitted',
      name: isArabic ? 'تقييمات المشرف المرسلة' : 'Academic Submitted',
      value: getNumber(value, ['academic_evaluations_submitted', 'academicEvaluationsSubmitted']),
    },
    {
      id: 'academic-pending',
      name: isArabic ? 'تقييمات المشرف المعلقة' : 'Academic Pending',
      value: getNumber(value, ['academic_evaluations_pending', 'academicEvaluationsPending']),
    },
  ];

  return rows.filter((row) => row.value > 0);
}

function normalizeAdvisor(row) {
  return {
    id: row.user_id ?? row.id ?? row.advisor_user_id ?? row.advisorUserId,
    full_name: row.full_name || row.fullName || row.advisor_name || row.advisorName || '',
    email: row.email || row.advisor_email || row.advisorEmail || '',
  };
}

function normalizeAdvisorStudent(row, index = 0) {
  const studentUserId = row.student_user_id ?? row.studentUserId ?? row.user_id ?? row.userId ?? row.id;

  const companyScore =
    row.company_total_percentage ??
    row.companyTotalPercentage ??
    row.company_score ??
    row.companyScore ??
    row.average_company_score ??
    row.averageCompanyScore ??
    0;

  const academicScore =
    row.academic_total_percentage ??
    row.academicTotalPercentage ??
    row.academic_score ??
    row.academicScore ??
    row.average_academic_score ??
    row.averageAcademicScore ??
    0;

  return {
    id: studentUserId ?? `student-${index}`,
    student_user_id: studentUserId,
    student_name: row.student_name || row.studentName || row.full_name || row.fullName || '-',
    provider_name: row.provider_name || row.providerName || row.company_name || row.companyName || '-',
    total_hours: row.total_hours ?? row.totalHours ?? 0,
    present_days: row.present_days ?? row.presentDays ?? 0,
    absent_days: row.absent_days ?? row.absentDays ?? 0,
    company_total_percentage: companyScore,
    academic_total_percentage: academicScore,
    overall_score: row.overall_score ?? row.overallScore ?? row.final_average ?? row.finalAverage ?? 0,
    risk_level: row.risk_level || row.riskLevel || 'Normal',
    risk_reason: row.risk_reason || row.riskReason || '-',
    last_attendance_date: row.last_attendance_date || row.lastAttendanceDate || null,
  };
}


function buildAdvisorOverviewFallback(overview, students) {
  const assignedStudents = students.length;
  const activeInternshipsFromStudents = students.filter(
    (item) => item.internship_id || item.internshipId || item.provider_name || item.providerName
  ).length;

  return {
    ...(overview || {}),
    assigned_students:
      getNumber(overview, ['assigned_students', 'assignedStudents', 'assigned_students_count', 'assignedStudentsCount']) || assignedStudents,
    active_internships:
      getNumber(overview, ['active_internships', 'activeInternships', 'active_internships_count', 'activeInternshipsCount']) || activeInternshipsFromStudents,
    students_missing_attendance:
      getNumber(overview, [
        'students_missing_attendance',
        'students_missing_attendance_today',
        'missing_attendance',
        'missingAttendance',
        'missingAttendanceToday',
      ]),
    pending_weekly_reports:
      getNumber(overview, ['pending_weekly_reports', 'pendingWeeklyReports']),
    pending_academic_evaluations:
      getNumber(overview, ['pending_academic_evaluations', 'pendingAcademicEvaluations']),
    company_evaluations_received:
      getNumber(overview, ['company_evaluations_received', 'companyEvaluationsReceived']),
    average_student_performance:
      getNumber(overview, ['average_student_performance', 'averageStudentPerformance']),
  };
}


function KpiCards({ cards }) {
  return (
    <div className="row g-3 mb-4">
      {cards.map((item) => (
        <div className="col-sm-6 col-xl-3" key={item.label}>
          <div className="card ims-stat-card h-100">
            <div className="card-body">
              <div className="ims-stat-label">{item.label}</div>
              <div className="ims-stat-value">{item.value}</div>
              {item.hint ? <div className="text-muted small mt-1">{item.hint}</div> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card ims-table-card h-100">
      <div className="card-body">
        <div className="mb-3">
          <h5 className="ims-section-title mb-1">{title}</h5>
          {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
        </div>
        <div style={{ width: '100%', height: 320 }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyPanel({ message }) {
  return <div className="ims-empty-panel">{message}</div>;
}

function AdminOverview({ overview, isArabic }) {
  const cards = [
    {
      label: isArabic ? 'إجمالي الطلاب' : 'Total Students',
      value: getNumber(overview, ['total_students', 'totalStudents']),
    },
    {
      label: isArabic ? 'التدريبات النشطة' : 'Active Internships',
      value: getNumber(overview, ['active_internships', 'activeInternships', 'active_internships_count', 'activeInternshipsCount']),
    },
    {
      label: isArabic ? 'طلبات التدريب المعلقة' : 'Pending Training Requests',
      value: getNumber(overview, ['pending_training_requests', 'pendingTrainingRequests']),
    },
    {
      label: isArabic ? 'خطط التدريب المكتملة' : 'Completed Training Plans',
      value: getNumber(overview, ['completed_training_plans', 'completedTrainingPlans']),
    },
    {
      label: isArabic ? 'التقارير الأسبوعية المرسلة' : 'Submitted Weekly Reports',
      value: getNumber(overview, ['submitted_weekly_reports', 'submittedWeeklyReports']),
    },
    {
      label: isArabic ? 'نسبة الحضور' : 'Attendance Rate',
      value: `${getNumber(overview, ['attendance_rate', 'attendanceRate'])}%`,
    },
    {
      label: isArabic ? 'تقييمات الشركة المستلمة' : 'Company Evaluations',
      value: getNumber(overview, ['company_evaluations_submitted', 'companyEvaluationsSubmitted']),
    },
    {
      label: isArabic ? 'تقييمات المشرف الأكاديمي' : 'Academic Evaluations',
      value: getNumber(overview, ['academic_evaluations_submitted', 'academicEvaluationsSubmitted']),
    },
  ];

  return (
    <>
      <KpiCards cards={cards} />
      <div className="alert alert-info">
        {isArabic
          ? 'هذه الواجهة تعرض مؤشرات عامة على مستوى النظام بالكامل.'
          : 'This dashboard summarizes system-wide internship, attendance, report, and evaluation indicators.'}
      </div>
    </>
  );
}

function AdvisorOverview({ overview, assignedStudentsCount, isArabic }) {
  const cards = [
    {
      label: isArabic ? 'طلابي المرتبطون' : 'My Assigned Students',
      value: getNumber(overview, ['assigned_students', 'assignedStudents', 'assigned_students_count', 'assignedStudentsCount'], assignedStudentsCount),
    },
    {
      label: isArabic ? 'طلاب لديهم تدريب نشط' : 'Active Internships',
      value: getNumber(overview, ['active_internships', 'activeInternships', 'active_internships_count', 'activeInternshipsCount']),
    },
    {
      label: isArabic ? 'طلاب بلا حضور حديث' : 'Missing Attendance',
      value: getNumber(overview, ['students_missing_attendance', 'students_missing_attendance_today', 'missing_attendance', 'missingAttendance', 'missingAttendanceToday']),
    },
    {
      label: isArabic ? 'تقارير أسبوعية معلقة' : 'Pending Weekly Reports',
      value: getNumber(overview, ['pending_weekly_reports', 'pendingWeeklyReports']),
    },
    {
      label: isArabic ? 'تقييمات أكاديمية معلقة' : 'Pending Academic Evaluations',
      value: getNumber(overview, ['pending_academic_evaluations', 'pendingAcademicEvaluations']),
    },
    {
      label: isArabic ? 'تقييمات شركة مستلمة' : 'Company Evaluations Received',
      value: getNumber(overview, ['company_evaluations_received', 'companyEvaluationsReceived']),
    },
    {
      label: isArabic ? 'متوسط أداء الطلاب' : 'Average Student Performance',
      value: `${getNumber(overview, ['average_student_performance', 'averageStudentPerformance'])}%`,
    },
  ];

  return <KpiCards cards={cards} />;
}

function StudentAttendanceSummaryView({ summary, history, isArabic }) {
  const historyRows = normalizeArray(history).map((entry) => ({
    id: entry.id,
    entry_date: formatDate(entry.entry_date),
    check_in_time: formatTime(entry.check_in_time),
    check_out_time: formatTime(entry.check_out_time),
    daily_hours: entry.daily_hours ?? 0,
    status: entry.status || '-',
    notes: entry.notes || '-',
  }));

  const historyColumns = [
    { key: 'entry_date', label: isArabic ? 'التاريخ' : 'Date' },
    { key: 'check_in_time', label: isArabic ? 'وقت الحضور' : 'Check In' },
    { key: 'check_out_time', label: isArabic ? 'وقت الانصراف' : 'Check Out' },
    { key: 'daily_hours', label: isArabic ? 'الساعات اليومية' : 'Daily Hours' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'notes', label: isArabic ? 'ملاحظات' : 'Notes' },
  ];

  return (
    <>
      <KpiCards
        cards={[
          {
            label: isArabic ? 'إجمالي الساعات' : 'Total Hours',
            value: summary?.total_hours ?? summary?.totalHours ?? 0,
          },
          {
            label: isArabic ? 'أيام الحضور' : 'Present Days',
            value: summary?.present_days ?? summary?.presentDays ?? 0,
          },
          {
            label: isArabic ? 'أيام الغياب' : 'Absent Days',
            value: summary?.absent_days ?? summary?.absentDays ?? 0,
          },
          {
            label: isArabic ? 'آخر تحديث' : 'Last Update',
            value: summary?.last_attendance_date
              ? formatDate(summary.last_attendance_date)
              : '-',
          },
        ]}
      />


      <div className="card ims-table-card">
        <div className="card-body">
          <h5 className="ims-section-title mb-3">
            {isArabic ? 'سجل الحضور' : 'Attendance History'}
          </h5>
          <AppTable
            columns={historyColumns}
            rows={historyRows}
            rowKey="id"
            emptyMessage={isArabic ? 'لا توجد سجلات حضور.' : 'No attendance records found.'}
          />
        </div>
      </div>
    </>
  );
}

function AttendanceReportsModulePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const roleKey = getRoleKey(user?.role);
  const isStudent = roleKey === 'Student';
  const isAdmin = roleKey === 'Administrator';
  const isAdvisor = roleKey === 'AcademicAdvisor';

  const tabs = isStudent ? studentTabs : isAdmin ? adminTabs : advisorTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'overview');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [advisorNotice, setAdvisorNotice] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [adminOverview, setAdminOverview] = useState(null);
  const [adminAttendanceTrend, setAdminAttendanceTrend] = useState([]);
  const [adminEvaluationDistribution, setAdminEvaluationDistribution] = useState([]);
  const [adminAdvisorWorkload, setAdminAdvisorWorkload] = useState([]);
  const [adminProviderPerformance, setAdminProviderPerformance] = useState([]);

  const [resolvedAdvisorId, setResolvedAdvisorId] = useState(null);
  const [advisorStudents, setAdvisorStudents] = useState([]);
  const [advisorOverview, setAdvisorOverview] = useState(null);
  const [advisorAttendanceTrend, setAdvisorAttendanceTrend] = useState([]);
  const [advisorStudentsPerformance, setAdvisorStudentsPerformance] = useState([]);
  const [advisorEvaluationStatus, setAdvisorEvaluationStatus] = useState([]);
  const [advisorRiskStudents, setAdvisorRiskStudents] = useState([]);

  const [studentSummary, setStudentSummary] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);

  useEffect(() => {
    setActiveTab(tabs[0]?.key || 'overview');
    setSearch('');
  }, [roleKey]);

  const resolveAdvisorUserId = async () => {
    const directUserId = Number(getUserId(user) || 0);
    const userEmail = getUserEmail(user);

    const advisors = await getAdvisorsRequest().catch(() => []);
    const normalizedAdvisors = normalizeArray(advisors).map(normalizeAdvisor);

    const matchedAdvisor =
      normalizedAdvisors.find((item) => Number(item.id) === directUserId) ||
      normalizedAdvisors.find(
        (item) => String(item.email || '').toLowerCase() === userEmail
      );

    const advisorUserId = Number(matchedAdvisor?.id || directUserId || 0);

    if (!advisorUserId) {
      throw new Error(
        isArabic
          ? 'تعذر تحديد معرف المشرف الأكاديمي الحالي.'
          : 'Could not resolve the current academic advisor user id.'
      );
    }

    setResolvedAdvisorId(advisorUserId);
    return advisorUserId;
  };

  const loadStudentReports = async () => {
    const [summary, history] = await Promise.all([
      getMyAttendanceSummaryRequest().catch(() => null),
      getMyAttendanceHistoryRequest().catch(() => []),
    ]);

    setStudentSummary(summary || null);
    setStudentHistory(normalizeArray(history));
  };

  const loadAdminReports = async () => {
    const [overview, attendanceTrend, evaluationDistribution, advisorWorkload, providerPerformance] =
      await Promise.all([
        getAdminReportOverviewRequest().catch(() => null),
        getAdminAttendanceTrendRequest(days).catch(() => []),
        getAdminEvaluationDistributionRequest().catch(() => []),
        getAdminAdvisorWorkloadRequest().catch(() => []),
        getAdminProviderPerformanceRequest().catch(() => []),
      ]);

    setAdminOverview(overview || null);
    setAdminAttendanceTrend(normalizeArray(attendanceTrend));
    setAdminEvaluationDistribution(normalizeArray(evaluationDistribution));
    setAdminAdvisorWorkload(
      normalizeArray(advisorWorkload).map((row, index) => ({ id: row.id ?? row.advisor_user_id ?? row.advisorUserId ?? `advisor-${index}`, ...row }))
    );
    setAdminProviderPerformance(
      normalizeArray(providerPerformance).map((row, index) => ({ id: row.id ?? row.provider_id ?? row.providerId ?? `provider-${index}`, ...row }))
    );
  };

  const loadAdvisorReports = async () => {
    const advisorUserId = await resolveAdvisorUserId();

    const assignedStudentsPayload = await getAdvisorStudentsRequest(advisorUserId).catch(() => []);
    const normalizedAssignedStudents = normalizeArray(assignedStudentsPayload).map(normalizeAdvisorStudent);
    setAdvisorStudents(normalizedAssignedStudents);

    const [overview, attendanceTrend, studentsPerformance, evaluationStatus, riskStudents] =
      await Promise.all([
        getAdvisorReportOverviewRequest(advisorUserId).catch(() => null),
        getAdvisorAttendanceTrendRequest(advisorUserId, days).catch(() => []),
        getAdvisorStudentsPerformanceRequest(advisorUserId).catch(() => []),
        getAdvisorEvaluationStatusRequest(advisorUserId).catch(() => []),
        getAdvisorRiskStudentsRequest(advisorUserId).catch(() => []),
      ]);

    const performanceRows = normalizeArray(studentsPerformance).map((row, index) => ({
      id: row.id ?? row.student_user_id ?? row.studentUserId ?? `performance-${index}`,
      ...normalizeAdvisorStudent(row, index),
      ...row,
    }));

    const fallbackPerformanceRows = normalizedAssignedStudents.map((row, index) => ({
      id: row.id ?? `assigned-${index}`,
      ...row,
    }));

    const riskRows = normalizeArray(riskStudents).map((row, index) => ({
      id: row.id ?? row.student_user_id ?? row.studentUserId ?? `risk-${index}`,
      ...normalizeAdvisorStudent(row, index),
      ...row,
    }));

    setAdvisorOverview(buildAdvisorOverviewFallback(overview, normalizedAssignedStudents));
    setAdvisorAttendanceTrend(normalizeArray(attendanceTrend));
    setAdvisorStudentsPerformance(
      performanceRows.length > 0 ? performanceRows : fallbackPerformanceRows
    );
    setAdvisorEvaluationStatus(normalizeArray(evaluationStatus));
    setAdvisorRiskStudents(riskRows);

    const detailedReportsAreEmpty =
      normalizeArray(attendanceTrend).length === 0 &&
      normalizeArray(studentsPerformance).length === 0 &&
      normalizeArray(evaluationStatus).length === 0 &&
      normalizeArray(riskStudents).length === 0;

  
  };

  const loadReports = async () => {
    setLoading(true);
    setErrorMessage('');
    setAdvisorNotice('');
    setFeedback({ type: '', message: '' });

    try {
      if (isStudent) {
        await loadStudentReports();
      } else if (isAdmin) {
        await loadAdminReports();
      } else {
        await loadAdvisorReports();
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey, user?.id, user?.user_id, user?.email, days]);

  const adminTrendRows = useMemo(
    () => normalizeTrendRows(adminAttendanceTrend),
    [adminAttendanceTrend]
  );

  const advisorTrendRows = useMemo(
    () => normalizeTrendRows(advisorAttendanceTrend),
    [advisorAttendanceTrend]
  );

  const adminEvaluationRows = useMemo(
    () => normalizeDistributionRows(adminEvaluationDistribution),
    [adminEvaluationDistribution]
  );

  const advisorEvaluationRows = useMemo(
    () => normalizeEvaluationStatusRows(advisorEvaluationStatus, isArabic),
    [advisorEvaluationStatus, isArabic]
  );

  const filteredProviderPerformance = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = normalizeArray(adminProviderPerformance);
    if (!keyword) return rows;

    return rows.filter((row) =>
      [row.provider_name, row.providerName, row.company_name, row.companyName, row.status]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [adminProviderPerformance, search]);

  const filteredAdvisorWorkload = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = normalizeArray(adminAdvisorWorkload);
    if (!keyword) return rows;

    return rows.filter((row) =>
      [row.advisor_name, row.advisorName, row.email, row.advisor_email]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [adminAdvisorWorkload, search]);

  const filteredStudentsPerformance = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = normalizeArray(advisorStudentsPerformance);
    if (!keyword) return rows;

    return rows.filter((row) =>
      [row.student_name, row.studentName, row.provider_name, row.providerName]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [advisorStudentsPerformance, search]);

  const filteredRiskStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = normalizeArray(advisorRiskStudents);
    if (!keyword) return rows;

    return rows.filter((row) =>
      [row.student_name, row.studentName, row.provider_name, row.providerName, row.risk_level, row.riskLevel]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [advisorRiskStudents, search]);

  const providerColumns = [
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Training Provider',
      render: (_, row) => getString(row, ['provider_name', 'providerName', 'company_name', 'companyName']),
    },
    {
      key: 'active_internships',
      label: isArabic ? 'التدريبات النشطة' : 'Active Internships',
      render: (_, row) => getNumber(row, ['active_internships', 'activeInternships']),
    },
    {
      key: 'attendance_rate',
      label: isArabic ? 'نسبة الحضور' : 'Attendance Rate',
      render: (_, row) => `${getNumber(row, ['attendance_rate', 'attendanceRate'])}%`,
    },
    {
      key: 'avg_company_score',
      label: isArabic ? 'متوسط تقييم الشركة' : 'Avg Company Score',
      render: (_, row) => `${getNumber(row, ['avg_company_score', 'avgCompanyScore'])}%`,
    },
  ];

  const advisorWorkloadColumns = [
    {
      key: 'advisor_name',
      label: isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor',
      render: (_, row) => getString(row, ['advisor_name', 'advisorName']),
    },
    {
      key: 'advisor_email',
      label: isArabic ? 'البريد' : 'Email',
      render: (_, row) => getString(row, ['advisor_email', 'advisorEmail', 'email']),
    },
    {
      key: 'assigned_students',
      label: isArabic ? 'عدد الطلاب' : 'Assigned Students',
      render: (_, row) => getNumber(row, ['assigned_students', 'assignedStudents']),
    },
    {
      key: 'active_internships',
      label: isArabic ? 'تدريبات نشطة' : 'Active Internships',
      render: (_, row) => getNumber(row, ['active_internships', 'activeInternships']),
    },
  ];

  const studentsPerformanceColumns = [
    {
      key: 'student_name',
      label: isArabic ? 'الطالب' : 'Student',
      render: (_, row) => getString(row, ['student_name', 'studentName']),
    },
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Provider',
      render: (_, row) => getString(row, ['provider_name', 'providerName']),
    },
    {
      key: 'total_hours',
      label: isArabic ? 'إجمالي الساعات' : 'Total Hours',
      render: (_, row) => getNumber(row, ['total_hours', 'totalHours']),
    },
    {
      key: 'present_days',
      label: isArabic ? 'أيام الحضور' : 'Present Days',
      render: (_, row) => getNumber(row, ['present_days', 'presentDays']),
    },
    {
      key: 'absent_days',
      label: isArabic ? 'أيام الغياب' : 'Absent Days',
      render: (_, row) => getNumber(row, ['absent_days', 'absentDays']),
    },
    {
      key: 'company_total_percentage',
      label: isArabic ? 'تقييم الشركة' : 'Company Score',
      render: (_, row) => `${getNumber(row, ['company_total_percentage', 'companyTotalPercentage', 'company_score', 'companyScore'])}%`,
    },
    {
      key: 'academic_total_percentage',
      label: isArabic ? 'تقييم المشرف' : 'Academic Score',
      render: (_, row) => `${getNumber(row, ['academic_total_percentage', 'academicTotalPercentage', 'academic_score', 'academicScore'])}%`,
    },
    {
      key: 'overall_score',
      label: isArabic ? 'المتوسط النهائي' : 'Final Average',
      render: (_, row) => `${getNumber(row, ['overall_score', 'overallScore', 'final_average', 'finalAverage'])}%`,
    },
  ];

  const riskStudentsColumns = [
    {
      key: 'student_name',
      label: isArabic ? 'الطالب' : 'Student',
      render: (_, row) => getString(row, ['student_name', 'studentName']),
    },
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Provider',
      render: (_, row) => getString(row, ['provider_name', 'providerName']),
    },
    {
      key: 'absent_days',
      label: isArabic ? 'أيام الغياب' : 'Absent Days',
      render: (_, row) => getNumber(row, ['absent_days', 'absentDays']),
    },
    {
      key: 'total_hours',
      label: isArabic ? 'إجمالي الساعات' : 'Total Hours',
      render: (_, row) => getNumber(row, ['total_hours', 'totalHours']),
    },
    {
      key: 'risk_level',
      label: isArabic ? 'مستوى الخطورة' : 'Risk Level',
      type: 'status',
      render: (_, row) => getString(row, ['risk_level', 'riskLevel'], 'Normal'),
    },
    {
      key: 'risk_reason',
      label: isArabic ? 'سبب الخطورة' : 'Risk Reason',
      render: (_, row) => getString(row, ['risk_reason', 'riskReason'], '-'),
    },
  ];

  return (
    <div>
      <ModulePageHeader
        title={isArabic ? 'التقارير والتحليلات' : 'Reports & Analytics'}
        description={
          isArabic
            ? 'واجهة تقارير عامة تعتمد على البيانات الحقيقية، وتعرض مؤشرات ورسوم بيانية حسب دور المستخدم.'
            : 'Role-based reporting dashboard with real operational data, KPI cards, charts, and detailed tables.'
        }
      />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <ModuleTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {!isStudent ? (
          <select
            className="form-select form-select-sm"
            style={{ width: 160 }}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>{isArabic ? 'آخر 7 أيام' : 'Last 7 days'}</option>
            <option value={30}>{isArabic ? 'آخر 30 يوم' : 'Last 30 days'}</option>
            <option value={60}>{isArabic ? 'آخر 60 يوم' : 'Last 60 days'}</option>
            <option value={90}>{isArabic ? 'آخر 90 يوم' : 'Last 90 days'}</option>
          </select>
        ) : null}
      </div>

      {resolvedAdvisorId && isAdvisor ? (
        <div className="text-muted small mb-3">
          {isArabic ? 'معرف المشرف المستخدم في التقارير:' : 'Advisor ID used for reports:'}{' '}
          <strong>{resolvedAdvisorId}</strong>
        </div>
      ) : null}

      {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
      {advisorNotice ? <div className="alert alert-warning">{advisorNotice}</div> : null}
      {feedback.message ? (
        <div className={`alert alert-${feedback.type || 'info'} alert-dismissible fade show`} role="alert">
          {feedback.message}
          <button
            type="button"
            className="btn-close"
            aria-label={isArabic ? 'إغلاق' : 'Close'}
            onClick={() => setFeedback({ type: '', message: '' })}
          />
        </div>
      ) : null}

      {loading ? (
        <EmptyPanel message={isArabic ? 'جارٍ تحميل التقارير...' : 'Loading reports...'} />
      ) : null}

      {!loading && isStudent ? (
        <StudentAttendanceSummaryView
          summary={studentSummary}
          history={studentHistory}
          isArabic={isArabic}
        />
      ) : null}

      {!loading && isAdmin && activeTab === 'overview' ? (
        <AdminOverview overview={adminOverview || {}} isArabic={isArabic} />
      ) : null}

      {!loading && isAdmin && activeTab === 'attendanceTrend' ? (
        <div className="row g-3">
          <div className="col-xl-8">
            <ChartCard
              title={isArabic ? 'اتجاه الحضور' : 'Attendance Trend'}
              subtitle={isArabic ? 'الحضور والغياب خلال الفترة المحددة.' : 'Present and absent attendance over the selected period.'}
            >
              <ResponsiveContainer>
                <LineChart data={adminTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" name={isArabic ? 'حضور' : 'Present'} />
                  <Line type="monotone" dataKey="absent" name={isArabic ? 'غياب' : 'Absent'} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="col-xl-4">
            <ChartCard
              title={isArabic ? 'الساعات اليومية' : 'Daily Hours'}
              subtitle={isArabic ? 'إجمالي ساعات الحضور حسب اليوم.' : 'Total attendance hours by day.'}
            >
              <ResponsiveContainer>
                <BarChart data={adminTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_hours" name={isArabic ? 'الساعات' : 'Hours'} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      ) : null}

      {!loading && isAdmin && activeTab === 'evaluations' ? (
        <div className="row g-3">
          <div className="col-xl-5">
            <ChartCard
              title={isArabic ? 'توزيع التقييمات' : 'Evaluation Distribution'}
              subtitle={isArabic ? 'توزيع حالات أو درجات التقييم.' : 'Distribution of evaluation statuses or score ranges.'}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={adminEvaluationRows} dataKey="value" nameKey="name" label />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="col-xl-7">
            <div className="card ims-table-card h-100">
              <div className="card-body">
                <h5 className="ims-section-title mb-3">
                  {isArabic ? 'تفاصيل التوزيع' : 'Distribution Details'}
                </h5>
                <AppTable
                  columns={[
                    { key: 'name', label: isArabic ? 'البند' : 'Item' },
                    { key: 'value', label: isArabic ? 'العدد' : 'Count' },
                  ]}
                  rows={adminEvaluationRows}
                  rowKey="id"
                  emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No data found.'}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && isAdmin && activeTab === 'providers' ? (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={isArabic ? 'أداء جهات التدريب' : 'Training Providers Performance'}
              subtitle={isArabic ? 'عرض أداء جهات التدريب من حيث الحضور والتقييمات.' : 'Provider performance based on attendance and evaluations.'}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={isArabic ? 'ابحث باسم جهة التدريب...' : 'Search by provider...'}
            />

            <AppTable
              columns={providerColumns}
              rows={filteredProviderPerformance}
              rowKey="id"
              emptyMessage={isArabic ? 'لا توجد بيانات جهات تدريب.' : 'No provider performance data found.'}
            />
          </div>
        </div>
      ) : null}

      {!loading && isAdmin && activeTab === 'advisorWorkload' ? (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={isArabic ? 'عبء المشرفين الأكاديميين' : 'Advisor Workload'}
              subtitle={isArabic ? 'عدد الطلاب والتدريبات النشطة لكل مشرف.' : 'Assigned students and active internships per advisor.'}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={isArabic ? 'ابحث باسم المشرف...' : 'Search by advisor...'}
            />

            <AppTable
              columns={advisorWorkloadColumns}
              rows={filteredAdvisorWorkload}
              rowKey="id"
              emptyMessage={isArabic ? 'لا توجد بيانات للمشرفين.' : 'No advisor workload data found.'}
            />
          </div>
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'overview' ? (
        <AdvisorOverview
          overview={advisorOverview || {}}
          assignedStudentsCount={advisorStudents.length}
          isArabic={isArabic}
        />
      ) : null}

      {!loading && isAdvisor && activeTab === 'attendanceTrend' ? (
        <div className="row g-3">
          <div className="col-xl-8">
            <ChartCard
              title={isArabic ? 'اتجاه حضور طلابي' : 'My Students Attendance Trend'}
              subtitle={isArabic ? 'حضور وغياب الطلاب المرتبطين بالمشرف.' : 'Attendance trend for students assigned to the advisor.'}
            >
              <ResponsiveContainer>
                <LineChart data={advisorTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" name={isArabic ? 'حضور' : 'Present'} />
                  <Line type="monotone" dataKey="absent" name={isArabic ? 'غياب' : 'Absent'} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="col-xl-4">
            <ChartCard
              title={isArabic ? 'إجمالي الساعات' : 'Total Hours'}
              subtitle={isArabic ? 'ساعات حضور الطلاب حسب الفترة.' : 'Student attendance hours by period.'}
            >
              <ResponsiveContainer>
                <BarChart data={advisorTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_hours" name={isArabic ? 'الساعات' : 'Hours'} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'performance' ? (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={isArabic ? 'مقارنة أداء الطلاب' : 'Students Performance Comparison'}
              subtitle={isArabic ? 'مقارنة الحضور والتقييمات لطلاب المشرف.' : 'Compare attendance and evaluation results for assigned students.'}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={isArabic ? 'ابحث باسم الطالب أو جهة التدريب...' : 'Search by student or provider...'}
            />

            <AppTable
              columns={studentsPerformanceColumns}
              rows={filteredStudentsPerformance}
              rowKey="id"
              emptyMessage={isArabic ? 'لا توجد بيانات أداء.' : 'No student performance data found.'}
            />
          </div>
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'evaluations' ? (
        <div className="row g-3">
          <div className="col-xl-5">
            <ChartCard
              title={isArabic ? 'حالة التقييمات' : 'Evaluation Status'}
              subtitle={isArabic ? 'من تم تقييمه ومن لا يزال معلقًا.' : 'Submitted versus pending evaluation status.'}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={advisorEvaluationRows} dataKey="value" nameKey="name" label />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="col-xl-7">
            <div className="card ims-table-card h-100">
              <div className="card-body">
                <h5 className="ims-section-title mb-3">
                  {isArabic ? 'تفاصيل حالة التقييمات' : 'Evaluation Status Details'}
                </h5>
                <AppTable
                  columns={[
                    { key: 'name', label: isArabic ? 'الحالة' : 'Status' },
                    { key: 'value', label: isArabic ? 'العدد' : 'Count' },
                  ]}
                  rows={advisorEvaluationRows}
                  rowKey="id"
                  emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No data found.'}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'risk' ? (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={isArabic ? 'الطلاب ذوو المخاطر' : 'Attendance Risk Students'}
              subtitle={isArabic ? 'طلاب يحتاجون متابعة بسبب الغياب أو انخفاض ساعات الحضور.' : 'Students requiring follow-up due to absence or low attendance hours.'}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={isArabic ? 'ابحث باسم الطالب أو مستوى الخطورة...' : 'Search by student or risk level...'}
            />

            <AppTable
              columns={riskStudentsColumns}
              rows={filteredRiskStudents}
              rowKey="id"
              emptyMessage={isArabic ? 'لا توجد حالات خطورة.' : 'No risk students found.'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AttendanceReportsModulePage;