import { useState } from 'react';
import FormCard from '../../../shared/forms/FormCard';
import FormField from '../../../shared/forms/FormField';
import FormActions from '../../../shared/forms/FormActions';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [form, setForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', username: user?.username || user?.email || '', phone: user?.phone || '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
const [saving, setSaving] = useState(false);
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };


  const handleSubmit = async (event) => {
  event.preventDefault();
  setMessage('');
  setError('');
  setSaving(true);

  try {
    const result = await updateProfile({
      fullName: form.fullName,
      email: form.email,
      username: form.username,
      phone: form.phone,
    });

    if (!result?.success) {
      setError(result?.message || 'Failed to update profile.');
      return;
    }

    setMessage(result.message || 'Profile updated successfully.');
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="container-fluid">
      <div className="ims-page-header">
        <h1 className="ims-page-title">{t('My Profile')}</h1>
        <p className="ims-page-description">{t('View and update your account information.')}</p>
      </div>
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <FormCard title="Profile Information">
            <form onSubmit={handleSubmit}>
              <FormField label="Full Name"><input type="text" name="fullName" className="form-control" value={form.fullName} onChange={handleChange} required /></FormField>
              <FormField label="Email"><input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required /></FormField>
              <FormField label="Username"><input type="text" name="username" className="form-control" value={form.username} onChange={handleChange} /></FormField>
              <FormField label="Phone"><input type="text" name="phone" className="form-control" value={form.phone} onChange={handleChange} /></FormField>
              <FormField label="Role"><input type="text" className="form-control" value={t(user?.role || '')} disabled /></FormField>
              {error ? <div className="alert alert-danger py-2">{t(error)}</div> : null}
              {message ? <div className="alert alert-success py-2">{t(message)}</div> : null}
              <FormActions>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('Saving...') : t('Update Profile')}
                </button></FormActions>
            </form>
          </FormCard>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
