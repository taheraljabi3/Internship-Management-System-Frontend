import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ROUTES from '../../../app/router/routePaths';
import { loginRequest, persistAuthSession } from '../../../app/api/client';
import './LoginPage_FullScreenLanding.css';

const CAMPUS_IMAGE_CANDIDATES = [
  '/images/university-campus.jpg',
  '/images/university-campus.jpeg',
  '/images/university-campus.png',
  '/university-campus.jpg',
  '/university-campus.jpeg',
  '/university-campus.png',
];

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

function MonoIcon({ name, className = '', size = 22, strokeWidth = 1.9 }) {
  const commonProps = {
    className: `ims-landing-svg ${className}`.trim(),
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };

  switch (name) {
    case 'brand':
      return (
        <svg {...commonProps}>
          <path d="M12 3 4.5 6v5.7c0 4.6 3.1 7.4 7.5 9.3 4.4-1.9 7.5-4.7 7.5-9.3V6L12 3Z" />
          <path d="M8.6 9.2c1.5 0 2.7.5 3.4 1.6.7-1.1 1.9-1.6 3.4-1.6v6.5c-1.5 0-2.7.4-3.4 1.3-.7-.9-1.9-1.3-3.4-1.3V9.2Z" />
          <path d="M12 10.8V17" />
        </svg>
      );
    case 'shieldCheck':
      return (
        <svg {...commonProps}>
          <path d="M12 3 5 6v5.5c0 4.1 2.8 7 7 8.5 4.2-1.5 7-4.4 7-8.5V6l-7-3Z" />
          <path d="m9.5 12.2 1.6 1.6 3.6-4" />
        </svg>
      );
    case 'login':
      return (
        <svg {...commonProps}>
          <path d="M10 17 15 12 10 7" />
          <path d="M15 12H3" />
          <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...commonProps}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
      );
    case 'eyeOff':
      return (
        <svg {...commonProps}>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2c.5-.1.9-.2 1.4-.2 6 0 9.5 7 9.5 7a16 16 0 0 1-2.6 3.3" />
          <path d="M6.2 6.8C3.8 8.6 2.5 12 2.5 12s3.5 7 9.5 7c1.5 0 2.8-.4 4-1" />
          <path d="M10.6 10.6a2.6 2.6 0 0 0 2.8 2.8" />
        </svg>
      );
    case 'user':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case 'report':
      return (
        <svg {...commonProps}>
          <path d="M5 4h14v16H5z" />
          <path d="M9 14v3" />
          <path d="M12 11v6" />
          <path d="M15 8v9" />
          <path d="M8 7h5" />
        </svg>
      );
    case 'monitor':
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
          <path d="m8 12 2.2-2.2 2.3 2.3L16 8.5" />
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );
    case 'medal':
      return (
        <svg {...commonProps}>
          <path d="M8 3h8l-2 5h-4L8 3Z" />
          <circle cx="12" cy="14" r="5" />
          <path d="m10.5 14 1 1 2.2-2.4" />
        </svg>
      );
    case 'university':
      return (
        <svg {...commonProps}>
          <path d="M3 10h18" />
          <path d="M5 10v8" />
          <path d="M9 10v8" />
          <path d="M15 10v8" />
          <path d="M19 10v8" />
          <path d="M4 18h16" />
          <path d="M2 21h20" />
          <path d="m12 3 8 4H4l8-4Z" />
        </svg>
      );
    case 'advisor':
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="8" r="3" />
          <path d="M3.5 20a5 5 0 0 1 9 0" />
          <path d="M14 7h7" />
          <path d="M14 11h7" />
          <path d="M16 15h5" />
          <path d="M16 19h5" />
        </svg>
      );
    case 'student':
      return (
        <svg {...commonProps}>
          <path d="m3 8 9-4 9 4-9 4-9-4Z" />
          <path d="M7 10.2v4.2c0 1.6 2.2 3 5 3s5-1.4 5-3v-4.2" />
          <path d="M21 8v6" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg {...commonProps}>
          <path d="M19 12H5" />
          <path d="m12 5-7 7 7 7" />
        </svg>
      );
    case 'secure':
      return (
        <svg {...commonProps}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case 'support':
      return (
        <svg {...commonProps}>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <path d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
          <path d="M20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
          <path d="M16 19c-.8 1.2-2.1 2-4 2" />
        </svg>
      );
    default:
      return null;
  }
}

const roleCards = [
  {
    key: 'Administrator',
    iconName: 'university',
    dotClass: 'ims-landing-dot-purple',
    title: 'الإدارة',
    description: 'إدارة المستخدمين والإعدادات والتقارير',
  },
  {
    key: 'AcademicAdvisor',
    iconName: 'advisor',
    dotClass: 'ims-landing-dot-teal',
    title: 'المشرف الأكاديمي',
    description: 'متابعة الطلاب والتقييمات والتقارير',
  },
  {
    key: 'Student',
    iconName: 'student',
    dotClass: 'ims-landing-dot-blue',
    title: 'الطالب',
    description: 'المهام اليومية، التقارير، والملف الشخصي',
  },
];

const featureItems = [
  { iconName: 'report', label: 'التقارير' },
  { iconName: 'monitor', label: 'المتابعة' },
  { iconName: 'star', label: 'التقييم' },
  { iconName: 'medal', label: 'الاعتمادات' },
];

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [selectedRole, setSelectedRole] = useState('Student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [campusImageIndex, setCampusImageIndex] = useState(0);
  const [campusImageFailed, setCampusImageFailed] = useState(false);

  const selectedRoleDetails = useMemo(
    () => roleCards.find((item) => item.key === selectedRole) || roleCards[2],
    [selectedRole]
  );

  const campusImageUrl = CAMPUS_IMAGE_CANDIDATES[campusImageIndex];

  const handleCampusImageError = () => {
    if (campusImageIndex < CAMPUS_IMAGE_CANDIDATES.length - 1) {
      setCampusImageIndex((current) => current + 1);
      return;
    }

    setCampusImageFailed(true);
  };

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
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور قبل المتابعة.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await loginRequest({ login: email, password });

      const sessionUser = response?.user || {};
      const sessionRole = normalizeRole(sessionUser.role || selectedRole);

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
        message: 'تم تسجيل الدخول بنجاح. جاري نقلك إلى الواجهة المناسبة...',
      });

      window.setTimeout(() => {
        window.location.replace(getDashboardRoute(sessionUser.role || sessionRole));
      }, 350);
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'تعذر تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.',
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToLogin = () => {
    document.getElementById('ims-login-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <main className="ims-landing-page ims-landing-fullscreen" dir="rtl">
      <div className="ims-landing-media" aria-hidden="true">
        {!campusImageFailed ? (
          <img
            src={campusImageUrl}
            alt=""
            onError={handleCampusImageError}
          />
        ) : null}
      </div>
      <div className="ims-landing-bg" />
      <div className="ims-landing-noise" />

      <header className="ims-landing-navbar">
        <div className="ims-landing-brand">
          <div className="ims-landing-brand-mark">
            <MonoIcon name="brand" size={31} />
          </div>
          <div>
            <div className="ims-landing-brand-title">منصة إدارة التدريب الميداني</div>
            <div className="ims-landing-brand-subtitle">Internship Management System</div>
          </div>
        </div>

        <nav className="ims-landing-nav-links" aria-label="Landing navigation">
          <a href="#home" className="active">الرئيسية</a>
          <a href="#about">عن المنصة</a>
          <a href="#features">المزايا</a>
          <a href="#faq">الأسئلة الشائعة</a>
          <a href="#contact">تواصل معنا</a>
        </nav>

        <div className="ims-landing-system-pill">
          <span className="ims-landing-live-dot" />
          النظام يعمل بكفاءة
          <span className="ims-landing-pill-icon">
            <MonoIcon name="shieldCheck" size={18} />
          </span>
        </div>
      </header>

      <section id="home" className="ims-landing-hero">
        <div className="ims-landing-hero-content">
          <div className="ims-landing-hero-kicker">حل جامعي موحد لإدارة الرحلة التدريبية</div>

          <h1>
            بوابتك الموحدة لإدارة
            <span> التدريب الميداني بكفاءة واحترافية</span>
          </h1>

          <p>
            منصة متكاملة تربط الطالب والمشرف الأكاديمي والإدارة في تجربة رقمية سلسة،
            من التسجيل وحتى التقييم والمتابعة.
          </p>

          <div className="ims-landing-hero-actions">
            <button type="button" className="ims-landing-btn ims-landing-btn-primary" onClick={scrollToLogin}>
              دخول إلى النظام
              <MonoIcon name="login" size={20} />
            </button>
            <a className="ims-landing-btn ims-landing-btn-outline" href="#features">
              استكشاف النظام
              <MonoIcon name="eye" size={20} />
            </a>
          </div>

          <div id="features" className="ims-landing-feature-strip">
            {featureItems.map((item) => (
              <div className="ims-landing-feature-item" key={item.label}>
                <span>
                  <MonoIcon name={item.iconName} size={29} />
                </span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </div>

        <aside className="ims-landing-right-panel">
          <form id="ims-login-card" className="ims-landing-login-card" onSubmit={handleSubmit}>
            <div className="ims-landing-login-header">
              <div>
                <div className="ims-landing-login-eyebrow">بوابة الدخول الآمنة</div>
                <h2>تسجيل الدخول</h2>
              </div>
              <div className="ims-landing-login-icon">
                <MonoIcon name="secure" size={29} />
              </div>
            </div>

            {feedback.message ? (
              <div className={`ims-landing-feedback ims-landing-feedback-${feedback.type}`}>
                {feedback.message}
              </div>
            ) : null}

            <label className="ims-landing-field">
              <span>البريد الإلكتروني</span>
              <div className="ims-landing-input-wrap">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder="أدخل بريدك الإلكتروني"
                  autoComplete="username"
                />
                <span className="ims-landing-input-icon">
                  <MonoIcon name="user" size={20} />
                </span>
              </div>
            </label>

            <label className="ims-landing-field">
              <span>كلمة المرور</span>
              <div className="ims-landing-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="ims-landing-input-icon-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <MonoIcon name={showPassword ? 'eyeOff' : 'eye'} size={20} />
                </button>
              </div>
            </label>

            <div className="ims-landing-login-options">
              <label className="ims-landing-checkbox">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(event) => handleChange('remember', event.target.checked)}
                />
                <span>تذكرني</span>
              </label>
              <Link to={ROUTES?.PUBLIC?.FORGOT_PASSWORD || '#'}>نسيت كلمة المرور؟</Link>
            </div>

            <button type="submit" className="ims-landing-submit" disabled={loading}>
              {loading ? 'جارٍ الدخول...' : 'دخول إلى النظام'}
              <MonoIcon name="login" size={20} />
            </button>

            <div className="ims-landing-selected-role">
              <span>
                <MonoIcon name={selectedRoleDetails.iconName} size={24} />
              </span>
              <div>
                <strong>{selectedRoleDetails.title}</strong>
                <small>{selectedRoleDetails.description}</small>
              </div>
            </div>
          </form>

          <div className="ims-landing-role-section">
            <div className="ims-landing-role-title">اختر الواجهة المناسبة حسب دورك</div>
            <div className="ims-landing-role-grid">
              {roleCards.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  className={`ims-landing-role-card ${selectedRole === role.key ? 'active' : ''}`}
                  onClick={() => setSelectedRole(role.key)}
                >
                  <span className={`ims-landing-role-dot ${role.dotClass}`} />
                  <span className="ims-landing-role-icon">
                    <MonoIcon name={role.iconName} size={31} />
                  </span>
                  <strong>{role.title}</strong>
                  <small>{role.description}</small>
                  <span className="ims-landing-role-arrow">
                    <MonoIcon name="arrowLeft" size={22} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <footer className="ims-landing-footer">
        <span>© 2026 منصة إدارة التدريب الميداني. جميع الحقوق محفوظة.</span>
        <div>
          <span><MonoIcon name="secure" size={18} /> آمن وموثوق</span>
          <span><MonoIcon name="shieldCheck" size={18} /> خصوصيتك تهمنا</span>
          <span><MonoIcon name="support" size={18} /> دعم فني متواصل</span>
        </div>
        <span>نسخة 1.0.0 <i /></span>
      </footer>
    </main>
  );
}

export default LoginPage;