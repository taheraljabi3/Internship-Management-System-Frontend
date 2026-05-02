import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
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

const CHART_COLORS = ['#14c8c3', '#3b82f6', '#f4a62a', '#5b65f1', '#ef4457', '#18bd87'];

const studentTabs = [{ key: 'summary', labelAr: 'ملخص حضوري', labelEn: 'My Attendance Summary', icon: 'calendar' }];

const adminTabs = [
  { key: 'overview', labelAr: 'التقارير العامة', labelEn: 'General Reports', icon: 'dashboard' },
  { key: 'attendanceTrend', labelAr: 'اتجاه الحضور', labelEn: 'Attendance Trend', icon: 'chart' },
  { key: 'evaluations', labelAr: 'تحليلات التقييم', labelEn: 'Evaluation Analytics', icon: 'star' },
  { key: 'providers', labelAr: 'أداء جهات التدريب', labelEn: 'Provider Performance', icon: 'building' },
  { key: 'advisorWorkload', labelAr: 'عبء المشرفين', labelEn: 'Advisor Workload', icon: 'users' },
];

const advisorTabs = [
  { key: 'overview', labelAr: 'تقارير طلابي', labelEn: 'My Students Reports', icon: 'dashboard' },
  { key: 'attendanceTrend', labelAr: 'اتجاه الحضور', labelEn: 'Attendance Trend', icon: 'chart' },
  { key: 'performance', labelAr: 'أداء الطلاب', labelEn: 'Students Performance', icon: 'performance' },
  { key: 'evaluations', labelAr: 'حالة التقييمات', labelEn: 'Evaluation Status', icon: 'star' },
  { key: 'risk', labelAr: 'طلاب بحاجة متابعة', labelEn: 'Risk Students', icon: 'warning' },
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

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function formatPercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0%';
  return `${Math.round(number * 100) / 100}%`;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getPercentage(part, total) {
  if (!Number(total)) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(part || 0) / Number(total || 0)) * 100)));
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
  if (Array.isArray(value)) return normalizeDistributionRows(value);
  if (!value || typeof value !== 'object') return [];

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
    internship_id: row.internship_id || row.internshipId || null,
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
    students_missing_attendance: getNumber(overview, [
      'students_missing_attendance',
      'students_missing_attendance_today',
      'missing_attendance',
      'missingAttendance',
      'missingAttendanceToday',
    ]),
    pending_weekly_reports: getNumber(overview, ['pending_weekly_reports', 'pendingWeeklyReports']),
    pending_academic_evaluations: getNumber(overview, ['pending_academic_evaluations', 'pendingAcademicEvaluations']),
    company_evaluations_received: getNumber(overview, ['company_evaluations_received', 'companyEvaluationsReceived']),
    average_student_performance: getNumber(overview, ['average_student_performance', 'averageStudentPerformance']),
  };
}

function downloadCsv(filename, columns, rows) {
  const getCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = columns.map((column) => getCell(column.label)).join(',');
  const body = rows.map((row) =>
    columns
      .map((column) => {
        const value = column.exportValue ? column.exportValue(row) : column.value ? column.value(row) : row[column.key];
        return getCell(value);
      })
      .join(',')
  );

  const blob = new Blob([`\ufeff${[header, ...body].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
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
    dashboard: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
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
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
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
    building: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
        <path d="M16 9h2a2 2 0 0 1 2 2v10" />
        <path d="M8 7h4" />
        <path d="M8 11h4" />
        <path d="M8 15h4" />
      </>
    ),
    star: (
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
    ),
    warning: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </>
    ),
    performance: (
      <>
        <path d="M4 20h16" />
        <path d="M7 16v-5" />
        <path d="M12 16V7" />
        <path d="M17 16v-9" />
      </>
    ),
    export: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
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

function ReportHero({ title, description, roleLabel, isArabic, children }) {
  return (
    <section className="ims-reports-hero">
      <div className="ims-reports-hero-content">
        <div className="ims-reports-hero-icon">
          <SvgIcon name="chart" size={42} />
        </div>
        <div>
          <div className="ims-reports-eyebrow">{roleLabel}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="ims-reports-hero-actions">{children}</div>
    </section>
  );
}

function ModernTabs({ tabs, activeKey, onChange, isArabic }) {
  return (
    <div className="ims-reports-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={activeKey === tab.key ? 'active' : ''}
          onClick={() => onChange(tab.key)}
        >
          <SvgIcon name={tab.icon} size={18} />
          {isArabic ? tab.labelAr : tab.labelEn}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ item }) {
  return (
    <div className={`ims-reports-kpi-card ims-reports-tone-${item.tone || 'teal'}`}>
      <div className="ims-reports-kpi-icon">
        <SvgIcon name={item.icon || 'chart'} size={25} />
      </div>
      <div className="ims-reports-kpi-body">
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        {item.hint ? <em>{item.hint}</em> : null}
      </div>
      <div className="ims-reports-kpi-line">
        <i style={{ width: `${Math.max(0, Math.min(100, Number(item.progress || 0)))}%` }} />
      </div>
    </div>
  );
}

function KpiGrid({ cards }) {
  return (
    <section className="ims-reports-kpi-grid">
      {cards.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </section>
  );
}

function ChartPanel({ title, subtitle, children, action }) {
  return (
    <section className="ims-reports-chart-card">
      <div className="ims-reports-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="ims-reports-chart-body">{children}</div>
    </section>
  );
}

function EmptyPanel({ message }) {
  return (
    <div className="ims-reports-empty">
      <SvgIcon name="file" size={32} />
      <span>{message}</span>
    </div>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="ims-reports-progress">
      <i style={{ width: `${safeValue}%` }} />
      <span>{formatPercent(safeValue)}</span>
    </div>
  );
}

function StatusPill({ value }) {
  const raw = String(value || 'Normal');
  const normalized = raw.toLowerCase();
  let tone = 'info';
  if (['normal', 'active', 'approved', 'completed', 'low'].includes(normalized)) tone = 'success';
  if (['medium', 'pending', 'warning', 'needs review'].includes(normalized)) tone = 'warning';
  if (['high', 'critical', 'rejected', 'danger'].includes(normalized)) tone = 'danger';
  return <span className={`ims-reports-status ims-reports-status-${tone}`}>{raw}</span>;
}

function DataTable({ title, subtitle, rows, columns, rowKey = 'id', emptyMessage, isArabic, fileName }) {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredRows = useMemo(() => {
    return normalizeArray(rows).filter((row) =>
      columns.every((column) => {
        const filterValue = String(filters[column.key] || '').trim().toLowerCase();
        if (!filterValue) return true;
        const rawValue = column.value ? column.value(row) : row[column.key];
        return String(rawValue ?? '').toLowerCase().includes(filterValue);
      })
    );
  }, [rows, columns, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters({});
  };

  const exportRows = () => downloadCsv(fileName || 'reports.csv', columns, filteredRows);

  return (
    <section className="ims-reports-table-card">
      <div className="ims-reports-table-toolbar">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="ims-reports-table-actions">
          <button type="button" className="ims-reports-secondary-btn" onClick={resetFilters}>
            <SvgIcon name="refresh" size={17} />
            {isArabic ? 'إعادة ضبط' : 'Reset'}
          </button>
          <button type="button" className="ims-reports-primary-btn" onClick={exportRows} disabled={!filteredRows.length}>
            <SvgIcon name="export" size={17} />
            {isArabic ? 'تصدير' : 'Export'}
          </button>
        </div>
      </div>

      <div className="ims-reports-table-wrap">
        <table className="ims-reports-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <div className="ims-reports-filter-field">
                    <SvgIcon name="search" size={15} />
                    <input
                      value={filters[column.key] || ''}
                      onChange={(event) => updateFilter(column.key, event.target.value)}
                      placeholder={column.label}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, rowIndex) => (
                <tr key={row[rowKey] ?? `${rowKey}-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key] ?? '-'}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyPanel message={emptyMessage} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-reports-table-footer">
        <span>
          {isArabic
            ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length}`
            : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length}`}
        </span>
        <div className="ims-reports-pagination">
          <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            ‹
          </button>
          <strong>{safePage}</strong>
          <button type="button" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

function LineTrendChart({ rows, isArabic }) {
  if (!rows.length) return <EmptyPanel message={isArabic ? 'لا توجد بيانات اتجاه.' : 'No trend data found.'} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
        <XAxis dataKey="period" tick={{ fill: '#6f819b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6f819b', fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="present" name={isArabic ? 'حضور' : 'Present'} stroke="#14c8c3" strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="absent" name={isArabic ? 'غياب' : 'Absent'} stroke="#ef4457" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HoursBarChart({ rows, isArabic }) {
  if (!rows.length) return <EmptyPanel message={isArabic ? 'لا توجد بيانات ساعات.' : 'No hours data found.'} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
        <XAxis dataKey="period" tick={{ fill: '#6f819b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6f819b', fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="total_hours" name={isArabic ? 'الساعات' : 'Hours'} fill="#3b82f6" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ rows, isArabic }) {
  if (!rows.length) return <EmptyPanel message={isArabic ? 'لا توجد بيانات توزيع.' : 'No distribution data found.'} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={4} label>
          {rows.map((entry, index) => (
            <Cell key={entry.id || entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SingleAreaChart({ rows, dataKey, name, color, emptyMessage }) {
  if (!rows.length) return <EmptyPanel message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
        <XAxis dataKey="period" tick={{ fill: '#6f819b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#6f819b', fontSize: 11 }} />
        <Tooltip />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={`url(#area-${dataKey})`} strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AdminOverview({ overview, isArabic, locale }) {
  const totalStudents = getNumber(overview, ['total_students', 'totalStudents']);
  const activeInternships = getNumber(overview, ['active_internships', 'activeInternships', 'active_internships_count', 'activeInternshipsCount']);
  const pendingTraining = getNumber(overview, ['pending_training_requests', 'pendingTrainingRequests']);
  const completedPlans = getNumber(overview, ['completed_training_plans', 'completedTrainingPlans']);
  const submittedReports = getNumber(overview, ['submitted_weekly_reports', 'submittedWeeklyReports']);
  const attendanceRate = getNumber(overview, ['attendance_rate', 'attendanceRate']);
  const companyEvaluations = getNumber(overview, ['company_evaluations_submitted', 'companyEvaluationsSubmitted']);
  const academicEvaluations = getNumber(overview, ['academic_evaluations_submitted', 'academicEvaluationsSubmitted']);

  return (
    <>
      <KpiGrid
        cards={[
          { label: isArabic ? 'إجمالي الطلاب' : 'Total Students', value: formatNumber(totalStudents, locale), icon: 'users', tone: 'purple', progress: 100 },
          { label: isArabic ? 'التدريبات النشطة' : 'Active Internships', value: formatNumber(activeInternships, locale), icon: 'building', tone: 'teal', progress: getPercentage(activeInternships, totalStudents) },
          { label: isArabic ? 'طلبات معلقة' : 'Pending Requests', value: formatNumber(pendingTraining, locale), icon: 'clock', tone: 'orange', progress: getPercentage(pendingTraining, totalStudents || pendingTraining) },
          { label: isArabic ? 'نسبة الحضور' : 'Attendance Rate', value: formatPercent(attendanceRate), icon: 'calendar', tone: 'green', progress: attendanceRate },
          { label: isArabic ? 'خطط مكتملة' : 'Completed Plans', value: formatNumber(completedPlans, locale), icon: 'file', tone: 'blue', progress: getPercentage(completedPlans, activeInternships || completedPlans) },
          { label: isArabic ? 'تقارير مرسلة' : 'Submitted Reports', value: formatNumber(submittedReports, locale), icon: 'chart', tone: 'teal', progress: getPercentage(submittedReports, totalStudents || submittedReports) },
          { label: isArabic ? 'تقييمات الشركة' : 'Company Evaluations', value: formatNumber(companyEvaluations, locale), icon: 'star', tone: 'purple', progress: getPercentage(companyEvaluations, totalStudents || companyEvaluations) },
          { label: isArabic ? 'تقييمات المشرف' : 'Academic Evaluations', value: formatNumber(academicEvaluations, locale), icon: 'performance', tone: 'green', progress: getPercentage(academicEvaluations, totalStudents || academicEvaluations) },
        ]}
      />

      <section className="ims-reports-insight-card">
        <div className="ims-reports-insight-icon">
          <SvgIcon name="dashboard" size={30} />
        </div>
        <div>
          <h2>{isArabic ? 'ملخص عام للنظام' : 'System Summary'}</h2>
          <p>
            {isArabic
              ? 'هذه اللوحة تجمع مؤشرات التدريب، الحضور، الخطط، التقارير، والتقييمات على مستوى النظام بالكامل، بدون استخدام أرقام وهمية.'
              : 'This view consolidates internship, attendance, plans, reports, and evaluation indicators across the whole system without mock numbers.'}
          </p>
        </div>
      </section>
    </>
  );
}

function AdvisorOverview({ overview, assignedStudentsCount, isArabic, locale }) {
  const assignedStudents = getNumber(overview, ['assigned_students', 'assignedStudents', 'assigned_students_count', 'assignedStudentsCount'], assignedStudentsCount);
  const activeInternships = getNumber(overview, ['active_internships', 'activeInternships', 'active_internships_count', 'activeInternshipsCount']);
  const missingAttendance = getNumber(overview, ['students_missing_attendance', 'students_missing_attendance_today', 'missing_attendance', 'missingAttendance', 'missingAttendanceToday']);
  const pendingReports = getNumber(overview, ['pending_weekly_reports', 'pendingWeeklyReports']);
  const pendingEvaluations = getNumber(overview, ['pending_academic_evaluations', 'pendingAcademicEvaluations']);
  const companyEvaluations = getNumber(overview, ['company_evaluations_received', 'companyEvaluationsReceived']);
  const averagePerformance = getNumber(overview, ['average_student_performance', 'averageStudentPerformance']);

  return (
    <KpiGrid
      cards={[
        { label: isArabic ? 'طلابي المرتبطون' : 'My Assigned Students', value: formatNumber(assignedStudents, locale), icon: 'users', tone: 'purple', progress: 100 },
        { label: isArabic ? 'تدريبات نشطة' : 'Active Internships', value: formatNumber(activeInternships, locale), icon: 'building', tone: 'teal', progress: getPercentage(activeInternships, assignedStudents) },
        { label: isArabic ? 'بلا حضور حديث' : 'Missing Attendance', value: formatNumber(missingAttendance, locale), icon: 'warning', tone: 'orange', progress: getPercentage(missingAttendance, assignedStudents || missingAttendance) },
        { label: isArabic ? 'تقارير معلقة' : 'Pending Weekly Reports', value: formatNumber(pendingReports, locale), icon: 'file', tone: 'blue', progress: getPercentage(pendingReports, assignedStudents || pendingReports) },
        { label: isArabic ? 'تقييمات معلقة' : 'Pending Academic Evaluations', value: formatNumber(pendingEvaluations, locale), icon: 'star', tone: 'purple', progress: getPercentage(pendingEvaluations, assignedStudents || pendingEvaluations) },
        { label: isArabic ? 'تقييمات شركة مستلمة' : 'Company Evaluations Received', value: formatNumber(companyEvaluations, locale), icon: 'building', tone: 'green', progress: getPercentage(companyEvaluations, assignedStudents || companyEvaluations) },
        { label: isArabic ? 'متوسط الأداء' : 'Average Performance', value: formatPercent(averagePerformance), icon: 'performance', tone: 'teal', progress: averagePerformance },
      ]}
    />
  );
}

function StudentAttendanceSummaryView({ summary, history, isArabic, locale }) {
  const historyRows = normalizeArray(history).map((entry, index) => ({
    id: entry.id ?? `history-${index}`,
    entry_date: formatDate(entry.entry_date || entry.entryDate),
    check_in_time: formatTime(entry.check_in_time || entry.checkInTime),
    check_out_time: formatTime(entry.check_out_time || entry.checkOutTime),
    daily_hours: entry.daily_hours ?? entry.dailyHours ?? 0,
    status: entry.status || '-',
    notes: entry.notes || '-',
  }));

  const totalHours = getNumber(summary, ['total_hours', 'totalHours']);
  const presentDays = getNumber(summary, ['present_days', 'presentDays']);
  const absentDays = getNumber(summary, ['absent_days', 'absentDays']);
  const totalDays = presentDays + absentDays;
  const attendanceRate = getPercentage(presentDays, totalDays);

  const historyColumns = [
    { key: 'entry_date', label: isArabic ? 'التاريخ' : 'Date' },
    { key: 'check_in_time', label: isArabic ? 'وقت الحضور' : 'Check In' },
    { key: 'check_out_time', label: isArabic ? 'وقت الانصراف' : 'Check Out' },
    { key: 'daily_hours', label: isArabic ? 'الساعات اليومية' : 'Daily Hours' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (_, row) => <StatusPill value={row.status} /> },
    { key: 'notes', label: isArabic ? 'ملاحظات' : 'Notes' },
  ];

  return (
    <>
      <KpiGrid
        cards={[
          { label: isArabic ? 'إجمالي الساعات' : 'Total Hours', value: formatNumber(totalHours, locale), icon: 'clock', tone: 'teal', progress: Math.min(100, totalHours) },
          { label: isArabic ? 'أيام الحضور' : 'Present Days', value: formatNumber(presentDays, locale), icon: 'calendar', tone: 'green', progress: attendanceRate },
          { label: isArabic ? 'أيام الغياب' : 'Absent Days', value: formatNumber(absentDays, locale), icon: 'warning', tone: 'orange', progress: getPercentage(absentDays, totalDays) },
          { label: isArabic ? 'نسبة الحضور' : 'Attendance Rate', value: `${attendanceRate}%`, icon: 'chart', tone: 'purple', progress: attendanceRate },
        ]}
      />

      <div className="ims-reports-grid-two">
        <ChartPanel title={isArabic ? 'ساعات الحضور اليومية' : 'Daily Attendance Hours'} subtitle={isArabic ? 'ساعات الحضور من سجل الطالب.' : 'Daily hours from the attendance log.'}>
          <SingleAreaChart
            rows={historyRows.map((row) => ({ period: row.entry_date, daily_hours: Number(row.daily_hours || 0) }))}
            dataKey="daily_hours"
            name={isArabic ? 'الساعات' : 'Hours'}
            color="#14c8c3"
            emptyMessage={isArabic ? 'لا توجد بيانات حضور.' : 'No attendance data found.'}
          />
        </ChartPanel>

        <ChartPanel title={isArabic ? 'ملخص الحضور' : 'Attendance Summary'} subtitle={isArabic ? 'مقارنة أيام الحضور والغياب.' : 'Present versus absent days.'}>
          <DonutChart
            rows={[
              { id: 'present', name: isArabic ? 'حضور' : 'Present', value: presentDays },
              { id: 'absent', name: isArabic ? 'غياب' : 'Absent', value: absentDays },
            ].filter((item) => item.value > 0)}
            isArabic={isArabic}
          />
        </ChartPanel>
      </div>

      <DataTable
        title={isArabic ? 'سجل الحضور' : 'Attendance History'}
        subtitle={isArabic ? 'يمكن البحث داخل كل عمود مباشرة.' : 'Search directly inside each column.'}
        columns={historyColumns}
        rows={historyRows}
        rowKey="id"
        isArabic={isArabic}
        fileName="student-attendance-history.csv"
        emptyMessage={isArabic ? 'لا توجد سجلات حضور.' : 'No attendance records found.'}
      />
    </>
  );
}

function AttendanceReportsModulePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const roleKey = getRoleKey(user?.role);
  const isStudent = roleKey === 'Student';
  const isAdmin = roleKey === 'Administrator';
  const isAdvisor = roleKey === 'AcademicAdvisor';

  const tabs = isStudent ? studentTabs : isAdmin ? adminTabs : advisorTabs;

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'overview');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [advisorNotice, setAdvisorNotice] = useState('');

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
  }, [roleKey]);

  const resolveAdvisorUserId = async () => {
    const directUserId = Number(getUserId(user) || 0);
    const userEmail = getUserEmail(user);
    const advisors = await getAdvisorsRequest().catch(() => []);
    const normalizedAdvisors = normalizeArray(advisors).map(normalizeAdvisor);

    const matchedAdvisor =
      normalizedAdvisors.find((item) => Number(item.id) === directUserId) ||
      normalizedAdvisors.find((item) => String(item.email || '').toLowerCase() === userEmail);

    const advisorUserId = Number(matchedAdvisor?.id || directUserId || 0);

    if (!advisorUserId) {
      throw new Error(
        isArabic ? 'تعذر تحديد معرف المشرف الأكاديمي الحالي.' : 'Could not resolve the current academic advisor user id.'
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
    const [overview, attendanceTrend, evaluationDistribution, advisorWorkload, providerPerformance] = await Promise.all([
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
      normalizeArray(advisorWorkload).map((row, index) => ({
        id: row.id ?? row.advisor_user_id ?? row.advisorUserId ?? `advisor-${index}`,
        ...row,
      }))
    );
    setAdminProviderPerformance(
      normalizeArray(providerPerformance).map((row, index) => ({
        id: row.id ?? row.provider_id ?? row.providerId ?? `provider-${index}`,
        ...row,
      }))
    );
  };

  const loadAdvisorReports = async () => {
    const advisorUserId = await resolveAdvisorUserId();
    const assignedStudentsPayload = await getAdvisorStudentsRequest(advisorUserId).catch(() => []);
    const normalizedAssignedStudents = normalizeArray(assignedStudentsPayload).map(normalizeAdvisorStudent);
    setAdvisorStudents(normalizedAssignedStudents);

    const [overview, attendanceTrend, studentsPerformance, evaluationStatus, riskStudents] = await Promise.all([
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
    setAdvisorStudentsPerformance(performanceRows.length > 0 ? performanceRows : fallbackPerformanceRows);
    setAdvisorEvaluationStatus(normalizeArray(evaluationStatus));
    setAdvisorRiskStudents(riskRows);

    const detailedReportsAreEmpty =
      normalizeArray(attendanceTrend).length === 0 &&
      normalizeArray(studentsPerformance).length === 0 &&
      normalizeArray(evaluationStatus).length === 0 &&
      normalizeArray(riskStudents).length === 0;

    setAdvisorNotice(
      detailedReportsAreEmpty
        ? isArabic
          ? 'لا توجد بيانات تفصيلية كافية حتى الآن، لذلك ستظهر بعض الأقسام فارغة.'
          : 'There is not enough detailed data yet, so some sections may appear empty.'
        : ''
    );
  };

  const loadReports = async () => {
    setLoading(true);
    setErrorMessage('');
    setAdvisorNotice('');

    try {
      if (isStudent) await loadStudentReports();
      else if (isAdmin) await loadAdminReports();
      else await loadAdvisorReports();
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

  const adminTrendRows = useMemo(() => normalizeTrendRows(adminAttendanceTrend), [adminAttendanceTrend]);
  const advisorTrendRows = useMemo(() => normalizeTrendRows(advisorAttendanceTrend), [advisorAttendanceTrend]);
  const adminEvaluationRows = useMemo(() => normalizeDistributionRows(adminEvaluationDistribution), [adminEvaluationDistribution]);
  const advisorEvaluationRows = useMemo(
    () => normalizeEvaluationStatusRows(advisorEvaluationStatus, isArabic),
    [advisorEvaluationStatus, isArabic]
  );

  const providerColumns = [
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Training Provider',
      value: (row) => getString(row, ['provider_name', 'providerName', 'company_name', 'companyName']),
      render: (_, row) => <strong>{getString(row, ['provider_name', 'providerName', 'company_name', 'companyName'])}</strong>,
    },
    {
      key: 'active_internships',
      label: isArabic ? 'التدريبات النشطة' : 'Active Internships',
      value: (row) => getNumber(row, ['active_internships', 'activeInternships']),
      render: (_, row) => formatNumber(getNumber(row, ['active_internships', 'activeInternships']), locale),
    },
    {
      key: 'attendance_rate',
      label: isArabic ? 'نسبة الحضور' : 'Attendance Rate',
      value: (row) => getNumber(row, ['attendance_rate', 'attendanceRate']),
      render: (_, row) => <ProgressBar value={getNumber(row, ['attendance_rate', 'attendanceRate'])} />,
    },
    {
      key: 'avg_company_score',
      label: isArabic ? 'متوسط تقييم الشركة' : 'Avg Company Score',
      value: (row) => getNumber(row, ['avg_company_score', 'avgCompanyScore']),
      render: (_, row) => <ProgressBar value={getNumber(row, ['avg_company_score', 'avgCompanyScore'])} />,
    },
  ];

  const advisorWorkloadColumns = [
    {
      key: 'advisor_name',
      label: isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor',
      value: (row) => getString(row, ['advisor_name', 'advisorName']),
      render: (_, row) => <strong>{getString(row, ['advisor_name', 'advisorName'])}</strong>,
    },
    {
      key: 'advisor_email',
      label: isArabic ? 'البريد' : 'Email',
      value: (row) => getString(row, ['advisor_email', 'advisorEmail', 'email']),
      render: (_, row) => <span dir="ltr">{getString(row, ['advisor_email', 'advisorEmail', 'email'])}</span>,
    },
    {
      key: 'assigned_students',
      label: isArabic ? 'عدد الطلاب' : 'Assigned Students',
      value: (row) => getNumber(row, ['assigned_students', 'assignedStudents']),
      render: (_, row) => formatNumber(getNumber(row, ['assigned_students', 'assignedStudents']), locale),
    },
    {
      key: 'active_internships',
      label: isArabic ? 'تدريبات نشطة' : 'Active Internships',
      value: (row) => getNumber(row, ['active_internships', 'activeInternships']),
      render: (_, row) => formatNumber(getNumber(row, ['active_internships', 'activeInternships']), locale),
    },
  ];

  const studentsPerformanceColumns = [
    {
      key: 'student_name',
      label: isArabic ? 'الطالب' : 'Student',
      value: (row) => getString(row, ['student_name', 'studentName']),
      render: (_, row) => <strong>{getString(row, ['student_name', 'studentName'])}</strong>,
    },
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Provider',
      value: (row) => getString(row, ['provider_name', 'providerName']),
    },
    {
      key: 'total_hours',
      label: isArabic ? 'إجمالي الساعات' : 'Total Hours',
      value: (row) => getNumber(row, ['total_hours', 'totalHours']),
      render: (_, row) => formatNumber(getNumber(row, ['total_hours', 'totalHours']), locale),
    },
    {
      key: 'present_days',
      label: isArabic ? 'أيام الحضور' : 'Present Days',
      value: (row) => getNumber(row, ['present_days', 'presentDays']),
      render: (_, row) => formatNumber(getNumber(row, ['present_days', 'presentDays']), locale),
    },
    {
      key: 'absent_days',
      label: isArabic ? 'أيام الغياب' : 'Absent Days',
      value: (row) => getNumber(row, ['absent_days', 'absentDays']),
      render: (_, row) => formatNumber(getNumber(row, ['absent_days', 'absentDays']), locale),
    },
    {
      key: 'company_total_percentage',
      label: isArabic ? 'تقييم الشركة' : 'Company Score',
      value: (row) => getNumber(row, ['company_total_percentage', 'companyTotalPercentage', 'company_score', 'companyScore']),
      render: (_, row) => <ProgressBar value={getNumber(row, ['company_total_percentage', 'companyTotalPercentage', 'company_score', 'companyScore'])} />,
    },
    {
      key: 'academic_total_percentage',
      label: isArabic ? 'تقييم المشرف' : 'Academic Score',
      value: (row) => getNumber(row, ['academic_total_percentage', 'academicTotalPercentage', 'academic_score', 'academicScore']),
      render: (_, row) => <ProgressBar value={getNumber(row, ['academic_total_percentage', 'academicTotalPercentage', 'academic_score', 'academicScore'])} />,
    },
    {
      key: 'overall_score',
      label: isArabic ? 'المتوسط النهائي' : 'Final Average',
      value: (row) => getNumber(row, ['overall_score', 'overallScore', 'final_average', 'finalAverage']),
      render: (_, row) => <ProgressBar value={getNumber(row, ['overall_score', 'overallScore', 'final_average', 'finalAverage'])} />,
    },
  ];

  const riskStudentsColumns = [
    {
      key: 'student_name',
      label: isArabic ? 'الطالب' : 'Student',
      value: (row) => getString(row, ['student_name', 'studentName']),
      render: (_, row) => <strong>{getString(row, ['student_name', 'studentName'])}</strong>,
    },
    {
      key: 'provider_name',
      label: isArabic ? 'جهة التدريب' : 'Provider',
      value: (row) => getString(row, ['provider_name', 'providerName']),
    },
    {
      key: 'absent_days',
      label: isArabic ? 'أيام الغياب' : 'Absent Days',
      value: (row) => getNumber(row, ['absent_days', 'absentDays']),
      render: (_, row) => formatNumber(getNumber(row, ['absent_days', 'absentDays']), locale),
    },
    {
      key: 'total_hours',
      label: isArabic ? 'إجمالي الساعات' : 'Total Hours',
      value: (row) => getNumber(row, ['total_hours', 'totalHours']),
      render: (_, row) => formatNumber(getNumber(row, ['total_hours', 'totalHours']), locale),
    },
    {
      key: 'risk_level',
      label: isArabic ? 'مستوى الخطورة' : 'Risk Level',
      value: (row) => getString(row, ['risk_level', 'riskLevel'], 'Normal'),
      render: (_, row) => <StatusPill value={getString(row, ['risk_level', 'riskLevel'], 'Normal')} />,
    },
    {
      key: 'risk_reason',
      label: isArabic ? 'سبب الخطورة' : 'Risk Reason',
      value: (row) => getString(row, ['risk_reason', 'riskReason'], '-'),
    },
  ];

  const roleLabel = isAdmin
    ? isArabic
      ? 'بوابة المسؤول'
      : 'Administrator Portal'
    : isAdvisor
    ? isArabic
      ? 'بوابة المشرف الأكاديمي'
      : 'Academic Advisor Portal'
    : isArabic
    ? 'بوابة الطالب'
    : 'Student Portal';

  return (
    <div className="ims-reports-page">
      <style>{`
        .ims-reports-page {
          position: relative;
          min-height: 100%;
          color: #10243f;
          padding-bottom: 1.5rem;
        }

        .ims-reports-page::before {
          content: "";
          position: absolute;
          inset: -1.5rem -1.5rem auto -1.5rem;
          height: 320px;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 15%, rgba(20, 200, 195, 0.16), transparent 35%),
            radial-gradient(circle at 82% 12%, rgba(91, 101, 241, 0.12), transparent 34%),
            repeating-radial-gradient(ellipse at 46% 28%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
          opacity: 0.95;
          border-radius: 0 0 42px 42px;
          z-index: 0;
        }

        .ims-reports-page > * { position: relative; z-index: 1; }

        .ims-reports-hero,
        .ims-reports-kpi-card,
        .ims-reports-chart-card,
        .ims-reports-table-card,
        .ims-reports-insight-card {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(230, 238, 246, 0.98);
          box-shadow: 0 14px 36px rgba(16, 36, 63, 0.07);
          backdrop-filter: blur(10px);
        }

        .ims-reports-hero {
          min-height: 150px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.35rem 1.45rem;
          border-radius: 30px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .ims-reports-hero-content {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          min-width: 0;
        }

        .ims-reports-hero-icon {
          width: 92px;
          height: 92px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 28px;
          color: #0796a6;
          background: linear-gradient(135deg, #e2fafa, #eef4ff);
          flex-shrink: 0;
        }

        .ims-reports-eyebrow {
          display: inline-flex;
          min-height: 30px;
          align-items: center;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          color: #0d8a64;
          background: #e7fbf3;
          font-size: 0.78rem;
          font-weight: 900;
          margin-bottom: 0.55rem;
        }

        .ims-reports-hero h1 {
          margin: 0 0 0.35rem;
          color: #10243f;
          font-size: clamp(2rem, 3vw, 2.7rem);
          font-weight: 900;
          letter-spacing: -0.055em;
        }

        .ims-reports-hero p {
          margin: 0;
          color: #637894;
          font-size: 0.98rem;
          font-weight: 700;
          line-height: 1.8;
          max-width: 850px;
        }

        .ims-reports-hero-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .ims-reports-select {
          min-height: 44px;
          min-width: 160px;
          border: 1px solid #dfeaf3;
          border-radius: 16px;
          padding: 0 0.85rem;
          color: #243b5a;
          background: #fff;
          font-weight: 850;
        }

        .ims-reports-primary-btn,
        .ims-reports-secondary-btn {
          min-height: 42px;
          border: none;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.42rem;
          padding: 0 0.95rem;
          font-size: 0.84rem;
          font-weight: 900;
        }

        .ims-reports-primary-btn {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 12px 24px rgba(7,150,166,0.18);
        }

        .ims-reports-primary-btn:disabled,
        .ims-reports-secondary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ims-reports-secondary-btn {
          color: #243b5a;
          background: #fff;
          border: 1px solid #dfeaf3;
        }

        .ims-reports-tabs {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .ims-reports-tabs button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          padding: 0 1rem;
          border: 1px solid #dfeaf3;
          border-radius: 17px;
          color: #637894;
          background: rgba(255,255,255,0.9);
          font-weight: 900;
        }

        .ims-reports-tabs button.active {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          border-color: transparent;
          box-shadow: 0 14px 28px rgba(7,150,166,0.16);
        }

        .ims-reports-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-reports-kpi-card {
          position: relative;
          min-height: 132px;
          overflow: hidden;
          border-radius: 26px;
          padding: 1.1rem 1.15rem 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }

        .ims-reports-kpi-icon {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .ims-reports-tone-teal .ims-reports-kpi-icon { color: #0796a6; background: #e2fafa; }
        .ims-reports-tone-purple .ims-reports-kpi-icon { color: #5b65f1; background: #eef0ff; }
        .ims-reports-tone-orange .ims-reports-kpi-icon { color: #ed9f22; background: #fff4dc; }
        .ims-reports-tone-green .ims-reports-kpi-icon { color: #18bd87; background: #e7fbf3; }
        .ims-reports-tone-blue .ims-reports-kpi-icon { color: #3b82f6; background: #e8f1ff; }

        .ims-reports-kpi-body span {
          display: block;
          margin-bottom: 0.3rem;
          color: #5e718d;
          font-size: 0.86rem;
          font-weight: 850;
        }

        .ims-reports-kpi-body strong {
          display: block;
          color: #10243f;
          font-size: 1.8rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .ims-reports-kpi-body em {
          display: block;
          margin-top: 0.35rem;
          color: #7a8aa5;
          font-size: 0.78rem;
          font-style: normal;
          font-weight: 750;
          line-height: 1.5;
        }

        .ims-reports-kpi-line {
          position: absolute;
          inset-inline: 1.15rem;
          bottom: 0.85rem;
          height: 4px;
          border-radius: 999px;
          background: #edf4f8;
          overflow: hidden;
        }

        .ims-reports-kpi-line i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0796a6, #2ee6d3);
        }

        .ims-reports-grid-two {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-reports-chart-card,
        .ims-reports-table-card,
        .ims-reports-insight-card {
          border-radius: 28px;
          padding: 1.1rem;
          margin-bottom: 1rem;
        }

        .ims-reports-section-head,
        .ims-reports-table-toolbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-reports-section-head h2,
        .ims-reports-table-toolbar h2,
        .ims-reports-insight-card h2 {
          margin: 0 0 0.28rem;
          color: #10243f;
          font-size: 1.04rem;
          font-weight: 900;
        }

        .ims-reports-section-head p,
        .ims-reports-table-toolbar p,
        .ims-reports-insight-card p {
          margin: 0;
          color: #7a8aa5;
          font-size: 0.84rem;
          font-weight: 700;
          line-height: 1.6;
        }

        .ims-reports-chart-body {
          width: 100%;
          height: 320px;
        }

        .ims-reports-table-actions {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        .ims-reports-table-wrap {
          overflow: auto;
        }

        .ims-reports-table {
          width: 100%;
          min-width: 980px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .ims-reports-table thead th {
          padding: 0.7rem 0.6rem;
          border-bottom: 1px solid #edf3f8;
        }

        .ims-reports-filter-field {
          position: relative;
        }

        .ims-reports-filter-field svg {
          position: absolute;
          inset-inline-start: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #8ea0b6;
        }

        .ims-reports-filter-field input {
          width: 100%;
          min-height: 40px;
          border: 1px solid #dfeaf3;
          border-radius: 14px;
          background: #fbfdff;
          color: #243b5a;
          padding-inline: 2.35rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 780;
          outline: none;
        }

        .ims-reports-filter-field input:focus {
          border-color: rgba(20,200,195,0.7);
          box-shadow: 0 0 0 0.18rem rgba(20,200,195,0.10);
          background: #fff;
        }

        .ims-reports-table tbody td {
          padding: 0.9rem 0.75rem;
          border-bottom: 1px solid #edf3f8;
          color: #243b5a;
          font-size: 0.88rem;
          font-weight: 750;
          vertical-align: middle;
        }

        .ims-reports-table tbody tr:hover {
          background: #f9fcff;
        }

        .ims-reports-table-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 0.9rem;
          color: #6f819b;
          font-size: 0.86rem;
          font-weight: 800;
        }

        .ims-reports-pagination {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .ims-reports-pagination button {
          width: 34px;
          height: 34px;
          border: 1px solid #dfeaf3;
          border-radius: 12px;
          color: #243b5a;
          background: #fff;
          font-weight: 900;
        }

        .ims-reports-pagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .ims-reports-pagination strong {
          min-width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
        }

        .ims-reports-progress {
          min-width: 120px;
          height: 30px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .ims-reports-progress::before {
          content: "";
        }

        .ims-reports-progress {
          position: relative;
        }

        .ims-reports-progress i {
          display: block;
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0796a6, #2ee6d3);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }

        .ims-reports-progress {
          background: linear-gradient(to right, #edf4f8 0 100%);
          background-repeat: no-repeat;
          background-size: calc(100% - 54px) 8px;
          background-position: left center;
          border-radius: 999px;
        }

        html[dir='rtl'] .ims-reports-progress {
          background-position: right center;
        }

        .ims-reports-progress span {
          margin-inline-start: auto;
          color: #10243f;
          font-weight: 900;
          font-size: 0.8rem;
        }

        .ims-reports-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          border-radius: 999px;
          padding: 0.35rem 0.72rem;
          font-size: 0.76rem;
          font-weight: 900;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .ims-reports-status-success { color: #0d8a64; background: #e7fbf3; border-color: rgba(24,197,143,0.22); }
        .ims-reports-status-warning { color: #a4660b; background: #fff4dc; border-color: rgba(244,166,42,0.24); }
        .ims-reports-status-danger { color: #c02c3f; background: #ffedf0; border-color: rgba(255,90,107,0.24); }
        .ims-reports-status-info { color: #1f65c8; background: #e8f1ff; border-color: rgba(59,130,246,0.2); }

        .ims-reports-empty {
          min-height: 138px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          color: #7a8aa5;
          font-weight: 850;
          border: 1px dashed #cfe0ee;
          border-radius: 22px;
          background: #fbfdff;
          text-align: center;
        }

        .ims-reports-insight-card {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ims-reports-insight-icon {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          color: #0796a6;
          background: #e2fafa;
          flex-shrink: 0;
        }

        .ims-reports-alert {
          margin-bottom: 1rem;
          border-radius: 18px;
          padding: 0.9rem 1rem;
          font-weight: 850;
          border: 1px solid transparent;
        }

        .ims-reports-alert-danger { color: #b42335; background: #ffedf0; border-color: rgba(255,90,107,0.24); }
        .ims-reports-alert-warning { color: #a4660b; background: #fff4dc; border-color: rgba(244,166,42,0.24); }
        .ims-reports-alert-info { color: #1f65c8; background: #e8f1ff; border-color: rgba(59,130,246,0.2); }

        @media (max-width: 1199.98px) {
          .ims-reports-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ims-reports-grid-two { grid-template-columns: 1fr; }
        }

        @media (max-width: 767.98px) {
          .ims-reports-hero,
          .ims-reports-section-head,
          .ims-reports-table-toolbar,
          .ims-reports-table-footer,
          .ims-reports-insight-card {
            align-items: stretch;
            flex-direction: column;
          }

          .ims-reports-hero-content {
            align-items: flex-start;
            flex-direction: column;
          }

          .ims-reports-hero-actions,
          .ims-reports-table-actions {
            width: 100%;
          }

          .ims-reports-select,
          .ims-reports-primary-btn,
          .ims-reports-secondary-btn {
            width: 100%;
          }

          .ims-reports-kpi-grid { grid-template-columns: 1fr; }
          .ims-reports-tabs button { flex: 1 1 auto; }
        }
      `}</style>

      <ReportHero
        title={isArabic ? 'التقارير والتحليلات' : 'Reports & Analytics'}
        roleLabel={roleLabel}
        isArabic={isArabic}
        description={
          isArabic
            ? 'واجهة تقارير محسّنة تعرض المؤشرات والرسوم والجداول حسب دور المستخدم، مع فلاتر داخل الجداول وتصدير مباشر.'
            : 'A redesigned reporting dashboard with role-based KPIs, charts, column filters, and direct export.'
        }
      >
        {!isStudent ? (
          <select className="ims-reports-select" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>{isArabic ? 'آخر 7 أيام' : 'Last 7 days'}</option>
            <option value={30}>{isArabic ? 'آخر 30 يوم' : 'Last 30 days'}</option>
            <option value={60}>{isArabic ? 'آخر 60 يوم' : 'Last 60 days'}</option>
            <option value={90}>{isArabic ? 'آخر 90 يوم' : 'Last 90 days'}</option>
          </select>
        ) : null}

        <button type="button" className="ims-reports-primary-btn" onClick={loadReports} disabled={loading}>
          <SvgIcon name="refresh" size={17} />
          {loading ? (isArabic ? 'جارٍ التحديث...' : 'Refreshing...') : isArabic ? 'تحديث البيانات' : 'Refresh Data'}
        </button>
      </ReportHero>

      <ModernTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} isArabic={isArabic} />

      {resolvedAdvisorId && isAdvisor ? (
        <div className="ims-reports-alert ims-reports-alert-info">
          {isArabic ? 'معرف المشرف المستخدم في التقارير:' : 'Advisor ID used for reports:'} <strong>{resolvedAdvisorId}</strong>
        </div>
      ) : null}

      {errorMessage ? <div className="ims-reports-alert ims-reports-alert-danger">{errorMessage}</div> : null}
      {advisorNotice ? <div className="ims-reports-alert ims-reports-alert-warning">{advisorNotice}</div> : null}
      {loading ? <EmptyPanel message={isArabic ? 'جارٍ تحميل التقارير...' : 'Loading reports...'} /> : null}

      {!loading && isStudent ? (
        <StudentAttendanceSummaryView summary={studentSummary} history={studentHistory} isArabic={isArabic} locale={locale} />
      ) : null}

      {!loading && isAdmin && activeTab === 'overview' ? <AdminOverview overview={adminOverview || {}} isArabic={isArabic} locale={locale} /> : null}

      {!loading && isAdmin && activeTab === 'attendanceTrend' ? (
        <div className="ims-reports-grid-two">
          <ChartPanel title={isArabic ? 'اتجاه الحضور' : 'Attendance Trend'} subtitle={isArabic ? 'الحضور والغياب خلال الفترة المحددة.' : 'Present and absent attendance over the selected period.'}>
            <LineTrendChart rows={adminTrendRows} isArabic={isArabic} />
          </ChartPanel>
          <ChartPanel title={isArabic ? 'إجمالي الساعات اليومية' : 'Daily Total Hours'} subtitle={isArabic ? 'إجمالي ساعات الحضور حسب اليوم.' : 'Total attendance hours by day.'}>
            <HoursBarChart rows={adminTrendRows} isArabic={isArabic} />
          </ChartPanel>
        </div>
      ) : null}

      {!loading && isAdmin && activeTab === 'evaluations' ? (
        <div className="ims-reports-grid-two">
          <ChartPanel title={isArabic ? 'توزيع التقييمات' : 'Evaluation Distribution'} subtitle={isArabic ? 'توزيع حالات أو درجات التقييم.' : 'Distribution of evaluation statuses or score ranges.'}>
            <DonutChart rows={adminEvaluationRows} isArabic={isArabic} />
          </ChartPanel>
          <DataTable
            title={isArabic ? 'تفاصيل التوزيع' : 'Distribution Details'}
            subtitle={isArabic ? 'فلترة مباشرة حسب البند أو العدد.' : 'Filter directly by item or count.'}
            columns={[
              { key: 'name', label: isArabic ? 'البند' : 'Item' },
              { key: 'value', label: isArabic ? 'العدد' : 'Count' },
            ]}
            rows={adminEvaluationRows}
            rowKey="id"
            isArabic={isArabic}
            fileName="evaluation-distribution.csv"
            emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No data found.'}
          />
        </div>
      ) : null}

      {!loading && isAdmin && activeTab === 'providers' ? (
        <DataTable
          title={isArabic ? 'أداء جهات التدريب' : 'Training Providers Performance'}
          subtitle={isArabic ? 'يعرض الأداء حسب التدريبات النشطة، الحضور، وتقييمات الشركة.' : 'Performance based on active internships, attendance, and company scores.'}
          columns={providerColumns}
          rows={adminProviderPerformance}
          rowKey="id"
          isArabic={isArabic}
          fileName="provider-performance.csv"
          emptyMessage={isArabic ? 'لا توجد بيانات جهات تدريب.' : 'No provider performance data found.'}
        />
      ) : null}

      {!loading && isAdmin && activeTab === 'advisorWorkload' ? (
        <DataTable
          title={isArabic ? 'عبء المشرفين الأكاديميين' : 'Advisor Workload'}
          subtitle={isArabic ? 'عدد الطلاب والتدريبات النشطة لكل مشرف.' : 'Assigned students and active internships per advisor.'}
          columns={advisorWorkloadColumns}
          rows={adminAdvisorWorkload}
          rowKey="id"
          isArabic={isArabic}
          fileName="advisor-workload.csv"
          emptyMessage={isArabic ? 'لا توجد بيانات للمشرفين.' : 'No advisor workload data found.'}
        />
      ) : null}

      {!loading && isAdvisor && activeTab === 'overview' ? (
        <AdvisorOverview overview={advisorOverview || {}} assignedStudentsCount={advisorStudents.length} isArabic={isArabic} locale={locale} />
      ) : null}

      {!loading && isAdvisor && activeTab === 'attendanceTrend' ? (
        <div className="ims-reports-grid-two">
          <ChartPanel title={isArabic ? 'اتجاه حضور طلابي' : 'My Students Attendance Trend'} subtitle={isArabic ? 'حضور وغياب الطلاب المرتبطين بالمشرف.' : 'Attendance trend for students assigned to the advisor.'}>
            <LineTrendChart rows={advisorTrendRows} isArabic={isArabic} />
          </ChartPanel>
          <ChartPanel title={isArabic ? 'إجمالي الساعات' : 'Total Hours'} subtitle={isArabic ? 'ساعات حضور الطلاب حسب الفترة.' : 'Student attendance hours by period.'}>
            <HoursBarChart rows={advisorTrendRows} isArabic={isArabic} />
          </ChartPanel>
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'performance' ? (
        <DataTable
          title={isArabic ? 'مقارنة أداء الطلاب' : 'Students Performance Comparison'}
          subtitle={isArabic ? 'مقارنة الحضور والتقييمات لطلاب المشرف.' : 'Compare attendance and evaluation results for assigned students.'}
          columns={studentsPerformanceColumns}
          rows={advisorStudentsPerformance}
          rowKey="id"
          isArabic={isArabic}
          fileName="students-performance.csv"
          emptyMessage={isArabic ? 'لا توجد بيانات أداء.' : 'No student performance data found.'}
        />
      ) : null}

      {!loading && isAdvisor && activeTab === 'evaluations' ? (
        <div className="ims-reports-grid-two">
          <ChartPanel title={isArabic ? 'حالة التقييمات' : 'Evaluation Status'} subtitle={isArabic ? 'من تم تقييمه ومن لا يزال معلقًا.' : 'Submitted versus pending evaluation status.'}>
            <DonutChart rows={advisorEvaluationRows} isArabic={isArabic} />
          </ChartPanel>
          <DataTable
            title={isArabic ? 'تفاصيل حالة التقييمات' : 'Evaluation Status Details'}
            subtitle={isArabic ? 'فلترة مباشرة حسب الحالة والعدد.' : 'Filter directly by status and count.'}
            columns={[
              { key: 'name', label: isArabic ? 'الحالة' : 'Status' },
              { key: 'value', label: isArabic ? 'العدد' : 'Count' },
            ]}
            rows={advisorEvaluationRows}
            rowKey="id"
            isArabic={isArabic}
            fileName="advisor-evaluation-status.csv"
            emptyMessage={isArabic ? 'لا توجد بيانات.' : 'No data found.'}
          />
        </div>
      ) : null}

      {!loading && isAdvisor && activeTab === 'risk' ? (
        <DataTable
          title={isArabic ? 'الطلاب ذوو المخاطر' : 'Attendance Risk Students'}
          subtitle={isArabic ? 'طلاب يحتاجون متابعة بسبب الغياب أو انخفاض ساعات الحضور.' : 'Students requiring follow-up due to absence or low attendance hours.'}
          columns={riskStudentsColumns}
          rows={advisorRiskStudents}
          rowKey="id"
          isArabic={isArabic}
          fileName="risk-students.csv"
          emptyMessage={isArabic ? 'لا توجد حالات خطورة.' : 'No risk students found.'}
        />
      ) : null}
    </div>
  );
}

export default AttendanceReportsModulePage;