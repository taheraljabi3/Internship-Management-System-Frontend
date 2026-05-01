import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function ProgressCard({ title, value, progress, subtitle }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="card ims-progress-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="fw-semibold mb-0">{t(title)}</h6>
          <span className="badge text-bg-light border">{value}</span>
        </div>

        <div className="ims-progress-label">
          <span>{t(subtitle || title)}</span>
          <span>{progress}%</span>
        </div>

        <div className="ims-progress-track">
          <div className="ims-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

export default ProgressCard;
