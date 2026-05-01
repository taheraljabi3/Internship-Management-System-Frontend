import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  registerCompanyEvaluationLinkRequest,
  submitCompanyEvaluationRequest,
} from '../../../app/api/client';

function ExternalCompanyEvaluationFormPage() {
  const { token } = useParams();

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

  const normalizeCriteria = (criteria = []) => {
    return criteria.map((criterion) => ({
      criterionId: criterion.id,
      criterion:
        criterion.criterion_name ||
        criterion.name ||
        criterion.criterion ||
        'Evaluation Criterion',
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
      setErrorMessage('Evaluation link is missing or invalid.');
      return;
    }

    if (!email) {
      setErrorMessage('Company email is required.');
      return;
    }

    if (!registrationState.evaluatorName.trim()) {
      setErrorMessage('Evaluator name is required.');
      return;
    }

    if (!registrationState.evaluatorJobTitle.trim()) {
      setErrorMessage('Job title is required.');
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
      return 'Please register first using the company email.';
    }

    if (!formState.criteria.length) {
      return 'No evaluation criteria were found for this request.';
    }

    for (const item of formState.criteria) {
      if (item.score === '' || item.score === null || item.score === undefined) {
        return `Please enter a score for "${item.criterion}".`;
      }

      const score = Number(item.score);
      const outOf = Number(item.outOf);

      if (Number.isNaN(score)) {
        return `Invalid score for "${item.criterion}".`;
      }

      if (score < 0 || score > outOf) {
        return `Score for "${item.criterion}" must be between 0 and ${outOf}.`;
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
      <div className="container py-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h2 className="h4 mb-3">Company Evaluation Form</h2>
            <div className="alert alert-danger mb-0">
              This evaluation link is invalid or missing.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <div className="card shadow-sm">
            <div className="card-body p-4 p-lg-5">
              <div className="mb-4">
                <h1 className="h3 mb-2">Company Evaluation Form</h1>
                <p className="text-muted mb-0">
                  Please register using the same company email that received this
                  evaluation request.
                </p>
              </div>

              {errorMessage ? (
                <div className="alert alert-danger">{errorMessage}</div>
              ) : null}

              {submitted ? (
                <div className="alert alert-success">
                  Thank you. The company evaluation form has been submitted
                  successfully.
                </div>
              ) : null}

              {!evaluationContext ? (
                <form onSubmit={handleRegister}>
                  <div className="border rounded-4 p-4 bg-light mb-4">
                    <h2 className="h5 mb-3">Company Registration</h2>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Evaluator Name</label>
                        <input
                          className="form-control"
                          value={registrationState.evaluatorName}
                          onChange={(event) =>
                            handleRegistrationChange(
                              'evaluatorName',
                              event.target.value
                            )
                          }
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Job Title</label>
                        <input
                          className="form-control"
                          value={registrationState.evaluatorJobTitle}
                          onChange={(event) =>
                            handleRegistrationChange(
                              'evaluatorJobTitle',
                              event.target.value
                            )
                          }
                          required
                        />
                      </div>

                      <div className="col-md-12">
                        <label className="form-label">Company Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={registrationState.email}
                          onChange={(event) =>
                            handleRegistrationChange('email', event.target.value)
                          }
                          placeholder="example@company.com"
                          required
                        />
                        <div className="form-text">
                          The email must match the company email assigned to this
                          evaluation request.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isRegistering}
                  >
                    {isRegistering ? 'Checking...' : 'Register & Continue'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="border rounded-4 p-4 bg-light mb-4">
                    <h2 className="h5 mb-3">Evaluation Details</h2>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="text-muted small">Student</div>
                        <div className="fw-semibold">
                          {evaluationContext.studentName || '-'}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="text-muted small">Provider</div>
                        <div className="fw-semibold">
                          {evaluationContext.providerName || '-'}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="text-muted small">Evaluator</div>
                        <div className="fw-semibold">
                          {evaluationContext.evaluatorName || '-'}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="text-muted small">Company Email</div>
                        <div className="fw-semibold">
                          {evaluationContext.email || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                      <h4 className="h5 mb-0">Evaluation Criteria</h4>
                      <div className="badge text-bg-primary">
                        Total: {totalPercentage}%
                      </div>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {formState.criteria.map((criterion) => (
                        <div
                          key={criterion.criterionId}
                          className="border rounded-4 p-3 bg-light"
                        >
                          <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
                            <div className="fw-semibold">
                              {criterion.criterion}
                            </div>
                            <div className="text-muted small">
                              Out of {criterion.outOf}
                            </div>
                          </div>

                          <input
                            type="number"
                            min="0"
                            max={criterion.outOf}
                            className="form-control"
                            value={criterion.score}
                            onChange={(event) =>
                              handleCriterionChange(
                                criterion.criterionId,
                                event.target.value
                              )
                            }
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      value={formState.notes}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Write your comments here..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || submitted}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExternalCompanyEvaluationFormPage;