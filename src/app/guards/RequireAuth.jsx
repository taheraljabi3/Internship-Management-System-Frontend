import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import ROUTES from '../router/routePaths';

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
        <div className="mt-3">Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.PUBLIC.LOGIN}
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

export default RequireAuth;