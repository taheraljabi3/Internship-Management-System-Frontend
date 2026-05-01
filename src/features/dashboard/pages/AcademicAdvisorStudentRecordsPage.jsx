import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppModal from '../../../shared/components/AppModal';
import AppTable from '../../../shared/components/AppTable';
import { AuthContext } from '../../../app/providers/AuthProvider';
import ROUTES from '../../../app/router/routePaths';
import { useLanguage } from '../../../shared/hooks/useLanguage';
import { translateText } from '../../../shared/i18n/translate';
import {
  getAcademicStudentEvaluationsByInternshipRequest,
  getAdvisorsRequest,
  getAdvisorStudentsRequest,
  getAttendanceByInternshipRequest,
  getFinalEvaluationSummaryRequest,
  getStudentInternshipContextRequest,
  getTrainingTasksByInternshipRequest,
  getWeeklyReportsByInternshipRequest,
  upsertAttendanceRequest,
} from '../../../app/api/client';

const recordConfig = {
  attendance: {
    title: 'Attendance Details',
    backLabel: 'Back to Attendance Review',
    emptyMessage: 'No attendance records found for this student.',
  },
  tasks: {
    title: 'Task Details',
    backLabel: 'Back to Tasks Review',
    emptyMessage: 'No task records found for this student.',
  },
  weeklyReports: {
    title: 'Weekly Reports Details',
    backLabel: 'Back to Weekly Reports Review',
    emptyMessage: 'No weekly reports found.',
  },
};

function FeedbackAlert({ feedback, onClose }) {
  if (!feedback?.message) return null;

  const alertType = feedback.type || 'info';

  return (
    <div className={`alert alert-${alertType} alert-dismissible fade show`} role="alert">
      {feedback.message}
      <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
    </div>
  );
}

function normalizeAdvisor(advisor) {
  return {
    id: advisor.user_id ?? advisor.id,
    fullName: advisor.full_name || advisor.fullName || '',
    email: advisor.email || '',
  };
}

function normalizeStudent(student, advisor) {
  return {
    id: student.student_user_id ?? student.user_id ?? student.id,
    fullName: student.full_name || student.fullName || '',
    email: student.email || '',
    studentCode: student.student_code || student.studentCode || '',
    university: student.university || '',
    major: student.major || '',
    gpa: student.gpa ?? '',
    assignmentStartAt: student.assignment_start_at || '',
    advisorName: advisor?.fullName || '',
    advisorEmail: advisor?.email || '',
  };
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return '-';
  const text = String(value);
  if (text.includes('T')) return text.slice(11, 16);
  return text.slice(0, 5);
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

function getApiFileUrl(fileUrl) {
  if (!fileUrl) return '';

  const rawUrl = String(fileUrl).trim();

  if (!rawUrl) return '';

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return rawUrl;
  }

  if (rawUrl.startsWith('/')) {
    return `${apiBaseUrl}${rawUrl}`;
  }

  return `${apiBaseUrl}/${rawUrl}`;
}

function getDownloadFileName(fileUrl, fileName) {
  if (fileName) return String(fileName).trim();

  const rawUrl = String(fileUrl || '').split('?')[0];
  const parts = rawUrl.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'evidence-file';
}

async function downloadFileFromUrl(fileUrl, fileName) {
  const resolvedUrl = getApiFileUrl(fileUrl);

  if (!resolvedUrl) return;

  const safeFileName = getDownloadFileName(resolvedUrl, fileName);

  try {
    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      throw new Error('Download request failed.');
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');

    link.href = objectUrl;
    link.download = safeFileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch {
    const link = window.document.createElement('a');
    link.href = resolvedUrl;
    link.download = safeFileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function normalizeEvidence(evidence) {
  const fileUrl =
    evidence.file_url ||
    evidence.fileUrl ||
    evidence.evidence_url ||
    evidence.evidenceUrl ||
    evidence.url ||
    '';

  return {
    id: evidence.id ?? `${evidence.task_id || evidence.taskId || 'task'}-${fileUrl}`,
    task_id: evidence.task_id ?? evidence.taskId ?? null,
    file_name:
      evidence.file_name ||
      evidence.fileName ||
      evidence.title ||
      evidence.name ||
      'Evidence File',
    file_url: fileUrl,
    description: evidence.description || evidence.notes || '',
    uploaded_at: evidence.uploaded_at || evidence.uploadedAt || evidence.created_at || '',
  };
}

function getTaskEvidences(task) {
  const rawEvidences =
    task.evidences ||
    task.evidence_attachments ||
    task.evidenceAttachments ||
    task.task_evidences ||
    task.taskEvidences ||
    task.attachments ||
    [];

  return Array.isArray(rawEvidences) ? rawEvidences.map(normalizeEvidence) : [];
}

function normalizeAttendanceRow(row) {
  return {
    id: row.id,
    internship_id: row.internship_id,
    student_user_id: row.student_user_id,
    date: formatDate(row.entry_date || row.date),
    checkIn: formatTime(row.check_in_time || row.checkIn || row.check_in),
    checkOut: formatTime(row.check_out_time || row.checkOut || row.check_out),
    hours: row.daily_hours ?? row.hours ?? 0,
    status: row.status || 'Pending',
    notes: row.notes || '',
  };
}

function normalizeTaskRow(row) {
  const evidences = getTaskEvidences(row);

  return {
    id: row.id,
    internship_id: row.internship_id,
    student_user_id: row.student_user_id,
    training_plan_id: row.training_plan_id,
    weekNo: row.week_no ?? row.weekNo ?? '-',
    date: formatDate(row.task_date || row.date || row.created_at),
    title: row.title || row.task_title || row.task_name || '-',
    description: row.description || row.task_description || row.notes || '-',
    status: row.status || row.review_status || 'Pending',
    hours: row.hours ?? row.daily_hours ?? '-',
    evidence_count: row.evidence_count ?? row.evidenceCount ?? evidences.length,
    evidences,
  };
}

function normalizeWeeklyReportRow(row) {
  return {
    id: row.id,
    weekLabel:
      row.week_label ||
      row.weekLabel ||
      (row.week_no ? `Week ${row.week_no}` : row.title || row.report_title || '-'),
    totalHours: row.total_hours ?? row.totalHours ?? '-',
    presentDays: row.present_days ?? row.presentDays ?? '-',
    absentDays: row.absent_days ?? row.absentDays ?? '-',
    status: row.status || 'Pending',
    summary: row.summary || row.report_summary || row.notes || '-',
  };
}

function calculateHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const [inHours, inMinutes] = String(checkIn).split(':').map(Number);
  const [outHours, outMinutes] = String(checkOut).split(':').map(Number);

  if ([inHours, inMinutes, outHours, outMinutes].some(Number.isNaN)) return 0;

  const start = inHours * 60 + inMinutes;
  const end = outHours * 60 + outMinutes;

  if (end <= start) return 0;

  return Number(((end - start) / 60).toFixed(2));
}

function AcademicAdvisorStudentRecordsPage({ recordType = 'attendance' }) {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { user } = useContext(AuthContext) || {};
  const { isArabic } = useLanguage();
  const t = (text) => translateText(text, isArabic);

  const reviewConfig = recordConfig[recordType] || recordConfig.attendance;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentInternshipContext, setStudentInternshipContext] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [taskRows, setTaskRows] = useState([]);
  const [weeklyRows, setWeeklyRows] = useState([]);
  const [academicEvaluations, setAcademicEvaluations] = useState([]);
  const [finalEvaluationSummary, setFinalEvaluationSummary] = useState(null);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAttendanceRow, setSelectedAttendanceRow] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    hours: '',
    status: 'Present',
    notes: '',
  });

  const loadStudentRecords = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const advisorsData = await getAdvisorsRequest();
      const normalizedAdvisors = Array.isArray(advisorsData)
        ? advisorsData.map(normalizeAdvisor)
        : [];

      const targetAdvisor =
        normalizedAdvisors.find(
          (item) =>
            Number(item.id) === Number(user?.id) ||
            String(item.email || '').toLowerCase() ===
              String(user?.email || '').toLowerCase()
        ) || null;

      if (!targetAdvisor) {
        throw new Error(
          isArabic
            ? 'تعذر العثور على ملف المشرف الحالي.'
            : 'The current academic advisor profile could not be resolved.'
        );
      }

      const studentsData = await getAdvisorStudentsRequest(targetAdvisor.id);
      const normalizedStudents = Array.isArray(studentsData)
        ? studentsData.map((item) => normalizeStudent(item, targetAdvisor))
        : [];

      const student =
        normalizedStudents.find((item) => String(item.id) === String(studentId)) || null;

      if (!student) {
        throw new Error(
          isArabic
            ? 'الطالب غير موجود أو غير مرتبط بهذا المشرف.'
            : 'The student was not found or is not linked to this advisor.'
        );
      }

      setSelectedStudent(student);

      const context = await getStudentInternshipContextRequest(student.id).catch(() => null);
      setStudentInternshipContext(context || null);

      if (!context?.internship_id) {
        setAttendanceRows([]);
        setTaskRows([]);
        setWeeklyRows([]);
        setAcademicEvaluations([]);
        setFinalEvaluationSummary(null);
        return;
      }

      const [attendance, tasks, weeklyReports, academicRows, evaluationSummary] =
        await Promise.all([
          getAttendanceByInternshipRequest(context.internship_id).catch(() => []),
          getTrainingTasksByInternshipRequest(context.internship_id).catch(() => []),
          getWeeklyReportsByInternshipRequest(context.internship_id).catch(() => []),
          getAcademicStudentEvaluationsByInternshipRequest(context.internship_id).catch(() => []),
          getFinalEvaluationSummaryRequest(context.internship_id).catch(() => null),
        ]);

      setAttendanceRows(
        Array.isArray(attendance)
          ? attendance.map(normalizeAttendanceRow).sort((a, b) => b.date.localeCompare(a.date))
          : []
      );

      setTaskRows(
        Array.isArray(tasks)
          ? tasks.map(normalizeTaskRow).sort((a, b) => b.date.localeCompare(a.date))
          : []
      );

      setWeeklyRows(
        Array.isArray(weeklyReports)
          ? weeklyReports
              .map(normalizeWeeklyReportRow)
              .sort((a, b) => String(b.weekLabel || '').localeCompare(String(a.weekLabel || '')))
          : []
      );

      setAcademicEvaluations(Array.isArray(academicRows) ? academicRows : []);
      setFinalEvaluationSummary(evaluationSummary || null);
    } catch (error) {
      setSelectedStudent(null);
      setStudentInternshipContext(null);
      setAttendanceRows([]);
      setTaskRows([]);
      setWeeklyRows([]);
      setAcademicEvaluations([]);
      setFinalEvaluationSummary(null);
      setErrorMessage(error.message || 'Failed to load student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentRecords();
  }, [studentId, user, isArabic]);

  const latestAcademicEvaluation = useMemo(
    () => academicEvaluations[0] || null,
    [academicEvaluations]
  );

  const openNewAttendanceModal = () => {
    setSelectedAttendanceRow(null);
    setAttendanceForm({
      date: new Date().toISOString().slice(0, 10),
      checkIn: '',
      checkOut: '',
      hours: '',
      status: 'Present',
      notes: '',
    });
    setIsAttendanceModalOpen(true);
  };

  const handleEditAttendance = (row) => {
    setSelectedAttendanceRow(row);
    setAttendanceForm({
      date: row.date || '',
      checkIn: row.checkIn === '-' ? '' : row.checkIn || '',
      checkOut: row.checkOut === '-' ? '' : row.checkOut || '',
      hours: row.hours ?? '',
      status: row.status || 'Present',
      notes: row.notes || '',
    });
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (event) => {
    event.preventDefault();

    if (!selectedStudent || !studentInternshipContext?.internship_id) {
      setFeedback({
        type: 'warning',
        message: isArabic
          ? 'لا يوجد سجل تدريب لهذا الطالب حتى الآن.'
          : 'This student does not have an internship record yet.',
      });
      return;
    }

    const calculatedHours =
      attendanceForm.hours !== ''
        ? Number(attendanceForm.hours)
        : calculateHours(attendanceForm.checkIn, attendanceForm.checkOut);

    const payload = {
      id: selectedAttendanceRow?.id || null,
      internship_id: Number(studentInternshipContext.internship_id),
      student_user_id: Number(selectedStudent.id),
      entry_date: attendanceForm.date,
      check_in_time: attendanceForm.checkIn || null,
      check_out_time: attendanceForm.checkOut || null,
      daily_hours: calculatedHours,
      status: attendanceForm.status,
      notes: attendanceForm.notes,
    };

    try {
      setSavingAttendance(true);

      await upsertAttendanceRequest(payload);

      const refreshed = await getAttendanceByInternshipRequest(
        Number(studentInternshipContext.internship_id)
      ).catch(() => []);

      setAttendanceRows(
        Array.isArray(refreshed)
          ? refreshed.map(normalizeAttendanceRow).sort((a, b) => b.date.localeCompare(a.date))
          : []
      );

      setIsAttendanceModalOpen(false);
      setSelectedAttendanceRow(null);
      setFeedback({
        type: 'success',
        message: isArabic
          ? 'تم حفظ سجل الحضور بنجاح.'
          : 'Attendance record saved successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'danger',
        message: error.message || (isArabic ? 'فشل حفظ سجل الحضور.' : 'Failed to save attendance.'),
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const attendanceColumns = [
    { key: 'date', label: 'Date' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'hours', label: 'Hours' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'notes', label: 'Notes' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => handleEditAttendance(row)}
        >
          {t('Edit')}
        </button>
      ),
    },
  ];

  const tasksColumns = [
    { key: 'date', label: isArabic ? 'التاريخ' : 'Date' },
    { key: 'weekNo', label: isArabic ? 'الأسبوع' : 'Week' },
    { key: 'title', label: isArabic ? 'المهمة' : 'Task' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', type: 'status' },
    { key: 'hours', label: isArabic ? 'الساعات' : 'Hours' },
    {
      key: 'evidences',
      label: isArabic ? 'الأدلة والمرفقات' : 'Evidence Attachments',
      render: (_, row) => {
        const evidences = getTaskEvidences(row);

        if (!evidences.length) {
          return <span className="text-muted">-</span>;
        }

        return (
          <div className="d-flex flex-column gap-2">
            {evidences.map((evidence) => {
              const fileUrl = getApiFileUrl(evidence.file_url);

              return (
                <div
                  key={evidence.id || `${row.id}-${evidence.file_name}`}
                  className="border rounded-3 p-2 bg-light"
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                      <div className="fw-semibold small">
                        {evidence.file_name || (isArabic ? 'ملف دليل' : 'Evidence File')}
                      </div>

                      {evidence.description ? (
                        <div className="text-muted small">{evidence.description}</div>
                      ) : null}
                    </div>

                    {fileUrl ? (
                      <div className="d-flex gap-2 flex-wrap">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          {isArabic ? 'فتح' : 'Open'}
                        </a>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => downloadFileFromUrl(fileUrl, evidence.file_name)}
                        >
                          {isArabic ? 'تحميل' : 'Download'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
  ];

  const weeklyColumns = [
    { key: 'weekLabel', label: 'Week' },
    { key: 'totalHours', label: 'Total Hours' },
    { key: 'presentDays', label: 'Present Days' },
    { key: 'absentDays', label: 'Absent Days' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'summary', label: 'Summary' },
  ];

  const rows =
    recordType === 'attendance'
      ? attendanceRows
      : recordType === 'tasks'
      ? taskRows
      : weeklyRows;

  const columns =
    recordType === 'attendance'
      ? attendanceColumns
      : recordType === 'tasks'
      ? tasksColumns
      : weeklyColumns;

  const summaryStats = [
    {
      label: isArabic ? 'الطالب' : 'Student',
      value: selectedStudent?.fullName || '-',
    },
    {
      label: isArabic ? 'جهة التدريب' : 'Training Provider',
      value: studentInternshipContext?.provider_name || '-',
    },
    {
      label: isArabic ? 'عنوان التدريب' : 'Internship Title',
      value: studentInternshipContext?.internship_title || '-',
    },
    {
      label: isArabic ? 'حالة تقييم الشركة' : 'Company Evaluation',
      value: t(finalEvaluationSummary?.company_status || 'Not Submitted'),
    },
    {
      label: isArabic ? 'حالة تقييم المشرف' : 'Academic Evaluation',
      value: t(latestAcademicEvaluation?.status || 'Not Submitted'),
    },
  ];

  const metric =
    recordType === 'attendance'
      ? {
          label: isArabic ? 'عدد أيام الحضور' : 'Attendance Days',
          value: attendanceRows.filter((item) => item.status === 'Present').length,
        }
      : recordType === 'tasks'
      ? {
          label: isArabic ? 'عدد المهام' : 'Tasks Count',
          value: taskRows.length,
        }
      : {
          label: isArabic ? 'عدد التقارير الأسبوعية' : 'Weekly Reports Count',
          value: weeklyRows.length,
        };

  if (loading) {
    return (
      <div className="ims-empty-panel d-flex flex-column gap-3">
        <div>{isArabic ? 'جارٍ تحميل سجلات الطالب...' : 'Loading student records...'}</div>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div className="ims-empty-panel d-flex flex-column gap-3">
        <div>
          {errorMessage ||
            (isArabic
              ? 'الطالب غير موجود أو غير مرتبط بهذا المشرف.'
              : 'The student was not found or is not linked to this advisor.')}
        </div>
        <button
          type="button"
          className="btn btn-primary align-self-start"
          onClick={() => navigate(ROUTES.DASHBOARD.ACADEMIC_ADVISOR)}
        >
          {t('Back to Students')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="ims-page-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h1 className="ims-page-title">{t(reviewConfig.title)}</h1>
          <p className="ims-page-description">{selectedStudent.fullName}</p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link
            className="btn btn-outline-primary"
            to={`${ROUTES.ADVISOR_MODULES.STUDENT_FILE.replace(
              ':studentId',
              String(selectedStudent.id)
            )}?tab=${recordType}`}
          >
            {t(reviewConfig.backLabel)}
          </Link>

          <Link className="btn btn-outline-secondary" to={ROUTES.ADVISOR_MODULES.REPORTS}>
            {t('Back')}
          </Link>
        </div>
      </div>

      <FeedbackAlert
        feedback={feedback}
        onClose={() => setFeedback({ type: '', message: '' })}
      />

      <div className="row g-3 mb-4">
        {summaryStats.map((item) => (
          <div className="col-md-6 col-xl-3" key={item.label}>
            <div className="ims-detail-box h-100">
              <div className="ims-detail-label">{item.label}</div>
              <div className="ims-detail-value">{item.value}</div>
            </div>
          </div>
        ))}

        <div className="col-md-6 col-xl-3">
          <div className="card ims-stat-card h-100">
            <div className="card-body">
              <div className="ims-stat-label">{metric.label}</div>
              <div className="ims-stat-value">{metric.value}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card ims-table-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h5 className="ims-section-title mb-0">{t(reviewConfig.title)}</h5>

            {recordType === 'attendance' ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openNewAttendanceModal}
              >
                {t('Add / Edit Attendance')}
              </button>
            ) : null}
          </div>

          <AppTable
            columns={columns}
            rows={rows}
            rowKey="id"
            emptyMessage={t(reviewConfig.emptyMessage)}
          />
        </div>
      </div>

      <AppModal
        isOpen={isAttendanceModalOpen}
        title={t('Add / Edit Attendance')}
        onClose={() => setIsAttendanceModalOpen(false)}
      >
        <form onSubmit={handleSaveAttendance} className="d-grid gap-3">
          <input
            type="date"
            className="form-control"
            value={attendanceForm.date}
            onChange={(e) => setAttendanceForm((c) => ({ ...c, date: e.target.value }))}
            required
          />

          <div className="row g-2">
            <div className="col-md-6">
              <input
                type="time"
                className="form-control"
                value={attendanceForm.checkIn}
                onChange={(e) =>
                  setAttendanceForm((c) => ({ ...c, checkIn: e.target.value }))
                }
              />
            </div>

            <div className="col-md-6">
              <input
                type="time"
                className="form-control"
                value={attendanceForm.checkOut}
                onChange={(e) =>
                  setAttendanceForm((c) => ({ ...c, checkOut: e.target.value }))
                }
              />
            </div>
          </div>

          <input
            type="number"
            min="0"
            step="0.25"
            className="form-control"
            placeholder={isArabic ? 'الساعات' : 'Hours'}
            value={attendanceForm.hours}
            onChange={(e) => setAttendanceForm((c) => ({ ...c, hours: e.target.value }))}
          />

          <select
            className="form-select"
            value={attendanceForm.status}
            onChange={(e) => setAttendanceForm((c) => ({ ...c, status: e.target.value }))}
          >
            <option value="Present">{t('Present')}</option>
            <option value="Absent">{t('Absent')}</option>
          </select>

          <textarea
            className="form-control"
            rows="3"
            placeholder={t('Notes')}
            value={attendanceForm.notes}
            onChange={(e) => setAttendanceForm((c) => ({ ...c, notes: e.target.value }))}
          />

          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setIsAttendanceModalOpen(false)}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>

            <button type="submit" className="btn btn-primary" disabled={savingAttendance}>
              {savingAttendance
                ? isArabic
                  ? 'جارٍ الحفظ...'
                  : 'Saving...'
                : isArabic
                ? 'حفظ'
                : 'Save'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
}

export default AcademicAdvisorStudentRecordsPage;