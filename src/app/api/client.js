const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const STORAGE_KEYS = {
  accessToken: 'ims_access_token',
  refreshToken: 'ims_refresh_token',
  sessionId: 'ims_session_id',
  user: 'ims_user',
};

export function getStoredAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.accessToken) || '';
}

export function getStoredRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken) || '';
}

export function getStoredSessionId() {
  return localStorage.getItem(STORAGE_KEYS.sessionId) || '';
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistAuthSession({ access_token, refresh_token, session_id, user }) {
  if (access_token !== undefined) {
    localStorage.setItem(STORAGE_KEYS.accessToken, access_token || '');
  }

  if (refresh_token !== undefined) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token || '');
  }

  if (session_id !== undefined) {
    localStorage.setItem(STORAGE_KEYS.sessionId, String(session_id || ''));
  }

  if (user !== undefined) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user || null));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.sessionId);
  localStorage.removeItem(STORAGE_KEYS.user);
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function baseRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await parseJsonSafe(response);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function getErrorMessage(payload) {
  return (
    payload?.message ||
    payload?.title ||
    (typeof payload === 'string' ? payload : 'Request failed.')
  );
}

export async function apiRequest(path, options = {}) {
  const result = await baseRequest(path, options);

  if (!result.ok) {
    throw new Error(getErrorMessage(result.payload));
  }

  return result.payload;
}

export async function apiRequestWithAuth(path, options = {}, accessToken) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function refreshRequest({ session_id, refresh_token }) {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ session_id, refresh_token }),
  });
}

export async function authorizedApiRequest(path, options = {}) {
  let accessToken = getStoredAccessToken();

  let result = await baseRequest(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
  });

  if (result.status !== 401) {
    if (!result.ok) {
      throw new Error(getErrorMessage(result.payload));
    }
    return result.payload;
  }

  const session_id = Number(getStoredSessionId() || 0);
  const refresh_token = getStoredRefreshToken();

  if (!session_id || !refresh_token) {
    clearAuthSession();
    throw new Error('Your session has expired. Please sign in again.');
  }

  try {
    const refreshed = await refreshRequest({ session_id, refresh_token });

    persistAuthSession({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      session_id: refreshed.session_id,
      user: refreshed.user,
    });

    accessToken = refreshed.access_token;

    result = await baseRequest(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!result.ok) {
      throw new Error(getErrorMessage(result.payload));
    }

    return result.payload;
  } catch (error) {
    clearAuthSession();
    throw new Error('Your session has expired. Please sign in again.');
  }
}

export async function loginRequest({ login, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export async function meRequest(accessToken) {
  return apiRequestWithAuth('/api/auth/me', { method: 'GET' }, accessToken);
}

export async function logoutRequest({ session_id, accessToken }) {
  return apiRequestWithAuth(
    '/api/auth/logout',
    {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    },
    accessToken
  );
}

/* Users module */
export async function getUsersRequest({ q = '', role = '', status = '' } = {}) {
  const params = new URLSearchParams();

  if (q) params.set('q', q);
  if (role && role !== 'All') params.set('role', role);
  if (status && status !== 'All') params.set('status', status);

  const query = params.toString();
  return authorizedApiRequest(`/api/users${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export async function createUserRequest(payload) {
  return authorizedApiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUserRequest(id, payload) {
  return authorizedApiRequest(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUserRequest(id) {
  return authorizedApiRequest(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

/* Advisors & Assignments */
export async function getAdvisorsRequest() {
  return authorizedApiRequest('/api/advisors', {
    method: 'GET',
  });
}

export async function getAdvisorStudentsRequest(advisorUserId) {
  return authorizedApiRequest(`/api/advisors/${advisorUserId}/students`, {
    method: 'GET',
  });
}

export async function assignStudentAdvisorRequest(payload) {
  return authorizedApiRequest('/api/advisors/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Invitations & Eligibility */
export async function getInvitationBatchesRequest() {
  return authorizedApiRequest('/api/invitations/batches', {
    method: 'GET',
  });
}

export async function getInvitationRecipientsRequest(batchId) {
  return authorizedApiRequest(`/api/invitations/batches/${batchId}/recipients`, {
    method: 'GET',
  });
}

export async function createInvitationBatchRequest(payload) {
  return authorizedApiRequest('/api/invitations/batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEligibilityByOwnerRequest(ownerUserId) {
  return authorizedApiRequest(`/api/eligibility/owner/${ownerUserId}`, {
    method: 'GET',
  });
}

export async function createEligibilityRequest(payload) {
  return authorizedApiRequest('/api/eligibility', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveEligibilityRequest(id, payload) {
  return authorizedApiRequest(`/api/eligibility/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rejectEligibilityRequest(id, payload) {
  return authorizedApiRequest(`/api/eligibility/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Student profile read endpoints for advisor/admin */
export async function getStudentDocumentsRequest(studentUserId) {
  return authorizedApiRequest(`/api/students/${studentUserId}/documents`, {
    method: 'GET',
  });
}



export async function getStudentProjectsRequest(studentUserId) {
  return authorizedApiRequest(`/api/students/${studentUserId}/projects`, {
    method: 'GET',
  });
}

export async function getStudentCoursesRequest(studentUserId) {
  return authorizedApiRequest(`/api/students/${studentUserId}/courses`, {
    method: 'GET',
  });
}

/* Training Company Requests */
export async function getTrainingCompanyRequestsByStudentRequest(studentUserId) {
  return authorizedApiRequest(`/api/trainingcompanyrequests/student/${studentUserId}`, {
    method: 'GET',
  });
}

export async function getTrainingCompanyRequestsByOwnerRequest(ownerUserId) {
  return authorizedApiRequest(`/api/trainingcompanyrequests/owner/${ownerUserId}`, {
    method: 'GET',
  });
}

export async function createTrainingCompanyRequestRequest(payload) {
  return authorizedApiRequest('/api/trainingcompanyrequests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveTrainingCompanyRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingcompanyrequests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rejectTrainingCompanyRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingcompanyrequests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function delegateTrainingCompanyRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingcompanyrequests/${id}/delegate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Training Plans */
export async function getTrainingPlansByOwnerRequest(ownerUserId) {
  return authorizedApiRequest(`/api/trainingplans/owner/${ownerUserId}`, {
    method: 'GET',
  });
}

export async function getTrainingPlansByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/trainingplans/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function createTrainingPlanRequestRequest(payload) {
  return authorizedApiRequest('/api/trainingplans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveTrainingPlanRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingplans/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rejectTrainingPlanRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingplans/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function delegateTrainingPlanRequestRequest(id, payload) {
  return authorizedApiRequest(`/api/trainingplans/${id}/delegate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Training Tasks */
export async function getTrainingTasksByInternshipRequest(internshipId, weekNo = '') {
  const query = weekNo ? `?weekNo=${encodeURIComponent(weekNo)}` : '';
  return authorizedApiRequest(`/api/trainingtasks/internship/${internshipId}${query}`, {
    method: 'GET',
  });
}

export async function createTrainingTaskRequest(payload) {
  return authorizedApiRequest('/api/trainingtasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addTrainingTaskEvidenceRequest(taskId, payload) {
  return authorizedApiRequest(`/api/trainingtasks/${taskId}/evidences`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Weekly Reports */
export async function getWeeklyReportsByOwnerRequest(ownerUserId) {
  return authorizedApiRequest(`/api/weeklyreports/owner/${ownerUserId}`, {
    method: 'GET',
  });
}

export async function getWeeklyReportsByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/weeklyreports/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function generateWeeklyReportRequest(payload) {
  return authorizedApiRequest('/api/weeklyreports/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveWeeklyReportRequest(id, payload) {
  return authorizedApiRequest(`/api/weeklyreports/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function rejectWeeklyReportRequest(id, payload) {
  return authorizedApiRequest(`/api/weeklyreports/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Final Evaluations */
export async function getFinalEvaluationRequestsByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/finalevaluations/requests/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function getFinalEvaluationSummaryRequest(internshipId) {
  return authorizedApiRequest(`/api/finalevaluations/summary/${internshipId}`, {
    method: 'GET',
  });
}

export async function createFinalEvaluationRequestRequest(payload) {
  return authorizedApiRequest('/api/finalevaluations/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/* Internship Context */
export async function getMyInternshipContextRequest() {
  return authorizedApiRequest('/api/internshipcontext/me', {
    method: 'GET',
  });
}

export async function getStudentInternshipContextRequest(studentUserId) {
  return authorizedApiRequest(`/api/internshipcontext/student/${studentUserId}`, {
    method: 'GET',
  });
}

export async function getPendingEligibilityQueueRequest() {
  return authorizedApiRequest('/api/eligibility/pending', {
    method: 'GET',
  });
}

export async function getMyPendingEligibilityQueueRequest() {
  return authorizedApiRequest('/api/eligibility/pending/me', {
    method: 'GET',
  });
}

export async function registerFromInvitationLinkRequest(payload) {
  return apiRequest('/api/invitations/register-from-link', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEligibilityByStudentRequest(studentUserId) {
  return authorizedApiRequest(`/api/eligibility/student/${studentUserId}`, {
    method: 'GET',
  });
}

export async function getWeeklyReportDetailsRequest(id) {
  return authorizedApiRequest(`/api/weeklyreports/${id}/details`, {
    method: 'GET',
  });
}

/* Attendance */
export async function getMyAttendanceTodayRequest() {
  return authorizedApiRequest('/api/attendance/me/today', {
    method: 'GET',
  });
}

export async function getMyAttendanceSummaryRequest() {
  return authorizedApiRequest('/api/attendance/me/summary', {
    method: 'GET',
  });
}

export async function getMyAttendanceHistoryRequest() {
  return authorizedApiRequest('/api/attendance/me/history', {
    method: 'GET',
  });
}

export async function checkInRequest(payload = {}) {
  return authorizedApiRequest('/api/attendance/me/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function checkOutRequest(payload = {}) {
  return authorizedApiRequest('/api/attendance/me/check-out', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAcademicFinalEvaluationsByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/FinalEvaluations/academic/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function submitAcademicFinalEvaluationRequest(payload) {
  return authorizedApiRequest('/api/FinalEvaluations/academic/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAcademicStudentEvaluationsByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/AcademicStudentEvaluations/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function getAcademicStudentEvaluationsByStudentRequest(studentUserId) {
  return authorizedApiRequest(`/api/AcademicStudentEvaluations/student/${studentUserId}`, {
    method: 'GET',
  });
}

export async function upsertAcademicStudentEvaluationRequest(payload) {
  return authorizedApiRequest('/api/AcademicStudentEvaluations/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerCompanyEvaluationLinkRequest(payload) {
  return apiRequest('/api/finalevaluations/company/register-link', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitCompanyEvaluationRequest(payload) {
  return apiRequest('/api/finalevaluations/company/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function getStudentSkillsRequest(studentUserId) {
  return authorizedApiRequest(`/api/students/${studentUserId}/skills`, {
    method: 'GET',
  });
}
/* Reports & Analytics */
export async function getAdminReportOverviewRequest() {
  return authorizedApiRequest('/api/reports/admin/overview', {
    method: 'GET',
  });
}

export async function getAdminAttendanceTrendRequest(days = 30) {
  return authorizedApiRequest(`/api/reports/admin/attendance-trend?days=${encodeURIComponent(days)}`, {
    method: 'GET',
  });
}

export async function getAdminEvaluationDistributionRequest() {
  return authorizedApiRequest('/api/reports/admin/evaluation-distribution', {
    method: 'GET',
  });
}

export async function getAdminAdvisorWorkloadRequest() {
  return authorizedApiRequest('/api/reports/admin/advisor-workload', {
    method: 'GET',
  });
}

export async function getAdminProviderPerformanceRequest() {
  return authorizedApiRequest('/api/reports/admin/provider-performance', {
    method: 'GET',
  });
}

export async function getAdvisorReportOverviewRequest(advisorUserId) {
  return authorizedApiRequest(`/api/reports/advisor/${advisorUserId}/overview`, {
    method: 'GET',
  });
}

export async function getAdvisorAttendanceTrendRequest(advisorUserId, days = 30) {
  return authorizedApiRequest(
    `/api/reports/advisor/${advisorUserId}/attendance-trend?days=${encodeURIComponent(days)}`,
    { method: 'GET' }
  );
}

export async function getAdvisorStudentsPerformanceRequest(advisorUserId) {
  return authorizedApiRequest(`/api/reports/advisor/${advisorUserId}/students-performance`, {
    method: 'GET',
  });
}

export async function getAdvisorEvaluationStatusRequest(advisorUserId) {
  return authorizedApiRequest(`/api/reports/advisor/${advisorUserId}/evaluation-status`, {
    method: 'GET',
  });
}

export async function getAdvisorRiskStudentsRequest(advisorUserId) {
  return authorizedApiRequest(`/api/reports/advisor/${advisorUserId}/risk-students`, {
    method: 'GET',
  });
}
export async function getAttendanceByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/Attendance/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function getAttendanceSummaryByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/Attendance/summary/${internshipId}`, {
    method: 'GET',
  });
}

export async function upsertAttendanceRequest(payload) {
  return authorizedApiRequest('/api/Attendance/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),

    
  });
}
/* Evaluation module API helpers */
export async function getStudentsRequest() {
  return authorizedApiRequest('/api/students', {
    method: 'GET',
  });
}

export async function getCompanyEvaluationTemplatesByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/finalevaluations/templates/internship/${internshipId}`, {
    method: 'GET',
  });
}

export async function getCompanyEvaluationTemplateCriteriaRequest(templateId) {
  return authorizedApiRequest(`/api/finalevaluations/templates/${templateId}/criteria`, {
    method: 'GET',
  });
}

export async function createCompanyEvaluationTemplateRequest(payload) {
  return authorizedApiRequest('/api/finalevaluations/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCompanyEvaluationsByInternshipRequest(internshipId) {
  return authorizedApiRequest(`/api/finalevaluations/company/internship/${internshipId}`, {
    method: 'GET',
  });
}
/* Administration module API helpers */
export async function getAdminNotificationsRequest() {
  return authorizedApiRequest('/api/Administration/notifications', {
    method: 'GET',
  });
}

export async function createAdminNotificationRequest(payload) {
  return authorizedApiRequest('/api/Administration/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminNotificationRequest(id, payload) {
  return authorizedApiRequest(`/api/Administration/notifications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminNotificationRequest(id) {
  return authorizedApiRequest(`/api/Administration/notifications/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminAuditLogsRequest() {
  return authorizedApiRequest('/api/Administration/audit-logs', {
    method: 'GET',
  });
}

export async function createAdminAuditLogRequest(payload) {
  return authorizedApiRequest('/api/Administration/audit-logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAdminSystemSettingsRequest() {
  return authorizedApiRequest('/api/Administration/system-settings', {
    method: 'GET',
  });
}

export async function createAdminSystemSettingRequest(payload) {
  return authorizedApiRequest('/api/Administration/system-settings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSystemSettingRequest(id, payload) {
  return authorizedApiRequest(`/api/Administration/system-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminSystemSettingRequest(id) {
  return authorizedApiRequest(`/api/Administration/system-settings/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminBackupJobsRequest() {
  return authorizedApiRequest('/api/Administration/backup-jobs', {
    method: 'GET',
  });
}

export async function createAdminBackupJobRequest(payload) {
  return authorizedApiRequest('/api/Administration/backup-jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminBackupJobRequest(id, payload) {
  return authorizedApiRequest(`/api/Administration/backup-jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminBackupJobRequest(id) {
  return authorizedApiRequest(`/api/Administration/backup-jobs/${id}`, {
    method: 'DELETE',
  });
}

export async function runAdminBackupJobRequest(id) {
  return authorizedApiRequest(`/api/Administration/backup-jobs/${id}/run`, {
    method: 'POST',
  });
}

export async function getAdminArchivedRecordsRequest() {
  return authorizedApiRequest('/api/Administration/archived-records', {
    method: 'GET',
  });
}

export async function createAdminArchivedRecordRequest(payload) {
  return authorizedApiRequest('/api/Administration/archived-records', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminArchivedRecordRequest(id) {
  return authorizedApiRequest(`/api/Administration/archived-records/${id}`, {
    method: 'DELETE',
  });
}