import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function ModulePageHeader({ title, description, addLabel, onAddClick }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-module-header">
      <div className="ims-module-header-actions">
        {onAddClick ? (
          <button type="button" className="btn btn-primary" onClick={onAddClick}>
            {t(addLabel)}
          </button>
        ) : null}
      </div>

      <div>
        <h1 className="ims-page-title">{t(title)}</h1>
        {description ? <p className="ims-page-description">{t(description)}</p> : null}
      </div>
    </div>
  );
}

export default ModulePageHeader;
