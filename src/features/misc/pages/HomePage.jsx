import { Link } from 'react-router-dom';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import ROUTES from '../../../app/router/routePaths';

function HomePage() {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="py-4">
      <h1 className="fw-bold mb-3">{t('Internship Management System')}</h1>
      <p className="text-muted mb-4">{t('Cleaned project structure focused on the required modules only.')}</p>

      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to={ROUTES.PUBLIC.LOGIN}>{t('Login')}</Link>
        <Link className="btn btn-outline-secondary" to={ROUTES.DASHBOARD.STUDENT}>{t('Student Dashboard')}</Link>
        <Link className="btn btn-outline-secondary" to={ROUTES.DASHBOARD.ACADEMIC_ADVISOR}>{t('Academic Advisor Dashboard')}</Link>
        <Link className="btn btn-outline-secondary" to={ROUTES.DASHBOARD.ADMINISTRATOR}>{t('Administrator Dashboard')}</Link>
      </div>
    </div>
  );
}

export default HomePage;
