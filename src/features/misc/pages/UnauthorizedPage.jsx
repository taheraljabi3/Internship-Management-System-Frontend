import { Link } from 'react-router-dom';

import ROUTES from '../../../app/router/routePaths';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';

function normalizeRole(role = '') {
  const value = String(role).trim().toLowerCase().replace(/[\s_-]/g, '');

  if (value === 'administrator' || value === 'admin') return 'Administrator';
  if (value === 'academicadvisor' || value === 'advisor') return 'AcademicAdvisor';
  return 'Student';
}

function getDashboardRoute(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'Administrator') {
    return ROUTES?.DASHBOARD?.ADMINISTRATOR || '/dashboard/administrator';
  }

  if (normalizedRole === 'AcademicAdvisor') {
    return ROUTES?.DASHBOARD?.ACADEMIC_ADVISOR || '/dashboard/academic-advisor';
  }

  return ROUTES?.DASHBOARD?.STUDENT || '/dashboard/student';
}

function SvgIcon({ name, size = 22 }) {
  const icons = {
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2.2" />
        <path d="M8.2 10V7.4a3.8 3.8 0 0 1 7.6 0V10" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="M9.5 12h5" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    dashboard: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </>
    ),
    login: (
      <>
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
        <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.lock}
    </svg>
  );
}

function UnauthorizedPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const isAuthenticated = Boolean(user);
  const dashboardRoute = getDashboardRoute(user?.role);

  return (
    <div className="ims-unauthorized-page">
      <style>{`
        .ims-unauthorized-page {
          position: relative;
          min-height: calc(100vh - 170px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          color: #10243f;
        }

        .ims-unauthorized-page::before {
          content: "";
          position: absolute;
          inset: -2rem -2rem auto -2rem;
          height: 320px;
          pointer-events: none;
          background:
            radial-gradient(circle at 22% 16%, rgba(244, 166, 42, 0.16), transparent 34%),
            radial-gradient(circle at 82% 14%, rgba(20, 200, 195, 0.14), transparent 32%),
            repeating-radial-gradient(ellipse at 45% 24%, rgba(20, 200, 195, 0.07) 0 1px, transparent 1px 28px);
          border-radius: 0 0 48px 48px;
          z-index: 0;
        }

        .ims-unauthorized-card {
          position: relative;
          z-index: 1;
          width: min(920px, 100%);
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 1.4rem;
          align-items: center;
          padding: clamp(1.25rem, 3vw, 2rem);
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 18px 50px rgba(16, 36, 63, 0.08);
          backdrop-filter: blur(10px);
        }

        .ims-unauthorized-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 38px;
          margin-bottom: 1rem;
          padding: 0.35rem 0.8rem;
          border: 1px solid rgba(244, 166, 42, 0.24);
          border-radius: 999px;
          color: #a4660b;
          background: #fff4dc;
          font-size: 0.86rem;
          font-weight: 900;
        }

        .ims-unauthorized-card h1 {
          margin: 0;
          color: #10243f;
          font-size: clamp(2.3rem, 5vw, 3.8rem);
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .ims-unauthorized-card h1 span {
          display: block;
          color: #0796a6;
        }

        .ims-unauthorized-card p {
          max-width: 610px;
          margin: 1rem 0 0;
          color: #637894;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.9;
        }

        .ims-unauthorized-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }

        .ims-unauthorized-primary,
        .ims-unauthorized-secondary {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          padding: 0 1.15rem;
          border-radius: 17px;
          font-size: 0.92rem;
          font-weight: 900;
          text-decoration: none;
        }

        .ims-unauthorized-primary {
          color: #ffffff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 30px rgba(7, 150, 166, 0.22);
        }

        .ims-unauthorized-secondary {
          color: #243b5a;
          background: #ffffff;
          border: 1px solid #dfeaf3;
        }

        .ims-unauthorized-primary:hover,
        .ims-unauthorized-secondary:hover {
          transform: translateY(-1px);
        }

        .ims-unauthorized-visual {
          position: relative;
          min-height: 300px;
          border-radius: 30px;
          border: 1px solid #edf3f8;
          background:
            radial-gradient(circle at 50% 18%, rgba(244, 166, 42, 0.16), transparent 34%),
            linear-gradient(145deg, #f6fbff, #ffffff);
          overflow: hidden;
        }

        .ims-unauthorized-visual::before {
          content: "403";
          position: absolute;
          inset-inline: 0;
          top: 52px;
          text-align: center;
          color: rgba(244, 166, 42, 0.16);
          font-size: 5.2rem;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .ims-unauthorized-lock {
          position: absolute;
          inset-inline-start: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 132px;
          height: 132px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 34px;
          color: #a4660b;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(214, 228, 238, 0.96);
          box-shadow: 0 20px 50px rgba(16, 36, 63, 0.12);
        }

        [dir="rtl"] .ims-unauthorized-lock {
          transform: translate(50%, -50%);
        }

        .ims-unauthorized-orbit {
          position: absolute;
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: #ffffff;
          background: linear-gradient(135deg, #ed9f22, #f4c063);
          box-shadow: 0 14px 28px rgba(244, 166, 42, 0.18);
        }

        .ims-unauthorized-orbit.one {
          inset-inline-start: 34px;
          bottom: 54px;
        }

        .ims-unauthorized-orbit.two {
          inset-inline-end: 38px;
          top: 54px;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
        }

        @media (max-width: 767.98px) {
          .ims-unauthorized-card {
            grid-template-columns: 1fr;
          }

          .ims-unauthorized-visual {
            min-height: 230px;
          }

          .ims-unauthorized-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .ims-unauthorized-primary,
          .ims-unauthorized-secondary {
            width: 100%;
          }
        }
      `}</style>

      <section className="ims-unauthorized-card">
        <div>
          <div className="ims-unauthorized-label">
            <SvgIcon name="shield" size={20} />
            {isArabic ? 'صلاحية غير كافية' : 'Insufficient permission'}
          </div>

          <h1>
            {isArabic ? 'غير مصرح بالوصول' : t('Unauthorized Access')}
            <span>{isArabic ? 'هذه الصفحة ليست ضمن صلاحياتك' : 'This page is outside your access'}</span>
          </h1>

          <p>
            {isArabic
              ? 'يبدو أن حسابك لا يملك الصلاحية المناسبة لفتح هذه الصفحة. يمكنك الرجوع إلى لوحة التحكم الخاصة بدورك، أو تسجيل الدخول بحساب آخر لديه الصلاحية المطلوبة.'
              : 'Your account does not have the required permission to access this page. You can return to your role dashboard or sign in with another authorized account.'}
          </p>

          <div className="ims-unauthorized-actions">
            {isAuthenticated ? (
              <Link className="ims-unauthorized-primary" to={dashboardRoute}>
                {isArabic ? 'الانتقال إلى لوحتي' : 'Go to my dashboard'}
                <SvgIcon name="dashboard" size={19} />
              </Link>
            ) : (
              <Link className="ims-unauthorized-primary" to={ROUTES.PUBLIC.LOGIN}>
                {isArabic ? 'تسجيل الدخول' : 'Login'}
                <SvgIcon name="login" size={19} />
              </Link>
            )}

            <Link className="ims-unauthorized-secondary" to={ROUTES.PUBLIC.ROOT}>
              {isArabic ? 'العودة للرئيسية' : 'Return Home'}
              <SvgIcon name="home" size={19} />
            </Link>
          </div>
        </div>

        <div className="ims-unauthorized-visual" aria-hidden="true">
          <div className="ims-unauthorized-lock">
            <SvgIcon name="lock" size={68} />
          </div>

          <div className="ims-unauthorized-orbit one">
            <SvgIcon name="shield" size={22} />
          </div>

          <div className="ims-unauthorized-orbit two">
            <SvgIcon name="dashboard" size={22} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default UnauthorizedPage;