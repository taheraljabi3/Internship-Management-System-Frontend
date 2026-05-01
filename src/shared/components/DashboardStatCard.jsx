import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function DashboardStatCard({ title, value, subtitle }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="card ims-stat-card h-100">
      <div className="card-body">
        <p className="ims-stat-title">{t(title)}</p>
        <h3 className="ims-stat-value">{value}</h3>
        <p className="ims-stat-subtitle">{t(subtitle)}</p>
      </div>
    </div>
  );
}

export default DashboardStatCard;
