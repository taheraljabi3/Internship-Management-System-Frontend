import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import AppModal from '../../../shared/components/AppModal';
import AppTable from '../../../shared/components/AppTable';
import TableToolbar from '../../../shared/components/TableToolbar';
import StudentProfileOverview from '../components/StudentProfileOverview';
import { useAuth } from '../../../shared/hooks/useAuth';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import { authorizedApiRequest, getStoredAccessToken } from '../../../app/api/client';

const TABS = [
  { key: 'profile', label: 'Student Profile' },
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

function normalizeProfile(payload, user) {
  if (!payload) return null;

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

function StudentProfileModulePage() {
  const { user, logout } = useAuth();
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const [activeTab, setActiveTab] = useState('profile');
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
  const [recordModalState, setRecordModalState] = useState({
    isOpen: false,
    type: null,
    record: null,
  });

  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [attachmentForm, setAttachmentForm] = useState(emptyAttachmentForm);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);

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

      if (normalizedProfile) {
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
      }

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

  const openProfileModal = () => {
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
        photo_url: profileForm.photoUrl || null,
        bio: profileForm.bio || null,
      };

      await authorizedApiRequest('/api/studentprofile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setFeedback({ type: 'success', message: isArabic ? 'تم حفظ الملف الشخصي بنجاح.' : 'Student profile saved successfully.' });
      setProfileModalOpen(false);
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

  const rowsByTab = {
    attachments,
    skills,
    projects,
    courses,
  };

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = rowsByTab[activeTab] || [];
    if (!keyword) return rows;

    return rows.filter((row) =>
      Object.values(row)
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [activeTab, rowsByTab, search]);

  const columnsByTab = {
    attachments: [
      { key: 'title', label: 'Title' },
      { key: 'fileName', label: 'File Name' },
      { key: 'category', label: 'Category' },
      { key: 'type', label: 'File Type' },
      { key: 'status', label: 'Status', type: 'status' },
      {
        key: 'fileUrl',
        label: 'File',
        render: (value) =>
          value ? (
            <a href={value} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
              {t('Open')}
            </a>
          ) : (
            '-'
          ),
      },
      {
        key: 'uploadedAt',
        label: 'Uploaded At',
        render: (value) => (value ? new Date(value).toLocaleString() : '-'),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openRecordModal('attachments', row)}>
              {t('Edit')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteRecord('attachments', row.id)}>
              {t('Delete')}
            </button>
          </div>
        ),
      },
    ],
    skills: [
      { key: 'name', label: 'Skill Name' },
      { key: 'level', label: 'Level', type: 'status' },
      { key: 'category', label: 'Category' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openRecordModal('skills', row)}>
              {t('Edit')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteRecord('skills', row.id)}>
              {t('Delete')}
            </button>
          </div>
        ),
      },
    ],
    projects: [
      { key: 'title', label: 'Project Title' },
      { key: 'year', label: 'Year' },
      { key: 'role', label: 'Role' },
      { key: 'link', label: 'Project Link' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openRecordModal('projects', row)}>
              {t('Edit')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteRecord('projects', row.id)}>
              {t('Delete')}
            </button>
          </div>
        ),
      },
    ],
    courses: [
      { key: 'title', label: 'Course Title' },
      { key: 'provider', label: 'Provider' },
      { key: 'hours', label: 'Hours' },
      { key: 'year', label: 'Year' },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openRecordModal('courses', row)}>
              {t('Edit')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteRecord('courses', row.id)}>
              {t('Delete')}
            </button>
          </div>
        ),
      },
    ],
  };

  const addButtonLabelMap = {
    profile: profile ? (isArabic ? 'تعديل الملف الشخصي' : 'Edit Student Profile') : (isArabic ? 'إنشاء الملف الشخصي' : 'Create Student Profile'),
    attachments: isArabic ? 'إضافة مرفق' : 'Add Attachment',
    skills: isArabic ? 'إضافة مهارة' : 'Add Skill',
    projects: isArabic ? 'إضافة مشروع' : 'Add Project',
    courses: isArabic ? 'إضافة دورة' : 'Add Course',
  };

  const handleAddClick = () => {
    if (activeTab === 'profile') {
      openProfileModal();
      return;
    }
    openRecordModal(activeTab, null);
  };

  const recordTitleMap = {
    attachments: isArabic
      ? recordModalState.record ? 'تعديل المرفق' : 'إضافة مرفق'
      : recordModalState.record ? 'Edit Attachment' : 'Add Attachment',
    skills: isArabic
      ? recordModalState.record ? 'تعديل المهارة' : 'إضافة مهارة'
      : recordModalState.record ? 'Edit Skill' : 'Add Skill',
    projects: isArabic
      ? recordModalState.record ? 'تعديل المشروع' : 'إضافة مشروع'
      : recordModalState.record ? 'Edit Project' : 'Add Project',
    courses: isArabic
      ? recordModalState.record ? 'تعديل الدورة' : 'إضافة دورة'
      : recordModalState.record ? 'Edit Course' : 'Add Course',
  };

  return (
    <div>
      <ModulePageHeader
        title="Student Profile"
        description="Manage your personal profile, attachments, skills, projects, and courses from live backend data."
        addLabel={addButtonLabelMap[activeTab]}
        onAddClick={handleAddClick}
      />

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      <ul className="nav nav-tabs mb-4">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button
              type="button"
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch('');
              }}
            >
              {t(tab.label)}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="card ims-table-card">
          <div className="card-body py-5 text-center">
            <div className="spinner-border" role="status" />
            <div className="mt-3">{isArabic ? 'جارٍ تحميل الملف الشخصي...' : 'Loading student profile...'}</div>
          </div>
        </div>
      ) : activeTab === 'profile' ? (
        <StudentProfileOverview profile={profile} onEdit={openProfileModal} />
      ) : (
        <div className="card ims-table-card">
          <div className="card-body">
            <TableToolbar
              title={TABS.find((item) => item.key === activeTab)?.label || ''}
              subtitle={
                activeTab === 'attachments'
                  ? 'Add and manage CV files, portfolio files, and supporting attachments.'
                  : activeTab === 'skills'
                  ? 'Manage your skills and proficiency levels.'
                  : activeTab === 'projects'
                  ? 'Manage your academic and practical projects.'
                  : 'Manage your completed courses and training records.'
              }
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={isArabic ? 'ابحث...' : 'Search...'}
            />

            <AppTable
              columns={columnsByTab[activeTab]}
              rows={filteredRows}
              rowKey="id"
              emptyMessage={
                isArabic
                  ? 'لا توجد سجلات حتى الآن.'
                  : 'No records found.'
              }
            />
          </div>
        </div>
      )}

      <AppModal
        isOpen={profileModalOpen}
        title={profile ? (isArabic ? 'تعديل الملف الشخصي' : 'Edit Student Profile') : (isArabic ? 'إنشاء الملف الشخصي' : 'Create Student Profile')}
        onClose={() => setProfileModalOpen(false)}
      >
        <form onSubmit={saveProfile}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Student Code</label>
              <input className="form-control" value={profileForm.studentCode} onChange={(e) => setProfileForm((s) => ({ ...s, studentCode: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Headline</label>
              <input className="form-control" value={profileForm.headline} onChange={(e) => setProfileForm((s) => ({ ...s, headline: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">University</label>
              <input className="form-control" value={profileForm.university} onChange={(e) => setProfileForm((s) => ({ ...s, university: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Major</label>
              <input className="form-control" value={profileForm.major} onChange={(e) => setProfileForm((s) => ({ ...s, major: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">GPA</label>
              <input className="form-control" value={profileForm.gpa} onChange={(e) => setProfileForm((s) => ({ ...s, gpa: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Graduation Year</label>
              <input className="form-control" value={profileForm.graduationYear} onChange={(e) => setProfileForm((s) => ({ ...s, graduationYear: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">City</label>
              <input className="form-control" value={profileForm.city} onChange={(e) => setProfileForm((s) => ({ ...s, city: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Country</label>
              <input className="form-control" value={profileForm.country} onChange={(e) => setProfileForm((s) => ({ ...s, country: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">LinkedIn URL</label>
              <input className="form-control" value={profileForm.linkedInUrl} onChange={(e) => setProfileForm((s) => ({ ...s, linkedInUrl: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Photo URL</label>
              <input className="form-control" value={profileForm.photoUrl} onChange={(e) => setProfileForm((s) => ({ ...s, photoUrl: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">Bio</label>
              <textarea className="form-control" rows="5" value={profileForm.bio} onChange={(e) => setProfileForm((s) => ({ ...s, bio: e.target.value }))} />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setProfileModalOpen(false)}>
              {t('Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('Save')}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={recordModalState.isOpen}
        title={recordTitleMap[recordModalState.type] || ''}
        onClose={closeRecordModal}
      >
        <form onSubmit={saveRecord}>
          {recordModalState.type === 'attachments' ? (
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">
                  {isArabic ? 'استيراد الملف من الجهاز' : 'Import File From Device'}
                </label>
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
                    ? 'اختر ملفًا من جهازك، وسيتم رفعه وحفظه ضمن مرفقاتك.'
                    : 'Choose a file from your device. It will be uploaded and saved in your attachments.'}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input className="form-control" value={attachmentForm.title} onChange={(e) => setAttachmentForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">File Name</label>
                <input className="form-control" value={attachmentForm.fileName} onChange={(e) => setAttachmentForm((s) => ({ ...s, fileName: e.target.value }))} required readOnly={Boolean(selectedAttachmentFile)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">File URL</label>
                <input
                  className="form-control"
                  value={attachmentForm.fileUrl}
                  onChange={(e) => setAttachmentForm((s) => ({ ...s, fileUrl: e.target.value }))}
                  disabled={Boolean(selectedAttachmentFile)}
                  placeholder={isArabic ? 'اختياري إذا لم ترفع ملفًا' : 'Optional if no file is uploaded'}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select className="form-select" value={attachmentForm.category} onChange={(e) => setAttachmentForm((s) => ({ ...s, category: e.target.value }))}>
                  <option value="CV">CV</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Certificate">Certificate</option>
                  <option value="OtherAttachment">Other Attachment</option>
                  <option value="TrainingLetter">Training Letter</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">File Type</label>
                <select className="form-select" value={attachmentForm.type} onChange={(e) => setAttachmentForm((s) => ({ ...s, type: e.target.value }))}>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="PPTX">PPTX</option>
                  <option value="PNG">PNG</option>
                  <option value="JPG">JPG</option>
                  <option value="JPEG">JPEG</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={attachmentForm.status} onChange={(e) => setAttachmentForm((s) => ({ ...s, status: e.target.value }))}>
                  <option value="Uploaded">Uploaded</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Archived">Archived</option>
                  <option value="Generated">Generated</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="4" value={attachmentForm.description} onChange={(e) => setAttachmentForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'skills' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Skill Name</label>
                <input className="form-control" value={skillForm.name} onChange={(e) => setSkillForm((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Level</label>
                <select className="form-select" value={skillForm.level} onChange={(e) => setSkillForm((s) => ({ ...s, level: e.target.value }))}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Category</label>
                <input className="form-control" value={skillForm.category} onChange={(e) => setSkillForm((s) => ({ ...s, category: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'projects' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Project Title</label>
                <input className="form-control" value={projectForm.title} onChange={(e) => setProjectForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Year</label>
                <input className="form-control" value={projectForm.year} onChange={(e) => setProjectForm((s) => ({ ...s, year: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Role</label>
                <input className="form-control" value={projectForm.role} onChange={(e) => setProjectForm((s) => ({ ...s, role: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Project Link</label>
                <input className="form-control" value={projectForm.link} onChange={(e) => setProjectForm((s) => ({ ...s, link: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="4" value={projectForm.description} onChange={(e) => setProjectForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
            </div>
          ) : null}

          {recordModalState.type === 'courses' ? (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Course Title</label>
                <input className="form-control" value={courseForm.title} onChange={(e) => setCourseForm((s) => ({ ...s, title: e.target.value }))} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Provider</label>
                <input className="form-control" value={courseForm.provider} onChange={(e) => setCourseForm((s) => ({ ...s, provider: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Hours</label>
                <input className="form-control" value={courseForm.hours} onChange={(e) => setCourseForm((s) => ({ ...s, hours: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Year</label>
                <input className="form-control" value={courseForm.year} onChange={(e) => setCourseForm((s) => ({ ...s, year: e.target.value }))} />
              </div>
            </div>
          ) : null}

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary" onClick={closeRecordModal}>
              {t('Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : t('Save')}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

export default StudentProfileModulePage;