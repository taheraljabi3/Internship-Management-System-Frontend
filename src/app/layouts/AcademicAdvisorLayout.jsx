import { Outlet } from 'react-router-dom';

import AppNavbar from '../../shared/components/AppNavbar';
import Sidebar from '../../shared/components/Sidebar';
import AppFooter from '../../shared/components/AppFooter';
import OnboardingLauncher from '../../features/onboarding/OnboardingLauncher';

import { academicAdvisorSidebarItems } from '../router/routeConfig';
import { useLanguage } from '../../shared/hooks/useLanguage';

function AcademicAdvisorLayout() {
  const { isArabic } = useLanguage();

  return (
    <div className="ims-app-shell">
      <style>{`
        .ims-layout-onboarding-launcher {
          position: fixed;
          top: 1.05rem;
          inset-inline-end: 5.25rem;
          z-index: 3600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
        }

        .ims-layout-onboarding-launcher .ims-topbar-icon-btn {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(223, 234, 243, 0.95);
          border-radius: 15px;
          color: #0796a6;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 12px 28px rgba(16, 36, 63, 0.12);
          font-size: 1rem;
          font-weight: 900;
          line-height: 1;
        }

        .ims-layout-onboarding-launcher .ims-topbar-icon-btn:hover {
          color: #ffffff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          border-color: transparent;
          box-shadow: 0 16px 34px rgba(7, 150, 166, 0.22);
        }

        .ims-layout-onboarding-launcher .ims-topbar-icon-btn:focus-visible {
          outline: 3px solid rgba(20, 200, 195, 0.28);
          outline-offset: 3px;
        }

        @media (max-width: 767.98px) {
          .ims-layout-onboarding-launcher {
            top: 0.85rem;
            inset-inline-end: 4.25rem;
          }

          .ims-layout-onboarding-launcher .ims-topbar-icon-btn {
            width: 38px;
            height: 38px;
            border-radius: 13px;
          }
        }
      `}</style>

      <AppNavbar title={isArabic ? 'بوابة المشرف الأكاديمي' : 'Academic Advisor Portal'} />

      <div className="ims-layout-onboarding-launcher">
        <OnboardingLauncher />
      </div>

      <div className="ims-content-layout">
        <Sidebar items={academicAdvisorSidebarItems} />

        <main className="ims-main d-flex flex-column">
          <div className="ims-page">
            <Outlet />
          </div>

          <AppFooter />
        </main>
      </div>
    </div>
  );
}

export default AcademicAdvisorLayout;