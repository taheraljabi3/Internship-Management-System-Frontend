import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function QuickActionsCard({ title = 'Quick Actions', actions = [] }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="card ims-quick-actions-card h-100">
      <div className="card-body">
        <h5 className="fw-semibold mb-3">{t(title)}</h5>

        <div className="d-flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className={`btn ${action.variant || 'btn-outline-primary'} btn-sm d-inline-flex align-items-center ims-quick-action-btn`}>
              {t(action.label)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickActionsCard;
