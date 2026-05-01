const ROLE_OPTIONS = [
  { label: 'Student', value: 'Student' },
  { label: 'AcademicAdvisor', value: 'AcademicAdvisor' },
  { label: 'Administrator', value: 'Administrator' },
];

const ACCOUNT_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

const DOCUMENT_CATEGORY_OPTIONS = [
  { label: 'CV', value: 'CV' },
  { label: 'Portfolio', value: 'Portfolio' },
  { label: 'Certificate', value: 'Certificate' },
  { label: 'Other Attachment', value: 'OtherAttachment' },
  { label: 'Training Letter', value: 'TrainingLetter' },
];

const FILE_TYPE_OPTIONS = [
  { label: 'PDF', value: 'PDF' },
  { label: 'DOCX', value: 'DOCX' },
  { label: 'PPTX', value: 'PPTX' },
  { label: 'PNG', value: 'PNG' },
  { label: 'JPG', value: 'JPG' },
  { label: 'JPEG', value: 'JPEG' },
  { label: 'Other', value: 'OTHER' },
];

const DOCUMENT_STATUS_OPTIONS = [
  { label: 'Uploaded', value: 'Uploaded' },
  { label: 'Reviewed', value: 'Reviewed' },
  { label: 'Archived', value: 'Archived' },
  { label: 'Generated', value: 'Generated' },
];

const SKILL_LEVEL_OPTIONS = [
  { label: 'Beginner', value: 'Beginner' },
  { label: 'Intermediate', value: 'Intermediate' },
  { label: 'Advanced', value: 'Advanced' },
];

const APPROVAL_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Draft', value: 'Draft' },
];

const ADMIN_NOTIFICATION_TYPE_OPTIONS = [
  { label: 'System', value: 'System' },
  { label: 'Email', value: 'Email' },
  { label: 'Reminder', value: 'Reminder' },
  { label: 'Alert', value: 'Alert' },
];

const ADMIN_NOTIFICATION_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Read', value: 'Read' },
  { label: 'Archived', value: 'Archived' },
];

const BACKUP_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Running', value: 'Running' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Failed', value: 'Failed' },
];

const emptyRecords = [];

export const moduleDefinitions = {
  identityAccess: {
    title: 'Identity & Access',
    description: 'Manage users from one interface with role-based filtering.',
    defaultTab: 'User',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      {
        key: 'User',
        label: 'User',
        records: emptyRecords,
        apiKey: 'users',
        fields: [
          { key: 'full_name', label: 'Full Name', type: 'text' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'role', label: 'Role', type: 'select', options: ROLE_OPTIONS },
          { key: 'status', label: 'Status', type: 'select', options: ACCOUNT_STATUS_OPTIONS },
        ],
      },
      {
        key: 'Student',
        label: 'Student',
        records: emptyRecords,
        apiKey: 'students',
        readOnly: true,
      },
      {
        key: 'AcademicAdvisor',
        label: 'AcademicAdvisor',
        records: emptyRecords,
        apiKey: 'advisors',
        readOnly: true,
      },
      {
        key: 'Administrator',
        label: 'Administrator',
        records: emptyRecords,
        apiKey: 'administrators',
        readOnly: true,
      },
      {
        key: 'Role',
        label: 'Role',
        records: emptyRecords,
        apiKey: 'roles',
        readOnly: true,
      },
      {
        key: 'Permission',
        label: 'Permission',
        records: emptyRecords,
        apiKey: 'permissions',
        readOnly: true,
      },
      {
        key: 'Session',
        label: 'Session',
        records: emptyRecords,
        apiKey: 'sessions',
        readOnly: true,
      },
    ],
  },

  studentProfile: {
    title: 'Student Profile',
    description: 'Student profile, attachments, skills, projects, and courses are loaded from the StudentProfile API.',
    defaultTab: 'StudentProfile',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      {
        key: 'StudentProfile',
        label: 'Student Profile',
        records: emptyRecords,
        apiKey: 'studentProfileMe',
        presentation: 'profile-card',
        allowCreate: false,
        allowDelete: false,
        subtitle: 'This tab represents the one-to-one student profile record.',
        fields: [
          { key: 'student_code', label: 'Student Code', type: 'text' },
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'university', label: 'University', type: 'text' },
          { key: 'major', label: 'Major', type: 'text' },
          { key: 'gpa', label: 'GPA', type: 'number' },
          { key: 'city', label: 'City', type: 'text' },
          { key: 'country', label: 'Country', type: 'text' },
          { key: 'graduation_year', label: 'Graduation Year', type: 'number' },
          { key: 'linked_in_url', label: 'LinkedIn URL', type: 'url' },
          { key: 'photo_url', label: 'Photo URL', type: 'url' },
          { key: 'bio', label: 'Bio', type: 'textarea', rows: 5 },
        ],
      },
      {
        key: 'CVDocument',
        label: 'Attachments',
        records: emptyRecords,
        apiKey: 'studentDocuments',
        subtitle: 'Add one or more CV files, portfolio files, or supporting attachments.',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'file_name', label: 'File Name', type: 'text' },
          { key: 'file_url', label: 'File URL', type: 'url' },
          { key: 'category', label: 'Category', type: 'select', options: DOCUMENT_CATEGORY_OPTIONS },
          { key: 'file_type', label: 'File Type', type: 'select', options: FILE_TYPE_OPTIONS },
          { key: 'status', label: 'Status', type: 'select', options: DOCUMENT_STATUS_OPTIONS },
          { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
        ],
      },
      {
        key: 'Skill',
        label: 'Skills',
        records: emptyRecords,
        apiKey: 'studentSkills',
        fields: [
          { key: 'name', label: 'Skill Name', type: 'text' },
          { key: 'level', label: 'Level', type: 'select', options: SKILL_LEVEL_OPTIONS },
          { key: 'category', label: 'Category', type: 'text' },
        ],
      },
      {
        key: 'Project',
        label: 'Projects',
        records: emptyRecords,
        apiKey: 'studentProjects',
        fields: [
          { key: 'title', label: 'Project Title', type: 'text' },
          { key: 'project_year', label: 'Year', type: 'number' },
          { key: 'role_name', label: 'Role', type: 'text' },
          { key: 'project_link', label: 'Project Link', type: 'url' },
          { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
        ],
      },
      {
        key: 'Course',
        label: 'Courses',
        records: emptyRecords,
        apiKey: 'studentCourses',
        fields: [
          { key: 'title', label: 'Course Title', type: 'text' },
          { key: 'provider', label: 'Provider', type: 'text' },
          { key: 'hours', label: 'Hours', type: 'number' },
          { key: 'course_year', label: 'Year', type: 'number' },
        ],
      },
    ],
  },

  providersOpportunities: {
    title: 'Providers & Opportunities',
    description: 'Providers, company requests, opportunities, and applications should be loaded from provider/opportunity APIs when their controllers are available.',
    defaultTab: 'InternshipProvider',
    dataMode: 'api-pending',
    pageStatus: 'partially-linked',
    tabs: [
      { key: 'InternshipProvider', label: 'InternshipProvider', records: emptyRecords, apiKey: 'internshipProviders' },
      { key: 'ProviderRequest', label: 'ProviderRequest', records: emptyRecords, apiKey: 'providerRequests' },
      { key: 'RequestedProviderDetails', label: 'RequestedProviderDetails', records: emptyRecords, apiKey: 'requestedProviderDetails' },
      { key: 'Opportunity', label: 'Opportunity', records: emptyRecords, apiKey: 'opportunities' },
      { key: 'Application', label: 'Application', records: emptyRecords, apiKey: 'applications' },
      { key: 'ApplicationStatusHistory', label: 'ApplicationStatusHistory', records: emptyRecords, apiKey: 'applicationStatusHistory', readOnly: true },
      { key: 'CoverLetterAnalysis', label: 'CoverLetterAnalysis', records: emptyRecords, apiKey: 'coverLetterAnalysis', readOnly: true },
    ],
  },

  internship: {
    title: 'Internship',
    description: 'Internship lifecycle and follow-up records are loaded from workflow APIs instead of local mock records.',
    defaultTab: 'Internship',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      { key: 'Internship', label: 'Internship', records: emptyRecords, apiKey: 'internships' },
      { key: 'TrainingAgreement', label: 'TrainingAgreement', records: emptyRecords, apiKey: 'trainingAgreements' },
      { key: 'AgreementComment', label: 'AgreementComment', records: emptyRecords, apiKey: 'agreementComments' },
      { key: 'FieldVisit', label: 'FieldVisit', records: emptyRecords, apiKey: 'fieldVisits' },
      { key: 'OnlineFollowUp', label: 'OnlineFollowUp', records: emptyRecords, apiKey: 'onlineFollowUps' },
    ],
  },

  attendanceReports: {
    title: 'Attendance & Reports',
    description: 'Attendance, weekly reports, and analytics are loaded from Attendance, WeeklyReports, and Reports APIs.',
    defaultTab: 'AttendanceEntry',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      { key: 'AttendanceEntry', label: 'AttendanceEntry', records: emptyRecords, apiKey: 'attendanceEntries' },
      { key: 'ActivityReport', label: 'ActivityReport', records: emptyRecords, apiKey: 'activityReports' },
      { key: 'TaskReview', label: 'TaskReview', records: emptyRecords, apiKey: 'trainingTasks' },
      { key: 'EvidenceAttachment', label: 'EvidenceAttachment', records: emptyRecords, apiKey: 'taskEvidences' },
      { key: 'WeeklyProgressReport', label: 'WeeklyProgressReport', records: emptyRecords, apiKey: 'weeklyReports' },
    ],
  },

  evaluation: {
    title: 'Evaluation',
    description: 'Evaluation templates, company responses, academic evaluations, and final results are loaded from evaluation APIs.',
    defaultTab: 'CompanyEvaluationForm',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      { key: 'CompanyEvaluationForm', label: 'CompanyEvaluationForm', records: emptyRecords, apiKey: 'companyEvaluationTemplates' },
      { key: 'CompanyEvaluation', label: 'CompanyEvaluation', records: emptyRecords, apiKey: 'companyEvaluations' },
      { key: 'StudentEvaluation', label: 'StudentEvaluation', records: emptyRecords, apiKey: 'academicStudentEvaluations' },
      { key: 'EvaluationCriterion', label: 'EvaluationCriterion', records: emptyRecords, apiKey: 'evaluationCriteria' },
      { key: 'EvaluationMark', label: 'EvaluationMark', records: emptyRecords, apiKey: 'evaluationMarks' },
      { key: 'FinalGrade', label: 'FinalGrade', records: emptyRecords, apiKey: 'finalGrades' },
      { key: 'ProviderEvaluation', label: 'ProviderEvaluation', records: emptyRecords, apiKey: 'providerEvaluations' },
      { key: 'FinalEvaluationReport', label: 'FinalEvaluationReport', records: emptyRecords, apiKey: 'finalEvaluationReports' },
      { key: 'Certificate', label: 'Certificate', records: emptyRecords, apiKey: 'certificates' },
    ],
  },

  administration: {
    title: 'Administration',
    description: 'Administration data is loaded from API endpoints. Notifications and settings can be managed manually; audit logs are system-generated.',
    defaultTab: 'Notification',
    dataMode: 'api',
    pageStatus: 'linked',
    tabs: [
      { key: 'Notification', label: 'Notification', records: emptyRecords, apiKey: 'adminNotifications' },
      { key: 'AuditLog', label: 'AuditLog', records: emptyRecords, apiKey: 'adminAuditLogs', readOnly: true },
      { key: 'BackupJob', label: 'BackupJob', records: emptyRecords, apiKey: 'adminBackupJobs' },
      { key: 'SystemConfiguration', label: 'SystemConfiguration', records: emptyRecords, apiKey: 'adminSystemSettings' },
      { key: 'ArchivedRecord', label: 'ArchivedRecord', records: emptyRecords, apiKey: 'adminArchivedRecords' },
    ],
  },
};

export default moduleDefinitions;