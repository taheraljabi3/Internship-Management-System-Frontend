import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import ModuleTabs from '../../../shared/components/ModuleTabs';
import AppTable from '../../../shared/components/AppTable';
import AppModal from '../../../shared/components/AppModal';
import TableToolbar from '../../../shared/components/TableToolbar';
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
  if (!context?.internship_id) return null;

  return {
    studentUserId: student.id,
    studentName: student.fullName || context.student_name || '-',
    studentEmail: student.email || context.student_email || '-',
    internshipId: context.internship_id,
    internshipTitle: context.internship_title || context.title || '-',
    providerName: context.provider_name || '-',
    providerEmail: context.provider_email || '',
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
  if (companyScore === null || companyScore === undefined || academicScore === null || academicScore === undefined) {
    return 'Pending';
  }

  const finalAverage = calculateFinalAverage(companyScore, academicScore);
  return finalAverage >= 60 ? 'Passed' : 'Needs Review';
}

function FeedbackAlert({ feedback, onClose }) {
  if (!feedback?.message) return null;

  const alertType = feedback.type || 'info';

  return (
    <div className={`alert alert-${alertType} alert-dismissible fade show`} role="alert">
      {feedback.message}
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
    </div>
  );
}

function EmptyPanel({ children }) {
  return <div className="ims-empty-panel">{children}</div>;
}

function KpiCard({ label, value, helper }) {
  return (
    <div className="col-md-6 col-xl-3">
      <div className="card ims-stat-card h-100">
        <div className="card-body">
          <div className="ims-stat-label">{label}</div>
          <div className="ims-stat-value">{value}</div>
          {helper ? <div className="text-muted small mt-2">{helper}</div> : null}
        </div>
      </div>
    </div>
  );
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

function EvaluationModulePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

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
      submittedAt: item.submitted_at ? String(item.submitted_at).slice(0, 10) : '-',
      totalPercentage: item.total_percentage ?? '-',
    }));
  }, [companyEvaluations, selectedContext]);

  const academicEvaluationRows = useMemo(() => {
    return academicEvaluations.map((item) => ({
      ...item,
      studentName: item.student_name || selectedContext?.studentName || '-',
      evaluatorName: item.evaluator_name || '-',
      submittedAt: item.submitted_at || item.evaluation_date || '-',
      totalPercentage: item.total_percentage ?? '-',
    }));
  }, [academicEvaluations, selectedContext]);

  const selectedCompanyScore = finalSummary?.company_total_percentage ?? companyEvaluationRows[0]?.total_percentage ?? null;
  const selectedAcademicScore = finalSummary?.academic_total_percentage ?? academicEvaluationRows[0]?.total_percentage ?? null;
  const selectedFinalAverage = calculateFinalAverage(selectedCompanyScore, selectedAcademicScore);

  const clearFeedback = () => setFeedback({ type: '', message: '' });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

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
        const students = role === 'Administrator'
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
      showFeedback('warning', isArabic ? 'وزن المعيار يجب أن يكون أكبر من صفر.' : 'Criterion weight must be greater than zero.');
      return;
    }

    if (getNumber(criterionForm.max_score) <= 0) {
      showFeedback('warning', isArabic ? 'درجة المعيار يجب أن تكون أكبر من صفر.' : 'Criterion max score must be greater than zero.');
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
        created_by_user_id: Number(user?.id || 0),
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

  const templateColumns = [
    { key: 'title', label: 'Template' },
    { key: 'version', label: 'Version' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'created_at', label: 'Created At', render: (value) => (value ? String(value).slice(0, 10) : '-') },
    {
      key: 'criteria',
      label: 'Criteria',
      render: (_, row) => templateCriteriaMap[row.id]?.length || 0,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setSelectedRecord({ type: 'template', ...row, criteria: templateCriteriaMap[row.id] || [] })}
          >
            {t('View')}
          </button>
          {canManage ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => openEditTemplateModal(row)}
            >
              {t('Edit')}
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const criteriaColumns = [
    { key: 'sort_order', label: '#' },
    { key: 'criterion_name', label: isArabic ? 'المعيار' : 'Criterion' },
    { key: 'question', label: isArabic ? 'السؤال' : 'Question', render: (value) => value || '-' },
    { key: 'weight', label: isArabic ? 'الوزن %' : 'Weight %', render: (value) => `${value}%` },
    { key: 'max_score', label: isArabic ? 'الدرجة' : 'Max Score' },
    {
      key: 'is_required',
      label: isArabic ? 'إلزامي' : 'Required',
      render: (value) => (value ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')),
    },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (_, row) => (
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => openEditCriterionModal(row)}
          >
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleRemoveCriterion(row.localId)}
            disabled={templateForm.criteria.length === 1}
          >
            {isArabic ? 'حذف' : 'Remove'}
          </button>
        </div>
      ),
    },
  ];

  const resultColumns = [
    ...(isStudent ? [] : [{ key: 'studentName', label: 'Student' }]),
    { key: 'providerName', label: 'Provider' },
    { key: 'internshipTitle', label: 'Internship' },
    { key: 'companyStatus', label: 'Company Status', type: 'status' },
    {
      key: 'companyScore',
      label: 'Company Score',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    { key: 'academicStatus', label: 'Academic Status', type: 'status' },
    {
      key: 'academicScore',
      label: 'Academic Score',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    {
      key: 'finalAverage',
      label: 'Final Average',
      render: (value) => (value === null || value === undefined ? '-' : `${value}%`),
    },
    { key: 'finalStatus', label: 'Final Status', type: 'status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            setSelectedInternshipId(String(row.internship_id));
            setSelectedRecord({ type: 'result', ...row });
          }}
        >
          {t('View Details')}
        </button>
      ),
    },
  ];

  const companyColumns = [
    { key: 'studentName', label: 'Student' },
    { key: 'providerName', label: 'Provider' },
    { key: 'evaluatorName', label: 'Evaluator' },
    { key: 'submittedAt', label: 'Submitted At' },
    { key: 'totalPercentage', label: 'Percentage', render: (value) => (value === '-' ? '-' : `${value}%`) },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  const academicColumns = [
    { key: 'studentName', label: 'Student' },
    { key: 'evaluatorName', label: 'Evaluator' },
    { key: 'submittedAt', label: 'Submitted At' },
    { key: 'totalPercentage', label: 'Percentage', render: (value) => (value === '-' ? '-' : `${value}%`) },
    { key: 'status', label: 'Status', type: 'status' },
  ];

  const overviewStats = [
    {
      label: isArabic ? 'قوالب التقييم' : 'Templates',
      value: templates.length,
      helper: isArabic ? 'للتدريب المحدد' : 'For selected internship',
    },
    {
      label: isArabic ? 'تقييمات الشركة' : 'Company Evaluations',
      value: companyEvaluationRows.length,
      helper: isArabic ? 'المستلمة من الشركة' : 'Submitted by provider',
    },
    {
      label: isArabic ? 'تقييمات الدكتور' : 'Academic Evaluations',
      value: academicEvaluationRows.length,
      helper: isArabic ? 'المحفوظة من المشرف' : 'Saved by advisor',
    },
    {
      label: isArabic ? 'المتوسط النهائي' : 'Final Average',
      value: selectedFinalAverage === null || selectedFinalAverage === undefined ? '-' : `${selectedFinalAverage}%`,
      helper: isArabic ? 'الشركة 50% + الدكتور 50%' : 'Company 50% + Academic 50%',
    },
  ];

  if (loading) {
    return <EmptyPanel>{isArabic ? 'جارٍ تحميل بيانات التقييم...' : 'Loading evaluation data...'}</EmptyPanel>;
  }

  return (
    <div>
      <ModulePageHeader
        title="Evaluation"
        description={
          isStudent
            ? 'Review your company evaluation, academic advisor evaluation, and final average.'
            : 'Build professional evaluation templates through modals, manage criteria, and review student evaluation results.'
        }
        addLabel={canManage && activeTab === 'templates' ? (isArabic ? 'إضافة قالب تقييم' : 'Add Evaluation Template') : undefined}
        onAddClick={canManage && activeTab === 'templates' ? openAddTemplateModal : null}
      />

      <FeedbackAlert feedback={feedback} onClose={clearFeedback} />

      {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}

      <ModuleTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      <div className="row g-3 mt-3 mb-4">
        {overviewStats.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      {canManage ? (
        <div className="card ims-table-card mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-lg-8">
                <label className="form-label">
                  {isArabic ? 'اختر الطالب / التدريب' : 'Select Student / Internship'}
                </label>
                <select
                  className="form-select"
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

              <div className="col-lg-4">
                <div className="ims-detail-box h-100">
                  <div className="ims-detail-label">{isArabic ? 'البريد المعتمد للشركة' : 'Provider Email'}</div>
                  <div className="ims-detail-value">{selectedContext?.providerEmail || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'templates' && canManage ? (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title="Company Evaluation Templates"
              subtitle="Create and edit templates through modals. Criteria are managed from a dedicated Evaluation Criteria modal."
            />
            <AppTable
              columns={templateColumns}
              rows={templates}
              rowKey="id"
              emptyMessage="No templates have been created for the selected internship yet."
            />
          </div>
        </div>
      ) : null}

      {activeTab === 'results' ? (
        <div className="d-grid gap-4">
          <div className="card ims-table-card">
            <div className="card-body">
              <TableToolbar
                title="Student Evaluation Results"
                subtitle="Final average is calculated using Company Evaluation 50% + Academic Evaluation 50%."
              />
              <AppTable
                columns={resultColumns}
                rows={resultRows}
                rowKey="id"
                emptyMessage="No evaluation results found."
              />
            </div>
          </div>

          {selectedContext ? (
            <div className="row g-4">
              <div className="col-xl-6">
                <div className="card ims-table-card h-100">
                  <div className="card-body">
                    <TableToolbar
                      title="Company Evaluation for Selected Student"
                      subtitle="Company-submitted evaluation records for the selected internship."
                    />
                    <AppTable
                      columns={companyColumns}
                      rows={companyEvaluationRows}
                      rowKey="id"
                      emptyMessage="No company evaluation has been submitted for the selected student."
                    />
                  </div>
                </div>
              </div>

              <div className="col-xl-6">
                <div className="card ims-table-card h-100">
                  <div className="card-body">
                    <TableToolbar
                      title="Academic Advisor Evaluation for Selected Student"
                      subtitle="Academic advisor evaluation records for the selected internship."
                    />
                    <AppTable
                      columns={academicColumns}
                      rows={academicEvaluationRows}
                      rowKey="id"
                      emptyMessage="No academic advisor evaluation has been saved for the selected student."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <AppModal
        isOpen={isTemplateModalOpen}
        title={editingTemplate ? (isArabic ? 'تعديل قالب التقييم' : 'Edit Evaluation Template') : (isArabic ? 'إضافة قالب تقييم' : 'Add Evaluation Template')}
        onClose={closeTemplateModal}
      >
        <form onSubmit={handleSaveTemplate} className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'اسم القالب' : 'Template Title'}</label>
              <input
                className="form-control"
                value={templateForm.title}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">{isArabic ? 'الإصدار' : 'Version'}</label>
              <input
                className="form-control"
                value={templateForm.version}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, version: event.target.value }))
                }
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">{isArabic ? 'الحالة' : 'Status'}</label>
              <select
                className="form-select"
                value={templateForm.status}
                onChange={(event) =>
                  setTemplateForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="Active">{t('Active')}</option>
                <option value="Draft">{t('Draft')}</option>
                <option value="Archived">{t('Archived')}</option>
              </select>
            </div>
          </div>

          <div className="border rounded-4 p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <div className="fw-semibold">{isArabic ? 'جاهزية القالب' : 'Template Readiness'}</div>
              <span className={`badge ${totalWeight === 100 ? 'text-bg-success' : 'text-bg-warning'}`}>
                {totalWeight}%
              </span>
            </div>
            <div className="text-muted small">
              {totalWeight === 100
                ? isArabic
                  ? 'مجموع الأوزان يساوي 100% والقالب جاهز للحفظ.'
                  : 'Total weight equals 100%. The template is ready to save.'
                : isArabic
                  ? `المتبقي للوصول إلى 100%: ${100 - totalWeight}%`
                  : `Remaining to reach 100%: ${100 - totalWeight}%`}
            </div>
            <div className="text-muted small mt-1">
              {isArabic ? 'إجمالي الدرجات' : 'Total Max Score'}: {totalMaxScore}
            </div>
          </div>

          {templateValidation ? <div className="alert alert-warning mb-0">{templateValidation}</div> : null}

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 className="mb-0">{isArabic ? 'معايير التقييم' : 'Evaluation Criteria'}</h6>
            <div className="d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={openAddCriterionModal}>
                {isArabic ? 'إضافة معيار' : 'Add Criterion'}
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleResetDefaultCriteria}>
                {isArabic ? 'استعادة الافتراضي' : 'Reset Default'}
              </button>
            </div>
          </div>

          <AppTable
            columns={criteriaColumns}
            rows={templateForm.criteria}
            rowKey="localId"
            emptyMessage="No criteria have been added yet."
          />

          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={closeTemplateModal}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingTemplate || Boolean(templateValidation)}>
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
      </AppModal>

      <AppModal
        isOpen={isCriterionModalOpen}
        title={editingCriterionLocalId ? (isArabic ? 'تعديل معيار التقييم' : 'Edit Evaluation Criterion') : (isArabic ? 'إضافة معيار تقييم' : 'Add Evaluation Criterion')}
        onClose={closeCriterionModal}
      >
        <form onSubmit={handleSaveCriterion} className="d-grid gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'اسم المعيار' : 'Criterion Name'}</label>
              <input
                className="form-control"
                value={criterionForm.criterion_name}
                onChange={(event) => handleCriterionFormChange('criterion_name', event.target.value)}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">{isArabic ? 'الوزن %' : 'Weight %'}</label>
              <input
                type="number"
                min="0"
                max="100"
                className="form-control"
                value={criterionForm.weight}
                onChange={(event) => handleCriterionFormChange('weight', event.target.value)}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">{isArabic ? 'الدرجة' : 'Max Score'}</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={criterionForm.max_score}
                onChange={(event) => handleCriterionFormChange('max_score', event.target.value)}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">{isArabic ? 'الترتيب' : 'Sort Order'}</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={criterionForm.sort_order}
                onChange={(event) => handleCriterionFormChange('sort_order', event.target.value)}
                required
              />
            </div>

            <div className="col-md-9 d-flex align-items-end">
              <div className="form-check mb-2">
                <input
                  id="criterion-required"
                  className="form-check-input"
                  type="checkbox"
                  checked={Boolean(criterionForm.is_required)}
                  onChange={(event) => handleCriterionFormChange('is_required', event.target.checked)}
                />
                <label className="form-check-label" htmlFor="criterion-required">
                  {isArabic ? 'معيار إلزامي' : 'Required criterion'}
                </label>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label">{isArabic ? 'سؤال / وصف المعيار' : 'Question / Description'}</label>
              <textarea
                className="form-control"
                rows="4"
                value={criterionForm.question}
                onChange={(event) => handleCriterionFormChange('question', event.target.value)}
                placeholder={isArabic ? 'اكتب السؤال الذي سيظهر للمقيّم...' : 'Write the question shown to the evaluator...'}
              />
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={closeCriterionModal}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCriterionLocalId ? (isArabic ? 'حفظ التعديل' : 'Save Changes') : (isArabic ? 'إضافة المعيار' : 'Add Criterion')}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={Boolean(selectedRecord)}
        title={selectedRecord?.type === 'template' ? 'Evaluation Template Details' : 'Evaluation Result Details'}
        onClose={() => setSelectedRecord(null)}
      >
        {selectedRecord?.type === 'template' ? (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="ims-detail-box">
                  <div className="ims-detail-label">Template</div>
                  <div className="ims-detail-value">{selectedRecord.title || '-'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="ims-detail-box">
                  <div className="ims-detail-label">Version</div>
                  <div className="ims-detail-value">{selectedRecord.version || '-'}</div>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column gap-3">
              {(selectedRecord.criteria || []).map((criterion, index) => (
                <div key={criterion.id || index} className="border rounded-4 p-3 bg-light">
                  <div className="fw-semibold">{criterion.criterion_name || criterion.name || '-'}</div>
                  <div className="text-muted small">
                    Weight: {criterion.weight ?? '-'}% | Max Score: {criterion.max_score ?? criterion.weight ?? '-'} | Sort: {criterion.sort_order ?? index + 1}
                  </div>
                  {criterion.question ? <div className="text-muted small mt-2">{criterion.question}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedRecord?.type === 'result' ? (
          <div className="row g-3">
            <div className="col-md-6">
              <div className="ims-detail-box">
                <div className="ims-detail-label">Student</div>
                <div className="ims-detail-value">{selectedRecord.studentName}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="ims-detail-box">
                <div className="ims-detail-label">Provider</div>
                <div className="ims-detail-value">{selectedRecord.providerName}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="ims-detail-box">
                <div className="ims-detail-label">Company Score</div>
                <div className="ims-detail-value">
                  {selectedRecord.companyScore === null || selectedRecord.companyScore === undefined
                    ? '-'
                    : `${selectedRecord.companyScore}%`}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="ims-detail-box">
                <div className="ims-detail-label">Academic Score</div>
                <div className="ims-detail-value">
                  {selectedRecord.academicScore === null || selectedRecord.academicScore === undefined
                    ? '-'
                    : `${selectedRecord.academicScore}%`}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="ims-detail-box">
                <div className="ims-detail-label">Final Average</div>
                <div className="ims-detail-value">
                  {selectedRecord.finalAverage === null || selectedRecord.finalAverage === undefined
                    ? '-'
                    : `${selectedRecord.finalAverage}%`}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </AppModal>
    </div>
  );
}

export default EvaluationModulePage;