import { Link } from 'react-router-dom';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import ROUTES from '../../../app/router/routePaths';

function NotFoundPage() {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="py-4">
      <h1 className="fw-bold mb-3">{isArabic ? '404 - الصفحة غير موجودة' : '404 - Not Found'}</h1>
      <p className="text-muted mb-4">{t('The page you are looking for does not exist.')}</p>
      <Link className="btn btn-primary" to={ROUTES.PUBLIC.ROOT}>{t('Return Home')}</Link>
    </div>
  );
}

export default NotFoundPage;
