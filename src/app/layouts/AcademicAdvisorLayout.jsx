import { Outlet } from 'react-router-dom';
import AppNavbar from '../../shared/components/AppNavbar';
import Sidebar from '../../shared/components/Sidebar';
import AppFooter from '../../shared/components/AppFooter';
import { academicAdvisorSidebarItems } from '../router/routeConfig';

function AcademicAdvisorLayout() {
  return (
    <div className="ims-app-shell">
      <AppNavbar title="Academic Advisor Portal" />

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