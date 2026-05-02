import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import { authorizedApiRequest, getStoredAccessToken } from '../../../app/api/client';

const TABS = [
  { key: 'attachments', label: 'Attachments' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'courses', label: 'Courses' },
];

const emptyProfileForm = {
  studentCode: '',
  fullName: '',
  headline: '',
  university: '',
  major: '',
  gpa: '',
  phone: '',
  email: '',
  city: '',
  country: '',
  graduationYear: '',
  linkedInUrl: '',
  photoUrl: '',
  bio: '',
};

const emptyAttachmentForm = {
  title: '',
  fileName: '',
  fileUrl: '',
  category: 'CV',
  type: 'PDF',
  status: 'Uploaded',
  description: '',
};

const emptySkillForm = {
  name: '',
  level: 'Beginner',
  category: '',
};

const emptyProjectForm = {
  title: '',
  year: '',
  role: '',
  link: '',
  description: '',
};

const emptyCourseForm = {
  title: '',
  provider: '',
  hours: '',
  year: '',
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function guessFileType(fileName = '') {
  const extension = String(fileName).split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') return 'PDF';
  if (extension === 'docx') return 'DOCX';
  if (extension === 'pptx') return 'PPTX';
  if (extension === 'png') return 'PNG';
  if (extension === 'jpg') return 'JPG';
  if (extension === 'jpeg') return 'JPEG';

  return 'OTHER';
}

function getFileTitle(fileName = '') {
  return String(fileName).replace(/\.[^/.]+$/, '');
}

function formatDate(value, locale = 'en-GB') {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function isRecommendationLetter(item) {
  const category = normalizeText(item?.category);
  const title = normalizeText(item?.title);
  const fileName = normalizeText(item?.fileName);

  return (
    category.includes('recommendation') ||
    category.includes('reference') ||
    category.includes('recommendationletter') ||
    category.includes('خطاب') ||
    category.includes('توصية') ||
    title.includes('recommendation') ||
    title.includes('reference') ||
    title.includes('توصية') ||
    fileName.includes('recommendation') ||
    fileName.includes('reference') ||
    fileName.includes('توصية')
  );
}

function createRecommendationPlaceholder(isArabic) {
  return {
    id: 'auto-recommendation-letter-placeholder',
    title: isArabic ? 'خطاب التوصية' : 'Recommendation Letter',
    fileName: isArabic ? 'ملف تلقائي فارغ' : 'Auto-created empty file',
    fileUrl: '',
    category: 'RecommendationLetter',
    type: 'PDF',
    status: isArabic ? 'فارغ' : 'Empty',
    uploadedAt: '',
    description: isArabic
      ? 'ملف تلقائي يظهر بمجرد إنشاء حساب الطالب، وسيتم استبداله لاحقًا بملف فعلي.'
      : 'Auto-created empty file that appears when the student account is created and will be replaced later with an actual file.',
    isPlaceholder: true,
  };
}


function downloadBlankRecommendationLetterFile(isArabic) {
  const blankPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 0 >>
stream

endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
254
%%EOF`;

  const blob = new Blob([blankPdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = isArabic ? 'خطاب-التوصية-فارغ.pdf' : 'blank-recommendation-letter.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getProfileCompletionStats({ profile, attachments, skills, projects, courses, actualRecommendationLetter }) {
  const requiredItems = [
    { key: 'studentCode', completed: Boolean(profile?.studentCode) },
    { key: 'headline', completed: Boolean(profile?.headline) },
    { key: 'university', completed: Boolean(profile?.university) },
    { key: 'major', completed: Boolean(profile?.major) },
    { key: 'gpa', completed: profile?.gpa !== '' && profile?.gpa !== null && profile?.gpa !== undefined },
    { key: 'city', completed: Boolean(profile?.city) },
    { key: 'country', completed: Boolean(profile?.country) },
    { key: 'graduationYear', completed: Boolean(profile?.graduationYear) },
    { key: 'photoUrl', completed: Boolean(profile?.photoUrl) },
    { key: 'bio', completed: Boolean(profile?.bio) },
    { key: 'attachments', completed: attachments.filter((item) => !isRecommendationLetter(item)).length > 0 },
    { key: 'skills', completed: skills.length > 0 },
    { key: 'projects', completed: projects.length > 0 },
    { key: 'courses', completed: courses.length > 0 },
    { key: 'recommendationLetter', completed: Boolean(actualRecommendationLetter && !actualRecommendationLetter.isPlaceholder) },
  ];

  const completedCount = requiredItems.filter((item) => item.completed).length;
  const totalCount = requiredItems.length;
  const percentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return { completedCount, totalCount, percentage, requiredItems };
}

async function parseUploadResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function uploadStudentDocumentFile({ documentId, file, title, category, status, description }) {
  const accessToken = getStoredAccessToken();
  const formData = new FormData();

  formData.append('file', file);
  formData.append('title', title || getFileTitle(file.name));
  formData.append('category', category || 'OtherAttachment');
  formData.append('status', status || 'Uploaded');

  if (description) {
    formData.append('description', description);
  }

  const path = documentId
    ? `/api/studentprofile/me/documents/${documentId}/file`
    : '/api/studentprofile/me/documents/upload';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: documentId ? 'PUT' : 'POST',
    headers: {
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
    body: formData,
  });

  const payload = await parseUploadResponse(response);

  if (!response.ok) {
    throw new Error(payload?.message || payload?.title || 'File upload failed.');
  }

  return payload;
}

async function uploadProfilePhotoFile(file) {
  try {
    const payload = await uploadStudentDocumentFile({
      documentId: null,
      file,
      title: 'Profile Photo',
      category: 'ProfilePhoto',
      status: 'Uploaded',
      description: 'Student profile photo.',
    });

    return (
      payload?.file_url ||
      payload?.fileUrl ||
      payload?.url ||
      payload?.document?.file_url ||
      payload?.document?.fileUrl ||
      null
    );
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function normalizeProfile(payload, user) {
  if (!payload) {
    return {
      id: user?.id || 1,
      studentCode: '',
      fullName: user?.fullName || user?.full_name || '',
      headline: '',
      university: '',
      major: '',
      gpa: '',
      phone: user?.phone || '',
      email: user?.email || '',
      city: '',
      country: '',
      graduationYear: '',
      linkedInUrl: '',
      photoUrl: '',
      bio: '',
      academicAdvisorName: '',
      academicAdvisorEmail: '',
    };
  }

  return {
    id: payload.user_id || user?.id || 1,
    studentCode: payload.student_code || '',
    fullName: user?.fullName || user?.full_name || '',
    headline: payload.headline || '',
    university: payload.university || '',
    major: payload.major || '',
    gpa: payload.gpa ?? '',
    phone: user?.phone || '',
    email: user?.email || '',
    city: payload.city || '',
    country: payload.country || '',
    graduationYear: payload.graduation_year ?? '',
    linkedInUrl: payload.linked_in_url || '',
    photoUrl: payload.photo_url || '',
    bio: payload.bio || '',
    academicAdvisorName: payload.academic_advisor_name || '',
    academicAdvisorEmail: payload.academic_advisor_email || '',
  };
}

function normalizeAttachment(item) {
  return {
    id: item.id,
    title: item.title || '',
    fileName: item.file_name || '',
    fileUrl: item.file_url || '',
    category: item.category || '',
    type: item.file_type || '',
    status: item.status || '',
    uploadedAt: item.uploaded_at || '',
    description: item.description || '',
  };
}

function normalizeSkill(item) {
  return {
    id: item.id,
    name: item.name || '',
    level: item.level || '',
    category: item.category || '',
  };
}

function normalizeProject(item) {
  return {
    id: item.id,
    title: item.title || '',
    year: item.project_year ?? '',
    role: item.role_name || '',
    link: item.project_link || '',
    description: item.description || '',
  };
}

function normalizeCourse(item) {
  return {
    id: item.id,
    title: item.title || '',
    provider: item.provider || '',
    hours: item.hours ?? '',
    year: item.course_year ?? '',
  };
}

function SvgIcon({ name, size = 22 }) {
  const icons = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    upload: (
      <>
        <path d="M12 3v12" />
        <path d="m8 7 4-4 4 4" />
        <path d="M5 21h14" />
      </>
    ),
    download: (
      <>
        <path d="M12 21V9" />
        <path d="m8 15 4 4 4-4" />
        <path d="M5 3h14" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    file: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </>
    ),
    star: (
      <>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9Z" />
      </>
    ),
    briefcase: (
      <>
        <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M4 11h16" />
      </>
    ),
    academic: (
      <>
        <path d="m2 8 10-5 10 5-10 5Z" />
        <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 1 0-7.07-7.07L10.59 6" />
        <path d="M14 11a5 5 0 0 0-7.07 0L5.51 12.4a5 5 0 0 0 7.07 7.07L13.4 18" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.file}
    </svg>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="ims-stu-profile-info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, tone = 'teal' }) {
  return (
    <div className={`ims-stu-profile-stat-card ims-tone-${tone}`}>
      <div className="ims-stu-profile-stat-icon">
        <SvgIcon name={icon} size={24} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <em>{subtitle}</em>
      </div>
    </div>
  );
}

function Tag({ children, tone = 'default' }) {
  return <span className={`ims-stu-tag ims-stu-tag-${tone}`}>{children}</span>;
}

function StatusPill({ status, isArabic }) {
  const normalized = normalizeText(status);
  let tone = 'info';

  if (['uploaded', 'completed', 'approved', 'active'].includes(normalized)) tone = 'success';
  if (['pending', 'draft', 'under review'].includes(normalized)) tone = 'warning';
  if (['rejected', 'failed'].includes(normalized)) tone = 'danger';

  return <span className={`ims-stu-status ims-stu-status-${tone}`}>{status || (isArabic ? 'غير محدد' : 'Unknown')}</span>;
}


function OverlayModal({ isOpen, title, onClose, children }) {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="ims-stu-overlay-backdrop" onClick={onClose} />
      <div className="ims-stu-overlay-shell" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ims-stu-overlay-card">
          <div className="ims-stu-overlay-header">
            <h3>{title}</h3>
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="ims-stu-overlay-body">{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}

function StudentProfileModulePage() {
  const { user, logout } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);
  const locale = isArabic ? 'ar-SA' : 'en-GB';

  const [activeTab, setActiveTab] = useState('attachments');
  const [search, setSearch] = useState('');

  const [profile, setProfile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [recordModalState, setRecordModalState] = useState({ isOpen: false, type: null, record: null });

  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [attachmentForm, setAttachmentForm] = useState(emptyAttachmentForm);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [selectedProfilePhotoFile, setSelectedProfilePhotoFile] = useState(null);

  const profilePhotoInputRef = useRef(null);

  const handleSessionError = async (error) => {
    setFeedback({ type: 'danger', message: error.message || 'Request failed.' });
    if (String(error.message || '').toLowerCase().includes('session')) {
      await logout();
    }
  };

  const loadAll = async () => {
    setLoading(true);

    try {
      const [profilePayload, documentsPayload, skillsPayload, projectsPayload, coursesPayload] =
        await Promise.all([
          authorizedApiRequest('/api/studentprofile/me', { method: 'GET' }).catch(() => null),
          authorizedApiRequest('/api/studentprofile/me/documents', { method: 'GET' }).catch(() => []),
          authorizedApiRequest('/api/studentprofile/me/skills', { method: 'GET' }).catch(() => []),
          authorizedApiRequest('/api/studentprofile/me/projects', { method: 'GET' }).catch(() => []),
          authorizedApiRequest('/api/studentprofile/me/courses', { method: 'GET' }).catch(() => []),
        ]);

      const normalizedProfile = normalizeProfile(profilePayload, user);
      setProfile(normalizedProfile);
      setProfileForm({
        studentCode: normalizedProfile.studentCode || '',
        fullName: normalizedProfile.fullName || '',
        headline: normalizedProfile.headline || '',
        university: normalizedProfile.university || '',
        major: normalizedProfile.major || '',
        gpa: normalizedProfile.gpa || '',
        phone: normalizedProfile.phone || '',
        email: normalizedProfile.email || '',
        city: normalizedProfile.city || '',
        country: normalizedProfile.country || '',
        graduationYear: normalizedProfile.graduationYear || '',
        linkedInUrl: normalizedProfile.linkedInUrl || '',
        photoUrl: normalizedProfile.photoUrl || '',
        bio: normalizedProfile.bio || '',
      });

      setAttachments(Array.isArray(documentsPayload) ? documentsPayload.map(normalizeAttachment) : []);
      setSkills(Array.isArray(skillsPayload) ? skillsPayload.map(normalizeSkill) : []);
      setProjects(Array.isArray(projectsPayload) ? projectsPayload.map(normalizeProject) : []);
      setCourses(Array.isArray(coursesPayload) ? coursesPayload.map(normalizeCourse) : []);
      setFeedback({ type: '', message: '' });
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualRecommendationLetter = useMemo(
    () => attachments.find((item) => isRecommendationLetter(item)) || null,
    [attachments]
  );

  const recommendationLetter = useMemo(
    () => actualRecommendationLetter || createRecommendationPlaceholder(isArabic),
    [actualRecommendationLetter, isArabic]
  );

  const displayAttachments = useMemo(() => {
    if (actualRecommendationLetter) return attachments;
    return [recommendationLetter, ...attachments];
  }, [actualRecommendationLetter, attachments, recommendationLetter]);

  const profileCompletionStats = useMemo(
    () =>
      getProfileCompletionStats({
        profile,
        attachments,
        skills,
        projects,
        courses,
        actualRecommendationLetter,
      }),
    [profile, attachments, skills, projects, courses, actualRecommendationLetter]
  );

  const openProfileModal = () => {
    setSelectedProfilePhotoFile(null);
    setProfileForm({
      studentCode: profile?.studentCode || '',
      fullName: profile?.fullName || user?.fullName || '',
      headline: profile?.headline || '',
      university: profile?.university || '',
      major: profile?.major || '',
      gpa: profile?.gpa || '',
      phone: profile?.phone || user?.phone || '',
      email: profile?.email || user?.email || '',
      city: profile?.city || '',
      country: profile?.country || '',
      graduationYear: profile?.graduationYear || '',
      linkedInUrl: profile?.linkedInUrl || '',
      photoUrl: profile?.photoUrl || '',
      bio: profile?.bio || '',
    });
    setProfileModalOpen(true);
  };

  const openRecordModal = (type, record = null) => {
    setRecordModalState({ isOpen: true, type, record });

    if (type === 'attachments') {
      setSelectedAttachmentFile(null);
      setAttachmentForm(
        record
          ? {
              title: record.title || '',
              fileName: record.fileName || '',
              fileUrl: record.fileUrl || '',
              category: record.category || 'CV',
              type: record.type || 'PDF',
              status: record.status || 'Uploaded',
              description: record.description || '',
            }
          : emptyAttachmentForm
      );
    }

    if (type === 'skills') {
      setSkillForm(
        record
          ? {
              name: record.name || '',
              level: record.level || 'Beginner',
              category: record.category || '',
            }
          : emptySkillForm
      );
    }

    if (type === 'projects') {
      setProjectForm(
        record
          ? {
              title: record.title || '',
              year: record.year || '',
              role: record.role || '',
              link: record.link || '',
              description: record.description || '',
            }
          : emptyProjectForm
      );
    }

    if (type === 'courses') {
      setCourseForm(
        record
          ? {
              title: record.title || '',
              provider: record.provider || '',
              hours: record.hours || '',
              year: record.year || '',
            }
          : emptyCourseForm
      );
    }
  };

  const closeRecordModal = () => {
    setRecordModalState({ isOpen: false, type: null, record: null });
    setAttachmentForm(emptyAttachmentForm);
    setSelectedAttachmentFile(null);
    setSkillForm(emptySkillForm);
    setProjectForm(emptyProjectForm);
    setCourseForm(emptyCourseForm);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      let photoUrlValue = profileForm.photoUrl || null;

      if (selectedProfilePhotoFile) {
        photoUrlValue = await uploadProfilePhotoFile(selectedProfilePhotoFile);

        if (!photoUrlValue) {
          photoUrlValue = await readFileAsDataUrl(selectedProfilePhotoFile);
        }
      }

      const payload = {
        student_code: profileForm.studentCode || null,
        headline: profileForm.headline || null,
        university: profileForm.university || null,
        major: profileForm.major || null,
        gpa: profileForm.gpa ? Number(profileForm.gpa) : null,
        city: profileForm.city || null,
        country: profileForm.country || null,
        graduation_year: profileForm.graduationYear ? Number(profileForm.graduationYear) : null,
        linked_in_url: profileForm.linkedInUrl || null,
        photo_url: photoUrlValue,
        bio: profileForm.bio || null,
      };

      await authorizedApiRequest('/api/studentprofile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setFeedback({
        type: 'success',
        message: isArabic ? 'تم حفظ الملف الشخصي بنجاح.' : 'Student profile saved successfully.',
      });
      setProfileModalOpen(false);
      setSelectedProfilePhotoFile(null);
      await loadAll();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setSaving(false);
    }
  };

  const saveRecord = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (recordModalState.type === 'attachments') {
        if (!recordModalState.record && !selectedAttachmentFile && !attachmentForm.fileUrl) {
          throw new Error(
            isArabic
              ? 'اختر ملفًا من الجهاز أو أضف رابط ملف.'
              : 'Please select a file from your device or provide a file URL.'
          );
        }

        if (selectedAttachmentFile) {
          await uploadStudentDocumentFile({
            documentId: recordModalState.record?.id || null,
            file: selectedAttachmentFile,
            title: attachmentForm.title,
            category: attachmentForm.category,
            status: attachmentForm.status,
            description: attachmentForm.description,
          });
        } else {
          const payload = {
            title: attachmentForm.title,
            file_name: attachmentForm.fileName,
            file_url: attachmentForm.fileUrl || null,
            category: attachmentForm.category,
            file_type: attachmentForm.type,
            status: attachmentForm.status,
            description: attachmentForm.description || null,
          };

          const path = recordModalState.record
            ? `/api/studentprofile/me/documents/${recordModalState.record.id}`
            : '/api/studentprofile/me/documents';

          await authorizedApiRequest(path, {
            method: recordModalState.record ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
          });
        }
      }

      if (recordModalState.type === 'skills') {
        const payload = {
          name: skillForm.name,
          level: skillForm.level,
          category: skillForm.category || null,
        };

        const path = recordModalState.record
          ? `/api/studentprofile/me/skills/${recordModalState.record.id}`
          : '/api/studentprofile/me/skills';

        await authorizedApiRequest(path, {
          method: recordModalState.record ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (recordModalState.type === 'projects') {
        const payload = {
          title: projectForm.title,
          project_year: projectForm.year ? Number(projectForm.year) : null,
          role_name: projectForm.role || null,
          project_link: projectForm.link || null,
          description: projectForm.description || null,
        };

        const path = recordModalState.record
          ? `/api/studentprofile/me/projects/${recordModalState.record.id}`
          : '/api/studentprofile/me/projects';

        await authorizedApiRequest(path, {
          method: recordModalState.record ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (recordModalState.type === 'courses') {
        const payload = {
          title: courseForm.title,
          provider: courseForm.provider || null,
          hours: courseForm.hours ? Number(courseForm.hours) : null,
          course_year: courseForm.year ? Number(courseForm.year) : null,
        };

        const path = recordModalState.record
          ? `/api/studentprofile/me/courses/${recordModalState.record.id}`
          : '/api/studentprofile/me/courses';

        await authorizedApiRequest(path, {
          method: recordModalState.record ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
      }

      setFeedback({ type: 'success', message: isArabic ? 'تم الحفظ بنجاح.' : 'Saved successfully.' });
      closeRecordModal();
      await loadAll();
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (type, recordId) => {
    const confirmed = window.confirm(
      isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'
    );
    if (!confirmed) return;

    try {
      const baseMap = {
        attachments: 'documents',
        skills: 'skills',
        projects: 'projects',
        courses: 'courses',
      };

      await authorizedApiRequest(`/api/studentprofile/me/${baseMap[type]}/${recordId}`, {
        method: 'DELETE',
      });

      setFeedback({ type: 'success', message: isArabic ? 'تم الحذف بنجاح.' : 'Deleted successfully.' });
      await loadAll();
    } catch (error) {
      await handleSessionError(error);
    }
  };

  const rowsByTab = useMemo(
    () => ({
      attachments: displayAttachments,
      skills,
      projects,
      courses,
    }),
    [displayAttachments, skills, projects, courses]
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = rowsByTab[activeTab] || [];
    if (!keyword) return rows;

    return rows.filter((row) =>
      Object.values(row || {}).some((value) => String(value || '').toLowerCase().includes(keyword))
    );
  }, [activeTab, search, rowsByTab]);

  const addButtonLabelMap = {
    attachments: isArabic ? 'إضافة مرفق' : 'Add Attachment',
    skills: isArabic ? 'إضافة مهارة' : 'Add Skill',
    projects: isArabic ? 'إضافة مشروع' : 'Add Project',
    courses: isArabic ? 'إضافة دورة' : 'Add Course',
  };

  const recordTitleMap = {
    attachments: isArabic
      ? recordModalState.record
        ? 'تعديل المرفق'
        : 'إضافة مرفق'
      : recordModalState.record
      ? 'Edit Attachment'
      : 'Add Attachment',
    skills: isArabic
      ? recordModalState.record
        ? 'تعديل المهارة'
        : 'إضافة مهارة'
      : recordModalState.record
      ? 'Edit Skill'
      : 'Add Skill',
    projects: isArabic
      ? recordModalState.record
        ? 'تعديل المشروع'
        : 'إضافة مشروع'
      : recordModalState.record
      ? 'Edit Project'
      : 'Add Project',
    courses: isArabic
      ? recordModalState.record
        ? 'تعديل الدورة'
        : 'إضافة دورة'
      : recordModalState.record
      ? 'Edit Course'
      : 'Add Course',
  };

  const handleAddClick = () => openRecordModal(activeTab);

  return (
    <div className="ims-stu-profile-page">
      <style>{`
        .ims-stu-overlay-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9990;
          background: rgba(7, 31, 53, 0.58);
          backdrop-filter: blur(7px);
        }

        .ims-stu-overlay-shell {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          pointer-events: none;
        }

        .ims-stu-overlay-card {
          width: min(860px, 100%);
          max-height: min(92vh, 920px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(230, 238, 246, 0.96);
          border-radius: 28px;
          box-shadow: 0 30px 90px rgba(7, 31, 53, 0.24);
          animation: ims-stu-overlay-in 180ms ease;
          pointer-events: auto;
        }

        @keyframes ims-stu-overlay-in {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ims-stu-overlay-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #edf3f8;
          background: linear-gradient(180deg, #fff, #f8fbfd);
        }

        .ims-stu-overlay-header h3 {
          margin: 0;
          color: #10243f;
          font-size: 1.08rem;
          font-weight: 900;
        }

        .ims-stu-overlay-header button {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 13px;
          background: #eef4f7;
          color: #243b5a;
          font-size: 1.45rem;
          line-height: 1;
        }

        .ims-stu-overlay-body {
          overflow: auto;
          padding: 1.25rem;
        }

        .ims-stu-profile-page {
          position: relative;
          color: #10243f;
          min-height: 100%;
          padding-bottom: 1.5rem;
        }

        .ims-stu-profile-page::before {
          content: "";
          position: absolute;
          inset: -1.5rem -1.5rem auto -1.5rem;
          height: 300px;
          pointer-events: none;
          background:
            radial-gradient(circle at 18% 12%, rgba(20, 200, 195, 0.16), transparent 35%),
            radial-gradient(circle at 80% 10%, rgba(91, 101, 241, 0.10), transparent 30%),
            repeating-radial-gradient(ellipse at 45% 28%, rgba(20, 200, 195, 0.07) 0 1px, transparent 1px 28px);
          opacity: 0.9;
          border-radius: 0 0 42px 42px;
          z-index: 0;
        }

        .ims-stu-profile-page > * { position: relative; z-index: 1; }
        .ims-stu-profile-hero,
        .ims-stu-profile-card,
        .ims-stu-profile-stat-card,
        .ims-stu-profile-tab-card,
        .ims-stu-profile-list-item {
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(230, 238, 246, 0.98);
          box-shadow: 0 14px 36px rgba(16, 36, 63, 0.07);
          backdrop-filter: blur(10px);
        }

        .ims-stu-profile-hero {
          overflow: hidden;
          padding: 1.4rem 1.5rem;
          border-radius: 30px;
          margin-bottom: 1rem;
        }

        .ims-stu-profile-hero-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .ims-stu-profile-hero-main {
          display: grid;
          grid-template-columns: 128px 1fr;
          gap: 1.1rem;
          align-items: center;
          flex: 1;
        }

        .ims-stu-profile-avatar-wrap {
          position: relative;
          width: 128px;
          height: 128px;
          border-radius: 50%;
          border: 8px solid rgba(255,255,255,0.92);
          background: linear-gradient(135deg, #edf7fb, #f4f8ff);
          box-shadow: 0 18px 38px rgba(16, 36, 63, 0.10);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0796a6;
        }

        .ims-stu-profile-avatar-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ims-stu-profile-avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          font-weight: 900;
          color: #0796a6;
          background: linear-gradient(135deg, #e3fbfb, #eef3ff);
        }

        .ims-stu-profile-avatar-button {
          position: absolute;
          inset-inline-end: 6px;
          bottom: 8px;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 14px;
          color: #fff;
          background: linear-gradient(135deg, #3b82f6, #5b65f1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(59,130,246,0.22);
        }

        .ims-stu-profile-title h1 {
          margin: 0 0 0.35rem;
          font-size: clamp(2rem, 3vw, 2.6rem);
          font-weight: 900;
          letter-spacing: -0.05em;
          color: #10243f;
        }

        .ims-stu-profile-title p {
          margin: 0;
          color: #637894;
          font-size: 0.98rem;
          font-weight: 700;
          line-height: 1.8;
        }

        .ims-stu-profile-chip {
          margin-top: 0.8rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          min-height: 34px;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          color: #0d8a64;
          background: #e7fbf3;
          font-size: 0.8rem;
          font-weight: 900;
          border: 1px solid rgba(24,197,143,0.2);
        }

        .ims-stu-profile-hero-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .ims-stu-primary-btn,
        .ims-stu-secondary-btn,
        .ims-stu-danger-btn,
        .ims-stu-list-action {
          min-height: 44px;
          border: none;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          font-weight: 900;
          padding: 0 1rem;
        }

        .ims-stu-primary-btn {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          box-shadow: 0 14px 30px rgba(7,150,166,0.18);
        }

        .ims-stu-secondary-btn,
        .ims-stu-list-action {
          color: #243b5a;
          background: #fff;
          border: 1px solid #dfeaf3;
        }

        .ims-stu-danger-btn {
          color: #c02c3f;
          background: #ffedf0;
          border: 1px solid rgba(255,90,107,0.18);
        }

        .ims-stu-profile-hero-grid {
          margin-top: 1.2rem;
          padding-top: 1rem;
          border-top: 1px solid #edf3f8;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .ims-stu-profile-info-item {
          min-height: 70px;
          padding: 0.75rem 0.8rem;
          border-radius: 18px;
          background: #fbfdff;
          border: 1px solid #edf3f8;
        }

        .ims-stu-profile-info-item span {
          display: block;
          margin-bottom: 0.28rem;
          color: #7a8aa5;
          font-size: 0.76rem;
          font-weight: 850;
        }

        .ims-stu-profile-info-item strong {
          color: #243b5a;
          font-size: 0.88rem;
          font-weight: 900;
          word-break: break-word;
        }

        .ims-stu-profile-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-stu-profile-stat-card {
          min-height: 122px;
          border-radius: 24px;
          padding: 1rem 1.1rem;
          display: flex;
          gap: 0.85rem;
          align-items: center;
        }

        .ims-stu-profile-stat-icon {
          width: 56px;
          height: 56px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .ims-tone-teal .ims-stu-profile-stat-icon { color: #0796a6; background: #e2fafa; }
        .ims-tone-purple .ims-stu-profile-stat-icon { color: #5b65f1; background: #eef0ff; }
        .ims-tone-blue .ims-stu-profile-stat-icon { color: #3b82f6; background: #e8f1ff; }
        .ims-tone-green .ims-stu-profile-stat-icon { color: #18bd87; background: #e7fbf3; }

        .ims-stu-profile-stat-card span {
          display: block;
          margin-bottom: 0.3rem;
          color: #5e718d;
          font-size: 0.85rem;
          font-weight: 850;
        }

        .ims-stu-profile-stat-card strong {
          display: block;
          color: #10243f;
          font-size: 1.8rem;
          font-weight: 900;
          line-height: 1;
        }

        .ims-stu-profile-stat-card em {
          display: block;
          margin-top: 0.3rem;
          color: #7a8aa5;
          font-style: normal;
          font-size: 0.78rem;
          font-weight: 750;
        }

        .ims-stu-profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .ims-stu-profile-card {
          min-height: 100%;
          border-radius: 26px;
          padding: 1.1rem;
        }

        .ims-stu-profile-card h2 {
          margin: 0 0 0.9rem;
          color: #10243f;
          font-size: 1.05rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .ims-stu-profile-card p {
          color: #637894;
          font-size: 0.85rem;
          font-weight: 700;
          line-height: 1.7;
        }

        .ims-stu-profile-simple-grid {
          display: grid;
          gap: 0.7rem;
        }

        .ims-stu-profile-simple-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 0.7rem 0.8rem;
          border: 1px solid #edf3f8;
          border-radius: 18px;
          background: #fbfdff;
        }

        .ims-stu-profile-simple-row span {
          color: #7a8aa5;
          font-size: 0.78rem;
          font-weight: 850;
        }

        .ims-stu-profile-simple-row strong {
          color: #243b5a;
          font-size: 0.88rem;
          font-weight: 900;
        }

        .ims-stu-tag-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .ims-stu-tag {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 850;
          border: 1px solid transparent;
        }

        .ims-stu-tag-default { color: #243b5a; background: #f2f6fb; }
        .ims-stu-tag-success { color: #0d8a64; background: #e7fbf3; }
        .ims-stu-tag-purple { color: #5b65f1; background: #eef0ff; }
        .ims-stu-tag-blue { color: #3b82f6; background: #e8f1ff; }

        .ims-stu-profile-tab-card {
          border-radius: 28px;
          padding: 1rem;
        }

        .ims-stu-profile-tab-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .ims-stu-profile-tabs {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .ims-stu-profile-tabs button {
          min-height: 42px;
          padding: 0 1rem;
          border: 1px solid #dfeaf3;
          border-radius: 16px;
          background: #fff;
          color: #637894;
          font-weight: 900;
        }

        .ims-stu-profile-tabs button.active {
          color: #fff;
          background: linear-gradient(135deg, #0796a6, #14c8c3);
          border-color: transparent;
          box-shadow: 0 10px 24px rgba(7,150,166,0.16);
        }

        .ims-stu-profile-tab-actions {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .ims-stu-profile-search {
          position: relative;
          min-width: min(100%, 280px);
        }

        .ims-stu-profile-search svg {
          position: absolute;
          inset-inline-start: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #8ea0b6;
        }

        .ims-stu-profile-search input {
          width: 100%;
          min-height: 44px;
          border: 1px solid #dfeaf3;
          border-radius: 16px;
          background: #fbfdff;
          padding: 0 0.95rem 0 ${isArabic ? '0.95rem' : '2.65rem'};
          padding-inline-start: 2.65rem;
          color: #243b5a;
          font-weight: 750;
        }

        .ims-stu-profile-list {
          display: grid;
          gap: 0.8rem;
        }

        .ims-stu-profile-list-item {
          border-radius: 22px;
          padding: 0.9rem 1rem;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.9rem;
          align-items: center;
        }

        .ims-stu-profile-list-item h3 {
          margin: 0 0 0.2rem;
          color: #10243f;
          font-size: 0.98rem;
          font-weight: 900;
        }

        .ims-stu-profile-list-item p {
          margin: 0;
          color: #7a8aa5;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.65;
        }

        .ims-stu-profile-list-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.6rem;
        }

        .ims-stu-profile-list-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .ims-stu-status {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 900;
          border: 1px solid transparent;
        }

        .ims-stu-status-success { color: #0d8a64; background: #e7fbf3; border-color: rgba(24,197,143,0.2); }
        .ims-stu-status-warning { color: #a4660b; background: #fff4dc; border-color: rgba(244,166,42,0.24); }
        .ims-stu-status-danger { color: #c02c3f; background: #ffedf0; border-color: rgba(255,90,107,0.24); }
        .ims-stu-status-info { color: #1f65c8; background: #e8f1ff; border-color: rgba(59,130,246,0.2); }

        .ims-stu-feedback {
          margin-bottom: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 18px;
          font-weight: 850;
          border: 1px solid transparent;
        }

        .ims-stu-feedback-success {
          color: #0d8a64;
          background: #e7fbf3;
          border-color: rgba(24,197,143,0.24);
        }

        .ims-stu-feedback-danger {
          color: #b42335;
          background: #ffedf0;
          border-color: rgba(255,90,107,0.24);
        }

        .ims-stu-empty {
          min-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7a8aa5;
          font-weight: 850;
          border: 1px dashed #d6e4ee;
          border-radius: 22px;
          background: #fbfdff;
        }

        .ims-stu-modal-photo-preview {
          width: 110px;
          height: 110px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          overflow: hidden;
          border: 5px solid #eef4f7;
          background: #f6fbff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ims-stu-modal-photo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        @media (max-width: 1199.98px) {
          .ims-stu-profile-hero-grid,
          .ims-stu-profile-stats,
          .ims-stu-profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 991.98px) {
          .ims-stu-profile-hero-top,
          .ims-stu-profile-hero-main,
          .ims-stu-profile-list-item { grid-template-columns: 1fr; display: grid; }
          .ims-stu-profile-hero-main { justify-items: start; }
          .ims-stu-profile-hero-actions,
          .ims-stu-profile-list-actions { justify-content: flex-start; }
        }

        @media (max-width: 767.98px) {
          .ims-stu-profile-hero-grid,
          .ims-stu-profile-stats,
          .ims-stu-profile-grid,
          .ims-stu-profile-list-item { grid-template-columns: 1fr; }
          .ims-stu-profile-tab-toolbar { align-items: stretch; flex-direction: column; }
          .ims-stu-profile-tab-actions { width: 100%; }
          .ims-stu-profile-search { width: 100%; min-width: 0; }
        }
      `}</style>

      <section className="ims-stu-profile-hero">
        <div className="ims-stu-profile-hero-top">
          <div className="ims-stu-profile-hero-main">
            <div className="ims-stu-profile-avatar-wrap">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName || 'Student'} />
              ) : (
                <div className="ims-stu-profile-avatar-fallback">
                  {(profile?.fullName || user?.fullName || user?.email || 'S').slice(0, 1)}
                </div>
              )}

              <button
                type="button"
                className="ims-stu-profile-avatar-button"
                onClick={() => {
                  openProfileModal();
                  setTimeout(() => profilePhotoInputRef.current?.click(), 50);
                }}
                aria-label={isArabic ? 'إضافة صورة' : 'Upload photo'}
              >
                <SvgIcon name="upload" size={18} />
              </button>
            </div>

            <div className="ims-stu-profile-title">
              <h1>{profile?.fullName || user?.fullName || user?.email || (isArabic ? 'الطالب' : 'Student')}</h1>
              <p>{profile?.headline || (isArabic ? 'حدّث ملفك الشخصي ليظهر بشكل احترافي ومتكامل.' : 'Complete your profile to present yourself professionally.')}</p>
              <div className="ims-stu-profile-chip">
                <SvgIcon name="check" size={15} />
                {isArabic ? 'ملف الطالب الشخصي' : 'Student Personal Profile'}
              </div>
            </div>
          </div>

          <div className="ims-stu-profile-hero-actions">
            <button type="button" className="ims-stu-primary-btn" onClick={openProfileModal}>
              <SvgIcon name="edit" size={18} />
              {isArabic ? 'تعديل الملف' : 'Edit Profile'}
            </button>

            <button
              type="button"
              className="ims-stu-secondary-btn"
              onClick={() => downloadBlankRecommendationLetterFile(isArabic)}
            >
              <SvgIcon name="download" size={18} />
              {isArabic ? 'تحميل خطاب التوصية' : 'Download Recommendation Letter'}
            </button>
          </div>
        </div>

        <div className="ims-stu-profile-hero-grid">
          <InfoBlock label={isArabic ? 'الرقم الجامعي' : 'Student Code'} value={profile?.studentCode} />
          <InfoBlock label={isArabic ? 'البريد الإلكتروني' : 'Email'} value={profile?.email || user?.email} />
          <InfoBlock label={isArabic ? 'التخصص' : 'Major'} value={profile?.major} />
          <InfoBlock label={isArabic ? 'الجامعة' : 'University'} value={profile?.university} />
          <InfoBlock label={isArabic ? 'المعدل' : 'GPA'} value={profile?.gpa} />
          <InfoBlock label={isArabic ? 'المشرف الأكاديمي' : 'Academic Advisor'} value={profile?.academicAdvisorName} />
        </div>
      </section>

      {feedback.message ? (
        <div className={`ims-stu-feedback ${feedback.type === 'danger' ? 'ims-stu-feedback-danger' : 'ims-stu-feedback-success'}`}>
          {feedback.message}
        </div>
      ) : null}

      <section className="ims-stu-profile-stats">
        <StatCard
          title={isArabic ? 'اكتمال الملف' : 'Profile Completion'}
          value={`${profileCompletionStats.percentage}%`}
          subtitle={isArabic ? 'كلما زادت البيانات كان الملف أقوى.' : 'More complete data makes your profile stronger.'}
          icon="user"
          tone="teal"
        />
        <StatCard
          title={isArabic ? 'المهارات' : 'Skills'}
          value={skills.length}
          subtitle={isArabic ? 'مهارات مسجلة في ملفك.' : 'Skills saved in your profile.'}
          icon="star"
          tone="purple"
        />
        <StatCard
          title={isArabic ? 'المرفقات' : 'Attachments'}
          value={displayAttachments.length}
          subtitle={isArabic ? 'ملفات ومستندات مرفوعة.' : 'Uploaded files and documents.'}
          icon="folder"
          tone="blue"
        />
        <StatCard
          title={isArabic ? 'خطاب التوصية' : 'Recommendation Letter'}
          value={actualRecommendationLetter ? (isArabic ? 'موجود' : 'Visible') : (isArabic ? 'فارغ' : 'Empty')}
          subtitle={actualRecommendationLetter ? actualRecommendationLetter.title || actualRecommendationLetter.fileName : isArabic ? 'ملف تلقائي فارغ، بانتظار الاستبدال.' : 'Auto empty file waiting to be replaced.'}
          icon="file"
          tone="green"
        />
      </section>

      <section className="ims-stu-profile-grid">
        <div className="ims-stu-profile-card">
          <h2>
            <SvgIcon name="user" size={20} />
            {isArabic ? 'المعلومات الشخصية' : 'Personal Information'}
          </h2>
          <div className="ims-stu-profile-simple-grid">
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'الاسم الكامل' : 'Full Name'}</span>
              <strong>{profile?.fullName || user?.fullName || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'الجوال' : 'Phone'}</span>
              <strong>{profile?.phone || user?.phone || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'المدينة' : 'City'}</span>
              <strong>{profile?.city || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'الدولة' : 'Country'}</span>
              <strong>{profile?.country || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'نبذة تعريفية' : 'Bio'}</span>
              <strong>{profile?.bio || '-'}</strong>
            </div>
          </div>
        </div>

        <div className="ims-stu-profile-card">
          <h2>
            <SvgIcon name="academic" size={20} />
            {isArabic ? 'المعلومات الأكاديمية' : 'Academic Information'}
          </h2>
          <div className="ims-stu-profile-simple-grid">
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'الجامعة' : 'University'}</span>
              <strong>{profile?.university || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'التخصص' : 'Major'}</span>
              <strong>{profile?.major || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'المعدل التراكمي' : 'GPA'}</span>
              <strong>{profile?.gpa || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'سنة التخرج' : 'Graduation Year'}</span>
              <strong>{profile?.graduationYear || '-'}</strong>
            </div>
            <div className="ims-stu-profile-simple-row">
              <span>{isArabic ? 'لينكدإن' : 'LinkedIn'}</span>
              <strong>{profile?.linkedInUrl || '-'}</strong>
            </div>
          </div>
        </div>

        <div className="ims-stu-profile-card">
          <h2>
            <SvgIcon name="file" size={20} />
            {isArabic ? 'خطاب التوصية' : 'Recommendation Letter'}
          </h2>
          {recommendationLetter ? (
            <>
              <p>
                {isArabic
                  ? 'خطاب التوصية ملف تلقائي فارغ وغير قابل للتعديل، ويمكن للطالب تحميله مباشرة حاليًا.'
                  : 'The recommendation letter is an auto-created empty file. It is not editable and can be downloaded directly for now.'}
              </p>
              <div className="ims-stu-profile-simple-grid">
                <div className="ims-stu-profile-simple-row">
                  <span>{isArabic ? 'العنوان' : 'Title'}</span>
                  <strong>{recommendationLetter.title || recommendationLetter.fileName || '-'}</strong>
                </div>
                <div className="ims-stu-profile-simple-row">
                  <span>{isArabic ? 'النوع' : 'Type'}</span>
                  <strong>{recommendationLetter.type || '-'}</strong>
                </div>
                <div className="ims-stu-profile-simple-row">
                  <span>{isArabic ? 'تاريخ الرفع' : 'Uploaded At'}</span>
                  <strong>{formatDate(recommendationLetter.uploadedAt, locale)}</strong>
                </div>
                <div className="ims-stu-profile-simple-row">
                  <span>{isArabic ? 'الحالة' : 'Status'}</span>
                  <strong>{recommendationLetter.status || '-'}</strong>
                </div>
              </div>
              <div className="mt-3 d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="ims-stu-primary-btn"
                  onClick={() => downloadBlankRecommendationLetterFile(isArabic)}
                >
                  <SvgIcon name="download" size={18} />
                  {isArabic ? 'تحميل ملف فارغ' : 'Download Empty File'}
                </button>
              </div>
            </>
          ) : (
            <div className="ims-stu-empty">
              {isArabic ? 'لا يوجد خطاب توصية مضاف بعد. أضفه ليظهر داخل الملف.' : 'No recommendation letter has been added yet. Add one to make it visible in the profile.'}
            </div>
          )}
        </div>
      </section>

      <section className="ims-stu-profile-card mb-3">
        <h2>
          <SvgIcon name="star" size={20} />
          {isArabic ? 'أبرز المهارات' : 'Top Skills'}
        </h2>
        {skills.length ? (
          <div className="ims-stu-tag-wrap">
            {skills.slice(0, 12).map((skill) => (
              <Tag key={skill.id} tone={skill.level === 'Advanced' ? 'success' : skill.level === 'Intermediate' ? 'blue' : 'purple'}>
                {skill.name} {skill.level ? `• ${skill.level}` : ''}
              </Tag>
            ))}
          </div>
        ) : (
          <div className="ims-stu-empty">{isArabic ? 'لا توجد مهارات مضافة حتى الآن.' : 'No skills added yet.'}</div>
        )}
      </section>

      <section className="ims-stu-profile-tab-card">
        <div className="ims-stu-profile-tab-toolbar">
          <div className="ims-stu-profile-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearch('');
                }}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          <div className="ims-stu-profile-tab-actions">
            <div className="ims-stu-profile-search">
              <SvgIcon name="search" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isArabic ? 'ابحث داخل السجلات...' : 'Search records...'}
              />
            </div>

            <button type="button" className="ims-stu-primary-btn" onClick={handleAddClick}>
              <SvgIcon name="plus" size={18} />
              {addButtonLabelMap[activeTab]}
            </button>
          </div>
        </div>

        <div className="ims-stu-profile-list">
          {!loading && filteredRows.length ? (
            filteredRows.map((row) => {
              if (activeTab === 'attachments') {
                return (
                  <div key={row.id} className="ims-stu-profile-list-item">
                    <div>
                      <h3>{row.title || row.fileName || '-'}</h3>
                      <p>{row.description || (isArabic ? 'مرفق محفوظ ضمن ملف الطالب.' : 'Attachment saved in the student profile.')}</p>
                      <div className="ims-stu-profile-list-meta">
                        <Tag>{row.category || '-'}</Tag>
                        <Tag tone="purple">{row.type || '-'}</Tag>
                        <StatusPill status={row.status} isArabic={isArabic} />
                        <Tag tone="blue">{formatDate(row.uploadedAt, locale)}</Tag>
                      </div>
                    </div>
                    <div className="ims-stu-profile-list-actions">
                      {row.isPlaceholder || isRecommendationLetter(row) ? (
                        <button
                          type="button"
                          className="ims-stu-list-action"
                          onClick={() => downloadBlankRecommendationLetterFile(isArabic)}
                        >
                          <SvgIcon name="download" size={16} />
                          {isArabic ? 'تحميل' : 'Download'}
                        </button>
                      ) : (
                        <>
                          {row.fileUrl ? (
                            <a className="ims-stu-list-action" href={row.fileUrl} target="_blank" rel="noreferrer">
                              <SvgIcon name="eye" size={16} />
                              {isArabic ? 'عرض' : 'View'}
                            </a>
                          ) : null}
                          <button type="button" className="ims-stu-secondary-btn" onClick={() => openRecordModal('attachments', row)}>
                            <SvgIcon name="edit" size={16} />
                            {isArabic ? 'تعديل' : 'Edit'}
                          </button>
                          <button type="button" className="ims-stu-danger-btn" onClick={() => deleteRecord('attachments', row.id)}>
                            <SvgIcon name="trash" size={16} />
                            {isArabic ? 'حذف' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              if (activeTab === 'skills') {
                return (
                  <div key={row.id} className="ims-stu-profile-list-item">
                    <div>
                      <h3>{row.name || '-'}</h3>
                      <p>{isArabic ? 'مهارة ضمن الملف الشخصي.' : 'Skill added to the personal profile.'}</p>
                      <div className="ims-stu-profile-list-meta">
                        <Tag tone="blue">{row.level || '-'}</Tag>
                        <Tag>{row.category || (isArabic ? 'عام' : 'General')}</Tag>
                      </div>
                    </div>
                    <div className="ims-stu-profile-list-actions">
                      <button type="button" className="ims-stu-secondary-btn" onClick={() => openRecordModal('skills', row)}>
                        <SvgIcon name="edit" size={16} />
                        {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button type="button" className="ims-stu-danger-btn" onClick={() => deleteRecord('skills', row.id)}>
                        <SvgIcon name="trash" size={16} />
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              }

              if (activeTab === 'projects') {
                return (
                  <div key={row.id} className="ims-stu-profile-list-item">
                    <div>
                      <h3>{row.title || '-'}</h3>
                      <p>{row.description || (isArabic ? 'مشروع أكاديمي أو عملي.' : 'Academic or practical project.')}</p>
                      <div className="ims-stu-profile-list-meta">
                        <Tag>{row.role || (isArabic ? 'بدون دور محدد' : 'No role')}</Tag>
                        <Tag tone="blue">{row.year || '-'}</Tag>
                        {row.link ? <Tag tone="purple">{isArabic ? 'يحتوي على رابط' : 'Has Link'}</Tag> : null}
                      </div>
                    </div>
                    <div className="ims-stu-profile-list-actions">
                      {row.link ? (
                        <a className="ims-stu-list-action" href={row.link} target="_blank" rel="noreferrer">
                          <SvgIcon name="link" size={16} />
                          {isArabic ? 'فتح' : 'Open'}
                        </a>
                      ) : null}
                      <button type="button" className="ims-stu-secondary-btn" onClick={() => openRecordModal('projects', row)}>
                        <SvgIcon name="edit" size={16} />
                        {isArabic ? 'تعديل' : 'Edit'}
                      </button>
                      <button type="button" className="ims-stu-danger-btn" onClick={() => deleteRecord('projects', row.id)}>
                        <SvgIcon name="trash" size={16} />
                        {isArabic ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={row.id} className="ims-stu-profile-list-item">
                  <div>
                    <h3>{row.title || '-'}</h3>
                    <p>{isArabic ? 'سجل دورة أو برنامج تدريبي.' : 'Course or training record.'}</p>
                    <div className="ims-stu-profile-list-meta">
                      <Tag>{row.provider || (isArabic ? 'جهة غير محددة' : 'Unknown provider')}</Tag>
                      <Tag tone="purple">{row.hours ? `${row.hours} ${isArabic ? 'ساعة' : 'hours'}` : '-'}</Tag>
                      <Tag tone="blue">{row.year || '-'}</Tag>
                    </div>
                  </div>
                  <div className="ims-stu-profile-list-actions">
                    <button type="button" className="ims-stu-secondary-btn" onClick={() => openRecordModal('courses', row)}>
                      <SvgIcon name="edit" size={16} />
                      {isArabic ? 'تعديل' : 'Edit'}
                    </button>
                    <button type="button" className="ims-stu-danger-btn" onClick={() => deleteRecord('courses', row.id)}>
                      <SvgIcon name="trash" size={16} />
                      {isArabic ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="ims-stu-empty">
              {loading
                ? isArabic
                  ? 'جارٍ تحميل البيانات...'
                  : 'Loading data...'
                : isArabic
                ? 'لا توجد سجلات في هذا القسم.'
                : 'No records in this section.'}
            </div>
          )}
        </div>
      </section>

      <OverlayModal
        isOpen={profileModalOpen}
        title={isArabic ? 'تعديل الملف الشخصي' : 'Edit Personal Profile'}
        onClose={() => setProfileModalOpen(false)}
      >
        <form onSubmit={saveProfile}>
          <div className="ims-stu-modal-photo-preview">
            {selectedProfilePhotoFile ? (
              <img src={URL.createObjectURL(selectedProfilePhotoFile)} alt="Profile preview" />
            ) : profileForm.photoUrl ? (
              <img src={profileForm.photoUrl} alt="Profile" />
            ) : (
              <div className="ims-stu-profile-avatar-fallback">
                {(profileForm.fullName || user?.fullName || user?.email || 'S').slice(0, 1)}
              </div>
            )}
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'الصورة الشخصية' : 'Profile Photo'}</label>
              <input
                ref={profilePhotoInputRef}
                type="file"
                className="form-control"
                accept=".png,.jpg,.jpeg"
                onChange={(e) => setSelectedProfilePhotoFile(e.target.files?.[0] || null)}
              />
              <div className="form-text">
                {isArabic ? 'يمكنك رفع صورة من الجهاز، وستظهر مباشرة داخل الملف.' : 'You can upload a photo from your device and it will appear in the profile.'}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'أو رابط الصورة' : 'Or Photo URL'}</label>
              <input className="form-control" value={profileForm.photoUrl} onChange={(e) => setProfileForm((s) => ({ ...s, photoUrl: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'الرقم الجامعي' : 'Student Code'}</label>
              <input className="form-control" value={profileForm.studentCode} onChange={(e) => setProfileForm((s) => ({ ...s, studentCode: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'العنوان المهني' : 'Headline'}</label>
              <input className="form-control" value={profileForm.headline} onChange={(e) => setProfileForm((s) => ({ ...s, headline: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'الجامعة' : 'University'}</label>
              <input className="form-control" value={profileForm.university} onChange={(e) => setProfileForm((s) => ({ ...s, university: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'التخصص' : 'Major'}</label>
              <input className="form-control" value={profileForm.major} onChange={(e) => setProfileForm((s) => ({ ...s, major: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">GPA</label>
              <input className="form-control" value={profileForm.gpa} onChange={(e) => setProfileForm((s) => ({ ...s, gpa: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'سنة التخرج' : 'Graduation Year'}</label>
              <input className="form-control" value={profileForm.graduationYear} onChange={(e) => setProfileForm((s) => ({ ...s, graduationYear: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'المدينة' : 'City'}</label>
              <input className="form-control" value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isArabic ? 'الدولة' : 'Country'}</label>
              <input className="form-control" value={profileForm.country} onChange={(e) => setProfileForm((s) => ({ ...s, country: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">LinkedIn URL</label>
              <input className="form-control" value={profileForm.linkedInUrl} onChange={(e) => setProfileForm((s) => ({ ...s, linkedInUrl: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">{isArabic ? 'نبذة تعريفية' : 'Bio'}</label>
              <textarea className="form-control" rows="4" value={profileForm.bio} onChange={(e) => setProfileForm((s) => ({ ...s, bio: e.target.value }))} />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setProfileModalOpen(false)}>
              {t('Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('Save')}
            </button>
          </div>
        </form>
      </OverlayModal>

      <OverlayModal isOpen={recordModalState.isOpen} title={recordTitleMap[recordModalState.type] || ''} onClose={closeRecordModal}>
        <form onSubmit={saveRecord}>
          {recordModalState.type === 'attachments' ? (
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">{isArabic ? 'استيراد الملف من الجهاز' : 'Import File From Device'}</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedAttachmentFile(file);
                    if (file) {
                      const detectedType = guessFileType(file.name);
                      setAttachmentForm((s) => ({
                        ...s,
                        title: s.title || getFileTitle(file.name),
                        fileName: file.name,
                        fileUrl: '',
                        type: detectedType,
                      }));
                    }
                  }}
                />
                <div className="form-text">
                  {selectedAttachmentFile
                    ? `${isArabic ? 'الملف المختار' : 'Selected file'}: ${selectedAttachmentFile.name}`
                    : isArabic
                    ? 'اختر ملفًا من جهازك، وسيتم رفعه وحفظه ضمن المرفقات.'
                    : 'Choose a file from your device. It will be uploaded and saved in attachments.'}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'العنوان' : 'Title'}</label>
                <input className="form-control" value={attachmentForm.title} onChange={(e) => setAttachmentForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'اسم الملف' : 'File Name'}</label>
                <input className="form-control" value={attachmentForm.fileName} onChange={(e) => setAttachmentForm((s) => ({ ...s, fileName: e.target.value }))} required readOnly={Boolean(selectedAttachmentFile)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">File URL</label>
                <input className="form-control" value={attachmentForm.fileUrl} onChange={(e) => setAttachmentForm((s) => ({ ...s, fileUrl: e.target.value }))} disabled={Boolean(selectedAttachmentFile)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'الفئة' : 'Category'}</label>
                <select className="form-select" value={attachmentForm.category} onChange={(e) => setAttachmentForm((s) => ({ ...s, category: e.target.value }))}>
                  <option value="CV">CV</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Transcript">Transcript</option>
                  <option value="Certificate">Certificate</option>
                  <option value="RecommendationLetter">Recommendation Letter</option>
                  <option value="OtherAttachment">Other Attachment</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'نوع الملف' : 'File Type'}</label>
                <input className="form-control" value={attachmentForm.type} onChange={(e) => setAttachmentForm((s) => ({ ...s, type: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'الحالة' : 'Status'}</label>
                <select className="form-select" value={attachmentForm.status} onChange={(e) => setAttachmentForm((s) => ({ ...s, status: e.target.value }))}>
                  <option value="Uploaded">Uploaded</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">{isArabic ? 'الوصف' : 'Description'}</label>
                <textarea className="form-control" rows="3" value={attachmentForm.description} onChange={(e) => setAttachmentForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'skills' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'اسم المهارة' : 'Skill Name'}</label>
                <input className="form-control" value={skillForm.name} onChange={(e) => setSkillForm((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'المستوى' : 'Level'}</label>
                <select className="form-select" value={skillForm.level} onChange={(e) => setSkillForm((s) => ({ ...s, level: e.target.value }))}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">{isArabic ? 'التصنيف' : 'Category'}</label>
                <input className="form-control" value={skillForm.category} onChange={(e) => setSkillForm((s) => ({ ...s, category: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'projects' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'عنوان المشروع' : 'Project Title'}</label>
                <input className="form-control" value={projectForm.title} onChange={(e) => setProjectForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'السنة' : 'Year'}</label>
                <input className="form-control" value={projectForm.year} onChange={(e) => setProjectForm((s) => ({ ...s, year: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'الدور' : 'Role'}</label>
                <input className="form-control" value={projectForm.role} onChange={(e) => setProjectForm((s) => ({ ...s, role: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'الرابط' : 'Link'}</label>
                <input className="form-control" value={projectForm.link} onChange={(e) => setProjectForm((s) => ({ ...s, link: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">{isArabic ? 'الوصف' : 'Description'}</label>
                <textarea className="form-control" rows="3" value={projectForm.description} onChange={(e) => setProjectForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'courses' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'اسم الدورة' : 'Course Title'}</label>
                <input className="form-control" value={courseForm.title} onChange={(e) => setCourseForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'الجهة المقدمة' : 'Provider'}</label>
                <input className="form-control" value={courseForm.provider} onChange={(e) => setCourseForm((s) => ({ ...s, provider: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'عدد الساعات' : 'Hours'}</label>
                <input className="form-control" value={courseForm.hours} onChange={(e) => setCourseForm((s) => ({ ...s, hours: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{isArabic ? 'السنة' : 'Year'}</label>
                <input className="form-control" value={courseForm.year} onChange={(e) => setCourseForm((s) => ({ ...s, year: e.target.value }))} />
              </div>
            </div>
          ) : null}

          <div className="d-flex justify-content-end gap-2 mt-4 flex-wrap">
            <button type="button" className="btn btn-outline-secondary" onClick={closeRecordModal}>
              {t('Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('Save')}
            </button>
          </div>
        </form>
      </OverlayModal>
    </div>
  );
}

export default StudentProfileModulePage;