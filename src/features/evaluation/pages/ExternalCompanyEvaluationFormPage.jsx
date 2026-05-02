import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  registerCompanyEvaluationLinkRequest,
  submitCompanyEvaluationRequest,
} from '../../../app/api/client';

const LABELS = {
  en: {
    invalidTitle: 'Company Evaluation Form',
    invalidMessage: 'This evaluation link is invalid or missing.',
    title: 'Company Evaluation',
    subtitle: 'Verify the company evaluator, complete the criteria, and submit the final evaluation securely.',
    verifyStep: 'Verify',
    evaluateStep: 'Evaluate',
    submitStep: 'Submit',
    companyRegistration: 'Company Registration',
    companyRegistrationHint: 'Use the same company email that received the evaluation request.',
    evaluatorName: 'Evaluator Name',
    jobTitle: 'Job Title',
    companyEmail: 'Company Email',
    emailHint: 'The email must match the company email assigned to this evaluation request.',
    registerContinue: 'Register & Continue',
    checking: 'Checking...',
    evaluationDetails: 'Evaluation Details',
    student: 'Student',
    provider: 'Provider',
    evaluator: 'Evaluator',
    criteria: 'Evaluation Criteria',
    totalScore: 'Total Score',
    totalPercentage: 'Total Percentage',
    notes: 'Notes',
    notesPlaceholder: 'Write your comments here...',
    submitEvaluation: 'Submit Evaluation',
    submitting: 'Submitting...',
    submittedTitle: 'Evaluation submitted successfully',
    submittedMessage: 'Thank you. The company evaluation form has been submitted successfully.',
    outOf: 'Out of',
    score: 'Score',
    progress: 'Progress',
    required: 'Required',
    missingLink: 'Evaluation link is missing or invalid.',
    emailRequired: 'Company email is required.',
    nameRequired: 'Evaluator name is required.',
    jobRequired: 'Job title is required.',
    registerFirst: 'Please register first using the company email.',
    noCriteria: 'No evaluation criteria were found for this request.',
    criterionRequired: 'Please enter a score for',
    invalidScore: 'Invalid score for',
    scoreRange: 'Score must be between',
    and: 'and',
    backToRegister: 'Back to registration',
    secured: 'Secured evaluation link',
    ready: 'Ready to submit',
    notReady: 'Complete all criteria',
    language: 'العربية',
  },
  ar: {
    invalidTitle: 'نموذج تقييم الشركة',
    invalidMessage: 'رابط التقييم غير صحيح أو مفقود.',
    title: 'تقييم شركة التدريب',
    subtitle: 'تحقق من بيانات المقيّم، أكمل معايير التقييم، ثم أرسل التقييم النهائي بشكل آمن.',
    verifyStep: 'التحقق',
    evaluateStep: 'التقييم',
    submitStep: 'الإرسال',
    companyRegistration: 'تسجيل بيانات الشركة',
    companyRegistrationHint: 'استخدم نفس بريد الشركة الذي استلم رابط طلب التقييم.',
    evaluatorName: 'اسم المقيّم',
    jobTitle: 'المسمى الوظيفي',
    companyEmail: 'بريد الشركة',
    emailHint: 'يجب أن يكون البريد مطابقًا لبريد الشركة المرتبط بطلب التقييم.',
    registerContinue: 'تسجيل ومتابعة',
    checking: 'جارٍ التحقق...',
    evaluationDetails: 'تفاصيل التقييم',
    student: 'الطالب',
    provider: 'جهة التدريب',
    evaluator: 'المقيّم',
    criteria: 'معايير التقييم',
    totalScore: 'إجمالي الدرجات',
    totalPercentage: 'النسبة الإجمالية',
    notes: 'ملاحظات',
    notesPlaceholder: 'اكتب ملاحظاتك هنا...',
    submitEvaluation: 'إرسال التقييم',
    submitting: 'جارٍ الإرسال...',
    submittedTitle: 'تم إرسال التقييم بنجاح',
    submittedMessage: 'شكرًا لك، تم إرسال نموذج تقييم الشركة بنجاح.',
    outOf: 'من',
    score: 'الدرجة',
    progress: 'التقدم',
    required: 'مطلوب',
    missingLink: 'رابط التقييم غير موجود أو غير صحيح.',
    emailRequired: 'بريد الشركة مطلوب.',
    nameRequired: 'اسم المقيّم مطلوب.',
    jobRequired: 'المسمى الوظيفي مطلوب.',
    registerFirst: 'يجب التحقق أولًا باستخدام بريد الشركة.',
    noCriteria: 'لا توجد معايير تقييم لهذا الطلب.',
    criterionRequired: 'يرجى إدخال درجة للمعيار',
    invalidScore: 'درجة غير صحيحة للمعيار',
    scoreRange: 'يجب أن تكون الدرجة بين',
    and: 'و',
    backToRegister: 'العودة للتسجيل',
    secured: 'رابط تقييم آمن',
    ready: 'جاهز للإرسال',
    notReady: 'أكمل جميع المعايير',
    language: 'English',
  },
};

function SvgIcon({ name, size = 22 }) {
  const icons = {
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
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
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5 8 7 5 7-5" />
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
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
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

function ScoreRing({ value, label, subLabel, size = 144 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="company-eval-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#companyEvalRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="companyEvalRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0796a6" />
            <stop offset="100%" stopColor="#2ee6d3" />
          </linearGradient>
        </defs>
      </svg>
      <div className="company-eval-ring-label">
        <strong>{label}</strong>
        <span>{subLabel}</span>
      </div>
    </div>
  );
}

function Stepper({ currentStep, labels }) {
  const steps = [
    { key: 1, label: labels.verifyStep },
    { key: 2, label: labels.evaluateStep },
    { key: 3, label: labels.submitStep },
  ];

  return (
    <div className="company-eval-stepper">
      {steps.map((step) => (
        <div
          key={step.key}
          className={`company-eval-step ${currentStep >= step.key ? 'active' : ''} ${
            currentStep > step.key ? 'done' : ''
          }`}
        >
          <span>{currentStep > step.key ? <SvgIcon name="check" size={15} /> : step.key}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="company-eval-detail">
      <div className="company-eval-detail-icon">
        <SvgIcon name={icon} size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value || '-'}</strong>
      </div>
    </div>
  );
}

function ExternalCompanyEvaluationFormPage() {
  const { token } = useParams();
  const [language, setLanguage] = useState('en');
  const labels = LABELS[language];
  const isArabic = language === 'ar';

  const [registrationState, setRegistrationState] = useState({
    evaluatorName: '',
    evaluatorJobTitle: '',
    email: '',
  });

  const [evaluationContext, setEvaluationContext] = useState(null);

  const [formState, setFormState] = useState({
    notes: '',
    criteria: [],
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalScore = useMemo(() => {
    return formState.criteria.reduce((total, item) => {
      const score = Number(item.score || 0);
      return total + score;
    }, 0);
  }, [formState.criteria]);

  const totalOutOf = useMemo(() => {
    return formState.criteria.reduce((total, item) => {
      const outOf = Number(item.outOf || 0);
      return total + outOf;
    }, 0);
  }, [formState.criteria]);

  const totalPercentage = useMemo(() => {
    if (!totalOutOf) return 0;
    return Math.round((totalScore / totalOutOf) * 100);
  }, [totalScore, totalOutOf]);

  const completedCriteria = useMemo(() => {
    return formState.criteria.filter(
      (item) => item.score !== '' && item.score !== null && item.score !== undefined
    ).length;
  }, [formState.criteria]);

  const criteriaProgress = useMemo(() => {
    if (!formState.criteria.length) return 0;
    return Math.round((completedCriteria / formState.criteria.length) * 100);
  }, [completedCriteria, formState.criteria.length]);

  const currentStep = submitted ? 3 : evaluationContext ? 2 : 1;

  const normalizeCriteria = (criteria = []) => {
    return criteria.map((criterion) => ({
      criterionId: criterion.id,
      criterion:
        criterion.criterion_name ||
        criterion.name ||
        criterion.criterion ||
        'Evaluation Criterion',
      question: criterion.question || criterion.description || '',
      score: '',
      outOf: Number(criterion.weight || criterion.out_of || criterion.max_score || 0),
    }));
  };

  const getApiErrorMessage = (error) => {
    if (!error) return 'Something went wrong. Please try again.';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'Something went wrong. Please try again.';
  };

  const handleRegistrationChange = (field, value) => {
    setRegistrationState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCriterionChange = (criterionId, value) => {
    setFormState((current) => ({
      ...current,
      criteria: current.criteria.map((item) =>
        item.criterionId === criterionId ? { ...item, score: value } : item
      ),
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSubmitted(false);

    const email = registrationState.email.trim().toLowerCase();

    if (!token) {
      setErrorMessage(labels.missingLink);
      return;
    }

    if (!email) {
      setErrorMessage(labels.emailRequired);
      return;
    }

    if (!registrationState.evaluatorName.trim()) {
      setErrorMessage(labels.nameRequired);
      return;
    }

    if (!registrationState.evaluatorJobTitle.trim()) {
      setErrorMessage(labels.jobRequired);
      return;
    }

    try {
      setIsRegistering(true);

      const response = await registerCompanyEvaluationLinkRequest({
        token,
        email,
        evaluator_name: registrationState.evaluatorName.trim(),
        evaluator_job_title: registrationState.evaluatorJobTitle.trim(),
      });

      const criteria = normalizeCriteria(response.criteria || []);

      setEvaluationContext({
        requestId: response.request_id,
        internshipId: response.internship_id,
        studentUserId: response.student_user_id,
        studentName: response.student_name,
        providerName: response.provider_name,
        providerEmail: response.provider_email,
        templateId: response.template_id,
        evaluatorName:
          response.evaluator_name || registrationState.evaluatorName.trim(),
        evaluatorJobTitle:
          response.evaluator_job_title || registrationState.evaluatorJobTitle.trim(),
        email,
      });

      setFormState({
        notes: '',
        criteria,
      });
    } catch (error) {
      setEvaluationContext(null);
      setFormState({
        notes: '',
        criteria: [],
      });
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  const validateEvaluationForm = () => {
    if (!evaluationContext) {
      return labels.registerFirst;
    }

    if (!formState.criteria.length) {
      return labels.noCriteria;
    }

    for (const item of formState.criteria) {
      if (item.score === '' || item.score === null || item.score === undefined) {
        return `${labels.criterionRequired} "${item.criterion}".`;
      }

      const score = Number(item.score);
      const outOf = Number(item.outOf);

      if (Number.isNaN(score)) {
        return `${labels.invalidScore} "${item.criterion}".`;
      }

      if (score < 0 || score > outOf) {
        return `${labels.scoreRange} 0 ${labels.and} ${outOf}.`;
      }
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSubmitted(false);

    const validationMessage = validateEvaluationForm();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      await submitCompanyEvaluationRequest({
        token,
        email: evaluationContext.email,

        request_id: Number(evaluationContext.requestId),
        final_evaluation_request_id: Number(evaluationContext.requestId),

        internship_id: Number(evaluationContext.internshipId),
        student_user_id: Number(evaluationContext.studentUserId),

        provider_name: evaluationContext.providerName,
        provider_email: evaluationContext.providerEmail,

        evaluator_name: evaluationContext.evaluatorName,
        evaluator_job_title: evaluationContext.evaluatorJobTitle,

        notes: formState.notes,
        total_score: totalScore,
        total_out_of: totalOutOf,
        total_percentage: totalPercentage,

        scores: formState.criteria.map((item) => ({
          criterion_id: Number(item.criterionId),
          company_evaluation_template_criterion_id: Number(item.criterionId),
          criterion_name: item.criterion,
          score: Number(item.score),
          out_of: Number(item.outOf),
          max_score: Number(item.outOf),
          weight: Number(item.outOf),
        })),
      });

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="company-eval-page" dir={isArabic ? 'rtl' : 'ltr'}>
        <style>{pageStyles}</style>
        <div className="company-eval-invalid-card">
          <div className="company-eval-invalid-icon">
            <SvgIcon name="alert" size={34} />
          </div>
          <h1>{labels.invalidTitle}</h1>
          <p>{labels.invalidMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="company-eval-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <style>{pageStyles}</style>

      <div className="company-eval-shell">
        <header className="company-eval-hero">
          <div className="company-eval-hero-content">
            <div className="company-eval-hero-icon">
              <SvgIcon name="document" size={42} />
            </div>
            <div>
              <div className="company-eval-chip">
                <SvgIcon name="shield" size={16} />
                {labels.secured}
              </div>
              <h1>{labels.title}</h1>
              <p>{labels.subtitle}</p>
            </div>
          </div>

          <div className="company-eval-hero-side">
            <button type="button" className="company-eval-language-btn" onClick={() => setLanguage(isArabic ? 'en' : 'ar')}>
              {labels.language}
            </button>
            <ScoreRing
              value={evaluationContext ? totalPercentage : criteriaProgress}
              label={evaluationContext ? `${totalPercentage}%` : `${criteriaProgress}%`}
              subLabel={evaluationContext ? labels.totalPercentage : labels.progress}
            />
          </div>
        </header>

        <Stepper currentStep={currentStep} labels={labels} />

        {errorMessage ? (
          <div className="company-eval-alert danger">
            <SvgIcon name="alert" size={19} />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {submitted ? (
          <section className="company-eval-success">
            <div className="company-eval-success-icon">
              <SvgIcon name="check" size={38} />
            </div>
            <h2>{labels.submittedTitle}</h2>
            <p>{labels.submittedMessage}</p>
            <div className="company-eval-success-score">
              <ScoreRing value={totalPercentage} label={`${totalPercentage}%`} subLabel={labels.totalPercentage} size={126} />
            </div>
          </section>
        ) : !evaluationContext ? (
          <section className="company-eval-card">
            <div className="company-eval-section-head">
              <div>
                <h2>{labels.companyRegistration}</h2>
                <p>{labels.companyRegistrationHint}</p>
              </div>
              <div className="company-eval-section-icon">
                <SvgIcon name="building" size={24} />
              </div>
            </div>

            <form onSubmit={handleRegister}>
              <div className="company-eval-form-grid">
                <label className="company-eval-field">
                  <span>{labels.evaluatorName}</span>
                  <input
                    value={registrationState.evaluatorName}
                    onChange={(event) =>
                      handleRegistrationChange('evaluatorName', event.target.value)
                    }
                    required
                  />
                </label>

                <label className="company-eval-field">
                  <span>{labels.jobTitle}</span>
                  <input
                    value={registrationState.evaluatorJobTitle}
                    onChange={(event) =>
                      handleRegistrationChange('evaluatorJobTitle', event.target.value)
                    }
                    required
                  />
                </label>

                <label className="company-eval-field company-eval-field-wide">
                  <span>{labels.companyEmail}</span>
                  <input
                    type="email"
                    value={registrationState.email}
                    onChange={(event) =>
                      handleRegistrationChange('email', event.target.value)
                    }
                    placeholder="example@company.com"
                    required
                    dir="ltr"
                  />
                  <em>{labels.emailHint}</em>
                </label>
              </div>

              <div className="company-eval-actions">
                <button type="submit" className="company-eval-primary-btn" disabled={isRegistering}>
                  {isRegistering ? labels.checking : labels.registerContinue}
                  <SvgIcon name="arrow" size={18} />
                </button>
              </div>
            </form>
          </section>
        ) : (
          <form onSubmit={handleSubmit}>
            <section className="company-eval-card">
              <div className="company-eval-section-head">
                <div>
                  <h2>{labels.evaluationDetails}</h2>
                  <p>{evaluationContext.email}</p>
                </div>
                <div className={`company-eval-readiness ${criteriaProgress === 100 ? 'ready' : ''}`}>
                  {criteriaProgress === 100 ? labels.ready : labels.notReady}
                </div>
              </div>

              <div className="company-eval-details-grid">
                <DetailItem icon="user" label={labels.student} value={evaluationContext.studentName} />
                <DetailItem icon="building" label={labels.provider} value={evaluationContext.providerName} />
                <DetailItem icon="user" label={labels.evaluator} value={evaluationContext.evaluatorName} />
                <DetailItem icon="mail" label={labels.companyEmail} value={evaluationContext.email} />
              </div>
            </section>

            <section className="company-eval-card">
              <div className="company-eval-section-head">
                <div>
                  <h2>{labels.criteria}</h2>
                  <p>
                    {labels.totalScore}: {totalScore} / {totalOutOf}
                  </p>
                </div>
                <div className="company-eval-total-badge">{totalPercentage}%</div>
              </div>

              <div className="company-eval-criteria-list">
                {formState.criteria.map((criterion, index) => {
                  const max = Number(criterion.outOf || 0);
                  const score = Number(criterion.score || 0);
                  const itemPercentage = max ? Math.round((score / max) * 100) : 0;

                  return (
                    <div key={criterion.criterionId} className="company-eval-criterion-card">
                      <div className="company-eval-criterion-top">
                        <div className="company-eval-criterion-number">{index + 1}</div>
                        <div>
                          <h3>{criterion.criterion}</h3>
                          {criterion.question ? <p>{criterion.question}</p> : null}
                        </div>
                        <div className="company-eval-criterion-score">
                          <strong>{criterion.score || 0}</strong>
                          <span>{labels.outOf} {criterion.outOf}</span>
                        </div>
                      </div>

                      <div className="company-eval-score-control">
                        <input
                          type="range"
                          min="0"
                          max={criterion.outOf}
                          value={criterion.score || 0}
                          onChange={(event) =>
                            handleCriterionChange(criterion.criterionId, event.target.value)
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          max={criterion.outOf}
                          value={criterion.score}
                          onChange={(event) =>
                            handleCriterionChange(criterion.criterionId, event.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="company-eval-mini-progress">
                        <span style={{ width: `${itemPercentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="company-eval-card">
              <div className="company-eval-section-head">
                <div>
                  <h2>{labels.notes}</h2>
                  <p>{labels.notesPlaceholder}</p>
                </div>
              </div>

              <textarea
                className="company-eval-notes"
                rows="5"
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder={labels.notesPlaceholder}
              />

              <div className="company-eval-actions split">
                <button
                  type="button"
                  className="company-eval-secondary-btn"
                  onClick={() => {
                    setEvaluationContext(null);
                    setFormState({ notes: '', criteria: [] });
                    setSubmitted(false);
                    setErrorMessage('');
                  }}
                >
                  {labels.backToRegister}
                </button>

                <button
                  type="submit"
                  className="company-eval-primary-btn"
                  disabled={isSubmitting || submitted}
                >
                  {isSubmitting ? labels.submitting : labels.submitEvaluation}
                  <SvgIcon name="check" size={18} />
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}

const pageStyles = `
  .company-eval-page {
    position: relative;
    min-height: 100vh;
    color: #10243f;
    background:
      radial-gradient(circle at 20% 10%, rgba(20, 200, 195, 0.16), transparent 32%),
      radial-gradient(circle at 82% 8%, rgba(91, 101, 241, 0.12), transparent 30%),
      linear-gradient(180deg, #f6fbff 0%, #eef6fb 100%);
    padding: 2rem 1rem;
  }

  .company-eval-page::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      repeating-radial-gradient(ellipse at 45% 20%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
    opacity: 0.75;
  }

  .company-eval-shell {
    position: relative;
    z-index: 1;
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .company-eval-hero,
  .company-eval-card,
  .company-eval-success,
  .company-eval-stepper,
  .company-eval-invalid-card {
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(230, 238, 246, 0.98);
    box-shadow: 0 18px 44px rgba(16, 36, 63, 0.08);
    backdrop-filter: blur(12px);
  }

  .company-eval-hero {
    min-height: 220px;
    border-radius: 32px;
    padding: 1.6rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1.4rem;
    align-items: center;
    overflow: hidden;
  }

  .company-eval-hero-content {
    display: flex;
    gap: 1.1rem;
    align-items: center;
  }

  .company-eval-hero-icon {
    width: 88px;
    height: 88px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 28px;
    color: #0796a6;
    background: linear-gradient(135deg, #e3fbfb, #eef3ff);
    flex-shrink: 0;
  }

  .company-eval-chip {
    width: fit-content;
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    color: #0d8a64;
    background: #e7fbf3;
    font-size: 0.8rem;
    font-weight: 900;
    border: 1px solid rgba(24, 197, 143, 0.2);
  }

  .company-eval-hero h1 {
    margin: 0 0 0.45rem;
    color: #10243f;
    font-size: clamp(2.1rem, 4vw, 3.3rem);
    font-weight: 900;
    letter-spacing: -0.06em;
  }

  .company-eval-hero p {
    max-width: 760px;
    margin: 0;
    color: #637894;
    font-size: 1rem;
    line-height: 1.8;
    font-weight: 700;
  }

  .company-eval-hero-side {
    display: grid;
    justify-items: center;
    gap: 0.8rem;
  }

  .company-eval-language-btn {
    min-height: 38px;
    border: 1px solid #dfeaf3;
    border-radius: 14px;
    background: #fff;
    color: #243b5a;
    padding: 0 0.85rem;
    font-weight: 900;
  }

  .company-eval-ring {
    position: relative;
    flex-shrink: 0;
  }

  .company-eval-ring svg {
    display: block;
  }

  .company-eval-ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }

  .company-eval-ring-label strong {
    color: #10243f;
    font-size: 1.35rem;
    font-weight: 900;
    line-height: 1;
  }

  .company-eval-ring-label span {
    margin-top: 0.28rem;
    color: #637894;
    font-size: 0.75rem;
    font-weight: 850;
  }

  .company-eval-stepper {
    margin: 1rem 0;
    border-radius: 24px;
    padding: 0.85rem;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .company-eval-step {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    border-radius: 18px;
    background: #fbfdff;
    border: 1px solid #edf3f8;
    color: #7a8aa5;
    font-weight: 900;
  }

  .company-eval-step span {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #eef4f7;
    color: #7a8aa5;
    font-size: 0.82rem;
    font-weight: 900;
  }

  .company-eval-step.active {
    color: #0796a6;
    background: #f3fcfd;
    border-color: rgba(20, 200, 195, 0.24);
  }

  .company-eval-step.active span,
  .company-eval-step.done span {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
  }

  .company-eval-card,
  .company-eval-success {
    border-radius: 28px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .company-eval-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .company-eval-section-head h2 {
    margin: 0 0 0.28rem;
    color: #10243f;
    font-size: 1.15rem;
    font-weight: 900;
  }

  .company-eval-section-head p {
    margin: 0;
    color: #7a8aa5;
    line-height: 1.6;
    font-size: 0.88rem;
    font-weight: 700;
  }

  .company-eval-section-icon {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0796a6;
    background: #e2fafa;
    border-radius: 18px;
  }

  .company-eval-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .company-eval-field {
    display: grid;
    gap: 0.35rem;
  }

  .company-eval-field-wide {
    grid-column: 1 / -1;
  }

  .company-eval-field span {
    color: #5e718d;
    font-size: 0.83rem;
    font-weight: 850;
  }

  .company-eval-field input,
  .company-eval-notes {
    width: 100%;
    min-height: 48px;
    border: 1px solid #dfeaf3;
    border-radius: 16px;
    background: #fbfdff;
    color: #243b5a;
    padding: 0.65rem 0.85rem;
    font-weight: 780;
    outline: none;
  }

  .company-eval-field input:focus,
  .company-eval-notes:focus,
  .company-eval-score-control input[type='number']:focus {
    border-color: rgba(20, 200, 195, 0.72);
    box-shadow: 0 0 0 0.18rem rgba(20, 200, 195, 0.11);
    background: #fff;
  }

  .company-eval-field em {
    color: #7a8aa5;
    font-size: 0.78rem;
    font-style: normal;
    font-weight: 700;
  }

  .company-eval-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.1rem;
    flex-wrap: wrap;
  }

  .company-eval-actions.split {
    justify-content: space-between;
  }

  .company-eval-primary-btn,
  .company-eval-secondary-btn {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    border-radius: 17px;
    border: 1px solid transparent;
    padding: 0 1.1rem;
    font-weight: 900;
  }

  .company-eval-primary-btn {
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    box-shadow: 0 14px 30px rgba(7, 150, 166, 0.18);
  }

  .company-eval-secondary-btn {
    color: #243b5a;
    background: #fff;
    border-color: #dfeaf3;
  }

  .company-eval-primary-btn:disabled,
  .company-eval-secondary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .company-eval-alert {
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 1rem;
    border-radius: 18px;
    padding: 0.85rem 1rem;
    font-weight: 850;
  }

  .company-eval-alert.danger {
    color: #b42335;
    background: #ffedf0;
    border: 1px solid rgba(255, 90, 107, 0.24);
  }

  .company-eval-details-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .company-eval-detail {
    min-height: 86px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border: 1px solid #edf3f8;
    border-radius: 20px;
    background: #fbfdff;
    padding: 0.85rem;
  }

  .company-eval-detail-icon {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0796a6;
    background: #e2fafa;
    border-radius: 16px;
    flex-shrink: 0;
  }

  .company-eval-detail span {
    display: block;
    margin-bottom: 0.25rem;
    color: #7a8aa5;
    font-size: 0.76rem;
    font-weight: 850;
  }

  .company-eval-detail strong {
    color: #243b5a;
    font-size: 0.9rem;
    font-weight: 900;
    word-break: break-word;
  }

  .company-eval-readiness,
  .company-eval-total-badge {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0.35rem 0.85rem;
    color: #a4660b;
    background: #fff4dc;
    font-size: 0.8rem;
    font-weight: 900;
  }

  .company-eval-readiness.ready,
  .company-eval-total-badge {
    color: #0d8a64;
    background: #e7fbf3;
  }

  .company-eval-criteria-list {
    display: grid;
    gap: 0.9rem;
  }

  .company-eval-criterion-card {
    border: 1px solid #edf3f8;
    border-radius: 22px;
    background: #fbfdff;
    padding: 1rem;
  }

  .company-eval-criterion-top {
    display: grid;
    grid-template-columns: 42px 1fr auto;
    gap: 0.85rem;
    align-items: start;
    margin-bottom: 0.9rem;
  }

  .company-eval-criterion-number {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(135deg, #0796a6, #14c8c3);
    border-radius: 16px;
    font-weight: 900;
  }

  .company-eval-criterion-top h3 {
    margin: 0 0 0.3rem;
    color: #10243f;
    font-size: 0.98rem;
    font-weight: 900;
  }

  .company-eval-criterion-top p {
    margin: 0;
    color: #7a8aa5;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.55;
  }

  .company-eval-criterion-score {
    min-width: 92px;
    text-align: center;
    border-radius: 18px;
    background: #fff;
    border: 1px solid #edf3f8;
    padding: 0.6rem;
  }

  .company-eval-criterion-score strong {
    display: block;
    color: #10243f;
    font-size: 1.2rem;
    line-height: 1;
    font-weight: 900;
  }

  .company-eval-criterion-score span {
    display: block;
    margin-top: 0.25rem;
    color: #7a8aa5;
    font-size: 0.74rem;
    font-weight: 850;
  }

  .company-eval-score-control {
    display: grid;
    grid-template-columns: 1fr 120px;
    gap: 0.75rem;
    align-items: center;
  }

  .company-eval-score-control input[type='range'] {
    width: 100%;
    accent-color: #0796a6;
  }

  .company-eval-score-control input[type='number'] {
    width: 100%;
    min-height: 44px;
    border: 1px solid #dfeaf3;
    border-radius: 15px;
    background: #fff;
    color: #243b5a;
    padding: 0.55rem 0.7rem;
    font-weight: 850;
    outline: none;
  }

  .company-eval-mini-progress {
    height: 6px;
    margin-top: 0.75rem;
    border-radius: 999px;
    background: #edf4f8;
    overflow: hidden;
  }

  .company-eval-mini-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #0796a6, #2ee6d3);
  }

  .company-eval-notes {
    min-height: 140px;
    resize: vertical;
  }

  .company-eval-success {
    text-align: center;
    padding: 2rem 1.25rem;
  }

  .company-eval-success-icon,
  .company-eval-invalid-icon {
    width: 76px;
    height: 76px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    border-radius: 26px;
    color: #0d8a64;
    background: #e7fbf3;
  }

  .company-eval-success h2,
  .company-eval-invalid-card h1 {
    margin: 0 0 0.4rem;
    color: #10243f;
    font-size: 1.65rem;
    font-weight: 900;
  }

  .company-eval-success p,
  .company-eval-invalid-card p {
    margin: 0;
    color: #637894;
    font-weight: 700;
    line-height: 1.7;
  }

  .company-eval-success-score {
    margin-top: 1.2rem;
  }

  .company-eval-invalid-card {
    position: relative;
    z-index: 1;
    width: min(620px, calc(100% - 2rem));
    margin: 5rem auto;
    padding: 2rem;
    border-radius: 30px;
    text-align: center;
  }

  .company-eval-invalid-icon {
    color: #c02c3f;
    background: #ffedf0;
  }

  @media (max-width: 991.98px) {
    .company-eval-hero,
    .company-eval-details-grid {
      grid-template-columns: 1fr 1fr;
    }

    .company-eval-hero-content {
      grid-column: 1 / -1;
    }

    .company-eval-hero-side {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
    }

    .company-eval-details-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 767.98px) {
    .company-eval-page {
      padding: 1rem;
    }

    .company-eval-hero,
    .company-eval-hero-content,
    .company-eval-hero-side,
    .company-eval-form-grid,
    .company-eval-details-grid,
    .company-eval-stepper,
    .company-eval-criterion-top,
    .company-eval-score-control {
      display: grid;
      grid-template-columns: 1fr;
    }

    .company-eval-hero-side {
      justify-items: start;
    }

    .company-eval-actions,
    .company-eval-actions.split,
    .company-eval-section-head {
      flex-direction: column;
      align-items: stretch;
    }

    .company-eval-primary-btn,
    .company-eval-secondary-btn {
      width: 100%;
    }

    .company-eval-step {
      justify-content: flex-start;
    }

    .company-eval-criterion-score {
      width: 100%;
      text-align: start;
    }
  }
`;

export default ExternalCompanyEvaluationFormPage;