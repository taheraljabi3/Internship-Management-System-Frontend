import { Outlet } from 'react-router-dom';
import AppNavbar from '../../shared/components/AppNavbar';
import Sidebar from '../../shared/components/Sidebar';
import AppFooter from '../../shared/components/AppFooter';
import { administratorSidebarItems } from '../router/routeConfig';

function AdministratorLayout() {
  return (
    <div className="ims-app-shell">
      <AppNavbar title="Administrator Portal" />

      <div className="ims-content-layout">
        <Sidebar items={administratorSidebarItems} />

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

export default AdministratorLayout;