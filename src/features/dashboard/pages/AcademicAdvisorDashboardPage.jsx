import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../app/providers/AuthProvider';
import ROUTES from '../../../app/router/routePaths';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getStudentInternshipContextRequest,
} from '../../../app/api/client';

const FILTERS = {
  ALL: 'All',
  WITH_INTERNSHIP: 'Has Internship',
  WITHOUT_INTERNSHIP: 'No Internship',
  NEEDS_FOLLOW_UP: 'Needs Follow-up',
};

function normalizeAdvisor(advisor) {
  return {
    id: advisor.user_id ?? advisor.id,
    fullName: advisor.full_name || advisor.fullName || '',
    email: advisor.email || '',
  };
}

function normalizeStudent(student, advisor) {
  return {
    id: student.student_user_id ?? student.id,
    fullName: student.full_name || student.fullName || '',
    email: student.email || '',
    studentCode: student.student_code || student.studentCode || '',
    university: student.university || '',
    major: student.major || '',
    gpa: student.gpa ?? '',
    assignmentStartAt: student.assignment_start_at || student.assignmentStartAt || '',
    advisorName: advisor?.fullName || '',
    advisorEmail: advisor?.email || '',
  };
}

function getInternshipStatus(context) {
  return context?.internship_id || context?.internshipId
    ? FILTERS.WITH_INTERNSHIP
    : FILTERS.WITHOUT_INTERNSHIP;
}

function getFollowUpStatus(student) {
  if (student.internshipStatus === FILTERS.WITHOUT_INTERNSHIP) return FILTERS.NEEDS_FOLLOW_UP;
  if (!student.providerName || student.providerName === '-') return FILTERS.NEEDS_FOLLOW_UP;
  return 'On Track';
}

function isFollowUpStatus(value) {
  return [FILTERS.NEEDS_FOLLOW_UP, 'At Risk', FILTERS.WITHOUT_INTERNSHIP].includes(String(value || ''));
}

function displayStatus(value, isArabic) {
  const map = {
    [FILTERS.ALL]: isArabic ? 'كل الطلاب' : 'All Students',
    [FILTERS.WITH_INTERNSHIP]: isArabic ? 'لديه تدريب' : 'Has Internship',
    [FILTERS.WITHOUT_INTERNSHIP]: isArabic ? 'بدون تدريب' : 'No Internship',
    [FILTERS.NEEDS_FOLLOW_UP]: isArabic ? 'بحاجة متابعة' : 'Needs Follow-up',
    'On Track': isArabic ? 'منتظم' : 'On Track',
  };

  return map[value] || value || '-';
}

function getPercentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 100);
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function formatDate(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function getCsvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(filename, rows, locale, isArabic) {
  const headers = isArabic
    ? ['اسم الطالب', 'البريد الإلكتروني', 'كود الطالب', 'التخصص', 'المعدل', 'الشركة', 'حالة التدريب', 'المتابعة', 'تاريخ الربط']
    : ['Student Name', 'Email', 'Student Code', 'Major', 'GPA', 'Provider', 'Internship Status', 'Follow-up Status', 'Assignment Date'];

  const lines = [
    headers.map(getCsvCell).join(','),
    ...rows.map((row) =>
      [
        row.fullName,
        row.email,
        row.studentCode,
        row.major,
        row.gpa,
        row.providerName,
        displayStatus(row.internshipStatus, isArabic),
        displayStatus(row.followUpStatus, isArabic),
        formatDate(row.assignmentStartAt, locale),
      ]
        .map(getCsvCell)
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
    students: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    briefcase: <><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" /><rect x="4" y="6" width="16" height="13" rx="2" /><path d="M4 11h16" /><path d="M10 12h4" /></>,
    warning: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 3-4 3 2 4-7" /><path d="M17 6h2v2" /></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    export: <><path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M5 21h14" /></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" /></>,
    dots: <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name] || icons.chart}
    </svg>
  );
}

function KpiCard({ title, value, subtitle, icon, tone, loading, onClick }) {
  return (
    <button type="button" className={`ims-advisor-kpi ims-advisor-kpi-${tone}`} onClick={onClick}>
      <div>
        <span>{title}</span>
        <strong>{loading ? '...' : value}</strong>
        <em>{subtitle}</em>
      </div>
      <i><SvgIcon name={icon} size={28} /></i>
    </button>
  );
}

function StatusPill({ value, isArabic }) {
  const raw = String(value || '');
  let className = 'info';
  if (raw === FILTERS.WITH_INTERNSHIP || raw === 'On Track') className = 'success';
  if (raw === FILTERS.WITHOUT_INTERNSHIP || raw === FILTERS.NEEDS_FOLLOW_UP || raw === 'At Risk') className = 'warning';

  return <span className={`ims-advisor-status ims-advisor-status-${className}`}>{displayStatus(raw, isArabic)}</span>;
}

function FilterField({ type = 'text', value, onChange, placeholder, options = [], isArabic }) {
  if (type === 'select') {
    return (
      <select className={`ims-advisor-filter ${value ? 'active' : ''}`} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{displayStatus(option, isArabic)}</option>)}
      </select>
    );
  }

  return <input className={`ims-advisor-filter ${value ? 'active' : ''}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function AdvisorProgressCard({ value, isArabic }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="ims-advisor-progress-card">
      <h3>{isArabic ? 'جاهزية طلابي للتدريب' : 'My Students Readiness'}</h3>
      <div className="ims-advisor-progress-body">
        <svg width="126" height="126" viewBox="0 0 126 126" role="img" aria-label={`${safeValue}%`}>
          <circle cx="63" cy="63" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="15" />
          <circle cx="63" cy="63" r={radius} fill="none" stroke="#2ee6d3" strokeWidth="15" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 63 63)" />
          <text x="63" y="70" textAnchor="middle" fontSize="24" fontWeight="900" fill="#ffffff">{safeValue}%</text>
        </svg>
        <div className="ims-advisor-progress-legend">
          <div><span className="success" />{isArabic ? 'لديهم تدريب' : 'With Internship'}</div>
          <div><span className="warning" />{isArabic ? 'بحاجة متابعة' : 'Needs Follow-up'}</div>
          <div><span className="info" />{isArabic ? 'إجمالي الطلاب' : 'Total Students'}</div>
        </div>
      </div>
    </div>
  );
}

function AdvisorStudentsTable({ rows, locale, isArabic, loading, activeFilter, onFilterChange, onOpenFile, onEvaluate }) {
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);
  const [filters, setFilters] = useState({ fullName: '', email: '', internshipStatus: '', providerName: '', major: '', followUp: '' });

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((item) => item.internshipStatus).filter(Boolean))), [rows]);
  const followUpOptions = useMemo(() => Array.from(new Set(rows.map((item) => item.followUpStatus).filter(Boolean))), [rows]);

  const filteredRows = useMemo(() => {
    const lower = (value) => String(value || '').toLowerCase();

    return rows.filter((student) => {
      const matchesTopFilter =
        activeFilter === FILTERS.ALL ? true :
        activeFilter === FILTERS.WITH_INTERNSHIP ? student.internshipStatus === FILTERS.WITH_INTERNSHIP :
        activeFilter === FILTERS.WITHOUT_INTERNSHIP ? student.internshipStatus === FILTERS.WITHOUT_INTERNSHIP :
        activeFilter === FILTERS.NEEDS_FOLLOW_UP ? isFollowUpStatus(student.followUpStatus) : true;

      return (
        matchesTopFilter &&
        lower(student.fullName).includes(lower(filters.fullName)) &&
        lower(student.email).includes(lower(filters.email)) &&
        (!filters.internshipStatus || student.internshipStatus === filters.internshipStatus) &&
        lower(student.providerName).includes(lower(filters.providerName)) &&
        lower(student.major).includes(lower(filters.major)) &&
        (!filters.followUp || student.followUpStatus === filters.followUp)
      );
    });
  }, [rows, filters, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const paginationStart = Math.min(Math.max(1, safePage - 2), Math.max(1, totalPages - 4));
  const paginationPages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => paginationStart + index);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    onFilterChange(FILTERS.ALL);
    setFilters({ fullName: '', email: '', internshipStatus: '', providerName: '', major: '', followUp: '' });
    setToolbarMenuOpen(false);
  };

  const handleExport = () => {
    downloadCsv(isArabic ? 'طلاب-المشرف-الأكاديمي.csv' : 'academic-advisor-students.csv', filteredRows, locale, isArabic);
    setToolbarMenuOpen(false);
  };

  const goToPage = (targetPage) => setPage(Math.max(1, Math.min(totalPages, targetPage)));

  const topFilters = [
    { key: FILTERS.ALL, label: isArabic ? 'كل الطلاب' : 'All Students' },
    { key: FILTERS.WITH_INTERNSHIP, label: isArabic ? 'لديهم تدريب' : 'With Internship' },
    { key: FILTERS.WITHOUT_INTERNSHIP, label: isArabic ? 'بدون تدريب' : 'Without Internship' },
    { key: FILTERS.NEEDS_FOLLOW_UP, label: isArabic ? 'بحاجة متابعة' : 'Needs Follow-up' },
  ];

  return (
    <div className="ims-advisor-table-card">
      <div className="ims-advisor-table-toolbar">
        <div className="ims-advisor-actions">
          <button type="button" className="ims-advisor-secondary-btn" onClick={handleExport} disabled={!filteredRows.length}>
            <SvgIcon name="export" size={18} />
            {isArabic ? 'تصدير' : 'Export'}
          </button>
          <div className="ims-advisor-menu">
            <button type="button" className="ims-advisor-icon-btn" onClick={() => setToolbarMenuOpen((current) => !current)} aria-label="More">
              <SvgIcon name="dots" size={18} />
            </button>
            {toolbarMenuOpen ? (
              <div className="ims-advisor-menu-popover">
                <button type="button" onClick={resetFilters}><SvgIcon name="reset" size={16} />{isArabic ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</button>
                <button type="button" onClick={handleExport} disabled={!filteredRows.length}><SvgIcon name="export" size={16} />{isArabic ? 'تصدير النتائج الحالية' : 'Export Current Results'}</button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ims-advisor-tabs">
          {topFilters.map((filter) => (
            <button key={filter.key} type="button" className={activeFilter === filter.key ? 'active' : ''} onClick={() => { setPage(1); onFilterChange(filter.key); }}>
              {filter.label}
              <span>
                {filter.key === FILTERS.ALL ? formatNumber(rows.length, locale) :
                 filter.key === FILTERS.WITH_INTERNSHIP ? formatNumber(rows.filter((item) => item.internshipStatus === FILTERS.WITH_INTERNSHIP).length, locale) :
                 filter.key === FILTERS.WITHOUT_INTERNSHIP ? formatNumber(rows.filter((item) => item.internshipStatus === FILTERS.WITHOUT_INTERNSHIP).length, locale) :
                 formatNumber(rows.filter((item) => isFollowUpStatus(item.followUpStatus)).length, locale)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="ims-advisor-table-wrap">
        <table className="ims-advisor-table">
          <thead>
            <tr>
              <th><FilterField value={filters.fullName} onChange={(value) => updateFilter('fullName', value)} placeholder={isArabic ? 'اسم الطالب' : 'Student Name'} isArabic={isArabic} /></th>
              <th><FilterField value={filters.email} onChange={(value) => updateFilter('email', value)} placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} isArabic={isArabic} /></th>
              <th><FilterField type="select" value={filters.internshipStatus} onChange={(value) => updateFilter('internshipStatus', value)} placeholder={isArabic ? 'حالة التدريب' : 'Internship Status'} options={statusOptions} isArabic={isArabic} /></th>
              <th><FilterField value={filters.providerName} onChange={(value) => updateFilter('providerName', value)} placeholder={isArabic ? 'الشركة' : 'Provider'} isArabic={isArabic} /></th>
              <th><FilterField value={filters.major} onChange={(value) => updateFilter('major', value)} placeholder={isArabic ? 'التخصص' : 'Major'} isArabic={isArabic} /></th>
              <th><FilterField type="select" value={filters.followUp} onChange={(value) => updateFilter('followUp', value)} placeholder={isArabic ? 'المتابعة' : 'Follow-up'} options={followUpOptions} isArabic={isArabic} /></th>
              <th className="ims-advisor-table-actions-head" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="ims-advisor-loading"><div className="spinner-border spinner-border-sm" role="status" /><span>{isArabic ? 'جاري تحميل الطلاب...' : 'Loading students...'}</span></div></td></tr>
            ) : visibleRows.length ? (
              visibleRows.map((student) => (
                <tr key={student.id}>
                  <td><div className="ims-advisor-person"><div className="ims-advisor-avatar">{student.fullName?.slice(0, 1) || '-'}</div><div><strong>{student.fullName || '-'}</strong><small>{student.studentCode || '-'}</small></div></div></td>
                  <td dir="ltr">{student.email || '-'}</td>
                  <td><StatusPill value={student.internshipStatus} isArabic={isArabic} /></td>
                  <td>{student.providerName || '-'}</td>
                  <td>{student.major || '-'}</td>
                  <td><StatusPill value={student.followUpStatus} isArabic={isArabic} /></td>
                  <td>
                    <div className="ims-advisor-row-actions">
                      <button type="button" className="ims-advisor-row-btn" onClick={() => setOpenRowMenuId((current) => (current === student.id ? null : student.id))} aria-label="Student actions"><SvgIcon name="dots" size={17} /></button>
                      {openRowMenuId === student.id ? (
                        <div className="ims-advisor-row-popover">
                          <button type="button" onClick={() => onOpenFile(student.id)}><SvgIcon name="eye" size={15} />{isArabic ? 'فتح ملف الطالب' : 'Open Student File'}</button>
                          <button type="button" onClick={() => onEvaluate(student.id)}><SvgIcon name="edit" size={15} />{isArabic ? 'التقييم' : 'Evaluate'}</button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7}><div className="ims-advisor-empty">{isArabic ? 'لا توجد بيانات مطابقة.' : 'No matching students found.'}</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-advisor-table-footer">
        <div>{isArabic ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length} طالب` : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length} students`}</div>
        <div className="ims-advisor-pagination">
          <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>‹</button>
          {paginationPages.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === safePage ? 'active' : ''} onClick={() => goToPage(pageNumber)}>{pageNumber}</button>)}
          <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>›</button>
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, emptyText }) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  if (!data.length || !maxValue) return <div className="ims-advisor-empty small">{emptyText}</div>;

  return (
    <div className="ims-advisor-bars">
      {data.map((item) => (
        <div key={item.label} className="ims-advisor-bar-row">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          <div><em style={{ width: `${getPercentage(item.value, maxValue)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function ChartPanel({ title, children }) {
  return <div className="ims-advisor-chart-card"><h3>{title}</h3>{children}</div>;
}

function AcademicAdvisorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [studentsOverview, setStudentsOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const advisors = await getAdvisorsRequest();
        const normalizedAdvisors = Array.isArray(advisors) ? advisors.map(normalizeAdvisor) : [];
        const targetAdvisors =
          String(user?.role || '').toLowerCase() === 'academicadvisor'
            ? normalizedAdvisors.filter(
                (item) =>
                  Number(item.id) === Number(user?.id) ||
                  String(item.email || '').toLowerCase() === String(user?.email || '').toLowerCase()
              )
            : normalizedAdvisors;

        const advisorStudentRows = await Promise.all(
          targetAdvisors.map(async (advisor) => {
            const students = await getAdvisorStudentsRequest(advisor.id);
            const normalizedStudents = (Array.isArray(students) ? students : []).map((student) => normalizeStudent(student, advisor));
            const enriched = await Promise.all(
              normalizedStudents.map(async (student) => {
                try {
                  const context = await getStudentInternshipContextRequest(student.id);
                  const internshipStatus = getInternshipStatus(context);
                  const row = {
                    ...student,
                    providerName: context?.provider_name || context?.providerName || '-',
                    internshipTitle: context?.internship_title || context?.internshipTitle || '-',
                    internshipStatus,
                    internshipId: context?.internship_id || context?.internshipId || null,
                  };
                  return { ...row, followUpStatus: getFollowUpStatus(row) };
                } catch {
                  const row = {
                    ...student,
                    providerName: '-',
                    internshipTitle: '-',
                    internshipStatus: FILTERS.WITHOUT_INTERNSHIP,
                    internshipId: null,
                  };
                  return { ...row, followUpStatus: getFollowUpStatus(row) };
                }
              })
            );
            return enriched;
          })
        );
        setStudentsOverview(advisorStudentRows.flat());
      } catch (error) {
        console.error('Failed to load advisor dashboard students:', error);
        setStudentsOverview([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [user?.id, user?.email, user?.role]);

  const totalStudents = studentsOverview.length;
  const totalWithInternship = studentsOverview.filter((item) => item.internshipStatus === FILTERS.WITH_INTERNSHIP).length;
  const totalWithoutInternship = studentsOverview.filter((item) => item.internshipStatus === FILTERS.WITHOUT_INTERNSHIP).length;
  const totalFollowUp = studentsOverview.filter((item) => isFollowUpStatus(item.followUpStatus)).length;
  const readinessPercentage = getPercentage(totalWithInternship, totalStudents);

  const providerChartData = useMemo(() => {
    const counts = studentsOverview.reduce((acc, item) => {
      const key = item.providerName && item.providerName !== '-' ? item.providerName : '';
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [studentsOverview]);

  const majorChartData = useMemo(() => {
    const counts = studentsOverview.reduce((acc, item) => {
      const key = item.major || (isArabic ? 'غير محدد' : 'Not specified');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [studentsOverview, isArabic]);

  const statusChartData = useMemo(
    () => [
      { label: isArabic ? 'لديهم تدريب' : 'With Internship', value: totalWithInternship },
      { label: isArabic ? 'بدون تدريب' : 'Without Internship', value: totalWithoutInternship },
      { label: isArabic ? 'بحاجة متابعة' : 'Needs Follow-up', value: totalFollowUp },
    ],
    [isArabic, totalWithInternship, totalWithoutInternship, totalFollowUp]
  );

  const openStudentFile = (studentId, openEvaluation = false) => {
    const base = ROUTES.ADVISOR_MODULES.STUDENT_FILE.replace(':studentId', String(studentId));
    navigate(openEvaluation ? `${base}?tab=evaluation` : base);
  };

  const kpis = [
    { title: isArabic ? 'الطلاب المرتبطون' : 'Linked Students', value: formatNumber(totalStudents, locale), subtitle: isArabic ? 'إجمالي طلابي' : 'Total assigned students', icon: 'students', tone: 'purple', filter: FILTERS.ALL },
    { title: isArabic ? 'لديهم تدريب' : 'With Internship', value: formatNumber(totalWithInternship, locale), subtitle: isArabic ? `${readinessPercentage}% من الطلاب` : `${readinessPercentage}% of students`, icon: 'briefcase', tone: 'green', filter: FILTERS.WITH_INTERNSHIP },
    { title: isArabic ? 'بدون تدريب' : 'Without Internship', value: formatNumber(totalWithoutInternship, locale), subtitle: isArabic ? 'يحتاجون متابعة' : 'Need follow-up', icon: 'warning', tone: 'orange', filter: FILTERS.WITHOUT_INTERNSHIP },
    { title: isArabic ? 'بحاجة متابعة' : 'Needs Follow-up', value: formatNumber(totalFollowUp, locale), subtitle: isArabic ? 'حسب حالة التدريب والشركة' : 'Based on internship/provider status', icon: 'chart', tone: 'cyan', filter: FILTERS.NEEDS_FOLLOW_UP },
  ];

  return (
    <div className="ims-advisor-dashboard">
      <style>{`
        .ims-advisor-dashboard { position: relative; min-height: 100%; padding: .25rem 0 1.5rem; color: #10243f; }
        .ims-advisor-dashboard::before { content: ""; position: absolute; inset: -1.5rem -1.5rem auto -1.5rem; height: 255px; pointer-events: none; background: radial-gradient(circle at 20% 20%, rgba(20,200,195,.16), transparent 34%), repeating-radial-gradient(ellipse at 50% 20%, rgba(20,200,195,.10) 0 1px, transparent 1px 28px); opacity: .8; border-radius: 0 0 42px 42px; z-index: 0; }
        .ims-advisor-dashboard > * { position: relative; z-index: 1; }
        .ims-advisor-top { display: grid; grid-template-columns: 1fr minmax(240px, 290px); gap: 1rem; align-items: stretch; }
        .ims-advisor-main-title { min-height: 120px; display: flex; flex-direction: column; justify-content: center; text-align: start; }
        .ims-advisor-main-title h1 { margin: 0 0 .45rem; font-size: clamp(2rem, 3vw, 2.8rem); font-weight: 900; letter-spacing: -.055em; color: #10243f; }
        .ims-advisor-main-title p { max-width: 980px; margin: 0; color: #637894; font-size: 1.02rem; font-weight: 650; line-height: 1.8; }
        .ims-advisor-dot { display: inline-block; width: 9px; height: 9px; margin-inline-start: .45rem; border-radius: 999px; background: #14c8c3; box-shadow: 0 0 0 6px rgba(20,200,195,.12); }
        .ims-advisor-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .ims-advisor-kpi { width: 100%; min-height: 126px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.35rem; text-align: start; background: rgba(255,255,255,.94); border: 1px solid rgba(230,238,246,.96); border-radius: 25px; box-shadow: 0 12px 30px rgba(16,36,63,.07); backdrop-filter: blur(10px); transition: 180ms ease; }
        .ims-advisor-kpi:hover { transform: translateY(-1px); border-color: rgba(20,200,195,.32); box-shadow: 0 18px 44px rgba(16,36,63,.10); }
        .ims-advisor-kpi span { display: block; margin-bottom: .38rem; color: #5e718d; font-size: .92rem; font-weight: 850; }
        .ims-advisor-kpi strong { display: block; margin-bottom: .35rem; color: #10243f; font-size: 2rem; font-weight: 900; line-height: 1; letter-spacing: -.05em; }
        .ims-advisor-kpi em { color: #7a8aa5; font-size: .82rem; font-weight: 700; font-style: normal; }
        .ims-advisor-kpi i { width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; border-radius: 22px; flex-shrink: 0; font-style: normal; }
        .ims-advisor-kpi-purple i { color: #5b65f1; background: #eef0ff; } .ims-advisor-kpi-green i { color: #18bd87; background: #e7fbf3; } .ims-advisor-kpi-orange i { color: #ed9f22; background: #fff4dc; } .ims-advisor-kpi-cyan i { color: #0796a6; background: #e2fafa; }
        .ims-advisor-progress-card { width: 100%; min-height: 230px; padding: 1.2rem; border-radius: 26px; color: #fff; background: radial-gradient(circle at 20% 20%, rgba(46,230,211,.22), transparent 34%), linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 22px 60px rgba(7,31,53,.18); }
        .ims-advisor-progress-card h3 { margin: 0 0 1rem; font-size: 1rem; font-weight: 900; }
        .ims-advisor-progress-body { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
        .ims-advisor-progress-legend { display: grid; gap: .6rem; font-size: .86rem; font-weight: 750; color: rgba(255,255,255,.84); }
        .ims-advisor-progress-legend div { display: flex; align-items: center; gap: .45rem; }
        .ims-advisor-progress-legend span { width: 10px; height: 10px; border-radius: 999px; } .ims-advisor-progress-legend .success { background: #2ee6d3; } .ims-advisor-progress-legend .warning { background: #f4a62a; } .ims-advisor-progress-legend .info { background: #3b82f6; }
        .ims-advisor-table-card, .ims-advisor-chart-card { background: rgba(255,255,255,.95); border: 1px solid rgba(230,238,246,.98); border-radius: 28px; box-shadow: 0 18px 45px rgba(16,36,63,.08); backdrop-filter: blur(10px); }
        .ims-advisor-table-card { overflow: visible; margin-top: 1rem; }
        .ims-advisor-table-toolbar, .ims-advisor-table-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .9rem 1rem; background: #fff; }
        .ims-advisor-table-toolbar { min-height: 72px; border-bottom: 1px solid #edf3f8; border-radius: 28px 28px 0 0; }
        .ims-advisor-table-footer { color: #6f819b; font-size: .88rem; font-weight: 750; border-radius: 0 0 28px 28px; }
        .ims-advisor-actions, .ims-advisor-tabs, .ims-advisor-pagination { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
        .ims-advisor-secondary-btn, .ims-advisor-icon-btn, .ims-advisor-row-btn { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: .45rem; border-radius: 15px; font-size: .88rem; font-weight: 850; border: 1px solid #dfeaf3; background: #fff; color: #243b5a; }
        .ims-advisor-icon-btn { width: 46px; } .ims-advisor-row-btn { width: 34px; height: 34px; min-height: 34px; border-radius: 12px; color: #7a8aa5; }
        .ims-advisor-menu, .ims-advisor-row-actions { position: relative; }
        .ims-advisor-menu-popover, .ims-advisor-row-popover { position: absolute; top: calc(100% + .45rem); inset-inline-start: 0; min-width: 190px; padding: .4rem; border: 1px solid #dfeaf3; border-radius: 16px; background: #fff; box-shadow: 0 18px 44px rgba(16,36,63,.14); z-index: 25; }
        .ims-advisor-row-popover { inset-inline-start: auto; inset-inline-end: 0; }
        .ims-advisor-menu-popover button, .ims-advisor-row-popover button { width: 100%; min-height: 38px; display: flex; align-items: center; gap: .45rem; border: none; border-radius: 12px; background: transparent; color: #243b5a; font-size: .82rem; font-weight: 800; text-align: start; }
        .ims-advisor-menu-popover button:hover, .ims-advisor-row-popover button:hover { background: #f4fbfc; color: #0796a6; }
        .ims-advisor-tabs button { position: relative; min-height: 48px; display: inline-flex; align-items: center; gap: .45rem; padding: 0 .45rem; border: none; color: #7a8aa5; background: transparent; font-weight: 850; }
        .ims-advisor-tabs button span { min-width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0 .4rem; border-radius: 999px; background: #eef4f7; color: #6f819b; font-size: .74rem; font-weight: 900; }
        .ims-advisor-tabs button.active { color: #0796a6; } .ims-advisor-tabs button.active span { color: #fff; background: linear-gradient(135deg, #0796a6, #14c8c3); }
        .ims-advisor-tabs button.active::after { content: ""; position: absolute; inset-inline: 0; bottom: -.72rem; height: 4px; border-radius: 999px; background: linear-gradient(90deg, #0796a6, #14c8c3); }
        .ims-advisor-table-wrap { overflow: auto; }
        .ims-advisor-table { width: 100%; min-width: 1040px; border-collapse: separate; border-spacing: 0; }
        .ims-advisor-table thead th { padding: .85rem .75rem; background: #fff; border-bottom: 1px solid #edf3f8; }
        .ims-advisor-table tbody td { padding: .82rem .9rem; border-bottom: 1px solid #edf3f8; color: #243b5a; font-size: .88rem; font-weight: 700; vertical-align: middle; }
        .ims-advisor-table tbody tr:hover { background: #f9fcff; }
        .ims-advisor-filter { width: 100%; min-height: 42px; border: 1px solid #dfeaf3; border-radius: 14px; padding: .55rem .72rem; color: #243b5a; background: #fbfdff; font-size: .82rem; font-weight: 750; outline: none; }
        .ims-advisor-filter::placeholder { color: #8fa0b6; font-weight: 800; } .ims-advisor-filter:focus, .ims-advisor-filter.active { border-color: rgba(20,200,195,.72); box-shadow: 0 0 0 .18rem rgba(20,200,195,.11); background: #fff; }
        .ims-advisor-person { display: flex; align-items: center; gap: .55rem; white-space: nowrap; } .ims-advisor-person strong { display: block; color: #10243f; font-size: .9rem; font-weight: 900; } .ims-advisor-person small { display: block; color: #7a8aa5; font-size: .76rem; font-weight: 750; }
        .ims-advisor-avatar { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-size: .8rem; font-weight: 900; background: linear-gradient(135deg, #0c96a9, #14c8c3); box-shadow: 0 8px 18px rgba(7,150,166,.18); flex-shrink: 0; }
        .ims-advisor-status { display: inline-flex; align-items: center; justify-content: center; gap: .38rem; min-height: 30px; padding: .35rem .72rem; border-radius: 999px; font-size: .76rem; font-weight: 900; border: 1px solid transparent; white-space: nowrap; }
        .ims-advisor-status::before { content: ""; width: 7px; height: 7px; border-radius: 999px; background: currentColor; }
        .ims-advisor-status-success { color: #0d8a64; background: #e7fbf3; border-color: rgba(24,197,143,.22); } .ims-advisor-status-warning { color: #a4660b; background: #fff4dc; border-color: rgba(244,166,42,.24); } .ims-advisor-status-info { color: #1f65c8; background: #e8f1ff; border-color: rgba(59,130,246,.2); }
        .ims-advisor-table-actions-head { width: 58px; }
        .ims-advisor-pagination button { width: 34px; height: 34px; border: 1px solid transparent; border-radius: 12px; background: transparent; color: #243b5a; font-weight: 850; }
        .ims-advisor-pagination button.active { color: #fff; background: linear-gradient(135deg, #0796a6, #14c8c3); box-shadow: 0 10px 20px rgba(7,150,166,.18); }
        .ims-advisor-secondary-btn:disabled, .ims-advisor-pagination button:disabled { opacity: .45; cursor: not-allowed; }
        .ims-advisor-loading, .ims-advisor-empty { min-height: 120px; display: flex; align-items: center; justify-content: center; gap: .6rem; color: #7a8aa5; font-weight: 750; } .ims-advisor-empty.small { min-height: 140px; font-size: .9rem; }
        .ims-advisor-bottom-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
        .ims-advisor-chart-card { min-height: 245px; padding: 1.15rem; overflow: hidden; } .ims-advisor-chart-card h3 { margin: 0 0 1rem; color: #243b5a; font-size: 1rem; font-weight: 900; }
        .ims-advisor-bars { display: grid; gap: 1.15rem; padding-top: .4rem; } .ims-advisor-bar-row { display: grid; grid-template-columns: 42px 1fr 1.6fr; gap: .8rem; align-items: center; }
        .ims-advisor-bar-row strong { color: #10243f; font-weight: 900; } .ims-advisor-bar-row span { color: #243b5a; font-size: .88rem; font-weight: 750; } .ims-advisor-bar-row div { height: 10px; overflow: hidden; border-radius: 999px; background: #e8f1f4; } .ims-advisor-bar-row em { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0796a6, #14c8c3); }
        @media (max-width: 1199.98px) { .ims-advisor-top { grid-template-columns: 1fr; } .ims-advisor-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ims-advisor-bottom-grid { grid-template-columns: 1fr; } }
        @media (max-width: 767.98px) { .ims-advisor-kpi-grid { grid-template-columns: 1fr; } .ims-advisor-table-toolbar, .ims-advisor-table-footer { align-items: stretch; flex-direction: column; } .ims-advisor-tabs { justify-content: flex-start; } .ims-advisor-progress-body { align-items: flex-start; flex-direction: column; } }
      `}</style>

      <div className="ims-advisor-top">
        <div className="ims-advisor-main-title">
          <h1>{isArabic ? 'طلاب المشرف الأكاديمي' : 'Academic Advisor Students'}<span className="ims-advisor-dot" /></h1>
          <p>{t('Review only the students linked to this academic advisor, open the student file, inspect the full student details, update attendance, review tasks, schedule meetings, and submit the final evaluation.')}</p>
        </div>
        <AdvisorProgressCard value={readinessPercentage} isArabic={isArabic} />
      </div>

      <div className="ims-advisor-kpi-grid">
        {kpis.map((item) => <KpiCard key={item.title} {...item} loading={loading} onClick={() => setActiveFilter(item.filter)} />)}
      </div>

      <AdvisorStudentsTable rows={studentsOverview} locale={locale} isArabic={isArabic} loading={loading} activeFilter={activeFilter} onFilterChange={setActiveFilter} onOpenFile={(studentId) => openStudentFile(studentId)} onEvaluate={(studentId) => openStudentFile(studentId, true)} />

      <div className="ims-advisor-bottom-grid">
        <ChartPanel title={isArabic ? 'توزيع حالة الطلاب' : 'Students Status Distribution'}><BarChart data={statusChartData} emptyText={isArabic ? 'لا توجد بيانات كافية.' : 'No enough data.'} /></ChartPanel>
        <ChartPanel title={isArabic ? 'أكثر الشركات تدريبًا لطلابي' : 'Top Providers for My Students'}><BarChart data={providerChartData} emptyText={isArabic ? 'لا توجد بيانات شركات.' : 'No provider data.'} /></ChartPanel>
        <ChartPanel title={isArabic ? 'توزيع الطلاب حسب التخصص' : 'Students by Major'}><BarChart data={majorChartData} emptyText={isArabic ? 'لا توجد بيانات تخصصات.' : 'No major data.'} /></ChartPanel>
      </div>
    </div>
  );
}

export default AcademicAdvisorDashboardPage;
