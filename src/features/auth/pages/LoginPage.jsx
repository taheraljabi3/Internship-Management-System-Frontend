import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ROUTES from '../../../app/router/routePaths';
import { loginRequest, persistAuthSession } from '../../../app/api/client';
import './LoginPage_FullScreenLanding.css';

const UI_TEXT = {
  ar: {
    systemName: 'نظام إدارة التدريب',
    systemNameEn: 'Internship Management System',
    heroTitleLine1: 'تنمّي المهارات',
    heroTitleLine2: 'تُبني المستقبل',
    heroText:
      'منصة متكاملة لإدارة برامج التدريب الداخلي، ربط الطلاب بالفرص، وتمكين المؤسسات من التميز.',
    loginTitle: 'نظام إدارة التدريب',
    welcome: 'مرحبًا بك!',
    loginHint: 'يرجى تسجيل الدخول للمتابعة',
    emailLabel: 'البريد الجامعي',
    emailPlaceholder: 'اسمك@university.edu.sa',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور',
    remember: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginButton: 'تسجيل الدخول',
    loading: 'جارٍ تسجيل الدخول...',
    invitationsOnly: 'يتم إنشاء الحسابات عبر الدعوات فقط',
    support: 'الدعم الفني',
    supportEmail: 'support@ims.edu.sa',
    workingHours: 'أوقات العمل',
    workingHoursValue: 'الأحد - الخميس 8:00 - 4:00',
    copyright: 'جميع الحقوق محفوظة © 2026 نظام إدارة التدريب',
    secureData: 'بيانات آمنة',
    secureDataSub: 'تشفير متقدم',
    compliant: 'متوافق مع',
    compliantSub: 'معايير حماية البيانات',
    feature1: 'ربط ذكي',
    feature1Sub: 'بين الطلاب والجهات',
    feature2: 'متابعة وتقارير',
    feature2Sub: 'لحظية ودقيقة',
    feature3: 'إدارة آمنة',
    feature3Sub: 'للبيانات والصلاحيات',
    feature4: 'تجربة متكاملة',
    feature4Sub: 'لسهولة الأداء',
    emptyCredentials: 'يرجى إدخال البريد الإلكتروني وكلمة المرور قبل المتابعة.',
    loginSuccess: 'تم تسجيل الدخول بنجاح. جاري نقلك إلى الواجهة المناسبة...',
    loginFailed: 'تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    languageSwitch: 'EN',
  },
  en: {
    systemName: 'Internship Management System',
    systemNameEn: 'نظام إدارة التدريب',
    heroTitleLine1: 'Grow skills',
    heroTitleLine2: 'Build the future',
    heroText:
      'An integrated platform for internship programs, connecting students with opportunities and helping institutions operate with excellence.',
    loginTitle: 'Internship Management System',
    welcome: 'Welcome back!',
    loginHint: 'Please sign in to continue',
    emailLabel: 'University Email',
    emailPlaceholder: 'name@university.edu.sa',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Password',
    remember: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginButton: 'Sign in',
    loading: 'Signing in...',
    invitationsOnly: 'Accounts are created by invitations only',
    support: 'Technical Support',
    supportEmail: 'support@ims.edu.sa',
    workingHours: 'Working Hours',
    workingHoursValue: 'Sun - Thu 8:00 - 4:00',
    copyright: 'All rights reserved © 2026 IMS',
    secureData: 'Secure Data',
    secureDataSub: 'Advanced encryption',
    compliant: 'Compliant with',
    compliantSub: 'Data protection standards',
    feature1: 'Smart matching',
    feature1Sub: 'Students and providers',
    feature2: 'Live reports',
    feature2Sub: 'Accurate tracking',
    feature3: 'Secure access',
    feature3Sub: 'Data and roles',
    feature4: 'Unified journey',
    feature4Sub: 'Smooth experience',
    emptyCredentials: 'Please enter your email and password before continuing.',
    loginSuccess: 'Signed in successfully. Redirecting you to your dashboard...',
    loginFailed: 'Unable to sign in. Please check your credentials and try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    languageSwitch: 'AR',
  },
};

function normalizeRole(role = '') {
  const value = String(role).trim().toLowerCase().replace(/[\s_-]/g, '');

  if (value === 'administrator' || value === 'admin') return 'Administrator';
  if (value === 'academicadvisor' || value === 'advisor') return 'AcademicAdvisor';
  return 'Student';
}

function getDashboardRoute(role) {
  const normalizedRole = normalizeRole(role);

  const fallbackRoutes = {
    Administrator: '/admin/dashboard',
    AcademicAdvisor: '/advisor/dashboard',
    Student: '/student/dashboard',
  };

  return (
    ROUTES?.DASHBOARD?.[normalizedRole] ||
    (normalizedRole === 'AcademicAdvisor' ? ROUTES?.DASHBOARD?.ACADEMIC_ADVISOR : '') ||
    (normalizedRole === 'Administrator' ? ROUTES?.DASHBOARD?.ADMINISTRATOR : '') ||
    (normalizedRole === 'Student' ? ROUTES?.DASHBOARD?.STUDENT : '') ||
    fallbackRoutes[normalizedRole] ||
    ROUTES?.PUBLIC?.ROOT ||
    '/'
  );
}

function SvgIcon({ name, size = 22, className = '' }) {
  const props = {
    className: `ims-login-svg ${className}`.trim(),
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  const icons = {
    logo: (
      <>
        <path d="M12 3c3.8 0 6.9 1.6 8.5 4.2v7.2c-1.6-2-4.7-3.2-8.5-3.2S5.1 12.4 3.5 14.4V7.2C5.1 4.6 8.2 3 12 3Z" />
        <path d="M12 11.2v8.3" />
        <path d="M5.2 8.2c2.8-.5 5 .4 6.8 3 1.8-2.6 4-3.5 6.8-3" />
        <path d="M4.2 16.3c2.8-.8 5.5-.1 7.8 2.7 2.3-2.8 5-3.5 7.8-2.7" />
      </>
    ),
    mail: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m5.5 8 6.5 5 6.5-5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2.2" />
        <path d="M8.2 10V7.4a3.8 3.8 0 0 1 7.6 0V10" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.7" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2c.5-.1.9-.2 1.4-.2 6 0 9.5 7 9.5 7a16 16 0 0 1-2.6 3.3" />
        <path d="M6.2 6.8C3.8 8.6 2.5 12 2.5 12s3.5 7 9.5 7c1.5 0 2.8-.4 4-1" />
        <path d="M10.6 10.6a2.6 2.6 0 0 0 2.8 2.8" />
      </>
    ),
    login: (
      <>
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
        <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    report: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
        <path d="M17 6h2v2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
      </>
    ),
    graduation: (
      <>
        <path d="m3 8 9-4 9 4-9 4-9-4Z" />
        <path d="M7 10.3v4.2c0 1.6 2.2 3 5 3s5-1.4 5-3v-4.2" />
        <path d="M21 8v6" />
      </>
    ),
    briefcase: (
      <>
        <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M4 11h16" />
        <path d="M10 12h4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>
    ),
    headset: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
        <path d="M20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
        <path d="M16 19c-.8 1.2-2.1 2-4 2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a13.5 13.5 0 0 1 0 18" />
        <path d="M12 3a13.5 13.5 0 0 0 0 18" />
      </>
    ),
  };

  return <svg {...props}>{icons[name] || icons.logo}</svg>;
}

function SystemIllustration() {
  return (
    <div className="ims-login-illustration" aria-hidden="true">
      <div className="ims-login-city">
        <span className="tower tower-1" />
        <span className="tower tower-2" />
        <span className="tower tower-3" />
        <span className="tower tower-4" />
        <span className="tower tower-5" />
      </div>

      <div className="ims-login-illustration-card">
        <div className="ims-login-card-row">
          <span className="avatar" />
          <span className="line large" />
          <span className="badge-check" />
        </div>
        <div className="ims-login-card-row">
          <span className="avatar small" />
          <span className="line medium" />
        </div>
        <div className="ims-login-chart">
          <i style={{ height: '42%' }} />
          <i style={{ height: '68%' }} />
          <i style={{ height: '54%' }} />
          <i style={{ height: '86%' }} />
          <i style={{ height: '72%' }} />
        </div>
      </div>

      <div className="ims-login-person person-left">
        <div className="head" />
        <div className="body" />
        <div className="laptop" />
      </div>

      <div className="ims-login-person person-center">
        <div className="head" />
        <div className="body" />
        <div className="arm" />
      </div>

      <div className="ims-login-person person-right">
        <div className="head" />
        <div className="body" />
        <div className="laptop" />
      </div>

      <div className="floating-icon floating-grad">
        <SvgIcon name="graduation" size={26} />
      </div>
      <div className="floating-icon floating-users">
        <SvgIcon name="users" size={24} />
      </div>
      <div className="floating-icon floating-briefcase">
        <SvgIcon name="briefcase" size={24} />
      </div>
      <div className="floating-icon floating-shield">
        <SvgIcon name="shield" size={24} />
      </div>
      <div className="growth-arrow" />
    </div>
  );
}

function LoginPage() {
  const [language, setLanguage] = useState('ar');
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const text = UI_TEXT[language];
  const isArabic = language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';

  const features = useMemo(
    () => [
      { icon: 'users', title: text.feature1, subtitle: text.feature1Sub },
      { icon: 'report', title: text.feature2, subtitle: text.feature2Sub },
      { icon: 'shield', title: text.feature3, subtitle: text.feature3Sub },
      { icon: 'star', title: text.feature4, subtitle: text.feature4Sub },
    ],
    [text]
  );

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    const email = form.email.trim();
    const password = form.password;

    if (!email || !password) {
      setFeedback({
        type: 'warning',
        message: text.emptyCredentials,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await loginRequest({ login: email, password });

      const sessionUser = response?.user || {};
      const sessionRole = normalizeRole(sessionUser.role);

      persistAuthSession({
        access_token: response?.access_token || response?.accessToken || '',
        refresh_token: response?.refresh_token || response?.refreshToken || '',
        session_id: response?.session_id || response?.sessionId || '',
        user: {
          ...sessionUser,
          role: sessionUser.role || sessionRole,
        },
      });

      setFeedback({
        type: 'success',
        message: text.loginSuccess,
      });

      window.setTimeout(() => {
        window.location.replace(getDashboardRoute(sessionUser.role || sessionRole));
      }, 350);
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || text.loginFailed,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ims-login-page" dir={dir} lang={language}>
      <div className="ims-login-shell">
        <section className="ims-login-left">
          <header className="ims-login-brand-row">
            <div className="ims-login-brand-mark">
              <SvgIcon name="logo" size={44} />
            </div>
            <div className="ims-login-brand-text">
              <strong>{text.systemName}</strong>
              <span>{text.systemNameEn}</span>
            </div>
          </header>

          <div className="ims-login-hero-copy">
            <h1>
              {text.heroTitleLine1}
              <span>{text.heroTitleLine2}</span>
            </h1>
            <p>{text.heroText}</p>
            <i />
          </div>

          <SystemIllustration />

          <div className="ims-login-feature-strip">
            {features.map((item) => (
              <div key={item.title} className="ims-login-feature-item">
                <div>
                  <SvgIcon name={item.icon} size={28} />
                </div>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ims-login-right">
          <div className="ims-login-language">
            <SvgIcon name="globe" size={17} />
            <button
              type="button"
              className={language === 'ar' ? 'active' : ''}
              onClick={() => setLanguage('ar')}
            >
              AR
            </button>
            <span />
            <button
              type="button"
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>

          <form className="ims-login-card" onSubmit={handleSubmit}>
            <div className="ims-login-card-logo">
              <SvgIcon name="logo" size={44} />
            </div>

            <div className="ims-login-card-title">
              <h2>{text.loginTitle}</h2>
              <span>{isArabic ? 'Internship Management System' : 'نظام إدارة التدريب'}</span>
              <i />
              <strong>{text.welcome}</strong>
              <p>{text.loginHint}</p>
            </div>

            {feedback.message ? (
              <div className={`ims-login-feedback ims-login-feedback-${feedback.type}`}>
                {feedback.message}
              </div>
            ) : null}

            <label className="ims-login-field">
              <span>{text.emailLabel}</span>
              <div className="ims-login-input-wrap">
                <SvgIcon name="mail" size={21} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder={text.emailPlaceholder}
                  autoComplete="username"
                  dir="ltr"
                />
              </div>
            </label>

            <label className="ims-login-field">
              <span>{text.passwordLabel}</span>
              <div className="ims-login-input-wrap">
                <SvgIcon name="lock" size={21} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  placeholder={text.passwordPlaceholder}
                  autoComplete="current-password"
                  dir={dir}
                />
                <button
                  type="button"
                  className="ims-login-eye-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? text.hidePassword : text.showPassword}
                >
                  <SvgIcon name={showPassword ? 'eyeOff' : 'eye'} size={21} />
                </button>
              </div>
            </label>

            <div className="ims-login-options-row">
              <label className="ims-login-check">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(event) => handleChange('remember', event.target.checked)}
                />
                <span>{text.remember}</span>
              </label>

              <Link to={ROUTES?.PUBLIC?.FORGOT_PASSWORD || '#'}>{text.forgotPassword}</Link>
            </div>

            <button type="submit" className="ims-login-submit" disabled={loading}>
              <span>{loading ? text.loading : text.loginButton}</span>
              <SvgIcon name="login" size={24} />
            </button>

            <div className="ims-login-invitation-note">
              <SvgIcon name="info" size={19} />
              <span>{text.invitationsOnly}</span>
            </div>
          </form>
        </section>

        <footer className="ims-login-footer">
          <div className="ims-login-footer-item">
            <SvgIcon name="headset" size={25} />
            <div>
              <strong>{text.support}</strong>
              <span>{text.supportEmail}</span>
            </div>
          </div>

          <div className="ims-login-footer-item">
            <SvgIcon name="clock" size={25} />
            <div>
              <strong>{text.workingHours}</strong>
              <span>{text.workingHoursValue}</span>
            </div>
          </div>

          <p>{text.copyright}</p>

          <div className="ims-login-footer-item">
            <SvgIcon name="shield" size={25} />
            <div>
              <strong>{text.secureData}</strong>
              <span>{text.secureDataSub}</span>
            </div>
          </div>

          <div className="ims-login-footer-item">
            <SvgIcon name="lock" size={25} />
            <div>
              <strong>{text.compliant}</strong>
              <span>{text.compliantSub}</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default LoginPage;