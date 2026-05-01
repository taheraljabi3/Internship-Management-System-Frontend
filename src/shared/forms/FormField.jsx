import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function FormField({ label, helpText, children }) {
  const { isArabic } = useLanguage();

  return (
    <div className="ims-form-section">
      <label className="ims-form-label">{translateText(label, isArabic)}</label>
      {children}
      {helpText ? <div className="ims-form-help">{translateText(helpText, isArabic)}</div> : null}
    </div>
  );
}

export default FormField;
