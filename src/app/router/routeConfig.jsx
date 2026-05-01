import ROUTES from './routePaths';

import HomePage from '../../features/misc/pages/HomePage';
import LoginPage from '../../features/auth/pages/LoginPage';
import RegisterPage from '../../features/auth/pages/RegisterPage';
import UnauthorizedPage from '../../features/misc/pages/UnauthorizedPage';

import StudentDashboardPage from '../../features/dashboard/pages/StudentDashboardPage';
import AcademicAdvisorDashboardPage from '../../features/dashboard/pages/AcademicAdvisorDashboardPage';
import AdministratorDashboardPage from '../../features/dashboard/pages/AdministratorDashboardPage';
import AcademicAdvisorStudentFilePage from '../../features/dashboard/pages/AcademicAdvisorStudentFilePage';
import AcademicAdvisorStudentRecordsPage from '../../features/dashboard/pages/AcademicAdvisorStudentRecordsPage';

import IdentityAccessModulePage from '../../features/users/pages/IdentityAccessModulePage';
import StudentProfileModulePage from '../../features/student-profile/pages/StudentProfileModulePage';
import ProvidersOpportunitiesModulePage from '../../features/providers-opportunities/pages/ProvidersOpportunitiesModulePage';
import InternshipModulePage from '../../features/internship/pages/InternshipModulePage';
import AttendanceReportsModulePage from '../../features/attendance-reports/pages/AttendanceReportsModulePage';
import EvaluationModulePage from '../../features/evaluation/pages/EvaluationModulePage';
import AdministrationModulePage from '../../features/administration/pages/AdministrationModulePage';

import ProfilePage from '../../features/account/pages/ProfilePage';
import ChangePasswordPage from '../../features/account/pages/ChangePasswordPage';
import OpportunityDetailsPage from '../../features/providers-opportunities/pages/OpportunityDetailsPage';
import ExternalCompanyEvaluationFormPage from '../../features/evaluation/pages/ExternalCompanyEvaluationFormPage';
import InvitationRegisterPage from '../../features/auth/pages/InvitationRegisterPage';
function buildSidebarItems(routes) {
  return routes
    .filter((route) => route.label)
    .map((route) => ({
      label: route.label,
      to: route.path,
    }));
}

export const publicRoutes = [
  { path: ROUTES.PUBLIC.ROOT, element: <HomePage /> },
  { path: ROUTES.PUBLIC.LOGIN, element: <LoginPage /> },
  { path: ROUTES.PUBLIC.REGISTER, element: <RegisterPage /> },
  { path: ROUTES.PUBLIC.UNAUTHORIZED, element: <UnauthorizedPage /> },
  { path: ROUTES.PUBLIC.COMPANY_EVALUATION_FORM, element: <ExternalCompanyEvaluationFormPage /> },
  {path: '/register/invitation',element: <InvitationRegisterPage />,},
];

export const studentRoutes = [
  { path: ROUTES.DASHBOARD.STUDENT, element: <StudentDashboardPage />, label: 'Student Dashboard' },
  { path: ROUTES.STUDENT_MODULES.PROFILE, element: <StudentProfileModulePage />, label: 'Student Profile' },
  { path: ROUTES.STUDENT_MODULES.OPPORTUNITIES, element: <ProvidersOpportunitiesModulePage />, label: 'Providers & Opportunities' },
  { path: ROUTES.STUDENT_MODULES.INTERNSHIP, element: <InternshipModulePage />, label: 'Internship' },
  { path: ROUTES.STUDENT_MODULES.REPORTS, element: <AttendanceReportsModulePage />, label: 'Attendance & Reports' },
  { path: ROUTES.STUDENT_MODULES.EVALUATION, element: <EvaluationModulePage />, label: 'Evaluation' },
  { path: ROUTES.ACCOUNT.STUDENT_PROFILE, element: <ProfilePage /> },
  { path: ROUTES.ACCOUNT.STUDENT_CHANGE_PASSWORD, element: <ChangePasswordPage /> },
  { path: ROUTES.STUDENT_MODULES.DETAILS, element: <OpportunityDetailsPage /> },
];

export const academicAdvisorRoutes = [
  { path: ROUTES.DASHBOARD.ACADEMIC_ADVISOR, element: <AcademicAdvisorDashboardPage />, label: 'Academic Advisor Dashboard' },
  { path: ROUTES.ADVISOR_MODULES.OPPORTUNITIES, element: <ProvidersOpportunitiesModulePage />, label: 'Providers & Opportunities' },
  { path: ROUTES.ADVISOR_MODULES.INTERNSHIP, element: <InternshipModulePage />, label: 'Internship' },
  { path: ROUTES.ADVISOR_MODULES.REPORTS, element: <AttendanceReportsModulePage />, label: 'Attendance & Reports' },
  { path: ROUTES.ADVISOR_MODULES.EVALUATION, element: <EvaluationModulePage />, label: 'Evaluation' },
  { path: ROUTES.ACCOUNT.ACADEMIC_ADVISOR_PROFILE, element: <ProfilePage /> },
  { path: ROUTES.ACCOUNT.ACADEMIC_ADVISOR_CHANGE_PASSWORD, element: <ChangePasswordPage /> },
  { path: ROUTES.ADVISOR_MODULES.STUDENT_FILE, element: <AcademicAdvisorStudentFilePage /> },
  { path: ROUTES.ADVISOR_MODULES.STUDENT_ATTENDANCE_DETAILS, element: <AcademicAdvisorStudentRecordsPage recordType="attendance" /> },
  { path: ROUTES.ADVISOR_MODULES.STUDENT_TASKS_DETAILS, element: <AcademicAdvisorStudentRecordsPage recordType="tasks" /> },
  { path: ROUTES.ADVISOR_MODULES.STUDENT_WEEKLY_REPORTS_DETAILS, element: <AcademicAdvisorStudentRecordsPage recordType="weeklyReports" /> },
  { path: ROUTES.ADVISOR_MODULES.DETAILS, element: <OpportunityDetailsPage /> },
];

export const administratorRoutes = [
  { path: ROUTES.DASHBOARD.ADMINISTRATOR, element: <AdministratorDashboardPage />, label: 'Administrator Dashboard' },
  { path: ROUTES.ADMIN_MODULES.IDENTITY_ACCESS, element: <IdentityAccessModulePage />, label: 'Identity & Access' },
  { path: ROUTES.ADMIN_MODULES.OPPORTUNITIES, element: <ProvidersOpportunitiesModulePage />, label: 'Providers & Opportunities' },
  { path: ROUTES.ADMIN_MODULES.INTERNSHIP, element: <InternshipModulePage />, label: 'Internship Workflow' },
  { path: ROUTES.ADMIN_MODULES.EVALUATION, element: <EvaluationModulePage />, label: 'Evaluation' },
  { path: ROUTES.ADMIN_MODULES.ADMINISTRATION, element: <AdministrationModulePage />, label: 'Administration' },
  { path: ROUTES.ACCOUNT.ADMINISTRATOR_PROFILE, element: <ProfilePage /> },
  { path: ROUTES.ACCOUNT.ADMINISTRATOR_CHANGE_PASSWORD, element: <ChangePasswordPage /> },
  { path: ROUTES.ADMIN_MODULES.DETAILS, element: <OpportunityDetailsPage /> },
];

export const studentSidebarItems = buildSidebarItems(studentRoutes);
export const academicAdvisorSidebarItems = buildSidebarItems(academicAdvisorRoutes);
export const administratorSidebarItems = buildSidebarItems(administratorRoutes);
