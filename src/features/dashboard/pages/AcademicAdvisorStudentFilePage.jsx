import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppModal from '../../../shared/components/AppModal';
import { AuthContext } from '../../../app/providers/AuthProvider';
import ROUTES from '../../../app/router/routePaths';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  createFinalEvaluationRequestRequest,
  getAcademicStudentEvaluationsByInternshipRequest,
  upsertAcademicStudentEvaluationRequest,
  getStudentSkillsRequest,
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getFinalEvaluationRequestsByInternshipRequest,
  getFinalEvaluationSummaryRequest,
  getStudentInternshipContextRequest,
  getStudentDocumentsRequest,
  getStudentProjectsRequest,
  getStudentCoursesRequest,
  getTrainingPlansByInternshipRequest,
  getTrainingTasksByInternshipRequest,
  getWeeklyReportsByInternshipRequest,
} from '../../../app/api/client';

function getStaticFileBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

function resolveDocumentUrl(fileUrl) {
  if (!fileUrl) return '';

  const value = String(fileUrl).trim();
  if (!value) return '';

  if (/^(https?:|blob:|data:)/i.test(value)) return value;

  const staticFileBaseUrl = getStaticFileBaseUrl();

  if (!staticFileBaseUrl) return value;
  if (value.startsWith('/')) return `${staticFileBaseUrl}${value}`;

  return `${staticFileBaseUrl}/${value}`;
}

function getDownloadFileName(fileUrl, fileName) {
  if (fileName) return String(fileName).trim();

  const rawUrl = String(fileUrl || '').split('?')[0];
  const parts = rawUrl.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'student-attachment';
}

async function downloadFileFromUrl(fileUrl, fileName) {
  const resolvedUrl = resolveDocumentUrl(fileUrl);

  if (!resolvedUrl) return;

  const safeFileName = getDownloadFileName(resolvedUrl, fileName);

  try {
    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      throw new Error('Download request failed.');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');

    link.href = objectUrl;
    link.download = safeFileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch {
    const link = window.document.createElement('a');
    link.href = resolvedUrl;
    link.download = safeFileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function normalizeStudentDocument(document) {
  if (!document) return null;

  return {
    id: document.id,
    student_user_id: document.student_user_id ?? document.studentUserId ?? null,
    title: document.title || document.file_title || '',
    file_name: document.file_name || document.fileName || document.name || '',
    file_url: document.file_url || document.fileUrl || document.url || '',
    category: document.category || '',
    file_type: document.file_type || document.fileType || document.type || '',
    status: document.status || '',
    uploaded_at: document.uploaded_at || document.uploadedAt || document.created_at || document.createdAt || '',
    description: document.description || '',
  };
}

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

function buildAcademicEvaluationForm(user, student, context, existingEvaluation) {
  return {
    internshipId: String(context?.internship_id || context?.internshipId || ''),
    studentUserId: String(student?.id || ''),
    advisorUserId: String(user?.id || ''),
    evaluatorName: existingEvaluation?.evaluator_name || user?.fullName || user?.full_name || '',
    evaluationDate:
      existingEvaluation?.evaluation_date ||
      new Date().toISOString().slice(0, 10),
    status: existingEvaluation?.status || 'Pending',
    commitmentScore: String(existingEvaluation?.commitment_score ?? 0),
    communicationScore: String(existingEvaluation?.communication_score ?? 0),
    technicalScore: String(existingEvaluation?.technical_score ?? 0),
    behaviorScore: String(existingEvaluation?.behavior_score ?? 0),
    strengths: existingEvaluation?.strengths || '',
    improvementAreas: existingEvaluation?.improvement_areas || '',
    advisorNotes: existingEvaluation?.advisor_notes || '',
  };
}

function getAdvisorDashboardRoute() {
  return ROUTES?.DASHBOARD?.ACADEMIC_ADVISOR || ROUTES?.ADVISOR_MODULES?.DASHBOARD || '/';
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function formatDate(value, locale, withTime = false) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const options = withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' };

  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function getPercentage(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 0)) * 100);
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function getStatusTone(status) {
  const value = String(status || '').toLowerCase();

  if (['active', 'approved', 'submitted', 'completed', 'accepted', 'has internship', 'نشط', 'معتمد', 'مكتمل'].includes(value)) {
    return 'success';
  }

  if (['pending', 'draft', 'not submitted', 'waiting', 'in review', 'under review', 'بانتظار', 'معلق'].includes(value)) {
    return 'warning';
  }

  if (['rejected', 'expired', 'failed', 'no internship', 'مرفوض'].includes(value)) {
    return 'danger';
  }

  return 'info';
}

function getScoreTone(score) {
  const value = Number(score || 0);
  if (value >= 85) return 'green';
  if (value >= 60) return 'orange';
  return 'danger';
}

function SvgIcon({ name, size = 22 }) {
  const icons = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
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
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1A19.3 19.3 0 0 1 5.2 13 19.7 19.7 0 0 1 2.1 4.4 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6.1 6.1l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
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
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
        <path d="M17 6h2v2" />
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
    task: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m8 12 2.5 2.5L16 9" />
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
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    skill: (
      <>
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 13 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    course: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    project: (
      <>
        <path d="M4 7h16" />
        <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
        <rect x="4" y="7" width="16" height="13" rx="2" />
      </>
    ),
    attachment: (
      <>
        <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </>
    ),
    print: (
      <>
        <path d="M7 8V3h10v5" />
        <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
        <path d="M7 14h10v7H7z" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    back: (
      <>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <rect x="3" y="3" width="12" height="12" rx="2" />
      </>
    ),
    note: (
      <>
        <path d="M8 3h8l4 4v14H8z" />
        <path d="M16 3v5h5" />
        <path d="M4 7v12" />
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
      {icons[name] || icons.document}
    </svg>
  );
}

function StatusPill({ value, children }) {
  const label = children || value || '-';
  const tone = getStatusTone(value || label);

  return <span className={`student-file-status student-file-status-${tone}`}>{label}</span>;
}

function FeedbackAlert({ feedback, onClose }) {
  if (!feedback?.message) return null;

  const alertClass = feedback.type === 'success' ? 'success' : 'danger';

  return (
    <div className={`alert alert-${alertClass} alert-dismissible fade show`} role="alert">
      {feedback.message}
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
    </div>
  );
}

function EmptyStudentSection({ message }) {
  return <div className="student-file-empty">{message}</div>;
}

function MetricCard({ label, value, hint, icon, tone = 'cyan', onClick }) {
  const content = (
    <>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em>{hint}</em>
      </div>
      <i>
        <SvgIcon name={icon} size={26} />
      </i>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`student-file-metric student-file-metric-${tone}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={`student-file-metric student-file-metric-${tone}`}>{content}</div>;
}

function DetailTile({ label, value, icon }) {
  return (
    <div className="student-file-detail-tile">
      {icon ? (
        <span>
          <SvgIcon name={icon} size={18} />
        </span>
      ) : null}
      <div>
        <small>{label}</small>
        <strong>{value || '-'}</strong>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, action, children }) {
  return (
    <div className="student-file-section-card">
      <div className="student-file-section-head">
        <h3>
          {icon ? <SvgIcon name={icon} size={20} /> : null}
          {title}
        </h3>
        {action || null}
      </div>
      {children}
    </div>
  );
}

function ProgressRing({ value, label, sublabel }) {
  const safeValue = clampPercentage(value);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="student-file-ring-card">
      <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${safeValue}%`}>
        <circle cx="62" cy="62" r={radius} fill="none" stroke="rgba(16,36,63,0.08)" strokeWidth="14" />
        <circle
          cx="62"
          cy="62"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 62 62)"
        />
        <text x="62" y="68" textAnchor="middle" fontSize="24" fontWeight="900" fill="#10243f">
          {safeValue}%
        </text>
      </svg>
      <div>
        <strong>{label}</strong>
        <span>{sublabel}</span>
      </div>
    </div>
  );
}

function CompactTable({ columns, rows, emptyMessage }) {
  if (!rows.length) {
    return <EmptyStudentSection message={emptyMessage} />;
  }

  return (
    <div className="student-file-table-wrap">
      <table className="student-file-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map((column) => (
                <td key={`${row.id || rowIndex}-${column.key}`}>
                  {column.render ? column.render(row) : row[column.key] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentSkillsSection({ skills, isArabic, t }) {
  if (!skills.length) {
    return (
      <EmptyStudentSection
        message={
          isArabic
            ? 'لا توجد مهارات مسجلة لهذا الطالب حتى الآن.'
            : 'No skills have been added for this student yet.'
        }
      />
    );
  }

  return (
    <div className="student-file-skills-grid">
      {skills.map((skill) => (
        <div className="student-file-skill-card" key={skill.id}>
          <div>
            <strong>{skill.name || '-'}</strong>
            <span>{skill.category || '-'}</span>
          </div>
          <StatusPill value={skill.level}>{skill.level ? t(skill.level) : '-'}</StatusPill>
        </div>
      ))}
    </div>
  );
}

function StudentDocumentsSection({ documents, isArabic, t, locale }) {
  const normalizedDocuments = useMemo(
    () => (Array.isArray(documents) ? documents.map(normalizeStudentDocument).filter(Boolean) : []),
    [documents]
  );

  const columns = [
    {
      key: 'title',
      label: isArabic ? 'العنوان' : 'Title',
      render: (document) => <strong>{document.title || document.file_name || '-'}</strong>,
    },
    {
      key: 'file_name',
      label: isArabic ? 'اسم الملف' : 'File Name',
      render: (document) => document.file_name || '-',
    },
    {
      key: 'category',
      label: isArabic ? 'التصنيف' : 'Category',
      render: (document) => (document.category ? t(document.category) : '-'),
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (document) => <StatusPill value={document.status}>{document.status ? t(document.status) : '-'}</StatusPill>,
    },
    {
      key: 'uploaded_at',
      label: isArabic ? 'تاريخ الرفع' : 'Uploaded At',
      render: (document) => formatDate(document.uploaded_at, locale, true),
    },
    {
      key: 'link',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (document) => {
        const fileUrl = resolveDocumentUrl(document.file_url);

        return fileUrl ? (
          <div className="student-file-inline-actions">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="student-file-mini-btn">
              <SvgIcon name="eye" size={15} />
              {isArabic ? 'فتح' : 'Open'}
            </a>
            <button
              type="button"
              className="student-file-mini-btn primary"
              onClick={() => downloadFileFromUrl(fileUrl, document.file_name)}
            >
              <SvgIcon name="download" size={15} />
              {isArabic ? 'تحميل' : 'Download'}
            </button>
          </div>
        ) : (
          '-'
        );
      },
    },
  ];

  return (
    <CompactTable
      columns={columns}
      rows={normalizedDocuments}
      emptyMessage={
        isArabic
          ? 'لا توجد مرفقات مسجلة لهذا الطالب حتى الآن.'
          : 'No attachments have been added for this student yet.'
      }
    />
  );
}

function StudentProjectsSection({ projects, isArabic }) {
  if (!projects.length) {
    return (
      <EmptyStudentSection
        message={
          isArabic
            ? 'لا توجد مشاريع مسجلة لهذا الطالب حتى الآن.'
            : 'No projects have been added for this student yet.'
        }
      />
    );
  }

  return (
    <div className="student-file-card-grid">
      {projects.map((project) => (
        <div className="student-file-project-card" key={project.id}>
          <div className="student-file-project-icon">
            <SvgIcon name="project" size={22} />
          </div>
          <div>
            <h4>{project.title || '-'}</h4>
            <p>{project.description || '-'}</p>
          </div>
          <div className="student-file-tag-row">
            <span>{isArabic ? 'السنة' : 'Year'}: {project.project_year || '-'}</span>
            <span>{isArabic ? 'الدور' : 'Role'}: {project.role_name || '-'}</span>
          </div>
          {project.project_link ? (
            <a href={project.project_link} target="_blank" rel="noreferrer" className="student-file-mini-btn primary">
              <SvgIcon name="eye" size={15} />
              {isArabic ? 'فتح المشروع' : 'Open Project'}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StudentCoursesSection({ courses, isArabic }) {
  const columns = [
    {
      key: 'title',
      label: isArabic ? 'الدورة' : 'Course',
      render: (course) => <strong>{course.title || '-'}</strong>,
    },
    { key: 'provider', label: isArabic ? 'الجهة' : 'Provider' },
    { key: 'hours', label: isArabic ? 'الساعات' : 'Hours' },
    { key: 'course_year', label: isArabic ? 'السنة' : 'Year' },
  ];

  return (
    <CompactTable
      columns={columns}
      rows={courses}
      emptyMessage={
        isArabic
          ? 'لا توجد دورات مسجلة لهذا الطالب حتى الآن.'
          : 'No courses have been added for this student yet.'
      }
    />
  );
}

function ReviewSummaryCard({ title, summaryRows, metricLabel, metricValue, actionLabel, onAction, isArabic }) {
  return (
    <SectionCard
      title={title}
      icon="document"
      action={
        <button type="button" className="student-file-primary-action" onClick={onAction}>
          <SvgIcon name="eye" size={17} />
          {actionLabel}
        </button>
      }
    >
      <div className="student-file-review-grid">
        {summaryRows.map((item) => (
          <DetailTile key={item.label} label={item.label} value={item.value} />
        ))}

        <div className="student-file-review-metric">
          <span>{metricLabel}</span>
          <strong>{metricValue}</strong>
          <em>{isArabic ? 'من البيانات الفعلية' : 'From live data'}</em>
        </div>
      </div>
    </SectionCard>
  );
}

function ScoreBar({ label, value, max = 25 }) {
  const percentage = getPercentage(value, max);

  return (
    <div className="student-file-score-row">
      <div>
        <span>{label}</span>
        <strong>{value || 0}/{max}</strong>
      </div>
      <div>
        <em style={{ width: `${clampPercentage(percentage)}%` }} />
      </div>
    </div>
  );
}

function AcademicAdvisorStudentFilePage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentInternshipContext, setStudentInternshipContext] = useState(null);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [trainingTasks, setTrainingTasks] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [finalEvaluationRequests, setFinalEvaluationRequests] = useState([]);
  const [finalEvaluationSummary, setFinalEvaluationSummary] = useState(null);
  const [academicEvaluations, setAcademicEvaluations] = useState([]);
  const [studentSkills, setStudentSkills] = useState([]);
  const [studentDocuments, setStudentDocuments] = useState([]);
  const [studentProjects, setStudentProjects] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);

  const [isCompanyEvaluationModalOpen, setIsCompanyEvaluationModalOpen] = useState(false);
  const [sendingCompanyEvaluation, setSendingCompanyEvaluation] = useState(false);
  const [companyEvaluationForm, setCompanyEvaluationForm] = useState({
    internshipId: '',
    studentUserId: '',
    providerName: '',
    providerEmail: '',
    sendingTemplateName: 'Company Evaluation Request Email',
    evaluationTemplateName: 'Standard Company Internship Evaluation',
  });

  const [isAcademicEvaluationModalOpen, setIsAcademicEvaluationModalOpen] = useState(false);
  const [savingAcademicEvaluation, setSavingAcademicEvaluation] = useState(false);
  const [academicEvaluationForm, setAcademicEvaluationForm] = useState({
    internshipId: '',
    studentUserId: '',
    advisorUserId: '',
    evaluatorName: '',
    evaluationDate: '',
    status: 'Draft',
    commitmentScore: '0',
    communicationScore: '0',
    technicalScore: '0',
    behaviorScore: '0',
    strengths: '',
    improvementAreas: '',
    advisorNotes: '',
  });

  const activeTab = searchParams.get('tab') || 'studentFile';
  const activeStudentSection = searchParams.get('section') || 'overview';

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const clearFeedback = () => {
    setFeedback({ type: '', message: '' });
  };

  const setActiveTab = (tab) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', tab);

      if (tab !== 'studentFile') {
        next.delete('section');
      } else if (!next.get('section')) {
        next.set('section', 'overview');
      }

      return next;
    });

  const setActiveStudentSection = (section) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', 'studentFile');
      next.set('section', section);
      return next;
    });

  const loadStudentFile = async () => {
    setLoading(true);
    setErrorMessage('');
    clearFeedback();

    try {
      const advisorsData = await getAdvisorsRequest();
      const normalizedAdvisors = Array.isArray(advisorsData)
        ? advisorsData.map(normalizeAdvisor)
        : [];

      const targetAdvisor =
        normalizedAdvisors.find(
          (item) =>
            Number(item.id) === Number(user?.id) ||
            String(item.email || '').toLowerCase() === String(user?.email || '').toLowerCase()
        ) || null;

      if (!targetAdvisor) {
        throw new Error(
          isArabic
            ? 'تعذر العثور على ملف المشرف الحالي.'
            : 'The current academic advisor profile could not be resolved.'
        );
      }

      const studentsData = await getAdvisorStudentsRequest(targetAdvisor.id);
      const normalizedStudents = Array.isArray(studentsData)
        ? studentsData.map((item) => normalizeStudent(item, targetAdvisor))
        : [];

      const student =
        normalizedStudents.find((item) => String(item.id) === String(studentId)) || null;

      if (!student) {
        throw new Error(
          isArabic
            ? 'الطالب غير موجود أو غير مرتبط بهذا المشرف.'
            : 'The student was not found or is not linked to this advisor.'
        );
      }

      setSelectedStudent(student);

      const [skills, documents, projects, courses] = await Promise.all([
        getStudentSkillsRequest(student.id).catch(() => []),
        getStudentDocumentsRequest(student.id).catch(() => []),
        getStudentProjectsRequest(student.id).catch(() => []),
        getStudentCoursesRequest(student.id).catch(() => []),
      ]);

      setStudentSkills(Array.isArray(skills) ? skills : []);
      setStudentDocuments(Array.isArray(documents) ? documents.map(normalizeStudentDocument).filter(Boolean) : []);
      setStudentProjects(Array.isArray(projects) ? projects : []);
      setStudentCourses(Array.isArray(courses) ? courses : []);

      let context = null;
      try {
        context = await getStudentInternshipContextRequest(student.id);
        setStudentInternshipContext(context || null);
      } catch {
        context = null;
        setStudentInternshipContext(null);
      }

      let academicRows = [];
      if (context?.internship_id) {
        academicRows = await getAcademicStudentEvaluationsByInternshipRequest(
          context.internship_id
        ).catch(() => []);
      }

      setAcademicEvaluations(Array.isArray(academicRows) ? academicRows : []);

      if (context?.internship_id) {
        const [plans, tasks, reports, evaluations, evaluationSummary] = await Promise.all([
          getTrainingPlansByInternshipRequest(context.internship_id).catch(() => []),
          getTrainingTasksByInternshipRequest(context.internship_id).catch(() => []),
          getWeeklyReportsByInternshipRequest(context.internship_id).catch(() => []),
          getFinalEvaluationRequestsByInternshipRequest(context.internship_id).catch(() => []),
          getFinalEvaluationSummaryRequest(context.internship_id).catch(() => null),
        ]);

        setTrainingPlans(Array.isArray(plans) ? plans : []);
        setTrainingTasks(Array.isArray(tasks) ? tasks : []);
        setWeeklyReports(Array.isArray(reports) ? reports : []);
        setFinalEvaluationRequests(Array.isArray(evaluations) ? evaluations : []);
        setFinalEvaluationSummary(evaluationSummary || null);
      } else {
        setTrainingPlans([]);
        setTrainingTasks([]);
        setWeeklyReports([]);
        setFinalEvaluationRequests([]);
        setFinalEvaluationSummary(null);
      }
    } catch (error) {
      setSelectedStudent(null);
      setStudentInternshipContext(null);
      setTrainingPlans([]);
      setTrainingTasks([]);
      setWeeklyReports([]);
      setFinalEvaluationRequests([]);
      setFinalEvaluationSummary(null);
      setAcademicEvaluations([]);
      setStudentSkills([]);
      setStudentDocuments([]);
      setStudentProjects([]);
      setStudentCourses([]);
      setErrorMessage(error.message || 'Failed to load the student file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentFile();
  }, [studentId, user, isArabic]);

  const latestTrainingPlan = useMemo(() => trainingPlans[0] || null, [trainingPlans]);
  const latestWeeklyReport = useMemo(() => weeklyReports[0] || null, [weeklyReports]);
  const latestFinalEvaluationRequest = useMemo(
    () => finalEvaluationRequests[0] || null,
    [finalEvaluationRequests]
  );
  const latestAcademicEvaluation = useMemo(
    () => academicEvaluations[0] || null,
    [academicEvaluations]
  );

  const tasksCount = trainingTasks.length;
  const weeklyReportsCount = weeklyReports.length;
  const skillsCount = studentSkills.length;
  const attachmentsCount = studentDocuments.length;
  const projectsCount = studentProjects.length;
  const coursesCount = studentCourses.length;
  const completedTasksCount = trainingTasks.filter((task) => {
    const status = String(task.status || task.task_status || '').toLowerCase();
    return ['completed', 'done', 'approved', 'مكتملة'].includes(status);
  }).length;
  const completedWeeksCount = weeklyReports.filter((report) => {
    const status = String(report.status || report.approval_status || '').toLowerCase();
    return ['approved', 'submitted', 'completed', 'reviewed'].includes(status);
  }).length;

  const totalExpectedWeeks =
    Number(studentInternshipContext?.total_weeks || studentInternshipContext?.training_weeks || 12) || 12;

  const progressPercentage = getPercentage(completedWeeksCount, totalExpectedWeeks);
  const tasksPercentage = getPercentage(completedTasksCount, tasksCount);
  const profileCompleteness = getPercentage(
    [
      selectedStudent?.fullName,
      selectedStudent?.email,
      selectedStudent?.studentCode,
      selectedStudent?.major,
      selectedStudent?.gpa,
      studentInternshipContext?.internship_id,
      studentInternshipContext?.provider_name,
      skillsCount,
      attachmentsCount,
    ].filter(Boolean).length,
    9
  );

  const companyEvaluationPercentage =
    finalEvaluationSummary?.company_total_percentage ?? null;

  const isCompanyEvaluationSubmitted =
    companyEvaluationPercentage !== null &&
    companyEvaluationPercentage !== undefined;

  const latestCompanyRequestStatus = String(
    latestFinalEvaluationRequest?.status || ''
  ).toLowerCase();

  const companyEvaluationStatus =
    latestFinalEvaluationRequest?.status ||
    finalEvaluationSummary?.company_status ||
    'Not Submitted';

  const latestCompanyEvaluationLink =
    latestFinalEvaluationRequest?.registration_link ||
    (latestFinalEvaluationRequest?.public_token
      ? `${window.location.origin}/external/company-evaluation/register/${latestFinalEvaluationRequest.public_token}`
      : '');

  const shouldShowLatestCompanyEvaluationLink =
    Boolean(latestCompanyEvaluationLink) && latestCompanyRequestStatus === 'pending';

  const academicEvaluationStatus = latestAcademicEvaluation?.status || 'Not Submitted';

  const academicEvaluationTotal = useMemo(() => {
    return (
      Number(academicEvaluationForm.commitmentScore || 0) +
      Number(academicEvaluationForm.communicationScore || 0) +
      Number(academicEvaluationForm.technicalScore || 0) +
      Number(academicEvaluationForm.behaviorScore || 0)
    );
  }, [academicEvaluationForm]);

  const academicEvaluationPercentage = Number(latestAcademicEvaluation?.total_percentage ?? 0);

  const summaryRows = [
    { label: isArabic ? 'الطالب' : 'Student', value: selectedStudent?.fullName || '-' },
    {
      label: isArabic ? 'جهة التدريب' : 'Training Provider',
      value: studentInternshipContext?.provider_name || '-',
    },
    {
      label: isArabic ? 'الخطة الحالية' : 'Latest Training Plan',
      value: latestTrainingPlan?.plan_title || latestTrainingPlan?.title || '-',
    },
    {
      label: isArabic ? 'آخر تقرير أسبوعي' : 'Latest Weekly Report',
      value: latestWeeklyReport?.title || latestWeeklyReport?.report_title || '-',
    },
    { label: isArabic ? 'تقييم المشرف' : 'Academic Evaluation', value: t(academicEvaluationStatus) },
  ];

  const pageTabs = [
    { key: 'studentFile', label: isArabic ? 'الملف' : 'Profile', icon: 'user' },
    { key: 'attendance', label: isArabic ? 'الحضور' : 'Attendance', icon: 'calendar' },
    { key: 'tasks', label: isArabic ? 'المهام' : 'Tasks', icon: 'task' },
    { key: 'weeklyReports', label: isArabic ? 'التقارير الأسبوعية' : 'Weekly Reports', icon: 'chart' },
    { key: 'evaluation', label: isArabic ? 'التقييم' : 'Evaluation', icon: 'star' },
  ];

  const studentSections = [
    { key: 'overview', label: isArabic ? 'الملخص' : 'Summary', icon: 'document' },
    { key: 'skills', label: isArabic ? 'المهارات' : 'Skills', icon: 'skill', count: skillsCount },
    { key: 'attachments', label: isArabic ? 'المستندات' : 'Documents', icon: 'attachment', count: attachmentsCount },
    { key: 'projects', label: isArabic ? 'المشاريع' : 'Projects', icon: 'project', count: projectsCount },
    { key: 'courses', label: isArabic ? 'الدورات' : 'Courses', icon: 'course', count: coursesCount },
    { key: 'internship', label: isArabic ? 'التدريب' : 'Internship', icon: 'briefcase' },
  ];

  const openAttendanceDetails = () => {
    navigate(
      ROUTES.ADVISOR_MODULES.STUDENT_ATTENDANCE_DETAILS.replace(':studentId', String(selectedStudent.id))
    );
  };

  const openTasksDetails = () => {
    navigate(
      ROUTES.ADVISOR_MODULES.STUDENT_TASKS_DETAILS.replace(':studentId', String(selectedStudent.id))
    );
  };

  const openWeeklyReportsDetails = () => {
    navigate(
      ROUTES.ADVISOR_MODULES.STUDENT_WEEKLY_REPORTS_DETAILS.replace(':studentId', String(selectedStudent.id))
    );
  };

  const openCompanyEvaluationModal = () => {
    if (!selectedStudent || !studentInternshipContext?.internship_id) {
      showFeedback(
        'danger',
        isArabic
          ? 'لا يوجد سياق تدريب لهذا الطالب حتى الآن.'
          : 'This student does not have an internship context yet.'
      );
      return;
    }

    setCompanyEvaluationForm({
      internshipId: String(studentInternshipContext?.internship_id || ''),
      studentUserId: String(selectedStudent.id),
      providerName: studentInternshipContext?.provider_name || '',
      providerEmail: studentInternshipContext?.provider_email || '',
      sendingTemplateName: 'Company Evaluation Request Email',
      evaluationTemplateName: 'Standard Company Internship Evaluation',
    });

    setIsCompanyEvaluationModalOpen(true);
  };

  const handleSendCompanyEvaluationRequest = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!companyEvaluationForm.internshipId || !companyEvaluationForm.studentUserId) {
      showFeedback(
        'danger',
        isArabic
          ? 'لا يمكن إرسال التقييم دون وجود Internship ID وStudent User ID.'
          : 'Internship ID and Student User ID are required before sending the evaluation.'
      );
      return;
    }

    setSendingCompanyEvaluation(true);

    const payload = {
      internship_id: Number(companyEvaluationForm.internshipId),
      student_user_id: Number(companyEvaluationForm.studentUserId),
      provider_name: companyEvaluationForm.providerName,
      provider_email: companyEvaluationForm.providerEmail,
      sending_template_name: companyEvaluationForm.sendingTemplateName,
      evaluation_template_name: companyEvaluationForm.evaluationTemplateName,
      requested_by_user_id: user?.id,
    };

    try {
      const response = await createFinalEvaluationRequestRequest(payload);

      const createdRegistrationLink =
        response?.registration_link ||
        response?.registrationLink ||
        (response?.public_token
          ? `${window.location.origin}/external/company-evaluation/register/${response.public_token}`
          : '');

      const createdRequest = {
        ...response,
        ...payload,
        id: response?.id,
        status: response?.status || 'Pending',
        public_token: response?.public_token || response?.publicToken || null,
        registration_link: createdRegistrationLink,
        requested_at: response?.requested_at || new Date().toISOString(),
      };

      setIsCompanyEvaluationModalOpen(false);

      const refreshed = await getFinalEvaluationRequestsByInternshipRequest(
        Number(companyEvaluationForm.internshipId)
      ).catch(() => []);

      const refreshedList = Array.isArray(refreshed) ? refreshed : [];

      const refreshedWithLink = refreshedList.map((item) => {
        if (response?.id && item.id === response.id) {
          const itemRegistrationLink =
            item.registration_link ||
            item.registrationLink ||
            createdRegistrationLink ||
            (item.public_token
              ? `${window.location.origin}/external/company-evaluation/register/${item.public_token}`
              : '');

          return {
            ...item,
            public_token: item.public_token || createdRequest.public_token,
            registration_link: itemRegistrationLink,
          };
        }

        return item;
      });

      const requestAlreadyExists = response?.id
        ? refreshedWithLink.some((item) => item.id === response.id)
        : false;

      const nextRequests =
        requestAlreadyExists || !createdRegistrationLink
          ? refreshedWithLink
          : [createdRequest, ...refreshedWithLink];

      setFinalEvaluationRequests(nextRequests);

      const refreshedSummary = await getFinalEvaluationSummaryRequest(
        Number(companyEvaluationForm.internshipId)
      ).catch(() => null);

      setFinalEvaluationSummary(refreshedSummary || null);

      showFeedback(
        'success',
        isArabic
          ? 'تم إرسال طلب تقييم الشركة بنجاح.'
          : 'The company evaluation request was sent successfully.'
      );
    } catch (error) {
      showFeedback('danger', error.message || 'Failed to send company evaluation request.');
    } finally {
      setSendingCompanyEvaluation(false);
    }
  };

  const openAcademicEvaluationModal = () => {
    if (!selectedStudent || !studentInternshipContext?.internship_id) {
      showFeedback(
        'danger',
        isArabic
          ? 'لا يوجد سياق تدريب لهذا الطالب حتى الآن.'
          : 'This student does not have an internship context yet.'
      );
      return;
    }

    setAcademicEvaluationForm(
      buildAcademicEvaluationForm(user, selectedStudent, studentInternshipContext, latestAcademicEvaluation)
    );

    setIsAcademicEvaluationModalOpen(true);
  };

  const handleSaveAcademicEvaluation = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!academicEvaluationForm.internshipId || !academicEvaluationForm.studentUserId || !academicEvaluationForm.advisorUserId) {
      showFeedback(
        'danger',
        isArabic
          ? 'بيانات التقييم غير مكتملة.'
          : 'The academic evaluation payload is incomplete.'
      );
      return;
    }

    setSavingAcademicEvaluation(true);

    try {
      await upsertAcademicStudentEvaluationRequest({
        internship_id: Number(academicEvaluationForm.internshipId),
        student_user_id: Number(academicEvaluationForm.studentUserId),
        advisor_user_id: Number(user?.id),
        evaluator_name: academicEvaluationForm.evaluatorName,
        evaluation_date: academicEvaluationForm.evaluationDate,
        status: academicEvaluationForm.status,
        commitment_score: Number(academicEvaluationForm.commitmentScore || 0),
        communication_score: Number(academicEvaluationForm.communicationScore || 0),
        technical_score: Number(academicEvaluationForm.technicalScore || 0),
        behavior_score: Number(academicEvaluationForm.behaviorScore || 0),
        strengths: academicEvaluationForm.strengths,
        improvement_areas: academicEvaluationForm.improvementAreas,
        advisor_notes: academicEvaluationForm.advisorNotes,
      });

      setIsAcademicEvaluationModalOpen(false);

      const refreshed = await getAcademicStudentEvaluationsByInternshipRequest(
        Number(academicEvaluationForm.internshipId)
      ).catch(() => []);

      setAcademicEvaluations(Array.isArray(refreshed) ? refreshed : []);

      showFeedback(
        'success',
        isArabic
          ? 'تم حفظ تقييم المشرف الأكاديمي بنجاح.'
          : 'The academic advisor evaluation was saved successfully.'
      );
    } catch (error) {
      showFeedback('danger', error.message || 'Failed to save academic evaluation.');
    } finally {
      setSavingAcademicEvaluation(false);
    }
  };

  if (loading) {
    return (
      <div className="student-file-loading-screen">
        <div className="spinner-border text-primary" role="status" />
        <div>{isArabic ? 'جارٍ تحميل ملف الطالب...' : 'Loading the student file...'}</div>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div className="student-file-error-screen">
        <div>
          {errorMessage ||
            (isArabic
              ? 'الطالب غير موجود أو غير مرتبط بهذا المشرف.'
              : 'The student was not found or is not linked to this advisor.')}
        </div>
        <button
          type="button"
          className="student-file-primary-action"
          onClick={() => navigate(getAdvisorDashboardRoute())}
        >
          <SvgIcon name="back" size={17} />
          {t('Back to Students')}
        </button>
      </div>
    );
  }

  return (
    <div className="student-file-redesign">
      <style>{`
        .student-file-redesign {
          position: relative;
          min-height: 100%;
          padding: 0.2rem 0 1.6rem;
          color: #10243f;
        }

        .student-file-redesign::before {
          content: "";
          position: absolute;
          inset: -1.5rem -1.5rem auto -1.5rem;
          height: 290px;
          pointer-events: none;
          background:
            radial-gradient(circle at 16% 12%, rgba(20, 200, 195, 0.16), transparent 34%),
            radial-gradient(circle at 66% 2%, rgba(91, 101, 241, 0.08), transparent 30%),
            repeating-radial-gradient(ellipse at 40% 10%, rgba(20, 200, 195, 0.09) 0 1px, transparent 1px 28px);
          opacity: 0.94;
          border-radius: 0 0 44px 44px;
          z-index: 0;
        }

        .student-file-redesign > * {
          position: relative;
          z-index: 1;
        }

        .student-file-loading-screen,
        .student-file-error-screen {
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1rem;
          color: #6f819b;
          font-weight: 800;
        }

        .student-file-breadcrumb {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.8rem;
        }

        .student-file-breadcrumb-left {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          color: #7a8aa5;
          font-size: 0.88rem;
          font-weight: 800;
        }

        .student-file-back-btn {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.85rem;
          border: 1px solid #dfeaf3;
          border-radius: 14px;
          color: #243b5a;
          background: rgba(255,255,255,0.92);
          font-weight: 850;
        }

        .student-file-title {
          text-align: start;
        }

        .student-file-title h1 {
          margin: 0;
          color: #10243f;
          font-size: clamp(1.8rem, 2.6vw, 2.5rem);
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .student-file-title p {
          margin: 0.35rem 0 0;
          color: #637894;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .student-file-profile-card {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
          gap: 1rem;
          padding: 1.2rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 30px;
          background: rgba(255,255,255,0.94);
          box-shadow: 0 20px 55px rgba(16, 36, 63, 0.08);
          backdrop-filter: blur(12px);
        }

        .student-file-profile-main {
          display: grid;
          grid-template-columns: 150px 1fr;
          align-items: center;
          gap: 1.2rem;
        }

        .student-file-avatar-wrap {
          position: relative;
          width: 136px;
          height: 136px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.9), rgba(235,248,250,0.95)),
            linear-gradient(135deg, #e7fbf9, #f6f8ff);
          box-shadow: inset 0 0 0 10px #fff, 0 16px 42px rgba(16,36,63,0.10);
        }

        .student-file-avatar-wrap strong {
          width: 104px;
          height: 104px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          font-size: 2.1rem;
          font-weight: 900;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
        }

        .student-file-avatar-wrap span {
          position: absolute;
          bottom: 2px;
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          padding: 0.32rem 0.8rem;
          border: 3px solid #fff;
          border-radius: 999px;
          color: #0d8a64;
          background: #dff8ee;
          font-size: 0.77rem;
          font-weight: 900;
        }

        .student-file-student-name {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0 0 0.65rem;
          color: #10243f;
          font-size: clamp(1.35rem, 2.4vw, 2rem);
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .student-file-star {
          display: inline-flex;
          color: #f59e0b;
        }

        .student-file-contact-list {
          display: grid;
          gap: 0.45rem;
          margin-bottom: 1rem;
          color: #314762;
          font-weight: 760;
        }

        .student-file-contact-list div {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .student-file-profile-tags {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .student-file-profile-tags span {
          min-width: 120px;
          min-height: 52px;
          display: grid;
          align-content: center;
          gap: 0.2rem;
          padding: 0.55rem 0.8rem;
          border-radius: 16px;
          color: #243b5a;
          background: #f7fafc;
          border: 1px solid #edf3f8;
          font-weight: 900;
        }

        .student-file-profile-tags small {
          color: #7a8aa5;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .student-file-hero-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.8rem;
        }

        .student-file-hero-metric {
          min-height: 148px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.45rem;
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid #edf3f8;
          background: #fff;
          box-shadow: 0 12px 32px rgba(16,36,63,0.05);
          text-align: center;
        }

        .student-file-hero-metric span {
          color: #5e718d;
          font-size: 0.82rem;
          font-weight: 900;
        }

        .student-file-hero-metric strong {
          color: #10243f;
          font-size: 1.7rem;
          font-weight: 950;
          line-height: 1;
        }

        .student-file-hero-metric em {
          color: #7a8aa5;
          font-size: 0.76rem;
          font-style: normal;
          font-weight: 800;
        }

        .student-file-ring-card {
          min-height: 148px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid #edf3f8;
          color: #14c8c3;
          background: #fff;
          box-shadow: 0 12px 32px rgba(16,36,63,0.05);
        }

        .student-file-ring-card strong {
          display: block;
          color: #10243f;
          font-size: 0.95rem;
          font-weight: 900;
        }

        .student-file-ring-card span {
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .student-file-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 285px;
          gap: 1rem;
          align-items: start;
        }

        .student-file-content-stack {
          display: grid;
          gap: 1rem;
        }

        .student-file-tabs-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.85rem 1rem 0.65rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 26px;
          background: rgba(255,255,255,0.94);
          box-shadow: 0 16px 42px rgba(16,36,63,0.07);
          overflow-x: auto;
        }

        .student-file-tabs-card button {
          position: relative;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.65rem;
          border: none;
          color: #7a8aa5;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .student-file-tabs-card button.active {
          color: #0796a6;
        }

        .student-file-tabs-card button.active::after {
          content: "";
          position: absolute;
          inset-inline: 0.25rem;
          bottom: -0.66rem;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0796a6, #14c8c3);
        }

        .student-file-section-tabs {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .student-file-section-tabs button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.85rem;
          border: 1px solid #dfeaf3;
          border-radius: 15px;
          color: #6f819b;
          background: #fff;
          font-size: 0.84rem;
          font-weight: 880;
        }

        .student-file-section-tabs button.active {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 12px 24px rgba(7,150,166,0.18);
        }

        .student-file-section-tabs button small {
          min-width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.35rem;
          border-radius: 999px;
          background: #eef4f7;
          color: #6f819b;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .student-file-section-tabs button.active small {
          color: #0796a6;
          background: #fff;
        }

        .student-file-section-card {
          padding: 1.1rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 26px;
          background: rgba(255,255,255,0.95);
          box-shadow: 0 16px 42px rgba(16,36,63,0.07);
        }

        .student-file-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .student-file-section-head h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: #10243f;
          font-size: 1rem;
          font-weight: 950;
        }

        .student-file-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .student-file-detail-tile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-height: 82px;
          padding: 0.9rem;
          border: 1px solid #edf3f8;
          border-radius: 20px;
          background: #fbfdff;
        }

        .student-file-detail-tile > span {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 14px;
          color: #0796a6;
          background: #e2fafa;
        }

        .student-file-detail-tile small {
          display: block;
          margin-bottom: 0.3rem;
          color: #7a8aa5;
          font-size: 0.77rem;
          font-weight: 860;
        }

        .student-file-detail-tile strong {
          display: block;
          color: #243b5a;
          font-size: 0.9rem;
          font-weight: 900;
          word-break: break-word;
        }

        .student-file-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .student-file-metric {
          width: 100%;
          min-height: 104px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.95rem;
          border: 1px solid #edf3f8;
          border-radius: 20px;
          background: #fff;
          text-align: start;
        }

        .student-file-metric span {
          display: block;
          margin-bottom: 0.34rem;
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 860;
        }

        .student-file-metric strong {
          display: block;
          margin-bottom: 0.2rem;
          color: #10243f;
          font-size: 1.45rem;
          font-weight: 950;
          line-height: 1;
        }

        .student-file-metric em {
          color: #7a8aa5;
          font-size: 0.72rem;
          font-style: normal;
          font-weight: 760;
        }

        .student-file-metric i {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 16px;
          font-style: normal;
        }

        .student-file-metric-cyan i { color: #0796a6; background: #e2fafa; }
        .student-file-metric-green i { color: #18bd87; background: #e7fbf3; }
        .student-file-metric-blue i { color: #3b82f6; background: #e8f1ff; }
        .student-file-metric-orange i { color: #ed9f22; background: #fff4dc; }
        .student-file-metric-danger i { color: #c02c3f; background: #ffedf0; }
        .student-file-metric-purple i { color: #5b65f1; background: #eef0ff; }

        .student-file-side-panel {
          display: grid;
          gap: 1rem;
          position: sticky;
          top: 1rem;
        }

        .student-file-actions-card,
        .student-file-notes-card {
          padding: 1rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 26px;
          background: rgba(255,255,255,0.95);
          box-shadow: 0 16px 42px rgba(16,36,63,0.07);
        }

        .student-file-actions-card h3,
        .student-file-notes-card h3 {
          margin: 0 0 0.9rem;
          color: #10243f;
          font-size: 1rem;
          font-weight: 950;
        }

        .student-file-action-list {
          display: grid;
          gap: 0.65rem;
        }

        .student-file-primary-action,
        .student-file-secondary-action,
        .student-file-mini-btn {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0 0.9rem;
          border-radius: 14px;
          border: 1px solid #dfeaf3;
          color: #243b5a;
          background: #fff;
          font-size: 0.85rem;
          font-weight: 900;
          text-decoration: none;
        }

        .student-file-primary-action {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, #062b4f, #0796a6);
          box-shadow: 0 14px 28px rgba(7,150,166,0.18);
        }

        .student-file-secondary-action:hover,
        .student-file-mini-btn:hover {
          color: #0796a6;
          background: #f4fbfc;
        }

        .student-file-mini-btn {
          min-height: 34px;
          padding: 0 0.65rem;
          font-size: 0.77rem;
        }

        .student-file-mini-btn.primary {
          color: #fff;
          border-color: transparent;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
        }

        .student-file-note-item {
          padding: 0.8rem;
          border-radius: 18px;
          background: #f7fafc;
          border: 1px solid #edf3f8;
        }

        .student-file-note-item p {
          margin: 0 0 0.5rem;
          color: #243b5a;
          font-size: 0.83rem;
          line-height: 1.75;
          font-weight: 730;
        }

        .student-file-note-item span {
          color: #7a8aa5;
          font-size: 0.74rem;
          font-weight: 800;
        }

        .student-file-status {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.32rem 0.75rem;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 0.75rem;
          font-weight: 930;
          white-space: nowrap;
        }

        .student-file-status::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }

        .student-file-status-success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24,197,143,0.22);
        }

        .student-file-status-warning {
          color: #a4660b;
          background: #fff4dc;
          border-color: rgba(244,166,42,0.24);
        }

        .student-file-status-danger {
          color: #c02c3f;
          background: #ffedf0;
          border-color: rgba(255,90,107,0.24);
        }

        .student-file-status-info {
          color: #1f65c8;
          background: #e8f1ff;
          border-color: rgba(59,130,246,0.2);
        }

        .student-file-review-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .student-file-review-metric {
          min-height: 82px;
          display: grid;
          align-content: center;
          padding: 0.9rem;
          border-radius: 20px;
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 28px rgba(7,150,166,0.16);
        }

        .student-file-review-metric span {
          font-size: 0.78rem;
          font-weight: 860;
          opacity: 0.88;
        }

        .student-file-review-metric strong {
          font-size: 1.7rem;
          font-weight: 950;
          line-height: 1.1;
        }

        .student-file-review-metric em {
          font-size: 0.75rem;
          font-style: normal;
          font-weight: 780;
          opacity: 0.86;
        }

        .student-file-skills-grid,
        .student-file-card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .student-file-skill-card,
        .student-file-project-card {
          padding: 0.95rem;
          border: 1px solid #edf3f8;
          border-radius: 20px;
          background: #fbfdff;
        }

        .student-file-skill-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
        }

        .student-file-skill-card strong,
        .student-file-project-card h4 {
          display: block;
          margin: 0 0 0.25rem;
          color: #10243f;
          font-size: 0.95rem;
          font-weight: 950;
        }

        .student-file-skill-card span,
        .student-file-project-card p {
          margin: 0;
          color: #7a8aa5;
          font-size: 0.82rem;
          font-weight: 760;
          line-height: 1.7;
        }

        .student-file-project-icon {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          border-radius: 16px;
          color: #0796a6;
          background: #e2fafa;
        }

        .student-file-tag-row {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin: 0.75rem 0;
        }

        .student-file-tag-row span {
          padding: 0.3rem 0.65rem;
          border-radius: 999px;
          color: #6f819b;
          background: #eef4f7;
          font-size: 0.75rem;
          font-weight: 850;
        }

        .student-file-table-wrap {
          overflow-x: auto;
          border: 1px solid #edf3f8;
          border-radius: 20px;
        }

        .student-file-table {
          width: 100%;
          min-width: 740px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .student-file-table th {
          padding: 0.85rem;
          color: #6f819b;
          background: #fbfdff;
          border-bottom: 1px solid #edf3f8;
          font-size: 0.78rem;
          font-weight: 920;
        }

        .student-file-table td {
          padding: 0.85rem;
          color: #243b5a;
          border-bottom: 1px solid #edf3f8;
          font-size: 0.84rem;
          font-weight: 760;
          vertical-align: middle;
        }

        .student-file-table tr:last-child td {
          border-bottom: none;
        }

        .student-file-inline-actions {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .student-file-evaluation-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .student-file-score-box {
          display: grid;
          gap: 0.75rem;
        }

        .student-file-score-row {
          display: grid;
          gap: 0.45rem;
        }

        .student-file-score-row > div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: #243b5a;
          font-size: 0.84rem;
          font-weight: 840;
        }

        .student-file-score-row > div:last-child {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: #e8f1f4;
        }

        .student-file-score-row em {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #0796a6, #14c8c3);
        }

        .student-file-empty {
          min-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          border: 1px dashed #dfeaf3;
          border-radius: 20px;
          color: #7a8aa5;
          background: #fbfdff;
          font-weight: 780;
          text-align: center;
        }

        .student-file-evaluation-link {
          display: grid;
          gap: 0.6rem;
          margin-top: 1rem;
        }

        .student-file-copy-group {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.5rem;
        }

        .student-file-copy-group input {
          min-height: 42px;
          border: 1px solid #dfeaf3;
          border-radius: 14px;
          padding: 0 0.8rem;
          color: #243b5a;
          background: #fbfdff;
          font-size: 0.82rem;
          font-weight: 760;
        }

        @media (max-width: 1199.98px) {
          .student-file-profile-card,
          .student-file-main-grid,
          .student-file-evaluation-grid {
            grid-template-columns: 1fr;
          }

          .student-file-side-panel {
            position: static;
          }

          .student-file-hero-metrics,
          .student-file-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 767.98px) {
          .student-file-breadcrumb,
          .student-file-section-head {
            align-items: stretch;
            flex-direction: column;
          }

          .student-file-profile-main {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .student-file-contact-list div,
          .student-file-student-name {
            justify-content: center;
          }

          .student-file-hero-metrics,
          .student-file-overview-grid,
          .student-file-metrics-grid,
          .student-file-review-grid,
          .student-file-skills-grid,
          .student-file-card-grid {
            grid-template-columns: 1fr;
          }

          .student-file-copy-group {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="student-file-breadcrumb">
        <div className="student-file-breadcrumb-left">
          <button type="button" className="student-file-back-btn" onClick={() => navigate(getAdvisorDashboardRoute())}>
            <SvgIcon name="back" size={17} />
            {isArabic ? 'رجوع' : 'Back'}
          </button>
          <span>{isArabic ? 'الطلاب' : 'Students'}</span>
          <span>/</span>
          <strong>{isArabic ? 'ملف الطالب' : 'Student File'}</strong>
        </div>

        <div className="student-file-title">
          <h1>{isArabic ? 'ملف الطالب' : 'Student File'}</h1>
          <p>{isArabic ? 'عرض شامل لمعلومات الطالب وتقدمه في التدريب' : 'Complete view of student information and internship progress'}</p>
        </div>
      </div>

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} />

      <div className="student-file-profile-card">
        <div className="student-file-profile-main">
          <div className="student-file-avatar-wrap">
            <strong>{getInitials(selectedStudent.fullName)}</strong>
            <span>{t(studentInternshipContext?.internship_id ? 'Active' : 'No Internship')}</span>
          </div>

          <div>
            <h2 className="student-file-student-name">
              {selectedStudent.fullName}
              <span className="student-file-star">
                <SvgIcon name="star" size={20} />
              </span>
            </h2>

            <div className="student-file-contact-list">
              <div>
                <SvgIcon name="mail" size={17} />
                <span dir="ltr">{selectedStudent.email || '-'}</span>
              </div>
              <div>
                <SvgIcon name="phone" size={17} />
                <span>{selectedStudent.phone || selectedStudent.mobile || '-'}</span>
              </div>
            </div>

            <div className="student-file-profile-tags">
              <span>
                <small>{isArabic ? 'الرقم الجامعي' : 'Student Code'}</small>
                {selectedStudent.studentCode || '-'}
              </span>
              <span>
                <small>{isArabic ? 'التخصص' : 'Major'}</small>
                {selectedStudent.major || '-'}
              </span>
              <span>
                <small>{isArabic ? 'المعدل' : 'GPA'}</small>
                {selectedStudent.gpa || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="student-file-hero-metrics">
          <div className="student-file-hero-metric">
            <span>{isArabic ? 'المعدل التراكمي' : 'GPA'}</span>
            <strong>{selectedStudent.gpa || '-'}</strong>
            <em>{selectedStudent.university || '-'}</em>
          </div>

          <ProgressRing
            value={progressPercentage}
            label={isArabic ? 'سير التدريب' : 'Training Progress'}
            sublabel={`${completedWeeksCount}/${totalExpectedWeeks} ${isArabic ? 'أسابيع' : 'weeks'}`}
          />

          <div className="student-file-hero-metric">
            <span>{isArabic ? 'التقييم النهائي' : 'Final Evaluation'}</span>
            <strong>{academicEvaluationPercentage ? `${academicEvaluationPercentage}%` : '-'}</strong>
            <em>{t(academicEvaluationStatus)}</em>
          </div>
        </div>
      </div>

      <div className="student-file-main-grid">
        <div className="student-file-content-stack">
          <div className="student-file-tabs-card">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => setActiveTab(tab.key)}
              >
                <SvgIcon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'studentFile' ? (
            <>
              <SectionCard title={isArabic ? 'أقسام ملف الطالب' : 'Student File Sections'} icon="document">
                <div className="student-file-section-tabs">
                  {studentSections.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      className={activeStudentSection === section.key ? 'active' : ''}
                      onClick={() => setActiveStudentSection(section.key)}
                    >
                      <SvgIcon name={section.icon} size={17} />
                      {section.label}
                      {typeof section.count === 'number' ? <small>{formatNumber(section.count, locale)}</small> : null}
                    </button>
                  ))}
                </div>
              </SectionCard>

              {activeStudentSection === 'overview' ? (
                <>
                  <SectionCard title={isArabic ? 'نبذة عن الطالب' : 'Student Overview'} icon="user">
                    <div className="student-file-overview-grid">
                      <DetailTile label={t('Student')} value={selectedStudent.fullName} icon="user" />
                      <DetailTile label={t('University')} value={selectedStudent.university || '-'} icon="course" />
                      <DetailTile label={t('Major')} value={selectedStudent.major || '-'} icon="skill" />
                      <DetailTile label={t('Student Code')} value={selectedStudent.studentCode || '-'} icon="document" />
                      <DetailTile label={t('GPA')} value={selectedStudent.gpa || '-'} icon="chart" />
                      <DetailTile label={t('Academic Advisor')} value={selectedStudent.advisorName || '-'} icon="users" />
                    </div>
                  </SectionCard>

                  <SectionCard title={isArabic ? 'مؤشرات الأداء' : 'Performance Indicators'} icon="chart">
                    <div className="student-file-metrics-grid">
                      <MetricCard label={t('Training Plans')} value={trainingPlans.length} hint={latestTrainingPlan?.plan_title || latestTrainingPlan?.title || '-'} icon="briefcase" tone="cyan" />
                      <MetricCard label={t('Tasks')} value={trainingTasks.length} hint={`${completedTasksCount} ${isArabic ? 'مكتملة' : 'completed'}`} icon="task" tone="purple" onClick={openTasksDetails} />
                      <MetricCard label={t('Weekly Reports')} value={weeklyReports.length} hint={`${completedWeeksCount}/${totalExpectedWeeks} ${isArabic ? 'أسابيع' : 'weeks'}`} icon="chart" tone="blue" onClick={openWeeklyReportsDetails} />
                      <MetricCard label={t('Academic Evaluation')} value={academicEvaluationPercentage || 0} hint={t(academicEvaluationStatus)} icon="star" tone={getScoreTone(academicEvaluationPercentage)} onClick={openAcademicEvaluationModal} />
                      <MetricCard label={isArabic ? 'المهارات' : 'Skills'} value={skillsCount} hint={isArabic ? 'مهارات مكتسبة' : 'Acquired skills'} icon="skill" tone="green" />
                      <MetricCard label={isArabic ? 'المستندات' : 'Documents'} value={attachmentsCount} hint={isArabic ? 'مرفقات الطالب' : 'Student attachments'} icon="attachment" tone="blue" />
                      <MetricCard label={isArabic ? 'المشاريع' : 'Projects'} value={projectsCount} hint={isArabic ? 'مشاريع الطالب' : 'Student projects'} icon="project" tone="orange" />
                      <MetricCard label={isArabic ? 'الدورات' : 'Courses'} value={coursesCount} hint={isArabic ? 'دورات تدريبية' : 'Training courses'} icon="course" tone="purple" />
                    </div>
                  </SectionCard>
                </>
              ) : null}

              {activeStudentSection === 'skills' ? (
                <SectionCard title={isArabic ? 'المهارات الرئيسية' : 'Main Skills'} icon="skill">
                  <StudentSkillsSection skills={studentSkills} isArabic={isArabic} t={t} />
                </SectionCard>
              ) : null}

              {activeStudentSection === 'attachments' ? (
                <SectionCard title={isArabic ? 'المستندات والمرفقات' : 'Documents & Attachments'} icon="attachment">
                  <StudentDocumentsSection documents={studentDocuments} isArabic={isArabic} t={t} locale={locale} />
                </SectionCard>
              ) : null}

              {activeStudentSection === 'projects' ? (
                <SectionCard title={isArabic ? 'المشاريع' : 'Projects'} icon="project">
                  <StudentProjectsSection projects={studentProjects} isArabic={isArabic} />
                </SectionCard>
              ) : null}

              {activeStudentSection === 'courses' ? (
                <SectionCard title={isArabic ? 'الدورات' : 'Courses'} icon="course">
                  <StudentCoursesSection courses={studentCourses} isArabic={isArabic} />
                </SectionCard>
              ) : null}

              {activeStudentSection === 'internship' ? (
                <SectionCard title={t('Internship & Opportunity')} icon="briefcase">
                  <div className="student-file-overview-grid">
                    <DetailTile label={t('Internship Status')} value={t(studentInternshipContext?.internship_id ? 'Has Internship' : 'No Internship')} icon="shield" />
                    <DetailTile label={t('Provider')} value={studentInternshipContext?.provider_name || '-'} icon="briefcase" />
                    <DetailTile label={t('Internship Title')} value={studentInternshipContext?.internship_title || '-'} icon="document" />
                    <DetailTile label={t('Provider Email')} value={studentInternshipContext?.provider_email || '-'} icon="mail" />
                    <DetailTile label={t('Latest Training Plan ID')} value={studentInternshipContext?.latest_training_plan_id || '-'} icon="task" />
                    <DetailTile
                      label={t('Latest Weekly Report')}
                      value={
                        studentInternshipContext?.latest_weekly_report_week_no
                          ? `Week ${studentInternshipContext.latest_weekly_report_week_no}`
                          : '-'
                      }
                      icon="chart"
                    />
                  </div>
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {activeTab === 'attendance' ? (
            <ReviewSummaryCard
              title={isArabic ? 'مراجعة الحضور' : 'Attendance Review'}
              summaryRows={summaryRows}
              metricLabel={isArabic ? 'عدد أيام الحضور' : 'Attendance Days'}
              metricValue={0}
              actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
              onAction={openAttendanceDetails}
              isArabic={isArabic}
            />
          ) : null}

          {activeTab === 'tasks' ? (
            <ReviewSummaryCard
              title={isArabic ? 'مراجعة المهام' : 'Tasks Review'}
              summaryRows={summaryRows}
              metricLabel={isArabic ? 'عدد المهام' : 'Tasks Count'}
              metricValue={tasksCount}
              actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
              onAction={openTasksDetails}
              isArabic={isArabic}
            />
          ) : null}

          {activeTab === 'weeklyReports' ? (
            <ReviewSummaryCard
              title={isArabic ? 'مراجعة التقارير الأسبوعية' : 'Weekly Reports Review'}
              summaryRows={summaryRows}
              metricLabel={isArabic ? 'عدد التقارير الأسبوعية' : 'Weekly Reports Count'}
              metricValue={weeklyReportsCount}
              actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
              onAction={openWeeklyReportsDetails}
              isArabic={isArabic}
            />
          ) : null}

          {activeTab === 'evaluation' ? (
            <div className="student-file-evaluation-grid">
              <SectionCard
                title={isArabic ? 'تقييم الشركة' : 'Company Evaluation'}
                icon="briefcase"
                action={
                  <button type="button" className="student-file-primary-action" onClick={openCompanyEvaluationModal}>
                    <SvgIcon name="send" size={17} />
                    {isArabic ? 'إرسال تقييم الشركة' : 'Send Company Evaluation'}
                  </button>
                }
              >
                <div className="student-file-overview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <DetailTile label={t('Status')} value={t(companyEvaluationStatus)} icon="shield" />
                  <DetailTile
                    label={isArabic ? 'درجة تقييم الشركة' : 'Company Score'}
                    value={isCompanyEvaluationSubmitted ? `${companyEvaluationPercentage}%` : '-'}
                    icon="chart"
                  />
                  <DetailTile label={t('Provider')} value={studentInternshipContext?.provider_name || '-'} icon="briefcase" />
                  <DetailTile label={t('Provider Email')} value={studentInternshipContext?.provider_email || '-'} icon="mail" />
                </div>

                {latestFinalEvaluationRequest ? (
                  <div className="student-file-note-item" style={{ marginTop: '1rem' }}>
                    <p>
                      {latestFinalEvaluationRequest.sending_template_name || '-'} —{' '}
                      {t(latestFinalEvaluationRequest.status || 'Pending')}
                    </p>

                    {shouldShowLatestCompanyEvaluationLink ? (
                      <div className="student-file-evaluation-link">
                        <span>{isArabic ? 'رابط تسجيل تقييم الشركة' : 'Registration Link'}</span>
                        <div className="student-file-copy-group">
                          <input value={latestCompanyEvaluationLink} readOnly />
                          <button
                            type="button"
                            className="student-file-mini-btn primary"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(latestCompanyEvaluationLink);
                                showFeedback(
                                  'success',
                                  isArabic ? 'تم نسخ رابط التقييم.' : 'Evaluation link copied.'
                                );
                              } catch {
                                showFeedback(
                                  'danger',
                                  isArabic ? 'تعذر نسخ الرابط.' : 'Could not copy the link.'
                                );
                              }
                            }}
                          >
                            <SvgIcon name="copy" size={15} />
                            {isArabic ? 'نسخ' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    ) : isCompanyEvaluationSubmitted ? (
                      <StatusPill value="Submitted">
                        {isArabic
                          ? `تم استلام تقييم الشركة بدرجة ${companyEvaluationPercentage}%.`
                          : `Company evaluation submitted with a score of ${companyEvaluationPercentage}%.`}
                      </StatusPill>
                    ) : (
                      <span>
                        {isArabic
                          ? 'لا يوجد رابط نشط حاليًا، أو أن آخر طلب تقييم لم يعد في حالة Pending.'
                          : 'There is no active link, or the latest request is no longer Pending.'}
                      </span>
                    )}
                  </div>
                ) : (
                  <EmptyStudentSection
                    message={
                      isArabic
                        ? 'لم يتم إرسال أي طلب تقييم للشركة بعد.'
                        : 'No company evaluation request has been sent yet.'
                    }
                  />
                )}
              </SectionCard>

              <SectionCard
                title={isArabic ? 'تقييم المشرف الأكاديمي' : 'Academic Advisor Evaluation'}
                icon="star"
                action={
                  <button type="button" className="student-file-primary-action" onClick={openAcademicEvaluationModal}>
                    <SvgIcon name="edit" size={17} />
                    {isArabic ? 'إضافة / تعديل' : 'Add / Edit'}
                  </button>
                }
              >
                <div className="student-file-overview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <DetailTile label={t('Status')} value={t(academicEvaluationStatus)} icon="shield" />
                  <DetailTile label={t('Total Percentage')} value={latestAcademicEvaluation?.total_percentage ?? 0} icon="chart" />
                  <DetailTile label={t('Evaluator')} value={latestAcademicEvaluation?.evaluator_name || '-'} icon="user" />
                  <DetailTile label={t('Evaluation Date')} value={formatDate(latestAcademicEvaluation?.evaluation_date, locale)} icon="calendar" />
                </div>

                {latestAcademicEvaluation ? (
                  <>
                    <div className="student-file-score-box" style={{ marginTop: '1rem' }}>
                      <ScoreBar label={t('Commitment')} value={latestAcademicEvaluation?.commitment_score} />
                      <ScoreBar label={t('Communication')} value={latestAcademicEvaluation?.communication_score} />
                      <ScoreBar label={t('Technical Performance')} value={latestAcademicEvaluation?.technical_score} />
                      <ScoreBar label={t('Professional Behavior')} value={latestAcademicEvaluation?.behavior_score} />
                    </div>

                    <div className="student-file-note-item" style={{ marginTop: '1rem' }}>
                      <p><strong>{t('Strengths')}:</strong> {latestAcademicEvaluation?.strengths || '-'}</p>
                      <p><strong>{t('Improvement Areas')}:</strong> {latestAcademicEvaluation?.improvement_areas || '-'}</p>
                      <span><strong>{t('Advisor Notes')}:</strong> {latestAcademicEvaluation?.advisor_notes || '-'}</span>
                    </div>
                  </>
                ) : (
                  <EmptyStudentSection
                    message={
                      isArabic
                        ? 'لم يتم حفظ تقييم أكاديمي لهذا الطالب بعد.'
                        : 'No academic evaluation has been saved for this student yet.'
                    }
                  />
                )}
              </SectionCard>
            </div>
          ) : null}
        </div>

        <aside className="student-file-side-panel">
          <div className="student-file-actions-card">
            <h3>{isArabic ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
            <div className="student-file-action-list">
              <button type="button" className="student-file-primary-action" onClick={openAcademicEvaluationModal}>
                <SvgIcon name="star" size={17} />
                {isArabic ? 'إضافة تقييم نهائي' : 'Add Final Evaluation'}
              </button>
              <button type="button" className="student-file-secondary-action" onClick={openCompanyEvaluationModal}>
                <SvgIcon name="send" size={17} />
                {isArabic ? 'إرسال رسالة للشركة' : 'Send Company Request'}
              </button>
              <button type="button" className="student-file-secondary-action" onClick={openWeeklyReportsDetails}>
                <SvgIcon name="document" size={17} />
                {isArabic ? 'عرض جميع التقارير' : 'View All Reports'}
              </button>
              <button type="button" className="student-file-secondary-action" onClick={() => window.print()}>
                <SvgIcon name="print" size={17} />
                {isArabic ? 'طباعة الملف' : 'Print File'}
              </button>
            </div>
          </div>

          <div className="student-file-actions-card">
            <h3>{isArabic ? 'ملخص التدريب' : 'Internship Summary'}</h3>
            <div className="student-file-action-list">
              <DetailTile label={t('Provider')} value={studentInternshipContext?.provider_name || '-'} icon="briefcase" />
              <DetailTile label={t('Internship Title')} value={studentInternshipContext?.internship_title || '-'} icon="document" />
              <DetailTile label={isArabic ? 'اكتمال الملف' : 'Profile Completeness'} value={`${profileCompleteness}%`} icon="chart" />
              <DetailTile label={isArabic ? 'اكتمال المهام' : 'Tasks Completion'} value={`${tasksPercentage}%`} icon="task" />
            </div>
          </div>

          <div className="student-file-notes-card">
            <h3>{isArabic ? 'ملاحظات المشرف' : 'Advisor Notes'}</h3>
            <div className="student-file-note-item">
              <p>
                {latestAcademicEvaluation?.advisor_notes ||
                  (isArabic
                    ? 'لم يتم تسجيل ملاحظات أكاديمية بعد لهذا الطالب.'
                    : 'No academic notes have been recorded for this student yet.')}
              </p>
              <span>{latestAcademicEvaluation?.evaluation_date ? formatDate(latestAcademicEvaluation.evaluation_date, locale) : '-'}</span>
            </div>
          </div>
        </aside>
      </div>

      <AppModal
        isOpen={isCompanyEvaluationModalOpen}
        title={t('Send Company Evaluation Request')}
        onClose={() => setIsCompanyEvaluationModalOpen(false)}
      >
        <form onSubmit={handleSendCompanyEvaluationRequest} className="d-grid gap-3">
          <input
            type="text"
            className="form-control"
            value={companyEvaluationForm.internshipId}
            readOnly
            placeholder="Internship ID"
          />
          <input
            type="text"
            className="form-control"
            value={companyEvaluationForm.studentUserId}
            readOnly
            placeholder="Student User ID"
          />
          <input
            type="text"
            className="form-control"
            value={companyEvaluationForm.providerName}
            readOnly
            placeholder={isArabic ? 'الجهة المزودة' : 'Provider Name'}
          />
          <input
            type="email"
            className="form-control"
            value={companyEvaluationForm.providerEmail}
            readOnly
            placeholder={isArabic ? 'بريد الجهة' : 'Provider Email'}
          />
          <input
            type="text"
            className="form-control"
            value={companyEvaluationForm.sendingTemplateName}
            onChange={(e) =>
              setCompanyEvaluationForm((current) => ({
                ...current,
                sendingTemplateName: e.target.value,
              }))
            }
            placeholder={isArabic ? 'قالب الإرسال' : 'Sending Template'}
          />
          <input
            type="text"
            className="form-control"
            value={companyEvaluationForm.evaluationTemplateName}
            onChange={(e) =>
              setCompanyEvaluationForm((current) => ({
                ...current,
                evaluationTemplateName: e.target.value,
              }))
            }
            placeholder={isArabic ? 'قالب التقييم' : 'Evaluation Template'}
          />

          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsCompanyEvaluationModalOpen(false)}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={sendingCompanyEvaluation}>
              {sendingCompanyEvaluation
                ? isArabic
                  ? 'جارٍ الإرسال...'
                  : 'Sending...'
                : isArabic
                ? 'إرسال'
                : 'Send'}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={isAcademicEvaluationModalOpen}
        title={t('Academic Advisor Evaluation')}
        onClose={() => setIsAcademicEvaluationModalOpen(false)}
      >
        <form onSubmit={handleSaveAcademicEvaluation} className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">{t('Evaluator')}</label>
              <input
                className="form-control"
                value={academicEvaluationForm.evaluatorName}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    evaluatorName: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t('Evaluation Date')}</label>
              <input
                type="date"
                className="form-control"
                value={academicEvaluationForm.evaluationDate}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    evaluationDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Status')}</label>
              <select
                className="form-select"
                value={academicEvaluationForm.status}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    status: e.target.value,
                  }))
                }
              >
                <option value="Draft">{t('Pending')}</option>
                <option value="Submitted">{t('Submitted')}</option>
                <option value="Approved">{t('Approved')}</option>
                <option value="Rejected">{t('Rejected')}</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Total Percentage')}</label>
              <input className="form-control" value={academicEvaluationTotal} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Commitment')}</label>
              <input
                type="number"
                min="0"
                max="25"
                className="form-control"
                value={academicEvaluationForm.commitmentScore}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    commitmentScore: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Communication')}</label>
              <input
                type="number"
                min="0"
                max="25"
                className="form-control"
                value={academicEvaluationForm.communicationScore}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    communicationScore: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Technical Performance')}</label>
              <input
                type="number"
                min="0"
                max="25"
                className="form-control"
                value={academicEvaluationForm.technicalScore}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    technicalScore: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">{t('Professional Behavior')}</label>
              <input
                type="number"
                min="0"
                max="25"
                className="form-control"
                value={academicEvaluationForm.behaviorScore}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    behaviorScore: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">{t('Strengths')}</label>
              <textarea
                className="form-control"
                rows="3"
                value={academicEvaluationForm.strengths}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    strengths: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">{t('Improvement Areas')}</label>
              <textarea
                className="form-control"
                rows="3"
                value={academicEvaluationForm.improvementAreas}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    improvementAreas: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">{t('Advisor Notes')}</label>
              <textarea
                className="form-control"
                rows="4"
                value={academicEvaluationForm.advisorNotes}
                onChange={(e) =>
                  setAcademicEvaluationForm((current) => ({
                    ...current,
                    advisorNotes: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsAcademicEvaluationModalOpen(false)}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingAcademicEvaluation}>
              {savingAcademicEvaluation
                ? isArabic
                  ? 'جارٍ الحفظ...'
                  : 'Saving...'
                : isArabic
                ? 'حفظ التقييم'
                : 'Save Evaluation'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

export default AcademicAdvisorStudentFilePage;