const ROUTE_FALLBACKS = {
  adminDashboard: '/dashboard/administrator',
  advisorDashboard: '/dashboard/academic-advisor',

  adminInternship: '/admin/modules/internship',
  advisorInternship: '/advisor/modules/internship',

  identityAccess: '/admin/modules/identity-access',
  evaluation: '/admin/modules/evaluation',
  reports: '/admin/modules/reports',
};

function pickRoute(...routes) {
  return routes.find(Boolean);
}

export function getOnboardingSteps(role, routes = {}) {
  const normalizedRole = String(role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');

  if (normalizedRole === 'administrator' || normalizedRole === 'admin') {
    return [
      {
        key: 'admin-dashboard-overview',
        route: pickRoute(
          routes?.DASHBOARD?.ADMINISTRATOR,
          routes?.ADMINISTRATOR?.DASHBOARD,
          routes?.ADMIN?.DASHBOARD,
          ROUTE_FALLBACKS.adminDashboard
        ),
        target: '[data-onboarding="admin-dashboard-kpis"]',
        titleAr: 'ابدأ من لوحة التحكم',
        bodyAr:
          'هنا تظهر المؤشرات الأساسية لمسار التدريب مثل عدد الطلاب، الطلبات المعلقة، خطط التدريب، والتقارير الأسبوعية.',
        titleEn: 'Start from the dashboard',
        bodyEn:
          'This dashboard shows the main internship indicators such as students, pending requests, plans, and weekly reports.',
      },
      {
        key: 'admin-users-access',
        route: pickRoute(
          routes?.ADMIN_MODULES?.IDENTITY_ACCESS,
          routes?.ADMINISTRATOR?.IDENTITY_ACCESS,
          routes?.IDENTITY_ACCESS?.ROOT,
          ROUTE_FALLBACKS.identityAccess
        ),
        target: '[data-onboarding="identity-users-table"]',
        titleAr: 'إدارة المستخدمين والصلاحيات',
        bodyAr:
          'من هنا يمكنك مراجعة المستخدمين، إنشاء حسابات، تعديل الصلاحيات، ومتابعة حالة الحسابات.',
        titleEn: 'Manage users and access',
        bodyEn:
          'From here you can review users, create accounts, edit access, and track account status.',
      },
      {
        key: 'admin-create-invitation',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="admin-create-invitation"]',
        titleAr: 'إنشاء دعوة جماعية',
        bodyAr:
          'هذه أهم خطوة لبداية دورة التدريب. أنشئ دعوة للطلاب، واربطها بالمشرف الأكاديمي المناسب.',
        titleEn: 'Create a bulk invitation',
        bodyEn:
          'This is the first operational step. Create student invitations and link them to the correct academic advisor.',
      },
      {
        key: 'admin-invitations-tab',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="admin-invitations-tab"]',
        titleAr: 'متابعة الدعوات',
        bodyAr:
          'تابع حالة الدعوات: مرسلة، مقبولة، أو بانتظار تسجيل الدخول. هذا يساعدك تعرف من بدأ فعليًا.',
        titleEn: 'Track invitations',
        bodyEn:
          'Track invitation statuses such as sent, accepted, or pending login to know who started.',
      },
      {
        key: 'admin-advisor-assignment',
        route: pickRoute(
          routes?.ADMIN_MODULES?.IDENTITY_ACCESS,
          routes?.ADMINISTRATOR?.IDENTITY_ACCESS,
          routes?.IDENTITY_ACCESS?.ROOT,
          ROUTE_FALLBACKS.identityAccess
        ),
        target: '[data-onboarding="advisor-assignment-section"]',
        titleAr: 'ربط الطلاب بالمشرفين',
        bodyAr:
          'تأكد أن كل طالب مرتبط بمشرف أكاديمي، لأن الاعتمادات والتقارير تعتمد على هذا الربط.',
        titleEn: 'Assign students to advisors',
        bodyEn:
          'Make sure each student is assigned to an academic advisor, since approvals and reports depend on this mapping.',
      },
      {
        key: 'admin-eligibility',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="eligibility-tab"]',
        titleAr: 'متابعة الأهلية',
        bodyAr:
          'بعد قبول الدعوة وإنشاء الحساب، يتم التأكد من أهلية الطالب قبل دخوله في مسار التدريب.',
        titleEn: 'Review eligibility',
        bodyEn:
          'After accepting the invitation and creating the account, the student eligibility can be reviewed.',
      },
      {
        key: 'admin-company-approval',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="company-approval-tab"]',
        titleAr: 'اعتماد شركات التدريب',
        bodyAr:
          'من هنا يتم متابعة طلبات الشركات وقبول أو رفض جهة التدريب المناسبة للطالب.',
        titleEn: 'Approve training companies',
        bodyEn:
          'From here you can review company requests and approve or reject the selected training provider.',
      },
      {
        key: 'admin-training-plan',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="training-plan-tab"]',
        titleAr: 'متابعة خطط التدريب',
        bodyAr:
          'بعد اعتماد الشركة، يتم رفع خطة التدريب ومراجعتها واعتمادها أو إرجاعها للتعديل.',
        titleEn: 'Review training plans',
        bodyEn:
          'After company approval, training plans can be submitted, reviewed, approved, or returned for changes.',
      },
      {
        key: 'admin-weekly-reports',
        route: pickRoute(
          routes?.ADMIN_MODULES?.INTERNSHIP,
          routes?.ADMINISTRATOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADMIN,
          ROUTE_FALLBACKS.adminInternship
        ),
        target: '[data-onboarding="weekly-reports-tab"]',
        titleAr: 'متابعة التقارير الأسبوعية',
        bodyAr:
          'التقارير الأسبوعية تساعد على متابعة تقدم الطالب والمهام المنجزة والمرفقات.',
        titleEn: 'Track weekly reports',
        bodyEn:
          'Weekly reports help track student progress, completed tasks, and uploaded evidence.',
      },
      {
        key: 'admin-evaluation-template',
        route: pickRoute(
          routes?.ADMIN_MODULES?.EVALUATION,
          routes?.ADMINISTRATOR?.EVALUATION,
          routes?.EVALUATION?.ROOT,
          ROUTE_FALLBACKS.evaluation
        ),
        target: '[data-onboarding="evaluation-template-builder"]',
        titleAr: 'تجهيز قوالب التقييم',
        bodyAr:
          'جهز قوالب تقييم الشركة أو التقييم الأكاديمي حتى يتم استخدامها لاحقًا في تقييم الطلاب.',
        titleEn: 'Prepare evaluation templates',
        bodyEn:
          'Prepare company and academic evaluation templates to be used later for student evaluation.',
      },
    ];
  }

  if (normalizedRole === 'academicadvisor' || normalizedRole === 'advisor') {
    return [
      {
        key: 'advisor-dashboard',
        route: pickRoute(
          routes?.DASHBOARD?.ACADEMIC_ADVISOR,
          routes?.ACADEMIC_ADVISOR?.DASHBOARD,
          routes?.ADVISOR?.DASHBOARD,
          ROUTE_FALLBACKS.advisorDashboard
        ),
        target: '[data-onboarding="advisor-dashboard-kpis"]',
        titleAr: 'لوحة المشرف الأكاديمي',
        bodyAr:
          'ابدأ من هنا لمتابعة الطلاب المرتبطين بك، الطلبات المعلقة، خطط التدريب، والتقارير.',
        titleEn: 'Academic advisor dashboard',
        bodyEn:
          'Start here to track your assigned students, pending requests, training plans, and reports.',
      },
      {
        key: 'advisor-students',
        route: pickRoute(
          routes?.DASHBOARD?.ACADEMIC_ADVISOR,
          routes?.ACADEMIC_ADVISOR?.DASHBOARD,
          routes?.ADVISOR?.DASHBOARD,
          ROUTE_FALLBACKS.advisorDashboard
        ),
        target: '[data-onboarding="advisor-students-table"]',
        titleAr: 'قائمة الطلاب',
        bodyAr:
          'هذه قائمة الطلاب المرتبطين بك. افتح ملف الطالب لمراجعة بياناته ومسار التدريب الخاص به.',
        titleEn: 'Assigned students',
        bodyEn:
          'This is your assigned students list. Open a student file to review profile and internship progress.',
      },
      {
        key: 'advisor-student-file',
        route: pickRoute(
          routes?.DASHBOARD?.ACADEMIC_ADVISOR,
          routes?.ACADEMIC_ADVISOR?.DASHBOARD,
          routes?.ADVISOR?.DASHBOARD,
          ROUTE_FALLBACKS.advisorDashboard
        ),
        target: '[data-onboarding="advisor-student-file"]',
        titleAr: 'فتح ملف الطالب',
        bodyAr:
          'من ملف الطالب تستطيع مراجعة بياناته، الشركة، الخطة، التقارير، والتقييمات.',
        titleEn: 'Open student file',
        bodyEn:
          'From the student file, you can review profile data, company, plan, reports, and evaluations.',
      },
      {
        key: 'advisor-company-approval',
        route: pickRoute(
          routes?.ADVISOR_MODULES?.INTERNSHIP,
          routes?.ACADEMIC_ADVISOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADVISOR,
          ROUTE_FALLBACKS.advisorInternship
        ),
        target: '[data-onboarding="company-approval-tab"]',
        titleAr: 'اعتماد شركة التدريب',
        bodyAr:
          'راجع طلب شركة التدريب، ثم اقبل أو ارفض الطلب حسب بيانات الشركة ومدى مناسبتها.',
        titleEn: 'Approve training company',
        bodyEn:
          'Review the training company request, then approve or reject it based on the company details.',
      },
      {
        key: 'advisor-training-plan',
        route: pickRoute(
          routes?.ADVISOR_MODULES?.INTERNSHIP,
          routes?.ACADEMIC_ADVISOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADVISOR,
          ROUTE_FALLBACKS.advisorInternship
        ),
        target: '[data-onboarding="training-plan-tab"]',
        titleAr: 'مراجعة خطة التدريب',
        bodyAr:
          'بعد اعتماد الشركة، يرفع الطالب خطة التدريب. راجعها واعتمدها أو أعدها للتعديل.',
        titleEn: 'Review training plan',
        bodyEn:
          'After company approval, the student submits a training plan. Review and approve or request changes.',
      },
      {
        key: 'advisor-weekly-reports',
        route: pickRoute(
          routes?.ADVISOR_MODULES?.INTERNSHIP,
          routes?.ACADEMIC_ADVISOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADVISOR,
          ROUTE_FALLBACKS.advisorInternship
        ),
        target: '[data-onboarding="weekly-reports-tab"]',
        titleAr: 'متابعة التقارير الأسبوعية',
        bodyAr:
          'التقارير الأسبوعية تساعدك في متابعة تقدم الطالب، المهام المنجزة، والمرفقات.',
        titleEn: 'Track weekly reports',
        bodyEn:
          'Weekly reports help you track student progress, completed tasks, and attachments.',
      },
      {
        key: 'advisor-final-evaluation',
        route: pickRoute(
          routes?.ADVISOR_MODULES?.INTERNSHIP,
          routes?.ACADEMIC_ADVISOR?.INTERNSHIP,
          routes?.INTERNSHIP?.ADVISOR,
          ROUTE_FALLBACKS.advisorInternship
        ),
        target: '[data-onboarding="send-company-evaluation"]',
        titleAr: 'إرسال تقييم الشركة',
        bodyAr:
          'في نهاية التدريب، أرسل رابط تقييم الشركة حتى يتم تعبئة التقييم من جهة التدريب.',
        titleEn: 'Send company evaluation',
        bodyEn:
          'At the end of training, send the company evaluation link to the training provider.',
      },
    ];
  }

  return [];
}