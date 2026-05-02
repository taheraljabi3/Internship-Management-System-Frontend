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
    logo: (
      <>
        <path d="M12 3c3.8 0 6.9 1.6 8.5 4.2v7.2c-1.6-2-4.7-3.2-8.5-3.2S5.1 12.4 3.5 14.4V7.2C5.1 4.6 8.2 3 12 3Z" />
        <path d="M12 11.2v8.3" />
        <path d="M5.2 8.2c2.8-.5 5 .4 6.8 3 1.8-2.6 4-3.5 6.8-3" />
        <path d="M4.2 16.3c2.8-.8 5.5-.1 7.8 2.7 2.3-2.8 5-3.5 7.8-2.7" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.5 7 10 4.2-1.5 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
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
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    login: (
      <>
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
        <path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4" />
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
      {icons[name] || icons.logo}
    </svg>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="ims-home-feature-card">
      <div className="ims-home-feature-icon">
        <SvgIcon name={icon} size={26} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function HomePage() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const isAuthenticated = Boolean(user);
  const dashboardRoute = getDashboardRoute(user?.role);

  return (
    <div className="ims-home-page">
      <style>{`
        .ims-home-page {
          position: relative;
          min-height: calc(100vh - 120px);
          padding: 1rem 0 2rem;
          color: #10243f;
        }

        .ims-home-page::before {
          content: "";
          position: absolute;
          inset: -2rem -2rem auto -2rem;
          height: 360px;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 18%, rgba(20, 200, 195, 0.18), transparent 34%),
            radial-gradient(circle at 82% 12%, rgba(91, 101, 241, 0.12), transparent 32%),
            repeating-radial-gradient(ellipse at 45% 24%, rgba(20, 200, 195, 0.08) 0 1px, transparent 1px 28px);
          border-radius: 0 0 48px 48px;
          z-index: 0;
        }

        .ims-home-page > * {
          position: relative;
          z-index: 1;
        }

        .ims-home-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
          gap: 1.5rem;
          align-items: center;
          min-height: 520px;
          padding: 1.5rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 18px 50px rgba(16, 36, 63, 0.08);
          overflow: hidden;
        }

        .ims-home-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          min-height: 46px;
          margin-bottom: 1.25rem;
          padding: 0.35rem 0.75rem;
          border: 1px solid rgba(20, 200, 195, 0.22);
          border-radius: 999px;
          color: #0796a6;
          background: #e2fafa;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .ims-home-title {
          max-width: 720px;
          margin: 0;
          color: #10243f;
          font-size: clamp(2.4rem, 5vw, 4.4rem);
          line-height: 1.14;
          font-weight: 950;
          letter-spacing: -0.07em;
        }

        .ims-home-title span {
          display: block;
          color: #0796a6;
        }

        .ims-home-description {
          max-width: 670px;
          margin: 1.1rem 0 0;
          color: #637894;
          font-size: 1.06rem;
          font-weight: 700;
          line-height: 1.95;
        }

        .ims-home-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 1.6rem;
        }

        .ims-home-primary-btn,
        .ims-home-secondary-btn {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          padding: 0 1.2rem;
          border-radius: 17px;
          font-size: 0.95rem;
          font-weight: 900;
          text-decoration: none;
        }

        .ims-home-primary-btn {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 30px rgba(7, 150, 166, 0.22);
        }

        .ims-home-secondary-btn {
          color: #243b5a;
          background: #fff;
          border: 1px solid #dfeaf3;
        }

        .ims-home-primary-btn:hover,
        .ims-home-secondary-btn:hover {
          transform: translateY(-1px);
        }

        .ims-home-note {
          margin-top: 1rem;
          color: #7a8aa5;
          font-size: 0.88rem;
          font-weight: 750;
        }

        .ims-home-visual {
          position: relative;
          min-height: 420px;
          border-radius: 30px;
          background:
            radial-gradient(circle at 50% 20%, rgba(46, 230, 211, 0.18), transparent 36%),
            linear-gradient(145deg, #f6fbff, #ffffff);
          border: 1px solid #edf3f8;
          overflow: hidden;
        }

        .ims-home-visual::before {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          inset-inline-end: -80px;
          top: -70px;
          background: rgba(20, 200, 195, 0.12);
        }

        .ims-home-dashboard-card {
          position: absolute;
          inset-inline: 9%;
          top: 18%;
          min-height: 255px;
          padding: 1rem;
          border: 1px solid rgba(214, 228, 238, 0.96);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 24px 64px rgba(16, 36, 63, 0.12);
          backdrop-filter: blur(12px);
        }

        .ims-home-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-home-card-head strong {
          color: #10243f;
          font-weight: 950;
        }

        .ims-home-card-head span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 0.65rem;
          border-radius: 999px;
          color: #0d8a64;
          background: #e7fbf3;
          font-size: 0.75rem;
          font-weight: 900;
        }

        .ims-home-bars {
          display: grid;
          gap: 0.8rem;
        }

        .ims-home-bar-row {
          display: grid;
          grid-template-columns: 92px 1fr 36px;
          align-items: center;
          gap: 0.75rem;
          color: #637894;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .ims-home-bar-track {
          height: 11px;
          overflow: hidden;
          border-radius: 999px;
          background: #e8f1f4;
        }

        .ims-home-bar-track span {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #0796a6, #14c8c3);
        }

        .ims-home-floating-card {
          position: absolute;
          width: 180px;
          min-height: 88px;
          display: grid;
          gap: 0.25rem;
          padding: 0.9rem;
          border: 1px solid rgba(214, 228, 238, 0.95);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 18px 45px rgba(16, 36, 63, 0.1);
        }

        .ims-home-floating-card.one {
          inset-inline-start: 4%;
          bottom: 12%;
        }

        .ims-home-floating-card.two {
          inset-inline-end: 6%;
          bottom: 8%;
        }

        .ims-home-floating-card strong {
          color: #10243f;
          font-size: 1.35rem;
          font-weight: 950;
          line-height: 1;
        }

        .ims-home-floating-card span {
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 800;
        }

        .ims-home-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .ims-home-feature-card {
          min-height: 170px;
          padding: 1.2rem;
          border: 1px solid rgba(230, 238, 246, 0.98);
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 14px 34px rgba(16, 36, 63, 0.06);
        }

        .ims-home-feature-icon {
          width: 54px;
          height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.9rem;
          border-radius: 19px;
          color: #0796a6;
          background: #e2fafa;
        }

        .ims-home-feature-card strong {
          display: block;
          margin-bottom: 0.45rem;
          color: #10243f;
          font-size: 1rem;
          font-weight: 950;
        }

        .ims-home-feature-card p {
          margin: 0;
          color: #637894;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.75;
        }

        @media (max-width: 991.98px) {
          .ims-home-hero {
            grid-template-columns: 1fr;
          }

          .ims-home-visual {
            min-height: 360px;
          }

          .ims-home-features {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 575.98px) {
          .ims-home-hero {
            padding: 1rem;
            border-radius: 26px;
          }

          .ims-home-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .ims-home-primary-btn,
          .ims-home-secondary-btn {
            width: 100%;
          }

          .ims-home-visual {
            display: none;
          }
        }
      `}</style>

      <section className="ims-home-hero">
        <div>
          <div className="ims-home-brand">
            <SvgIcon name="logo" size={24} />
            {t('Internship Management System')}
          </div>

          <h1 className="ims-home-title">
            {isArabic ? 'منصة موحدة لإدارة التدريب' : 'A unified platform for internship management'}
            <span>{isArabic ? 'من الدعوة إلى التقييم' : 'from invitation to evaluation'}</span>
          </h1>

          <p className="ims-home-description">
            {isArabic
              ? 'نظام يساعد الطلاب، المشرفين الأكاديميين، والإدارة على إدارة رحلة التدريب كاملة: الدعوات، الأهلية، ربط المشرفين، اعتماد الشركات، خطط التدريب، التقارير، والتقييمات.'
              : 'A system that helps students, academic advisors, and administrators manage the full internship journey: invitations, eligibility, advisor mapping, company approvals, training plans, reports, and evaluations.'}
          </p>

          <div className="ims-home-actions">
            {isAuthenticated ? (
              <Link className="ims-home-primary-btn" to={dashboardRoute}>
                {isArabic ? 'الانتقال إلى لوحتي' : 'Go to my dashboard'}
                <SvgIcon name="arrow" size={20} />
              </Link>
            ) : (
              <Link className="ims-home-primary-btn" to={ROUTES.PUBLIC.LOGIN}>
                {isArabic ? 'تسجيل الدخول' : 'Login'}
                <SvgIcon name="login" size={20} />
              </Link>
            )}

            <Link className="ims-home-secondary-btn" to={ROUTES.PUBLIC.LOGIN}>
              {isArabic ? 'الدخول عبر الدعوة' : 'Access by invitation'}
            </Link>
          </div>

          <div className="ims-home-note">
            {isArabic
              ? 'يتم إنشاء الحسابات من خلال الدعوات فقط، ولا يوجد تسجيل عام للمستخدمين.'
              : 'Accounts are created through invitations only. Public self-registration is not available.'}
          </div>
        </div>

        <div className="ims-home-visual" aria-hidden="true">
          <div className="ims-home-dashboard-card">
            <div className="ims-home-card-head">
              <strong>{isArabic ? 'متابعة التدريب' : 'Internship Tracking'}</strong>
              <span>{isArabic ? 'مباشر' : 'Live'}</span>
            </div>

            <div className="ims-home-bars">
              <div className="ims-home-bar-row">
                <span>{isArabic ? 'الدعوات' : 'Invites'}</span>
                <div className="ims-home-bar-track"><span style={{ width: '82%' }} /></div>
                <strong>82%</strong>
              </div>

              <div className="ims-home-bar-row">
                <span>{isArabic ? 'الأهلية' : 'Eligibility'}</span>
                <div className="ims-home-bar-track"><span style={{ width: '68%' }} /></div>
                <strong>68%</strong>
              </div>

              <div className="ims-home-bar-row">
                <span>{isArabic ? 'الخطط' : 'Plans'}</span>
                <div className="ims-home-bar-track"><span style={{ width: '74%' }} /></div>
                <strong>74%</strong>
              </div>

              <div className="ims-home-bar-row">
                <span>{isArabic ? 'التقارير' : 'Reports'}</span>
                <div className="ims-home-bar-track"><span style={{ width: '91%' }} /></div>
                <strong>91%</strong>
              </div>
            </div>
          </div>

          <div className="ims-home-floating-card one">
            <strong>360°</strong>
            <span>{isArabic ? 'رؤية كاملة لمسار الطالب' : 'Full student journey view'}</span>
          </div>

          <div className="ims-home-floating-card two">
            <strong>Live</strong>
            <span>{isArabic ? 'مؤشرات وتقارير لحظية' : 'Live KPIs and reports'}</span>
          </div>
        </div>
      </section>

      <section className="ims-home-features">
        <FeatureCard
          icon="users"
          title={isArabic ? 'إدارة المستخدمين والأدوار' : 'Users and roles management'}
          description={
            isArabic
              ? 'إدارة الطلاب، المشرفين الأكاديميين، والمديرين مع صلاحيات واضحة لكل دور.'
              : 'Manage students, academic advisors, and administrators with role-based access.'
          }
        />

        <FeatureCard
          icon="calendar"
          title={isArabic ? 'مسار تدريب واضح' : 'Clear internship workflow'}
          description={
            isArabic
              ? 'من الدعوة والأهلية إلى اعتماد الشركة، خطة التدريب، التقارير الأسبوعية، والتقييم.'
              : 'From invitations and eligibility to company approval, plans, weekly reports, and evaluation.'
          }
        />

        <FeatureCard
          icon="chart"
          title={isArabic ? 'لوحات ومؤشرات مباشرة' : 'Dashboards and live indicators'}
          description={
            isArabic
              ? 'متابعة الحالات، الطلبات المعلقة، التقارير، وأداء التدريب من واجهات منظمة.'
              : 'Track statuses, pending requests, reports, and internship performance from organized dashboards.'
          }
        />
      </section>
    </div>
  );
}

export default HomePage;