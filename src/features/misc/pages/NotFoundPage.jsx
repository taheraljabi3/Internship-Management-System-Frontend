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
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.2 5.1-4.8 1.9 2.2-5.1 4.8-1.9Z" />
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
      {icons[name] || icons.compass}
    </svg>
  );
}

function NotFoundPage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const isAuthenticated = Boolean(user);
  const dashboardRoute = getDashboardRoute(user?.role);

  return (
    <div className="ims-not-found-page">
      <style>{`
        .ims-not-found-page {
          position: relative;
          min-height: calc(100vh - 170px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          color: #10243f;
        }

        .ims-not-found-page::before {
          content: "";
          position: absolute;
          inset: -2rem -2rem auto -2rem;
          height: 320px;
          pointer-events: none;
          background:
            radial-gradient(circle at 22% 16%, rgba(20, 200, 195, 0.18), transparent 34%),
            radial-gradient(circle at 82% 14%, rgba(91, 101, 241, 0.12), transparent 32%),
            repeating-radial-gradient(ellipse at 45% 24%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
          border-radius: 0 0 48px 48px;
          z-index: 0;
        }

        .ims-not-found-card {
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

        .ims-not-found-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 38px;
          margin-bottom: 1rem;
          padding: 0.35rem 0.8rem;
          border: 1px solid rgba(20, 200, 195, 0.22);
          border-radius: 999px;
          color: #0796a6;
          background: #e2fafa;
          font-size: 0.86rem;
          font-weight: 900;
        }

        .ims-not-found-card h1 {
          margin: 0;
          color: #10243f;
          font-size: clamp(2.4rem, 5vw, 4rem);
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .ims-not-found-card h1 span {
          display: block;
          color: #0796a6;
        }

        .ims-not-found-card p {
          max-width: 610px;
          margin: 1rem 0 0;
          color: #637894;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.9;
        }

        .ims-not-found-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }

        .ims-not-found-primary,
        .ims-not-found-secondary {
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

        .ims-not-found-primary {
          color: #ffffff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 30px rgba(7, 150, 166, 0.22);
        }

        .ims-not-found-secondary {
          color: #243b5a;
          background: #ffffff;
          border: 1px solid #dfeaf3;
        }

        .ims-not-found-primary:hover,
        .ims-not-found-secondary:hover {
          transform: translateY(-1px);
        }

        .ims-not-found-visual {
          position: relative;
          min-height: 300px;
          border-radius: 30px;
          border: 1px solid #edf3f8;
          background:
            radial-gradient(circle at 50% 18%, rgba(46, 230, 211, 0.18), transparent 34%),
            linear-gradient(145deg, #f6fbff, #ffffff);
          overflow: hidden;
        }

        .ims-not-found-visual::before {
          content: "404";
          position: absolute;
          inset-inline: 0;
          top: 52px;
          text-align: center;
          color: rgba(7, 150, 166, 0.10);
          font-size: 5.2rem;
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .ims-not-found-compass {
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
          color: #0796a6;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(214, 228, 238, 0.96);
          box-shadow: 0 20px 50px rgba(16, 36, 63, 0.12);
        }

        [dir="rtl"] .ims-not-found-compass {
          transform: translate(50%, -50%);
        }

        .ims-not-found-orbit {
          position: absolute;
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: #ffffff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 28px rgba(7, 150, 166, 0.18);
        }

        .ims-not-found-orbit.one {
          inset-inline-start: 34px;
          bottom: 54px;
        }

        .ims-not-found-orbit.two {
          inset-inline-end: 38px;
          top: 54px;
          background: linear-gradient(135deg, #5b65f1, #14c8c3);
        }

        @media (max-width: 767.98px) {
          .ims-not-found-card {
            grid-template-columns: 1fr;
          }

          .ims-not-found-visual {
            min-height: 230px;
          }

          .ims-not-found-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .ims-not-found-primary,
          .ims-not-found-secondary {
            width: 100%;
          }
        }
      `}</style>

      <section className="ims-not-found-card">
        <div>
          <div className="ims-not-found-label">
            <SvgIcon name="compass" size={20} />
            {isArabic ? 'المسار غير صحيح' : 'Invalid route'}
          </div>

          <h1>
            {isArabic ? '404 - الصفحة غير موجودة' : '404 - Page not found'}
            <span>{isArabic ? 'لنرجعك للمكان الصحيح' : 'Let’s get you back'}</span>
          </h1>

          <p>
            {isArabic
              ? 'يبدو أن الرابط الذي فتحته غير موجود أو تم تغييره. يمكنك الرجوع للرئيسية، أو الانتقال مباشرة إلى لوحة التحكم المناسبة لحسابك.'
              : 'The page you are looking for does not exist or may have been moved. You can return home or go directly to your dashboard.'}
          </p>

          <div className="ims-not-found-actions">
            {isAuthenticated ? (
              <Link className="ims-not-found-primary" to={dashboardRoute}>
                {isArabic ? 'الانتقال إلى لوحتي' : 'Go to my dashboard'}
                <SvgIcon name="dashboard" size={19} />
              </Link>
            ) : (
              <Link className="ims-not-found-primary" to={ROUTES.PUBLIC.ROOT}>
                {t('Return Home')}
                <SvgIcon name="home" size={19} />
              </Link>
            )}

            <Link className="ims-not-found-secondary" to={ROUTES.PUBLIC.LOGIN}>
              {isArabic ? 'تسجيل الدخول' : 'Login'}
              <SvgIcon name="arrow" size={19} />
            </Link>
          </div>
        </div>

        <div className="ims-not-found-visual" aria-hidden="true">
          <div className="ims-not-found-compass">
            <SvgIcon name="compass" size={68} />
          </div>

          <div className="ims-not-found-orbit one">
            <SvgIcon name="home" size={22} />
          </div>

          <div className="ims-not-found-orbit two">
            <SvgIcon name="dashboard" size={22} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default NotFoundPage;