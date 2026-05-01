import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function TableToolbar({ title, subtitle, search = '', onSearchChange, searchPlaceholder = 'Search...', actions = null }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-toolbar">
      <div className="ims-toolbar-row">
        <div>
          <h5 className="ims-toolbar-title">{t(title)}</h5>
          {subtitle ? <p className="ims-toolbar-subtitle">{t(subtitle)}</p> : null}
        </div>

        {actions ? <div>{actions}</div> : null}
      </div>

      {typeof onSearchChange === 'function' ? (
        <div className="ims-toolbar-row">
          <input
            type="text"
            className="form-control ims-search-input"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t(searchPlaceholder)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default TableToolbar;
