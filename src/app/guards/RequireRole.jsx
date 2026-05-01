import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import ROUTES from '../router/routePaths';

function RequireRole({ allowedRoles = [] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
        <div className="mt-3">Loading permissions...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.PUBLIC.LOGIN} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.PUBLIC.UNAUTHORIZED} replace />;
  }

  return <Outlet />;
}

export default RequireRole;