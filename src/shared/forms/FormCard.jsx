import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function FormCard({ title, children }) {
  const { isArabic } = useLanguage();
  return (
    <div className="card ims-form-card">
      <div className="card-body">
        <h5 className="ims-form-card-title">{translateText(title, isArabic)}</h5>
        {children}
      </div>
    </div>
  );
}

export default FormCard;
