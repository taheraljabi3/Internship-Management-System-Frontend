import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  createCompanyEvaluationTemplateRequest,
  getAcademicStudentEvaluationsByInternshipRequest,
  getAdvisorStudentsRequest,
  getCompanyEvaluationsByInternshipRequest,
  getCompanyEvaluationTemplateCriteriaRequest,
  getCompanyEvaluationTemplatesByInternshipRequest,
  getFinalEvaluationSummaryRequest,
  getMyInternshipContextRequest,
  getStudentInternshipContextRequest,
  getStudentsRequest,
} from '../../../app/api/client';

const managementTabs = [
  { key: 'templates', label: 'Company Evaluation Templates' },
  { key: 'results', label: 'Student Evaluation Results' },
];

const studentTabs = [{ key: 'results', label: 'My Evaluation Results' }];

const DEFAULT_CRITERIA = [
  {
    localId: 1,
    criterion_name: 'Attendance and Commitment',
    question:
      'How committed was the trainee to attendance, working hours, and assigned responsibilities?',
    weight: 25,
    max_score: 25,
    sort_order: 1,
    is_required: true,
  },
  {
    localId: 2,
    criterion_name: 'Work Quality and Productivity',
    question: 'How do you evaluate the quality, accuracy, and productivity of the trainee work?',
    weight: 25,
    max_score: 25,
    sort_order: 2,
    is_required: true,
  },
  {
    localId: 3,
    criterion_name: 'Communication and Teamwork',
    question: 'How well did the trainee communicate, collaborate, and respond to feedback?',
    weight: 25,
    max_score: 25,
    sort_order: 3,
    is_required: true,
  },
  {
    localId: 4,
    criterion_name: 'Learning Progress and Professional Behavior',
    question: 'How professional was the trainee, and how well did they progress during the internship?',
    weight: 25,
    max_score: 25,
    sort_order: 4,
    is_required: true,
  },
];

const emptyCriterionForm = {
  localId: null,
  criterion_name: '',
  question: '',
  weight: 0,
  max_score: 10,
  sort_order: 1,
  is_required: true,
};

function normalizeStudent(student) {
  return {
    id: student.student_user_id ?? student.user_id ?? student.id,
    fullName: student.full_name || student.fullName || student.student_name || '',
    email: student.email || student.student_email || '',
    studentCode: student.student_code || student.studentCode || '',
    major: student.major || '',
    university: student.university || '',
  };
}

function normalizeContext(student, context) {
  if (!context?.internship_id && !context?.internshipId) return null;

  return {
    studentUserId: student.id,
    studentName: student.fullName || context.student_name || context.studentName || '-',
    studentEmail: student.email || context.student_email || context.studentEmail || '-',
    internshipId: context.internship_id || context.internshipId,
    internshipTitle: context.internship_title || context.internshipTitle || context.title || '-',
    providerName: context.provider_name || context.providerName || '-',
    providerEmail: context.provider_email || context.providerEmail || '',
  };
}

function normalizeSavedCriterion(criterion, index) {
  return {
    localId: criterion.localId || criterion.id || Date.now() + index,
    id: criterion.id,
    criterion_name: criterion.criterion_name || criterion.name || '',
    question: criterion.question || criterion.description || '',
    weight: Number(criterion.weight ?? criterion.out_of ?? 0),
    max_score: Number(criterion.max_score ?? criterion.weight ?? criterion.out_of ?? 10),
    sort_order: Number(criterion.sort_order ?? index + 1),
    is_required: criterion.is_required ?? true,
  };
}

function getNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function calculateFinalAverage(companyScore, academicScore) {
  const hasCompany = companyScore !== null && companyScore !== undefined;
  const hasAcademic = academicScore !== null && academicScore !== undefined;

  if (!hasCompany && !hasAcademic) return null;
  if (hasCompany && !hasAcademic) return Number(companyScore);
  if (!hasCompany && hasAcademic) return Number(academicScore);

  return Math.round((Number(companyScore) * 0.5 + Number(academicScore) * 0.5) * 100) / 100;
}

function getFinalStatus(companyScore, academicScore) {
  if (
    companyScore === null ||
    companyScore === undefined ||
    academicScore === null ||
    academicScore === undefined
  ) {
    return 'Pending';
  }

  const finalAverage = calculateFinalAverage(companyScore, academicScore);
  return finalAverage >= 60 ? 'Passed' : 'Needs Review';
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase();

  if (['active', 'approved', 'submitted', 'passed', 'completed', 'received'].includes(value)) {
    return 'success';
  }

  if (['pending', 'draft', 'under review', 'needs review'].includes(value)) {
    return 'warning';
  }

  if (['rejected', 'failed', 'archived'].includes(value)) {
    return 'danger';
  }

  return 'info';
}

function getStatusLabel(status, isArabic) {
  const value = String(status || '').toLowerCase();

  const labels = {
    active: isArabic ? 'نشط' : 'Active',
    approved: isArabic ? 'معتمد' : 'Approved',
    submitted: isArabic ? 'مرسل' : 'Submitted',
    passed: isArabic ? 'مجتاز' : 'Passed',
    completed: isArabic ? 'مكتمل' : 'Completed',
    received: isArabic ? 'مستلم' : 'Received',
    pending: isArabic ? 'معلق' : 'Pending',
    draft: isArabic ? 'مسودة' : 'Draft',
    'under review': isArabic ? 'قيد المراجعة' : 'Under Review',
    'needs review': isArabic ? 'بحاجة مراجعة' : 'Needs Review',
    rejected: isArabic ? 'مرفوض' : 'Rejected',
    failed: isArabic ? 'فشل' : 'Failed',
    archived: isArabic ? 'مؤرشف' : 'Archived',
  };

  return labels[value] || status || '-';
}

function formatDate(value, locale) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function buildTemplateForm(template, criteria) {
  return {
    title: template?.title || 'Standard Company Internship Evaluation',
    version: template?.version || 'v1.0',
    status: template?.status || 'Active',
    criteria: criteria?.length
      ? criteria.map(normalizeSavedCriterion)
      : DEFAULT_CRITERIA.map((item) => ({ ...item })),
  };
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
          const rawValue = column.exportValue
            ? column.exportValue(row)
            : column.render
              ? column.render(row[column.key], row, true)
              : row[column.key];

          return getCsvCell(typeof rawValue === 'object' ? '' : rawValue);
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
    evaluation: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
      </>
    ),
    template: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </>
    ),
    results: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
      </>
    ),
    students: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    company: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
        <path d="M16 9h2a2 2 0 0 1 2 2v10" />
        <path d="M8 7h4" />
        <path d="M8 11h4" />
        <path d="M8 15h4" />
      </>
    ),
    academic: (
      <>
        <path d="m2 8 10-5 10 5-10 5Z" />
        <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
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
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
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
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
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
      {icons[name] || icons.evaluation}
    </svg>
  );
}

function OverlayModal({ isOpen, title, subtitle, children, onClose, size = 'lg' }) {
  if (!isOpen) return null;

  const modal = (
    <>
      <div className="ims-eval-modal-backdrop" onClick={onClose} />
      <div className="ims-eval-modal-shell" role="dialog" aria-modal="true">
        <div className={`ims-eval-modal-card ims-eval-modal-${size}`}>
          <div className="ims-eval-modal-header">
            <div>
              <h3>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close">
              <SvgIcon name="close" size={18} />
            </button>
          </div>
          <div className="ims-eval-modal-body">{children}</div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}

function StatusPill({ value, isArabic }) {
  return (
    <span className={`ims-eval-status ims-eval-status-${getStatusTone(value)}`}>
      {getStatusLabel(value, isArabic)}
    </span>
  );
}

function ScoreRing({ value, label, subLabel, size = 130 }) {
  const safeValue = value === null || value === undefined ? 0 : clampPercentage(value);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="ims-eval-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#edf4f8"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#evalRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="evalRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0796a6" />
            <stop offset="100%" stopColor="#2ee6d3" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ims-eval-score-ring-label">
        <strong>{label ?? (value === null || value === undefined ? '-' : `${safeValue}%`)}</strong>
        {subLabel ? <span>{subLabel}</span> : null}
      </div>
    </div>
  );
}

function KpiCard({ label, value, helper, icon, tone = 'teal' }) {
  return (
    <div className={`ims-eval-kpi-card ims-eval-kpi-${tone}`}>
      <div className="ims-eval-kpi-icon">
        <SvgIcon name={icon} size={25} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <em>{helper}</em> : null}
      </div>
    </div>
  );
}

function FeedbackAlert({ feedback, onClose, isArabic }) {
  if (!feedback?.message) return null;

  return (
    <div className={`ims-eval-feedback ims-eval-feedback-${feedback.type || 'info'}`}>
      <span>{feedback.message}</span>
      <button type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'}>
        <SvgIcon name="close" size={16} />
      </button>
    </div>
  );
}

function FilterField({ value, placeholder, onChange }) {
  return (
    <div className="ims-eval-table-filter">
      <SvgIcon name="search" size={15} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DataTable({ columns, rows, rowKey = 'id', emptyMessage, isArabic, exportName }) {
  const pageSize = 6;
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
    <div className="ims-eval-table-card">
      <div className="ims-eval-table-top">
        <div>
          <strong>
            {isArabic
              ? `عرض ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} من ${filteredRows.length}`
              : `Showing ${filteredRows.length ? startIndex + 1 : 0} - ${startIndex + visibleRows.length} of ${filteredRows.length}`}
          </strong>
          <span>{isArabic ? 'يمكن البحث من رؤوس الأعمدة مباشرة.' : 'Use column headers to search directly.'}</span>
        </div>
        <button
          type="button"
          className="ims-eval-secondary-btn"
          disabled={!filteredRows.length}
          onClick={() => exportCsv(exportName || 'evaluation-data.csv', filteredRows, columns)}
        >
          <SvgIcon name="export" size={17} />
          {isArabic ? 'تصدير' : 'Export'}
        </button>
      </div>

      <div className="ims-eval-table-wrap">
        <table className="ims-eval-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.isAction ? null : (
                    <FilterField
                      value={filters[column.key] || ''}
                      onChange={(value) => updateFilter(column.key, value)}
                      placeholder={column.label}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr key={row[rowKey] ?? index}>
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
                  <div className="ims-eval-empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ims-eval-pagination">
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

function CriteriaReadiness({ totalWeight, totalMaxScore, isArabic }) {
  const remaining = 100 - totalWeight;

  return (
    <div className="ims-eval-readiness-card">
      <div>
        <span>{isArabic ? 'جاهزية القالب' : 'Template Readiness'}</span>
        <strong>{totalWeight}%</strong>
        <em>
          {totalWeight === 100
            ? isArabic
              ? 'الأوزان مكتملة وجاهزة للحفظ.'
              : 'Weights are complete and ready to save.'
            : isArabic
              ? `المتبقي للوصول إلى 100%: ${remaining}%`
              : `Remaining to reach 100%: ${remaining}%`}
        </em>
      </div>
      <ScoreRing value={totalWeight} size={94} label={`${totalWeight}%`} subLabel={isArabic ? 'الأوزان' : 'Weights'} />
      <div className="ims-eval-readiness-meta">
        <span>{isArabic ? 'إجمالي الدرجات' : 'Total Max Score'}</span>
        <strong>{totalMaxScore}</strong>
      </div>
    </div>
  );
}

function EmptyPanel({ children }) {
  return <div className="ims-eval-empty-panel">{children}</div>;
}

function EvaluationModulePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const role = user?.role || 'Student';
  const isStudent = role === 'Student';
  const canManage = role === 'AcademicAdvisor' || role === 'Administrator';
  const tabs = isStudent ? studentTabs : managementTabs;

  const [activeTab, setActiveTab] = useState(isStudent ? 'results' : 'templates');
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [studentContexts, setStudentContexts] = useState([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [templateCriteriaMap, setTemplateCriteriaMap] = useState({});
  const [companyEvaluations, setCompanyEvaluations] = useState([]);
  const [academicEvaluations, setAcademicEvaluations] = useState([]);
  const [finalSummary, setFinalSummary] = useState(null);
  const [resultRows, setResultRows] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState(buildTemplateForm());

  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterionLocalId, setEditingCriterionLocalId] = useState(null);
  const [criterionForm, setCriterionForm] = useState(emptyCriterionForm);

  const selectedContext = useMemo(
    () => studentContexts.find((item) => String(item.internshipId) === String(selectedInternshipId)) || null,
    [studentContexts, selectedInternshipId]
  );

  const totalWeight = useMemo(
    () => templateForm.criteria.reduce((total, item) => total + getNumber(item.weight), 0),
    [templateForm.criteria]
  );

  const totalMaxScore = useMemo(
    () => templateForm.criteria.reduce((total, item) => total + getNumber(item.max_score), 0),
    [templateForm.criteria]
  );

  const templateValidation = useMemo(() => {
    if (!selectedContext?.internshipId) {
      return isArabic ? 'اختر طالبًا لديه تدريب أولًا.' : 'Select a student with an internship first.';
    }

    if (!templateForm.title.trim()) {
      return isArabic ? 'اسم القالب مطلوب.' : 'Template title is required.';
    }

    if (!templateForm.criteria.length) {
      return isArabic ? 'أضف معيار تقييم واحد على الأقل.' : 'Add at least one evaluation criterion.';
    }

    for (const criterion of templateForm.criteria) {
      if (!String(criterion.criterion_name || '').trim()) {
        return isArabic ? 'كل معيار يجب أن يحتوي على اسم.' : 'Each criterion must have a name.';
      }

      if (getNumber(criterion.weight) <= 0) {
        return isArabic ? 'وزن كل معيار يجب أن يكون أكبر من صفر.' : 'Each criterion weight must be greater than zero.';
      }

      if (getNumber(criterion.max_score) <= 0) {
        return isArabic ? 'درجة كل معيار يجب أن تكون أكبر من صفر.' : 'Each criterion max score must be greater than zero.';
      }
    }

    if (totalWeight !== 100) {
      return isArabic
        ? `مجموع الأوزان الحالي ${totalWeight}%. يجب أن يساوي 100%.`
        : `Current total weight is ${totalWeight}%. It must equal 100%.`;
    }

    return '';
  }, [isArabic, selectedContext, templateForm.criteria, templateForm.title, totalWeight]);

  const companyEvaluationRows = useMemo(() => {
    return companyEvaluations.map((item) => ({
      ...item,
      studentName: item.student_name || selectedContext?.studentName || '-',
      providerName: item.provider_name || selectedContext?.providerName || '-',
      evaluatorName: item.evaluator_name || '-',
      submittedAt: formatDate(item.submitted_at, locale),
      totalPercentage: item.total_percentage ?? '-',
      status: item.status || 'Submitted',
    }));
  }, [companyEvaluations, selectedContext, locale]);

  const academicEvaluationRows = useMemo(() => {
    return academicEvaluations.map((item) => ({
      ...item,
      studentName: item.student_name || selectedContext?.studentName || '-',
      evaluatorName: item.evaluator_name || '-',
      submittedAt: formatDate(item.submitted_at || item.evaluation_date, locale),
      totalPercentage: item.total_percentage ?? '-',
      status: item.status || 'Submitted',
    }));
  }, [academicEvaluations, selectedContext, locale]);

  const selectedCompanyScore =
    finalSummary?.company_total_percentage ?? companyEvaluationRows[0]?.total_percentage ?? null;
  const selectedAcademicScore =
    finalSummary?.academic_total_percentage ?? academicEvaluationRows[0]?.total_percentage ?? null;
  const selectedFinalAverage = calculateFinalAverage(selectedCompanyScore, selectedAcademicScore);
  const selectedFinalStatus = getFinalStatus(selectedCompanyScore, selectedAcademicScore);

  const clearFeedback = () => setFeedback({ type: '', message: '' });
  const showFeedback = (type, message) => setFeedback({ type, message });

  const loadResultRows = async (contexts) => {
    const rows = await Promise.all(
      contexts.map(async (context) => {
        const summary = await getFinalEvaluationSummaryRequest(context.internshipId).catch(() => null);
        const companyScore = summary?.company_total_percentage ?? null;
        const academicScore = summary?.academic_total_percentage ?? null;
        const finalAverage = calculateFinalAverage(companyScore, academicScore);

        return {
          id: context.internshipId,
          internship_id: context.internshipId,
          student_user_id: context.studentUserId,
          studentName: context.studentName,
          providerName: context.providerName,
          internshipTitle: context.internshipTitle,
          companyStatus: summary?.company_status || (companyScore !== null ? 'Submitted' : 'Pending'),
          companyScore,
          academicStatus: summary?.academic_status || (academicScore !== null ? 'Submitted' : 'Pending'),
          academicScore,
          finalAverage,
          finalStatus: getFinalStatus(companyScore, academicScore),
        };
      })
    );

    setResultRows(rows);
  };

  const loadContexts = async () => {
    setLoading(true);
    setErrorMessage('');
    clearFeedback();

    try {
      let contexts = [];

      if (isStudent) {
        const context = await getMyInternshipContextRequest().catch(() => null);
        const student = normalizeStudent({
          id: user?.id,
          full_name: user?.fullName || user?.full_name || user?.name,
          email: user?.email,
        });

        const normalized = normalizeContext(student, context);
        contexts = normalized ? [normalized] : [];
      } else {
        const students =
          role === 'Administrator'
            ? await getStudentsRequest().catch(() => [])
            : await getAdvisorStudentsRequest(user?.id).catch(() => []);

        const normalizedStudents = Array.isArray(students) ? students.map(normalizeStudent) : [];

        const contextResults = await Promise.all(
          normalizedStudents.map(async (student) => {
            const context = await getStudentInternshipContextRequest(student.id).catch(() => null);
            return normalizeContext(student, context);
          })
        );

        contexts = contextResults.filter(Boolean);
      }

      setStudentContexts(contexts);

      const firstInternshipId = contexts[0]?.internshipId || '';
      setSelectedInternshipId((current) => current || String(firstInternshipId || ''));

      await loadResultRows(contexts);
    } catch (error) {
      setStudentContexts([]);
      setSelectedInternshipId('');
      setErrorMessage(error.message || 'Failed to load evaluation data.');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedInternshipData = async (internshipId) => {
    if (!internshipId) {
      setTemplates([]);
      setTemplateCriteriaMap({});
      setCompanyEvaluations([]);
      setAcademicEvaluations([]);
      setFinalSummary(null);
      return;
    }

    const [templateRows, companyRows, academicRows, summary] = await Promise.all([
      getCompanyEvaluationTemplatesByInternshipRequest(internshipId).catch(() => []),
      getCompanyEvaluationsByInternshipRequest(internshipId).catch(() => []),
      getAcademicStudentEvaluationsByInternshipRequest(internshipId).catch(() => []),
      getFinalEvaluationSummaryRequest(internshipId).catch(() => null),
    ]);

    const normalizedTemplates = Array.isArray(templateRows) ? templateRows : [];
    setTemplates(normalizedTemplates);
    setCompanyEvaluations(Array.isArray(companyRows) ? companyRows : []);
    setAcademicEvaluations(Array.isArray(academicRows) ? academicRows : []);
    setFinalSummary(summary || null);

    const criteriaEntries = await Promise.all(
      normalizedTemplates.map(async (template) => {
        const criteria = await getCompanyEvaluationTemplateCriteriaRequest(template.id).catch(() => []);
        return [template.id, Array.isArray(criteria) ? criteria : []];
      })
    );

    setTemplateCriteriaMap(Object.fromEntries(criteriaEntries));
  };

  const reloadEverything = async () => {
    await loadContexts();
    if (selectedInternshipId) {
      await loadSelectedInternshipData(selectedInternshipId);
    }
  };

  useEffect(() => {
    loadContexts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  useEffect(() => {
    loadSelectedInternshipData(selectedInternshipId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInternshipId]);

  const openAddTemplateModal = () => {
    if (!selectedContext?.internshipId) {
      showFeedback('warning', isArabic ? 'اختر تدريبًا أولًا.' : 'Select an internship first.');
      return;
    }

    setEditingTemplate(null);
    setTemplateForm(buildTemplateForm());
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (template) => {
    const criteria = templateCriteriaMap[template.id] || [];
    setEditingTemplate(template);
    setTemplateForm(buildTemplateForm(template, criteria));
    setIsTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm(buildTemplateForm());
    setIsCriterionModalOpen(false);
    setEditingCriterionLocalId(null);
    setCriterionForm(emptyCriterionForm);
  };

  const openAddCriterionModal = () => {
    const nextId = Math.max(0, ...templateForm.criteria.map((item) => item.localId || 0)) + 1;
    const sortOrder = templateForm.criteria.length + 1;

    setEditingCriterionLocalId(null);
    setCriterionForm({
      ...emptyCriterionForm,
      localId: nextId,
      criterion_name: `Criterion ${sortOrder}`,
      sort_order: sortOrder,
    });
    setIsCriterionModalOpen(true);
  };

  const openEditCriterionModal = (criterion) => {
    setEditingCriterionLocalId(criterion.localId);
    setCriterionForm({ ...criterion });
    setIsCriterionModalOpen(true);
  };

  const closeCriterionModal = () => {
    setIsCriterionModalOpen(false);
    setEditingCriterionLocalId(null);
    setCriterionForm(emptyCriterionForm);
  };

  const handleCriterionFormChange = (field, value) => {
    setCriterionForm((current) => ({
      ...current,
      [field]: field === 'is_required' ? Boolean(value) : value,
    }));
  };

  const handleSaveCriterion = (event) => {
    event.preventDefault();

    if (!String(criterionForm.criterion_name || '').trim()) {
      showFeedback('warning', isArabic ? 'اسم المعيار مطلوب.' : 'Criterion name is required.');
      return;
    }

    if (getNumber(criterionForm.weight) <= 0) {
      showFeedback(
        'warning',
        isArabic ? 'وزن المعيار يجب أن يكون أكبر من صفر.' : 'Criterion weight must be greater than zero.'
      );
      return;
    }

    if (getNumber(criterionForm.max_score) <= 0) {
      showFeedback(
        'warning',
        isArabic ? 'درجة المعيار يجب أن تكون أكبر من صفر.' : 'Criterion max score must be greater than zero.'
      );
      return;
    }

    setTemplateForm((current) => {
      const normalizedCriterion = {
        ...criterionForm,
        localId: criterionForm.localId || Date.now(),
        weight: getNumber(criterionForm.weight),
        max_score: getNumber(criterionForm.max_score),
        sort_order: getNumber(criterionForm.sort_order, current.criteria.length + 1),
        is_required: Boolean(criterionForm.is_required),
      };

      const nextCriteria = editingCriterionLocalId
        ? current.criteria.map((item) =>
            item.localId === editingCriterionLocalId ? normalizedCriterion : item
          )
        : [...current.criteria, normalizedCriterion];

      return {
        ...current,
        criteria: nextCriteria
          .sort((a, b) => getNumber(a.sort_order) - getNumber(b.sort_order))
          .map((item, index) => ({ ...item, sort_order: index + 1 })),
      };
    });

    closeCriterionModal();
  };

  const handleRemoveCriterion = (localId) => {
    setTemplateForm((current) => ({
      ...current,
      criteria: current.criteria
        .filter((criterion) => criterion.localId !== localId)
        .map((criterion, index) => ({ ...criterion, sort_order: index + 1 })),
    }));
  };

  const handleResetDefaultCriteria = () => {
    setTemplateForm((current) => ({
      ...current,
      criteria: DEFAULT_CRITERIA.map((item) => ({ ...item })),
    }));
  };

  const handleSaveTemplate = async (event) => {
    event.preventDefault();

    if (templateValidation) {
      showFeedback('warning', templateValidation);
      return;
    }

    try {
      setSavingTemplate(true);

      const payload = {
        internship_id: Number(selectedContext.internshipId),
        student_user_id: Number(selectedContext.studentUserId),
        provider_name: selectedContext.providerName,
        provider_email: selectedContext.providerEmail,
        title: templateForm.title,
        version: templateForm.version,
        status: templateForm.status,
        created_by_user_id: Number(user?.id || user?.user_id || user?.userId || 0),
        criteria: templateForm.criteria.map((criterion, index) => ({
          criterion_name: criterion.criterion_name,
          question: criterion.question,
          weight: getNumber(criterion.weight),
          max_score: getNumber(criterion.max_score),
          sort_order: index + 1,
          is_required: Boolean(criterion.is_required),
        })),
      };

      const response = await createCompanyEvaluationTemplateRequest(payload);
      const createdTemplate = {
        id: response?.id || Date.now(),
        internship_id: payload.internship_id,
        student_user_id: payload.student_user_id,
        provider_name: payload.provider_name,
        provider_email: payload.provider_email,
        title: payload.title,
        version: payload.version,
        status: payload.status,
        token: response?.token,
        created_by_user_id: payload.created_by_user_id,
        created_at: new Date().toISOString(),
      };

      setTemplates((current) => [createdTemplate, ...current]);
      setTemplateCriteriaMap((current) => ({
        ...current,
        [createdTemplate.id]: payload.criteria.map((criterion, index) => ({
          ...criterion,
          id: `${createdTemplate.id}-${index + 1}`,
          template_id: createdTemplate.id,
        })),
      }));

      await loadSelectedInternshipData(selectedContext.internshipId);
      await loadResultRows(studentContexts);

      closeTemplateModal();

      showFeedback(
        'success',
        isArabic
          ? 'تم حفظ قالب التقييم وظهوره في الصفحة بنجاح.'
          : 'Evaluation template was saved and displayed successfully.'
      );
    } catch (error) {
      showFeedback('danger', error.message || 'Failed to save evaluation template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const resultColumns = [
    ...(isStudent
      ? []
      : [
          {
            key: 'studentName',
            label: isArabic ? 'الطالب' : 'Student',
            render: (value) => <strong className="ims-eval-primary-text">{value || '-'}</strong>,
            exportValue: (row) => row.studentName,
          },
        ]),
    {
      key: 'providerName',
      label: isArabic ? 'الشركة' : 'Provider',
      render: (value) => value || '-',
    },
    {
      key: 'internshipTitle',
      label: isArabic ? 'التدريب' : 'Internship',
      render: (value) => value || '-',
    },
    {
      key: 'companyStatus',
      label: isArabic ? 'حالة الشركة' : 'Company Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.companyStatus, isArabic),
      filterValue: (row) => getStatusLabel(row.companyStatus, isArabic),
    },
    {
      key: 'companyScore',
      label: isArabic ? 'تقييم الشركة' : 'Company Score',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    {
      key: 'academicStatus',
      label: isArabic ? 'حالة المشرف' : 'Academic Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.academicStatus, isArabic),
      filterValue: (row) => getStatusLabel(row.academicStatus, isArabic),
    },
    {
      key: 'academicScore',
      label: isArabic ? 'تقييم المشرف' : 'Academic Score',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    {
      key: 'finalAverage',
      label: isArabic ? 'المتوسط النهائي' : 'Final Average',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    {
      key: 'finalStatus',
      label: isArabic ? 'الحالة النهائية' : 'Final Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.finalStatus, isArabic),
      filterValue: (row) => getStatusLabel(row.finalStatus, isArabic),
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <button
          type="button"
          className="ims-eval-row-btn"
          onClick={() => {
            setSelectedInternshipId(String(row.internship_id));
            setSelectedRecord({ type: 'result', ...row });
          }}
        >
          <SvgIcon name="eye" size={16} />
          {isArabic ? 'التفاصيل' : 'Details'}
        </button>
      ),
    },
  ];

  const templateColumns = [
    {
      key: 'title',
      label: isArabic ? 'القالب' : 'Template',
      render: (value) => <strong className="ims-eval-primary-text">{value || '-'}</strong>,
    },
    { key: 'version', label: isArabic ? 'الإصدار' : 'Version' },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
    {
      key: 'created_at',
      label: isArabic ? 'تاريخ الإنشاء' : 'Created At',
      render: (value) => formatDate(value, locale),
      exportValue: (row) => formatDate(row.created_at, locale),
    },
    {
      key: 'criteria',
      label: isArabic ? 'المعايير' : 'Criteria',
      render: (_, row) => templateCriteriaMap[row.id]?.length || 0,
      exportValue: (row) => templateCriteriaMap[row.id]?.length || 0,
      filterValue: (row) => templateCriteriaMap[row.id]?.length || 0,
    },
    {
      key: 'actions',
      label: '',
      isAction: true,
      render: (_, row) => (
        <div className="ims-eval-row-actions">
          <button
            type="button"
            className="ims-eval-row-btn"
            onClick={() => setSelectedRecord({ type: 'template', ...row, criteria: templateCriteriaMap[row.id] || [] })}
          >
            <SvgIcon name="eye" size={16} />
            {isArabic ? 'عرض' : 'View'}
          </button>
          {canManage ? (
            <button type="button" className="ims-eval-row-btn secondary" onClick={() => openEditTemplateModal(row)}>
              <SvgIcon name="edit" size={16} />
              {isArabic ? 'تعديل' : 'Edit'}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const companyColumns = [
    {
      key: 'studentName',
      label: isArabic ? 'الطالب' : 'Student',
      render: (value) => <strong className="ims-eval-primary-text">{value || '-'}</strong>,
    },
    { key: 'providerName', label: isArabic ? 'الشركة' : 'Provider' },
    { key: 'evaluatorName', label: isArabic ? 'المقيّم' : 'Evaluator' },
    { key: 'submittedAt', label: isArabic ? 'تاريخ الإرسال' : 'Submitted At' },
    {
      key: 'totalPercentage',
      label: isArabic ? 'النسبة' : 'Percentage',
      render: (value) => (value === '-' ? '-' : `${value}%`),
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
  ];

  const academicColumns = [
    {
      key: 'studentName',
      label: isArabic ? 'الطالب' : 'Student',
      render: (value) => <strong className="ims-eval-primary-text">{value || '-'}</strong>,
    },
    { key: 'evaluatorName', label: isArabic ? 'المقيّم' : 'Evaluator' },
    { key: 'submittedAt', label: isArabic ? 'تاريخ الإرسال' : 'Submitted At' },
    {
      key: 'totalPercentage',
      label: isArabic ? 'النسبة' : 'Percentage',
      render: (value) => (value === '-' ? '-' : `${value}%`),
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (value) => <StatusPill value={value} isArabic={isArabic} />,
      exportValue: (row) => getStatusLabel(row.status, isArabic),
      filterValue: (row) => getStatusLabel(row.status, isArabic),
    },
  ];

  const overviewStats = [
    {
      label: isArabic ? 'قوالب التقييم' : 'Templates',
      value: formatNumber(templates.length, locale),
      helper: isArabic ? 'للتدريب المحدد' : 'For selected internship',
      icon: 'template',
      tone: 'teal',
    },
    {
      label: isArabic ? 'تقييمات الشركة' : 'Company Evaluations',
      value: formatNumber(companyEvaluationRows.length, locale),
      helper: isArabic ? 'المستلمة من الشركة' : 'Submitted by provider',
      icon: 'company',
      tone: 'blue',
    },
    {
      label: isArabic ? 'تقييمات المشرف' : 'Academic Evaluations',
      value: formatNumber(academicEvaluationRows.length, locale),
      helper: isArabic ? 'المحفوظة من المشرف' : 'Saved by advisor',
      icon: 'academic',
      tone: 'purple',
    },
    {
      label: isArabic ? 'المتوسط النهائي' : 'Final Average',
      value: selectedFinalAverage === null || selectedFinalAverage === undefined ? '-' : `${selectedFinalAverage}%`,
      helper: isArabic ? 'الشركة 50% + المشرف 50%' : 'Company 50% + Academic 50%',
      icon: 'star',
      tone: 'green',
    },
  ];

  return (
    <div className="ims-eval-page">
      <style>{`
        .ims-eval-page {
          position: relative;
          min-height: 100%;
          color: #10243f;
          padding-bottom: 1.5rem;
        }

        .ims-eval-page::before {
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

        .ims-eval-page > * {
          position: relative;
          z-index: 1;
        }

        .ims-eval-hero,
        .ims-eval-kpi-card,
        .ims-eval-panel,
        .ims-eval-table-card,
        .ims-eval-summary-card,
        .ims-eval-criteria-card {
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(230,238,246,0.98);
          box-shadow: 0 14px 36px rgba(16,36,63,0.07);
          backdrop-filter: blur(10px);
        }

        .ims-eval-hero {
          overflow: hidden;
          border-radius: 30px;
          padding: 1.4rem 1.55rem;
          margin-bottom: 1rem;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1.2rem;
        }

        .ims-eval-hero-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ims-eval-hero-icon {
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

        .ims-eval-hero h1 {
          margin: 0 0 .35rem;
          font-size: clamp(2rem, 3vw, 2.8rem);
          font-weight: 900;
          letter-spacing: -0.055em;
          color: #10243f;
        }

        .ims-eval-hero p {
          margin: 0;
          max-width: 920px;
          color: #637894;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.8;
        }

        .ims-eval-hero-actions {
          display: flex;
          align-items: center;
          gap: .65rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .ims-eval-primary-btn,
        .ims-eval-secondary-btn,
        .ims-eval-danger-btn,
        .ims-eval-row-btn {
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
        }

        .ims-eval-primary-btn {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 30px rgba(7,150,166,.18);
        }

        .ims-eval-secondary-btn,
        .ims-eval-row-btn {
          color: #243b5a;
          background: #fff;
          border-color: #dfeaf3;
        }

        .ims-eval-row-btn {
          min-height: 34px;
          border-radius: 12px;
          font-size: .78rem;
          padding: 0 .7rem;
        }

        .ims-eval-row-btn.secondary {
          color: #0796a6;
          background: #f4fbfc;
        }

        .ims-eval-danger-btn {
          color: #c02c3f;
          background: #ffedf0;
          border-color: rgba(255,90,107,.2);
        }

        .ims-eval-secondary-btn:disabled,
        .ims-eval-primary-btn:disabled,
        .ims-eval-row-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .ims-eval-feedback {
          min-height: 48px;
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

        .ims-eval-feedback button {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 12px;
          background: rgba(255,255,255,.65);
          color: currentColor;
        }

        .ims-eval-feedback-success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24,197,143,.24);
        }

        .ims-eval-feedback-warning {
          color: #a4660b;
          background: #fff4dc;
          border-color: rgba(244,166,42,.24);
        }

        .ims-eval-feedback-danger {
          color: #b42335;
          background: #ffedf0;
          border-color: rgba(255,90,107,.24);
        }

        .ims-eval-feedback-info {
          color: #1f65c8;
          background: #e8f1ff;
          border-color: rgba(59,130,246,.2);
        }

        .ims-eval-tabs {
          display: flex;
          align-items: center;
          gap: .65rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .ims-eval-tabs button {
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

        .ims-eval-tabs button.active {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          border-color: transparent;
          box-shadow: 0 10px 24px rgba(7,150,166,.16);
        }

        .ims-eval-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-eval-kpi-card {
          min-height: 126px;
          border-radius: 25px;
          padding: 1.15rem;
          display: flex;
          align-items: center;
          gap: .9rem;
        }

        .ims-eval-kpi-icon {
          width: 60px;
          height: 60px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          flex-shrink: 0;
        }

        .ims-eval-kpi-teal .ims-eval-kpi-icon { color: #0796a6; background: #e2fafa; }
        .ims-eval-kpi-blue .ims-eval-kpi-icon { color: #3b82f6; background: #e8f1ff; }
        .ims-eval-kpi-purple .ims-eval-kpi-icon { color: #5b65f1; background: #eef0ff; }
        .ims-eval-kpi-green .ims-eval-kpi-icon { color: #18bd87; background: #e7fbf3; }

        .ims-eval-kpi-card span {
          display: block;
          color: #5e718d;
          font-size: .86rem;
          font-weight: 850;
          margin-bottom: .35rem;
        }

        .ims-eval-kpi-card strong {
          display: block;
          color: #10243f;
          font-size: 1.9rem;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.04em;
        }

        .ims-eval-kpi-card em {
          display: block;
          margin-top: .35rem;
          color: #7a8aa5;
          font-size: .78rem;
          font-style: normal;
          font-weight: 750;
        }

        .ims-eval-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 1rem;
          align-items: start;
          margin-bottom: 1rem;
        }

        .ims-eval-panel,
        .ims-eval-summary-card {
          border-radius: 26px;
          padding: 1.1rem;
        }

        .ims-eval-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-eval-section-head h2 {
          margin: 0 0 .25rem;
          color: #10243f;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: -.02em;
        }

        .ims-eval-section-head p {
          margin: 0;
          color: #7a8aa5;
          font-size: .84rem;
          font-weight: 700;
          line-height: 1.55;
        }

        .ims-eval-context-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: .8rem;
        }

        .ims-eval-field label,
        .ims-eval-modal-card label {
          display: block;
          margin-bottom: .35rem;
          color: #5e718d;
          font-size: .82rem;
          font-weight: 850;
        }

        .ims-eval-input,
        .ims-eval-select,
        .ims-eval-textarea {
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

        .ims-eval-textarea {
          min-height: 120px;
          resize: vertical;
        }

        .ims-eval-input:focus,
        .ims-eval-select:focus,
        .ims-eval-textarea:focus {
          border-color: rgba(20,200,195,.72);
          box-shadow: 0 0 0 .18rem rgba(20,200,195,.11);
          background: #fff;
        }

        .ims-eval-detail-box {
          min-height: 74px;
          border: 1px solid #edf3f8;
          border-radius: 18px;
          background: #fbfdff;
          padding: .8rem .9rem;
        }

        .ims-eval-detail-box span {
          display: block;
          margin-bottom: .35rem;
          color: #7a8aa5;
          font-size: .78rem;
          font-weight: 850;
        }

        .ims-eval-detail-box strong {
          color: #243b5a;
          font-size: .92rem;
          font-weight: 900;
          word-break: break-word;
        }

        .ims-eval-summary-card {
          text-align: center;
        }

        .ims-eval-score-ring {
          position: relative;
          margin: 0 auto;
        }

        .ims-eval-score-ring svg {
          display: block;
        }

        .ims-eval-score-ring-label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .ims-eval-score-ring-label strong {
          color: #10243f;
          font-size: 1.35rem;
          line-height: 1;
          font-weight: 900;
        }

        .ims-eval-score-ring-label span {
          margin-top: .25rem;
          color: #637894;
          font-size: .74rem;
          font-weight: 850;
        }

        .ims-eval-summary-list {
          display: grid;
          gap: .65rem;
          margin-top: 1rem;
        }

        .ims-eval-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .8rem;
          border: 1px solid #edf3f8;
          border-radius: 16px;
          background: #fbfdff;
          padding: .7rem .75rem;
        }

        .ims-eval-summary-row span {
          color: #7a8aa5;
          font-size: .78rem;
          font-weight: 850;
        }

        .ims-eval-summary-row strong {
          color: #243b5a;
          font-size: .9rem;
          font-weight: 900;
        }

        .ims-eval-table-card {
          border-radius: 26px;
          overflow: hidden;
        }

        .ims-eval-table-top {
          min-height: 68px;
          padding: .9rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid #edf3f8;
          background: #fff;
        }

        .ims-eval-table-top strong {
          display: block;
          color: #243b5a;
          font-size: .9rem;
          font-weight: 900;
        }

        .ims-eval-table-top span {
          display: block;
          margin-top: .15rem;
          color: #7a8aa5;
          font-size: .78rem;
          font-weight: 750;
        }

        .ims-eval-table-wrap {
          overflow: auto;
        }

        .ims-eval-table {
          width: 100%;
          min-width: 1040px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .ims-eval-table th {
          padding: .8rem .7rem;
          border-bottom: 1px solid #edf3f8;
          background: #fff;
        }

        .ims-eval-table td {
          padding: .86rem .9rem;
          border-bottom: 1px solid #edf3f8;
          color: #243b5a;
          font-size: .86rem;
          font-weight: 750;
          vertical-align: middle;
        }

        .ims-eval-table tr:hover td {
          background: #fbfdff;
        }

        .ims-eval-primary-text {
          color: #10243f;
          font-weight: 900;
        }

        .ims-eval-table-filter {
          position: relative;
        }

        .ims-eval-table-filter svg {
          position: absolute;
          inset-inline-start: .65rem;
          top: 50%;
          transform: translateY(-50%);
          color: #8fa0b6;
        }

        .ims-eval-table-filter input {
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

        .ims-eval-table-filter input:focus {
          border-color: rgba(20,200,195,.72);
          box-shadow: 0 0 0 .16rem rgba(20,200,195,.10);
          background: #fff;
        }

        .ims-eval-row-actions {
          display: flex;
          gap: .45rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .ims-eval-pagination {
          min-height: 58px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: .55rem;
          padding: .75rem 1rem;
          background: #fff;
        }

        .ims-eval-pagination button {
          width: 34px;
          height: 34px;
          border: 1px solid #dfeaf3;
          border-radius: 12px;
          color: #243b5a;
          background: #fff;
          font-weight: 900;
        }

        .ims-eval-pagination button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .ims-eval-pagination span {
          color: #7a8aa5;
          font-size: .84rem;
          font-weight: 850;
        }

        .ims-eval-status {
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

        .ims-eval-status::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: currentColor;
        }

        .ims-eval-status-success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24,197,143,.22);
        }

        .ims-eval-status-warning {
          color: #a4660b;
          background: #fff4dc;
          border-color: rgba(244,166,42,.24);
        }

        .ims-eval-status-danger {
          color: #c02c3f;
          background: #ffedf0;
          border-color: rgba(255,90,107,.24);
        }

        .ims-eval-status-info {
          color: #1f65c8;
          background: #e8f1ff;
          border-color: rgba(59,130,246,.2);
        }

        .ims-eval-empty,
        .ims-eval-empty-panel {
          min-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a8aa5;
          font-size: .9rem;
          font-weight: 850;
          text-align: center;
          border: 1px dashed #d6e4ee;
          border-radius: 20px;
          background: #fbfdff;
        }

        .ims-eval-empty-panel {
          min-height: 280px;
          border-radius: 28px;
          background: rgba(255,255,255,.95);
          box-shadow: 0 14px 36px rgba(16,36,63,.07);
        }

        .ims-eval-results-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }

        .ims-eval-readiness-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: center;
          border: 1px solid #edf3f8;
          border-radius: 22px;
          padding: 1rem;
          background: #fbfdff;
        }

        .ims-eval-readiness-card span {
          display: block;
          color: #5e718d;
          font-size: .85rem;
          font-weight: 850;
          margin-bottom: .35rem;
        }

        .ims-eval-readiness-card strong {
          display: block;
          color: #10243f;
          font-size: 2rem;
          line-height: 1;
          font-weight: 900;
        }

        .ims-eval-readiness-card em {
          display: block;
          margin-top: .35rem;
          color: #7a8aa5;
          font-style: normal;
          font-size: .78rem;
          font-weight: 750;
        }

        .ims-eval-readiness-meta {
          grid-column: 1 / -1;
          border-top: 1px solid #edf3f8;
          padding-top: .85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ims-eval-criteria-list {
          display: grid;
          gap: .75rem;
        }

        .ims-eval-criteria-card {
          border-radius: 20px;
          padding: .9rem;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 1rem;
        }

        .ims-eval-criteria-card h4 {
          margin: 0 0 .25rem;
          color: #10243f;
          font-size: .94rem;
          font-weight: 900;
        }

        .ims-eval-criteria-card p {
          margin: 0;
          color: #7a8aa5;
          font-size: .8rem;
          font-weight: 700;
          line-height: 1.55;
        }

        .ims-eval-criteria-meta {
          display: flex;
          align-items: center;
          gap: .45rem;
          flex-wrap: wrap;
          margin-top: .55rem;
        }

        .ims-eval-badge {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: .3rem .62rem;
          border-radius: 999px;
          color: #243b5a;
          background: #f2f6fb;
          font-size: .72rem;
          font-weight: 900;
        }

        .ims-eval-badge.success {
          color: #0d8a64;
          background: #e7fbf3;
        }

        .ims-eval-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2050;
          background: rgba(7, 31, 53, .55);
          backdrop-filter: blur(6px);
        }

        .ims-eval-modal-shell {
          position: fixed;
          inset: 0;
          z-index: 2060;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          overflow: auto;
        }

        .ims-eval-modal-card {
          width: min(880px, 100%);
          max-height: min(92vh, 920px);
          display: flex;
          flex-direction: column;
          border-radius: 28px;
          border: 1px solid #dfeaf3;
          background: #fff;
          box-shadow: 0 30px 90px rgba(7,31,53,.24);
          overflow: hidden;
        }

        .ims-eval-modal-xl {
          width: min(1120px, 100%);
        }

        .ims-eval-modal-sm {
          width: min(620px, 100%);
        }

        .ims-eval-modal-header {
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

        .ims-eval-modal-header h3 {
          margin: 0 0 .25rem;
          color: #10243f;
          font-size: 1.12rem;
          font-weight: 900;
        }

        .ims-eval-modal-header p {
          margin: 0;
          color: #7a8aa5;
          font-size: .84rem;
          font-weight: 700;
          line-height: 1.55;
        }

        .ims-eval-modal-header button {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 14px;
          color: #243b5a;
          background: #f4f7fb;
          flex-shrink: 0;
        }

        .ims-eval-modal-body {
          overflow: auto;
          padding: 1.15rem;
        }

        .ims-eval-form-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: .85rem;
        }

        .ims-eval-col-3 { grid-column: span 3; }
        .ims-eval-col-4 { grid-column: span 4; }
        .ims-eval-col-6 { grid-column: span 6; }
        .ims-eval-col-9 { grid-column: span 9; }
        .ims-eval-col-12 { grid-column: span 12; }

        .ims-eval-modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: .65rem;
          flex-wrap: wrap;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #edf3f8;
        }

        @media (max-width: 1199.98px) {
          .ims-eval-kpi-grid,
          .ims-eval-layout,
          .ims-eval-results-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ims-eval-summary-card {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 991.98px) {
          .ims-eval-hero,
          .ims-eval-layout,
          .ims-eval-results-grid {
            grid-template-columns: 1fr;
          }

          .ims-eval-hero-actions {
            justify-content: flex-start;
          }

          .ims-eval-context-grid {
            grid-template-columns: 1fr;
          }

          .ims-eval-col-3,
          .ims-eval-col-4,
          .ims-eval-col-6,
          .ims-eval-col-9 {
            grid-column: span 12;
          }
        }

        @media (max-width: 767.98px) {
          .ims-eval-hero-title,
          .ims-eval-table-top,
          .ims-eval-section-head,
          .ims-eval-criteria-card {
            align-items: stretch;
            flex-direction: column;
            display: flex;
          }

          .ims-eval-kpi-grid {
            grid-template-columns: 1fr;
          }

          .ims-eval-readiness-card {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }
      `}</style>

      <section className="ims-eval-hero">
        <div className="ims-eval-hero-title">
          <div className="ims-eval-hero-icon">
            <SvgIcon name="evaluation" size={40} />
          </div>
          <div>
            <h1>{isArabic ? 'التقييمات' : 'Evaluation'}</h1>
            <p>
              {isStudent
                ? isArabic
                  ? 'راجع تقييم الشركة، تقييم المشرف الأكاديمي، والمتوسط النهائي من واجهة واحدة واضحة.'
                  : 'Review your company evaluation, academic evaluation, and final average from one clear interface.'
                : isArabic
                  ? 'أنشئ قوالب تقييم احترافية، أدر المعايير، وراجع نتائج الطلاب بناءً على بيانات فعلية.'
                  : 'Build professional evaluation templates, manage criteria, and review student results based on live data.'}
            </p>
          </div>
        </div>

        <div className="ims-eval-hero-actions">
          <button type="button" className="ims-eval-secondary-btn" onClick={reloadEverything} disabled={loading}>
            <SvgIcon name="refresh" size={18} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </button>

          {canManage && activeTab === 'templates' ? (
            <button type="button" className="ims-eval-primary-btn" onClick={openAddTemplateModal}>
              <SvgIcon name="plus" size={18} />
              {isArabic ? 'إضافة قالب تقييم' : 'Add Evaluation Template'}
            </button>
          ) : null}
        </div>
      </section>

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} isArabic={isArabic} />
      {errorMessage ? (
        <div className="ims-eval-feedback ims-eval-feedback-danger">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')}>
            <SvgIcon name="close" size={16} />
          </button>
        </div>
      ) : null}

      <div className="ims-eval-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            <SvgIcon name={tab.key === 'templates' ? 'template' : 'results'} size={18} />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {loading ? <EmptyPanel>{isArabic ? 'جارٍ تحميل بيانات التقييم...' : 'Loading evaluation data...'}</EmptyPanel> : null}

      {!loading ? (
        <>
          <section className="ims-eval-kpi-grid">
            {overviewStats.map((item) => (
              <KpiCard key={item.label} {...item} />
            ))}
          </section>

          <section className="ims-eval-layout">
            <div className="ims-eval-panel">
              <div className="ims-eval-section-head">
                <div>
                  <h2>{isArabic ? 'سياق التقييم' : 'Evaluation Context'}</h2>
                  <p>
                    {canManage
                      ? isArabic
                        ? 'اختر الطالب والتدريب لعرض القوالب والنتائج المرتبطة به.'
                        : 'Select a student and internship to view related templates and results.'
                      : isArabic
                        ? 'بيانات التدريب المرتبطة بحسابك الحالي.'
                        : 'Internship data linked to your current account.'}
                  </p>
                </div>
              </div>

              <div className="ims-eval-context-grid">
                {canManage ? (
                  <div className="ims-eval-field" style={{ gridColumn: '1 / -1' }}>
                    <label>{isArabic ? 'اختر الطالب / التدريب' : 'Select Student / Internship'}</label>
                    <select
                      className="ims-eval-select"
                      value={selectedInternshipId}
                      onChange={(event) => setSelectedInternshipId(event.target.value)}
                    >
                      <option value="">
                        {isArabic ? 'اختر تدريبًا...' : 'Select an internship...'}
                      </option>
                      {studentContexts.map((context) => (
                        <option key={context.internshipId} value={context.internshipId}>
                          {context.studentName} — {context.providerName} — {context.internshipTitle}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="ims-eval-detail-box">
                  <span>{isArabic ? 'الطالب' : 'Student'}</span>
                  <strong>{selectedContext?.studentName || '-'}</strong>
                </div>
                <div className="ims-eval-detail-box">
                  <span>{isArabic ? 'جهة التدريب' : 'Training Provider'}</span>
                  <strong>{selectedContext?.providerName || '-'}</strong>
                </div>
                <div className="ims-eval-detail-box">
                  <span>{isArabic ? 'عنوان التدريب' : 'Internship Title'}</span>
                  <strong>{selectedContext?.internshipTitle || '-'}</strong>
                </div>
                <div className="ims-eval-detail-box">
                  <span>{isArabic ? 'بريد الشركة' : 'Provider Email'}</span>
                  <strong>{selectedContext?.providerEmail || '-'}</strong>
                </div>
              </div>
            </div>

            <div className="ims-eval-summary-card">
              <div className="ims-eval-section-head">
                <div>
                  <h2>{isArabic ? 'النتيجة النهائية' : 'Final Score'}</h2>
                  <p>{isArabic ? 'الشركة 50% + المشرف 50%' : 'Company 50% + Academic 50%'}</p>
                </div>
              </div>

              <ScoreRing
                value={selectedFinalAverage}
                label={selectedFinalAverage === null || selectedFinalAverage === undefined ? '-' : `${selectedFinalAverage}%`}
                subLabel={isArabic ? 'المتوسط' : 'Average'}
              />

              <div className="ims-eval-summary-list">
                <div className="ims-eval-summary-row">
                  <span>{isArabic ? 'تقييم الشركة' : 'Company Score'}</span>
                  <strong>{selectedCompanyScore === null || selectedCompanyScore === undefined ? '-' : `${selectedCompanyScore}%`}</strong>
                </div>
                <div className="ims-eval-summary-row">
                  <span>{isArabic ? 'تقييم المشرف' : 'Academic Score'}</span>
                  <strong>{selectedAcademicScore === null || selectedAcademicScore === undefined ? '-' : `${selectedAcademicScore}%`}</strong>
                </div>
                <div className="ims-eval-summary-row">
                  <span>{isArabic ? 'الحالة' : 'Status'}</span>
                  <StatusPill value={selectedFinalStatus} isArabic={isArabic} />
                </div>
              </div>
            </div>
          </section>

          {activeTab === 'templates' && canManage ? (
            <section className="ims-eval-panel">
              <div className="ims-eval-section-head">
                <div>
                  <h2>{isArabic ? 'قوالب تقييم الشركة' : 'Company Evaluation Templates'}</h2>
                  <p>
                    {isArabic
                      ? 'أنشئ القالب وعدّل المعايير من مودالات واضحة فوق الصفحة.'
                      : 'Create templates and edit criteria through clean overlay modals.'}
                  </p>
                </div>
                <button type="button" className="ims-eval-primary-btn" onClick={openAddTemplateModal}>
                  <SvgIcon name="plus" size={18} />
                  {isArabic ? 'إضافة قالب' : 'Add Template'}
                </button>
              </div>

              <DataTable
                columns={templateColumns}
                rows={templates}
                rowKey="id"
                isArabic={isArabic}
                exportName="evaluation-templates.csv"
                emptyMessage={isArabic ? 'لا توجد قوالب للتدريب المحدد.' : 'No templates have been created for the selected internship yet.'}
              />
            </section>
          ) : null}

          {activeTab === 'results' ? (
            <section className="ims-eval-panel">
              <div className="ims-eval-section-head">
                <div>
                  <h2>{isArabic ? 'نتائج تقييم الطلاب' : 'Student Evaluation Results'}</h2>
                  <p>
                    {isArabic
                      ? 'المتوسط النهائي يحتسب بناءً على تقييم الشركة 50% وتقييم المشرف 50%.'
                      : 'Final average is calculated using Company Evaluation 50% + Academic Evaluation 50%.'}
                  </p>
                </div>
              </div>

              <DataTable
                columns={resultColumns}
                rows={resultRows}
                rowKey="id"
                isArabic={isArabic}
                exportName="evaluation-results.csv"
                emptyMessage={isArabic ? 'لا توجد نتائج تقييم.' : 'No evaluation results found.'}
              />

              {selectedContext ? (
                <div className="ims-eval-results-grid">
                  <div>
                    <div className="ims-eval-section-head mt-3">
                      <div>
                        <h2>{isArabic ? 'تقييم الشركة للطالب المحدد' : 'Company Evaluation for Selected Student'}</h2>
                        <p>{isArabic ? 'سجلات التقييم المرسلة من الشركة.' : 'Company-submitted evaluation records.'}</p>
                      </div>
                    </div>

                    <DataTable
                      columns={companyColumns}
                      rows={companyEvaluationRows}
                      rowKey="id"
                      isArabic={isArabic}
                      exportName="company-evaluations.csv"
                      emptyMessage={isArabic ? 'لا يوجد تقييم شركة لهذا الطالب.' : 'No company evaluation has been submitted for the selected student.'}
                    />
                  </div>

                  <div>
                    <div className="ims-eval-section-head mt-3">
                      <div>
                        <h2>{isArabic ? 'تقييم المشرف الأكاديمي' : 'Academic Advisor Evaluation'}</h2>
                        <p>{isArabic ? 'سجلات تقييم المشرف لهذا التدريب.' : 'Academic advisor evaluation records.'}</p>
                      </div>
                    </div>

                    <DataTable
                      columns={academicColumns}
                      rows={academicEvaluationRows}
                      rowKey="id"
                      isArabic={isArabic}
                      exportName="academic-evaluations.csv"
                      emptyMessage={isArabic ? 'لا يوجد تقييم مشرف لهذا الطالب.' : 'No academic advisor evaluation has been saved for the selected student.'}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}

      <OverlayModal
        isOpen={isTemplateModalOpen}
        title={editingTemplate ? (isArabic ? 'تعديل قالب التقييم' : 'Edit Evaluation Template') : (isArabic ? 'إضافة قالب تقييم' : 'Add Evaluation Template')}
        subtitle={isArabic ? 'أدر بيانات القالب والمعايير من نفس النافذة.' : 'Manage template details and criteria from the same window.'}
        onClose={closeTemplateModal}
        size="xl"
      >
        <form onSubmit={handleSaveTemplate} className="d-grid gap-3">
          <div className="ims-eval-form-grid">
            <div className="ims-eval-field ims-eval-col-6">
              <label>{isArabic ? 'اسم القالب' : 'Template Title'}</label>
              <input
                className="ims-eval-input"
                value={templateForm.title}
                onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-3">
              <label>{isArabic ? 'الإصدار' : 'Version'}</label>
              <input
                className="ims-eval-input"
                value={templateForm.version}
                onChange={(event) => setTemplateForm((current) => ({ ...current, version: event.target.value }))}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-3">
              <label>{isArabic ? 'الحالة' : 'Status'}</label>
              <select
                className="ims-eval-select"
                value={templateForm.status}
                onChange={(event) => setTemplateForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="Active">{t('Active')}</option>
                <option value="Draft">{t('Draft')}</option>
                <option value="Archived">{t('Archived')}</option>
              </select>
            </div>

            <div className="ims-eval-col-12">
              <CriteriaReadiness totalWeight={totalWeight} totalMaxScore={totalMaxScore} isArabic={isArabic} />
            </div>
          </div>

          {templateValidation ? (
            <div className="ims-eval-feedback ims-eval-feedback-warning">
              <span>{templateValidation}</span>
            </div>
          ) : null}

          <div className="ims-eval-section-head">
            <div>
              <h2>{isArabic ? 'معايير التقييم' : 'Evaluation Criteria'}</h2>
              <p>{isArabic ? 'أضف أو عدّل أو احذف معايير التقييم.' : 'Add, edit, or remove evaluation criteria.'}</p>
            </div>
            <div className="ims-eval-row-actions">
              <button type="button" className="ims-eval-secondary-btn" onClick={handleResetDefaultCriteria}>
                <SvgIcon name="refresh" size={17} />
                {isArabic ? 'استعادة الافتراضي' : 'Reset Default'}
              </button>
              <button type="button" className="ims-eval-primary-btn" onClick={openAddCriterionModal}>
                <SvgIcon name="plus" size={17} />
                {isArabic ? 'إضافة معيار' : 'Add Criterion'}
              </button>
            </div>
          </div>

          <div className="ims-eval-criteria-list">
            {templateForm.criteria.length ? (
              templateForm.criteria.map((criterion) => (
                <div className="ims-eval-criteria-card" key={criterion.localId}>
                  <div>
                    <h4>{criterion.sort_order}. {criterion.criterion_name}</h4>
                    <p>{criterion.question || (isArabic ? 'لا يوجد وصف لهذا المعيار.' : 'No description for this criterion.')}</p>
                    <div className="ims-eval-criteria-meta">
                      <span className="ims-eval-badge">{isArabic ? 'الوزن' : 'Weight'}: {criterion.weight}%</span>
                      <span className="ims-eval-badge">{isArabic ? 'الدرجة' : 'Max'}: {criterion.max_score}</span>
                      {criterion.is_required ? <span className="ims-eval-badge success">{isArabic ? 'إلزامي' : 'Required'}</span> : null}
                    </div>
                  </div>
                  <div className="ims-eval-row-actions">
                    <button type="button" className="ims-eval-row-btn secondary" onClick={() => openEditCriterionModal(criterion)}>
                      <SvgIcon name="edit" size={16} />
                      {isArabic ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="ims-eval-danger-btn"
                      onClick={() => handleRemoveCriterion(criterion.localId)}
                      disabled={templateForm.criteria.length === 1}
                    >
                      <SvgIcon name="trash" size={16} />
                      {isArabic ? 'حذف' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="ims-eval-empty">{isArabic ? 'لا توجد معايير بعد.' : 'No criteria have been added yet.'}</div>
            )}
          </div>

          <div className="ims-eval-modal-actions">
            <button type="button" className="ims-eval-secondary-btn" onClick={closeTemplateModal}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-eval-primary-btn" disabled={savingTemplate || Boolean(templateValidation)}>
              {savingTemplate
                ? isArabic
                  ? 'جارٍ الحفظ...'
                  : 'Saving...'
                : isArabic
                  ? 'حفظ القالب'
                  : 'Save Template'}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={isCriterionModalOpen}
        title={editingCriterionLocalId ? (isArabic ? 'تعديل معيار التقييم' : 'Edit Evaluation Criterion') : (isArabic ? 'إضافة معيار تقييم' : 'Add Evaluation Criterion')}
        subtitle={isArabic ? 'اضبط اسم المعيار، الوزن، الدرجة، والسؤال.' : 'Configure criterion name, weight, score, and question.'}
        onClose={closeCriterionModal}
        size="sm"
      >
        <form onSubmit={handleSaveCriterion} className="d-grid gap-3">
          <div className="ims-eval-form-grid">
            <div className="ims-eval-field ims-eval-col-12">
              <label>{isArabic ? 'اسم المعيار' : 'Criterion Name'}</label>
              <input
                className="ims-eval-input"
                value={criterionForm.criterion_name}
                onChange={(event) => handleCriterionFormChange('criterion_name', event.target.value)}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-4">
              <label>{isArabic ? 'الوزن %' : 'Weight %'}</label>
              <input
                type="number"
                min="0"
                max="100"
                className="ims-eval-input"
                value={criterionForm.weight}
                onChange={(event) => handleCriterionFormChange('weight', event.target.value)}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-4">
              <label>{isArabic ? 'الدرجة' : 'Max Score'}</label>
              <input
                type="number"
                min="1"
                className="ims-eval-input"
                value={criterionForm.max_score}
                onChange={(event) => handleCriterionFormChange('max_score', event.target.value)}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-4">
              <label>{isArabic ? 'الترتيب' : 'Sort Order'}</label>
              <input
                type="number"
                min="1"
                className="ims-eval-input"
                value={criterionForm.sort_order}
                onChange={(event) => handleCriterionFormChange('sort_order', event.target.value)}
                required
              />
            </div>

            <div className="ims-eval-field ims-eval-col-12">
              <label>{isArabic ? 'سؤال / وصف المعيار' : 'Question / Description'}</label>
              <textarea
                className="ims-eval-textarea"
                value={criterionForm.question}
                onChange={(event) => handleCriterionFormChange('question', event.target.value)}
                placeholder={isArabic ? 'اكتب السؤال الذي سيظهر للمقيّم...' : 'Write the question shown to the evaluator...'}
              />
            </div>

            <div className="ims-eval-field ims-eval-col-12">
              <label className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(criterionForm.is_required)}
                  onChange={(event) => handleCriterionFormChange('is_required', event.target.checked)}
                />
                {isArabic ? 'معيار إلزامي' : 'Required criterion'}
              </label>
            </div>
          </div>

          <div className="ims-eval-modal-actions">
            <button type="button" className="ims-eval-secondary-btn" onClick={closeCriterionModal}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="ims-eval-primary-btn">
              {editingCriterionLocalId
                ? isArabic
                  ? 'حفظ التعديل'
                  : 'Save Changes'
                : isArabic
                  ? 'إضافة المعيار'
                  : 'Add Criterion'}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal
        isOpen={Boolean(selectedRecord)}
        title={selectedRecord?.type === 'template' ? (isArabic ? 'تفاصيل قالب التقييم' : 'Evaluation Template Details') : (isArabic ? 'تفاصيل نتيجة التقييم' : 'Evaluation Result Details')}
        subtitle={isArabic ? 'عرض تفصيلي للسجل المحدد.' : 'Detailed view for the selected record.'}
        onClose={() => setSelectedRecord(null)}
        size="lg"
      >
        {selectedRecord?.type === 'template' ? (
          <div className="d-grid gap-3">
            <div className="ims-eval-context-grid">
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'القالب' : 'Template'}</span>
                <strong>{selectedRecord.title || '-'}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'الإصدار' : 'Version'}</span>
                <strong>{selectedRecord.version || '-'}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'الحالة' : 'Status'}</span>
                <StatusPill value={selectedRecord.status} isArabic={isArabic} />
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'تاريخ الإنشاء' : 'Created At'}</span>
                <strong>{formatDate(selectedRecord.created_at, locale)}</strong>
              </div>
            </div>

            <div className="ims-eval-criteria-list">
              {(selectedRecord.criteria || []).map((criterion, index) => (
                <div key={criterion.id || index} className="ims-eval-criteria-card">
                  <div>
                    <h4>{criterion.criterion_name || criterion.name || '-'}</h4>
                    <p>{criterion.question || criterion.description || '-'}</p>
                    <div className="ims-eval-criteria-meta">
                      <span className="ims-eval-badge">{isArabic ? 'الوزن' : 'Weight'}: {criterion.weight ?? '-'}%</span>
                      <span className="ims-eval-badge">{isArabic ? 'الدرجة' : 'Max'}: {criterion.max_score ?? criterion.weight ?? '-'}</span>
                      <span className="ims-eval-badge">{isArabic ? 'الترتيب' : 'Sort'}: {criterion.sort_order ?? index + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedRecord?.type === 'result' ? (
          <div className="d-grid gap-3">
            <div className="ims-eval-context-grid">
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'الطالب' : 'Student'}</span>
                <strong>{selectedRecord.studentName}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'الشركة' : 'Provider'}</span>
                <strong>{selectedRecord.providerName}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'تقييم الشركة' : 'Company Score'}</span>
                <strong>{selectedRecord.companyScore === null || selectedRecord.companyScore === undefined ? '-' : `${selectedRecord.companyScore}%`}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'تقييم المشرف' : 'Academic Score'}</span>
                <strong>{selectedRecord.academicScore === null || selectedRecord.academicScore === undefined ? '-' : `${selectedRecord.academicScore}%`}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'المتوسط النهائي' : 'Final Average'}</span>
                <strong>{selectedRecord.finalAverage === null || selectedRecord.finalAverage === undefined ? '-' : `${selectedRecord.finalAverage}%`}</strong>
              </div>
              <div className="ims-eval-detail-box">
                <span>{isArabic ? 'الحالة النهائية' : 'Final Status'}</span>
                <StatusPill value={selectedRecord.finalStatus} isArabic={isArabic} />
              </div>
            </div>
          </div>
        ) : null}
      </OverlayModal>
    </div>
  );
}

export default EvaluationModulePage;