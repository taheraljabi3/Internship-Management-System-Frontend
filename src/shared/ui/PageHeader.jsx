import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function PageHeader({ title, description, actions = null }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-page-header d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
      <div>
        <h1 className="ims-page-title">{t(title)}</h1>
        {description ? <p className="ims-page-description">{t(description)}</p> : null}
      </div>

      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
