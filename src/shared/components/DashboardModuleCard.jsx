import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function DashboardModuleCard({ title, description, items = [], actions = [] }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="card shadow-sm h-100">
      <div className="card-body d-flex flex-column">
        <h5 className="fw-semibold mb-3">{t(title)}</h5>
        <p className="text-muted">{t(description)}</p>

        {items.length > 0 ? (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {items.map((item) => (
              <span key={item} className="badge text-bg-light border">
                {t(item)}
              </span>
            ))}
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className="d-flex flex-wrap gap-2 mt-auto">
            {actions.map((action) => (
              <Link key={action.to} to={action.to} className="btn btn-outline-primary btn-sm">
                {t(action.label)}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DashboardModuleCard;
