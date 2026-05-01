import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

function ReviewSummaryCard({ title, summaryRows, metricLabel, metricValue, actionLabel, onAction }) {
  return (
    <div className="card ims-table-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h5 className="ims-section-title mb-0">{title}</h5>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
            {actionLabel}
          </button>
        </div>

        <div className="row g-3 mb-3">
          {summaryRows.map((item) => (
            <div className="col-md-6 col-xl-3" key={item.label}>
              <div className="ims-detail-box h-100">
                <div className="ims-detail-label">{item.label}</div>
                <div className="ims-detail-value">{item.value}</div>
              </div>
            </div>
          ))}
          <div className="col-md-6 col-xl-3">
            <div className="card ims-stat-card h-100">
              <div className="card-body">
                <div className="ims-stat-label">{metricLabel}</div>
                <div className="ims-stat-value">{metricValue}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStudentSection({ message }) {
  return <div className="ims-empty-panel">{message}</div>;
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
    <div className="card ims-table-card">
      <div className="card-body">
        <h5 className="ims-section-title mb-3">{isArabic ? 'مهارات الطالب' : 'Student Skills'}</h5>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>{isArabic ? 'المهارة' : 'Skill'}</th>
                <th>{isArabic ? 'المستوى' : 'Level'}</th>
                <th>{isArabic ? 'التصنيف' : 'Category'}</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id}>
                  <td className="fw-semibold">{skill.name || '-'}</td>
                  <td>{skill.level ? t(skill.level) : '-'}</td>
                  <td>{skill.category || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentDocumentsSection({ documents, isArabic, t }) {
  const normalizedDocuments = useMemo(
    () => (Array.isArray(documents) ? documents.map(normalizeStudentDocument).filter(Boolean) : []),
    [documents]
  );

  if (!normalizedDocuments.length) {
    return (
      <EmptyStudentSection
        message={
          isArabic
            ? 'لا توجد مرفقات مسجلة لهذا الطالب حتى الآن.'
            : 'No attachments have been added for this student yet.'
        }
      />
    );
  }

  return (
    <div className="card ims-table-card">
      <div className="card-body">
        <h5 className="ims-section-title mb-3">
          {isArabic ? 'مرفقات الطالب' : 'Student Attachments'}
        </h5>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>{isArabic ? 'العنوان' : 'Title'}</th>
                <th>{isArabic ? 'اسم الملف' : 'File Name'}</th>
                <th>{isArabic ? 'التصنيف' : 'Category'}</th>
                <th>{isArabic ? 'نوع الملف' : 'File Type'}</th>
                <th>{isArabic ? 'الحالة' : 'Status'}</th>
                <th>{isArabic ? 'تاريخ الرفع' : 'Uploaded At'}</th>
                <th>{isArabic ? 'الرابط' : 'Link'}</th>
              </tr>
            </thead>
            <tbody>
              {normalizedDocuments.map((document) => {
                const fileUrl = resolveDocumentUrl(document.file_url);

                return (
                  <tr key={document.id}>
                    <td className="fw-semibold">{document.title || '-'}</td>
                    <td>{document.file_name || '-'}</td>
                    <td>{document.category ? t(document.category) : '-'}</td>
                    <td>{document.file_type || '-'}</td>
                    <td>{document.status ? t(document.status) : '-'}</td>
                    <td>
                      {document.uploaded_at
                        ? new Date(document.uploaded_at).toLocaleString()
                        : '-'}
                    </td>
                    <td>
                      {fileUrl ? (
                        <div className="d-flex gap-2 flex-wrap">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline-primary btn-sm"
                          >
                            {isArabic ? 'فتح' : 'Open'}
                          </a>

                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => downloadFileFromUrl(fileUrl, document.file_name)}
                          >
                            {isArabic ? 'تحميل' : 'Download'}
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
    <div className="row g-3">
      {projects.map((project) => (
        <div className="col-md-6" key={project.id}>
          <div className="card ims-table-card h-100">
            <div className="card-body">
              <h5 className="ims-section-title mb-2">{project.title || '-'}</h5>

              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge text-bg-light border">
                  {isArabic ? 'السنة' : 'Year'}: {project.project_year || '-'}
                </span>
                <span className="badge text-bg-light border">
                  {isArabic ? 'الدور' : 'Role'}: {project.role_name || '-'}
                </span>
              </div>

              <p className="text-muted mb-3">{project.description || '-'}</p>

              {project.project_link ? (
                <a
                  href={project.project_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-primary btn-sm"
                >
                  {isArabic ? 'فتح رابط المشروع' : 'Open Project Link'}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentCoursesSection({ courses, isArabic }) {
  if (!courses.length) {
    return (
      <EmptyStudentSection
        message={
          isArabic
            ? 'لا توجد دورات مسجلة لهذا الطالب حتى الآن.'
            : 'No courses have been added for this student yet.'
        }
      />
    );
  }

  return (
    <div className="card ims-table-card">
      <div className="card-body">
        <h5 className="ims-section-title mb-3">{isArabic ? 'دورات الطالب' : 'Student Courses'}</h5>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>{isArabic ? 'الدورة' : 'Course'}</th>
                <th>{isArabic ? 'الجهة' : 'Provider'}</th>
                <th>{isArabic ? 'الساعات' : 'Hours'}</th>
                <th>{isArabic ? 'السنة' : 'Year'}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="fw-semibold">{course.title || '-'}</td>
                  <td>{course.provider || '-'}</td>
                  <td>{course.hours ?? '-'}</td>
                  <td>{course.course_year ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function normalizeAdvisor(advisor) {
  return {
    id: advisor.user_id ?? advisor.id,
    fullName: advisor.full_name || '',
    email: advisor.email || '',
  };
}

function normalizeStudent(student, advisor) {
  return {
    id: student.student_user_id ?? student.id,
    fullName: student.full_name || '',
    email: student.email || '',
    studentCode: student.student_code || '',
    university: student.university || '',
    major: student.major || '',
    gpa: student.gpa ?? '',
    assignmentStartAt: student.assignment_start_at || '',
    advisorName: advisor?.fullName || '',
    advisorEmail: advisor?.email || '',
  };
}

function buildAcademicEvaluationForm(user, student, context, existingEvaluation) {
  return {
    internshipId: String(context?.internship_id || ''),
    studentUserId: String(student?.id || ''),
    advisorUserId: String(user?.id || ''),
    evaluatorName: existingEvaluation?.evaluator_name || user?.fullName || '',
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

function AcademicAdvisorStudentFilePage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

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

  const studentSections = [
    { key: 'overview', label: isArabic ? 'نظرة عامة' : 'Overview' },
    { key: 'skills', label: isArabic ? 'المهارات' : 'Skills' },
    { key: 'attachments', label: isArabic ? 'المرفقات' : 'Attachments' },
    { key: 'projects', label: isArabic ? 'المشاريع' : 'Projects' },
    { key: 'courses', label: isArabic ? 'الدورات' : 'Courses' },
    { key: 'internship', label: isArabic ? 'التدريب والفرص' : 'Training & Opportunities' },
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
      <div className="ims-empty-panel d-flex flex-column gap-3">
        <div>{isArabic ? 'جارٍ تحميل ملف الطالب...' : 'Loading the student file...'}</div>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div className="ims-empty-panel d-flex flex-column gap-3">
        <div>
          {errorMessage ||
            (isArabic
              ? 'الطالب غير موجود أو غير مرتبط بهذا المشرف.'
              : 'The student was not found or is not linked to this advisor.')}
        </div>
        <button
          type="button"
          className="btn btn-primary align-self-start"
          onClick={() => navigate(ROUTES.DASHBOARD.ACADEMIC_ADVISOR)}
        >
          {t('Back to Students')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="ims-page-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h1 className="ims-page-title">{t('Student File')}</h1>
          <p className="ims-page-description">{selectedStudent.fullName}</p>
        </div>
        <Link className="btn btn-outline-primary" to={ROUTES.DASHBOARD.ACADEMIC_ADVISOR}>
          {t('Back to Students')}
        </Link>
      </div>

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} />

      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-3 mb-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-light border"
              style={{ width: 64, height: 64, fontWeight: 700, fontSize: 20 }}
            >
              {String(selectedStudent.fullName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="mb-1">{selectedStudent.fullName}</h3>
              <div className="text-muted">{selectedStudent.email}</div>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-2">
            <span
              className={`badge ${
                studentInternshipContext?.internship_id ? 'text-bg-success' : 'text-bg-secondary'
              }`}
            >
              {t(studentInternshipContext?.internship_id ? 'Has Internship' : 'No Internship')}
            </span>
            <span
              className={`badge ${
                academicEvaluationStatus === 'Submitted' || academicEvaluationStatus === 'Approved'
                  ? 'text-bg-success'
                  : academicEvaluationStatus === 'Rejected'
                  ? 'text-bg-danger'
                  : 'text-bg-warning'
              }`}
            >
              {t(academicEvaluationStatus)}
            </span>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        {['studentFile', 'attendance', 'tasks', 'weeklyReports', 'evaluation'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(
              tab === 'studentFile'
                ? 'Student File'
                : tab === 'weeklyReports'
                ? 'Weekly Reports'
                : tab[0].toUpperCase() + tab.slice(1)
            )}
          </button>
        ))}
      </div>

      {activeTab === 'studentFile' ? (
        <div>
          <div className="d-flex flex-wrap gap-2 mb-4">
            {studentSections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`btn btn-sm ${
                  activeStudentSection === section.key ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => setActiveStudentSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeStudentSection === 'overview' ? (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('Student')}</div>
                    <div className="ims-detail-value">{selectedStudent.fullName}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('University')}</div>
                    <div className="ims-detail-value">{selectedStudent.university || '-'}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('Major')}</div>
                    <div className="ims-detail-value">{selectedStudent.major || '-'}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('Student Code')}</div>
                    <div className="ims-detail-value">{selectedStudent.studentCode || '-'}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('GPA')}</div>
                    <div className="ims-detail-value">{selectedStudent.gpa || '-'}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('Academic Advisor')}</div>
                    <div className="ims-detail-value">{selectedStudent.advisorName || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{t('Training Plans')}</div>
                      <div className="ims-stat-value">{trainingPlans.length}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{t('Tasks')}</div>
                      <div className="ims-stat-value">{trainingTasks.length}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{t('Weekly Reports')}</div>
                      <div className="ims-stat-value">{weeklyReports.length}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{t('Academic Evaluation')}</div>
                      <div className="ims-stat-value">{latestAcademicEvaluation?.total_percentage ?? 0}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{isArabic ? 'المهارات' : 'Skills'}</div>
                      <div className="ims-stat-value">{skillsCount}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{isArabic ? 'المرفقات' : 'Attachments'}</div>
                      <div className="ims-stat-value">{attachmentsCount}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{isArabic ? 'المشاريع' : 'Projects'}</div>
                      <div className="ims-stat-value">{projectsCount}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card ims-stat-card h-100">
                    <div className="card-body">
                      <div className="ims-stat-label">{isArabic ? 'الدورات' : 'Courses'}</div>
                      <div className="ims-stat-value">{coursesCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeStudentSection === 'skills' ? (
            <div className="card ims-table-card">
              <div className="card-body">
                <h5 className="ims-section-title mb-3">
                  {isArabic ? 'مهارات الطالب' : 'Student Skills'}
                </h5>

                {studentSkills.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{isArabic ? 'المهارة' : 'Skill'}</th>
                          <th>{isArabic ? 'المستوى' : 'Level'}</th>
                          <th>{isArabic ? 'التصنيف' : 'Category'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentSkills.map((skill) => (
                          <tr key={skill.id}>
                            <td className="fw-semibold">{skill.name || '-'}</td>
                            <td>{skill.level || '-'}</td>
                            <td>{skill.category || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ims-empty-panel">
                    {isArabic
                      ? 'لا توجد مهارات مسجلة لهذا الطالب بعد.'
                      : 'No skills have been added for this student yet.'}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeStudentSection === 'attachments' ? (
            <StudentDocumentsSection documents={studentDocuments} isArabic={isArabic} t={t} />
          ) : null}

          {activeStudentSection === 'projects' ? (
            <StudentProjectsSection projects={studentProjects} isArabic={isArabic} />
          ) : null}

          {activeStudentSection === 'courses' ? (
            <StudentCoursesSection courses={studentCourses} isArabic={isArabic} />
          ) : null}

          {activeStudentSection === 'internship' ? (
            <div className="card ims-table-card">
              <div className="card-body">
                <h5 className="ims-section-title mb-3">{t('Internship & Opportunity')}</h5>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Internship Status')}</div>
                      <div className="ims-detail-value">
                        {t(studentInternshipContext?.internship_id ? 'Has Internship' : 'No Internship')}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Provider')}</div>
                      <div className="ims-detail-value">{studentInternshipContext?.provider_name || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Internship Title')}</div>
                      <div className="ims-detail-value">{studentInternshipContext?.internship_title || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Provider Email')}</div>
                      <div className="ims-detail-value">{studentInternshipContext?.provider_email || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Latest Training Plan ID')}</div>
                      <div className="ims-detail-value">{studentInternshipContext?.latest_training_plan_id || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Latest Weekly Report')}</div>
                      <div className="ims-detail-value">
                        {studentInternshipContext?.latest_weekly_report_week_no
                          ? `Week ${studentInternshipContext.latest_weekly_report_week_no}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'attendance' ? (
        <ReviewSummaryCard
          title={isArabic ? 'واجهة مراجعة الحضور' : 'Attendance Review'}
          summaryRows={summaryRows}
          metricLabel={isArabic ? 'عدد أيام الحضور' : 'Attendance Days'}
          metricValue={0}
          actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
          onAction={openAttendanceDetails}
        />
      ) : null}

      {activeTab === 'tasks' ? (
        <ReviewSummaryCard
          title={isArabic ? 'واجهة مراجعة المهام' : 'Tasks Review'}
          summaryRows={summaryRows}
          metricLabel={isArabic ? 'عدد المهام' : 'Tasks Count'}
          metricValue={tasksCount}
          actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
          onAction={openTasksDetails}
        />
      ) : null}

      {activeTab === 'weeklyReports' ? (
        <ReviewSummaryCard
          title={isArabic ? 'واجهة مراجعة التقارير الأسبوعية' : 'Weekly Reports Review'}
          summaryRows={summaryRows}
          metricLabel={isArabic ? 'عدد التقارير الأسبوعية' : 'Weekly Reports Count'}
          metricValue={weeklyReportsCount}
          actionLabel={isArabic ? 'عرض التفاصيل' : 'View Details'}
          onAction={openWeeklyReportsDetails}
        />
      ) : null}

      {activeTab === 'evaluation' ? (
        <div className="row g-3">
          <div className="col-xl-6">
            <div className="card ims-table-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h5 className="ims-section-title mb-0">
                    {isArabic ? 'تقييم الشركة' : 'Company Evaluation Request'}
                  </h5>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={openCompanyEvaluationModal}
                  >
                    {isArabic ? 'إرسال تقييم الشركة' : 'Send Company Evaluation'}
                  </button>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Status')}</div>
                      <div className="ims-detail-value">{t(companyEvaluationStatus)}</div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">
                        {isArabic ? 'درجة تقييم الشركة' : 'Company Evaluation Score'}
                      </div>
                      <div className="ims-detail-value">
                        {isCompanyEvaluationSubmitted ? `${companyEvaluationPercentage}%` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Provider')}</div>
                      <div className="ims-detail-value">
                        {studentInternshipContext?.provider_name || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Provider Email')}</div>
                      <div className="ims-detail-value">
                        {studentInternshipContext?.provider_email || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Template')}</div>
                      <div className="ims-detail-value">
                        {latestFinalEvaluationRequest?.evaluation_template_name ||
                          companyEvaluationForm.evaluationTemplateName ||
                          '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {latestFinalEvaluationRequest ? (
                  <div className="ims-detail-box">
                    <div className="ims-detail-label">{t('Latest Company Request')}</div>

                    <div className="ims-detail-value">
                      {latestFinalEvaluationRequest.sending_template_name || '-'} —{' '}
                      {t(latestFinalEvaluationRequest.status || 'Pending')}
                    </div>

                    {shouldShowLatestCompanyEvaluationLink ? (
                      <div className="mt-3">
                        <div className="text-muted small mb-1">
                          {isArabic ? 'رابط تسجيل تقييم الشركة' : 'Registration Link'}
                        </div>

                        <div className="input-group">
                          <input
                            className="form-control"
                            value={latestCompanyEvaluationLink}
                            readOnly
                          />

                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={async () => {
                              await navigator.clipboard.writeText(latestCompanyEvaluationLink);
                              showFeedback(
                                'success',
                                isArabic ? 'تم نسخ رابط التقييم.' : 'Evaluation link copied.'
                              );
                            }}
                          >
                            {isArabic ? 'نسخ' : 'Copy'}
                          </button>
                        </div>

                        <div className="text-muted small mt-2">
                          {isArabic
                            ? 'هذا رابط نشط لآخر طلب تقييم شركة، ويُستخدم للتسجيل من إيميل الشركة المعتمد فقط.'
                            : 'This is the active link for the latest company evaluation request. It can only be used with the assigned company email.'}
                        </div>
                      </div>
                    ) : isCompanyEvaluationSubmitted ? (
                      <div className="alert alert-success mt-3 mb-0">
                        {isArabic
                          ? `تم استلام تقييم الشركة بدرجة ${companyEvaluationPercentage}%.`
                          : `Company evaluation submitted with a score of ${companyEvaluationPercentage}%.`}
                      </div>
                    ) : (
                      <div className="text-muted small mt-2">
                        {latestFinalEvaluationRequest
                          ? isArabic
                            ? 'لا يوجد رابط نشط حاليًا، أو أن آخر طلب تقييم لم يعد في حالة Pending.'
                            : 'There is no active link, or the latest request is no longer Pending.'
                          : isArabic
                          ? 'لم يتم إرسال أي طلب تقييم للشركة بعد.'
                          : 'No company evaluation request has been sent yet.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ims-empty-panel">
                    {isArabic
                      ? 'لم يتم إرسال أي طلب تقييم للشركة بعد.'
                      : 'No company evaluation request has been sent yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-xl-6">
            <div className="card ims-table-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h5 className="ims-section-title mb-0">
                    {isArabic ? 'تقييم المشرف الأكاديمي' : 'Academic Advisor Evaluation'}
                  </h5>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={openAcademicEvaluationModal}
                  >
                    {isArabic ? 'إضافة / تعديل التقييم' : 'Add / Edit Evaluation'}
                  </button>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Status')}</div>
                      <div className="ims-detail-value">{t(academicEvaluationStatus)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Total Percentage')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.total_percentage ?? 0}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Evaluator')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.evaluator_name || '-'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Evaluation Date')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.evaluation_date || '-'}</div>
                    </div>
                  </div>
                </div>

                {latestAcademicEvaluation ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Strengths')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.strengths || '-'}</div>
                    </div>
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Improvement Areas')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.improvement_areas || '-'}</div>
                    </div>
                    <div className="ims-detail-box">
                      <div className="ims-detail-label">{t('Advisor Notes')}</div>
                      <div className="ims-detail-value">{latestAcademicEvaluation?.advisor_notes || '-'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="ims-empty-panel">
                    {isArabic
                      ? 'لم يتم حفظ تقييم أكاديمي لهذا الطالب بعد.'
                      : 'No academic evaluation has been saved for this student yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

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