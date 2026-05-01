import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../app/providers/AuthProvider';
import ROUTES from '../../../app/router/routePaths';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import TableToolbar from '../../../shared/components/TableToolbar';
import {
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getStudentInternshipContextRequest,
} from '../../../app/api/client';

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

function StudentListCard({ student, onOpenFile, onEvaluate, isArabic }) {
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-task-card">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <div className="fw-semibold">{student.fullName}</div>
          <div className="text-muted small">{student.email}</div>
        </div>

        <span
          className={`badge ${
            student.strugglingStatus === 'At Risk'
              ? 'text-bg-warning'
              : 'text-bg-success'
          }`}
        >
          {t(student.strugglingStatus)}
        </span>
      </div>

      <div className="small text-muted mb-2">
        {t('Internship')}: {t(student.internshipStatus)}
      </div>
      <div className="small text-muted mb-3">
        {t('Provider')}: {student.providerName || '-'}
      </div>

      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-primary" onClick={onOpenFile}>
          {t('Open Student File')}
        </button>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onEvaluate}>
          {t('Evaluate')}
        </button>
      </div>
    </div>
  );
}

function AcademicAdvisorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [studentsOverview, setStudentsOverview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);

      try {
        const advisors = await getAdvisorsRequest();
        const normalizedAdvisors = Array.isArray(advisors)
          ? advisors.map(normalizeAdvisor)
          : [];

        const targetAdvisors =
          String(user?.role || '').toLowerCase() === 'academicadvisor'
            ? normalizedAdvisors.filter(
                (item) =>
                  Number(item.id) === Number(user?.id) ||
                  String(item.email || '').toLowerCase() ===
                    String(user?.email || '').toLowerCase()
              )
            : normalizedAdvisors;

        const advisorStudentRows = await Promise.all(
          targetAdvisors.map(async (advisor) => {
            const students = await getAdvisorStudentsRequest(advisor.id);
            const normalizedStudents = (Array.isArray(students) ? students : []).map((student) =>
              normalizeStudent(student, advisor)
            );

            const enriched = await Promise.all(
              normalizedStudents.map(async (student) => {
                try {
                  const context = await getStudentInternshipContextRequest(student.id);

                  return {
                    ...student,
                    providerName: context?.provider_name || '-',
                    internshipTitle: context?.internship_title || '-',
                    internshipStatus: context?.internship_id ? 'Has Internship' : 'No Internship',
                    internshipId: context?.internship_id || null,
                    strugglingStatus: 'On Track',
                  };
                } catch {
                  return {
                    ...student,
                    providerName: '-',
                    internshipTitle: '-',
                    internshipStatus: 'No Internship',
                    internshipId: null,
                    strugglingStatus: 'On Track',
                  };
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
  }, [user]);

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return studentsOverview.filter((student) => {
      const matchesSearch = keyword
        ? [
            student.fullName,
            student.email,
            student.providerName,
            student.internshipTitle,
            student.internshipStatus,
            student.strugglingStatus,
          ]
            .join(' ')
            .toLowerCase()
            .includes(keyword)
        : true;

      const matchesFilter =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Has Internship'
          ? student.internshipStatus === 'Has Internship'
          : statusFilter === 'No Internship'
          ? student.internshipStatus === 'No Internship'
          : statusFilter === 'At Risk'
          ? student.strugglingStatus === 'At Risk'
          : true;

      return matchesSearch && matchesFilter;
    });
  }, [studentsOverview, search, statusFilter]);

  const totalStudents = studentsOverview.length;
  const totalWithInternship = studentsOverview.filter(
    (item) => item.internshipStatus === 'Has Internship'
  ).length;
  const totalWithoutInternship = studentsOverview.filter(
    (item) => item.internshipStatus === 'No Internship'
  ).length;
  const totalStruggling = studentsOverview.filter(
    (item) => item.strugglingStatus === 'At Risk'
  ).length;

  const filterActions = (
    <div className="d-flex flex-wrap gap-2">
      {['All', 'Has Internship', 'No Internship', 'At Risk'].map((filter) => (
        <button
          key={filter}
          type="button"
          className={`btn btn-sm ${
            statusFilter === filter ? 'btn-primary' : 'btn-outline-primary'
          }`}
          onClick={() => setStatusFilter(filter)}
        >
          {filter === 'All' ? (isArabic ? 'كل الطلاب' : 'All Students') : t(filter)}
        </button>
      ))}
    </div>
  );

  const openStudentFile = (studentId, openEvaluation = false) => {
    const base = ROUTES.ADVISOR_MODULES.STUDENT_FILE.replace(':studentId', String(studentId));
    navigate(openEvaluation ? `${base}?tab=evaluation` : base);
  };

  return (
    <div>
      <div className="ims-page-header">
        <h1 className="ims-page-title">{t('Students')}</h1>
        <p className="ims-page-description">
          {t(
            'Review only the students linked to this academic advisor, open the student file, inspect the full student details, update attendance, review tasks, schedule meetings, and submit the final evaluation.'
          )}
        </p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card ims-stat-card">
            <div className="card-body">
              <div className="ims-stat-label">{t('Linked Students')}</div>
              <div className="ims-stat-value">{totalStudents}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card ims-stat-card">
            <div className="card-body">
              <div className="ims-stat-label">{t('With Internship')}</div>
              <div className="ims-stat-value">{totalWithInternship}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card ims-stat-card">
            <div className="card-body">
              <div className="ims-stat-label">{t('Without Internship')}</div>
              <div className="ims-stat-value">{totalWithoutInternship}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-3">
          <div className="card ims-stat-card">
            <div className="card-body">
              <div className="ims-stat-label">{t('At Risk')}</div>
              <div className="ims-stat-value">{totalStruggling}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card ims-table-card">
        <div className="card-body">
          <TableToolbar
            title="Students List"
            subtitle="Only the students linked to this academic advisor appear here. Open any student file directly from the list."
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={isArabic ? 'ابحث عن طالب...' : 'Search students...'}
            actions={filterActions}
          />

          {loading ? (
            <div className="py-4 text-center">
              <div className="spinner-border" role="status" />
              <div className="mt-3">Loading students...</div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <StudentListCard
                    key={student.id}
                    student={student}
                    isArabic={isArabic}
                    onOpenFile={() => openStudentFile(student.id)}
                    onEvaluate={() => openStudentFile(student.id, true)}
                  />
                ))
              ) : (
                <div className="ims-empty-panel">{t('No students found.')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcademicAdvisorDashboardPage;