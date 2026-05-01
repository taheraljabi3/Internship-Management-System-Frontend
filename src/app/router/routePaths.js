const ROUTES = {
  PUBLIC: {
    ROOT: '/',
    HOME: '/home',
    LOGIN: '/login',
    REGISTER: '/register',
    UNAUTHORIZED: '/unauthorized',
    COMPANY_EVALUATION_FORM: '/external/company-evaluation/register/:token',  },

  DASHBOARD: {
    STUDENT: '/dashboard/student',
    ACADEMIC_ADVISOR: '/dashboard/academic-advisor',
    ADMINISTRATOR: '/dashboard/administrator',
  },

  ACCOUNT: {
    STUDENT_PROFILE: '/student/account/profile',
    STUDENT_CHANGE_PASSWORD: '/student/account/change-password',

    ACADEMIC_ADVISOR_PROFILE: '/academic-advisor/account/profile',
    ACADEMIC_ADVISOR_CHANGE_PASSWORD: '/academic-advisor/account/change-password',

    ADMINISTRATOR_PROFILE: '/administrator/account/profile',
    ADMINISTRATOR_CHANGE_PASSWORD: '/administrator/account/change-password',
  },

  STUDENT_MODULES: {
    PROFILE: '/student/modules/profile',
    OPPORTUNITIES: '/student/modules/opportunities',
    DETAILS: '/student/modules/opportunities/:opportunityId',
    INTERNSHIP: '/student/modules/internship',
    REPORTS: '/student/modules/reports',
    EVALUATION: '/student/modules/evaluation',
  },

  ADVISOR_MODULES: {
    OPPORTUNITIES: '/advisor/modules/opportunities',
    DETAILS: '/advisor/modules/opportunities/:opportunityId',
    INTERNSHIP: '/advisor/modules/internship',
    REPORTS: '/advisor/modules/reports',
    EVALUATION: '/advisor/modules/evaluation',
    STUDENT_FILE: '/advisor/students/:studentId',
    STUDENT_ATTENDANCE_DETAILS: '/advisor/students/:studentId/attendance',
    STUDENT_TASKS_DETAILS: '/advisor/students/:studentId/tasks',
    STUDENT_WEEKLY_REPORTS_DETAILS: '/advisor/students/:studentId/weekly-reports',
  },

  ADMIN_MODULES: {
    IDENTITY_ACCESS: '/admin/modules/identity-access',
    OPPORTUNITIES: '/admin/modules/opportunities',
    INTERNSHIP: '/admin/modules/internship',
    DETAILS: '/admin/modules/opportunities/:opportunityId',
    EVALUATION: '/admin/modules/evaluation',
    ADMINISTRATION: '/admin/modules/administration',
  },
};

export default ROUTES;
