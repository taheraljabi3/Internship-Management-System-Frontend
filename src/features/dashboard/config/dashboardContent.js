import ROUTES from '../../../app/router/routePaths';
import { moduleTabLink } from '../../../app/router/moduleTabLink';

const studentProfileTab = (tab) => moduleTabLink(ROUTES.STUDENT_MODULES.PROFILE, tab);
const studentOpportunitiesTab = (tab) => moduleTabLink(ROUTES.STUDENT_MODULES.OPPORTUNITIES, tab);
const studentInternshipTab = (tab) => moduleTabLink(ROUTES.STUDENT_MODULES.INTERNSHIP, tab);
const studentReportsTab = (tab) => moduleTabLink(ROUTES.STUDENT_MODULES.REPORTS, tab);
const studentEvaluationTab = (tab) => moduleTabLink(ROUTES.STUDENT_MODULES.EVALUATION, tab);

const advisorOpportunitiesTab = (tab) => moduleTabLink(ROUTES.ADVISOR_MODULES.OPPORTUNITIES, tab);
const advisorInternshipTab = (tab) => moduleTabLink(ROUTES.ADVISOR_MODULES.INTERNSHIP, tab);
const advisorReportsTab = (tab) => moduleTabLink(ROUTES.ADVISOR_MODULES.REPORTS, tab);
const advisorEvaluationTab = (tab) => moduleTabLink(ROUTES.ADVISOR_MODULES.EVALUATION, tab);

const adminIdentityTab = (tab) => moduleTabLink(ROUTES.ADMIN_MODULES.IDENTITY_ACCESS, tab);
const adminOpportunitiesTab = (tab) => moduleTabLink(ROUTES.ADMIN_MODULES.OPPORTUNITIES, tab);
const adminEvaluationTab = (tab) => moduleTabLink(ROUTES.ADMIN_MODULES.EVALUATION, tab);
const adminAdministrationTab = (tab) => moduleTabLink(ROUTES.ADMIN_MODULES.ADMINISTRATION, tab);

export const studentDashboardStats = [
  { title: 'Profile Completion', value: '0%', subtitle: 'Waiting for backend profile data' },
  { title: 'Available Opportunities', value: '0', subtitle: 'Waiting for backend opportunities data' },
  { title: 'Attendance Days', value: '0', subtitle: 'Waiting for backend attendance data' },
  { title: 'Weekly Reports', value: '0', subtitle: 'Waiting for backend reports data' },
];

export const studentDashboardSections = [
  {
    title: 'Profile',
    description: 'Manage your student profile, attachments, projects, courses, and skills.',
    items: ['StudentProfile', 'CVDocument', 'Skill', 'Project', 'Course'],
    actions: [
      { label: 'Open Student Profile', to: studentProfileTab('StudentProfile') },
      { label: 'Open Attachments', to: studentProfileTab('CVDocument') },
      { label: 'Open Projects', to: studentProfileTab('Project') },
    ],
  },
  {
    title: 'Opportunities',
    description: 'Browse opportunities, review details, and submit applications.',
    items: ['Opportunity', 'Application', 'ProviderRequest'],
    actions: [
      { label: 'Open Opportunities', to: studentOpportunitiesTab('Opportunity') },
      { label: 'Open Applications', to: studentOpportunitiesTab('Application') },
    ],
  },
  {
    title: 'Internship & Reports',
    description: 'Track internship details, attendance, daily tasks, and weekly reports.',
    items: ['Internship', 'FieldVisit', 'OnlineFollowUp', 'AttendanceEntry', 'WeeklyProgressReport'],
    actions: [
      { label: 'Open Internship', to: studentInternshipTab('Internship') },
      { label: 'Open Attendance', to: studentReportsTab('AttendanceEntry') },
      { label: 'Open Weekly Reports', to: studentReportsTab('WeeklyProgressReport') },
    ],
  },
  {
    title: 'Evaluation',
    description: 'Review company evaluation and academic supervisor evaluation results.',
    items: ['CompanyEvaluation', 'StudentEvaluation'],
    actions: [{ label: 'Open Evaluation', to: studentEvaluationTab('CompanyEvaluation') }],
  },
];

export const studentDashboardQuickActions = [
  { label: 'Update Profile', to: ROUTES.ACCOUNT.STUDENT_PROFILE },
  { label: 'Browse Opportunities', to: ROUTES.STUDENT_MODULES.OPPORTUNITIES },
  { label: 'Open Attendance', to: ROUTES.STUDENT_MODULES.REPORTS },
];

export const studentDashboardProgress = [
  { label: 'Profile Setup', value: 0 },
  { label: 'Internship Readiness', value: 0 },
  { label: 'Attendance Completion', value: 0 },
];

export const studentDashboardRecentActivity = [];

export const academicAdvisorDashboardStats = [
  { title: 'Assigned Trainees', value: '0', subtitle: 'Waiting for backend student mapping' },
  { title: 'Approved Internships', value: '0', subtitle: 'Waiting for backend internship approvals' },
  { title: 'Scheduled Follow-Ups', value: '0', subtitle: 'Waiting for backend meetings data' },
  { title: 'Pending Reviews', value: '0', subtitle: 'Waiting for backend review queues' },
];

export const academicAdvisorDashboardSections = [
  {
    title: 'Opportunities',
    description: 'Review opportunities, approve student requests, and add new opportunities.',
    items: ['Opportunity', 'ProviderRequest', 'InternshipProvider'],
    actions: [
      { label: 'Open Opportunities', to: advisorOpportunitiesTab('Opportunity') },
      { label: 'Open Provider Requests', to: advisorOpportunitiesTab('ProviderRequest') },
    ],
  },
  {
    title: 'Internship Follow-Up',
    description: 'Review approved internships and schedule meetings or field visits.',
    items: ['Internship', 'FieldVisit', 'OnlineFollowUp'],
    actions: [
      { label: 'Open Internship', to: advisorInternshipTab('Internship') },
      { label: 'Open Follow-Up Schedule', to: advisorInternshipTab('FieldVisit') },
    ],
  },
  {
    title: 'Reports & Evaluation',
    description: 'Review attendance, weekly reports, and evaluation results.',
    items: ['AttendanceEntry', 'WeeklyProgressReport', 'StudentEvaluation', 'CompanyEvaluation'],
    actions: [
      { label: 'Open Attendance', to: advisorReportsTab('AttendanceEntry') },
      { label: 'Open Weekly Reports', to: advisorReportsTab('WeeklyProgressReport') },
      { label: 'Open Evaluation', to: advisorEvaluationTab('StudentEvaluation') },
    ],
  },
];

export const academicAdvisorDashboardQuickActions = [
  { label: 'Open Opportunities', to: ROUTES.ADVISOR_MODULES.OPPORTUNITIES },
  { label: 'Open Internship', to: ROUTES.ADVISOR_MODULES.INTERNSHIP },
  { label: 'Open Evaluation', to: ROUTES.ADVISOR_MODULES.EVALUATION },
];

export const academicAdvisorDashboardProgress = [
  { label: 'Internship Follow-Up Coverage', value: 0 },
  { label: 'Attendance Review Completion', value: 0 },
  { label: 'Evaluation Completion', value: 0 },
];

export const academicAdvisorDashboardRecentActivity = [];

export const administratorDashboardStats = [
  { title: 'Active Users', value: '0', subtitle: 'Waiting for backend users data' },
  { title: 'Open Opportunities', value: '0', subtitle: 'Waiting for backend opportunities data' },
  { title: 'Evaluations Submitted', value: '0', subtitle: 'Waiting for backend evaluations data' },
  { title: 'System Alerts', value: '0', subtitle: 'Waiting for backend administration data' },
];

export const administratorDashboardSections = [
  {
    title: 'Identity & Access',
    description: 'Manage users, roles, permissions, and sessions.',
    items: ['User', 'Student', 'AcademicAdvisor', 'Administrator', 'Role', 'Permission', 'Session'],
    actions: [
      { label: 'Open Users', to: adminIdentityTab('User') },
      { label: 'Open Roles', to: adminIdentityTab('Role') },
      { label: 'Open Sessions', to: adminIdentityTab('Session') },
    ],
  },
  {
    title: 'Opportunities & Evaluation',
    description: 'Review opportunities, provider requests, and evaluation responses.',
    items: ['Opportunity', 'ProviderRequest', 'CompanyEvaluationForm', 'CompanyEvaluation', 'StudentEvaluation'],
    actions: [
      { label: 'Open Opportunities', to: adminOpportunitiesTab('Opportunity') },
      { label: 'Open Evaluation', to: adminEvaluationTab('CompanyEvaluation') },
    ],
  },
  {
    title: 'Administration',
    description: 'Review notifications, logs, backups, and system configuration.',
    items: ['Notification', 'EmailTemplate', 'AuditLog', 'BackupJob', 'SystemConfiguration', 'ArchivedRecord'],
    actions: [{ label: 'Open Administration', to: adminAdministrationTab('Notification') }],
  },
];

export const administratorDashboardQuickActions = [
  { label: 'Open Identity & Access', to: ROUTES.ADMIN_MODULES.IDENTITY_ACCESS },
  { label: 'Open Opportunities', to: ROUTES.ADMIN_MODULES.OPPORTUNITIES },
  { label: 'Open Administration', to: ROUTES.ADMIN_MODULES.ADMINISTRATION },
];

export const administratorDashboardProgress = [
  { label: 'User Management Coverage', value: 0 },
  { label: 'Opportunity Governance', value: 0 },
  { label: 'Evaluation Review Completion', value: 0 },
];

export const administratorDashboardRecentActivity = [];
