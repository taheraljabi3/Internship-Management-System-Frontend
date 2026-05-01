import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function RecentActivityCard({ title = 'Recent Activity', activities = [] }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="card ims-recent-activity-card h-100">
      <div className="card-body">
        <h5 className="fw-semibold mb-3">{t(title)}</h5>

        <div className="ims-activity-list">
          {activities.map((activity, index) => (
            <div key={`${activity.title}-${index}`} className="ims-activity-item">
              <div className="ims-activity-dot" />
              <div>
                <div className="ims-activity-title">{t(activity.title)}</div>
                <p className="ims-activity-meta">{t(activity.description || activity.timestamp || activity.time)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecentActivityCard;
