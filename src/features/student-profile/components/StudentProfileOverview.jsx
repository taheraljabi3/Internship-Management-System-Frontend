import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';

function DetailItem({ label, value }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  return (
    <div className="ims-student-profile-detail-item">
      <div className="ims-student-profile-detail-label">{t(label)}</div>
      <div className="ims-student-profile-detail-value">{value || '-'}</div>
    </div>
  );
}

function StudentProfileOverview({ profile, onEdit }) {
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  if (!profile) {
    return (
      <div className="card ims-student-profile-card">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">{t('Student Profile')}</h4>
              <p className="text-muted mb-0">{isArabic ? 'لا يوجد سجل ملف طالب حتى الآن.' : 'No student profile record exists yet.'}</p>
            </div>

            <button type="button" className="btn btn-primary" onClick={onEdit}>{isArabic ? 'إنشاء الملف' : 'Create Profile'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ims-student-profile-layout">
      <div className="card ims-student-profile-card">
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-column flex-lg-row gap-4 align-items-start">
            <div className="ims-student-profile-avatar-wrap">
              <img src={profile.photoUrl} alt={profile.fullName} className="ims-student-profile-avatar" />
            </div>

            <div className="flex-grow-1">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
                <div>
                  <div className="ims-student-profile-chip">{t('Student Profile')}</div>
                  <h2 className="ims-student-profile-name">{profile.fullName}</h2>
                  <p className="ims-student-profile-headline mb-2">{profile.headline || profile.major}</p>
                  <p className="ims-student-profile-meta mb-0">{profile.university} • {profile.major}</p>
                </div>

                <div className="d-flex gap-2">
                  {profile.linkedInUrl ? (
                    <a href={profile.linkedInUrl} target="_blank" rel="noreferrer" className="btn btn-outline-primary">{t('LinkedIn')}</a>
                  ) : null}

                  <button type="button" className="btn btn-primary" onClick={onEdit}>{isArabic ? 'تعديل الملف' : 'Edit Profile'}</button>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6 col-xl-3"><DetailItem label="Student Code" value={profile.studentCode} /></div>
                <div className="col-md-6 col-xl-3"><DetailItem label="GPA" value={profile.gpa} /></div>
                <div className="col-md-6 col-xl-3"><DetailItem label="Graduation Year" value={profile.graduationYear} /></div>
                <div className="col-md-6 col-xl-3"><DetailItem label="Location" value={[profile.city, profile.country].filter(Boolean).join(', ')} /></div>
                <div className="col-md-6"><DetailItem label="Email" value={profile.email} /></div>
                <div className="col-md-6"><DetailItem label="Phone" value={profile.phone} /></div>
                <div className="col-md-6"><DetailItem label="Academic Advisor" value={profile.academicAdvisorName} /></div>
                <div className="col-md-6"><DetailItem label="Advisor Email" value={profile.academicAdvisorEmail} /></div>
              </div>

              <div className="ims-student-profile-about">
                <h5 className="mb-2">{isArabic ? 'نبذة' : 'About'}</h5>
                <p className="mb-0">{profile.bio || (isArabic ? 'لا توجد نبذة مضافة بعد.' : 'No biography added yet.')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfileOverview;
