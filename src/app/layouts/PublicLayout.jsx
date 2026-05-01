import { Outlet, useLocation } from 'react-router-dom';
import AppFooter from '../../shared/components/AppFooter';
import ROUTES from '../router/routePaths';

function PublicLayout() {
  const location = useLocation();

  const isLoginPage = location.pathname === ROUTES.PUBLIC.LOGIN;

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="ims-app-shell d-flex flex-column min-vh-100">
      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}

export default PublicLayout;