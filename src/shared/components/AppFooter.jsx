import { useLanguage } from '../hooks/useLanguage';

function AppFooter() {
  const { isArabic } = useLanguage();

  return (
    <footer className="ims-footer mt-auto">
      <div className="ims-footer-text">
        {isArabic
          ? 'جميع الحقوق محفوظة للجامعة الإسلامية.'
          : 'All rights reserved to the Islamic University.'}
      </div>
    </footer>
  );
}

export default AppFooter;
