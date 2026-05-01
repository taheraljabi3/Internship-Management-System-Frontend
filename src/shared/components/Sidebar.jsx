import { NavLink } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { translateText } from '../i18n/translate';

function Sidebar({ items = [] }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <aside className="ims-sidebar">
      <div className="ims-sidebar-title">{t('Navigation')}</div>

      <div className="nav nav-pills flex-column gap-2">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {t(item.label)}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
