import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import PublicLayout from '../layouts/PublicLayout';
import StudentLayout from '../layouts/StudentLayout';
import AcademicAdvisorLayout from '../layouts/AcademicAdvisorLayout';
import AdministratorLayout from '../layouts/AdministratorLayout';

import RequireAuth from '../guards/RequireAuth';
import RequireRole from '../guards/RequireRole';

import ROUTES from './routePaths';
import {
  publicRoutes,
  studentRoutes,
  academicAdvisorRoutes,
  administratorRoutes,
} from './routeConfig';

import GuidedOnboardingProvider from '../../features/onboarding/GuidedOnboardingProvider';
import NotFoundPage from '../../features/misc/pages/NotFoundPage';

function renderRouteList(routes) {
  return routes.map((route) => (
    <Route key={route.path} path={route.path} element={route.element} />
  ));
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <GuidedOnboardingProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            {renderRouteList(publicRoutes)}
            <Route
              path={ROUTES.PUBLIC.HOME}
              element={<Navigate to={ROUTES.PUBLIC.ROOT} replace />}
            />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<RequireRole allowedRoles={['Student']} />}>
              <Route element={<StudentLayout />}>
                {renderRouteList(studentRoutes)}
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={['AcademicAdvisor']} />}>
              <Route element={<AcademicAdvisorLayout />}>
                {renderRouteList(academicAdvisorRoutes)}
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={['Administrator']} />}>
              <Route element={<AdministratorLayout />}>
                {renderRouteList(administratorRoutes)}
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </GuidedOnboardingProvider>
    </BrowserRouter>
  );
}