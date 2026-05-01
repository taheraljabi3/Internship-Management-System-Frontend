import { mockStudents } from '../../users/data/mockUsers';
import {
  mockStudentProfile,
  mockCVDocuments,
  mockSkills,
  mockProjects,
  mockCourses,
} from '../../student-profile/data/mockStudentProfile';
import { mockInternships } from '../../internship/data/mockInternship';
import { mockOpportunities } from '../../providers-opportunities/data/mockProvidersOpportunities';
import { mockWeeklyProgressReports } from '../../attendance-reports/data/mockAttendanceReports';
import {
  mockCompanyEvaluationForms,
  mockCompanyEvaluations,
} from '../../evaluation/data/mockEvaluation';

export const ADVISOR_STUDENT_LINKS = {};

export const ADVISOR_STORAGE_KEYS = {
  attendance: 'ims_advisor_attendance_entries',
  fieldVisits: 'ims_advisor_field_visits',
  onlineFollowUps: 'ims_advisor_online_follow_ups',
  studentEvaluations: 'ims_advisor_student_evaluations',
  companyEvaluationForms: 'ims_advisor_company_evaluation_forms',
};

export function buildStudentEmail(student) {
  if (student?.email) return student.email;
  if (!student?.fullName && !student?.name) return '';
  return '';
}

export function getLinkedStudents(user) {
  const normalizedUserEmail = String(user?.email || '').toLowerCase();
  const linkedEmails = ADVISOR_STUDENT_LINKS[normalizedUserEmail] || [];

  return (Array.isArray(mockStudents) ? mockStudents : []).filter((item) => {
    const email = buildStudentEmail(item).toLowerCase();

    if ((user?.role || '').toLowerCase() === 'academicadvisor' && linkedEmails.length > 0) {
      return linkedEmails.includes(email);
    }

    return true;
  });
}

export function buildStudentProfileData(student) {
  const baseProfile = mockStudentProfile || {};
  const fullName = student?.fullName || student?.name || baseProfile.fullName || '';
  const email = buildStudentEmail(student) || baseProfile.email || '';
  const major = student?.major || baseProfile.major || '';

  return {
    ...baseProfile,
    fullName,
    email,
    major,
    university: baseProfile.university || '',
    gpa: baseProfile.gpa || '',
    city: baseProfile.city || '',
    phone: student?.phone || baseProfile.phone || '',
    academicAdvisorName: student?.academicAdvisorName || baseProfile.academicAdvisorName || '',
    academicAdvisorEmail: student?.academicAdvisorEmail || baseProfile.academicAdvisorEmail || '',
    linkedInUrl: student?.linkedinUrl || baseProfile.linkedInUrl || '',
    headline: baseProfile.headline || '',
    bio: baseProfile.bio || '',
    photoUrl: baseProfile.photoUrl || '',
  };
}

export function buildStudentSupportData(student) {
  const baseProfile = mockStudentProfile || {};
  const fullName = student?.fullName || baseProfile.fullName || 'Student';
  const safeName = fullName.replace(/\s+/g, '_');

  return {
    skills: Array.isArray(mockSkills) ? mockSkills : [],
    attachments: (Array.isArray(mockCVDocuments) ? mockCVDocuments : []).map((item) => ({
      ...item,
      fileName: item.fileName || (item.category === 'CV' ? `${safeName}_CV.pdf` : `${safeName}_Attachment.pdf`),
    })),
    projects: Array.isArray(mockProjects) ? mockProjects : [],
    courses: Array.isArray(mockCourses) ? mockCourses : [],
  };
}

export function calculateHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inHours, inMinutes] = checkIn.split(':').map(Number);
  const [outHours, outMinutes] = checkOut.split(':').map(Number);
  const start = inHours * 60 + inMinutes;
  const end = outHours * 60 + outMinutes;
  if (end <= start) return 0;
  return Number(((end - start) / 60).toFixed(2));
}

export function flattenTasks(entries = []) {
  return entries.flatMap((entry) =>
    (entry.tasks || []).map((task) => ({
      id: task.id,
      date: entry.date,
      status: entry.status,
      hours: entry.hours,
      title: task.title,
      attachmentName: task.attachmentName || '-',
    }))
  );
}

export function normalizeMeetings(fieldVisits, onlineFollowUps, internshipId) {
  const fieldRows = fieldVisits
    .filter((item) => Number(item.internshipId) === Number(internshipId))
    .map((item) => ({ ...item, sourceType: 'FieldVisit', placeOrLink: item.location || '-' }));

  const onlineRows = onlineFollowUps
    .filter((item) => Number(item.internshipId) === Number(internshipId))
    .map((item) => ({ ...item, sourceType: 'OnlineFollowUp', placeOrLink: item.link || '-' }));

  return [...fieldRows, ...onlineRows].sort((a, b) => {
    const aValue = `${a.scheduleDate || ''} ${a.scheduleTime || ''}`;
    const bValue = `${b.scheduleDate || ''} ${b.scheduleTime || ''}`;
    return bValue.localeCompare(aValue);
  });
}

export function buildInitialEvaluationForm(existingEvaluation) {
  if (existingEvaluation) {
    return {
      evaluator: existingEvaluation.evaluator || '',
      status: existingEvaluation.status || 'Pending',
      criteria: (existingEvaluation.criteria || []).map((item) => ({ criterion: item.criterion, outOf: item.outOf, score: item.score })),
    };
  }

  return {
    evaluator: '',
    status: 'Pending',
    criteria: [
      { criterion: 'Attendance & Commitment', outOf: 25, score: '' },
      { criterion: 'Academic Reflection', outOf: 25, score: '' },
      { criterion: 'Task Completion', outOf: 25, score: '' },
      { criterion: 'Communication with Supervisor', outOf: 25, score: '' },
    ],
  };
}

export function buildStudentsOverview({ user, attendanceEntries, studentEvaluations }) {
  const linkedStudents = getLinkedStudents(user);

  return linkedStudents.map((student) => {
    const fullName = student.fullName || student.name || 'Unknown Student';
    const email = buildStudentEmail(student);

    const internship = mockInternships.find((item) => (item.studentEmail || '').toLowerCase() === email.toLowerCase() || (item.studentName || '').toLowerCase() === fullName.toLowerCase());
    const linkedOpportunity = mockOpportunities.find((item) => ((item.linkedStudentEmail || '').toLowerCase() === email.toLowerCase() || (item.linkedStudentName || '').toLowerCase() === fullName.toLowerCase()) || (internship && (item.provider || '').toLowerCase() === (internship.providerName || '').toLowerCase()));
    const studentAttendance = attendanceEntries.filter((entry) => internship ? Number(entry.assignmentId) === Number(internship.id) : false);
    const weeklyReports = mockWeeklyProgressReports.filter((report) => internship ? Number(report.assignmentId) === Number(internship.id) : false);
    const absentDays = weeklyReports.reduce((sum, item) => sum + Number(item.absentDays || 0), 0);
    const companyEvaluation = mockCompanyEvaluations.find((item) => (item.studentEmail || '').toLowerCase() === email.toLowerCase() || (item.studentName || '').toLowerCase() === fullName.toLowerCase());
    const academicEvaluation = studentEvaluations.find((item) => (item.studentEmail || '').toLowerCase() === email.toLowerCase() || (item.studentName || '').toLowerCase() === fullName.toLowerCase());
    const companyEvaluationForm = mockCompanyEvaluationForms.find((item) => (item.studentEmail || '').toLowerCase() === email.toLowerCase() || (item.studentName || '').toLowerCase() === fullName.toLowerCase());

    const hasInternship = Boolean(internship && internship.approvedByAcademicAdvisor);
    const isStruggling = !hasInternship || absentDays >= 2 || Number(companyEvaluation?.totalPercentage || 100) < 70 || Number(academicEvaluation?.totalPercentage || 100) < 70;

    return {
      ...student,
      fullName,
      email,
      internshipStatus: hasInternship ? 'Has Internship' : 'No Internship',
      providerName: internship?.providerName || '-',
      internshipTitle: internship?.title || '-',
      linkedOpportunity,
      internship,
      attendance: studentAttendance,
      tasks: flattenTasks(studentAttendance),
      weeklyReports,
      companyEvaluation,
      academicEvaluation,
      companyEvaluationForm,
      absentDays,
      strugglingStatus: isStruggling ? 'At Risk' : 'On Track',
    };
  });
}
