import { useEffect, useMemo, useState } from 'react';
import ModulePageHeader from '../../../shared/components/ModulePageHeader';
import AppModal from '../../../shared/components/AppModal';
import AppTable from '../../../shared/components/AppTable';
import TableToolbar from '../../../shared/components/TableToolbar';
import EntityForm from '../../../shared/modules/EntityForm';
import { useAuth } from '../../../shared/hooks/useAuth';
import {
  approveEligibilityRequest,
  assignStudentAdvisorRequest,
  createEligibilityRequest,
  createInvitationBatchRequest,
  createUserRequest,
  deleteUserRequest,
  getAdvisorStudentsRequest,
  getAdvisorsRequest,
  getEligibilityByOwnerRequest,
  getInvitationBatchesRequest,
  getInvitationRecipientsRequest,
  getUsersRequest,
  rejectEligibilityRequest,
  updateUserRequest,
  createFinalEvaluationRequestRequest,
  getStudentInternshipContextRequest,
} from '../../../app/api/client';

const roleOptions = [
  { label: 'Student', value: 'Student' },
  { label: 'AcademicAdvisor', value: 'AcademicAdvisor' },
  { label: 'Administrator', value: 'Administrator' },
];

const statusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

function normalizeUser(user) {
  return {
    id: user.id,
    fullName: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    username: user.username || '',
    role: user.role || '',
    status: user.status || '',
  };
}

function normalizeAdvisor(advisor) {
  return {
    userId: advisor.user_id,
    fullName: advisor.full_name || '',
    email: advisor.email || '',
    employeeNo: advisor.employee_no || '',
    department: advisor.department || '',
    isSystemResponsible: advisor.is_system_responsible ? 'Yes' : 'No',
    studentsCount: advisor.students_count || 0,
  };
}

function normalizeAdvisorStudent(student) {
  return {
    studentUserId: student.student_user_id || student.id || null,
    fullName: student.full_name || '',
    email: student.email || '',
    studentCode: student.student_code || '',
    university: student.university || '',
    major: student.major || '',
    gpa: student.gpa ?? '',
    assignmentStartAt: student.assignment_start_at || '',
    notes: student.notes || '',
  };
}

function normalizeInvitationBatch(item) {
  return {
    id: item.id,
    invitationMode: item.invitation_mode || '',
    advisorUserId: item.advisor_user_id,
    advisorName: item.advisor_name || '',
    excelFileName: item.excel_file_name || '',
    sharedLinkUrl: item.shared_link_url || '',
    totalRecipients: item.total_recipients || 0,
    sentAt: item.sent_at || '',
    createdAt: item.created_at || '',
  };
}

function normalizeInvitationRecipient(item) {
  return {
    id: item.id,
    batchId: item.batch_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    studentUserId: item.student_user_id || null,
    invitationStatus: item.invitation_status || '',
    sentAt: item.sent_at || '',
    acceptedAt: item.accepted_at || '',
  };
}

function normalizeEligibility(item) {
  return {
    id: item.id,
    studentUserId: item.student_user_id,
    studentName: item.student_name || '',
    studentEmail: item.student_email || '',
    approvalOwnerUserId: item.approval_owner_user_id,
    approvalOwnerRole: item.approval_owner_role || '',
    status: item.status || '',
    comment: item.comment || '',
    createdAt: item.created_at || '',
    advisorName: item.advisor_name || '',
  };
}

const editFields = [
  { key: 'fullName', label: 'Full Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'username', label: 'Username', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: statusOptions,
  },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: roleOptions,
    readOnly: true,
  },
];

const assignmentFields = (studentOptions, advisorOptions) => [
  {
    key: 'studentUserId',
    label: 'Student',
    type: 'select',
    options: studentOptions,
  },
  {
    key: 'advisorUserId',
    label: 'Academic Advisor',
    type: 'select',
    options: advisorOptions,
  },
  {
    key: 'notes',
    label: 'Notes',
    type: 'textarea',
  },
];

function IdentityAccessModulePage() {
  const { user: currentUser, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [advisorStudents, setAdvisorStudents] = useState([]);

  const [invitationBatches, setInvitationBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchRecipients, setBatchRecipients] = useState([]);
  const [eligibilityRows, setEligibilityRows] = useState([]);

const [mainTab, setMainTab] = useState(
  currentUser?.role === 'AcademicAdvisor' ? 'advisorManagement' : 'identity'
);
const [advisorTab, setAdvisorTab] = useState('details');  const [invitationTab, setInvitationTab] = useState('batches');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);
  const [loadingAdvisorStudents, setLoadingAdvisorStudents] = useState(false);
  const [loadingInvitationBatches, setLoadingInvitationBatches] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [loadingStudentFile, setLoadingStudentFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [userModalState, setUserModalState] = useState({
    isOpen: false,
    record: null,
  });

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [invitationBatchModalOpen, setInvitationBatchModalOpen] = useState(false);
  const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);

  const [isStudentFileOpen, setIsStudentFileOpen] = useState(false);
  const [selectedStudentRecord, setSelectedStudentRecord] = useState(null);
  const [studentInternshipContext, setStudentInternshipContext] = useState(null);

  const [isFinalEvaluationModalOpen, setIsFinalEvaluationModalOpen] = useState(false);
const [finalEvaluationForm, setFinalEvaluationForm] = useState({
  internshipId: '',
  studentUserId: '',
  providerName: '',
  providerEmail: '',
  sendingTemplateName: 'Company Evaluation Request Email',
  evaluationTemplateName: 'Standard Company Internship Evaluation',
});
  
  const [selectedRecipientForEligibility, setSelectedRecipientForEligibility] = useState(null);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    username: '',
    phone: '',
    role: 'Student',
    status: 'Active',
    studentCode: '',
    university: '',
    major: '',
    advisorUserId: '',
    employeeNo: '',
    department: '',
    isSystemResponsible: 'false',
  });

  const [invitationForm, setInvitationForm] = useState({
    invitationMode: 'Excel',
    advisorUserId: '',
    excelFileName: '',
    sharedLinkUrl: '',
    invitationMessage:
      'You have been invited to access the internship training platform. Please log in and complete your profile.',
    recipientsText: '',
  });

  const [eligibilityForm, setEligibilityForm] = useState({
    studentUserId: '',
    approvalOwnerUserId: '',
    approvalOwnerRole: 'AcademicAdvisor',
  });

  const resetCreateForm = () => {
    setCreateForm({
      fullName: '',
      email: '',
      password: '',
      username: '',
      phone: '',
      role: 'Student',
      status: 'Active',
      studentCode: '',
      university: '',
      major: '',
      advisorUserId: '',
      employeeNo: '',
      department: '',
      isSystemResponsible: 'false',
    });
  };

  const resetInvitationForm = () => {
    setInvitationForm({
      invitationMode: 'Excel',
      advisorUserId: '',
      excelFileName: '',
      sharedLinkUrl: '',
      invitationMessage:
        'You have been invited to access the internship training platform. Please log in and complete your profile.',
      recipientsText: '',
    });
  };

  const resetEligibilityForm = () => {
    setEligibilityForm({
      studentUserId: '',
      approvalOwnerUserId: '',
      approvalOwnerRole: 'AcademicAdvisor',
    });
  };

  const handleSessionError = async (error) => {
    setFeedback({ type: 'danger', message: error.message || 'Request failed.' });

    if (String(error.message || '').toLowerCase().includes('session')) {
      await logout();
    }
  };

  const loadUsers = async ({ q = search, role = roleFilter, status = statusFilter } = {}) => {
    setLoadingUsers(true);

    try {
      const data = await getUsersRequest({ q, role, status });
      setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
      setFeedback({ type: '', message: '' });
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await getUsersRequest({ role: 'Student', status: 'Active' });
      setStudents(Array.isArray(data) ? data.map(normalizeUser) : []);
    } catch (error) {
      await handleSessionError(error);
    }
  };  
  

  const loadAdvisors = async () => {
  setLoadingAdvisors(true);

  try {
    const data = await getAdvisorsRequest();
    const normalized = Array.isArray(data) ? data.map(normalizeAdvisor) : [];

    const visibleAdvisors =
      currentUser?.role === 'AcademicAdvisor'
        ? normalized.filter(
            (item) =>
              Number(item.userId) === Number(currentUser?.id) ||
              String(item.email || '').toLowerCase() ===
                String(currentUser?.email || '').toLowerCase()
          )
        : normalized;

    setAdvisors(visibleAdvisors);

    setSelectedAdvisor((current) => {
      if (current && visibleAdvisors.some((item) => item.userId === current.userId)) {
        return visibleAdvisors.find((item) => item.userId === current.userId) || current;
      }

      if (currentUser?.role === 'AcademicAdvisor') {
        return (
          visibleAdvisors.find(
            (item) =>
              Number(item.userId) === Number(currentUser?.id) ||
              String(item.email || '').toLowerCase() ===
                String(currentUser?.email || '').toLowerCase()
          ) || null
        );
      }

      return visibleAdvisors[0] || null;
    });
  } catch (error) {
    await handleSessionError(error);
  } finally {
    setLoadingAdvisors(false);
  }
};

  const loadAdvisorStudents = async (advisorUserId) => {
    if (!advisorUserId) {
      setAdvisorStudents([]);
      return;
    }

    setLoadingAdvisorStudents(true);

    try {
      const data = await getAdvisorStudentsRequest(advisorUserId);
      setAdvisorStudents(Array.isArray(data) ? data.map(normalizeAdvisorStudent) : []);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoadingAdvisorStudents(false);
    }
  };

  const loadInvitationBatches = async () => {
    setLoadingInvitationBatches(true);

    try {
      const data = await getInvitationBatchesRequest();
      const normalized = Array.isArray(data) ? data.map(normalizeInvitationBatch) : [];
      setInvitationBatches(normalized);
      setSelectedBatch((current) => {
        if (current && normalized.some((item) => item.id === current.id)) {
          return normalized.find((item) => item.id === current.id) || current;
        }
        return normalized[0] || null;
      });
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoadingInvitationBatches(false);
    }
  };

  const loadRecipients = async (batchId) => {
    if (!batchId) {
      setBatchRecipients([]);
      return;
    }

    setLoadingRecipients(true);

    try {
      const data = await getInvitationRecipientsRequest(batchId);
      setBatchRecipients(Array.isArray(data) ? data.map(normalizeInvitationRecipient) : []);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadEligibilityRows = async (ownerUserId) => {
    if (!ownerUserId) {
      setEligibilityRows([]);
      return;
    }

    setLoadingEligibility(true);

    try {
      const data = await getEligibilityByOwnerRequest(ownerUserId);
      setEligibilityRows(Array.isArray(data) ? data.map(normalizeEligibility) : []);
    } catch (error) {
      await handleSessionError(error);
    } finally {
      setLoadingEligibility(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadStudents();
    loadAdvisors();
    loadInvitationBatches();

    if (currentUser?.id) {
      loadEligibilityRows(currentUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBatch?.id && invitationTab === 'recipients') {
      loadRecipients(selectedBatch.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch?.id, invitationTab]);


  useEffect(() => {
  if (mainTab === 'advisorManagement' && selectedAdvisor?.userId) {
    loadAdvisorStudents(selectedAdvisor.userId);
  } else if (!selectedAdvisor?.userId) {
    setAdvisorStudents([]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mainTab, selectedAdvisor?.userId]);

  const openCreateUserModal = () => {
    resetCreateForm();
    setUserModalState({ isOpen: true, record: null });
  };

  const closeUserModal = () => {
    setUserModalState({ isOpen: false, record: null });
    resetCreateForm();
  };

  const handleSaveUser = async (formData) => {
    setSubmitting(true);

    try {
      if (userModalState.record) {
        await updateUserRequest(userModalState.record.id, {
          full_name: formData.fullName,
          email: formData.email,
          username: formData.username || null,
          phone: formData.phone || null,
          status: formData.status,
        });

        setFeedback({ type: 'success', message: 'User updated successfully.' });
      } else {
        await createUserRequest({
          full_name: createForm.fullName,
          email: createForm.email,
          password: createForm.password,
          username: createForm.username || null,
          phone: createForm.phone || null,
          role_code: createForm.role,
          status: createForm.status,
          created_by_user_id: currentUser?.id || null,
          student_code: createForm.role === 'Student' ? createForm.studentCode : null,
          university: createForm.role === 'Student' ? createForm.university : null,
          major: createForm.role === 'Student' ? createForm.major : null,
          advisor_user_id:
            createForm.role === 'Student' && createForm.advisorUserId
              ? Number(createForm.advisorUserId)
              : null,
          employee_no: createForm.role !== 'Student' ? createForm.employeeNo || null : null,
          department: createForm.role !== 'Student' ? createForm.department || null : null,
          is_system_responsible:
            createForm.role === 'AcademicAdvisor'
              ? String(createForm.isSystemResponsible) === 'true'
              : false,
        });

        setFeedback({ type: 'success', message: 'User created successfully.' });
      }

      closeUserModal();
      await loadUsers();
      await loadStudents();
      await loadAdvisors();
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to save user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm('Are you sure you want to delete this user?');
    if (!confirmed) return;

    try {
      await deleteUserRequest(userId);
      setFeedback({ type: 'success', message: 'User deleted successfully.' });
      await loadUsers();
      await loadStudents();
      await loadAdvisors();
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to delete user.' });
    }
  };

const handleAssignStudent = async (formData) => {
  setSubmitting(true);

  try {
    const advisorId = Number(formData.advisorUserId);

    await assignStudentAdvisorRequest({
      student_user_id: Number(formData.studentUserId),
      advisor_user_id: advisorId,
      assigned_by_user_id: currentUser?.id || null,
      notes: formData.notes || null,
    });

    setFeedback({ type: 'success', message: 'Student assigned successfully.' });
    setAssignmentModalOpen(false);
    setMainTab('advisorManagement');
    setAdvisorTab('details');

    const refreshedAdvisors = await loadAdvisors();
    const advisor = refreshedAdvisors.find((item) => item.userId === advisorId) || null;
    setSelectedAdvisor(advisor);
    await loadAdvisorStudents(advisorId);
  } catch (error) {
    setFeedback({ type: 'danger', message: error.message || 'Failed to assign student.' });
  } finally {
    setSubmitting(false);
  }
};
  
const handleViewAdvisorDetails = async (advisor) => {
  setSelectedAdvisor(advisor);
  setMainTab('advisorManagement');
  setAdvisorTab('details');
  await loadAdvisorStudents(advisor.userId);
};


  const parseRecipientsText = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [student_name, student_email] = line.split(',').map((item) => item?.trim() || '');
        return { student_name, student_email };
      })
      .filter((item) => item.student_name);
  };

  const handleCreateInvitationBatch = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const recipients = parseRecipientsText(invitationForm.recipientsText);

      await createInvitationBatchRequest({
        invitation_mode: invitationForm.invitationMode,
        advisor_user_id: Number(invitationForm.advisorUserId),
        created_by_user_id: currentUser?.id || null,
        excel_file_name:
          invitationForm.invitationMode === 'Excel'
            ? invitationForm.excelFileName || null
            : null,
        shared_link_url:
          invitationForm.invitationMode === 'Link'
            ? invitationForm.sharedLinkUrl || null
            : null,
        invitation_message: invitationForm.invitationMessage,
        recipients,
      });

      setInvitationBatchModalOpen(false);
      resetInvitationForm();
      setFeedback({ type: 'success', message: 'Invitation batch created successfully.' });
      await loadInvitationBatches();
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to create invitation batch.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRecipients = async (batch) => {
    setSelectedBatch(batch);
    setInvitationTab('recipients');
    await loadRecipients(batch.id);
  };

  const openEligibilityModal = (recipient) => {
    setSelectedRecipientForEligibility(recipient);

    const matchedStudent = students.find((student) =>
      recipient.studentUserId
        ? student.id === recipient.studentUserId
        : student.email?.toLowerCase() === recipient.studentEmail?.toLowerCase()
    );

    setEligibilityForm({
      studentUserId: matchedStudent ? String(matchedStudent.id) : '',
      approvalOwnerUserId: selectedBatch?.advisorUserId ? String(selectedBatch.advisorUserId) : '',
      approvalOwnerRole: 'AcademicAdvisor',
    });

    setEligibilityModalOpen(true);
  };

  const handleCreateEligibility = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await createEligibilityRequest({
        student_user_id: Number(eligibilityForm.studentUserId),
        invitation_recipient_id: selectedRecipientForEligibility?.id || null,
        advisor_assignment_id: null,
        approval_owner_user_id: Number(eligibilityForm.approvalOwnerUserId),
        approval_owner_role: eligibilityForm.approvalOwnerRole,
      });

      setEligibilityModalOpen(false);
      resetEligibilityForm();
      setSelectedRecipientForEligibility(null);
      setFeedback({ type: 'success', message: 'Eligibility review created successfully.' });

      if (eligibilityForm.approvalOwnerUserId) {
        await loadEligibilityRows(Number(eligibilityForm.approvalOwnerUserId));
      }

      setInvitationTab('eligibility');
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to create eligibility review.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveEligibility = async (row) => {
    const comment = window.prompt('Approval comment (optional):', row.comment || '') ?? '';

    try {
      await approveEligibilityRequest(row.id, {
        actor_user_id: currentUser?.id || null,
        comment,
      });

      setFeedback({ type: 'success', message: 'Eligibility approved successfully.' });
      await loadEligibilityRows(row.approvalOwnerUserId);
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to approve eligibility.' });
    }
  };

  const handleRejectEligibility = async (row) => {
    const comment = window.prompt('Rejection comment:', row.comment || '');
    if (comment === null) return;

    try {
      await rejectEligibilityRequest(row.id, {
        actor_user_id: currentUser?.id || null,
        comment,
      });

      setFeedback({ type: 'success', message: 'Eligibility rejected successfully.' });
      await loadEligibilityRows(row.approvalOwnerUserId);
    } catch (error) {
      setFeedback({ type: 'danger', message: error.message || 'Failed to reject eligibility.' });
    }
  };

  const openStudentFile = async (studentRecord) => {
    setSelectedStudentRecord(studentRecord);
    setStudentInternshipContext(null);
    setIsStudentFileOpen(true);
    setLoadingStudentFile(true);

    try {
      const context = await getStudentInternshipContextRequest(studentRecord.studentUserId);
      setStudentInternshipContext(context || null);
    } catch (error) {
      setStudentInternshipContext(null);
      setFeedback({
        type: 'danger',
        message: error.message || 'Failed to load student internship context.',
      });
    } finally {
      setLoadingStudentFile(false);
    }
  };

  const closeStudentFile = () => {
    setIsStudentFileOpen(false);
    setSelectedStudentRecord(null);
    setStudentInternshipContext(null);
  };

  const openFinalEvaluationFromStudentFile = async (studentRecord) => {
    setSubmitting(true);

    try {
      const context =
        studentInternshipContext && Number(studentInternshipContext.student_user_id) === Number(studentRecord.studentUserId)
          ? studentInternshipContext
          : await getStudentInternshipContextRequest(studentRecord.studentUserId);

      if (!context?.internship_id) {
        throw new Error('This student does not have an internship context yet.');
      }

      setStudentInternshipContext(context);

      setFinalEvaluationForm({
        internshipId: String(context?.internship_id || ''),
        studentUserId: String(studentRecord.studentUserId),
        providerName: context?.provider_name || '',
        providerEmail: context?.provider_email || '',
        sendingTemplateName: 'Company Evaluation Request Email',
        evaluationTemplateName: 'Standard Company Internship Evaluation',
      });

      setIsFinalEvaluationModalOpen(true);
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'Failed to load student internship context.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitFinalEvaluationFromStudentFile = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await createFinalEvaluationRequestRequest({
        internship_id: Number(finalEvaluationForm.internshipId),
        student_user_id: Number(finalEvaluationForm.studentUserId),
        provider_name: finalEvaluationForm.providerName,
        provider_email: finalEvaluationForm.providerEmail,
        sending_template_name: finalEvaluationForm.sendingTemplateName,
        evaluation_template_name: finalEvaluationForm.evaluationTemplateName,
        requested_by_user_id: currentUser?.id,
      });

      setIsFinalEvaluationModalOpen(false);
      setFeedback({ type: 'success', message: 'Final evaluation request sent successfully.' });
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || 'Failed to send final evaluation request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const userColumns = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'username', label: 'Username' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status', type: 'status' },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (_, row) => (
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setUserModalState({ isOpen: true, record: row })}
          >
            Edit
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDeleteUser(row.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

const advisorColumns = [
  { key: 'fullName', label: 'Advisor Name' },
  { key: 'email', label: 'Email' },
  { key: 'employeeNo', label: 'Employee No' },
  { key: 'department', label: 'Department' },
  { key: 'isSystemResponsible', label: 'System Responsible' },
  { key: 'studentsCount', label: 'Students Count' },
  {
    key: 'actions',
    label: 'Actions',
    render: (_, row) => (
      <button
        type="button"
        className={`btn btn-sm ${
          selectedAdvisor?.userId === row.userId ? 'btn-primary' : 'btn-outline-primary'
        }`}
        onClick={() => handleViewAdvisorDetails(row)}
      >
        View
      </button>
    ),
  },
];
  
const advisorStudentColumns = [
  { key: 'fullName', label: 'Student Name' },
  { key: 'email', label: 'Email' },
  { key: 'studentCode', label: 'Student Code' },
  { key: 'university', label: 'University' },
  { key: 'major', label: 'Major' },
  { key: 'gpa', label: 'GPA' },
  {
    key: 'assignmentStartAt',
    label: 'Assigned At',
    render: (value) => (value ? new Date(value).toLocaleString() : '-'),
  },
  { key: 'notes', label: 'Notes' },
  {
    key: 'actions',
    label: 'Actions',
    render: (_, row) => (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={() => openStudentFile(row)}
      >
        View Student File
      </button>
    ),
  },
];


  const invitationBatchColumns = [
    { key: 'id', label: 'Batch ID' },
    { key: 'invitationMode', label: 'Mode' },
    { key: 'advisorName', label: 'Advisor' },
    { key: 'excelFileName', label: 'Excel File' },
    {
      key: 'sharedLinkUrl',
      label: 'Shared Link',
      render: (value) => (value ? value : '-'),
    },
    { key: 'totalRecipients', label: 'Recipients' },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => handleViewRecipients(row)}
        >
          View Recipients
        </button>
      ),
    },
  ];

  const recipientColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'studentEmail', label: 'Email' },
    { key: 'studentUserId', label: 'Linked User ID' },
    { key: 'invitationStatus', label: 'Invitation Status' },
    {
      key: 'sentAt',
      label: 'Sent At',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'acceptedAt',
      label: 'Accepted At',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          onClick={() => openEligibilityModal(row)}
        >
          Create Eligibility
        </button>
      ),
    },
  ];

  const eligibilityColumns = [
    { key: 'studentName', label: 'Student Name' },
    { key: 'studentEmail', label: 'Email' },
    { key: 'advisorName', label: 'Advisor' },
    { key: 'approvalOwnerRole', label: 'Owner Role' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'comment', label: 'Comment' },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (value) => (value ? new Date(value).toLocaleString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => handleApproveEligibility(row)}
          >
            Approve
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleRejectEligibility(row)}
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  const filterActions = (
    <div className="d-flex flex-wrap gap-2">
      <button
        type="button"
        className={`btn btn-sm ${roleFilter === 'All' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => {
          setRoleFilter('All');
          loadUsers({ role: 'All' });
        }}
      >
        All Users
      </button>

      <button
        type="button"
        className={`btn btn-sm ${roleFilter === 'Student' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => {
          setRoleFilter('Student');
          loadUsers({ role: 'Student' });
        }}
      >
        Students
      </button>

      <button
        type="button"
        className={`btn btn-sm ${
          roleFilter === 'AcademicAdvisor' ? 'btn-primary' : 'btn-outline-primary'
        }`}
        onClick={() => {
          setRoleFilter('AcademicAdvisor');
          loadUsers({ role: 'AcademicAdvisor' });
        }}
      >
        Academic Advisors
      </button>

      <button
        type="button"
        className={`btn btn-sm ${
          roleFilter === 'Administrator' ? 'btn-primary' : 'btn-outline-primary'
        }`}
        onClick={() => {
          setRoleFilter('Administrator');
          loadUsers({ role: 'Administrator' });
        }}
      >
        Administrators
      </button>

      <select
        className="form-select form-select-sm"
        style={{ width: '160px' }}
        value={statusFilter}
        onChange={(event) => {
          const next = event.target.value;
          setStatusFilter(next);
          loadUsers({ status: next });
        }}
      >
        <option value="All">All Statuses</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => loadUsers()}
      >
        Refresh
      </button>
    </div>
  );

  const assignmentFormFields = useMemo(() => {
    const studentOptions = students
      .filter((item) => item.role === 'Student')
      .map((item) => ({
        label: `${item.fullName} (${item.email})`,
        value: String(item.id),
      }));

    const advisorOptions = advisors.map((item) => ({
      label: `${item.fullName} (${item.email})`,
      value: String(item.userId),
    }));

    return assignmentFields(studentOptions, advisorOptions);
  }, [students, advisors]);

  const handleSearchSubmit = async (value) => {
    await loadUsers({ q: value });
  };

  return (
    <div>
      <ModulePageHeader
        title="Identity & Access"
        description="Manage users, academic advisors, invitation batches, and eligibility workflows from the live backend."
        addLabel="Add User"
        onAddClick={openCreateUserModal}
      />

      {feedback.message ? (
        <div className={`alert alert-${feedback.type === 'danger' ? 'danger' : 'success'}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="card ims-table-card">
        <div className="card-body">
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${mainTab === 'identity' ? 'active' : ''}`}
                onClick={() => setMainTab('identity')}
              >
                Identity & Access
              </button>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${mainTab === 'advisorManagement' ? 'active' : ''}`}
                onClick={() => setMainTab('advisorManagement')}
              >
                Academic Advisor Management
              </button>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${mainTab === 'invitationsEligibility' ? 'active' : ''}`}
                onClick={() => setMainTab('invitationsEligibility')}
              >
                Invitations & Eligibility
              </button>
            </li>
          </ul>

          {mainTab === 'identity' ? (
            <>
              <TableToolbar
                title="Identity & Access"
                subtitle="Manage users, academic advisors, and advisor-student assignments from the live backend."
                search={search}
                onSearchChange={(value) => setSearch(value)}
                searchPlaceholder="Search users..."
                actions={filterActions}
              />

              <div className="d-flex gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleSearchSubmit(search)}
                >
                  Search
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('All');
                    setStatusFilter('All');
                    loadUsers({ q: '', role: 'All', status: 'All' });
                  }}
                >
                  Reset
                </button>
              </div>

              {loadingUsers ? (
                <div className="py-5 text-center">
                  <div className="spinner-border" role="status" />
                  <div className="mt-3">Loading users...</div>
                </div>
              ) : (
                <AppTable
                  columns={userColumns}
                  rows={users}
                  rowKey="id"
                  emptyMessage="No users found."
                />
              )}
            </>
          ) : null}


        {mainTab === 'advisorManagement' ? (
          <>
            <div className="card ims-table-card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h5 className="mb-1">Academic Advisors</h5>
                    <p className="text-muted mb-0">
                      View academic advisors and inspect the students currently assigned to each advisor.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setAssignmentModalOpen(true)}
                  >
                    Assign Student to Advisor
                  </button>
                </div>

                {loadingAdvisors ? (
                  <div className="py-4 text-center">
                    <div className="spinner-border" role="status" />
                    <div className="mt-3">Loading advisors...</div>
                  </div>
                ) : (
                  <AppTable
                    columns={advisorColumns}
                    rows={advisors}
                    rowKey="userId"
                    emptyMessage="No academic advisors found."
                  />
                )}
              </div>
            </div>

            <div className="card ims-table-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h5 className="mb-1">
                      {selectedAdvisor
                        ? `Students Assigned to ${selectedAdvisor.fullName}`
                        : 'Advisor Students'}
                    </h5>
                    <p className="text-muted mb-0">
                      {selectedAdvisor
                        ? 'This list is loaded from the live advisor assignment endpoint.'
                        : 'Select an advisor to view assigned students.'}
                    </p>
                  </div>

                  {selectedAdvisor ? (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => loadAdvisorStudents(selectedAdvisor.userId)}
                    >
                      Refresh Students
                    </button>
                  ) : null}
                </div>

                {!selectedAdvisor ? (
                  <div className="alert alert-info mb-0">
                    No academic advisor is selected yet. When your advisor profile is loaded, your students will appear here automatically.
                  </div>
                ) : loadingAdvisorStudents ? (
                  <div className="py-4 text-center">
                    <div className="spinner-border" role="status" />
                    <div className="mt-3">Loading assigned students...</div>
                  </div>
                ) : (
                  <AppTable
                    columns={advisorStudentColumns}
                    rows={advisorStudents}
                    rowKey="studentUserId"
                    emptyMessage="No students assigned to this advisor."
                  />
                )}
              </div>
            </div>
          </>
        ) : null}

          {mainTab === 'invitationsEligibility' ? (
            <>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div>
                  <h5 className="mb-1">Invitations & Eligibility</h5>
                  <p className="text-muted mb-0">
                    Manage invitation batches, recipient tracking, and student eligibility reviews.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setInvitationBatchModalOpen(true)}
                >
                  Create Invitation Batch
                </button>
              </div>

              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${invitationTab === 'batches' ? 'active' : ''}`}
                    onClick={() => setInvitationTab('batches')}
                  >
                    Invitation Batches
                  </button>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${invitationTab === 'recipients' ? 'active' : ''}`}
                    onClick={() => setInvitationTab('recipients')}
                  >
                    Batch Recipients
                  </button>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${invitationTab === 'eligibility' ? 'active' : ''}`}
                    onClick={() => setInvitationTab('eligibility')}
                  >
                    Eligibility Reviews
                  </button>
                </li>
              </ul>

              {invitationTab === 'batches' ? (
                loadingInvitationBatches ? (
                  <div className="py-4 text-center">
                    <div className="spinner-border" role="status" />
                    <div className="mt-3">Loading invitation batches...</div>
                  </div>
                ) : (
                  <AppTable
                    columns={invitationBatchColumns}
                    rows={invitationBatches}
                    rowKey="id"
                    emptyMessage="No invitation batches found."
                  />
                )
              ) : null}

              {invitationTab === 'recipients' ? (
                !selectedBatch ? (
                  <div className="alert alert-info mb-0">
                    Select a batch from Invitation Batches and click View Recipients.
                  </div>
                ) : (
                  <>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted small">Batch ID</div>
                          <div className="fw-semibold">{selectedBatch.id}</div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted small">Mode</div>
                          <div className="fw-semibold">{selectedBatch.invitationMode}</div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted small">Advisor</div>
                          <div className="fw-semibold">{selectedBatch.advisorName}</div>
                        </div>
                      </div>
                    </div>

                    {loadingRecipients ? (
                      <div className="py-4 text-center">
                        <div className="spinner-border" role="status" />
                        <div className="mt-3">Loading batch recipients...</div>
                      </div>
                    ) : (
                      <AppTable
                        columns={recipientColumns}
                        rows={batchRecipients}
                        rowKey="id"
                        emptyMessage="No recipients found for this batch."
                      />
                    )}
                  </>
                )
              ) : null}

              {invitationTab === 'eligibility' ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="mb-1">Eligibility Reviews</h6>
                      <p className="text-muted mb-0">
                        Reviews currently assigned to you as the approval owner.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => currentUser?.id && loadEligibilityRows(currentUser.id)}
                    >
                      Refresh Reviews
                    </button>
                  </div>

                  {loadingEligibility ? (
                    <div className="py-4 text-center">
                      <div className="spinner-border" role="status" />
                      <div className="mt-3">Loading eligibility reviews...</div>
                    </div>
                  ) : (
                    <AppTable
                      columns={eligibilityColumns}
                      rows={eligibilityRows}
                      rowKey="id"
                      emptyMessage="No eligibility reviews found."
                    />
                  )}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <AppModal
        isOpen={userModalState.isOpen}
        title={userModalState.record ? 'Edit User' : 'Add User'}
        onClose={closeUserModal}
      >
        {userModalState.record ? (
          <EntityForm
            entityName="User"
            fields={editFields}
            selectedRecord={userModalState.record}
            onSave={handleSaveUser}
            onCancel={closeUserModal}
          />
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await handleSaveUser();
            }}
          >
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((s) => ({
                      ...s,
                      role: e.target.value,
                      advisorUserId: e.target.value === 'Student' ? s.advisorUserId : '',
                      studentCode: e.target.value === 'Student' ? s.studentCode : '',
                      university: e.target.value === 'Student' ? s.university : '',
                      major: e.target.value === 'Student' ? s.major : '',
                      employeeNo: e.target.value !== 'Student' ? s.employeeNo : '',
                      department: e.target.value !== 'Student' ? s.department : '',
                      isSystemResponsible:
                        e.target.value === 'AcademicAdvisor' ? s.isSystemResponsible : 'false',
                    }))
                  }
                  required
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Username</label>
                <input
                  className="form-control"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={createForm.status}
                  onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}
                  required
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {createForm.role === 'Student' ? (
                <>
                  <div className="col-md-6">
                    <label className="form-label">Student Code</label>
                    <input
                      className="form-control"
                      value={createForm.studentCode}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, studentCode: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Academic Advisor</label>
                    <select
                      className="form-select"
                      value={createForm.advisorUserId}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, advisorUserId: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select advisor</option>
                      {advisors.map((advisor) => (
                        <option key={advisor.userId} value={advisor.userId}>
                          {advisor.fullName} ({advisor.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">University</label>
                    <input
                      className="form-control"
                      value={createForm.university}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, university: e.target.value }))
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Major</label>
                    <input
                      className="form-control"
                      value={createForm.major}
                      onChange={(e) => setCreateForm((s) => ({ ...s, major: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="col-md-6">
                    <label className="form-label">Employee No</label>
                    <input
                      className="form-control"
                      value={createForm.employeeNo}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, employeeNo: e.target.value }))
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Department</label>
                    <input
                      className="form-control"
                      value={createForm.department}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, department: e.target.value }))
                      }
                    />
                  </div>

                  {createForm.role === 'AcademicAdvisor' ? (
                    <div className="col-md-6">
                      <label className="form-label">System Responsible</label>
                      <select
                        className="form-select"
                        value={createForm.isSystemResponsible}
                        onChange={(e) =>
                          setCreateForm((s) => ({
                            ...s,
                            isSystemResponsible: e.target.value,
                          }))
                        }
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={closeUserModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {submitting ? <div className="mt-3 text-muted">Saving...</div> : null}

        {userModalState.record ? (
          <div className="alert alert-light mt-3 mb-0">
            This edit form currently updates the core user record only.
          </div>
        ) : null}
      </AppModal>

      <AppModal
        isOpen={assignmentModalOpen}
        title="Assign Student to Academic Advisor"
        onClose={() => setAssignmentModalOpen(false)}
      >
        <EntityForm
          entityName="Advisor Assignment"
          fields={assignmentFormFields}
          selectedRecord={{
            advisorUserId: selectedAdvisor?.userId ? String(selectedAdvisor.userId) : '',
          }}
          onSave={handleAssignStudent}
          onCancel={() => setAssignmentModalOpen(false)}
        />

        {submitting ? <div className="mt-3 text-muted">Saving assignment...</div> : null}

        <div className="alert alert-light mt-3 mb-0">
          Assigning a student to a new advisor will replace the currently active advisor assignment
          for that student.
        </div>
      </AppModal>

      <AppModal
        isOpen={invitationBatchModalOpen}
        title="Create Invitation Batch"
        onClose={() => {
          setInvitationBatchModalOpen(false);
          resetInvitationForm();
        }}
      >
        <form onSubmit={handleCreateInvitationBatch}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Invitation Mode</label>
              <select
                className="form-select"
                value={invitationForm.invitationMode}
                onChange={(e) =>
                  setInvitationForm((s) => ({ ...s, invitationMode: e.target.value }))
                }
                required
              >
                <option value="Excel">Excel</option>
                <option value="Link">Link</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Academic Advisor</label>
              <select
                className="form-select"
                value={invitationForm.advisorUserId}
                onChange={(e) =>
                  setInvitationForm((s) => ({ ...s, advisorUserId: e.target.value }))
                }
                required
              >
                <option value="">Select advisor</option>
                {advisors.map((advisor) => (
                  <option key={advisor.userId} value={advisor.userId}>
                    {advisor.fullName} ({advisor.email})
                  </option>
                ))}
              </select>
            </div>

            {invitationForm.invitationMode === 'Excel' ? (
              <div className="col-md-6">
                <label className="form-label">Excel File Name</label>
                <input
                  className="form-control"
                  value={invitationForm.excelFileName}
                  onChange={(e) =>
                    setInvitationForm((s) => ({ ...s, excelFileName: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="col-md-6">
                <label className="form-label">Shared Link URL</label>
                <input
                  className="form-control"
                  value={invitationForm.sharedLinkUrl}
                  onChange={(e) =>
                    setInvitationForm((s) => ({ ...s, sharedLinkUrl: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="col-12">
              <label className="form-label">Invitation Message</label>
              <textarea
                className="form-control"
                rows="3"
                value={invitationForm.invitationMessage}
                onChange={(e) =>
                  setInvitationForm((s) => ({ ...s, invitationMessage: e.target.value }))
                }
              />
            </div>

            <div className="col-12">
              <label className="form-label">Recipients</label>
              <textarea
                className="form-control"
                rows="6"
                placeholder="One recipient per line: Student Name,student@email.com"
                value={invitationForm.recipientsText}
                onChange={(e) =>
                  setInvitationForm((s) => ({ ...s, recipientsText: e.target.value }))
                }
              />
              <div className="form-text">
                Enter each recipient in a new line using: Name,Email
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setInvitationBatchModalOpen(false);
                resetInvitationForm();
              }}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={eligibilityModalOpen}
        title="Create Eligibility Review"
        onClose={() => {
          setEligibilityModalOpen(false);
          resetEligibilityForm();
          setSelectedRecipientForEligibility(null);
        }}
      >
        <form onSubmit={handleCreateEligibility}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Recipient</label>
              <input
                className="form-control"
                value={
                  selectedRecipientForEligibility
                    ? `${selectedRecipientForEligibility.studentName} (${selectedRecipientForEligibility.studentEmail || 'No Email'})`
                    : ''
                }
                readOnly
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Linked Student User</label>
              <select
                className="form-select"
                value={eligibilityForm.studentUserId}
                onChange={(e) =>
                  setEligibilityForm((s) => ({ ...s, studentUserId: e.target.value }))
                }
                required
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Approval Owner</label>
              <select
                className="form-select"
                value={eligibilityForm.approvalOwnerUserId}
                onChange={(e) =>
                  setEligibilityForm((s) => ({ ...s, approvalOwnerUserId: e.target.value }))
                }
                required
              >
                <option value="">Select owner</option>
                {advisors.map((advisor) => (
                  <option key={advisor.userId} value={advisor.userId}>
                    {advisor.fullName} ({advisor.email})
                  </option>
                ))}
                {currentUser?.role === 'Administrator' ? (
                  <option value={currentUser.id}>
                    {currentUser.fullName} ({currentUser.email}) - Administrator
                  </option>
                ) : null}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Approval Owner Role</label>
              <select
                className="form-select"
                value={eligibilityForm.approvalOwnerRole}
                onChange={(e) =>
                  setEligibilityForm((s) => ({ ...s, approvalOwnerRole: e.target.value }))
                }
                required
              >
                <option value="AcademicAdvisor">AcademicAdvisor</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setEligibilityModalOpen(false);
                resetEligibilityForm();
                setSelectedRecipientForEligibility(null);
              }}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create Eligibility'}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        isOpen={isStudentFileOpen}
        title="Student File"
        onClose={closeStudentFile}
      >
        {!selectedStudentRecord ? null : (
          <>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-1">{selectedStudentRecord.fullName}</h5>
                <div className="text-muted">{selectedStudentRecord.email || '-'}</div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openFinalEvaluationFromStudentFile(selectedStudentRecord)}
                disabled={submitting || loadingStudentFile}
              >
                Send Final Evaluation
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Student Code</div>
                  <div className="fw-semibold">{selectedStudentRecord.studentCode || '-'}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">University</div>
                  <div className="fw-semibold">{selectedStudentRecord.university || '-'}</div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="text-muted small">Major</div>
                  <div className="fw-semibold">{selectedStudentRecord.major || '-'}</div>
                </div>
              </div>
            </div>

            {loadingStudentFile ? (
              <div className="py-4 text-center">
                <div className="spinner-border" role="status" />
                <div className="mt-3">Loading student file...</div>
              </div>
            ) : !studentInternshipContext ? (
              <div className="alert alert-warning mb-0">
                No internship context was found yet for this student.
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Internship ID</div>
                    <div className="fw-semibold">{studentInternshipContext.internship_id || '-'}</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Provider</div>
                    <div className="fw-semibold">{studentInternshipContext.provider_name || '-'}</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Internship Title</div>
                    <div className="fw-semibold">{studentInternshipContext.internship_title || '-'}</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Academic Advisor</div>
                    <div className="fw-semibold">{studentInternshipContext.advisor_name || '-'}</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Latest Training Plan ID</div>
                    <div className="fw-semibold">
                      {studentInternshipContext.latest_training_plan_id || '-'}
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <div className="text-muted small">Latest Weekly Report</div>
                    <div className="fw-semibold">
                      {studentInternshipContext.latest_weekly_report_week_no
                        ? `Week ${studentInternshipContext.latest_weekly_report_week_no}`
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AppModal>

      <AppModal
        isOpen={isFinalEvaluationModalOpen}
        title="Send Final Evaluation Request"
        onClose={() => setIsFinalEvaluationModalOpen(false)}
      >
        <form onSubmit={submitFinalEvaluationFromStudentFile}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Internship ID</label>
              <input className="form-control" value={finalEvaluationForm.internshipId} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Student User ID</label>
              <input className="form-control" value={finalEvaluationForm.studentUserId} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Provider Name</label>
              <input className="form-control" value={finalEvaluationForm.providerName} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Provider Email</label>
              <input className="form-control" value={finalEvaluationForm.providerEmail} readOnly />
            </div>

            <div className="col-md-6">
              <label className="form-label">Sending Template</label>
              <input
                className="form-control"
                value={finalEvaluationForm.sendingTemplateName}
                onChange={(e) =>
                  setFinalEvaluationForm((s) => ({
                    ...s,
                    sendingTemplateName: e.target.value,
                  }))
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Evaluation Template</label>
              <input
                className="form-control"
                value={finalEvaluationForm.evaluationTemplateName}
                onChange={(e) =>
                  setFinalEvaluationForm((s) => ({
                    ...s,
                    evaluationTemplateName: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsFinalEvaluationModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Evaluation'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

export default IdentityAccessModulePage;