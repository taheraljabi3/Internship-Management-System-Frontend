import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { mockInternshipProviders, mockOpportunities } from '../data/mockProvidersOpportunities';

function buildBackRouteByRole(role) {
  switch (role) {
    case 'Student':
      return '/student/modules/opportunities';
    case 'AcademicAdvisor':
      return '/advisor/modules/opportunities';
    case 'Administrator':
      return '/admin/modules/opportunities';
    default:
      return '/';
  }
}

function OpportunityDetailsPage() {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const { user } = useAuth();
  const role = user?.role || 'Student';

  const opportunity = useMemo(() => mockOpportunities.find((item) => String(item.id) === String(opportunityId)), [opportunityId]);
  const provider = useMemo(() => opportunity ? mockInternshipProviders.find((item) => Number(item.id) === Number(opportunity.providerId)) : null, [opportunity]);
  const handleBack = () => navigate(buildBackRouteByRole(role));

  if (!opportunity) {
    return (
      <div className="container-fluid">
        <div className="card ims-opportunity-detail-card"><div className="card-body p-4"><div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h4 mb-0">Opportunity Details</h2><button type="button" className="btn btn-outline-secondary" onClick={handleBack}>Back</button></div><div className="ims-empty-panel">Opportunity not found.</div></div></div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="ims-page-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h1 className="ims-page-title mb-1">Opportunity Details</h1>
          <p className="ims-page-description mb-0">Review the opportunity information for search and guidance only. Official approval is done through Internship Training Workflow.</p>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={handleBack}>Back</button>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card ims-opportunity-detail-card">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div><div className="ims-opportunity-chip">Helper Opportunity</div><h2 className="ims-opportunity-title">{opportunity.title}</h2><p className="ims-opportunity-provider mb-0">{opportunity.provider}</p></div>
                <span className={`ims-status-badge ${opportunity.status === 'Open' ? 'ims-status-open' : 'ims-status-closed'}`}>{opportunity.status}</span>
              </div>

              <div className="alert alert-info">This opportunity board is not the official approval reference. The official reference is the student submission of a training company and opportunity details inside Internship Training Workflow.</div>

              <div className="row g-3 mb-4">
                <div className="col-md-6"><div className="ims-detail-box"><div className="ims-detail-label">Location</div><div className="ims-detail-value">{opportunity.location}</div></div></div>
                <div className="col-md-6"><div className="ims-detail-box"><div className="ims-detail-label">Work Mode</div><div className="ims-detail-value">{opportunity.workMode}</div></div></div>
                <div className="col-md-6"><div className="ims-detail-box"><div className="ims-detail-label">Source</div><div className="ims-detail-value">{opportunity.source}</div></div></div>
                <div className="col-md-6"><div className="ims-detail-box"><div className="ims-detail-label">Deadline</div><div className="ims-detail-value">{opportunity.deadline || '-'}</div></div></div>
              </div>

              <div className="mb-4"><h5 className="ims-section-title">Summary</h5><p className="mb-0">{opportunity.description}</p></div>
              <div className="mb-4"><h5 className="ims-section-title">Suggested Tasks</h5><ul className="ims-list">{opportunity.tasks.map((item, index) => <li key={`task-${index}`}>{item}</li>)}</ul></div>
              <div className="mb-0"><h5 className="ims-section-title">Requirements</h5><ul className="ims-list">{opportunity.requirements.map((item, index) => <li key={`req-${index}`}>{item}</li>)}</ul></div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card ims-opportunity-detail-card">
            <div className="card-body p-4">
              <h4 className="ims-section-title mb-3">Provider Information</h4>
              {provider ? (
                <div className="row g-3">
                  <div className="col-12"><div className="ims-detail-box"><div className="ims-detail-label">Provider Name</div><div className="ims-detail-value">{provider.name}</div></div></div>
                  <div className="col-12"><div className="ims-detail-box"><div className="ims-detail-label">Sector</div><div className="ims-detail-value">{provider.sector}</div></div></div>
                  <div className="col-12"><div className="ims-detail-box"><div className="ims-detail-label">Email</div><div className="ims-detail-value">{provider.email}</div></div></div>
                  <div className="col-12"><div className="ims-detail-box"><div className="ims-detail-label">Phone</div><div className="ims-detail-value">{provider.phone}</div></div></div>
                </div>
              ) : <div className="ims-empty-panel">Provider information is not available.</div>}
              <hr />
              <p className="text-muted mb-3">To start the official approval path, use: Internship Training Workflow → Training Company Approval.</p>
              <button type="button" className="btn btn-outline-secondary w-100" onClick={handleBack}>Back to Opportunities</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpportunityDetailsPage;
