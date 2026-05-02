import { Outlet } from 'react-router-dom';

import AppNavbar from '../../shared/components/AppNavbar';
import Sidebar from '../../shared/components/Sidebar';
import AppFooter from '../../shared/components/AppFooter';

import { studentSidebarItems } from '../router/routeConfig';
import { useLanguage } from '../../shared/hooks/useLanguage';

function StudentLayout() {
  const { isArabic } = useLanguage();

  return (
    <div className="ims-app-shell">
      <AppNavbar title={isArabic ? 'بوابة الطالب' : 'Student Portal'} />

      <div className="ims-content-layout">
        <Sidebar items={studentSidebarItems} />

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

export default StudentLayout;