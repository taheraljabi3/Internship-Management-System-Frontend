import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import AppTable from '../../../shared/components/AppTable';
import TableToolbar from '../../../shared/components/TableToolbar';
import { useAuth } from '../../../shared/hooks/useAuth';
import ROUTES from '../../../app/router/routePaths';
import { mockOpportunities } from '../data/mockProvidersOpportunities';

function ProvidersOpportunitiesModulePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'Student';
  const [opportunities] = useState(
    mockOpportunities.map((item) => ({
      ...item,
      source: item.source || 'Helper Opportunity Board',
      usageNote: 'For search and guidance only. Official approval is through Training Company Approval in Internship Training Workflow.',
    }))
  );
  const [search, setSearch] = useState('');

  const visibleOpportunities = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const openOpportunities = opportunities.filter((item) => item.status === 'Open');
    if (!keyword) return openOpportunities;

    return openOpportunities.filter((item) =>
      [item.title, item.provider, item.location, item.workMode, item.source, item.summary, item.usageNote]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [opportunities, search]);

  const getDetailsRoute = (opportunityId) => {
    const id = String(opportunityId);
    if (role === 'Student' && ROUTES.STUDENT_MODULES?.DETAILS) return ROUTES.STUDENT_MODULES.DETAILS.replace(':opportunityId', id);
    if (role === 'AcademicAdvisor' && ROUTES.ADVISOR_MODULES?.DETAILS) return ROUTES.ADVISOR_MODULES.DETAILS.replace(':opportunityId', id);
    if (role === 'Administrator' && ROUTES.ADMIN_MODULES?.DETAILS) return ROUTES.ADMIN_MODULES.DETAILS.replace(':opportunityId', id);
    return ROUTES.STUDENT_MODULES.DETAILS.replace(':opportunityId', id);
  };

  const columns = [
    { key: 'title', label: 'Opportunity' },
    { key: 'provider', label: 'Provider' },
    { key: 'location', label: 'Location' },
    { key: 'workMode', label: 'Mode' },
    { key: 'source', label: 'Source' },
    { key: 'usageNote', label: 'Usage Note' },
    { key: 'status', label: 'Status', type: 'status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate(getDetailsRoute(row.id))}>
          Details
        </button>
      ),
    },
  ];

  return (
    <div>
      <ModulePageHeader
        title="Opportunities Helper Board"
        description="This interface is only a supporting board for searching and exploring possible internship opportunities. It is not the official approval reference. The official path starts when the student submits the training company and opportunity details inside the Internship Training Workflow."
      />

      <div className="alert alert-info">
        Official approval is handled from <strong>Internship Training Workflow → Training Company Approval</strong>. Applications and student requests were removed from this module for now.
      </div>

      <div className="card ims-table-card mt-3">
        <div className="card-body">
          <TableToolbar
            title="Search Opportunities"
            subtitle="Browse only. Submitting a company for training approval remains the main reference for acceptance."
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by opportunity, company, location, or mode..."
          />
          <AppTable columns={columns} rows={visibleOpportunities} rowKey="id" emptyMessage="No helper opportunities found." />
        </div>
      </div>
    </div>
  );
}

export default ProvidersOpportunitiesModulePage;
