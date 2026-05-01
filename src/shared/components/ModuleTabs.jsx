import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function ModuleTabs({ tabs = [], activeKey, onChange }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-module-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`ims-module-tab-btn ${activeKey === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  );
}

export default ModuleTabs;
