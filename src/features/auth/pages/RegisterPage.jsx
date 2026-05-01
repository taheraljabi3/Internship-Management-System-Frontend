import { Link } from 'react-router-dom';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import ROUTES from '../../../app/router/routePaths';

function RegisterPage() {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="row justify-content-center py-5">
      <div className="col-md-8 col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h2 className="h4 mb-3">{isArabic ? 'الوصول إلى النظام' : 'Access to the System'}</h2>
            <p className="text-muted mb-3">
              {isArabic
                ? 'التسجيل الذاتي غير مفعّل حاليًا. يتم إنشاء الحسابات من خلال دعوة جماعية، أو عبر إدارة النظام، أو من خلال المشرف الأكاديمي حسب سير العمل المعتمد.'
                : 'Self-registration is currently disabled. Accounts are created through bulk invitation, system administration, or academic advisor workflow.'}
            </p>

            <div className="alert alert-info">
              {isArabic
                ? 'إذا كنت طالبًا، فتأكد من أنك استلمت دعوة الدخول عبر البريد الإلكتروني. وإذا كنت مشرفًا أو مسؤول نظام، فيرجى التواصل مع الإدارة.'
                : 'If you are a student, make sure you received your login invitation by email. If you are an advisor or administrator, please contact the system administration.'}
            </div>

            <div className="d-flex justify-content-center">
              <Link to={ROUTES.PUBLIC.LOGIN} className="btn btn-primary">
                {t('Back to Login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;