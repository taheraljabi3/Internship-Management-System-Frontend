import { useState } from 'react';
import FormCard from '../../../shared/forms/FormCard';
import FormField from '../../../shared/forms/FormField';
import FormActions from '../../../shared/forms/FormActions';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';

function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);

    try {
      const result = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      if (!result?.success) {
        setError(result?.message || 'Failed to update password.');
        return;
      }

      setMessage(result.message || 'Password updated successfully.');
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="ims-page-header">
        <h1 className="ims-page-title">{t('Change Password')}</h1>
        <p className="ims-page-description">
          {t('Update your account password securely.')}
        </p>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-7">
          <FormCard title={isArabic ? 'إعدادات كلمة المرور' : 'Password Settings'}>
            <form onSubmit={handleSubmit}>
              <FormField label={isArabic ? 'كلمة المرور الحالية' : 'Current Password'}>
                <input
                  type="password"
                  name="currentPassword"
                  className="form-control"
                  value={form.currentPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
              </FormField>

              <FormField label={isArabic ? 'كلمة المرور الجديدة' : 'New Password'}>
                <input
                  type="password"
                  name="newPassword"
                  className="form-control"
                  value={form.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
              </FormField>

              <FormField label={isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
              </FormField>

              {error ? <div className="alert alert-danger py-2">{t(error)}</div> : null}
              {message ? <div className="alert alert-success py-2">{t(message)}</div> : null}

              <FormActions>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('Saving...') : t('Update Password')}
                </button>
              </FormActions>
            </form>
          </FormCard>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;